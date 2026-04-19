# 🛡️ FlexChat Design System (Stealth & Premium Theme)

This document contains the complete color palette, typography, and Tailwind CSS configuration for the E2EE secure chat application, FlexChat.

## 🎨 1. Color Palette

### Brand Colors (ব্র্যান্ড কালার)

| Element           | Hex Code  | Tailwind Class  | Usage                                         |
| :---------------- | :-------- | :-------------- | :-------------------------------------------- |
| **Primary**       | `#6366F1` | `bg-indigo-500` | Main theme color, Send buttons, Active icons. |
| **Primary Hover** | `#4F46E5` | `bg-indigo-600` | Button hover states.                          |
| **Secondary**     | `#8B5CF6` | `bg-violet-500` | Highlights, gradients, special features.      |

### Backgrounds (ব্যাকগ্রাউন্ড - Dark Theme)

| Element               | Hex Code  | Tailwind Class | Usage                                     |
| :-------------------- | :-------- | :------------- | :---------------------------------------- |
| **App Background**    | `#0F172A` | `bg-slate-900` | Main application background (Deep Slate). |
| **Surface/Container** | `#1E293B` | `bg-slate-800` | Header, Sidebar, Chat list container.     |
| **Input/Divider**     | `#334155` | `bg-slate-700` | Message input box, borders, dividers.     |

### Chat Bubbles (মেসেজ বাবল)

| Element              | Hex Code  | Tailwind Class  | Text Color           |
| :------------------- | :-------- | :-------------- | :------------------- |
| **Sent Message**     | `#6366F1` | `bg-indigo-500` | `#FFFFFF` (White)    |
| **Received Message** | `#334155` | `bg-slate-700`  | `#F8FAFC` (Slate 50) |

### Status & Feedback (স্ট্যাটাস কালার)

| Element            | Hex Code  | Tailwind Class     | Usage                                          |
| :----------------- | :-------- | :----------------- | :--------------------------------------------- |
| **Success/Online** | `#10B981` | `text-emerald-500` | Online indicator, Read receipts (Double tick). |
| **Error/Danger**   | `#EF4444` | `text-red-500`     | Block user, Delete message.                    |
| **Offline/Muted**  | `#64748B` | `text-slate-500`   | Offline status, muted chats.                   |

---

## 🔤 2. Typography (টাইপোগ্রাফি)

- **Primary Font:** `Inter`, sans-serif
- **Alternative Font:** `Roboto Mono`, monospace (Only for showing encryption keys or code)

### Text Colors

| Element            | Hex Code  | Tailwind Class   | Usage                                          |
| :----------------- | :-------- | :--------------- | :--------------------------------------------- |
| **Primary Text**   | `#F8FAFC` | `text-slate-50`  | Main headings, Chat messages, User names.      |
| **Secondary Text** | `#94A3B8` | `text-slate-400` | Timestamps, 'Typing...', Last message preview. |

---

## ⚙️ 3. Tailwind CSS Configuration (`tailwind.config.js`)

Copy and paste this into your `tailwind.config.js` file to use custom classes easily:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#6366F1", // Indigo
          hover: "#4F46E5", // Darker Indigo
          secondary: "#8B5CF6", // Violet
        },
        stealth: {
          bg: "#0F172A", // Slate 900
          surface: "#1E293B", // Slate 800
          input: "#334155", // Slate 700
          divider: "#334155", // Slate 700
        },
        chat: {
          sent: "#6366F1", // Indigo 500
          received: "#334155", // Slate 700
        },
        status: {
          online: "#10B981", // Emerald 500
          error: "#EF4444", // Red 500
        },
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```
