import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { Colors } from '../../../theme/colors';
import { X, Flame, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  cameraRef: React.RefObject<CameraView | null>;
  isCameraReady: boolean;
  setIsCameraReady: (v: boolean) => void;
  torchEnabled: boolean;
  setTorchEnabled: (v: boolean) => void;
  previewUri: string | null;
  setPreviewUri: (v: string | null) => void;
  isCapturing: boolean;
  onTakePicture: () => void;
  onPickGallery: () => void;
  onConfirmPhoto: () => void;
}

export const CameraModal = ({
  visible, onClose, cameraRef, isCameraReady, setIsCameraReady,
  torchEnabled, setTorchEnabled, previewUri, setPreviewUri,
  isCapturing, onTakePicture, onPickGallery, onConfirmPhoto,
}: CameraModalProps) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.scannerContainer}>
      {previewUri ? (
        <View style={styles.camera}>
          <Image source={{ uri: previewUri }} style={styles.camera} />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanHeader}>
              <TouchableOpacity onPress={() => setPreviewUri(null)} style={styles.scanClose}>
                <X color="white" size={28} />
              </TouchableOpacity>
              <Text style={styles.scanTitle}>Review Photo</Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={styles.scanFrameContainer} />
            <View style={styles.scanFooter}>
              <TouchableOpacity onPress={() => setPreviewUri(null)} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onConfirmPhoto} style={styles.analyzeBtn}>
                <Sparkles color="white" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.analyzeBtnText}>Confirm Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.camera}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            enableTorch={torchEnabled}
            onCameraReady={() => setIsCameraReady(true)}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanHeader}>
              <TouchableOpacity onPress={onClose} style={styles.scanClose}>
                <X color="white" size={28} />
              </TouchableOpacity>
              <Text style={styles.scanTitle}>Dish Photo Capture</Text>
              <TouchableOpacity
                onPress={() => setTorchEnabled(!torchEnabled)}
                style={[styles.torchToggle, torchEnabled && styles.torchToggleActive]}
              >
                <Flame color={torchEnabled ? '#FFD700' : 'white'} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.scanFrameContainer}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>Align your dish in the frame</Text>
            </View>
            <View style={styles.scanFooter}>
              <TouchableOpacity onPress={() => { onPickGallery(); onClose(); }} style={styles.galleryBtn}>
                <ImageIcon color="white" size={24} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onTakePicture} disabled={isCapturing} style={styles.shutterBtn}>
                {isCapturing ? <ActivityIndicator color="black" /> : <View style={styles.shutterInner} />}
              </TouchableOpacity>
              <View style={{ width: 50 }} />
            </View>
          </View>
        </View>
      )}
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between', paddingVertical: 40 },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  scanClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scanFrameContainer: { alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: width * 0.7, height: width * 0.7, borderWidth: 3, borderColor: Colors.accentGold || '#FFD700', borderRadius: 30, backgroundColor: 'transparent', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  scanHint: { color: 'white', marginTop: 20, fontSize: 16, fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  scanFooter: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40 },
  galleryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', padding: 4, justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: 'black' },
  torchToggle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  torchToggleActive: { backgroundColor: 'rgba(255,215,0,0.3)', borderWidth: 1, borderColor: '#FFD700' },
  retakeBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  retakeBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, backgroundColor: Colors.black, elevation: 8 },
  analyzeBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default CameraModal;
