import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Image } from 'react-native';
import { X, Camera, Image as ImageIcon, Trash2, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../../theme/colors';

interface GalleryImageModalProps {
  item: any | null;
  onClose: () => void;
}

export const GalleryImageModal = ({ item, onClose }: GalleryImageModalProps) => (
  <Modal visible={!!item} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.galleryOverlay}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <X size={28} color="white" />
      </TouchableOpacity>
      {item && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image_url }} style={styles.fullImage} resizeMode="contain" />
          <View style={styles.captionBox}>
            <Text style={styles.captionText}>{item.title}</Text>
          </View>
        </View>
      )}
    </View>
  </Modal>
);

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onRestore: () => void;
  canRestore: boolean;
}

export const ImagePickerModal = ({ visible, onClose, onCamera, onGallery, onRestore, canRestore }: ImagePickerModalProps) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerContent}>
        <View style={styles.pickerHeader}>
          <View style={styles.dragIndicator} />
          <Text style={styles.pickerTitle}>Change Profile Photo</Text>
        </View>
        <View style={styles.pickerBody}>
          <TouchableOpacity style={styles.pickerItem} onPress={onCamera}>
            <View style={styles.pickerItemLeft}>
              <View style={[styles.pickerIconBadge, { backgroundColor: '#E3F2FD' }]}><Camera size={20} color="#2196F3" /></View>
              <Text style={styles.pickerItemText}>Take Photo</Text>
            </View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerItem} onPress={onGallery}>
            <View style={styles.pickerItemLeft}>
              <View style={[styles.pickerIconBadge, { backgroundColor: '#E8F5E9' }]}><ImageIcon size={20} color="#4CAF50" /></View>
              <Text style={styles.pickerItemText}>Choose from Gallery</Text>
            </View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
          {canRestore && (
            <TouchableOpacity style={styles.pickerItem} onPress={onRestore}>
              <View style={styles.pickerItemLeft}>
                <View style={[styles.pickerIconBadge, { backgroundColor: '#FFEBEE' }]}><Trash2 size={20} color="#FF5252" /></View>
                <Text style={[styles.pickerItemText, { color: '#FF5252' }]}>Restore Default Photo</Text>
              </View>
              <ChevronRight size={20} color="#CCC" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  // Gallery Overlay
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10, padding: 8 },
  imageContainer: { width: '100%', height: '70%', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  captionBox: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 12 },
  captionText: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  // Image Picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40 },
  pickerHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dragIndicator: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#E0E0E0', marginBottom: 12 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.black },
  pickerBody: { padding: 24, gap: 16 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F9F9F9', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  pickerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pickerIconBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pickerItemText: { fontSize: 16, fontWeight: '600', color: Colors.black },
  cancelBtn: { marginTop: 8, paddingVertical: 16, alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 16 },
  cancelText: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary },
});
