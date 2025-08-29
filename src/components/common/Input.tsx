import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, typography } from '../../constants/theme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  error,
  disabled = false,
  required = false,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const containerStyle = [
    styles.container,
    isFocused ? styles.focused : null,
    error ? styles.error : null,
    disabled ? styles.disabled : null,
    style,
  ].filter(Boolean);

  const inputContainerStyle = [
    styles.inputContainer,
    leftIcon ? styles.inputWithLeftIcon : null,
    (rightIcon || secureTextEntry) ? styles.inputWithRightIcon : null,
  ].filter(Boolean);

  const inputStyleArray = [
    styles.input,
    multiline ? styles.multilineInput : null,
    disabled ? styles.disabledInput : null,
    inputStyle,
  ].filter(Boolean);

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, required && styles.requiredLabel]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={inputContainerStyle}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={lightTheme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={inputStyleArray}
          placeholder={placeholder}
          placeholderTextColor={lightTheme.colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          accessibilityHint={placeholder}
          accessibilityRole="text"
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={lightTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={`${rightIcon} action`}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={lightTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: lightTheme.spacing.md,
  },
  label: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '500',
    color: lightTheme.colors.text,
    marginBottom: lightTheme.spacing.xs,
  },
  requiredLabel: {
    fontWeight: '600',
  },
  required: {
    color: lightTheme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    borderRadius: lightTheme.borderRadius.md,
    backgroundColor: lightTheme.colors.surface,
    minHeight: 48,
  },
  inputWithLeftIcon: {
    paddingLeft: lightTheme.spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: lightTheme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: lightTheme.colors.text,
    paddingHorizontal: lightTheme.spacing.md,
    paddingVertical: lightTheme.spacing.sm,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  leftIcon: {
    marginLeft: lightTheme.spacing.sm,
  },
  rightIcon: {
    marginRight: lightTheme.spacing.sm,
  },
  focused: {
    borderColor: lightTheme.colors.primary,
    borderWidth: 2,
  },
  error: {
    borderColor: lightTheme.colors.error,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledInput: {
    color: lightTheme.colors.textSecondary,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    color: lightTheme.colors.error,
    marginTop: lightTheme.spacing.xs,
  },
});
