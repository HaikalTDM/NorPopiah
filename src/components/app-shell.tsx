"use client";

import { useState, useEffect } from "react";
import {
  Package,
  ChefHat,
  Scale,
  BarChart3,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsTab } from "./tabs/materials-tab";
import { RecipesTab } from "./tabs/recipes-tab";
import { BatchScalerTab } from "./tabs/batch-scaler-tab";
import { InsightsTab } from "./tabs/insights-tab";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { exportDatabase, importDatabase } from "@/lib/backup";

const TABS = [
  { id: "materials", label: "Materials", icon: Package },
  { id: "recipes", label: "Recipes", icon: ChefHat },
  { id: "scaler", label: "Batch Scaler", icon: Scale },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState("materials");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") setIsInstallable(false);
    setDeferredPrompt(null);
  };

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
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.9)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            backdropFilter: "blur(12px)",
          },
        }}
      />

      {/* Header — responsive: mobile compact, tablet+ spacious */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🥮</span>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              NorPopiah
            </h1>
            <span className="hidden text-xs text-slate-500 md:inline">
              Modal &amp; Recipe Cost Manager
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isInstallable && (
              <Button variant="ghost" size="icon" onClick={handleInstall} title="Install app">
                <Download className="size-4 sm:size-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleExport} title="Export backup">
              <Download className="size-4 sm:size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleImport} title="Import backup">
              <Upload className="size-4 sm:size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs — responsive: mobile icons-only, tablet+ full labels */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 backdrop-blur-sm">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center justify-center gap-1.5 text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 sm:text-sm"
            >
              <tab.icon className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 pb-20 sm:mt-6">
          <TabsContent value="materials"><MaterialsTab /></TabsContent>
          <TabsContent value="recipes"><RecipesTab /></TabsContent>
          <TabsContent value="scaler"><BatchScalerTab /></TabsContent>
          <TabsContent value="insights"><InsightsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
