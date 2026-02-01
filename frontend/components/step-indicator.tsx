"use client";

interface StepIndicatorProps {
  current: number;
  total: number;
  labels?: string[];
}

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Dot indicators */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < current ? "bg-neutral-900" : "bg-neutral-300"
            }`}
          />
        ))}
      </div>
      {/* Step label */}
      <p className="text-sm text-muted-foreground">
        Step {current}/{total}
        {labels && labels[current - 1] && ` - ${labels[current - 1]}`}
      </p>
    </div>
  );
}
