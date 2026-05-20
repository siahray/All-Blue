import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList, Image,
  ScrollView, ActivityIndicator, TextInput, Keyboard, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '../../../theme/colors';
import { Recipe } from '../../../data/recipes';
import { BackToTop } from '../../../components/common/BackToTop';
import { Search, X, ArrowLeft, Globe, TrendingUp, Sparkles, ShoppingBag, Users } from 'lucide-react-native';
import { supabase } from '../../../services/supabase';
import { RecipeCard } from './RecipeCard';
import { WebSourceBar, WebSourceType } from './WebSourceBar';
import { fetchWordPressRecipes, fetchMealDBRecipes, mapDbRecipes } from './useRecipeFeed';

type SearchType = 'Recipes' | 'Users';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 6;
type TabType = 'Popular' | 'Following' | 'For You' | 'In Stock' | 'Web';

const TABS: { id: TabType; icon: React.ReactNode; label: string }[] = [
  { id: 'Popular', icon: <TrendingUp size={14} color="inherit" />, label: 'Popular' },
  { id: 'Following', icon: <Users size={14} color="inherit" />, label: 'Following' },
  { id: 'For You', icon: <Sparkles size={14} color="inherit" />, label: 'For You' },
  { id: 'In Stock', icon: <ShoppingBag size={14} color="inherit" />, label: 'In Stock' },
  { id: 'Web', icon: <Globe size={14} color="inherit" />, label: 'Web' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Popular');
  const [webSource, setWebSource] = useState<WebSourceType>('All');
  const [inventory, setInventory] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('Recipes');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const { filter } = useLocalSearchParams<{ filter?: string }>();

  useEffect(() => { if (filter) { setSearchQuery(filter); setIsSearchActive(true); } }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (searchType === 'Users' && debouncedQuery.trim().length >= 1) {
      setSearchingUsers(true);
      supabase.from('profiles').select('id, username, full_name, avatar_url')
        .ilike('username', `%${debouncedQuery}%`)
        .limit(20)
        .then(({ data }) => { setUserResults(data || []); setSearchingUsers(false); });
    } else {
      setUserResults([]);
    }
  }, [debouncedQuery, searchType]);

  const fetchLiked = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('saved_recipes').select('recipe_id').eq('user_id', session.user.id);
      if (data) setLikedRecipes(new Set(data.map((i: any) => i.recipe_id.toString())));
    }
  };

  const toggleLike = useCallback(async (recipe: Recipe) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user; if (!user) return;
    const id = recipe.id; const isLiked = likedRecipes.has(id);
    setLikedRecipes(prev => { const n = new Set(prev); isLiked ? n.delete(id) : n.add(id); return n; });
    try {
      if (isLiked) {
        await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', id);
      } else {
        let dbId = id;
        if (id.toString().startsWith('web-')) {
          const { data: existing } = await supabase.from('recipes').select('id').eq('title', recipe.title).eq('image_url', recipe.image).single();
          if (existing) { dbId = existing.id.toString(); }
          else {
            const { data: newR } = await supabase.from('recipes').insert({ title: recipe.title, subtitle: recipe.subtitle, description: recipe.description || '', image_url: recipe.image, cook_time: recipe.time, ingredients: recipe.ingredients, steps: recipe.steps || [], category: recipe.category || 'other', rating: recipe.rating, equipment: recipe.equipment || [], tips: recipe.tips || [], user_id: user.id }).select().single();
            if (newR) dbId = newR.id.toString();
          }
        }
        await supabase.from('saved_recipes').insert({ user_id: user.id, recipe_id: dbId });
      }
    } catch {
      setLikedRecipes(prev => { const n = new Set(prev); isLiked ? n.add(id) : n.delete(id); return n; });
    }
  }, [likedRecipes]);

  useFocusEffect(useCallback(() => {
    const init = async () => {
      try {
        await new Promise(r => setTimeout(r, 600));
        const { data: { session } } = await supabase.auth.getSession();
        const { data: inv } = await supabase.from('inventory').select('name');
        if (inv) setInventory(inv.map((i: any) => i.name.toLowerCase()));
        await fetchLiked();
        setPage(0); setHasMore(true);
        await fetchData(0, true, false, session?.user ?? null, inv?.map((i: any) => i.name.toLowerCase()) ?? [], false);
      } catch (e) { console.error('Init Home Screen Error:', e); }
    };
    init();
  }, [activeTab, debouncedQuery, webSource]));

  const fetchData = async (currentPage: number, isReset = false, silent = false, currentUser: any = null, currentInventory: string[] = inventory, forceRefresh = false) => {
    if (isReset) { if (!silent) setLoading(true); } else { setLoadingMore(true); }
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    let newResults: Recipe[] = [];

    try {
      const isUrl = searchQuery.trim().startsWith('http') || searchQuery.trim().includes('.');
      if (isReset && isUrl && searchQuery.trim().length > 4 && !searchQuery.trim().includes(' ')) {
        const url = searchQuery.trim();
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
        const domain = cleanUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
        const urlCard: Recipe = {
          id: `web-url-${encodeURIComponent(cleanUrl)}`,
          title: `🌐 BROWSE & PARSE RECIPE`,
          subtitle: `${domain.toUpperCase()} • Direct Web Import`,
          description: `Import and view "${cleanUrl}" cleanly in your kitchen dashboard, completely free of ads!`,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
          time: "Web Link",
          difficulty: "Direct",
          rating: 4.9,
          servings: "Dynamic",
          category: "web",
          ingredients: [],
          steps: [],
          equipment: [],
          tips: [],
          author_name: domain.split('.')[0].toUpperCase(),
          author_avatar: `https://api.dicebear.com/7.x/identicon/png?seed=${domain.split('.')[0]}`
        };
        setRecipes([urlCard]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (activeTab === 'Popular') {
        const { data: dbData, error: dbErr } = await supabase.from('recipes').select('*').neq('category', 'web');
        let dbRecipes: Recipe[] = !dbErr && dbData ? await mapDbRecipes(dbData, supabase) : [];
        const { data: likesData } = await supabase.from('saved_recipes').select('recipe_id');
        const likeCounts: Record<string, number> = {};
        likesData?.forEach((item: any) => { likeCounts[item.recipe_id] = (likeCounts[item.recipe_id] || 0) + 1; });
        let webRecipes: Recipe[] = [];
        try {
          const res = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=');
          const json = await res.json();
          let meals = json.meals || [];
          const extras = await Promise.all(['c', 'p', 's'].map(c => fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${c}`).then(r => r.json()).catch(() => ({ meals: null }))));
          extras.forEach(e => { if (e.meals) meals = [...meals, ...e.meals]; });
          const unique = Array.from(new Map(meals.map((m: any) => [m?.idMeal, m])).values()).filter(Boolean);
          webRecipes = (unique as any[]).map((meal: any) => {
            const ings: string[] = [];
            for (let i = 1; i <= 20; i++) { if (meal[`strIngredient${i}`]?.trim()) ings.push(meal[`strIngredient${i}`].trim()); }
            return { id: `web-popular-${meal.idMeal}`, title: meal.strMeal.toUpperCase(), subtitle: `Popular • ${meal.strArea} Cuisine`, description: meal.strInstructions, image: meal.strMealThumb, time: '30 min', difficulty: 'Medium', rating: Number((4.0 + (Number(meal.idMeal) % 10) / 10).toFixed(1)), servings: '4', category: 'web', ingredients: ings, steps: [meal.strInstructions], equipment: [], tips: [], author_name: `${meal.strArea} Chef` };
          });
        } catch {}
        if (debouncedQuery) {
          const q = debouncedQuery.toLowerCase();
          dbRecipes = dbRecipes.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
          webRecipes = webRecipes.filter(r => r.title.toLowerCase().includes(q));
        }
        const merged = [...dbRecipes, ...webRecipes].map(r => {
          const idStr = r.id.toString();
          const mockLikes = idStr.startsWith('web-') ? (Number(idStr.replace(/\D/g, '')) % 45) + 3 : 0;
          return { ...r, popularity: (likeCounts[r.id] || 0) + mockLikes };
        }).sort((a: any, b: any) => b.popularity - a.popularity);
        newResults = merged.slice(from, to + 1);
        setHasMore(to + 1 < merged.length);
      }

      else if (activeTab === 'Following') {
        if (!currentUser) { newResults = []; setHasMore(false); }
        else {
          const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id);
          if (!follows?.length) { newResults = []; setHasMore(false); }
          else {
            const ids = follows.map((f: any) => f.following_id);
            let q = supabase.from('recipes').select('*', { count: 'exact' }).in('user_id', ids).neq('category', 'web').order('created_at', { ascending: false });
            if (debouncedQuery) q = q.ilike('title', `%${debouncedQuery}%`);
            const { data, count } = await q.range(from, to);
            if (data) { newResults = await mapDbRecipes(data, supabase); setHasMore(count !== null && from + data.length < count); }
            else { newResults = []; setHasMore(false); }
          }
        }
      }

      else if (activeTab === 'For You') {
        const hour = new Date().getHours();
        let webCategory = 'Beef'; let keywords = ['steak', 'chicken', 'curry'];
        if (hour >= 6 && hour < 11) { webCategory = 'Breakfast'; keywords = ['egg', 'pancake', 'toast', 'oat']; }
        else if (hour >= 11 && hour < 17) { webCategory = 'Pasta'; keywords = ['sandwich', 'salad', 'pasta', 'wrap']; }
        else if (hour < 6) { webCategory = 'Dessert'; keywords = ['cookie', 'cake', 'sweet']; }
        const { data: dbData } = await supabase.from('recipes').select('*, profiles:user_id(username)');
        const q = debouncedQuery.toLowerCase();
        let dbMatched: Recipe[] = dbData ? (await mapDbRecipes(dbData.filter((r: any) => keywords.some(kw => r.title?.toLowerCase().includes(kw) || r.description?.toLowerCase().includes(kw))), supabase)).filter(r => !q || r.title.toLowerCase().includes(q)) : [];
        let webMatched: Recipe[] = [];
        try {
          const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${webCategory}`);
          const json = await res.json();
          if (json.meals) {
            const details = await Promise.all(json.meals.slice(0, 12).map(async (m: any) => {
              try {
                const dr = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`); const dj = await dr.json();
                if (dj.meals?.[0]) {
                  const meal = dj.meals[0]; const ings: string[] = [];
                  for (let i = 1; i <= 20; i++) { if (meal[`strIngredient${i}`]?.trim()) ings.push(meal[`strIngredient${i}`].trim()); }
                  return { id: `web-foryou-${meal.idMeal}`, title: meal.strMeal.toUpperCase(), subtitle: 'For You • Recommended', description: meal.strInstructions, image: meal.strMealThumb, time: '30 min', difficulty: 'Easy', rating: 4.5, servings: '2', category: 'web', ingredients: ings, steps: [meal.strInstructions], equipment: [], tips: [], author_name: 'Premium Chef' };
                }
              } catch {} return null;
            }));
            webMatched = details.filter((d): d is Recipe => d !== null).filter(r => !q || r.title.toLowerCase().includes(q));
          }
        } catch {}
        const merged = [...dbMatched, ...webMatched].sort((a, b) => b.rating - a.rating);
        newResults = merged.slice(from, to + 1); setHasMore(to + 1 < merged.length);
      }

      else if (activeTab === 'In Stock') {
        const { data: dbData } = await supabase.from('recipes').select('*, profiles:user_id(username)');
        const q = debouncedQuery.toLowerCase();
        const matchRate = (ings: any[]) => {
          if (!ings?.length) return 0;
          const matched = ings.filter((ing: any) => { const n = typeof ing === 'string' ? ing : ing.name; return n && currentInventory.some(inv => n.toLowerCase().includes(inv) || inv.includes(n.toLowerCase())); });
          return matched.length / ings.length;
        };
        let dbMatched: Recipe[] = dbData ? (await mapDbRecipes(dbData, supabase)).filter(r => matchRate(r.ingredients) >= 0.7 && (!q || r.title.toLowerCase().includes(q))) : [];
        let webMatched: Recipe[] = [];
        if (currentPage === 0 && currentInventory.length > 0) {
          const sample = [...currentInventory].sort(() => 0.5 - Math.random()).slice(0, 4);
          const all = await Promise.all(sample.map(async ing => {
            try {
              const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${ing}`); const json = await res.json();
              return (json.meals || []).filter((m: any) => {
                const ings: string[] = []; for (let i = 1; i <= 20; i++) { if (m[`strIngredient${i}`]?.trim()) ings.push(m[`strIngredient${i}`].trim()); }
                const rate = ings.length > 0 ? ings.filter(i => currentInventory.some(inv => i.toLowerCase().includes(inv))).length / ings.length : 0;
                return rate >= 0.7;
              }).map((meal: any) => {
                const ings: string[] = []; for (let i = 1; i <= 20; i++) { if (meal[`strIngredient${i}`]?.trim()) ings.push(meal[`strIngredient${i}`].trim()); }
                return { id: `web-stock-${meal.idMeal}`, title: meal.strMeal.toUpperCase(), subtitle: `In Stock • ${meal.strArea}`, description: meal.strInstructions, image: meal.strMealThumb, time: '30 min', difficulty: 'Easy', rating: 4.3, servings: '2', category: 'web', ingredients: ings, steps: [meal.strInstructions], equipment: [], tips: [], author_name: `${meal.strArea} Chef` };
              });
            } catch { return []; }
          }));
          const seen = new Set<string>();
          webMatched = all.flat().filter(r => { if (seen.has(r.id) || seen.has(r.title)) return false; seen.add(r.id); seen.add(r.title); return !q || r.title.toLowerCase().includes(q); });
        }
        const merged = [...dbMatched, ...webMatched];
        newResults = merged.slice(from, to + 1); setHasMore(to + 1 < merged.length);
      } else if (activeTab === 'Web') {
        const queryTerm = debouncedQuery || searchQuery;
        if (currentPage === 0) {
          if (webSource === 'All') {
            const [mdb, kp, poy, bb, mb, oc, ie, vr] = await Promise.all([
              fetchMealDBRecipes(queryTerm, 0),
              fetchWordPressRecipes('www.kawalingpinoy.com', 'Kawaling Pinoy', 'Authentic Filipino', queryTerm),
              fetchWordPressRecipes('pinchofyum.com', 'Pinch of Yum', 'Modern Comfort', queryTerm),
              fetchWordPressRecipes('www.budgetbytes.com', 'Budget Bytes', 'Easy & Low-Cost', queryTerm),
              fetchWordPressRecipes('minimalistbaker.com', 'Minimalist Baker', 'Healthy & Simple', queryTerm),
              fetchWordPressRecipes('omnivorescookbook.com', 'Omnivore\'s Cookbook', 'Chinese & Asian', queryTerm),
              fetchWordPressRecipes('www.isabeleats.com', 'Isabel Eats', 'Authentic Mexican', queryTerm),
              fetchWordPressRecipes('www.veganricha.com', 'Vegan Richa', 'Indian & Plant-Based', queryTerm),
            ]);
            const max = Math.max(mdb.length, kp.length, poy.length, bb.length, mb.length, oc.length, ie.length, vr.length);
            for (let i = 0; i < max; i++) {
              if (i < kp.length) newResults.push(kp[i]);
              if (i < poy.length) newResults.push(poy[i]);
              if (i < mdb.length) newResults.push(mdb[i]);
              if (i < bb.length) newResults.push(bb[i]);
              if (i < mb.length) newResults.push(mb[i]);
              if (i < oc.length) newResults.push(oc[i]);
              if (i < ie.length) newResults.push(ie[i]);
              if (i < vr.length) newResults.push(vr[i]);
            }
          } else if (webSource === 'MealDB') newResults = await fetchMealDBRecipes(queryTerm, 0);
          else if (webSource === 'KawalingPinoy') newResults = await fetchWordPressRecipes('www.kawalingpinoy.com', 'Kawaling Pinoy', 'Authentic Filipino', queryTerm);
          else if (webSource === 'PinchOfYum') newResults = await fetchWordPressRecipes('pinchofyum.com', 'Pinch of Yum', 'Modern Comfort', queryTerm);
          else if (webSource === 'BudgetBytes') newResults = await fetchWordPressRecipes('www.budgetbytes.com', 'Budget Bytes', 'Easy & Low-Cost', queryTerm);
          else if (webSource === 'MinimalistBaker') newResults = await fetchWordPressRecipes('minimalistbaker.com', 'Minimalist Baker', 'Healthy & Simple', queryTerm);
          else if (webSource === 'OmnivoresCookbook') newResults = await fetchWordPressRecipes('omnivorescookbook.com', 'Omnivore\'s Cookbook', 'Chinese & Asian', queryTerm);
          else if (webSource === 'IsabelEats') newResults = await fetchWordPressRecipes('www.isabeleats.com', 'Isabel Eats', 'Authentic Mexican', queryTerm);
          else if (webSource === 'VeganRicha') newResults = await fetchWordPressRecipes('www.veganricha.com', 'Vegan Richa', 'Indian & Plant-Based', queryTerm);
          setHasMore(newResults.length >= 5);
        } else {
          newResults = await fetchMealDBRecipes(queryTerm, currentPage);
          if (webSource === 'KawalingPinoy') newResults = await fetchWordPressRecipes('www.kawalingpinoy.com', 'Kawaling Pinoy', 'Authentic Filipino', queryTerm, currentPage + 1);
          else if (webSource === 'PinchOfYum') newResults = await fetchWordPressRecipes('pinchofyum.com', 'Pinch of Yum', 'Modern Comfort', queryTerm, currentPage + 1);
          else if (webSource === 'BudgetBytes') newResults = await fetchWordPressRecipes('www.budgetbytes.com', 'Budget Bytes', 'Easy & Low-Cost', queryTerm, currentPage + 1);
          else if (webSource === 'MinimalistBaker') newResults = await fetchWordPressRecipes('minimalistbaker.com', 'Minimalist Baker', 'Healthy & Simple', queryTerm, currentPage + 1);
          else if (webSource === 'OmnivoresCookbook') newResults = await fetchWordPressRecipes('omnivorescookbook.com', 'Omnivore\'s Cookbook', 'Chinese & Asian', queryTerm, currentPage + 1);
          else if (webSource === 'IsabelEats') newResults = await fetchWordPressRecipes('www.isabeleats.com', 'Isabel Eats', 'Authentic Mexican', queryTerm, currentPage + 1);
          else if (webSource === 'VeganRicha') newResults = await fetchWordPressRecipes('www.veganricha.com', 'Vegan Richa', 'Indian & Plant-Based', queryTerm, currentPage + 1);
          setHasMore(newResults.length > 0);
        }
      }
      if (isReset) {
          // When a forced refresh is requested (e.g., Back‑to‑Top), randomise order for a fresh feel
          if (forceRefresh) {
            const shuffledReset = [...newResults];
            for (let i = shuffledReset.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledReset[i], shuffledReset[j]] = [shuffledReset[j], shuffledReset[i]];
            }
            newResults = shuffledReset;
          }
        if (isSearchActive && searchType === 'Recipes' && searchQuery.trim().length > 2) {
          const aiCard = {
            id: `web-ai-${searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title: `✨ CREATE "${searchQuery.toUpperCase()}" WITH AI`,
            subtitle: "AI Magic • Instant World Cuisine",
            description: `Let our AI Chef craft an authentic, step-by-step recipe for "${searchQuery}" dynamically from scratch!`,
            image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",
            time: "Instant",
            difficulty: "Medium",
            rating: 5.0,
            servings: "Custom",
            category: "web",
            ingredients: [],
            steps: [],
            equipment: [],
            tips: [],
            author_name: "Magic AI Chef",
            author_avatar: "https://api.dicebear.com/7.x/identicon/png?seed=magicaichef"
          };
          const shuffled = [...newResults];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          if (shuffled.length === 0) {
            setRecipes([aiCard]);
          } else {
            setRecipes([...shuffled, aiCard]);
          }
        } else {
          const shuffled = [...newResults];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setRecipes(shuffled);
        }
      } else {
        setRecipes(prev => { const ids = new Set(prev.map(r => r.id)); return [...prev, ...newResults.filter(r => !ids.has(r.id))]; });
      }

    } catch (e) { console.error('fetchData error:', e); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    const nextPage = page + 1; setPage(nextPage);
    await fetchData(nextPage, false, false, null, inventory, false);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab); setPage(0); setHasMore(true); setRecipes([]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        {isSearchActive ? (
          <View style={styles.searchBar}>
            <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchQuery(''); setUserResults([]); setSearchType('Recipes'); }} style={styles.backBtn}>
              <ArrowLeft color={Colors.black} size={22} />
            </TouchableOpacity>
            <View style={styles.searchField}>
              <Search size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={searchType === 'Users' ? 'Search users...' : 'Search recipes...'}
                value={searchQuery}
                onChangeText={setSearchQuery} autoFocus autoCapitalize="none"
                onSubmitEditing={Keyboard.dismiss}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
                  <X size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={styles.innerToggleContainer}>
                <TouchableOpacity
                  style={[styles.innerToggleBtn, searchType === 'Recipes' && styles.innerToggleBtnActive]}
                  onPress={() => { setSearchType('Recipes'); setSearchQuery(''); setUserResults([]); }}
                >
                  <Text style={[styles.innerToggleText, searchType === 'Recipes' && styles.innerToggleTextActive]}>Recipes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.innerToggleBtn, searchType === 'Users' && styles.innerToggleBtnActive]}
                  onPress={() => { setSearchType('Users'); setSearchQuery(''); setUserResults([]); }}
                >
                  <Text style={[styles.innerToggleText, searchType === 'Users' && styles.innerToggleTextActive]}>Users</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View><Text style={styles.headerTitle}>All Blue</Text><Text style={styles.headerSubtitle}>Discover & cook</Text></View>
            <TouchableOpacity style={styles.searchIconBtn} onPress={() => setIsSearchActive(true)}>
              <Search size={20} color={Colors.black} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Tabs */}
      <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map(t => {
              const isActive = activeTab === t.id;
              return (
                <TouchableOpacity key={t.id} style={[styles.tab, isActive && styles.tabActive]} onPress={() => handleTabChange(t.id)}>
                  <View style={styles.tabContent}>
                                        {React.cloneElement(t.icon as any, { color: isActive ? 'white' : Colors.textSecondary })}
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
      </View>

      {/* Web Source Bar */}
      {activeTab === 'Web' && <WebSourceBar selected={webSource} onSelect={src => { setWebSource(src); setPage(0); setRecipes([]); }} />}

      {/* User Search Results */}
      {isSearchActive && searchType === 'Users' ? (
        searchingUsers ? (
          <ActivityIndicator color={Colors.black} style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={userResults}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>👤</Text>
                <Text style={styles.emptyText}>{debouncedQuery.length > 0 ? 'No users found.' : 'Start typing to search for users.'}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/features/user/${item.id}`)}>
                <Image
                  source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.id}&size=200` }}
                  style={styles.userAvatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userUsername}>@{item.username || 'user'}</Text>
                  <Text style={styles.userFullName}>{item.full_name || ''}</Text>
                </View>
                <Users size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        )
      ) : loading ? (
        <ActivityIndicator color={Colors.black} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={recipes}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onScroll={e => setShowBackToTop(e.nativeEvent.contentOffset.y > 600)}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.black} style={{ marginVertical: 20 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>{activeTab === 'In Stock' ? '🛒' : activeTab === 'Following' ? '👥' : '🍽️'}</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'In Stock' ? 'No recipes match your pantry items.' : activeTab === 'Following' ? 'Follow chefs to see their recipes here.' : 'No recipes found.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <RecipeCard
                recipe={item}
                isLiked={likedRecipes.has(item.id.toString())}
                onLike={() => toggleLike(item)}
                onPress={() => router.push(`/features/recipe/${item.id.toString()}`)}
              />
            </View>
          )}
        />
      )}

      <BackToTop visible={showBackToTop} onPress={async () => { listRef.current?.scrollToOffset({ offset: 0, animated: true }); setPage(0); setHasMore(true); setRecipes([]); await fetchData(0, true, false, null, inventory, true); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerContainer: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.black },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  searchIconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  searchField: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, fontSize: 15, color: Colors.black },
  tabScroll: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  tab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#EFEFEF', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  tabActive: { backgroundColor: Colors.black, borderColor: Colors.black, elevation: 3 },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: 'white', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  cardWrapper: { marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500', paddingHorizontal: 32 },
  // Inner Toggle Selector
  innerToggleContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 2, marginLeft: 6 },
  innerToggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  innerToggleBtnActive: { backgroundColor: Colors.black },
  innerToggleText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  innerToggleTextActive: { color: 'white' },
  // Tab content wrapper with icon and label
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // User result rows
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0', elevation: 1 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F5F5' },
  userInfo: { flex: 1, marginLeft: 12 },
  userUsername: { fontSize: 15, fontWeight: '700', color: Colors.black },
  userFullName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
