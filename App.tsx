import React, { useEffect, useState } from 'react';
import { I18nManager, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { PendingScreen } from './src/screens/PendingScreen';
import { UserProvider, useUser } from './src/context/UserContext';
import { InventoryProvider } from './src/context/InventoryContext';
import { LiveMetricsProvider } from './src/context/LiveMetricsContext';
import { Colors } from './src/constants/colors';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

/**
 * Boot spinner that never dead-ends: if a network-bound gate takes more than
 * 12s, show a visible connection message + retry so the app always responds.
 */
function Loading({ onRetry }: { onRetry?: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!onRetry) return;
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [onRetry]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 32 }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {slow && onRetry && (
        <>
          <Text style={{ marginTop: 20, fontSize: 15, color: Colors.textPrimary, textAlign: 'center' }}>
            הטעינה נמשכת זמן רב. בדוק את החיבור לאינטרנט.
          </Text>
          <TouchableOpacity
            onPress={onRetry}
            activeOpacity={0.8}
            style={{ marginTop: 14, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 28 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>נסה שוב</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function Root() {
  const { user, initializing, profileLoaded, needsRegistration, claimLoaded, provisioned, retryBootstrap } = useUser();
  if (initializing) return <Loading />;
  if (!user) return <AuthNavigator />;
  if (!profileLoaded) return <Loading onRetry={retryBootstrap} />;
  if (needsRegistration) return <RegisterScreen />; // signed in, no profile yet
  if (!claimLoaded) return <Loading onRetry={retryBootstrap} />;
  if (!provisioned) return <PendingScreen />; // registered, awaiting admin provisioning
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserProvider>
          <InventoryProvider>
            <LiveMetricsProvider>
              <NavigationContainer>
                <Root />
              </NavigationContainer>
            </LiveMetricsProvider>
          </InventoryProvider>
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
