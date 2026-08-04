"use client";

import { useEffect, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createCategory, updateCategory } from "@/lib/actions/categories";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import type { Category } from "@/types/application";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface CategoryFormProps {
  category?: Category;
  trigger: ReactElement;
}

const defaults: CategoryInput = { name: "", description: "", is_active: true };
type CategoryFormValues = z.input<typeof categorySchema>;

export function CategoryForm({ category, trigger }: CategoryFormProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<CategoryFormValues, unknown, CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description ?? "",
          is_active: category.is_active,
        }
      : defaults,
  });
  const isActive = useWatch({ control: form.control, name: "is_active" }) ?? true;

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              name: category.name,
              description: category.description ?? "",
              is_active: category.is_active,
            }
          : defaults
      );
    }
  }, [category, form, open]);

  async function onSubmit(values: CategoryInput) {
    const result = category
      ? await updateCategory(category.id, values)
      : await createCategory(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(category ? "Category updated" : "Category created");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Organize products into clear, reusable groups.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor={`category-name-${category?.id ?? "new"}`}>Name</Label>
            <Input
              id={`category-name-${category?.id ?? "new"}`}
              autoFocus
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`category-description-${category?.id ?? "new"}`}>Description</Label>
            <Textarea
              id={`category-description-${category?.id ?? "new"}`}
              rows={3}
              {...form.register("description")}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor={`category-active-${category?.id ?? "new"}`}>Active</Label>
              <p className="mt-1 text-xs text-muted-foreground">Available when assigning products.</p>
            </div>
            <Switch
              id={`category-active-${category?.id ?? "new"}`}
              checked={isActive}
              onCheckedChange={(checked) => form.setValue("is_active", checked, { shouldDirty: true })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
