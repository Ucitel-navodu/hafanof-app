import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { ScreenScroll } from "../../components/ScreenScroll";
import { SectionLabel } from "../../components/SectionLabel";
import { Chip } from "../../components/Chip";
import { Icon } from "../../components/Icon";
import { ImageSlot } from "../../components/ImageSlot";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { BROWN, MUTED, SUCCESS, TEXT_PLACEHOLDER, TILE_BG } from "../../theme/colors";
import { sans, sansMedium, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Upload">;

const TAGS: Array<{ id: string; cs: string; en: string }> = [
  { id: "t_novy", cs: "Nový pokrok", en: "Progress" },
  { id: "t_denik", cs: "Ze všedního dne", en: "Everyday" },
  { id: "t_adopce", cs: "Hledá domov", en: "Needs a home" },
  { id: "t_dik", cs: "Poděkování", en: "Thank you" },
];

export default function UploadScreen({ route, navigation }: Props) {
  const dogId = route.params?.dogId || "shebby";
  const { t, lang } = useLanguage();
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [story, setStory] = useState("");
  const [tags, setTags] = useState<Record<string, boolean>>({ t_novy: true });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const setSlot = (index: number, uri: string) => {
    setPhotos((p) => p.map((v, i) => (i === index ? uri : v)));
  };

  const addMore = async () => {
    const emptyIndex = photos.findIndex((p) => !p);
    if (emptyIndex === -1) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setSlot(emptyIndex, result.assets[0].uri);
  };

  const toggleTag = (id: string) => setTags((s) => ({ ...s, [id]: !s[id] }));

  const submit = async () => {
    setSending(true);
    try {
      const urls: string[] = [];
      for (const uri of photos.filter(Boolean) as string[]) {
        const form = new FormData();
        form.append("photo", { uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
        const res = await api.upload<{ url: string }>("/api/uploads", form);
        urls.push(res.url);
      }
      const selectedTags = Object.entries(tags).filter(([, v]) => v).map(([k]) => k);
      await api.post("/api/stories", { dogId, photos: urls, story, tags: selectedTags });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenScroll nav="Upload">
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate("FHome")}>
          <Text style={styles.cancel}>{t.cancel}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{t.storyOf} Shebby</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>{t.uploadTitle}</Text>
      <Text style={styles.subtitle}>{t.uploadSub}</Text>

      <View style={styles.grid}>
        {photos.map((uri, i) => (
          <View key={i} style={styles.gridCell}>
            <ImageSlot uri={uri} placeholder="Foto" onChange={(u) => setSlot(i, u)} shape="rounded" />
          </View>
        ))}
        <Pressable onPress={addMore} style={[styles.gridCell, styles.addCell]}>
          <Icon name="cam" color={MUTED} size={26} />
          <Text style={styles.addLabel}>{t.addMore}</Text>
        </Pressable>
      </View>

      <SectionLabel style={{ marginTop: 24, marginBottom: 10 }}>{t.story}</SectionLabel>
      <TextInput
        value={story}
        onChangeText={setStory}
        editable={!sent}
        placeholder="Napiš pár řádků, jak se Shebby změnila…"
        placeholderTextColor={TEXT_PLACEHOLDER}
        multiline
        style={styles.textarea}
      />

      <View style={styles.tagsRow}>
        {TAGS.map((tag) => (
          <Chip key={tag.id} label={lang === "cs" ? tag.cs : tag.en} active={!!tags[tag.id]} onPress={() => toggleTag(tag.id)} />
        ))}
      </View>

      <Pressable onPress={submit} disabled={sending || sent} style={[styles.submitBtn, { backgroundColor: sent ? SUCCESS : BROWN }]}>
        <Text style={styles.submitLabel}>{sent ? t.sent : t.sendForApproval}</Text>
      </Pressable>
      <Text style={styles.footnote}>{sent ? t.storyFootDone : t.storyFoot}</Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancel: { fontFamily: sansSemiBold, fontSize: 14, color: "#8C7B72" },
  topTitle: { fontFamily: sansSemiBold, fontSize: 13, color: "#A3937F" },
  title: { fontFamily: serif, fontSize: 29, lineHeight: 34, marginTop: 22, color: "#33231C" },
  subtitle: { fontFamily: sans, fontSize: 14, color: "#8C7B72", marginTop: 9, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 20 },
  gridCell: { width: "47.5%", aspectRatio: 1, borderRadius: 16, overflow: "hidden", backgroundColor: TILE_BG },
  addCell: { borderWidth: 1.5, borderColor: "rgba(91,64,52,.25)", borderStyle: "dashed", backgroundColor: "transparent", alignItems: "center", justifyContent: "center", gap: 8 },
  addLabel: { fontFamily: sansMedium, fontSize: 12, color: MUTED },
  textarea: { width: "100%", minHeight: 110, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.14)", borderRadius: 16, padding: 14, fontFamily: sans, fontSize: 14, color: "#33231C", textAlignVertical: "top" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  submitBtn: { marginTop: 22, borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  submitLabel: { fontFamily: sansSemiBold, fontSize: 15, color: "#FDF9F2" },
  footnote: { fontFamily: sans, fontSize: 12, lineHeight: 17, color: "#A3937F", textAlign: "center", marginTop: 10 },
});
