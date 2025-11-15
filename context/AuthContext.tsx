"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const ALLOWED_EMAILS = ["anbuceo@gmail.com", "user2@gmail.com"];

interface AuthContextValue {
  user: FirebaseUser | null;
  role: "intern" | "admin" | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deniedMessage?: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<"intern" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // reset denied message on auth change
      setDeniedMessage(null);

      if (!u) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const email = u.email ?? "";
      if (!ALLOWED_EMAILS.includes(email)) {
        // Sign out disallowed users immediately and set a denied message
        try {
          await firebaseSignOut(auth);
        } catch {
          // ignore
        }
        setUser(null);
        setRole(null);
        setDeniedMessage(
          "This portal is for internship candidates only. Access denied."
        );
        setLoading(false);
        return;
      }

      setUser(u);
      setRole(null);
      setLoading(false);

      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        // create a minimal profile with role 'intern' by default
        await setDoc(userRef, {
          uid: u.uid,
          email: u.email || null,
          name: u.displayName || null,
          role: "intern",
        });
      }

      // listen to updates on the user's profile to pick up role changes
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        const data = docSnap.data() as { role?: string } | undefined;
        if (data?.role === "admin") setRole("admin");
        else setRole("intern");
      });

      return () => unsubUser();
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    const email = u.email ?? "";
    if (!ALLOWED_EMAILS.includes(email)) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // ignore
      }
      throw new Error(
        "This portal is for internship candidates only. Access denied."
      );
    }

    if (u) {
      const userRef = doc(db, "users", u.uid);
      await setDoc(
        userRef,
        {
          uid: u.uid,
          email: u.email || null,
          name: u.displayName || null,
        },
        { merge: true }
      );
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, signInWithGoogle, signOut, deniedMessage }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
