import React from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, Image, ActivityIndicator, ScrollView, TextInput,
  Dimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Colors } from '../../../theme/colors';
import { X, Flame, Sparkles, Image as ImageIcon, Check, Trash2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface CameraScannerProps {
  visible: boolean;
  onClose: () => void;
  cameraRef: React.RefObject<CameraView | null>;
  isCameraReady: boolean;
  setIsCameraReady: (v: boolean) => void;
  torchEnabled: boolean;
  setTorchEnabled: (v: boolean) => void;
  previewImage: string | null;
  setPreviewImage: (v: string | null) => void;
  isScanning: boolean;
  scannedItems: Array<{ name: string; category: string; image_url: string | null; quantity: string }>;
  setScannedItems: (items: any) => void;
  onTakePicture: () => void;
  onPickImage: () => void;
  onAnalyzePreview: () => void;
  onConfirmBatch: () => void;
  // Review modal
  isReviewModalVisible: boolean;
  setIsReviewModalVisible: (v: boolean) => void;
  onUpdateScannedItem: (index: number, field: string, value: string) => void;
}

export const CameraScanner = ({
  visible, onClose, cameraRef, isCameraReady, setIsCameraReady,
  torchEnabled, setTorchEnabled, previewImage, setPreviewImage,
  isScanning, scannedItems, setScannedItems,
  onTakePicture, onPickImage, onAnalyzePreview, onConfirmBatch,
  isReviewModalVisible, setIsReviewModalVisible, onUpdateScannedItem,
}: CameraScannerProps) => (
  <>
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.scannerContainer}>
        {previewImage ? (
          <View style={styles.camera}>
            <Image source={{ uri: `data:image/jpeg;base64,${previewImage}` }} style={styles.camera} />
            <View style={styles.cameraOverlay}>
              <View style={styles.scanHeader}>
                <TouchableOpacity onPress={() => setPreviewImage(null)} style={styles.scanClose}>
                  <X color="white" size={28} />
                </TouchableOpacity>
                <Text style={styles.scanTitle}>Review Photo</Text>
                <View style={{ width: 44 }} />
              </View>
              <View style={styles.scanFrameContainer} />
              <View style={styles.scanFooter}>
                <TouchableOpacity onPress={() => setPreviewImage(null)} style={styles.retakeBtn}>
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onAnalyzePreview} disabled={isScanning} style={styles.analyzeBtn}>
                  {isScanning ? <ActivityIndicator color="white" /> : (
                    <>
                      <Sparkles color="white" size={20} style={{ marginRight: 8 }} />
                      <Text style={styles.analyzeBtnText}>Scan with AI</Text>
                    </>
                  )}
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
                <Text style={styles.scanTitle}>AI Pantry Scanner</Text>
                <TouchableOpacity
                  onPress={() => setTorchEnabled(!torchEnabled)}
                  style={[styles.torchToggle, torchEnabled && styles.torchToggleActive]}
                >
                  <Flame color={torchEnabled ? '#FFD700' : 'white'} size={24} />
                </TouchableOpacity>
              </View>
              <View style={styles.scanFrameContainer}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Point at an ingredient</Text>
              </View>
              <View style={styles.scanFooter}>
                <TouchableOpacity onPress={onPickImage} style={styles.galleryBtn}>
                  <ImageIcon color="white" size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onTakePicture} disabled={isScanning} style={styles.shutterBtn}>
                  {isScanning ? <ActivityIndicator color="black" /> : <View style={styles.shutterInner} />}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirmBatch}
                  disabled={scannedItems.length === 0}
                  style={[styles.confirmBatchBtn, scannedItems.length === 0 && { opacity: 0.5 }]}
                >
                  <View style={styles.batchBadge}>
                    <Text style={styles.batchBadgeText}>{scannedItems.length}</Text>
                  </View>
                  <Check color="white" size={24} />
                </TouchableOpacity>
              </View>
              {scannedItems.length > 0 && (
                <View style={styles.scannedListContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scannedList}>
                    {scannedItems.map((item, idx) => (
                      <View key={idx} style={styles.scannedChip}>
                        <Text style={styles.scannedChipText}>{item.name}</Text>
                        <TouchableOpacity onPress={() => setScannedItems((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))}>
                          <X color="#666" size={14} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>

    {/* Review Modal */}
    <Modal visible={isReviewModalVisible} animationType="slide" transparent>
      <View style={styles.reviewOverlay}>
        <View style={[styles.reviewContent, { maxHeight: '80%', backgroundColor: Colors.background }]}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>Review Scanned Items</Text>
            <TouchableOpacity onPress={() => setIsReviewModalVisible(false)}>
              <X color={Colors.black} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.reviewBody} showsVerticalScrollIndicator={false}>
            {scannedItems.map((item, idx) => (
              <View key={idx} style={styles.reviewItemCard}>
                <View style={styles.reviewItemHeader}>
                  <TextInput
                    style={styles.reviewItemName}
                    value={item.name}
                    onChangeText={(val) => onUpdateScannedItem(idx, 'name', val)}
                  />
                  <TouchableOpacity onPress={() => setScannedItems((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))}>
                    <Trash2 color="#FF4444" size={20} />
                  </TouchableOpacity>
                </View>
                <View style={styles.reviewItemRow}>
                  <View style={styles.qtyInputContainer}>
                    <Text style={styles.qtyLabel}>Quantity:</Text>
                    <TextInput
                      style={styles.qtyInput}
                      value={item.quantity}
                      onChangeText={(val) => onUpdateScannedItem(idx, 'quantity', val)}
                      placeholder="e.g. 2 pcs"
                    />
                  </View>
                  <View style={styles.reviewCatBadge}>
                    <Text style={styles.reviewCatText}>{item.category}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ padding: 24 }}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={onConfirmBatch}
              disabled={isScanning || scannedItems.length === 0}
            >
              {isScanning ? <ActivityIndicator color="white" /> : (
                <>
                  <Check color="white" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Add all to Pantry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
);

const styles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between', paddingVertical: 40 },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  scanClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scanFrameContainer: { alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: width * 0.7, height: width * 0.7, borderWidth: 3, borderColor: Colors.accentGold, borderRadius: 30, backgroundColor: 'transparent', shadowColor: Colors.accentGold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  scanHint: { color: 'white', marginTop: 20, fontSize: 16, fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  scanFooter: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40 },
  galleryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', padding: 4, justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: 'black' },
  confirmBatchBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  batchBadge: { position: 'absolute', top: -10, right: -10, backgroundColor: '#FF4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  batchBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  scannedListContainer: { position: 'absolute', bottom: 140, width: '100%' },
  scannedList: { paddingHorizontal: 20, gap: 10 },
  scannedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 8 },
  scannedChipText: { fontSize: 14, fontWeight: '600', color: '#333' },
  torchToggle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  torchToggleActive: { backgroundColor: 'rgba(255,215,0,0.3)', borderWidth: 1, borderColor: '#FFD700' },
  retakeBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  retakeBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, backgroundColor: Colors.black, elevation: 8 },
  analyzeBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  reviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  reviewContent: { backgroundColor: 'white', width: '100%', borderRadius: 32, overflow: 'hidden', paddingBottom: 0 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  reviewTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  reviewBody: { paddingHorizontal: 24 },
  reviewItemCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEE', elevation: 2 },
  reviewItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewItemName: { fontSize: 18, fontWeight: 'bold', color: Colors.black, flex: 1 },
  reviewItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyInputContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  qtyLabel: { fontSize: 14, color: Colors.textSecondary, marginRight: 8 },
  qtyInput: { backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#DDD', fontSize: 14, minWidth: 80, color: Colors.black },
  reviewCatBadge: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  reviewCatText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  submitBtn: { backgroundColor: Colors.black, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
