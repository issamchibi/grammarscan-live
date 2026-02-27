
import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { WritingMode, WritingStyle, AnalysisResponse } from './types';
import { analyzeText } from './services/geminiService';

const MODE_CARDS = [
  { id: WritingMode.BUSINESS_EMAIL, icon: "✉️", title: "Business Email", desc: "Craft professional correspondence with ease." },
  { id: WritingMode.ACADEMIC_ESSAY, icon: "📚", title: "Academic Essay", desc: "Refine your academic papers for clarity and precision." },
  { id: WritingMode.RESUME_BULLETS, icon: "📄", title: "Resume Bullet Points", desc: "Polish your resume to stand out to recruiters." },
  { id: WritingMode.CREATIVE_WRITING, icon: "🎨", title: "Creative Writing", desc: "Bring your stories to life with vivid language." },
  { id: WritingMode.BLOG_PARAGRAPH, icon: "📝", title: "Blog Paragraph", desc: "Optimize your blog content for engagement." },
  { id: WritingMode.INBOX_INTEL, icon: "🛡️", title: "Inbox Optimization Intelligence", desc: "Analyze cold emails, predict inbox vs spam placement, and improve deliverability." },
];

const STYLE_WHITELIST: WritingStyle[] = ['normal', 'professional', 'academic', 'friendly', 'email', 'creative'];

interface HistoryEntry {
  id: number;
  text: string;
  date: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const isAuthenticated = !!user;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [content, setContent] = useState('');
  const [selectedMode, setSelectedMode] = useState<WritingMode>(WritingMode.CORRECTION);
  
  // Paraphrase Style State
  const [paraphraseStyle, setParaphraseStyle] = useState<WritingStyle>('normal');
  
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickyMode, setIsPickyMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  
  // UI State
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  
  // Refs
  const historyRef = useRef<HTMLDivElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHistory = () => {
    try {
      const storageKey = 'grammarscan_saved_results';
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setHistoryItems(saved.sort((a: HistoryEntry, b: HistoryEntry) => b.id - a.id));
    } catch (e) {
      setHistoryItems([]);
    }
  };

  const updateStyleSecurely = (style: string) => {
    if (STYLE_WHITELIST.includes(style as WritingStyle)) {
      setParaphraseStyle(style as WritingStyle);
      setIsStyleMenuOpen(false);
      showToast(`Paraphrase style set to ${style}`, 'info');
    } else {
      console.warn(`Security Warning: Blocked attempt to set unlisted style: ${style}`);
      setParaphraseStyle('normal');
    }
  };

  const handleModeSelect = (mode: WritingMode) => {
    setSelectedMode(mode);
    const styleMap: Record<string, WritingStyle> = {
      [WritingMode.BUSINESS_EMAIL]: 'email',
      [WritingMode.ACADEMIC_ESSAY]: 'academic',
      [WritingMode.RESUME_BULLETS]: 'professional',
      [WritingMode.CREATIVE_WRITING]: 'creative',
      [WritingMode.BLOG_PARAGRAPH]: 'friendly',
      [WritingMode.INBOX_INTEL]: 'professional',
      [WritingMode.CORRECTION]: 'normal',
    };
    const newStyle = styleMap[mode] || 'normal';
    updateStyleSecurely(newStyle);
  };

  /**
   * Dedicated Grammar Handler
   * Requirements: { text: content, mode: "grammar" }
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email', 'info');
      return;
    }

    setIsAuthLoading(true);
    try {
      const response = await fetch('https://white-bird-0549.issamchibi123.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      showToast('Successfully signed up!');
      setUser({ email: email.trim() });
      setIsAuthModalOpen(false);
      setEmail('');
    } catch (err) {
      showToast('Error connecting to service', 'info');
      console.error(err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCheckGrammar = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    try {
      // Connect grammar button to API with specific payload
      const result = await analyzeText({ 
        text: content, 
        mode: 'grammar',
        tone: paraphraseStyle 
      });
      
      // Separate Result: Preserve paraphrase, update grammar sections
      setAnalysis(prev => ({
        detected_language: 'auto',
        corrected_text: (result as any).corrected || '',
        rewrite: '',
        paraphrase: prev?.paraphrase || '',
        tone: paraphraseStyle
      }));
      
      showToast('Grammar check completed');
    } catch (err: any) {
      console.error(err);
      showToast('Service currently unavailable', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Dedicated Paraphrase Handler
   * Requirements: { text: content, mode: "paraphrase", tone: paraphraseStyle }
   */
  const handleParaphrase = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      // Connect paraphrase button with specific payload: tone instead of style
      const result = await analyzeText({ 
        text: content, 
        mode: 'paraphrase', 
        tone: paraphraseStyle 
      });
      
      // Separate Result: Preserve grammar correction, update paraphrase sections
      setAnalysis(prev => ({
        detected_language: prev?.detected_language || 'auto',
        corrected_text: prev?.corrected_text || '',
        rewrite: '',
        paraphrase: (result as any).corrected || '',
        tone: paraphraseStyle
      }));

      showToast(`Paraphrase completed (${paraphraseStyle})`);
    } catch (err: any) {
      console.error(err);
      showToast('Service currently unavailable', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFromHistory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    try {
      const storageKey = 'grammarscan_saved_results';
      const existingSaves = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedSaves = existingSaves.filter((item: HistoryEntry) => item.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updatedSaves));
      fetchHistory();
      showToast('Item removed from history', 'info');
    } catch (err) {
      showToast('Failed to delete item', 'info');
    }
  };

  const handleToolbarAction = (index: number) => {
    if ([1, 2, 3, 5].includes(index) && !isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    const textToExport = analysis?.corrected_text || content;
    switch (index) {
      case 0:
        if (!textToExport.trim()) { showToast('Nothing to copy', 'info'); return; }
        navigator.clipboard.writeText(textToExport);
        showToast('Text copied to clipboard');
        break;
      case 1:
        if (!textToExport.trim()) { showToast('No content to export', 'info'); return; }
        try {
          const doc = new jsPDF();
          doc.setFontSize(12);
          doc.text(textToExport, 10, 10, { maxWidth: 180 });
          doc.save("grammarscan-result.pdf");
          showToast('PDF exported successfully');
        } catch (err) { showToast('Failed to generate PDF', 'info'); }
        break;
      case 2:
        if (!textToExport.trim()) { showToast('No content to download', 'info'); return; }
        try {
          const blob = new Blob([textToExport], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'grammarscan-result.txt';
          a.click();
          URL.revokeObjectURL(url);
          showToast('Downloaded as TXT');
        } catch (err) { showToast('Failed to download TXT', 'info'); }
        break;
      case 3:
        fetchHistory();
        setIsHistoryOpen(!isHistoryOpen);
        break;
      case 4:
        setContent('');
        setAnalysis(null);
        showToast('Workspace cleared', 'info');
        break;
      case 5:
        if (!analysis?.corrected_text && !content.trim()) { showToast('Nothing to save', 'info'); return; }
        try {
          const storageKey = 'grammarscan_saved_results';
          const existingSaves = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const newSave = {
            id: Date.now(),
            text: analysis?.corrected_text || content,
            date: new Date().toLocaleDateString()
          };
          localStorage.setItem(storageKey, JSON.stringify([...existingSaves, newSave]));
          showToast('Saved to history');
        } catch (err) { showToast('Failed to save', 'info'); }
        break;
    }
  };

  const loadFromHistory = (item: HistoryEntry) => {
    setContent(item.text);
    setAnalysis(null);
    setIsHistoryOpen(false);
    showToast('Loaded from history');
  };

  return (
    <div className="min-h-screen bg-[#090e16] text-white font-['Inter'] flex flex-col items-center relative overflow-x-hidden">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-[#111827] border border-[#00f5b4]/30 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-2 h-2 rounded-full bg-[#00f5b4] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-200">{toast.message}</span>
        </div>
      )}

      <nav className="w-full h-16 border-b border-white/5 glass sticky top-0 z-[100] px-12 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2 cursor-pointer group">
            <span className="text-lg font-bold tracking-tight text-[#00f5b4] group-hover:drop-shadow-[0_0_8px_rgba(0,245,180,0.4)] transition-all text-shadow">Grammar<span className="text-white">Scan</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-[11px] font-bold px-3 py-1 bg-white/5 rounded-md text-[#00f5b4] border border-white/10">Home</a>
            <a href="#" className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors">Premium</a>
            <a href="#" className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors">Tools</a>
            <a href="#" className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors">Blog</a>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white text-[11px] font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9-3-9m-9 9a9 9 0 019-9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            US English ▾
          </div>
          <button onClick={() => setIsAuthModalOpen(true)} className="text-[11px] font-bold text-slate-300 hover:text-white">Log In</button>
          <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-2 bg-[#00f5b4] text-slate-900 rounded-lg text-[11px] font-extrabold hover:bg-[#00d49b] transition-all shadow-[0_0_15px_rgba(0,245,180,0.1)]">Sign Up</button>
        </div>
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setIsAuthModalOpen(false)} 
          />
          <div className="relative w-full max-w-md bg-[#111827] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-[#00f5b4]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#00f5b4]/20">
                <svg className="w-8 h-8 text-[#00f5b4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Create free account</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">Unlock unlimited copy, downloads and history.</p>
              
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div className="relative">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00f5b4]/50 transition-all placeholder:text-slate-600"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3.5 bg-[#00f5b4] text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#00d49b] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                  ) : 'Sign up with Email'}
                </button>

                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <button 
                  type="button"
                  onClick={() => { setUser({ name: 'Demo User' }); setIsAuthModalOpen(false); showToast('Welcome back!'); }}
                  className="w-full py-3.5 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
              </form>
              
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="pt-12 pb-10 px-8 text-center max-w-7xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 leading-[1.1] tracking-tight text-white drop-shadow-sm">
          Write with Confidence and <br/> Clarity.
        </h1>
        
        <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Main Tool Container */}
          <div className="w-full bg-[#111827]/60 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-xl flex flex-col gap-8">
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div className="flex items-center gap-1 bg-[#111827] p-1.5 rounded-2xl border border-white/5 shadow-inner">
                {['English (US)', 'Français', 'Español', 'Deutsch'].map((lang) => (
                  <button 
                    key={lang} 
                    className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${lang === 'English (US)' ? 'bg-[#00f5b4] text-slate-900 shadow-lg shadow-[#00f5b4]/20' : 'text-slate-500 hover:text-white'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setIsPickyMode(!isPickyMode); showToast(isPickyMode ? 'Picky mode disabled' : 'Picky mode enabled'); }}
                  className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${isPickyMode ? 'bg-[#00f5b4] text-slate-900 border-[#00f5b4] shadow-lg shadow-[#00f5b4]/20' : 'bg-[#111827] text-slate-400 border-white/5 hover:text-slate-200 hover:bg-white/5'}`}
                >
                  Picky Mode
                </button>
                
                <div className="flex items-center gap-2.5 relative">
                  {[
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round"/></svg>,
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round"/></svg>,
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ].map((icon, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleToolbarAction(i)} 
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${i === 3 && isHistoryOpen ? 'bg-[#00f5b4] border-[#00f5b4] text-slate-900 shadow-lg shadow-[#00f5b4]/20' : i === 0 || i === 5 ? 'bg-[#00f5b4]/10 border-[#00f5b4]/30 text-[#00f5b4] hover:bg-[#00f5b4]/20' : 'bg-[#111827] border-white/5 text-slate-500 hover:text-slate-200 hover:bg-white/5'}`} 
                      title={["Copy", "Download PDF", "Download TXT", "History", "Delete Workspace", "Save to History"][i]}
                    >
                      {icon}
                    </button>
                  ))}

                  {isHistoryOpen && (
                    <div ref={historyRef} className="absolute top-14 right-0 w-80 max-h-[400px] bg-[#111827] border border-white/10 rounded-2xl shadow-2xl z-[150] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between"><h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Workspace History</h5></div>
                      <div className="overflow-y-auto custom-scrollbar flex-1">
                        {historyItems.length === 0 ? (
                          <div className="p-10 text-center opacity-30 flex flex-col items-center gap-3"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round"/></svg><span className="text-[11px] font-bold">No saved sessions yet</span></div>
                        ) : (
                          historyItems.map((item) => (
                            <div key={item.id} className="relative group/item border-b border-white/5">
                              <button onClick={() => loadFromHistory(item)} className="w-full p-5 text-left hover:bg-white/[0.03] transition-colors pr-12 group">
                                <p className="text-[12px] text-slate-300 line-clamp-2 mb-2 leading-relaxed group-hover:text-white">{item.text}</p>
                                <div className="flex items-center justify-between"><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{item.date}</span><span className="text-[9px] font-bold text-[#00f5b4] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Load ↵</span></div>
                              </button>
                              <button onClick={(e) => deleteFromHistory(item.id, e)} className="absolute top-5 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover/item:opacity-100" title="Remove from history"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round"/></svg></button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editor and Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
              <div className="flex flex-col relative group transition-all">
                <Editor content={content} onChange={setContent} isLoading={isLoading} />
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{wordCount} Words</div>
                  <button 
                    onClick={() => { setContent(''); setAnalysis(null); showToast('Workspace cleared', 'info'); }} 
                    className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="bg-white/[0.02] rounded-3xl border border-white/5 p-8 shadow-inner overflow-hidden backdrop-blur-sm min-h-[400px]">
                 <Sidebar analysis={analysis} originalText={content} isLoading={isLoading} onApply={(text) => { setContent(text); showToast('Improvements applied!'); }} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-white/5">
               <button 
                onClick={handleCheckGrammar} 
                disabled={isLoading || !content.trim()} 
                className="px-12 py-5 bg-gradient-to-br from-[#00f5b4] to-[#00d49b] text-slate-900 rounded-2xl font-black text-[14px] uppercase tracking-[0.15em] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-xl shadow-[#00f5b4]/20 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:shadow-none flex items-center gap-3"
               >
                 {isLoading ? (
                   <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                 ) : null}
                 {isLoading ? 'Processing...' : 'Check Grammar'}
               </button>
               
               <div className="flex items-center gap-3">
                 <button 
                  onClick={handleParaphrase} 
                  disabled={isLoading || !content.trim()}
                  className="px-12 py-5 bg-white/5 text-white rounded-2xl font-black text-[14px] uppercase tracking-[0.15em] border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-30 flex items-center gap-3"
                 >
                   {isLoading ? (
                     <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   ) : null}
                   {isLoading ? 'Processing...' : 'Paraphrase'}
                 </button>

                 <div className="relative" ref={styleMenuRef}>
                   <button 
                    onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                    className={`px-6 py-5 bg-[#111827] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest border transition-all flex items-center gap-3 hover:border-white/20 active:scale-95 ${isStyleMenuOpen ? 'border-[#00f5b4] ring-1 ring-[#00f5b4]/20' : 'border-white/10'}`}
                   >
                     Style: <span className="text-[#00f5b4]">{paraphraseStyle}</span>
                     <svg className={`w-3 h-3 transition-transform duration-300 ${isStyleMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </button>
                   
                   {isStyleMenuOpen && (
                     <div className="absolute bottom-full left-0 mb-4 w-60 bg-[#111827]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[150] overflow-hidden py-3 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200">
                       <div className="px-5 py-2 border-b border-white/5 mb-2">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Paraphrase Voice</span>
                       </div>
                       <div className="max-h-64 overflow-y-auto custom-scrollbar">
                         {STYLE_WHITELIST.map((style) => (
                           <button
                             key={style}
                             onClick={() => updateStyleSecurely(style)}
                             className={`w-full px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-between group/style ${paraphraseStyle === style ? 'text-[#00f5b4] bg-[#00f5b4]/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                           >
                             <span className="flex items-center gap-3">
                               <div className={`w-1.5 h-1.5 rounded-full transition-all ${paraphraseStyle === style ? 'bg-[#00f5b4] shadow-[0_0_8px_#00f5b4]' : 'bg-slate-700 group-hover/style:bg-slate-500'}`} />
                               {style}
                             </span>
                           </button>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
            </div>
            
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] opacity-40 text-center mt-4">Free. No signup required.</p>
          </div>
        </div>
      </header>

    </div>
  );
};

export default App;
