import React, { useEffect } from 'react';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { RegisterNavigator } from './src/navigation/RegisterNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { useJobStore } from './src/store/useJobStore';
import { useInventoryStore } from './src/store/useInventoryStore';
import { useCustomerStore } from './src/store/useCustomerStore';
import { useCalendarStore } from './src/store/useCalendarStore';
import { subscribeToAuth } from './src/services/authService';
import { subscribeToProfile } from './src/services/userService';
import { initAppCheck } from './src/services/appCheck';
import { Colors } from './src/constants/colors';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const profile = useAuthStore((s) => s.profile);
  const profileLoaded = useAuthStore((s) => s.profileLoaded);
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setProfileLoaded = useAuthStore((s) => s.setProfileLoaded);

  useEffect(() => {
    // Attest the app binary before any authenticated backend calls.
    initAppCheck().catch((e) => console.warn('App Check init failed:', e));

    const unsubscribe = subscribeToAuth((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, [setUser, setInitializing]);

  // Subscribe to the user's Firestore profile while signed in.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(false);
      return;
    }
    const unsub = subscribeToProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setProfileLoaded(true);
      },
      () => setProfileLoaded(true)
    );
    return unsub;
  }, [user, setProfile, setProfileLoaded]);

  // Start/stop the data subscriptions once a profile exists.
  useEffect(() => {
    if (profile) {
      useJobStore.getState().init();
      useInventoryStore.getState().init();
      // Customers & calendar are provider-only tools.
      if (profile.role === 'provider') {
        useCustomerStore.getState().init();
        useCalendarStore.getState().init();
      } else {
        useCustomerStore.getState().teardown();
        useCalendarStore.getState().teardown();
      }
    } else {
      useJobStore.getState().teardown();
      useInventoryStore.getState().teardown();
      useCustomerStore.getState().teardown();
      useCalendarStore.getState().teardown();
    }
  }, [profile]);

  function renderRoot() {
    if (initializing) return <Loading />;
    if (!user) return <AuthNavigator />;
    if (!profileLoaded) return <Loading />;       // checking Firestore for a profile
    if (!profile) return <RegisterNavigator />;   // signed in but not registered yet
    return <RootNavigator />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>{renderRoot()}</NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
