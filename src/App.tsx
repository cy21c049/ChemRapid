import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthStore } from './store';
import { getProfile, createProfile } from './lib/db';
import { Toaster } from 'sonner';

import Landing from './pages/Landing';
import Home from './pages/Home';
import SubtopicPicker from './pages/SubtopicPicker';
import Session from './pages/Session';
import Summary from './pages/Summary';
import Dashboard from './pages/Dashboard';
import SessionReview from './pages/SessionReview';
import Bookmarks from './pages/Bookmarks';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user === undefined) return (
    <div className="h-screen w-full bg-[#020617] text-slate-100 flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.1)_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="text-teal-500 font-mono text-sm tracking-widest uppercase animate-pulse">Loading Identity...</div>
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { setUser, setProfile } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        let profile = await getProfile(user.uid);
        if (!profile) {
          await createProfile(user.uid, {
            displayName: user.displayName || user.email?.split('@')[0] || 'Aspirant',
            avatarUrl: user.photoURL || '',
          });
          profile = await getProfile(user.uid);
        }
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, setProfile]);

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/category/:category" 
            element={
              <ProtectedRoute>
                <SubtopicPicker />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/session" 
            element={
              <ProtectedRoute>
                <Session />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/summary" 
            element={
              <ProtectedRoute>
                <Summary />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bookmarks" 
            element={
              <ProtectedRoute>
                <Bookmarks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/session-review/:sessionId" 
            element={
              <ProtectedRoute>
                <SessionReview />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

