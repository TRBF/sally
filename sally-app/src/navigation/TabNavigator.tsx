import React from 'react';
import { View, Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MapScreen from '../screens/MapScreen';
import ContactsScreen from '../screens/ContactsScreen';
import AssistantScreen from '../screens/AssistantScreen';

const Tab = createBottomTabNavigator();

const SALLY_LOGO = require('../../assets/logo-sally.jpeg') as number;

function AssistantTabIcon({ size, focused }: { size: number; focused: boolean }) {
  const ring: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    opacity: focused ? 1 : 0.5,
  };
  const imageStyle: StyleProp<ImageStyle> = { width: size, height: size };
  return (
    <View style={ring} accessibilityLabel="Assistant" accessibilityRole="image">
      <Image
        source={SALLY_LOGO}
        style={imageStyle}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={AssistantScreen}
        options={{
          tabBarIcon: ({ size, focused }) => <AssistantTabIcon size={size} focused={focused} />,
          tabBarHideOnKeyboard: true,
        }}
      />
    </Tab.Navigator>
  );
}
