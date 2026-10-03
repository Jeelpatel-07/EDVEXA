import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { claimApi } from "../../api";
import {
  FileSpreadsheet,
  Calendar,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function ClaimDetail() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    claimApi
      .getClaimById(claimId)
      .then((data) => setClaim(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [claimId]);

  if (loading) return <LoadingState message="Loading claim information..." />;
  if (error || !claim) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          title="Claim Not Found"
          message="Could not find the requested reimbursement claim."
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "My Claims", to: "/app/claims" },
          { label: claim.claimNumber || claim.id },
        ]}
      />

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Reimbursement Claim
            </span>
            <h1 className="text-xl font-bold text-foreground font-mono mt-0.5">
              {claim.claimNumber || claim.id}
            </h1>
          </div>
          <StatusBadge status={claim.status} />
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-semibold">
              Requested Reimbursement
            </span>
            <span className="text-2xl font-black text-teal-700">
              ${claim.amount.toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-700 font-semibold block">
              {claim.category}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Claimant: {claim.claimantName}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider">
            Expense Purpose
          </h4>
          <p className="p-3.5 rounded-xl bg-slate-50 border border-border text-slate-700 leading-relaxed">
            {claim.purpose}
          </p>
        </div>

        {/* Attached Proof of Purchase */}
        {claim.receiptUrl && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Attached Proof of Purchase
            </h4>
            <div className="rounded-xl overflow-hidden border border-border bg-slate-100 max-h-72">
              <img
                src={claim.receiptUrl}
                alt="Receipt Proof"
                className="w-full h-full object-cover"
              />
            </div>
            <a
              href={claim.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline font-medium pt-1"
            >
              <span>Open Full Size Image</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Treasurer Review Notes */}
        {claim.treasurerNotes && (
          <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs space-y-1">
            <span className="font-bold text-teal-900 block">
              Treasurer Council Review Notes
            </span>
            <p className="text-teal-800 leading-relaxed">
              {claim.treasurerNotes}
            </p>
            {claim.reviewedBy && (
              <span className="text-[11px] text-teal-700 font-medium block pt-1">
                Reviewed by {claim.reviewedBy} on {new Date(claim.reviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
          <Link
            to="/app/claims"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Claims</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
