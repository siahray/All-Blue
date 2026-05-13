import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { Recipe } from '../../data/recipes';
import { 
  Search, 
  Heart, 
  Clock, 
  ChefHat, 
  Star, 
  Users, 
  Sparkles, 
  ShoppingBag,
  TrendingUp,
  Globe,
  X,
  ArrowLeft,
  Plus
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');

type TabType = 'Popular' | 'Following' | 'For You' | 'In Stock' | 'Web Search';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Popular');
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set());
  const [inventory, setInventory] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, inventory, searchQuery]);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('name');
    if (data) {
      setInventory(data.map(item => item.name.toLowerCase()));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    let allResults: Recipe[] = [];

    // 1. Fetch from Web if searching or in web tab
    if (activeTab === 'Web Search' || (searchQuery.length > 2)) {
      try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchQuery}`);
        const data = await response.json();
        if (data.meals) {
          const webItems = data.meals.map((meal: any) => ({
            id: `web-${meal.idMeal}`,
            title: meal.strMeal.toUpperCase(),
            subtitle: `A classic ${meal.strArea} dish`,
            description: meal.strInstructions,
            image: meal.strMealThumb,
            time: '30-45 min',
            difficulty: 'Medium',
            rating: 4.5,
            servings: '4',
            category: 'trending',
            ingredients: [],
            steps: [meal.strInstructions]
          }));
          allResults = [...webItems];
        }
      } catch (e) { console.error(e); }
    }

    // 2. Fetch from Supabase (Real Community Dishes)
    try {
      let query = supabase.from('recipes').select('*');
      
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        const dbItems = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          description: r.description,
          image: r.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500',
          time: r.cook_time || '30 min',
          difficulty: r.difficulty || 'Medium',
          rating: Number(r.rating) || 0,
          servings: r.servings || '4',
          category: r.category || 'other',
          ingredients: r.ingredients || [],
          steps: r.steps || [],
          author_id: r.user_id
        }));

        // Apply Tab Filters to DB Items
        let filteredDb = dbItems;
        if (activeTab === 'Popular') {
          filteredDb = dbItems.sort((a, b) => b.rating - a.rating);
        } else if (activeTab === 'In Stock') {
          filteredDb = dbItems.filter(recipe => {
            const matchCount = recipe.ingredients.filter((ing: string) => 
              inventory.some(invItem => ing.toLowerCase().includes(invItem))
            ).length;
            return matchCount >= 1;
          });
        }

        allResults = [...allResults, ...filteredDb];
      }
    } catch (e) { console.error(e); }

    setRecipes(allResults);
    setLoading(false);
  };

  const toggleSearch = () => {
    if (isSearchActive) {
      setSearchQuery('');
      setIsSearchActive(false);
      Keyboard.dismiss();
    } else {
      setIsSearchActive(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const openRecipe = (id: string) => {
    router.push(`/features/recipe/${id}`);
  };

  const tabs: { name: TabType, icon: any }[] = [
    { name: 'Popular', icon: TrendingUp },
    { name: 'Following', icon: Users },
    { name: 'Web Search', icon: Globe },
    { name: 'For You', icon: Sparkles },
    { name: 'In Stock', icon: ShoppingBag },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          {isSearchActive ? (
            <View style={styles.searchBarWrapper}>
              <TouchableOpacity onPress={toggleSearch} style={styles.backBtn}>
                <ArrowLeft color={Colors.black} size={24} />
              </TouchableOpacity>
              <View style={styles.searchContainer}>
                <Search color={Colors.textSecondary} size={18} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X color={Colors.textSecondary} size={18} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.headerNormal}>
              <View>
                <Text style={styles.greeting}>Welcome back, Chef!</Text>
                <Text style={styles.title}>Explore</Text>
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={toggleSearch}>
                <Search color="white" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Tab Switcher ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <TouchableOpacity key={tab.name} onPress={() => setActiveTab(tab.name)} style={[styles.tabItem, isActive && styles.tabItemActive]}>
                <Icon size={16} color={isActive ? 'white' : Colors.textSecondary} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Content Feed ── */}
        <View style={styles.feed}>
          {loading ? (
            <View style={styles.center}><ActivityIndicator color={Colors.black} size="large" /></View>
          ) : recipes.length > 0 ? (
            recipes.map((recipe) => (
              <TouchableOpacity key={recipe.id} style={styles.recipeCard} activeOpacity={0.9} onPress={() => openRecipe(recipe.id)}>
                <ImageBackground source={{ uri: recipe.image }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
                  <View style={styles.cardOverlay} />
                  <View style={styles.cardHeader}>
                    <View style={styles.authorBadge}>
                      <Image source={{ uri: `https://i.pravatar.cc/150?u=${recipe.author_id || recipe.id}` }} style={styles.authorAvatar} />
                      <Text style={styles.authorName}>{recipe.id.startsWith('web-') ? 'Global Chef' : 'Chef User'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.tagRow}>
                      <View style={styles.tag}><Clock size={12} color="white" /><Text style={styles.tagText}>{recipe.time}</Text></View>
                      <View style={styles.tag}><Star size={12} color="#FFD700" fill="#FFD700" /><Text style={styles.tagText}>{recipe.rating}</Text></View>
                    </View>
                    <Text style={styles.cardTitle}>{recipe.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{recipe.subtitle}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <ChefHat size={48} color="#CCC" />
              <Text style={styles.emptyText}>Be the first to share a dish!</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/cook')}>
                <Plus size={20} color="white" />
                <Text style={styles.emptyCtaText}>Cook Something</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 60 },
  header: { paddingHorizontal: 24, marginBottom: 20, height: 60, justifyContent: 'center' },
  headerNormal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.black, letterSpacing: -0.5 },
  searchButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  backBtn: { marginRight: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.black },
  tabBar: { paddingLeft: 24, marginBottom: 24 },
  tabBarContent: { paddingRight: 40, gap: 12 },
  tabItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EEE' },
  tabItemActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginLeft: 8 },
  tabTextActive: { color: 'white' },
  feed: { paddingHorizontal: 24 },
  recipeCard: { height: 300, width: '100%', borderRadius: 24, marginBottom: 20, overflow: 'hidden', elevation: 4 },
  cardImage: { flex: 1, justifyContent: 'space-between', padding: 16 },
  cardImageRadius: { borderRadius: 24 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, paddingRight: 12, borderRadius: 20 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: 'white' },
  authorName: { color: 'white', fontSize: 12, fontWeight: '600' },
  cardFooter: { zIndex: 1 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  cardTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  cardSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, marginTop: 12, fontWeight: '500' },
  emptyCta: { backgroundColor: Colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  emptyCtaText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
});