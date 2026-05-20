import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../theme/colors';

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'pieces', 'pinch', 'to taste', '(none)'];

interface UnitPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (unit: string) => void;
}

export const UnitPickerModal = ({ visible, onClose, onSelect }: UnitPickerModalProps) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownMenu}>
        <Text style={styles.dropdownTitle}>Select Unit</Text>
        <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
          {UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={styles.dropdownItem}
              onPress={() => { onSelect(u === '(none)' ? '' : u); onClose(); }}
            >
              <Text style={styles.dropdownItemText}>{u}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownMenu: { backgroundColor: 'white', borderRadius: 20, width: '80%', padding: 20, maxHeight: 450, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  dropdownTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: Colors.black },
  dropdownItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  dropdownItemText: { fontSize: 16, textAlign: 'center', color: Colors.black },
});

export default UnitPickerModal;
