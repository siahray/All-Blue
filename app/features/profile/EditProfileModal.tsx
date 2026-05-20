import React from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, Image, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../../theme/colors';
import { X, Camera } from 'lucide-react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  editData: { full_name: string; username: string; avatar_url: string };
  setEditData: (data: any) => void;
  selectedAvatarUri: string | null;
  oauthAvatarUrl: string | null;
  loading: boolean;
  onSave: () => void;
  onChangePhoto: () => void;
}

export const EditProfileModal = ({
  visible, onClose, editData, setEditData, selectedAvatarUri,
  oauthAvatarUrl, loading, onSave, onChangePhoto,
}: EditProfileModalProps) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
      <View style={[styles.modalContent, { height: '72%', maxHeight: 600 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={Colors.black} /></TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <View style={styles.editAvatarContainer}>
            <TouchableOpacity onPress={onChangePhoto} activeOpacity={0.8} style={styles.avatarEditWrapper}>
              <Image
                source={{ uri: selectedAvatarUri || editData.avatar_url || oauthAvatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix&size=200' }}
                style={styles.editAvatar}
              />
              <View style={styles.cameraIconOverlay}><Camera color="white" size={16} /></View>
            </TouchableOpacity>
            <TouchableOpacity onPress={onChangePhoto} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoBtnText}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={editData.full_name} onChangeText={t => setEditData({ ...editData, full_name: t })} placeholder="Enter your full name" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput style={styles.input} value={editData.username} onChangeText={t => setEditData({ ...editData, username: t })} placeholder="Enter username" autoCapitalize="none" />
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  modalBody: { padding: 24 },
  editAvatarContainer: { alignItems: 'center', marginBottom: 20 },
  avatarEditWrapper: { position: 'relative', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F5F5F5', elevation: 3 },
  editAvatar: { width: '100%', height: '100%', borderRadius: 45 },
  cameraIconOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.accentGold, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  changePhotoBtn: { marginTop: 8 },
  changePhotoBtnText: { color: Colors.accentGold, fontSize: 14, fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, color: Colors.black },
  saveButton: { backgroundColor: Colors.accentGold, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: Colors.black, fontSize: 16, fontWeight: 'bold' },
});
