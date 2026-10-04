import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { shopApi } from "../../api";
import { Package, Plus, Boxes, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ImageWithFallback from "../../components/common/ImageWithFallback";

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopApi
      .getProducts()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchandise Catalog Management"
        description="Official apparel, kits, and accessories sold at the campus organization store."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/app/manage/inventory"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Boxes className="w-4 h-4 text-teal-600" />
              <span>Stock Matrix</span>
            </Link>
            <Link
              to="/app/manage/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Link>
          </div>
        }
      />

      {loading ? (
        <LoadingState message="Loading merchandise catalog..." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const totalStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;

            return (
              <div
                key={p.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <ImageWithFallback
                    src={p.image || p.imageUrl || p.image_url}
                    alt={p.name}
                    category={p.category}
                    containerClassName="relative w-full h-full bg-slate-100"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/95 backdrop-blur-xs text-foreground text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs">
                      {p.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded shadow-2xs ${
                        totalStock > 20
                          ? "bg-emerald-100 text-emerald-800"
                          : totalStock > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {totalStock} in stock
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-foreground">
                        ₹{Number(p.price || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-semibold text-teal-700">
                        (Member: ₹{Number(p.memberPrice || p.price || 0).toLocaleString("en-IN")})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {p.variants?.length || 0} variant options
                    </span>
                    <Link
                      to="/app/manage/inventory"
                      className="font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <span>Adjust Stock</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
