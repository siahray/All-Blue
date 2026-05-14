import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../theme/colors';
import { Recipe } from '../../data/recipes';
import { BackToTop } from '../../components/common/BackToTop';
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
  Plus,
  Heart
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 6;

type TabType = 'Popular' | 'Following' | 'For You' | 'In Stock' | 'Web';

// Memoized Recipe Card for performance and touch stability
const RecipeCard = memo(({ recipe, onPress, isLiked, onLike }: { recipe: Recipe, onPress: () => void, isLiked: boolean, onLike: () => void }) => {
  const [lastTap, setLastTap] = useState(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      onLike();
      animateHeart();
    } else {
      setLastTap(now);
      // Optional: Delay the single tap action to make sure it's not a double tap
      // For a better UX, we'll trigger onPress immediately but cancel it if double tap occurs
      // But in social apps, usually image tap = open, double tap = like.
      onPress();
    }
  };

  const animateHeart = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1.5, friction: 3, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(heartOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      ])
    ]).start();
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.recipeCard}>
      <ImageBackground source={{ uri: recipe.image }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
        <View style={styles.cardOverlay} />
        
        {/* Animated Heart Overlay */}
        <Animated.View style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}>
          <Heart size={80} color="white" fill="white" />
        </Animated.View>

        <View style={styles.cardHeader}>
          <View style={styles.authorBadge}>
            <Image source={{ uri: `https://i.pravatar.cc/150?u=${recipe.author_id || recipe.id}` }} style={styles.authorAvatar} />
            <Text style={styles.authorName}>{recipe.id.toString().startsWith('web-') ? 'Global Chef' : 'Chef User'}</Text>
          </View>
          <TouchableOpacity style={styles.likeButton} onPress={(e) => { e.stopPropagation(); onLike(); }}>
            <Heart size={20} color={isLiked ? '#FF5252' : 'white'} fill={isLiked ? '#FF5252' : 'transparent'} />
          </TouchableOpacity>
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
});

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Popular');
  const [inventory, setInventory] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList>(null);
  
  // Pagination State
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const { filter } = useLocalSearchParams<{ filter?: string }>();

  const toggleLike = useCallback((id: string) => {
    setLikedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  // Search State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  // Debounce Search Query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (filter) {
      setSearchQuery(filter);
      setIsSearchActive(true);
    }
  }, [filter]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    // Don't show full-screen spinner for query/tab changes
    fetchData(0, true, recipes.length > 0);
  }, [activeTab, debouncedQuery]);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('name');
    if (data) setInventory(data.map(item => item.name.toLowerCase()));
  };

  const fetchData = async (currentPage: number, isReset = false, silent = false) => {
    if (isReset) {
      if (!silent) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    let newResults: Recipe[] = [];
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      let query = supabase.from('recipes').select('*', { count: 'exact' }).range(from, to);
      
      if (debouncedQuery) {
        // Search in title OR ingredients (using a simple keyword match for ingredients array)
        query = query.or(`title.ilike.%${debouncedQuery}%,ingredients.cs.{"${debouncedQuery}"}`);
      }

      if (activeTab === 'Popular') {
        query = query.order('rating', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query;
      
      if (!error && data) {
        const dbItems = data.map((r: any) => ({
          // ... mapping ...
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
        if (activeTab === 'In Stock') {
          // Double check filtering for "In Stock" tab
          filteredDb = dbItems.filter(recipe => 
            recipe.ingredients.some((ing: string) => 
              inventory.some(invItem => ing.toLowerCase().includes(invItem.toLowerCase()))
            )
          );
        }
        newResults = filteredDb;

        // FETCH WEB RECIPES FOR "IN STOCK"
        if (currentPage === 0 && activeTab === 'In Stock' && inventory.length > 0) {
          const randomIng = inventory[Math.floor(Math.random() * inventory.length)];
          try {
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${randomIng}`);
            const webData = await response.json();
            if (webData.meals) {
              const eligibleWeb = webData.meals.map((meal: any) => ({
                id: `web-stock-${meal.idMeal}`,
                title: meal.strMeal.toUpperCase(),
                subtitle: `In Stock • ${meal.strArea} Cuisine`,
                description: meal.strInstructions,
                image: meal.strMealThumb,
                time: meal.strCategory === 'Vegetarian' ? '25-35 min' : '45 min',
                difficulty: 'Easy',
                rating: (4.2 + (Number(meal.idMeal) % 8) / 10).toFixed(1),
                servings: '2',
                category: 'web',
                ingredients: [], // TheMealDB has flat fields, we'd need to parse them to be perfect, 
                                // but for display this works
                steps: [meal.strInstructions]
              }));
              newResults = [...newResults, ...eligibleWeb];
            }
          } catch (e) { console.error(e); }
        }

        if (count !== null && from + data.length >= count) setHasMore(false);
      }

      // 2. Fetch from Web if in web tab
      if (activeTab === 'Web' || searchQuery.length > 2) {
        if (currentPage === 0) {
          // If query is empty, pick a random letter for variety on refresh
          const randomLetters = 'abcdefghijklmnoprstvwy'; // letters that usually have results
          const randomChar = randomLetters[Math.floor(Math.random() * randomLetters.length)];
          const searchTerm = searchQuery || randomChar;
          
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchTerm}`);
          const webData = await response.json();
          if (webData.meals) {
            const webItems = webData.meals.slice(0, 20).map((meal: any) => ({
              id: `web-${meal.idMeal}-${currentPage}`,
              title: meal.strMeal?.toUpperCase() || 'UNKNOWN',
              subtitle: `${meal.strCategory} • ${meal.strArea} Cuisine`,
              description: meal.strInstructions,
              image: meal.strMealThumb,
              time: meal.strCategory === 'Beef' || meal.strCategory === 'Lamb' ? '60-90 min' : '30-45 min',
              difficulty: meal.strCategory === 'Beef' || meal.strCategory === 'Pork' ? 'Hard' : 'Medium',
              rating: (4 + (Number(meal.idMeal) % 10) / 10).toFixed(1),
              servings: (2 + (Number(meal.idMeal) % 4)).toString(),
              category: 'web',
              ingredients: [],
              steps: [meal.strInstructions]
            }));
            newResults = [...webItems, ...newResults];
          }
        } else {
          // INFINITE DISCOVERY: Fetch random meals if user keeps scrolling on Web tab
          const randomFetches = Array(5).fill(null).map(() => 
            fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json())
          );
          const randomDatas = await Promise.all(randomFetches);
          const randomItems = randomDatas.map(data => {
            const meal = data.meals[0];
            return {
              id: `web-${meal.idMeal}-${Date.now()}-${Math.random()}`,
              title: meal.strMeal?.toUpperCase() || 'DISCOVERY',
              subtitle: `Discovery • ${meal.strArea} Cuisine`,
              description: meal.strInstructions,
              image: meal.strMealThumb,
              time: '40-55 min',
              difficulty: 'Medium',
              rating: (4.5 + (Number(meal.idMeal) % 5) / 10).toFixed(1),
              servings: '4',
              category: 'trending',
              ingredients: [],
              steps: [meal.strInstructions]
            };
          });
          newResults = [...randomItems];
          setHasMore(true); // Always keep going on web
        }
      }
    } catch (e) { console.error(e); }

    if (isReset) setRecipes(newResults);
    else setRecipes(prev => [...prev, ...newResults]);

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

  const tabs: { name: TabType, icon: any }[] = [
    { name: 'Popular', icon: TrendingUp },
    { name: 'Following', icon: Users },
    { name: 'Web', icon: Globe },
    { name: 'For You', icon: Sparkles },
    { name: 'In Stock', icon: ShoppingBag },
  ];

  const renderFooter = useCallback(() => {
    // Only show "Finding more" for Web tab
    if (loadingMore && activeTab === 'Web') {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={Colors.black} size="small" />
          <Text style={styles.footerText}>Finding more deliciousness...</Text>
        </View>
      );
    }

    // Only show "End of kitchen" for Web if we ran out, 
    // or for other tabs if they have content but no more to load
    if (!hasMore && recipes.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <View style={styles.endLine} />
          <View style={styles.endContent}>
            <ChefHat size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.endText}>You've reached the end!</Text>
          </View>
          <View style={styles.endLine} />
        </View>
      );
    }

    return <View style={{ height: 100 }} />;
  }, [loadingMore, hasMore, recipes.length, activeTab]);

  return (
    <View style={styles.container}>
      {/* STABLE HEADER SECTION */}
      <View style={styles.header}>
        {isSearchActive ? (
          <View style={styles.searchBarWrapper}>
            <TouchableOpacity onPress={toggleSearch} style={styles.backBtn}><ArrowLeft color={Colors.black} size={24} /></TouchableOpacity>
            <View style={styles.searchContainer}>
              <Search color={Colors.textSecondary} size={18} />
              <TextInput ref={searchInputRef} style={styles.searchInput} placeholder="Search recipes..." value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X color={Colors.textSecondary} size={18} /></TouchableOpacity>}
            </View>
          </View>
        ) : (
          <View style={styles.headerNormal}>
            <View><Text style={styles.greeting}>Welcome back, Chef!</Text><Text style={styles.title}>Explore</Text></View>
            <TouchableOpacity style={styles.searchButton} onPress={toggleSearch}><Search color="white" size={20} strokeWidth={2.5} /></TouchableOpacity>
          </View>
        )}
        <View style={{ marginTop: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
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
        </View>
      </View>

      {loading && page === 0 ? (
        <View style={styles.fullCenter}><ActivityIndicator color={Colors.black} size="large" /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={recipes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <RecipeCard 
              recipe={item} 
              isLiked={likedRecipes.has(item.id.toString())}
              onLike={() => toggleLike(item.id.toString())}
              onPress={() => router.push(`/features/recipe/${item.id}`)} 
            />
          )}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onScroll={(e) => {
            const offset = e.nativeEvent.contentOffset.y;
            setShowBackToTop(offset > 1000);
          }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          ListEmptyComponent={<View style={styles.emptyState}><ChefHat size={48} color="#CCC" /><Text style={styles.emptyText}>Be the first to share a dish!</Text><TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/cook')}><Plus size={20} color="white" /><Text style={styles.emptyCtaText}>Cook Something</Text></TouchableOpacity></View>}
        />
      )}

      <BackToTop 
        visible={showBackToTop} 
        onPress={() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
          // Give it a tiny delay to allow the scroll to start before refreshing
          setTimeout(() => fetchData(0, true, false), 100);
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingTop: 20, paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 10, backgroundColor: Colors.background, zIndex: 10 },
  headerNormal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.black, letterSpacing: -0.5 },
  searchButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  backBtn: { marginRight: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.black },
  tabBarContent: { paddingHorizontal: 24, gap: 12 },
  tabItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EEE' },
  tabItemActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginLeft: 8 },
  tabTextActive: { color: 'white' },
  recipeCard: { height: 350, width: width - 48, alignSelf: 'center', borderRadius: 28, marginBottom: 20, overflow: 'hidden', elevation: 4 },
  cardImage: { flex: 1, justifyContent: 'space-between', padding: 20 },
  cardImageRadius: { borderRadius: 28 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 28 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, paddingRight: 14, borderRadius: 24 },
  authorAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10, borderWidth: 1.5, borderColor: 'white' },
  authorName: { color: 'white', fontSize: 13, fontWeight: '700' },
  likeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  heartOverlay: { position: 'absolute', top: '35%', left: '40%', zIndex: 20 },
  cardFooter: { zIndex: 1 },
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  tagText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  cardTitle: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  footerLoader: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  footerText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  footerEnd: { paddingVertical: 60, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  endLine: { flex: 1, height: 1, backgroundColor: '#EEE' },
  endContent: { flexDirection: 'row', alignItems: 'center' },
  endText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, marginTop: 16, fontWeight: '600', textAlign: 'center' },
  emptyCta: { backgroundColor: Colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 24 },
  emptyCtaText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 15 },
});