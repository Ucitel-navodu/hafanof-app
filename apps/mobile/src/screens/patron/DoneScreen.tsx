import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../state/AuthContext";
import { api } from "../../api/client";
import { Wish } from "../../api/types";
import { BROWN, CREAM } from "../../theme/colors";
import { sans, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Done">;

export default function DoneScreen({ route, navigation }: Props) {
  const { wishId } = route.params;
  const { t } = useLanguage();
  const { switchRole } = useAuth();
  const [wish, setWish] = useState<Wish | null>(null);

  useEffect(() => {
    api.get<{ wish: Wish }>(`/api/patron/wishes/${wishId}`).then((res) => setWish(res.wish));
  }, [wishId]);

  const becomePatron = async () => {
    await switchRole("patron");
    navigation.reset({ index: 0, routes: [{ name: "Patron" }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 20.5C7 17 3.5 14.2 3.5 10.4A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 8.5 2.4c0 3.8-3.5 6.6-8.5 10.1z"
              stroke="#E3C05A"
              strokeWidth={1.3}
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.title}>{t.thanksTitle}</Text>
          <Text style={styles.body}>{t.thanksBody}</Text>
          {wish ? (
            <View style={styles.coversCard}>
              <Text style={styles.coversLabel}>{t.whatItCovers}</Text>
              <Text style={styles.coversBody}>
                {wish.title} — {wish.for_label}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ gap: 8 }}>
          <Pressable onPress={becomePatron} style={styles.primaryBtn}>
            <Text style={styles.primaryLabel}>{t.becomePatron}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Wishes")} style={styles.outlineBtn}>
            <Text style={styles.outlineLabel}>{t.moreWishes}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BROWN },
  content: { flex: 1, padding: 24, paddingTop: 40 },
  title: { fontFamily: serif, fontSize: 34, lineHeight: 40, color: CREAM, marginTop: 24 },
  body: { fontFamily: sans, fontSize: 15, lineHeight: 24, color: "rgba(253,249,242,0.8)", marginTop: 14 },
  coversCard: { marginTop: 24, backgroundColor: "rgba(253,249,242,0.1)", borderWidth: 1, borderColor: "rgba(253,249,242,0.2)", borderRadius: 18, padding: 16 },
  coversLabel: { fontFamily: sansSemiBold, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(253,249,242,0.55)" },
  coversBody: { fontFamily: sans, fontSize: 14, lineHeight: 21, color: CREAM, marginTop: 9 },
  primaryBtn: { backgroundColor: CREAM, borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  primaryLabel: { fontFamily: sansSemiBold, fontSize: 15, color: BROWN },
  outlineBtn: { borderWidth: 1, borderColor: "rgba(253,249,242,0.3)", borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  outlineLabel: { fontFamily: sansSemiBold, fontSize: 15, color: CREAM },
});
