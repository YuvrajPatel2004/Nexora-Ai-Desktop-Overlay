import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileCode, 
  Trash2, 
  Check, 
  Search, 
  Sparkles, 
  Layers, 
  BookOpen, 
  Cpu,
  RotateCcw
} from 'lucide-react';
import { KnowledgeDocument, KnowledgeCategory, RAGQueryResult } from '../../types';
import { DocumentStore } from '../../services/storage/documentStore';
import { RAGEngine } from '../../services/rag/ragEngine';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'test-rag' | 'new-doc'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);

  // New Document Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('resume');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [formError, setFormError] = useState('');

  // RAG Simulator State
  const [simQuery, setSimQuery] = useState('Tell me about your experience scaling distributed microservices');
  const [simResults, setSimResults] = useState<RAGQueryResult[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  const loadDocs = () => {
    const docs = DocumentStore.getDocuments();
    setDocuments(docs);
  };

  if (!isOpen) return null;

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunks?.length || 0), 0);
  const activeDocs = documents.filter(d => d.isActive);
  const activeChunks = activeDocs.reduce((acc, d) => acc + (d.chunks?.length || 0), 0);

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.rawContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleToggle = (id: string) => {
    DocumentStore.toggleDocumentActive(id);
    loadDocs();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this knowledge document from your personal RAG base?')) {
      DocumentStore.deleteDocument(id);
      if (previewDoc?.id === id) setPreviewDoc(null);
      loadDocs();
    }
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Please enter a document title.');
      return;
    }
    if (!newContent.trim()) {
      setFormError('Please enter document content or paste text.');
      return;
    }

    const tagsArr = newTags.split(',').map(t => t.trim()).filter(Boolean);
    DocumentStore.addDocument(newTitle, newCategory, newContent, tagsArr);
    
    // Reset form
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setFormError('');
    setActiveTab('documents');
    loadDocs();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const title = file.name.replace(/\.[^/.]+$/, '');
        let cat: KnowledgeCategory = 'resume';
        if (title.toLowerCase().includes('star') || title.toLowerCase().includes('behavioral')) cat = 'behavioral';
        else if (title.toLowerCase().includes('project') || title.toLowerCase().includes('design')) cat = 'projects';
        
        DocumentStore.addDocument(title, cat, content, [file.name.split('.').pop() || 'file']);
        loadDocs();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const runRAGSimulation = () => {
    if (!simQuery.trim()) return;
    const results = RAGEngine.queryKnowledge(simQuery, documents, 4, 0.01);
    setSimResults(results);
  };

  const categories: { id: KnowledgeCategory | 'all'; label: string; color: string }[] = [
    { id: 'all', label: 'All Items', color: 'text-slate-300' },
    { id: 'resume', label: 'Resume & Bio', color: 'text-cyan-400' },
    { id: 'behavioral', label: 'STAR Stories', color: 'text-amber-400' },
    { id: 'projects', label: 'Past Projects', color: 'text-emerald-400' },
    { id: 'system-design', label: 'System Design', color: 'text-purple-400' },
    { id: 'notes', label: 'Study Notes', color: 'text-blue-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Personal Resume & Knowledge Base RAG</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {activeDocs.length} Active ({activeChunks} Chunks)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload your resume, past projects, and STAR stories. The AI automatically cites your real experience in first-person answers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Quick Actions */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-slate-900/40">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setActiveTab('documents'); setPreviewDoc(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'documents'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Knowledge Documents ({documents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('new-doc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'new-doc'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>

            <button
              onClick={() => { setActiveTab('test-rag'); runRAGSimulation(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'test-rag'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-neon-purple'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>RAG Query Simulator</span>
            </button>
          </div>

          {/* Quick File Upload */}
          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload File (.txt, .md)</span>
            <input
              type="file"
              accept=".txt,.md,.markdown,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">

          {/* TAB 1: DOCUMENTS LIST */}
          {activeTab === 'documents' && (
            <div className="flex flex-col gap-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents, skills, companies..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                        selectedCategory === c.id
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Detail Preview Drawer */}
              {previewDoc && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-bold text-white">{previewDoc.title}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {previewDoc.category}
                      </span>
                    </div>
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5"
                    >
                      Close Preview
                    </button>
                  </div>

                  <div className="text-xs text-slate-300 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap bg-slate-950/70 p-3 rounded-lg border border-white/5">
                    {previewDoc.rawContent}
                  </div>

                  {/* Chunks List */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Extracted Chunks for RAG ({previewDoc.chunks.length}):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {previewDoc.chunks.map((chk, i) => (
                        <div key={chk.id} className="p-2 rounded-lg bg-slate-950/50 border border-white/10 text-[11px]">
                          <div className="font-semibold text-cyan-300 truncate">
                            Chunk #{i + 1}: {chk.sectionTitle}
                          </div>
                          <div className="text-slate-400 line-clamp-2 mt-0.5">
                            {chk.content}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {chk.keywords.slice(0, 5).map((kw, ki) => (
                              <span key={ki} className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-slate-400 font-mono">
                                #{kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      doc.isActive
                        ? 'bg-slate-900/60 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-slate-900/80 shadow-lg'
                        : 'bg-slate-950/40 border-white/5 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${doc.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <h3 className="text-xs font-bold text-white truncate max-w-[220px]" title={doc.title}>
                            {doc.title}
                          </h3>
                        </div>

                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                          {doc.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                        {doc.summary || doc.rawContent.slice(0, 120)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-mono text-cyan-400">
                          <Layers className="w-3 h-3" />
                          {doc.chunks.length} chunks
                        </span>
                        {doc.tags?.slice(0, 2).map((t, ti) => (
                          <span key={ti} className="text-slate-400 bg-white/5 px-1 rounded">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggle(doc.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                            doc.isActive 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-slate-800 text-slate-500 border-white/5'
                          }`}
                          title={doc.isActive ? 'Active in RAG' : 'Disabled from RAG'}
                        >
                          {doc.isActive ? 'Active' : 'Off'}
                        </button>

                        <button
                          onClick={(e) => handleDelete(doc.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredDocs.length === 0 && (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <FileCode className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No knowledge documents found</p>
                  <p className="text-xs text-slate-600 mt-1">Upload a resume file or add past project notes.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW DOCUMENT */}
          {activeTab === 'new-doc' && (
            <form onSubmit={handleCreateDocument} className="flex flex-col gap-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Add Personal Experience / Resume / Architecture Document
                </h3>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Staff Engineer Resume / Kafka Architecture Notes"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as KnowledgeCategory)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="resume">Resume & Career Bio</option>
                    <option value="behavioral">STAR Behavioral Leadership Stories</option>
                    <option value="projects">Past Projects & Metrics</option>
                    <option value="system-design">System Design & Whitepapers</option>
                    <option value="notes">Custom Notes & Cheatsheets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content (Markdown / Plain Text)
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={10}
                  placeholder="Paste your resume sections, past company metrics, architecture designs, or STAR incident responses here..."
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/60 custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g., Python, Kubernetes, Incident Response, Scaling"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-neon-cyan transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save & Index Document
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RAG SIMULATOR */}
          {activeTab === 'test-rag' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>RAG Context Simulator</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Type any interview question below to see which chunks from your resume and projects are automatically retrieved and injected into the AI prompt in real time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runRAGSimulation()}
                  placeholder="Ask a question (e.g., Tell me about an outage you resolved, or What is your experience with Kafka?)"
                  className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
                />
                <button
                  onClick={runRAGSimulation}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-neon-purple transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Test Query</span>
                </button>
              </div>

              {/* Results */}
              <div className="flex flex-col gap-2.5 mt-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Top Retrieved Context Chunks ({simResults.length}):</span>
                  {simResults.length > 0 && (
                    <span className="text-emerald-400 text-[11px] font-mono">
                      Highest Match: {Math.round(simResults[0].score * 10)} pts
                    </span>
                  )}
                </div>

                {simResults.map((res, i) => (
                  <div
                    key={res.chunk.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] flex items-center justify-center font-bold">
                          #{i + 1}
                        </span>
                        <span className="text-xs font-bold text-white">{res.documentTitle}</span>
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
                          {res.chunk.sectionTitle}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                        Score: {res.score.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      {res.chunk.content}
                    </p>
                  </div>
                ))}

                {simResults.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No matching context found. Try uploading more documents or adjusting keywords.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>RAG Engine: <strong>Active & Injecting</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
