import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { BROWN, CREAM } from "../theme/colors";
import { sansSemiBold } from "../theme/typography";

export function TopAvatar({ initials, onPress }: { initials: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.avatar}>
      <Text style={styles.label}>{initials}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: CREAM,
    fontFamily: sansSemiBold,
    fontSize: 14,
  },
});
