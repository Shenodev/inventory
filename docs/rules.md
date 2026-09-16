# ShenoInventory - Engineering & Design Rules

## 1. Clean Code Standards
- **Strict Typing:** TypeScript interfaces in Analog.js, strict return types in Laravel.
- **No Vibe Coding:** Write robust, production-ready code. No placeholder comments.

## 2. Design System & Branding
- **Logo & Branding:** "ShenoInventory" text paired with the "S logo" (which is also the favicon).
- **Typography:** 'Sora' for all Headings (h1-h6). 'Inter' for Body text.
- **Color Palette:** 
  - Background: Deep Slate (`#0F172A`)
  - Surfaces/Cards: (`#1E293B`)
  - Accents/Primary: Electric Cyan (`#06B6D4`)
- **UI Elements:** Use `rounded-xl` for all cards, buttons, and inputs.
- **Visuals:** STRICTLY flat design. No 3D elements, bevels, or drop shadows. Use clean negative space.

## 3. Core Business Logic Restrictions
- **No Registration:** The system is closed. Only login is permitted.
- **Reservations:** The user can *view* if a product is reserved and for which customer, but cannot reserve items directly from this dashboard.