import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { shopApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Tag,
  PackageCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import ImageWithFallback from "../../components/common/ImageWithFallback";

export default function Shop() {
  const { membership } = useAuth();
  const { cartCount } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState("FEATURED");

  useEffect(() => {
    shopApi
      .getProducts()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const isMember = !!membership && membership.status === "ACTIVE";

  // Dynamic category tabs derived from actual product data
  const availableCategories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ["ALL", ...Array.from(cats).sort()];
  }, [products]);

  // Filter and sort products
  const filteredAndSorted = useMemo(() => {
    let result = products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
      const matchesCat =
        selectedCategory === "ALL" ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCat;
    });

    // Sorting
    result.sort((a, b) => {
      const priceA = isMember ? (a.memberPrice ?? a.price) : a.price;
      const priceB = isMember ? (b.memberPrice ?? b.price) : b.price;

      if (sortBy === "PRICE_ASC") return priceA - priceB;
      if (sortBy === "PRICE_DESC") return priceB - priceA;
      if (sortBy === "NAME_ASC") return (a.name || "").localeCompare(b.name || "");
      // Default: FEATURED / Popular
      return 0;
    });

    return result;
  }, [products, search, selectedCategory, sortBy, isMember]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchandise"
        description="Campus merchandise from EDVEXA organizations and clubs."
        action={
          <Link
            to="/app/cart"
            id="view-cart-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cart ({cartCount})</span>
          </Link>
        }
      />

      {/* Member discount reminder banner */}
      {isMember ? (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-teal-900 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>
              <strong>Active Member Privilege:</strong> You unlock discounted member pricing on all official campus merchandise automatically.
            </span>
          </div>
          <span className="self-start sm:self-auto font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-md border border-teal-200">
            Member Discount Active
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Save up to <strong>₹300</strong> per item by joining an active EDVEXA student membership plan.
            </span>
          </div>
          <Link
            to="/app/membership/plans"
            className="font-bold underline text-amber-950 hover:text-amber-800 shrink-0"
          >
            Explore Plans →
          </Link>
        </div>
      )}

      {/* Search, Categories, and Sorting Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="merchandise-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, description, or category..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-border rounded-xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Sort:</span>
            <select
              id="merchandise-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-slate-50 border border-border rounded-lg px-2.5 py-1.5 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
            >
              <option value="FEATURED">Featured & Popular</option>
              <option value="PRICE_ASC">Price: Low → High</option>
              <option value="PRICE_DESC">Price: High → Low</option>
              <option value="NAME_ASC">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-border/60">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              id={`cat-filter-${cat.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {cat === "ALL" ? "All Products" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Content */}
      {loading ? (
        <LoadingState message="Loading campus merchandise catalog..." />
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No merchandise found."
          description="Try changing your search keywords or selecting a different category filter."
          actionLabel="Clear Filters"
          actionLink="#"
          onAction={() => {
            setSearch("");
            setSelectedCategory("ALL");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredAndSorted.map((product) => {
            const regularPrice = Number(product.price || product.basePrice || 0);
            const memberPrice = Number(product.memberPrice || product.member_price || regularPrice);
            const price = isMember ? memberPrice : regularPrice;
            const savings = Math.max(0, regularPrice - memberPrice);

            // Compute total variant inventory
            const totalStock = (product.variants || []).reduce(
              (sum, v) => sum + (v.stock || v.stock_quantity || 0),
              0
            );
            const isSoldOut = totalStock === 0 && (product.variants?.length || 0) > 0;
            const isLowStock = totalStock > 0 && totalStock <= 5;
            const variantCount = product.variants?.length || 0;

            return (
              <div
                key={product.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-2xs hover:border-teal-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                {/* 1:1 Aspect Ratio Image Container with Fallback */}
                <div className="relative">
                  <ImageWithFallback
                    src={product.image || product.imageUrl || product.image_url}
                    alt={product.name}
                    category={product.category}
                    containerClassName="relative w-full aspect-square overflow-hidden bg-slate-100"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Category Pill Tag */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-white/95 backdrop-blur-xs text-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs border border-slate-200/60">
                      {product.category || "Merch"}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {isSoldOut ? (
                      <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                        Sold Out
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Only {totalStock} left
                      </span>
                    ) : (
                      <span className="bg-emerald-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                        In Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 tracking-wide uppercase block">
                      EDVEXA Campus Store
                    </span>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-teal-700 transition-colors line-clamp-1 mt-0.5">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Variant indicator */}
                    {variantCount > 0 && (
                      <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                        <span>
                          {variantCount} variant{variantCount > 1 ? "s" : ""} (
                          {product.variants.slice(0, 3).map((v) => v.size).join(", ")}
                          {variantCount > 3 ? "..." : ""})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-teal-700">
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                        {isMember && savings > 0 && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{regularPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        {isMember ? "Member Rate Applied" : "Standard Price"}
                      </span>
                    </div>

                    <Link
                      to={`/app/shop/products/${product.id}`}
                      id={`view-product-${product.id}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs ${
                        isSoldOut
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-teal-600 text-white hover:bg-teal-700"
                      }`}
                    >
                      <span>{isSoldOut ? "Sold Out" : "View"}</span>
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
