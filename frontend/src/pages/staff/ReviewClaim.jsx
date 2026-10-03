import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { claimApi } from "../../api";
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  DollarSign,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS } from "../../constants/permissions";

export default function ReviewClaim() {
  const { hasPermission } = useAuth();
  const canApprove = hasPermission(PERMISSIONS.EXPENSES_APPROVE);
  const canReimburse = hasPermission(PERMISSIONS.EXPENSES_REIMBURSE);

  const { claimId } = useParams();
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchClaimData = () => {
    setLoading(true);
    claimApi
      .getClaimById(claimId)
      .then((data) => {
        setClaim(data);
        setNotes(data?.treasurerNotes || data?.reject_reason || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClaimData();
  }, [claimId]);

  const handleAction = async (newStatus) => {
    if (newStatus === "REJECTED" && !notes.trim()) {
      alert("A specific audit or compliance reason is strictly required before rejecting an expense claim.");
      return;
    }

    setUpdating(true);
    setFeedback(null);
    try {
      if (newStatus === "APPROVED") {
        await claimApi.approveClaim(claim.id);
        setFeedback({ type: "success", message: "Claim approved successfully! It is now queued for payout." });
      } else if (newStatus === "REJECTED") {
        await claimApi.rejectClaim(claim.id, notes.trim());
        setFeedback({ type: "success", message: "Claim marked as rejected. Claimant has been notified." });
      } else if (newStatus === "REIMBURSED") {
        await claimApi.reimburseClaim(claim.id, notes.trim() || "DIRECT_DEPOSIT");
        setFeedback({ type: "success", message: "Payout issued! General ledger debit transaction posted to treasury." });
      }

      // Refresh claim state
      const updated = await claimApi.getClaimById(claimId);
      if (updated) {
        setClaim(updated);
      }
    } catch (err) {
      console.error("Adjudication action failed:", err);
      setFeedback({ type: "error", message: err.message || "Failed to process claim action." });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingState message="Loading claim audit details..." />;
  if (error || !claim) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          title="Claim Not Found"
          message="Could not find the requested expense claim."
        />
      </div>
    );
  }

  const claimNumber = claim.claimNumber || claim.claim_number || claim.id;
  const claimant = claim.claimantName || claim.claimant_name || claim.full_name || "Volunteer Claimant";
  const category = claim.category || claim.category_name || "Operations / Supplies";
  const submittedRaw = claim.submittedAt || claim.created_at;
  const submittedDate = submittedRaw && !isNaN(new Date(submittedRaw).getTime())
    ? new Date(submittedRaw).toLocaleString()
    : "Recently Recorded";
  const claimAmount = Number(claim.amount || 0);
  const purpose = claim.purpose || claim.description || claim.title || "No description provided.";
  const receiptImg = claim.receiptUrl || claim.receipt_url || claim.receipts?.[0]?.file_url;
  const status = (claim.status || "SUBMITTED").toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Claims Audit", to: "/app/manage/claims" },
          { label: `Review ${claimNumber}` },
        ]}
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold block">
              Treasurer Claim Adjudication
            </span>
            <h1 className="text-xl font-bold text-foreground font-mono mt-0.5">
              {claimNumber}
            </h1>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Claim Lifecycle Banner */}
        {status === "APPROVED" && (
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Claim Approved & Ready for Payout</p>
              <p className="text-[11px] text-teal-700 mt-0.5">
                This claim has been approved by audit. Click <strong>Issue Payout & Log to Ledger</strong> below to disburse funds and record the expense in the double-entry ledger.
              </p>
            </div>
          </div>
        )}

        {status === "REIMBURSED" && (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Claim Settled & Disbursed</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Reimbursement was completed and written to the organization general ledger.
              </p>
            </div>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Claim Rejected</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Reason: {claim.reject_reason || claim.rejectReason || "Declined during treasury audit."}
              </p>
            </div>
          </div>
        )}

        {/* Key Metadata Grid */}
        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-border text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Volunteer Claimant</span>
            <span className="font-bold text-foreground">{claimant}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Category</span>
            <span className="font-semibold text-foreground">{category}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Submitted On</span>
            <span className="font-medium text-foreground">{submittedDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Claim Amount</span>
            <span className="text-base font-extrabold text-teal-700">
              ${claimAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Expense Purpose */}
        <div className="space-y-1.5 text-xs">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider">
            Stated Expense Purpose
          </h4>
          <p className="p-3.5 rounded-xl bg-slate-50 border border-border text-slate-700 leading-relaxed">
            {purpose}
          </p>
        </div>

        {/* Attached Proof of Purchase */}
        {receiptImg && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Submitted Receipt Proof
            </h4>
            <div className="rounded-xl overflow-hidden border border-border bg-slate-100 max-h-72 flex items-center justify-center p-2">
              <img
                src={receiptImg}
                alt="Receipt proof"
                className="max-h-64 object-contain rounded-lg shadow-2xs"
              />
            </div>
            <a
              href={receiptImg}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline font-medium"
            >
              <span>Inspect Full Resolution Receipt</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Treasurer Review Notes input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Treasurer Audit & Compliance Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={status === "REIMBURSED"}
            placeholder="Document reason for approval/rejection or reimbursement reference ID."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Adjudication Buttons */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/app/manage/claims"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Claims</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {canApprove || canReimburse ? (
              <>
                {/* 1. When SUBMITTED: Allow Approve or Reject */}
                {status === "SUBMITTED" && (
                  <>
                    <button
                      onClick={() => handleAction("REJECTED")}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => handleAction("APPROVED")}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Claim</span>
                    </button>
                  </>
                )}

                {/* 2. When APPROVED: Allow Payout Disbursement */}
                {status === "APPROVED" && (
                  <>
                    <button
                      onClick={() => handleAction("REJECTED")}
                      disabled={updating}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Revoke & Reject
                    </button>
                    {canReimburse && (
                      <button
                        onClick={() => handleAction("REIMBURSED")}
                        disabled={updating}
                        className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Issue Payout & Log to Ledger</span>
                      </button>
                    )}
                  </>
                )}

                {/* 3. When REIMBURSED: Complete */}
                {status === "REIMBURSED" && (
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Disbursement Fully Settled</span>
                  </span>
                )}

                {/* 4. When REJECTED */}
                {status === "REJECTED" && (
                  <button
                    onClick={() => handleAction("APPROVED")}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl border border-teal-600 text-teal-700 bg-teal-50 text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    Reopen & Approve
                  </button>
                )}
              </>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                Read-Only: Adjudication restricted to Treasury officers
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
