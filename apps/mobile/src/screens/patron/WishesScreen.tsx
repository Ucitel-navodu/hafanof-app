import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { Icon } from "../../components/Icon";
import { ProgressBar } from "../../components/ProgressBar";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { Wish } from "../../api/types";
import { BROWN, CREAM, GOLD, MUTED, TILE_BG } from "../../theme/colors";
import { sansMedium, sansSemiBold, serif, sans } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Wishes">;

export default function WishesScreen({ navigation }: Props) {
  const { t, toggleLang } = useLanguage();
  const [wishes, setWishes] = useState<Wish[]>([]);

  const load = useCallback(async () => {
    const res = await api.get<{ wishes: Wish[] }>("/api/patron/wishes");
    setWishes(res.wishes);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScreenScroll nav="Wishes" onRefresh={load}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Psí přání</Text>
          <Text style={styles.subtitle}>{t.wishesSub}</Text>
        </View>
        <Pressable onPress={toggleLang}><Text style={styles.langShort}>{t.langShort}</Text></Pressable>
      </View>

      <View style={{ gap: 12, marginTop: 20 }}>
        {wishes.map((w) => {
          const pct = Math.round((w.current_amount / w.goal_amount) * 100);
          return (
            <View key={w.id} style={styles.card}>
              <View style={styles.headerInner}>
                <View style={styles.tile}>
                  <Icon name="paw" color="#B0A296" size={26} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wishTitle}>{w.title}</Text>
                  <Text style={styles.wishFor}>{w.for_label}</Text>
                </View>
              </View>
              <View style={styles.body}>
                <ProgressBar pct={pct} color={GOLD} />
                <View style={styles.amountsRow}>
                  <Text style={styles.have}>{w.current_amount.toLocaleString("cs-CZ")} Kč</Text>
                  <Text style={styles.goal}>z {w.goal_amount.toLocaleString("cs-CZ")} Kč</Text>
                </View>
                <Pressable onPress={() => navigation.navigate("Pay", { wishId: w.id })} style={styles.fulfilBtn}>
                  <Text style={styles.fulfilLabel}>{t.fulfilWish}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontFamily: serif, fontSize: 30, color: "#33231C" },
  subtitle: { fontFamily: sans, fontSize: 14, color: "#8C7B72", marginTop: 7, lineHeight: 20 },
  langShort: { fontFamily: sansSemiBold, fontSize: 10, letterSpacing: 1, color: "#8C7B72", marginTop: 6 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 20, overflow: "hidden" },
  headerInner: { flexDirection: "row", gap: 13, padding: 14, paddingBottom: 0 },
  tile: { width: 56, height: 56, borderRadius: 14, backgroundColor: TILE_BG, alignItems: "center", justifyContent: "center" },
  wishTitle: { fontFamily: sansSemiBold, fontSize: 16, color: "#33231C" },
  wishFor: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 4 },
  body: { padding: 14, paddingTop: 12 },
  amountsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  have: { fontFamily: sansMedium, fontSize: 12.5, color: "#5E5049" },
  goal: { fontFamily: sansMedium, fontSize: 12.5, color: "#A3937F" },
  fulfilBtn: { marginTop: 13, backgroundColor: BROWN, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  fulfilLabel: { fontFamily: sansSemiBold, fontSize: 13, color: CREAM },
});
