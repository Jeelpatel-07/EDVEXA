import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function ReservationTimer({
  initialSeconds = 900, // 15 minutes default
  onExpire,
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSeconds = secondsLeft % 60;
  const isExpiringSoon = secondsLeft < 180; // Less than 3 minutes

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        isExpiringSoon
          ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        Temporary Reservation:{" "}
        <strong className="font-mono text-sm">
          {String(minutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
        </strong>
      </span>
    </div>
  );
}
