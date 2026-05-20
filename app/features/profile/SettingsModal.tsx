import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../theme/colors';
import { X, User, Shield, Info, LogOut, ChevronRight } from 'lucide-react-native';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onPrivacy: () => void;
  onAbout: () => void;
  onLogout: () => void;
}

export const SettingsModal = ({ visible, onClose, onEditProfile, onPrivacy, onAbout, onLogout }: SettingsModalProps) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={Colors.black} /></TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <TouchableOpacity style={styles.modalItem} onPress={onEditProfile}>
            <View style={styles.modalItemLeft}><User size={20} color={Colors.black} /><Text style={styles.modalItemText}>Edit Profile</Text></View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalItem} onPress={onPrivacy}>
            <View style={styles.modalItemLeft}><Shield size={20} color={Colors.black} /><Text style={styles.modalItemText}>Privacy &amp; Security</Text></View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalItem} onPress={onAbout}>
            <View style={styles.modalItemLeft}><Info size={20} color={Colors.black} /><Text style={styles.modalItemText}>About All Blue</Text></View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalItem, styles.logoutItem]} onPress={onLogout}>
            <View style={styles.modalItemLeft}><LogOut size={20} color="#FF5252" /><Text style={[styles.modalItemText, { color: '#FF5252' }]}>Log Out</Text></View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  modalBody: { padding: 24 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  modalItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalItemText: { fontSize: 16, color: Colors.black, fontWeight: '500' },
  logoutItem: { borderBottomWidth: 0, marginTop: 20 },
});
