import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, fonts } from '../../src/theme';

function TabIcon({ focused, icon, label }) {
  const scale   = useRef(new Animated.Value(focused ? 1 : 0.82)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.5)).current;
  const bgScale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.82,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.5,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(bgScale, {
        toValue: focused ? 1 : 0,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={ti.wrap}>
      {/* Animated highlight pill */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        ti.pill,
        { transform: [{ scale: bgScale }] },
      ]} />
      <Animated.Text style={[
        ti.icon,
        focused && ti.iconActive,
        { transform: [{ scale }], opacity },
      ]}>
        {icon}
      </Animated.Text>
      <Animated.Text style={[
        ti.label,
        focused && ti.labelActive,
        { opacity },
      ]}>
        {label}
      </Animated.Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#080B14',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="⌂" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="◉" label="Live" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="◈" label="Chat" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="○" label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const ti = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    width: 64,
    gap: 2,
  },
  pill: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,135,0.1)',
    marginHorizontal: -2,
  },
  icon:        { fontSize: 18, color: colors.textMuted },
  iconActive:  { color: colors.accent },
  label:       { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  labelActive: { color: colors.accent },
});
