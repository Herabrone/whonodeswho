/**
 * whoNodeswho — Design Token System
 * ====================================
 * Single source of truth for every visual decision in the app.
 *
 * CONCEPT: "Dark canvas, light shell"
 *   The graph lives in its own deep space (always dark).
 *   The UI panels (header, drawers, modals) respond to light/dark mode.
 *   This creates a permanent spatial separation between the graph world and the UI chrome.
 *
 * HOW TO USE:
 *   1. Update tailwind.config.ts with `tailwindTokens` export (see end of file).
 *   2. Call `injectCssVars()` once in App.tsx to write CSS custom properties.
 *   3. Components use CSS vars (--rf-*) for values that can't be expressed in Tailwind
 *      (React Flow node styles, SVG fills, dynamic graph colours).
 *   4. Import `tokens`, `graphTokens`, `typography`, etc. directly for programmatic use.
 *
 * DARK MODE STRATEGY:
 *   Set `data-theme="dark"` on <html> to activate dark mode.
 *   Tailwind config: darkMode: ['selector', '[data-theme="dark"]']
 *   Store preference in localStorage under key "rf-theme".
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIMITIVES  (raw named values — never use these directly in components)
// ─────────────────────────────────────────────────────────────────────────────

export const primitives = {
  // Neutral — warm undertone (yellow-leaning, not blue-gray)
  neutral: {
    0:   '#FFFFFF',
    25:  '#FDFCFA',
    50:  '#F7F5F0',   // app base / canvas
    100: '#EDE9E0',   // subtle hover, input bg
    200: '#DDD8CE',   // default borders
    300: '#C4BDB2',   // strong borders, disabled text
    400: '#A8A29E',   // tertiary text, placeholders
    500: '#78716C',   // secondary text
    600: '#57534E',   // strong secondary
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',   // primary text (warm near-black)
    950: '#0C0A09',
  },

  // Graph space — cool blue-black (distinct from neutral)
  graphSpace: {
    1000: '#040608',
    950:  '#080C12',
    900:  '#0D1117',  // default graph canvas
    850:  '#101520',  // dark-mode canvas (panels darker, canvas deepest)
    800:  '#141B2E',  // default node background
    750:  '#181F38',  // node hover
    700:  '#1A1D35',  // root node background
    600:  '#1E2040',  // dark-mode node background
    500:  '#20243A',  // dark-mode root node
    400:  '#262A3C',  // dark-mode subtle surface
    300:  '#2D3250',  // dark-mode subtle border
  },

  // Accent — deep indigo (sophisticated, not corporate-blue)
  indigo: {
    50:  '#ECEFFE',
    100: '#D8DCFD',
    200: '#B4BBFB',
    300: '#8B97F8',
    400: '#6472F3',
    500: '#3D52A0',  // primary accent (light mode)
    600: '#3244A0',
    700: '#273390',
    800: '#1E2870',
    // lighter variants for dark mode surfaces
    dm400: '#6B85DB',  // accent in dark mode (more legible)
    dm500: '#5070C8',  // accent button in dark mode
  },

  // Category palette — two tiers per category
  // .ui   = used in light UI panels (sidebar dots, filter chips)
  // .gfx  = used on dark graph canvas (slightly lighter/more vivid)
  blue: {
    ui:   '#3B5BDB',  // family — UI
    gfx:  '#5B8EEC',  // family — graph
    text: '#2846C4',
    subtle: '#EEF2FF',
    dmSubtle: 'rgba(91,142,236,0.15)',
    glow: 'rgba(91,142,236,0.55)',
  },
  green: {
    ui:   '#2F9E44',  // friend — UI
    gfx:  '#3DBD77',  // friend — graph
    text: '#217A31',
    subtle: '#EBFBEE',
    dmSubtle: 'rgba(61,189,119,0.15)',
    glow: 'rgba(61,189,119,0.55)',
  },
  pink: {
    ui:   '#E64980',  // romantic — UI
    gfx:  '#E8628A',  // romantic — graph
    text: '#C23060',
    subtle: '#FFF0F6',
    dmSubtle: 'rgba(232,98,138,0.15)',
    glow: 'rgba(232,98,138,0.6)',
  },
  amber: {
    ui:   '#F08C00',  // work — UI
    gfx:  '#F0A030',  // work — graph
    text: '#D47400',
    subtle: '#FFF9EB',
    dmSubtle: 'rgba(240,160,48,0.15)',
    glow: 'rgba(240,160,48,0.5)',
  },
  stone: {
    ui:   '#868E96',  // other — UI
    gfx:  '#9B9B9B',  // other — graph
    text: '#6C757D',
    subtle: '#F8F9FA',
    dmSubtle: 'rgba(155,155,155,0.15)',
    glow: 'rgba(155,155,155,0.4)',
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 2. CATEGORY TOKENS  (stable — same meaning regardless of mode)
// ─────────────────────────────────────────────────────────────────────────────

export type RelationshipCategory = 'family' | 'friend' | 'romantic' | 'work' | 'other';

export interface CategoryToken {
  /** In light UI panels: sidebar dots, filter chips, detail panel badges. */
  ui: string;
  /** On dark graph canvas: node border, edge color, category node bg accent. */
  gfx: string;
  /** Text on a `subtle` background in light mode. */
  text: string;
  /** Very light tinted background for tags/badges in light mode. */
  subtle: string;
  /** Semi-transparent tinted background for dark mode. */
  dmSubtle: string;
  /** SVG drop-shadow glow color for selected nodes. */
  glow: string;
}

export const categoryTokens: Record<RelationshipCategory, CategoryToken> = {
  family:   primitives.blue,
  friend:   primitives.green,
  romantic: primitives.pink,
  work:     primitives.amber,
  other:    primitives.stone,
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 3. GRAPH TOKENS  (graph canvas is ALWAYS dark — not mode-dependent)
// ─────────────────────────────────────────────────────────────────────────────

export const graphTokens = {
  // Canvas
  canvas: {
    /** Light mode: graph lives on this deep background. */
    light:         primitives.graphSpace[900],  // #0D1117
    /** Dark mode: panels are dark, so canvas goes even deeper. */
    dark:          primitives.graphSpace[850],  // #101520
    /** Dot grid overlay. */
    gridDot:       'rgba(255,255,255,0.055)',
    gridSpacing:   '26px',
  },

  // Nodes (dark glass cards with colored left-accent border)
  node: {
    bgDefault:     primitives.graphSpace[800],  // #141B2E
    bgDefaultDm:   primitives.graphSpace[600],  // #1E2040  (slightly more saturated in full dark)
    bgRoot:        primitives.graphSpace[700],  // #1A1D35  (root = Alice = you)
    bgRootDm:      primitives.graphSpace[500],  // #20243A
    bgSelected:    '#1E1422',                   // pulled toward pink/romantic (demo default)
    // ↑ In practice, derive bgSelected by mixing node.bgDefault with the category glow color at 15% opacity

    accentWidth:   '4px',                       // left-border bookmark tab
    borderDefault: 'rgba(255,255,255,0)',        // transparent unless selected
    borderWidth:   '0.8px',

    // Text on nodes
    textPrimary:   'rgba(255,255,255,0.88)',
    textSecondary: 'rgba(255,255,255,0.45)',     // "you · 7 connections" subtitle
    textDimmed:    'rgba(255,255,255,0.18)',     // fully dimmed (out of focus/path)

    // Dimensions
    minWidth:      '84px',
    height:        '52px',
    rootHeight:    '74px',
    borderRadius:  '10px',
    rootRadius:    '12px',
    rootBorderColor: 'rgba(255,255,255,0.22)',
    rootBorderWidth: '1.5px',
  },

  // Edges (SVG paths with gradient fill)
  edge: {
    width:         1.8,   // default stroke-width
    widthSelected: 2.5,   // when the edge itself is clicked
    widthPath:     3.5,   // highlighted in degrees-of-separation path
    widthEnded:    1.2,   // dashed, for ended relationships (timeline)

    opacity:       0.85,  // default fully-visible edge
    dimmedOpacity: 0.12,  // out-of-focus (focus mode / path mode)
    endedOpacity:  0.20,  // ended relationship (dashed)

    /**
     * Gradient pattern: each edge fades at its endpoints and peaks at midpoint.
     * stopOpacities = [startEnd, peak, startEnd]
     * Apply to an SVG <linearGradient> using the category's .gfx color.
     */
    gradientStops: [0.25, 0.85, 0.25] as [number, number, number],

    endedDash:     '6 4', // stroke-dasharray for ended relationships
    endedColor:    'rgba(150,145,140,0.5)',

    labelFontSize:  '9.5px',
    labelBgOpacity: 0.0,    // no label background on dark canvas — the glow handles legibility
  },

  // Floating glass controls (search, focus, + buttons ON the dark canvas)
  control: {
    bg:          'rgba(255,255,255,0.07)',
    bgHover:     'rgba(255,255,255,0.13)',
    border:      'rgba(255,255,255,0.11)',
    borderHover: 'rgba(255,255,255,0.18)',
    text:        'rgba(255,255,255,0.55)',
    textHover:   'rgba(255,255,255,0.9)',
    backdropBlur: '14px',
    borderRadius: '8px',
  },

  // Minimap
  minimap: {
    bg:             'rgba(13,17,23,0.85)',
    border:         'rgba(255,255,255,0.08)',
    backdropBlur:   '14px',
    nodeColor:      'rgba(200,198,194,0.5)',
    viewportBorder: 'rgba(255,255,255,0.18)',
    borderRadius:   '9px',
  },

  // SVG glow filter (applied via feDropShadow on selected/highlighted nodes)
  glow: {
    stdDeviation: 10,   // feGaussianBlur stdDeviation
    opacity: 0.55,      // base glow intensity (multiply by category)
    selectedMultiplier: 1.0,
    focusedMultiplier:  0.6,
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 4. SEMANTIC TOKENS — LIGHT MODE (the "shell": header, panels, drawers)
// ─────────────────────────────────────────────────────────────────────────────

export const lightTokens = {
  background: {
    /** App root background (warm off-white). */
    base:     primitives.neutral[50],   // #F7F5F0
    /** Panel surfaces: header, detail panels, modals, drawers. */
    surface:  primitives.neutral[0],    // #FFFFFF
    /** Elevated above surface: modals, popovers. */
    elevated: primitives.neutral[0],    // #FFFFFF
    /** Subtle: input fields, hover states, table rows. */
    subtle:   primitives.neutral[100],  // #EDE9E0
    /** Used for secondary action buttons, tag backgrounds. */
    muted:    primitives.neutral[50],   // #F7F5F0
  },

  text: {
    primary:   primitives.neutral[900], // #1C1917 — headings, key content
    secondary: primitives.neutral[500], // #78716C — body, labels, descriptions
    tertiary:  primitives.neutral[400], // #A8A29E — placeholders, metadata
    disabled:  primitives.neutral[300], // #C4BDB2
    inverse:   primitives.neutral[0],   // #FFFFFF — on dark backgrounds (accent buttons)
    accent:    primitives.indigo[500],  // #3D52A0
    link:      primitives.indigo[500],
    linkHover: primitives.indigo[600],
    danger:    '#DC2626',
  },

  border: {
    default:   primitives.neutral[200], // #DDD8CE — standard borders
    subtle:    primitives.neutral[100], // #EDE9E0 — very soft (section separators)
    strong:    primitives.neutral[300], // #C4BDB2 — emphasized, on-hover
    focus:     primitives.indigo[500],  // #3D52A0 — focused inputs
    danger:    '#FECDD3',
  },

  interactive: {
    // Primary accent (deep indigo)
    accent:          primitives.indigo[500],  // #3D52A0
    accentHover:     primitives.indigo[600],  // darker on hover
    accentActive:    primitives.indigo[700],
    accentSubtle:    primitives.indigo[50],   // #ECEFFE — tinted hover backgrounds
    accentText:      primitives.neutral[0],   // white text on accent buttons
    accentShadow:    'rgba(61,82,160,0.35)',  // box-shadow for accent buttons

    // Secondary / ghost buttons
    ghostBg:         'transparent',
    ghostBgHover:    primitives.neutral[50],
    ghostBorder:     primitives.neutral[200],
    ghostText:       primitives.neutral[500],
    ghostTextHover:  primitives.neutral[900],

    // Danger
    danger:          '#DC2626',
    dangerSubtle:    '#FFF5F5',
    dangerBorder:    '#FECDD3',
    dangerText:      '#DC2626',
    dangerHover:     '#B91C1C',
  },

  // UI shell surfaces
  shadow: {
    /** Cards, panels, drawers. */
    sm:    '0 1px 3px rgba(28,25,23,0.07), 0 1px 2px rgba(28,25,23,0.05)',
    md:    '0 4px 12px rgba(28,25,23,0.08)',
    lg:    '0 8px 24px rgba(28,25,23,0.10)',
    xl:    '0 16px 48px rgba(28,25,23,0.11)',
    /** The full app shadow (mockup/embed context). */
    app:   '0 24px 80px rgba(28,25,23,0.14)',
    /** Detail panel entrance shadow. */
    panel: '-4px 0 24px rgba(28,25,23,0.07)',
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 5. SEMANTIC TOKENS — DARK MODE (shell goes dark, canvas goes deeper)
// ─────────────────────────────────────────────────────────────────────────────

export const darkTokens = {
  background: {
    /** App root — very deep blue-dark. */
    base:     '#10131A',
    /** Panels, drawers, header — one step up from base. */
    surface:  '#1A1D28',
    /** Modals, popovers — visibly elevated. */
    elevated: '#20243A',
    /** Subtle inputs, hover states. */
    subtle:   '#262A3C',
    /** Secondary surface (slightly lighter than surface). */
    muted:    '#1E2130',
  },

  text: {
    primary:   '#F4F2EE',             // warm off-white (slightly warm, not harsh)
    secondary: '#A09A93',             // muted warm gray
    tertiary:  '#6B6460',             // very muted
    disabled:  '#3D3A36',
    inverse:   primitives.neutral[900], // dark text on light elements
    accent:    primitives.indigo.dm400, // #6B85DB — lighter indigo legible on dark
    link:      primitives.indigo.dm400,
    linkHover: primitives.indigo.dm400,
    danger:    '#F87171',
  },

  border: {
    default:   'rgba(255,255,255,0.09)',
    subtle:    'rgba(255,255,255,0.05)',
    strong:    'rgba(255,255,255,0.15)',
    focus:     primitives.indigo.dm400,  // #6B85DB
    danger:    'rgba(220,38,38,0.35)',
  },

  interactive: {
    accent:          primitives.indigo.dm500,    // #5070C8
    accentHover:     primitives.indigo.dm400,    // #6B85DB
    accentActive:    primitives.indigo[500],
    accentSubtle:    'rgba(61,82,160,0.18)',
    accentText:      '#FFFFFF',
    accentShadow:    'rgba(80,112,200,0.4)',

    ghostBg:         'transparent',
    ghostBgHover:    'rgba(255,255,255,0.06)',
    ghostBorder:     'rgba(255,255,255,0.09)',
    ghostText:       '#A09A93',
    ghostTextHover:  '#F4F2EE',

    danger:          '#F87171',
    dangerSubtle:    'rgba(220,38,38,0.12)',
    dangerBorder:    'rgba(220,38,38,0.3)',
    dangerText:      '#F87171',
    dangerHover:     '#FCA5A5',
  },

  shadow: {
    sm:    '0 1px 3px rgba(0,0,0,0.25)',
    md:    '0 4px 12px rgba(0,0,0,0.3)',
    lg:    '0 8px 24px rgba(0,0,0,0.35)',
    xl:    '0 16px 48px rgba(0,0,0,0.4)',
    app:   '0 24px 80px rgba(0,0,0,0.5)',
    panel: '-4px 0 24px rgba(0,0,0,0.3)',
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 6. TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    /**
     * Brand / display font.
     * Used for: app wordmark, person names in detail panels,
     * root node label, year headings in timeline story mode.
     */
    display: '"Fraunces", Georgia, "Times New Roman", serif',
    /**
     * UI font — everything else.
     */
    sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    /**
     * Monospace — for chat code blocks, node IDs (debug), import/export preview.
     */
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },

  size: {
    xs:   '10px',   // category labels, section headers (uppercase)
    sm:   '11.5px', // timestamps, metadata, header buttons
    base: '13px',   // default UI text, sidebar items, relationship type tags
    md:   '14px',   // body copy, chat messages
    lg:   '16px',   // panel section labels
    xl:   '18px',   // not commonly used
    '2xl': '21px',  // person name in detail panel (Fraunces)
    '3xl': '28px',  // year heading in timeline story mode (Fraunces)
  },

  weight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
  },

  lineHeight: {
    tight:    '1.2',
    snug:     '1.35',
    normal:   '1.5',
    relaxed:  '1.65',
  },

  tracking: {
    tighter: '-0.03em',  // Fraunces display headings
    tight:   '-0.015em', // UI headings
    normal:  '0em',
    wide:    '0.04em',   // uppercase labels (10px xs text)
    wider:   '0.08em',   // section divider labels (sidebar-title, slbl)
  },

  // Specific component text styles (convenience)
  styles: {
    wordmark: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize:   '17px',
      fontWeight: '500',
      letterSpacing: '-0.3px',
    },
    sectionLabel: {
      fontSize:    '10px',
      fontWeight:  '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
    },
    personName: {
      fontFamily:   '"Fraunces", Georgia, serif',
      fontSize:     '21px',
      fontWeight:   '500',
      letterSpacing: '-0.3px',
    },
    nodeLabel: {
      fontFamily:  '"Inter", system-ui, sans-serif',
      fontSize:    '12px',
      fontWeight:  '500',
    },
    rootNodeLabel: {
      fontFamily:  '"Fraunces", Georgia, serif',
      fontSize:    '13px',
      fontWeight:  '500',
    },
    nodeCategory: {
      fontFamily:  '"Inter", system-ui, sans-serif',
      fontSize:    '10px',
      fontWeight:  '400',
    },
    edgeLabel: {
      fontFamily:  '"Inter", system-ui, sans-serif',
      fontSize:    '9.5px',
      fontWeight:  '400',
    },
    chatMessage: {
      fontFamily:  '"Inter", system-ui, sans-serif',
      fontSize:    '14px',
      fontWeight:  '400',
      lineHeight:  '1.6',
    },
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 7. SPACING SCALE  (4px base unit)
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  0:   '0px',
  px:  '1px',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  2.5: '10px',
  3:   '12px',
  3.5: '14px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  10:  '40px',
  12:  '48px',
  14:  '56px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 8. BORDER RADIUS
// ─────────────────────────────────────────────────────────────────────────────

export const radii = {
  none:   '0px',
  sm:     '4px',   // small tags, inline code
  md:     '6px',   // small buttons, input fields
  lg:     '8px',   // standard buttons, search box, glass controls
  xl:     '10px',  // graph nodes, relationship items, sidebar items
  '2xl':  '12px',  // root node, modal corners
  '3xl':  '14px',  // app wrapper corners
  full:   '9999px',// pills, avatars, toggle pills

  // Named semantic aliases
  node:   '10px',
  nodeRoot: '12px',
  button: '7px',
  input:  '7px',
  panel:  '0px',   // panels go edge-to-edge on their respective sides
  modal:  '14px',
  card:   '10px',
  avatar: '9999px',
  badge:  '9999px',
  toggle: '8px',
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 9. ELEVATION / SHADOWS
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  // Shell shadows (light mode — warm undertone)
  light: {
    sm:    '0 1px 3px rgba(28,25,23,0.07), 0 1px 2px rgba(28,25,23,0.05)',
    md:    '0 4px 12px rgba(28,25,23,0.08)',
    lg:    '0 8px 24px rgba(28,25,23,0.10)',
    xl:    '0 16px 48px rgba(28,25,23,0.11)',
    app:   '0 24px 80px rgba(28,25,23,0.14)',
    panel: '-4px 0 24px rgba(28,25,23,0.07)',
    topDock: '0 -4px 20px rgba(28,25,23,0.07)',
  },

  // Shell shadows (dark mode)
  dark: {
    sm:    '0 1px 3px rgba(0,0,0,0.25)',
    md:    '0 4px 12px rgba(0,0,0,0.30)',
    lg:    '0 8px 24px rgba(0,0,0,0.35)',
    xl:    '0 16px 48px rgba(0,0,0,0.40)',
    app:   '0 24px 80px rgba(0,0,0,0.50)',
    panel: '-4px 0 24px rgba(0,0,0,0.30)',
    topDock: '0 -4px 20px rgba(0,0,0,0.30)',
  },

  // Accent button shadows
  accent: {
    light: '0 2px 10px rgba(61,82,160,0.35)',
    hover: '0 4px 16px rgba(61,82,160,0.48)',
    dark:  '0 2px 10px rgba(80,112,200,0.40)',
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 10. MOTION / ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

export const motion = {
  duration: {
    instant:  '80ms',
    fast:     '120ms',
    normal:   '180ms',
    slow:     '280ms',
    panel:    '350ms',  // side drawers and timeline dock
    toast:    '400ms',
  },

  easing: {
    /** Standard micro-interactions: hover, focus. */
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Panels, drawers, modals — spring feel. */
    spring:   'cubic-bezier(0.16, 1, 0.3, 1)',
    /** Elements leaving the screen. */
    exit:     'cubic-bezier(0.4, 0, 1, 1)',
    /** Elements entering the screen. */
    enter:    'cubic-bezier(0, 0, 0.2, 1)',
  },

  // Pre-composed transition strings for common patterns
  transition: {
    colors:    'color 120ms cubic-bezier(0.4,0,0.2,1), background-color 120ms cubic-bezier(0.4,0,0.2,1), border-color 120ms cubic-bezier(0.4,0,0.2,1)',
    opacity:   'opacity 180ms cubic-bezier(0.4,0,0.2,1)',
    transform: 'transform 350ms cubic-bezier(0.16,1,0.3,1)',
    panel:     'width 350ms cubic-bezier(0.16,1,0.3,1), height 350ms cubic-bezier(0.16,1,0.3,1)',
    button:    'background-color 120ms, color 120ms, box-shadow 120ms, transform 80ms',
    nodeGlow:  'filter 300ms cubic-bezier(0.4,0,0.2,1), opacity 400ms cubic-bezier(0.4,0,0.2,1)',
    edge:      'opacity 400ms cubic-bezier(0.4,0,0.2,1), stroke 300ms cubic-bezier(0.4,0,0.2,1)',
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 11. Z-INDEX LAYERING
// ─────────────────────────────────────────────────────────────────────────────

export const zIndex = {
  canvas:         0,   // React Flow graph surface
  canvasOverlay:  1,   // edge labels, node tooltips within the canvas
  featureOverlay: 20,  // Track A/B/C/D overlay controls (buttons, search bar)
  dock:           25,  // timeline dock (full-width bottom bar)
  drawer:         30,  // side panels (detail, filter)
  toast:          35,  // anniversary toast, notification banners
  modal:          40,  // modals, dialogs, confirmations
  tooltip:        50,  // tooltips (always on top)
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 12. LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  headerHeight:       '48px',
  sidebarWidth:       '196px',
  detailPanelWidth:   '280px',
  timelineDockHeight: '88px',
  chatPanelWidth:     '380px',    // at desktop; full-width on mobile
  chatPanelHeightMd:  '480px',    // max-height at desktop
  minimapSize:        '82px',
  minimapHeight:      '62px',
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 13. CSS CUSTOM PROPERTY MAP  (--rf-* variables)
//     Used by React Flow nodes, SVG, and anywhere Tailwind classes don't reach.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates the CSS custom properties string for :root (light) and
 * [data-theme="dark"] selector. Call this and inject into a <style> tag
 * or into index.css.
 *
 * Usage in App.tsx:
 *   import { buildCssVars } from '@/design-tokens'
 *   // in a useEffect or at module scope, inject once:
 *   const style = document.createElement('style')
 *   style.textContent = buildCssVars()
 *   document.head.appendChild(style)
 */
export function buildCssVars(): string {
  const light = lightTokens;
  const dark  = darkTokens;

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

    /* Graph (always dark) */
    --rf-graph-canvas: ${graphTokens.canvas.light};
    --rf-graph-grid-dot: ${graphTokens.canvas.gridDot};
    --rf-graph-node-bg: ${graphTokens.node.bgDefault};
    --rf-graph-node-root-bg: ${graphTokens.node.bgRoot};
    --rf-graph-node-root-border: ${graphTokens.node.rootBorderColor};
    --rf-graph-node-text: ${graphTokens.node.textPrimary};
    --rf-graph-node-text-muted: ${graphTokens.node.textSecondary};
    --rf-graph-node-dimmed: ${graphTokens.node.textDimmed};
    --rf-graph-node-accent-width: ${graphTokens.node.accentWidth};
    --rf-graph-edge-opacity: ${graphTokens.edge.opacity};
    --rf-graph-edge-dimmed: ${graphTokens.edge.dimmedOpacity};
    --rf-graph-control-bg: ${graphTokens.control.bg};
    --rf-graph-control-border: ${graphTokens.control.border};
    --rf-graph-control-text: ${graphTokens.control.text};
    --rf-graph-control-hover-bg: ${graphTokens.control.bgHover};
    --rf-graph-control-hover-text: ${graphTokens.control.textHover};
    --rf-graph-minimap-bg: ${graphTokens.minimap.bg};
    --rf-graph-minimap-border: ${graphTokens.minimap.border};

    /* Category — UI (light panels) */
    --rf-cat-family-ui: ${categoryTokens.family.ui};
    --rf-cat-family-gfx: ${categoryTokens.family.gfx};
    --rf-cat-family-subtle: ${categoryTokens.family.subtle};
    --rf-cat-friend-ui: ${categoryTokens.friend.ui};
    --rf-cat-friend-gfx: ${categoryTokens.friend.gfx};
    --rf-cat-friend-subtle: ${categoryTokens.friend.subtle};
    --rf-cat-romantic-ui: ${categoryTokens.romantic.ui};
    --rf-cat-romantic-gfx: ${categoryTokens.romantic.gfx};
    --rf-cat-romantic-subtle: ${categoryTokens.romantic.subtle};
    --rf-cat-work-ui: ${categoryTokens.work.ui};
    --rf-cat-work-gfx: ${categoryTokens.work.gfx};
    --rf-cat-work-subtle: ${categoryTokens.work.subtle};
    --rf-cat-other-ui: ${categoryTokens.other.ui};
    --rf-cat-other-gfx: ${categoryTokens.other.gfx};
    --rf-cat-other-subtle: ${categoryTokens.other.subtle};
  `;

  const lightVars = `
    --rf-bg-base: ${light.background.base};
    --rf-bg-surface: ${light.background.surface};
    --rf-bg-elevated: ${light.background.elevated};
    --rf-bg-subtle: ${light.background.subtle};
    --rf-bg-muted: ${light.background.muted};
    --rf-text-primary: ${light.text.primary};
    --rf-text-secondary: ${light.text.secondary};
    --rf-text-tertiary: ${light.text.tertiary};
    --rf-text-disabled: ${light.text.disabled};
    --rf-text-inverse: ${light.text.inverse};
    --rf-text-accent: ${light.text.accent};
    --rf-text-danger: ${light.text.danger};
    --rf-border-default: ${light.border.default};
    --rf-border-subtle: ${light.border.subtle};
    --rf-border-strong: ${light.border.strong};
    --rf-border-focus: ${light.border.focus};
    --rf-border-danger: ${light.border.danger};
    --rf-accent: ${light.interactive.accent};
    --rf-accent-hover: ${light.interactive.accentHover};
    --rf-accent-subtle: ${light.interactive.accentSubtle};
    --rf-accent-text: ${light.interactive.accentText};
    --rf-accent-shadow: ${light.interactive.accentShadow};
    --rf-ghost-bg-hover: ${light.interactive.ghostBgHover};
    --rf-ghost-border: ${light.interactive.ghostBorder};
    --rf-ghost-text: ${light.interactive.ghostText};
    --rf-ghost-text-hover: ${light.interactive.ghostTextHover};
    --rf-danger: ${light.interactive.danger};
    --rf-danger-subtle: ${light.interactive.dangerSubtle};
    --rf-danger-border: ${light.interactive.dangerBorder};
    --rf-shadow-sm: ${light.shadow.sm};
    --rf-shadow-md: ${light.shadow.md};
    --rf-shadow-lg: ${light.shadow.lg};
    --rf-shadow-panel: ${light.shadow.panel};
    --rf-shadow-top-dock: ${light.shadow.topDock};
    --rf-cat-family-subtle: ${categoryTokens.family.subtle};
    --rf-cat-friend-subtle: ${categoryTokens.friend.subtle};
    --rf-cat-romantic-subtle: ${categoryTokens.romantic.subtle};
    --rf-cat-work-subtle: ${categoryTokens.work.subtle};
    --rf-cat-other-subtle: ${categoryTokens.other.subtle};
  `;

  const darkVars = `
    --rf-bg-base: ${dark.background.base};
    --rf-bg-surface: ${dark.background.surface};
    --rf-bg-elevated: ${dark.background.elevated};
    --rf-bg-subtle: ${dark.background.subtle};
    --rf-bg-muted: ${dark.background.muted};
    --rf-text-primary: ${dark.text.primary};
    --rf-text-secondary: ${dark.text.secondary};
    --rf-text-tertiary: ${dark.text.tertiary};
    --rf-text-disabled: ${dark.text.disabled};
    --rf-text-inverse: ${dark.text.inverse};
    --rf-text-accent: ${dark.text.accent};
    --rf-text-danger: ${dark.text.danger};
    --rf-border-default: ${dark.border.default};
    --rf-border-subtle: ${dark.border.subtle};
    --rf-border-strong: ${dark.border.strong};
    --rf-border-focus: ${dark.border.focus};
    --rf-border-danger: ${dark.border.danger};
    --rf-accent: ${dark.interactive.accent};
    --rf-accent-hover: ${dark.interactive.accentHover};
    --rf-accent-subtle: ${dark.interactive.accentSubtle};
    --rf-accent-text: ${dark.interactive.accentText};
    --rf-accent-shadow: ${dark.interactive.accentShadow};
    --rf-ghost-bg-hover: ${dark.interactive.ghostBgHover};
    --rf-ghost-border: ${dark.interactive.ghostBorder};
    --rf-ghost-text: ${dark.interactive.ghostText};
    --rf-ghost-text-hover: ${dark.interactive.ghostTextHover};
    --rf-danger: ${dark.interactive.danger};
    --rf-danger-subtle: ${dark.interactive.dangerSubtle};
    --rf-danger-border: ${dark.interactive.dangerBorder};
    --rf-shadow-sm: ${dark.shadow.sm};
    --rf-shadow-md: ${dark.shadow.md};
    --rf-shadow-lg: ${dark.shadow.lg};
    --rf-shadow-panel: ${dark.shadow.panel};
    --rf-shadow-top-dock: ${dark.shadow.topDock};
    /* In dark mode the canvas goes even deeper */
    --rf-graph-canvas: ${graphTokens.canvas.dark};
    --rf-graph-node-bg: ${graphTokens.node.bgDefaultDm};
    --rf-graph-node-root-bg: ${graphTokens.node.bgRootDm};
    --rf-cat-family-subtle: ${categoryTokens.family.dmSubtle};
    --rf-cat-friend-subtle: ${categoryTokens.friend.dmSubtle};
    --rf-cat-romantic-subtle: ${categoryTokens.romantic.dmSubtle};
    --rf-cat-work-subtle: ${categoryTokens.work.dmSubtle};
    --rf-cat-other-subtle: ${categoryTokens.other.dmSubtle};
  `;

  return `
    :root { ${shared} ${lightVars} }
    [data-theme="dark"] { ${darkVars} }
  `.replace(/^\s+/gm, '').replace(/\n{3,}/g, '\n\n');
}


// ─────────────────────────────────────────────────────────────────────────────
// 14. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the category color for use on the dark graph canvas. */
export function getCategoryGfxColor(category: RelationshipCategory): string {
  return categoryTokens[category].gfx;
}

/** Returns the CSS drop-shadow filter string for a selected node glow. */
export function getCategoryGlowFilter(
  category: RelationshipCategory,
  intensity: 'selected' | 'focused' = 'selected',
): string {
  const color = categoryTokens[category].glow;
  const opacity = intensity === 'selected'
    ? graphTokens.glow.opacity * graphTokens.glow.selectedMultiplier
    : graphTokens.glow.opacity * graphTokens.glow.focusedMultiplier;
  // Replace the alpha in the rgba string
  const colorWithOpacity = color.replace(/[\d.]+\)$/, `${opacity})`);
  return `drop-shadow(0 0 ${graphTokens.glow.stdDeviation}px ${colorWithOpacity})`;
}

/** Returns the 3-stop opacity array for SVG edge gradients. */
export function getEdgeGradientStops(opacity = 1): [number, number, number] {
  const [s, p] = graphTokens.edge.gradientStops;
  return [s * opacity, p * opacity, s * opacity];
}

/** Theme persistence — store and retrieve from localStorage. */
export const themeStorage = {
  KEY: 'rf-theme' as const,
  get(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem(this.KEY) as 'light' | 'dark') ?? 'light';
  },
  set(theme: 'light' | 'dark') {
    localStorage.setItem(this.KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },
  apply() {
    document.documentElement.setAttribute('data-theme', this.get());
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// 15. TAILWIND CONFIG EXTENSION
//     Import this in tailwind.config.ts to wire tokens into Tailwind utilities.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usage in tailwind.config.ts:
 *
 *   import { tailwindTokens } from './src/design-tokens'
 *   export default {
 *     darkMode: ['selector', '[data-theme="dark"]'],
 *     content: ['./index.html', './src/**\/*.{ts,tsx}'],
 *     theme: {
 *       extend: tailwindTokens,
 *     },
 *   } satisfies Config
 */
export const tailwindTokens = {
  colors: {
    // Shell palette — responds to mode via CSS vars
    'rf-base':    'var(--rf-bg-base)',
    'rf-surface': 'var(--rf-bg-surface)',
    'rf-subtle':  'var(--rf-bg-subtle)',
    'rf-muted-bg':'var(--rf-bg-muted)',

    'rf-text':    'var(--rf-text-primary)',
    'rf-muted':   'var(--rf-text-secondary)',
    'rf-faint':   'var(--rf-text-tertiary)',
    'rf-accent':  'var(--rf-accent)',
    'rf-danger':  'var(--rf-danger)',

    'rf-border':  'var(--rf-border-default)',
    'rf-border-subtle': 'var(--rf-border-subtle)',
    'rf-border-strong': 'var(--rf-border-strong)',

    // Category colours (Tailwind utilities: bg-cat-family, text-cat-family, etc.)
    'cat-family':  'var(--rf-cat-family-ui)',
    'cat-friend':  'var(--rf-cat-friend-ui)',
    'cat-romantic':'var(--rf-cat-romantic-ui)',
    'cat-work':    'var(--rf-cat-work-ui)',
    'cat-other':   'var(--rf-cat-other-ui)',

    // Graph canvas — always dark (constant)
    'graph-canvas': primitives.graphSpace[900],
    'graph-node':   primitives.graphSpace[800],
  },

  fontFamily: {
    display: typography.fontFamily.display.split(','),
    sans:    typography.fontFamily.sans.split(','),
    mono:    typography.fontFamily.mono.split(','),
  },

  fontSize: {
    xs:   [typography.size.xs,   { lineHeight: typography.lineHeight.normal }],
    sm:   [typography.size.sm,   { lineHeight: typography.lineHeight.normal }],
    base: [typography.size.base, { lineHeight: typography.lineHeight.normal }],
    md:   [typography.size.md,   { lineHeight: typography.lineHeight.relaxed }],
    lg:   [typography.size.lg,   { lineHeight: typography.lineHeight.snug   }],
    xl:   [typography.size.xl,   { lineHeight: typography.lineHeight.snug   }],
    '2xl': [typography.size['2xl'], { lineHeight: typography.lineHeight.tight }],
    '3xl': [typography.size['3xl'], { lineHeight: typography.lineHeight.tight }],
  },

  borderRadius: {
    sm:    radii.sm,
    md:    radii.md,
    lg:    radii.lg,
    xl:    radii.xl,
    '2xl': radii['2xl'],
    '3xl': radii['3xl'],
    full:  radii.full,
  },

  boxShadow: {
    sm:     'var(--rf-shadow-sm)',
    md:     'var(--rf-shadow-md)',
    lg:     'var(--rf-shadow-lg)',
    panel:  'var(--rf-shadow-panel)',
    dock:   'var(--rf-shadow-top-dock)',
    accent: 'var(--rf-accent-shadow)',
  },

  transitionTimingFunction: {
    spring:   motion.easing.spring,
    standard: motion.easing.standard,
  },

  transitionDuration: {
    fast:   motion.duration.fast,
    normal: motion.duration.normal,
    slow:   motion.duration.slow,
    panel:  motion.duration.panel,
  },

  zIndex: Object.fromEntries(
    Object.entries(zIndex).map(([k, v]) => [k, String(v)])
  ),
} as const;