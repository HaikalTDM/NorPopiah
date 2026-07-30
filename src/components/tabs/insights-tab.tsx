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
      <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
        <CardContent className="py-12 text-center text-slate-400">
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
        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-lg">
          <CardContent className="p-3 text-center">
            <TrendingUp className="mx-auto mb-1 size-4 text-emerald-400" />
            <p className="text-xs text-slate-400">Highest Margin</p>
            <p className="text-sm font-semibold text-emerald-400">
              {formatCurrency(highestMargin?.margin ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
          <CardContent className="p-3 text-center">
            <DollarSign className="mx-auto mb-1 size-4 text-slate-400" />
            <p className="text-xs text-slate-400">Avg Margin</p>
            <p className="text-sm font-semibold text-slate-200">
              {formatCurrency(avgMargin)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-lg">
          <CardContent className="p-3 text-center">
            <TrendingDown className="mx-auto mb-1 size-4 text-red-400" />
            <p className="text-xs text-slate-400">Lowest Margin</p>
            <p className="text-sm font-semibold text-red-400">
              {formatCurrency(lowestMargin?.margin ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Margin leaderboard */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
        <CardContent className="p-0">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-300">
              Margin Leaderboard
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {margins.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? "bg-amber-500/20 text-amber-400"
                        : idx === 1
                          ? "bg-slate-400/20 text-slate-400"
                          : idx === 2
                            ? "bg-orange-600/20 text-orange-400"
                            : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Cost: {formatCurrency(item.cost)} · Price:{" "}
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    item.margin > avgMargin
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-500/20 text-slate-400"
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
