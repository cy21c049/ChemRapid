import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBookmarks } from "../lib/db";
import { useAuthStore } from "../store";
import { ArrowLeft, Bookmark } from "lucide-react";
import { renderWithLatex } from "../components/LatexText";
import { BookmarkButton } from "../components/BookmarkButton";

const AutoLatex = ({ text }: { text: string }) => <>{renderWithLatex(text)}</>;

export default function Bookmarks() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const bms = await getBookmarks(user.uid);
      setBookmarks(bms);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-[#020617] text-slate-100 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
        <div className="text-amber-500 font-mono text-sm tracking-widest uppercase animate-pulse">Loading Bookmarks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none fixed"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none fixed"></div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors -ml-2 text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-0.5">Library</span>
            <span className="text-sm font-semibold text-slate-200">Your Bookmarks</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-amber-500">
          <Bookmark size={18} className="fill-amber-500" />
          <span className="font-mono font-bold text-sm">{bookmarks.length}</span>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full p-6 space-y-8 pb-32">
        {bookmarks.length === 0 ? (
           <div className="text-center py-20">
             <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-full mb-4">
               <Bookmark size={32} className="text-slate-600" />
             </div>
             <h2 className="text-xl font-bold text-slate-200 mb-2">No bookmarks yet</h2>
             <p className="text-slate-500 text-sm">Questions you bookmark during review will appear here.</p>
           </div>
        ) : (
          <div className="space-y-6 pt-2">
            {bookmarks.map((q: any, i: number) => (
              <div key={q.id || i} className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-sm relative overflow-hidden">
                <BookmarkButton question={q} className="absolute top-4 right-4 z-20" />
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                   {q.category} • {q.subtopic}
                </div>
                <h3 className="text-lg font-medium mb-6 leading-relaxed text-slate-200 relative z-10">
                  <AutoLatex text={q.question} />
                </h3>
                  
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex gap-4 text-teal-100 text-sm relative z-10 mb-6">
                  <div className="flex-1 font-mono">
                    <span className="font-bold text-teal-500 uppercase tracking-wider text-[10px] block mb-2">Correct Answer</span>
                    <AutoLatex text={q.correctAnswer} />
                  </div>
                </div>
                
                <div className="text-sm text-slate-300 leading-relaxed relative z-10 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-2">Explanation</span>
                  <div className="font-sans">
                    <AutoLatex text={q.explanation} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
