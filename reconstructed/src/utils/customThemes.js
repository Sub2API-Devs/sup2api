/**
 * utils/customThemes.ts
 *
 * 2.1.316 新增：自定义主题
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6kfx541v.js (18)
 * attribution: placement 18
 */
import { isDeepStrictEqual } from "util";
import { join, extname, basename } from "path";
import { stat, readFile, readdir } from "fs/promises";
import { createStore } from "../state/store.js";
import { createSignal } from "./signal.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { Btr, getTheme, isValidThemeColor } from "./theme.js";
import { errorMessage, isENOENT, getErrnoCode, isFsInaccessible } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { STORAGE_SPACES, isValidKeySegment } from "./storage/storageSpaces.js";
import { serializeCalls } from "./promiseQueue.js";
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, pe } from "../../vendor/zod/v4/classic/schemas.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { createJsonStore } from "./jsonStore.js";
import { Ok } from "../../vendor/chokidar/index.js";

/**
 * 自定义主题的进程内状态：主题基底表、用户主题、插件主题、系统主题及其变化信号。
 */
//@ chunk-6kfx541v.js:1021-1771 placement
class CustomThemeRegistry {
  customThemeBases = void 0;
  userThemes = void 0;
  pluginThemes = createStore([]);
  systemTheme = void 0;
  systemThemeChanged = createSignal();
  onSystemThemeChange = this.systemThemeChanged.subscribe;
  customThemeBase(e) {
    return this.customThemeBases?.get(e);
  }
  addCustomThemeBases(e) {
    this.customThemeBases ??= new Map();
    for (let r of e) this.customThemeBases.set(r.slug, r.base);
  }
  commitUserThemes(e) {
    if (
      ((this.customThemeBases = new Map(e.map((r) => [r.slug, r.base]))),
      this.addCustomThemeBases(this.pluginThemes.getState()),
      this.userThemes === void 0 || !isDeepStrictEqual(this.userThemes, e))
    )
      this.userThemes = e;
    return this.userThemes;
  }
  cachedUserThemes() {
    return this.userThemes ?? [];
  }
  cachedSystemTheme() {
    return this.systemTheme;
  }
  setSystemTheme(e) {
    if (this.systemTheme === e) return;
    ((this.systemTheme = e), this.systemThemeChanged.emit());
  }
}
//@ chunk-6kfx541v.js:1771-1794 placement
var M = new HostScoped(() => new CustomThemeRegistry());
//@ chunk-6kfx541v.js:1794-1830 placement
function Nz() {
  return M.of(getRootSession().host);
}
//@ chunk-6kfx541v.js:1830-1855 placement
var CUSTOM = "custom:",
  D = 262144;
//@ chunk-6kfx541v.js:1855-1902 placement
function getCustomThemeBase(e) {
  return Nz().customThemeBase(e);
}
//@ chunk-6kfx541v.js:1902-1948 placement
function getCachedCustomThemes() {
  return Nz().cachedUserThemes();
}
//@ chunk-6kfx541v.js:1948-2074 placement
function getCachedCustomTheme(e) {
  let r = Nz();
  return (
    r.cachedUserThemes().find((s) => s.slug === e) ?? r.pluginThemes.getState().find((s) => s.slug === e)
  );
}
//@ chunk-6kfx541v.js:2074-2113 placement
function getThemesDir() {
  return join(getClaudeConfigDir(), "themes");
}
//@ chunk-6kfx541v.js:2113-2146 placement
function customThemeRef(e) {
  return `${CUSTOM}${e}`;
}
//@ chunk-6kfx541v.js:2146-2207 placement
function parseCustomThemeRef(e) {
  return e.startsWith(CUSTOM) ? e.slice(CUSTOM.length) : null;
}
/**
 * 解析自定义主题 JSON：基底（默认 dark）、名字与合法的颜色覆盖项。
 */
//@ chunk-6kfx541v.js:2207-2638 placement
function parseCustomTheme(e, r, s) {
  let i;
  try {
    i = jsonParse(r);
  } catch {
    logForDebugging(`[theme] ${e}.json: invalid JSON`, { level: "warn" });
    return;
  }
  if (typeof i !== "object" || i === null || Array.isArray(i)) return;
  let m = i,
    h = Btr(m.base) ? m.base : "dark",
    c = typeof m.name === "string" ? m.name : e,
    n = {};
  if (typeof m.overrides === "object" && m.overrides !== null) {
    let T = getTheme(h);
    for (let [g, y] of Object.entries(m.overrides)) if (Object.hasOwn(T, g) && isValidThemeColor(y)) n[g] = y;
  }
  return { slug: e, name: c, base: h, overrides: n, source: s };
}
/**
 * 读取单个主题文件（经存储后端或文件系统，超过 256KB 跳过）并解析。
 */
//@ chunk-6kfx541v.js:2638-3199 placement
async function readCustomThemeFile(e, r, s, i, m, h) {
  if (i && m) {
    let n;
    try {
      n = await i.read([m]);
    } catch (error) {
      if (h) h.readErrors++;
      logForDebugging(`[theme] failed to read ${e}: ${errorMessage(error)}`, { level: "warn" });
      return;
    }
    if (!n.ok) {
      if (h) h.readErrors++;
      logForDebugging(`[theme] failed to read ${e}: ${formatStorageError(n.error)}`, { level: "warn" });
      return;
    }
    let T = n.value.items[0];
    return T?.found ? parseCustomTheme(r, Buffer.from(T.value).toString("utf8"), s) : void 0;
  }
  let c;
  try {
    if ((await stat(e)).size > D) {
      logForDebugging(`[theme] ${e} exceeds 256KB; skipping`, { level: "warn" });
      return;
    }
    c = await readFile(e, "utf8");
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`[theme] failed to read ${e}`, { level: "warn" });
    return;
  }
  return parseCustomTheme(r, c, s);
}
//@ chunk-6kfx541v.js:3199-3254 placement
async function readThemesFromPathAsync(e, r, s = "") {
  return (await readThemesFromPath(e, r, s)) ?? [];
}
/**
 * 读取目录（或单个文件）中的所有 .json 主题；用户主题目录经存储后端分页列出并批量读取，失败时返回 null 保留旧主题。
 */
//@ chunk-6kfx541v.js:3254-5056 placement
async function readThemesFromPath(e, r, s, i) {
  if (i && r === "user" && e === getThemesDir()) {
    let c = { namespace: "userConfigDir", dir: "themes" },
      n = [],
      T = await readAllPages(
        (a) => i.listEntries(c, a === void 0 ? void 0 : { cursor: a }),
        (a) => {
          for (let f of a) {
            if (f.kind !== "key") continue;
            let l = f.key.namespace === "userConfigDir" ? (f.key.relPath.at(-1) ?? "") : "";
            if (extname(l) !== ".json") continue;
            if ((f.size ?? 0) > D) {
              logForDebugging(`[theme] ${join(e, l)} exceeds 256KB; skipping`, { level: "warn" });
              continue;
            }
            n.push({ slug: s + basename(l, ".json"), name: l });
          }
        },
      ).catch(
        (a) => (
          logForDebugging(
            `[theme] list themes failed: ${errorMessage(a)}; keeping the previously loaded themes (if any)`,
            { level: "warn" },
          ),
          null
        ),
      );
    if (T === null) return null;
    switch (T.status) {
      case "done":
        break;
      case "error":
        return (
          logForDebugging(
            `[theme] list themes failed: ${formatStorageError(T.error)}; keeping the previously loaded themes (if any)`,
            { level: "warn" },
          ),
          null
        );
      case "capped":
        return (
          logForDebugging(
            `[theme] list themes exceeded ${DEFAULT_MAX_PAGES} pages; keeping the previously loaded themes (if any)`,
            { level: "warn" },
          ),
          null
        );
    }
    if (n.length === 0) return [];
    let mapped = n.map((a) => STORAGE_SPACES.userConfigDir("themes", [a.name])),
      y;
    try {
      y = await i.read(mapped);
    } catch (error) {
      logForDebugging(`[theme] batched theme read failed: ${errorMessage(error)}`, { level: "warn" });
    }
    let v = [];
    if (y?.ok) {
      for (let [a, f] of y.value.items.entries()) {
        if (!f.found) continue;
        let l = parseCustomTheme(n[a].slug, Buffer.from(f.value).toString("utf8"), r);
        if (l) v.push(l);
      }
      return v;
    }
    let E = { readErrors: 0 };
    for (let [a, f] of n.entries()) {
      let l = await readCustomThemeFile(join(e, f.name), f.slug, r, i, mapped[a], E);
      if (l) v.push(l);
    }
    if (v.length === 0 && E.readErrors > 0)
      return (
        logForDebugging(
          `[theme] could not read any of ${n.length} listed theme files; keeping the previously loaded themes (if any)`,
          { level: "warn" },
        ),
        null
      );
    return v;
  }
  let m;
  try {
    m = await readdir(e);
  } catch (error) {
    if (getErrnoCode(error) === "ENOTDIR") {
      let n = await readCustomThemeFile(e, s + basename(e, ".json"), r);
      return n ? [n] : [];
    }
    if (!isFsInaccessible(error)) logForDebugging(`[theme] readdir ${e} failed`, { level: "warn" });
    return [];
  }
  let h = [];
  for (let c of m) {
    if (extname(c) !== ".json") continue;
    let n = await readCustomThemeFile(join(e, c), s + basename(c, ".json"), r);
    if (n) h.push(n);
  }
  return h;
}
//@ chunk-6kfx541v.js:5056-5285 placement
var loadCustomThemes = serializeCalls(async (e) => {
    let r = Nz(),
      s = isCustomizationDisabled("themes")
        ? []
        : ((await readThemesFromPath(getThemesDir(), "user", "", e)) ?? r.cachedUserThemes());
    return (s.sort((i, m) => i.name.localeCompare(m.name)), r.commitUserThemes(s));
  }),
  K = DoctorLazy(() => u({ name: o(), base: o(), overrides: pe(o(), o()) }));
//@ chunk-6kfx541v.js:5285-5803 placement
async function saveCustomTheme(e, r) {
  let s = { name: e.name, base: e.base, overrides: e.overrides },
    i = `${e.slug}.json`;
  if (isStorageV5Enabled() && r !== void 0 && isValidKeySegment(i)) {
    let m =
        jsonStringify(s, null, 2) +
        `
`,
      write = await r.write(STORAGE_SPACES.userConfigDir("themes", [i]), m, {
        publishDiscipline: "atomic",
        mode: 438 & ~process.umask(),
      });
    if (!write.ok)
      throw (
        logForDebugging(`[theme] v5 save ${e.slug} failed: ${formatStorageError(write.error)}`, {
          level: "warn",
        }),
        Error("theme save failed")
      );
    return;
  }
  await createJsonStore(join(getThemesDir(), `${e.slug}.json`), K, {
    defaultValue: () => ({ name: e.slug, base: "dark", overrides: {} }),
    ensureDir: !0,
    indent: 2,
    trailingNewline: !0,
  }).write(s);
}
//@ chunk-6kfx541v.js:5803-5901 placement
function slugify(e) {
  return (
    e
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "theme"
  );
}
/**
 * 监听主题目录（depth 0）的增删改。旧版名 startWatching 来自 fileChangedWatcher，此处实为主题文件监听。
 */
//@ chunk-6kfx541v.js:5901-6238 placement = startWatching (0.732)
function watchCustomThemes(paths) {
  if (isCustomizationDisabled("themes")) return () => {};
  let watch = Ok.watch(getThemesDir(), {
    persistent: !0,
    ignoreInitial: !0,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignorePermissionErrors: !0,
  });
  return (
    watch.on("add", paths),
    watch.on("change", paths),
    watch.on("unlink", paths),
    watch.on("error", (s) => logForDebugging(`[theme] watcher error: ${errorMessage(s)}`, { level: "warn" })),
    () => void watch.close()
  );
}

export {
  readThemesFromPathAsync,
  Nz,
  parseCustomThemeRef,
  getCustomThemeBase,
  getCachedCustomTheme,
  saveCustomTheme,
  customThemeRef,
  getThemesDir,
  slugify,
  loadCustomThemes,
  getCachedCustomThemes,
  watchCustomThemes,
};
