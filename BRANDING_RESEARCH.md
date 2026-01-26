# CHEZ - Branding & Design Research

**Purpose:** Deep dive into modern app design principles to establish CHEZ's visual identity and UX patterns.

---

## Executive Summary

CHEZ is a cooking assistant app that helps users import recipes from social media videos (TikTok, YouTube, Instagram) and guides them through cooking with AI-powered assistance. The branding should feel:

- **Warm & Inviting** - Like a friend in your kitchen
- **Modern & Premium** - Not another cluttered recipe app
- **Approachable** - For home cooks of all skill levels
- **Trustworthy** - AI that helps, not overwhelms

---

## 1. Competitive Landscape Analysis

### Direct Competitors

| App          | Design Language                             | Strengths                                                                           | Weaknesses                     |
| ------------ | ------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| **Pestle**   | Modern, green accents, 3-column iPad layout | Excellent cook mode UI, hands-free voice control, "Start Cooking" button prominence | Limited personalization        |
| **Crouton**  | Minimalist, clean, customizable themes      | Stunning uncluttered design, light/dark mode, modular cards                         | Less feature-rich              |
| **Paprika**  | Feature-rich but dated                      | Systematic planning, comprehensive features                                         | UI feels "quite dated in 2024" |
| **SideChef** | Step-by-step photos/videos                  | Voice commands, like "personal sous-chef"                                           | Can feel overwhelming          |
| **Tasty**    | Video-first, social                         | Approachable, engaging videos                                                       | Advertising-heavy              |

### Key Insight

> The market is split between **feature-rich but dated** (Paprika) and **beautiful but limited** (Crouton). **CHEZ can own the middle ground**: modern, beautiful UI with powerful AI features.

---

## 2. Design System Recommendations

### 2.1 Color Palette

Based on food color psychology research:

#### Color Decision: Final Analysis

**The Science (Non-negotiable facts):**

| Factor                      | Best Colors                     | Research Source                                                                                                                        |
| --------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Appetite Stimulation        | Red, Orange, Yellow             | [Escoffier](https://www.escoffieronline.com/how-color-affects-your-appetite/)                                                          |
| CTA Conversion              | Red (+21-34%), Orange (+32-40%) | [CXL](https://cxl.com/blog/which-color-converts-the-best/), [OptinMonster](https://optinmonster.com/which-color-button-converts-best/) |
| Fast Food Industry Standard | Red + Yellow                    | McDonald's, KFC, Burger King                                                                                                           |
| Appetite Suppression        | Blue                            | Multiple studies                                                                                                                       |

**The Trend Context (2025-2026):**

> "Earth tones are gaining traction in 2026, including terracotta, sand, and warm taupes." - Kitchen design trends
>
> "Terracotta is trending in food/hospitality for sophisticated, premium feel."

**The Critical Insight:**

> "There's no single 'best' button color. **The most effective color is one that strongly contrasts with your page background.**" - [CXL Research](https://cxl.com/blog/which-color-converts-the-best/)

**Candidate Comparison:**

| Color               | Hex       | Appetite | CTA Perf | Contrast | Trend  | Differentiation |
| ------------------- | --------- | -------- | -------- | -------- | ------ | --------------- |
| **Vibrant Orange**  | `#F97316` | ⭐⭐⭐   | ⭐⭐⭐   | ⭐⭐⭐   | ⭐⭐   | ⭐ (common)     |
| **Terracotta**      | `#E2725B` | ⭐⭐⭐   | ⭐⭐     | ⭐⭐     | ⭐⭐⭐ | ⭐⭐⭐          |
| **Warm Red-Orange** | `#EA580C` | ⭐⭐⭐   | ⭐⭐⭐   | ⭐⭐⭐   | ⭐⭐   | ⭐⭐            |
| **Burnt Orange**    | `#C2410C` | ⭐⭐⭐   | ⭐⭐     | ⭐⭐⭐   | ⭐⭐⭐ | ⭐⭐⭐          |

**FINAL DECISION: `#EA580C` (Warm Red-Orange)**

This is a **compromise color** that gets the best of both worlds:

| Requirement              | How #EA580C Delivers                                       |
| ------------------------ | ---------------------------------------------------------- |
| **Appetite Stimulation** | ✅ Deep in the red-orange spectrum (scientifically proven) |
| **CTA Conversion**       | ✅ Orange-red buttons outperform by 32-40%                 |
| **Premium Feel**         | ✅ Deeper/richer than pure orange, not "tech startup"      |
| **2026 Trend Alignment** | ✅ Warmer, earthier than Tailwind orange                   |
| **Contrast**             | ✅ High contrast on cream backgrounds                      |
| **Differentiation**      | ✅ Not the same orange as every food delivery app          |

**Why NOT pure terracotta (#E2725B)?**

- Lower saturation = weaker CTA performance
- A/B tests show muted tones convert less than vibrant ones
- Terracotta is great for backgrounds/accents, not primary CTAs

**Color Psychology Summary:**

> "Red and yellow are the chief food colors, evoking the tastebuds and stimulating the appetite." - [Jenn David Design](https://jenndavid.com/colors-that-influence-food-sales-infographic/)

#### Primary Colors

| Color                | Hex       | Usage                                       | Psychology                                          |
| -------------------- | --------- | ------------------------------------------- | --------------------------------------------------- |
| **CHEZ Warm Orange** | `#EA580C` | Primary CTAs, active states, brand identity | Appetite stimulation, urgency, conversion-optimized |
| **Warm Cream**       | `#FFFBF5` | Background (light mode)                     | Warmth, approachability, "kitchen" feel             |
| **Rich Espresso**    | `#44403C` | Primary text, dark accents                  | Wholesome, natural, coffee/chocolate association    |
| **Champagne**        | `#F7E6CA` | Secondary backgrounds, cards                | Soft warmth, elevated feel                          |
| **Terracotta**       | `#E2725B` | Secondary accent, illustrations, badges     | Earthy sophistication (use for non-CTA elements)    |

#### Secondary Colors (Functional)

| Color            | Hex       | Usage                                           | Psychology               |
| ---------------- | --------- | ----------------------------------------------- | ------------------------ |
| **Fresh Green**  | `#22C55E` | Success states, timers complete, "healthy" tags | Fresh, healthy, positive |
| **Golden Amber** | `#F59E0B` | Warnings, confidence indicators, highlights     | Attention without alarm  |
| **Soft Red**     | `#EF4444` | Errors, allergen warnings, destructive actions  | Urgency (use sparingly)  |

#### Mode Differentiation Strategy

> **Decision:** Single accent color (CHEZ Orange) across all modes. Differentiate through **icons and illustrations**, not color.

| Mode         | Icon               | Visual Treatment                 |
| ------------ | ------------------ | -------------------------------- |
| **Cooking**  | 🍳 Pan / Flame     | Standard orange accent           |
| **Mixology** | 🍸 Cocktail glass  | Same orange, cocktail glass icon |
| **Pastry**   | 🧁 Cupcake / Whisk | Same orange, whisk/pastry icon   |

**Why single accent?**

- **Brand Recognition:** Premium apps (Things, Linear, Arc) use ONE accent color
- **Consistency:** Users associate CHEZ with orange across all contexts
- **Food Photography:** Recipe images already provide visual variety
- **Simplicity:** Less cognitive load, cleaner UI

#### Dark Mode Palette

| Element        | Light Mode | Dark Mode                                |
| -------------- | ---------- | ---------------------------------------- |
| Background     | `#FFFBF5`  | `#1C1917` (warm stone)                   |
| Surface        | `#FFFFFF`  | `#292524` (warm surface)                 |
| Text Primary   | `#44403C`  | `#FAFAF9`                                |
| Text Secondary | `#78716C`  | `#A8A29E`                                |
| Accent         | `#EA580C`  | `#FB923C` (lighter for dark bg contrast) |

#### Complete Color Tokens

```typescript
// constants/colors.ts
export const colors = {
  // Brand
  primary: "#EA580C", // CHEZ Warm Orange (research-backed)
  primaryLight: "#FB923C", // For dark mode / hover states
  primaryDark: "#C2410C", // For pressed states

  // Backgrounds
  background: "#FFFBF5", // Warm cream
  backgroundDark: "#1C1917",
  surface: "#FFFFFF",
  surfaceDark: "#292524",
  surfaceElevated: "#F7E6CA", // Champagne - cards, modals

  // Text
  textPrimary: "#44403C", // Espresso
  textSecondary: "#78716C",
  textMuted: "#A8A29E",
  textOnPrimary: "#FFFFFF",

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Secondary accent (for non-CTA elements)
  terracotta: "#E2725B", // Badges, illustrations, backgrounds

  // Borders
  border: "#E7E5E4",
  borderDark: "#44403C",
} as const;
```

### 2.2 Typography

Following the research on premium app typography:

#### Font Stack (Custom Font for Premium Feel)

> **Decision:** Custom font to differentiate from generic apps. System fonts are fast but generic - CHEZ deserves better.

**Recommended: Plus Jakarta Sans**

| Why Plus Jakarta Sans?                                       |
| ------------------------------------------------------------ |
| Geometric but warm - matches CHEZ's friendly brand           |
| Excellent readability at small sizes (ingredients, captions) |
| Variable font = single file, all weights (~80KB)             |
| Free on Google Fonts, MIT licensed                           |
| Great x-height for legibility in kitchen conditions          |

**Alternatives considered:**

- **DM Sans** - Clean geometric, but slightly colder
- **Inter** - Overused, less distinctive
- **Nunito** - Too rounded/childish for "premium"

```typescript
// Install: npx expo install expo-font @expo-google-fonts/plus-jakarta-sans

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";

const typography = {
  heading: {
    fontFamily: "PlusJakartaSans_700Bold",
  },
  subheading: {
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  body: {
    fontFamily: "PlusJakartaSans_400Regular",
  },
  // For cook mode - medium weight for better readability
  cookMode: {
    fontFamily: "PlusJakartaSans_500Medium",
  },
};
```

**Loading Strategy:**

```typescript
// app/_layout.tsx
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  // ...
}
```

#### Type Scale (8pt Grid Aligned)

| Style      | Size | Line Height | Weight   | Usage                          |
| ---------- | ---- | ----------- | -------- | ------------------------------ |
| Display    | 32px | 40px        | Bold     | Recipe titles in detail view   |
| Heading 1  | 24px | 32px        | Bold     | Section headers                |
| Heading 2  | 20px | 28px        | Semibold | Card titles                    |
| Body Large | 17px | 24px        | Regular  | Primary content (iOS standard) |
| Body       | 15px | 22px        | Regular  | Secondary content              |
| Caption    | 13px | 18px        | Regular  | Metadata, timestamps           |
| Micro      | 11px | 16px        | Medium   | Badges, labels                 |

#### Cook Mode Typography (Larger for Kitchen Use)

| Style       | Size | Line Height | Usage                                  |
| ----------- | ---- | ----------- | -------------------------------------- |
| Step Number | 48px | 56px        | Current step indicator                 |
| Instruction | 24px | 32px        | Step text (readable from arm's length) |
| Timer       | 40px | 48px        | Timer display                          |

### 2.3 Spacing System (8pt Grid)

```typescript
const spacing = {
  xs: 4, // Tight spacing, icons
  sm: 8, // Small gaps
  md: 16, // Standard padding
  lg: 24, // Section spacing
  xl: 32, // Large sections
  xxl: 48, // Screen-level spacing
};

// Touch targets (minimum 44pt for accessibility)
const touchTarget = {
  minimum: 44,
  comfortable: 48,
};
```

### 2.4 Border Radius

Following Apple's Liquid Glass trend (2025) with softer, more rounded elements:

```typescript
const borderRadius = {
  sm: 8, // Small elements (badges, tags)
  md: 12, // Buttons, inputs
  lg: 16, // Cards
  xl: 24, // Modals, sheets
  full: 9999, // Pills, avatars
};
```

---

## 3. Component Patterns

### 3.1 Recipe Cards (Inspired by Crouton)

```
┌────────────────────────────────────┐
│ ┌──────────────────────────────┐   │
│ │                              │   │
│ │      [Recipe Image]          │   │
│ │                              │   │
│ │    🍳 Cooking  ·  25 min     │   │ ← Mode badge + time overlay
│ └──────────────────────────────┘   │
│                                    │
│ Creamy Tuscan Chicken              │ ← Title (Heading 2)
│ @cookingwithshereen                │ ← Creator (Caption, muted)
│                                    │
│ ★★★★☆  ·  Made 3 times            │ ← Rating + cook count
└────────────────────────────────────┘
```

### 3.2 Cook Mode UI (Inspired by Pestle)

Key principles:

- **Large touch targets** - Messy hands, arm's length interaction
- **High contrast** - Readable in various kitchen lighting
- **Prominent "Next Step" button** - Primary action always clear
- **Voice feedback integration** - Visual + audio confirmation

```
┌────────────────────────────────────────┐
│ Step 3 of 8                    [X]     │ ← Minimal header
├────────────────────────────────────────┤
│                                        │
│         Heat olive oil in a            │
│         large skillet over             │
│         medium-high heat until         │
│         shimmering, about 2 min.       │ ← Large, centered text
│                                        │
│             ⏱ 2:00                     │ ← Timer (if applicable)
│        [Start Timer]                   │
│                                        │
├────────────────────────────────────────┤
│                                        │
│    [◀ Previous]    [Next Step ▶]       │ ← Large touch targets
│                                        │
├────────────────────────────────────────┤
│  💬 Ask CHEZ...                    🎤  │ ← Chat input always visible
└────────────────────────────────────────┘
```

### 3.3 Confidence Indicators

For AI-extracted content:

| Confidence | Color        | Visual | Meaning                    |
| ---------- | ------------ | ------ | -------------------------- |
| > 0.8      | Green        | ✓      | High confidence            |
| 0.6 - 0.8  | Yellow/Amber | ⚠      | Review suggested           |
| < 0.6      | Red          | !      | Manual verification needed |

```
┌──────────────────────────────────────┐
│ 2 tbsp olive oil                     │ ← Normal ingredient
├──────────────────────────────────────┤
│ ⚠ 1 cup heavy cream                 │
│   └─ Original: "some cream"          │ ← Tap to see original
│      [Verify] [Edit]                 │
└──────────────────────────────────────┘
```

---

## 4. UI/UX Trends to Apply (2025-2026)

### 4.1 Voice User Interfaces (VUI)

**Critical for cooking apps** - Users have messy hands.

Research shows:

> "A recipe app in the kitchen with voice control allows a user to ask 'What's the next step?' without touching the messy screen with dough-covered hands."

**Implementation for CHEZ (Pro tier):**

- Tap mic → speak command ("next step", "go back", "set timer 5 minutes")
- Visual + voice feedback working in sync
- Clear voice state indicators (listening, processing, speaking)

> **Note:** Wake word ("Hey CHEZ") deferred - requires native modules + Picovoice integration. Current MVP uses tap-to-speak which works well for cook mode.

### 4.2 Glassmorphism / Liquid Glass (Apple 2025)

Apple's new "Liquid Glass" design language:

- Translucent elements with subtle blur
- Dynamic adaptation to content behind
- Creates depth without heavy shadows

**Where to apply in CHEZ:**

- Bottom sheets (chat overlay in cook mode)
- Modal dialogs
- Timer overlays
- Tab bar (subtle translucency)

**Performance Budget & Fallback Strategy:**

| Device Tier                         | Strategy                                    |
| ----------------------------------- | ------------------------------------------- |
| **High-end** (iPhone 12+, Pixel 6+) | Full blur (20-30px), 60fps                  |
| **Mid-range** (iPhone XR, Pixel 4)  | Reduced blur (10px), skip blur on scroll    |
| **Low-end**                         | Solid semi-transparent backgrounds, no blur |

```typescript
// hooks/useBlurSupport.ts
import { Platform } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

export function useBlurSupport() {
  const reduceMotion = useReducedMotion();

  // Conservative: disable blur if reduce motion is on
  // Could add device detection for finer control
  return {
    blurEnabled: !reduceMotion && Platform.OS === "ios",
    blurIntensity: reduceMotion ? 0 : 20,
    fallbackOpacity: 0.95,
  };
}
```

**Rule:** If FPS drops below 55 during blur animation, disable blur for that surface.

### 4.3 AI-Powered Personalization

Modern apps adapt to user behavior:

- Recipe recommendations based on cooking history
- Skill-appropriate instructions (beginner vs chef)
- Dietary restriction awareness throughout

### 4.4 Microinteractions

Subtle animations that provide feedback:

- Button press → slight scale + haptic
- Timer completion → celebration animation + sound
- Recipe save → heart fills with satisfying bounce
- Voice listening → pulsing microphone indicator

### 4.5 Accessibility First

**Non-negotiable requirements:**

- Minimum 4.5:1 contrast ratio for text
- Touch targets minimum 44pt
- Support for Dynamic Type
- VoiceOver/TalkBack compatibility
- Reduce Motion preference respected

---

## 5. Animation System (Reanimated 4)

> **Goal:** 60+ FPS animations that feel native, responsive, and delightful without sacrificing performance.
>
> **Reference:** [Reanimated 4 Stable Release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)

### 5.1 Animation Philosophy

| Principle         | Implementation                                                     |
| ----------------- | ------------------------------------------------------------------ |
| **Physics-based** | Use springs for natural, interruptible motion                      |
| **Purposeful**    | Every animation should have a reason (feedback, guidance, delight) |
| **Performant**    | Run on UI thread, avoid layout-affecting properties                |
| **Respectful**    | Honor "Reduce Motion" preference                                   |

### 5.2 Reanimated 4 Best Practices

**Use CSS Animations for State-Driven UI:**

```typescript
// Reanimated 4 CSS-style transitions (NEW)
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

const styles = StyleSheet.create({
  button: {
    transitionProperty: "transform, opacity",
    transitionDuration: "200ms",
    transitionTimingFunction: "ease-out",
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
});
```

**Use Worklets + Shared Values for Gesture-Driven:**

```typescript
// For gestures (pan, swipe, drag)
const translateY = useSharedValue(0);

const gesture = Gesture.Pan()
  .onUpdate((e) => {
    translateY.value = e.translationY;
  })
  .onEnd(() => {
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 200,
    });
  });
```

### 5.3 Performance Rules

| DO                                     | DON'T                                          |
| -------------------------------------- | ---------------------------------------------- |
| Animate `transform`, `opacity`         | Animate `width`, `height`, `margin`, `padding` |
| Use `useSharedValue` for gesture state | Use `useState` for animation values            |
| Memoize gesture objects with `useMemo` | Create gestures inline                         |
| Read shared values only in worklets    | Read `.value` on JS thread                     |
| Enable feature flags for 120fps        | Skip performance testing in debug              |

**Enable 120fps on iOS (Info.plist):**

```xml
<key>CADisableMinimumFrameDurationOnPhone</key>
<false/>
```

**Feature Flags for Performance:**

```typescript
// Enable in app.config.ts or native config
// - USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS
// - ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS
// - IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS
```

### 5.4 Animation Catalog for CHEZ

#### Button Press

```typescript
const buttonStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(pressed.value ? 0.96 : 1, { damping: 15 }) }],
}));
// + Haptic feedback via expo-haptics
```

#### Recipe Card Enter (FlatList)

```typescript
<Animated.View
  entering={FadeInUp.delay(index * 50).springify().damping(18)}
  layout={LinearTransition.springify()}
>
```

#### Timer Ring Progress

```typescript
// Use react-native-svg + Reanimated for circular progress
const animatedProps = useAnimatedProps(() => ({
  strokeDashoffset: interpolate(progress.value, [0, 1], [circumference, 0]),
}));
```

#### Bottom Sheet (Cook Mode Chat)

```typescript
// Use @gorhom/bottom-sheet or custom implementation
// Key: Gesture-driven with snap points
const snapPoints = useMemo(() => ["15%", "50%", "90%"], []);
```

#### Voice Listening Indicator

```typescript
// Pulsing circle that responds to audio levels
const pulseStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(1 + audioLevel.value * 0.3) }],
  opacity: withTiming(isListening.value ? 1 : 0.5),
}));
```

#### Timer Completion Celebration

```typescript
// Confetti burst using react-native-reanimated + custom particles
// Or use a library like react-native-confetti-cannon
entering={ZoomIn.springify().damping(10).stiffness(100)}
```

#### Skeleton Loading (Shimmer)

```typescript
// Use react-native-fast-shimmer or custom
// Key: Single shared animation value for ALL skeletons
import { ShimmerProvider, Shimmer } from 'react-native-fast-shimmer';

<ShimmerProvider>
  <Shimmer style={{ width: 200, height: 20, borderRadius: 4 }} />
</ShimmerProvider>
```

#### Page Transitions

```typescript
// Expo Router with custom transitions
<Stack.Screen
  options={{
    animation: 'slide_from_right',
    // Or custom with Reanimated
  }}
/>
```

### 5.5 Spring Presets

```typescript
// constants/animations.ts
export const springs = {
  // Snappy - buttons, toggles
  snappy: { damping: 20, stiffness: 300 },

  // Gentle - cards, modals
  gentle: { damping: 18, stiffness: 180 },

  // Bouncy - success states, celebrations
  bouncy: { damping: 10, stiffness: 150 },

  // Stiff - drag release, snap back
  stiff: { damping: 25, stiffness: 400 },
} as const;

export const durations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

export const easings = {
  easeOut: "cubic-bezier(0.0, 0.0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0.0, 1, 1)",
  easeInOut: "cubic-bezier(0.4, 0.0, 0.2, 1)",
} as const;
```

### 5.6 Reduce Motion Support

```typescript
// hooks/useReducedMotion.ts
import { useReducedMotion } from "react-native-reanimated";

export function useAnimationConfig() {
  const reduceMotion = useReducedMotion();

  return {
    spring: reduceMotion ? { duration: 0 } : { damping: 18, stiffness: 200 },
    shouldAnimate: !reduceMotion,
  };
}
```

---

## 6. Onboarding Flow

> **Goal:** Get users to their first "Aha moment" (importing a recipe) as fast as possible while collecting personalization data.
>
> **Reference:** [Duolingo Onboarding Analysis](https://goodux.appcues.com/blog/duolingo-user-onboarding)

### 6.1 Onboarding Philosophy

| Principle                  | Implementation                               |
| -------------------------- | -------------------------------------------- |
| **Delay signup**           | Let users experience value before committing |
| **Progressive disclosure** | Don't overwhelm; reveal features as needed   |
| **Quick wins**             | First import should feel magical             |
| **Personalization**        | Tailor experience based on skill level       |

### 6.2 Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. WELCOME (Skip-able)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │          [CHEZ Logo Animation]                          │   │
│  │                                                         │   │
│  │     "Your personal cooking companion"                   │   │
│  │                                                         │   │
│  │              [Get Started]                              │   │
│  │                                                         │   │
│  │         Already have an account? Log in                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2. SKILL ASSESSMENT (Required)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     "How would you describe your cooking skills?"       │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  🌱  Beginner                                   │   │   │
│  │  │      "I follow recipes step-by-step"           │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  🏠  Home Cook                                  │   │   │
│  │  │      "I'm comfortable improvising"             │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  👨‍🍳  Experienced Chef                          │   │   │
│  │  │      "I know my way around a kitchen"          │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  3. INTERESTS (Optional but encouraged)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     "What do you love to make?"                         │   │
│  │     (Select all that apply)                             │   │
│  │                                                         │   │
│  │  [🍳 Everyday Meals]  [🍸 Cocktails]  [🧁 Desserts]   │   │
│  │                                                         │   │
│  │  [🍝 Pasta]  [🌮 Quick Bites]  [🍖 BBQ & Grilling]    │   │
│  │                                                         │   │
│  │  [🥗 Healthy]  [🌍 World Cuisine]  [🍞 Baking]        │   │
│  │                                                         │   │
│  │                          [Skip]  [Continue]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  4. DIETARY (Optional)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     "Any dietary restrictions?"                         │   │
│  │     (We'll flag recipes that don't match)              │   │
│  │                                                         │   │
│  │  [Vegetarian]  [Vegan]  [Gluten-Free]  [Dairy-Free]   │   │
│  │                                                         │   │
│  │  [Nut Allergy]  [Shellfish]  [Kosher]  [Halal]        │   │
│  │                                                         │   │
│  │                          [Skip]  [Continue]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  5. FIRST VALUE MOMENT - "Try It Now"                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     "Let's save your first recipe!"                     │   │
│  │                                                         │   │
│  │     ┌───────────────────────────────────────────────┐  │   │
│  │     │  📋  Paste a TikTok, YouTube, or Instagram   │  │   │
│  │     │      recipe link...                          │  │   │
│  │     └───────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │     Or try one of these:                               │   │
│  │     [🔥 Trending: 15-min Pasta]  [⭐ Staff Pick]       │   │
│  │                                                         │   │
│  │                               [Skip for now]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  6. SIGNUP (After value shown)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     "Save your recipe to your account"                  │   │
│  │                                                         │   │
│  │     ┌───────────────────────────────────────────────┐  │   │
│  │     │  [Sign in with Apple]                         │  │   │
│  │     └───────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │     ┌───────────────────────────────────────────────┐  │   │
│  │     │  [Sign in with Google]                        │  │   │
│  │     └───────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │     ┌───────────────────────────────────────────────┐  │   │
│  │     │  [Continue with Email]                        │  │   │
│  │     └───────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Gamification Elements (Inspired by Duolingo/Headspace)

| Element            | Implementation                            | Purpose                 |
| ------------------ | ----------------------------------------- | ----------------------- |
| **Cooking Streak** | Track consecutive days with cook sessions | Build habit, retention  |
| **Milestones**     | "First Recipe!", "10 Recipes Cooked"      | Sense of progress       |
| **Skill Progress** | Visual indicator per mode                 | Encourage exploration   |
| **Badges**         | "Pasta Master", "Quick Cook"              | Collection, achievement |

**Streak Implementation:**

```typescript
// Show streak prominently on home screen
// Send push notification to prevent streak break
// Offer "streak freeze" as premium feature
```

### 6.4 Progressive Feature Introduction

| Trigger               | Feature Introduced     | UI Pattern           |
| --------------------- | ---------------------- | -------------------- |
| First recipe imported | Library, Recipe detail | Natural navigation   |
| First "Start Cooking" | Cook mode basics       | Brief tooltip        |
| First timer set       | Timer features         | Contextual highlight |
| First question asked  | AI chat capabilities   | Subtle prompt        |
| After 3 cooks         | Grocery lists          | "New" badge          |

### 6.5 Data Collection Strategy

**Required (blocking):**

- Skill level (affects AI responses)

**Optional (skip-able):**

- Interests (improves recommendations)
- Dietary restrictions (enables allergen warnings)

**Collected implicitly:**

- Platform preference (first import source)
- Cook frequency (session tracking)
- Question types (RAG improvement)

---

## 7. Voice Feature Monetization (Premium Tier)

> **Constraint:** Voice features (TTS/STT) cost money per use. Free tier must be sustainable.
>
> **Reference:** [Speechify Pricing Model](https://websitevoice.com/blog/how-much-does-speechify-cost/)

### 7.1 Cost Analysis

| Feature                  | Provider       | Cost             | Free Tier Allowance         |
| ------------------------ | -------------- | ---------------- | --------------------------- |
| **TTS (Text-to-Speech)** | OpenAI         | ~$15/1M chars    | 10 recipe read-alouds/month |
| **STT (Speech-to-Text)** | OpenAI Whisper | ~$0.006/min      | 5 voice questions/month     |
| **AI Chat**              | Claude         | ~$3-15/1M tokens | 20 questions/month          |

### 7.2 Tier Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         FREE TIER                               │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 3 recipe imports/month                                      │
│  ✅ Unlimited recipe library access                             │
│  ✅ Basic cook mode (manual navigation)                         │
│  ✅ 10 AI questions/month (text only)                           │
│  ✅ Timers (unlimited)                                          │
│  ❌ Voice input (STT)                                           │
│  ❌ Voice responses (TTS)                                       │
│  ❌ Hands-free mode                                             │
│  ❌ Skill adaptations                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CHEZ PRO - $4.99/month                      │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Unlimited recipe imports                                    │
│  ✅ Unlimited AI questions                                      │
│  ✅ Voice input (STT) - tap mic, speak commands                │
│  ✅ Voice responses (TTS) - Steps read aloud                    │
│  ✅ Hands-free cook mode                                        │
│  ✅ Skill-level adaptations (Beginner → Chef)                   │
│  ✅ Grocery list consolidation                                  │
│  ✅ Recipe scaling                                              │
│  ✅ Priority support                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CHEZ PRO ANNUAL - $39.99/year                 │
├─────────────────────────────────────────────────────────────────┤
│  Everything in Pro, plus:                                       │
│  ✅ 33% savings ($3.33/month effective)                         │
│  ✅ Streak freeze (3/month)                                     │
│  ✅ Early access to new features                                │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Voice Feature UX for Free Users

**When free user tries to use voice:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      🎤 Hands-Free Cooking                      │
│                                                                 │
│     Tap the mic and say "next step" - navigate without         │
│     touching your screen with messy hands.                     │
│                                                                 │
│     Voice features are part of CHEZ Pro.                        │
│                                                                 │
│     ┌───────────────────────────────────────────────────────┐  │
│     │            [Try Pro Free for 7 Days]                  │  │
│     └───────────────────────────────────────────────────────┘  │
│                                                                 │
│     ┌───────────────────────────────────────────────────────┐  │
│     │            [Maybe Later]                              │  │
│     └───────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Cook Mode UI Differences

**Free Tier Cook Mode:**

```
┌────────────────────────────────────────┐
│ Step 3 of 8                    [X]     │
├────────────────────────────────────────┤
│                                        │
│         Heat olive oil in a            │
│         large skillet...               │
│                                        │
├────────────────────────────────────────┤
│                                        │
│    [◀ Previous]    [Next Step ▶]       │  ← Manual touch navigation
│                                        │
├────────────────────────────────────────┤
│  💬 Ask CHEZ...               [🔒 🎤]  │  ← Mic locked (shows Pro badge)
└────────────────────────────────────────┘
```

**Pro Tier Cook Mode:**

```
┌────────────────────────────────────────┐
│ Step 3 of 8                🎤 [X]      │  ← Voice indicator in header
├────────────────────────────────────────┤
│                                        │
│    🔊 "Heat olive oil in a large       │  ← Auto-read with speaker icon
│         skillet over medium-high..."   │
│                                        │
├────────────────────────────────────────┤
│                                        │
│    [◀ Previous]    [Next Step ▶]       │
│                                        │
│    Tap 🎤 then say "next" or "go back" │  ← Voice hint (tap-to-speak)
├────────────────────────────────────────┤
│  💬 Ask CHEZ...                   [🎤] │  ← Mic active
└────────────────────────────────────────┘
```

### 7.5 Soft Paywall Triggers

| Trigger                    | Action                     | Conversion Goal   |
| -------------------------- | -------------------------- | ----------------- |
| 4th import attempt         | Show paywall               | Import limit      |
| Tap locked mic (free user) | Soft upsell modal          | Voice feature     |
| 11th AI question           | "Running low" warning      | Question limit    |
| Complete 3rd cook          | "Unlock hands-free" prompt | Cook mode upgrade |

### 7.6 Detailed Cost Analysis: Is $4.99/month Sustainable?

> **TL;DR:** Yes, but with usage caps. Unlimited everything at $4.99 is risky. Recommend "generous limits" instead of "unlimited."

#### API Costs Breakdown (2026 Pricing)

| Service                        | Provider         | Unit Cost                                | Notes                                            |
| ------------------------------ | ---------------- | ---------------------------------------- | ------------------------------------------------ |
| **Recipe Import (Transcript)** | Supadata         | $0.00 (Free tier: 100/mo) or $5/mo (500) | We likely stay on $5/mo plan                     |
| **Recipe Import (Extraction)** | Claude Haiku 4.5 | ~$0.003-0.01/recipe                      | ~500 input + 1000 output tokens                  |
| **AI Chat (Q&A)**              | Claude Haiku 4.5 | ~$0.005-0.02/question                    | ~1000 input + 500 output tokens                  |
| **Text-to-Speech**             | OpenAI TTS       | ~$0.015/1M chars                         | ~$0.003/recipe read (~200 chars/step x 10 steps) |
| **Speech-to-Text**             | OpenAI Whisper   | $0.006/minute                            | ~$0.02-0.03/cook session (3-5 min total voice)   |

#### Per-User Cost Scenarios (Monthly)

**Light User (Casual Cook):**
| Activity | Frequency | Cost/Activity | Monthly Cost |
|----------|-----------|---------------|--------------|
| Recipe imports | 5 | $0.007 | $0.035 |
| AI questions | 10 | $0.01 | $0.10 |
| Voice commands | 2 sessions | $0.025 | $0.05 |
| TTS read-aloud | 2 sessions | $0.003 | $0.006 |
| **TOTAL** | | | **$0.19** |

**Heavy User (Daily Cook):**
| Activity | Frequency | Cost/Activity | Monthly Cost |
|----------|-----------|---------------|--------------|
| Recipe imports | 30 | $0.007 | $0.21 |
| AI questions | 100 | $0.01 | $1.00 |
| Voice commands | 20 sessions | $0.025 | $0.50 |
| TTS read-aloud | 20 sessions | $0.003 | $0.06 |
| **TOTAL** | | | **$1.77** |

**Power User (Recipe Creator/Influencer):**
| Activity | Frequency | Cost/Activity | Monthly Cost |
|----------|-----------|---------------|--------------|
| Recipe imports | 100 | $0.007 | $0.70 |
| AI questions | 300 | $0.01 | $3.00 |
| Voice commands | 50 sessions | $0.025 | $1.25 |
| TTS read-aloud | 50 sessions | $0.003 | $0.15 |
| **TOTAL** | | | **$5.10** |

#### Revenue vs. Cost Analysis

**Assuming 30% Apple/Google cut:**

- $4.99 subscription → **$3.49 net revenue**

| User Type | Cost  | Net Revenue | Margin        |
| --------- | ----- | ----------- | ------------- |
| Light     | $0.19 | $3.49       | **+$3.30** ✅ |
| Heavy     | $1.77 | $3.49       | **+$1.72** ✅ |
| Power     | $5.10 | $3.49       | **-$1.61** ❌ |

#### Recommendations

1. **Don't say "Unlimited" - say "Generous"**
   - Imports: 50/month (vs 3 free) - covers 99% of users
   - AI Questions: 200/month (vs 10 free) - covers heavy users
   - Voice: 30 hours/month - nobody cooks that much

2. **Add a higher tier for power users:**

   ```
   CHEZ Pro+ - $9.99/month
   - 200 imports/month
   - Unlimited AI questions
   - Priority processing
   - Family sharing (up to 5)
   ```

3. **Monitor and adjust:**
   - Track per-user API costs
   - Identify power users early
   - Offer upgrade path before they become costly

#### Updated Tier Structure (Recommended)

```
FREE TIER (Sustainable)
├── 3 imports/month
├── 10 AI questions/month
├── Manual cook mode only
└── Ads (non-intrusive banner on home)

CHEZ PRO - $4.99/month (Target: 95% of users)
├── 50 imports/month
├── 200 AI questions/month
├── Voice input/output (30 hours)
├── Hands-free cook mode
├── Skill adaptations
└── No ads

CHEZ PRO+ - $9.99/month (Power users)
├── 200 imports/month
├── Unlimited AI questions
├── Unlimited voice
├── Priority processing
├── Family sharing (5 accounts)
└── Beta features access
```

---

## 8. Free Tier Usability & Anti-Abuse Measures

> **Goal:** Free tier should be genuinely usable, not a crippled teaser. But prevent abuse from reinstall farming.

### 8.1 Free Tier Philosophy

| Principle               | Implementation                             |
| ----------------------- | ------------------------------------------ |
| **Valuable**            | Can actually cook recipes, not just browse |
| **Limited**             | Caps on imports/AI, not on cooking         |
| **Fair**                | Honest about limitations, no dark patterns |
| **Upgrade-encouraging** | Show value of Pro during natural moments   |

### 8.2 What Free Users CAN Do

| Feature            | Free Tier Access        | Limitation           |
| ------------------ | ----------------------- | -------------------- |
| **Import recipes** | ✅ 3/month              | Soft paywall at 4th  |
| **View library**   | ✅ Full access          | No limit             |
| **Cook recipes**   | ✅ Manual mode          | No voice/hands-free  |
| **Timers**         | ✅ Unlimited            | Full functionality   |
| **AI questions**   | ✅ 10/month (text only) | Soft paywall at 11th |
| **Grocery lists**  | ✅ Basic (from recipes) | No consolidation     |
| **Recipe scaling** | ❌ Pro only             | Show "Pro" badge     |

### 8.3 Anti-Abuse: Device Fingerprinting + Local Storage

**Problem:** Users reinstalling app to get 3 free imports again.

**Solution:** Multi-layer protection

#### Layer 1: Device ID Persistence

```typescript
// lib/deviceId.ts
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "chez_device_id";

export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate new UUID
    deviceId = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}
```

> **Note:** SecureStore persists across reinstalls on iOS (Keychain) but NOT on Android. Additional measures needed.

#### Layer 2: Server-Side Device Tracking

```sql
-- migrations/add_device_tracking.sql
CREATE TABLE device_usage (
  device_id TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  total_free_imports INTEGER DEFAULT 0,
  last_import_at TIMESTAMPTZ,
  is_flagged BOOLEAN DEFAULT FALSE
);

-- Track imports per device, not per account
CREATE OR REPLACE FUNCTION check_import_limit(p_device_id TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_device_imports INTEGER;
  v_user_is_pro BOOLEAN;
BEGIN
  -- Check if user is Pro
  SELECT is_pro INTO v_user_is_pro FROM profiles WHERE id = p_user_id;
  IF v_user_is_pro THEN RETURN TRUE; END IF;

  -- Get device's total free imports this month
  SELECT COUNT(*) INTO v_device_imports
  FROM recipes
  WHERE device_id = p_device_id
    AND created_at > DATE_TRUNC('month', NOW())
    AND imported_while_free = TRUE;

  RETURN v_device_imports < 3;
END;
$$ LANGUAGE plpgsql;
```

#### Layer 3: Last Recipe Cache (Offline Access)

```typescript
// lib/recipeCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_RECIPE_KEY = "chez_last_imported_recipe";

interface CachedRecipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  cachedAt: string;
}

export async function cacheLastRecipe(recipe: Recipe): Promise<void> {
  const cached: CachedRecipe = {
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(LAST_RECIPE_KEY, JSON.stringify(cached));
}

export async function getLastCachedRecipe(): Promise<CachedRecipe | null> {
  const data = await AsyncStorage.getItem(LAST_RECIPE_KEY);
  return data ? JSON.parse(data) : null;
}
```

#### Layer 4: Graceful Degradation for Offline/Unsynced

```typescript
// When user is logged out or offline
function RecipeLibrary() {
  const { data: recipes, isLoading } = useRecipes();
  const [cachedRecipe, setCachedRecipe] = useState<CachedRecipe | null>(null);

  useEffect(() => {
    getLastCachedRecipe().then(setCachedRecipe);
  }, []);

  if (!isAuthenticated) {
    return (
      <View>
        {cachedRecipe ? (
          <>
            <Text>Your last imported recipe:</Text>
            <RecipeCard recipe={cachedRecipe} />
            <Text>Sign in to access your full library</Text>
          </>
        ) : (
          <EmptyState message="Sign in to start saving recipes" />
        )}
      </View>
    );
  }
  // ... normal authenticated view
}
```

### 8.4 Abuse Detection Patterns

| Signal                         | Threshold                      | Action           |
| ------------------------------ | ------------------------------ | ---------------- |
| Multiple accounts, same device | 2+ accounts                    | Flag for review  |
| Rapid imports near limit       | 3 imports in 1 hour            | Cool-down period |
| Device ID changes frequently   | >3 changes/month               | Hard block       |
| Import spike after reinstall   | Import within 1 min of install | Require account  |

### 8.5 Soft vs Hard Limits

| Limit Type                    | Free Experience                                            | Pro Experience |
| ----------------------------- | ---------------------------------------------------------- | -------------- |
| **Soft** (encourages upgrade) | "You've used 3 of 3 imports this month. Upgrade for more!" | No limit shown |
| **Hard** (prevents abuse)     | "Unusual activity detected. Please sign in to continue."   | N/A            |

### 8.6 Free User Retention Without Annoyance

| Strategy                  | Implementation                                  |
| ------------------------- | ----------------------------------------------- |
| **Generous grace period** | First month: 5 imports instead of 3             |
| **Streak rewards**        | Free users can earn +1 import with 7-day streak |
| **Share-to-unlock**       | Share a recipe, get +1 import                   |
| **Rate-to-unlock**        | Rate app on store, get +2 imports (one-time)    |

---

## 9. Brand Voice & Tone

### 8.1 Personality Traits

| Trait             | How It Manifests                         |
| ----------------- | ---------------------------------------- |
| **Warm**          | "Let's get cooking!" not "Start recipe"  |
| **Encouraging**   | "Nice work on step 3!" during cooking    |
| **Knowledgeable** | Helpful tips without being condescending |
| **Patient**       | Repeats instructions without frustration |
| **Adaptive**      | Adjusts language to skill level          |

### 8.2 Copy Examples

| Context            | Generic           | CHEZ Voice                                                         |
| ------------------ | ----------------- | ------------------------------------------------------------------ |
| Empty state        | "No recipes"      | "Your recipe box is empty. Let's fill it up!"                      |
| Import success     | "Recipe imported" | "Got it! Your Tuscan Chicken is ready to cook."                    |
| Timer done         | "Timer complete"  | "Time's up! Your pasta should be perfect."                         |
| Error              | "Import failed"   | "Hmm, couldn't grab that recipe. Want to try pasting it manually?" |
| Confidence warning | "Low confidence"  | "I'm not 100% sure about this ingredient. Mind double-checking?"   |

### 8.3 Skill-Level Adaptation

| Level         | Tone                  | Example                                                                                                |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Beginner**  | Gentle, detailed      | "Now carefully add the garlic. You'll hear it sizzle - that's good! Keep stirring so it doesn't burn." |
| **Home Cook** | Confident, efficient  | "Add garlic, stir until fragrant, about 30 seconds."                                                   |
| **Chef**      | Professional, precise | "Sauté minced garlic until aromatic, maintaining movement to prevent Maillard over-browning."          |

---

## 10. Icon System

### Recommended: SF Symbols + Custom Set

**SF Symbols** (6,900+ icons) for standard UI:

- Navigation (house, book, cart, person)
- Actions (plus, checkmark, xmark)
- Media (play, pause, speaker)

**Custom icons** for food-specific elements:

- Mode indicators (pan, cocktail glass, whisk)
- Timer states
- Ingredient categories
- CHEZ mascot/logo mark

### Icon Style Guidelines

- Stroke weight: 2pt (matches SF Symbols Medium)
- Style: Rounded, friendly (not sharp/technical)
- Active state: Filled
- Inactive state: Outlined

---

## 11. Implementation Roadmap

### Phase 1: Design Tokens (Week 1)

Create centralized design system:

```typescript
// constants/theme.ts
export const theme = {
  colors: {
    primary: "#EA580C",
    background: "#FFFBF5",
    // ... full palette
  },
  spacing: {
    xs: 4,
    sm: 8,
    // ...
  },
  typography: {
    // ...
  },
  borderRadius: {
    // ...
  },
};
```

### Phase 2: Core Components (Week 2)

Build reusable components:

- `<Button />` with variants (primary, secondary, ghost)
- `<Card />` for recipes
- `<Input />` with voice toggle
- `<Badge />` for modes, confidence, allergens

### Phase 3: Screen Polish (Week 3)

Apply design system to existing screens:

- Update color usage
- Implement proper spacing
- Add microinteractions
- Ensure accessibility

### Phase 4: Cook Mode Excellence (Week 4)

Special focus on the core experience:

- Large typography
- Voice integration UI
- Timer animations
- Chat overlay polish

---

## 12. Design Resources

### Inspiration

- [Dribbble - Recipe App Designs](https://dribbble.com/tags/recipe-app)
- [Behance - Recipe App Projects](https://www.behance.net/search/projects/recipe%20app%20design)
- [Tubik Studio - Recipe App Case Study](https://blog.tubikstudio.com/case-study-recipes-app-ux-design/)

### Tools

- [Coolors](https://coolors.co/) - Color palette generator
- [Khroma](https://www.khroma.co/) - AI color tool
- [SF Symbols](https://developer.apple.com/sf-symbols/) - Apple icon library

### Guidelines

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Material Design 3](https://m3.material.io/)
- [8pt Grid System](https://spec.fm/specifics/8-pt-grid)

---

## 13. Key Metrics to Track

| Metric                       | Target                 | Why                          |
| ---------------------------- | ---------------------- | ---------------------------- |
| Cook mode session completion | > 80%                  | Users finish what they start |
| Voice command usage          | > 30% of cook sessions | Hands-free is working        |
| Time to import               | < 10 seconds           | Fast gratification           |
| Recipe return rate           | > 2x                   | Users come back to recipes   |
| App Store rating             | > 4.7                  | Design quality perception    |

---

## Sources

### Color & Branding

- [Figma - Terracotta Color](https://www.figma.com/colors/terracotta/)
- [Color Hexa - Terra Cotta](https://www.colorhexa.com/e2725b)
- [HunterLab - Color Psychology in Food Marketing](https://www.hunterlab.com/blog/what-color-psychology-is-used-in-food-marketing/)
- [Forty8Creates - Color Psychology of Food & Drink](https://forty8creates.com/colour-psychology-of-food-drink/)
- [Color Hunt - Food Palettes](https://colorhunt.co/palettes/food)

### Animation & Performance

- [Reanimated 4 Stable Release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)
- [Reanimated Performance Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [FreeCodeCamp - Fluid Animations with Reanimated v4](https://www.freecodecamp.org/news/how-to-create-fluid-animations-with-react-native-reanimated-v4/)
- [Callstack - 60fps Animations](https://www.callstack.com/blog/60fps-animations-in-react-native)
- [Callstack - Shimmer Effects](https://www.callstack.com/blog/performant-and-cross-platform-shimmers-in-react-native-apps)
- [Josh Comeau - Spring Physics](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)

### Onboarding & UX

- [Duolingo User Onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding)
- [Plotline - Mobile App Onboarding 2026](https://www.plotline.so/blog/mobile-app-onboarding-examples)
- [VWO - Mobile App Onboarding Guide](https://vwo.com/blog/mobile-app-onboarding-guide/)
- [StriveCloud - Duolingo Gamification](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo)
- [Plotline - Streaks and Milestones](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)

### Voice & Monetization

- [Speechify Pricing](https://websitevoice.com/blog/how-much-does-speechify-cost/)
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing)

### Competitor Analysis

- [Fulcra Design - Recipe App Comparison](https://fulcra.design/Notes/Grocery-and-recipe-app-comparison-and-review/)
- [MacStories - Pestle Review](https://www.macstories.net/reviews/pestle-1-2-the-macstories-review/)
- [Tools and Toys - Crouton Review](https://toolsandtoys.net/crouton-recipe-and-meal-planner-app-for-iphone-ipad/)

### Design Systems & Guidelines

- [Designveloper - Mobile App UX/UI Trends 2026](https://www.designveloper.com/blog/mobile-app-design-trends/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Spec.fm - 8pt Grid](https://spec.fm/specifics/8-pt-grid)
- [Gorhom Bottom Sheet](https://gorhom.dev/react-native-bottom-sheet/)
- [Moti Interactions](https://moti.fyi/interactions/overview)
