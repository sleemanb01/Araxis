import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { WarehouseScreen } from '../screens/WarehouseScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'stats-chart-outline',
  Warehouse: 'cube-outline',
  Profile:   'person-outline',
};

const TAB_LABELS: Record<keyof TabParamList, string> = {
  Dashboard: 'לוח בקרה',
  Warehouse: 'מחסן',
  Profile:   'פרופיל',
};

export function TabNavigator() {
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
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', paddingBottom: 4 },
        tabBarIcon: ({ color }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof TabParamList]} size={22} color={color} />
        ),
        tabBarLabel: TAB_LABELS[route.name as keyof TabParamList],
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Warehouse" component={WarehouseScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
