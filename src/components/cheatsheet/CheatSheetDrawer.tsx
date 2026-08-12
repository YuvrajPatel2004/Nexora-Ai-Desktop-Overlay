import React, { useState } from 'react';
import { 
  BookOpen, 
  Code2, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  Search, 
  X,
  Star,
  ExternalLink
} from 'lucide-react';
import { CodeViewer } from '../common/CodeViewer';

interface CheatSheetItem {
  id: string;
  category: 'dsa' | 'system-design' | 'behavioral' | 'company-tips';
  title: string;
  subtitle: string;
  complexity?: { time: string; space: string };
  templateCode?: string;
  points: string[];
}

const CHEATSHEET_DATABASE: CheatSheetItem[] = [
  // DSA Patterns
  {
    id: 'two-pointers',
    category: 'dsa',
    title: 'Two Pointers & Sliding Window',
    subtitle: 'Optimal for Subarrays, Palindromes, Sorted Arrays & Pair Sums',
    complexity: { time: 'O(N)', space: 'O(1)' },
    templateCode: `def sliding_window(nums, k):
    left = 0
    curr_sum = 0
    max_len = 0
    for right in range(len(nums)):
        curr_sum += nums[right]
        while curr_sum > k and left <= right:
            curr_sum -= nums[left]
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len`,
    points: [
      'Use when searching for continuous subarrays or pairs in sorted arrays.',
      'Opposite directional pointers for 2-Sum sorted or container with most water.',
      'Same directional sliding window for longest substring without repeating characters.'
    ]
  },
  {
    id: 'monotonic-stack',
    category: 'dsa',
    title: 'Monotonic Stack / Queue',
    subtitle: 'Next Greater Element, Daily Temperatures, Largest Rectangle in Histogram',
    complexity: { time: 'O(N)', space: 'O(N)' },
    templateCode: `def next_greater_element(nums):
    stack = [] # stores indices
    res = [-1] * len(nums)
    for i, val in enumerate(nums):
        while stack and nums[stack[-1]] < val:
            prev_idx = stack.pop()
            res[prev_idx] = val
        stack.append(i)
    return res`,
    points: [
      'Maintain stack in strictly increasing or decreasing order.',
      'Pops elements when a greater/smaller element arrives.',
      'Each element is pushed and popped at most once -> O(N) linear time.'
    ]
  },
  {
    id: 'topological-sort',
    category: 'dsa',
    title: 'Topological Sort (Kahn\'s Algorithm)',
    subtitle: 'Course Schedule, Build Systems, Dependency Graphs (DAG)',
    complexity: { time: 'O(V + E)', space: 'O(V + E)' },
    templateCode: `from collections import deque

def can_finish(num_courses, prerequisites):
    in_degree = [0] * num_courses
    adj = {i: [] for i in range(num_courses)}
    for dest, src in prerequisites:
        adj[src].append(dest)
        in_degree[dest] += 1
    
    q = deque([i for i in range(num_courses) if in_degree[i] == 0])
    visited = 0
    while q:
        node = q.popleft()
        visited += 1
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                q.append(neighbor)
    return visited == num_courses`,
    points: [
      'Calculates in-degrees for all vertices.',
      'Uses queue initialized with 0 in-degree nodes.',
      'If visited count != V, there is a cycle in the directed graph.'
    ]
  },
  {
    id: 'union-find',
    category: 'dsa',
    title: 'Disjoint Set Union (Union-Find by Rank + Path Compression)',
    subtitle: 'Connected Components, Kruskal\'s MST, Redundant Connection',
    complexity: { time: 'O(α(N)) ≈ O(1)', space: 'O(N)' },
    templateCode: `class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [1] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x]) # Path compression
        return self.parent[x]
    
    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry: return False
        if self.rank[rx] < self.rank[ry]: rx, ry = ry, rx
        self.parent[ry] = rx
        self.rank[rx] += self.rank[ry]
        return True`,
    points: [
      'Near O(1) amortized time per query using path compression + union by rank.',
      'Essential for dynamic graph connectivity without full DFS/BFS re-runs.'
    ]
  },

  // System Design
  {
    id: 'rate-limiter',
    category: 'system-design',
    title: 'Distributed Rate Limiter',
    subtitle: 'Token Bucket vs Leaky Bucket vs Sliding Window Counter',
    points: [
      '**Token Bucket:** Tokens added at fixed rate. Allows bursts up to bucket capacity (Used by AWS/Stripe).',
      '**Redis Sliding Window Log:** Store timestamps in Redis Sorted Set (ZSET). Evict elements older than `now - window_size`. Count with `ZCARD`.',
      '**Redis Cell / Lua Script:** Prevents race conditions during distributed multi-node rate check.'
    ]
  },
  {
    id: 'caching-strategies',
    category: 'system-design',
    title: 'High-Scale Caching Patterns',
    subtitle: 'Cache-Aside, Write-Through, Write-Behind, Cache Invalidation',
    points: [
      '**Cache-Aside (Lazy Loading):** App queries cache first. On miss, queries DB, populates cache, returns. (Resilient to cache node failures).',
      '**Write-Through:** App writes to Cache, Cache synchronously writes to DB. Consistent but higher write latency.',
      '**Write-Behind (Write-Back):** App writes to Cache, Cache asynchronously batches writes to DB. High throughput, risk of data loss on cache crash.',
      '**Stampede Mitigation:** Use Mutex lock (single flight) or probabilistic early expiration (XFetch).'
    ]
  },
  {
    id: 'db-partitioning',
    category: 'system-design',
    title: 'Database Sharding & Consistent Hashing',
    subtitle: 'Horizontal Partitioning, Hash Rings, Virtual Nodes',
    points: [
      '**Consistent Hashing:** Hashes both nodes and data keys to a 2^32 ring. When adding/removing a server, only `K/N` keys are remapped.',
      '**Virtual Nodes:** Assign multiple hash points per physical machine to ensure uniform load distribution.',
      '**Cross-Shard Joins:** Avoid by co-locating related entity partitions (e.g. partition all user orders by `user_id`).'
    ]
  },

  // Behavioral STAR Framework
  {
    id: 'star-conflict',
    category: 'behavioral',
    title: 'STAR: Technical Disagreement / Conflict',
    subtitle: 'How to answer "Tell me about a time you disagreed with a colleague"',
    points: [
      '**Situation:** "On our microservices migration, our team lead proposed GraphQL while I advocated for gRPC with Protobuf for internal service-to-service communication."',
      '**Task:** "We needed high throughput (<10ms P99 latency) without incurring heavy JSON serialization overhead."',
      '**Action:** "Instead of arguing theoretically, I built a quick benchmark prototype comparing CPU utilization and payload size. Shared data transparently in our RFC doc."',
      '**Result:** "The lead agreed to adopt gRPC for backend services and GraphQL for client-facing edge APIs, reducing inter-service latency by 42%."'
    ]
  },
  {
    id: 'star-failure',
    category: 'behavioral',
    title: 'STAR: Production Outage / Failure & Recovery',
    subtitle: 'How to answer "Tell me about a project that failed or a critical bug you caused"',
    points: [
      '**Situation:** "During a high-traffic Black Friday release, a database connection leak in our worker service saturated RDS connections, causing 504 gateway timeouts."',
      '**Task:** "I was on-call lead responsible for triaging and restoring service within 15 minutes."',
      '**Action:** "Quickly enabled circuit breaker fallback to read replicas, identified the unclosed connection in the async handler, and deployed an emergency hotfix."',
      '**Result:** "Restored 100% uptime in 11 minutes. Conducted a blameless post-mortem, added automated connection leak integration tests, and implemented pool monitoring alarms."'
    ]
  }
];

interface CheatSheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToPrompt?: (text: string) => void;
}

export const CheatSheetDrawer: React.FC<CheatSheetDrawerProps> = ({
  isOpen,
  onClose,
  onSendToPrompt
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'dsa' | 'system-design' | 'behavioral'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = CHEATSHEET_DATABASE.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.points.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(text);
    } else {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md flex justify-end select-none">
      <div className="w-full max-w-md bg-slate-950/95 border-l border-white/10 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100 font-sans">Interview Cheat Sheets & DSA Patterns</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 space-y-2 bg-black/40 border-b border-white/5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search algorithms, system design, STAR answers..."
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Cheat Sheets' },
              { id: 'dsa', label: 'DSA Patterns' },
              { id: 'system-design', label: 'System Design' },
              { id: 'behavioral', label: 'Behavioral STAR' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Cheat Sheet Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="glass-panel p-3.5 rounded-xl border border-white/10 space-y-2 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-xs text-cyan-300">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.subtitle}</p>
                </div>
                {item.complexity && (
                  <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      T: {item.complexity.time}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      S: {item.complexity.space}
                    </span>
                  </div>
                )}
              </div>

              {/* Bullet Points */}
              <div className="space-y-1 text-xs text-slate-200">
                {item.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-1.5 pl-1">
                    <span className="text-cyan-400 font-bold text-xs mt-0.5">•</span>
                    <span className="text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: pt.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                  </div>
                ))}
              </div>

              {/* Template Code snippet if present */}
              {item.templateCode && (
                <div className="mt-2">
                  <CodeViewer code={item.templateCode} language="python" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
