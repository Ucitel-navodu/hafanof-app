import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { Icon } from "../../components/Icon";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { Wish } from "../../api/types";
import { BROWN, CREAM, TILE_BG } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Pay">;

const AMOUNTS = [300, 500, 1000];
const METHODS: Array<{ id: "apple" | "card" | "qr"; label: { cs: string; en: string }; meta: { cs: string; en: string } }> = [
  { id: "apple", label: { cs: "Apple Pay", en: "Apple Pay" }, meta: { cs: "Klára N. · iPhone", en: "Klára N. · iPhone" } },
  { id: "card", label: { cs: "Platební karta", en: "Card" }, meta: { cs: "•••• 4291", en: "•••• 4291" } },
  { id: "qr", label: { cs: "QR platba", en: "QR payment" }, meta: { cs: "Záloha, když karta nejde", en: "Fallback if the card fails" } },
];

export default function PayScreen({ route, navigation }: Props) {
  const { wishId } = route.params;
  const { t, lang } = useLanguage();
  const [wish, setWish] = useState<Wish | null>(null);
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState<"apple" | "card" | "qr">("apple");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get<{ wish: Wish }>(`/api/patron/wishes/${wishId}`).then((res) => setWish(res.wish));
  }, [wishId]);

  const pay = async () => {
    setPaying(true);
    try {
      await api.post(`/api/patron/wishes/${wishId}/donate`, { amount, method });
      navigation.navigate("Done", { wishId });
    } finally {
      setPaying(false);
    }
  };

  const missing = wish ? Math.max(0, wish.goal_amount - wish.current_amount) : 0;
  const payLabel = (method === "apple" ? " Pay · " : `${t.pay} `) + amount + " Kč";

  return (
    <ScreenScroll nav="Wishes">
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate("Wishes")}>
          <Text style={styles.back}>{t.back}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{t.fulfilWish}</Text>
        <View style={{ width: 40 }} />
      </View>

      {wish ? (
        <View style={styles.wishCard}>
          <View style={styles.tile}>
            <Icon name="paw" color="#B0A296" size={26} />
          </View>
          <View>
            <Text style={styles.wishTitle}>{wish.title}</Text>
            <Text style={styles.wishMeta}>
              {lang === "cs" ? "Chybí" : "Missing"} {missing.toLocaleString("cs-CZ")} Kč {lang === "cs" ? "z" : "of"} {wish.goal_amount.toLocaleString("cs-CZ")} Kč
            </Text>
          </View>
        </View>
      ) : null}

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.amount}</SectionLabel>
      <View style={styles.amountRow}>
        {[...AMOUNTS, 0].map((v, i) => {
          const value = v || 456;
          const active = amount === value;
          return (
            <Pressable key={i} onPress={() => setAmount(value)} style={[styles.amountChip, { backgroundColor: active ? BROWN : "#FFFFFF", borderColor: active ? BROWN : "rgba(91,64,52,.12)" }]}>
              <Text style={[styles.amountLabel, { color: active ? CREAM : "#5E5049" }]}>{v ? `${v} Kč` : t.custom}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.payWith}</SectionLabel>
      <View style={{ gap: 8 }}>
        {METHODS.map((m) => {
          const active = method === m.id;
          return (
            <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.methodRow, { borderColor: active ? BROWN : "rgba(91,64,52,.1)" }]}>
              <View style={[styles.radio, { borderColor: active ? BROWN : "rgba(91,64,52,.3)", backgroundColor: active ? BROWN : "transparent" }]}>
                {active ? <Text style={styles.radioCheck}>✓</Text> : null}
              </View>
              <View>
                <Text style={styles.methodLabel}>{lang === "cs" ? m.label.cs : m.label.en}</Text>
                <Text style={styles.methodMeta}>{lang === "cs" ? m.meta.cs : m.meta.en}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t.gift}</Text>
          <Text style={styles.summaryValue}>{amount} Kč</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t.fee}</Text>
          <Text style={styles.summaryValue}>0 Kč</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>{t.total}</Text>
          <Text style={styles.summaryTotalValue}>{amount} Kč</Text>
        </View>
      </View>

      <Pressable onPress={pay} disabled={paying} style={styles.payBtn}>
        <Text style={styles.payLabel}>{payLabel}</Text>
      </Pressable>
      <Text style={styles.footnote}>{t.payFootnote}</Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { fontFamily: sansSemiBold, fontSize: 14, color: "#8C7B72" },
  topTitle: { fontFamily: sansSemiBold, fontSize: 13, color: "#A3937F" },
  wishCard: { marginTop: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 20, padding: 15, flexDirection: "row", gap: 13, alignItems: "center" },
  tile: { width: 56, height: 56, borderRadius: 14, backgroundColor: TILE_BG, alignItems: "center", justifyContent: "center" },
  wishTitle: { fontFamily: sansSemiBold, fontSize: 16, color: "#33231C" },
  wishMeta: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 4 },
  amountRow: { flexDirection: "row", gap: 8 },
  amountChip: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1 },
  amountLabel: { fontFamily: sansSemiBold, fontSize: 14 },
  methodRow: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioCheck: { color: CREAM, fontSize: 11, fontWeight: "700" },
  methodLabel: { fontFamily: sansSemiBold, fontSize: 14, color: "#33231C" },
  methodMeta: { fontFamily: sans, fontSize: 12, color: "#A3937F", marginTop: 2 },
  summary: { marginTop: 20, backgroundColor: "rgba(91,64,52,.06)", borderRadius: 16, padding: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: sans, fontSize: 13, color: "#5E5049" },
  summaryValue: { fontFamily: sans, fontSize: 13, color: "#5E5049" },
  summaryDivider: { height: 1, backgroundColor: "rgba(91,64,52,.12)", marginVertical: 11 },
  summaryTotalLabel: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  summaryTotalValue: { fontFamily: sansSemiBold, fontSize: 15, color: "#33231C" },
  payBtn: { marginTop: 18, backgroundColor: BROWN, borderRadius: 999, paddingVertical: 17, alignItems: "center" },
  payLabel: { fontFamily: sansSemiBold, fontSize: 15, color: CREAM },
  footnote: { fontFamily: sans, fontSize: 12, lineHeight: 17, color: "#A3937F", textAlign: "center", marginTop: 11 },
});
