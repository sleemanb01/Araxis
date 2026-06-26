import React from 'react';
import { I18nManager, View, ActivityIndicator } from 'react-native';
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

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

function Root() {
  const { user, initializing, profileLoaded, needsRegistration, claimLoaded, provisioned } = useUser();
  if (initializing) return <Loading />;
  if (!user) return <AuthNavigator />;
  if (!profileLoaded) return <Loading />;
  if (needsRegistration) return <RegisterScreen />; // signed in, no profile yet
  if (!claimLoaded) return <Loading />;
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
