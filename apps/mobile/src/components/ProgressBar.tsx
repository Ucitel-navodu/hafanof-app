import React from "react";
import { StyleSheet, View } from "react-native";

export function ProgressBar({
  pct,
  color,
  trackColor = "rgba(91,64,52,0.1)",
  height = 6,
}: {
  pct: number;
  color: string;
  trackColor?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
