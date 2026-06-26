import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { ServiceCallDetailScreen } from '../screens/ServiceCallDetailScreen';
import { ItemEditorScreen } from '../screens/ItemEditorScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { CrewDetailScreen } from '../screens/CrewDetailScreen';
import { CrewWithdrawalsScreen } from '../screens/CrewWithdrawalsScreen';
import { FinancialDashboardScreen } from '../screens/FinancialDashboardScreen';
import { NewServiceCallScreen } from '../screens/NewServiceCallScreen';
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
      <Stack.Screen name="CrewDetail" component={CrewDetailScreen} options={{ title: 'צוות' }} />
      <Stack.Screen name="CrewWithdrawals" component={CrewWithdrawalsScreen} options={{ title: 'היסטוריית משיכות' }} />
      <Stack.Screen name="FinancialDashboard" component={FinancialDashboardScreen} options={{ title: 'לוח כספים' }} />
      <Stack.Screen name="NewServiceCall" component={NewServiceCallScreen} options={{ title: 'קריאה חדשה', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
