import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  ScrollView, Image, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useAppAlert } from '../../../components/common/AppAlert';
import { Colors } from '../../../theme/colors';
import { Plus, X, ArrowRight, Check, Clock, Users, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../../services/supabase';
import { useRouter } from 'expo-router';
import { CameraModal } from './CameraModal';
import { UnitPickerModal } from './UnitPickerModal';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink', 'Other'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TOTAL_STEPS = 4;

export default function CookScreen() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [recipe, setRecipe] = useState({
    title: '', description: '',
    ingredients: [{ name: '', amount: '', unit: '' }],
    steps: [{ instruction: '', duration: '' }],
    image: null as string | null,
    time: '', servings: '', difficulty: 'Easy', category: 'Dinner',
  });

  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [activeUnitIndex, setActiveUnitIndex] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameraPreviewUri, setCameraPreviewUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { showAlert('Permission Required', 'Camera access is needed.'); return; }
    }
    setCameraPreviewUri(null); setTorchEnabled(false); setIsCameraVisible(true); setIsCameraReady(false);
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (photo?.uri) setCameraPreviewUri(photo.uri);
    } catch (e) { showAlert('Error', 'Failed to capture photo.'); }
    finally { setIsCapturing(false); }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setRecipe(r => ({ ...r, image: result.assets[0].uri }));
  };

  const addIngredient = () => setRecipe(r => ({ ...r, ingredients: [...r.ingredients, { name: '', amount: '', unit: '' }] }));
  const removeIngredient = (i: number) => setRecipe(r => ({ ...r, ingredients: r.ingredients.filter((_, idx) => idx !== i) }));
  const updateIngredient = (field: string, text: string, i: number) => {
    const list = [...recipe.ingredients]; (list[i] as any)[field] = text; setRecipe(r => ({ ...r, ingredients: list }));
  };
  const addStep = () => setRecipe(r => ({ ...r, steps: [...r.steps, { instruction: '', duration: '' }] }));
  const removeStep = (i: number) => setRecipe(r => ({ ...r, steps: r.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (field: string, text: string, i: number) => {
    const list = [...recipe.steps]; (list[i] as any)[field] = text; setRecipe(r => ({ ...r, steps: list }));
  };

  const validate = () => {
    if (!recipe.title.trim()) { showAlert('Missing Info', 'Please enter a dish name.'); return false; }
    if (recipe.ingredients.every(i => !i.name.trim())) { showAlert('Missing Info', 'Add at least one ingredient.'); return false; }
    if (recipe.steps.every(s => !s.instruction.trim())) { showAlert('Missing Info', 'Add at least one cooking step.'); return false; }
    return true;
  };

  const uploadImage = async (uri: string, userId: string): Promise<string | null> => {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const blob = await (await fetch(uri)).blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage.from('recipe-images').upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (error) return null;
      return supabase.storage.from('recipe-images').getPublicUrl(fileName).data.publicUrl;
    } catch { return null; }
  };

  const handleShare = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { showAlert('Error', 'You must be logged in.'); return; }
      const userId = session.user.id;
      let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
      if (recipe.image) { const up = await uploadImage(recipe.image, userId); if (up) imageUrl = up; }
      const cleanIngredients = recipe.ingredients.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), amount: i.amount.trim(), unit: i.unit.trim() }));
      const cleanSteps = recipe.steps.filter(s => s.instruction.trim()).map((s, idx) => ({ step: idx + 1, instruction: s.duration.trim() ? `${s.instruction.trim()} (${s.duration.trim()})` : s.instruction.trim() }));
      const { error } = await supabase.from('recipes').insert({ user_id: userId, title: recipe.title.trim(), subtitle: recipe.description.trim().slice(0, 80), description: recipe.description.trim(), image_url: imageUrl, cook_time: recipe.time ? `${recipe.time} min` : '30 min', servings: recipe.servings ? `${recipe.servings} servings` : '2 servings', difficulty: recipe.difficulty, category: recipe.category, rating: '0', ingredients: cleanIngredients, steps: cleanSteps, equipment: [] });
      if (error) throw error;
      supabase.from('activities').insert({ user_id: userId, type: 'shared_recipe', title: `You shared "${recipe.title}"`, subtitle: `${recipe.category} · ${recipe.difficulty}` }).then(() => {});
      setDone(true);
    } catch (e: any) { showAlert('Share Failed', e.message || 'Something went wrong.'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setRecipe({ title: '', description: '', ingredients: [{ name: '', amount: '', unit: '' }], steps: [{ instruction: '', duration: '' }], image: null, time: '', servings: '', difficulty: 'Easy', category: 'Dinner' });
    setStep(1); setDone(false);
  };

  if (done) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}><Check color="white" size={48} strokeWidth={3} /></View>
        <Text style={styles.successTitle}>Recipe Shared! 🎉</Text>
        <Text style={styles.successSub}>Your dish is now live for the community to discover.</Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => { resetForm(); router.push('/(tabs)/profile'); }}>
          <Text style={styles.successBtnText}>View My Cookbook</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successBtnSecondary} onPress={resetForm}>
          <Text style={styles.successBtnSecondaryText}>Share Another Dish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share your dish</Text>
        <Text style={styles.headerSubtitle}>Step {step} of {TOTAL_STEPS}</Text>
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressDot, step > i && styles.progressDotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* STEP 1: Photo & Story */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>Photo <Text style={styles.optional}>(optional)</Text></Text>
            {recipe.image ? (
              <View style={styles.imageUpload}>
                <Image source={{ uri: recipe.image }} style={styles.previewImage} />
                <View style={styles.changeImageRow}>
                  <TouchableOpacity style={styles.changeImageBtn} onPress={openCamera}><Text style={styles.changeImageText}>📷 Camera</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.changeImageBtn} onPress={openGallery}><Text style={styles.changeImageText}>🖼 Gallery</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageUpload}>
                <View style={styles.uploadPlaceholder}>
                  <View style={styles.imageOptionRow}>
                    <TouchableOpacity style={styles.imageOptionBtn} onPress={openCamera}><Text style={{ fontSize: 28 }}>📷</Text><Text style={styles.imageOptionLabel}>Camera</Text></TouchableOpacity>
                    <View style={styles.imageOptionDivider} />
                    <TouchableOpacity style={styles.imageOptionBtn} onPress={openGallery}><Text style={{ fontSize: 28 }}>🖼</Text><Text style={styles.imageOptionLabel}>Gallery</Text></TouchableOpacity>
                  </View>
                  <Text style={styles.uploadText}>Tap to capture your creation</Text>
                </View>
              </View>
            )}
            <Text style={styles.label}>Dish Name <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="e.g. My Grandma's Adobo" placeholderTextColor="#AAA" value={recipe.title} onChangeText={t => setRecipe(r => ({ ...r, title: t }))} />
            <Text style={styles.label}>Story <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="What makes this dish special?" placeholderTextColor="#AAA" multiline numberOfLines={4} value={recipe.description} onChangeText={t => setRecipe(r => ({ ...r, description: t }))} />
          </View>
        )}

        {/* STEP 2: Ingredients */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Ingredients <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity onPress={addIngredient} style={styles.addBtn}><Plus size={18} color="white" /></TouchableOpacity>
            </View>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.listRow}>
                <View style={styles.bulletDot} />
                <TextInput style={[styles.inputSmall, { flex: 2 }]} placeholder="Ingredient" placeholderTextColor="#AAA" value={ing.name} onChangeText={t => updateIngredient('name', t, i)} />
                <TextInput style={[styles.inputSmall, { flex: 1, paddingHorizontal: 8 }]} placeholder="Qty" placeholderTextColor="#AAA" keyboardType="numeric" value={ing.amount} onChangeText={t => updateIngredient('amount', t, i)} />
                <TouchableOpacity style={[styles.inputSmall, { flex: 1.2, paddingHorizontal: 8, justifyContent: 'center' }]} onPress={() => { setActiveUnitIndex(i); setUnitPickerVisible(true); }}>
                  <Text style={{ color: ing.unit ? Colors.black : '#AAA', fontSize: 14 }}>{ing.unit || 'Unit'}</Text>
                </TouchableOpacity>
                {recipe.ingredients.length > 1 && <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn}><X size={14} color={Colors.textSecondary} /></TouchableOpacity>}
              </View>
            ))}
          </View>
        )}

        {/* STEP 3: Cooking Steps */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Cooking Steps <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity onPress={addStep} style={styles.addBtn}><Plus size={18} color="white" /></TouchableOpacity>
            </View>
            {recipe.steps.map((s, i) => (
              <View key={i} style={styles.stepInputRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput style={styles.inputSmall} placeholder="Describe this step…" placeholderTextColor="#AAA" multiline value={s.instruction} onChangeText={t => updateStep('instruction', t, i)} />
                  <TextInput style={styles.inputSmall} placeholder="Duration (e.g. 10 mins)" placeholderTextColor="#AAA" value={s.duration} onChangeText={t => updateStep('duration', t, i)} />
                </View>
                {recipe.steps.length > 1 && <TouchableOpacity onPress={() => removeStep(i)} style={styles.removeBtn}><X size={14} color={Colors.textSecondary} /></TouchableOpacity>}
              </View>
            ))}
          </View>
        )}

        {/* STEP 4: Details */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionNote}>Almost done! Add a few details so others know what to expect.</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailField}>
                <Clock size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Cook Time (min)</Text>
                <TextInput style={styles.detailInput} placeholder="30" placeholderTextColor="#AAA" keyboardType="number-pad" value={recipe.time} onChangeText={t => setRecipe(r => ({ ...r, time: t }))} />
              </View>
              <View style={styles.detailField}>
                <Users size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Servings</Text>
                <TextInput style={styles.detailInput} placeholder="2" placeholderTextColor="#AAA" keyboardType="number-pad" value={recipe.servings} onChangeText={t => setRecipe(r => ({ ...r, servings: t }))} />
              </View>
            </View>
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.chipRow}>
              {DIFFICULTIES.map(d => (
                <TouchableOpacity key={d} style={[styles.chip, recipe.difficulty === d && styles.chipActive]} onPress={() => setRecipe(r => ({ ...r, difficulty: d }))}>
                  <Text style={[styles.chipText, recipe.difficulty === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, recipe.category === c && styles.chipActive]} onPress={() => setRecipe(r => ({ ...r, category: c }))}>
                  <Text style={[styles.chipText, recipe.category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Preview</Text>
            <View style={styles.previewCard}>
              {recipe.image ? <Image source={{ uri: recipe.image }} style={styles.previewCardImage} /> : <View style={styles.previewCardPlaceholder}><ImageIcon color="#CCC" size={32} /></View>}
              <View style={styles.previewCardBody}>
                <Text style={styles.previewCardTitle}>{recipe.title || 'Untitled Dish'}</Text>
                <Text style={styles.previewCardMeta}>{recipe.category} · {recipe.difficulty} · {recipe.time ? `${recipe.time} min` : '?'}</Text>
                <Text style={styles.previewCardIngCount}>{recipe.ingredients.filter(i => i.name.trim()).length} ingredients · {recipe.steps.filter(s => s.instruction.trim()).length} steps</Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, step === 1 && { justifyContent: 'flex-end' }]}>
        {step > 1 && <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>}
        <TouchableOpacity style={[styles.nextBtn, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={() => step < TOTAL_STEPS ? setStep(s => s + 1) : handleShare()}>
          {submitting ? <ActivityIndicator color="white" size="small" /> : (
            <>
              <Text style={styles.nextBtnText}>{step === TOTAL_STEPS ? 'Post to Feed 🎉' : 'Next'}</Text>
              {step < TOTAL_STEPS && <ArrowRight color="white" size={18} style={{ marginLeft: 6 }} />}
            </>
          )}
        </TouchableOpacity>
      </View>

      <UnitPickerModal
        visible={unitPickerVisible}
        onClose={() => setUnitPickerVisible(false)}
        onSelect={(u) => { if (activeUnitIndex !== null) updateIngredient('unit', u, activeUnitIndex); }}
      />
      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        cameraRef={cameraRef}
        isCameraReady={isCameraReady}
        setIsCameraReady={setIsCameraReady}
        torchEnabled={torchEnabled}
        setTorchEnabled={setTorchEnabled}
        previewUri={cameraPreviewUri}
        setPreviewUri={setCameraPreviewUri}
        isCapturing={isCapturing}
        onTakePicture={takePicture}
        onPickGallery={openGallery}
        onConfirmPhoto={() => { if (cameraPreviewUri) { setRecipe(r => ({ ...r, image: cameraPreviewUri })); setIsCameraVisible(false); setCameraPreviewUri(null); } }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: Colors.black },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 12 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' },
  progressDotActive: { backgroundColor: Colors.black },
  scroll: { flex: 1 },
  stepContainer: { paddingHorizontal: 24 },
  label: { fontSize: 15, fontWeight: '700', color: Colors.black, marginTop: 24, marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  required: { color: '#E53935', fontWeight: '400' },
  optional: { color: Colors.textSecondary, fontSize: 12, fontWeight: '400' },
  sectionNote: { fontSize: 14, color: Colors.textSecondary, marginTop: 20, marginBottom: 4, lineHeight: 20 },
  imageUpload: { width: '100%', height: 210, backgroundColor: 'white', borderRadius: 20, borderWidth: 2, borderColor: '#EEE', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', gap: 12 },
  imageOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  imageOptionBtn: { alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 22 },
  imageOptionLabel: { fontSize: 12, fontWeight: '600', color: Colors.black },
  imageOptionDivider: { width: 1, height: 44, backgroundColor: '#E0E0E0' },
  uploadText: { color: Colors.textSecondary, fontSize: 13 },
  changeImageRow: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 8 },
  changeImageBtn: { backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  changeImageText: { color: 'white', fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: 'white', borderRadius: 16, padding: 15, fontSize: 15, color: Colors.black, borderWidth: 1, borderColor: '#EEE' },
  inputSmall: { backgroundColor: 'white', borderRadius: 12, padding: 12, fontSize: 14, color: Colors.black, borderWidth: 1, borderColor: '#EEE' },
  textArea: { height: 110, textAlignVertical: 'top' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.black },
  removeBtn: { padding: 6 },
  addBtn: { backgroundColor: Colors.black, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepInputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  stepNumberText: { fontSize: 12, fontWeight: 'bold', color: 'white' },
  detailRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  detailField: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EEE', gap: 4 },
  detailLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailInput: { fontSize: 22, fontWeight: 'bold', color: Colors.black, paddingVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0E0E0' },
  chipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: 'white' },
  previewCard: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE', flexDirection: 'row' },
  previewCardImage: { width: 90, height: 90 },
  previewCardPlaceholder: { width: 90, height: 90, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  previewCardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  previewCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  previewCardMeta: { fontSize: 12, color: Colors.textSecondary },
  previewCardIngCount: { fontSize: 11, color: Colors.textSecondary },
  footer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 85, left: 0, right: 0, padding: 16, paddingHorizontal: 24, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextBtn: { backgroundColor: Colors.black, paddingVertical: 15, paddingHorizontal: 28, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  nextBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  backBtn: { paddingVertical: 15, paddingHorizontal: 20, justifyContent: 'center', marginRight: 8 },
  backBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  successContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.black, marginBottom: 12 },
  successSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  successBtn: { backgroundColor: Colors.black, paddingVertical: 16, paddingHorizontal: 36, borderRadius: 20, marginBottom: 12 },
  successBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  successBtnSecondary: { paddingVertical: 14, paddingHorizontal: 36 },
  successBtnSecondaryText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
});
