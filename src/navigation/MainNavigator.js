import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES, SHADOWS } from '../utils/colors';

// Screens
import HomeScreen from '../screens/main/HomeScreen';
import OrdersScreen from '../screens/main/OrdersScreen';
import EarningsScreen from '../screens/main/EarningsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import OrderDetailScreen from '../screens/main/OrderDetailScreen';
import BankDetailsScreen from '../screens/main/BankDetailsScreen';
import WorkHistoryScreen from '../screens/main/WorkHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
const HomeStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeMain" component={HomeScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
);

// Orders Stack
const OrdersStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OrdersMain" component={OrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} />
        <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
        <Stack.Screen name="WorkHistory" component={WorkHistoryScreen} />
    </Stack.Navigator>
);

// Main Tab Navigator
const MainNavigator = () => {
    const insets = useSafeAreaInsets();

    const dynamicTabBarStyle = {
        ...styles.tabBar,
        height: Platform.OS === 'ios' ? (60 + insets.bottom) : (60 + Math.max(insets.bottom, 8)),
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8),
    };

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: dynamicTabBarStyle,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabLabel,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.5)',
                tabBarIcon: ({ focused, color }) => {
                    let iconName;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Orders':
                            iconName = focused ? 'receipt' : 'receipt-outline';
                            break;
                        case 'Earnings':
                            iconName = focused ? 'cash' : 'cash-outline';
                            break;
                        case 'Profile':
                            iconName = focused ? 'person' : 'person-outline';
                            break;
                        default:
                            iconName = 'ellipse';
                    }

                    return (
                        <View style={styles.iconWrapper}>
                            <Icon name={iconName} size={22} color={color} />
                            {focused && <View style={[styles.activeIndicator, { backgroundColor: COLORS.primary }]} />}
                        </View>
                    );
                },
            })}>
            <Tab.Screen
                name="Home"
                component={HomeStack}
                options={{ tabBarLabel: 'Dashboard' }}
            />
            <Tab.Screen
                name="Orders"
                component={OrdersStack}
                options={{ tabBarLabel: 'Orders' }}
            />
            <Tab.Screen
                name="Earnings"
                component={EarningsScreen}
                options={{ tabBarLabel: 'Earnings' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileStack}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.secondary,
        borderTopWidth: 0,
        paddingTop: 8,
        ...SHADOWS.medium,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -6,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
});

export default MainNavigator;
