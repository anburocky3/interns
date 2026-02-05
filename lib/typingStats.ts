import {
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  collection,
  getDocs,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import toast from "react-hot-toast";
import { GameResult, InternProfile, TypingStats } from "@/types";

/**
 * Updates user's typing stats if they achieved a new high score
 */
export async function updateTypingStats(
  user: string,
  gameResult: Omit<GameResult, "timestamp" | "isNewRecord">,
): Promise<GameResult & { previousBestWPM: number }> {
  try {
    const userRef = doc(db, "users", user);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User not found");
    }

    const userData = userSnap.data();
    const currentStats = (userData.typingStats || {
      bestWPM: 0,
      bestAccuracy: 0,
      totalGamesPlayed: 0,
      gamesThisMonth: 0,
    }) as TypingStats;

    const previousBestWPM = currentStats.bestWPM;
    const isNewRecord = gameResult.wpm > currentStats.bestWPM;

    // Prepare update object
    const updateData: { typingStats: TypingStats } = {
      typingStats: {
        bestWPM: Math.max(currentStats.bestWPM, gameResult.wpm),
        bestAccuracy: Math.max(currentStats.bestAccuracy, gameResult.accuracy),
        lastPlayed: Timestamp.now().toDate().toISOString(),
        totalGamesPlayed: (currentStats.totalGamesPlayed || 0) + 1,
        gamesThisMonth: (currentStats.gamesThisMonth || 0) + 1,
      },
    };

    // Update Firestore
    await updateDoc(userRef, updateData);

    // Show appropriate toast
    if (isNewRecord) {
      toast.success(`🎉 New High Score! ${gameResult.wpm} WPM!`, {
        duration: 4000,
        style: {
          background: "#10b981",
          color: "#fff",
        },
      });
    }

    return {
      ...gameResult,
      isNewRecord,
      timestamp: new Date().toISOString(),
      previousBestWPM,
    };
  } catch (error) {
    console.error("Error updating typing stats:", error);
    toast.error("Failed to save your score");
    throw error;
  }
}

/**
 * Fetches user's current typing stats
 */
export async function getUserTypingStats(userId: string): Promise<TypingStats> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User not found");
    }

    const userData = userSnap.data();
    return (
      userData.typingStats || {
        bestWPM: 0,
        bestAccuracy: 0,
        totalGamesPlayed: 0,
        gamesThisMonth: 0,
      }
    );
  } catch (error) {
    console.error("Error fetching typing stats:", error);
    throw error;
  }
}

/**
 * Fetches top users by best WPM for leaderboard (defaults to top 10)
 */
export async function getTopTypingLeaders(
  limitCount = 10,
): Promise<(InternProfile & { bestWPM: number; bestAccuracy: number })[]> {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      orderBy("typingStats.bestWPM", "desc"),
      limit(limitCount),
    );
    const snap = await getDocs(q);

    return snap.docs
      .map((docSnap) => {
        const data = docSnap.data() as {
          name?: string;
          email?: string;
          typingStats?: TypingStats;
          active?: boolean;
          social?: Record<string, string>;
        };
        const stats = data.typingStats || { bestWPM: 0, bestAccuracy: 0 };
        return {
          uid: docSnap.id,
          name: data.name || data.email || "Unknown",
          email: data.email || "",
          social: data.social || {},
          active: data.active,
          bestWPM: stats.bestWPM || 0,
          bestAccuracy: stats.bestAccuracy || 0,
        };
      })
      .filter((item) => item.bestWPM > 0 && item.active !== false);
  } catch (error) {
    console.error("Error fetching typing leaderboard:", error);
    throw error;
  }
}
