import { AppShell } from "@/components/app-shell";
import { QuickCalculator } from "@/components/quick-calculator";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <QuickCalculator />
      <div className="mt-4">
        <AppShell />
      </div>
    </div>
  );
}
