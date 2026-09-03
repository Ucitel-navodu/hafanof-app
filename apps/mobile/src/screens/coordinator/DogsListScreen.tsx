import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import { ScreenScroll } from "../../components/ScreenScroll";
import { Chip } from "../../components/Chip";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../api/client";
import { Dog } from "../../api/types";
import { statusColors, TEXT_PLACEHOLDER, TILE_BG } from "../../theme/colors";
import { sans, sansSemiBold, serif } from "../../theme/typography";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DogsList">;

const FILTERS = ["Vše", "V dočasce", "K adopci", "Léčba", "Hledá DP"];

export default function DogsListScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState("Vše");
  const [query, setQuery] = useState("");
  const [dogs, setDogs] = useState<Dog[]>([]);

  const load = useCallback(async (f: string) => {
    const res = await api.get<{ dogs: Dog[] }>(`/api/dogs?status=${encodeURIComponent(f)}`);
    setDogs(res.dogs);
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [filter, load])
  );

  const visible = dogs.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <ScreenScroll nav="DogsList">
      <Text style={styles.title}>{t.dogsTitle}</Text>

      <View style={styles.searchBar}>
        <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
          <Circle cx={7} cy={7} r={4.6} stroke="#B0A296" strokeWidth={1.5} />
          <Path d="M10.6 10.6L14 14" stroke="#B0A296" strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.search}
          placeholderTextColor={TEXT_PLACEHOLDER}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 16 }}>
        {visible.map((d) => {
          const c = statusColors[d.status] || statusColors["V dočasce"];
          return (
            <Pressable key={d.id} onPress={() => navigation.navigate("DogDetail", { dogId: d.id, tab: "denik" })} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{d.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{d.name}</Text>
                  <Text style={styles.age}>{d.age_label}</Text>
                </View>
                <Text style={styles.breed}>{d.breed}</Text>
                <Text style={styles.foster}>DP: {d.foster_name || "hledáme"}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: c.bg }]}>
                <Text style={[styles.statusText, { color: c.fg }]}>{d.status}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: serif, fontSize: 30, color: "#33231C" },
  searchBar: { marginTop: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.12)", borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, flexDirection: "row", gap: 9, alignItems: "center" },
  searchInput: { flex: 1, fontFamily: sans, fontSize: 14, color: "#33231C" },
  filterRow: { flexDirection: "row", gap: 7, marginTop: 14, flexWrap: "wrap" },
  row: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(91,64,52,.1)", borderRadius: 18, padding: 12, flexDirection: "row", gap: 13, alignItems: "center" },
  avatar: { width: 62, height: 62, borderRadius: 14, backgroundColor: TILE_BG, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: serif, fontSize: 24, color: "#B0A296" },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  name: { fontFamily: sansSemiBold, fontSize: 17, color: "#33231C" },
  age: { fontFamily: sans, fontSize: 12, color: "#A3937F" },
  breed: { fontFamily: sans, fontSize: 13, color: "#8C7B72", marginTop: 3 },
  foster: { fontFamily: sans, fontSize: 12, color: "#A3937F", marginTop: 4 },
  statusChip: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  statusText: { fontFamily: sansSemiBold, fontSize: 11 },
});
