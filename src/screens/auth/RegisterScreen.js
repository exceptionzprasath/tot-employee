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
    ScrollView,
    Alert,
    Image,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import Button from '../../components/Button';
import { registerEmployee } from '../../services/authService';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const RegisterScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        empId: '',
        address: '',
        instagram: '',
        facebook: '',
        familyRelation: '',
        pin: '',
        role: 'employee'
    });

    const [files, setFiles] = useState({
        profilePhoto: null,
        aadharCard: null,
        panCard: null,
        license: null,
        rc: null,
        insurance: null,
        familyAadhar: null,
    });

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickImage = async (field, type = 'library') => {
        const options = {
            mediaType: 'photo',
            quality: 0.7,
            includeBase64: false,
        };

        const callback = (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                Alert.alert('Error', response.errorMessage);
                return;
            }
            if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                setFiles(prev => ({
                    ...prev,
                    [field]: {
                        uri: asset.uri,
                        name: asset.fileName || `${field}.jpg`,
                        type: asset.type || 'image/jpeg',
                    }
                }));
            }
        };

        if (type === 'camera') {
            launchCamera(options, callback);
        } else {
            launchImageLibrary(options, callback);
        }
    };

    const handleRegister = async () => {
        // Validation
        if (!formData.name || !formData.mobile || !formData.empId) {
            Alert.alert('Error', 'Name, Mobile and Employee ID are required');
            return;
        }

        const requiredFiles = ['profilePhoto', 'aadharCard', 'panCard', 'license', 'rc', 'insurance', 'familyAadhar'];
        const missingFiles = requiredFiles.filter(f => !files[f]);
        if (missingFiles.length > 0) {
            Alert.alert('Error', 'Please upload all required documents');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            // Append text fields
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            // Append files
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    // Mapping local field names to backend expected names if different
                    // Backend expects: selfie, insurance, rc, aadhar
                    // We'll pass them with specific names and update backend if needed
                    data.append(key, files[key]);
                }
            });

            const response = await registerEmployee(data);
            if (response.success) {
                Alert.alert(
                    'Success',
                    'Registration submitted successfully! Our team will verify your documents.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
            } else {
                Alert.alert('Error', response.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Error', 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderUploadBox = (field, label, icon) => (
        <View style={styles.uploadContainer}>
            <Text style={styles.uploadLabel}>{label}</Text>
            <TouchableOpacity 
                style={[styles.uploadBox, files[field] && styles.uploadBoxActive]}
                onPress={() => pickImage(field, field === 'profilePhoto' ? 'camera' : 'library')}
            >
                {files[field] ? (
                    <Image source={{ uri: files[field].uri }} style={styles.previewImage} />
                ) : (
                    <>
                        <View style={styles.uploadIconCircle}>
                            <Icon name={icon} size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.uploadActionText}>Upload</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            <View style={styles.header}>
                <SafeAreaView>
                    <View style={[styles.headerContent, { paddingTop: STATUSBAR_HEIGHT + 10 }]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}>
                            <Icon name="arrow-back" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Employee Registration</Text>
                            <Text style={styles.headerSubtitle}>Join our delivery fleet</Text>
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
                        duration={800}
                        style={styles.formCard}>

                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="person-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChangeText={(val) => handleInputChange('name', val)}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1.2, marginRight: 10 }}>
                                <Text style={styles.inputLabel}>Mobile Number</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="call-outline" size={18} color={COLORS.mediumGray} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Mobile"
                                        keyboardType="phone-pad"
                                        value={formData.mobile}
                                        onChangeText={(val) => handleInputChange('mobile', val)}
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Employee ID</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="id-card-outline" size={18} color={COLORS.mediumGray} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="EMP-ID"
                                        value={formData.empId}
                                        onChangeText={(val) => handleInputChange('empId', val)}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputItem}>
                            <Text style={styles.inputLabel}>Address</Text>
                            <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                                <Icon name="location-outline" size={18} color={COLORS.mediumGray} />
                                <TextInput
                                    style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                                    placeholder="Full Address"
                                    multiline
                                    value={formData.address}
                                    onChangeText={(val) => handleInputChange('address', val)}
                                />
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Documents & Vertification</Text>
                        
                        <View style={styles.uploadGrid}>
                            {renderUploadBox('profilePhoto', 'Profile Photo', 'camera-outline')}
                            {renderUploadBox('aadharCard', 'Aadhar Card', 'document-text-outline')}
                            {renderUploadBox('panCard', 'PAN Card', 'card-outline')}
                            {renderUploadBox('license', 'License', 'car-outline')}
                            {renderUploadBox('rc', 'RC Book', 'document-attach-outline')}
                            {renderUploadBox('insurance', 'Insurance', 'shield-checkmark-outline')}
                            {renderUploadBox('familyAadhar', 'Family Aadhar', 'people-circle-outline')}
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Social & Security</Text>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.inputLabel}>Instagram</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="logo-instagram" size={18} color={COLORS.mediumGray} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="ID"
                                        value={formData.instagram}
                                        onChangeText={(val) => handleInputChange('instagram', val)}
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Facebook</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="logo-facebook" size={18} color={COLORS.mediumGray} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="ID"
                                        value={formData.facebook}
                                        onChangeText={(val) => handleInputChange('facebook', val)}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.inputLabel}>Family Relation</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="people-outline" size={18} color={COLORS.mediumGray} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Father/Spouse"
                                        value={formData.familyRelation}
                                        onChangeText={(val) => handleInputChange('familyRelation', val)}
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Security PIN</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="lock-closed-outline" size={18} color={COLORS.mediumGray} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="4 Digits"
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        secureTextEntry
                                        value={formData.pin}
                                        onChangeText={(val) => handleInputChange('pin', val)}
                                    />
                                </View>
                            </View>
                        </View>

                        <Button
                            title="Submit Application"
                            onPress={handleRegister}
                            loading={loading}
                            variant="primary"
                            style={styles.submitBtn}
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
        marginBottom: 15,
        marginTop: 5,
    },
    inputItem: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 5,
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    uploadGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 10,
    },
    uploadContainer: {
        width: (width - SIZES.padding * 4 - 30) / 2,
        marginBottom: 15,
    },
    uploadLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 5,
        textAlign: 'center',
    },
    uploadBox: {
        height: 100,
        backgroundColor: '#FBFBFB',
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.gray,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    uploadBoxActive: {
        borderStyle: 'solid',
        borderColor: COLORS.primary,
    },
    uploadIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(211, 47, 47, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    uploadActionText: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: '700',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    submitBtn: {
        marginTop: 20,
        height: 55,
        borderRadius: SIZES.radius,
    }
});

export default RegisterScreen;
