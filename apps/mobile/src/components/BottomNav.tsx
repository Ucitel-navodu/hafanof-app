import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "./Icon";
import { NAVS, ROLE_OF, ScreenName, isNavActive } from "../data/nav";
import { useAuth } from "../state/AuthContext";
import { useAppData } from "../state/AppDataContext";
import { useLanguage } from "../i18n/LanguageContext";
import { BROWN, GOLD, MUTED, CREAM } from "../theme/colors";
import { sansSemiBold, sansBold } from "../theme/typography";
import { RootStackParamList } from "../navigation/types";

export function BottomNav({ current }: { current: ScreenName }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { pendingApprovals } = useAppData();
  const { t } = useLanguage();

  if (!user) return null;
  const role = ROLE_OF[current] || user.activeRole;
  const items = NAVS[role];

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = isNavActive(item.screen, current);
        const color = active ? BROWN : MUTED;
        const badge = item.screen === "Approve" && pendingApprovals > 0 ? String(pendingApprovals) : "";
        return (
          <Pressable key={item.screen} onPress={() => navigation.navigate(item.screen as any)} style={styles.item}>
            <View style={styles.iconWrap}>
              <Icon name={item.icon} color={color} size={22} />
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{t[item.labelKey as keyof typeof t] as string}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: "rgba(253,249,242,0.97)",
    borderTopWidth: 1,
    borderTopColor: "rgba(91,64,52,0.1)",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: sansSemiBold,
    fontSize: 10,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: CREAM,
    fontFamily: sansBold,
    fontSize: 10,
  },
});
