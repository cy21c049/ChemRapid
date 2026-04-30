import { useState } from "react";
import { Flag, Loader2, Send } from "lucide-react";
import { reviewQuestionReport } from "../lib/ai";
import { handleReportResult } from "../lib/db";
import { cn } from "../lib/utils";
import { NotebookLLMButton } from "./NotebookLLMButton";

export function ReportButton({ 
  question, 
  sessionId, 
  attemptId, 
  className, 
  onResolved 
}: { 
  question: any, 
  sessionId: string, 
  attemptId: string, 
  className?: string,
  onResolved: () => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{message: string, credited: boolean, isValidError: boolean} | null>(null);

  const handleSubmit = async () => {
    if (!reportText.trim() || loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      const result = await reviewQuestionReport(question, reportText);
      await handleReportResult(sessionId, attemptId, question.id, result.creditUser, result.updatedQuestion);
      setFeedback({
        message: result.feedback,
        credited: result.creditUser,
        isValidError: result.isValidError
      });
      if (result.creditUser || result.isValidError) {
        onResolved();
      }
    } catch (e: any) {
       console.error("Report error:", e);
       setFeedback({ message: "An error occurred while analyzing: " + e.message, credited: false, isValidError: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={cn("p-2 bg-slate-900/80 border border-slate-700/50 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-rose-400 group relative", className)}
        title="Report an issue or dispute answer"
      >
        <Flag size={18} className="group-hover:scale-110 transition-transform"/>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Flag size={20} className="text-rose-500" /> 
                Report/Dispute Question
              </h3>
              
              {!feedback ? (
                <>
                  <p className="text-sm text-slate-400 mb-4">
                    Think the answer is wrong? Found a typo? Explain your reasoning here, and our AI tutor will instantly review it. If you're right, we'll fix the question and award you credit!
                  </p>
                  
                  <textarea 
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="E.g., I think the answer is B because Kohlrausch's law states that..."
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none mb-4"
                  />
                  
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 font-bold text-sm text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSubmit}
                      disabled={!reportText.trim() || loading}
                      className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Submit Review
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className={cn("p-4 rounded-xl border", feedback.credited ? "bg-teal-500/10 border-teal-500/20 text-teal-200" : "bg-slate-800/50 border-slate-700 text-slate-300")}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{feedback.message}</p>
                    {feedback.credited && (
                      <div className="mt-3 font-bold text-teal-400 text-sm flex items-center gap-2">
                        🎉 Question updated and you got points!
                      </div>
                    )}
                  </div>

                  {!feedback.credited && !feedback.isValidError && (
                      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex flex-col gap-3">
                        <p className="text-xs text-slate-400">Still have doubts? Let NotebookLLM generate short notes using your UG Chemistry syllabus notebook.</p>
                        <NotebookLLMButton question={question} variant="solid" />
                      </div>
                  )}

                  <button 
                    onClick={() => {
                        setIsOpen(false);
                        setFeedback(null);
                        setReportText("");
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
