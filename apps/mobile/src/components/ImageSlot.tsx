import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "./Icon";
import { MUTED, TILE_BG } from "../theme/colors";
import { sansMedium } from "../theme/typography";

interface ImageSlotProps {
  uri?: string | null;
  placeholder: string;
  onChange: (uri: string) => void;
  shape?: "rect" | "rounded" | "circle";
  radius?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export function ImageSlot({ uri, placeholder, onChange, shape = "rect", radius = 16, style, disabled }: ImageSlotProps) {
  const [localUri, setLocalUri] = useState<string | null>(uri || null);

  useEffect(() => {
    setLocalUri(uri || null);
  }, [uri]);

  const pick = async () => {
    if (disabled) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalUri(result.assets[0].uri);
      onChange(result.assets[0].uri);
    }
  };

  const borderRadius = shape === "circle" ? 999 : shape === "rounded" ? radius : 0;
  const shown = localUri || uri;

  return (
    <Pressable onPress={pick} style={[styles.base, { borderRadius, backgroundColor: TILE_BG }, style]}>
      {shown ? (
        <Image source={{ uri: shown }} style={[StyleSheet.absoluteFill, { borderRadius }]} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderWrap}>
          <Icon name="cam" color={MUTED} size={24} />
          {placeholder ? <Text style={styles.placeholderText}>{placeholder}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  placeholderWrap: {
    alignItems: "center",
    gap: 6,
  },
  placeholderText: {
    color: MUTED,
    fontFamily: sansMedium,
    fontSize: 12,
  },
});
