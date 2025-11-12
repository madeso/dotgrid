import type { Colors } from "./theme";

interface NamedTheme {
  name: string;
  theme: Colors;
}

export const the_default_theme: Colors = {
  background: "#eeeeee",
  f_high: "#0a0a0a",
  f_med: "#4a4a4a",
  f_low: "#6a6a6a",
  f_inv: "#111111",
  b_high: "#a1a1a1",
  b_med: "#c1c1c1",
  b_low: "#ffffff",
  b_inv: "#ffb545",
};

export const the_apollo_theme: Colors = {
  background: "#29272b",
  f_high: "#ffffff",
  f_med: "#e47464",
  f_low: "#66606b",
  f_inv: "#000000",
  b_high: "#000000",
  b_med: "#201e21",
  b_low: "#322e33",
  b_inv: "#e47464",
};

export const dark_themes: NamedTheme[] = [
  {
    name: "Apollo",
    theme: the_apollo_theme,
  },
  {
    name: "Orca",
    theme: {
      background: "#000000",
      f_high: "#ffffff",
      f_med: "#777777",
      f_low: "#444444",
      f_inv: "#000000",
      b_high: "#dddddd",
      b_med: "#72dec2",
      b_low: "#222222",
      b_inv: "#ffb545",
    },
  },
  {
    name: "Battlestation",
    theme: {
      background: "#222222",
      f_high: "#ffffff",
      f_med: "#affec7",
      f_low: "#888888",
      f_inv: "#000000",
      b_high: "#555555",
      b_med: "#333333",
      b_low: "#111111",
      b_inv: "#affec7",
    },
  },
  {
    name: "souyuz",
    theme: {
      background: "#111111",
      f_high: "#ffffff",
      f_med: "#aaaaaa",
      f_low: "#555555",
      f_inv: "#000000",
      b_high: "#fc533e",
      b_med: "#666666",
      b_low: "#333333",
      b_inv: "#fc533e",
    },
  },
  {
    name: "Lotus",
    theme: {
      background: "#161616",
      f_high: "#f0c098",
      f_med: "#999999",
      f_low: "#444444",
      f_inv: "#222222",
      b_high: "#ffffff",
      b_med: "#333333",
      b_low: "#222222",
      b_inv: "#f0c098",
    },
  },
  {
    name: "Solarized (dark)",
    theme: {
      background: "#073642",
      b_high: "#fdf6e3",
      b_med: "#eee8d5",
      b_low: "#002b36",
      b_inv: "#cb4b16",
      f_high: "#93a1a1",
      f_med: "#6c71c4",
      f_low: "#586e75",
      f_inv: "#002b36",
    },
  },
];

export const light_themes: NamedTheme[] = [
  {
    name: "Coal",
    theme: {
      background: "#EDEAEA",
      f_high: "#393B3F",
      f_med: "#808790",
      f_low: "#A3A3A4",
      f_inv: "#000000",
      b_high: "#333333",
      b_med: "#777777",
      b_low: "#DDDDDD",
      b_inv: "#ffffff",
    },
  },
  {
    name: "Marble",
    theme: {
      background: "#FBFBF2",
      f_high: "#3a3738",
      f_med: "#847577",
      f_low: "#bdb8b8",
      f_inv: "#A6A2A2",
      b_high: "#676164",
      b_med: "#A6A2A2",
      b_low: "#CFD2CD",
      b_inv: "#676164",
    },
  },
  {
    name: "Snow",
    theme: {
      background: "#eeefee",
      f_high: "#222222",
      f_med: "#999999",
      f_low: "#bbbcbb",
      f_inv: "#545454",
      b_high: "#545454",
      b_med: "#ced0ce",
      b_low: "#f5f5f5",
      b_inv: "#ed2c3e",
    },
  },
  {
    name: "Teenage",
    theme: {
      background: "#a1a1a1",
      f_high: "#222222",
      f_med: "#e00b30",
      f_low: "#888888",
      f_inv: "#ffffff",
      b_high: "#555555",
      b_med: "#fbba2d",
      b_low: "#b3b3b3",
      b_inv: "#0e7242",
    },
  },
  {
    name: "Tape",
    theme: {
      background: "#dad7cd",
      f_high: "#696861",
      f_med: "#ffffff",
      f_low: "#b3b2ac",
      f_inv: "#43423e",
      b_high: "#43423e",
      b_med: "#c2c1bb",
      b_low: "#e5e3dc",
      b_inv: "#eb3f48",
    },
  },
  {
    name: "Solarized (light)",
    theme: {
      background: "#eee8d5",
      b_high: "#002b36",
      b_med: "#073642",
      b_low: "#fdf6e3",
      b_inv: "#cb4b16",
      f_high: "#586e75",
      f_med: "#6c71c4",
      f_low: "#93a1a1",
      f_inv: "#fdf6e3",
    },
  },
];

export const color_themes: NamedTheme[] = [
  {
    name: "Default",
    theme: the_default_theme,
  },
  {
    name: "Mahou",
    theme: {
      background: "#E0B1CB",
      f_high: "#231942",
      f_med: "#48416d",
      f_low: "#917296",
      f_inv: "#E0B1CB",
      b_high: "#5E548E",
      b_med: "#FFFFFF",
      b_low: "#BE95C4",
      b_inv: "#9F86C0",
    },
  },
  {
    name: "Pico-8",
    theme: {
      background: "#000000",
      f_high: "#ffffff",
      f_med: "#fff1e8",
      f_low: "#ff78a9",
      f_inv: "#ffffff",
      b_high: "#c2c3c7",
      b_med: "#83769c",
      b_low: "#695f56",
      b_inv: "#00aefe",
    },
  },
  {
    name: "Frameio",
    theme: {
      background: "#333848",
      f_high: "#cccccc",
      f_med: "#5b52fe",
      f_low: "#4c576f",
      f_inv: "#ffffff",
      b_high: "#edeef2",
      b_med: "#262b37",
      b_low: "#394153",
      b_inv: "#5b52fe",
    },
  },
  {
    name: "Berry",
    theme: {
      background: "#9EB7FF",
      f_high: "#3e8281",
      f_med: "#FFFFFF",
      f_low: "#c5f0ec",
      f_inv: "#FFFFFF",
      b_high: "#1C0A16",
      b_med: "#499897",
      b_low: "#6ADEDC",
      b_inv: "#6ADEDC",
    },
  },
  {
    name: "Roguelight",
    theme: {
      background: "#352b31",
      f_high: "#f5f5d4",
      f_med: "#70838c",
      f_low: "#4a6b83",
      f_inv: "#352b31",
      b_high: "#96cf85",
      b_med: "#5a6970",
      b_low: "#4a3b44",
      b_inv: "#f5f5d4",
    },
  },
];
