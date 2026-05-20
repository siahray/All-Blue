import React from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Colors } from '../../../theme/colors';
import { X, Check, Sparkles } from 'lucide-react-native';

const UNITS = ['pcs', 'g', 'kg', 'ml', 'l', 'cloves', 'cups', 'tbsp', 'tsp', 'packs'];

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  newItem: { name: string; category: string; amount: string; unit: string };
  setNewItem: (item: any) => void;
  editingItemId: string | null;
  isAiLoading: boolean;
  onBlurName: () => void;
}

export const AddItemModal = ({
  visible, onClose, onSubmit, newItem, setNewItem, editingItemId, isAiLoading, onBlurName
}: AddItemModalProps) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={onClose} />
      <View style={styles.addModalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{editingItemId ? 'Edit Ingredient' : 'Add Ingredient'}</Text>
          <TouchableOpacity onPress={onClose}><X color={Colors.black} size={24} /></TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.inputLabel}>Name</Text>
            {isAiLoading && (
              <View style={styles.aiBadge}>
                <Sparkles color="#6200EE" size={14} />
                <Text style={styles.aiBadgeText}>AI Categorizing...</Text>
              </View>
            )}
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Garlic"
            value={newItem.name}
            onChangeText={(t) => setNewItem({ ...newItem, name: t })}
            onBlur={onBlurName}
          />
          <Text style={styles.inputLabel}>Quantity</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={[styles.modalInput, { flex: 1 }]}
              placeholder="0"
              keyboardType="numeric"
              value={newItem.amount}
              onChangeText={(t) => setNewItem({ ...newItem, amount: t })}
            />
            <View style={{ flex: 2 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.catOption, newItem.unit === u && styles.catOptionActive]}
                    onPress={() => setNewItem({ ...newItem, unit: u })}
                  >
                    <Text style={[styles.catOptionText, newItem.unit === u && styles.catOptionTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
            <Check color="white" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>{editingItemId ? 'Save Changes' : 'Add to Pantry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
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
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700' },
  aiBadgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, marginLeft: 4 },
});

export default AddItemModal;
