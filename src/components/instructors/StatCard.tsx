"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  onClick?: () => void;
}

export function StatCard({
  icon,
  label,
  value,
  subtext,
  trend,
  color = "blue",
  onClick,
}: StatCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    red: "from-red-500 to-pink-500",
    purple: "from-purple-500 to-pink-500",
    amber: "from-amber-500 to-orange-500",
    indigo: "from-indigo-500 to-blue-500",
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-success" />,
    down: <TrendingDown className="h-4 w-4 text-destructive" />,
    neutral: <Minus className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <h3 className="text-3xl font-bold text-foreground">{value}</h3>
            {subtext && (
              <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
            )}
            
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trendIcons[trend]}
                <span className={cn(
                  "text-xs font-medium",
                  trend === 'up' ? 'text-success' :
                  trend === 'down' ? 'text-destructive' :
                  'text-muted-foreground'
                )}>
                  {trend === 'up' ? 'Increasing' : 
                   trend === 'down' ? 'Decreasing' : 'Stable'}
                </span>
              </div>
            )}
          </div>
          
          <div className={cn(
            "p-3 rounded-full bg-gradient-to-br",
            colorClasses[color as keyof typeof colorClasses] || colorClasses.blue
          )}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}