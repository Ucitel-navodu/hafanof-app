import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { Card } from "../../components/Card";
import { SectionLabel } from "../../components/SectionLabel";
import { ProgressBar } from "../../components/ProgressBar";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { Appointment, Medication } from "../../api/types";
import { BROWN, CREAM, GOLD, TEXT_FAINT } from "../../theme/colors";
import { sans, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Cal">;

const WEEK = [
  { dow: "Po", day: 1 },
  { dow: "Út", day: 2 },
  { dow: "St", day: 3 },
  { dow: "Čt", day: 4 },
  { dow: "Pá", day: 5 },
  { dow: "So", day: 6 },
  { dow: "Ne", day: 7 },
];
const DOTS = new Set([3, 4, 6]);

export default function CalScreen(_props: Props) {
  const { t } = useLanguage();
  const [calDay, setCalDay] = useState(3);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);

  const load = useCallback(async (day: number) => {
    const res = await api.get<{ appointments: Appointment[]; medications: Medication[] }>(`/api/coordinator/calendar?day=${day}`);
    setAppts(res.appointments);
    setMeds(res.medications);
  }, []);

  useEffect(() => {
    load(calDay);
  }, [calDay, load]);

  return (
    <ScreenScroll nav="Cal">
      <Text style={styles.title}>{t.calTitle}</Text>
      <Text style={styles.subtitle}>{t.calSub}</Text>

      <View style={styles.week}>
        {WEEK.map((d) => {
          const active = calDay === d.day;
          return (
            <Pressable key={d.day} onPress={() => setCalDay(d.day)} style={[styles.dayCell, active && styles.dayCellActive]}>
              <Text style={[styles.dow, { color: active ? "rgba(253,249,242,0.7)" : "#A3937F" }]}>{d.dow}</Text>
              <Text style={[styles.dayNum, { color: active ? CREAM : "#33231C" }]}>{d.day}</Text>
              <View style={[styles.dot, { backgroundColor: DOTS.has(d.day) ? (active ? "#E3C05A" : GOLD) : "transparent" }]} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 9, marginTop: 20 }}>
        {appts.length === 0 ? <Text style={styles.empty}>—</Text> : null}
        {appts.map((a) => (
          <Card key={a.id} style={styles.apptCard}>
            <Text style={styles.apptTime}>{a.time_label}</Text>
            <View style={styles.apptDivider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.apptTitle}>{a.title}</Text>
              <Text style={styles.apptMeta}>{a.meta}</Text>
            </View>
            <View style={styles.apptChip}>
              <Text style={styles.apptChipText}>{a.who}</Text>
            </View>
          </Card>
        ))}
      </View>

      <SectionLabel style={{ marginTop: 26, marginBottom: 11 }}>{t.medsRunning}</SectionLabel>
      <View style={{ gap: 9 }}>
        {meds.map((m) => (
          <Card key={m.id}>
            <View style={styles.medRow}>
              <Text style={styles.medDog}>{m.dog_name}</Text>
              <Text style={[styles.medLeft, { color: m.urgent ? GOLD : BROWN }]}>{m.days_left} dny</Text>
            </View>
            <Text style={styles.medDrug}>{m.drug}</Text>
            <View style={{ marginTop: 11 }}>
              <ProgressBar pct={m.pct} color={m.urgent ? GOLD : BROWN} />
            </View>
          </Card>
        ))}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: serif, fontSize: 30, color: "#33231C" },
  subtitle: { fontFamily: sans, fontSize: 14, color: "#8C7B72", marginTop: 7, lineHeight: 19 },
  week: { flexDirection: "row", gap: 6, marginTop: 18 },
  dayCell: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)" },
  dayCellActive: { backgroundColor: BROWN, borderColor: BROWN },
  dow: { fontFamily: sansSemiBold, fontSize: 10 },
  dayNum: { fontFamily: serif, fontSize: 17, marginTop: 5 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 6 },
  empty: { fontFamily: sans, color: TEXT_FAINT, textAlign: "center" },
  apptCard: { flexDirection: "row", gap: 13, alignItems: "center" },
  apptTime: { fontFamily: sansSemiBold, fontSize: 13, color: GOLD, width: 42 },
  apptDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(91,64,52,.1)" },
  apptTitle: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  apptMeta: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 3 },
  apptChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(91,64,52,.07)" },
  apptChipText: { fontFamily: sansSemiBold, fontSize: 11, color: BROWN },
  medRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  medDog: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  medLeft: { fontFamily: sansSemiBold, fontSize: 12 },
  medDrug: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 4 },
});
