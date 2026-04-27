import { ArrowLeft, Flame, Target, ListChecks, Award, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store";
import { useEffect, useState } from "react";
import { getUserSessions } from "../lib/db";
import { format } from "date-fns";

export default function Dashboard() {
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      getUserSessions(user.uid).then(setSessions);
    }
  }, [user]);

  const totalScore = sessions.reduce((acc, cur) => acc + cur.score, 0);
  const totalQuestions = sessions.reduce((acc, cur) => acc + cur.total, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none fixed"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none fixed"></div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-8 md:py-6 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={() => navigate('/home')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors -ml-2 text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-0.5">Performance Area</span>
            <h1 className="text-sm font-semibold text-slate-200">Your Dashboard</h1>
          </div>
        </div>
        <button onClick={() => navigate('/bookmarks')} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2 border border-slate-800 rounded-xl transition-colors">
          <Bookmark size={16} className="text-amber-500" />
          <span className="text-sm font-bold text-amber-500 hidden sm:block">Bookmarks</span>
        </button>
      </nav>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-6 md:p-10 space-y-8">
        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500 transform group-hover:scale-110 transition-transform"><Flame size={64}/></div>
            <div className="flex items-center gap-2 text-orange-500 mb-4 relative z-10">
              <Flame size={20} />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Streak</span>
            </div>
            <div className="text-4xl font-black text-slate-100 relative z-10">{profile?.currentStreak || 0}</div>
            <div className="text-xs text-slate-400 mt-2 font-mono relative z-10">BEST: {profile?.bestStreak || 0}</div>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-teal-500 transform group-hover:scale-110 transition-transform"><Target size={64}/></div>
            <div className="flex items-center gap-2 text-teal-500 mb-4 relative z-10">
              <Target size={20} />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Accuracy</span>
            </div>
            <div className="text-4xl font-black text-slate-100 relative z-10">{accuracy}<span className="text-xl text-teal-500/50 font-medium ml-1">%</span></div>
            <div className="text-xs text-slate-400 mt-2 font-mono relative z-10">OVERALL AVG</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500 transform group-hover:scale-110 transition-transform"><ListChecks size={64}/></div>
            <div className="flex items-center gap-2 text-blue-500 mb-4 relative z-10">
              <ListChecks size={20} />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Attempted</span>
            </div>
            <div className="text-4xl font-black text-slate-100 relative z-10">{totalQuestions}</div>
            <div className="text-xs text-slate-400 mt-2 font-mono relative z-10">QUESTIONS</div>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-500 transform group-hover:scale-110 transition-transform"><Award size={64}/></div>
            <div className="flex items-center gap-2 text-rose-500 mb-4 relative z-10">
              <Award size={20} />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Sessions</span>
            </div>
            <div className="text-4xl font-black text-slate-100 relative z-10">{sessions.length}</div>
            <div className="text-xs text-slate-400 mt-2 font-mono relative z-10">COMPLETED</div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="text-lg font-bold mb-6 text-slate-200">Recent Sessions</h2>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-sm">No sessions yet. Start practicing!</p>
            ) : (
              sessions.slice(0, 50).map((session, i) => (
                <div key={i} onClick={() => navigate(`/session-review/${session.id}`)} className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer group hover:border-teal-500/30">
                  <div>
                    <h3 className="font-bold text-sm text-teal-400 group-hover:text-teal-300">{session.category}</h3>
                    <p className="text-xs text-slate-300 mt-1">{session.subtopic}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-mono">{format(new Date(session.startedAt), 'MMM d, yyyy · HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xl text-slate-100 group-hover:text-white">{session.score} <span className="text-slate-600 text-sm font-normal">/ {session.total}</span></div>
                    <div className="text-xs font-mono font-bold mt-1 text-teal-500">{Math.round((session.score / session.total) * 100)}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
