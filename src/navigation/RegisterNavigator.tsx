import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoleSelectScreen } from '../screens/register/RoleSelectScreen';
import { CustomerRegisterScreen } from '../screens/register/CustomerRegisterScreen';
import { ProviderRegisterScreen } from '../screens/register/ProviderRegisterScreen';
import { RegisterStackParamList } from './types';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<RegisterStackParamList>();

export function RegisterNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'חזור',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerRegister" component={CustomerRegisterScreen} options={{ title: 'הרשמת לקוח' }} />
      <Stack.Screen name="ProviderRegister" component={ProviderRegisterScreen} options={{ title: 'הרשמת נותן שירות' }} />
    </Stack.Navigator>
  );
}
