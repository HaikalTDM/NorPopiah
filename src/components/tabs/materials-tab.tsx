"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { toast } from "sonner";

const UNITS = ["kg", "g", "l", "ml", "pcs"] as const;

const emptyIngredient: Omit<Ingredient, "id" | "updated_at"> = {
  name: "",
  unit: "kg",
  purchase_qty: 1,
  purchase_price: 0,
  supplier: "",
};

export function MaterialsTab() {
  const ingredients = useLiveQuery(() =>
    db.ingredients.orderBy("name").toArray(),
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ ...emptyIngredient });

  const filtered = (ingredients ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyIngredient });
    setDialogOpen(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditing(ingredient);
    setForm({
      name: ingredient.name,
      unit: ingredient.unit,
      purchase_qty: ingredient.purchase_qty,
      purchase_price: ingredient.purchase_price,
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
      ...form,
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
            className="border-border bg-muted/30 dark:bg-white/5 pl-9 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <Button onClick={openAdd} size="icon" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card backdrop-blur-lg">
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
              className="border-border bg-card backdrop-blur-lg transition-colors hover:bg-muted/50 dark:hover:bg-white/[0.07]"
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
        <DialogContent className="border-border bg-card backdrop-blur-xl sm:max-w-md">
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
                className="border-border bg-muted/30 dark:bg-white/5 text-foreground"
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
                  <SelectTrigger className="border-border bg-muted/30 dark:bg-white/5 text-foreground">
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
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchase_qty}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchase_qty: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="border-border bg-muted/30 dark:bg-white/5 text-foreground"
                />
              </div>
            </div>
            <div>
              <Label className="text-foreground/85">Purchase Price (RM)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    purchase_price: parseFloat(e.target.value) || 0,
                  })
                }
                className="border-border bg-muted/30 dark:bg-white/5 text-foreground"
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
                className="border-border bg-muted/30 dark:bg-white/5 text-foreground"
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
    </div>
  );
}
