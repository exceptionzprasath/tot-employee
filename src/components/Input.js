import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../utils/colors';

const Input = ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    maxLength,
    secureTextEntry = false,
    error,
    label,
    icon,
    rightIcon,
    style,
    inputStyle,
}) => {
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputWrapper, error && styles.inputError]}>
                {icon && <View style={styles.iconLeft}>{icon}</View>}
                <TextInput
                    style={[styles.input, inputStyle]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.mediumGray}
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    secureTextEntry={secureTextEntry}
                />
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SIZES.paddingS,
    },
    label: {
        fontSize: SIZES.medium,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: SIZES.paddingXS,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        borderWidth: 1.5,
        borderColor: COLORS.gray,
        minHeight: 50,
        paddingHorizontal: SIZES.paddingS,
        ...SHADOWS.small,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    input: {
        flex: 1,
        fontSize: SIZES.regular,
        color: COLORS.textPrimary,
        paddingVertical: SIZES.paddingS,
        paddingHorizontal: SIZES.paddingS,
    },
    iconLeft: {
        marginRight: SIZES.paddingXS,
    },
    iconRight: {
        marginLeft: SIZES.paddingXS,
    },
    errorText: {
        fontSize: SIZES.small,
        color: COLORS.error,
        marginTop: SIZES.paddingXS,
    },
});

export default Input;
