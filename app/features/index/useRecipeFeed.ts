import { Recipe } from '../../../data/recipes';
import { supabase } from '../../../services/supabase';
import { WebSourceType, WEB_SOURCES } from './WebSourceBar';

export async function fetchWordPressRecipes(
  domain: string, sourceLabel: string, subtitle: string,
  searchQuery?: string, page = 1
): Promise<Recipe[]> {
  try {
    let url = `https://${domain}/wp-json/wp/v2/posts?_embed=1&per_page=10&page=${page}`;
    if (searchQuery?.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(url);
    const posts = await res.json();
    if (!Array.isArray(posts)) return [];
    return posts.map((post: any) => {
      const html = post.content?.rendered || '';
      const parseList = (regexes: RegExp[]) => {
        const items: string[] = [];
        for (const re of regexes) {
          let m; while ((m = re.exec(html)) !== null) {
            const clean = m[1].replace(/<[^>]*>/g, '').replace(/&#32;/g, ' ').replace(/&#189;/g, '1/2').replace(/&#188;/g, '1/4').replace(/&#190;/g, '3/4').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
            if (clean) items.push(clean);
          }
          if (items.length > 0) break;
        }
        return items;
      };
      const ingredients = parseList([
        /class="[^"]*wprm-recipe-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
        /class="[^"]*tasty-recipes-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
      ]);
      const steps = parseList([
        /class="[^"]*wprm-recipe-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
        /class="[^"]*tasty-recipes-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
      ]);
      const cleanExcerpt = post.excerpt?.rendered?.replace(/<[^>]*>/g, '').replace(/&hellip;/g, '...').replace(/\s+/g, ' ').trim() || '';
      const image = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500';
      const titleUpper = (post.title?.rendered || 'RECIPE').replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&amp;/g, '&').replace(/<[^>]*>/g, '').toUpperCase();
      const keyPrefix = sourceLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
      return {
        id: `web-${keyPrefix}-${post.id}`, title: titleUpper,
        subtitle: `${sourceLabel} • ${subtitle}`,
        description: cleanExcerpt || `A delicious recipe from ${sourceLabel}.`, image,
        time: '30-45 min', difficulty: 'Medium',
        rating: Number((4.5 + (post.id % 5) / 10).toFixed(1)), servings: '4', category: 'web',
        ingredients: ingredients.length > 0 ? ingredients : ['Ingredients listed on website'],
        steps: steps.length > 0 ? steps : [`Follow instructions on ${domain}`],
        equipment: [], tips: [], author_name: sourceLabel,
        author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=${keyPrefix}`,
      };
    });
  } catch (e) { console.warn(`Failed fetching from ${domain}:`, e); return []; }
}

export async function fetchMealDBRecipes(query: string, page: number): Promise<Recipe[]> {
  try {
    if (page === 0) {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query || 'c')}`);
      const data = await res.json();
      if (!data.meals) return [];
      return data.meals.slice(0, 20).map((meal: any) => {
        const ingredients: string[] = [];
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`]; const measure = meal[`strMeasure${i}`];
          if (ing?.trim()) ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`);
        }
        return {
          id: `web-popular-${meal.idMeal}`, title: meal.strMeal?.toUpperCase() || 'UNKNOWN',
          subtitle: `Popular • ${meal.strArea} Cuisine`, description: meal.strInstructions,
          image: meal.strMealThumb, time: '30-45 min', difficulty: 'Medium',
          rating: Number((4 + (Number(meal.idMeal) % 10) / 10).toFixed(1)), servings: '4', category: 'web',
          ingredients, steps: meal.strInstructions ? [meal.strInstructions] : [],
          equipment: [], tips: [], author_name: 'TheMealDB',
          author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=mealdb`,
        };
      });
    }
    // Random on subsequent pages
    const randoms = await Promise.all(
      Array(8).fill(null).map(() => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json()).catch(() => ({ meals: null })))
    );
    return randoms.flatMap(data => {
      if (!data.meals?.[0]) return [];
      const meal = data.meals[0];
      const ingredients: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`]; const measure = meal[`strMeasure${i}`];
        if (ing?.trim()) ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`);
      }
      return [{
        id: `web-popular-${meal.idMeal}`, title: meal.strMeal?.toUpperCase() || 'DISCOVERY',
        subtitle: `Discovery • ${meal.strArea} Cuisine`, description: meal.strInstructions,
        image: meal.strMealThumb, time: '40-55 min', difficulty: 'Medium',
        rating: Number((4.5 + (Number(meal.idMeal) % 5) / 10).toFixed(1)), servings: '4', category: 'web',
        ingredients, steps: meal.strInstructions ? [meal.strInstructions] : [],
        equipment: [], tips: [], author_name: 'TheMealDB',
        author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=mealdb`,
      }];
    });
  } catch { return []; }
}

export async function mapDbRecipes(dbData: any[], supabaseClient: typeof supabase): Promise<Recipe[]> {
  const userIds = [...new Set(dbData.map((r: any) => r.user_id).filter(Boolean))] as string[];
  let profileMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseClient.from('profiles').select('id, username, avatar_url').in('id', userIds);
    if (profiles) profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
  }
  return dbData.map((r: any) => ({
    id: r.id, title: r.title, subtitle: r.subtitle, description: r.description,
    image: r.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500',
    time: r.cook_time || '30 min', difficulty: r.difficulty || 'Medium',
    rating: Number(r.rating) || 0, servings: r.servings || '4', category: r.category || 'other',
    ingredients: r.ingredients || [], steps: r.steps || [],
    equipment: r.equipment || [], tips: r.tips || [],
    author_id: r.user_id,
    author_name: r.user_id ? profileMap[r.user_id]?.username || 'Chef User' : 'Chef User',
    author_avatar: r.user_id ? profileMap[r.user_id]?.avatar_url : undefined,
  }));
}

export default null;
