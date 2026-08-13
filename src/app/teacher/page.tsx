"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NavChrome } from "@/components/auth/NavChrome";
import { useAuthStore } from "@/store/authStore";
import { getAuthHeaders } from "@/lib/client/authHeaders";

type ClassRow = {
  id: string;
  name: string;
  inviteCode?: string;
  orgId: string;
  goalIds?: string[];
};

type OrgRow = { id: string; name: string };

type StudentRow = {
  uid: string;
  email: string;
  displayName: string;
  xp: number;
  stars: number;
  discoveries: number;
  completedPerfumes: number;
  inventions: number;
};

export default function TeacherPage() {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const [teacher, setTeacher] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [assignGoals, setAssignGoals] = useState("");

  const ASSIGNABLE = [
    "soap",
    "perfume",
    "bath-bomb",
    "antacid",
    "inspired-havas",
    "inspired-sauvage",
    "inspired-citruscologne",
  ];

  const load = useCallback(async () => {
    const headers = await getAuthHeaders();
    if (!headers) return;
    const res = await fetch("/api/teacher", { headers });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load");
      return;
    }
    setTeacher(Boolean(json.teacher));
    setClasses(json.classes ?? []);
    setOrgs(json.orgs ?? []);
    if (json.orgs?.[0]?.id && !orgId) setOrgId(json.orgs[0].id);
  }, [orgId]);

  useEffect(() => {
    if (authReady && user) void load();
  }, [authReady, user, load]);

  async function createClass() {
    const headers = await getAuthHeaders();
    if (!headers || !orgId || !name.trim()) return;
    const res = await fetch("/api/teacher", {
      method: "POST",
      headers,
      body: JSON.stringify({ orgId, name: name.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Create failed");
      return;
    }
    setName("");
    await load();
  }

  async function openRoster(classId: string) {
    setSelected(classId);
    const headers = await getAuthHeaders();
    if (!headers) return;
    const res = await fetch(`/api/teacher/class/${classId}/students`, {
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Roster failed");
      return;
    }
    setStudents(json.students ?? []);
  }

  async function exportGradebook(classId: string) {
    const headers = await getAuthHeaders();
    if (!headers) return;
    const res = await fetch(`/api/teacher/class/${classId}/gradebook`, {
      headers,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gradebook-${classId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveGoals(classId: string) {
    const headers = await getAuthHeaders();
    if (!headers) return;
    const goalIds = assignGoals
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch(`/api/teacher/class/${classId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ goalIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to save goals");
      return;
    }
    setSyncMsg(`Assigned ${goalIds.length} class goals`);
    await load();
  }

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-lab-wash">
        …
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-lab-wash px-4 py-8">
        <div className="mx-auto max-w-lg">
          <NavChrome />
          <p className="mt-10 text-lab-muted">
            <Link href="/login" className="text-lab-teal font-semibold">
              Log in
            </Link>{" "}
            as a teacher to manage classes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-lab-wash px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/lab" className="font-display text-2xl text-lab-ink">
            Alyra Labs
          </Link>
          <NavChrome />
        </div>
        <h1 className="mt-8 font-display text-3xl text-lab-ink">Teacher</h1>
        {error ? <p className="mt-2 text-sm text-lab-hazard">{error}</p> : null}

        {!teacher ? (
          <p className="mt-4 text-sm text-lab-muted">
            You’re not a teacher on any org yet. Ask an admin to assign you, or{" "}
            <Link href="/join" className="font-semibold text-lab-teal">
              join with a code
            </Link>
            .
          </p>
        ) : (
          <>
            <section className="mt-6 rounded-xl border border-lab-line/50 bg-lab-panel/80 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-label text-lab-muted">
                New class
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="rounded-lg border border-lab-line bg-white px-2 py-1.5 text-sm"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Class name"
                  className="min-w-[10rem] flex-1 rounded-lg border border-lab-line bg-white px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void createClass()}
                  className="rounded-lg bg-lab-teal px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Create
                </button>
              </div>
            </section>

            <ul className="mt-6 space-y-2">
              {classes.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-lab-line/50 bg-white/80 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-lg text-lab-ink">
                        {c.name}
                      </p>
                      <p className="font-mono text-[11px] text-lab-muted">
                        Invite: {c.inviteCode ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignGoals((c.goalIds ?? []).join(", "));
                          void openRoster(c.id);
                        }}
                        className="rounded-md bg-lab-wash px-2 py-1 text-xs font-semibold text-lab-ink"
                      >
                        Roster
                      </button>
                      <button
                        type="button"
                        onClick={() => void exportGradebook(c.id)}
                        className="rounded-md border border-lab-teal/40 px-2 py-1 text-xs font-semibold text-lab-teal"
                      >
                        Gradebook CSV
                      </button>
                    </div>
                  </div>
                  {selected === c.id ? (
                    <div className="mt-3 border-t border-lab-line/40 pt-3">
                      <p className="text-[10px] font-semibold uppercase text-lab-muted">
                        Assign goals (ids)
                      </p>
                      <p className="mt-0.5 text-[10px] text-lab-muted">
                        Try: {ASSIGNABLE.join(", ")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <input
                          value={assignGoals}
                          onChange={(e) => setAssignGoals(e.target.value)}
                          className="min-w-[12rem] flex-1 rounded-lg border border-lab-line bg-white px-2 py-1 text-xs font-mono"
                          placeholder="soap, inspired-havas"
                        />
                        <button
                          type="button"
                          onClick={() => void saveGoals(c.id)}
                          className="rounded-md bg-lab-teal px-2 py-1 text-xs font-semibold text-white"
                        >
                          Save goals
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            {syncMsg ? (
              <p className="mt-3 text-sm text-lab-muted">{syncMsg}</p>
            ) : null}

            {selected ? (
              <section className="mt-8">
                <h2 className="font-display text-xl text-lab-ink">
                  Student progress
                </h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-lab-line/50">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-lab-line/40 text-[10px] uppercase text-lab-muted">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">XP</th>
                        <th className="px-3 py-2">★</th>
                        <th className="px-3 py-2">Discoveries</th>
                        <th className="px-3 py-2">Perfumes</th>
                        <th className="px-3 py-2">Inventions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr
                          key={s.uid}
                          className="border-b border-lab-line/30"
                        >
                          <td className="px-3 py-2">
                            <p className="font-semibold">
                              {s.displayName || "—"}
                            </p>
                            <p className="text-[11px] text-lab-muted">
                              {s.email}
                            </p>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{s.xp}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {s.stars}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {s.discoveries}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {s.completedPerfumes}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {s.inventions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
