import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { shopApi } from "../../api";
import { Package, Plus, Trash2, ArrowLeft } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function NewProduct() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    category: "Apparel",
    description: "",
    price: 35.00,
    memberPrice: 28.00,
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    variants: [
      { id: "var_1", size: "M", color: "Teal Green", stock: 25 },
      { id: "var_2", size: "L", color: "Teal Green", stock: 20 },
    ],
  });
  const [loading, setLoading] = useState(false);

  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        { id: "var_" + Date.now(), size: "XL", color: "Teal Green", stock: 15 },
      ],
    });
  };

  const handleRemoveVariant = (idx) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await shopApi.createProduct(formData);
      navigate("/app/manage/products");
    } catch (err) {
      alert("Failed to create product: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Products", to: "/app/manage/products" },
          { label: "New Merchandise Item" },
        ]}
      />

      <PageHeader
        title="Add Campus Merchandise"
        description="List new apparel, water bottles, or club gear with stock variants."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Product Title
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. EDVEXA Embroidered Campus Crewneck"
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            >
              <option value="Apparel">Apparel</option>
              <option value="Accessories">Accessories</option>
              <option value="Merch">Merch</option>
              <option value="Hardware">Hardware</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Description
          </label>
          <textarea
            rows={3}
            required
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Fabric specs, wash guidelines, and college crest details."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Standard Retail Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-teal-800 block mb-1">
              Member Subsidized Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.memberPrice}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memberPrice: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3.5 py-2 text-xs bg-teal-50 border border-teal-200 rounded-xl font-bold text-teal-900"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Product Image URL
          </label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl font-mono text-slate-600"
          />
        </div>

        {/* Variants Definition */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stock Variants (Size, Color, Units)
            </h3>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </button>
          </div>

          {formData.variants.map((v, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 border border-border grid sm:grid-cols-4 gap-3 items-center text-xs"
            >
              <div>
                <label className="text-[10px] text-muted-foreground block">Size / Dimension</label>
                <input
                  type="text"
                  required
                  value={v.size}
                  onChange={(e) => {
                    const next = [...formData.variants];
                    next[idx].size = e.target.value;
                    setFormData({ ...formData, variants: next });
                  }}
                  className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block">Color</label>
                <input
                  type="text"
                  required
                  value={v.color}
                  onChange={(e) => {
                    const next = [...formData.variants];
                    next[idx].color = e.target.value;
                    setFormData({ ...formData, variants: next });
                  }}
                  className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block">Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={v.stock}
                  onChange={(e) => {
                    const next = [...formData.variants];
                    next[idx].stock = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, variants: next });
                  }}
                  className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end pt-3 sm:pt-0">
                {formData.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/manage/products"
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
            {loading ? "Adding..." : "Add Product to Store"}
          </button>
        </div>
      </form>
    </div>
  );
}
