import React from 'react';
import { StatusBar, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { COLORS } from './src/utils/colors';

import SplashScreen from './src/screens/SplashScreen';

const AppContent = () => {
  const { isAuthenticated, employee, logout } = useAuth();
  const [isSplashDone, setIsSplashDone] = React.useState(false);

  if (!isSplashDone) {
    return <SplashScreen onFinish={() => setIsSplashDone(true)} />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      
      {employee?.status === 'suspended' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Account Suspended</Text>
            <Text style={{ color: 'lightgray', fontSize: 16, textAlign: 'center', marginBottom: 30 }}>
              Your account has been suspended by the administrator. Please contact support.
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 }}
              onPress={logout}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </NavigationContainer>
  );
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.darkBg}
      />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
