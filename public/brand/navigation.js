// Generated from checked TypeScript; edit the corresponding .ts/.mts source. MIT.
"use strict";
// MIT. App-owned saved reader theme; common launcher remains separately maintained.
(() => {
    const theme = document.querySelector("#reader-theme");
    if (!theme)
        return;
    const app = document.documentElement.dataset.app;
    const key = app + ":reader-theme";
    function themeLabel() {
        if (!theme)
            return;
        const control = theme;
        const dark = document.documentElement.dataset.theme !== "light";
        control.setAttribute("aria-label", "Dark theme");
        control.setAttribute("aria-pressed", String(dark));
        control.title = dark ? "Switch to light theme" : "Switch to dark theme";
    }
    try {
        const saved = localStorage.getItem(key);
        if (saved === "light" || saved === "dark")
            document.documentElement.dataset.theme = saved;
    }
    catch { }
    themeLabel();
    theme.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem(key, next);
        }
        catch { }
        themeLabel();
    });
})();
