import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { ImageSlot } from "../../components/ImageSlot";
import { SectionLabel } from "../../components/SectionLabel";
import { ProgressBar } from "../../components/ProgressBar";
import { TopAvatar } from "../../components/TopAvatar";
import { Button } from "../../components/Button";
import { useAuth } from "../../state/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { api, assetUrl, uploadPhoto } from "../../api/client";
import { Dog, Medication, Wish } from "../../api/types";
import { BROWN, CREAM, GOLD, GOLD_SOFT_BG, GOLD_SOFT_BORDER } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "FHome">;

interface FosterHome {
  dog: Dog;
  med: Medication | null;
  todayChecks: Record<string, boolean>;
  wishes: Wish[];
}

export default function FHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<FosterHome | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<FosterHome>("/api/foster/home");
    setData(res);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return <ScreenScroll nav="FHome"><Text style={styles.loading}>…</Text></ScreenScroll>;

  const { dog, med, todayChecks, wishes } = data;
  const checkedCount = Object.values(todayChecks).filter(Boolean).length;
  const checkPct = (checkedCount / 4) * 100;
  const sinceDate = new Date(dog.in_care_since.split(".").reverse().join("-") || dog.in_care_since);
  const days = isNaN(sinceDate.getTime()) ? null : Math.floor((Date.now() - sinceDate.getTime()) / 86400000);

  const setHeroPhoto = async (localUri: string) => {
    const url = await uploadPhoto(localUri);
    await api.patch(`/api/dogs/${dog.id}/hero-photo`, { url });
    load();
  };

  return (
    <ScreenScroll nav="FHome" onRefresh={load}>
      <View style={styles.headerRow}>
        <View>
          <SectionLabel>{t.fosterRole}</SectionLabel>
          <Text style={styles.greetTitle}>{t.greet},{"\n"}Kláro</Text>
        </View>
        <TopAvatar initials={user?.initials || "KN"} onPress={() => navigation.navigate("Login")} />
      </View>

      <View style={styles.fosterCard}>
        <ImageSlot uri={assetUrl(dog.hero_photo)} placeholder={`Foto ${dog.name}`} onChange={setHeroPhoto} style={styles.hero} />
        <View style={{ padding: 16 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.dogName}>{dog.name}</Text>
            <Pressable onPress={() => navigation.navigate("DogDetail", { dogId: dog.id, tab: "denik" })}>
              <Text style={styles.profileLink}>{t.wholeProfile}</Text>
            </Pressable>
          </View>
          <Text style={styles.sinceText}>
            {t.withYouSince} {dog.in_care_since}
            {days !== null ? ` · ${days} dní` : ""}
          </Text>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <Text style={styles.progressLabel}>{t.todayProgress}</Text>
            <Text style={styles.progressValue}>{checkedCount}/4</Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <ProgressBar pct={checkPct} color={BROWN} />
          </View>
          <View style={styles.ctaRow}>
            <Button label={t.writeDay} onPress={() => navigation.navigate("Log", { dogId: dog.id })} style={{ flex: 1 }} />
            <Button label={t.addPhoto} variant="outline" onPress={() => navigation.navigate("Upload", { dogId: dog.id })} style={{ flex: 1 }} />
          </View>
        </View>
      </View>

      {med ? (
        <View style={styles.medAlert}>
          <View style={styles.medIcon}>
            <Text style={styles.medIconText}>!</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medTitle}>{t.medDue}</Text>
            <Text style={styles.medMeta}>{med.drug} · zbývají {med.days_left} dny</Text>
          </View>
        </View>
      ) : null}

      <SectionLabel style={{ marginTop: 24, marginBottom: 11 }}>{t.needsNow}</SectionLabel>
      <View style={{ gap: 9 }}>
        {wishes.map((w) => {
          const pct = Math.round((w.current_amount / w.goal_amount) * 100);
          return (
            <Pressable key={w.id} onPress={() => navigation.navigate("Wishes")} style={styles.needRow}>
              <View>
                <Text style={styles.needTitle}>{w.title}</Text>
                <Text style={styles.needMeta}>
                  {w.current_amount.toLocaleString("cs-CZ")} Kč z {w.goal_amount.toLocaleString("cs-CZ")} Kč
                </Text>
              </View>
              <Text style={styles.needPct}>{pct}%</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.contactRow}>
        <View>
          <Text style={styles.contactName}>Petra S. — koordinátorka</Text>
          <Text style={styles.contactMeta}>{t.writeWhatsapp}</Text>
        </View>
        <View style={styles.whatsappBtn}>
          <Text style={styles.whatsappLabel}>WhatsApp</Text>
        </View>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: sans, textAlign: "center", marginTop: 40, color: "#8C7B72" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greetTitle: { fontFamily: serif, fontSize: 31, lineHeight: 35, marginTop: 10, color: "#33231C" },
  fosterCard: { marginTop: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 22, overflow: "hidden" },
  hero: { width: "100%", height: 190 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  dogName: { fontFamily: serif, fontSize: 26, color: "#33231C" },
  profileLink: { fontFamily: sansSemiBold, fontSize: 12, color: BROWN },
  sinceText: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 5 },
  divider: { height: 1, backgroundColor: "rgba(91,64,52,.1)", marginVertical: 14 },
  progressLabel: { fontFamily: sansMedium, fontSize: 14, color: "#33231C" },
  progressValue: { fontFamily: sansSemiBold, fontSize: 13, color: BROWN },
  ctaRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  medAlert: { marginTop: 14, backgroundColor: GOLD_SOFT_BG, borderWidth: 1, borderColor: GOLD_SOFT_BORDER, borderRadius: 18, padding: 15, flexDirection: "row", gap: 12, alignItems: "center" },
  medIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  medIconText: { color: CREAM, fontFamily: sansSemiBold, fontSize: 15 },
  medTitle: { fontFamily: sansSemiBold, fontSize: 14, color: "#33231C" },
  medMeta: { fontFamily: sans, fontSize: 12.5, color: "#7A6A5E", marginTop: 2 },
  needRow: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 16, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  needTitle: { fontFamily: sansSemiBold, fontSize: 14, color: "#33231C" },
  needMeta: { fontFamily: sans, fontSize: 12, color: "#A3937F", marginTop: 3 },
  needPct: { fontFamily: sansSemiBold, fontSize: 12, color: GOLD },
  contactRow: { marginTop: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 16, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contactName: { fontFamily: sansSemiBold, fontSize: 14, color: "#33231C" },
  contactMeta: { fontFamily: sans, fontSize: 12, color: "#A3937F", marginTop: 3 },
  whatsappBtn: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: "rgba(91,64,52,.22)" },
  whatsappLabel: { fontFamily: sansSemiBold, fontSize: 12, color: BROWN },
});
