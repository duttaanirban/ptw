"use client";

import SignaturePad from "./SignaturePad";

type PermitActionsProps = {
  canSubmit: boolean;
  canApprove: boolean;
  canActivate: boolean;
  canSuspend: boolean;
  canResume: boolean;
  canClose: boolean;
  canVerifyClose: boolean;
  canCancel: boolean;

  actionLoading: boolean;

  comment: string;
  setComment: (value: string) => void;

  completionNotes: string;
  setCompletionNotes: (value: string) => void;

  signatureDataUrl: string;
  setSignatureDataUrl: (value: string) => void;

  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onResume: () => void;
  onClose: () => void;
  onVerifyClose: () => void;
  onCancel: () => void;
};

export default function PermitActions({
  canSubmit,
  canApprove,
  canActivate,
  canSuspend,
  canResume,
  canClose,
  canVerifyClose,
  canCancel,
  actionLoading,
  comment,
  setComment,
  completionNotes,
  setCompletionNotes,
  signatureDataUrl,
  setSignatureDataUrl,
  onSubmit,
  onApprove,
  onReject,
  onActivate,
  onSuspend,
  onResume,
  onClose,
  onVerifyClose,
  onCancel,
}: PermitActionsProps) {
  const hasAnyAction =
    canSubmit ||
    canApprove ||
    canActivate ||
    canSuspend ||
    canResume ||
    canClose ||
    canVerifyClose ||
    canCancel;

  return (
    <div>
      {canSubmit && (
        <ActionButton
          label="Submit for approval"
          onClick={onSubmit}
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
            onChange={(event) => setComment(event.target.value)}
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
            onClick={onApprove}
            loading={actionLoading}
          />

          <ActionButton
            label="Reject permit"
            onClick={onReject}
            loading={actionLoading}
            secondary
          />
        </>
      )}

      {canActivate && (
        <ActionButton
          label="Activate permit"
          onClick={onActivate}
          loading={actionLoading}
        />
      )}

      {canSuspend && (
        <>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Reason for suspension"
            rows={3}
            className="mb-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
          />

          <ActionButton
            label="Suspend permit"
            onClick={onSuspend}
            loading={actionLoading}
            secondary
          />
        </>
      )}

      {canResume && (
        <ActionButton
          label="Resume permit"
          onClick={onResume}
          loading={actionLoading}
        />
      )}

      {canClose && (
        <>
          <textarea
            value={completionNotes}
            onChange={(event) => setCompletionNotes(event.target.value)}
            placeholder="Describe the work completed and site restoration..."
            rows={5}
            className="mb-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
          />

          <ActionButton
            label="Mark work completed"
            onClick={onClose}
            loading={actionLoading}
          />
        </>
      )}

      {canVerifyClose && (
        <>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Verification comment (optional)"
            rows={3}
            className="mb-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
          />

          <ActionButton
            label="Verify closure"
            onClick={onVerifyClose}
            loading={actionLoading}
          />
        </>
      )}

      {canCancel && (
        <ActionButton
          label="Cancel permit"
          onClick={onCancel}
          loading={actionLoading}
          secondary
        />
      )}

      {!hasAnyAction && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm text-slate-400">
            No actions are available for your role and this permit&apos;s
            current status.
          </p>
        </div>
      )}
    </div>
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
      type="button"
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