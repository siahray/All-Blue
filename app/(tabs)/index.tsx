import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
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
const ITEMS_PER_PAGE = 5;

type TabType = 'Popular' | 'Following' | 'For You' | 'In Stock' | 'Web Search';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Popular');
  const [inventory, setInventory] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // Pagination State
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Search State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  // Reset and fetch when tab or search changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [activeTab, searchQuery, inventory]);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('name');
    if (data) {
      setInventory(data.map(item => item.name.toLowerCase()));
    }
  };

  const fetchData = async (currentPage: number, isReset = false) => {
    if (isReset) setLoading(true);
    else setLoadingMore(true);

    let newResults: Recipe[] = [];
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      // 1. Fetch from Supabase (Real Community Dishes)
      let query = supabase
        .from('recipes')
        .select('*', { count: 'exact' })
        .range(from, to);
      
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      // Apply Tab Sorting/Filtering at DB level
      if (activeTab === 'Popular') {
        query = query.order('rating', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query;
      
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

        let filteredDb = dbItems;
        // In Stock filter is hard to do in pure SQL with JSONB array nicely, so we do it here
        if (activeTab === 'In Stock') {
          filteredDb = dbItems.filter(recipe => {
            const matchCount = recipe.ingredients.filter((ing: string) => 
              inventory.some(invItem => ing.toLowerCase().includes(invItem))
            ).length;
            return matchCount >= 1;
          });
        }

        newResults = [...filteredDb];
        
        // If we got fewer items than requested, we're likely at the end
        if (count !== null && from + data.length >= count) {
          setHasMore(false);
        }
      }

      // 2. Fetch from Web if in web tab (Only on page 0 for simplicity with this API)
      if (currentPage === 0 && (activeTab === 'Web Search' || searchQuery.length > 2)) {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchQuery || 'a'}`);
        const webData = await response.json();
        if (webData.meals) {
          const webItems = webData.meals.slice(0, 5).map((meal: any) => ({
            id: `web-${meal.idMeal}`,
            title: meal.strMeal.toUpperCase(),
            subtitle: `A classic ${meal.strArea} dish`,
            description: meal.strInstructions,
            image: meal.strMealThumb,
            time: '45 min',
            difficulty: 'Medium',
            rating: 4.8,
            servings: '4',
            category: 'trending',
            ingredients: [],
            steps: [meal.strInstructions]
          }));
          newResults = [...webItems, ...newResults];
        }
      }

    } catch (e) {
      console.error("Fetch failed:", e);
    }

    if (isReset) {
      setRecipes(newResults);
    } else {
      setRecipes(prev => [...prev, ...newResults]);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
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

  const renderHeader = () => (
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
      
      {/* ── Tab Switcher (Inside Header for FlatList) ── */}
      <View style={{ marginTop: 24 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.tabBarContent}
          renderItem={({ item }) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <TouchableOpacity onPress={() => setActiveTab(item.name)} style={[styles.tabItem, isActive && styles.tabItemActive]}>
                <Icon size={16} color={isActive ? 'white' : Colors.textSecondary} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={Colors.black} size="small" />
        <Text style={styles.footerText}>Finding more deliciousness...</Text>
      </View>
    );
  };

  const renderRecipe = ({ item: recipe }: { item: Recipe }) => (
    <TouchableOpacity style={styles.recipeCard} activeOpacity={0.9} onPress={() => openRecipe(recipe.id)}>
      <ImageBackground source={{ uri: recipe.image }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
        <View style={styles.cardOverlay} />
        <View style={styles.cardHeader}>
          <View style={styles.authorBadge}>
            <Image source={{ uri: `https://i.pravatar.cc/150?u=${recipe.author_id || recipe.id}` }} style={styles.authorAvatar} />
            <Text style={styles.authorName}>{recipe.id.toString().startsWith('web-') ? 'Global Chef' : 'Chef User'}</Text>
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
  );

  return (
    <View style={styles.container}>
      {loading && page === 0 ? (
        <View style={styles.fullCenter}><ActivityIndicator color={Colors.black} size="large" /></View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ChefHat size={48} color="#CCC" />
              <Text style={styles.emptyText}>Be the first to share a dish!</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/cook')}>
                <Plus size={20} color="white" />
                <Text style={styles.emptyCtaText}>Cook Something</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingTop: 60, paddingHorizontal: 0 },
  header: { paddingHorizontal: 24, marginBottom: 24 },
  headerNormal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.black, letterSpacing: -0.5 },
  searchButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  backBtn: { marginRight: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.black },
  tabBarContent: { paddingRight: 40, gap: 12 },
  tabItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EEE' },
  tabItemActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginLeft: 8 },
  tabTextActive: { color: 'white' },
  feed: { paddingHorizontal: 24 },
  recipeCard: { height: 350, width: width - 48, alignSelf: 'center', borderRadius: 28, marginBottom: 20, overflow: 'hidden', elevation: 4 },
  cardImage: { flex: 1, justifyContent: 'space-between', padding: 20 },
  cardImageRadius: { borderRadius: 28 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 28 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, paddingRight: 14, borderRadius: 24 },
  authorAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10, borderWidth: 1.5, borderColor: 'white' },
  authorName: { color: 'white', fontSize: 13, fontWeight: '700' },
  cardFooter: { zIndex: 1 },
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  tagText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  cardTitle: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  footerLoader: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  footerText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, marginTop: 16, fontWeight: '600', textAlign: 'center' },
  emptyCta: { backgroundColor: Colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 24 },
  emptyCtaText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 15 },
});