import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Camera, Plus, X, ArrowRight, ChefHat, Info, ListChecks, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function CookScreen() {
  const [step, setStep] = useState(1);
  const [recipe, setRecipe] = useState({
    title: '',
    description: '',
    ingredients: [''],
    steps: [''],
    image: null as string | null,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setRecipe({ ...recipe, image: result.assets[0].uri });
    }
  };

  const addIngredient = () => {
    setRecipe({ ...recipe, ingredients: [...recipe.ingredients, ''] });
  };

  const updateIngredient = (text: string, index: number) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = text;
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const addStep = () => {
    setRecipe({ ...recipe, steps: [...recipe.steps, ''] });
  };

  const updateStep = (text: string, index: number) => {
    const newSteps = [...recipe.steps];
    newSteps[index] = text;
    setRecipe({ ...recipe, steps: newSteps });
  };

  const handleShare = () => {
    Alert.alert("Recipe Shared!", "Your dish is now live for the community to see.");
    // Reset or navigate
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share your dish</Text>
        <Text style={styles.headerSubtitle}>Step {step} of 3</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>Visuals</Text>
            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {recipe.image ? (
                <Image source={{ uri: recipe.image }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Camera color={Colors.textSecondary} size={32} />
                  <Text style={styles.uploadText}>Capture your creation</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Dish Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Grandma's Adobo"
              placeholderTextColor="#AAA"
              value={recipe.title}
              onChangeText={(text) => setRecipe({ ...recipe, title: text })}
            />

            <Text style={styles.label}>Story behind it</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What makes this dish special? (Optional)"
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={4}
              value={recipe.description}
              onChangeText={(text) => setRecipe({ ...recipe, description: text })}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Ingredients</Text>
              <TouchableOpacity onPress={addIngredient} style={styles.addBtn}>
                <Plus size={18} color="white" />
              </TouchableOpacity>
            </View>
            
            {recipe.ingredients.map((ing, i) => (
              <TextInput
                key={i}
                style={styles.inputSmall}
                placeholder={`Ingredient ${i + 1}`}
                placeholderTextColor="#AAA"
                value={ing}
                onChangeText={(text) => updateIngredient(text, i)}
              />
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Cooking Steps</Text>
              <TouchableOpacity onPress={addStep} style={styles.addBtn}>
                <Plus size={18} color="white" />
              </TouchableOpacity>
            </View>
            
            {recipe.steps.map((s, i) => (
              <View key={i} style={styles.stepInputRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <TextInput
                  style={[styles.inputSmall, { flex: 1 }]}
                  placeholder="What's the next step?"
                  placeholderTextColor="#AAA"
                  multiline
                  value={s}
                  onChangeText={(text) => updateStep(text, i)}
                />
              </View>
            ))}
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.nextBtn} 
          onPress={() => step < 3 ? setStep(step + 1) : handleShare()}
        >
          <Text style={styles.nextBtnText}>{step === 3 ? 'Post to Feed' : 'Next Step'}</Text>
          {step < 3 && <ArrowRight color="white" size={20} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.black,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
    marginTop: 24,
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  imageUpload: {
    width: '100%',
    height: 220,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#EEE',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.black,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  inputSmall: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.black,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 10,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  addBtn: {
    backgroundColor: Colors.black,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 10,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  nextBtn: {
    backgroundColor: Colors.black,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    marginRight: 8,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
