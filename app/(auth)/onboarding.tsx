import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useAppAlert } from '../../components/common/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { ArrowRight, User, ChefHat, Sparkles, BookOpen } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { showAlert } = useAppAlert();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNextStep = () => {
    setStep(2);
  };

  const handleSaveUsername = async () => {
    if (username.trim().length < 3) {
      showAlert('Invalid Username', 'Username must be at least 3 characters long.');
      return;
    }

    const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validUsernameRegex.test(username.trim())) {
      showAlert('Invalid Username', 'Username can only contain letters, numbers, and underscores.');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('No user found');

      const finalUsername = username.trim().toLowerCase();

      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', finalUsername)
        .single();

      if (existingUser && existingUser.id !== user.id) {
        showAlert('Username Taken', 'This username is already in use. Please pick another one.');
        setLoading(false);
        return;
      }

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      // Update the profile (using upsert so it creates the row if it's completely missing)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          username: finalUsername,
          full_name: user.user_metadata?.full_name || 'Guest Chef',
          avatar_url: user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=chef'
        });

      if (updateError) throw updateError;

      router.replace('/(tabs)');
    } catch (error: any) {
      showAlert('Error', error.message || 'Something went wrong saving your username.');
    } finally {
      setLoading(false);
    }
  };

  const renderIntroStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logoImage} 
          />
        </View>
        <Text style={styles.title}>Welcome to All Blue</Text>
        <Text style={styles.subtitle}>Your personal culinary universe. Discover, cook, and share amazing recipes.</Text>
      </View>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: '#F0FDF4' }]}>
            <BookOpen size={24} color="#16A34A" />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Endless Recipes</Text>
            <Text style={styles.featureDesc}>Explore thousands of curated dishes from around the world.</Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: '#FEFCE8' }]}>
            <Sparkles size={24} color="#CA8A04" />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>AI Cooking Assistant</Text>
            <Text style={styles.featureDesc}>Get smart substitutions and step-by-step guidance while you cook.</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNextStep}>
          <Text style={styles.buttonText}>Get Started</Text>
          <ArrowRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUsernameStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
          <User size={40} color={Colors.black} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Claim your identity</Text>
        <Text style={styles.subtitle}>Create a unique username for your profile. Make it good, you can't change it later!</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Username</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="chef_master"
            placeholderTextColor={Colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, (!username.trim() || loading) && styles.buttonDisabled]} 
          onPress={handleSaveUsername}
          disabled={!username.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.buttonText}>Finish Setup</Text>
              <ArrowRight size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {step === 1 ? renderIntroStep() : renderUsernameStep()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresList: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  atSymbol: {
    fontSize: 18,
    color: Colors.black,
    fontWeight: 'bold',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: Colors.black,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    marginLeft: 4,
  },
  footer: {
    marginTop: 'auto',
  },
  button: {
    backgroundColor: Colors.black,
    height: 60,
    borderRadius: 30, // Fully rounded pill shape
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    marginHorizontal: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
    backgroundColor: Colors.textSecondary,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
