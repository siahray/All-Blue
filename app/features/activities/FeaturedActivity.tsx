import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../../theme/colors';
import { ArrowRight, Trash2 } from 'lucide-react-native';
import { renderActivityIcon, formatActivityDate } from './ActivityItem';

interface FeaturedActivityProps {
  item: any;
  onPress: (item: any) => void;
  onDelete: (id: string) => void;
}

export const FeaturedActivity = ({ item, onPress, onDelete }: FeaturedActivityProps) => (
  <TouchableOpacity style={styles.featuredCard} onPress={() => onPress(item)} activeOpacity={0.8}>
    <View style={styles.featuredContent}>
      <View style={styles.featuredIconContainer}>
        {renderActivityIcon(item.type)}
      </View>
      <View style={styles.featuredTextContainer}>
        <Text style={styles.featuredLabel}>
          LATEST ACTIVITY • {formatActivityDate(item.created_at).toUpperCase()}
        </Text>
        <Text style={styles.featuredTitle} numberOfLines={1}>{item.item_name}</Text>
        <Text style={styles.featuredSubtext}>
          {item.type === 'added' ? 'Added to your digital pantry' : 'Used in a recent dish'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.featuredDelete}
        onPress={(e) => { e.stopPropagation(); onDelete(item.id); }}
      >
        <Trash2 size={16} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
      <View style={styles.featuredArrow}>
        <ArrowRight size={18} color="white" />
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  featuredCard: {
    backgroundColor: Colors.black,
    borderRadius: 28,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  featuredContent: { flexDirection: 'row', alignItems: 'center' },
  featuredIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featuredTextContainer: { flex: 1, marginRight: 8 },
  featuredLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  featuredTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  featuredSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  featuredDelete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  featuredArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FeaturedActivity;
