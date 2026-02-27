
import React, { useState } from 'react';
import { AnalysisResponse } from '../types';

interface SidebarProps {
  analysis: AnalysisResponse | null;
  originalText?: string;
  onApply: (text: string) => void;
  isLoading: boolean;
}

/**
 * Compares original and corrected strings to identify changed segments.
 */
const getDiffSegments = (original: string, corrected: string) => {
  const wordsO = original.split(/(\s+)/).filter(Boolean);
  const wordsC = corrected.split(/(\s+)/).filter(Boolean);
  
  let i = 0, j = 0;
  const originalSegments: React.ReactNode[] = [];
  const correctedSegments: React.ReactNode[] = [];
  
  while (i < wordsO.length || j < wordsC.length) {
    const o = wordsO[i];
    const c = wordsC[j];

    // Case 1: Exact match
    if (o === c) {
      if (o !== undefined) {
        const node = <span key={`match-${i}-${j}`} className="text-slate-400">{o}</span>;
        originalSegments.push(node);
        correctedSegments.push(node);
      }
      i++; j++;
      continue;
    }

    // Case 2: Content mismatch (Substitutions, Additions, Deletions)
    const oTrim = o?.trim();
    const cTrim = c?.trim();

    if (oTrim && cTrim) {
      // Substitution
      originalSegments.push(
        <span key={`orig-err-${i}`} className="text-red-400/80 font-medium underline decoration-red-500/30 underline-offset-[6px] decoration-1">{o}</span>
      );
      correctedSegments.push(
        <span key={`corr-fix-${j}`} className="text-[#00f5b4] font-semibold">{c}</span>
      );
      i++; j++;
    } else if (oTrim) {
      // Deletion from original
      originalSegments.push(
        <span key={`orig-del-${i}`} className="text-red-400/80 font-medium underline decoration-red-500/30 underline-offset-[6px] decoration-1">{o}</span>
      );
      i++;
    } else if (cTrim) {
      // Addition in corrected
      correctedSegments.push(
        <span key={`corr-add-${j}`} className="text-[#00f5b4] font-semibold">{c}</span>
      );
      j++;
    } else {
      // Sync whitespace
      if (o && /^\s+$/.test(o)) {
        originalSegments.push(<span key={`ws-o-${i}`}>{o}</span>);
        i++;
      }
      if (c && /^\s+$/.test(c)) {
        correctedSegments.push(<span key={`ws-c-${j}`}>{c}</span>);
        j++;
      }
    }
  }
  
  return { originalSegments, correctedSegments };
};

const SafeText: React.FC<{ text: string; highlight?: boolean }> = ({ text, highlight }) => {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          <span className={highlight ? "text-[#00f5b4] font-medium" : ""}>{line}</span>
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ analysis, originalText, onApply, isLoading }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (analysis?.corrected_text) {
      try {
        await navigator.clipboard.writeText(analysis.corrected_text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5">
        <div className="w-12 h-12 border-[3px] border-[#00f5b4]/10 border-t-[#00f5b4] rounded-full animate-spin"></div>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] animate-pulse">Scanning Content...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-12 opacity-10">
        <svg className="w-16 h-16 text-slate-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-sm text-slate-500 font-medium">Insights and improvements will appear here.</p>
      </div>
    );
  }

  const { originalSegments, correctedSegments } = originalText 
    ? getDiffSegments(originalText, analysis.corrected_text)
    : { originalSegments: [], correctedSegments: [<SafeText key="safe" text={analysis.corrected_text} />] };

  return (
    <div className="h-full flex flex-col gap-8 custom-scrollbar overflow-y-auto pr-2">
      <div className="space-y-6">
        {/* Header Tools */}
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Analysis Results</h4>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-bold text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {analysis.detected_language || 'Detected'}
            </span>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2.5 text-[10px] font-bold text-slate-500 hover:text-[#00f5b4] transition-all group"
            >
              {copied ? <span className="text-[#00f5b4] animate-pulse">Copied!</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>}
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 1) ORIGINAL TEXT (top) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span>
            <h5 className="text-[9px] font-black text-red-500/70 uppercase tracking-widest">Original Text</h5>
          </div>
          <div className="p-7 rounded-2xl bg-red-500/[0.04] border border-red-500/10 leading-[1.8] text-[17px] text-slate-300 tracking-[0.015em] font-normal font-['Plus_Jakarta_Sans'] whitespace-pre-wrap">
            {originalSegments}
          </div>
        </div>

        {/* 2) CORRECTED TEXT (bottom) */}
        {analysis.corrected_text && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f5b4]/50"></span>
              <h5 className="text-[9px] font-black text-[#00f5b4]/70 uppercase tracking-widest">Corrected Text</h5>
            </div>
            <div className="p-7 rounded-2xl bg-[#00f5b4]/[0.04] border border-[#00f5b4]/10 leading-[1.8] text-[17px] tracking-[0.015em] font-normal text-white font-['Plus_Jakarta_Sans'] whitespace-pre-wrap shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              {correctedSegments}
            </div>
          </div>
        )}

        {/* Paraphrase Alternative */}
        {analysis.paraphrase && (
          <div className="pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
            <h4 className="text-[10px] font-black text-[#00f5b4] uppercase tracking-[0.3em] mb-3">Paraphrase ({analysis.tone})</h4>
            <div className="p-7 rounded-2xl bg-white/[0.04] border border-white/10 leading-[1.8] text-[17px] text-slate-200 tracking-[0.015em] font-normal font-['Plus_Jakarta_Sans'] whitespace-pre-wrap">
              <SafeText text={analysis.paraphrase} />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-4">
        <button 
          onClick={() => onApply(analysis.corrected_text)}
          className="w-full py-4 bg-[#00f5b4]/10 hover:bg-[#00f5b4]/20 text-[#00f5b4] text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-[#00f5b4]/20 transition-all active:scale-[0.98] shadow-lg shadow-[#00f5b4]/5"
        >
          Apply Improvements
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
