---
name: DevTrack Dark Amber High-Contrast
colors:
  surface: '#17130a'
  surface-dim: '#17130a'
  surface-bright: '#3f382d'
  surface-container-lowest: '#120e06'
  surface-container-low: '#201b11'
  surface-container: '#241f15'
  surface-container-high: '#2f291f'
  surface-container-highest: '#3a3429'
  on-surface: '#ece1d1'
  on-surface-variant: '#d3c5ac'
  inverse-surface: '#ece1d1'
  inverse-on-surface: '#363025'
  outline: '#9c8f79'
  outline-variant: '#4f4633'
  surface-tint: '#f9bd22'
  primary: '#ffe1a7'
  on-primary: '#402d00'
  primary-container: '#fbbf24'
  on-primary-container: '#6c4f00'
  inverse-primary: '#795900'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#b6edff'
  on-tertiary: '#003641'
  tertiary-container: '#34daff'
  on-tertiary-container: '#005c6e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9f'
  primary-fixed-dim: '#f9bd22'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#afecff'
  tertiary-fixed-dim: '#30d8fd'
  on-tertiary-fixed: '#001f27'
  on-tertiary-fixed-variant: '#004e5d'
  background: '#17130a'
  on-background: '#ece1d1'
  surface-variant: '#3a3429'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  code:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 1.5rem
  container-max: 1440px
---

## Brand & Style
This design system is built for technical environments where clarity, speed, and precision are paramount. The aesthetic combines **Minimalism** with **Modern Brutalism**, utilizing a "terminal-dark" foundation to minimize eye strain while highlighting critical data points with high-energy amber accents. The brand personality is professional, authoritative, and unapologetically technical, evoking the feel of a premium developer tool or a high-end command center. By utilizing a near-black background against vibrant primary tones, the system achieves an elite, high-contrast look that ensures accessibility without sacrificing its futuristic edge.

## Colors
The palette is centered on a deep obsidian base (`#0c0a08`) to maximize the luminance of the amber tokens. 

- **Primary Amber (`#fbbf24`)**: Reserved for primary actions, active states, and critical paths.
- **Secondary Amber (`#f59e0b`)**: Used for accents that require visual weight but remain subordinate to primary buttons.
- **Surface Neutrals**: The secondary text is pushed toward a high-clarity zinc/gray (`#d4d4d8`) to ensure AA/AAA readability against the dark background. 
- **Subtle Borders**: Dividers use a dark slate (`#27272a`) to maintain section definition without creating visual noise or competing with the high-contrast text.

## Typography
The system exclusively uses **Space Grotesk** to maintain a cohesive, technical, and geometric appearance. 

- **Headlines**: Use heavy weights (600-700) with tight letter-spacing to create a "locked-in" architectural feel.
- **Body Text**: Optimized for long-form reading with generous line heights (1.6) to prevent the high-contrast colors from vibrating.
- **Labels & Code**: Use all-caps for labels and increased tracking (letter-spacing) to mimic the legibility of terminal headers and metadata displays.

## Layout & Spacing
This design system utilizes a **12-column fixed grid** for desktop environments to create a structured, dashboard-like feel. 

- **Grid System**: Elements should align to a strict 4px baseline rhythm. Gutters are kept at 24px (`1.5rem`) to ensure clear separation between data density zones.
- **Negative Space**: Despite the "technical" aesthetic, generous outer margins (up to `4rem`) are used to prevent the interface from feeling cluttered.
- **Sectioning**: Content is grouped into logical blocks separated by subtle 1px borders rather than heavy gaps, maintaining a continuous "single-pane-of-glass" experience.

## Elevation & Depth
In this high-contrast dark environment, traditional shadows are replaced by **Tonal Layering** and **Line-Based Depth**.

- **Surfaces**: Elevation is communicated through slight shifts in background value. Level 0 is the base (`#0c0a08`), while modals and cards use Level 1 (`#161412`).
- **Inner Glow**: To make active components "pop," use a very subtle 1px inner stroke of the primary amber color at low opacity (10-15%) rather than an outer shadow.
- **Flat Depth**: Avoid blurs. Depth is achieved through "stacking" panels with clear border definitions (`#27272a`). This keeps the UI feeling crisp and "rendered" like a terminal.

## Shapes
To reinforce the technical and professional nature of the system, **Sharp (0px)** corners are the primary standard. This "Hard-Edge" approach communicates precision and aligns with the terminal-like aesthetic. 

Small exceptions may be made for status indicators or specific iconography where a 2px radius can be used to prevent visual "stinging," but all structural containers (cards, buttons, inputs) must remain strictly rectangular.

## Components
- **Buttons**: Primary buttons are solid `#fbbf24` with `#0c0a08` text. Secondary buttons are ghost-style with a `#fbbf24` 1px border and amber text. State changes (hover) should involve a slight shift to the secondary amber.
- **Input Fields**: Dark backgrounds (`#0c0a08`) with a 1px border. On focus, the border transitions to the primary amber with a sharp, high-contrast cursor.
- **Chips/Badges**: Small, rectangular boxes with high-contrast text. Use a subtle background fill (10% opacity of the amber) to distinguish them from plain text.
- **Data Lists**: Alternate row colors are not used. Instead, rows are separated by 1px dividers (`#27272a`). Hover states on list items should utilize a slight brightness increase of the background.
- **Code Blocks**: Always use a slightly darker or more recessed surface color than the surrounding card to signify a different context, paired with the `code` typography token.
- **Progress Bars**: High-contrast amber fill against a dark gray track to ensure immediate visibility of system status.