import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground mb-4">
      <Link
        to="/app/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.label + index} className="flex items-center space-x-1.5">
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast || !item.to ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link
                to={item.to}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
