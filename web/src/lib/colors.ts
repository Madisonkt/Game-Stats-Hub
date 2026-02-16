const palette = {
  // Paper + print texture
  paper: "#F3F0EA",
  paperAlt: "#ECE7DE",

  // Ink (neutral dark greys)
  ink: "#0A0A0C",
  inkMuted: "#1A1A1C",

  // Player A – Blue tones
  blue: "#3A7BD5",
  blueLight: "#5BA3CF",
  blueDark: "#2C5F9E",

  // Player B – Pink/coral tones
  coral: "#D4628A",
  coralLight: "#E8849A",
  coralDark: "#B8496E",

  // Accent
  clay: "#A56B5C",

  // Utility
  white: "#FFFFFF",
  transparent: "transparent",
  danger: "#B5485A",

  // Muted tones (neutral greys)
  muted: "#636366",
  mutedLight: "#98989D",

  // Gradient pairs
  gradientBlue: ["#A8C8F0", "#88BDE8", "#6CB4EE", "#7DD4D4", "#90DBC8"],
  gradientPink: ["#F5D5C8", "#F0B89E", "#E8956E", "#E07850", "#D4628A"],
};

const Colors = {
  light: {
    text: palette.ink,
    textSecondary: palette.muted,
    background: palette.paper,
    card: palette.paperAlt,
    cardBorder: palette.ink,
    tint: palette.blue,
    tintSecondary: palette.blueDark,
    tintText: "#FFFFFF",
    tabIconDefault: palette.mutedLight,
    tabIconSelected: palette.blue,
    border: palette.paperAlt,
    playerA: palette.coral,
    playerALight: palette.coralDark,
    playerB: palette.blue,
    playerBLight: palette.blueDark,
    gold: palette.clay,
    success: palette.blue,
    surface: palette.paperAlt,
    danger: palette.danger,
    gradientA: palette.gradientPink,
    gradientB: palette.gradientBlue,
  },
  dark: {
    text: palette.paper,
    textSecondary: palette.mutedLight,
    background: palette.ink,
    card: palette.inkMuted,
    cardBorder: palette.mutedLight,
    tint: "#FFFFFF",
    tintSecondary: palette.blueDark,
    tintText: palette.ink,
    tabIconDefault: palette.muted,
    tabIconSelected: palette.blueLight,
    border: palette.inkMuted,
    playerA: palette.coralLight,
    playerALight: palette.coralDark,
    playerB: palette.blueLight,
    playerBLight: palette.blueDark,
    gold: palette.clay,
    success: palette.blue,
    surface: palette.inkMuted,
    danger: palette.danger,
    gradientA: palette.gradientPink,
    gradientB: palette.gradientBlue,
  },
};

export default Colors;
