import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, Users } from "lucide-react";

interface InsightBoxProps {
  insights: {
    type: "trend" | "activity" | "interaction";
    message: string;
    value?: string;
  }[];
}

export function InsightBox({ insights }: InsightBoxProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "trend":
        return TrendingUp;
      case "activity":
        return Activity;
      case "interaction":
        return Users;
      default:
        return Activity;
    }
  };

  return (
    <Card className="p-4 mb-6 bg-accent/10" data-testid="insight-box">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        인사이트
      </h3>
      <div className="space-y-2">
        {insights.map((insight, idx) => {
          const Icon = getIcon(insight.type);
          return (
            <div
              key={idx}
              className="flex items-start gap-2 text-sm"
              data-testid={`insight-item-${idx}`}
            >
              <Icon className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <span className="text-foreground">{insight.message}</span>
                {insight.value && (
                  <span className="ml-2 font-semibold text-primary">
                    {insight.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
