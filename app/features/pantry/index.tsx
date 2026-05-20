import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, TextInput,
} from 'react-native';
import { useAppAlert } from '../../../components/common/AppAlert';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../theme/colors';
import { supabase, InventoryItem, withTimeout } from '../../../services/supabase';
import { BackToTop } from '../../../components/common/BackToTop';
import { categorizeIngredient, identifyIngredientsFromImage } from '../../../services/gemini';
import { Plus, Search, ShoppingBag, Package, Camera, Edit3 } from 'lucide-react-native';
import { PantryItemCard, getIntelligentSlug } from './PantryItemCard';
import { AddItemModal } from './AddItemModal';
import { ItemDetailModal } from './ItemDetailModal';
import { CameraScanner } from './CameraScanner';
import { BasketModal } from './BasketModal';

const CATEGORIES = ['Poultry', 'Vegetables', 'Fruits', 'Meat', 'Beef', 'Seafood', 'Dairy', 'Grains', 'Condiments', 'Other'];
const TAB_CATEGORIES = ['All', ...CATEGORIES];

export default function PantryScreen() {
  const { showAlert } = useAppAlert();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [basketModalVisible, setBasketModalVisible] = useState(false);
  const [basketItems, setBasketItems] = useState<Array<{ id: string; name: string; quantity: string; checked: boolean }>>([]);
  const [basketCount, setBasketCount] = useState(0);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const isAiLoadingRef = useRef(false);
  const currentAiResultRef = useRef({ category: 'Other', image_url: null as string | null });
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailImgUri, setDetailImgUri] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; category: string; image_url: string | null; quantity: string }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'Other', amount: '', unit: 'pcs' });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const navigation = useNavigation();

  const closeAddModal = () => {
    setAddModalVisible(false); setEditingItemId(null);
    setNewItem({ name: '', category: 'Other', amount: '', unit: 'pcs' });
    currentAiResultRef.current = { category: 'Other', image_url: null };
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) fetchInventory(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchInventory(); else setItems([]);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchInventory(); updateBasketCount(); });
    return unsubscribe;
  }, [navigation]);

  const updateBasketCount = async () => {
    try { const raw = await AsyncStorage.getItem('@allblue:basket'); setBasketCount(raw ? JSON.parse(raw).length : 0); } catch { setBasketCount(0); }
  };

  const fetchBasket = async () => {
    try { const raw = await AsyncStorage.getItem('@allblue:basket'); setBasketItems(raw ? JSON.parse(raw) : []); } catch { console.warn('Fetch basket error'); }
  };

  async function fetchInventory() {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true; setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data, error } = await withTimeout(supabase.from('inventory').select('*').order('created_at', { ascending: false }));
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) { showAlert('Inventory Load Alert', e.message || 'Failed to load pantry items.'); }
    finally { setLoading(false); isFetchingRef.current = false; }
  }

  const handleAutoCategorize = async () => {
    if (newItem.name.length < 2) return;
    setIsAiLoading(true); isAiLoadingRef.current = true;
    try { const result = await categorizeIngredient(newItem.name); currentAiResultRef.current = result; setNewItem(prev => ({ ...prev, category: result.category })); }
    catch (e) { console.error('Auto-categorize failed:', e); }
    finally { setIsAiLoading(false); isAiLoadingRef.current = false; }
  };

  const handleScanItem = async () => {
    if (!permission?.granted) { const { granted } = await requestPermission(); if (!granted) { showAlert('Permission Required', 'Please allow camera access.'); return; } }
    setIsScannerVisible(true); setIsCameraReady(false); setTorchEnabled(false);
    if (isExpanded) toggleExpand();
  };

  const takePicture = async () => {
    if (!cameraRef.current || isScanning || !isCameraReady) return;
    setIsScanning(true);
    try { const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8, skipProcessing: false }); if (photo?.base64) setPreviewImage(photo.base64); }
    catch { showAlert('Error', 'Failed to capture photo.'); }
    finally { setIsScanning(false); }
  };

  const analyzePreview = async () => {
    if (!previewImage || isScanning) return;
    setIsScanning(true);
    try {
      const results = await identifyIngredientsFromImage(previewImage);
      if (results.length > 0) { setScannedItems(results); setPreviewImage(null); setIsReviewModalVisible(true); }
      else showAlert('No Items Found', "AI couldn't identify any ingredients. Try a clearer shot.");
    } catch { showAlert('Error', 'AI analysis failed.'); }
    finally { setIsScanning(false); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0].base64) setPreviewImage(result.assets[0].base64);
  };

  const updateScannedItem = (index: number, field: string, value: string) => {
    setScannedItems(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  };

  const handleConfirmBatch = async () => {
    if (scannedItems.length === 0) return;
    setIsScanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user; if (!user) return;
      const itemsToAdd = scannedItems.map(item => ({ user_id: user.id, name: item.name, category: item.category, quantity: item.quantity }));
      const { error } = await supabase.from('inventory').insert(itemsToAdd); if (error) throw error;
      await supabase.from('activities').insert(itemsToAdd.map(item => ({ user_id: user.id, type: 'added', item_name: item.name })));
      await fetchInventory();
      setScannedItems([]); setIsReviewModalVisible(false); setIsScannerVisible(false);
      showAlert('Success', `${itemsToAdd.length} items added to your pantry!`);
    } catch { showAlert('Error', 'Failed to add items to pantry.'); }
    finally { setIsScanning(false); }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.amount) { showAlert('Missing Info', 'Please provide a name and amount.'); return; }
    let finalCategory = currentAiResultRef.current.category;
    if (isAiLoadingRef.current) {
      let count = 0;
      while (isAiLoadingRef.current && count < 50) { await new Promise(r => setTimeout(r, 100)); count++; }
      finalCategory = currentAiResultRef.current.category;
    } else if (finalCategory === 'Other') {
      const result = await categorizeIngredient(newItem.name); finalCategory = result.category;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user; if (!user) { showAlert('Error', 'User session not found.'); return; }
    const cleanName = newItem.name.trim();
    const finalQuantity = `${newItem.amount} ${newItem.unit}`;
    if (editingItemId) {
      const { error } = await supabase.from('inventory').update({ name: cleanName, category: finalCategory, quantity: finalQuantity }).eq('id', editingItemId);
      if (!error) { fetchInventory(); closeAddModal(); } else showAlert('Error', 'Could not update item.');
      return;
    }
    const { data: existingItems } = await supabase.from('inventory').select('*').ilike('name', cleanName).limit(1);
    if (existingItems && existingItems.length > 0) {
      const existing = existingItems[0];
      const parts = existing.quantity.split(' ');
      const existingAmount = parseFloat(parts[0]) || 0;
      if (parts[1] === newItem.unit) {
        const newTotal = existingAmount + parseFloat(newItem.amount);
        const { error } = await supabase.from('inventory').update({ quantity: `${newTotal} ${newItem.unit}`, category: finalCategory }).eq('id', existing.id);
        if (!error) { showAlert('Item Merged', `Updated ${existing.name}.`); fetchInventory(); closeAddModal(); }
      } else { showAlert('Duplicate Found', `"${existing.name}" already exists.`); }
      return;
    }
    const { data, error } = await supabase.from('inventory').insert([{ user_id: user.id, name: cleanName, category: finalCategory, quantity: finalQuantity }]).select();
    if (!error && data) {
      await supabase.from('activities').insert({ user_id: user.id, type: 'added', item_name: cleanName });
      setItems([data[0], ...items]); if (isExpanded) toggleExpand(); closeAddModal();
    } else showAlert('Error', 'Could not add item.');
  };

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, { toValue, friction: 5, useNativeDriver: true }).start();
    setIsExpanded(!isExpanded);
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
        <TouchableOpacity style={styles.statsIcon} onPress={() => { fetchBasket(); setBasketModalVisible(true); }}>
          <ShoppingBag color={Colors.black} size={24} />
          {basketCount > 0 && <View style={styles.badgeContainer}><Text style={styles.badgeText}>{basketCount}</Text></View>}
        </TouchableOpacity>
      </View>
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color={Colors.textSecondary} size={20} />
          <TextInput style={styles.searchInput} placeholder="Search your stocks..." placeholderTextColor="#AAA" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TAB_CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={[styles.tab, activeTab === cat && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={Colors.black} size="large" /></View> : (
        <FlatList
          ref={listRef}
          data={filteredItems}
          renderItem={({ item }) => (
            <PantryItemCard item={item} onPress={() => {
              setSelectedItem(item);
              setDetailImgUri(`https://www.themealdb.com/images/ingredients/${getIntelligentSlug(item.name, item.category)}.png`);
              setDetailModalVisible(true);
            }} />
          )}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onScroll={e => setShowBackToTop(e.nativeEvent.contentOffset.y > 600)}
          ListEmptyComponent={<View style={styles.emptyContainer}><Package size={64} color="#DDD" strokeWidth={1.5} /><Text style={styles.emptyText}>No items found</Text></View>}
        />
      )}
      <BackToTop visible={showBackToTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
      {isExpanded && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleExpand} />}
      <Animated.View style={[styles.secondaryFab, manualStyle]}>
        <TouchableOpacity style={[styles.fabSmall, { backgroundColor: Colors.black }]} onPress={() => setAddModalVisible(true)}><Edit3 color="white" size={20} /></TouchableOpacity>
        <Text style={styles.fabLabel}>Manual Add</Text>
      </Animated.View>
      <Animated.View style={[styles.secondaryFab, scanStyle]}>
        <TouchableOpacity style={[styles.fabSmall, { backgroundColor: Colors.black }]} onPress={handleScanItem}><Camera color="white" size={20} /></TouchableOpacity>
        <Text style={styles.fabLabel}>Scan Item</Text>
      </Animated.View>
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={toggleExpand}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}><Plus color="white" size={28} strokeWidth={2.5} /></Animated.View>
      </TouchableOpacity>

      <AddItemModal
        visible={addModalVisible}
        onClose={closeAddModal}
        onSubmit={handleAddItem}
        newItem={newItem}
        setNewItem={setNewItem}
        editingItemId={editingItemId}
        isAiLoading={isAiLoading}
        onBlurName={handleAutoCategorize}
      />
      <ItemDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        selectedItem={selectedItem}
        detailImgUri={detailImgUri}
        setDetailImgUri={setDetailImgUri}
        onEdit={() => {
          if (!selectedItem) return;
          const parts = selectedItem.quantity.split(' ');
          setNewItem({ name: selectedItem.name, category: selectedItem.category, amount: parts[0] || '1', unit: parts[1] || 'pcs' });
          setEditingItemId(selectedItem.id);
          setDetailModalVisible(false);
          setAddModalVisible(true);
        }}
        onDelete={(id) => setItems(items.filter(i => i.id !== id))}
      />
      <CameraScanner
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        cameraRef={cameraRef}
        isCameraReady={isCameraReady}
        setIsCameraReady={setIsCameraReady}
        torchEnabled={torchEnabled}
        setTorchEnabled={setTorchEnabled}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        isScanning={isScanning}
        scannedItems={scannedItems}
        setScannedItems={setScannedItems}
        onTakePicture={takePicture}
        onPickImage={pickImage}
        onAnalyzePreview={analyzePreview}
        onConfirmBatch={handleConfirmBatch}
        isReviewModalVisible={isReviewModalVisible}
        setIsReviewModalVisible={setIsReviewModalVisible}
        onUpdateScannedItem={updateScannedItem}
      />
      <BasketModal
        visible={basketModalVisible}
        onClose={() => { updateBasketCount(); setBasketModalVisible(false); }}
        basketItems={basketItems}
        setBasketItems={setBasketItems}
        onBasketCountUpdate={updateBasketCount}
        onPantryRefresh={fetchInventory}
      />
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
  tabsWrapper: { marginBottom: 24 },
  tabScroll: { paddingHorizontal: 24, gap: 10, paddingVertical: 4 },
  tab: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#EFEFEF', minWidth: 75, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  tabActive: { backgroundColor: Colors.black, borderColor: Colors.black, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: 'white', fontWeight: '700' },
  list: { paddingHorizontal: 18, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#BBB', fontSize: 16, marginTop: 16 },
  fab: { position: 'absolute', bottom: 110, right: 24, backgroundColor: Colors.black, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10, zIndex: 100 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 90 },
  secondaryFab: { position: 'absolute', right: 30, bottom: 110, alignItems: 'center', flexDirection: 'row-reverse', zIndex: 95 },
  fabSmall: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabLabel: { marginRight: 12, fontSize: 14, fontWeight: 'bold', color: Colors.black, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, elevation: 2, overflow: 'hidden' },
  badgeContainer: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF4D4F', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
});
