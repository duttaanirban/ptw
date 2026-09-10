"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../app/lib/api";

type PermitStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED"
  | "CLOSED_VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

type Permit = {
  id: string;
  permitNumber: string;
  type: string;
  status: PermitStatus;
  contractorTeam: string;
  workDescription: string;
  plannedStart: string;
  plannedEnd: string;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  plant: {
    id: string;
    name: string;
    code: string;
  };
  area: {
    id: string;
    name: string;
    code: string;
  };
  equipment?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type PermitResponse = {
  permits: Permit[];
};

function formatType(type: string) {
  return type
    .split("_")
    .map(
      (part) =>
        part.charAt(0) + part.slice(1).toLowerCase()
    )
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function statusClasses(status: PermitStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "PENDING_APPROVAL":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "APPROVED":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "SUSPENDED":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "REJECTED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "EXPIRED":
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    case "CLOSED":
    case "CLOSED_VERIFIED":
      return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    default:
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ptw_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadPermits() {
      try {
        const data = await apiFetch<PermitResponse>(
          "/api/permits",
          {
            token: token ?? undefined,
          }
        );

        setPermits(data.permits);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load permits";

        setError(message);

        if (
          message.toLowerCase().includes("token") ||
          message.toLowerCase().includes("unauthorized")
        ) {
          localStorage.removeItem("ptw_token");
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    loadPermits();
  }, [router]);

  const stats = useMemo(() => {
    const active = permits.filter(
      (permit) => permit.status === "ACTIVE"
    ).length;

    const pending = permits.filter(
      (permit) => permit.status === "PENDING_APPROVAL"
    ).length;

    const suspended = permits.filter(
      (permit) => permit.status === "SUSPENDED"
    ).length;

    const expiringSoon = permits.filter((permit) => {
      if (
        permit.status !== "ACTIVE" &&
        permit.status !== "APPROVED"
      ) {
        return false;
      }

      const end = new Date(permit.plannedEnd).getTime();
      const diff = end - now;

      return diff > 0 && diff <= 2 * 60 * 60 * 1000;
    }).length;

    return {
      total: permits.length,
      active,
      pending,
      suspended,
      expiringSoon,
    };
  }, [permits, now]);

  const filteredPermits = useMemo(() => {
    return permits.filter((permit) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        permit.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        permit.type === typeFilter;

      const query = search.toLowerCase();

      const matchesSearch =
        !query ||
        permit.permitNumber
          .toLowerCase()
          .includes(query) ||
        permit.workDescription
          .toLowerCase()
          .includes(query) ||
        permit.area.name.toLowerCase().includes(query);

      return (
        matchesStatus &&
        matchesType &&
        matchesSearch
      );
    });
  }, [
    permits,
    statusFilter,
    typeFilter,
    search,
  ]);

  function logout() {
    localStorage.removeItem("ptw_token");
    localStorage.removeItem("ptw_user");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                PTW
              </div>

              <div>
                <p className="font-semibold">
                  Permit Control
                </p>
                <p className="text-xs text-slate-500">
                  CMMS Safety Module
                </p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            <button className="w-full rounded-xl bg-slate-800 px-4 py-3 text-left text-sm font-medium text-white">
              Dashboard
            </button>

            <button
              onClick={() =>
                router.push("/permits/new")
              }
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Create Permit
            </button>

            <button className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
              My Approvals
            </button>
          </nav>

          <div className="mt-auto p-4">
            <button
              onClick={logout}
              className="w-full rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <header className="border-b border-slate-800 bg-slate-950/90">
            <div className="flex items-center justify-between px-5 py-4 lg:px-8">
              <div>
                <p className="text-sm text-slate-500">
                  Operations / Permits
                </p>

                <h1 className="mt-1 text-2xl font-bold">
                  Permit Dashboard
                </h1>
              </div>

              <button
                onClick={() =>
                  router.push("/permits/new")
                }
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                + New Permit
              </button>
            </div>
          </header>

          <div className="p-5 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total Permits"
                value={stats.total}
              />

              <StatCard
                label="Active"
                value={stats.active}
              />

              <StatCard
                label="Pending Approval"
                value={stats.pending}
              />

              <StatCard
                label="Suspended"
                value={stats.suspended}
              />

              <StatCard
                label="Expiring < 2h"
                value={stats.expiringSoon}
                emphasis
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Permits
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Monitor permit status and work controls.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search permit, work or area..."
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                    />

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="ALL">
                        All Statuses
                      </option>
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING_APPROVAL">
                        Pending Approval
                      </option>
                      <option value="APPROVED">
                        Approved
                      </option>
                      <option value="ACTIVE">
                        Active
                      </option>
                      <option value="SUSPENDED">
                        Suspended
                      </option>
                      <option value="CLOSED">
                        Closed
                      </option>
                      <option value="REJECTED">
                        Rejected
                      </option>
                      <option value="EXPIRED">
                        Expired
                      </option>
                    </select>

                    <select
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(event.target.value)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="ALL">
                        All Types
                      </option>
                      <option value="HOT_WORK">
                        Hot Work
                      </option>
                      <option value="CONFINED_SPACE">
                        Confined Space
                      </option>
                      <option value="WORKING_AT_HEIGHT">
                        Working at Height
                      </option>
                      <option value="ELECTRICAL_LOTO">
                        Electrical / LOTO
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  Loading permits...
                </div>
              ) : error ? (
                <div className="p-12 text-center text-red-400">
                  {error}
                </div>
              ) : filteredPermits.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No permits match the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-4">
                          Permit
                        </th>
                        <th className="px-5 py-4">
                          Type
                        </th>
                        <th className="px-5 py-4">
                          Location
                        </th>
                        <th className="px-5 py-4">
                          Requester
                        </th>
                        <th className="px-5 py-4">
                          Validity
                        </th>
                        <th className="px-5 py-4">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPermits.map(
                        (permit) => (
                          <tr
                            key={permit.id}
                            onClick={() =>
                              router.push(
                                `/permits/${permit.id}`
                              )
                            }
                            className="cursor-pointer border-b border-slate-800/70 transition hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold">
                                {permit.permitNumber}
                              </p>

                              <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                                {permit.workDescription}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-300">
                              {formatType(
                                permit.type
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-300">
                                {permit.area.name}
                              </p>

                              <p className="text-xs text-slate-500">
                                {permit.plant.code}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-300">
                              {permit.requester.name}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-xs text-slate-400">
                                {formatDate(
                                  permit.plannedStart
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                →{" "}
                                {formatDate(
                                  permit.plannedEnd
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                                  permit.status
                                )}`}
                              >
                                {permit.status.replace(
                                  "_",
                                  " "
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        emphasis
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-bold ${
          emphasis
            ? "text-amber-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}