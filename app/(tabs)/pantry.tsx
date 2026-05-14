import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { supabase, InventoryItem } from '../../services/supabase';
import { BackToTop } from '../../components/common/BackToTop';
import { 
  Plus, 
  X, 
  Search, 
  ShoppingBag, 
  Flame, 
  Package,
  Trash2,
  Check,
  Camera,
  Edit3,
  Sparkles
} from 'lucide-react-native';

import { categorizeIngredient } from '../../services/gemini';

const { width } = Dimensions.get('window');
const CATEGORIES = ['Poultry', 'Vegetables', 'Fruits', 'Meat', 'Beef', 'Seafood', 'Dairy', 'Grains', 'Condiments', 'Other'];
const TAB_CATEGORIES = ['All', ...CATEGORIES];

// Dedicated component for each pantry item to handle its own image state safely
const PantryItemCard = ({ item, onPress }: { item: InventoryItem, onPress: () => void }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        {item.image_url && !imgError ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.cardImage} 
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}><Package color="#CCC" size={24} /></View>
        )}
        <View style={styles.categoryTag}><Text style={styles.categoryTagText}>{item.category}</Text></View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardQty}>{item.quantity}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function PantryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // AI Status
  const [isAiLoading, setIsAiLoading] = useState(false);
  const isAiLoadingRef = useRef(false);
  const currentAiResultRef = useRef({ category: 'Other', image_url: null as string | null });

  // Filter & Search State
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Modals & Animation State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // Form State
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Other',
    amount: '',
    unit: 'pcs',
  });

  const UNITS = ['pcs', 'g', 'kg', 'ml', 'l', 'cloves', 'cups', 'tbsp', 'tsp', 'packs'];

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAutoCategorize = async () => {
    if (newItem.name.length < 2) return;
    setIsAiLoading(true);
    isAiLoadingRef.current = true;
    try {
      const result = await categorizeIngredient(newItem.name);
      currentAiResultRef.current = result;
      setNewItem(prev => ({ ...prev, category: result.category }));
    } catch (e) {
      console.error("Auto-categorize failed:", e);
    } finally {
      setIsAiLoading(false);
      isAiLoadingRef.current = false;
    }
  };

  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  }

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, { toValue, friction: 5, useNativeDriver: true }).start();
    setIsExpanded(!isExpanded);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.amount) {
      Alert.alert("Missing Info", "Please provide a name and amount.");
      return;
    }

    let finalCategory = currentAiResultRef.current.category;
    let finalImage = currentAiResultRef.current.image_url;

    if (isAiLoadingRef.current) {
      let count = 0;
      while (isAiLoadingRef.current && count < 50) {
        await new Promise(r => setTimeout(r, 100));
        count++;
      }
      finalCategory = currentAiResultRef.current.category;
      finalImage = currentAiResultRef.current.image_url;
    } else if (finalCategory === 'Other') {
      const result = await categorizeIngredient(newItem.name);
      finalCategory = result.category;
      finalImage = result.image_url;
    }

    const cleanName = newItem.name.trim();

    const { data: existingItems } = await supabase.from('inventory').select('*').ilike('name', cleanName).limit(1);

    if (existingItems && existingItems.length > 0) {
      const existing = existingItems[0];
      const parts = existing.quantity.split(' ');
      const existingAmount = parseFloat(parts[0]) || 0;
      const existingUnit = parts[1];

      if (existingUnit === newItem.unit) {
        const newTotal = existingAmount + parseFloat(newItem.amount);
        const newQtyStr = `${newTotal} ${newItem.unit}`;
        const { error: updateError } = await supabase.from('inventory').update({ 
          quantity: newQtyStr, category: finalCategory, image_url: finalImage || existing.image_url
        }).eq('id', existing.id);

        if (!updateError) {
          Alert.alert("Item Merged", `Updated ${existing.name} to ${newTotal} ${newItem.unit}.`);
          fetchInventory();
          setAddModalVisible(false);
          setNewItem({ name: '', category: 'Other', amount: '', unit: 'pcs' });
          currentAiResultRef.current = { category: 'Other', image_url: null };
        }
        return;
      } else {
        Alert.alert("Duplicate Item Found", `"${existing.name}" already exists in "${existingUnit}".`, [{ text: "OK", style: "cancel" }]);
        return;
      }
    }

    const finalQuantity = `${newItem.amount} ${newItem.unit}`;
    const { data, error } = await supabase.from('inventory').insert([{
      name: cleanName, category: finalCategory, quantity: finalQuantity, image_url: finalImage
    }]).select();

    if (!error && data) {
      setItems([data[0], ...items]);
      setAddModalVisible(false);
      if (isExpanded) toggleExpand();
      setNewItem({ name: '', category: 'Other', amount: '', unit: 'pcs' });
      currentAiResultRef.current = { category: 'Other', image_url: null };
    } else {
      Alert.alert("Error", "Could not add item.");
    }
  };

  const filteredItems = items.filter(i => {
    const matchesTab = activeTab === 'All' || i.category === activeTab;
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const rotation = animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const scanStyle = { transform: [{ scale: animation }, { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -80] }) }] };
  const manualStyle = { transform: [{ scale: animation }, { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) }] };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>Pantry</Text><Text style={styles.headerSubtitle}>{items.length} ingredients tracked</Text></View>
        <TouchableOpacity style={styles.statsIcon}><ShoppingBag color={Colors.black} size={24} /></TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color={Colors.textSecondary} size={20} /><TextInput style={styles.searchInput} placeholder="Search your stocks..." placeholderTextColor="#AAA" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TAB_CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={[styles.tab, activeTab === cat && styles.tabActive]}><Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>{cat}</Text></TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.black} size="large" /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredItems} 
          renderItem={({ item }) => <PantryItemCard item={item} onPress={() => { setSelectedItem(item); setDetailModalVisible(true); }} />} 
          numColumns={2} 
          keyExtractor={item => item.id} 
          contentContainerStyle={styles.list} 
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const offset = e.nativeEvent.contentOffset.y;
            setShowBackToTop(offset > 600);
          }}
          ListEmptyComponent={<View style={styles.emptyContainer}><Package size={64} color="#DDD" strokeWidth={1.5} /><Text style={styles.emptyText}>No items found</Text></View>}
        />
      )}

      <BackToTop 
        visible={showBackToTop} 
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} 
      />

      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={() => setAddModalVisible(false)} />
          <View style={styles.addModalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Ingredient</Text><TouchableOpacity onPress={() => setAddModalVisible(false)}><X color={Colors.black} size={24} /></TouchableOpacity></View>
            <View style={styles.modalBody}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.inputLabel}>Name</Text>
                {isAiLoading && <View style={styles.aiBadge}><Sparkles color="#6200EE" size={14} /><Text style={styles.aiBadgeText}>AI Categorizing...</Text></View>}
              </View>
              <TextInput style={styles.modalInput} placeholder="e.g. Garlic" value={newItem.name} onChangeText={(t) => setNewItem({...newItem, name: t})} onBlur={handleAutoCategorize} />
              <Text style={styles.inputLabel}>Quantity</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={newItem.amount} onChangeText={(t) => setNewItem({...newItem, amount: t})} />
                <View style={{ flex: 2 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>{UNITS.map(u => (<TouchableOpacity key={u} style={[styles.catOption, newItem.unit === u && styles.catOptionActive]} onPress={() => setNewItem({...newItem, unit: u})}><Text style={[styles.catOptionText, newItem.unit === u && styles.catOptionTextActive]}>{u}</Text></TouchableOpacity>))}</ScrollView></View>
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem}><Check color="white" size={20} style={{ marginRight: 8 }} /><Text style={styles.submitBtnText}>Add to Pantry</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={() => setDetailModalVisible(false)} />
          <View style={styles.detailModalContent}>
            <View style={styles.detailHero}>
              {selectedItem?.image_url ? (
                <Image source={{ uri: selectedItem.image_url }} style={styles.detailImage} onError={() => {}} />
              ) : (
                <View style={styles.detailPlaceholder}><Package color="#DDD" size={64} strokeWidth={1} /></View>
              )}
              <TouchableOpacity style={styles.closeCircle} onPress={() => setDetailModalVisible(false)}><X color="white" size={20} /></TouchableOpacity>
            </View>
            <View style={styles.detailBody}>
              <View style={styles.detailHeaderRow}><View><Text style={styles.detailCategory}>{selectedItem?.category?.toUpperCase()}</Text><Text style={styles.detailName}>{selectedItem?.name}</Text></View><View style={styles.detailQtyBadge}><Text style={styles.detailQtyText}>{selectedItem?.quantity}</Text></View></View>
              <TouchableOpacity style={styles.primaryCookBtn} onPress={() => { setDetailModalVisible(false); router.push({ pathname: "/", params: { filter: selectedItem?.name } }); }}><Flame color="white" size={20} style={{ marginRight: 8 }} /><Text style={styles.primaryCookBtnText}>Cook with this</Text></TouchableOpacity>
              <View style={styles.detailActions}>
                <TouchableOpacity style={styles.actionBtn}><Edit3 color={Colors.black} size={20} /><Text style={styles.actionBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={async () => { if (!selectedItem) return; const { error } = await supabase.from('inventory').delete().eq('id', selectedItem.id); if (!error) { setItems(items.filter(i => i.id !== selectedItem.id)); setDetailModalVisible(false); } }}><Trash2 color="#FF4444" size={20} /><Text style={[styles.actionBtnText, { color: '#FF4444' }]}>Remove</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {isExpanded && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleExpand} />}
      <Animated.View style={[styles.secondaryFab, manualStyle]}><TouchableOpacity style={[styles.fabSmall, { backgroundColor: Colors.black }]} onPress={() => { setAddModalVisible(true); }}><Edit3 color="white" size={20} /></TouchableOpacity><Text style={styles.fabLabel}>Manual Add</Text></Animated.View>
      <Animated.View style={[styles.secondaryFab, scanStyle]}><TouchableOpacity style={[styles.fabSmall, { backgroundColor: Colors.black }]} onPress={() => { Alert.alert("Scanner", "Opening AI Scanner..."); toggleExpand(); }}><Camera color="white" size={20} /></TouchableOpacity><Text style={styles.fabLabel}>Scan Item</Text></Animated.View>
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={toggleExpand}><Animated.View style={{ transform: [{ rotate: rotation }] }}><Plus color="white" size={28} strokeWidth={2.5} /></Animated.View></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.black },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary },
  statsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  searchSection: { paddingHorizontal: 24, marginBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: Colors.black },
  tabsWrapper: { height: 44, marginBottom: 24 },
  tabScroll: { paddingHorizontal: 24, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE' },
  tabActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: 'white' },
  list: { paddingHorizontal: 18, paddingBottom: 120 },
  card: { backgroundColor: 'white', width: (width - 60) / 2, margin: 6, borderRadius: 24, overflow: 'hidden', elevation: 3 },
  cardImageContainer: { width: '100%', height: 120, backgroundColor: '#F9F9F9' },
  cardImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categoryTag: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardContent: { padding: 12 },
  cardName: { fontWeight: 'bold', fontSize: 14, color: Colors.black },
  cardQty: { fontSize: 12, color: Colors.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#BBB', fontSize: 16, marginTop: 16 },
  fab: { position: 'absolute', bottom: 110, right: 24, backgroundColor: Colors.black, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10, zIndex: 100 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 90 },
  secondaryFab: { position: 'absolute', right: 30, bottom: 110, alignItems: 'center', flexDirection: 'row-reverse', zIndex: 95 },
  fabSmall: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabLabel: { marginRight: 12, fontSize: 14, fontWeight: 'bold', color: Colors.black, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, elevation: 2, overflow: 'hidden' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBlur: { ...StyleSheet.absoluteFillObject },
  addModalContent: { backgroundColor: 'white', width: '100%', borderRadius: 32, overflow: 'hidden', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  modalBody: { paddingHorizontal: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  modalInput: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, fontSize: 15, color: Colors.black, borderWidth: 1, borderColor: '#EEE' },
  categoryPicker: { flexDirection: 'row', marginTop: 8 },
  catOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F0F0F0', marginRight: 8 },
  catOptionActive: { backgroundColor: Colors.black },
  catOptionText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  catOptionTextActive: { color: 'white' },
  submitBtn: { backgroundColor: Colors.black, height: 56, borderRadius: 16, marginTop: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  aiBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#6200EE', marginLeft: 4 },
  detailModalContent: { backgroundColor: 'white', width: '100%', borderRadius: 32, overflow: 'hidden', paddingBottom: 12 },
  detailHero: { width: '100%', height: 200, backgroundColor: '#F9F9F9' },
  detailImage: { width: '100%', height: '100%' },
  detailPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeCircle: { position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailBody: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  detailCategory: { fontSize: 12, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 1 },
  detailName: { fontSize: 28, fontWeight: 'bold', color: Colors.black, marginTop: 4 },
  detailQtyBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  detailQtyText: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  primaryCookBtn: { backgroundColor: Colors.black, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryCookBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  detailActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#EEE', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#F9F9F9' },
  actionBtnText: { fontSize: 14, fontWeight: 'bold', color: Colors.black },
  deleteBtn: { backgroundColor: '#FFF5F5', borderColor: '#FFE0E0' },
});