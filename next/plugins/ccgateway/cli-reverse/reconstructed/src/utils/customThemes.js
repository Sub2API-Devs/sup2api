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
import { isBuiltinThemeName, getTheme, isValidThemeColor } from "./theme.js";
import { errorMessage, isENOENT, getErrnoCode, isFsInaccessible } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { STORAGE_SPACES, isValidKeySegment } from "./storage/storageSpaces.js";
import { serializeCalls } from "./promiseQueue.js";
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, record } from "../../vendor/zod/v4/classic/schemas.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { createJsonStore } from "./jsonStore.js";
import { chokidar_default } from "../../vendor/chokidar/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6kfx541v.js:1021-1771 placement
/**
 * 自定义主题的进程内状态：主题基底表、用户主题、插件主题、系统主题及其变化信号。
 */
class CustomThemeRegistry {
  customThemeBases = undefined;
  userThemes = undefined;
  pluginThemes = createStore([]);
  systemTheme = undefined;
  systemThemeChanged = createSignal();
  onSystemThemeChange = this.systemThemeChanged.subscribe;
  customThemeBase(slug) {
    return this.customThemeBases?.get(slug);
  }
  addCustomThemeBases(themeBases) {
    this.customThemeBases ??= new Map();
    for (let themeBase of themeBases) this.customThemeBases.set(themeBase.slug, themeBase.base);
  }
  commitUserThemes(themes) {
    this.customThemeBases = new Map(themes.map((theme) => [theme.slug, theme.base]));
    this.addCustomThemeBases(this.pluginThemes.getState());
    if (this.userThemes === undefined || !isDeepStrictEqual(this.userThemes, themes))
      this.userThemes = themes;
    return this.userThemes;
  }
  cachedUserThemes() {
    return this.userThemes ?? [];
  }
  cachedSystemTheme() {
    return this.systemTheme;
  }
  setSystemTheme(theme) {
    if (this.systemTheme === theme) return;
    this.systemTheme = theme;
    this.systemThemeChanged.emit();
  }
}
//@ chunk-6kfx541v.js:1771-1794 placement
/**
 * 按宿主隔离的自定义主题注册表。
 */
var customThemeRegistryByHost; // deferred: uses CustomThemeRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6kfx541v.js:1771", () => {
  customThemeRegistryByHost = new HostScoped(() => new CustomThemeRegistry());
});
//@ chunk-6kfx541v.js:1794-1830 placement
/**
 * 取出当前宿主的自定义主题注册表。
 */
function getCustomThemeRegistry() {
  return customThemeRegistryByHost.of(getRootSession().host);
}
//@ chunk-6kfx541v.js:1830-1855 placement
/**
 * 自定义主题文件的大小上限（256 KiB）。
 */
var CUSTOM = "custom:";
var MAX_CUSTOM_THEME_BYTES = 262144;
//@ chunk-6kfx541v.js:1855-1902 placement
function getCustomThemeBase(customThemeRef) {
  return getCustomThemeRegistry().customThemeBase(customThemeRef);
}
//@ chunk-6kfx541v.js:1902-1948 placement
function getCachedCustomThemes() {
  return getCustomThemeRegistry().cachedUserThemes();
}
//@ chunk-6kfx541v.js:1948-2074 placement
function getCachedCustomTheme(customThemeRef) {
  let customThemeRegistry = getCustomThemeRegistry();
  return (
    customThemeRegistry.cachedUserThemes().find((theme) => theme.slug === customThemeRef) ??
    customThemeRegistry.pluginThemes.getState().find((theme) => theme.slug === customThemeRef)
  );
}
//@ chunk-6kfx541v.js:2074-2113 placement
function getThemesDir() {
  return join(getClaudeConfigDir(), "themes");
}
//@ chunk-6kfx541v.js:2113-2146 placement
function customThemeRef(slug) {
  return `${CUSTOM}${slug}`;
}
//@ chunk-6kfx541v.js:2146-2207 placement
function parseCustomThemeRef(themeRef) {
  return themeRef.startsWith(CUSTOM) ? themeRef.slice(CUSTOM.length) : null;
}
//@ chunk-6kfx541v.js:2207-2638 placement
/**
 * 解析自定义主题 JSON：基底（默认 dark）、名字与合法的颜色覆盖项。
 */
function parseCustomTheme(slug, text, source) {
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    logForDebugging(`[theme] ${slug}.json: invalid JSON`, {
      level: "warn",
    });
    return;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return;
  let data = parsed;
  let base = isBuiltinThemeName(data.base) ? data.base : "dark";
  let name = typeof data.name === "string" ? data.name : slug;
  let overrides = {};
  if (typeof data.overrides === "object" && data.overrides !== null) {
    let theme = getTheme(base);
    for (let [key, value] of Object.entries(data.overrides))
      if (Object.hasOwn(theme, key) && isValidThemeColor(value)) overrides[key] = value;
  }
  return {
    slug,
    name,
    base,
    overrides,
    source,
  };
}
//@ chunk-6kfx541v.js:2638-3199 placement
/**
 * 读取单个主题文件（经存储后端或文件系统，超过 256KB 跳过）并解析。
 */
async function readCustomThemeFile(filePath, slug, source, storageV5, storageKey, tally) {
  if (storageV5 && storageKey) {
    let readResult;
    try {
      readResult = await storageV5.read([storageKey]);
    } catch (error) {
      if (tally) tally.readErrors++;
      logForDebugging(`[theme] failed to read ${filePath}: ${errorMessage(error)}`, {
        level: "warn",
      });
      return;
    }
    if (!readResult.ok) {
      if (tally) tally.readErrors++;
      logForDebugging(`[theme] failed to read ${filePath}: ${formatStorageError(readResult.error)}`, {
        level: "warn",
      });
      return;
    }
    let item = readResult.value.items[0];
    return item?.found ? parseCustomTheme(slug, Buffer.from(item.value).toString("utf8"), source) : undefined;
  }
  let text;
  try {
    if ((await stat(filePath)).size > MAX_CUSTOM_THEME_BYTES) {
      logForDebugging(`[theme] ${filePath} exceeds 256KB; skipping`, {
        level: "warn",
      });
      return;
    }
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[theme] failed to read ${filePath}`, {
        level: "warn",
      });
    return;
  }
  return parseCustomTheme(slug, text, source);
}
//@ chunk-6kfx541v.js:3199-3254 placement
async function readThemesFromPathAsync(dirPath, source, slugPrefix = "") {
  return (await readThemesFromPath(dirPath, source, slugPrefix)) ?? [];
}
//@ chunk-6kfx541v.js:3254-5056 placement
/**
 * 读取目录（或单个文件）中的所有 .json 主题；用户主题目录经存储后端分页列出并批量读取，失败时返回 null 保留旧主题。
 */
async function readThemesFromPath(dirPath, source, slugPrefix, storageV5) {
  if (storageV5 && source === "user" && dirPath === getThemesDir()) {
    let configDirKey = {
      namespace: "userConfigDir",
      dir: "themes",
    };
    let listedThemes = [];
    let listResult = await readAllPages(
      (cursor) =>
        storageV5.listEntries(
          configDirKey,
          cursor === undefined
            ? undefined
            : {
                cursor,
              },
        ),
      (pageEntries) => {
        for (let entry of pageEntries) {
          if (entry.kind !== "key") continue;
          let fileName = entry.key.namespace === "userConfigDir" ? (entry.key.relPath.at(-1) ?? "") : "";
          if (extname(fileName) !== ".json") continue;
          if ((entry.size ?? 0) > MAX_CUSTOM_THEME_BYTES) {
            logForDebugging(`[theme] ${join(dirPath, fileName)} exceeds 256KB; skipping`, {
              level: "warn",
            });
            continue;
          }
          listedThemes.push({
            slug: slugPrefix + basename(fileName, ".json"),
            name: fileName,
          });
        }
      },
    ).catch((error) => {
      logForDebugging(
        `[theme] list themes failed: ${errorMessage(error)}; keeping the previously loaded themes (if any)`,
        {
          level: "warn",
        },
      );
      return null;
    });
    if (listResult === null) return null;
    switch (listResult.status) {
      case "done":
        break;
      case "error":
        logForDebugging(
          `[theme] list themes failed: ${formatStorageError(listResult.error)}; keeping the previously loaded themes (if any)`,
          {
            level: "warn",
          },
        );
        return null;
      case "capped":
        logForDebugging(
          `[theme] list themes exceeded ${DEFAULT_MAX_PAGES} pages; keeping the previously loaded themes (if any)`,
          {
            level: "warn",
          },
        );
        return null;
    }
    if (listedThemes.length === 0) return [];
    let mapped = listedThemes.map((listedTheme) =>
      STORAGE_SPACES.userConfigDir("themes", [listedTheme.name]),
    );
    let readResult;
    try {
      readResult = await storageV5.read(mapped);
    } catch (error) {
      logForDebugging(`[theme] batched theme read failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
    let themes = [];
    if (readResult?.ok) {
      for (let [itemIndex, item] of readResult.value.items.entries()) {
        if (!item.found) continue;
        let customTheme = parseCustomTheme(
          listedThemes[itemIndex].slug,
          Buffer.from(item.value).toString("utf8"),
          source,
        );
        if (customTheme) themes.push(customTheme);
      }
      return themes;
    }
    let tally = {
      readErrors: 0,
    };
    for (let [itemIndex, listedTheme] of listedThemes.entries()) {
      let customThemeFile = await readCustomThemeFile(
        join(dirPath, listedTheme.name),
        listedTheme.slug,
        source,
        storageV5,
        mapped[itemIndex],
        tally,
      );
      if (customThemeFile) themes.push(customThemeFile);
    }
    if (themes.length === 0 && tally.readErrors > 0) {
      logForDebugging(
        `[theme] could not read any of ${listedThemes.length} listed theme files; keeping the previously loaded themes (if any)`,
        {
          level: "warn",
        },
      );
      return null;
    }
    return themes;
  }
  let fileNames;
  try {
    fileNames = await readdir(dirPath);
  } catch (error) {
    if (getErrnoCode(error) === "ENOTDIR") {
      let customThemeFile = await readCustomThemeFile(
        dirPath,
        slugPrefix + basename(dirPath, ".json"),
        source,
      );
      return customThemeFile ? [customThemeFile] : [];
    }
    if (!isFsInaccessible(error))
      logForDebugging(`[theme] readdir ${dirPath} failed`, {
        level: "warn",
      });
    return [];
  }
  let themes = [];
  for (let fileName of fileNames) {
    if (extname(fileName) !== ".json") continue;
    let customThemeFile = await readCustomThemeFile(
      join(dirPath, fileName),
      slugPrefix + basename(fileName, ".json"),
      source,
    );
    if (customThemeFile) themes.push(customThemeFile);
  }
  return themes;
}
//@ chunk-6kfx541v.js:5056-5285 placement
/**
 * 自定义主题文件的 schema（名称、基础主题与覆盖项）。
 */
var loadCustomThemes; // deferred: uses getCustomThemeRegistry of its import cycle while loading; runs once the cycle is complete
var customThemeFileSchema;
deferInit("chunk-6kfx541v.js:5056", () => {
  loadCustomThemes = serializeCalls(async (storageV5) => {
    let customThemeRegistry = getCustomThemeRegistry();
    let themes = isCustomizationDisabled("themes")
      ? []
      : ((await readThemesFromPath(getThemesDir(), "user", "", storageV5)) ??
        customThemeRegistry.cachedUserThemes());
    themes.sort((leftTheme, rightTheme) => leftTheme.name.localeCompare(rightTheme.name));
    return customThemeRegistry.commitUserThemes(themes);
  });
  customThemeFileSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema(),
      base: stringSchema(),
      overrides: record(stringSchema(), stringSchema()),
    }),
  );
});
//@ chunk-6kfx541v.js:5285-5803 placement
async function saveCustomTheme(theme, storageV5) {
  let fileData = {
    name: theme.name,
    base: theme.base,
    overrides: theme.overrides,
  };
  let fileName = `${theme.slug}.json`;
  if (isStorageV5Enabled() && storageV5 !== undefined && isValidKeySegment(fileName)) {
    let contents =
      jsonStringify(fileData, null, 2) +
      `
`;
    let writeResult = await storageV5.write(STORAGE_SPACES.userConfigDir("themes", [fileName]), contents, {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok) {
      logForDebugging(`[theme] v5 save ${theme.slug} failed: ${formatStorageError(writeResult.error)}`, {
        level: "warn",
      });
      throw Error("theme save failed");
    }
    return;
  }
  await createJsonStore(join(getThemesDir(), `${theme.slug}.json`), customThemeFileSchema, {
    defaultValue: () => ({
      name: theme.slug,
      base: "dark",
      overrides: {},
    }),
    ensureDir: true,
    indent: 2,
    trailingNewline: true,
  }).write(fileData);
}
//@ chunk-6kfx541v.js:5803-5901 placement
function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "theme"
  );
}
//@ chunk-6kfx541v.js:5901-6238 placement (2.1.88 match: startWatching, 0.732)
/**
 * 监听主题目录（depth 0）的增删改。旧版名 startWatching 来自 fileChangedWatcher，此处实为主题文件监听。
 */
function watchCustomThemes(paths) {
  if (isCustomizationDisabled("themes")) return () => {};
  let watcher = chokidar_default.watch(getThemesDir(), {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    ignorePermissionErrors: true,
  });
  watcher.on("add", paths);
  watcher.on("change", paths);
  watcher.on("unlink", paths);
  watcher.on("error", (error) =>
    logForDebugging(`[theme] watcher error: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  return () => void watcher.close();
}
export {
  readThemesFromPathAsync,
  getCustomThemeRegistry,
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
