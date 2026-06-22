import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator }             from './TabNavigator';
import { JobCoordinationScreen }    from '../screens/JobCoordinationScreen';
import { JobExecutionScreen }       from '../screens/JobExecutionScreen';
import { NewJobScreen }             from '../screens/NewJobScreen';
import { NewRequestScreen }         from '../screens/customer/NewRequestScreen';
import { WarehouseScreen }          from '../screens/WarehouseScreen';
import { ScanScreen }               from '../screens/ScanScreen';
import { ItemEditorScreen }         from '../screens/ItemEditorScreen';
import { TransferScreen }           from '../screens/TransferScreen';
import { AddReviewScreen }          from '../screens/AddReviewScreen';
import { EditProfileScreen }        from '../screens/EditProfileScreen';
import { EditLinkScreen }           from '../screens/EditLinkScreen';
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
      <Stack.Screen name="NewRequest"       component={NewRequestScreen}      options={{ title: 'קריאת שירות חדשה', presentation: 'modal' }} />
      <Stack.Screen name="Warehouse"        component={WarehouseScreen}       options={{ title: 'מחסן' }} />
      <Stack.Screen name="Scan"             component={ScanScreen}            options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="ItemEditor"       component={ItemEditorScreen}      options={{ title: 'פריט', presentation: 'modal' }} />
      <Stack.Screen name="Transfer"         component={TransferScreen}        options={{ title: 'העברה לרכב', presentation: 'modal' }} />
      <Stack.Screen name="AddReview"        component={AddReviewScreen}       options={{ title: 'הוספת דירוג' }} />
      <Stack.Screen name="EditProfile"      component={EditProfileScreen}     options={{ title: 'עריכת פרופיל' }} />
      <Stack.Screen name="EditLink"         component={EditLinkScreen}        options={{ title: 'קישור' }} />
    </Stack.Navigator>
  );
}
