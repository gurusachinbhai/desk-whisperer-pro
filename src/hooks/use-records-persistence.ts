import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ---------------- Types matching the local shapes used in Index.tsx ----------------
export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  date: string; // yyyy-MM-dd
  signInAt: number | null;
  signOutAt: number | null;
  note?: string;
  regularization?: {
    requestedSignIn?: number;
    requestedSignOut?: number;
    reason: string;
    status: "pending" | "approved" | "rejected";
    reviewedBy?: string;
    reviewedAt?: number;
  };
};

export type ConfirmedBooking = {
  id: string;
  kind: "desk" | "room";
  floor: number;
  area: string;
  spot: string;
  time: string;
  shift: string;
  shiftKey: string;
  shiftRange: string;
  date: string; // yyyy-MM-dd
  endsAt: number;
  released: boolean;
};

export type LeaveType = "casual" | "sick" | "earned" | "unpaid";
export type LeaveRequest = {
  id: string;
  userId: string;
  userName: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
};

type Params = {
  authUserId: string | null;
  companyId: string | null;
  userName: string;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  leaves: LeaveRequest[];
  setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  bookings: ConfirmedBooking[];
  setBookings: React.Dispatch<React.SetStateAction<ConfirmedBooking[]>>;
};

// Map DB row -> local AttendanceRecord
const fromDbAttendance = (r: any): AttendanceRecord => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  date: r.work_date,
  signInAt: r.check_in_at ? new Date(r.check_in_at).getTime() : null,
  signOutAt: r.check_out_at ? new Date(r.check_out_at).getTime() : null,
  note: r.notes ?? undefined,
});

const fromDbLeave = (r: any): LeaveRequest => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  type: (r.leave_type ?? "casual") as LeaveType,
  fromDate: r.start_date,
  toDate: r.end_date,
  days: Number(r.days) || 1,
  reason: r.reason ?? "",
  status: (r.status ?? "pending") as LeaveRequest["status"],
  createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  reviewedBy: r.reviewer_name ?? undefined,
  reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : undefined,
  reviewNote: r.reviewer_note ?? undefined,
});

/**
 * Persists attendance + leave records to Supabase (per-user / per-company).
 * - Loads existing rows on auth.
 * - Performs a one-time migration of any existing localStorage records.
 * - Upserts on every state change so nothing is lost across publishes / reloads.
 */
const fromDbBooking = (r: any): ConfirmedBooking => {
  const meta = (() => {
    try {
      return r.notes ? JSON.parse(r.notes) : {};
    } catch {
      return {};
    }
  })();
  return {
    id: r.id,
    kind: (meta.kind as "desk" | "room") || "desk",
    floor: Number(meta.floor) || 1,
    area: meta.area || "",
    spot: r.desk_label,
    time: meta.time || "",
    shift: meta.shift || r.time_slot,
    shiftKey: meta.shiftKey || "morning",
    shiftRange: meta.shiftRange || "",
    date: r.booking_date,
    endsAt: meta.endsAt ? Number(meta.endsAt) : Date.now(),
    released: r.status === "released" || r.status === "cancelled",
  };
};

export function useRecordsPersistence({
  authUserId,
  companyId,
  userName,
  attendance,
  setAttendance,
  leaves,
  setLeaves,
  bookings,
  setBookings,
}: Params) {
  const hydratedRef = useRef(false);
  const lastAttendanceJson = useRef<string>("");
  const lastLeavesJson = useRef<string>("");
  const lastBookingsJson = useRef<string>("");
  const bookingDbIdMap = useRef<Map<string, string>>(new Map()); // local id -> db uuid

  // ---------- LOAD + MIGRATE ----------
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    if (!authUserId || !companyId) return;

    const run = async () => {
      // Load attendance + leaves + desk reservations from DB
      const [attRes, lvRes, dkRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", authUserId)
          .order("work_date", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("*")
          .eq("user_id", authUserId)
          .order("start_date", { ascending: false }),
        supabase
          .from("desk_reservations")
          .select("*")
          .eq("user_id", authUserId)
          .order("booking_date", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;

      const dbAttendance = (attRes.data ?? []).map(fromDbAttendance);
      const dbLeaves = (lvRes.data ?? []).map(fromDbLeave);
      const dbBookings = (dkRes.data ?? []).map(fromDbBooking);

      // Migrate any local (pre-DB) records keyed by company id
      const localAttRaw = window.localStorage.getItem(`deskflow-attendance-${companyId}`);
      const localLvRaw = window.localStorage.getItem(`deskflow-leaves-${companyId}`);
      const migrationFlag = `deskflow-migrated-${companyId}-${authUserId}`;
      const alreadyMigrated = window.localStorage.getItem(migrationFlag) === "1";

      if (!alreadyMigrated) {
        try {
          const localAtt: AttendanceRecord[] = localAttRaw ? JSON.parse(localAttRaw) : [];
          const mineAtt = localAtt.filter(
            (r) => !dbAttendance.some((d) => d.date === r.date),
          );
          if (mineAtt.length) {
            const rows = mineAtt.map((r) => ({
              company_id: companyId,
              user_id: authUserId,
              user_name: r.userName || userName,
              work_date: r.date,
              check_in_at: r.signInAt ? new Date(r.signInAt).toISOString() : null,
              check_out_at: r.signOutAt ? new Date(r.signOutAt).toISOString() : null,
              status: "present",
              notes: r.note ?? null,
            }));
            const { data } = await supabase
              .from("attendance_records")
              .upsert(rows, { onConflict: "user_id,work_date" })
              .select();
            if (data) dbAttendance.push(...data.map(fromDbAttendance));
          }
        } catch {
          /* ignore malformed local data */
        }

        try {
          const localLv: LeaveRequest[] = localLvRaw ? JSON.parse(localLvRaw) : [];
          // only migrate ones for this user that aren't already in DB
          const mine = localLv.filter(
            (l) =>
              !dbLeaves.some(
                (d) =>
                  d.fromDate === l.fromDate && d.toDate === l.toDate && d.type === l.type,
              ),
          );
          if (mine.length) {
            const rows = mine.map((l) => ({
              company_id: companyId,
              user_id: authUserId,
              user_name: l.userName || userName,
              leave_type: l.type,
              start_date: l.fromDate,
              end_date: l.toDate,
              days: l.days,
              reason: l.reason,
              status: l.status,
            }));
            const { data } = await supabase.from("leave_requests").insert(rows).select();
            if (data) dbLeaves.push(...data.map(fromDbLeave));
          }
        } catch {
          /* ignore */
        }

        window.localStorage.setItem(migrationFlag, "1");
      }

      // Merge: DB is source of truth; keep any other-user records already in state
      setAttendance((prev) => {
        const others = prev.filter((r) => r.userId !== authUserId);
        const merged = [...dbAttendance, ...others];
        lastAttendanceJson.current = JSON.stringify(merged);
        return merged;
      });
      setLeaves((prev) => {
        const others = prev.filter((l) => l.userId !== authUserId);
        const merged = [...dbLeaves, ...others];
        lastLeavesJson.current = JSON.stringify(merged);
        return merged;
      });

      hydratedRef.current = true;
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, companyId]);

  // ---------- SYNC ATTENDANCE ON CHANGE ----------
  useEffect(() => {
    if (!hydratedRef.current || !authUserId || !companyId) return;
    const mine = attendance.filter((r) => r.userId === authUserId);
    const json = JSON.stringify(mine);
    if (json === lastAttendanceJson.current) return;
    lastAttendanceJson.current = json;

    const t = window.setTimeout(async () => {
      if (mine.length === 0) return;
      const rows = mine.map((r) => ({
        company_id: companyId,
        user_id: authUserId,
        user_name: r.userName || userName,
        work_date: r.date,
        check_in_at: r.signInAt ? new Date(r.signInAt).toISOString() : null,
        check_out_at: r.signOutAt ? new Date(r.signOutAt).toISOString() : null,
        status: "present",
        notes: r.note ?? null,
      }));
      await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "user_id,work_date" });
    }, 400);

    return () => window.clearTimeout(t);
  }, [attendance, authUserId, companyId, userName]);

  // ---------- SYNC LEAVES ON CHANGE ----------
  useEffect(() => {
    if (!hydratedRef.current || !authUserId || !companyId) return;
    const mine = leaves.filter((l) => l.userId === authUserId);
    const json = JSON.stringify(mine);
    if (json === lastLeavesJson.current) return;
    const previousJson = lastLeavesJson.current;
    lastLeavesJson.current = json;

    const t = window.setTimeout(async () => {
      // Detect deletions
      try {
        const prev: LeaveRequest[] = previousJson ? JSON.parse(previousJson) : [];
        const removed = prev.filter((p) => !mine.some((m) => m.id === p.id));
        for (const r of removed) {
          // Only delete if it looks like a real DB UUID (id 36 chars w/ dashes)
          if (/^[0-9a-f-]{36}$/i.test(r.id)) {
            await supabase.from("leave_requests").delete().eq("id", r.id);
          }
        }
      } catch {
        /* ignore */
      }

      for (const l of mine) {
        const isDbId = /^[0-9a-f-]{36}$/i.test(l.id);
        const payload = {
          company_id: companyId,
          user_id: authUserId,
          user_name: l.userName || userName,
          leave_type: l.type,
          start_date: l.fromDate,
          end_date: l.toDate,
          days: l.days,
          reason: l.reason,
          status: l.status,
          reviewer_name: l.reviewedBy ?? null,
          reviewed_at: l.reviewedAt ? new Date(l.reviewedAt).toISOString() : null,
          reviewer_note: l.reviewNote ?? null,
        };
        if (isDbId) {
          const { error } = await supabase
            .from("leave_requests")
            .update(payload)
            .eq("id", l.id);
          if (error) {
            // fall through – row may have been removed
          }
        } else {
          // Insert and replace local id with the DB id
          const { data, error } = await supabase
            .from("leave_requests")
            .insert(payload)
            .select()
            .maybeSingle();
          if (!error && data) {
            const newId = data.id as string;
            setLeaves((prev) =>
              prev.map((x) => (x.id === l.id ? { ...x, id: newId } : x)),
            );
          }
        }
      }
    }, 400);

    return () => window.clearTimeout(t);
  }, [leaves, authUserId, companyId, userName, setLeaves]);
}
