import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const PANTRY_CATEGORIES = [
  'Poultry', 'Vegetables', 'Fruits', 'Meat', 'Beef', 
  'Seafood', 'Dairy', 'Grains', 'Condiments', 'Other'
];

// Expanded Dictionary for instant, high-quality results
const COMMON_INGREDIENTS: Record<string, { cat: string, slug: string }> = {
  'egg': { cat: 'Dairy', slug: 'egg' },
  'eggs': { cat: 'Dairy', slug: 'eggs' },
  'milk': { cat: 'Dairy', slug: 'milk' },
  'cheese': { cat: 'Dairy', slug: 'cheese' },
  'butter': { cat: 'Dairy', slug: 'butter' },
  'chicken': { cat: 'Poultry', slug: 'chicken' },
  'apple': { cat: 'Fruits', slug: 'apple' },
  'banana': { cat: 'Fruits', slug: 'banana' },
  'garlic': { cat: 'Vegetables', slug: 'garlic' },
  'onion': { cat: 'Vegetables', slug: 'onion' },
  'beef': { cat: 'Beef', slug: 'beef' },
  'wagyu': { cat: 'Beef', slug: 'raw-beef' },
  'steak': { cat: 'Beef', slug: 'steak' },
  'salmon': { cat: 'Seafood', slug: 'salmon' },
  'fish': { cat: 'Seafood', slug: 'fish' },
  'shrimp': { cat: 'Seafood', slug: 'shrimp' },
  'rice': { cat: 'Grains', slug: 'rice' },
  'bread': { cat: 'Grains', slug: 'bread' },
  'pasta': { cat: 'Grains', slug: 'pasta' },
  'pepper': { cat: 'Condiments', slug: 'pepper' },
  'salt': { cat: 'Condiments', slug: 'salt' },
  'tomato': { cat: 'Vegetables', slug: 'tomato' },
  'potato': { cat: 'Vegetables', slug: 'potato' },
  'watermelon': { cat: 'Fruits', slug: 'watermelon' },
};

export interface CategorizationResult {
  category: string;
  image_url: string | null;
}

export async function categorizeIngredient(ingredientName: string): Promise<CategorizationResult> {
  const lowerName = ingredientName.toLowerCase().trim();
  
  // 1. Dictionary Match
  const dictMatch = Object.keys(COMMON_INGREDIENTS).find(key => 
    lowerName.includes(key) || key.includes(lowerName)
  );

  if (dictMatch) {
    const item = COMMON_INGREDIENTS[dictMatch];
    return {
      category: item.cat,
      // Using a very stable, proxy-friendly image source
      image_url: `https://www.themealdb.com/images/ingredients/${item.slug}.png`
    };
  }

  // 2. AI Fallback
  if (!API_KEY || API_KEY.includes("YOUR_GEMINI_API_KEY")) {
    return { category: 'Other', image_url: null };
  }

  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `Analyze: "${ingredientName}". 1. Category [${PANTRY_CATEGORIES.join(', ')}]. 2. Simplest 1-word English name for photo search. Format: Category | slug`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      const [aiCategory, aiSlug] = text.split('|').map(s => s.trim());
      const matchedCategory = PANTRY_CATEGORIES.find(cat => {
        const normalizedCat = cat.toLowerCase();
        const normalizedAi = aiCategory.toLowerCase();
        return normalizedCat.includes(normalizedAi) || normalizedAi.includes(normalizedCat);
      });

      const finalCategory = matchedCategory || 'Other';
      const slugToUse = (aiSlug || ingredientName).toLowerCase().trim().split(' ')[0];
      
      // Use a proxy-safe URL pattern
      const imageUrl = `https://www.themealdb.com/images/ingredients/${slugToUse}.png`;

      return { category: finalCategory, image_url: imageUrl };
    } catch (error: any) { continue; }
  }

  return { category: 'Other', image_url: null };
}
