import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../store";
import { doc, getDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";
import { getAttempts } from "../lib/db";
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Home } from "lucide-react";
import { renderWithLatex } from "../components/LatexText";
import { cn } from "../lib/utils";
import { BookmarkButton } from "../components/BookmarkButton";
import { CATEGORIES } from "../lib/constants";

const AutoLatex = ({ text }: { text: string }) => <>{renderWithLatex(text)}</>;

export default function Summary() {
  const { currentSessionId, questions, endSession, category, subtopics } = useSessionStore();
  const navigate = useNavigate();
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!currentSessionId) {
      navigate('/home');
      return;
    }

    const fetchSession = async () => {
      try {
        const d = await getDoc(doc(db, 'sessions', currentSessionId));
        if (d.exists()) {
          setScore(d.data().score);
        }
        const atts = await getAttempts(currentSessionId);
        
        // Backwards compatibility: fetch question data if not embedded
        const enrichedAtts = await Promise.all(atts.map(async (att: any) => {
          if (!att.question && att.questionId) {
            try {
              const qSnap = await getDoc(doc(db, 'questions', att.questionId));
              if (qSnap.exists()) {
                return { ...att, question: { id: qSnap.id, ...qSnap.data() } };
              }
            } catch (e) {
              console.error("Failed to load past question data:", e);
            }
          }
          return att;
        }));
        
        setAttempts(enrichedAtts);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `sessions/${currentSessionId}`);
      }
    };
    fetchSession();
  }, [currentSessionId, navigate]);

  const handleFinish = () => {
    endSession();
    navigate('/dashboard');
  };

  if (score === null) return (
    <div className="h-screen bg-[#020617] text-slate-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
      Calculating session results...
    </div>
  );

  const accuracy = Math.round((score / questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none fixed"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none fixed"></div>

      <nav className="relative z-10 flex items-center justify-center px-6 py-4 md:px-8 md:py-6 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-0.5">Session Summary</span>
      </nav>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full p-6 space-y-8 pb-32">
        {/* Header Stats */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-block relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-800" />
              <circle 
                cx="64" cy="64" r="60" 
                stroke={accuracy > 70 ? '#14b8a6' : accuracy > 40 ? '#f59e0b' : '#f43f5e'} 
                strokeWidth="8" fill="none" 
                strokeDasharray="377"
                strokeDashoffset={377 - (accuracy / 100) * 377}
                className={cn("transition-all duration-1000 ease-out", accuracy > 70 ? "drop-shadow-[0_0_12px_rgba(20,184,166,0.5)]" : accuracy > 40 ? "drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" : "drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]")}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl font-black font-mono text-slate-100">{score}</span>
              <span className="text-slate-500 text-sm font-mono font-bold mt-1">/ {questions.length}</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Session Complete</h1>
          <p className="text-slate-400 text-lg">
            {accuracy > 70 ? 'Excellent performance! You are mastering this topic.' : accuracy > 40 ? 'Good effort, but there is room for improvement.' : 'Review the explanations carefully. You need more practice.'}
          </p>
        </div>

        {/* Question Review */}
        <div className="space-y-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-slate-800"></div>
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-slate-500">Detailed Review</h2>
            <div className="h-[1px] flex-1 bg-slate-800"></div>
          </div>
          
          {attempts.map((att: any, i: number) => {
            const q = att.question;
            if (!q) return null;
            return (
              <div key={i} className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 font-mono text-8xl font-black pointer-events-none text-slate-100">{i + 1}</div>
                <BookmarkButton question={q} className="absolute top-4 right-4 z-20" />
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-teal-500 flex items-center justify-between">
                  <span>Question {i + 1}</span>
                  {att.isCorrect ? <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded text-[10px]">CORRECT</span> : <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[10px]">INCORRECT</span>}
                </div>
                <h3 className="text-lg font-medium mb-6 leading-relaxed text-slate-200 relative z-10">
                  <AutoLatex text={q.question} />
                </h3>
                 
                {!att.isCorrect && att.selectedOption && (
                   <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-4 text-rose-100 text-sm relative z-10 mb-4">
                     <XCircle className="shrink-0 mt-0.5 text-rose-500" size={20} />
                     <div className="flex-1 font-mono">
                       <span className="font-bold text-rose-500 uppercase tracking-wider text-[10px] block mb-2">Your Answer</span>
                       <AutoLatex text={att.selectedOption} />
                     </div>
                   </div>
                )}
                {!att.selectedOption && (
                   <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 text-amber-100 text-sm relative z-10 mb-4">
                     <span className="font-bold text-amber-500 uppercase tracking-wider text-[10px] block">Timed Out - No Answer Selected</span>
                   </div>
                )}
                
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex gap-4 text-teal-100 text-sm relative z-10 mb-6">
                  <CheckCircle className="shrink-0 mt-0.5 text-teal-500" size={20} />
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
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-900 flex gap-3 z-20">
        <div className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              endSession();
              navigate('/dashboard');
            }}
            className="flex-1 bg-slate-800 text-slate-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <Home size={20} />
            Main Menu
          </button>
          <button
            onClick={() => {
              const currentCat = category;
              const currentSubs = subtopics;
              const catData = CATEGORIES.find(c => c.title === currentCat);
              if (catData) {
                navigate(`/category/${catData.id}`, { state: { retry: true, subtopics: currentSubs } });
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex-[2] bg-teal-500 text-slate-950 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-400 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.2)]"
          >
            <RotateCcw size={20} />
            Try 10 More Similar
          </button>
        </div>
      </div>
    </div>
  );
}
