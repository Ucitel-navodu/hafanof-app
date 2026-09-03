import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";
import { MUTED } from "../theme/colors";
import { sansSemiBold } from "../theme/typography";

export function SectionLabel({ children, style, color = MUTED }: { children: string; style?: TextStyle; color?: string }) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
