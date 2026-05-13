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
import { Colors } from '../../theme/colors';
import { supabase, InventoryItem } from '../../services/supabase';
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
  Edit3
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CATEGORIES = ['Poultry', 'Vegetables', 'Fruits', 'Meat', 'Beef', 'Seafood', 'Dairy', 'Grains', 'Condiments', 'Other'];
const TAB_CATEGORIES = ['All', ...CATEGORIES];

export default function PantryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Modals & Animation
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // New Item Form
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Vegetables',
    quantity: '',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  }

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) {
      Alert.alert("Missing Info", "Please provide a name and quantity.");
      return;
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert([newItem])
      .select();

    if (!error && data) {
      setItems([data[0], ...items]);
      setAddModalVisible(false);
      toggleExpand();
      setNewItem({ name: '', category: 'Vegetables', quantity: '' });
    } else {
      Alert.alert("Error", "Could not add item.");
    }
  };

  const filteredItems = items.filter(i => {
    const matchesTab = activeTab === 'All' || i.category === activeTab;
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Animation Styles
  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const scanStyle = {
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -80],
        }),
      },
    ],
  };

  const manualStyle = {
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -150],
        }),
      },
    ],
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => { setSelectedItem(item); setDetailModalVisible(true); }}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package color="#CCC" size={24} />
          </View>
        )}
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

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pantry</Text>
          <Text style={styles.headerSubtitle}>{items.length} ingredients tracked</Text>
        </View>
        <TouchableOpacity style={styles.statsIcon}>
          <ShoppingBag color={Colors.black} size={24} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color={Colors.textSecondary} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your stocks..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ── Category Tabs ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TAB_CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveTab(cat)} 
              style={[styles.tab, activeTab === cat && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.black} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={64} color="#DDD" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          }
        />
      )}

      {/* ── Add New Item Modal ── */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={() => setAddModalVisible(false)} />
          <View style={styles.addModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Ingredient</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X color={Colors.black} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Garlic" value={newItem.name} onChangeText={(t) => setNewItem({...newItem, name: t})} />
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. 5 cloves" value={newItem.quantity} onChangeText={(t) => setNewItem({...newItem, quantity: t})} />
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.catOption, newItem.category === cat && styles.catOptionActive]} onPress={() => setNewItem({...newItem, category: cat})}>
                    <Text style={[styles.catOptionText, newItem.category === cat && styles.catOptionTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem}><Check color="white" size={20} style={{ marginRight: 8 }} /><Text style={styles.submitBtnText}>Add to Pantry</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Speed Dial Actions ── */}
      {isExpanded && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={toggleExpand} 
        />
      )}

      <Animated.View style={[styles.secondaryFab, manualStyle]}>
        <TouchableOpacity 
          style={[styles.fabSmall, { backgroundColor: Colors.black }]} 
          onPress={() => { setAddModalVisible(true); }}
        >
          <Edit3 color="white" size={20} />
        </TouchableOpacity>
        <Text style={styles.fabLabel}>Manual Add</Text>
      </Animated.View>

      <Animated.View style={[styles.secondaryFab, scanStyle]}>
        <TouchableOpacity 
          style={[styles.fabSmall, { backgroundColor: Colors.black }]} 
          onPress={() => { Alert.alert("Scanner", "Opening AI Scanner..."); toggleExpand(); }}
        >
          <Camera color="white" size={20} />
        </TouchableOpacity>
        <Text style={styles.fabLabel}>Scan Item</Text>
      </Animated.View>

      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={toggleExpand}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Plus color="white" size={28} strokeWidth={2.5} />
        </Animated.View>
      </TouchableOpacity>
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
  
  /* FAB & Speed Dial */
  fab: { 
    position: 'absolute', bottom: 110, right: 24, 
    backgroundColor: Colors.black, width: 64, height: 64, borderRadius: 32, 
    justifyContent: 'center', alignItems: 'center', elevation: 10, zIndex: 100
  },
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
});