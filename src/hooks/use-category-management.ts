import { useCallback } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { toast } from "sonner";
import {
  fetchInstitutionCategories,
  createInstitutionCategory,
  updateInstitutionCategory,
  deleteInstitutionCategory,
  toggleCategoryStatus,
  reorderInstitutionCategories,
  CategoryCreateData,
  CategoryUpdateData,
  CategoryReorderData,
} from "@/lib/features/institutions/institutionSlice";

export function useCategoryManagement(institutionId: string) {
  const dispatch = useAppDispatch();

  const loadCategories = useCallback(async (filters = {}) => {
    try {
      await dispatch(
        fetchInstitutionCategories({ institutionId, filters })
      ).unwrap();
    } catch (error: any) {
      toast.error(error || "Failed to load categories");
      throw error;
    }
  }, [dispatch, institutionId]);

  const createCategory = useCallback(async (categoryData: CategoryCreateData) => {
    try {
      const result = await dispatch(
        createInstitutionCategory({ institutionId, categoryData })
      ).unwrap();
      toast.success("Category created successfully");
      return result;
    } catch (error: any) {
      toast.error(error || "Failed to create category");
      throw error;
    }
  }, [dispatch, institutionId]);

  const updateCategory = useCallback(async (categoryId: string, updates: CategoryUpdateData) => {
    try {
      const result = await dispatch(
        updateInstitutionCategory({ categoryId, updates })
      ).unwrap();
      toast.success("Category updated successfully");
      return result;
    } catch (error: any) {
      toast.error(error || "Failed to update category");
      throw error;
    }
  }, [dispatch]);

  const deleteCategory = useCallback(async (categoryId: string, forceDelete = false, reassignTo?: string) => {
    try {
      const result = await dispatch(
        deleteInstitutionCategory({ categoryId, force_delete: forceDelete, reassign_to: reassignTo })
      ).unwrap();
      toast.success("Category deleted successfully");
      return result;
    } catch (error: any) {
      toast.error(error || "Failed to delete category");
      throw error;
    }
  }, [dispatch]);

  const toggleCategoryActive = useCallback(async (categoryId: string) => {
    try {
      const result = await dispatch(
        toggleCategoryStatus(categoryId)
      ).unwrap();
      const action = result.is_active ? "activated" : "deactivated";
      toast.success(`Category ${action} successfully`);
      return result;
    } catch (error: any) {
      toast.error(error || "Failed to toggle category status");
      throw error;
    }
  }, [dispatch]);

  const reorderCategories = useCallback(async (categoryOrders: CategoryReorderData[]) => {
    try {
      await dispatch(
        reorderInstitutionCategories({ institutionId, categoryOrders })
      ).unwrap();
      toast.success("Categories reordered successfully");
    } catch (error: any) {
      toast.error(error || "Failed to reorder categories");
      throw error;
    }
  }, [dispatch, institutionId]);

  return {
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    reorderCategories,
  };
}