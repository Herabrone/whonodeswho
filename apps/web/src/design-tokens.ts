import type { RelationshipCategory } from "./types";

export type ThemeName = "light" | "dark";

export const DESIGN_TOKENS_STYLE_ID = "rf-design-tokens";

export const primitives = {
  neutral: {
    0: "#FFFFFF",
    25: "#FDFCFA",
    50: "#F7F5F0",
    100: "#EDE9E0",
    200: "#DDD8CE",
    300: "#C4BDB2",
    400: "#A8A29E",
    500: "#78716C",
    600: "#57534E",
    700: "#44403C",
    800: "#292524",
    900: "#1C1917",
    950: "#0C0A09",
  },
  graphSpace: {
    1000: "#040608",
    950: "#080C12",
    900: "#0D1117",
    850: "#101520",
    800: "#141B2E",
    750: "#181F38",
    700: "#1A1D35",
    600: "#1E2040",
    500: "#20243A",
    400: "#262A3C",
    300: "#2D3250",
  },
  indigo: {
    50: "#ECEFFE",
    100: "#D8DCFD",
    200: "#B4BBFB",
    300: "#8B97F8",
    400: "#6472F3",
    500: "#3D52A0",
    600: "#3244A0",
    700: "#273390",
    800: "#1E2870",
    dm400: "#6B85DB",
    dm500: "#5070C8",
  },
  blue: {
    ui: "#3B5BDB",
    gfx: "#5B8EEC",
    text: "#2846C4",
    subtle: "#EEF2FF",
    dmSubtle: "rgba(91,142,236,0.15)",
    glow: "rgba(91,142,236,0.55)",
  },
  green: {
    ui: "#2F9E44",
    gfx: "#3DBD77",
    text: "#217A31",
    subtle: "#EBFBEE",
    dmSubtle: "rgba(61,189,119,0.15)",
    glow: "rgba(61,189,119,0.55)",
  },
  pink: {
    ui: "#E64980",
    gfx: "#E8628A",
    text: "#C23060",
    subtle: "#FFF0F6",
    dmSubtle: "rgba(232,98,138,0.15)",
    glow: "rgba(232,98,138,0.6)",
  },
  amber: {
    ui: "#F08C00",
    gfx: "#F0A030",
    text: "#D47400",
    subtle: "#FFF9EB",
    dmSubtle: "rgba(240,160,48,0.15)",
    glow: "rgba(240,160,48,0.5)",
  },
  cyan: {
    ui: "#0C8599",
    gfx: "#22B8CF",
    text: "#0B7285",
    subtle: "#E3FAFC",
    dmSubtle: "rgba(34,184,207,0.15)",
    glow: "rgba(34,184,207,0.5)",
  },
  stone: {
    ui: "#868E96",
    gfx: "#9B9B9B",
    text: "#6C757D",
    subtle: "#F8F9FA",
    dmSubtle: "rgba(155,155,155,0.15)",
    glow: "rgba(155,155,155,0.4)",
  },
} as const;

export interface CategoryToken {
  ui: string;
  gfx: string;
  text: string;
  subtle: string;
  dmSubtle: string;
  glow: string;
}

export const categoryTokens: Record<RelationshipCategory, CategoryToken> = {
  family: primitives.blue,
  friend: primitives.green,
  romantic: primitives.pink,
  conflict: {
    ui: "#991B1B",
    gfx: "#B91C1C",
    text: "#7F1D1D",
    subtle: "#FEE2E2",
    dmSubtle: "rgba(185,28,28,0.18)",
    glow: "rgba(185,28,28,0.5)",
  },
  work: primitives.amber,
  education: primitives.cyan,
  other: primitives.stone,
};

export const graphTokens = {
  canvas: {
    light: primitives.neutral[50],
    dark: primitives.graphSpace[850],
    gridSpacing: "26px",
  },
  node: {
    bgDefault: primitives.neutral[0],
    bgDefaultDm: primitives.graphSpace[600],
    bgRoot: primitives.neutral[0],
    bgRootDm: primitives.graphSpace[500],
    textPrimary: primitives.neutral[900],
    textSecondary: primitives.neutral[500],
    textDimmed: primitives.neutral[300],
    accentWidth: "4px",
    rootBorderColor: primitives.neutral[300],
  },
  edge: {
    width: 1.8,
    widthSelected: 2.5,
    widthPath: 3.5,
    widthEnded: 1.2,
    opacity: 0.85,
    dimmedOpacity: 0.12,
    endedOpacity: 0.2,
    gradientStops: [0.25, 0.85, 0.25] as [number, number, number],
    endedDash: "6 4",
    endedColor: "rgba(150,145,140,0.5)",
    labelFontSize: "9.5px",
  },
  control: {
    bg: "rgba(255,255,255,0.07)",
    bgHover: "rgba(255,255,255,0.13)",
    border: "rgba(255,255,255,0.11)",
    borderHover: "rgba(255,255,255,0.18)",
    text: "rgba(255,255,255,0.55)",
    textHover: "rgba(255,255,255,0.9)",
    backdropBlur: "14px",
    borderRadius: "8px",
  },
  minimap: {
    bg: "rgba(13,17,23,0.85)",
    border: "rgba(255,255,255,0.08)",
    backdropBlur: "14px",
    nodeColor: "rgba(200,198,194,0.5)",
    viewportBorder: "rgba(255,255,255,0.18)",
    borderRadius: "9px",
  },
  glow: {
    stdDeviation: 10,
    opacity: 0.55,
    selectedMultiplier: 1,
    focusedMultiplier: 0.6,
  },
} as const;

export const lightTokens = {
  background: {
    base: primitives.neutral[50],
    surface: primitives.neutral[0],
    elevated: primitives.neutral[0],
    subtle: primitives.neutral[100],
    muted: primitives.neutral[50],
  },
  text: {
    primary: primitives.neutral[900],
    secondary: primitives.neutral[500],
    tertiary: primitives.neutral[400],
    disabled: primitives.neutral[300],
    inverse: primitives.neutral[0],
    accent: primitives.indigo[500],
    link: primitives.indigo[500],
    linkHover: primitives.indigo[600],
    danger: "#DC2626",
  },
  border: {
    default: primitives.neutral[200],
    subtle: primitives.neutral[100],
    strong: primitives.neutral[300],
    focus: primitives.indigo[500],
    danger: "#FECDD3",
  },
  interactive: {
    accent: primitives.indigo[500],
    accentHover: primitives.indigo[600],
    accentActive: primitives.indigo[700],
    accentSubtle: primitives.indigo[50],
    accentText: primitives.neutral[0],
    accentShadow: "rgba(61,82,160,0.35)",
    ghostBg: "transparent",
    ghostBgHover: primitives.neutral[50],
    ghostBorder: primitives.neutral[200],
    ghostText: primitives.neutral[500],
    ghostTextHover: primitives.neutral[900],
    danger: "#DC2626",
    dangerSubtle: "#FFF5F5",
    dangerBorder: "#FECDD3",
    dangerText: "#DC2626",
    dangerHover: "#B91C1C",
  },
  shadow: {
    sm: "0 1px 3px rgba(28,25,23,0.07), 0 1px 2px rgba(28,25,23,0.05)",
    md: "0 4px 12px rgba(28,25,23,0.08)",
    lg: "0 8px 24px rgba(28,25,23,0.10)",
    xl: "0 16px 48px rgba(28,25,23,0.11)",
    app: "0 24px 80px rgba(28,25,23,0.14)",
    panel: "-4px 0 24px rgba(28,25,23,0.07)",
    topDock: "0 -4px 20px rgba(28,25,23,0.07)",
  },
} as const;

export const darkTokens = {
  background: {
    base: "#10131A",
    surface: "#1A1D28",
    elevated: "#20243A",
    subtle: "#262A3C",
    muted: "#1E2130",
  },
  text: {
    primary: "#F4F2EE",
    secondary: "#A09A93",
    tertiary: "#6B6460",
    disabled: "#3D3A36",
    inverse: primitives.neutral[900],
    accent: primitives.indigo.dm400,
    link: primitives.indigo.dm400,
    linkHover: primitives.indigo.dm400,
    danger: "#F87171",
  },
  border: {
    default: "rgba(255,255,255,0.09)",
    subtle: "rgba(255,255,255,0.05)",
    strong: "rgba(255,255,255,0.15)",
    focus: primitives.indigo.dm400,
    danger: "rgba(220,38,38,0.35)",
  },
  interactive: {
    accent: primitives.indigo.dm500,
    accentHover: primitives.indigo.dm400,
    accentActive: primitives.indigo[500],
    accentSubtle: "rgba(61,82,160,0.18)",
    accentText: "#FFFFFF",
    accentShadow: "rgba(80,112,200,0.4)",
    ghostBg: "transparent",
    ghostBgHover: "rgba(255,255,255,0.06)",
    ghostBorder: "rgba(255,255,255,0.09)",
    ghostText: "#A09A93",
    ghostTextHover: "#F4F2EE",
    danger: "#F87171",
    dangerSubtle: "rgba(220,38,38,0.12)",
    dangerBorder: "rgba(220,38,38,0.3)",
    dangerText: "#F87171",
    dangerHover: "#FCA5A5",
  },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.25)",
    md: "0 4px 12px rgba(0,0,0,0.3)",
    lg: "0 8px 24px rgba(0,0,0,0.35)",
    xl: "0 16px 48px rgba(0,0,0,0.4)",
    app: "0 24px 80px rgba(0,0,0,0.5)",
    panel: "-4px 0 24px rgba(0,0,0,0.3)",
    topDock: "0 -4px 20px rgba(0,0,0,0.3)",
  },
} as const;

export const typography = {
  fontFamily: {
    display: '"Fraunces", Georgia, "Times New Roman", serif',
    sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },
  size: {
    xs: "10px",
    sm: "11.5px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "21px",
    "3xl": "28px",
  },
  lineHeight: {
    tight: "1.2",
    snug: "1.35",
    normal: "1.5",
    relaxed: "1.65",
  },
} as const;

export const radii = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "10px",
  "2xl": "12px",
  "3xl": "14px",
  full: "9999px",
  node: "10px",
  nodeRoot: "12px",
  modal: "14px",
} as const;

export const motion = {
  duration: {
    fast: "120ms",
    normal: "180ms",
    slow: "280ms",
    panel: "350ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export const zIndex = {
  canvas: 0,
  canvasOverlay: 1,
  featureOverlay: 20,
  dock: 25,
  drawer: 30,
  toast: 35,
  modal: 40,
  tooltip: 50,
} as const;

function toFontStack(value: string): string[] {
  return value.split(",").map((part) => part.trim());
}

function toFontSizeToken(size: string, lineHeight: string): [string, { lineHeight: string }] {
  return [size, { lineHeight }];
}

export function getCategoryUiColor(category: RelationshipCategory): string {
  return categoryTokens[category].ui;
}

export function getCategoryGfxColor(category: RelationshipCategory): string {
  return categoryTokens[category].gfx;
}

export function getCategorySubtleColor(
  category: RelationshipCategory,
  theme: ThemeName,
): string {
  return theme === "dark"
    ? categoryTokens[category].dmSubtle
    : categoryTokens[category].subtle;
}

export function getCategoryGlowFilter(
  category: RelationshipCategory,
  intensity: "selected" | "focused" = "selected",
): string {
  const color = categoryTokens[category].glow;
  const opacity = intensity === "selected"
    ? graphTokens.glow.opacity * graphTokens.glow.selectedMultiplier
    : graphTokens.glow.opacity * graphTokens.glow.focusedMultiplier;
  const colorWithOpacity = color.replace(/([\d.]+)\)$/, `${opacity})`);
  return `drop-shadow(0 0 ${graphTokens.glow.stdDeviation}px ${colorWithOpacity})`;
}

export function getEdgeGradientStops(opacity = 1): [number, number, number] {
  const [start, peak, end] = graphTokens.edge.gradientStops;
  return [start * opacity, peak * opacity, end * opacity];
}

function getStoredTheme(): ThemeName | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(themeStorage.KEY);
  return value === "light" || value === "dark" ? value : null;
}

export const themeStorage = {
  KEY: "rf-theme" as const,
  get(): ThemeName {
    return getStoredTheme() ?? "light";
  },
  set(theme: ThemeName) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(this.KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  },
  apply() {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-theme", this.get());
  },
};

export function buildCssVars(): string {
  const shared = `
    --rf-font-display: ${typography.fontFamily.display};
    --rf-font-sans: ${typography.fontFamily.sans};
    --rf-font-mono: ${typography.fontFamily.mono};
    --rf-radius-node: ${radii.node};
    --rf-radius-node-root: ${radii.nodeRoot};
    --rf-radius-modal: ${radii.modal};
    --rf-motion-spring: ${motion.easing.spring};
    --rf-motion-standard: ${motion.easing.standard};
    --rf-motion-panel: ${motion.duration.panel};
    --rf-graph-node-accent-width: ${graphTokens.node.accentWidth};
    --rf-graph-edge-opacity: ${graphTokens.edge.opacity};
    --rf-graph-edge-dimmed: ${graphTokens.edge.dimmedOpacity};
    --rf-cat-family-ui: ${categoryTokens.family.ui};
    --rf-cat-family-gfx: ${categoryTokens.family.gfx};
    --rf-cat-family-subtle: ${categoryTokens.family.subtle};
    --rf-cat-friend-ui: ${categoryTokens.friend.ui};
    --rf-cat-friend-gfx: ${categoryTokens.friend.gfx};
    --rf-cat-friend-subtle: ${categoryTokens.friend.subtle};
    --rf-cat-romantic-ui: ${categoryTokens.romantic.ui};
    --rf-cat-romantic-gfx: ${categoryTokens.romantic.gfx};
    --rf-cat-romantic-subtle: ${categoryTokens.romantic.subtle};
    --rf-cat-conflict-ui: ${categoryTokens.conflict.ui};
    --rf-cat-conflict-gfx: ${categoryTokens.conflict.gfx};
    --rf-cat-conflict-subtle: ${categoryTokens.conflict.subtle};
    --rf-cat-work-ui: ${categoryTokens.work.ui};
    --rf-cat-work-gfx: ${categoryTokens.work.gfx};
    --rf-cat-work-subtle: ${categoryTokens.work.subtle};
    --rf-cat-education-ui: ${categoryTokens.education.ui};
    --rf-cat-education-gfx: ${categoryTokens.education.gfx};
    --rf-cat-education-subtle: ${categoryTokens.education.subtle};
    --rf-cat-other-ui: ${categoryTokens.other.ui};
    --rf-cat-other-gfx: ${categoryTokens.other.gfx};
    --rf-cat-other-subtle: ${categoryTokens.other.subtle};
  `;

  const lightVars = `
    --rf-bg-base: ${lightTokens.background.base};
    --rf-bg-surface: ${lightTokens.background.surface};
    --rf-bg-elevated: ${lightTokens.background.elevated};
    --rf-bg-subtle: ${lightTokens.background.subtle};
    --rf-bg-muted: ${lightTokens.background.muted};
    --rf-text-primary: ${lightTokens.text.primary};
    --rf-text-secondary: ${lightTokens.text.secondary};
    --rf-text-tertiary: ${lightTokens.text.tertiary};
    --rf-text-disabled: ${lightTokens.text.disabled};
    --rf-text-inverse: ${lightTokens.text.inverse};
    --rf-text-accent: ${lightTokens.text.accent};
    --rf-text-danger: ${lightTokens.text.danger};
    --rf-border-default: ${lightTokens.border.default};
    --rf-border-subtle: ${lightTokens.border.subtle};
    --rf-border-strong: ${lightTokens.border.strong};
    --rf-border-focus: ${lightTokens.border.focus};
    --rf-border-danger: ${lightTokens.border.danger};
    --rf-accent: ${lightTokens.interactive.accent};
    --rf-accent-hover: ${lightTokens.interactive.accentHover};
    --rf-accent-subtle: ${lightTokens.interactive.accentSubtle};
    --rf-accent-text: ${lightTokens.interactive.accentText};
    --rf-accent-shadow: ${lightTokens.interactive.accentShadow};
    --rf-ghost-bg-hover: ${lightTokens.interactive.ghostBgHover};
    --rf-ghost-border: ${lightTokens.interactive.ghostBorder};
    --rf-ghost-text: ${lightTokens.interactive.ghostText};
    --rf-ghost-text-hover: ${lightTokens.interactive.ghostTextHover};
    --rf-danger: ${lightTokens.interactive.danger};
    --rf-danger-subtle: ${lightTokens.interactive.dangerSubtle};
    --rf-danger-border: ${lightTokens.interactive.dangerBorder};
    --rf-shadow-sm: ${lightTokens.shadow.sm};
    --rf-shadow-md: ${lightTokens.shadow.md};
    --rf-shadow-lg: ${lightTokens.shadow.lg};
    --rf-shadow-panel: ${lightTokens.shadow.panel};
    --rf-shadow-top-dock: ${lightTokens.shadow.topDock};
    --rf-graph-canvas: ${graphTokens.canvas.light};
    --rf-graph-grid-dot: rgba(28,25,23,0.08);
    --rf-graph-node-bg: ${graphTokens.node.bgDefault};
    --rf-graph-node-root-bg: ${graphTokens.node.bgRoot};
    --rf-graph-node-root-border: ${graphTokens.node.rootBorderColor};
    --rf-graph-node-text: ${graphTokens.node.textPrimary};
    --rf-graph-node-text-muted: ${graphTokens.node.textSecondary};
    --rf-graph-node-dimmed: ${graphTokens.node.textDimmed};
    --rf-graph-node-shadow: ${lightTokens.shadow.md};
    --rf-graph-control-bg: rgba(255,255,255,0.84);
    --rf-graph-control-border: rgba(28,25,23,0.12);
    --rf-graph-control-text: ${lightTokens.text.secondary};
    --rf-graph-control-hover-bg: ${lightTokens.background.surface};
    --rf-graph-control-hover-text: ${lightTokens.text.primary};
    --rf-graph-minimap-bg: rgba(255,255,255,0.9);
    --rf-graph-minimap-border: rgba(28,25,23,0.12);
    --rf-graph-minimap-node: rgba(120,113,108,0.55);
    --rf-graph-minimap-mask: rgba(247,245,240,0.7);
  `;

  const darkVars = `
    --rf-bg-base: ${darkTokens.background.base};
    --rf-bg-surface: ${darkTokens.background.surface};
    --rf-bg-elevated: ${darkTokens.background.elevated};
    --rf-bg-subtle: ${darkTokens.background.subtle};
    --rf-bg-muted: ${darkTokens.background.muted};
    --rf-text-primary: ${darkTokens.text.primary};
    --rf-text-secondary: ${darkTokens.text.secondary};
    --rf-text-tertiary: ${darkTokens.text.tertiary};
    --rf-text-disabled: ${darkTokens.text.disabled};
    --rf-text-inverse: ${darkTokens.text.inverse};
    --rf-text-accent: ${darkTokens.text.accent};
    --rf-text-danger: ${darkTokens.text.danger};
    --rf-border-default: ${darkTokens.border.default};
    --rf-border-subtle: ${darkTokens.border.subtle};
    --rf-border-strong: ${darkTokens.border.strong};
    --rf-border-focus: ${darkTokens.border.focus};
    --rf-border-danger: ${darkTokens.border.danger};
    --rf-accent: ${darkTokens.interactive.accent};
    --rf-accent-hover: ${darkTokens.interactive.accentHover};
    --rf-accent-subtle: ${darkTokens.interactive.accentSubtle};
    --rf-accent-text: ${darkTokens.interactive.accentText};
    --rf-accent-shadow: ${darkTokens.interactive.accentShadow};
    --rf-ghost-bg-hover: ${darkTokens.interactive.ghostBgHover};
    --rf-ghost-border: ${darkTokens.interactive.ghostBorder};
    --rf-ghost-text: ${darkTokens.interactive.ghostText};
    --rf-ghost-text-hover: ${darkTokens.interactive.ghostTextHover};
    --rf-danger: ${darkTokens.interactive.danger};
    --rf-danger-subtle: ${darkTokens.interactive.dangerSubtle};
    --rf-danger-border: ${darkTokens.interactive.dangerBorder};
    --rf-shadow-sm: ${darkTokens.shadow.sm};
    --rf-shadow-md: ${darkTokens.shadow.md};
    --rf-shadow-lg: ${darkTokens.shadow.lg};
    --rf-shadow-panel: ${darkTokens.shadow.panel};
    --rf-shadow-top-dock: ${darkTokens.shadow.topDock};
    --rf-graph-canvas: ${graphTokens.canvas.dark};
    --rf-graph-grid-dot: rgba(255,255,255,0.055);
    --rf-graph-node-bg: ${graphTokens.node.bgDefaultDm};
    --rf-graph-node-root-bg: ${graphTokens.node.bgRootDm};
    --rf-graph-node-root-border: rgba(255,255,255,0.22);
    --rf-graph-node-text: rgba(255,255,255,0.88);
    --rf-graph-node-text-muted: rgba(255,255,255,0.45);
    --rf-graph-node-dimmed: rgba(255,255,255,0.18);
    --rf-graph-node-shadow: 0 10px 28px rgba(0,0,0,0.35);
    --rf-graph-control-bg: ${graphTokens.control.bg};
    --rf-graph-control-border: ${graphTokens.control.border};
    --rf-graph-control-text: ${graphTokens.control.text};
    --rf-graph-control-hover-bg: ${graphTokens.control.bgHover};
    --rf-graph-control-hover-text: ${graphTokens.control.textHover};
    --rf-graph-minimap-bg: ${graphTokens.minimap.bg};
    --rf-graph-minimap-border: ${graphTokens.minimap.border};
    --rf-graph-minimap-node: ${graphTokens.minimap.nodeColor};
    --rf-graph-minimap-mask: rgba(4,6,8,0.72);
    --rf-cat-family-subtle: ${categoryTokens.family.dmSubtle};
    --rf-cat-friend-subtle: ${categoryTokens.friend.dmSubtle};
    --rf-cat-romantic-subtle: ${categoryTokens.romantic.dmSubtle};
    --rf-cat-work-subtle: ${categoryTokens.work.dmSubtle};
    --rf-cat-education-subtle: ${categoryTokens.education.dmSubtle};
    --rf-cat-other-subtle: ${categoryTokens.other.dmSubtle};
  `;

  return `
    :root { ${shared} ${lightVars} }
    [data-theme="dark"] { ${darkVars} }
  `
    .replace(/^\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export const tailwindTokens = {
  colors: {
    "rf-base": "var(--rf-bg-base)",
    "rf-surface": "var(--rf-bg-surface)",
    "rf-elevated": "var(--rf-bg-elevated)",
    "rf-subtle": "var(--rf-bg-subtle)",
    "rf-muted-bg": "var(--rf-bg-muted)",
    "rf-text": "var(--rf-text-primary)",
    "rf-muted": "var(--rf-text-secondary)",
    "rf-faint": "var(--rf-text-tertiary)",
    "rf-accent": "var(--rf-accent)",
    "rf-accent-subtle": "var(--rf-accent-subtle)",
    "rf-danger": "var(--rf-danger)",
    "rf-border": "var(--rf-border-default)",
    "rf-border-subtle": "var(--rf-border-subtle)",
    "rf-border-strong": "var(--rf-border-strong)",
    "cat-family": "var(--rf-cat-family-ui)",
    "cat-friend": "var(--rf-cat-friend-ui)",
    "cat-romantic": "var(--rf-cat-romantic-ui)",
    "cat-work": "var(--rf-cat-work-ui)",
    "cat-other": "var(--rf-cat-other-ui)",
    "graph-canvas": primitives.graphSpace[900],
    "graph-node": primitives.graphSpace[800],
  },
  fontFamily: {
    display: toFontStack(typography.fontFamily.display),
    sans: toFontStack(typography.fontFamily.sans),
    mono: toFontStack(typography.fontFamily.mono),
  },
  fontSize: {
    xs: toFontSizeToken(typography.size.xs, typography.lineHeight.normal),
    sm: toFontSizeToken(typography.size.sm, typography.lineHeight.normal),
    base: toFontSizeToken(typography.size.base, typography.lineHeight.normal),
    md: toFontSizeToken(typography.size.md, typography.lineHeight.relaxed),
    lg: toFontSizeToken(typography.size.lg, typography.lineHeight.snug),
    xl: toFontSizeToken(typography.size.xl, typography.lineHeight.snug),
    "2xl": toFontSizeToken(typography.size["2xl"], typography.lineHeight.tight),
    "3xl": toFontSizeToken(typography.size["3xl"], typography.lineHeight.tight),
  },
  borderRadius: {
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    xl: radii.xl,
    "2xl": radii["2xl"],
    "3xl": radii["3xl"],
    full: radii.full,
  },
  boxShadow: {
    sm: "var(--rf-shadow-sm)",
    md: "var(--rf-shadow-md)",
    lg: "var(--rf-shadow-lg)",
    panel: "var(--rf-shadow-panel)",
    dock: "var(--rf-shadow-top-dock)",
    accent: "var(--rf-accent-shadow)",
  },
  transitionTimingFunction: {
    spring: motion.easing.spring,
    standard: motion.easing.standard,
  },
  transitionDuration: {
    fast: motion.duration.fast,
    normal: motion.duration.normal,
    slow: motion.duration.slow,
    panel: motion.duration.panel,
  },
  zIndex: Object.fromEntries(
    Object.entries(zIndex).map(([key, value]) => [key, String(value)]),
  ),
};