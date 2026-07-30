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
  ArrowRight,
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
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
                <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>Before creating recipes, add every ingredient you purchase.</p>
          <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3 space-y-1.5 text-xs">
            <p className="font-medium text-slate-200">For each material:</p>
            <ul className="space-y-0.5 text-slate-400">
              <li>• Ingredient name</li>
              <li>• Purchase quantity &amp; unit (kg, g, L, mL, pcs)</li>
              <li>• Purchase price (RM)</li>
              <li>• Supplier <span className="text-slate-500">(optional)</span></li>
            </ul>
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
            <p className="text-xs text-emerald-400 font-medium mb-1">Example</p>
            <p className="text-xs text-slate-300">
              <span className="font-medium text-slate-200">25 kg</span> Flour
              &nbsp;→&nbsp;
              <span className="font-medium text-slate-200">RM 75</span>
            </p>
            <p className="text-xs text-emerald-300 mt-1">
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>Create a recipe by entering:</p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Recipe name &amp; batch yield</li>
            <li>• Ingredients and quantities used</li>
            <li>• Packaging cost per batch</li>
            <li>• Labour &amp; utility buffer</li>
            <li>• Target profit margin %</li>
          </ul>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
            <p className="text-xs text-emerald-400 font-medium mb-1">
              Auto-calculated:
            </p>
            <ul className="space-y-0.5 text-xs text-slate-300">
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            Need to produce more than your standard batch? Use the&nbsp;
            <span className="text-slate-200 font-medium">Batch Scaler</span>.
          </p>
          <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3">
            <p className="text-xs text-slate-400 mb-2">Example</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Original recipe</p>
                <p className="text-slate-200 font-medium text-lg">20</p>
                <p className="text-slate-400">brownies</p>
              </div>
              <div>
                <p className="text-slate-500">Customer order</p>
                <p className="text-emerald-400 font-medium text-lg">75</p>
                <p className="text-slate-400">brownies</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            Visit the <span className="text-slate-200 font-medium">Insights</span> tab to
            compare recipes and spot trends:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            {[
              "Highest profit margin recipes",
              "Lowest margin items (raise prices?)",
              "Most expensive ingredients per batch",
              "Overall profitability snapshot",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-emerald-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            All your recipes, ingredients, and calculations are stored locally
            on your device. No cloud required.
          </p>
          <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3 space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">📥</span>
              <div>
                <p className="font-medium text-slate-200">Export backup</p>
                <p className="text-slate-400">
                  Tap the Download icon in the header to save your data.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">📤</span>
              <div>
                <p className="font-medium text-slate-200">Import backup</p>
                <p className="text-slate-400">
                  Restore your data or move to another device.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
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
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p className="text-slate-200 font-medium">
            Recommended workflow:
          </p>
          <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside marker:text-emerald-400">
            <li>Add your ingredients in <span className="text-slate-300">Materials</span></li>
            <li>Create your recipes in <span className="text-slate-300">Recipes</span></li>
            <li>Check cost-per-piece &amp; adjust pricing</li>
            <li>Scale up when customers place larger orders</li>
            <li>Review <span className="text-slate-300">Insights</span> regularly to maximize profitability</li>
          </ol>
          <p className="text-xs text-emerald-400 font-medium">
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

  // Reset page when dialog opens
  useEffect(() => {
    if (open) setCurrentPage(0);
  }, [open]);

  // Animate page transition
  useEffect(() => {
    if (pageRef.current) {
      pageRef.current.classList.remove("guide-page-enter");
      void pageRef.current.offsetWidth; // force reflow
      pageRef.current.classList.add("guide-page-enter");
    }
  }, [currentPage]);

  const page = pages[currentPage];
  const PageIcon = page.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md border-white/10 p-0 gap-0 sm:max-w-md"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          User Guide — {page.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {page.description}
        </DialogDescription>

        {/* Content */}
        <div className="flex flex-col" style={{ minHeight: 420 }}>
          {/* Page body */}
          <div className="flex-1 px-6 pt-6 pb-4">
            {/* Icon */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                {page.emoji ? (
                  <span className="text-xl">{page.emoji}</span>
                ) : (
                  <PageIcon className="size-5 text-emerald-400" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  {page.title}
                </h2>
                <p className="text-xs text-slate-500">{page.description}</p>
              </div>
            </div>

            {/* Page content with animation */}
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

          {/* Footer: progress + navigation */}
          <div className="border-t border-white/5 px-6 py-4">
            {/* Progress dots */}
            <div className="mb-3 flex items-center justify-center gap-1.5">
              {pages.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentPage
                      ? "w-5 bg-emerald-400"
                      : i < currentPage
                        ? "w-1.5 bg-emerald-500/40"
                        : "w-1.5 bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              {currentPage > 0 ? (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 active:scale-[0.98]"
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-400 active:scale-[0.98]"
                >
                  Skip
                </button>
              )}

              <span className="text-[10px] text-slate-600 tabular-nums">
                {currentPage + 1} / {totalPages}
              </span>

              {isLastPage ? (
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 active:scale-[0.98]"
                >
                  <Sparkles className="size-3.5" />
                  Start Using App
                </button>
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-1 rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 active:scale-[0.98]"
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
