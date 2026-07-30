"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Search, ClipboardList } from "lucide-react";
import { db, type Ingredient } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { parseShoppingNote, type ParsedItem } from "@/lib/note-parser";

const UNITS = ["kg", "g", "l", "ml", "pcs"] as const;

type MaterialForm = {
  name: string;
  unit: string;
  purchase_qty: string;
  purchase_price: string;
  supplier: string;
};

const emptyMaterialForm: MaterialForm = {
  name: "",
  unit: "kg",
  purchase_qty: "1",
  purchase_price: "",
  supplier: "",
};

export function MaterialsTab() {
  const ingredients = useLiveQuery(() =>
    db.ingredients.orderBy("name").toArray(),
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ ...emptyMaterialForm });

  // --- Import note state ---
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importSupplier, setImportSupplier] = useState("");
  const [importSkipped, setImportSkipped] = useState<string[]>([]);

  const handleParse = () => {
    const result = parseShoppingNote(importText);
    setImportSupplier(result.supplier);
    setParsedItems(result.items);
    setImportSkipped(result.skipped);
  };

  const handleImportAll = async () => {
    if (parsedItems.length === 0) return;
    const now = new Date().toISOString();
    for (const item of parsedItems) {
      await db.ingredients.add({
        name: item.name,
        unit: (UNITS.includes(item.unit as any) ? item.unit : "pcs") as Ingredient["unit"],
        purchase_qty: item.purchase_qty,
        purchase_price: item.purchase_price,
        supplier: importSupplier || "",
        updated_at: now,
      });
    }
    toast.success(`${parsedItems.length} ingredients imported`);
    setImportOpen(false);
    setImportText("");
    setParsedItems([]);
    setImportSupplier("");
    setImportSkipped([]);
  };

  const filtered = (ingredients ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyMaterialForm });
    setDialogOpen(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditing(ingredient);
    setForm({
      name: ingredient.name,
      unit: ingredient.unit,
      purchase_qty: String(ingredient.purchase_qty),
      purchase_price: String(ingredient.purchase_price),
      supplier: ingredient.supplier ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const data = {
      name: form.name,
      unit: form.unit as Ingredient["unit"],
      purchase_qty: parseFloat(form.purchase_qty) || 0,
      purchase_price: parseFloat(form.purchase_price) || 0,
      supplier: form.supplier,
      updated_at: new Date().toISOString(),
    };

    if (editing?.id) {
      await db.ingredients.update(editing.id, data);
      toast.success(`${form.name} updated`);
    } else {
      await db.ingredients.add(data);
      toast.success(`${form.name} added`);
    }

    setDialogOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    // Check if used in any recipe
    const used = await db.recipe_items.where("ingredient_id").equals(id).count();
    if (used > 0) {
      toast.error(`Cannot delete: ${name} is used in ${used} recipe(s)`);
      return;
    }
    await db.ingredients.delete(id);
    toast.success(`${name} deleted`);
  };

  const getCostPerUnit = (ingredient: Ingredient) => {
    if (!ingredient.purchase_qty) return 0;
    return ingredient.purchase_price / ingredient.purchase_qty;
  };

  const formatCurrency = (n: number) =>
    n.toLocaleString("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-muted dark:bg-input pl-9 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <Button onClick={openAdd} size="icon" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setImportOpen(true)}
          className="shrink-0"
          title="Import from note"
        >
          <ClipboardList className="size-4" />
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {ingredients?.length
                ? "No matching ingredients"
                : "No ingredients yet. Add your first one!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ingredient) => (
            <Card
              key={ingredient.id}
              className="border-border bg-card transition-colors hover:bg-muted dark:hover:bg-input"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {ingredient.name}
                    </p>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    >
                      {ingredient.unit}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {formatCurrency(ingredient.purchase_price)} /{" "}
                      {ingredient.purchase_qty} {ingredient.unit}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(getCostPerUnit(ingredient))}/{ingredient.unit}
                    </span>
                  </div>
                </div>
                <div className="ml-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(ingredient)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      ingredient.id && handleDelete(ingredient.id, ingredient.name)
                    }
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editing ? "Edit Ingredient" : "Add Ingredient"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground/85">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Tepung Gandum"
                className="border-border bg-muted dark:bg-input text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground/85">Unit</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) =>
                    setForm({ ...form, unit: v as Ingredient["unit"] })
                  }
                >
                  <SelectTrigger className="border-border bg-muted dark:bg-input text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground/85">Purchase Qty</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.purchase_qty}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    setForm({ ...form, purchase_qty: raw });
                  }}
                  className="border-border bg-muted dark:bg-input text-foreground"
                />
              </div>
            </div>
            <div>
              <Label className="text-foreground/85">Purchase Price (RM)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.purchase_price}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  setForm({ ...form, purchase_price: raw });
                }}
                className="border-border bg-muted dark:bg-input text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground/85">Supplier (optional)</Label>
              <Input
                value={form.supplier}
                onChange={(e) =>
                  setForm({ ...form, supplier: e.target.value })
                }
                placeholder="e.g. Pasar Borong Selayang"
                className="border-border bg-muted dark:bg-input text-foreground"
              />
            </div>
            <Button
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {editing ? "Update" : "Add"} Ingredient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Import Note Dialog === */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your shopping note. Lines like <code>Name 500g: 21.40</code> will be
              parsed automatically.
            </p>
            <Textarea
              placeholder={`Rosyam mart:\nCream cheese 500g: 21.4\nKulit popia kuning : 5.9 50 pcs\n...`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              className="border-border bg-muted dark:bg-input font-mono text-sm"
            />
            <Button
              onClick={handleParse}
              disabled={!importText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              Parse Note
            </Button>

            {parsedItems.length > 0 && (
              <>
                {importSupplier && (
                  <p className="text-sm text-muted-foreground">
                    Supplier: <span className="font-medium text-foreground">{importSupplier}</span>
                  </p>
                )}
                <div className="rounded-lg border border-border bg-muted dark:bg-input overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium text-right">Qty</th>
                        <th className="px-3 py-2 font-medium">Unit</th>
                        <th className="px-3 py-2 font-medium text-right">Price (RM)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2 text-foreground">{item.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.purchase_qty}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {item.purchase_price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importSkipped.length > 0 && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Skipped {importSkipped.length} line(s)</summary>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {importSkipped.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <Button
                  onClick={handleImportAll}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Import {parsedItems.length} Ingredient{parsedItems.length > 1 ? "s" : ""}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
