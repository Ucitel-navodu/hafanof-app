import { Role } from "../api/types";

export type ScreenName =
  | "Login"
  | "CHome"
  | "Cal"
  | "Approve"
  | "DogsList"
  | "DogDetail"
  | "FHome"
  | "Log"
  | "Upload"
  | "Wishes"
  | "Pay"
  | "Done"
  | "Patron"
  | "Browse"
  | "Apply";

export const NAVS: Record<Role, Array<{ screen: ScreenName; labelKey: string; icon: string }>> = {
  coordinator: [
    { screen: "CHome", labelKey: "navHome", icon: "home" },
    { screen: "DogsList", labelKey: "navDogs", icon: "paw" },
    { screen: "Cal", labelKey: "navCal", icon: "cal" },
    { screen: "Approve", labelKey: "navApprove", icon: "cam" },
  ],
  foster: [
    { screen: "FHome", labelKey: "navFHome", icon: "home" },
    { screen: "Log", labelKey: "navDiary", icon: "log" },
    { screen: "Wishes", labelKey: "navWishes", icon: "gift" },
    { screen: "Upload", labelKey: "navPhoto", icon: "cam" },
  ],
  patron: [
    { screen: "Patron", labelKey: "navPatron", icon: "heart" },
    { screen: "Wishes", labelKey: "navWishes", icon: "gift" },
    { screen: "DogsList", labelKey: "navDogs", icon: "paw" },
  ],
  adopter: [
    { screen: "Browse", labelKey: "navBrowse", icon: "paw" },
    { screen: "Wishes", labelKey: "navWishes", icon: "gift" },
    { screen: "Apply", labelKey: "navApply", icon: "user" },
  ],
};

export const ROLE_OF: Partial<Record<ScreenName, Role>> = {
  CHome: "coordinator",
  Cal: "coordinator",
  Approve: "coordinator",
  FHome: "foster",
  Log: "foster",
  Upload: "foster",
  Patron: "patron",
  Pay: "patron",
  Done: "patron",
  Browse: "adopter",
  Apply: "adopter",
};

export function isNavActive(screen: ScreenName, current: ScreenName) {
  if (screen === current) return true;
  if (screen === "DogsList" && current === "DogDetail") return true;
  if (screen === "Wishes" && (current === "Pay" || current === "Done")) return true;
  if (screen === "Browse" && current === "DogDetail") return true;
  return false;
}
