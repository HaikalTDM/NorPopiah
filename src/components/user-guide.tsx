"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  Package,
  ChefHat,
  Scale,
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ONBOARDING_KEY = "norpopia-onboarding-complete";

interface GuidePage {
  title: string;
  description: string;
  icon: React.ElementType;
  emoji?: string;
  content: React.ReactNode;
}

function getPages(): GuidePage[] {
  return [
    {
      title: "Welcome",
      description: "Your recipe cost calculator",
      icon: BookOpen,
      emoji: "🥮",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>
            Modal &amp; Recipe Cost Manager helps you run a more profitable
            food business — with confidence.
          </p>
          <ul className="space-y-2">
            {[
              "Calculate the true cost of every recipe",
              "Know exactly how much each item costs to produce",
              "Set profitable selling prices with built-in margin targets",
              "Scale recipes for larger orders — all ratios auto-calculated",
              "Everything works offline — your data stays on your device",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: "Step 1: Add Materials",
      description: "Ingredients you purchase",
      icon: Package,
      emoji: "📦",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>Before creating recipes, add every ingredient you purchase.</p>
          <div className="rounded-lg bg-muted dark:bg-slate-800/50 border border-border p-3 space-y-1.5 text-xs">
            <p className="font-medium text-foreground/90">For each material:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>• Ingredient name</li>
              <li>• Purchase quantity &amp; unit (kg, g, L, mL, pcs)</li>
              <li>• Purchase price (RM)</li>
              <li>• Supplier <span className="text-muted-foreground/50">(optional)</span></li>
            </ul>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-3">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              Example
            </p>
            <p className="text-xs text-foreground/85">
              <span className="font-medium text-foreground">25 kg</span> Flour
              &nbsp;→&nbsp;
              <span className="font-medium text-foreground">RM 75</span>
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">
              ↓ Cost per gram is calculated automatically
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Step 2: Build Recipes",
      description: "Combine ingredients into products",
      icon: ChefHat,
      emoji: "🧑‍🍳",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>Create a recipe by entering:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Recipe name &amp; batch yield</li>
            <li>• Ingredients and quantities used</li>
            <li>• Packaging cost per batch</li>
            <li>• Labour &amp; utility buffer</li>
            <li>• Target profit margin %</li>
          </ul>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-3">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              Auto-calculated:
            </p>
            <ul className="space-y-0.5 text-xs text-foreground/85">
              <li>• Ingredient cost breakdown</li>
              <li>• Total production cost</li>
              <li>• Cost per piece</li>
              <li>• Suggested selling price</li>
              <li>• Expected profit per piece</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Step 3: Scale Orders",
      description: "Handle larger batches easily",
      icon: Scale,
      emoji: "⚖️",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>
            Need to produce more than your standard batch? Use the&nbsp;
            <span className="text-foreground font-medium">Batch Scaler</span>.
          </p>
          <div className="rounded-lg bg-muted dark:bg-slate-800/50 border border-border p-3">
            <p className="text-xs text-muted-foreground mb-2">Example</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground/70">Original recipe</p>
                <p className="text-foreground font-medium text-lg">20</p>
                <p className="text-muted-foreground">brownies</p>
              </div>
              <div>
                <p className="text-muted-foreground/70">Customer order</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium text-lg">
                  75
                </p>
                <p className="text-muted-foreground">brownies</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Every ingredient quantity is recalculated automatically while
            maintaining the same ratio. No manual math needed.
          </p>
        </div>
      ),
    },
    {
      title: "Step 4: Understand Your Business",
      description: "Margins & profitability at a glance",
      icon: BarChart3,
      emoji: "📊",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>
            Visit the <span className="text-foreground font-medium">Insights</span> tab to
            compare recipes and spot trends:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {[
              "Highest profit margin recipes",
              "Lowest margin items (raise prices?)",
              "Most expensive ingredients per batch",
              "Overall profitability snapshot",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Use these insights to refine pricing and maximize profit over time.
          </p>
        </div>
      ),
    },
    {
      title: "Step 5: Protect Your Data",
      description: "Keep your recipes safe",
      icon: ShieldCheck,
      emoji: "🛡️",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>
            All your recipes, ingredients, and calculations are stored locally
            on your device. No cloud required.
          </p>
          <div className="rounded-lg bg-muted dark:bg-slate-800/50 border border-border p-3 space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">📥</span>
              <div>
                <p className="font-medium text-foreground/90">Export backup</p>
                <p className="text-muted-foreground">
                  Tap the Download icon in the header to save your data.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">📤</span>
              <div>
                <p className="font-medium text-foreground/90">Import backup</p>
                <p className="text-muted-foreground">
                  Restore your data or move to another device.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No internet connection is required — backup and import work
            entirely offline.
          </p>
        </div>
      ),
    },
    {
      title: "You're Ready!",
      description: "Start calculating today",
      icon: Sparkles,
      emoji: "🎉",
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p className="text-foreground font-medium">
            Recommended workflow:
          </p>
          <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside marker:text-emerald-600 dark:marker:text-emerald-400">
            <li>
              Add your ingredients in{" "}
              <span className="text-foreground/85">Materials</span>
            </li>
            <li>
              Create your recipes in{" "}
              <span className="text-foreground/85">Recipes</span>
            </li>
            <li>Check cost-per-piece &amp; adjust pricing</li>
            <li>Scale up when customers place larger orders</li>
            <li>
              Review <span className="text-foreground/85">Insights</span>{" "}
              regularly to maximize profitability
            </li>
          </ol>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Revisit this guide anytime by tapping the 📖 icon in the header.
          </p>
        </div>
      ),
    },
  ];
}

interface UserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = getPages();
  const totalPages = pages.length;
  const isLastPage = currentPage === totalPages - 1;
  const pageRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    },
    [totalPages],
  );

  const next = useCallback(() => goTo(currentPage + 1), [currentPage, goTo]);

  const prev = useCallback(() => goTo(currentPage - 1), [currentPage, goTo]);

  const handleFinish = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onOpenChange(false);
    setCurrentPage(0);
  }, [onOpenChange]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onOpenChange(false);
    setCurrentPage(0);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) setCurrentPage(0);
  }, [open]);

  useEffect(() => {
    if (pageRef.current) {
      pageRef.current.classList.remove("guide-page-enter");
      void pageRef.current.offsetWidth;
      pageRef.current.classList.add("guide-page-enter");
    }
  }, [currentPage]);

  const page = pages[currentPage];
  const PageIcon = page.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md border-border p-0 gap-0 sm:max-w-md bg-card">
        <DialogTitle className="sr-only">
          User Guide — {page.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {page.description}
        </DialogDescription>

        <div className="flex flex-col" style={{ minHeight: 420 }}>
          <div className="flex-1 px-6 pt-6 pb-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent ring-1 ring-emerald-500/20">
                {page.emoji ? (
                  <span className="text-xl">{page.emoji}</span>
                ) : (
                  <PageIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {page.title}
                </h2>
                <p className="text-xs text-muted-foreground/70">
                  {page.description}
                </p>
              </div>
            </div>

            <div
              ref={pageRef}
              className="transition-opacity duration-200 ease-out"
              style={{
                opacity: 0,
                animation: "guideFadeIn 250ms ease-out forwards",
              }}
            >
              {page.content}
            </div>
          </div>

          <div className="border-t border-border px-6 py-4">
            <div className="mb-3 flex items-center justify-center gap-1.5">
              {pages.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentPage
                      ? "w-5 bg-emerald-500"
                      : i < currentPage
                        ? "w-1.5 bg-emerald-500/40"
                        : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              {currentPage > 0 ? (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.98]"
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground/70 transition-colors hover:bg-muted hover:text-muted-foreground active:scale-[0.98]"
                >
                  Skip
                </button>
              )}

              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {currentPage + 1} / {totalPages}
              </span>

              {isLastPage ? (
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-1 rounded-lg bg-emerald-100 px-4 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 active:scale-[0.98] dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                >
                  <Sparkles className="size-3.5" />
                  Start Using App
                </button>
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-1 rounded-lg bg-muted px-4 py-2 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted active:scale-[0.98] dark:bg-input dark:hover:bg-input"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}
