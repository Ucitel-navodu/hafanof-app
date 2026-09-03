import { Role } from "../api/types";
import { ScreenName } from "../data/nav";

export const ROLE_HOME: Record<Role, ScreenName> = {
  coordinator: "CHome",
  foster: "FHome",
  patron: "Patron",
  adopter: "Browse",
};
