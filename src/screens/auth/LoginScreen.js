import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    SafeAreaView,
    Platform,
    Dimensions,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { loginEmployee } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const { height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const LoginScreen = ({ navigation }) => {
    const { login } = useAuth();
    const [employeeId, setEmployeeId] = useState('EMP001');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');

        if (!employeeId) {
            setError('Please enter your Employee ID');
            return;
        }

        if (!pin || pin.length !== 4) {
            setError('Please enter your 4-digit PIN');
            return;
        }

        setLoading(true);

        try {
            const response = await loginEmployee(employeeId, pin);

            if (response.success) {
                login(response.employee);
            } else {
                if (response.message && (response.message.includes('pending') || response.message.includes('rejected'))) {
                    Alert.alert('Registration Status', response.message);
                } else {
                    setError(response.message || 'Login failed');
                }
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header Section */}
            <View style={styles.headerSection}>
                <SafeAreaView style={styles.safeArea}>
                    <Animatable.View
                        animation="fadeInDown"
                        duration={800}
                        style={[styles.headerContent, { paddingTop: STATUSBAR_HEIGHT }]}>

                        {/* Logo */}
                        <Animatable.View
                            animation="bounceIn"
                            duration={1500}
                            style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </Animatable.View>

                        <Text style={styles.brandName}>THAMBI ORU TEA</Text>
                        <View style={styles.taglineContainer}>
                            <View style={styles.taglineLine} />
                            <Text style={styles.tagline}>Employee Portal</Text>
                            <View style={styles.taglineLine} />
                        </View>
                    </Animatable.View>
                </SafeAreaView>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
                <Animatable.View
                    animation="fadeInUp"
                    duration={800}
                    delay={200}
                    style={styles.formCard}>

                    <Text style={styles.formTitle}>Employee Login</Text>
                    <Text style={styles.formSubtitle}>
                        Enter your credentials to start delivering
                    </Text>

                    <Input
                        label="Employee ID"
                        value={employeeId}
                        onChangeText={(text) => {
                            setEmployeeId(text);
                            setError('');
                        }}
                        placeholder="Enter your Employee ID"
                        icon={<Icon name="person-outline" size={20} color={COLORS.mediumGray} />}
                    />

                    <Input
                        label="PIN"
                        value={pin}
                        onChangeText={(text) => {
                            setPin(text);
                            setError('');
                        }}
                        placeholder="Enter 4-digit PIN"
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                        error={error}
                        icon={<Icon name="lock-closed-outline" size={20} color={COLORS.mediumGray} />}
                    />

                    <Button
                        title="Start Shift"
                        onPress={handleLogin}
                        loading={loading}
                        variant="secondary"
                        style={styles.button}
                        icon={<Icon name="log-in" size={20} color={COLORS.textPrimary} />}
                    />

                    <TouchableOpacity
                        style={styles.helpLink}
                        onPress={() => navigation.navigate('Register')}>
                        <Icon name="person-add-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.helpText}>New employee? Register here</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.helpLink}>
                        <Icon name="help-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.helpText}>Need help? Contact support</Text>
                    </TouchableOpacity>
                </Animatable.View>

                {/* Bottom Info */}
                <Animatable.View
                    animation="fadeIn"
                    delay={600}
                    style={styles.bottomInfo}>
                    <View style={styles.infoItem}>
                        <Icon name="shield-checkmark" size={20} color={COLORS.accent} />
                        <Text style={styles.infoText}>Secure Login</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Icon name="location" size={20} color={COLORS.primary} />
                        <Text style={styles.infoText}>GPS Tracking</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Icon name="cash" size={20} color={COLORS.secondary} />
                        <Text style={styles.infoText}>Daily Earnings</Text>
                    </View>
                </Animatable.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerSection: {
        height: height * 0.38,
        backgroundColor: COLORS.darkBg,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    safeArea: {
        flex: 1,
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SIZES.paddingL,
    },
    logoContainer: {
        marginBottom: SIZES.padding,
    },
    logoImage: {
        width: 120,
        height: 120,
    },
    brandName: {
        fontSize: SIZES.xxlarge,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 2,
        marginBottom: 8,
    },
    taglineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    taglineLine: {
        width: 30,
        height: 1,
        backgroundColor: COLORS.secondary,
    },
    tagline: {
        fontSize: SIZES.medium,
        color: COLORS.secondary,
        fontWeight: '500',
    },
    formSection: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: SIZES.padding,
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radiusLarge,
        padding: SIZES.paddingL,
        ...SHADOWS.medium,
    },
    formTitle: {
        fontSize: SIZES.xxlarge,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    formSubtitle: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
        marginBottom: SIZES.paddingL,
    },
    button: {
        marginTop: SIZES.padding,
    },
    helpLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SIZES.paddingL,
        gap: 6,
    },
    helpText: {
        fontSize: SIZES.medium,
        color: COLORS.primary,
    },
    bottomInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: SIZES.paddingL,
        marginTop: SIZES.padding,
    },
    infoItem: {
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});

export default LoginScreen;
