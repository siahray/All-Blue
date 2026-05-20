import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase, withTimeout } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { AppAlertProvider } from '../components/common/AppAlert';
import * as WebBrowser from 'expo-web-browser';

// Suppress non-fatal keep-awake warning from expo-camera sub-dependency
const _consoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('keep awake')) return;
  if (args[0]?.message?.includes('keep awake')) return;
  _consoleError(...args);
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Prevent double-processing of deep link OAuth codes (single-use tokens!)
  const processedUrlRef = useRef<string | null>(null);
  // Prevent the route guard from firing while we are mid-login
  const isHandlingDeepLinkRef = useRef(false);

  useEffect(() => {
    // ─── 1. Auth state listener ───────────────────────────────────────────────
    // This is the ONLY place that drives session/hasUsername state for normal
    // app starts and token refreshes. While a deep link is being processed we
    // skip it to avoid competing routing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[Auth] event:', event, 'has session:', !!newSession);

      if (isHandlingDeepLinkRef.current) {
        console.log('[Auth] Deep link in progress — skipping event:', event);
        return;
      }

      setSession(newSession);

      if (newSession) {
        try {
          const { data } = await withTimeout(
            supabase
              .from('profiles')
              .select('username')
              .eq('id', newSession.user.id)
              .single()
          ) as any;
          setHasUsername(!!data?.username);
        } catch {
          setHasUsername(false);
        }
      } else {
        setHasUsername(false);
      }

      setInitialized(true);
    });

    // ─── 2. Deep link handler ─────────────────────────────────────────────────
    // Handles the redirect from Facebook / Google OAuth.  Runs exactly ONCE
    // per unique URL to avoid re-using single-use OAuth codes.
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('[DeepLink] received:', url);

      // Only handle OAuth redirect URLs
      if (!url.includes('access_token') && !url.includes('code')) return;

      // De-duplicate — OAuth codes are single-use
      if (processedUrlRef.current === url) {
        console.log('[DeepLink] already processed, skipping.');
        return;
      }
      processedUrlRef.current = url;

      // Acquire deep link lock before doing anything async
      isHandlingDeepLinkRef.current = true;

      // Close the browser immediately
      WebBrowser.dismissBrowser();

      // Give the Android bridge and AsyncStorage time to settle after the
      // Chrome Custom Tab closes so we don't hit SQLite thread contention.
      await new Promise(resolve => setTimeout(resolve, 1200));

      try {
        // Normalise URL: Facebook sometimes returns # instead of ?
        let urlToParse = url.replace('#_=_', '');
        if (urlToParse.includes('#')) {
          urlToParse = urlToParse.replace('#', urlToParse.includes('?') ? '&' : '?');
        }

        const parsed = Linking.parse(urlToParse);
        const access_token = parsed.queryParams?.access_token as string | undefined;
        const refresh_token = parsed.queryParams?.refresh_token as string | undefined;
        const code = parsed.queryParams?.code as string | undefined;

        let newSession: Session | null = null;

        if (code) {
          console.log('[DeepLink] exchanging code for session…');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[DeepLink] code exchange error:', error.message);
            Alert.alert('Login Failed', error.message);
            return; // finally block releases the lock
          }
          newSession = data?.session ?? null;

        } else if (access_token && refresh_token) {
          console.log('[DeepLink] setting session from tokens…');
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error('[DeepLink] setSession error:', error.message);
            Alert.alert('Login Failed', error.message);
            return;
          }
          newSession = data?.session ?? null;
        }

        if (!newSession) {
          console.warn('[DeepLink] No session obtained.');
          return;
        }

        console.log('[DeepLink] session established for:', newSession.user.email);
        setSession(newSession);

        // Fetch username to decide where to route
        let hasUser = false;
        try {
          const { data: profile } = await withTimeout(
            supabase
              .from('profiles')
              .select('username')
              .eq('id', newSession.user.id)
              .single()
          ) as any;
          hasUser = !!profile?.username;
        } catch {
          hasUser = false;
        }

        setHasUsername(hasUser);
        setInitialized(true);

        // Navigate directly — the route guard will NOT fire while the lock is held
        if (hasUser) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }

      } finally {
        // Release lock so future onAuthStateChange events route normally
        isHandlingDeepLinkRef.current = false;
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    // Check if the app was cold-started via a deep link
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  // ─── 3. Route guard ───────────────────────────────────────────────────────
  // Fires whenever session / hasUsername / segments change.
  // Skipped entirely while a deep link is being processed to avoid
  // competing navigations (this was the root cause of the "back to login" bug).
  useEffect(() => {
    if (!initialized) return;
    if (isHandlingDeepLinkRef.current) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Not logged in — go to login
      if ((segments as string[])[1] !== 'login') {
        router.replace('/(auth)/login');
      }
    } else if (hasUsername === null) {
      // Profile check still in flight — wait
      return;
    } else if (!hasUsername) {
      // Logged in, no username yet — go to onboarding
      if ((segments as string[])[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (inAuthGroup) {
      // Fully authenticated — go to main app
      router.replace('/(tabs)');
    }
  }, [session, hasUsername, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <AppAlertProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="features/recipe/[id]" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </AppAlertProvider>
  );
}
