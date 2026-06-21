import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { JobPoolScreen }    from '../screens/JobPoolScreen';
import { MyJobsScreen }     from '../screens/MyJobsScreen';
import { WarehouseScreen }  from '../screens/WarehouseScreen';
import { MyRequestsScreen } from '../screens/customer/MyRequestsScreen';
import { ProfileScreen }    from '../screens/ProfileScreen';
import { useAuthStore }     from '../store/useAuthStore';
import { Colors }           from '../constants/colors';
import { Layout }           from '../constants/layout';
import { TabParamList }     from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  JobPool:    '📋',
  MyJobs:     '🔧',
  Warehouse:  '📦',
  MyRequests: '🛎',
  Profile:    '👤',
};

const TAB_LABELS: Record<keyof TabParamList, string> = {
  JobPool:    'בריכה',
  MyJobs:     'המשימות שלי',
  Warehouse:  'מחסן',
  MyRequests: 'הקריאות שלי',
  Profile:    'פרופיל',
};

export function TabNavigator() {
  // Customers and providers get different tab sets. A customer opens service
  // requests; a provider works the job pool / warehouse.
  const isCustomer = useAuthStore((s) => s.profile?.role) === 'customer';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: Layout.tabBarHeight,
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor:   Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          paddingBottom: 4,
        },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>
            {TAB_ICONS[route.name as keyof TabParamList]}
          </Text>
        ),
        tabBarLabel: TAB_LABELS[route.name as keyof TabParamList],
      })}
    >
      {isCustomer ? (
        <Tab.Screen name="MyRequests" component={MyRequestsScreen} />
      ) : (
        <>
          <Tab.Screen name="JobPool"   component={JobPoolScreen} />
          <Tab.Screen name="MyJobs"    component={MyJobsScreen} />
          <Tab.Screen name="Warehouse" component={WarehouseScreen} />
        </>
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
