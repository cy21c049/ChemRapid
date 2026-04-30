import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, getAttempts } from "../lib/db";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { renderWithLatex } from "../components/LatexText";
import { cn } from "../lib/utils";
import { BookmarkButton } from "../components/BookmarkButton";
import { ReportButton } from "../components/ReportButton";
import { NotebookLLMButton } from "../components/NotebookLLMButton";

const AutoLatex = ({ text }: { text: string }) => <>{renderWithLatex(text)}</>;

export default function SessionReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachingPlan, setCoachingPlan] = useState<any>(null);
  const [generatingCoach, setGeneratingCoach] = useState(false);

  const loadData = async () => {
    if (!sessionId) return;
    const sesh = await getSession(sessionId);
    if (sesh) {
      setSession(sesh);
      const atts = await getAttempts(sessionId);
      
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
        if (att.question) return att;
        return null;
      }));
      
      const validAtts = enrichedAtts.filter(a => a !== null);
      setAttempts(validAtts);

      if ((sesh as any).category === "Full Mock Test" && !coachingPlan) {
         generateMockCoach(sesh, validAtts);
      }
    }
  };

  const generateMockCoach = async (sesh: any, atts: any[]) => {
    try {
       setGeneratingCoach(true);
       const { generateCoachingPlan } = await import('../lib/ai');
       // Create a textual summary of this mock test
       let summary = `Mock Test Score: ${sesh.score}/${sesh.total}\n\n`;
       summary += atts.map((att) => {
          return `Question: ${att.question.question}\nCorrect Answer: ${att.question.correctAnswer}\nStudent Selected: ${att.selectedAnswer || 'None'}\nResult: ${att.isCorrect ? 'Correct' : 'Incorrect'}\nSubtopic: ${att.question.subtopic}\n`;
       }).join('\n');
       
       const plan = await generateCoachingPlan(summary);
       setCoachingPlan(plan);
    } catch (e) {
       console.error("Failed to generate coach plan for mock:", e);
    } finally {
       setGeneratingCoach(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData().then(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="h-screen bg-[#020617] text-slate-100 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
        <div className="text-teal-500 font-mono text-sm tracking-widest uppercase animate-pulse">Loading Session History...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-400 mb-4 font-mono">Session not found.</p>
        <button onClick={() => navigate('/dashboard')} className="text-teal-500 hover:text-teal-400 font-bold px-4 py-2 bg-slate-900 rounded-lg">Return to Dashboard</button>
      </div>
    )
  }

  const accuracy = Math.round((session.score / session.total) * 100);

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
            <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-0.5">Session Review</span>
            <span className="text-sm font-semibold text-slate-200">{session.category} • {session.subtopic}</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full p-6 space-y-8 pb-32">
        <div className="text-center space-y-4 pt-4">
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
              <span className="text-4xl font-black font-mono text-slate-100">{session.score}</span>
              <span className="text-slate-500 text-sm font-mono font-bold mt-1">/ {session.total}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Performance Review</h1>
        </div>

        {generatingCoach && (
          <div className="bg-slate-900/40 border border-indigo-500/30 rounded-2xl p-6 text-center animate-pulse">
             <div className="text-indigo-400 font-bold mb-2">AI Coach is analyzing your Mock Test...</div>
             <p className="text-sm text-slate-400">Please wait while we generate a breakdown of your strengths, weaknesses, and a personalized action plan.</p>
          </div>
        )}

        {coachingPlan && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-slate-800"></div>
              <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-500">Mock Test Analysis</h2>
              <div className="h-[1px] flex-1 bg-slate-800"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-teal-500/20">
                <h3 className="text-lg font-bold text-teal-400 mb-6 flex items-center gap-2"><CheckCircle size={20}/> Strength Areas</h3>
                <div className="space-y-6">
                  {coachingPlan.strengths.map((str: any, i: number) => (
                    <div key={i} className="space-y-2">
                       <h4 className="font-bold text-slate-200">{str.topic}</h4>
                       <p className="text-sm text-slate-400">{str.description}</p>
                       <div className="bg-teal-500/10 p-3 rounded-xl border border-teal-500/20 text-xs text-teal-300">
                         <strong>Blind Spot to Check:</strong> {str.blindSpots} <br/>
                         <strong>Resource:</strong> {str.resourceSuggestion}
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-rose-500/20">
                <h3 className="text-lg font-bold text-rose-400 mb-6 flex items-center gap-2"><XCircle size={20}/> Weakness Areas</h3>
                <div className="space-y-6">
                  {coachingPlan.weaknesses.map((wk: any, i: number) => (
                    <div key={i} className="space-y-2">
                       <h4 className="font-bold text-slate-200">{wk.topic}</h4>
                       <p className="text-sm text-slate-400">{wk.description}</p>
                       <p className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded block border border-rose-500/20">{wk.actionPlan}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <NotebookLLMButton question={q} />
                  <ReportButton 
                    question={q} 
                    sessionId={sessionId} 
                    attemptId={att.id} 
                    onResolved={loadData} 
                  />
                  <BookmarkButton question={q} />
                </div>
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
    </div>
  );
}
