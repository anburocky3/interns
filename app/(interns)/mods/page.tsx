"use client";
import ModeratorPanel from "@/app/(interns)/mods/ModeratorPanel";
import { useAuth } from "@/context/AuthContext";

export default function ModeratorPage() {
  const { user, loading, isModerator, role } = useAuth();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user)
    return <div className="p-6 text-red-400">You must be logged in.</div>;
  if (role === "admin" || isModerator) return <ModeratorPanel />;

  return (
    <div className="p-6 text-yellow-300">Access restricted to moderators.</div>
  );
}
