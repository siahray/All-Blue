import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Archive, History, User, Plus } from 'lucide-react-native';
import { TabBackground } from './TabBackground';
import { Colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  // Separate left tabs, center (cook), right tabs
  const leftRoutes = state.routes.filter(r => r.name === 'index' || r.name === 'pantry');
  const centerRoute = state.routes.find(r => r.name === 'cook');
  const rightRoutes = state.routes.filter(r => r.name === 'activities' || r.name === 'profile');

  const getIcon = (name: string, isFocused: boolean) => {
    const color = isFocused ? Colors.black : '#B0B0B0';
    const size = 26;
    const sw = 1.8;
    switch (name) {
      case 'index': return <Home size={size} color={color} strokeWidth={sw} />;
      case 'pantry': return <Archive size={size} color={color} strokeWidth={sw} />;
      case 'activities': return <History size={size} color={color} strokeWidth={sw} />;
      case 'profile': return <User size={size} color={color} strokeWidth={sw} />;
      default: return null;
    }
  };

  const handlePress = (route: any) => {
    const isFocused = state.index === state.routes.indexOf(route);
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={styles.container}>
      <TabBackground color={Colors.surface} />

      <View style={styles.content}>
        {/* ── Left side: Home & Pantry ── */}
        <View style={styles.side}>
          {leftRoutes.map((route) => (
            <TouchableOpacity
              key={route.key}
              onPress={() => handlePress(route)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {getIcon(route.name, state.index === state.routes.indexOf(route))}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Center: Plus Button ── */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.plusButtonArea}
          onPress={() => centerRoute && handlePress(centerRoute)}
        >
          <View style={styles.plusButton}>
            <Plus color="white" size={30} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* ── Right side: Activities & Profile ── */}
        <View style={styles.side}>
          {rightRoutes.map((route) => (
            <TouchableOpacity
              key={route.key}
              onPress={() => handlePress(route)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {getIcon(route.name, state.index === state.routes.indexOf(route))}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: 80,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tabItem: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonArea: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    top: -20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
