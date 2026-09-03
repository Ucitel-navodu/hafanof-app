import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { BROWN, CREAM, TEXT_FAINT } from "../theme/colors";
import { sansSemiBold } from "../theme/typography";

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  flex?: boolean;
}

export function Chip({ label, active, onPress, flex }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        flex && { flex: 1 },
        {
          backgroundColor: active ? BROWN : "#FFFFFF",
          borderColor: active ? BROWN : "rgba(91,64,52,0.2)",
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? CREAM : TEXT_FAINT }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  label: {
    fontFamily: sansSemiBold,
    fontSize: 12,
  },
});
