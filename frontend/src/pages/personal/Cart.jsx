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
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const { membership } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);

  const isMember = !!membership && membership.status === "ACTIVE";

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setCheckingOut(true);

    try {
      // Backend creates unified order with temporary reservation for inventory
      const order = await orderApi.createOrder({
        items: cartItems.map((item) => ({
          name: item.name,
          title: item.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant,
        })),
        type: "MERCHANDISE",
      });

      // Clear the local shopping cart and navigate to shared checkout
      clearCart();
      navigate(`/app/checkout/${order.id}`);
    } catch (err) {
      alert("Failed to initialize checkout: " + err.message);
      setCheckingOut(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Merchandise Shopping Cart" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse official hoodies, water bottles, and sticker packs to add items to your cart."
          actionLabel="Browse Merch Shop"
          actionLink="/app/shop"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchandise Shopping Cart"
        description="Review your items before proceeding to authoritative backend checkout and pickup reservation."
      />

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs divide-y divide-border">
            {cartItems.map((item) => (
              <div
                key={item.key}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-border bg-slate-100"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Variant: {item.variant?.size} • {item.variant?.color}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-teal-700">
                        ${item.price.toFixed(2)}
                      </span>
                      {isMember && item.originalPrice > item.price && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="flex items-center border border-border rounded-lg bg-slate-50">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      className="w-8 h-7 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-l-lg text-xs font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      className="w-8 h-7 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-r-lg text-xs font-bold"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-sm text-foreground w-16 text-right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.key)}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/app/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Link>

            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Order Summary & Checkout Card */}
        <div className="lg:col-span-4">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-5 sticky top-24">
            <h3 className="text-base font-bold text-foreground">Order Summary</h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Campus Pickup Handling</span>
                <span className="text-emerald-600 font-medium">FREE</span>
              </div>
              {isMember && (
                <div className="flex items-center justify-between text-teal-700 font-medium">
                  <span>Membership 20% Discount</span>
                  <span>Included</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold text-foreground pt-3 border-t border-border">
                <span>Total Due</span>
                <span className="text-lg text-teal-700">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-border text-[11px] text-slate-600 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                Pick up merchandise at Student Organization Desk (Room 204). Show your order confirmation QR upon arrival.
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <span>{checkingOut ? "Creating Reservation..." : "Proceed to Checkout"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
