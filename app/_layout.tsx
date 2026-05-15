import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // 2. Listen to Supabase state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Root deep link handler (catches the Facebook/Google redirect instantly)
    const handleDeepLink = async (event: { url: string }) => {
      if (!event.url.includes('access_token')) return; // Ignore irrelevant links

      // Force close the browser when the app regains focus with a token
      WebBrowser.dismissBrowser();

      let urlToParse = event.url;
      if (urlToParse.includes('#')) {
        urlToParse = urlToParse.replace('#', urlToParse.includes('?') ? '&' : '?');
      }
      
      const parsed = Linking.parse(urlToParse);
      const access_token = parsed.queryParams?.access_token as string;
      const refresh_token = parsed.queryParams?.refresh_token as string;

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) Alert.alert('Auth Error', error.message);
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  // 4. Handle Routing based on Session & Username Status
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    const checkAndRoute = async () => {
      if (!session) {
        if (!inAuthGroup) router.replace('/(auth)/login');
      } else {
        // If we don't know if they have a username yet, check Supabase.
        // ALSO: If they are trying to enter the app (!inAuthGroup) but our local state thinks they don't have a username,
        // we should double-check the database. This catches the moment they finish onboarding!
        let currentHasUsername = hasUsername;
        
        if (currentHasUsername === null || (currentHasUsername === false && !inAuthGroup)) {
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();
            
          currentHasUsername = !!data?.username;
          setHasUsername(currentHasUsername);
        }

        // Route them based on username status
        if (!currentHasUsername) {
          // If they don't have a username, they MUST be on the onboarding screen
          if (segments[1] !== 'onboarding') {
            router.replace('/(auth)/onboarding');
          }
        } else if (inAuthGroup) {
          // If they have a username and are still in the auth group, send to tabs
          router.replace('/(tabs)');
        }
      }
    };

    checkAndRoute();
  }, [session, initialized, segments, hasUsername]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="features/recipe/[id]" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}
