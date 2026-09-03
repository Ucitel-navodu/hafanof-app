import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import { ROLE_HOME } from "./roleHome";
import { useAuth } from "../state/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import CHomeScreen from "../screens/coordinator/CHomeScreen";
import CalScreen from "../screens/coordinator/CalScreen";
import ApproveScreen from "../screens/coordinator/ApproveScreen";
import DogsListScreen from "../screens/coordinator/DogsListScreen";
import DogDetailScreen from "../screens/coordinator/DogDetailScreen";
import FHomeScreen from "../screens/foster/FHomeScreen";
import LogScreen from "../screens/foster/LogScreen";
import UploadScreen from "../screens/foster/UploadScreen";
import WishesScreen from "../screens/patron/WishesScreen";
import PayScreen from "../screens/patron/PayScreen";
import DoneScreen from "../screens/patron/DoneScreen";
import PatronScreen from "../screens/patron/PatronScreen";
import BrowseScreen from "../screens/adopter/BrowseScreen";
import ApplyScreen from "../screens/adopter/ApplyScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={user ? ROLE_HOME[user.activeRole] : "Login"}
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="CHome" component={CHomeScreen} />
      <Stack.Screen name="Cal" component={CalScreen} />
      <Stack.Screen name="Approve" component={ApproveScreen} />
      <Stack.Screen name="DogsList" component={DogsListScreen} />
      <Stack.Screen name="DogDetail" component={DogDetailScreen} />
      <Stack.Screen name="FHome" component={FHomeScreen} />
      <Stack.Screen name="Log" component={LogScreen} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="Wishes" component={WishesScreen} />
      <Stack.Screen name="Pay" component={PayScreen} />
      <Stack.Screen name="Done" component={DoneScreen} />
      <Stack.Screen name="Patron" component={PatronScreen} />
      <Stack.Screen name="Browse" component={BrowseScreen} />
      <Stack.Screen name="Apply" component={ApplyScreen} />
    </Stack.Navigator>
  );
}
