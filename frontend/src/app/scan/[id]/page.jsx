import { notFound } from "next/navigation";
import { apiFetch } from "../../lib/api";

async function getPublicPermit(id) {
  try {
    const response = await apiFetch(
      `/api/permits/public/${id}`
    );
    return response.permit;
  } catch {
    return null;
  }
}

function formatType(value) {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0) + part.slice(1).toLowerCase()
    )
    .join(" ");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClasses(status) {
  switch (status) {
    case "ACTIVE":
      return {
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        panel: "border-emerald-500/20 bg-emerald-500/5",
      };
    case "PENDING_APPROVAL":
      return {
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        panel: "border-amber-500/20 bg-amber-500/5",
      };
    case "APPROVED":
      return {
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        panel: "border-blue-500/20 bg-blue-500/5",
      };
    case "SUSPENDED":
      return {
        badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        panel: "border-orange-500/20 bg-orange-500/5",
      };
    case "REJECTED":
      return {
        badge: "bg-red-500/10 text-red-400 border-red-500/20",
        panel: "border-red-500/20 bg-red-500/5",
      };
    case "EXPIRED":
      return {
        badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        panel: "border-slate-500/20 bg-slate-500/5",
      };
    case "CLOSED":
    case "CLOSED_VERIFIED":
      return {
        badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
        panel: "border-violet-500/20 bg-violet-500/5",
      };
    default:
      return {
        badge: "bg-slate-500/10 text-slate-300 border-slate-500/20",
        panel: "border-slate-500/20 bg-slate-500/5",
      };
  }
}

export default async function PublicPermitScanPage({
  params,
}) {
  const { id } = await params;
  const permit = await getPublicPermit(id);

  if (!permit) {
    notFound();
  }

  const classes = statusClasses(permit.status);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-10">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-800 px-6 py-6 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Permit verification
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {permit.permitNumber}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  {formatType(permit.type)}
                </p>
              </div>

              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${classes.badge}`}
              >
                {formatType(permit.status)}
              </span>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            <section
              className={`rounded-2xl border p-5 ${classes.panel}`}
            >
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Current permit status
              </p>

              <p className="mt-2 text-2xl font-bold">
                {formatType(permit.status)}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                This is a read-only permit verification view for safety
                walk-around checks.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Work description"
                value={permit.workDescription}
              />

              <InfoCard
                label="Permit type"
                value={formatType(permit.type)}
              />

              <InfoCard
                label="Plant"
                value={`${permit.plant.name} (${permit.plant.code})`}
              />

              <InfoCard
                label="Area"
                value={`${permit.area.name} (${permit.area.code})`}
              />

              <InfoCard
                label="Equipment"
                value={
                  permit.equipment
                    ? `${permit.equipment.name} (${permit.equipment.code})`
                    : "Not specified"
                }
              />

              <InfoCard
                label="Valid from"
                value={formatDate(permit.plannedStart)}
              />

              <InfoCard
                label="Valid until"
                value={formatDate(permit.plannedEnd)}
              />
            </section>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-600">
                Safety note
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This page reflects the permit status available from the
                central PTW system. Verify the on-site conditions and
                required controls before work begins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}
