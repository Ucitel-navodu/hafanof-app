import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "./BottomNav";
import { PAPER, BROWN } from "../theme/colors";
import { ScreenName } from "../data/nav";

interface ScreenScrollProps {
  children: React.ReactNode;
  nav?: ScreenName;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Array<"top" | "bottom" | "left" | "right">;
}

export function ScreenScroll({ children, nav, background = PAPER, refreshing, onRefresh, edges }: ScreenScrollProps) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges || ["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={BROWN} /> : undefined}
      >
        {children}
      </ScrollView>
      {nav ? <View style={styles.navWrap}><BottomNav current={nav} /></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 20, paddingBottom: 28 },
  navWrap: {},
});
