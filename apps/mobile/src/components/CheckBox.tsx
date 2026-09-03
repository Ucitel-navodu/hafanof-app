import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { BROWN, CREAM } from "../theme/colors";

export function CheckBox({ checked, onPress, round }: { checked: boolean; onPress: () => void; round?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.box,
        round && { borderRadius: 10 },
        {
          borderColor: checked ? BROWN : "rgba(91,64,52,0.35)",
          backgroundColor: checked ? BROWN : "transparent",
        },
      ]}
    >
      {checked ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    color: CREAM,
    fontSize: 11,
    fontWeight: "700",
  },
});
