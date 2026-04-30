import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateMockTest, MCQ } from '../lib/ai';
import { saveQuestions, createSession, saveAttempt, finishSession } from '../lib/db';
import { useAuthStore, useCoachStore } from '../store';
import { renderWithLatex } from '../components/LatexText';
import { Loader2, Timer, CheckCircle, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AutoLatex = ({ text }: { text: string }) => <>{renderWithLatex(text)}</>;

type MockAttempt = {
  question: MCQ;
  questionId: string;
  selectedAnswer: string | null;
  timeSpent: number;
};

export default function MockTest() {
  const [questions, setQuestions] = useState<(MCQ & { id: string })[]>([]);
  const [attempts, setAttempts] = useState<MockAttempt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(50 * 60); // 50 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        setLoading(true);
        // compute priority topics to fix weaknesses and cover uncovered topics
        const { weakTopics, uncoveredTopics } = useCoachStore.getState();
        const priorityTopics = [...weakTopics, ...uncoveredTopics].slice(0, 15);
        
        // Generate 50 questions
        const rawQs = await generateMockTest(50, priorityTopics);
        // Save them to DB
        const savedQs = await saveQuestions(rawQs, "Mock Test");
        // Ensure type compatibility with id
        const completeQs = savedQs.map((q, i) => ({
          ...q,
           id: q.id || `temp_${i}`,
           question: rawQs[i].question,
           options: rawQs[i].options,
           correctAnswer: rawQs[i].correctAnswer,
           explanation: rawQs[i].explanation,
           subtopic: rawQs[i].subtopic,
        })) as (MCQ & { id: string })[];

        setQuestions(completeQs);
        setAttempts(completeQs.map(q => ({
          question: q,
          questionId: q.id,
          selectedAnswer: null,
          timeSpent: 0 // We'll keep rough time per question by dividing total time later, or not bother per question. Actually, let's track time per question when rendered.
        })));
        setLoading(false);

        // Start timer
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              handleFinish(completeQs, liveAttemptsRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err: any) {
        console.error("Mock Test Generation failed", err);
        alert(err.message || "Failed to generate Mock Test");
        navigate('/home');
      }
    }
    init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  // Sync latest attempt state if we are passing manually
  const liveAttemptsRef = useRef<MockAttempt[]>([]);
  useEffect(() => {
    liveAttemptsRef.current = attempts;
  }, [attempts]);

  const handleFinish = async (qs: (MCQ & { id: string })[] = questions, atts: MockAttempt[] = attempts) => {
    if (isSubmitting || !user) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const sessionId = await createSession(user.uid, {
        category: "Full Mock Test",
        subtopics: ["Mixed"],
      });

      if (!sessionId) throw new Error("Failed to create session");

      let totalScore = 0;
      
      for (let i = 0; i < qs.length; i++) {
        const attempt = atts[i];
        const isCorrect = attempt.selectedAnswer === qs[i].correctAnswer;
        if (isCorrect) totalScore += 1;
        
        await saveAttempt(sessionId, {
          questionId: qs[i].id,
          selectedAnswer: attempt.selectedAnswer,
          isCorrect,
          timeSpent: attempt.timeSpent,
        });
      }

      await finishSession(sessionId, totalScore, qs.length, user.uid);
      navigate(`/session-review/${sessionId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to submit test. Your progress might be lost.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-8" />
        <h2 className="text-2xl font-bold mb-2">Generating 50 Unique Questions</h2>
        <p className="text-slate-400 text-center max-w-md">Our AI is drafting a unique mock test spanning Inorganic, Organic, and Physical Chemistry. This will take about 30-40 seconds...</p>
      </div>
    );
  }

  const q = questions[currentIndex];
  const attempt = attempts[currentIndex];

  const handleSelectAnswer = (ans: string) => {
    setAttempts(prev => {
      const newAtt = [...prev];
      newAtt[currentIndex] = { ...newAtt[currentIndex], selectedAnswer: ans };
      return newAtt;
    });
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans flex flex-col relative pb-32 lg:pb-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.05)_0%,_transparent_50%)] pointer-events-none fixed" />
      
      {/* Top Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => { if(window.confirm("Are you sure you want to quit? Your progress won't be saved.")) navigate('/home'); }} className="text-slate-400 hover:text-white transition text-sm font-bold uppercase">
            Exit
          </button>
          <div className="w-px h-6 bg-slate-800" />
          <h1 className="font-bold text-slate-200">Full Mock Test</h1>
        </div>
        
        <div className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm font-mono text-sm font-bold", timeLeft < 300 ? "border-rose-500/50 text-rose-400 bg-rose-500/10 animate-pulse" : "border-slate-700/50 text-indigo-400 bg-slate-900/80")}>
          <Timer size={16} />
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10 max-w-7xl mx-auto w-full gap-6 p-6">
        
        {/* Main Question Area */}
        <div className="flex-1 flex flex-col max-w-3xl">
          <div className="mb-6 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
            <span>QUESTION {currentIndex + 1} OF 50</span>
            <span className="bg-slate-900 px-3 py-1 border border-slate-800 rounded text-indigo-300">{q?.subtopic || "Topic"}</span>
          </div>
          
          <div className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-slate-800/50 shadow-sm flex-1 mb-6 flex flex-col">
            <h2 className="text-xl md:text-2xl font-medium leading-relaxed mb-8 flex-1">
              <AutoLatex text={q?.question || ""} />
            </h2>
            
            <div className="grid gap-3">
              {q?.options.map((opt, i) => {
                const isSelected = attempt?.selectedAnswer === opt;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAnswer(opt)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200 shadow-sm",
                      isSelected 
                        ? "bg-indigo-500 text-white border-indigo-400 font-medium" 
                        : "bg-slate-900/80 text-slate-300 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
                    )}
                  >
                    <AutoLatex text={opt} />
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Bottom Nav inside main area */}
          <div className="flex items-center justify-between mt-auto">
            <button 
              onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={18} /> Prev
            </button>
            <button 
               onClick={() => {
                 if (currentIndex === questions.length - 1) {
                   if(window.confirm("Submit Mock Test?")) handleFinish();
                 } else {
                   setCurrentIndex(p => Math.min(questions.length - 1, p + 1));
                 }
               }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {currentIndex === questions.length - 1 ? (isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Test") : "Next"} <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar - Question Palette */}
        <div className="w-full lg:w-72 mt-8 lg:mt-0 lg:border-l border-slate-800/50 lg:pl-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">Palette</h3>
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-300">
              {attempts.filter(a => a.selectedAnswer).length} / 50 answered
            </span>
          </div>
          
          <div className="grid grid-cols-5 gap-2 content-start overflow-y-auto pr-2 custom-scroll">
            {questions.map((_, i) => {
              const isAnswered = !!attempts[i]?.selectedAnswer;
              const isCurrent = currentIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "w-10 h-10 rounded-full text-xs font-bold transition-all relative",
                    isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#020617]" : "",
                    isAnswered 
                      ? "bg-indigo-600 text-white border border-indigo-400" 
                      : "bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800"
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/50">
             <button 
               onClick={() => { if(window.confirm("Ready to submit your entire test?")) handleFinish(); }}
               disabled={isSubmitting}
               className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-lg rounded-2xl shadow-lg transition-transform hover:-translate-y-1 transform disabled:opacity-50"
             >
               {isSubmitting ? "Submitting..." : "Submit Mock Test"}
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}
