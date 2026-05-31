import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    SafeAreaView,
    Platform,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { updateBankDetails } from '../../services/authService';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const BankDetailsScreen = ({ navigation }) => {
    const { employee, updateEmployeeBankDetails } = useAuth();
    const [loading, setLoading] = useState(false);

    // Load initial bank details if they exist in the employee session
    const [formData, setFormData] = useState({
        holderName: employee?.bankDetails?.holderName || '',
        bankName: employee?.bankDetails?.bankName || '',
        accountNumber: employee?.bankDetails?.accountNumber || '',
        ifscCode: employee?.bankDetails?.ifscCode || '',
        upiId: employee?.bankDetails?.upiId || '',
    });

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        // Validation
        if (!formData.holderName || !formData.bankName || !formData.accountNumber || !formData.ifscCode) {
            Alert.alert('Error', 'Please fill in all required fields.');
            return;
        }

        // Standard IFSC validation (4 letters, 1 zero, 6 alphanumeric)
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(formData.ifscCode.toUpperCase())) {
            Alert.alert('Invalid IFSC', 'Please enter a valid 11-digit IFSC code (e.g. SBIN0012345).');
            return;
        }

        setLoading(true);
        try {
            const phone = employee?.phone || employee?.mobile;
            if (!phone) {
                Alert.alert('Error', 'Could not locate employee session profile.');
                return;
            }

            const response = await updateBankDetails(phone, formData);
            if (response.success) {
                // Instantly update context state
                updateEmployeeBankDetails(formData);
                Alert.alert(
                    'Success',
                    'Bank details saved successfully! Admins will use these details to process your earnings.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', response.message || 'Failed to save bank details.');
            }
        } catch (error) {
            console.error('Save bank details error:', error);
            Alert.alert('Error', 'Server connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView>
                    <View style={[styles.headerContent, { paddingTop: STATUSBAR_HEIGHT + 10 }]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}>
                            <Icon name="arrow-back" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Bank Details</Text>
                            <Text style={styles.headerSubtitle}>Manage your payout account</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}>

                    <Animatable.View
                        animation="fadeInUp"
                        duration={600}
                        style={styles.formCard}>

                        <Text style={styles.sectionTitle}>Payout Account Information</Text>

                        {/* Account Holder Name */}
                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>Account Holder Name *</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="person-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Name as in bank passbook"
                                    value={formData.holderName}
                                    onChangeText={(val) => handleInputChange('holderName', val)}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Bank Name */}
                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>Bank Name *</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="business-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. State Bank of India"
                                    value={formData.bankName}
                                    onChangeText={(val) => handleInputChange('bankName', val)}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Account Number */}
                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>Account Number *</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="card-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter bank account number"
                                    keyboardType="number-pad"
                                    secureTextEntry={false}
                                    value={formData.accountNumber}
                                    onChangeText={(val) => handleInputChange('accountNumber', val)}
                                />
                            </View>
                        </View>

                        {/* IFSC Code */}
                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>IFSC Code *</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="barcode-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="11-digit bank IFSC (e.g. SBIN0001234)"
                                    autoCapitalize="characters"
                                    maxLength={11}
                                    value={formData.ifscCode}
                                    onChangeText={(val) => handleInputChange('ifscCode', val)}
                                />
                            </View>
                        </View>

                        {/* UPI ID */}
                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>UPI ID (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="phone-portrait-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="username@bank"
                                    autoCapitalize="none"
                                    value={formData.upiId}
                                    onChangeText={(val) => handleInputChange('upiId', val)}
                                />
                            </View>
                        </View>

                        {/* Info Note */}
                        <View style={styles.infoBox}>
                            <Icon name="information-circle" size={20} color={COLORS.primary} />
                            <Text style={styles.infoText}>
                                Payouts will be processed to this account based on your shift type. Please double-check your account details for correctness.
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <Button
                            title="Save Bank Details"
                            onPress={handleSave}
                            loading={loading}
                            variant="primary"
                            style={styles.saveBtn}
                        />
                    </Animatable.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.darkBg,
        paddingBottom: 40,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIZES.paddingL,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        fontSize: SIZES.xxlarge,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: SIZES.medium,
        color: 'rgba(255,255,255,0.8)',
    },
    scrollContent: {
        paddingHorizontal: SIZES.padding,
        paddingTop: 10,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radiusLarge,
        padding: SIZES.paddingL,
        marginTop: -30,
        ...SHADOWS.medium,
    },
    sectionTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 20,
        marginTop: 5,
    },
    inputItem: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
        borderRadius: SIZES.radius,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    textInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary + '08',
        borderRadius: SIZES.radius,
        padding: 12,
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.primary + '15',
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },
    saveBtn: {
        marginTop: 20,
        height: 55,
        borderRadius: SIZES.radius,
    },
});

export default BankDetailsScreen;
