const THEME_KEY = "jmemo_theme";
const root = document.documentElement;

function parseThemeFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)jmemo_theme=(light|dark)(?:;|$)/);
  return match?.[1] ?? null;
}

function detectSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme, persist = true) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  root.classList.toggle("dark", nextTheme === "dark");
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  if (persist) {
    localStorage.setItem(THEME_KEY, nextTheme);
    document.cookie = `${THEME_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.dataset.theme = nextTheme;
    const iconEl = toggle.querySelector(".theme-icon");
    if (iconEl) {
      iconEl.textContent = nextTheme === "dark" ? "☀️" : "🌙";
    }
    const textNode = toggle.lastChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      textNode.textContent = nextTheme === "dark" ? "Light" : "Dark";
    }
    toggle.setAttribute("aria-label", nextTheme === "dark" ? "다크 모드 사용 중" : "라이트 모드 사용 중");
  }
}

function resolveInitialTheme() {
  return (
    localStorage.getItem(THEME_KEY) ||
    parseThemeFromCookie() ||
    detectSystemTheme()
  );
}

setTheme(resolveInitialTheme(), false);

window.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const current = root.classList.contains("dark") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next, true);
  });
});
