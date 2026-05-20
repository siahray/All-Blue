import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAppAlert } from '../../components/common/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { ChefHat, ChevronRight } from 'lucide-react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { FontAwesome } from '@expo/vector-icons';

// Handle redirect back to app
WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '1234567890-example.apps.googleusercontent.com',
});

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { showAlert } = useAppAlert();
  const [loading, setLoading] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      setLoading(provider);

      const redirectUrl = 'allblue://auth';
      
      console.log('[Login] Opening OAuth for provider:', provider);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open the browser — when the user completes OAuth, the OS will fire
        // the deep link back to the app, and _layout.tsx handleDeepLink takes over.
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        // No manual session handling here — _layout.tsx owns that entirely.
      }
      
    } catch (error: any) {
      showAlert('Login Error', error.message);
    } finally {
      setLoading(null);
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logoImage} 
            />
          </View>
          <Text style={styles.appName}>All Blue</Text>
          <Text style={styles.tagline}>The ultimate culinary discovery</Text>
        </View>

        <View style={styles.illustrationContainer}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800' }} 
            style={styles.heroImage} 
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.loginTitle}>Get Started</Text>
          <Text style={styles.loginSubtitle}>Login or sign up to save your recipes</Text>

          <TouchableOpacity 
            style={[styles.socialButton, styles.googleButton]} 
            onPress={() => handleSocialLogin('google')}
            disabled={!!loading}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="black" />
            ) : (
              <>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/48px-Google_%22G%22_logo.svg.png' }} 
                  style={{ width: 20, height: 20, resizeMode: 'contain' }} 
                />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, styles.facebookButton]} 
            onPress={() => handleSocialLogin('facebook')}
            disabled={!!loading}
          >
            {loading === 'facebook' ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <FontAwesome name="facebook" size={20} color="white" />
                <Text style={[styles.socialButtonText, { color: 'white' }]}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.guestButton}
            onPress={() => showAlert('Guest Mode', 'You can browse recipes as a guest, but features like saving and AI generation will be limited.')}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
            <ChevronRight size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.legal}>
        <Text style={styles.legalText}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
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
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.black,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  illustrationContainer: {
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 8,
    borderColor: 'white',
  },
  circle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: -1,
  },
  circle2: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: -2,
  },
  footer: {
    marginBottom: 40,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  googleButton: {
    backgroundColor: 'white',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    color: Colors.black,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 12,
  },
  guestButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginRight: 8,
  },
  legal: {
    paddingHorizontal: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
