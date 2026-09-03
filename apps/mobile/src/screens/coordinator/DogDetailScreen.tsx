import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { ImageSlot } from "../../components/ImageSlot";
import { SectionLabel } from "../../components/SectionLabel";
import { ProgressBar } from "../../components/ProgressBar";
import { Icon } from "../../components/Icon";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../state/AuthContext";
import { api, assetUrl, uploadPhoto } from "../../api/client";
import { AdoptionApplication, DiaryEntry, Dog, Fact, Medication } from "../../api/types";
import { BROWN, CREAM, GOLD, GOLD_LIGHT, TILE_BG } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DogDetail">;

interface DogDetailResponse {
  dog: Dog;
  facts: Fact[];
  health: Fact[];
  medications: Medication[];
  diary: DiaryEntry[];
  applications: AdoptionApplication[];
  lookingFor: string;
  description: string;
}

const APP_STATUS_LABEL: Record<string, { cs: string; en: string }> = {
  pending: { cs: "Čeká", en: "Pending" },
  rejected: { cs: "Zamítnuto", en: "Rejected" },
  approved: { cs: "Schváleno", en: "Approved" },
};

export default function DogDetailScreen({ route, navigation }: Props) {
  const { dogId, tab: initialTab } = route.params;
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<"denik" | "zdravi" | "adopce">(initialTab || "denik");
  const [data, setData] = useState<DogDetailResponse | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<DogDetailResponse>(`/api/dogs/${dogId}?lang=${lang}`);
    setData(res);
  }, [dogId, lang]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return <ScreenScroll nav="DogsList"><Text style={styles.loading}>…</Text></ScreenScroll>;

  const { dog } = data;
  const canLog = user?.activeRole === "foster";
  const canEditPhoto = user?.activeRole === "foster" || user?.activeRole === "coordinator";
  const activeMed = data.medications[0];

  const setHeroPhoto = async (localUri: string) => {
    const url = await uploadPhoto(localUri);
    await api.patch(`/api/dogs/${dogId}/hero-photo`, { url });
    load();
  };

  return (
    <ScreenScroll nav="DogsList" edges={[]}>
      <View style={styles.hero}>
        <ImageSlot
          uri={assetUrl(dog.hero_photo)}
          placeholder={`Foto ${dog.name}`}
          onChange={canEditPhoto ? setHeroPhoto : () => {}}
          style={styles.heroSlot}
        />
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" color={BROWN} size={16} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={{ paddingTop: 18 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{dog.name}</Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{dog.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {dog.breed} · {dog.sex} · {dog.age_label} · {dog.weight_kg} kg
        </Text>

        <View style={styles.factGrid}>
          {data.facts.map((f, i) => (
            <View key={i} style={styles.factCell}>
              <SectionLabel>{f.k}</SectionLabel>
              <Text style={styles.factValue}>{f.v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tabs}>
          {(
            [
              ["denik", lang === "cs" ? "Deník" : "Diary"],
              ["zdravi", lang === "cs" ? "Zdraví" : "Health"],
              ["adopce", lang === "cs" ? "Adopce" : "Adoption"],
            ] as const
          ).map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
              <Text style={[styles.tabLabel, { color: tab === key ? BROWN : "#8C7B72" }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 16, gap: 10 }}>
          {tab === "denik" && (
            <>
              {data.diary.map((e) => (
                <View key={e.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.entryDate}>
                      {e.date_label} · {e.author}
                    </Text>
                    <Text style={styles.entryMood}>{t[e.mood as keyof typeof t] as string}</Text>
                  </View>
                  <Text style={styles.entryNote}>{e.note}</Text>
                </View>
              ))}
              {canLog ? (
                <Pressable onPress={() => navigation.navigate("Log", { dogId })} style={styles.dashedBtn}>
                  <Text style={styles.dashedLabel}>{t.writeToday}</Text>
                </Pressable>
              ) : null}
            </>
          )}

          {tab === "zdravi" && (
            <>
              {activeMed ? (
                <View style={styles.medCard}>
                  <View style={styles.rowBetween}>
                    <SectionLabel color="rgba(253,249,242,0.6)">{t.activeMeds}</SectionLabel>
                    <Text style={styles.medDays}>{activeMed.days_left} dny</Text>
                  </View>
                  <Text style={styles.medDrug}>{activeMed.drug}</Text>
                  <View style={{ marginTop: 13 }}>
                    <ProgressBar pct={activeMed.pct} color={GOLD_LIGHT} trackColor="rgba(253,249,242,0.2)" />
                  </View>
                </View>
              ) : null}
              {data.health.map((h, i) => (
                <View key={i} style={styles.healthRow}>
                  <Text style={styles.healthKey}>{h.k}</Text>
                  <Text style={styles.healthValue}>{h.v}</Text>
                </View>
              ))}
            </>
          )}

          {tab === "adopce" && (
            <>
              <View style={styles.card}>
                <SectionLabel>{t.lookingFor}</SectionLabel>
                <Text style={styles.lookingForText}>{data.lookingFor}</Text>
              </View>
              {data.applications.map((a) => {
                const label = APP_STATUS_LABEL[a.status] || APP_STATUS_LABEL.pending;
                return (
                  <View key={a.id} style={styles.applicationRow}>
                    <View>
                      <Text style={styles.applicantName}>{a.applicant_name}</Text>
                      <Text style={styles.applicantMeta}>
                        {new Date(a.created_at).toLocaleDateString(lang === "cs" ? "cs-CZ" : "en-GB")}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.appStatusChip,
                        { backgroundColor: a.status === "rejected" ? "rgba(91,64,52,.07)" : "rgba(201,162,39,.16)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.appStatusText,
                          { color: a.status === "rejected" ? "#8C7B72" : "#A8851F" },
                        ]}
                      >
                        {lang === "cs" ? label.cs : label.en}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: sans, textAlign: "center", marginTop: 40, color: "#8C7B72" },
  hero: { height: 280, backgroundColor: TILE_BG, marginHorizontal: -22, marginTop: -20 },
  heroSlot: { width: "100%", height: "100%" },
  backBtn: { position: "absolute", top: 16, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(253,249,242,.92)", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  name: { fontFamily: serif, fontSize: 34, color: "#33231C" },
  statusChip: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: "rgba(91,64,52,.1)" },
  statusChipText: { fontFamily: sansSemiBold, fontSize: 11, color: BROWN },
  meta: { fontFamily: sans, fontSize: 14, color: "#8C7B72", marginTop: 6 },
  factGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  factCell: { width: "48%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 14, padding: 12 },
  factValue: { fontFamily: sansMedium, fontSize: 14, marginTop: 7, color: "#33231C" },
  tabs: { flexDirection: "row", gap: 4, marginTop: 20, backgroundColor: "rgba(91,64,52,.07)", padding: 4, borderRadius: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabLabel: { fontFamily: sansSemiBold, fontSize: 13 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 16, padding: 15 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  entryDate: { fontFamily: sansSemiBold, fontSize: 13, color: BROWN },
  entryMood: { fontFamily: sansSemiBold, fontSize: 11, color: GOLD },
  entryNote: { fontFamily: sans, fontSize: 14, color: "#5E5049", marginTop: 7, lineHeight: 20 },
  dashedBtn: { borderWidth: 1.5, borderColor: "rgba(91,64,52,.3)", borderStyle: "dashed", borderRadius: 16, padding: 15, alignItems: "center" },
  dashedLabel: { fontFamily: sansSemiBold, fontSize: 14, color: BROWN },
  medCard: { backgroundColor: BROWN, borderRadius: 16, padding: 16 },
  medDays: { fontFamily: sansSemiBold, fontSize: 12, color: "#E3C05A" },
  medDrug: { fontFamily: sansMedium, fontSize: 15, color: CREAM, marginTop: 9, lineHeight: 21 },
  healthRow: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 16, padding: 15, flexDirection: "row", justifyContent: "space-between" },
  healthKey: { fontFamily: sansMedium, fontSize: 14, color: "#33231C" },
  healthValue: { fontFamily: sans, fontSize: 14, color: "#8C7B72" },
  lookingForText: { fontFamily: sans, fontSize: 14, color: "#5E5049", marginTop: 9, lineHeight: 22 },
  applicationRow: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 16, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  applicantName: { fontFamily: sansSemiBold, fontSize: 14, color: "#33231C" },
  applicantMeta: { fontFamily: sans, fontSize: 12, color: "#A3937F", marginTop: 3 },
  appStatusChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  appStatusText: { fontFamily: sansSemiBold, fontSize: 11 },
});
