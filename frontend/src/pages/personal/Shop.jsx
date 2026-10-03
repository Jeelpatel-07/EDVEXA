import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { shopApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { ShoppingBag, ShoppingCart, Search, CheckCircle2, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";

export default function Shop() {
  const { membership } = useAuth();
  const { cartCount } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    shopApi
      .getProducts()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  const isMember = !!membership && membership.status === "ACTIVE";
  const categories = ["ALL", "Apparel", "Accessories", "Merch"];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "ALL" || p.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Campus Merchandise"
        description="Hoodies, bottles, and student gear. Order online and pick up at the Student Organization Desk (Room 204)."
        action={
          <Link
            to="/app/cart"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>View Cart ({cartCount})</span>
          </Link>
        }
      />

      {/* Member discount reminder */}
      {isMember ? (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs text-teal-900 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>
              Gold Member Discount Unlocked: You enjoy 20% off all merchandise items automatically.
            </span>
          </div>
          <span className="font-bold text-teal-800">20% Savings</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <span>Members save 20% on all hoodies and apparel items.</span>
          <Link to="/app/membership/plans" className="font-bold underline text-amber-950">
            Join Membership
          </Link>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                category === cat
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "ALL" ? "All Products" : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchandise..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading catalog..." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No merchandise found" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const price = isMember ? product.memberPrice : product.price;

            return (
              <div
                key={product.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/95 backdrop-blur-xs text-foreground text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs">
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-teal-700 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-teal-700">
                          ${price.toFixed(2)}
                        </span>
                        {isMember && (
                          <span className="text-xs text-slate-400 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        {isMember ? "Member Special Rate" : "Standard Price"}
                      </span>
                    </div>

                    <Link
                      to={`/app/shop/products/${product.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-2xs"
                    >
                      <span>Choose Options</span>
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
