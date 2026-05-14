import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { ChefHat, ChevronRight, Globe, Info } from 'lucide-react-native';

// Handle redirect back to app
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(provider);

      // Simple, reliable redirect URL
      const redirectUrl = Linking.createURL('(tabs)');
      
      console.log('--- LOGIN ATTEMPT ---');
      console.log('Provider:', provider);
      console.log('Redirecting to:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          // Convert # to ? for easier parsing
          const urlToParse = result.url.replace('#', result.url.includes('?') ? '&' : '?');
          const { queryParams } = Linking.parse(urlToParse);
          
          const access_token = queryParams?.access_token as string;
          const refresh_token = queryParams?.refresh_token as string;

          if (access_token && refresh_token) {
            console.log('Tokens received! Authenticating...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
            console.log('Successfully logged in!');
          }
        }
      }
      
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ChefHat size={48} color={Colors.black} strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>AllBlue</Text>
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
                <Globe size={20} color="black" />
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
                <Info size={20} color="white" />
                <Text style={[styles.socialButtonText, { color: 'white' }]}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.guestButton}
            onPress={() => Alert.alert('Guest Mode', 'You can browse recipes as a guest, but features like saving and AI generation will be limited.')}
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
