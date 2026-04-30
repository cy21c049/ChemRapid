import { useState, useEffect } from 'react';
import { getAttempts } from '../lib/db';
import { generateCoachingPlan, CoachingPlan } from '../lib/ai';
import { Target, TrendingUp, AlertTriangle, Lightbulb, PlayCircle, ExternalLink, RefreshCw, BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { EXACT_SYLLABUS_TOPICS } from '../lib/constants';

export function CoachView({ sessions }: { sessions: any[] }) {
  const [coachingPlan, setCoachingPlan] = useState<CoachingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCoachingPlan = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!sessions || sessions.length === 0) {
        throw new Error('Not enough history. Complete some practice sessions to unlock the coach!');
      }

      // Fetch details for the top 5 recent sessions to get specifics on what we got wrong
      const detailedSessions = await Promise.all(
        sessions.slice(0, 5).map(async (s) => {
          const attempts = await getAttempts(s.id);
          return { ...s, attempts };
        })
      );

      // Build the summary string
      let summary = '';
      detailedSessions.forEach((s: any, idx: number) => {
        summary += `Session ${idx + 1}: ${s.category} - ${s.subtopic} (Score: ${s.score}/${s.total})\n`;
        const mistakes = s.attempts?.filter((a: any) => !a.isCorrect && a.question);
        if (mistakes && mistakes.length > 0) {
          summary += `  Mistakes made on topics such as:\n`;
          mistakes.slice(0, 3).forEach((m: any) => {
            summary += `    - Question context: ${m.question.question.substring(0, 80)}...\n`;
          });
        }
      });

      // Just simple summary for older ones
      sessions.slice(5, 15).forEach((s: any, idx: number) => {
        summary += `Older Session ${idx + 6}: ${s.category} - ${s.subtopic} (Score: ${s.score}/${s.total})\n`;
      });

      const plan = await generateCoachingPlan(summary);
      setCoachingPlan(plan);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing your performance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoachingPlan();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-bold text-slate-200">AI Coach Analyzing Performance</h3>
        <p className="text-slate-500 max-w-md mt-2">
          Reviewing your last few sessions to identify strengths, blind spots, and generating highly targeted resources...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl text-center">
        <p className="text-rose-400 mb-4">{error}</p>
        <button onClick={loadCoachingPlan} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl transition-colors text-sm font-bold">
          Try Again
        </button>
      </div>
    );
  }

  if (!coachingPlan) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Info */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-6 md:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-indigo-400">
          <Target size={120} />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 relative z-10">
          <span className="text-indigo-400">AI Performance Coach</span>
        </h2>
        <p className="text-slate-400 mt-2 max-w-xl relative z-10">
          Based on your recent practicing, I've compiled a personalized SWOT analysis focusing on specific chemical concepts and gaps to help you crack the HPCL exam.
        </p>
        <button onClick={loadCoachingPlan} className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors z-10">
          <RefreshCw size={14} /> Refresh Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WEAKNESSES */}
        <div className="bg-rose-950/20 border border-rose-900/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl"><AlertTriangle size={20} /></div>
            <h3 className="text-lg font-bold text-slate-200">Weaknesses & Focus Areas</h3>
          </div>
          
          <div className="space-y-6">
            {coachingPlan.weaknesses?.map((w, i) => (
              <div key={i} className="bg-slate-900/40 p-5 rounded-2xl border border-rose-900/20">
                <h4 className="font-bold text-rose-300 mb-2">{w.topic}</h4>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{w.description}</p>
                
                <div className="mb-4">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Action Plan</div>
                  <p className="text-xs text-rose-200/80">{w.actionPlan}</p>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Recommended specific resources</div>
                  {w.resources?.map((r, ri) => (
                    <a 
                      key={ri} 
                      href={r.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 hover:border-rose-500/30 transition-all group"
                    >
                      {r.type === 'video' ? <PlayCircle size={16} className="text-rose-400" /> : <ExternalLink size={16} className="text-blue-400" />}
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white">{r.name}</span>
                      <span className="ml-auto text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
            {(!coachingPlan.weaknesses || coachingPlan.weaknesses.length === 0) && (
              <p className="text-sm text-slate-400">No major weaknesses identified yet.</p>
            )}
          </div>
        </div>

        {/* STRENGTHS */}
        <div className="bg-teal-950/20 border border-teal-900/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl"><TrendingUp size={20} /></div>
            <h3 className="text-lg font-bold text-slate-200">Strengths & Polish</h3>
          </div>
          
          <div className="space-y-6">
            {coachingPlan.strengths?.map((s, i) => (
              <div key={i} className="bg-slate-900/40 p-5 rounded-2xl border border-teal-900/20">
                <h4 className="font-bold text-teal-300 mb-2">{s.topic}</h4>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">{s.description}</p>
                
                <div className="p-4 bg-teal-950/30 border border-teal-800/30 rounded-xl">
                  <div className="flex gap-2 items-start text-teal-200 text-sm">
                    <Lightbulb size={16} className="shrink-0 mt-0.5 text-teal-400" />
                    <div>
                      <span className="font-bold block mb-1">Blind Spot Alert</span>
                      {s.blindSpots}
                    </div>
                  </div>
                  {s.resourceSuggestion && (
                    <div className="mt-3 pt-3 border-t border-teal-900/30 text-xs text-teal-300/80">
                      <strong>Look up:</strong> {s.resourceSuggestion}
                    </div>
                  )}
                </div>
              </div>
            ))}
             {(!coachingPlan.strengths || coachingPlan.strengths.length === 0) && (
              <p className="text-sm text-slate-400">Keep practicing to identify strengths!</p>
            )}
          </div>
        </div>

      </div>

      {/* SYLLABUS COVERAGE MAP */}
      <div className="bg-slate-900/30 border border-slate-800/50 p-6 md:p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl"><BookOpen size={20} /></div>
          <h3 className="text-xl font-bold text-slate-200">Syllabus Coverage Map</h3>
        </div>

        <div className="flex gap-4 mb-8 text-sm flex-wrap">
           <div className="flex items-center gap-2 text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"><CheckCircle2 size={16} className="text-teal-500" /> Covered & Doing Well</div>
           <div className="flex items-center gap-2 text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"><XCircle size={16} className="text-rose-500" /> Covered & Struggling</div>
           <div className="flex items-center gap-2 text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"><div className="w-2 h-2 rounded-full bg-amber-500 ml-1 mr-1" /> Not Covered / Unknown</div>
        </div>

        <div className="space-y-10">
          {Object.entries(EXACT_SYLLABUS_TOPICS).map(([category, topics]) => (
            <div key={category}>
              <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 border-b border-indigo-500/20 pb-2">{category}</h4>
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => {
                  const isGood = coachingPlan.coveredWellTopics?.includes(topic);
                  const isStruggling = coachingPlan.strugglingTopics?.includes(topic);
                  
                  return (
                    <div 
                      key={topic} 
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                        isGood 
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-300"
                          : isStruggling
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-amber-500/5 border-amber-500/20 text-amber-200/80"
                      )}
                    >
                      {isGood && <CheckCircle2 size={12} className="text-teal-500" />}
                      {isStruggling && <XCircle size={12} className="text-rose-500" />}
                      {!isGood && !isStruggling && <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />}
                      {topic}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
