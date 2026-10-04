import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { claimApi, financeApi } from "../../api";
import {
  FileSpreadsheet,
  DollarSign,
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

function getSamplePngFile() {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return new File([bytes], "sample_receipt.png", { type: "image/png" });
}

export default function NewClaim() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    purpose: "",
    amount: "",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80",
    receiptFileName: "sample-receipt.jpg",
    notes: "",
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    financeApi
      .getCategories()
      .then((data) => {
        const expenseCats = (data || []).filter((c) => c.type === "EXPENSE");
        const list = expenseCats.length > 0 ? expenseCats : data || [];
        setCategories(list);
        if (list.length > 0) {
          setSelectedCategoryId(list[0].id);
        }
      })
      .catch((err) => console.warn("Failed to load budget categories:", err));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        receiptUrl: uploadEvent.target.result,
        receiptFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const receiptToSend = selectedFile || getSamplePngFile();
      await claimApi.submitClaim({
        title: formData.purpose,
        description: formData.notes || formData.purpose,
        amount: parseFloat(formData.amount),
        category_id: selectedCategoryId || categories[0]?.id || "55555555-5555-5555-5555-555555555506",
        receipt: receiptToSend,
      });
      navigate("/app/claims");
    } catch (err) {
      alert("Failed to submit claim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "My Claims", to: "/app/claims" },
          { label: "New Expense Claim" },
        ]}
      />

      <PageHeader
        title="Submit Reimbursement Claim"
        description="Attach itemized invoices or store receipts for out-of-pocket expenses incurred on official student org duties."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <span>
            The Organization Treasurer reviews claims every Friday. Approved amounts are reimbursed via campus direct deposit and recorded into the public ledger.
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Expense Purpose / Description
          </label>
          <input
            type="text"
            required
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="e.g. Bottled water and snacks for HackEDVEXA volunteer booth"
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 font-medium"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.description ? `(${c.description})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Amount Incurred ($ USD)
            </label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.50"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="45.50"
                className="w-full pl-7 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 font-medium"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Receipt Image or Invoice Proof
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-border transition-colors">
                <UploadCloud className="w-4 h-4 text-teal-600" />
                <span>Upload Receipt Photo or PDF</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80",
                    receiptFileName: "sample-receipt.jpg",
                  }))
                }
                className="text-xs text-teal-600 hover:underline font-medium"
              >
                Use Sample Proof
              </button>
            </div>

            <input
              type="text"
              required
              value={formData.receiptUrl}
              onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value, receiptFileName: "URL Link" })}
              placeholder="Or paste an image URL (https://...)"
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 font-mono text-slate-600"
            />

            {formData.receiptUrl && (
              <div className="p-3 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {formData.receiptUrl.startsWith("data:image") || formData.receiptUrl.startsWith("http") ? (
                    <img
                      src={formData.receiptUrl}
                      alt="Receipt Thumbnail"
                      className="w-10 h-10 object-cover rounded-lg border border-border bg-white"
                    />
                  ) : (
                    <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-800">
                      {formData.receiptFileName || "Attached Receipt Proof"}
                    </div>
                    <div className="text-[11px] text-teal-700 font-medium">Ready for Treasurer Audit</div>
                  </div>
                </div>
                <a
                  href={formData.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline font-semibold text-xs"
                >
                  View Full
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Additional Notes for Treasurer (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Include any relevant context, store name, or event committee approval."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/claims"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? "Submitting..." : "Submit Claim for Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
