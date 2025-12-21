"use client";

import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: string;
  strokeWidth?: number;
}

export function ProgressCircle({
  percentage,
  size = 'md',
  showLabel = true,
  color = '#3b82f6', // blue-500
  strokeWidth = 8,
}: ProgressCircleProps) {
  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-xs', radius: 20 },
    md: { container: 'w-16 h-16', text: 'text-sm', radius: 30 },
    lg: { container: 'w-24 h-24', text: 'text-2xl', radius: 40 },
  };

  const { container, text, radius } = sizeClasses[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on percentage
  const getColor = (percent: number) => {
    if (percent >= 80) return '#10b981'; // green-500
    if (percent >= 50) return '#3b82f6'; // blue-500
    if (percent >= 30) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const strokeColor = getColor(percentage);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className={cn("transform -rotate-90", container)}
        viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius * 2 + strokeWidth}`}
      >
        {/* Background circle */}
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="#e5e7eb" // gray-200
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", text)} style={{ color: strokeColor }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}