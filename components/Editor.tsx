
import React, { useRef } from 'react';

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  isLoading: boolean;
}

const Editor: React.FC<EditorProps> = ({ content, onChange, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start writing or paste your text here..."
        className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-[17px] font-medium text-slate-300 leading-[1.8] placeholder-slate-700 outline-none custom-scrollbar pr-4 selection:bg-[#00f5b4]/20"
        spellCheck={false}
      />
    </div>
  );
};

export default Editor;
