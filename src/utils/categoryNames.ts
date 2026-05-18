import { ExpenseCategory, Subcategory } from '@/types/finance';

export const categoryNames: Record<ExpenseCategory, string> = {
  necessities: 'Nutnosti',
  whims: 'Rozmary',
  investments: 'Investice',
  savings: 'Spoření',
  selfInvestment: 'Investice do sebe',
};

export const getCategoryName = (category: ExpenseCategory): string => {
  return categoryNames[category] || category;
};

export const getSubcategoryName = (subcategories: Subcategory[], subcategoryId?: string): string => {
  return subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name || '';
};
