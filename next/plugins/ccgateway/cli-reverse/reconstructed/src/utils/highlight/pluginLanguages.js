/**
 * utils/highlight/pluginLanguages.ts
 *
 * 插件提供的高亮语言（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rep15ptw.js (8)
 * attribution: placement 8
 */
import { extname } from "path";
import { noopRun, withMaxDepth, withBoundedRegexps } from "./boundedHighlight.js";
import {
  CEDAR_LANGUAGES,
  LANGUAGE_NAMES,
  HIGHLIGHT_LANGUAGE_NAME_MAP,
  CEDAR_ALIASES,
  CEDAR_DISPLAY_NAMES,
} from "../cliHighlight.js";
import { logError } from "../log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rep15ptw.js:10960-11005 placement
var PLUGIN_LANGUAGE_ID_RE = /^[a-z0-9][a-z0-9_+#.-]{0,63}$/;
var MAX_PLUGIN_LANGUAGE_ALIASES = 16;
//@ chunk-rep15ptw.js:11005-11040 placement
function pluginLanguageDefaultExport(mod) {
  return mod.default ?? mod;
}
//@ chunk-rep15ptw.js:11040-13568 placement
/**
 * 插件提供的 highlight.js 语言注册与解析
 */
class PluginHighlightLanguages {
  hljs = null;
  underMessage = noopRun;
  loaded = new Set();
  failed = new Set();
  runtimeDepsEnsured = new WeakSet();
  pluginLanguages = new Map();
  pluginAliases = new Set();
  generation = 0;
  core(registry) {
    if (this.hljs) return this.hljs;
    let hljs = registry.loadCore();
    this.underMessage = withMaxDepth(hljs);
    for (let [key, value] of Object.entries(CEDAR_LANGUAGES))
      if (!hljs.getLanguage(key)) hljs.registerLanguage(key, withBoundedRegexps(key, value));
    for (let [id, loader] of this.pluginLanguages)
      if (!hljs.getLanguage(id))
        this.registerResolvedPluginLanguage(hljs, id, loader, {
          emitSadTelemetry: true,
        });
    this.hljs = hljs;
    return hljs;
  }
  highlightUnderMessage(registry, text, fn) {
    let core = this.core(registry);
    return this.underMessage(text, () => fn(core));
  }
  ensureLanguage(name, deps) {
    let core = this.core(deps);
    let lower = name.toLowerCase();
    let languageId = deps.resolveId(lower);
    if (languageId !== null) {
      if (this.failed.has(languageId)) return null;
      if (!this.loaded.has(languageId)) {
        let loader = deps.loaders[languageId];
        if (typeof loader !== "function") return null;
        try {
          core.registerLanguage(
            languageId,
            withBoundedRegexps(languageId, pluginLanguageDefaultExport(loader())),
          );
        } catch (error) {
          this.failed.add(languageId);
          logError(error);
          return null;
        }
        this.loaded.add(languageId);
        for (let dep of deps.subLanguageDeps[languageId] ?? []) this.ensureLanguage(dep, deps);
      }
      return languageId;
    }
    let language = core.getLanguage(lower);
    if (!language) return null;
    if (!this.runtimeDepsEnsured.has(language)) {
      this.runtimeDepsEnsured.add(language);
      for (let sub of subLanguagesOf(language)) if (sub !== lower) this.ensureLanguage(sub, deps);
    }
    return lower;
  }
  get pluginGrammarGeneration() {
    return this.generation;
  }
  clearPluginLanguages() {
    this.generation++;
    if (this.hljs) for (let key of this.pluginLanguages.keys()) this.hljs.unregisterLanguage(key);
    this.pluginLanguages.clear();
    this.pluginAliases.clear();
  }
  isReservedLanguageId(id) {
    return (
      Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, id) ||
      Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGE_NAME_MAP, id) ||
      Object.prototype.hasOwnProperty.call(CEDAR_LANGUAGES, id) ||
      CEDAR_ALIASES.has(id) ||
      this.pluginLanguages.has(id) ||
      this.pluginAliases.has(id)
    );
  }
  isPluginLanguageId(id) {
    return this.pluginLanguages.has(id) || this.pluginAliases.has(id);
  }
  addPluginLanguage(id, loadMod, aliasesIn) {
    if (this.isReservedLanguageId(id)) return false;
    let sliced = aliasesIn
      .map((alias) => alias.toLowerCase())
      .filter(
        (alias) => PLUGIN_LANGUAGE_ID_RE.test(alias) && alias !== id && !this.isReservedLanguageId(alias),
      )
      .slice(0, MAX_PLUGIN_LANGUAGE_ALIASES);
    let loader = (name) => {
      let grammar = loadMod(name);
      grammar.name = id;
      grammar.aliases = sliced;
      grammar.disableAutodetect = true;
      return grammar;
    };
    this.pluginLanguages.set(id, loader);
    for (let alias of sliced) this.pluginAliases.add(alias);
    if (this.hljs && !this.hljs.getLanguage(id))
      return this.registerResolvedPluginLanguage(this.hljs, id, loader, {
        emitSadTelemetry: false,
      });
    return true;
  }
  registerResolvedPluginLanguage(core, id, loader, { emitSadTelemetry }) {
    try {
      let grammar = withBoundedRegexps(id, loader)(core);
      core.registerLanguage(id, () => grammar);
      core.highlight("", {
        language: id,
        ignoreIllegals: true,
      });
      return true;
    } catch (error) {
      this.pluginLanguages.delete(id);
      if (core.getLanguage(id)) core.unregisterLanguage(id);
      if (emitSadTelemetry) logFeatureSad("plugin_hljs_languages", "resolve_failed");
      logForDebugging(
        `plugin hljs grammar '${id}' failed to resolve at registration: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      return false;
    }
  }
}
//@ chunk-rep15ptw.js:13568-13851 placement
function subLanguagesOf(language) {
  let names = new Set();
  let visited = new Set();
  function walk(mode) {
    if (mode === null || typeof mode !== "object" || visited.has(mode)) return;
    visited.add(mode);
    let node = mode;
    for (let name of [node.subLanguage ?? []].flat()) if (typeof name === "string") names.add(name);
    for (let child of node.contains ?? []) walk(child);
    walk(node.starts);
    for (let variant of node.variants ?? []) walk(variant);
  }
  walk(language);
  return names;
}
//@ chunk-rep15ptw.js:13851-13866 placement
/**
 * 插件提供的高亮语言注册表单例。
 */
var pluginHighlightLanguages; // deferred: uses PluginHighlightLanguages of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rep15ptw.js:13851", () => {
  pluginHighlightLanguages = new PluginHighlightLanguages();
});
//@ chunk-rep15ptw.js:13866-14019 placement
/**
 * 把语言名或别名转为 highlight 支持的规范名，未知时为 null。
 */
function canonicalLanguageName(name) {
  let lower = name.toLowerCase();
  return Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, lower)
    ? lower
    : Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGE_NAME_MAP, lower)
      ? (HIGHLIGHT_LANGUAGE_NAME_MAP[lower] ?? null)
      : null;
}
//@ chunk-rep15ptw.js:14019-14266 placement
/**
 * 按文件扩展名判断代码语言（用于权限遥测），插件语言标为 plugin，未知为 unknown。
 */
async function languageForFilePath(filePath) {
  let sliced = extname(filePath).slice(1);
  if (!sliced) return lit("unknown");
  let name = sliced.toLowerCase();
  let canonical = canonicalLanguageName(name);
  if (canonical !== null) return sanitizeLanguageName(LANGUAGE_NAMES[canonical]);
  if (pluginHighlightLanguages.isPluginLanguageId(name)) return lit("plugin");
  return sanitizeLanguageName(
    Object.prototype.hasOwnProperty.call(CEDAR_DISPLAY_NAMES, name) ? CEDAR_DISPLAY_NAMES[name] : undefined,
  );
}
//@ chunk-rep15ptw.js:14266-14318 placement
function sanitizeLanguageName(name) {
  return name === undefined ? lit("unknown") : fromSanitizer_SANITIZER_OUTPUT_ONLY(name);
}
export { languageForFilePath, canonicalLanguageName, pluginHighlightLanguages };
