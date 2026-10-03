import { Loader2 } from "lucide-react";

export default function LoadingState({
  message = "Loading platform data...",
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl bg-card border border-border ${className}`}
    >
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Communicating with EDVEXA backend
      </p>
    </div>
  );
}
