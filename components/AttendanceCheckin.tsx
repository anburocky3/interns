"use client";
import React, { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/lib/hooks/useAttendance";

const AttendanceCheckin: React.FC = () => {
  const { user, loading, signInWithGoogle, deniedMessage } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const userId = user?.uid ?? undefined;
  const {
    records,
    checkIn,
    loading: attLoading,
  } = useAttendance({ userId, admin: false });

  const handleCheckIn = async () => {
    if (!user) return;
    await checkIn(user.uid);
  };

  const handleSignIn = async () => {
    setLocalError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : String(err) || "Sign in failed"
      );
    }
  };

  const todayRecord = records?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading auth...</div>
        ) : !user ? (
          <div className="space-y-2">
            <div>Please sign in to check in.</div>
            <div>
              <Button onClick={handleSignIn} disabled={loading}>
                Sign in with Google
              </Button>
            </div>
            {deniedMessage ? (
              <div className="text-sm text-red-600">{deniedMessage}</div>
            ) : null}
            {localError ? (
              <div className="text-sm text-red-600">{localError}</div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              Status:{" "}
              <strong>
                {todayRecord ? todayRecord.status : "Not checked in"}
              </strong>
            </div>
            <div>
              <Button
                onClick={handleCheckIn}
                disabled={!!todayRecord || attLoading}
              >
                {todayRecord ? "Checked In" : "Check In"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceCheckin;
