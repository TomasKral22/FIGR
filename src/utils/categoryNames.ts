import { ExpenseCategory } from '@/types/finance';

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
