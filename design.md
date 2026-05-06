# DevTrack — Design Specification (Updated)

## 1. Vision & Identity

DevTrack est un outil de suivi de productivité pour développeurs, conçu pour offrir une visibilité en temps réel sur l'allocation du temps technique. L'identité visuelle est ancrée dans une esthétique "terminal" haut de gamme, utilisant un thème **Dark Amber High-Contrast** aligné avec les documents Stitch (tokens + screens).

## 2. Design System: Dark Amber High-Contrast (Stitch-aligned)

Ce système privilégie la clarté technique, la densité d'information, et un rendu "command center" sans décorations inutiles.

### Palette de Couleurs (tokens)

- **Background / Surface :** `#17130a`
- **Surface containers :**
  - `surface-container-lowest`: `#120e06`
  - `surface-container-low`: `#201b11`
  - `surface-container`: `#241f15`
  - `surface-container-high`: `#2f291f`
  - `surface-container-highest`: `#3a3429`
- **Texte principal (on-surface) :** `#ece1d1`
- **Texte secondaire (on-surface-variant) :** `#d3c5ac`
- **Borders (outline-variant) :** `#4f4633` (1px, discret)
- **Accent primaire (primary-container) :** `#fbbf24` (CTAs, états actifs)
- **Accent secondaire (secondary-container) :** `#ee9800`
- **Success / Live :** `#4ade80`

### Typographie

- **Font-Family :** `Space Grotesk` (exclusive dans Stitch)
- **Hiérarchie :**
  - Headings : 600–700, tracking serré (look "architectural")
  - Body : line-height ~1.6 (réduit la vibration du contraste)
  - Code/metadata : tracking augmenté (timers, chemins, app names)

### Layout & Spacing

- **Baseline :** grille 4px (`unit: 4px`)
- **Gutters :** ~24px (`1.5rem`)

### Composants & Formes

- **Rayon de courbure (radius) :** faible et "hard-edge" (par défaut 4px / `0.25rem`; éviter les grands arrondis). Les éléments "pill" sont réservés aux badges/états.
- **Élévation :** pas d'ombres floues. Profondeur = **tonal layering** (surfaces) + **borders**. Un **glow** très subtil (ex: 10–15% amber) est acceptable sur les états actifs.
- **Cartes :** fond `surface-container` + border `outline-variant` (1px).

## 3. Structure de l'Interface

L'application utilise un layout à deux colonnes :

1. **SideNavBar (280px) :** Navigation persistante, logo de la marque, et bouton d'action principal "Start Session".
2. **Main Content Area :** Zone défilable contenant le dashboard, la timeline ou les réglages.

## 4. Écrans Principaux & Fonctionnalités

- **Dashboard :** Vue synthétique avec 4 cartes de KPIs (Temps total, Dev Core, Interface, Réunions) et un graphique de répartition (Donut).
- **Timeline (Chronologie) :** Journal vertical segmenté par heure, affichant l'application active et le titre de la fenêtre avec des indicateurs de catégorie colorés.
- **Gestion de Projets :** Système de cartes de projets avec badges de tags (API, Backend, Web) et indicateur de projet actif.
- **Configuration :** Tableaux de règles d'attribution (Processus -> Catégorie) et gestion de la base de données locale SQLite.

## 5. Principes d'Interaction

- **Real-time Feedback :** Utilisation de micro-animations et de timers dynamiques (ex: `01:42:05`).
- **High Contrast :** Priorité absolue à la distinction entre les éléments interactifs (Ambre) et les données statiques.
- **Local-First :** L'UI reflète l'état de la base de données SQLite locale sans latence perçue.