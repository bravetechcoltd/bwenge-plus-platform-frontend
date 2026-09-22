"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, Shield, Building2, TrendingUp, UserPlus } from "lucide-react";

interface UserStatisticsCardsProps {
  statistics: {
    total_users: number;
    active_users: number;
    verified_users: number;
    institution_members: number;
    recent_signups: number;
    by_role: {
      SYSTEM_ADMIN: number;
      INSTITUTION_ADMIN: number;
      CONTENT_CREATOR: number;
      INSTRUCTOR: number;
      LEARNER: number;
    };
  };
  onCardClick?: (metric: string) => void;
}

export default function UserStatisticsCards({
  statistics,
  onCardClick,
}: UserStatisticsCardsProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  const cards = [
    {
      title: "Total Users",
      value: formatNumber(statistics.total_users),
      icon: Users,
      color: "bg-primary",
      metric: "total_users",
      description: "All users in the system",
    },
    {
      title: "Active Users",
      value: formatNumber(statistics.active_users),
      icon: CheckCircle,
      color: "bg-success/100",
      metric: "active_users",
      description: "Currently active users",
      percentage: ((statistics.active_users / statistics.total_users) * 100).toFixed(1),
    },
    {
      title: "Verified Users",
      value: formatNumber(statistics.verified_users),
      icon: CheckCircle,
      color: "bg-primary/100",
      metric: "verified_users",
      description: "Email verified users",
      percentage: ((statistics.verified_users / statistics.total_users) * 100).toFixed(1),
    },
    {
      title: "System Admins",
      value: formatNumber(statistics.by_role.SYSTEM_ADMIN),
      icon: Shield,
      color: "bg-destructive/100",
      metric: "system_admins",
      description: "System administrators",
    },
    {
      title: "Institution Members",
      value: formatNumber(statistics.institution_members),
      icon: Building2,
      color: "bg-warning",
      metric: "institution_members",
      description: "Users in institutions",
      percentage: ((statistics.institution_members / statistics.total_users) * 100).toFixed(1),
    },
    {
      title: "Recent Signups",
      value: formatNumber(statistics.recent_signups),
      icon: UserPlus,
      color: "bg-primary/100",
      metric: "recent_signups",
      description: "Last 30 days",
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onCardClick?.(card.metric)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-foreground">{card.value}</h3>
                  {card.percentage && (
                    <span className="text-sm text-success font-medium">
                      {card.percentage}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color} bg-opacity-10`}>
                <card.icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
            
            {/* Role breakdown for System Admins card */}
            {card.metric === "system_admins" && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Institution Admins:</span>
                    <span className="font-medium">
                      {formatNumber(statistics.by_role.INSTITUTION_ADMIN)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Content Creators:</span>
                    <span className="font-medium">
                      {formatNumber(statistics.by_role.CONTENT_CREATOR)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Instructors:</span>
                    <span className="font-medium">
                      {formatNumber(statistics.by_role.INSTRUCTOR)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Learners:</span>
                    <span className="font-medium">
                      {formatNumber(statistics.by_role.LEARNER)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}