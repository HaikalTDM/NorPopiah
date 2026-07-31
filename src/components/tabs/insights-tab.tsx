"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { db } from "@/lib/db";
import { getAllRecipeMargins } from "@/lib/cost-calculator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  });

interface MarginRow {
  id: number;
  name: string;
  margin: number;
  price: number;
  cost: number;
}

export function InsightsTab() {
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const [margins, setMargins] = useState<MarginRow[]>([]);

  useEffect(() => {
    getAllRecipeMargins().then(setMargins);
  }, [recipes]);

  if (margins.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Add recipes to see margin insights.
        </CardContent>
      </Card>
    );
  }

  const highestMargin = margins[0];
  const lowestMargin = margins[margins.length - 1];
  const avgMargin =
    margins.reduce((s, m) => s + m.margin, 0) / margins.length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5">
          <CardContent className="p-3 text-center">
            <TrendingUp className="mx-auto mb-1 size-4 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-muted-foreground">Highest Margin</p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(highestMargin?.margin ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3 text-center">
            <DollarSign className="mx-auto mb-1 size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg Margin</p>
            <p className="text-sm font-semibold text-foreground/90">
              {formatCurrency(avgMargin)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5">
          <CardContent className="p-3 text-center">
            <TrendingDown className="mx-auto mb-1 size-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Lowest Margin</p>
            <p className="text-sm font-semibold text-red-500">
              {formatCurrency(lowestMargin?.margin ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Margin leaderboard */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-foreground/85">
              Margin Leaderboard
            </h3>
          </div>
          <div className="divide-y divide-border">
            {margins.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                        : idx === 1
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-400/20 dark:text-slate-400"
                          : idx === 2
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-600/20 dark:text-orange-400"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground/90">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Cost: {formatCurrency(item.cost)} · Price:{" "}
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    item.margin > avgMargin
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  +{formatCurrency(item.margin)}/pc
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
