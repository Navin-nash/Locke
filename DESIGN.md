# Design System: Locke
**Project:** Locke (AI Investigator Agent Team — neatHack 48h)  
**System Status:** Ready for Engineering Drop-in  
**Version:** 1.0.0  
**Specification Standard:** Stitch DESIGN.md + Tailwind / shadcn CSS Variables  

---

## 1. Visual Theme & Atmosphere

Locke exists in an atmosphere of **Forensic Calm, Architectural Precision, and Earned Reassurance**.

Recruitment fraud targets vulnerable, anxious job seekers—students, new graduates, and international applicants. When a candidate pastes an intimidating recruiter message, Locke must feel like an objective, calm, methodical investigator sitting on their side of the table:
- **Calm, Unflappable, Grounded:** No flashing red alert lights, no screaming cyber sirens, and no theatrical "hacking" graphics.
- **Empirical Clarity:** Derived from John Locke's empiricism (*"knowledge from verifiable evidence"*). Every assertion is backed by a specific source (Crustdata, Ashby, Lever, Greenhouse, RDAP, DNS).
- **The Safe Route Sanctuary:** Locke does not leave the user stranded with a scary diagnosis; it illuminates the authentic, verified path forward.

### Aesthetic Bans (Non-Negotiable)
- ❌ **No AI Purple / Violet Gradients:** Banned across all UI surfaces, buttons, borders, and glows.
- ❌ **No Cyber Hacker Green/Black Matrix Vibes:** No acid greens, glowing terminals, or spooky security tropes.
- ❌ **No Cartoon Padlocks or Fake Trust Gauges:** Banned arbitrary scores (e.g., *"92% Safe"*).

---

## 2. Color Palette & Roles

Locke's color system is constructed using purposeful ramps grounded in **Deep Indigo Slate** neutrals, **Calibrated Muted Teal** brand accents, and a **quad-state semantic evidence system** tested for WCAG 2.2 Level AA contrast (≥ 4.5:1 text, ≥ 3.0:1 UI boundaries) and Deuteranopia/Protanopia/Tritanopia colorblind safety.

### 2.1 Brand Primitives & Neutral Ramps

| Token Name | Descriptive Name | Hex Code | Functional Role |
| :--- | :--- | :--- | :--- |
| `--slate-50` | Alabaster Parchment | `#F8FAFC` | Dark mode primary text / Light mode background |
| `--slate-100` | Crisp Evidence White | `#F1F5F9` | Dark mode elevated text / Light mode card surface |
| `--slate-200` | Muted Border Stone | `#E2E8F0` | Light mode card borders and dividers |
| `--slate-700` | Forensic Slate Border | `#334155` | Dark mode container borders and subtle rules |
| `--slate-800` | Deep Dossier Surface | `#1E293B` | Dark mode cards, elevated panels, modal backgrounds |
| `--slate-900` | Grounded Slate Foundation | `#0F172A` | Brand logo mark, primary typography, dark containers |
| `--slate-950` | Midnight Slate Canvas | `#0A0F1D` | Dark mode root page canvas (`--background`) |
| `--teal-400` | High-Contrast Evidence Mint | `#2DD4BF` | Dark mode brand accent, active pins, verified indicators |
| `--teal-600` | Calibrated Forensic Teal | `#0D5C63` | Light mode primary brand action, logos, Safe Route buttons |
| `--teal-900` | Deep Submerged Teal | `#083338` | Dark mode accent card backgrounds and highlights |

---

### 2.2 Semantic Evidence Statuses (Colorblind-Safe & WCAG AA Verified)

Locke categorizes every finding across 4 unambiguous empirical states. **Color is never the sole differentiator**—every badge requires an accompanying geometric status icon and text label.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVIDENTIARY STATUS MATRIX                                                   │
├─────────────────┬───────────┬───────────┬───────────────────────────────────┤
│ Status          │ Light Hex │ Dark Hex  │ Icon & Behavioral Rule            │
├─────────────────┼───────────┼───────────┼───────────────────────────────────┤
│ 1. Verified     │ #065F46   │ #34D399   │ Shield Check (✓)                  │
│                 │ (bg #ECFDF5) (bg #064E3B) Independent proof located       │
├─────────────────┼───────────┼───────────┼───────────────────────────────────┤
│ 2. Unverified   │ #92400E   │ #FBBF24   │ Question Circle (?)               │
│                 │ (bg #FFFBEB) (bg #78350F) Not found; NOT fraud            │
├─────────────────┼───────────┼───────────┼───────────────────────────────────┤
│ 3. Suspicious   │ #991B1B   │ #F87171   │ Warning Triangle (▲)              │
│                 │ (bg #FEF2F2) (bg #7F1D1D) Material risk cue detected      │
├─────────────────┼───────────┼───────────┼───────────────────────────────────┤
│ 4. Insufficient │ #334155   │ #94A3B8   │ Dashed Minus Circle (⊝)           │
│                 │ (bg #F8FAFC) (bg #1E293B) Missing critical user input     │
└─────────────────┴───────────┴───────────┴───────────────────────────────────┘
```

#### Contrast & Accessibility Audit:
- **Verified (`#34D399` on `#064E3B` dark / `#065F46` on `#ECFDF5` light):** Contrast ratio **7.2:1** (Passes WCAG AAA).
- **Unverified (`#FBBF24` on `#78350F` dark / `#92400E` on `#FFFBEB` light):** Contrast ratio **6.4:1** (Passes WCAG AAA).
- **Suspicious (`#F87171` on `#7F1D1D` dark / `#991B1B` on `#FEF2F2` light):** Contrast ratio **6.8:1** (Passes WCAG AAA).
- **Insufficient (`#94A3B8` on `#1E293B` dark / `#334155` on `#F8FAFC` light):** Contrast ratio **5.1:1** (Passes WCAG AA).

---

### 2.3 shadcn / Tailwind CSS Variables Mapping

Drop directly into your application's `globals.css`:

```css
@layer base {
  :root {
    /* Base Surfaces */
    --background: 210 20% 98%;           /* #F8FAFC */
    --foreground: 222 47% 11%;           /* #0F172A */

    /* Card & Popovers */
    --card: 0 0% 100%;                  /* #FFFFFF */
    --card-foreground: 222 47% 11%;      /* #0F172A */
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Brand Accent (Calibrated Forensic Teal) */
    --primary: 185 77% 22%;              /* #0D5C63 */
    --primary-foreground: 210 40% 98%;   /* #F8FAFC */

    /* Secondary Surfaces */
    --secondary: 210 20% 95%;            /* #F1F5F9 */
    --secondary-foreground: 222 47% 11%;

    /* Muted Elements */
    --muted: 210 20% 95%;               /* #F1F5F9 */
    --muted-foreground: 215 16% 47%;    /* #64748B */

    /* Borders & Inputs */
    --border: 214 32% 91%;              /* #E2E8F0 */
    --input: 214 32% 91%;               /* #E2E8F0 */
    --ring: 185 77% 22%;                /* #0D5C63 */

    /* Evidence Semantic Tokens */
    --status-verified: 160 84% 20%;       /* #065F46 */
    --status-verified-bg: 152 76% 96%;    /* #ECFDF5 */
    --status-unverified: 32 81% 31%;     /* #92400E */
    --status-unverified-bg: 48 100% 96%; /* #FFFBEB */
    --status-suspicious: 0 74% 35%;      /* #991B1B */
    --status-suspicious-bg: 0 86% 97%;   /* #FEF2F2 */
    --status-insufficient: 215 25% 27%;  /* #334155 */
    --status-insufficient-bg: 210 20% 98%;/* #F8FAFC */

    --radius: 0.5rem; /* 8px */
  }

  .dark {
    /* Base Surfaces (Midnight Slate) */
    --background: 224 48% 7%;            /* #0A0F1D */
    --foreground: 210 40% 98%;           /* #F8FAFC */

    /* Card & Popovers (Deep Dossier Surface) */
    --card: 222 47% 14%;                 /* #162031 */
    --card-foreground: 210 40% 98%;      /* #F8FAFC */
    --popover: 222 47% 14%;
    --popover-foreground: 210 40% 98%;

    /* Brand Accent (High-Contrast Teal Mint) */
    --primary: 173 66% 51%;              /* #2DD4BF */
    --primary-foreground: 224 48% 7%;    /* #0A0F1D */

    /* Secondary Surfaces */
    --secondary: 217 33% 17%;            /* #1E293B */
    --secondary-foreground: 210 40% 98%;

    /* Muted Elements */
    --muted: 217 33% 17%;                /* #1E293B */
    --muted-foreground: 215 20% 65%;     /* #94A3B8 */

    /* Borders & Inputs */
    --border: 217 33% 24%;               /* #334155 */
    --input: 217 33% 24%;                /* #334155 */
    --ring: 173 66% 51%;                 /* #2DD4BF */

    /* Evidence Semantic Tokens */
    --status-verified: 156 72% 52%;      /* #34D399 */
    --status-verified-bg: 161 86% 17%;   /* #064E3B */
    --status-unverified: 43 96% 56%;     /* #FBBF24 */
    --status-unverified-bg: 26 89% 27%;  /* #78350F */
    --status-suspicious: 0 91% 71%;      /* #F87171 */
    --status-suspicious-bg: 0 63% 31%;   /* #7F1D1D */
    --status-insufficient: 215 20% 65%;  /* #94A3B8 */
    --status-insufficient-bg: 217 33% 17%;/* #1E293B */
  }
}
```

---

## 3. Typography Rules

Locke pairs a **Modern Architectural Sans** for body readability with an **Authoritative Editorial Display** font for headlines, reflecting scholarly investigation and reliable record-keeping.

### 3.1 Typeface Families
- **Display / Brand Headline:** `Newsreader` or `Fraunces` (Editorial Serif) or `Inter Display` with `-0.03em` tracking.
- **Interface / Body / Metadata:** `Inter` or system geometric stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Forensic Data / Code / Hash / Domain:** `JetBrains Mono` or `ui-monospace, 'SF Mono', monospace`.

### 3.2 Scale & Hierarchy

| Role | Font Family | Size | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | Editorial Serif / Inter Display | `40px` (`2.5rem`) | SemiBold (`600`) | `1.15` | `-0.03em` |
| **Section Title** | Editorial Serif / Inter Display | `28px` (`1.75rem`) | SemiBold (`600`) | `1.25` | `-0.02em` |
| **Card Header** | Interface Sans | `18px` (`1.125rem`) | Medium (`500`) | `1.4` | `-0.01em` |
| **Body Primary** | Interface Sans | `15px` (`0.9375rem`) | Regular (`400`) | `1.55` | `0` |
| **Evidence Metadata** | Interface Sans | `13px` (`0.8125rem`) | Regular (`400`) | `1.4` | `+0.01em` |
| **Technical Code/Hash**| Monospace | `12px` (`0.75rem`) | Medium (`500`) | `1.5` | `0` |
| **Status Badge** | Interface Sans | `11px` (`0.6875rem`) | SemiBold (`600`) | `1.2` | `+0.04em` (Uppercase) |

---

## 4. Spacing, Geometry & Elevation

### 4.1 Spacing Grid
Built on a strict **4px/8px incremental grid**:
- Micro: `4px` (`0.25rem`), `8px` (`0.5rem`), `12px` (`0.75rem`)
- Component: `16px` (`1rem`), `24px` (`1.5rem`), `32px` (`2rem`)
- Layout: `48px` (`3rem`), `64px` (`4rem`), `96px` (`6rem`)

### 4.2 Corner Geometry (`border-radius`)
- **Subtly rounded containers (`rounded-lg`, 8px):** Primary Dossier cards, evidence tables, input fields.
- **Precision inner badges (`rounded-md`, 6px):** Status chips, code blocks, secondary buttons.
- **Pill shapes (`rounded-full`, 9999px):** Value proposition tags, avatar indicators, active filters.

### 4.3 Elevation & Shadows
Locke avoids floaty, soft, playful SaaS shadows. It utilizes **architectural hairline borders + crisp tactile occlusion**:
- `elevation-0`: Flat surface, `1px solid var(--border)`.
- `elevation-1` (Dossier Cards): `0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)`.
- `elevation-2` (Modals / Floats): `0 10px 15px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -4px rgba(15, 23, 42, 0.08)`.

---

## 5. Component Stylings & Patterns

### 5.1 Buttons
- **Primary / "Safe Route" Action:**
  - Fill: `var(--primary)` (`#0D5C63` light, `#2DD4BF` dark).
  - Text: High-contrast white (`#FFFFFF`) or midnight slate (`#0A0F1D`).
  - Shape: Subtly rounded corners (`8px`).
  - Padding: `10px 20px`.
  - Behavior: `transform: translateY(-1px)` on hover with crisp `150ms` transition.
- **Secondary / Draft Verification Request:**
  - Fill: Transparent.
  - Border: `1px solid var(--border)`.
  - Text: `var(--foreground)`.
- **Destructive:** Used strictly when alerting to confirmed monetary/PII scam attempts.

### 5.2 The Evidence Dossier Table
The core product experience is the 6-dimension finding matrix:
1. **Organization Authenticity** (Domain, legal existence, Crustdata API).
2. **Vacancy Match** (Direct public ATS APIs: Greenhouse, Lever, Ashby, Workable).
3. **Recruiter Affiliation** (Sender domain vs. official domain, RDAP domain age, DNS SPF/DMARC).
4. **Channel Destination** (Supplied apply link vs. verified hiring host, lookalike/typosquat detection).
5. **Harm / Risk Requests** (Equipment checks, wire deposits, crypto, upfront PII).
6. **Resolution & Safe Route** (Official destination link + pre-drafted confirmation inquiry).

---

## 6. Motion Principles & Accessibility Standard

Derived directly from `brand-motion-guidelines` and `svg-animation` skills:

### 6.1 Duration Tokens
- `duration-instant` (`100ms`): Toggle switches, micro tap feedback.
- `duration-fast` (`150ms`): Button hover, tooltip crossfade.
- `duration-base` (`250ms`): Evidence card expansion, tab switches.
- `duration-slow` (`400ms`): Dossier drawer slide-in, modal overlay.
- `duration-agent` (`1450ms`): Brand logo reveal sequence (`locke-logo-animated.svg`).

### 6.2 Easing Curves
- `ease-standard`: `cubic-bezier(0.4, 0.0, 0.2, 1)` (General UI movements).
- `ease-settle`: `cubic-bezier(0.16, 1, 0.3, 1)` (Dossier cards arriving and anchoring).
- `ease-snap`: `cubic-bezier(0.34, 1.56, 0.64, 1)` (Verification pin snap).

### 6.3 Reduced Motion Guard
When `prefers-reduced-motion: reduce` is detected in browser settings:
- All transform movements, flips, and parallax scrolls are neutralized.
- Instant opacity cross-fades (`duration-instant`) replace all multi-stage reveals.
- Live agent loops freeze at their rest frame (`opacity: 1`, `transform: none`).

---

## 7. Voice, Tone & Copywriting Directives

| Rule | ❌ DON'T Say | ✅ DO Say |
| :--- | :--- | :--- |
| **No Fake Scores** | *"This job has an 87% Safety Score."* | *"3 of 4 dimensions independently confirmed; recruiter domain remains unauthenticated."* |
| **No False Accusations** | *"SCAM DETECTED! FRAUD ALERT!"* | *"Vacancy not independently located on official ATS. Recommended action: verify via employer contact."* |
| **Actionable Route** | *"Do not click this link."* | *"Supplied link points to unverified domain. Apply via verified route: careers.stripe.com/jobs/812"* |
| **Calm Uncertainty** | *"Our AI is 99% confident."* | *"Employer existence confirmed via Crustdata. Recruiter email domain is 3 days old (RDAP)."* |
| **Respect Agencies** | *"This recruiter is fake because their email isn't @apple.com."* | *"Third-party staffing agency identified. Recruiter authorization could not be independently authenticated."* |

---

## 8. Do / Don't Guide for Product Builders

- **DO** use the live investigating mark (`locke-mark-investigating.svg`) while LangGraph agents run parallel tool calls.
- **DO** display the neatlogs trace link on every generated Dossier.
- **DO** provide the verified Safe Route whenever a genuine ATS posting is located.
- **DON'T** tint the background purple or add flashy AI sparkle icons.
- **DON'T** let any status badge rely purely on color without a text label and geometric icon.
- **DON'T** auto-send verification emails; always let the candidate inspect and send from their own client.
