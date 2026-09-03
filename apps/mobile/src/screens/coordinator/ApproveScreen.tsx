import React, { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAppData } from "../../state/AppDataContext";
import { api, assetUrl } from "../../api/client";
import { ApprovalItem } from "../../api/types";
import { BROWN, CREAM, SUCCESS, TILE_BG } from "../../theme/colors";
import { sans, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Approve">;

export default function ApproveScreen(_props: Props) {
  const { t } = useLanguage();
  const { refreshPendingApprovals } = useAppData();
  const [queue, setQueue] = useState<ApprovalItem[]>([]);

  const load = useCallback(async () => {
    const res = await api.get<{ queue: ApprovalItem[] }>("/api/coordinator/approvals");
    setQueue(res.queue);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (id: string, action: "approve" | "reject") => {
    await api.post(`/api/coordinator/approvals/${id}/${action}`);
    await load();
    refreshPendingApprovals();
  };

  return (
    <ScreenScroll nav="Approve" onRefresh={load}>
      <Text style={styles.title}>{t.approveTitle}</Text>
      <Text style={styles.subtitle}>{t.approveSub}</Text>

      <View style={{ gap: 12, marginTop: 20 }}>
        {queue.map((q) => {
          const ok = q.status === "approved";
          return (
            <View key={q.id} style={styles.card}>
              <View style={styles.photo}>
                {q.photos[0] ? (
                  <Image source={{ uri: assetUrl(q.photos[0]) || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : null}
              </View>
              <View style={{ padding: 15 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.dogName}>{q.dog_name}</Text>
                  <Text style={styles.author}>{q.author}</Text>
                </View>
                <Text style={styles.story}>{q.story}</Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => act(q.id, "approve")} style={[styles.actionBtn, { backgroundColor: ok ? SUCCESS : BROWN }]}>
                    <Text style={styles.actionText}>{ok ? t.approved : t.approve}</Text>
                  </Pressable>
                  <Pressable onPress={() => act(q.id, "reject")} style={styles.rejectBtn}>
                    <Text style={styles.rejectText}>{t.sendBack}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: serif, fontSize: 30, color: "#33231C" },
  subtitle: { fontFamily: sans, fontSize: 14, color: "#8C7B72", marginTop: 7, lineHeight: 20 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 20, overflow: "hidden" },
  photo: { height: 170, backgroundColor: TILE_BG },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  dogName: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  author: { fontFamily: sans, fontSize: 12, color: "#A3937F" },
  story: { fontFamily: sans, fontSize: 14, color: "#5E5049", marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 999 },
  actionText: { fontFamily: sansSemiBold, fontSize: 13, color: CREAM },
  rejectBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "rgba(91,64,52,.2)" },
  rejectText: { fontFamily: sansSemiBold, fontSize: 13, color: BROWN },
});
