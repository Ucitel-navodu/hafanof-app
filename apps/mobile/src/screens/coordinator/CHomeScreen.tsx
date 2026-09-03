import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { Card } from "../../components/Card";
import { CheckBox } from "../../components/CheckBox";
import { ProgressBar } from "../../components/ProgressBar";
import { TopAvatar } from "../../components/TopAvatar";
import { Icon } from "../../components/Icon";
import { useAuth } from "../../state/AuthContext";
import { useAppData } from "../../state/AppDataContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { Task } from "../../api/types";
import { BROWN, CREAM, GOLD, GOLD_TEXT, TEXT_FAINT, APPROVE_TINT_BG } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "CHome">;

interface Dashboard {
  tasks: Task[];
  stats: { fosterCount: number; needCount: number; appCount: number };
  pendingApprovals: number;
  mission: { title: string; raised: number; goal: number };
}

export default function CHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { refreshPendingApprovals } = useAppData();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get<Dashboard>("/api/coordinator/dashboard");
    setData(res);
    setLoading(false);
    refreshPendingApprovals();
  }, [refreshPendingApprovals]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleTask = async (task: Task) => {
    setData((d) => (d ? { ...d, tasks: d.tasks.map((x) => (x.id === task.id ? { ...x, done: x.done ? 0 : 1 } : x)) } : d));
    await api.patch(`/api/coordinator/tasks/${task.id}`, { done: !task.done });
  };

  if (!data || loading) {
    return <ScreenScroll nav="CHome"><Text style={styles.loadingText}>…</Text></ScreenScroll>;
  }

  const doneCount = data.tasks.filter((x) => x.done).length;
  const stats = [
    { n: data.stats.fosterCount, label: t.statFoster, color: BROWN },
    { n: data.stats.needCount, label: t.statNeed, color: GOLD },
    { n: data.stats.appCount, label: t.statApp, color: BROWN },
  ];
  const missionPct = Math.round((data.mission.raised / data.mission.goal) * 100);

  return (
    <ScreenScroll nav="CHome" onRefresh={load} refreshing={loading}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <SectionLabel>{t.today}</SectionLabel>
          <Text style={styles.greetTitle}>{t.greet},{"\n"}Kláro</Text>
        </View>
        <View style={styles.headerRight}>
          <TopAvatar initials={user?.initials || "KN"} onPress={() => navigation.navigate("Login")} />
          <Pressable onPress={toggleLang}><Text style={styles.langShort}>{t.langShort}</Text></Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <Card key={i} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: s.color }]}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <SectionLabel>{t.todayTasks}</SectionLabel>
        <Text style={styles.doneLabel}>
          {lang === "cs" ? `${doneCount} ze ${data.tasks.length} hotovo` : `${doneCount} of ${data.tasks.length} done`}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {data.tasks.map((task) => (
          <Pressable key={task.id} onPress={() => toggleTask(task)}>
            <Card style={styles.taskCard}>
              <CheckBox checked={!!task.done} onPress={() => toggleTask(task)} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, task.done ? styles.taskTitleDone : null]}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.meta}</Text>
              </View>
              <Text style={styles.taskTime}>{task.time_label}</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => navigation.navigate("Approve")}>
        <Card style={styles.approveCard}>
          <View style={styles.approveIcon}>
            <Icon name="cam" color={GOLD_TEXT} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.approveTitle}>{t.pendingTitle}</Text>
            <Text style={styles.approveSub}>{data.pendingApprovals} {t.pendingSub}</Text>
          </View>
          <Icon name="chevron" color="#B0A296" size={15} />
        </Card>
      </Pressable>

      <View style={styles.missionCard}>
        <SectionLabel color="rgba(253,249,242,0.6)">{t.mission}</SectionLabel>
        <Text style={styles.missionTitle}>{data.mission.title}</Text>
        <ProgressBar pct={missionPct} color={GOLD} trackColor="rgba(253,249,242,0.2)" height={6} />
        <View style={styles.missionRow}>
          <Text style={styles.missionAmount}>{data.mission.raised.toLocaleString("cs-CZ")} Kč</Text>
          <Text style={styles.missionGoal}>
            {lang === "cs" ? "z" : "of"} {data.mission.goal.toLocaleString("cs-CZ")} Kč
          </Text>
        </View>
      </View>

      <View style={styles.quickRow}>
        <View style={styles.quickBtn}>
          <Text style={styles.quickLabel}>{t.intake}</Text>
        </View>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate("Cal")}>
          <Text style={styles.quickLabel}>{t.calendar}</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate("Wishes")}>
          <Text style={styles.quickLabel}>Psí přání</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loadingText: { fontFamily: sans, color: TEXT_FAINT, textAlign: "center", marginTop: 40 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  greetTitle: { fontFamily: serif, fontSize: 31, lineHeight: 35, marginTop: 10, color: "#33231C" },
  headerRight: { alignItems: "flex-end", gap: 8, marginTop: 4 },
  langShort: { fontFamily: sansSemiBold, fontSize: 10, letterSpacing: 1, color: "#8C7B72" },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 20 },
  statCard: { flex: 1, padding: 14 },
  statNumber: { fontFamily: serif, fontSize: 26 },
  statLabel: { fontFamily: sans, fontSize: 12, color: "#8C7B72", marginTop: 6, lineHeight: 15 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 24, marginBottom: 11 },
  doneLabel: { fontFamily: sansSemiBold, fontSize: 12, color: BROWN },
  taskCard: { flexDirection: "row", gap: 13, alignItems: "flex-start", paddingVertical: 14 },
  taskTitle: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  taskTitleDone: { textDecorationLine: "line-through", color: "#8C7B72" },
  taskMeta: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 3 },
  taskTime: { fontFamily: sansSemiBold, fontSize: 12, color: GOLD },
  approveCard: { flexDirection: "row", gap: 13, alignItems: "center", marginTop: 22, borderColor: "rgba(201,162,39,.5)", borderWidth: 1 },
  approveIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: APPROVE_TINT_BG, alignItems: "center", justifyContent: "center" },
  approveTitle: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  approveSub: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 2 },
  missionCard: { marginTop: 12, backgroundColor: BROWN, borderRadius: 20, padding: 20 },
  missionTitle: { fontFamily: serif, fontSize: 24, color: CREAM, marginTop: 10, marginBottom: 16 },
  missionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  missionAmount: { fontFamily: sansMedium, fontSize: 13, color: CREAM },
  missionGoal: { fontFamily: sans, fontSize: 13, color: "rgba(253,249,242,0.6)" },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  quickBtn: { flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  quickLabel: { fontFamily: sansSemiBold, fontSize: 12, color: BROWN, textAlign: "center" },
});
