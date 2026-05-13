// data/recipes.ts
// This file now only contains the type definition. 
// All recipe data is fetched from Supabase or the Web API.

export type Recipe = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  time: string;
  difficulty: string;
  rating: number;
  servings: string;
  category: string;
  ingredients: string[];
  steps: string[];
  author_id?: string;
};

// No hardcoded recipes here anymore!
export const ALL_RECIPES: Recipe[] = [];

/** Helper to check if a recipe is a web recipe */
export const isWebRecipe = (id: string) => id.startsWith('web-');
