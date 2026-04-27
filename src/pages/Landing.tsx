import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store";
import { useEffect } from "react";
import { Atom } from "lucide-react";
import { toast } from "sonner";

export default function Landing() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(245,158,11,0.05)_0%,_transparent_40%)] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 text-center">
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="p-4 bg-teal-500/10 rounded-3xl border border-teal-500/20 mb-6 shadow-[0_0_30px_rgba(20,184,166,0.15)] relative">
            <div className="absolute inset-0 bg-teal-500/20 rounded-3xl blur-xl"></div>
            <Atom className="w-16 h-16 text-teal-400 relative z-10" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-2 block">HPCL Junior Executive QC</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100">
            Chem<span className="text-teal-400">Rapid</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mt-4 leading-relaxed max-w-sm">
            Master chemistry with AI-generated <span className="text-slate-200 font-medium">IIT-JAM grade</span> flashcard practice.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/50 p-8 rounded-3xl backdrop-blur-md shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none"></div>
          
          <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">
            Sign in to track your streaks, monitor accuracy, and benchmark your chemistry preparation.
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-950 hover:bg-slate-100 py-4 px-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path
                d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.81002 8.87028 4.75 12.0003 4.75Z"
                fill="#EA4335"
              />
              <path
                d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                fill="#4285F4"
              />
              <path
                d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                fill="#FBBC05"
              />
              <path
                d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.185 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                fill="#34A853"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>

      <div className="mt-12 text-center relative z-10 pt-12 border-t border-slate-800 w-full max-w-sm">
         <span className="block text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-2">Powered by Lovable AI & Gemini</span>
         <span className="block text-[10px] text-slate-600 font-mono tracking-wider">v1.2.0 • HPCL PREP</span>
      </div>
    </div>
  );
}
