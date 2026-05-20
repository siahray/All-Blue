import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../../theme/colors';
import { InventoryItem } from '../../../services/supabase';

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Poultry: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80',
  Vegetables: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&auto=format&fit=crop&q=80',
  Fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80',
  Meat: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400&auto=format&fit=crop&q=80',
  Beef: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
  Seafood: 'https://images.unsplash.com/photo-1534080391025-09795d197a5b?w=400&auto=format&fit=crop&q=80',
  Dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&auto=format&fit=crop&q=80',
  Grains: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=80',
  Condiments: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80',
  Other: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
};

export const getIntelligentSlug = (name: string, _category: string) => {
  let lowerName = name.toLowerCase().trim();
  const adjectives = ['mixed', 'fresh', 'raw', 'chopped', 'diced', 'sliced', 'whole', 'crushed', 'ground', 'to taste'];
  adjectives.forEach(adj => { lowerName = lowerName.replace(adj, '').trim(); });
  if (lowerName.includes('beef')) return 'beef';
  if (lowerName.includes('chicken')) return 'chicken';
  if (lowerName.includes('pork')) return 'pork';
  if (lowerName.includes('fish')) return 'fish';
  return lowerName.split(' ')[0] || 'package';
};

export { CATEGORY_FALLBACK_IMAGES };

interface PantryItemCardProps {
  item: InventoryItem;
  onPress: () => void;
}

export const PantryItemCard = ({ item, onPress }: PantryItemCardProps) => {
  const fallback = CATEGORY_FALLBACK_IMAGES[item.category] || CATEGORY_FALLBACK_IMAGES.Other;
  const [imgUri, setImgUri] = useState(
    `https://www.themealdb.com/images/ingredients/${getIntelligentSlug(item.name, item.category)}.png`
  );

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: imgUri }}
          style={styles.cardImage}
          onError={() => setImgUri(fallback)}
        />
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardQty}>{item.quantity}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    width: '48%',
    margin: 6,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
  },
  cardImageContainer: { width: '100%', height: 120, backgroundColor: '#F9F9F9' },
  cardImage: { width: '100%', height: '100%' },
  categoryTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardContent: { padding: 12 },
  cardName: { fontWeight: 'bold', fontSize: 14, color: Colors.black },
  cardQty: { fontSize: 12, color: Colors.textSecondary },
});
