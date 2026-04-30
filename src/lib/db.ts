import { collection, doc, setDoc, getDoc, updateDoc, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export async function getProfile(userId: string) {
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `profiles/${userId}`);
  }
}

export async function createProfile(userId: string, data: any) {
  try {
    await setDoc(doc(db, 'profiles', userId), {
      ...data,
      ownerId: userId,
      joinedAt: Date.now(),
      currentStreak: 0,
      bestStreak: 0,
      totalAttempted: 0,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `profiles/${userId}`);
  }
}

export async function updateProfile(userId: string, data: any) {
  try {
    const docRef = doc(db, 'profiles', userId);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${userId}`);
  }
}

export async function getQuestions(category: string, subtopics: string[], amount: number) {
  try {
    const questionsRef = collection(db, 'questions');
    let q;
    if (subtopics.length > 0 && subtopics.length <= 10) {
      q = query(
        questionsRef,
        where('category', '==', category),
        where('subtopic', 'in', subtopics),
        limit(100)
      );
    } else {
      q = query(
        questionsRef,
        where('category', '==', category),
        limit(100)
      );
    }
    
    const snap = await getDocs(q);
    let results = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    
    // Local sort by createdAt desc to get newest if available
    results.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    return results.slice(0, amount);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'questions');
    return [];
  }
}

export async function saveQuestions(questions: any[], category: string) {
  const promises = questions.map(async (qData) => {
    try {
      const qRef = doc(collection(db, 'questions'));
      const qToSave = {
        question: typeof qData.question === 'string' ? qData.question : '',
        options: Array.isArray(qData.options) ? qData.options.map(String) : [],
        correctAnswer: typeof qData.correctAnswer === 'string' ? qData.correctAnswer : '',
        explanation: typeof qData.explanation === 'string' ? qData.explanation : '',
        category: typeof category === 'string' ? category : '',
        subtopic: typeof qData.subtopic === 'string' ? qData.subtopic : category,
        createdAt: serverTimestamp(),
      };
      console.log('Attempting to save question:', JSON.stringify({ ...qToSave, createdAt: 'serverTimestamp' }));
      await setDoc(qRef, qToSave);
      return { id: qRef.id, ...qToSave, createdAt: new Date() };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questions');
    }
  });
  return Promise.all(promises);
}

export async function createSession(userId: string, data: any) {
  try {
    const docRef = doc(collection(db, 'sessions'));
    await setDoc(docRef, {
      ...data,
      userId,
      startedAt: Date.now(),
      score: 0,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'sessions');
  }
}

export async function handleReportResult(
  sessionId: string, 
  attemptId: string, 
  questionId: string, 
  creditUser: boolean, 
  updatedQuestion?: any
) {
  try {
    if (updatedQuestion) {
      const qRef = doc(db, 'questions', questionId);
      await updateDoc(qRef, {
        question: updatedQuestion.question,
        options: updatedQuestion.options,
        correctAnswer: updatedQuestion.correctAnswer,
        explanation: updatedQuestion.explanation,
        subtopic: updatedQuestion.subtopic,
      });
    }

    const attRef = doc(db, `sessions/${sessionId}/attempts/${attemptId}`);
    const attUpdates: any = {};
    if (updatedQuestion) {
      attUpdates.question = { ...updatedQuestion, id: questionId };
    }
    if (creditUser) {
      attUpdates.isCorrect = true;
    }
    
    if (Object.keys(attUpdates).length > 0) {
      await updateDoc(attRef, attUpdates);
    }

    if (creditUser) {
      const sRef = doc(db, 'sessions', sessionId);
      const sSnap = await getDoc(sRef);
      if (sSnap.exists()) {
        const sData = sSnap.data();
        await updateDoc(sRef, {
          score: (sData.score || 0) + 1
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'report handling');
  }
}

export async function finishSession(sessionId: string, score: number, total: number, userId: string) {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      finishedAt: Date.now(),
      score,
    });

    // Update streak and profile
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      const now = new Date();
      const lastPractice = data.lastPracticeDate ? new Date(data.lastPracticeDate) : null;
      
      let newStreak = data.currentStreak || 0;
      
      if (!lastPractice) {
        newStreak = 1;
      } else {
        const diffMs = now.getTime() - lastPractice.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // next day
          newStreak += 1;
        } else if (diffDays > 1) {
          // lost streak
          newStreak = 1;
        }
        // if diffDays === 0, same day, no streak increase
      }

      await updateDoc(profileRef, {
        currentStreak: newStreak,
        bestStreak: Math.max(data.bestStreak || 0, newStreak),
        lastPracticeDate: now.toISOString(),
        totalAttempted: (data.totalAttempted || 0) + total,
      });
    }

  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
}

export async function saveAttempt(sessionId: string, data: any) {
  try {
    const docRef = doc(collection(db, `sessions/${sessionId}/attempts`));
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/attempts`);
  }
}

export async function getUserSessions(userId: string) {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })).sort((a: any, b: any) => b.startedAt - a.startedAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'sessions');
    return [];
  }
}

export async function getSession(sessionId: string) {
  try {
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}`);
    return null;
  }
}

export async function getAttempts(sessionId: string) {
  try {
    const q = query(collection(db, `sessions/${sessionId}/attempts`), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `sessions/${sessionId}/attempts`);
    return [];
  }
}

export async function toggleBookmark(userId: string, question: any) {
  try {
    const bookmarkRef = doc(db, 'bookmarks', `${userId}_${question.id}`);
    const snap = await getDoc(bookmarkRef);
    if (snap.exists()) {
      await deleteDoc(bookmarkRef);
      return false;
    } else {
      await setDoc(bookmarkRef, {
        ...question,
        userId,
        questionId: question.id,
        createdAt: serverTimestamp()
      });
      return true;
    }
  } catch(error) {
    handleFirestoreError(error, OperationType.WRITE, 'bookmarks');
  }
}

export async function getBookmarks(userId: string) {
  try {
    const q = query(collection(db, 'bookmarks'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookmarks');
    return [];
  }
}
