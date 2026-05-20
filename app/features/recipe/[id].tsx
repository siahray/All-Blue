import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { useAppAlert } from '../../../components/common/AppAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../theme/colors';
import { Recipe, isWebRecipe } from '../../../data/recipes';
import { ArrowLeft, Clock, Star, Users, ChefHat, Globe, Play, ChevronRight, ChevronLeft, Timer as TimerIcon, CheckCircle2, AlertCircle, X, Sparkles, Plus, Heart } from 'lucide-react-native';
import { analyzeRecipeStats, analyzeCookConsumption, generateRecipeFromAI } from '../../../services/gemini';
import { supabase } from '../../../services/supabase';
import { PantrySyncModal } from '../../../components/common/PantrySyncModal';

const { width } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Cooking State
  const [isCookModalVisible, setIsCookModalVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPantryChecking, setIsPantryChecking] = useState(true);
  const [analysis, setAnalysis] = useState<{ deductions: any[], missing: any[] } | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [activeTimer, setActiveTimer] = useState<{ seconds: number, totalSeconds: number, isActive: boolean } | null>(null);
  const [isPantrySyncVisible, setIsPantrySyncVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (recipe) {
      checkIfLiked();
    }
  }, [recipe]);

  const checkIfLiked = async () => {
    if (!recipe) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('recipe_id', recipe.id);
      
      if (data && data.length > 0) setIsLiked(true);
    } catch (e) {}
  };

  const handleLike = async () => {
    if (!recipe) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      showAlert("Login Required", "Please log in to save recipes.");
      return;
    }

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);

    try {
      if (!newLikedState) {
        await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipe.id);
      } else {
        let dbRecipeId = recipe.id;
        
        if (recipe.id.startsWith('web-')) {
          const { data: existing } = await supabase
            .from('recipes')
            .select('id')
            .eq('title', recipe.title)
            .eq('image_url', recipe.image)
            .single();
          
          if (existing) {
            dbRecipeId = existing.id.toString();
          } else {
            const payload: any = {
              title: recipe.title,
              subtitle: recipe.subtitle,
              description: recipe.description || '',
              image_url: recipe.image,
              cook_time: recipe.time,
              ingredients: recipe.ingredients,
              steps: recipe.steps || [],
              category: recipe.category || 'other',
              rating: recipe.rating,
              equipment: recipe.equipment || [],
              tips: recipe.tips || [],
              user_id: user.id
            };
            const { data: newRecipe } = await supabase.from('recipes').insert(payload).select().single();
            if (newRecipe) dbRecipeId = newRecipe.id.toString();
          }
        }
        await supabase.from('saved_recipes').insert({ user_id: user.id, recipe_id: dbRecipeId });
      }
    } catch (err) {
      setIsLiked(!newLikedState);
      console.error(err);
    }
  };

  useEffect(() => {
    loadRecipe();
  }, [id]);

  useEffect(() => {
    if (activeTimer?.isActive && activeTimer.seconds > 0) {
      timerRef.current = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev) return null;
          if (prev.seconds <= 1) {
            clearInterval(timerRef.current!);
            setTimeout(() => showAlert("Timer Finished!", "Your cooking step is complete."), 100);
            return null;
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTimer?.isActive]);

  const loadRecipe = async () => {
    setLoading(true);
    if (!id) return;

    let recipeData: Recipe | null = null;

    const fetchSingleWordPressRecipe = async (recipeId: string): Promise<Recipe | null> => {
      try {
        let domain = '';
        let sourceLabel = '';
        let subtitle = '';
        
        if (recipeId.includes('kawalingpinoy')) {
          domain = 'www.kawalingpinoy.com';
          sourceLabel = 'Kawaling Pinoy';
          subtitle = 'Authentic Filipino';
        } else if (recipeId.includes('pinchofyum')) {
          domain = 'pinchofyum.com';
          sourceLabel = 'Pinch of Yum';
          subtitle = 'Modern Comfort';
        } else if (recipeId.includes('budgetbytes')) {
          domain = 'www.budgetbytes.com';
          sourceLabel = 'Budget Bytes';
          subtitle = 'Easy & Low-Cost';
        } else if (recipeId.includes('minimalistbaker')) {
          domain = 'minimalistbaker.com';
          sourceLabel = 'Minimalist Baker';
          subtitle = 'Healthy & Simple';
        } else if (recipeId.includes('omnivorescookbook')) {
          domain = 'omnivorescookbook.com';
          sourceLabel = "Omnivore's Cookbook";
          subtitle = 'Chinese & Asian';
        } else if (recipeId.includes('isabeleats')) {
          domain = 'www.isabeleats.com';
          sourceLabel = 'Isabel Eats';
          subtitle = 'Authentic Mexican';
        } else if (recipeId.includes('veganricha')) {
          domain = 'www.veganricha.com';
          sourceLabel = 'Vegan Richa';
          subtitle = 'Indian & Plant-Based';
        } else {
          return null;
        }
        
        const parts = recipeId.split('-');
        const postId = parts[parts.length - 1]; // get the numeric ID at the end
        
        if (!postId || isNaN(Number(postId))) return null;
        const url = `https://${domain}/wp-json/wp/v2/posts/${postId}?_embed=1`;
        const res = await fetch(url);
        const post = await res.json();
        
        if (!post || !post.content) return null;
        const htmlContent = post.content?.rendered || '';
        
        // Parse ingredients
        const ingredients: string[] = [];
        let match;
        
        // 1. WP Recipe Maker
        const ingredientRegex = /<li[^>]*class="[^"]*wprm-recipe-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
        while ((match = ingredientRegex.exec(htmlContent)) !== null) {
          const cleanIngredient = match[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&#32;/g, ' ')
            .replace(/&#189;/g, '1/2')
            .replace(/&#188;/g, '1/4')
            .replace(/&#190;/g, '3/4')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanIngredient) ingredients.push(cleanIngredient);
        }

        // 2. Tasty Recipes
        if (ingredients.length === 0) {
          const tastyRegex = /<li[^>]*class="[^"]*tasty-recipes-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
          while ((match = tastyRegex.exec(htmlContent)) !== null) {
            const cleanIngredient = match[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&#32;/g, ' ')
              .replace(/&#189;/g, '1/2')
              .replace(/&#188;/g, '1/4')
              .replace(/&#190;/g, '3/4')
              .replace(/&amp;/g, '&')
              .replace(/\s+/g, ' ')
              .trim();
            if (cleanIngredient) ingredients.push(cleanIngredient);
          }
        }

        // 3. Fallback list elements inside ingredient containers
        if (ingredients.length === 0) {
          const generalIngredientListRegex = /<ul[^>]*class="[^"]*ingredient[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
          const ulMatch = generalIngredientListRegex.exec(htmlContent);
          if (ulMatch) {
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            let liMatch;
            while ((liMatch = liRegex.exec(ulMatch[1])) !== null) {
              const cleanIngredient = liMatch[1].replace(/<[^>]*>/g, '').trim();
              if (cleanIngredient) ingredients.push(cleanIngredient);
            }
          }
        }

        // Parse steps
        const steps: string[] = [];
        let stepMatch;
        
        // 1. WP Recipe Maker
        const stepRegex = /<li[^>]*class="[^"]*wprm-recipe-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
        while ((stepMatch = stepRegex.exec(htmlContent)) !== null) {
          const cleanStep = stepMatch[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanStep) steps.push(cleanStep);
        }

        // 2. Tasty Recipes
        if (steps.length === 0) {
          const tastyStepRegex = /<li[^>]*class="[^"]*tasty-recipes-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
          while ((stepMatch = tastyStepRegex.exec(htmlContent)) !== null) {
            const cleanStep = stepMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/\s+/g, ' ')
              .trim();
            if (cleanStep) steps.push(cleanStep);
          }
        }

        const cleanExcerpt = post.excerpt?.rendered
          ? post.excerpt.rendered.replace(/<[^>]*>/g, '').replace(/&hellip;/g, '...').replace(/\s+/g, ' ').trim()
          : '';
          
        const image = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 
                      post.jetpack_featured_media_url ||
                      'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500';

        const titleUpper = post.title?.rendered 
          ? post.title.rendered
              .replace(/&#8211;/g, '-')
              .replace(/&#8217;/g, "'")
              .replace(/&#8216;/g, "'")
              .replace(/&amp;/g, '&')
              .replace(/<[^>]*>/g, '')
              .toUpperCase() 
          : 'RECIPE';

        const instructionsString = steps.length > 0 ? steps.join('\n') : htmlContent.replace(/<[^>]*>/g, '').substring(0, 2000);
        const aiStats = await analyzeRecipeStats(titleUpper, instructionsString);

        return {
          id: recipeId,
          title: titleUpper,
          subtitle: `${sourceLabel} • ${subtitle}`,
          description: aiStats.description || cleanExcerpt || `A delicious recipe from ${sourceLabel}.`,
          image: image,
          time: aiStats.time || '35 min',
          difficulty: aiStats.difficulty || 'Medium',
          rating: aiStats.rating || 4.6,
          servings: aiStats.servings || '4',
          category: 'web',
          ingredients: ingredients.length > 0 ? ingredients : ['Ingredients listed on website'],
          steps: aiStats.steps.length > 0 ? aiStats.steps : (steps.length > 0 ? steps : [`Follow instructions on ${domain}`]),
          equipment: aiStats.equipment || [],
          tips: aiStats.tips || [],
          author_name: sourceLabel,
          author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=${sourceLabel.toLowerCase().replace(/\s+/g, '')}`
        };
      } catch (e) {
        console.warn("Error loading WordPress single recipe details:", e);
        return null;
      }
    };

    if (isWebRecipe(id)) {
      if (id.startsWith('web-url-')) {
        const targetUrl = decodeURIComponent(id.replace('web-url-', ''));
        try {
          const response = await fetch(targetUrl);
          const html = await response.text();
          
          // Recursive JSON-LD searcher
          const parseJsonLdRecipe = (htmlText: string): any => {
            try {
              const ldJsonRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
              let match;
              while ((match = ldJsonRegex.exec(htmlText)) !== null) {
                try {
                  const json = JSON.parse(match[1].trim());
                  const findRecipe = (obj: any): any => {
                    if (!obj) return null;
                    if (obj['@type'] === 'Recipe') return obj;
                    if (Array.isArray(obj)) {
                      for (const item of obj) {
                        const res = findRecipe(item);
                        if (res) return res;
                      }
                    }
                    if (typeof obj === 'object') {
                      if (obj['@graph'] && Array.isArray(obj['@graph'])) {
                        const res = findRecipe(obj['@graph']);
                        if (res) return res;
                      }
                      for (const key in obj) {
                        if (typeof obj[key] === 'object') {
                          const res = findRecipe(obj[key]);
                          if (res) return res;
                        }
                      }
                    }
                    return null;
                  };
                  const recipeObj = findRecipe(json);
                  if (recipeObj) return recipeObj;
                } catch {}
              }
            } catch {}
            return null;
          };

          const recipeObj = parseJsonLdRecipe(html);
          if (recipeObj) {
            const domain = targetUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
            const sourceLabel = domain.split('.')[0].toUpperCase();
            
            const ingredients = Array.isArray(recipeObj.recipeIngredient) 
              ? recipeObj.recipeIngredient.map((i: any) => i.toString().replace(/<[^>]*>/g, '').trim())
              : [];

            let steps: string[] = [];
            if (Array.isArray(recipeObj.recipeInstructions)) {
              steps = recipeObj.recipeInstructions.map((s: any) => {
                if (typeof s === 'string') return s;
                if (s.text) return s.text;
                if (s.name) return s.name;
                return '';
              }).filter(Boolean);
            } else if (typeof recipeObj.recipeInstructions === 'string') {
              steps = [recipeObj.recipeInstructions];
            }

            let image = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500';
            if (recipeObj.image) {
              if (typeof recipeObj.image === 'string') image = recipeObj.image;
              else if (Array.isArray(recipeObj.image) && recipeObj.image[0]) {
                image = typeof recipeObj.image[0] === 'string' ? recipeObj.image[0] : (recipeObj.image[0].url || image);
              } else if (recipeObj.image.url) {
                image = recipeObj.image.url;
              }
            }

            let servings = '4';
            if (recipeObj.recipeYield) {
              const yieldStr = Array.isArray(recipeObj.recipeYield) ? recipeObj.recipeYield[0] : recipeObj.recipeYield;
              const match = /\d+/.exec(yieldStr.toString());
              if (match) servings = match[0];
            }

            let time = '35 min';
            if (recipeObj.totalTime) {
              const match = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(recipeObj.totalTime.toString());
              if (match) {
                const hours = match[1] ? parseInt(match[1]) : 0;
                const mins = match[2] ? parseInt(match[2]) : 0;
                time = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
              }
            }

            const mappedRecipe: Recipe = {
              id: id,
              title: (recipeObj.name || 'WEB RECIPE').toUpperCase(),
              subtitle: `${sourceLabel} • Web Import`,
              description: recipeObj.description || `Imported cleanly from ${domain}.`,
              image,
              time,
              difficulty: 'Medium',
              rating: 4.8,
              servings,
              category: 'web',
              ingredients,
              steps,
              equipment: [],
              tips: [],
              author_name: sourceLabel,
              author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=${sourceLabel.toLowerCase()}`
            };
            setRecipe(mappedRecipe);
            recipeData = mappedRecipe;
          } else {
            // HTML Fallback Scrapers (WordPress core tags)
            const domain = targetUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
            const sourceLabel = domain.split('.')[0].toUpperCase();
            
            const parseList = (regexes: RegExp[]): string[] => {
              const found: string[] = [];
              for (const regex of regexes) {
                let match;
                while ((match = regex.exec(html)) !== null) {
                  if (match[1]) {
                    const clean = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                    if (clean && !found.includes(clean)) found.push(clean);
                  }
                }
                if (found.length > 0) break;
              }
              return found;
            };

            const ingredients = parseList([
              /class="[^"]*wprm-recipe-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
              /class="[^"]*tasty-recipes-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
              /<li[^>]*class="[^"]*ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
            ]);

            const steps = parseList([
              /class="[^"]*wprm-recipe-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
              /class="[^"]*tasty-recipes-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
              /<li[^>]*class="[^"]*(step|instruction)[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
            ]);

            const titleMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/gi.exec(html);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'WEB RECIPE';

            const parsedRecipe: Recipe = {
              id: id,
              title: title.toUpperCase(),
              subtitle: `${sourceLabel} • Web Import`,
              description: `Cleanly parsed imported recipe from ${domain}.`,
              image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500',
              time: '30 min',
              difficulty: 'Medium',
              rating: 4.5,
              servings: '4',
              category: 'web',
              ingredients: ingredients.length > 0 ? ingredients : ['Ingredients listed on website'],
              steps: steps.length > 0 ? steps : ['Follow instructions on website'],
              equipment: [],
              tips: [],
              author_name: sourceLabel,
              author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=${sourceLabel.toLowerCase()}`
            };
            setRecipe(parsedRecipe);
            recipeData = parsedRecipe;
          }
        } catch (e) {
          console.error("Web import scraper error:", e);
        }
      } else if (id.startsWith('web-ai-')) {
        const dishName = id.replace('web-ai-', '').replace(/-/g, ' ');
        const aiRecipe = await generateRecipeFromAI(dishName);
        if (aiRecipe) {
          setRecipe(aiRecipe);
          recipeData = aiRecipe;
        }
      } else {
        const isWordPress = id.includes('kawalingpinoy') || id.includes('pinchofyum') || id.includes('budgetbytes') || id.includes('minimalistbaker') || id.includes('omnivorescookbook') || id.includes('isabeleats') || id.includes('veganricha');
        
        if (isWordPress) {
          const wpRecipe = await fetchSingleWordPressRecipe(id);
          if (wpRecipe) {
            setRecipe(wpRecipe);
            recipeData = wpRecipe;
          }
        } else {
          try {
            const parts = id.split('-');
            const mealId = parts.find((p, idx) => idx > 0 && /^\d+$/.test(p)); 
            
            if (!mealId) return;
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
          const data = await response.json();
          
          if (data.meals && data.meals[0]) {
            const meal = data.meals[0];
            const ingredients: string[] = [];
            for (let i = 1; i <= 20; i++) {
              const ing = meal[`strIngredient${i}`];
              const measure = meal[`strMeasure${i}`];
              if (ing && ing.trim()) {
                ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`);
              }
            }

            const aiStats = await analyzeRecipeStats(meal.strMeal, meal.strInstructions);

            const newRecipe: Recipe = {
              id: id,
              title: meal.strMeal?.toUpperCase() || 'UNKNOWN MEAL',
              subtitle: `${meal.strCategory} • ${meal.strArea} Cuisine`,
              description: aiStats.description,
              image: meal.strMealThumb,
              time: aiStats.time,
              difficulty: aiStats.difficulty,
              rating: aiStats.rating,
              servings: aiStats.servings,
              category: 'web',
              ingredients: ingredients,
              steps: aiStats.steps,
              equipment: aiStats.equipment,
              tips: aiStats.tips,
              author_name: 'TheMealDB',
              author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=mealdb`
            };
            setRecipe(newRecipe);
            recipeData = newRecipe;
          }
        } catch (error) { console.error(error); }
      }
    }
  } else {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          if (id && id.toString().includes('-')) {
             const isWordPressLegacy = id.toString().includes('kawalingpinoy') || id.toString().includes('pinchofyum') || id.toString().includes('budgetbytes') || id.toString().includes('minimalistbaker');
             if (isWordPressLegacy) {
               const wpRecipe = await fetchSingleWordPressRecipe(id.toString());
               if (wpRecipe) {
                 setRecipe(wpRecipe);
                 recipeData = wpRecipe;
               }
             } else {
               const parts = id.toString().split('-');
               const mealId = parts.find((p, idx) => idx > 0 && /^\d+$/.test(p));
               if (mealId) {
                 const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
                 const d = await resp.json();
                 if (d.meals && d.meals[0]) {
                   return loadRecipe();
                 }
               }
             }
          }
          if (!recipeData) {
            console.error("Recipe Fetch Error:", error?.message || "No data found");
            setLoading(false);
            return;
          }
        }

        if (data) {
          let username = 'Chef User';
          let avatarUrl = '';
          if (data.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', data.user_id)
              .single();
            if (profile) {
              username = profile.username;
              avatarUrl = profile.avatar_url || '';
            }
          }
          let rawSteps = data.steps || [];
          let finalDesc = data.description || '';
          let finalEquip = data.equipment || [];
          let finalTips = data.tips || [];
          let rawIngredients = data.ingredients || [];

          // ── Clean Up Leaked Steps in Description ──
          // If the description actually contains instructions (multiple paragraphs or numbered list) 
          // or is identical to the first step, we parse them cleanly and separate them.
          const isInstructionsInDesc = finalDesc.length > 180 && (finalDesc.includes('\n') || /^\d+[\.\)]/m.test(finalDesc));
          const isSingleStepMatchingDesc = rawSteps.length === 1 && rawSteps[0] === finalDesc;

          if (isInstructionsInDesc || isSingleStepMatchingDesc || rawSteps.length <= 1) {
            try {
              // Call analyzeRecipeStats to obtain a clean, high-quality summary and individual steps list!
              const aiStats = await analyzeRecipeStats(data.title, finalDesc || rawSteps[0] || "");
              if (aiStats && aiStats.description && aiStats.description.length > 10 && !aiStats.description.includes('1.')) {
                finalDesc = aiStats.description;
              } else {
                finalDesc = `A delicious, chef-curated way to prepare classic ${data.title.toLowerCase()}.`;
              }
              
              if (aiStats && aiStats.steps && aiStats.steps.length > 0) {
                rawSteps = aiStats.steps;
              }
            } catch (e) {
              console.warn("Failed to sanitize recipe steps with Gemini, using local parser:", e);
              // Local Split Fallback
              let parsedSteps: string[] = [];
              if (finalDesc.includes('\r\n\r\n') || finalDesc.includes('\n\n')) {
                parsedSteps = finalDesc.split(/\r?\n\r?\n/).map((s: string) => s.trim()).filter(Boolean);
              } else if (finalDesc.includes('\r\n') || finalDesc.includes('\n')) {
                parsedSteps = finalDesc.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
              }
              if (parsedSteps.length > 1) {
                rawSteps = parsedSteps;
              }
              finalDesc = `A classic and flavorful ${data.title.toLowerCase()} recipe prepared to perfection.`;
            }
          }

          // Self-Healing: If ingredients or steps are missing, try to recover them
          if (rawIngredients.length === 0 || rawSteps.length === 0 || !finalDesc) {
            // Attempt to fetch from web if it's a known name or has web context
            let webData = null;
            try {
              const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(data.title)}`);
              const d = await resp.json();
              if (d.meals && d.meals[0]) webData = d.meals[0];
            } catch (e) {}

            if (webData) {
              if (rawIngredients.length === 0) {
                for (let i = 1; i <= 20; i++) {
                  const ing = webData[`strIngredient${i}`];
                  const measure = webData[`strMeasure${i}`];
                  if (ing && ing.trim()) rawIngredients.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`);
                }
              }
              if (rawSteps.length === 0) {
                 const aiStats = await analyzeRecipeStats(webData.strMeal, webData.strInstructions);
                 rawSteps = aiStats.steps;
                 if (!finalDesc) finalDesc = aiStats.description;
              }
            } else {
              // Last resort: Use AI to generate logical ingredients/stats
              const aiStats = await analyzeRecipeStats(data.title, data.description || "");
              if (rawIngredients.length === 0) rawIngredients = ["Ingredients not found - please check online"];
              if (rawSteps.length === 0) rawSteps = aiStats.steps;
              if (!finalDesc) finalDesc = aiStats.description;
            }
          }

          // ── Uniformly format ingredients to string[] ──
          const finalIngredients = (rawIngredients || []).map((ing: any) => {
            if (typeof ing === 'string') return ing;
            if (ing && typeof ing === 'object') {
              const amt = ing.amount ? `${ing.amount} ` : '';
              const unit = ing.unit ? `${ing.unit} ` : '';
              const name = ing.name || '';
              return `${amt}${unit}${name}`.trim();
            }
            return '';
          }).filter(Boolean);

          // ── Uniformly format steps to string[] ──
          const finalSteps = (rawSteps || []).map((st: any) => {
            if (typeof st === 'string') return st;
            if (st && typeof st === 'object') {
              return st.instruction || st.text || st.step_text || '';
            }
            return '';
          }).filter(Boolean);
          
          const newRecipe: Recipe = {
            id: data.id.toString(),
            title: data.title,
            subtitle: data.subtitle,
            description: finalDesc,
            image: data.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500',
            time: data.cook_time || '30 min',
            difficulty: data.difficulty || 'Medium',
            rating: Number(data.rating) || 0,
            servings: data.servings || '4',
            category: data.category || 'other',
            ingredients: finalIngredients,
            steps: finalSteps,
            equipment: finalEquip,
            tips: finalTips,
            author_id: data.category === 'web' ? undefined : data.user_id,
            author_name: data.category === 'web' ? 'Global Chef' : username,
            author_avatar: data.category === 'web' ? '' : avatarUrl
          };
          setRecipe(newRecipe);
          recipeData = newRecipe;
        }
      } catch (e) { console.error(e); }
    }
    
    setIsPantryChecking(false);
    setLoading(false);
    
    // Auto-check pantry after loading recipe
    if (recipeData) {
      checkPantryMatch(recipeData.ingredients);
    }
  };

  const checkPantryMatch = async (ingredients?: string[]) => {
    const targetIngredients = ingredients || recipe?.ingredients;
    if (!targetIngredients) return;

    try {
      const { data: pantry } = await supabase.from('inventory').select('*');
      if (pantry) {
        const result = await analyzeCookConsumption(targetIngredients, pantry);
        setAnalysis(result);
      }
    } catch (e) {
      console.error("Pantry check failed:", e);
    } finally {
      setIsPantryChecking(false);
    }
  };

  const startCooking = async () => {
    if (!recipe) return;

    if (analysis && analysis.missing.length > 0) {
      setIsPantrySyncVisible(true);
      return;
    }

    setIsCookModalVisible(true);
    setIsAnalyzing(true);
    
    try {
      const { data: pantry } = await supabase.from('inventory').select('*');
      if (pantry) {
        const result = await analyzeCookConsumption(recipe.ingredients, pantry);
        setAnalysis(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddMissingToPantry = async (missingItem: any) => {
    // This is for the inline "plus" button next to ingredients
    // We'll keep it simple or trigger the modal for this single item
    setIsPantrySyncVisible(true);
  };

  const handleFinishCooking = async () => {
    if (!analysis?.deductions || !recipe) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Auth required");

      // 1. Deduct stock from inventory
      for (const deduction of analysis.deductions) {
        const { data: current } = await supabase.from('inventory').select('quantity').eq('id', deduction.pantry_id).single();
        if (current) {
          const currentAmount = parseFloat(current.quantity) || 0;
          const newAmount = Math.max(0, currentAmount - deduction.amount_to_subtract);
          const unit = current.quantity.split(' ')[1] || deduction.unit;
          
          await supabase.from('inventory').update({ quantity: `${newAmount} ${unit}` }).eq('id', deduction.pantry_id);
        }
      }

      // 2. Record activity in database
      await supabase.from('activities').insert({
        user_id: user.id,
        type: 'cooked',
        item_name: recipe.title,
        metadata: { recipe_id: recipe.id }
      });

      showAlert("Chef's Kiss!", "Pantry updated and dish recorded in your history.");
      setIsCookModalVisible(false);
      router.replace('/(tabs)/activities');
    } catch (e) {
      console.error(e);
      showAlert("Error", "Failed to complete cooking session.");
    } finally {
      setLoading(false);
    }
  };

  const handleTimerPress = (stepText: string) => {
    if (activeTimer) {
      setActiveTimer(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      return;
    }
    const match = stepText.match(/(\d+)\s*(min|minute|hour)/i);
    if (match) {
      let mins = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('hour')) mins *= 60;
      const total = mins * 60;
      setActiveTimer({ seconds: total, totalSeconds: total, isActive: true });
    }
  };

  const handleTimerLongPress = () => {
    if (activeTimer) {
      setActiveTimer(prev => prev ? { ...prev, seconds: prev.totalSeconds, isActive: true } : null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.black} size="large" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Recipe not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonFallback}>
          <Text style={styles.backButtonFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={Colors.black} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isWebRecipe(recipe.id) ? 'Web Discovery' : 'Community Dish'}
        </Text>
      </View>

      <View style={styles.heroContainer}>
        <ImageBackground source={{ uri: recipe.image }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle}>{recipe.title}</Text>
        </ImageBackground>
      </View>

      <View style={styles.authorRow}>
        <TouchableOpacity 
          style={styles.authorBadge} 
          onPress={() => {
            if (recipe.author_id) {
              router.push(`/features/user/${recipe.author_id}`);
            }
          }}
          activeOpacity={0.7}
        >
          <Image 
            source={{ 
              uri: recipe.author_avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${recipe.author_name || 'Chef'}&size=150` 
            }} 
            style={styles.authorAvatar} 
          />
          <View>
            <Text style={styles.authorName}>{recipe.author_name || (isWebRecipe(recipe.id) ? 'Global Chef' : 'Chef User')}</Text>
            <Text style={styles.authorRole}>Recipe Creator</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
          <Heart size={24} color={isLiked ? '#FF5252' : Colors.textSecondary} fill={isLiked ? '#FF5252' : 'transparent'} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaTag}><Users color={Colors.black} size={16} /><Text style={styles.metaText}>{recipe.servings} servings</Text></View>
        <View style={styles.metaTag}><ChefHat color={Colors.black} size={16} /><Text style={styles.metaText}>{recipe.difficulty}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.divider} />
        <Text style={styles.descriptionText}>{recipe.description}</Text>
      </View>

      {recipe.ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.divider} />
          {recipe.ingredients.map((item, index) => {
            const isChecking = !analysis;
            const match = analysis?.missing.find(m => 
              item.toLowerCase().includes(m.name.toLowerCase()) || 
              m.name.toLowerCase().includes(item.toLowerCase().split(' ').pop() || '')
            );
            const isMissing = !!match;
            
            return (
              <View key={index} style={styles.ingredientRow}>
                {isChecking ? (
                  <ActivityIndicator size="small" color={Colors.textSecondary} style={styles.ingIcon} />
                ) : isMissing ? (
                  <X color="#FF4444" size={18} strokeWidth={3} style={styles.ingIcon} />
                ) : (
                  <CheckCircle2 color="#4CAF50" size={18} strokeWidth={3} style={styles.ingIcon} />
                )}
                <Text style={[
                  styles.ingredientText, 
                  !isChecking && isMissing && { color: '#FF4444', fontWeight: '500' }
                ]}>
                  {item}
                </Text>
                {!isChecking && isMissing && (
                  <TouchableOpacity 
                    onPress={() => handleAddMissingToPantry([match])}
                    style={styles.inlineAddBtn}
                  >
                    <Plus color="white" size={14} strokeWidth={3} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {recipe.equipment && recipe.equipment.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materials Needed</Text>
          <View style={styles.divider} />
          <View style={styles.equipmentContainer}>
            {recipe.equipment.map((item, index) => (
              <View key={index} style={styles.equipmentPill}>
                <ChefHat color={Colors.black} size={14} />
                <Text style={styles.equipmentText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {recipe.steps && recipe.steps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.divider} />
          {recipe.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {recipe.steps.length > 0 && (
        <TouchableOpacity 
          style={[
            styles.cookMainBtn, 
            { marginHorizontal: 20, marginTop: 10, height: 64, borderRadius: 32 },
            isPantryChecking && { opacity: 0.7 }
          ]} 
          onPress={startCooking} 
          activeOpacity={0.8}
          disabled={isPantryChecking}
        >
          {isPantryChecking ? (
            <ActivityIndicator color="white" style={{ marginRight: 10 }} />
          ) : (
            <View style={[styles.cookBtnIcon, { width: 36, height: 36, borderRadius: 18 }]}><Play color="white" size={20} fill="white" /></View>
          )}
          <Text style={[styles.cookMainBtnText, { fontSize: 16 }]}>
            {isPantryChecking ? "SYNCING PANTRY..." : "START COOKING SESSION"}
          </Text>
        </TouchableOpacity>
      )}
      
      {recipe.tips && recipe.tips.length > 0 && (
        <View style={styles.section}>
          <View style={styles.tipsContainer}>
            <View style={styles.tipsHeader}>
              <Sparkles color={Colors.black} size={22} />
              <Text style={styles.tipsTitle}>Chef Tips & Suggestions</Text>
            </View>
            {recipe.tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={{ height: 100 }} />
      
      {/* PANTRY SYNC MODAL */}
      <PantrySyncModal 
        visible={isPantrySyncVisible}
        onClose={() => setIsPantrySyncVisible(false)}
        missingIngredients={analysis?.missing || []}
        onSuccess={() => {
          setIsPantrySyncVisible(false);
          setIsCookModalVisible(true);
          checkPantryMatch(); // Refresh the dots
        }}
      />

      {/* INTERACTIVE COOK MODAL */}
      <Modal visible={isCookModalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.cookModalContainer}>
          <View style={styles.cookModalHeader}>
            <TouchableOpacity onPress={() => setIsCookModalVisible(false)}><X color="black" size={24} /></TouchableOpacity>
            <Text style={styles.cookModalTitle}>Cooking {recipe.title}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {isAnalyzing ? (
              <View style={styles.analysisContainer}>
                <ActivityIndicator color={Colors.black} />
                <Text style={styles.analysisText}>Checking pantry stock...</Text>
              </View>
            ) : (
              <View style={styles.cookBody}>
                {analysis && (currentStepIdx === 0) && (
                  <View style={styles.pantryReview}>
                    <Text style={styles.reviewTitle}>Pantry Check</Text>
                    {analysis.missing.length > 0 && (
                      <View style={styles.missingBox}>
                        <AlertCircle color="#FF4444" size={20} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.missingTitle}>Missing Ingredients</Text>
                          {analysis.missing.map((m, i) => <Text key={i} style={styles.missingItem}>• {m.name} ({m.amount_needed})</Text>)}
                        </View>
                      </View>
                    )}
                    <View style={styles.usageBox}>
                      <CheckCircle2 color="#4CAF50" size={20} />
                      <Text style={styles.usageTitle}>Using {analysis.deductions.length} pantry items</Text>
                    </View>
                  </View>
                )}

                <View style={styles.stepCard}>
                  <View style={styles.stepCardHeader}>
                    <Text style={styles.stepProgress}>Step {currentStepIdx + 1} of {recipe.steps.length}</Text>
                    <ChefHat color={Colors.black} size={24} />
                  </View>
                  <Text style={styles.stepBigText}>
                    {typeof recipe.steps[currentStepIdx] === 'string' 
                      ? recipe.steps[currentStepIdx] 
                      : (recipe.steps[currentStepIdx] as any)?.text || 'No step description.'}
                  </Text>
                  
                  {(() => {
                    const step = recipe.steps[currentStepIdx];
                    const stepText = typeof step === 'string' ? step : (step as any)?.text || '';
                    return stepText?.match(/(\d+)\s*(min|minute|hour)/i) ? (
                      <TouchableOpacity 
                        style={[
                          styles.timerBtn, 
                          activeTimer && styles.timerBtnActive,
                          activeTimer && !activeTimer.isActive && { backgroundColor: '#FFB300' } // amber for paused
                        ]} 
                        onPress={() => handleTimerPress(stepText)}
                        onLongPress={handleTimerLongPress}
                        delayLongPress={500}
                        activeOpacity={0.7}
                      >
                        <TimerIcon color={activeTimer ? "white" : "black"} size={20} />
                        <Text style={[styles.timerBtnText, activeTimer && { color: 'white' }]}>
                          {activeTimer 
                            ? `${Math.floor(activeTimer.seconds / 60)}:${(activeTimer.seconds % 60).toString().padStart(2, '0')}`
                            : "Start Timer"}
                        </Text>
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.cookFooter}>
            <TouchableOpacity 
              disabled={currentStepIdx === 0} 
              onPress={() => setCurrentStepIdx(prev => prev - 1)}
              style={[styles.navBtn, currentStepIdx === 0 && { opacity: 0.3 }]}
            >
              <ChevronLeft color="black" size={30} />
            </TouchableOpacity>

            {currentStepIdx === recipe.steps.length - 1 ? (
              <TouchableOpacity style={styles.finishBtn} onPress={handleFinishCooking}>
                <Text style={styles.finishBtnText}>Finish & Deduct Stock</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={() => setCurrentStepIdx(prev => prev + 1)}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>Next Step</Text>
                <ChevronRight color="white" size={24} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: Colors.textSecondary, marginBottom: 16 },
  backButtonFallback: { backgroundColor: Colors.black, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonFallbackText: { color: 'white', fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.black, marginLeft: 4 },
  heroContainer: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginBottom: 20, elevation: 4 },
  heroImage: { width: '100%', height: 240, justifyContent: 'flex-end' },
  heroImageRadius: { borderRadius: 24 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 24 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', padding: 24, zIndex: 1 },
  authorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  authorBadge: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  authorName: { fontSize: 16, fontWeight: '700', color: Colors.black },
  authorRole: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  likeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 24, gap: 10 },
  metaTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  metaText: { fontSize: 13, fontWeight: '600', color: Colors.black, marginLeft: 6 },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  divider: { height: 2, backgroundColor: Colors.black, width: 40, marginBottom: 16 },
  descriptionText: { fontSize: 16, color: Colors.textSecondary, lineHeight: 26, fontWeight: '500', fontStyle: 'italic' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: Colors.surface, padding: 12, borderRadius: 12 },
  ingIcon: { marginRight: 12 },
  ingredientText: { fontSize: 15, color: Colors.textPrimary, flex: 1, fontWeight: '600' },
  inlineAddBtn: { backgroundColor: Colors.black, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  equipmentContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  equipmentPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: '#EEE' },
  equipmentText: { fontSize: 14, color: Colors.black, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, backgroundColor: Colors.surface, padding: 16, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: Colors.black },
  stepNumberContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', marginRight: 14, marginTop: 2 },
  stepNumber: { color: 'white', fontSize: 12, fontWeight: '900' },
  stepText: { fontSize: 16, color: Colors.textPrimary, flex: 1, lineHeight: 24, fontWeight: '500' },
  tipsContainer: { 
    backgroundColor: '#FFFDE7', 
    borderRadius: 24, 
    padding: 24, 
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.accentGold,
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  tipsTitle: { fontSize: 20, fontWeight: '900', color: Colors.black, letterSpacing: 0.5 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accentGold, marginTop: 8, marginRight: 12 },
  tipText: { fontSize: 15, color: Colors.textPrimary, flex: 1, fontWeight: '500', lineHeight: 22 },
  cookMainBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#000', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 25, 
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  cookBtnIcon: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cookMainBtnText: { color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  cookModalContainer: { flex: 1, backgroundColor: Colors.background },
  cookModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20, 
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  cookModalTitle: { fontSize: 18, fontWeight: '900', color: Colors.black, letterSpacing: 0.5, textTransform: 'uppercase' },
  cookBody: { padding: 20 },
  analysisContainer: { padding: 80, alignItems: 'center', justifyContent: 'center' },
  analysisText: { marginTop: 20, color: Colors.textSecondary, fontWeight: '600', fontSize: 16 },
  pantryReview: { 
    backgroundColor: 'white', 
    borderRadius: 30, 
    padding: 24, 
    marginBottom: 24, 
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  reviewTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, color: Colors.black },
  missingBox: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF5F5', 
    padding: 20, 
    borderRadius: 20, 
    gap: 15, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE0E0'
  },
  missingTitle: { fontWeight: '900', color: '#FF4D4F', marginBottom: 4, fontSize: 14 },
  missingItem: { fontSize: 14, color: '#595959', fontWeight: '500' },
  usageBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F6FFED', 
    padding: 20, 
    borderRadius: 20, 
    gap: 15,
    borderWidth: 1,
    borderColor: '#D9F7BE'
  },
  usageTitle: { fontWeight: '900', color: '#52C41A', fontSize: 14 },
  stepCard: { 
    backgroundColor: 'white', 
    borderRadius: 40, 
    padding: 40, 
    minHeight: 420, 
    justifyContent: 'center', 
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.accentGold,
  },
  stepCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  stepProgress: { fontSize: 14, fontWeight: '900', color: Colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' },
  stepBigText: { fontSize: 30, fontWeight: '800', color: Colors.black, lineHeight: 44, textAlign: 'center' },
  timerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.black, 
    alignSelf: 'center', 
    marginTop: 50, 
    paddingHorizontal: 30, 
    paddingVertical: 18, 
    borderRadius: 35, 
    gap: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10
  },
  timerBtnActive: { backgroundColor: Colors.accentGold },
  timerBtnText: { fontWeight: '900', fontSize: 18, color: 'white' },
  cookFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 25, 
    backgroundColor: Colors.background, 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0', 
    paddingBottom: Platform.OS === 'ios' ? 40 : 25 
  },
  navBtn: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#F5F5F5', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  nextBtn: { 
    flex: 1, 
    height: 64, 
    backgroundColor: '#1A1A1A', 
    borderRadius: 32, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10
  },
  nextBtnText: { color: 'white', fontSize: 18, fontWeight: '900', marginRight: 10, letterSpacing: 0.5 },
  finishBtn: { 
    flex: 1, 
    height: 64, 
    backgroundColor: '#52C41A', 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 15,
    shadowColor: '#52C41A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10
  },
  finishBtnText: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  pantryMatchCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  matchSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  matchIndicator: { width: 12, height: 12, borderRadius: 6 },
  matchText: { fontSize: 15, fontWeight: '700', color: Colors.black },
  missingList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  missingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#FFEAEA' },
  missingPillText: { fontSize: 12, color: '#FF4444', fontWeight: '600' },
  
  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertContainer: { backgroundColor: 'white', borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 40, elevation: 20 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  alertTitle: { fontSize: 22, fontWeight: '900', color: Colors.black, flex: 1 },
  alertMessage: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24, marginBottom: 32, fontWeight: '500' },
  alertActions: { gap: 12 },
  alertBtn: { 
    height: 60, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5',
    width: '100%'
  },
  alertBtnSecondary: { backgroundColor: '#F5F5F5' },
  alertBtnTextSecondary: { color: Colors.black, fontWeight: '700' },
  alertBtnAddAll: { 
    backgroundColor: '#FFFBE6', 
    borderWidth: 2, 
    borderColor: Colors.accentGold,
    marginBottom: 4 
  },
  alertBtnTextAddAll: { color: Colors.black, fontWeight: '900' },
  alertBtnPrimary: { 
    backgroundColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  alertBtnCancel: { 
    backgroundColor: 'transparent',
    height: 44, // Shorter for the secondary action
  },
  alertBtnText: { fontSize: 16, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  alertBtnTextPrimary: { color: 'white' },
  alertBtnTextCancel: { color: Colors.textSecondary, fontWeight: '700' },

  // Figma Style Modal
  figmaAlertTitle: { fontSize: 28, fontWeight: '900', color: Colors.black, textAlign: 'center', marginBottom: 12 },
  figmaAlertSubtitle: { fontSize: 16, color: Colors.textPrimary, textAlign: 'center', lineHeight: 22, marginBottom: 24, fontWeight: '600', paddingHorizontal: 10 },
  figmaList: { maxHeight: 300, marginBottom: 20 },
  figmaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5' 
  },
  figmaItemName: { fontSize: 17, color: Colors.black, fontWeight: '700' },
  figmaNeededText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },
  figmaInputGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  figmaQuantityInput: { 
    width: 60, 
    height: 40, 
    backgroundColor: '#F5F5F5', 
    borderRadius: 12, 
    paddingHorizontal: 8, 
    fontSize: 14, 
    fontWeight: '700', 
    color: Colors.black, 
    textAlign: 'center' 
  },
  figmaUnitBtn: {
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  figmaUnitText: { fontSize: 13, fontWeight: '800', color: Colors.black },
  figmaConfirmBtn: { 
    width: 36, 
    height: 36, 
    backgroundColor: Colors.black, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },

  // Unit Picker Styles
  unitPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  unitPickerContainer: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  unitPickerTitle: { fontSize: 20, fontWeight: '900', color: Colors.black, marginBottom: 25, textAlign: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  unitOption: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  unitOptionActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  unitOptionText: { fontSize: 15, fontWeight: '700', color: Colors.black },
  unitOptionTextActive: { color: 'white' },
  unitPickerClose: { marginTop: 30, alignItems: 'center' },
  unitPickerCloseText: { fontSize: 16, fontWeight: '800', color: '#FF4444' },
});
