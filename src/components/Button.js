import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../utils/colors';

const Button = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    icon,
    style,
    textStyle,
}) => {
    const getButtonStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.buttonSecondary;
            case 'outline':
                return styles.buttonOutline;
            case 'success':
                return styles.buttonSuccess;
            case 'danger':
                return styles.buttonDanger;
            case 'ghost':
                return styles.buttonGhost;
            default:
                return styles.buttonPrimary;
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'outline':
            case 'ghost':
                return styles.textOutline;
            default:
                return styles.textPrimary;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                getButtonStyle(),
                disabled && styles.buttonDisabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}>
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.white}
                    size="small"
                />
            ) : (
                <View style={styles.content}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: SIZES.padding,
        paddingHorizontal: SIZES.paddingL,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    buttonPrimary: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.small,
    },
    buttonSecondary: {
        backgroundColor: COLORS.secondary,
        ...SHADOWS.small,
    },
    buttonSuccess: {
        backgroundColor: COLORS.success,
        ...SHADOWS.small,
    },
    buttonDanger: {
        backgroundColor: COLORS.error,
        ...SHADOWS.small,
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    buttonGhost: {
        backgroundColor: 'transparent',
    },
    buttonDisabled: {
        backgroundColor: COLORS.gray,
        borderColor: COLORS.gray,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: SIZES.regular,
        fontWeight: '600',
    },
    textPrimary: {
        color: COLORS.white,
    },
    textOutline: {
        color: COLORS.primary,
    },
    iconContainer: {
        marginRight: 8,
    },
});

export default Button;
