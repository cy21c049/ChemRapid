import { useNavigate } from "react-router-dom";
import { useAuthStore, useCoachStore } from "../store";
import { CATEGORIES, EXACT_SYLLABUS_TOPICS } from "../lib/constants";
import { Flame, LogOut, Settings, BarChart2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { useEffect } from "react";
import { getUserSessions, getAttempts } from "../lib/db";

export default function Home() {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const setCoachData = useCoachStore((state) => state.setCoachData);
  const navigate = useNavigate();

  useEffect(() => {
    async function backgroundCoachAnalysis() {
      if (!user) return;
      const sessions = await getUserSessions(user.uid);
      
      const topicStats: Record<string, { correct: number, total: number }> = {};
      
      const allSyllabusTopics = Object.values(EXACT_SYLLABUS_TOPICS).flat();
      
      // Analyze recent sessions
      for (const s of sessions) {
        // Fast tracking if a standard single topic session
        if (allSyllabusTopics.includes(s.subtopic)) {
           if (!topicStats[s.subtopic]) topicStats[s.subtopic] = { correct: 0, total: 0 };
           topicStats[s.subtopic].correct += s.score;
           topicStats[s.subtopic].total += s.total;
        } else if (s.subtopic === "Trail Mix" || s.subtopic === "Mixed Selection" || s.category === "Full Mock Test") {
           // We'd have to get attempts, just limit to top 5 recent mixed sessions
        }
      }

      // Detailed attempt level for last 5 sessions
      const detailedSessions = await Promise.all(
        sessions.slice(0, 5).map(async (s) => {
          const attempts = await getAttempts(s.id);
          return { ...s, attempts };
        })
      );

      for (const s of detailedSessions) {
        for (const att of s.attempts) {
           if (att.question && att.question.subtopic) {
              const sub = att.question.subtopic;
              if (!topicStats[sub]) topicStats[sub] = { correct: 0, total: 0 };
              topicStats[sub].total += 1;
              if (att.isCorrect) {
                topicStats[sub].correct += 1;
              }
           }
        }
      }

      const covered = Object.keys(topicStats);
      const uncovered = allSyllabusTopics.filter(t => !covered.includes(t));
      
      const weak = Object.entries(topicStats)
        .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) < 0.6)
        .map(([topic]) => topic);

      setCoachData(weak, uncovered);
      console.log("Background Coach Analysis Complete: ", { weak, uncovered });
    }
    backgroundCoachAnalysis();
  }, [user]);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none fixed"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none fixed"></div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-8 md:py-6 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-0.5">ChemRapid</span>
            <span className="text-sm font-semibold text-slate-200">Hello, {profile?.displayName || 'Aspirant'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-5">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700/50 shadow-sm">
            <span className="text-orange-500"><Flame size={16}/></span>
            <span className="text-sm font-mono font-bold text-orange-400">{profile?.currentStreak || 0} DAY STREAK</span>
          </div>
          
          <button onClick={() => navigate('/dashboard')} className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors">
            <BarChart2 size={20} />
          </button>
          <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-6 md:p-10">
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-4">
              Practice Hub
            </span>
            <h2 className="text-3xl md:text-4xl font-medium leading-relaxed text-slate-100">
              Choose a Chemistry Category
            </h2>
          </div>
          <button 
            onClick={() => navigate('/mock-test')}
            className="group relative bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <div className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-xl">🏆</span>
              <span>Take Full Mock Test</span>
              <span className="text-indigo-200 text-sm font-normal">• 50 Qs</span>
            </div>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/category/${cat.id}`)}
              className="group relative p-8 bg-slate-900/60 border border-slate-700/50 rounded-3xl text-left hover:border-teal-500/50 transition-all hover:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] overflow-hidden"
            >
              <div className="relative z-10">
                <h3 className="font-bold text-xl md:text-2xl text-slate-100 mb-2 group-hover:text-teal-300 transition-colors">{cat.title}</h3>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-teal-500 font-mono text-xs">
                    {cat.subtopics.length}
                  </div>
                  <span className="text-slate-400 text-sm font-mono tracking-wide uppercase">Subtopics</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0H5a2 2 0 0 1-2-2v-4m6 6h10a2 2 0 0 0 2-2v-4m0 0V9m0 6v-6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
