"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TypingTestModule from "@/components/TypingTestModule";

export default function SkillsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (!user || loading) {
    return null;
  }

  return (
    <div className="my-10">
      <TypingTestModule />
    </div>
  );
}
