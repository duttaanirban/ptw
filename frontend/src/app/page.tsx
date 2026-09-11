"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type Approval = {
  id: string;
  approverId: string;
  role: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment?: string | null;
  actedAt?: string | null;
};

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
    ownerId?: string | null;
  };

  equipment?: {
    id: string;
    name: string;
    code: string;
  } | null;

  approvals: Approval[];
};

type PermitResponse = {
  permits: Permit[];
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
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

function formatStatus(status: PermitStatus) {
  return status.replaceAll("_", " ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function isExpiringSoon(permit: Permit) {
  if (permit.status !== "ACTIVE") {
    return false;
  }

  const end = new Date(permit.plannedEnd).getTime();
  const diff = end - Date.now();

  return diff > 0 && diff <= 2 * 60 * 60 * 1000;
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
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [areaFilter, setAreaFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [pendingOnly, setPendingOnly] = useState(false);

  const loadPermits = useCallback(
    async (isRefresh = false) => {
      const token = localStorage.getItem("ptw_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const storedUser = localStorage.getItem("ptw_user");

        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }

        const data = await apiFetch<PermitResponse>(
          "/api/permits",
          {
            token,
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
          localStorage.removeItem("ptw_user");
          router.replace("/login");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPermits();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPermits]);

  const areas = useMemo(() => {
    const map = new Map<string, string>();

    for (const permit of permits) {
      map.set(permit.area.id, permit.area.name);
    }

    return [...map.entries()].sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [permits]);

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

    const expiringSoon = permits.filter(
      isExpiringSoon
    ).length;

    const myApprovals =
      currentUser === null
        ? 0
        : permits.filter((permit) =>
            permit.approvals.some(
              (approval) =>
                approval.approverId === currentUser.id &&
                approval.status === "PENDING"
            )
          ).length;

    return {
      total: permits.length,
      active,
      pending,
      suspended,
      expiringSoon,
      myApprovals,
    };
  }, [permits, currentUser]);

  const filteredPermits = useMemo(() => {
    return permits.filter((permit) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        permit.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        permit.type === typeFilter;

      const matchesArea =
        areaFilter === "ALL" ||
        permit.area.id === areaFilter;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        permit.permitNumber
          .toLowerCase()
          .includes(query) ||
        permit.workDescription
          .toLowerCase()
          .includes(query) ||
        permit.area.name
          .toLowerCase()
          .includes(query) ||
        permit.requester.name
          .toLowerCase()
          .includes(query);

      const permitStart = new Date(
        permit.plannedStart
      );

      const permitEnd = new Date(
        permit.plannedEnd
      );

      const selectedStart = startDate
        ? new Date(`${startDate}T00:00:00`)
        : null;

      const selectedEnd = endDate
        ? new Date(`${endDate}T23:59:59.999`)
        : null;

      const matchesStartDate =
        !selectedStart ||
        permitEnd >= selectedStart;

      const matchesEndDate =
        !selectedEnd ||
        permitStart <= selectedEnd;

      const hasMyPendingApproval =
        currentUser !== null &&
        permit.approvals.some(
          (approval) =>
            approval.approverId === currentUser.id &&
            approval.status === "PENDING"
        );

      const matchesPending =
        !pendingOnly || hasMyPendingApproval;

      return (
        matchesStatus &&
        matchesType &&
        matchesArea &&
        matchesSearch &&
        matchesStartDate &&
        matchesEndDate &&
        matchesPending
      );
    });
  }, [
    permits,
    statusFilter,
    typeFilter,
    areaFilter,
    search,
    startDate,
    endDate,
    pendingOnly,
    currentUser,
  ]);

  function clearFilters() {
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setAreaFilter("ALL");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPendingOnly(false);
  }

  function logout() {
    localStorage.removeItem("ptw_token");
    localStorage.removeItem("ptw_user");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
          <div className="border-b border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-slate-950">
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

          <nav className="space-y-2 p-4">
            <button
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-left text-sm font-medium text-white"
            >
              Dashboard
            </button>

            <button
              onClick={() => router.push("/permits/new")}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Create Permit
            </button>

            <button
              onClick={() => setPendingOnly(true)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <span>My Approvals</span>

              {stats.myApprovals > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-950">
                  {stats.myApprovals}
                </span>
              )}
            </button>
          </nav>

          <div className="mt-auto p-4">
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs text-slate-500">
                Signed in as
              </p>

              <p className="mt-1 truncate text-sm font-medium">
                {currentUser?.name || "User"}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {currentUser?.role
                  ?.replaceAll("_", " ")
                  .toLowerCase()}
              </p>
            </div>

            <button
              onClick={logout}
              className="w-full rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-800 bg-slate-950/90">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
              <div>
                <p className="text-sm text-slate-500">
                  Operations / Permits
                </p>

                <h1 className="mt-1 text-2xl font-bold">
                  Permit Dashboard
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor work authorization and safety controls.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  onClick={() => void loadPermits(true)}
                  disabled={refreshing}
                  className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  onClick={() =>
                    router.push("/permits/new")
                  }
                  className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  + New Permit
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-5 lg:p-8">
            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                label="My Approvals"
                value={stats.myApprovals}
              />

              <StatCard
                label="Expiring < 2h"
                value={stats.expiringSoon}
                emphasis
              />
            </div>

            {/* Active / expiring section */}
            {(stats.active > 0 ||
              stats.expiringSoon > 0) && (
              <div className="mt-5 grid gap-3 sm:gap-4 xl:grid-cols-2">
                <InfoPanel
                  title="Active permits"
                  value={stats.active}
                  description="Work currently authorized on site."
                />

                <InfoPanel
                  title="Expiring within 2 hours"
                  value={stats.expiringSoon}
                  description="Review these permits before their validity window ends."
                  warning
                />
              </div>
            )}

            {/* Filters */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 sm:mt-8">
              <div className="border-b border-slate-800 p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="font-semibold">
                        Permit register
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {filteredPermits.length} of{" "}
                        {permits.length} permits shown
                      </p>
                    </div>

                    <button
                      onClick={clearFilters}
                      className="self-start rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      Clear filters
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search permit, work, area..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 xl:col-span-2"
                    />

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
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
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">
                        Suspended
                      </option>
                      <option value="CLOSED">Closed</option>
                      <option value="CLOSED_VERIFIED">
                        Closed Verified
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
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

                    <select
                      value={areaFilter}
                      onChange={(event) =>
                        setAreaFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="ALL">
                        All Areas
                      </option>

                      {areas.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        setPendingOnly(!pendingOnly)
                      }
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        pendingOnly
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {pendingOnly
                        ? "My Approvals: ON"
                        : "My Approvals"}
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-500">
                        From date
                      </label>

                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) =>
                          setStartDate(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-500">
                        To date
                      </label>

                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) =>
                          setEndDate(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  Loading permits...
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <p className="text-red-400">
                    {error}
                  </p>

                  <button
                    onClick={() => void loadPermits(true)}
                    className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredPermits.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400">
                    No permits match the selected filters.
                  </p>

                  <button
                    onClick={clearFilters}
                    className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-3 sm:hidden">
                    {filteredPermits.map((permit) => {
                      const expiring = isExpiringSoon(permit);
                      const myPendingApproval = currentUser !== null && permit.approvals.some((approval) => approval.approverId === currentUser.id && approval.status === "PENDING");
                      return (
                        <button key={permit.id} type="button" onClick={() => router.push(`/permits/${permit.id}`)} className={`w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition active:scale-[0.99] hover:bg-slate-900 ${expiring ? "ring-1 ring-amber-500/20" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{permit.permitNumber}</p>
                              {myPendingApproval && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">YOUR APPROVAL</span>}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{formatType(permit.type)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(permit.status)}`}>{formatStatus(permit.status)}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-300">{permit.workDescription}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div><p className="text-slate-600">Location</p><p className="mt-1 text-slate-300">{permit.area.name} · {permit.plant.code}</p></div>
                          <div><p className="text-slate-600">Requester</p><p className="mt-1 text-slate-300">{permit.requester.name}</p></div>
                          <div><p className="text-slate-600">Starts</p><p className="mt-1 text-slate-400">{formatDate(permit.plannedStart)}</p></div>
                          <div><p className="text-slate-600">Ends</p><p className="mt-1 text-slate-400">{formatDate(permit.plannedEnd)}</p></div>
                        </div>
                        {expiring && <p className="mt-3 text-xs font-medium text-amber-400">Expires within 2h</p>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-262.5">
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
                        (permit) => {
                          const expiring =
                            isExpiringSoon(permit);

                          const myPendingApproval =
                            currentUser !== null &&
                            permit.approvals.some(
                              (approval) =>
                                approval.approverId ===
                                  currentUser.id &&
                                approval.status ===
                                  "PENDING"
                            );

                          return (
                            <tr
                              key={permit.id}
                              onClick={() =>
                                router.push(
                                  `/permits/${permit.id}`
                                )
                              }
                              className={`cursor-pointer border-b border-slate-800/70 transition hover:bg-slate-800/40 ${
                                expiring
                                  ? "bg-amber-500/3"
                                  : ""
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-start gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold">
                                        {
                                          permit.permitNumber
                                        }
                                      </p>

                                      {myPendingApproval && (
                                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                          YOUR APPROVAL
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                                      {
                                        permit.workDescription
                                      }
                                    </p>
                                  </div>
                                </div>
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

                                {expiring && (
                                  <p className="mt-1 text-xs font-medium text-amber-400">
                                    Expires within 2h
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                                    permit.status
                                  )}`}
                                >
                                  {formatStatus(
                                    permit.status
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                    </table>
                  </div>
                </>
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

function InfoPanel({
  title,
  value,
  description,
  warning = false,
}: {
  title: string;
  value: number;
  description: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        warning
          ? "border-amber-500/20 bg-amber-500/4"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>

        <span
          className={`text-2xl font-bold ${
            warning
              ? "text-amber-400"
              : "text-emerald-400"
          }`}
        >
          {value}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}