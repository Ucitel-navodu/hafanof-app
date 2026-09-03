import React, { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { TopAvatar } from "../../components/TopAvatar";
import { useLanguage } from "../../i18n/LanguageContext";
import { api, assetUrl } from "../../api/client";
import { Patronage, PatronUpdate } from "../../api/types";
import { BROWN, CREAM } from "../../theme/colors";
import { sans, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Patron">;

const AMOUNTS = [200, 300, 500, 1000];

export default function PatronScreen({ navigation }: Props) {
  const { t, lang } = useLanguage();
  const [patronage, setPatronage] = useState<Patronage | null>(null);
  const [updates, setUpdates] = useState<PatronUpdate[]>([]);
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ patronage: Patronage; updates: PatronUpdate[] }>("/api/patron/me");
    setPatronage(res.patronage);
    setUpdates(res.updates);
    setOriginalAmount((prev) => (prev === null ? res.patronage.monthly_amount : prev));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changeAmount = async (amount: number) => {
    const res = await api.post<{ patronage: Patronage }>("/api/patron/amount", { amount });
    setPatronage(res.patronage);
  };

  if (!patronage) return <ScreenScroll nav="Patron"><Text style={styles.loading}>…</Text></ScreenScroll>;

  const changed = originalAmount !== null && patronage.monthly_amount !== originalAmount;
  const note = changed
    ? lang === "cs"
      ? `Změněno na ${patronage.monthly_amount} Kč od 1. 10. · potvrzení přijde e-mailem.`
      : `Changed to ${patronage.monthly_amount} Kč from 1 Oct · confirmation by e-mail.`
    : lang === "cs"
    ? "Aktuální částka. Změna platí od příštího měsíce."
    : "Current amount. Changes apply next month.";

  return (
    <ScreenScroll nav="Patron" onRefresh={load}>
      <View style={styles.headerRow}>
        <View>
          <SectionLabel>{t.patronRole}</SectionLabel>
          <Text style={styles.title}>{t.myPatronage}</Text>
        </View>
        <TopAvatar initials="JV" onPress={() => navigation.navigate("Login")} />
      </View>

      <View style={styles.patronageCard}>
        <View style={styles.dogRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{patronage.dog_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dogName}>{patronage.dog_name}</Text>
            <Text style={styles.since}>{t.patronSince} {patronage.since_label}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.statsRow}>
          <View>
            <SectionLabel color="rgba(253,249,242,0.55)">{t.monthly}</SectionLabel>
            <Text style={styles.statValue}>{patronage.monthly_amount} Kč</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <SectionLabel color="rgba(253,249,242,0.55)">{t.givenTotal}</SectionLabel>
            <Text style={styles.statValue}>{patronage.given_total.toLocaleString("cs-CZ")} Kč</Text>
          </View>
        </View>
      </View>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.changeAmount}</SectionLabel>
      <View style={styles.amountRow}>
        {AMOUNTS.map((v) => {
          const active = patronage.monthly_amount === v;
          return (
            <Pressable key={v} onPress={() => changeAmount(v)} style={[styles.amountChip, { backgroundColor: active ? BROWN : "#FFFFFF", borderColor: active ? BROWN : "rgba(91,64,52,.12)" }]}>
              <Text style={[styles.amountLabel, { color: active ? CREAM : "#5E5049" }]}>{v} Kč</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>{note}</Text>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.harryNews}</SectionLabel>
      <View style={{ gap: 10 }}>
        {updates.map((u, i) => (
          <View key={u.id} style={styles.updateCard}>
            {i === 0 ? (
              <View style={styles.updatePhoto}>
                {u.photo ? <Image source={{ uri: assetUrl(u.photo) || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              </View>
            ) : null}
            <View style={{ padding: 15 }}>
              <Text style={styles.updateTitle}>{u.title}</Text>
              <Text style={styles.updateBody}>{u.body}</Text>
              <Text style={styles.updateMeta}>{u.author} · {u.date_label}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => Alert.alert(t.certificate, lang === "cs" ? "Certifikát bude brzy ke stažení." : "Your certificate will be downloadable soon.")}
          style={styles.actionBtn}
        >
          <Text style={styles.actionLabel}>{t.certificate}</Text>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert(t.pause, lang === "cs" ? "Patronát lze pozastavit kdykoli v nastavení." : "You can pause your patronage any time in settings.")}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionLabel, { color: "#8C7B72" }]}>{t.pause}</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: sans, textAlign: "center", marginTop: 40, color: "#8C7B72" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: serif, fontSize: 31, marginTop: 10, color: "#33231C" },
  patronageCard: { marginTop: 20, backgroundColor: BROWN, borderRadius: 22, padding: 20 },
  dogRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(253,249,242,.14)", borderWidth: 1, borderColor: "rgba(253,249,242,.25)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: serif, fontSize: 26, color: CREAM },
  dogName: { fontFamily: serif, fontSize: 26, color: CREAM },
  since: { fontFamily: sans, fontSize: 13, color: "rgba(253,249,242,.7)", marginTop: 6 },
  divider: { height: 1, backgroundColor: "rgba(253,249,242,.18)", marginVertical: 16 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  statValue: { fontFamily: serif, fontSize: 28, color: CREAM, marginTop: 8 },
  amountRow: { flexDirection: "row", gap: 8 },
  amountChip: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1 },
  amountLabel: { fontFamily: sansSemiBold, fontSize: 14 },
  note: { fontFamily: sans, fontSize: 12, lineHeight: 17, color: "#A3937F", marginTop: 10 },
  updateCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 16, overflow: "hidden" },
  updatePhoto: { height: 150, backgroundColor: "#F0E7D9" },
  updateTitle: { fontFamily: sansSemiBold, fontSize: 14, color: "#33231C" },
  updateBody: { fontFamily: sans, fontSize: 13.5, lineHeight: 19, color: "#5E5049", marginTop: 6 },
  updateMeta: { fontFamily: sans, fontSize: 12, color: "#A3937F", marginTop: 10 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "rgba(91,64,52,.2)" },
  actionLabel: { fontFamily: sansSemiBold, fontSize: 13, color: BROWN },
});
