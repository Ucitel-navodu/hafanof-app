import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { CheckBox } from "../../components/CheckBox";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { BROWN, CREAM, TEXT_PLACEHOLDER } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Apply">;

const HOUSING: Array<"housingFlat" | "housingHouse" | "housingFarm"> = ["housingFlat", "housingHouse", "housingFarm"];
const HOUSEHOLD: Array<"hhKids" | "hhDog" | "hhCat" | "hhExp"> = ["hhKids", "hhDog", "hhCat", "hhExp"];

export default function ApplyScreen({ route, navigation }: Props) {
  const { dogId } = route.params;
  const { t } = useLanguage();
  const [dogName, setDogName] = useState("");
  const [housing, setHousing] = useState<string>("housingHouse");
  const [household, setHousehold] = useState<Record<string, boolean>>({ hhExp: true });
  const [why, setWhy] = useState("");
  const [terms, setTerms] = useState(false);
  const [applied, setApplied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get<{ dog: { name: string } }>(`/api/dogs/${dogId}`).then((res) => setDogName(res.dog.name));
  }, [dogId]);

  const toggleHousehold = (id: string) => setHousehold((h) => ({ ...h, [id]: !h[id] }));

  const submit = async () => {
    if (!terms) return;
    setSending(true);
    try {
      await api.post("/api/adopter/applications", { dogId, housing, household, why, terms });
      setApplied(true);
    } finally {
      setSending(false);
    }
  };

  const btnLabel = applied ? t.applySent : terms ? t.sendApply : t.applyBlocked;
  const btnBg = applied ? "#6E7F5B" : terms ? BROWN : "#C4B6A9";
  const footnote = applied ? t.applyFootDone : t.applyFoot;

  return (
    <ScreenScroll nav="Apply">
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate("Browse")}>
          <Text style={styles.back}>{t.back}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{t.applyFor} {dogName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>{t.applyTitle}</Text>
      <Text style={styles.subtitle}>{t.applySub}</Text>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.housing}</SectionLabel>
      <View style={styles.housingRow}>
        {HOUSING.map((k) => {
          const active = housing === k;
          return (
            <Pressable key={k} disabled={applied} onPress={() => setHousing(k)} style={[styles.housingChip, { backgroundColor: active ? BROWN : "#FFFFFF", borderColor: active ? BROWN : "rgba(91,64,52,.12)" }]}>
              <Text style={[styles.housingLabel, { color: active ? CREAM : "#5E5049" }]}>{t[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.household}</SectionLabel>
      <View style={{ gap: 8 }}>
        {HOUSEHOLD.map((k) => (
          <Pressable key={k} disabled={applied} onPress={() => toggleHousehold(k)} style={styles.checkRow}>
            <CheckBox checked={!!household[k]} onPress={() => toggleHousehold(k)} round />
            <Text style={styles.checkLabel}>{t[k]}</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.whyHarry}</SectionLabel>
      <TextInput
        value={why}
        onChangeText={setWhy}
        editable={!applied}
        placeholder="Napiš nám něco o sobě a o tom, jak si den s Harrym představuješ…"
        placeholderTextColor={TEXT_PLACEHOLDER}
        multiline
        style={styles.textarea}
      />

      <Pressable onPress={() => !applied && setTerms((v) => !v)} style={styles.termsRow}>
        <CheckBox checked={terms} onPress={() => !applied && setTerms((v) => !v)} round />
        <Text style={styles.termsLabel}>{t.termsLabel}</Text>
      </Pressable>

      <Pressable onPress={submit} disabled={sending || applied} style={[styles.submitBtn, { backgroundColor: btnBg }]}>
        <Text style={styles.submitLabel}>{btnLabel}</Text>
      </Pressable>
      <Text style={styles.footnote}>{footnote}</Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { fontFamily: sansSemiBold, fontSize: 14, color: "#8C7B72" },
  topTitle: { fontFamily: sansSemiBold, fontSize: 13, color: "#A3937F" },
  title: { fontFamily: serif, fontSize: 29, lineHeight: 34, marginTop: 22, color: "#33231C" },
  subtitle: { fontFamily: sans, fontSize: 14, color: "#8C7B72", marginTop: 9, lineHeight: 20 },
  housingRow: { flexDirection: "row", gap: 8 },
  housingChip: { flex: 1, alignItems: "center", paddingVertical: 13, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1 },
  housingLabel: { fontFamily: sansSemiBold, fontSize: 12.5, textAlign: "center" },
  checkRow: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  checkLabel: { fontFamily: sansMedium, fontSize: 14, color: "#33231C" },
  textarea: { width: "100%", minHeight: 110, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.14)", borderRadius: 16, padding: 14, fontFamily: sans, fontSize: 14, color: "#33231C", textAlignVertical: "top" },
  termsRow: { marginTop: 16, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  termsLabel: { flex: 1, fontFamily: sans, fontSize: 13, lineHeight: 19, color: "#5E5049" },
  submitBtn: { marginTop: 20, borderRadius: 999, paddingVertical: 17, alignItems: "center" },
  submitLabel: { fontFamily: sansSemiBold, fontSize: 15, color: CREAM },
  footnote: { fontFamily: sans, fontSize: 12, lineHeight: 18, color: "#A3937F", textAlign: "center", marginTop: 11 },
});
