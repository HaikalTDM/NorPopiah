"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Package,
  ChefHat,
  Scale,
  BarChart3,
  Download,
  Upload,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsTab } from "./tabs/materials-tab";
import { RecipesTab } from "./tabs/recipes-tab";
import { BatchScalerTab } from "./tabs/batch-scaler-tab";
import { InsightsTab } from "./tabs/insights-tab";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { exportDatabase, importDatabase } from "@/lib/backup";
import { UserGuide, isOnboardingComplete } from "./user-guide";

const TABS = [
  { id: "materials", label: "Materials", icon: Package },
  { id: "recipes", label: "Recipes", icon: ChefHat },
  { id: "scaler", label: "Batch Scaler", icon: Scale },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

const INSTALL_TOAST_DELAY = 2500;
const INSTALL_TOAST_ID = "pwa-install-prompt";

function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState("materials");
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const shownToastRef = useRef(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Auto-open guide for first-time users
  useEffect(() => {
    if (!isOnboardingComplete()) {
      const timer = setTimeout(() => setGuideOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleInstallClick = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    deferredPromptRef.current = null;
    toast.dismiss(INSTALL_TOAST_ID);
    if (result.outcome === "accepted") {
      toast.success("App installed! Launch from your home screen.");
    }
  }, []);

  const handleInstallLater = useCallback(() => {
    toast.dismiss(INSTALL_TOAST_ID);
  }, []);

  const showInstallToast = useCallback(() => {
    if (shownToastRef.current) return;
    if (!deferredPromptRef.current) return;
    if (isPwaInstalled()) return;
    shownToastRef.current = true;

    toast.custom(
      () => (
        <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
          <p className="text-sm font-semibold text-foreground">Install App</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Install Modal &amp; Recipe Cost Manager for faster access and full
            offline support.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 active:scale-[0.98]"
            >
              Install
            </button>
            <button
              onClick={handleInstallLater}
              className="flex-1 rounded-lg bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 active:scale-[0.98]"
            >
              Later
            </button>
          </div>
        </div>
      ),
      {
        id: INSTALL_TOAST_ID,
        duration: Infinity,
        position: "bottom-center",
        style: { background: "transparent", border: "none", boxShadow: "none" },
      },
    );
  }, [handleInstallClick, handleInstallLater]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setTimeout(() => showInstallToast(), INSTALL_TOAST_DELAY);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      toast.dismiss(INSTALL_TOAST_ID);
    };
  }, [showInstallToast]);

  const handleExport = async () => {
    try {
      await exportDatabase();
      toast.success("Backup downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const result = await importDatabase(file);
      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "card",
          style: { color: "var(--foreground)" },
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🥮</span>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              NorPopiah
            </h1>
            <span className="hidden text-xs text-muted-foreground md:inline">
              Modal &amp; Recipe Cost Manager
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="size-4 sm:size-5" />
              ) : (
                <Moon className="size-4 sm:size-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setGuideOpen(true)}
              title="User Guide"
            >
              <BookOpen className="size-4 sm:size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              title="Export backup"
            >
              <Download className="size-4 sm:size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleImport}
              title="Import backup"
            >
              <Upload className="size-4 sm:size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
      >
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center justify-center gap-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground sm:text-sm"
            >
              <tab.icon className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 pb-20 sm:mt-6">
          <TabsContent value="materials">
            <MaterialsTab />
          </TabsContent>
          <TabsContent value="recipes">
            <RecipesTab />
          </TabsContent>
          <TabsContent value="scaler">
            <BatchScalerTab />
          </TabsContent>
          <TabsContent value="insights">
            <InsightsTab />
          </TabsContent>
        </div>
      </Tabs>

      <UserGuide open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
