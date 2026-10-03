import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { shopApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  ShoppingBag,
  ShoppingCart,
  CheckCircle2,
  Package,
  MapPin,
  ArrowLeft,
  Check,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { membership } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    shopApi
      .getProductById(productId)
      .then((data) => {
        setProduct(data);
        if (data?.variants?.length > 0) {
          setSelectedVariantId(data.variants[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <LoadingState message="Loading merchandise details..." />;
  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <ErrorState
          title="Product Not Found"
          message="Could not locate this product in the organization inventory."
        />
      </div>
    );
  }

  const isMember = !!membership && membership.status === "ACTIVE";
  const effectivePrice = isMember ? product.memberPrice : product.price;
  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addToCart(product, selectedVariant, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Shop", to: "/app/shop" },
          { label: product.name },
        ]}
      />

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="grid lg:grid-cols-12 gap-8 p-6 sm:p-10">
          {/* Product Image */}
          <div className="lg:col-span-6">
            <div className="rounded-xl overflow-hidden bg-slate-100 border border-border">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-80 sm:h-[420px] object-cover"
              />
            </div>
          </div>

          {/* Product Options */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                  {product.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-teal-700">
                  ${effectivePrice.toFixed(2)}
                </span>
                {isMember && (
                  <span className="text-sm text-slate-400 line-through">
                    ${product.price.toFixed(2)}
                  </span>
                )}
                {isMember && (
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    Member 20% Applied
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Variants Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Choose Variant (Size & Color)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariantId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                            isSelected
                              ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600 font-bold"
                              : "border-border hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="font-semibold text-foreground">
                            {v.size} • {v.color}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Stock: {v.stock} units
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Quantity
                </label>
                <div className="flex items-center border border-border rounded-lg bg-slate-50 w-32">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-9 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-l-lg font-bold"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center font-bold text-sm text-foreground">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(selectedVariant?.stock || 10, q + 1)
                      )
                    }
                    className="w-10 h-9 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-r-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Pickup Note */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-border flex items-start gap-2.5 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Campus Pickup:</strong> Orders are prepared by staff and collected at Student Organization Desk (Room 204). Pickup confirmation updates stock authoritative status.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock <= 0}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Merchandise Cart</span>
                  </>
                )}
              </button>

              <Link
                to="/app/cart"
                className="w-full sm:w-auto py-3 px-6 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-slate-50 transition-colors text-center"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
