import React from 'react';
import {
  StyleSheet, Text, View, Modal, FlatList, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../theme/colors';
import { ShoppingBag, X, Check, Trash2 } from 'lucide-react-native';
import { supabase } from '../../../services/supabase';
import { categorizeIngredient } from '../../../services/gemini';
import { useAppAlert } from '../../../components/common/AppAlert';
interface BasketItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

interface BasketModalProps {
  visible: boolean;
  onClose: () => void;
  basketItems: BasketItem[];
  setBasketItems: (items: BasketItem[]) => void;
  onBasketCountUpdate: () => void;
  onPantryRefresh: () => void;
}

export const BasketModal = ({
  visible, onClose, basketItems, setBasketItems, onBasketCountUpdate, onPantryRefresh,
}: BasketModalProps) => {
  const { showAlert } = useAppAlert();

  const toggleItem = async (itemId: string) => {
    const updated = basketItems.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setBasketItems(updated);
    await AsyncStorage.setItem('@allblue:basket', JSON.stringify(updated));
  };

  const toggleSelectAll = async () => {
    const allChecked = basketItems.every(item => item.checked);
    const updated = basketItems.map(item => ({ ...item, checked: !allChecked }));
    setBasketItems(updated);
    await AsyncStorage.setItem('@allblue:basket', JSON.stringify(updated));
  };

  const deleteItem = async (itemId: string) => {
    const item = basketItems.find(i => i.id === itemId);
    if (!item) return;

    const skipConfirm = await AsyncStorage.getItem('@allblue:skip_basket_delete_confirm');
    if (skipConfirm === 'true') {
      const updated = basketItems.filter(i => i.id !== itemId);
      setBasketItems(updated);
      await AsyncStorage.setItem('@allblue:basket', JSON.stringify(updated));
      onBasketCountUpdate();
      return;
    }

    let skipNextTime = false;

    showAlert(
      'Remove Item',
      `Are you sure you want to remove "${item.name}" from your shopping basket?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (skipNextTime) {
              await AsyncStorage.setItem('@allblue:skip_basket_delete_confirm', 'true');
            }
            const updated = basketItems.filter(i => i.id !== itemId);
            setBasketItems(updated);
            await AsyncStorage.setItem('@allblue:basket', JSON.stringify(updated));
            onBasketCountUpdate();
          },
        },
      ],
      'destructive',
      {
        label: "Don't show again",
        onToggle: (checked) => {
          skipNextTime = checked;
        },
      }
    );
  };

  const clearBasket = () => {
    showAlert('Clear Basket', 'Are you sure you want to clear your shopping basket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          setBasketItems([]);
          await AsyncStorage.removeItem('@allblue:basket');
          onBasketCountUpdate();
        },
      },
    ]);
  };

  const moveCheckedToPantry = async () => {
    const checked = basketItems.filter(item => item.checked);
    if (checked.length === 0) {
      showAlert('No Items Selected', 'Please check items to move to your pantry.');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const enriched = await Promise.all(
        checked.map(async item => {
          const result = await categorizeIngredient(item.name);
          return { user_id: user.id, name: item.name, category: result.category, quantity: item.quantity };
        })
      );

      const { error } = await supabase.from('inventory').insert(enriched);
      if (error) throw error;

      await supabase.from('activities').insert(
        enriched.map(item => ({ user_id: user.id, type: 'added', item_name: item.name }))
      );

      const remaining = basketItems.filter(item => !item.checked);
      setBasketItems(remaining);
      await AsyncStorage.setItem('@allblue:basket', JSON.stringify(remaining));
      onBasketCountUpdate();
      onPantryRefresh();
      showAlert('Success', `${enriched.length} item(s) moved to your pantry!`);
    } catch {
      showAlert('Error', 'Failed to move items to pantry.');
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.basketOverlay}>
          <TouchableOpacity style={styles.basketBlur} activeOpacity={1} onPress={onClose} />
          <View style={styles.basketModalContent}>
            <View style={styles.basketHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ShoppingBag color={Colors.black} size={24} />
                <Text style={styles.basketTitle}>Shopping Basket</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {basketItems.length > 0 && (
                  <TouchableOpacity onPress={toggleSelectAll} activeOpacity={0.7}>
                    <Text style={styles.selectAllText}>
                      {basketItems.every(i => i.checked) ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}><X color={Colors.black} size={24} /></TouchableOpacity>
              </View>
            </View>

            {basketItems.length === 0 ? (
              <View style={styles.basketEmpty}>
                <ShoppingBag size={48} color="#CCC" strokeWidth={1.5} />
                <Text style={styles.basketEmptyText}>Your basket is empty.</Text>
                <Text style={styles.basketEmptySubText}>Add missing ingredients from recipes you want to cook!</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={basketItems}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.basketList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.basketItemRow}>
                      <TouchableOpacity style={styles.checkboxContainer} onPress={() => toggleItem(item.id)}>
                        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                          {item.checked && <Check color="white" size={12} strokeWidth={3} />}
                        </View>
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[styles.basketItemName, item.checked && styles.basketItemNameChecked]}>
                            {item.name}
                          </Text>
                          <Text style={styles.basketItemQty}>{item.quantity}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.basketDeleteBtn}>
                        <Trash2 color="#FF4D4F" size={18} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                <View style={styles.basketActions}>
                  <TouchableOpacity style={[styles.basketBtn, styles.basketBtnPrimary]} onPress={moveCheckedToPantry}>
                    <Check color="white" size={18} style={{ marginRight: 8 }} />
                    <Text style={styles.basketBtnTextPrimary}>Move Checked to Pantry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.basketBtn, styles.basketBtnDanger]} onPress={clearBasket}>
                    <Trash2 color="#FF4D4F" size={18} style={{ marginRight: 8 }} />
                    <Text style={styles.basketBtnTextDanger}>Clear Basket</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  basketOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  basketBlur: { ...StyleSheet.absoluteFillObject },
  basketModalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    height: '70%', paddingBottom: 30,
  },
  basketHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  basketTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  basketList: { padding: 24 },
  basketItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.black, borderColor: Colors.black },
  basketItemName: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  basketItemNameChecked: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  basketItemQty: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  basketDeleteBtn: { padding: 8 },
  basketEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  basketEmptyText: { fontSize: 18, fontWeight: 'bold', color: Colors.textSecondary, marginTop: 16 },
  basketEmptySubText: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  basketActions: { paddingHorizontal: 24, gap: 12, paddingTop: 10 },
  basketBtn: { height: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%' },
  basketBtnPrimary: { backgroundColor: Colors.black },
  basketBtnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  basketBtnDanger: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FFE0E0' },
  basketBtnTextDanger: { color: '#FF4D4F', fontWeight: 'bold', fontSize: 15 },
  selectAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066CC',
    marginRight: 4,
  },
});

export default BasketModal;
