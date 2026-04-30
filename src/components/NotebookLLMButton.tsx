import { useState } from "react";
import { BookOpen, ExternalLink, Check } from "lucide-react";
import { cn } from "../lib/utils";

export function NotebookLLMButton({ question, className, variant = "default" }: { question: any, className?: string, variant?: "default" | "solid" }) {
  const [copied, setCopied] = useState(false);

  const handleLearnMore = () => {
    const prompt = `Please create short notes focusing specifically on the subtopic "${question.subtopic}". Use only the provided sources to explain the core concepts required to understand this question:\n\nQuestion: ${question.question}`;
    
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    window.open("https://notebooklm.google.com/notebook/39e0ac99-127b-4927-8757-0b02b995eeed", "_blank");
  };

  if (variant === "solid") {
      return (
        <button 
            onClick={handleLearnMore}
            className={cn("flex w-full justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all", className)}
        >
            {copied ? <Check size={16} /> : <BookOpen size={16} />}
            {copied ? "Prompt Copied! Opening..." : "Learn more via NotebookLLM"}
            {!copied && <ExternalLink size={14} className="opacity-70" />}
        </button>
      )
  }

  return (
    <button 
      onClick={handleLearnMore}
      className={cn("p-2 bg-slate-900/80 border border-slate-700/50 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-indigo-400 group relative flex items-center justify-center", className)}
      title="Learn more in NotebookLLM (copies prompt to clipboard)"
    >
      {copied ? <Check size={18} className="text-teal-400" /> : <BookOpen size={18} className="group-hover:scale-110 transition-transform" />}
    </button>
  );
}
