import React from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../../theme/colors';
import { X, Flame, Edit3, Trash2, Package } from 'lucide-react-native';
import { supabase } from '../../../services/supabase';
import { InventoryItem } from '../../../services/supabase';
import { CATEGORY_FALLBACK_IMAGES } from './PantryItemCard';

interface ItemDetailModalProps {
  visible: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  detailImgUri: string | null;
  setDetailImgUri: (uri: string | null) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export const ItemDetailModal = ({
  visible, onClose, selectedItem, detailImgUri, setDetailImgUri, onEdit, onDelete,
}: ItemDetailModalProps) => {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={onClose} />
        <View style={styles.detailModalContent}>
          <View style={styles.detailHero}>
            {selectedItem ? (
              <Image
                source={{ uri: detailImgUri || CATEGORY_FALLBACK_IMAGES[selectedItem.category] || CATEGORY_FALLBACK_IMAGES.Other }}
                style={styles.detailImage}
                onError={() => {
                  if (selectedItem) {
                    setDetailImgUri(CATEGORY_FALLBACK_IMAGES[selectedItem.category] || CATEGORY_FALLBACK_IMAGES.Other);
                  }
                }}
              />
            ) : (
              <View style={styles.detailPlaceholder}><Package color="#DDD" size={64} strokeWidth={1} /></View>
            )}
            <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
              <X color="white" size={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.detailBody}>
            <View style={styles.detailHeaderRow}>
              <View>
                <Text style={styles.detailCategory}>{selectedItem?.category?.toUpperCase()}</Text>
                <Text style={styles.detailName}>{selectedItem?.name}</Text>
              </View>
              <View style={styles.detailQtyBadge}>
                <Text style={styles.detailQtyText}>{selectedItem?.quantity}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.primaryCookBtn}
              onPress={() => {
                onClose();
                router.push({ pathname: '/', params: { filter: selectedItem?.name } });
              }}
            >
              <Flame color="white" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.primaryCookBtnText}>Cook with this</Text>
            </TouchableOpacity>
            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
                <Edit3 color={Colors.black} size={20} />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={async () => {
                  if (!selectedItem) return;
                  const { error } = await supabase.from('inventory').delete().eq('id', selectedItem.id);
                  if (!error) {
                    onDelete(selectedItem.id);
                    onClose();
                  }
                }}
              >
                <Trash2 color="#FF4444" size={20} />
                <Text style={[styles.actionBtnText, { color: '#FF4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBlur: { ...StyleSheet.absoluteFillObject },
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
