import React, { useState, useRef, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  Animated,
  Dimensions,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { Recipe } from '../../../data/recipes';

const { width } = Dimensions.get('window');

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  isLiked: boolean;
  onLike: () => void;
}

export const RecipeCard = memo(({ recipe, onPress, isLiked, onLike }: RecipeCardProps) => {
  const [lastTap, setLastTap] = useState(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const animateHeart = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1.5, friction: 3, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(heartOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      onLike();
      animateHeart();
    } else {
      setLastTap(now);
      onPress();
    }
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
            <Image
              source={{ uri: recipe.author_avatar || `https://i.pravatar.cc/150?u=${recipe.author_id || recipe.id}` }}
              style={styles.authorAvatar}
            />
            <Text style={styles.authorName}>
              {recipe.author_name || (recipe.id.toString().startsWith('web-') ? 'Global Chef' : 'Chef User')}
            </Text>
          </View>
          <TouchableOpacity style={styles.likeButton} onPress={(e) => { e.stopPropagation(); onLike(); }}>
            <Heart size={20} color={isLiked ? '#FF5252' : 'white'} fill={isLiked ? '#FF5252' : 'transparent'} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle}>{recipe.title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{recipe.subtitle}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  recipeCard: {
    width: width - 32,
    height: 280,
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: { flex: 1, justifyContent: 'space-between' },
  cardImageRadius: { borderRadius: 28 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 28,
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  authorAvatar: { width: 24, height: 24, borderRadius: 12 },
  authorName: { color: 'white', fontSize: 12, fontWeight: '600' },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: { padding: 16, paddingTop: 8 },
  cardTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
});
