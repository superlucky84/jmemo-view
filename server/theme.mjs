export const THEME_COOKIE_KEY = "jmemo_theme";

function parseCookieHeader(rawCookie = "") {
  return String(rawCookie)
    .split(";")
    .map((token) => token.trim())
    .filter(Boolean)
    .reduce((acc, token) => {
      const idx = token.indexOf("=");
      if (idx === -1) {
        return acc;
      }

      const key = decodeURIComponent(token.slice(0, idx).trim());
      const value = decodeURIComponent(token.slice(idx + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

export function resolveRequestTheme(req) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  const cookieTheme = cookies[THEME_COOKIE_KEY];

  if (cookieTheme === "dark" || cookieTheme === "light") {
    return cookieTheme;
  }

  const clientHint = String(req?.headers?.["sec-ch-prefers-color-scheme"] ?? "").toLowerCase();
  if (clientHint.includes("dark")) {
    return "dark";
  }

  return "light";
}

export function getThemeBootstrapScript() {
  return `(function(){try{var k="${THEME_COOKIE_KEY}";var m=document.cookie.match(/(?:^|;\\\\s*)${THEME_COOKIE_KEY}=(light|dark)(?:;|$)/);var c=m&&m[1];var s=localStorage.getItem(k);var p=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=s||c||p||"light";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.dataset.theme=t;r.style.colorScheme=t;}catch(_){}})();`;
}
