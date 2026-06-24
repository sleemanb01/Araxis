import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { ServiceCallDetailScreen } from '../screens/ServiceCallDetailScreen';
import { ItemEditorScreen } from '../screens/ItemEditorScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { CrewScreen } from '../screens/CrewScreen';
import { RootStackParamList } from './types';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
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
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceCallDetail" component={ServiceCallDetailScreen} options={{ title: 'פרטי קריאה' }} />
      <Stack.Screen name="ItemEditor" component={ItemEditorScreen} options={{ title: 'פריט', presentation: 'modal' }} />
      <Stack.Screen name="Transfer" component={TransferScreen} options={{ title: 'העברת ציוד', presentation: 'modal' }} />
      <Stack.Screen name="Crew" component={CrewScreen} options={{ title: 'ניהול צוות' }} />
    </Stack.Navigator>
  );
}
