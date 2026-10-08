# JACK — Minimalist Brutalist Portfolio (Framer 1:1 Duplicate)

A 100% accurate, pixel-perfect clone of **[Jack Template](https://jack-template.framer.website/)** built with **React**, **TypeScript**, and **Tailwind CSS v4**.

---

## ⚡ Features & Accuracy Highlights

- **Exact Typography & Presets**:
  - Font: **Inter** with all font weights (400, 500, 700, 900)
  - Letter Spacing: Tight signature `-0.06em` across all titles, body, and labels
  - All-caps uppercase styling matching the Framer original
  - Responsive Hero Title: `clamp(3rem, 9.8vw, 8.75rem)` (up to `140px`)
  - Project Titles: `32px` bold uppercase
  - Labels & Body: `14px` uppercase
- **Signature Animations & Effects**:
  - **Framer Magnetic Rolling Text Pill**: Links roll vertically from top black text to bottom white text while the black background bar animates up from the bottom.
  - **Parallax Fixed Hero**: The Hero title stays fixed at `z-0` on desktop, while the Works section cards smoothly scroll over it like a curtain.
  - **Staggered Hero Letter Reveal**: Each character in the hero title animates up into view with staggered easing.
  - **Sticky Stacking Project Cards**: Project cards stack as you scroll through the Works section with soft multi-stop elevation shadows.
  - **Hover Image Zoom**: Smooth scale transition on hover over project cards.
- **Skeleton & Wireframe Mode (As Requested)**:
  - Enabled by default so the layout is preserved with placeholder frames and shimmer loaders.
  - Interactive toggle dock in the bottom-right corner to toggle between **Skeleton Mode** and **Live Preview Mode**.

---

## 📝 How to Insert Your Personal Information

All information is cleanly separated into:
📁 **[`src/data/portfolioData.ts`](file:///d:/barako/src/data/portfolioData.ts)**

Simply open that file and edit:
1. `fullName`: Your name
2. `role`: Your title / specialty (e.g. `Digital Designer`, `Full-Stack Developer`)
3. `year`: e.g. `Portfolio 2026`
4. `projects`: Your projects, categories, and image URLs
5. `about`: Your intro philosophy and paragraphs
6. `services`: Your service offerings
7. `experience`: Your employment history and roles
8. `socials` & `contacts`: Your email, phone, and social links

---

## 🚀 Running the Project

```bash
# Start local development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Server is currently running at: **`http://localhost:5173/`**
