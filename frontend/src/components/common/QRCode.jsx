import { useMemo } from "react";

// Deterministic matrix generator for ticket QR codes
export default function QRCode({
  value = "EDVEXA-TICKET-SAMPLE",
  size = 180,
  className = "",
}) {
  const matrix = useMemo(() => {
    // Generate a 21x21 QR-like matrix deterministically from string hash
    const size = 21;
    const grid = Array.from({ length: size }, () => Array(size).fill(false));

    // Simple pseudo-random hash generator based on string
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const prng = (seed) => {
      let s = Math.abs(seed);
      return () => {
        s = (s * 16807 + 12345) % 2147483647;
        return (s & 1) === 1;
      };
    };

    const nextBit = prng(hash);

    // Fill data grid
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = nextBit();
      }
    }

    // Helper to paint finder pattern
    const paintFinder = (startR, startC) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[startR + r][startC + c] = isOuter || isInner;
        }
      }
    };

    // Paint the 3 standard QR position markers (Top-Left, Top-Right, Bottom-Left)
    paintFinder(0, 0);
    paintFinder(0, 14);
    paintFinder(14, 0);

    return grid;
  }, [value]);

  const cellSize = size / 21;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((filled, c) => {
            if (!filled) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.3}
                height={cellSize + 0.3}
                fill="#0f172a"
              />
            );
          })
        )}
      </svg>
      <span className="mt-2 text-[10px] font-mono tracking-wider text-slate-500 uppercase truncate max-w-[170px]">
        {value}
      </span>
    </div>
  );
}
