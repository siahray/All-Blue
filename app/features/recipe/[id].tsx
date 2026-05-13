import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../theme/colors';
import { Recipe, isWebRecipe } from '../../../data/recipes';
import { ArrowLeft, Clock, Star, Users, ChefHat, Globe } from 'lucide-react-native';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    setLoading(true);
    if (!id) return;

    if (isWebRecipe(id)) {
      try {
        const mealId = id.replace('web-', '');
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

          setRecipe({
            id: id,
            title: meal.strMeal.toUpperCase(),
            subtitle: `A classic ${meal.strArea} dish`,
            description: meal.strInstructions,
            image: meal.strMealThumb,
            time: '45 min',
            difficulty: 'Medium',
            rating: 4.5,
            servings: '4',
            category: 'web',
            ingredients: ingredients,
            steps: meal.strInstructions.split('\r\n').filter((s: string) => s.trim().length > 10)
          });
        }
      } catch (error) { console.error(error); }
    } else {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          setRecipe({
            id: data.id,
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            image: data.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500',
            time: data.cook_time || '30 min',
            difficulty: data.difficulty || 'Medium',
            rating: Number(data.rating) || 0,
            servings: data.servings || '4',
            category: data.category || 'other',
            ingredients: data.ingredients || [],
            steps: data.steps || [],
            author_id: data.user_id
          });
        }
      } catch (e) { console.error(e); }
    }
    setLoading(false);
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

      <View style={styles.metaRow}>
        <View style={styles.metaTag}><Clock color={Colors.black} size={16} /><Text style={styles.metaText}>{recipe.time}</Text></View>
        <View style={styles.metaTag}><Star color="#FFD700" size={16} fill="#FFD700" /><Text style={styles.metaText}>{recipe.rating}</Text></View>
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
          {recipe.ingredients.map((item, index) => (
            <View key={index} style={styles.ingredientRow}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {recipe.steps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps</Text>
          <View style={styles.divider} />
          {recipe.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumberContainer}><Text style={styles.stepNumber}>{index + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 60 }} />
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 24, gap: 10 },
  metaTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  metaText: { fontSize: 13, fontWeight: '600', color: Colors.black, marginLeft: 6 },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  divider: { height: 2, backgroundColor: Colors.black, width: 40, marginBottom: 16 },
  descriptionText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.black, marginTop: 7, marginRight: 12 },
  ingredientText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  stepNumberContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  stepNumber: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  stepText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
});
