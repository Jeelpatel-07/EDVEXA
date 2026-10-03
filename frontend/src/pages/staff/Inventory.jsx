import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { shopApi } from "../../api";
import { Boxes, Plus, Minus, ArrowLeft, RefreshCw, Check } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    shopApi
      .getProducts()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  const handleStockDelta = async (productId, variantId, currentStock, delta) => {
    const nextStock = Math.max(0, currentStock + delta);
    setUpdatingId(variantId);

    try {
      await shopApi.updateStock(productId, variantId, nextStock);
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            variants: p.variants.map((v) =>
              v.id === variantId ? { ...v, stock: nextStock } : v
            ),
          };
        })
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Products", to: "/app/manage/products" },
          { label: "Inventory Matrix" },
        ]}
      />

      <PageHeader
        title="Stock & Inventory Control"
        description="Authoritative variant inventory. Online checkouts create reservations, and desk collection confirms pickup."
      />

      {loading ? (
        <LoadingState message="Fetching stock levels..." />
      ) : (
        <div className="space-y-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover border border-border"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      {product.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {product.category} • ${product.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block font-medium">
                    Total In Stock
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0} units
                  </span>
                </div>
              </div>

              {/* Variants Matrix */}
              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-border text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Variant Size</th>
                      <th className="p-3">Colorway</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3">Stock Status</th>
                      <th className="p-3 text-right">Quick Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.variants?.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-foreground">{v.size}</td>
                        <td className="p-3 text-slate-700">{v.color}</td>
                        <td className="p-3 font-mono font-bold text-foreground">
                          {v.stock}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.stock > 10
                                ? "bg-emerald-50 text-emerald-800"
                                : v.stock > 0
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-800"
                            }`}
                          >
                            {v.stock > 10
                              ? "Healthy"
                              : v.stock > 0
                              ? "Low Stock"
                              : "Out of Stock"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleStockDelta(product.id, v.id, v.stock, -1)
                              }
                              disabled={updatingId === v.id || v.stock <= 0}
                              className="w-7 h-7 rounded border border-border bg-card flex items-center justify-center text-foreground hover:bg-slate-100 disabled:opacity-40"
                              title="Decrease stock by 1"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleStockDelta(product.id, v.id, v.stock, 5)
                              }
                              disabled={updatingId === v.id}
                              className="px-2 h-7 rounded border border-border bg-card flex items-center justify-center text-foreground hover:bg-slate-100 text-[11px] font-bold"
                              title="Restock +5"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleStockDelta(product.id, v.id, v.stock, 10)
                              }
                              disabled={updatingId === v.id}
                              className="px-2 h-7 rounded border border-teal-200 bg-teal-50 text-teal-800 flex items-center justify-center hover:bg-teal-100 text-[11px] font-bold"
                              title="Restock +10"
                            >
                              +10
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
