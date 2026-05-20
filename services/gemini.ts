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

  // 2. Groq AI Fallback (Faster & more reliable for single item categorization)
  const fallbackSlug = ingredientName.toLowerCase().trim().split(' ')[0];
  const fallbackImageUrl = `https://www.themealdb.com/images/ingredients/${fallbackSlug}.png`;

  if (!GROQ_KEY || GROQ_KEY.length < 20) {
    return { category: 'Other', image_url: fallbackImageUrl };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Categorize: "${ingredientName}". 1. Category [${PANTRY_CATEGORIES.join(', ')}]. 2. Simplest 1-word English name for photo search. Format: Category | slug`
          },
        ],
      }),
    });

    const data = await response.json();
    if (response.ok && data.choices?.[0]?.message?.content) {
      const text = data.choices[0].message.content.trim();
      const [aiCategory, aiSlug] = text.split('|').map((s: string) => s.trim());
      const matchedCategory = PANTRY_CATEGORIES.find(cat => {
        const normalizedCat = cat.toLowerCase();
        const normalizedAi = aiCategory?.toLowerCase() || "";
        return normalizedCat.includes(normalizedAi) || normalizedAi.includes(normalizedCat);
      });

      const finalCategory = matchedCategory || 'Other';
      const slugToUse = (aiSlug || ingredientName).toLowerCase().trim().split(' ')[0];
      const imageUrl = `https://www.themealdb.com/images/ingredients/${slugToUse}.png`;

      return { category: finalCategory, image_url: imageUrl };
    }
  } catch (error: any) {
    console.warn("[AI Categorize] Groq failed:", error.message);
  }

  return { category: 'Other', image_url: fallbackImageUrl };
}

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || "";

export async function identifyIngredientsFromImage(base64Image: string): Promise<Array<{ name: string, category: string, image_url: string | null, quantity: string }>> {
  const sanitizedBase64 = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  // 1. Primary: Groq (Free, Fast, Stable)
  if (GROQ_KEY && GROQ_KEY.length > 20) {
    console.log("[AI Vision] Analyzing with Groq...");
    const groqModels = [
      "llama-3.2-90b-vision-preview", 
      "meta-llama/llama-4-scout-17b-16e-instruct", 
      "llava-v1.5-7b-4096-preview"
    ];

    for (const modelName of groqModels) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Identify all raw ingredients in this photo. Format: Name | Category [Poultry, Vegetables, Fruits, Meat, Beef, Seafood, Dairy, Grains, Condiments, Other] | Quantity | simplest-slug" },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${sanitizedBase64}` } }
                ],
              },
            ],
          }),
        });

        const data = await response.json();
        if (!response.ok) continue;

        const text = data.choices?.[0]?.message?.content;
        if (text && !text.toLowerCase().includes("none")) {
          return parseAiLines(text);
        }
      } catch (e: any) {
        continue;
      }
    }
  }

  return [];
}

/** Helper to parse AI text into structured items */
function parseAiLines(text: string): Array<{ name: string, category: string, image_url: string | null, quantity: string }> {
  const lines = text.split('\n').filter((l: string) => l.includes('|'));
  return lines.map((line: string) => {
    const parts = line.split('|').map(s => s.trim());
    const [name, category, quantity, slug] = parts;
    
    return {
      name: name || "Unknown",
      category: PANTRY_CATEGORIES.includes(category) ? category : "Other",
      quantity: quantity || "1 pcs",
      image_url: slug ? `https://www.themealdb.com/images/ingredients/${slug.toLowerCase().replace(/\s+/g, '%20')}.png` : null
    };
  });
}

export async function analyzeRecipeStats(title: string, instructions: string = "") {
  const safeInstructions = instructions || "";
  if (!GROQ_KEY || GROQ_KEY.length < 20) {
    return { 
      description: safeInstructions.substring(0, 150).trim() + "...",
      time: "45 min", difficulty: "Medium", servings: "4", rating: 4.5, steps: [], equipment: [], tips: [] 
    };
  }

  const groqModels = ["llama-3.2-90b-vision-preview", "meta-llama/llama-4-scout-17b-16e-instruct"];
  
  for (const modelName of groqModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: `Analyze this recipe and provide a JSON estimate.
              Recipe: ${title}
              Instructions: ${safeInstructions.substring(0, 3000)}
              
              Return ONLY JSON:
              {
                "description": "A short appetizing 1-2 sentence summary. NO numbers.",
                "time": "45 min",
                "difficulty": "Medium",
                "servings": "4",
                "rating": "4.8",
                "steps": ["Step 1...", "Step 2..."],
                "equipment": ["Pan", "Bowl"],
                "tips": ["Tip 1"]
              }`
            },
          ],
          response_format: { type: "json_object" }
        }),
      });

      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message?.content) {
        const stats = JSON.parse(data.choices[0].message.content);
        
        // Final cleanup of description to ensure no steps leak in
        let cleanDesc = (stats.description || "")
          .replace(/^\d+[\.\)]\s*/gm, '') 
          .replace(/Step \d+[:\-]?/gi, '') 
          .trim();

        if (cleanDesc.length < 10) {
          cleanDesc = `Enjoy this delicious ${title.toLowerCase()} prepared with expert-selected ingredients.`;
        }

        return {
          description: cleanDesc,
          time: stats.time || "45 min",
          difficulty: stats.difficulty || "Medium",
          servings: stats.servings || "4",
          rating: Number(stats.rating) || 4.5,
          steps: stats.steps || [],
          equipment: stats.equipment || [],
          tips: stats.tips || []
        };
      }
    } catch (e) {
      continue;
    }
  }

  return { 
    description: safeInstructions.substring(0, 150).trim() + "...",
    time: "45 min", difficulty: "Medium", servings: "4", rating: 4.5, steps: [], equipment: [], tips: [] 
  };
}

export async function analyzeCookConsumption(recipeIngredients: string[], pantryItems: any[]) {
  const buildMissingFallback = (ing: string) => {
    let name = ing.split(',')[0].trim();
    
    // Clean up common adjectives that ruin categorization
    name = name.replace(/to taste/i, '').trim();

    const units = ['cups', 'cup', 'tbsp', 'tsp', 'tablespoons', 'tablespoon', 'teaspoons', 'teaspoon', 'oz', 'g', 'kg', 'ml', 'l', 'cloves', 'clove', 'parts', 'part', 'pinch', 'dash'];
    const words = name.split(' ');
    if (words.length > 1 && !isNaN(parseFloat(words[0]))) {
       words.shift(); 
       if (units.includes(words[0].toLowerCase())) words.shift();
    }
    name = words.join(' ').trim();
    return { name: name || ing, amount_needed: ing, logical_units: getAccurateUnits(name) };
  };

  if (!pantryItems || pantryItems.length === 0) {
    return { deductions: [], missing: recipeIngredients.map(buildMissingFallback) };
  }

  if (!GROQ_KEY || GROQ_KEY.length < 20) {
    return { deductions: [], missing: recipeIngredients.map(buildMissingFallback) };
  }

  const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  
  for (const modelName of groqModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: `You are a professional kitchen manager. 
              Recipe Context: ${JSON.stringify(recipeIngredients)}
              My Pantry: ${JSON.stringify(pantryItems.map(p => ({ name: p.name, qty: p.quantity })))}
              
              TASK:
              1. Deduct used items from pantry.
              2. For MISSING items, perform a "Culinary Volume Analysis":
                 - For the "name" field, EXTRACT ONLY the pure ingredient name WITHOUT any numbers, measurements, or preparation details (e.g., use "Soy Sauce" NOT "5 tablespoons Soy Sauce", use "Garlic" NOT "3 cloves Garlic").
                 - Put the full original string in "amount_needed" (e.g., "5 tablespoons Soy Sauce").
                 - Provide 3-4 "logical_units" that are professional and practical for buying/stocking that item.
                 - IMPORTANT: If it's a solid (Meat/Veg), NO 'L' or 'ml'.
                 - If it's a liquid, prioritize 'L', 'ml', 'cup'.
              
              RETURN JSON:
              {
                "deductions": [{ "pantry_id": "...", "amount_to_subtract": 2, "unit": "pcs", "item_name": "..." }],
                "missing": [{ "name": "...", "amount_needed": "...", "logical_units": ["kg", "g", "pcs"] }]
              }`
            },
          ],
          response_format: { type: "json_object" }
        }),
      });

      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message?.content) {
        const result = JSON.parse(data.choices[0].message.content);
        
        // Ensure all recipe ingredients are accounted for (AI can sometimes omit items)
        result.missing = result.missing || [];
        result.deductions = result.deductions || [];
        
        recipeIngredients.forEach(ing => {
           const ingLower = ing.toLowerCase();
           const isMissing = result.missing.some((m: any) => m.amount_needed?.toLowerCase() === ingLower || ingLower.includes(m.name?.toLowerCase() || ''));
           const isDeducted = result.deductions.some((d: any) => ingLower.includes(d.item_name?.toLowerCase() || ''));

           if (!isMissing && !isDeducted) {
               result.missing.push(buildMissingFallback(ing));
           }
        });

        // AI False Positive Filter: The AI sometimes hallucinates that a pantry item isn't enough or mismatches names.
        result.missing = result.missing.filter((m: any) => {
          const mNameLower = (m.name || '').toLowerCase();
          if (!mNameLower) return true;

          const pMatch = pantryItems.find((p: any) => {
             const pNameLower = p.name.toLowerCase();
             // Direct string overlap
             if (pNameLower.includes(mNameLower) || mNameLower.includes(pNameLower)) return true;
             // Category intelligence fallback
             if (p.category === 'Beef' && mNameLower.includes('beef')) return true;
             if (p.category === 'Poultry' && mNameLower.includes('chicken')) return true;
             if (p.category === 'Seafood' && (mNameLower.includes('fish') || mNameLower.includes('salmon') || mNameLower.includes('shrimp'))) return true;
             return false;
          });

          if (pMatch) {
             result.deductions.push({ 
               pantry_id: pMatch.id, 
               item_name: pMatch.name, 
               amount_to_subtract: 1, 
               unit: 'pcs' 
             });
             return false; // Yank it out of missing
          }
          return true; // Keep in missing
        });
        // Post-process units using Culinary Intelligence
        if (result.missing) {
          result.missing = result.missing.map((item: any) => {
            item.logical_units = getAccurateUnits(item.name, item.logical_units || []);
            return item;
          });
        }
        return result;
      }
    } catch (e) {
      continue;
    }
  }

  // Robust Local Fallback if AI fails completely or offline
  const missing: any[] = [];
  const deductions: any[] = [];
  
  recipeIngredients.forEach(ing => {
    const ingLower = ing.toLowerCase();
    const match = pantryItems.find((p: any) => 
      ingLower.includes(p.name.toLowerCase()) || 
      p.name.toLowerCase().includes(ingLower.split(' ').pop() || '')
    );
    
    if (match) {
      deductions.push({
        pantry_id: match.id,
        item_name: match.name,
        amount_to_subtract: 1, 
        unit: 'pcs'
      });
    } else {
      missing.push(buildMissingFallback(ing));
    }
  });

  return { deductions, missing };
}

// CULINARY INTELLIGENCE: Standard units for common ingredients
const STANDARD_UNITS: Record<string, string[]> = {
  'garlic': ['clove', 'pcs', 'g'],
  'onion': ['pcs', 'kg', 'g'],
  'egg': ['pcs', 'pack'],
  'flour': ['kg', 'g', 'cup'],
  'sugar': ['kg', 'g', 'cup'],
  'salt': ['g', 'tsp', 'tbsp'],
  'pepper': ['g', 'tsp', 'tbsp'],
  'oil': ['L', 'ml', 'tbsp'],
  'water': ['L', 'ml', 'cup'],
  'milk': ['L', 'ml', 'cup'],
  'butter': ['g', 'stick', 'tbsp'],
  'chicken': ['kg', 'g', 'pcs'],
  'beef': ['kg', 'g', 'pcs'],
  'pork': ['kg', 'g', 'pcs'],
  'rice': ['kg', 'g', 'cup'],
  'pasta': ['g', 'pack', 'box'],
  'ginger': ['g', 'pcs', 'tsp'],
};

function getAccurateUnits(ingredientName: string, aiSuggested: string[] = []): string[] {
  const name = ingredientName.toLowerCase();
  
  // 1. Check our standard library first
  for (const [key, units] of Object.entries(STANDARD_UNITS)) {
    if (name.includes(key)) {
      // Merge AI suggestions but keep standard ones first
      const combined = [...units, ...aiSuggested.filter(u => !units.includes(u))];
      return combined.slice(0, 5);
    }
  }

  // 2. Fallback to AI but filter out illogical liquid/solid mismatches
  const isLiquid = name.includes('water') || name.includes('milk') || name.includes('oil') || 
                   name.includes('broth') || name.includes('juice') || name.includes('sauce');
  
  const isAromatic = name.includes('garlic') || name.includes('onion') || name.includes('ginger') || 
                     name.includes('chili') || name.includes('herb');

  let filtered = aiSuggested.length > 0 ? aiSuggested : ['pcs', 'kg', 'g', 'L', 'ml', 'cup', 'tsp', 'tbsp'];

  if (isLiquid) {
    filtered = filtered.filter(u => u !== 'pcs' && u !== 'clove' && u !== 'kg');
    if (!filtered.includes('L')) filtered.unshift('L');
  } else {
    filtered = filtered.filter(u => u !== 'L' && u !== 'ml');
    if (isAromatic && !filtered.includes('pcs')) filtered.unshift('pcs');
  }

  return filtered.slice(0, 5);
}

export async function generateRecipeFromAI(dishName: string): Promise<any> {
  if (!GROQ_KEY || GROQ_KEY.length < 20) {
    return null;
  }
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Generate a premium, authentic, high-quality recipe for: "${dishName}".
            
            Return ONLY a valid JSON object matching this TypeScript structure:
            {
              "title": "UPPERCASE dish name",
              "subtitle": "Origin Country • Category Cuisine",
              "description": "Appetizing 1-2 sentence description of the history or taste profile of the dish.",
              "time": "e.g., 45 min",
              "difficulty": "Easy" | "Medium" | "Hard",
              "rating": 4.8,
              "servings": "4",
              "ingredients": ["1 tbsp Olive Oil", "2 cloves Garlic, minced", ...],
              "steps": ["Heat oil in a pan...", "Sauté garlic..."],
              "equipment": ["Skillet", "Chef's Knife"],
              "tips": ["Tip 1...", "Tip 2..."],
              "imageSearchTerm": "1-2 descriptive English terms for Unsplash search (e.g., 'paella' or 'tacos')"
            }`
          },
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (response.ok && data.choices?.[0]?.message?.content) {
      const parsed = JSON.parse(data.choices[0].message.content);
      const query = encodeURIComponent(parsed.imageSearchTerm || dishName);
      
      return {
        id: `web-ai-${dishName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: parsed.title || dishName.toUpperCase(),
        subtitle: parsed.subtitle || "Global Discovery • Fusion Cuisine",
        description: parsed.description || `An authentic, chef-created guide to making ${dishName}.`,
        image: `https://loremflickr.com/600/400/food,${query}`,
        time: parsed.time || "40 min",
        difficulty: parsed.difficulty || "Medium",
        rating: parsed.rating || 4.7,
        servings: parsed.servings || "4",
        category: "web",
        ingredients: parsed.ingredients || [],
        steps: parsed.steps || [],
        equipment: parsed.equipment || [],
        tips: parsed.tips || [],
        author_name: "Magic AI Chef",
        author_avatar: "https://api.dicebear.com/7.x/identicon/png?seed=magicaichef"
      };
    }
  } catch (e) {
    console.error("generateRecipeFromAI error:", e);
  }
  return null;
}

