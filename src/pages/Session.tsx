import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore, useAuthStore } from "../store";
import { saveAttempt, finishSession } from "../lib/db";
import { renderWithLatex } from "../components/LatexText";
import { cn } from "../lib/utils";

// Make LatexText easier to use
const AutoLatex = ({ text }: { text: string }) => <>{renderWithLatex(text)}</>;

export default function Session() {
  const { currentSessionId, questions } = useSessionStore();
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (!currentSessionId || questions.length === 0) {
      navigate('/home');
    }
  }, [currentSessionId, questions, navigate]);

  useEffect(() => {
    let timer: any;
    if (!isRevealed && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isRevealed) {
      handleTimeOut();
    }
    return () => clearInterval(timer);
  }, [timeLeft, isRevealed]);

  const handleTimeOut = async () => {
    setIsRevealed(true);
    await saveAttempt(currentSessionId!, {
      questionId: currentQ.id,
      question: currentQ,
      selectedOption: null,
      isCorrect: false,
      timeTakenSeconds: 60
    });
  };

  const handleOptionSelect = async (option: string) => {
    if (isRevealed) return;
    setIsRevealed(true);
    setSelectedOption(option);
    
    // Check correctness correctly
    const isCorrect = option === currentQ.correctAnswer;
    if (isCorrect) {
      setScore(s => s + 1);
    }

    await saveAttempt(currentSessionId!, {
      questionId: currentQ.id,
      question: currentQ,
      selectedOption: option,
      isCorrect,
      timeTakenSeconds: 60 - timeLeft
    });
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(curr => curr + 1);
      setTimeLeft(60);
      setIsRevealed(false);
      setSelectedOption(null);
    } else {
      // Use latest score directly
      const finalScore = selectedOption === currentQ.correctAnswer ? score + 1 : score;
      await finishSession(currentSessionId!, finalScore, questions.length, user!.uid);
      navigate('/summary');
    }
  };

  if (!currentQ) return null;

  const isTimerDanger = timeLeft < 15;
  const isTimerCritical = timeLeft <= 5;
  const timerStroke = isTimerCritical ? '#ef4444' : isTimerDanger ? '#f59e0b' : '#3b82f6';
  const progress = (timeLeft / 60) * 100;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans overflow-hidden relative flex flex-col">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none"></div>

      {/* Top Navigation / Status Bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-8 md:py-6 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-0.5">Current Category</span>
            <span className="text-sm font-semibold text-slate-200">{currentQ.category}: {currentQ.subtopic}</span>
          </div>
          <div className="hidden sm:block h-8 w-[1px] bg-slate-800"></div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700/50">
            <span className="text-orange-500">🔥</span>
            <span className="text-sm font-mono font-bold">{user ? "HPCL PREP" : "PRACTICE"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "w-4 h-1.5 md:w-8 rounded-full",
                  idx < currentIndex ? "bg-teal-500" : idx === currentIndex ? "bg-slate-700 animate-pulse" : "bg-slate-800",
                  idx < currentIndex && "shadow-[0_0_8px_rgba(20,184,166,0.6)]"
                )}
              ></div>
            ))}
          </div>
          <span className="text-xs font-mono text-slate-500 ml-2">Q {currentIndex + 1}/{questions.length}</span>
        </div>

        <button onClick={() => navigate('/home')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </nav>

      {/* Main UI */}
      <main className="relative z-10 flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-8 p-6 md:p-10 overflow-y-auto">
        
        {/* Question Content */}
        <div className="col-span-12 lg:col-span-8 flex flex-col justify-center">
          <div className="space-y-2 mb-8">
            <span className="inline-block px-3 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-wider">
              IIT-JAM Standard • Advanced Level
            </span>
            <h1 className="text-2xl md:text-3xl font-medium leading-relaxed text-slate-100">
              <AutoLatex text={currentQ.question} />
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ.options.map((opt: string, i: number) => {
              const isSelected = selectedOption === opt;
              const isTargetCorrect = opt === currentQ.correctAnswer;
              
              let btnClass = "bg-slate-900/60 border-slate-700/50 hover:border-teal-500/50 hover:bg-slate-900/80";
              let letterClass = "bg-slate-800 text-slate-400 group-hover:bg-teal-500 group-hover:text-white";
              
              if (isRevealed) {
                if (isTargetCorrect) {
                  btnClass = "border-teal-500 bg-teal-500/10 hover:bg-teal-500/10";
                  letterClass = "bg-teal-500 text-white";
                } else if (isSelected && !isTargetCorrect) {
                  btnClass = "border-rose-500 bg-rose-500/10 hover:bg-rose-500/10";
                  letterClass = "bg-rose-500 text-white";
                } else {
                  btnClass = "border-slate-800/50 opacity-40";
                  letterClass = "bg-slate-800 text-slate-500";
                }
              }

              return (
                <button
                  key={i}
                  disabled={isRevealed}
                  onClick={() => handleOptionSelect(opt)}
                  className={cn(
                    "group relative p-4 md:p-6 border rounded-2xl text-left transition-all",
                    btnClass
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg transition-colors", letterClass)}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-base md:text-lg font-mono flex-1 overflow-hidden" style={{ wordBreak: 'break-word' }}>
                      <AutoLatex text={opt} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Explanation Panel */}
          {isRevealed && (
            <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className={cn(
                "p-6 rounded-3xl border",
                (selectedOption === currentQ.correctAnswer) ? "border-teal-500/30 bg-teal-500/5 text-teal-100" : "border-rose-500/30 bg-rose-500/5 text-rose-100"
              )}>
                <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                  {(selectedOption === currentQ.correctAnswer) ? '🎉 Correct!' : (selectedOption === null ? '⏰ Time passed!' : '❌ Incorrect')}
                </h3>
                <div className="text-sm md:text-base opacity-90 leading-relaxed font-sans">
                  <AutoLatex text={currentQ.explanation} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timer & Controls */}
        <div className="col-span-12 lg:col-span-4 flex flex-col items-center lg:justify-center space-y-12 mt-12 lg:mt-0">
          {/* Circular Timer */}
          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 md:w-56 md:h-56 transform -rotate-90">
              <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" style={{ transformOrigin: 'center', transform: 'scale(1)' }}/>
              <circle 
                cx="112" cy="112" r="100" 
                stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray="628" 
                strokeDashoffset={628 - (timeLeft / 60) * 628} 
                className={cn("transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]", isTimerCritical ? "text-rose-500" : isTimerDanger ? "text-amber-500" : "text-teal-500")}
                style={{ transformOrigin: 'center', transform: 'scale(1)' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn("text-5xl md:text-6xl font-mono font-black", isTimerCritical ? "text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]" : isTimerDanger ? "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" : "text-teal-500 drop-shadow-[0_0_12px_rgba(20,184,166,0.5)]")}>{timeLeft}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">seconds left</span>
            </div>
          </div>

          {/* Side Stats Panel */}
          <div className="w-full max-w-sm bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Score</span>
              <span className="text-xs font-mono font-bold text-teal-400">{score}/{questions.length}</span>
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${(score / questions.length) * 100}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Focus on accuracy and speed. IIT-JAM level questions test conceptual depth.
            </p>
          </div>

          {isRevealed && (
            <button
              onClick={handleNext}
              className="w-full max-w-sm bg-teal-500 text-slate-950 py-4 rounded-2xl font-bold text-lg hover:bg-teal-400 transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}
            </button>
          )}
        </div>
      </main>

      {/* Bottom Bar Info */}
      <footer className="relative z-10 px-6 py-4 md:px-10 flex flex-col sm:flex-row items-center justify-between bg-slate-950 border-t border-slate-900 gap-4 sm:gap-0">
        <div className="flex flex-wrap justify-center gap-4 text-[10px] md:text-[11px] text-slate-600 font-mono">
          <span>CAT: {currentQ.category?.substring(0,10)?.toUpperCase()}</span>
          <span>MODEL: GEMINI-3-PRO</span>
          <span>SESSION: {currentSessionId?.substring(0,8)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Timer active</span>
          <div className="w-8 h-4 bg-teal-900/40 rounded-full relative">
            <div className="absolute right-1 top-1 w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
