import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useOverdue } from '@/context/OverdueContext';
import CustomHeader from '@/components/CustomHeader';

function HistoryTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const { overdueCount } = useOverdue();

  return (
    <View>
      <Ionicons 
        name={focused ? "time" : "time-outline"} 
        size={size} 
        color={color} />
      {overdueCount > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{overdueCount > 9 ? '9+' : overdueCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 28 : 12,
            paddingTop: 8,
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
          headerShown: true,
          header: () => <CustomHeader />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ebooks"
          options={{
            title: 'eBooks',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "reader" : "reader-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="books"
          options={{
            title: 'Catalog',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "book" : "book-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reservations"
          options={{
            title: 'Reservations',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size, focused }) => (
              <HistoryTabIcon color={color} size={size} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="stories"
          options={{
            title: 'Stories',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "play-circle" : "play-circle-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="programs"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="placeholder"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBadge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
