# Locke — Logo Motion Guidelines & Implementation Spec

**Asset:** `public/brand/locke-logo-animated.svg` (Hero Reveal)  
**Live UI Variant:** `public/brand/locke-mark-investigating.svg` (Live-Agent Ambient Loop)  
**Standard:** WCAG 2.2 Level AA / prefers-reduced-motion Compliant  
**Duration:** 1.45s (Target ≤ 1.6s budget strictly respected)  

---

## 1. Motion Philosophy: "Forensic Precision & Damped Settle"

The motion of the Locke identity must reflect the character of John Locke's empiricism and the reassurance of an analytical investigator. 

- **Calm, deliberate entrances:** Objects enter with purpose and settle with zero springy or rubbery oscillations.
- **Transform & Opacity Only:** We never distort, skew, squash, or stretch the brand geometry.
- **The Caliper Snap:** The visual climax is the seating of the shackle into the base and the micro-snap of the forensic aperture pin.

---

## 2. Animation Choreography & Timeline Budget

Total reveal duration is **1,450ms** (well within the hackathon ≤1.6s performance budget).

```
0.00s               0.35s               0.70s               1.00s               1.45s
  ├───────────────────┼───────────────────┼───────────────────┼───────────────────┤
  [1. Base Shelf]
  y: +12px → 0px (600ms)
                      [2. Shackle Arc]
                      y: -20px → 0px, scale 0.96 → 1 (650ms)
                                          [3. Focal Pin]
                                          scale: 0.2 → 1 (450ms)
                                                              [4. Wordmark]
                                                              x: +10px → 0px (600ms)
```

| Element | Selector / Piece | Start | Duration | Easing | Properties | Narrative Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Foundation Shelf** | `.anim-base` | `0.10s` | `600ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `translateY(12px) → 0`, `opacity: 0 → 1` | Establishing the unyielding empirical baseline |
| **Shackle Arc** | `.anim-shackle` | `0.35s` | `650ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `translateY(-20px) → 0`, `scale(0.96) → 1` | Caliper arm descending to lock onto evidence |
| **Forensic Pin** | `.anim-pin` | `0.70s` | `450ms` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `scale(0.2) → 1`, `opacity: 0 → 1` | Focus locked: the decisive evidence point |
| **Wordmark** | `.anim-wordmark` | `0.85s` | `600ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `translateX(10px) → 0`, `opacity: 0 → 1` | Typographic authority emerges once mark is anchored |

---

## 3. Investigating Agent Idle Loop (`locke-mark-investigating.svg`)

When the multi-agent graph (LangGraph) is actively fanning out parallel queries across Crustdata, ATS APIs (Greenhouse, Ashby, Lever), RDAP, and DNS-over-HTTPS:

1. **Cycle Duration:** 2,400ms seamless sine loop (`cubic-bezier(0.45, 0.05, 0.55, 0.95)`).
2. **Aperture Radar Pulse:** The central pin scales subtly between `1.0×` and `1.35×`, with opacity undulating from `0.85` to `1.0`.
3. **Shackle Calibration:** Shackle translates gently up by `-4px` and returns to baseline, communicating active measurement without frantic spinning.
4. **Zero Layout Thrashing:** Pure GPU compositor transforms.

---

## 4. GSAP / React / Framer Motion Code Ready Snippet

For developers consuming the raw elements via React or GSAP:

```typescript
import { useEffect, useRef } from "react";
import gsap from "gsap";

export function LockeLogoHeroReveal() {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Respect user accessibility preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".anim-base", { opacity: 0, y: 12, duration: 0.6 }, 0.1)
        .from(".anim-shackle", { opacity: 0, y: -20, scale: 0.96, duration: 0.65 }, 0.35)
        .from(".anim-pin", { opacity: 0, scale: 0.2, transformOrigin: "144px 116px", duration: 0.45, ease: "back.out(1.5)" }, 0.7)
        .from(".anim-wordmark", { opacity: 0, x: 10, duration: 0.6 }, 0.85);
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return <svg ref={rootRef} /* SVG Elements */ />;
}
```

---

## 5. Accessibility & Performance Guardrails

- **WCAG 2.2 Criterion 2.3.3 (Animation from Interactions):**  
  Wrapped with `@media (prefers-reduced-motion: reduce)`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .anim-base, .anim-shackle, .anim-pin, .anim-wordmark,
    .investigating-pulse, .investigating-float {
      opacity: 1 !important;
      transform: none !important;
      animation: none !important;
    }
  }
  ```
- **Paint Optimization:** No layout-triggering properties (`width`, `height`, `margin`, `top`, `left`) are animated. Only `transform` and `opacity`.
- **Zero Flashing:** Flash frequency is 0 Hz (far below the 3 flashes/second seizure threshold).
