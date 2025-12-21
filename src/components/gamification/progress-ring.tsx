"use client"

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  showPercentage?: boolean
  label?: string
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  showPercentage = true,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={size} width={size} className="transform -rotate-90">
        <circle 
          stroke="#e5e7eb" 
          fill="transparent" 
          strokeWidth={strokeWidth} 
          r={radius} 
          cx={size / 2} 
          cy={size / 2} 
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-300 ease-in-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {Math.round(progress)}%
          </span>
        )}
        {label && <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>}
      </div>
    </div>
  )
}