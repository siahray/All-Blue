import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../../theme/colors';

export type WebSourceType = 'All' | 'MealDB' | 'KawalingPinoy' | 'PinchOfYum' | 'BudgetBytes' | 'MinimalistBaker' | 'OmnivoresCookbook' | 'IsabelEats' | 'VeganRicha';

export const WEB_SOURCES: { id: WebSourceType; name: string; emoji: string; domain: string; subtitle: string }[] = [
  { id: 'All', name: 'All Sources', emoji: '🌐', domain: '', subtitle: '' },
  { id: 'MealDB', name: 'Global Kitchen', emoji: '🍽️', domain: 'www.themealdb.com', subtitle: 'Global Fusion' },
  { id: 'KawalingPinoy', name: 'Kawaling Pinoy', emoji: '🇵🇭', domain: 'www.kawalingpinoy.com', subtitle: 'Authentic Filipino' },
  { id: 'PinchOfYum', name: 'Pinch of Yum', emoji: '🍲', domain: 'pinchofyum.com', subtitle: 'Modern Comfort' },
  { id: 'BudgetBytes', name: 'Budget Bytes', emoji: '💰', domain: 'www.budgetbytes.com', subtitle: 'Easy & Low-Cost' },
  { id: 'MinimalistBaker', name: 'Minimalist Baker', emoji: '🌿', domain: 'minimalistbaker.com', subtitle: 'Healthy & Simple' },
  { id: 'OmnivoresCookbook', name: 'Omnivore\'s Cookbook', emoji: '🇨🇳', domain: 'omnivorescookbook.com', subtitle: 'Chinese & Asian' },
  { id: 'IsabelEats', name: 'Isabel Eats', emoji: '🇲🇽', domain: 'www.isabeleats.com', subtitle: 'Authentic Mexican' },
  { id: 'VeganRicha', name: 'Vegan Richa', emoji: '🇮🇳', domain: 'www.veganricha.com', subtitle: 'Indian & Plant-Based' },
];

interface WebSourceBarProps {
  selected: WebSourceType;
  onSelect: (id: WebSourceType) => void;
}

export const WebSourceBar = ({ selected, onSelect }: WebSourceBarProps) => (
  <View style={styles.wrapper}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {WEB_SOURCES.map(src => {
        const isActive = selected === src.id;
        return (
          <TouchableOpacity
            key={src.id}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(src.id)}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {src.emoji} {src.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  scroll: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: 'white', fontWeight: '700' },
});
