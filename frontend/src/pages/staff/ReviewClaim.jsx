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
  Send,
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

  useEffect(() => {
    claimApi
      .getClaimById(claimId)
      .then((data) => {
        setClaim(data);
        setNotes(data?.treasurerNotes || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [claimId]);

  const handleAction = async (newStatus) => {
    setUpdating(true);
    try {
      await claimApi.reviewClaim(claim.id, {
        status: newStatus,
        notes,
        approvedAmount: claim.amount,
      });

      alert(`Claim status updated to ${newStatus}. Finance ledger updated.`);
      navigate("/app/manage/claims");
    } catch (err) {
      alert("Failed to review claim: " + err.message);
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Claims Audit", to: "/app/manage/claims" },
          { label: `Review ${claim.claimNumber || claim.id}` },
        ]}
      />

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold block">
              Treasurer Claim Adjudication
            </span>
            <h1 className="text-xl font-bold text-foreground font-mono mt-0.5">
              {claim.claimNumber || claim.id}
            </h1>
          </div>
          <StatusBadge status={claim.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-border text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Volunteer Claimant</span>
            <span className="font-bold text-foreground">{claim.claimantName}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Category</span>
            <span className="font-semibold text-foreground">{claim.category}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Submitted On</span>
            <span className="font-medium text-foreground">
              {new Date(claim.submittedAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Claim Amount</span>
            <span className="text-base font-extrabold text-teal-700">
              ${claim.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Expense Purpose */}
        <div className="space-y-1.5 text-xs">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider">
            Stated Expense Purpose
          </h4>
          <p className="p-3.5 rounded-xl bg-slate-50 border border-border text-slate-700 leading-relaxed">
            {claim.purpose}
          </p>
        </div>

        {/* Attached Proof of Purchase */}
        {claim.receiptUrl && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Submitted Receipt Proof
            </h4>
            <div className="rounded-xl overflow-hidden border border-border bg-slate-100 max-h-72">
              <img
                src={claim.receiptUrl}
                alt="Receipt proof"
                className="w-full h-full object-cover"
              />
            </div>
            <a
              href={claim.receiptUrl}
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
            placeholder="Document reason for approval/rejection or reimbursement reference ID."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
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
            {canApprove ? (
              <>
                <button
                  onClick={() => handleAction("REJECTED")}
                  disabled={updating}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  Reject Claim
                </button>
                <button
                  onClick={() => handleAction("APPROVED")}
                  disabled={updating}
                  className="px-4 py-2 rounded-xl border border-teal-600 text-teal-700 bg-teal-50 text-xs font-bold hover:bg-teal-100 transition-colors"
                >
                  Approve Claim
                </button>
                {canReimburse && (
                  <button
                    onClick={() => handleAction("REIMBURSED")}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs flex items-center gap-1 transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Issue Payout & Log to Ledger</span>
                  </button>
                )}
              </>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                Read-Only: Adjudication permissions restricted to Org Admin & Treasurer
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
