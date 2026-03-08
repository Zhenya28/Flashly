import { Tabs } from 'expo-router';
import { Home, Layers, User, GraduationCap, BarChart3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 12,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: '/(tabs)',
          title: 'Start',
          tabBarIcon: ({ color, size }) => <Home size={24} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="learning"
        options={{
          title: 'Nauka',
          tabBarIcon: ({ color, size }) => <GraduationCap size={24} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="collections"
        options={{
          title: 'Kolekcje',
          tabBarIcon: ({ color, size }) => <Layers size={24} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statystyki',
          tabBarIcon: ({ color, size }) => <BarChart3 size={24} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={24} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
