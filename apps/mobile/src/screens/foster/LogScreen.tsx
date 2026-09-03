import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { CheckBox } from "../../components/CheckBox";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { BROWN, CREAM, TEXT_PLACEHOLDER } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Log">;

const MOOD_KEYS = ["moodCalm", "moodPlay", "moodNerv", "moodNoApp"] as const;
const CHECK_ITEMS: Array<{ id: string; labelKey: "chkMorning" | "chkMeds" | "chkWalk" | "chkEvening"; hint: string }> = [
  { id: "c1", labelKey: "chkMorning", hint: "1 porce" },
  { id: "c2", labelKey: "chkMeds", hint: "Enroxil 50 mg" },
  { id: "c3", labelKey: "chkWalk", hint: "45 + 30 min" },
  { id: "c4", labelKey: "chkEvening", hint: "1 porce" },
];

export default function LogScreen({ route, navigation }: Props) {
  const dogId = route.params?.dogId || "shebby";
  const { t } = useLanguage();
  const [dogName, setDogName] = useState("");
  const [mood, setMood] = useState<(typeof MOOD_KEYS)[number]>("moodCalm");
  const [checks, setChecks] = useState<Record<string, boolean>>({ c1: true, c2: true });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ dog: { name: string } }>(`/api/dogs/${dogId}`).then((res) => setDogName(res.dog.name));
  }, [dogId]);

  const toggleCheck = (id: string) => setChecks((c) => ({ ...c, [id]: !c[id] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/api/dogs/${dogId}/diary`, { mood, checks, note });
      navigation.navigate("FHome");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenScroll nav="Log">
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate("FHome")}>
          <Text style={styles.cancel}>{t.cancel}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{t.diary} · {dogName}</Text>
        <Pressable onPress={save} disabled={saving}>
          <Text style={styles.save}>{t.save}</Text>
        </Pressable>
      </View>

      <Text style={styles.question}>{t.logQuestion}</Text>

      <SectionLabel style={{ marginTop: 26, marginBottom: 10 }}>{t.mood}</SectionLabel>
      <View style={styles.moodRow}>
        {MOOD_KEYS.map((k) => {
          const active = mood === k;
          return (
            <Pressable key={k} onPress={() => setMood(k)} style={[styles.moodChip, { backgroundColor: active ? BROWN : "#FFFFFF", borderColor: active ? BROWN : "rgba(91,64,52,.12)" }]}>
              <Text style={[styles.moodLabel, { color: active ? CREAM : "#5E5049" }]}>{t[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel style={{ marginTop: 26, marginBottom: 10 }}>{t.checkOff}</SectionLabel>
      <View style={{ gap: 8 }}>
        {CHECK_ITEMS.map((item) => (
          <Pressable key={item.id} onPress={() => toggleCheck(item.id)} style={styles.checkRow}>
            <CheckBox checked={!!checks[item.id]} onPress={() => toggleCheck(item.id)} round />
            <Text style={styles.checkLabel}>{t[item.labelKey]}</Text>
            <Text style={styles.checkHint}>{item.hint}</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel style={{ marginTop: 26, marginBottom: 10 }}>{t.noteFor}</SectionLabel>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Chování, chuť k jídlu, cokoliv neobvyklého…"
        placeholderTextColor={TEXT_PLACEHOLDER}
        multiline
        style={styles.textarea}
      />

      <Button label={t.saveEntry} onPress={save} loading={saving} style={{ marginTop: 24 }} />
      <Text style={styles.footnote}>{t.logFootnote}</Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancel: { fontFamily: sansSemiBold, fontSize: 14, color: "#8C7B72" },
  topTitle: { fontFamily: sansSemiBold, fontSize: 13, color: "#A3937F" },
  save: { fontFamily: sansSemiBold, fontSize: 14, color: BROWN },
  question: { fontFamily: serif, fontSize: 29, lineHeight: 34, marginTop: 22, color: "#33231C" },
  moodRow: { flexDirection: "row", gap: 7 },
  moodChip: { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1 },
  moodLabel: { fontFamily: sansSemiBold, fontSize: 12 },
  checkRow: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  checkLabel: { flex: 1, fontFamily: sansMedium, fontSize: 14, color: "#33231C" },
  checkHint: { fontFamily: sans, fontSize: 12, color: "#A3937F" },
  textarea: { width: "100%", minHeight: 96, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.14)", borderRadius: 16, padding: 14, fontFamily: sans, fontSize: 14, color: "#33231C", textAlignVertical: "top" },
  footnote: { fontFamily: sans, fontSize: 12, lineHeight: 17, color: "#A3937F", textAlign: "center", marginTop: 10 },
});
