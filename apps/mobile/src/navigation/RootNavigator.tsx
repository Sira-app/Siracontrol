import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AttendanceCheckScreen } from '../screens/AttendanceCheckScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { LeavesScreen } from '../screens/LeavesScreen';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { color: theme.colors.textPrimary },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Inicio', headerShown: false }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ title: 'Tareas' }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeavesScreen}
        options={{ title: 'Vacaciones' }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {profile ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="CheckIn"
              options={{ headerShown: true, title: 'Marcar entrada' }}
            >
              {() => <AttendanceCheckScreen checkType="check_in" preferredMethod="selfie_gps" />}
            </Stack.Screen>
            <Stack.Screen
              name="CheckOut"
              options={{ headerShown: true, title: 'Marcar salida' }}
            >
              {() => <AttendanceCheckScreen checkType="check_out" preferredMethod="selfie_gps" />}
            </Stack.Screen>
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
