# Readify Color Scheme & Design System

This application follows a modern, high-contrast design system inspired by professional developer tools (like React Flow). The theme prioritizes clarity, readability, and a striking visual identity.

## Core Palette

### 1. Minimalist Foundation
*   **Backgrounds**: The application uses a pure **White (`#FFFFFF`)** canvas. This ensures maximum contrast and a clean, spacious feel.
*   **Surfaces**: Cards and sidebars blend seamlessly with the white background, often distinguished only by subtle borders or shadows rather than heavy background colors.

### 2. Typography
*   **Primary Text**: Deep **Black (`#111111`)** is used for headings and primary content to ensure crisp readability.
*   **Secondary Text**: Medium **Grey (`#666666`)** is used for supporting text, metadata, and descriptions to reduce visual noise.

### 3. Accent Color
*   **Primary Accent**: **Pink (`#FF0073`)** is the signature brand color.
*   **Usage**: It is reserved for high-impact interactions:
    *   Primary buttons (background).
    *   Active states (links, icons).
    *   Hover effects (borders, text highlights).
    *   Selected navigation items (with a subtle tint).

## Visual Effects

### Glassmorphism
We utilize a refined "professional" glassmorphism effect for floating elements like the Header and Toolbar:
*   **Blur**: High-strength blur (`backdrop-filter: blur(16px)`).
*   **Transparency**: High-opacity white tint (`rgba(255, 255, 255, 0.85)`).
*   **Result**: Elements feel grounded and substantial while maintaining context with the content scrolling beneath them. Unlike "frosted glass" effects that can look muddy, this implementation stays bright and clean.

### Shadows & Depth
*   **Shadows**: Replaced distinct colored shadows with soft, neutral grey blurs (`rgba(0, 0, 0, 0.08)`) to add depth without introducing dirty tones.
*   **Borders**: Ultra-light borders (`rgba(0, 0, 0, 0.06)`) define structure without cluttering the UI.
