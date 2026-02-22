import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const THEME_SCRIPT = readFileSync(
  resolve(process.cwd(), "public/assets/theme-toggle.js"),
  "utf8"
);

function createDom() {
  const dom = new JSDOM(
    `<!doctype html><html><body><button id="theme-toggle"></button></body></html>`,
    {
      url: "https://jmemo.local/",
      runScripts: "outside-only"
    }
  );

  dom.window.matchMedia = (query) => ({
    media: query,
    matches: false,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    }
  });

  return dom;
}

describe("theme toggle client script", () => {
  it("applies persisted theme from localStorage on load", () => {
    const dom = createDom();
    dom.window.localStorage.setItem("jmemo_theme", "dark");
    dom.window.document.cookie = "jmemo_theme=light; Path=/";

    dom.window.eval(THEME_SCRIPT);
    dom.window.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

    const root = dom.window.document.documentElement;
    const toggle = dom.window.document.getElementById("theme-toggle");

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.theme).toBe("dark");
    expect(toggle.textContent).toBe("Dark");
  });

  it("persists toggled theme to localStorage and cookie", () => {
    const dom = createDom();
    dom.window.localStorage.setItem("jmemo_theme", "light");

    dom.window.eval(THEME_SCRIPT);
    dom.window.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

    const root = dom.window.document.documentElement;
    const toggle = dom.window.document.getElementById("theme-toggle");
    toggle.click();

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.theme).toBe("dark");
    expect(dom.window.localStorage.getItem("jmemo_theme")).toBe("dark");
    expect(dom.window.document.cookie).toContain("jmemo_theme=dark");
  });
});
