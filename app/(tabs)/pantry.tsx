import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Colors } from '../../theme/colors';
import { supabase, InventoryItem } from '../../services/supabase';
import { Plus, X, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CATEGORIES = ['All', 'Poultry', 'Vegetables', 'Fruits', 'Meat', 'Beef', 'Seafood', 'Dairy', 'Grains', 'Condiments'];

export default function PantryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  }

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelectedItem(item); setModalVisible(true); }}>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
      <ChevronRight size={16} color="#CCC" />
    </TouchableOpacity>
  );

  const filteredItems = items.filter(i => activeTab === 'All' || i.category === activeTab);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry</Text>
      
      <View style={{ height: 50, marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={[styles.tab, activeTab === cat && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color="black" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Detail Modal (Figma Screen 3) */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={{ uri: selectedItem?.image_url || 'https://via.placeholder.com/300' }} style={styles.modalImg} />
            <View style={styles.modalBody}>
              <Text style={styles.modalName}>{selectedItem?.name}</Text>
              <View style={styles.detailRow}><Text style={styles.label}>Category:</Text><Text style={styles.val}>{selectedItem?.category}</Text></View>
              <View style={styles.detailRow}><Text style={styles.label}>Quantity:</Text><Text style={styles.val}>{selectedItem?.quantity}</Text></View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab}><Plus color="white" size={30} /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 60 },
  header: { fontSize: 32, fontWeight: 'bold', marginLeft: 20, marginBottom: 20 },
  tabScroll: { paddingHorizontal: 20 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  tabActive: { backgroundColor: 'black' },
  tabText: { fontWeight: '600', color: '#666' },
  tabTextActive: { color: 'white' },
  list: { paddingHorizontal: 15, paddingBottom: 100 },
  card: { backgroundColor: 'white', flex: 1, margin: 5, padding: 20, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalImg: { width: '100%', height: 250 },
  modalBody: { padding: 25 },
  modalName: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  detailRow: { flexDirection: 'row', marginBottom: 10 },
  label: { width: 100, color: '#888' },
  val: { fontWeight: 'bold' },
  closeBtn: { marginTop: 20, backgroundColor: 'black', padding: 15, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { color: 'white', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: 'black', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});