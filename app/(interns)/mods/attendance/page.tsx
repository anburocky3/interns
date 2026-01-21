"use client";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import getCachedUsers from "@/lib/getUsers";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { formatIsoDate, githubAvatarFromUrl } from "@/lib/helpers";
import { Check, X, Calendar, GraduationCap, Wifi } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { InternProfile } from "@/types";

type AttendanceRecord = {
  id: string;
  date: string;
  userId: string;
  present?: boolean;
  [key: string]: unknown;
};

function weekStart(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDates(startIso: string) {
  const dates: string[] = [];
  const [year, month, day] = startIso.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  for (let i = 0; i < 5; i++) {
    const dd = new Date(base);
    dd.setDate(base.getDate() + i);
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, "0");
    const d = String(dd.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
  }
  return dates;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function weeksForMonth(monthIso: string) {
  const [yStr, mStr] = monthIso.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-based
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);

  // Format first day of month as ISO string
  const firstIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const startMonday = weekStart(firstIso);

  const out: string[] = [];
  const [startYear, startMonth, startDay] = startMonday.split("-").map(Number);
  const cur = new Date(startYear, startMonth - 1, startDay);

  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 7);
  }
  return out;
}

export default function AttendancePage() {
  const { user, loading, role, isModerator } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [moms, setMoms] = useState<Record<string, string>>({});
  const [range, setRange] = useState<"week" | "month">("week");
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() =>
    weekStart(todayISO()),
  );
  const [pickedDate, setPickedDate] = useState<string>(() => todayISO());
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    todayISO().slice(0, 7),
  );
  // usersList will hold interns sorted alphabetically
  const [usersList, setUsersList] = useState<InternProfile[]>([]);

  useEffect(() => {
    if (!user) return;

    // attendance
    const attRef = collection(db, "attendance");
    const q = query(attRef, orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: AttendanceRecord[] = [];
      snap.forEach((s) => {
        const d = s.data() as AttendanceRecord;
        arr.push(Object.assign({}, d, { id: s.id }));
      });
      setAttendance(arr);
    });

    // moms
    const momRef = collection(db, "mom");
    const mq = query(momRef, orderBy("date", "desc"));
    const unsubM = onSnapshot(mq, (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((s) => {
        const d = s.data() as { date?: string; text?: string } | undefined;
        if (d?.date) map[d.date] = d.text || "";
      });
      setMoms(map);
    });

    // users map + sorted list (only interns)
    const loadUsers = async () => {
      try {
        const users = await getCachedUsers("dev");
        const list: InternProfile[] = [];

        // This assumes the InternProfile has a uid field or we need to handle this differently
        users.forEach((user: InternProfile) => {
          list.push({
            uid: user.uid || "",
            name: user.name || "",
            email: user.email || "",
            social: user.social || {},
            isStudent: user.isStudent || false,
            hasWifi: user.hasWifi || false,
            position: user.position || "",
          });
        });

        // sort alphabetically by name (nulls go last)
        list.sort((a, b) => {
          const na = a.name ?? "";
          const nb = b.name ?? "";
          return String(na).localeCompare(String(nb));
        });

        setUsersList(list);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    loadUsers();

    return () => {
      unsub();
      unsubM();
    };
  }, [user]);

  // compute stats for selected week and a per-date lookup
  const { weekStats, attendanceMap } = useMemo(() => {
    const stats: Record<string, { present: number; total: number }> = {};
    const map: Record<string, Record<string, boolean>> = {};
    const weekDates = getWeekDates(selectedWeekStart);
    const dateSet = new Set(weekDates);
    attendance.forEach((a) => {
      const d = a.date as string;
      if (!dateSet.has(d)) return;
      const uid = a.userId as string;
      if (!stats[uid]) stats[uid] = { present: 0, total: 0 };
      stats[uid].total += 1;
      if (a.present) stats[uid].present += 1;
      if (!map[d]) map[d] = {};
      map[d][uid] = Boolean(a.present);
    });
    return { weekStats: stats, attendanceMap: map };
  }, [attendance, selectedWeekStart]);

  // per-week data inside the selected month
  const { monthWeekData, monthTotals, monthWeekStarts } = useMemo(() => {
    const weekStarts = weeksForMonth(selectedMonth);
    const perWeek: Record<
      string,
      Record<string, { present: number; total: number }>
    > = {};
    const totals: Record<string, { present: number; total: number }> = {};
    attendance.forEach((a) => {
      const d = a.date as string;
      if (!d.startsWith(selectedMonth)) return;
      const ws = weekStart(d);
      const uid = a.userId as string;
      if (!perWeek[ws]) perWeek[ws] = {};
      if (!perWeek[ws][uid]) perWeek[ws][uid] = { present: 0, total: 0 };
      perWeek[ws][uid].total += 1;
      if (a.present) perWeek[ws][uid].present += 1;
      if (!totals[uid]) totals[uid] = { present: 0, total: 0 };
      totals[uid].total += 1;
      if (a.present) totals[uid].present += 1;
    });
    return {
      monthWeekData: perWeek,
      monthTotals: totals,
      monthWeekStarts: weekStarts,
    };
  }, [attendance, selectedMonth]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user || !(role === "admin" || isModerator))
    return <div className="p-6 text-red-400">Access restricted.</div>;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Attendance Overview
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Viewing:{" "}
                  <span className="text-blue-400 font-medium">
                    {formatIsoDate(selectedWeekStart)}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setRange("week")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                range === "week"
                  ? "bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setRange("month")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                range === "month"
                  ? "bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Alert for low attendance */}
      {(() => {
        const lowAttendanceInterns = usersList
          .map((u) => {
            const stats =
              range === "week" ? weekStats[u.uid] : monthTotals[u.uid];
            if (!stats || stats.total === 0) return null;
            const pct = Math.round((stats.present / stats.total) * 100);
            if (pct < 95) {
              return {
                name: u.name,
                uid: u.uid,
                present: stats.present,
                total: stats.total,
                pct,
              };
            }
            return null;
          })
          .filter((item) => item !== null)
          .sort((a, b) => a.pct - b.pct);

        if (lowAttendanceInterns.length > 0) {
          return (
            <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <X className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-1">
                    ⚠️ Low Attendance Alert
                  </h3>
                  <p className="text-xs text-yellow-200/80 mb-3">
                    {lowAttendanceInterns.length} intern(s) with attendance
                    below 95% requiring attention:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {lowAttendanceInterns.map((intern) => (
                      <div
                        key={intern.uid}
                        className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-yellow-500/20"
                      >
                        <span className="text-sm font-medium text-gray-200">
                          {intern.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {intern.present}/{intern.total}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              intern.pct >= 80
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {intern.pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-200/60 mt-3 italic">
                    💡 Action required: Review attendance patterns and schedule
                    check-ins with these interns.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Controls */}
      <div className="mb-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4">
          {range === "week" ? (
            <>
              <label className="text-sm font-medium text-gray-300 min-w-fit">
                Pick a date:
              </label>
              <input
                type="date"
                value={pickedDate}
                onChange={(e) => {
                  const v = e.target.value || todayISO();
                  setPickedDate(v);
                  const ws = weekStart(v);
                  if (ws) setSelectedWeekStart(ws);
                }}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </>
          ) : (
            <>
              <label className="text-sm font-medium text-gray-300 min-w-fit">
                Select month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </>
          )}
        </div>
      </div>

      {range === "week" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Check className="w-5 h-5" />
                </span>
                <span className="text-sm font-medium text-gray-300">
                  Present
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400">
                  <X className="w-5 h-5" />
                </span>
                <span className="text-sm font-medium text-gray-300">
                  Absent
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-500/20 text-gray-400">
                  <Calendar className="w-5 h-5" />
                </span>
                <span className="text-sm font-medium text-gray-300">
                  No data
                </span>
              </div>
            </div>
            {moms[selectedWeekStart] && (
              <div className="text-xs bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/30">
                <span className="font-medium">MoM:</span>{" "}
                {moms[selectedWeekStart]}
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-white/5 to-white/0 border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">
                      Name
                    </th>
                    {getWeekDates(selectedWeekStart).map((d, idx) => (
                      <th key={d} className="px-4 py-4 text-center">
                        <div className="font-semibold text-indigo-300 text-sm">
                          {DAY_NAMES[idx]}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatIsoDate(d)}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">
                      Weekly Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        No interns found
                      </td>
                    </tr>
                  )}
                  {usersList.map((u, index) => {
                    const uid = u.uid;
                    const s = weekStats[uid] ?? { present: 0, total: 0 };
                    const pct = s.total
                      ? Math.round((s.present / s.total) * 100)
                      : 0;
                    const weekDates = getWeekDates(selectedWeekStart);
                    return (
                      <tr
                        key={uid}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm capitalize">
                          <div className="flex items-center gap-3">
                            {u.social?.github ? (
                              <Image
                                src={
                                  githubAvatarFromUrl(u.social?.github) || ""
                                }
                                alt={u.name || "User"}
                                width={40}
                                height={40}
                                className={`w-10 h-10 rounded-full `}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                                {u.name ? u.name.charAt(0) : "U"}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center font-medium">
                                <span>{u.name}</span>

                                <div className="flex gap-2 mt-1 items-center text-gray-200 ml-2">
                                  {u.isStudent && (
                                    <span
                                      title="Student"
                                      aria-label="Student"
                                      className="px-1 py-0.5 rounded bg-indigo-600"
                                    >
                                      <GraduationCap size={16} />
                                    </span>
                                  )}
                                  {u.hasWifi && (
                                    <span
                                      title="Has WiFi"
                                      aria-label="Has WiFi"
                                      className="px-1 py-0.5 rounded bg-emerald-600"
                                    >
                                      <Wifi size={16} />
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {u.position}
                              </div>
                            </div>
                          </div>
                        </td>
                        {weekDates.map((d) => {
                          const present = attendanceMap[d]?.[uid];
                          return (
                            <td key={d} className="px-4 py-4 text-center">
                              {present === undefined ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700/50 text-gray-500"
                                  title="No data"
                                >
                                  <Calendar className="w-4 h-4" />
                                </span>
                              ) : present ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white"
                                  title="Present"
                                >
                                  <Check className="w-5 h-5" />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-500 text-white"
                                  title="Absent"
                                >
                                  <X className="w-5 h-5" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <div className="font-medium text-gray-200">
                                {s.present}/{s.total}
                              </div>
                              <div className="text-xs text-gray-400">days</div>
                            </div>
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${
                                pct === 100
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : pct >= 80
                                    ? "bg-blue-500/20 text-blue-400"
                                    : pct >= 60
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {pct}%
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {range === "month" && (
        <div>
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-white/5 to-white/0 border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">
                      Intern Name
                    </th>
                    {monthWeekStarts.map((ws, idx) => (
                      <th key={ws} className="px-4 py-4 text-center">
                        <div className="font-semibold text-indigo-300 text-sm">
                          W{idx + 1}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatIsoDate(ws)}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">
                      Monthly Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 && (
                    <tr>
                      <td
                        colSpan={monthWeekStarts.length + 2}
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        No interns found
                      </td>
                    </tr>
                  )}
                  {usersList.map((u) => {
                    const uid = u.uid;
                    const totals = monthTotals[uid] ?? { present: 0, total: 0 };
                    const pct = totals.total
                      ? Math.round((totals.present / totals.total) * 100)
                      : 0;
                    return (
                      <tr
                        key={uid}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm capitalize">
                          <div className="flex items-center gap-3">
                            {u.social?.github ? (
                              <Image
                                src={
                                  githubAvatarFromUrl(u.social?.github) || ""
                                }
                                alt={u.name || "User"}
                                width={40}
                                height={40}
                                className={`w-10 h-10 rounded-full `}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                                {u.name ? u.name.charAt(0) : "U"}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center font-medium">
                                <span>{u.name}</span>

                                <div className="flex gap-2 mt-1 items-center text-gray-200 ml-2">
                                  {u.isStudent && (
                                    <span
                                      title="Student"
                                      aria-label="Student"
                                      className="px-1 py-0.5 rounded bg-indigo-600"
                                    >
                                      <GraduationCap size={16} />
                                    </span>
                                  )}
                                  {u.hasWifi && (
                                    <span
                                      title="Has WiFi"
                                      aria-label="Has WiFi"
                                      className="px-1 py-0.5 rounded bg-emerald-600"
                                    >
                                      <Wifi size={16} />
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {u.position}
                              </div>
                            </div>
                          </div>
                        </td>
                        {monthWeekStarts.map((ws) => {
                          const w = monthWeekData[ws]?.[uid];
                          if (!w || w.total === 0) {
                            return (
                              <td key={ws} className="px-4 py-4 text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-gray-700/50 text-gray-400 text-xs font-medium">
                                  -
                                </span>
                              </td>
                            );
                          }
                          const wpct = Math.round((w.present / w.total) * 100);
                          return (
                            <td key={ws} className="px-4 py-4 text-center">
                              <div className="inline-flex flex-col items-center gap-1 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                                <span
                                  className={`text-sm font-semibold ${
                                    wpct === 100
                                      ? "text-emerald-400"
                                      : wpct >= 80
                                        ? "text-blue-400"
                                        : wpct >= 60
                                          ? "text-yellow-400"
                                          : "text-rose-400"
                                  }`}
                                >
                                  {w.present}/{w.total}
                                </span>
                                <span
                                  className={`text-xs font-medium ${
                                    wpct === 100
                                      ? "text-emerald-400/70"
                                      : wpct >= 80
                                        ? "text-blue-400/70"
                                        : wpct >= 60
                                          ? "text-yellow-400/70"
                                          : "text-rose-400/70"
                                  }`}
                                >
                                  {wpct}%
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <div className="font-medium text-gray-200">
                                {totals.present}/{totals.total}
                              </div>
                              <div className="text-xs text-gray-400">days</div>
                            </div>
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${
                                pct === 100
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : pct >= 80
                                    ? "bg-blue-500/20 text-blue-400"
                                    : pct >= 60
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {pct}%
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
