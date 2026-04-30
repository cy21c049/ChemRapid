import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CATEGORIES, EXACT_SYLLABUS_TOPICS } from "../lib/constants";
import { ArrowLeft, Sparkles, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore, useSessionStore, useCoachStore } from "../store";
import { getQuestions, saveQuestions, createSession } from "../lib/db";
import { generateMCQs } from "../lib/ai";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const CHEMISTRY_FACTS: Record<string, string[]> = {
  "Inorganic Chemistry": [
    "The 4f electrons have poor shielding effect, leading to the Lanthanide Contraction.",
    "A chelating ligand forms a ring structure with the central metal ion, increasing stability.",
    "According to VSEPR theory, lone pair-lone pair repulsions are greater than bond pair-bond pair repulsions.",
    "Paramagnetic substances are weakly attracted by a magnetic field because of unpaired electrons.",
    "Hard-Soft Acid-Base (HSAB) principle states that hard acids prefer hard bases, and soft acids prefer soft bases.",
    "Octahedral complexes with strong-field ligands usually form low-spin complexes."
  ],
  "Organic Chemistry": [
    "Lewis acids are electron-pair acceptors, while Lewis bases are electron-pair donors.",
    "Carbocation stability follows the order: 3° > 2° > 1° > methyl.",
    "SN2 reactions proceed via a concerted mechanism with complete stereochemical inversion.",
    "Aromatic compounds must be cyclic, planar, fully conjugated, and follow Hückel's 4n+2 rule.",
    "Enantiomers are chiral molecules that are non-superimposable mirror images of one another.",
    "Electrophilic aromatic substitution is directed by the substituent already attached to the ring."
  ],
  "Physical Chemistry": [
    "The value of Planck's constant is approximately 6.626 × 10⁻³⁴ J·s.",
    "Entropy (S) is a measure of the disorder or randomness of a closed system.",
    "A catalyst lowers the activation energy of a reaction but does not change its equilibrium.",
    "The Heisenberg uncertainty principle states that you cannot simultaneously know a particle's exact position and momentum.",
    "Raoult's law states that the partial vapor pressure of a component is directly proportional to its mole fraction.",
    "The standard enthalpy of formation of an element in its standard state is zero."
  ],
  "Analytical Chemistry": [
    "Phenolphthalein is a pH indicator that is colorless in acidic solutions and pink in basic solutions.",
    "Beer-Lambert Law states that absorbance is directly proportional to the concentration of the absorbing species.",
    "Chromatography separates mixtures based on differential affinities between a stationary phase and a mobile phase.",
    "A buffer solution resists drastic changes in pH when small amounts of acid or base are added.",
    "Gas chromatography is widely used to separate vaporizable compounds without decomposition."
  ]
};

const GENERAL_FACTS = [
  "The value of Planck's constant is approximately 6.626 × 10⁻³⁴ J·s.",
  "Lewis acids are electron-pair acceptors, while Lewis bases are electron-pair donors.",
  "A buffer solution resists drastic changes in pH when small amounts of acid or base are added.",
  "Electronegativity generally increases across a period and decreases down a group."
];

export default function SubtopicPicker() {
  const { category } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [loadingFact, setLoadingFact] = useState<string>("");
  const user = useAuthStore(state => state.user);
  const startSession = useSessionStore(state => state.startSession);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

  const catData = CATEGORIES.find(c => c.id === category);

  useEffect(() => {
    if (loading && catData) {
      const facts = CHEMISTRY_FACTS[catData.title] || GENERAL_FACTS;
      
      const pickRandomFact = () => {
        const randomIdx = Math.floor(Math.random() * facts.length);
        setLoadingFact(facts[randomIdx]);
      };
      
      pickRandomFact(); // initial
      
      const interval = setInterval(pickRandomFact, 4000);
      return () => clearInterval(interval);
    }
  }, [loading, catData]);

  if (!catData) {
    return <div className="p-6 text-center text-red-500">Category not found</div>;
  }

  const startPractice = async (isTrailMix = false, overrideSubtopics?: string[]) => {
    if (!user) return;
    
    let targetSubtopics = isTrailMix ? [] : (overrideSubtopics || selectedSubtopics);
    if (!isTrailMix && targetSubtopics.length === 0) {
      toast.error("Please select at least one subtopic.");
      return;
    }

    setLoading(true);
    try {
      let bankQuestions = await getQuestions(catData.title, targetSubtopics, 30);
      
      // Shuffle bank questions so we don't always get the exact same ones
      bankQuestions.sort(() => Math.random() - 0.5);

      let finalQuestions: any[] = [];

      let amountFromBank = Math.min(bankQuestions.length, 5); // Take up to 5 from bank to ensure fresh AI mix
      finalQuestions = bankQuestions.slice(0, amountFromBank);
      let needed = 10 - amountFromBank;

      toast(`Crafting ${needed} fresh questions...`);
      
      // Extract questions to avoid repeating
      const avoidList = bankQuestions.map((q: any) => q.question);
      
      // If trail mix, compute priority topics to fix weaknesses and cover uncovered topics
      let priorityTopics: string[] = [];
      if (isTrailMix) {
         const { weakTopics, uncoveredTopics } = useCoachStore.getState();
         const categoryTopics = EXACT_SYLLABUS_TOPICS[catData.title] || [];
         priorityTopics = [
            ...weakTopics.filter(t => categoryTopics.includes(t)),
            ...uncoveredTopics.filter(t => categoryTopics.includes(t))
         ].slice(0, 10); // Limit to 10 subtopics so AI isn't overwhelmed
      }

      const newQs = await generateMCQs(catData.title, targetSubtopics, avoidList, priorityTopics);
      
      const newQsMapped = newQs.map(q => ({
        ...q,
        subtopic: q.subtopic || (targetSubtopics.length > 0 ? targetSubtopics[0] : "Trail Mix")
      }));
      
      const saved = await saveQuestions(newQsMapped.slice(0, needed), catData.title);
      finalQuestions = [...finalQuestions, ...saved].filter(Boolean); // filter out nulls

      // Shuffle final questions
      finalQuestions.sort(() => Math.random() - 0.5);

      if (finalQuestions.length === 0) {
        throw new Error("Could not generate questions. Please try again.");
      }

      // Start Session
      const sessionId = await createSession(user.uid, {
        category: catData.title,
        subtopic: targetSubtopics.length > 0 ? (targetSubtopics.length === 1 ? targetSubtopics[0] : "Mixed Selection") : "Trail Mix",
        total: finalQuestions.length
      });

      if (sessionId) {
        startSession(sessionId, finalQuestions, catData.title, targetSubtopics);
        navigate('/session');
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.retry && catData && user && !loading) {
      const targetSubtopics = location.state.subtopics || [];
      setSelectedSubtopics(targetSubtopics);
      
      // Remove retry from history to avoid loops
      navigate(location.pathname, { replace: true, state: {} });
      
      // Fire it right away with the given subtopics
      startPractice(targetSubtopics.length === 0, targetSubtopics);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, catData, user]);

  const toggleSubtopic = (sub: string) => {
    setSelectedSubtopics(prev => {
      if (prev.includes(sub)) return prev.filter((s) => s !== sub);
      if (prev.length >= 10) {
        toast.error("You can select up to 10 topics max.");
        return prev;
      }
      return [...prev, sub];
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 font-sans flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4 relative z-10" />
        <h2 className="text-xl font-bold relative z-10 mb-6">Crafting IIT-JAM-grade questions...</h2>
        
        <div className="relative z-10 max-w-md w-full mx-auto p-5 bg-slate-900/60 rounded-xl border border-teal-500/20 backdrop-blur-sm shadow-[0_0_15px_rgba(20,184,166,0.1)] min-h-[140px] flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-3 block">Did you know?</span>
          <div className="relative flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingFact}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-slate-300 font-medium leading-relaxed w-full"
              >
                "{loadingFact || "Summoning the chemistry AI..."}"
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none fixed"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none fixed"></div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-8 md:py-6 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={() => navigate('/home')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors -ml-2 text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-0.5">Category</span>
            <h1 className="text-sm font-semibold text-slate-200">{catData.title}</h1>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full p-6 md:p-10 pb-32">
        <button
          onClick={() => startPractice(true)}
          className="group w-full mb-8 flex items-center gap-5 text-left p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-teal-500/30 hover:border-teal-500 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_30px_rgba(20,184,166,0.15)] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none"></div>
          <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-400 group-hover:scale-110 transition-transform relative z-10">
            <Sparkles size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-xl md:text-2xl text-teal-400 mb-1">Trail Mix (10 Qs)</h3>
            <p className="text-teal-500/70 text-sm">Randomized rapid-fire practice across all subtopics</p>
          </div>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-slate-800"></div>
          <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-slate-500">Targeted Practice</h2>
          <div className="h-[1px] flex-1 bg-slate-800"></div>
        </div>
        
        <p className="text-sm text-slate-400 mb-6 font-mono">Select up to 10 subtopics for a focused session.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {catData.subtopics.map((sub, idx) => {
            const isSelected = selectedSubtopics.includes(sub);
            return (
              <button
                key={idx}
                onClick={() => toggleSubtopic(sub)}
                className={cn(
                  "text-left py-5 px-6 rounded-2xl border transition-all font-medium flex items-center justify-between",
                  isSelected 
                    ? "bg-teal-500/10 border-teal-500/50 text-teal-200" 
                    : "bg-slate-900/40 border-slate-800/50 hover:border-slate-600 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
                )}
              >
                <span className="flex-1 pr-4">{sub}</span>
                {isSelected && <Check size={18} className="text-teal-400 shrink-0" />}
              </button>
            )
          })}
        </div>
      </main>
      
      {selectedSubtopics.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-900 z-50 flex justify-center animate-in slide-in-from-bottom-4">
           <button
             onClick={() => startPractice(false)}
             className="w-full max-w-sm bg-teal-500 text-slate-950 py-4 px-6 rounded-2xl font-bold flex items-center justify-between hover:bg-teal-400 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.2)]"
           >
             <span>Start Practice ({selectedSubtopics.length})</span>
             <span className="bg-slate-950/20 px-2 py-1 rounded-md text-xs">10 Qs</span>
           </button>
        </div>
      )}
    </div>
  );
}
