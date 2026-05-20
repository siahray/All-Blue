import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, CheckCircle2, AlertCircle, Sparkles, ChevronDown } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { categorizeIngredient } from '../../services/gemini';
import { CustomAlert } from './CustomAlert';

interface MissingIngredient {
  name: string;
  amount_needed: string;
  logical_units?: string[];
}

interface PantrySyncModalProps {
  visible: boolean;
  onClose: () => void;
  missingIngredients: MissingIngredient[];
  onSuccess: () => void; // Called after pantry is updated OR if user chooses to cook anyway
}

export const PantrySyncModal: React.FC<PantrySyncModalProps> = ({
  visible,
  onClose,
  missingIngredients,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [missingQuantities, setMissingQuantities] = useState<Record<string, string>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [activeUnitPick, setActiveUnitPick] = useState<{ name: string; units: string[] } | null>(null);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
    onClose: () => {},
  });

  // Artificial delay for "AI Analysis" feel if it opens too fast
  React.useEffect(() => {
    if (visible) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => setIsAnalyzing(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleAddToBasket = async () => {
    setLoading(true);
    try {
      const existingRaw = await AsyncStorage.getItem('@allblue:basket');
      let basketList = existingRaw ? JSON.parse(existingRaw) : [];

      missingIngredients.forEach(m => {
        const qty = missingQuantities[m.name] || m.amount_needed?.split(' ')[0] || "1";
        const unit = selectedUnits[m.name] || m.logical_units?.[0] || m.amount_needed?.split(' ')[1] || "pcs";
        const fullQty = `${qty} ${unit}`;

        const existingIdx = basketList.findIndex((item: any) => item.name.toLowerCase() === m.name.toLowerCase());
        if (existingIdx > -1) {
          basketList[existingIdx].quantity = fullQty;
        } else {
          basketList.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            name: m.name,
            quantity: fullQty,
            checked: false,
          });
        }
      });

      await AsyncStorage.setItem('@allblue:basket', JSON.stringify(basketList));
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Ingredients added to your basket!',
        type: 'success',
        onClose: () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          onClose();
        }
      });
    } catch (e) {
      console.error("Failed to add to basket:", e);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Could not add items to basket.',
        type: 'error',
        onClose: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePantry = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Categorize and generate images for all missing items in parallel
      const enrichedItems = await Promise.all(
        missingIngredients.map(async (m) => {
          const qty = missingQuantities[m.name] || m.amount_needed?.split(' ')[0] || "1";
          const unit = selectedUnits[m.name] || m.logical_units?.[0] || m.amount_needed?.split(' ')[1] || "pcs";
          
          // Use AI to get category and image
          const aiResult = await categorizeIngredient(m.name);
          
          return {
            name: m.name,
            quantity: `${qty} ${unit}`,
            category: aiResult.category,
            user_id: user.id
          };
        })
      );

      const { error } = await supabase.from('inventory').insert(enrichedItems);
      if (error) throw error;

      onSuccess();
    } catch (e) {
      console.error("Pantry update failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          {loading || isAnalyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.black} size="large" />
              <Text style={styles.loadingText}>
                {loading ? "Updating stock..." : "Checking stock requirements..."}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.alertHeader}>
                <View style={styles.alertIconBg}>
                  <AlertCircle color="#F59E0B" size={28} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={styles.figmaAlertTitle}>Missing Ingredients</Text>
                </View>
              </View>
              
              <Text style={styles.figmaAlertSubtitle}>
                Review the missing items below and update your pantry stock.
              </Text>

              <ScrollView style={styles.figmaList} showsVerticalScrollIndicator={false}>
                {missingIngredients.map((item, idx) => (
                  <View key={idx} style={styles.figmaRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.figmaItemName}>{item.name}</Text>
                      <Text style={styles.figmaNeededText}>Required: {item.amount_needed}</Text>
                      
                      {/* SMART UNIT CHIPS (AI SUGGESTIONS) */}
                      <View style={styles.unitChipContainer}>
                        {(item.logical_units || ['pcs', 'kg', 'g', 'ml', 'cup']).slice(0, 4).map(unit => (
                          <TouchableOpacity 
                            key={unit} 
                            onPress={() => setSelectedUnits(prev => ({ ...prev, [item.name]: unit }))}
                            style={[
                              styles.unitChip,
                              (selectedUnits[item.name] || item.logical_units?.[0] || 'pcs') === unit && styles.unitChipActive
                            ]}
                          >
                            <Text style={[
                              styles.unitChipText,
                              (selectedUnits[item.name] || item.logical_units?.[0] || 'pcs') === unit && styles.unitChipTextActive
                            ]}>{unit}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    <View style={styles.figmaInputGroup}>
                      <View style={styles.quantityBox}>
                        <TextInput 
                          style={styles.figmaQuantityInput}
                          placeholder="1"
                          keyboardType="numeric"
                          placeholderTextColor="#999"
                          value={missingQuantities[item.name] || ''}
                          onChangeText={(val) => setMissingQuantities(prev => ({ ...prev, [item.name]: val }))}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.alertActions}>
                <TouchableOpacity style={[styles.alertBtn, styles.alertBtnPrimary]} onPress={handleUpdatePantry}>
                  <Text style={[styles.alertBtnText, styles.alertBtnTextPrimary]}>Sync & Start Cooking</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.alertBtn, styles.alertBtnBasket]} onPress={handleAddToBasket}>
                  <Text style={[styles.alertBtnText, styles.alertBtnTextBasket]}>Add to Basket</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.alertBtn, styles.alertBtnCancel]} onPress={onClose}>
                  <Text style={styles.alertBtnTextCancel}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Sub-Modal for Unit Picking */}
      <Modal visible={!!activeUnitPick} transparent animationType="slide">
        <View style={styles.unitPickerOverlay}>
          <View style={styles.unitPickerContainer}>
            <Text style={styles.unitPickerTitle}>Select Unit for {activeUnitPick?.name}</Text>
            <View style={styles.unitGrid}>
              {activeUnitPick?.units.map((unit) => (
                <TouchableOpacity 
                  key={unit} 
                  style={[
                    styles.unitOption, 
                    selectedUnits[activeUnitPick.name] === unit && styles.unitOptionActive
                  ]}
                  onPress={() => {
                    setSelectedUnits(prev => ({ ...prev, [activeUnitPick.name]: unit }));
                    setActiveUnitPick(null);
                  }}
                >
                  <Text style={[
                    styles.unitOptionText,
                    selectedUnits[activeUnitPick.name] === unit && styles.unitOptionTextActive
                  ]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.unitPickerClose} onPress={() => setActiveUnitPick(null)}>
              <Text style={styles.unitPickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert {...alertConfig} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  alertContainer: { backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14 },
  alertIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  figmaAlertTitle: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  smartBadge: { backgroundColor: '#EDE7F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  smartBadgeText: { fontSize: 8, fontWeight: '900', color: '#6200EE', letterSpacing: 0.5 },
  figmaAlertSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 18, fontWeight: '400' },
  figmaList: { maxHeight: 320, marginBottom: 18 },
  figmaRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  figmaItemName: { fontSize: 16, color: Colors.black, fontWeight: '800' },
  figmaNeededText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginTop: 2, marginBottom: 10 },
  unitChipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  unitChipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  unitChipText: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary },
  unitChipTextActive: { color: 'white' },
  figmaInputGroup: { position: 'absolute', right: 0, top: 14 },
  quantityBox: { width: 64, height: 42, backgroundColor: '#F9F9F9', borderRadius: 12, borderWidth: 1.5, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  figmaQuantityInput: { width: '100%', height: '100%', fontSize: 17, fontWeight: '900', color: Colors.black, textAlign: 'center' },
  alertActions: { gap: 10 },
  alertBtn: { height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', width: '100%' },
  alertBtnPrimary: { backgroundColor: '#111827' },
  alertBtnText: { fontSize: 15, fontWeight: '700', color: '#111827', letterSpacing: 0.2 },
  alertBtnTextPrimary: { color: 'white' },
  alertBtnBasket: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E5E7EB' },
  alertBtnTextBasket: { color: '#111827' },
  alertBtnCancel: { backgroundColor: 'transparent', height: 40 },
  alertBtnTextCancel: { color: '#6B7280', fontWeight: '700', fontSize: 14 },
  unitPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  unitPickerContainer: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  unitPickerTitle: { fontSize: 20, fontWeight: '900', color: Colors.black, marginBottom: 25, textAlign: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  unitOption: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, backgroundColor: '#F8F8F8', borderWidth: 1, borderColor: '#EEE' },
  unitOptionActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  unitOptionText: { fontSize: 15, fontWeight: '800', color: Colors.black },
  unitOptionTextActive: { color: 'white' },
  unitPickerClose: { marginTop: 30, alignItems: 'center' },
  unitPickerCloseText: { fontSize: 16, fontWeight: '900', color: '#FF4D4F' },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 20, fontSize: 16, fontWeight: '800', color: Colors.black, textAlign: 'center' },
});
