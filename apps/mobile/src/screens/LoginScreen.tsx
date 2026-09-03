import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Icon } from "../components/Icon";
import { useAuth } from "../state/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { BROWN, CREAM } from "../theme/colors";
import { sans, sansSemiBold, serif } from "../theme/typography";
import { RootStackParamList } from "../navigation/types";
import { Role } from "../api/types";
import { ROLE_HOME } from "../navigation/roleHome";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const ROLES: Array<{ role: Role; icon: string; labelKey: "roleCoord" | "roleFoster" | "rolePatron" | "roleAdopt"; descKey: "roleCoordD" | "roleFosterD" | "rolePatronD" | "roleAdoptD" }> = [
  { role: "coordinator", icon: "team", labelKey: "roleCoord", descKey: "roleCoordD" },
  { role: "foster", icon: "home", labelKey: "roleFoster", descKey: "roleFosterD" },
  { role: "patron", icon: "heart", labelKey: "rolePatron", descKey: "rolePatronD" },
  { role: "adopter", icon: "paw", labelKey: "roleAdopt", descKey: "roleAdoptD" },
];

export default function LoginScreen({ navigation }: Props) {
  const { user, login, switchRole } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const [busy, setBusy] = useState<Role | null>(null);

  const pick = async (role: Role) => {
    setBusy(role);
    try {
      if (user) {
        await switchRole(role);
      } else {
        await login(role);
      }
      navigation.reset({ index: 0, routes: [{ name: ROLE_HOME[role] }] });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.notifStack}>
          <View style={styles.notif}>
            <Image source={require("../../assets/brand/logo-dark.png")} style={styles.notifIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>HAFANOF</Text>
              <Text style={styles.notifBody}>{t.loginNotif1}</Text>
            </View>
            <Text style={styles.notifTime}>1 h</Text>
          </View>
          <View style={styles.notif}>
            <Image source={require("../../assets/brand/logo-dark.png")} style={styles.notifIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>HAFANOF</Text>
              <Text style={styles.notifBody}>{t.loginNotif2}</Text>
            </View>
            <Text style={styles.notifTime}>8:02</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Image source={require("../../assets/brand/logo-light.png")} style={styles.heroLogo} />
          <Text style={styles.title}>{t.loginTitle}</Text>
          <Text style={styles.subtitle}>{t.loginSub}</Text>
        </View>

        <View style={styles.roleList}>
          {ROLES.map((r) => (
            <Pressable key={r.role} onPress={() => pick(r.role)} disabled={busy !== null} style={styles.roleRow}>
              <View style={styles.roleIcon}>
                <Icon name={r.icon} color={CREAM} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleLabel}>{t[r.labelKey]}</Text>
                <Text style={styles.roleDesc}>{t[r.descKey]}</Text>
              </View>
              <Icon name="chevron" color="rgba(253,249,242,0.6)" size={15} strokeWidth={1.7} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={toggleLang} style={styles.langSwitch}>
          <Text style={styles.langSwitchText}>{t.langSwitch}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BROWN },
  scroll: { flexGrow: 1, padding: 22, paddingTop: 12 },
  notifStack: { gap: 8 },
  notif: {
    backgroundColor: "rgba(253,249,242,0.14)",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 11,
    alignItems: "flex-start",
  },
  notifIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: CREAM },
  notifTitle: { color: CREAM, fontFamily: sansSemiBold, fontSize: 12 },
  notifBody: { color: "rgba(253,249,242,0.85)", fontFamily: sans, fontSize: 13, marginTop: 2, lineHeight: 17 },
  notifTime: { color: "rgba(253,249,242,0.55)", fontFamily: sans, fontSize: 11 },
  hero: { paddingVertical: 40, alignItems: "flex-start" },
  heroLogo: { width: 96, height: 96, borderRadius: 48, marginBottom: 24, backgroundColor: CREAM },
  title: { color: CREAM, fontFamily: serif, fontSize: 34, lineHeight: 38 },
  subtitle: { color: "rgba(253,249,242,0.75)", fontFamily: sans, fontSize: 15, lineHeight: 22, marginTop: 12 },
  roleList: { gap: 8 },
  roleRow: {
    backgroundColor: "rgba(253,249,242,0.1)",
    borderWidth: 1,
    borderColor: "rgba(253,249,242,0.22)",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  roleIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  roleLabel: { color: CREAM, fontFamily: sansSemiBold, fontSize: 15 },
  roleDesc: { color: "rgba(253,249,242,0.65)", fontFamily: sans, fontSize: 12.5, marginTop: 2, lineHeight: 16 },
  langSwitch: { alignItems: "center", marginTop: 18, paddingVertical: 12 },
  langSwitchText: { color: "rgba(253,249,242,0.6)", fontFamily: sansSemiBold, fontSize: 12 },
});
