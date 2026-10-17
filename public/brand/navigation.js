// App-owned theme/gallery behaviour. Common launcher: /brand/launcher.js.
const theme = document.querySelector("#reader-theme");
const app = document.documentElement.dataset.app;
const key = app + ":reader-theme";
function themeLabel() {
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
} catch {}
themeLabel();
theme.addEventListener("click", () => {
  const next =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(key, next);
  } catch {}
  themeLabel();
});
