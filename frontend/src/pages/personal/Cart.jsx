import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { orderApi } from "../../api";
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Package,
  AlertCircle,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ImageWithFallback from "../../components/common/ImageWithFallback";

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const { membership } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isMember = !!membership && membership.status === "ACTIVE";

  // Calculate totals and member savings
  const regularTotal = cartItems.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0
  );
  const memberSavings = isMember ? Math.max(0, regularTotal - cartTotal) : 0;

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setErrorMessage("");
    setCheckingOut(true);

    try {
      // Backend creates unified order with temporary reservation for inventory
      const order = await orderApi.createOrder({
        items: cartItems.map((item) => ({
          name: item.name,
          title: item.name,
          price: item.price,
          quantity: item.quantity,
          variant_id: item.variant?.id || item.variantId || item.variant_id,
        })),
        order_type: "MERCH",
        type: "MERCH",
      });

      // Clear the local shopping cart and navigate to shared checkout
      clearCart();
      navigate(`/app/checkout/${order.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to initiate checkout.";
      setErrorMessage(msg);
      setCheckingOut(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Merchandise Shopping Cart" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty."
          description="Explore EDVEXA merchandise and find something you like."
          actionLabel="Browse Merchandise"
          actionLink="/app/shop"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchandise Shopping Cart"
        description="Review your items before proceeding to secure campus checkout and pickup reservation."
        action={
          <button
            onClick={clearCart}
            id="clear-cart-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-700 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs divide-y divide-border">
            {cartItems.map((item) => {
              const maxStock = item.variant?.stock ?? item.variant?.stock_quantity ?? 99;
              return (
                <div
                  key={item.key}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        containerClassName="relative w-full h-full bg-slate-100"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Variant: {item.variant?.size} • {item.variant?.color}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-teal-700">
                          ₹{item.price.toLocaleString("en-IN")}
                        </span>
                        {isMember && item.originalPrice > item.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{item.originalPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-border rounded-lg bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="w-8 h-7 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-l-lg text-xs font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= maxStock}
                        onClick={() =>
                          updateQuantity(item.key, Math.min(maxStock, item.quantity + 1))
                        }
                        className="w-8 h-7 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-r-lg text-xs font-bold disabled:opacity-40 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Line Item Total */}
                    <span className="font-bold text-sm text-foreground w-20 text-right">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>

                    {/* Delete Item */}
                    <button
                      onClick={() => removeFromCart(item.key)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/app/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary Checkout Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4 sticky top-24">
            <h3 className="font-bold text-sm text-foreground pb-3 border-b border-border">
              Order Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal ({cartItems.reduce((acc, it) => acc + it.quantity, 0)} items)</span>
                <span>₹{(regularTotal).toLocaleString("en-IN")}</span>
              </div>

              {isMember && memberSavings > 0 && (
                <div className="flex items-center justify-between text-teal-700 font-semibold">
                  <span>Member Privilege Savings</span>
                  <span>-₹{memberSavings.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Campus Pickup Fee</span>
                <span className="text-emerald-700 font-semibold">FREE</span>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-base font-extrabold text-foreground">
                <span>Total Due</span>
                <span className="text-lg text-teal-700">
                  ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="proceed-checkout-btn"
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <span>Reserving Stock & Initializing...</span>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Stock is temporarily reserved for 15 minutes upon checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Collect at Student Organization Desk (Room 204)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
