# BKR CAD — Design System

> نظام تصميم موحد لمنصة BKR CAD — Dental CAD Design Centers  
> Angular 20 + Tailwind CSS 3.4 | RTL-first | Light Mode

---

## 1. تحليل مشاكل التصميم السابق

| المشكلة | التأثير | الحل المطبّق |
|---------|---------|--------------|
| **نظامان لونيان منفصلان** — الصفحة الرئيسية (Teal `#14B8A6`) vs البوابات (Blue `#2D8DB3`) | تشتت الهوية البصرية | توحيد الألوان على gradient الشعار |
| **916 سطر CSS منفصل** للصفحة الرئيسية | صعوبة الصيانة وتكرار الأنماط | تحويل Home Page إلى Tailwind + Design System |
| **خطوط مختلفة** (Tajawal/Cairo vs IBM Plex) | عدم اتساق Typography | IBM Plex Sans Arabic + Almarai + Inter |
| **مكونات UI غير مستخدمة** | تكرار markup في كل صفحة | توسيع Button/Card/Badge/Input + utility classes |
| **3 أنماط Sidebar مختلفة** | تجربة غير موحدة | توحيد tokens + classes مشتركة |
| **RTL جزئي** | مشاكل في LTR toggle | `index.html` + TranslationService init + logical properties |
| **ألوان semantic عشوائية** | `green-50`, `amber-50` بدون نظام | tokens: success/warning/error/info |

---

## 2. لوحة الألوان (Color Palette)

### Brand Colors — مستمدة من شعار BKR CAD

| Token | HEX | الاستخدام | Tailwind Class |
|-------|-----|-----------|----------------|
| **Primary** | `#2D8DB3` | أزرار رئيسية، روابط، عناصر تفاعلية | `bg-primary`, `text-primary` |
| **Primary Dark** | `#234E7A` | Hover states، عناوين | `bg-primary-dark` |
| **Primary Light** | `#4AAED6` | Highlights، gradients | `bg-primary-light` |
| **Secondary (Navy)** | `#1E2A6D` | Sidebar، headers، footer | `bg-secondary` |
| **Accent (Cyan)** | `#48CAE4` | CTAs ثانوية، badges، icons | `bg-accent`, `text-accent` |

### Brand Gradient
```css
linear-gradient(135deg, #1E2A6D 0%, #2D8DB3 55%, #4AAED6 100%)
```
**Class:** `brand-gradient` | `bg-brand-gradient`

### Semantic Colors

| Token | HEX | Light BG | Tailwind |
|-------|-----|----------|----------|
| **Success** | `#10B981` | `#D1FAE5` | `text-success`, `bg-success-light` |
| **Warning** | `#F59E0B` | `#FEF3C7` | `text-warning`, `bg-warning-light` |
| **Error** | `#EF4444` | `#FEE2E2` | `text-error`, `bg-error-light` |
| **Info** | `#3B82F6` | `#DBEAFE` | `text-info`, `bg-info-light` |

### Surface & Background

| Token | HEX | Class |
|-------|-----|-------|
| Background | `#F5F7FA` | `bg-background` |
| Background Subtle | `#EEF1F6` | `bg-background-subtle` |
| Surface | `#FFFFFF` | `bg-surface` |
| Border | `#E2E8F0` | `border-border` |
| Text Primary | `#1A1A2E` | `text-text-primary` |
| Text Secondary | `#64748B` | `text-text-secondary` |
| Text Muted | `#94A3B8` | `text-text-muted` |
| Navy Deep (Dark sections) | `#0A1B2A` | `bg-navy-deep` |

### Primary Scale (50–900)
```
50: #EBF6FA  |  100: #D6EDF5  |  200: #ADD9EB  |  300: #7EC4E0
400: #4AAED6  |  500: #2D8DB3  |  600: #247A9C  |  700: #1C6684
800: #155268  |  900: #0E3E4D
```

---

## 3. Typography

### Font Families

| اللغة | الخط | Fallback |
|-------|------|----------|
| **Arabic (Primary)** | IBM Plex Sans Arabic | Almarai, Cairo |
| **English** | Inter | Manrope, Segoe UI |

```html
<!-- Applied globally -->
<body class="font-sans">
<h1 class="font-display">
```

### Heading Scale

| Level | Size | Line Height | Weight | Class |
|-------|------|-------------|--------|-------|
| H1 | 3.75rem (60px) | 1.1 | 700 | `text-6xl font-bold` |
| H2 | 2.25rem (36px) | 2.75rem | 700 | `text-4xl font-bold` |
| H3 | 1.875rem (30px) | 2.5rem | 700 | `text-3xl font-bold` |
| H4 | 1.5rem (24px) | 2.25rem | 600 | `text-2xl font-semibold` |
| H5 | 1.25rem (20px) | 2rem | 600 | `text-xl font-semibold` |
| H6 | 1.125rem (18px) | 1.875rem | 600 | `text-lg font-semibold` |

### Body Text Scale

| Size | Class | Line Height | Use |
|------|-------|-------------|-----|
| xs | `text-xs` | 1.25rem | Labels, badges |
| sm | `text-sm` | 1.5rem | Secondary text, table cells |
| base | `text-base` | 1.75rem | Body paragraphs |
| lg | `text-lg` | 1.875rem | Lead paragraphs |

### Letter Spacing
- Headings: `-0.02em` to `-0.035em` (built into fontSize config)
- Eyebrow/Labels: `tracking-widest` (0.1em)
- Body: default

---

## 4. نظام الأزرار (Button System)

### Variants

| Variant | Class | Use Case |
|---------|-------|----------|
| **Primary** | `btn-primary btn-md` | الإجراء الرئيسي (حفظ، إرسال، إنشاء) |
| **Secondary** | `btn-secondary btn-md` | إجراءات ثانوية مهمة |
| **Outline** | `btn-outline btn-md` | خيارات أقل أهمية |
| **Ghost** | `btn-ghost btn-md` | روابط شكل زر |
| **Danger** | `btn-danger btn-md` | حذف، رفض |
| **Icon** | `btn-icon` | أيقونات سريعة |

### Sizes

| Size | Class | Padding | Font |
|------|-------|---------|------|
| sm | `btn-sm` | 14px × 6px | 12px |
| md | `btn-md` | 20px × 10px | 14px |
| lg | `btn-lg` | 28px × 14px | 16px |
| xl | `btn-xl` | 32px × 16px | 18px |

### States

```html
<!-- Default -->
<button class="btn-primary btn-md">حفظ</button>

<!-- Hover: bg-primary-dark + shadow-primary-sm -->
<!-- Active: scale-[0.98] -->
<!-- Disabled: opacity-50 pointer-events-none -->
<!-- Loading: spinner + disabled -->
```

### Angular Component
```html
<app-button variant="primary" size="lg" [isLoading]="saving()">
  حفظ الطلب
</app-button>
```

**Border Radius:** `rounded-xl` (0.75rem)

---

## 5. نظام البطاقات (Card System)

| Variant | Class | Use |
|---------|-------|-----|
| Default | `card p-6` | محتوى عام |
| Interactive | `card-interactive p-6` | بطاقات قابلة للنقر (طلبات، مصممين) |
| Stat | `card-stat p-5` | إحصائيات Dashboard |
| Glass | `card-glass p-8` | Hero overlays |

### Angular Component
```html
<app-card variant="interactive" title="طلب #1234" eyebrow="جديد">
  ...
</app-card>
```

**Shadows:** `shadow-card` → `shadow-card-hover` on hover  
**Border Radius:** `rounded-2xl` (1.25rem)

---

## 6. Badges & Status

```html
<span class="badge-success">مكتمل</span>
<span class="badge-warning">قيد المراجعة</span>
<span class="badge-error">مرفوض</span>
<span class="badge-primary">نشط</span>
<span class="badge-neutral">مسودة</span>
```

```html
<app-badge type="success" [dot]="true">مكتمل</app-badge>
```

---

## 7. Forms

```html
<label class="input-label">البريد الإلكتروني</label>
<input class="input-field" placeholder="example@clinic.com" />
<span class="input-error">حقل مطلوب</span>
```

```html
<app-input label="البريد" icon="bi bi-envelope" [error]="emailError()" />
```

**Focus:** `border-primary ring-2 ring-primary/20`  
**Error:** `border-error ring-error/20`

---

## 8. Layout Utilities

```html
<div class="section-container">  <!-- max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -->
<h2 class="section-heading">     <!-- text-3xl sm:text-4xl font-bold -->
<p class="section-subheading">   <!-- text-lg text-text-secondary -->
<span class="eyebrow">           <!-- badge-style section label -->
```

---

## 9. Spacing System

| Token | Value | Use |
|-------|-------|-----|
| Section padding | `py-20 lg:py-28` | بين الأقسام |
| Card padding | `p-5` / `p-6` / `p-8` | داخل البطاقات |
| Grid gap | `gap-6 lg:gap-8` | بين العناصر |
| Stack gap | `space-y-4` | عناصر عمودية |

---

## 10. Shadows

| Token | Value | Class |
|-------|-------|-------|
| xs | subtle | `shadow-xs` |
| Card | `0 4px 24px rgba(15,23,42,0.06)` | `shadow-card` |
| Card Hover | `0 8px 32px rgba(15,23,42,0.10)` | `shadow-card-hover` |
| Primary | `0 8px 24px rgba(45,141,179,0.28)` | `shadow-primary` |
| Elevated | `0 12px 40px rgba(15,23,42,0.12)` | `shadow-elevated` |

---

## 11. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| sm | 6px | Badges inner |
| DEFAULT | 8px | Inputs small |
| lg | 12px | Buttons |
| xl | 16px | Buttons (primary) |
| 2xl | 20px | Cards |
| 3xl | 24px | CTA sections |
| full | 999px | Pills, avatars |

---

## 12. Home Page Structure

```
┌─────────────────────────────────────┐
│  Header (Logo + Login + Register)   │
├─────────────────────────────────────┤
│  HERO (Gradient + Stats + Visual)   │
├─────────────────────────────────────┤
│  FEATURES (3 role cards)            │
├─────────────────────────────────────┤
│  WORKFLOW (5 steps)                 │
├─────────────────────────────────────┤
│  VALUE PROPS (Why BKR CAD)          │
├─────────────────────────────────────┤
│  TESTIMONIALS (3 quotes)            │
├─────────────────────────────────────┤
│  CTA (Register banner)              │
├─────────────────────────────────────┤
│  FOOTER (4 columns)                 │
└─────────────────────────────────────┘
```

---

## 13. Best Practices — Medical SaaS

1. **Trust-first design** — ألوان هادئة، تباين عالٍ، لا ألوان صارخة
2. **Clear hierarchy** — eyebrow → heading → description → CTA
3. **Status clarity** — badges ملونة لكل حالة طلب
4. **Minimal cognitive load** — مسافات سخية، لا ازدحام
5. **RTL-native** — logical properties (`start`/`end`/`ms`/`me`)
6. **Accessible contrast** — WCAG AA minimum (4.5:1 for text)
7. **Consistent card patterns** — نفس shadow/radius/padding everywhere
8. **Progressive disclosure** — تفاصيل الطلب في drawers/modals
9. **Empty states** — `.empty-state` مع icon + message + CTA
10. **Loading skeletons** — `.skeleton` بدلاً من spinners للقوائم

---

## 14. File Reference

| File | Purpose |
|------|---------|
| `tailwind.config.js` | Design tokens (colors, fonts, shadows, animations) |
| `src/styles.scss` | Global utilities (btn-*, card-*, badge-*, input-*) |
| `src/app/shared/ui/` | Angular UI components |
| `src/app/features/home/` | Redesigned landing page |
| `src/index.html` | `lang="ar" dir="rtl"` |

---

## 15. Migration Guide

### Replace inline card markup:
```html
<!-- Before -->
<div class="bg-surface rounded-2xl border border-border p-5 shadow-card">

<!-- After -->
<div class="card p-5">
```

### Replace inline buttons:
```html
<!-- Before -->
<button class="bg-primary text-white px-5 py-2.5 rounded-xl ...">

<!-- After -->
<button class="btn-primary btn-md">
```

### Use semantic badge colors:
```html
<!-- Before -->
<span class="bg-green-50 text-green-700 ...">

<!-- After -->
<span class="badge-success">
```
