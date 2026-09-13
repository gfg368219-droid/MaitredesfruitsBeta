---
name: WebGL preview fallback
description: Why the game keeps a playable fallback when the browser cannot create a WebGL context.
---

Some workspace browser previews do not expose a usable WebGL context even though the app can run with WebGL on a normal browser. Three.js will throw during renderer creation before an in-Canvas fallback can help.

**Why:** Mounting `<Canvas>` unconditionally caused the Vite runtime error overlay and made the game look broken in preview.

**How to apply:** Detect WebGL support before mounting `<Canvas>`. Keep a lightweight DOM/CSS world with the same player and enemy interactions for unsupported previews; the WebGL scene remains the primary experience on capable devices.