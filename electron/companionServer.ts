import http from 'http';
import os from 'os';

export interface CompanionClient {
  id: string;
  res: http.ServerResponse;
  connectedAt: number;
}

export class CompanionServer {
  private server: http.Server | null = null;
  private port: number = 4123;
  private clients: Map<string, CompanionClient> = new Map();
  private localIp: string = '127.0.0.1';
  private isRunning: boolean = false;
  private onActionCallback?: (action: string, payload: any) => void;
  private latestState: {
    solution?: string;
    transcript?: string;
    activeMode?: string;
    isListening?: boolean;
    lastUpdated?: number;
  } = {};

  constructor(port: number = 4123) {
    this.port = port;
    this.localIp = this.detectLocalIp();
  }

  public setOnAction(callback: (action: string, payload: any) => void) {
    this.onActionCallback = callback;
  }

  private detectLocalIp(): string {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
          // Skip over non-IPv4 and internal/loopback addresses
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
    } catch (e) {
      console.warn('[CompanionServer] IP detection warning:', e);
    }
    return '127.0.0.1';
  }

  public start(): Promise<{ port: number; ip: string; fullUrl: string }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host}`);

        // 1. SSE Real-time Events endpoint
        if (url.pathname === '/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const client: CompanionClient = {
            id: clientId,
            res,
            connectedAt: Date.now()
          };

          this.clients.set(clientId, client);
          console.log(`[CompanionServer] Mobile device connected: ${clientId} (Total: ${this.clients.size})`);

          // Send immediate state sync
          const syncData = JSON.stringify({
            type: 'init-sync',
            state: this.latestState,
            connectedCount: this.clients.size
          });
          res.write(`data: ${syncData}\n\n`);

          req.on('close', () => {
            this.clients.delete(clientId);
            console.log(`[CompanionServer] Mobile device disconnected: ${clientId}`);
          });
          return;
        }

        // 2. Action Endpoint (Triggered from phone)
        if (url.pathname === '/action' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              console.log(`[CompanionServer] Action received from phone:`, data);
              this.onActionCallback?.(data.action, data.payload);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        // 3. Status API
        if (url.pathname === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isRunning: true,
            port: this.port,
            localIp: this.localIp,
            connectedCount: this.clients.size,
            latestState: this.latestState
          }));
          return;
        }

        // 4. Default: Serve the AMOLED Mobile Companion Web App
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(this.getMobileHTML());
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        this.localIp = this.detectLocalIp();
        const fullUrl = `http://${this.localIp}:${this.port}`;
        console.log(`[CompanionServer] Second-Screen Companion running at ${fullUrl}`);
        resolve({ port: this.port, ip: this.localIp, fullUrl });
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[CompanionServer] Port ${this.port} in use, trying ${this.port + 1}...`);
          this.port += 1;
          this.server?.close();
          this.start().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  public broadcast(type: string, data: any) {
    if (type === 'solution') this.latestState.solution = data;
    if (type === 'transcript') this.latestState.transcript = data;
    if (type === 'mode') this.latestState.activeMode = data;
    if (type === 'audio-state') this.latestState.isListening = data;
    this.latestState.lastUpdated = Date.now();

    const payload = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  public getInfo() {
    this.localIp = this.detectLocalIp();
    return {
      isRunning: this.isRunning,
      port: this.port,
      localIp: this.localIp,
      fullUrl: `http://${this.localIp}:${this.port}`,
      connectedCount: this.clients.size
    };
  }

  public stop() {
    if (this.server) {
      this.server.close();
      this.isRunning = false;
      this.clients.clear();
    }
  }

  private getMobileHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Nexora AI - Second Screen Companion</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #000000;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      background: #090d16;
      border-bottom: 1px solid #1e293b;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo {
      width: 10px;
      height: 10px;
      background: #00f0ff;
      border-radius: 50%;
      box-shadow: 0 0 10px #00f0ff;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
    .title { font-weight: 900; font-size: 14px; letter-spacing: 1px; color: #fff; }
    .status-badge {
      font-size: 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .tabs {
      display: flex;
      background: #090d16;
      border-bottom: 1px solid #1e293b;
      padding: 6px 12px;
      gap: 6px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: rgba(0, 240, 255, 0.15);
      border-color: rgba(0, 240, 255, 0.4);
      color: #00f0ff;
    }
    main {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
    }
    .card {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #00f0ff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content-box {
      font-size: 14px;
      line-height: 1.6;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 60vh;
      overflow-y: auto;
    }
    .code-block {
      background: #020617;
      border: 1px solid #1e293b;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      color: #38bdf8;
      overflow-x: auto;
    }
    .btn-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }
    .action-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #fff;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .action-btn:active { background: #334155; transform: scale(0.98); }
    .action-btn.primary { background: rgba(0, 240, 255, 0.2); border-color: #00f0ff; color: #00f0ff; }
    .action-btn.danger { background: rgba(244, 63, 94, 0.2); border-color: #f43f5e; color: #fb7185; }
    .copy-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #00f0ff;
      color: #000;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 240, 255, 0.4);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo"></div>
      <span class="title">NEXORA COMPANION</span>
    </div>
    <span class="status-badge" id="connStatus">● LIVE SYNC</span>
  </header>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('solution')">💡 Live Solution</button>
    <button class="tab-btn" onclick="switchTab('transcripts')">🎙️ Transcripts</button>
    <button class="tab-btn" onclick="switchTab('controls')">🎮 Remote Controls</button>
  </div>

  <main>
    <!-- TAB 1: SOLUTION -->
    <div id="tab-solution" class="card">
      <div class="card-header">
        <span>Latest AI Solution</span>
        <button onclick="copySolution()" style="background:transparent; border:none; color:#38bdf8; cursor:pointer; font-size:11px;">📋 Copy</button>
      </div>
      <div id="solutionText" class="content-box">Waiting for screen snip or question on your laptop...</div>
    </div>

    <!-- TAB 2: TRANSCRIPTS -->
    <div id="tab-transcripts" class="card" style="display:none;">
      <div class="card-header">
        <span>Live Speech Transcript</span>
      </div>
      <div id="transcriptText" class="content-box">Listening for meeting audio...</div>
    </div>

    <!-- TAB 3: CONTROLS -->
    <div id="tab-controls" class="card" style="display:none;">
      <div class="card-header">
        <span>Remote Desktop Actions</span>
      </div>
      <p style="font-size:12px; color:#94a3b8;">Trigger overlay actions on your laptop invisibly from your phone:</p>
      
      <div class="btn-grid">
        <button class="action-btn primary" onclick="sendAction('snip')">📸 Snip Screen</button>
        <button class="action-btn" onclick="sendAction('audio-toggle')">🎙️ Toggle Audio</button>
        <button class="action-btn" onclick="sendAction('preset-coding')">💻 Mode: Coding</button>
        <button class="action-btn" onclick="sendAction('preset-star')">⭐ Mode: STAR</button>
        <button class="action-btn danger" style="grid-column: span 2;" onclick="sendAction('panic-hide')">🕶️ Panic Boss Hide (Alt+Space)</button>
      </div>
    </div>
  </main>

  <div id="toast" class="copy-toast">Copied to Clipboard!</div>

  <script>
    let currentSolution = '';

    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-solution').style.display = tab === 'solution' ? 'flex' : 'none';
      document.getElementById('tab-transcripts').style.display = tab === 'transcripts' ? 'flex' : 'none';
      document.getElementById('tab-controls').style.display = tab === 'controls' ? 'flex' : 'none';
    }

    function copySolution() {
      if (!currentSolution) return;
      navigator.clipboard.writeText(currentSolution);
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    function sendAction(action) {
      fetch('/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, timestamp: Date.now() })
      }).then(() => {
        const toast = document.getElementById('toast');
        toast.innerText = 'Action sent to Desktop!';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 1500);
      });
    }

    // Connect SSE stream
    function initSSE() {
      const evtSource = new EventSource('/events');
      evtSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'solution' || (payload.type === 'init-sync' && payload.state.solution)) {
            const sol = payload.data || payload.state?.solution;
            if (sol) {
              currentSolution = sol;
              document.getElementById('solutionText').innerText = sol;
            }
          }
          if (payload.type === 'transcript' || (payload.type === 'init-sync' && payload.state.transcript)) {
            const tr = payload.data || payload.state?.transcript;
            if (tr) {
              document.getElementById('transcriptText').innerText = tr;
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      evtSource.onerror = () => {
        document.getElementById('connStatus').innerText = '○ RECONNECTING...';
        document.getElementById('connStatus').style.color = '#fb7185';
      };
      evtSource.onopen = () => {
        document.getElementById('connStatus').innerText = '● LIVE SYNC';
        document.getElementById('connStatus').style.color = '#34d399';
      };
    }

    initSSE();
  </script>
</body>
</html>`;
  }
}
