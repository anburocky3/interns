"use client";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { formatIsoDate } from "@/lib/helpers";
import { Check, X, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type AttendanceRecord = {
  id: string;
  date: string;
  userId: string;
  present?: boolean;
  [key: string]: unknown;
};

type UserDoc = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

function weekStart(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getWeekDates(startIso: string) {
  const dates: string[] = [];
  const base = new Date(startIso + "T00:00:00");
  for (let i = 0; i < 5; i++) {
    const dd = new Date(base);
    dd.setDate(base.getDate() + i);
    dates.push(dd.toISOString().slice(0, 10));
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
  // find the Monday that contains the first day of the month
  const firstIso = first.toISOString().slice(0, 10);
  const out: string[] = [];
  for (
    let cur = new Date(weekStart(firstIso) + "T00:00:00");
    cur <= last;
    cur.setDate(cur.getDate() + 7)
  ) {
    out.push(cur.toISOString().slice(0, 10));
  }
  return out;
}

export default function AttendancePage() {
  const { user, loading, role, isModerator } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [moms, setMoms] = useState<Record<string, string>>({});
  const [range, setRange] = useState<"week" | "month">("week");
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() =>
    weekStart(todayISO())
  );
  const [pickedDate, setPickedDate] = useState<string>(() => todayISO());
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    todayISO().slice(0, 7)
  );
  // usersList will hold interns sorted alphabetically
  const [usersList, setUsersList] = useState<
    Array<{ uid: string; name?: string | null }>
  >([]);

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
    const usersRef = collection(db, "users");
    const uq = query(usersRef, where("role", "==", "intern"));
    const unsubU = onSnapshot(uq, (snap) => {
      const m: Record<string, { name?: string | null }> = {};
      const list: Array<{ uid: string; name?: string | null }> = [];
      snap.forEach((s) => {
        const d = s.data() as UserDoc | undefined;
        const name = d?.name ?? d?.email ?? null;
        m[s.id] = { name };
        list.push({ uid: s.id, name });
      });
      // sort alphabetically by name (nulls go last)
      list.sort((a, b) => {
        const na = a.name ?? "";
        const nb = b.name ?? "";
        return String(na).localeCompare(String(nb));
      });
      setUsersList(list);
    });

    return () => {
      unsub();
      unsubM();
      unsubU();
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-linear-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">Attendance Overview</div>
              <div className="text-xs opacity-80">
                Week: {formatIsoDate(selectedWeekStart)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRange("week")}
            className={`px-2 py-1 rounded text-sm ${
              range === "week" ? "bg-blue-600" : "bg-white/5"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setRange("month")}
            className={`px-2 py-1 rounded text-sm ${
              range === "month" ? "bg-blue-600" : "bg-white/5"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        {range === "week" ? (
          <>
            <label className="text-sm">Week (pick any date)</label>
            <input
              type="date"
              value={pickedDate}
              onChange={(e) => {
                const v = e.target.value || todayISO();
                setPickedDate(v);
                const ws = weekStart(v);
                if (ws) setSelectedWeekStart(ws);
              }}
              className="px-2 py-1 rounded bg-white/5 text-sm"
            />
            <div className="text-sm text-gray-400">
              Showing: {formatIsoDate(selectedWeekStart)}
            </div>
          </>
        ) : (
          <>
            <label className="text-sm">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1 rounded bg-white/5 text-sm"
            />
            <div className="text-sm text-gray-400">
              Showing: {selectedMonth}
            </div>
          </>
        )}
      </div>

      {range === "week" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-400 text-white">
                  <Check className="w-4 h-4" />
                </span>
                <span className="text-xs">Present</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">
                  <X className="w-4 h-4" />
                </span>
                <span className="text-xs">Absent</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-500 text-white">
                  <Calendar className="w-4 h-4" />
                </span>
                <span className="text-xs">No data</span>
              </div>
            </div>
            <div className="text-xs text-gray-300">
              MoM: {moms[selectedWeekStart] ?? "(no MoM)"}
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-left">
                  <th className="w-1/4 p-2">Name</th>
                  {getWeekDates(selectedWeekStart).map((d, idx) => (
                    <th key={d} className="p-2 text-center">
                      <div className="font-medium text-indigo-300">
                        {DAY_NAMES[idx]}
                      </div>
                      <div className="text-xs text-gray-200/80">
                        {formatIsoDate(d)}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-left">Summary</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-2 text-sm text-gray-400">
                      No interns found.
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
                    <tr key={uid} className="odd:bg-white/2">
                      <td className="p-2 truncate">
                        #{index + 1} - {u.name ?? uid}
                      </td>
                      {weekDates.map((d) => {
                        const present = attendanceMap[d]?.[uid];
                        return (
                          <td key={d} className="p-2 text-center">
                            {present === undefined ? (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-white/90"
                                title="Data not available"
                              >
                                <Calendar className="w-4 h-4 text-gray-600" />
                              </span>
                            ) : present ? (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white"
                                title="Present"
                              >
                                <Check className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-500 text-white">
                                <X className="w-4 h-4" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <div className="text-xs text-gray-300">
                          {s.present}/{s.total}
                        </div>
                        <div className="text-xs">{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-sm text-gray-400">
            MoM: {moms[selectedWeekStart] ?? "(no MoM)"}
          </div>
        </div>
      )}

      {range === "month" && (
        <div>
          <div className="overflow-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-left">
                  <th className="w-1/4 p-2">Name</th>
                  {monthWeekStarts.map((ws, idx) => (
                    <th key={ws} className="p-2 text-center">
                      <div className="font-medium text-indigo-300">
                        W{idx + 1}
                      </div>
                      <div className="text-xs text-gray-200/80">
                        {formatIsoDate(ws)}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-left">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 && (
                  <tr>
                    <td
                      colSpan={monthWeekStarts.length + 2}
                      className="p-2 text-sm text-gray-400"
                    >
                      No interns found.
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
                    <tr key={uid} className="odd:bg-white/2">
                      <td className="p-2 truncate">{u.name ?? uid}</td>
                      {monthWeekStarts.map((ws) => {
                        const w = monthWeekData[ws]?.[uid];
                        if (!w || w.total === 0) {
                          return (
                            <td key={ws} className="p-2 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-gray-700 text-white/90">
                                -
                              </span>
                            </td>
                          );
                        }
                        const wpct = Math.round((w.present / w.total) * 100);
                        return (
                          <td key={ws} className="p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs text-gray-200">
                                {w.present}/{w.total}
                              </span>
                              <span className="text-xs text-indigo-200">
                                {wpct}%
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <div className="text-xs text-gray-300">
                          {totals.present}/{totals.total}
                        </div>
                        <div className="text-xs">{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-sm text-gray-400">
            MoM: {moms[selectedMonth] ?? "(no MoM)"}
          </div>
        </div>
      )}
    </div>
  );
}
