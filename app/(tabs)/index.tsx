import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { ChefHat, ShoppingBasket, Flame } from 'lucide-react-native';

export default function HomeScreen() {
  const [stats, setStats] = useState({ items: 0, recipes: 0 });

  useEffect(() => {
    getStats();
  }, []);

  async function getStats() {
    const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
    setStats(prev => ({ ...prev, items: count || 0 }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, Chef!</Text>
        <Text style={styles.title}>All Blue</Text>
      </View>

      {/* Quick Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <ShoppingBasket color={Colors.black} size={24} />
          <Text style={styles.statNumber}>{stats.items}</Text>
          <Text style={styles.statLabel}>Ingredients</Text>
        </View>
        <View style={styles.statCard}>
          <ChefHat color={Colors.black} size={24} />
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
      </View>

      {/* CTA Section */}
      <TouchableOpacity style={styles.mainCta}>
        <Flame color="white" size={28} />
        <View style={styles.ctaTextContainer}>
          <Text style={styles.ctaTitle}>What should we cook?</Text>
          <Text style={styles.ctaSub}>Based on your current pantry</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Recent Finds</Text>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderText}>Your latest scanned items will appear here.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 60, paddingHorizontal: 20 },
  header: { marginBottom: 30 },
  greeting: { fontSize: 16, color: '#666', fontWeight: '500' },
  title: { fontSize: 36, fontWeight: 'bold', color: Colors.black },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { backgroundColor: 'white', width: '47%', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
  statLabel: { color: '#888', fontSize: 12 },
  mainCta: { backgroundColor: Colors.black, borderRadius: 20, padding: 25, flexDirection: 'row', alignItems: 'center' },
  ctaTextContainer: { marginLeft: 15 },
  ctaTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  ctaSub: { color: '#AAA', fontSize: 13 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', marginTop: 30, marginBottom: 15 },
  placeholderCard: { height: 100, backgroundColor: '#EEE', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#BBB' },
  placeholderText: { color: '#888' }
});