import React, { useEffect } from 'react';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { useJobStore } from './src/store/useJobStore';
import { useInventoryStore } from './src/store/useInventoryStore';
import { subscribeToAuth } from './src/services/authService';
import { initAppCheck } from './src/services/appCheck';
import { Colors } from './src/constants/colors';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    // Attest the app binary before any authenticated backend calls.
    initAppCheck().catch((e) => console.warn('App Check init failed:', e));

    const unsubscribe = subscribeToAuth((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, [setUser, setInitializing]);

  // Start/stop Firestore subscriptions with the auth session.
  useEffect(() => {
    if (user) {
      useJobStore.getState().init();
      useInventoryStore.getState().init();
    } else {
      useJobStore.getState().teardown();
      useInventoryStore.getState().teardown();
    }
  }, [user]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {initializing ? (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: Colors.background }}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : user ? (
            <RootNavigator />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
