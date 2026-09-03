import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { BROWN, BROWN_DARK, CREAM, TEXT_PLACEHOLDER } from "../theme/colors";
import { sansSemiBold } from "../theme/typography";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  color,
  textColor,
  style,
}: ButtonProps) {
  const bg = disabled ? TEXT_PLACEHOLDER : color || (variant === "primary" ? BROWN : "transparent");
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "outline" && styles.outline,
        { backgroundColor: variant === "primary" ? bg : "transparent" },
        pressed && variant === "primary" && !disabled && { backgroundColor: BROWN_DARK },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? CREAM : BROWN} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: textColor || (variant === "primary" ? CREAM : BROWN) },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: {
    borderWidth: 1,
    borderColor: "rgba(91,64,52,0.22)",
  },
  label: {
    fontFamily: sansSemiBold,
    fontSize: 15,
  },
});
