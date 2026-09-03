import React from "react";
import Svg, { Path } from "react-native-svg";

const ICONS: Record<string, string[]> = {
  home: ["M3 9.2L11 3l8 6.2V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"],
  paw: [
    "M11 20c-3 0-5-1.6-5-3.8 0-1.9 2-3.2 5-3.2s5 1.3 5 3.2C16 18.4 14 20 11 20z",
    "M5 9.5a1.6 2.1 0 1 0 .01 0z",
    "M17 9.5a1.6 2.1 0 1 0 .01 0z",
    "M8.6 5.6a1.5 2 0 1 0 .01 0z",
    "M13.4 5.6a1.5 2 0 1 0 .01 0z",
  ],
  log: ["M5 3h11l3 3v15H5z", "M9 8h6", "M9 12h6", "M9 16h4"],
  cal: ["M4 5h14v15H4z", "M4 9.5h14", "M8 3v3.5", "M14 3v3.5"],
  cam: ["M3 7.5h3.5L8 5.2h6l1.5 2.3H19v11H3z", "M11 15.6a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2z"],
  heart: ["M11 19c-4.6-3.2-7.8-5.8-7.8-9.3A4 4 0 0 1 11 7.5a4 4 0 0 1 7.8 2.2c0 3.5-3.2 6.1-7.8 9.3z"],
  gift: [
    "M3.5 8.5h15V20h-15z",
    "M3.5 8.5h15",
    "M11 8.5V20",
    "M11 8.5S9.6 4 7.4 4a2 2 0 0 0 0 4.5",
    "M11 8.5S12.4 4 14.6 4a2 2 0 0 1 0 4.5",
  ],
  user: ["M11 11a3.6 3.6 0 1 0 0-7.2A3.6 3.6 0 0 0 11 11z", "M3.6 20c0-3.9 3.3-6.4 7.4-6.4s7.4 2.5 7.4 6.4"],
  team: [
    "M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5",
    "M16 5.5a2.6 2.6 0 0 1 0 5",
    "M17 14.6c2.4.5 4 2.4 4 5.4",
  ],
  check: ["M4 11.5l4.5 4.5L18 6.5"],
  back: ["M9.5 3L5 8l4.5 5"],
  chevron: ["M6 3l5 5-5 5"],
  search: ["M10.6 10.6L14 14"],
};

interface IconProps {
  name: keyof typeof ICONS;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, color = "#33231C", size = 22, strokeWidth = 1.7 }: IconProps) {
  const paths = ICONS[name] || ICONS.paw;
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
