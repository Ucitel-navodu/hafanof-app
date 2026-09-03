import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { ImageSlot } from "../../components/ImageSlot";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/LanguageContext";
import { api, assetUrl } from "../../api/client";
import { Dog } from "../../api/types";
import { BROWN, TILE_BG } from "../../theme/colors";
import { sans, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Browse">;

export default function BrowseScreen({ navigation }: Props) {
  const { t, lang, toggleLang } = useLanguage();
  const [featured, setFeatured] = useState<Dog | null>(null);
  const [more, setMore] = useState<Dog[]>([]);

  const load = useCallback(async () => {
    const res = await api.get<{ featured: Dog | null; more: Dog[] }>("/api/adopter/browse");
    setFeatured(res.featured);
    setMore(res.more);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!featured) return <ScreenScroll nav="Browse"><Text style={styles.loading}>…</Text></ScreenScroll>;

  const tags: string[] = JSON.parse(featured.tags || "[]");
  const description = lang === "cs" ? featured.description_cs : featured.description_en;

  return (
    <ScreenScroll nav="Browse" onRefresh={load}>
      <View style={styles.headerRow}>
        <View>
          <SectionLabel>{t.adopterRole}</SectionLabel>
          <Text style={styles.title}>{t.browseTitle}</Text>
        </View>
        <Pressable onPress={toggleLang}><Text style={styles.langShort}>{t.langShort}</Text></Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.heroWrap}>
          <ImageSlot uri={assetUrl(featured.hero_photo)} placeholder={`Foto ${featured.name}`} onChange={() => {}} disabled style={styles.hero} />
          {featured.ready_to_adopt ? (
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>{t.readyToGo}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: 18 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{featured.name}</Text>
            <Text style={styles.meta}>{featured.age_label} · {featured.weight_kg} kg</Text>
          </View>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <Button label={t.wantToMeet} onPress={() => navigation.navigate("Apply", { dogId: featured.id })} style={{ marginTop: 18 }} />
          <Text style={styles.terms}>{t.adoptionTerms}</Text>
        </View>
      </View>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.alsoWaiting}</SectionLabel>
      <View style={styles.moreRow}>
        {more.map((d) => (
          <Pressable key={d.id} onPress={() => navigation.navigate("DogDetail", { dogId: d.id, tab: "adopce" })} style={{ flex: 1 }}>
            <ImageSlot uri={assetUrl(d.hero_photo)} placeholder="" onChange={() => {}} disabled shape="rounded" style={styles.moreImg} />
            <Text style={styles.moreName}>{d.name}</Text>
            <Text style={styles.moreMeta}>{d.age_label} · {d.breed}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: sans, textAlign: "center", marginTop: 40, color: "#8C7B72" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: serif, fontSize: 31, marginTop: 10, color: "#33231C" },
  langShort: { fontFamily: sansSemiBold, fontSize: 10, letterSpacing: 1, color: "#8C7B72", marginTop: 22 },
  card: { marginTop: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 24, overflow: "hidden" },
  heroWrap: { height: 340, backgroundColor: TILE_BG },
  hero: { width: "100%", height: "100%" },
  readyBadge: { position: "absolute", left: 14, top: 14, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(253,249,242,.92)" },
  readyBadgeText: { fontFamily: sansSemiBold, fontSize: 11, color: BROWN },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 9 },
  name: { fontFamily: serif, fontSize: 30, color: "#33231C" },
  meta: { fontFamily: sans, fontSize: 13, color: "#A3937F" },
  description: { fontFamily: sans, fontSize: 14, lineHeight: 22, color: "#5E5049", marginTop: 10 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  tag: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: "rgba(91,64,52,.07)" },
  tagText: { fontFamily: sansSemiBold, fontSize: 11.5, color: BROWN },
  terms: { fontFamily: sans, fontSize: 12, lineHeight: 18, color: "#A3937F", textAlign: "center", marginTop: 10 },
  moreRow: { flexDirection: "row", gap: 10 },
  moreImg: { width: "100%", aspectRatio: 1 },
  moreName: { fontFamily: sansSemiBold, fontSize: 13, color: "#33231C", marginTop: 8 },
  moreMeta: { fontFamily: sans, fontSize: 11.5, color: "#A3937F", marginTop: 2 },
});
