"use client";

export function ReadinessGauge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: 48, md: 72, lg: 96 }[size];
  const stroke = { sm: 4, md: 6, lg: 8 }[size];
  const radius = (dims - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  let color = "text-red-500";
  if (score >= 80) color = "text-emerald-500";
  else if (score >= 60) color = "text-sky-500";
  else if (score >= 40) color = "text-amber-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dims} height={dims} className="-rotate-90">
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-200"
        />
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span
        className={`absolute font-semibold ${
          size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm"
        }`}
      >
        {score}%
      </span>
    </div>
  );
}
