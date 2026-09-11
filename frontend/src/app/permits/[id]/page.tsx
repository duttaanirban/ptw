"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { QRCodeSVG } from "qrcode.react";

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

type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type Approval = {
  id: string;
  approverId: string;
  role: string;
  status: ApprovalStatus;
  comment?: string | null;
  actedAt?: string | null;
  approver: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type AuditLog = {
  id: string;
  action: string;
  fromStatus?: PermitStatus | null;
  toStatus?: PermitStatus | null;
  oldValue?: unknown;
  newValue?: unknown;
  comment?: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type Permit = {
  id: string;
  permitNumber: string;
  type: string;
  status: PermitStatus;
  requesterId: string;
  contractorTeam: string;
  workDescription: string;
  plannedStart: string;
  plannedEnd: string;
  hazards: string[];
  ppe: string[];
  precautions: string[];
  completionNotes?: string | null;
  completedAt?: string | null;

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
    owner?: {
      id: string;
      name: string;
      email: string;
    } | null;
  };

  equipment?: {
    id: string;
    name: string;
    code: string;
  } | null;

  approvals: Approval[];
  auditLogs: AuditLog[];

  hotWorkDetails?: {
    hotWorkType: string;
    fireWatchAssigned: boolean;
    fireExtinguisherType: string;
    combustiblesClearedRadius?: number | null;
    lelPercent?: number | null;
    oxygenPercent?: number | null;
    gasTestTime?: string | null;
  } | null;

  confinedSpaceDetails?: {
    spaceId: string;
    entryPoint: string;
    oxygenPercent?: number | null;
    lelPercent?: number | null;
    h2sPpm?: number | null;
    coPpm?: number | null;
    atmosphericTestTime?: string | null;
    standbyAttendant: string;
    rescuePlan: string;
    ventilationMethod: string;
    entryExitLog: unknown;
  } | null;

  workingAtHeightDetails?: {
    workHeightMeters: number;
    accessMethod: string;
    fallArrestEquipment: string;
    anchorPointVerified: boolean;
    barricadingBelow: boolean;
    weatherConditions?: string | null;
  } | null;

  electricalLotoDetails?: {
    equipmentTag: string;
    voltageLevel: string;
    isolationPoints: unknown;
    lockNumbers: unknown;
    tagNumbers: unknown;
    earthingApplied: boolean;
    testedDeadBy: string;
    isolationMethod?: string | null;
    lotoApplied?: boolean | null;
    verificationMethod?: string | null;
  } | null;
};

type PermitResponse = {
  permit: Permit;
};

type EditPermitForm = {
  contractorTeam: string;
  workDescription: string;
  plannedStart: string;
  plannedEnd: string;
  hazards: string;
  ppe: string;
  precautions: string;
};

export default function PermitDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [permit, setPermit] = useState<Permit | null>(
    null
  );

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);
  const [error, setError] = useState("");

  const [comment, setComment] = useState("");
  const [completionNotes, setCompletionNotes] =
    useState("");
  const [signatureDataUrl, setSignatureDataUrl] =
    useState("");

  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<EditPermitForm>({
    contractorTeam: "",
    workDescription: "",
    plannedStart: "",
    plannedEnd: "",
    hazards: "",
    ppe: "",
    precautions: "",
  });

  
  
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const validity = useMemo(() => {
    if (!permit) return null;

    const start = new Date(permit.plannedStart).getTime();
    const end = new Date(permit.plannedEnd).getTime();
    const remainingMs = end - now;
    const untilStartMs = start - now;

    return {
      remainingMs,
      untilStartMs,
      isExpired: remainingMs <= 0,
      isExpiringSoon: remainingMs > 0 && remainingMs <= 2 * 60 * 60 * 1000,
      isNotStarted: untilStartMs > 0,
    };
  }, [permit, now]);

  const formatCountdown = useCallback((milliseconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, []);

  const loadPermit = useCallback(async () => {
    const token = localStorage.getItem("ptw_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const userJson =
        localStorage.getItem("ptw_user");

      if (userJson) {
        setCurrentUser(JSON.parse(userJson));
      }

      const response =
        await apiFetch<PermitResponse>(
          `/api/permits/${params.id}`,
          {
            token,
          }
        );

      setPermit(response.permit);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load permit"
      );
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    // Loading permit data is an external side effect; its async callbacks update state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPermit();
  }, [loadPermit]);

  const pendingApproval = useMemo(() => {
    if (!permit || !currentUser) {
      return null;
    }

    return permit.approvals.find(
      (approval) =>
        approval.approverId === currentUser.id &&
        approval.status === "PENDING"
    );
  }, [permit, currentUser]);

  async function performAction(
    path: string,
    body?: Record<string, unknown>
  ) {
    const token = localStorage.getItem("ptw_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await apiFetch(
        `/api/permits/${params.id}${path}`,
        {
          method: "POST",
          token,
          body: body
            ? JSON.stringify(body)
            : undefined,
        }
      );

      setComment("");
      setCompletionNotes("");
      setSignatureDataUrl("");

      await loadPermit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Action failed"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmit() {
    await performAction("/submit");
  }

  async function handleApprove() {
    if (!signatureDataUrl) {
      setError("A digital signature is required before approval.");
      return;
    }

    await performAction("/approve", {
      comment: comment.trim() || undefined,
      signature: signatureDataUrl,
    });
  }

  async function handleReject() {
  if (!comment.trim()) {
    setError("A rejection reason is required.");
    return;
  }

  if (
    !confirmAction(
      "Reject this permit?\n\nThis will move the permit to REJECTED."
    )
  ) {
    return;
  }

  await performAction("/reject", {
    comment: comment.trim(),
  });
}

  async function handleActivate() {
    await performAction("/activate");
  }

  async function handleSuspend() {
  if (!comment.trim()) {
    setError(
      "A reason is required when suspending a permit."
    );
    return;
  }

  if (
    !confirmAction(
      "Suspend this active permit?\n\nWork will be stopped until the permit is resumed."
    )
  ) {
    return;
  }

  await performAction("/suspend", {
    comment: comment.trim(),
  });
}

  async function handleResume() {
    await performAction("/resume", {
      comment: comment.trim() || undefined,
    });
  }

  async function handleClose() {
  if (!completionNotes.trim()) {
    setError("Completion notes are required.");
    return;
  }

  if (
    !confirmAction(
      "Mark this permit as completed?\n\nMake sure the work area has been restored safely."
    )
  ) {
    return;
  }

  await performAction("/close", {
    completionNotes: completionNotes.trim(),
  });
}

  async function handleVerifyClose() {
  if (
    !confirmAction(
      "Verify closure for this permit?\n\nThis will move the permit to CLOSED_VERIFIED."
    )
  ) {
    return;
  }

  await performAction("/verify-close", {
    comment: comment.trim() || undefined,
  });
}

  async function handleCancel() {
  if (
    !confirmAction(
      "Cancel this permit?\n\nThis action cannot be undone."
    )
  ) {
    return;
  }

  await performAction("/cancel", {
    comment: comment.trim() || undefined,
  });
}

  function startEditing() {
    if (!permit) {
      return;
    }

    setEditForm({
      contractorTeam: permit.contractorTeam,
      workDescription: permit.workDescription,
      plannedStart: toDateTimeLocal(permit.plannedStart),
      plannedEnd: toDateTimeLocal(permit.plannedEnd),
      hazards: permit.hazards.join("\n"),
      ppe: permit.ppe.join("\n"),
      precautions: permit.precautions.join("\n"),
    });

    setError("");
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!permit) {
      return;
    }

    const token = localStorage.getItem("ptw_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!editForm.contractorTeam.trim()) {
      setError("Contractor / team is required.");
      return;
    }

    if (!editForm.workDescription.trim()) {
      setError("Work description is required.");
      return;
    }

    if (!editForm.plannedStart || !editForm.plannedEnd) {
      setError("Planned start and end are required.");
      return;
    }

    const plannedStart = new Date(editForm.plannedStart);
    const plannedEnd = new Date(editForm.plannedEnd);

    if (Number.isNaN(plannedStart.getTime()) || Number.isNaN(plannedEnd.getTime())) {
      setError("Please enter valid planned dates.");
      return;
    }

    if (plannedEnd <= plannedStart) {
      setError("Planned end must be later than planned start.");
      return;
    }

    if (!editForm.hazards.trim()) {
      setError("Please provide at least one hazard.");
      return;
    }

    if (!editForm.ppe.trim()) {
      setError("Please provide the required PPE.");
      return;
    }

    if (!editForm.precautions.trim()) {
      setError("Please provide at least one precaution.");
      return;
    }

    setEditLoading(true);
    setError("");

    try {
      await apiFetch(`/api/permits/${permit.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          contractorTeam: editForm.contractorTeam.trim(),
          workDescription: editForm.workDescription.trim(),
          plannedStart: plannedStart.toISOString(),
          plannedEnd: plannedEnd.toISOString(),
          hazards: editForm.hazards
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          ppe: editForm.ppe
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          precautions: editForm.precautions
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      setEditing(false);
      await loadPermit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update permit"
      );
    } finally {
      setEditLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="p-12 text-center text-slate-500">
          Loading permit...
        </div>
      </main>
    );
  }

  if (!permit) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl p-8">
          <p className="text-red-400">
            {error || "Permit not found"}
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const isRequester =
    currentUser?.id === permit.requesterId;

  const canSubmit =
    isRequester &&
    permit.status === "DRAFT";

  const canApprove =
    !!pendingApproval &&
    permit.status === "PENDING_APPROVAL";

  const canActivate =
    currentUser !== null &&
    ["AREA_OWNER", "SAFETY_OFFICER", "ADMIN"].includes(
      currentUser.role
    ) &&
    permit.status === "APPROVED";

  const canSuspend =
    currentUser !== null &&
    ["AREA_OWNER", "SAFETY_OFFICER", "ADMIN"].includes(
      currentUser.role
    ) &&
    permit.status === "ACTIVE";

  const canResume =
    currentUser !== null &&
    ["AREA_OWNER", "SAFETY_OFFICER", "ADMIN"].includes(
      currentUser.role
    ) &&
    permit.status === "SUSPENDED";

  const canClose =
    isRequester &&
    permit.status === "ACTIVE";

  const canVerifyClose =
    currentUser !== null &&
    ["SAFETY_OFFICER", "ADMIN"].includes(
      currentUser.role
    ) &&
    permit.status === "CLOSED";

  const canCancel =
    isRequester &&
    ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(
      permit.status
    );

  const publicPermitUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/scan/${permit.id}`
      : `/scan/${permit.id}`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl min-w-0 px-3 py-4 sm:px-5 sm:py-8 lg:px-8">
        <div className="mb-5 flex min-w-0 flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/")}
              className="mb-3 text-sm text-slate-500 hover:text-white"
            >
              ← Back to dashboard
            </button>

            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="max-w-full wrap-break-word text-2xl font-bold sm:text-3xl">
                {permit.permitNumber}
              </h1>

              <StatusBadge status={permit.status} />
            </div>

            <p className="mt-2 wrap-break-word text-sm leading-6 text-slate-500 sm:text-base">
              {formatType(permit.type)} ·{" "}
              {permit.workDescription}
            </p>
          </div>

          <div className="w-full min-w-0 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left sm:w-auto sm:max-w-xs sm:text-right">
            <p className="text-xs text-slate-500">
              Requested by
            </p>

            <p className="mt-1 text-sm font-medium">
              {permit.requester.name}
            </p>

            <p className="text-xs text-slate-500">
              {permit.requester.email}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4 sm:space-y-6">
            <Section
              title="Work authorization"
            >
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Detail
                  label="Contractor / team"
                  value={permit.contractorTeam}
                />

                <Detail
                  label="Requester"
                  value={permit.requester.name}
                />

                <Detail
                  label="Plant"
                  value={`${permit.plant.name} (${permit.plant.code})`}
                />

                <Detail
                  label="Area"
                  value={`${permit.area.name} (${permit.area.code})`}
                />

                <Detail
                  label="Equipment"
                  value={
                    permit.equipment
                      ? `${permit.equipment.name} (${permit.equipment.code})`
                      : "Not specified"
                  }
                />

                <Detail
                  label="Planned start"
                  value={formatDate(
                    permit.plannedStart
                  )}
                />

                <Detail
                  label="Planned end"
                  value={formatDate(
                    permit.plannedEnd
                  )}
                />

                <Detail
                  label="Area owner"
                  value={
                    permit.area.owner?.name ||
                    "Not assigned"
                  }
                />
              </div>

              <div className="mt-4 grid min-w-0 gap-4 sm:mt-5 sm:grid-cols-3">
                <ListDetail
                  label="Hazards"
                  values={permit.hazards}
                />

                <ListDetail
                  label="PPE"
                  values={permit.ppe}
                />

                <ListDetail
                  label="Precautions"
                  values={permit.precautions}
                />
              </div>
            </Section>

            <TypeSpecificSection permit={permit} />

            <Section title="Approval trail">
              <div className="space-y-3">
                {permit.approvals.map(
                  (approval) => (
                    <div
                      key={approval.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {formatRole(
                            approval.role
                          )}
                        </p>

                        <p className="mt-1 wrap-break-word text-sm text-slate-500">
                          {approval.approver.name}
                        </p>
                      </div>

                      <div className="min-w-0 text-left sm:text-right">
                        <ApprovalBadge
                          status={
                            approval.status
                          }
                        />

                        {approval.comment && (
                          <p className="mt-2 max-w-sm text-xs text-slate-500">
                            {approval.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}

                {permit.approvals.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No approvals have been requested yet.
                  </p>
                )}
              </div>
            </Section>

            {(permit.completionNotes ||
              permit.completedAt) && (
              <Section title="Closure">
                <Detail
                  label="Completion notes"
                  value={
                    permit.completionNotes ||
                    "No completion notes"
                  }
                />

                {permit.completedAt && (
                  <div className="mt-4">
                    <Detail
                      label="Completed at"
                      value={formatDate(
                        permit.completedAt
                      )}
                    />
                  </div>
                )}
              </Section>
            )}

            <Section title="Audit timeline">
              <div className="space-y-4 sm:space-y-5">
                {permit.auditLogs.map(
                  (log, index) => (
                    <div
                      key={log.id}
                      className="relative pl-7"
                    >
                      {index <
                        permit.auditLogs.length -
                          1 && (
                        <div className="absolute left-1.5 top-3 h-full w-px bg-slate-800" />
                      )}

                      <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-500" />

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {formatType(
                              log.action
                            )}
                          </p>

                          <span className="text-xs text-slate-600">
                            {formatDateTime(
                              log.createdAt
                            )}
                          </span>
                        </div>

                        <p className="mt-1 wrap-break-word text-sm text-slate-500">
                          {log.actor.name} ·{" "}
                          {formatRole(
                            log.actor.role
                          )}
                        </p>

                        {(log.fromStatus ||
                          log.toStatus) && (
                          <p className="mt-2 text-xs text-slate-600">
                            {log.fromStatus ||
                              "—"}{" "}
                            →{" "}
                            {log.toStatus ||
                              "—"}
                          </p>
                        )}

                        {log.comment && (
                          <p className="mt-2 wrap-break-word text-sm leading-6 text-slate-400">
                            {log.comment}
                          </p>
                        )}

                        {(log.oldValue !== undefined ||
                            log.newValue !== undefined) && (
                            <details className="mt-3">
                                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                                View field changes
                                </summary>

                                <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
                                <ValueBlock
                                    label="Before"
                                    value={formatAuditValue(
                                    log.oldValue
                                    )}
                                />

                                <ValueBlock
                                    label="After"
                                    value={formatAuditValue(
                                    log.newValue
                                    )}
                                />
                                </div>
                            </details>
                            )}
                      </div>
                    </div>
                  )
                )}

                {permit.auditLogs.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No audit history available.
                  </p>
                )}
              </div>
            </Section>
          </div>

          <aside className="min-w-0 space-y-4 sm:space-y-6">
            <Section title="Actions">
              {isRequester &&
                ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(
                  permit.status
                ) &&
                !editing && (
                  <ActionButton
                    label="Edit permit"
                    onClick={startEditing}
                    loading={false}
                    secondary
                  />
                )}

              {editing && (
                <div className="mb-5 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <div className="mb-4">
                    <p className="font-semibold">Edit permit</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Changes made after submission are recorded in the audit timeline.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <EditField
                      label="Contractor / team"
                      value={editForm.contractorTeam}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          contractorTeam: value,
                        }))
                      }
                    />

                    <EditField
                      label="Work description"
                      value={editForm.workDescription}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          workDescription: value,
                        }))
                      }
                      textarea
                    />

                    <EditField
                      label="Planned start"
                      value={editForm.plannedStart}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          plannedStart: value,
                        }))
                      }
                      type="datetime-local"
                    />

                    <EditField
                      label="Planned end"
                      value={editForm.plannedEnd}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          plannedEnd: value,
                        }))
                      }
                      type="datetime-local"
                    />

                    <EditField
                      label="Hazards"
                      value={editForm.hazards}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          hazards: value,
                        }))
                      }
                      textarea
                      placeholder="One per line"
                    />

                    <EditField
                      label="PPE"
                      value={editForm.ppe}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          ppe: value,
                        }))
                      }
                      textarea
                      placeholder="One per line"
                    />

                    <EditField
                      label="Precautions"
                      value={editForm.precautions}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          precautions: value,
                        }))
                      }
                      textarea
                      placeholder="One per line"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={editLoading}
                        className="min-h-11 flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {editLoading ? "Saving..." : "Save changes"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setError("");
                        }}
                        disabled={editLoading}
                        className="min-h-11 flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {canSubmit && (
                <ActionButton
                  label="Submit for approval"
                  onClick={handleSubmit}
                  loading={actionLoading}
                />
              )}

              {canApprove && (
                <>
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Approval / rejection comment
                  </p>
                  <textarea
                    value={comment}
                    onChange={(event) =>
                      setComment(
                        event.target.value
                      )
                    }
                    placeholder="Approval comment (optional). For rejection, a reason is required."
                    rows={3}
                    className="mb-4 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />

                  <SignaturePad
                    value={signatureDataUrl}
                    onChange={setSignatureDataUrl}
                  />

                  <ActionButton
                    label="Approve permit"
                    onClick={handleApprove}
                    loading={actionLoading}
                  />

                  <ActionButton
                    label="Reject permit"
                    onClick={handleReject}
                    loading={actionLoading}
                    secondary
                  />
                </>
              )}

              {canActivate && (
                <ActionButton
                  label="Activate permit"
                  onClick={handleActivate}
                  loading={actionLoading}
                />
              )}

              {canSuspend && (
                <>
                  <textarea
                    value={comment}
                    onChange={(event) =>
                      setComment(
                        event.target.value
                      )
                    }
                    placeholder="Reason for suspension"
                    rows={3}
                    className="mb-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />

                  <ActionButton
                    label="Suspend permit"
                    onClick={handleSuspend}
                    loading={actionLoading}
                    secondary
                  />
                </>
              )}

              {canResume && (
                <ActionButton
                  label="Resume permit"
                  onClick={handleResume}
                  loading={actionLoading}
                />
              )}

              {canClose && (
                <>
                  <textarea
                    value={completionNotes}
                    onChange={(event) =>
                      setCompletionNotes(
                        event.target.value
                      )
                    }
                    placeholder="Describe the work completed and site restoration..."
                    rows={5}
                    className="mb-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />

                  <ActionButton
                    label="Mark work completed"
                    onClick={handleClose}
                    loading={actionLoading}
                  />
                </>
              )}

              {canVerifyClose && (
                <>
                  <textarea
                    value={comment}
                    onChange={(event) =>
                      setComment(
                        event.target.value
                      )
                    }
                    placeholder="Verification comment (optional)"
                    rows={3}
                    className="mb-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />

                  <ActionButton
                    label="Verify closure"
                    onClick={handleVerifyClose}
                    loading={actionLoading}
                  />
                </>
              )}

              {canCancel && (
                <ActionButton
                  label="Cancel permit"
                  onClick={handleCancel}
                  loading={actionLoading}
                  secondary
                />
              )}

              {!canSubmit &&
                !canApprove &&
                !canActivate &&
                !canSuspend &&
                !canResume &&
                !canClose &&
                !canVerifyClose &&
                !canCancel && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">
                      No actions are available for your
                      role and this permit&apos;s current status.
                    </p>
                  </div>
                )}
            </Section>

            <Section title="Scan permit">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl bg-white p-4">
                  <QRCodeSVG
                    value={publicPermitUrl}
                    size={180}
                    level="M"
                    includeMargin
                  />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-200">
                  Scan to view permit status
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Safety teams can scan this QR code during a walk-around
                  to quickly check the permit status.
                </p>

                <p className="mt-3 max-w-full break-all text-[11px] leading-5 text-slate-600">
                  {publicPermitUrl}
                </p>
              </div>
            </Section>

            <Section title="Permit status">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Current state
                </span>

                <StatusBadge
                  status={permit.status}
                />
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-600">
                  Validity window
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {formatDate(
                    permit.plannedStart
                  )}
                </p>

                <p className="mt-1 wrap-break-word text-sm text-slate-500">
                  to{" "}
                  {formatDate(
                    permit.plannedEnd
                  )}
                </p>


              {validity && (
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    validity.isExpired
                      ? "border-red-500/20 bg-red-500/5"
                      : validity.isExpiringSoon
                        ? "border-amber-500/20 bg-amber-500/5"
                        : validity.isNotStarted
                          ? "border-blue-500/20 bg-blue-500/5"
                          : "border-emerald-500/20 bg-emerald-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {validity.isExpired
                        ? "Permit expired"
                        : validity.isNotStarted
                          ? "Starts in"
                          : "Time remaining"}
                    </p>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        validity.isExpired
                          ? "text-red-400"
                          : validity.isExpiringSoon
                            ? "text-amber-400"
                            : validity.isNotStarted
                              ? "text-blue-400"
                              : "text-emerald-400"
                      }`}
                    >
                      {validity.isExpired
                        ? "Expired"
                        : validity.isNotStarted
                          ? formatCountdown(validity.untilStartMs)
                          : formatCountdown(validity.remainingMs)}
                    </span>
                  </div>
                  {permit.status === "ACTIVE" &&
                    validity.isExpiringSoon &&
                    !validity.isExpired && (
                      <p className="mt-2 text-xs text-amber-300">
                        This permit expires within the next 2 hours.
                      </p>
                    )}
                </div>
              )}              </div>
            </Section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "#f8fafc";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / rect.width),
      y:
        (event.clientY - rect.top) *
        (canvas.height / rect.height),
    };
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    drawingRef.current = true;
    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);

    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishDrawing(event?: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!drawingRef.current || !canvas) {
      return;
    }

    drawingRef.current = false;
  setIsDrawing(false);

    if (
      event &&
      canvas.hasPointerCapture(event.pointerId)
    ) {
      canvas.releasePointerCapture(event.pointerId);
    }

    onChange(canvas.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "#f8fafc";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";

    onChange("");
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            Digital signature
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sign inside the box to authorize this permit approval.
          </p>
        </div>

        <button
          type="button"
          onClick={clearSignature}
          disabled={!value || isDrawing}
          className="min-h-10 shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={240}
          className="block h-36 w-full touch-none cursor-crosshair sm:h-40"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onPointerLeave={() => {
            // Pointer capture keeps an in-progress signature drawing active.
          }}
        />
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">
          Draw with mouse, stylus, or touch.
        </span>

        <span className={value ? "text-emerald-400" : "text-amber-400"}>
          {value ? "Signature captured" : "Signature required"}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-300">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 wrap-break-word whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {value || "—"}
      </p>
    </div>
  );
}

function ListDetail({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-600">
        {label}
      </p>

      {values.length === 0 ? (
        <p className="mt-2 wrap-break-word text-sm leading-6 text-slate-500">
          None specified
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="text-sm text-slate-300"
            >
              • {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TypeSpecificSection({
  permit,
}: {
  permit: Permit;
}) {
  if (permit.type === "HOT_WORK") {
    const details = permit.hotWorkDetails;

    if (!details) {
      return null;
    }

    return (
      <Section title="Hot work controls">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label="Hot work type"
            value={formatType(
              details.hotWorkType
            )}
          />

          <Detail
            label="Fire watch"
            value={
              details.fireWatchAssigned
                ? "Assigned"
                : "Not assigned"
            }
          />

          <Detail
            label="Extinguisher"
            value={details.fireExtinguisherType}
          />

          <Detail
            label="Combustibles radius"
            value={
              details.combustiblesClearedRadius !=
              null
                ? `${details.combustiblesClearedRadius} m`
                : "—"
            }
          />

          <Detail
            label="LEL"
            value={
              details.lelPercent != null
                ? `${details.lelPercent}%`
                : "—"
            }
          />

          <Detail
            label="O₂"
            value={
              details.oxygenPercent != null
                ? `${details.oxygenPercent}%`
                : "—"
            }
          />
        </div>
      </Section>
    );
  }

  if (
    permit.type === "CONFINED_SPACE"
  ) {
    const details =
      permit.confinedSpaceDetails;

    if (!details) {
      return null;
    }

    return (
      <Section title="Confined space controls">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Detail
            label="Space ID"
            value={details.spaceId}
          />

          <Detail
            label="Entry point"
            value={details.entryPoint}
          />

          <Detail
            label="O₂"
            value={
              details.oxygenPercent != null
                ? `${details.oxygenPercent}%`
                : "—"
            }
          />

          <Detail
            label="LEL"
            value={
              details.lelPercent != null
                ? `${details.lelPercent}%`
                : "—"
            }
          />

          <Detail
            label="H₂S"
            value={
              details.h2sPpm != null
                ? `${details.h2sPpm} ppm`
                : "—"
            }
          />

          <Detail
            label="CO"
            value={
              details.coPpm != null
                ? `${details.coPpm} ppm`
                : "—"
            }
          />

          <Detail
            label="Standby attendant"
            value={
              details.standbyAttendant
            }
          />

          <Detail
            label="Ventilation"
            value={
              details.ventilationMethod
            }
          />

          <Detail
            label="Rescue plan"
            value={
              details.rescuePlan
            }
          />
        </div>
      </Section>
    );
  }

  if (
    permit.type === "WORKING_AT_HEIGHT"
  ) {
    const details =
      permit.workingAtHeightDetails;

    if (!details) {
      return null;
    }

    return (
      <Section title="Working at height controls">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Detail
            label="Work height"
            value={`${details.workHeightMeters} m`}
          />

          <Detail
            label="Access method"
            value={formatType(
              details.accessMethod
            )}
          />

          <Detail
            label="Fall arrest equipment"
            value={
              details.fallArrestEquipment
            }
          />

          <Detail
            label="Anchor point checked"
            value={
              details.anchorPointVerified
                ? "Yes"
                : "No"
            }
          />

          <Detail
            label="Barricading below"
            value={
              details.barricadingBelow
                ? "Yes"
                : "No"
            }
          />

          <Detail
            label="Weather"
            value={
              details.weatherConditions ||
              "—"
            }
          />
        </div>
      </Section>
    );
  }

  const details =
    permit.electricalLotoDetails;

  if (!details) {
    return null;
  }

  return (
    <Section title="Electrical / LOTO controls">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Detail
          label="Equipment tag"
          value={details.equipmentTag}
        />

        <Detail
          label="Voltage"
          value={details.voltageLevel}
        />

        <Detail
          label="Isolation points"
          value={formatJsonList(
            details.isolationPoints
          )}
        />

        <Detail
          label="Lock numbers"
          value={formatJsonList(
            details.lockNumbers
          )}
        />

        <Detail
          label="Tag numbers"
          value={formatJsonList(
            details.tagNumbers
          )}
        />

        <Detail
          label="Earthing applied"
          value={
            details.earthingApplied
              ? "Yes"
              : "No"
          }
        />

        <Detail
          label="Tested dead by"
          value={details.testedDeadBy}
        />

        <Detail
          label="Isolation method"
          value={
            details.isolationMethod ||
            "—"
          }
        />

        <Detail
          label="Verification method"
          value={
            details.verificationMethod ||
            "—"
          }
        />
      </div>
    </Section>
  );
}

function ActionButton({
  label,
  onClick,
  loading,
  secondary = false,
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`mb-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        secondary
          ? "border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
          : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      }`}
    >
      {loading ? "Processing..." : label}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: PermitStatus;
}) {
  const classes = statusClasses(status);

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {formatType(status)}
    </span>
  );
}

function ApprovalBadge({
  status,
}: {
  status: ApprovalStatus;
}) {
  const classes =
    status === "APPROVED"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : status === "REJECTED"
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {formatType(status)}
    </span>
  );
}

function ValueBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
        {value}
      </pre>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatType(value: string) {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0) +
        part.slice(1).toLowerCase()
    )
    .join(" ");
}

function formatRole(value: string) {
  return formatType(value);
}

function formatJsonList(value: unknown) {
  if (!Array.isArray(value)) {
    return "—";
  }

  return value
    .map((item) => String(item))
    .join(", ");
}

function formatAuditValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized === undefined ? "—" : serialized;
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className="min-h-11 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
        />
      )}
    </div>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function confirmAction(message: string) {
  return window.confirm(message);
}
