import { useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useAuth } from "@/hooks/use-auth";
import { useCategoryManagement } from "@/hooks/use-category-management";

export function useInstitutionCategories(institutionId?: string) {
  const { user } = useAuth();
  const {
    institutionCategories,
    isLoadingCategories,
    categoriesError,
    categoryPagination,
  } = useAppSelector((state) => state.institutions);
  
  const categoryManager = useCategoryManagement(institutionId || user?.primary_institution_id || "");

  // Check if user has access to manage categories
  const hasCategoryAccess = () => {
    if (!user) return false;
    if (user.bwenge_role === "SYSTEM_ADMIN") return true;
    if (user.bwenge_role === "INSTITUTION_ADMIN") {
      if (!institutionId) return true;
      return user.primary_institution_id === institutionId;
    }
    return false;
  };

  // Get parent categories (categories without parents)
  const getParentCategories = () => {
    return institutionCategories.filter(cat => !cat.parent_category_id);
  };

  // Get categories as flat array (including subcategories)
  const getFlatCategories = () => {
    const flatList: any[] = [];
    
    const flatten = (categories: any[]) => {
      categories.forEach(category => {
        flatList.push(category);
        if (category.subcategories && category.subcategories.length > 0) {
          flatten(category.subcategories);
        }
      });
    };
    
    flatten(institutionCategories);
    return flatList;
  };

  // Get category by ID
  const getCategoryById = (categoryId: string) => {
    const flatCategories = getFlatCategories();
    return flatCategories.find(cat => cat.id === categoryId);
  };

  // Get categories for course creation dropdown
  const getCategoriesForDropdown = () => {
    const categoriesForDropdown: any[] = [];
    
    const addToDropdown = (categories: any[], level = 0) => {
      categories.forEach(category => {
        if (category.is_active) {
          categoriesForDropdown.push({
            value: category.id,
            label: `${"– ".repeat(level)}${category.name} (${category.course_count || 0})`,
            data: category,
          });
          
          if (category.subcategories && category.subcategories.length > 0) {
            addToDropdown(category.subcategories, level + 1);
          }
        }
      });
    };
    
    addToDropdown(institutionCategories);
    return categoriesForDropdown;
  };

  return {
    categories: institutionCategories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    pagination: categoryPagination,
    hasCategoryAccess,
    getParentCategories,
    getFlatCategories,
    getCategoryById,
    getCategoriesForDropdown,
    ...categoryManager,
  };
}