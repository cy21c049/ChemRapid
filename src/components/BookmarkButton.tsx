import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuthStore } from "../store";
import { toggleBookmark } from "../lib/db";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export function BookmarkButton({ question, className }: { question: any, className?: string }) {
  const user = useAuthStore(state => state.user);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!user || !question.id) return;
    let isMounted = true;
    const check = async () => {
      try {
        const ref = doc(db, 'bookmarks', `${user.uid}_${question.id}`);
        const snap = await getDoc(ref);
        if (isMounted) setBookmarked(snap.exists());
      } catch (error) {
        console.error("Failed to check bookmark status", error);
      }
    };
    check();
    return () => { isMounted = false; }
  }, [user, question.id]);

  const handleToggle = async (e: any) => {
    e.stopPropagation();
    if (!user) return;
    const newState = await toggleBookmark(user.uid, question);
    if (newState !== undefined) {
       setBookmarked(newState);
       if (newState) toast.success("Bookmarked!");
       else toast.info("Removed from bookmarks");
    }
  }

  return (
    <button onClick={handleToggle} className={cn("p-2 transition-colors rounded-full hover:bg-slate-800", className)}>
      {bookmarked ? <BookmarkCheck className="text-teal-500" /> : <Bookmark className="text-slate-400" />}
    </button>
  );
}
