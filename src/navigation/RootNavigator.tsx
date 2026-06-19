import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator }             from './TabNavigator';
import { JobCoordinationScreen }    from '../screens/JobCoordinationScreen';
import { JobExecutionScreen }       from '../screens/JobExecutionScreen';
import { NewJobScreen }             from '../screens/NewJobScreen';
import { WarehouseScreen }          from '../screens/WarehouseScreen';
import { RootStackParamList }       from './types';
import { Colors }                   from '../constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: Colors.surface },
        headerTintColor:  Colors.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle:  'חזור',
        contentStyle:     { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Tabs"             component={TabNavigator}          options={{ headerShown: false }} />
      <Stack.Screen name="JobCoordination"  component={JobCoordinationScreen} options={{ title: 'תיאום משימה' }} />
      <Stack.Screen name="JobExecution"     component={JobExecutionScreen}    options={{ title: 'ביצוע משימה' }} />
      <Stack.Screen name="NewJob"           component={NewJobScreen}          options={{ title: 'משימה חדשה', presentation: 'modal' }} />
      <Stack.Screen name="Warehouse"        component={WarehouseScreen}       options={{ title: 'מחסן' }} />
    </Stack.Navigator>
  );
}
