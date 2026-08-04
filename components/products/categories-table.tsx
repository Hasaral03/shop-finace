"use client";

import { Pencil, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCategory } from "@/lib/actions/categories";
import type { Category } from "@/types/application";
import { CategoryForm } from "@/components/products/category-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CategoriesTable({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Tags}
        title="No categories yet"
        description="Create a category to make your product catalog easier to browse."
      />
    );
  }

  async function remove(category: Category) {
    const result = await deleteCategory(category.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Category deleted");
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {categories.map((category) => (
          <div key={category.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{category.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.description || "No description"}
                </p>
              </div>
              <Badge variant={category.is_active ? "secondary" : "outline"}>
                {category.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <CategoryForm
                category={category}
                trigger={<Button type="button" size="sm" variant="outline"><Pencil /> Edit</Button>}
              />
              <ConfirmDialog
                trigger={<Button type="button" size="icon-sm" variant="destructive" aria-label={`Delete ${category.name}`}><Trash2 /></Button>}
                title="Delete category?"
                description={`Delete ${category.name}. Products in it will become uncategorized.`}
                onConfirm={() => remove(category)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {category.description || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? "secondary" : "outline"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <CategoryForm
                      category={category}
                      trigger={<Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit ${category.name}`}><Pencil /></Button>}
                    />
                    <ConfirmDialog
                      trigger={<Button type="button" size="icon-sm" variant="ghost" aria-label={`Delete ${category.name}`}><Trash2 /></Button>}
                      title="Delete category?"
                      description={`Delete ${category.name}. Products in it will become uncategorized.`}
                      onConfirm={() => remove(category)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
