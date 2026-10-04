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
  AlertCircle,
  Tag,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import ImageWithFallback from "../../components/common/ImageWithFallback";

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
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    shopApi
      .getProductById(productId)
      .then((data) => {
        setProduct(data);
        // Default to first in-stock variant if available
        if (data?.variants && data.variants.length > 0) {
          const firstInStock = data.variants.find((v) => (v.stock || v.stock_quantity) > 0);
          setSelectedVariantId(firstInStock ? firstInStock.id : data.variants[0].id);
        }
      })
      .catch((err) => setError(err.message || "Failed to load product details."))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <LoadingState message="Loading merchandise details..." />;

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-4">
        <ErrorState
          title="Product Not Found"
          message="Could not locate this product in the campus merchandise inventory."
        />
        <div className="text-center">
          <Link
            to="/app/shop"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Merchandise</span>
          </Link>
        </div>
      </div>
    );
  }

  const isMember = !!membership && membership.status === "ACTIVE";
  const regularPrice = Number(product.price || product.basePrice || 0);
  const memberPrice = Number(product.memberPrice || product.member_price || regularPrice);
  const effectivePrice = isMember ? memberPrice : regularPrice;
  const savings = Math.max(0, regularPrice - memberPrice);

  const hasVariants = product.variants && product.variants.length > 0;
  const selectedVariant = hasVariants
    ? product.variants.find((v) => v.id === selectedVariantId)
    : null;

  const currentStock = selectedVariant
    ? (selectedVariant.stock ?? selectedVariant.stock_quantity ?? 0)
    : 99;

  const isSoldOut = hasVariants && currentStock <= 0;

  const handleAddToCart = () => {
    setValidationError("");
    if (hasVariants && !selectedVariantId) {
      setValidationError("Please select a size and color before adding this item to cart.");
      return;
    }

    if (isSoldOut) {
      setValidationError("This variant is currently out of stock. Please select another variant.");
      return;
    }

    const variantToUse = selectedVariant || {
      id: null,
      size: "Standard",
      color: "Standard",
      stock: 99,
    };

    addToCart(product, variantToUse, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (hasVariants && !selectedVariantId) return;
    if (isSoldOut) return;
    navigate("/app/cart");
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Merchandise", to: "/app/shop" },
          { label: product.name },
        ]}
      />

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="grid lg:grid-cols-12 gap-8 p-6 sm:p-10">
          {/* Left Column: Product Image */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl overflow-hidden border border-border bg-slate-100 sticky top-24">
              <ImageWithFallback
                src={product.image || product.imageUrl || product.image_url}
                alt={product.name}
                category={product.category}
                containerClassName="relative w-full aspect-square overflow-hidden bg-slate-100"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200 uppercase tracking-wide">
                    {product.category || "Merchandise"}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    • EDVEXA Official Store
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {product.name}
                </h1>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl font-black text-teal-700">
                    ₹{effectivePrice.toLocaleString("en-IN")}
                  </span>
                  {isMember && savings > 0 && (
                    <span className="text-sm text-slate-400 line-through">
                      ₹{regularPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  {isMember ? (
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                      Member Savings: ₹{savings.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Standard Campus Price
                    </span>
                  )}
                </div>
                {!isMember && (
                  <p className="text-[11px] text-muted-foreground">
                    Active student organization members pay only ₹{memberPrice.toLocaleString("en-IN")} for this item.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Product Description
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Variant Selector */}
              {hasVariants && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Variant (Size & Color)
                    </label>
                    {selectedVariant && (
                      <span className={`text-[11px] font-semibold ${
                        currentStock <= 0
                          ? "text-rose-600 font-bold"
                          : currentStock <= 5
                          ? "text-amber-600 font-bold"
                          : "text-emerald-700"
                      }`}>
                        {currentStock <= 0
                          ? "Sold Out"
                          : currentStock <= 5
                          ? `Low Stock: Only ${currentStock} left!`
                          : `In Stock (${currentStock} units)`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariantId === v.id;
                      const vStock = v.stock ?? v.stock_quantity ?? 0;
                      const isOutOfStock = vStock <= 0;

                      return (
                        <button
                          key={v.id}
                          id={`variant-btn-${v.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            setValidationError("");
                            if (quantity > vStock && vStock > 0) {
                              setQuantity(vStock);
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs text-left transition-all relative ${
                            isSelected
                              ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-600 font-bold shadow-2xs"
                              : isOutOfStock
                              ? "border-slate-200 bg-slate-50 text-slate-400 opacity-60"
                              : "border-border hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>{v.size}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {v.color}
                            </span>
                          </div>
                          <div className="text-[10px] mt-1">
                            {isOutOfStock ? (
                              <span className="text-rose-600 font-medium">Sold Out</span>
                            ) : vStock <= 5 ? (
                              <span className="text-amber-600 font-semibold">{vStock} left</span>
                            ) : (
                              <span className="text-muted-foreground">{vStock} in stock</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Validation Warning Alert */}
              {validationError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="pt-2 border-t border-border flex items-center gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Quantity
                  </label>
                  <div className="flex items-center border border-border rounded-xl bg-slate-50 w-32 shadow-2xs">
                    <button
                      type="button"
                      id="qty-decrement"
                      disabled={isSoldOut || quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-9 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-l-xl font-bold disabled:opacity-40 transition-colors"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-bold text-sm text-foreground">
                      {quantity}
                    </div>
                    <button
                      type="button"
                      id="qty-increment"
                      disabled={isSoldOut || quantity >= currentStock}
                      onClick={() =>
                        setQuantity((q) => Math.min(currentStock || 1, q + 1))
                      }
                      className="w-10 h-9 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-r-xl font-bold disabled:opacity-40 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-4">
                  <span>Subtotal: </span>
                  <strong className="text-foreground text-sm">
                    ₹{(effectivePrice * quantity).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* Campus Pickup Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-border flex items-start gap-2.5 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Official Campus Pickup:</strong> Orders are prepared by student staff and collected at the Student Organization Desk (Room 204). A digital verification slip and QR code are issued upon payment.
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                id="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{isSoldOut ? "Out of Stock" : "Add to Cart"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="buy-now-btn"
                onClick={handleBuyNow}
                disabled={isSoldOut}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Buy Now</span>
              </button>

              <Link
                to="/app/cart"
                id="go-to-cart-btn"
                className="w-full sm:w-auto py-3 px-5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-slate-50 transition-colors text-center"
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
