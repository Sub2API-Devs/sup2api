/**
 * utils/highlight/pluginLanguages.ts
 *
 * 插件提供的高亮语言（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n5fvvrgq.js (8)
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

//@ chunk-n5fvvrgq.js:10960-11005 placement
var PLUGIN_LANGUAGE_ID_RE = /^[a-z0-9][a-z0-9_+#.-]{0,63}$/;
var MAX_PLUGIN_LANGUAGE_ALIASES = 16;
//@ chunk-n5fvvrgq.js:11005-11040 placement
function pluginLanguageDefaultExport(r) {
  return r.default ?? r;
}
//@ chunk-n5fvvrgq.js:11040-13568 placement
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
  core(r) {
    if (this.hljs) return this.hljs;
    let core = r.loadCore();
    this.underMessage = withMaxDepth(core);
    for (let [key, value] of Object.entries(CEDAR_LANGUAGES))
      if (!core.getLanguage(key)) core.registerLanguage(key, withBoundedRegexps(key, value));
    for (let [o, n] of this.pluginLanguages)
      if (!core.getLanguage(o))
        this.registerResolvedPluginLanguage(core, o, n, {
          emitSadTelemetry: true,
        });
    this.hljs = core;
    return core;
  }
  highlightUnderMessage(r, e, o) {
    let n = this.core(r);
    return this.underMessage(e, () => o(n));
  }
  ensureLanguage(r, e) {
    let o = this.core(e);
    let lower = r.toLowerCase();
    let id = e.resolveId(lower);
    if (id !== null) {
      if (this.failed.has(id)) return null;
      if (!this.loaded.has(id)) {
        let a = e.loaders[id];
        if (typeof a !== "function") return null;
        try {
          o.registerLanguage(id, withBoundedRegexps(id, pluginLanguageDefaultExport(a())));
        } catch (error) {
          this.failed.add(id);
          logError(error);
          return null;
        }
        this.loaded.add(id);
        for (let p of e.subLanguageDeps[id] ?? []) this.ensureLanguage(p, e);
      }
      return id;
    }
    let language = o.getLanguage(lower);
    if (!language) return null;
    if (!this.runtimeDepsEnsured.has(language)) {
      this.runtimeDepsEnsured.add(language);
      for (let a of subLanguagesOf(language)) if (a !== lower) this.ensureLanguage(a, e);
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
  isReservedLanguageId(r) {
    return (
      Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, r) ||
      Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGE_NAME_MAP, r) ||
      Object.prototype.hasOwnProperty.call(CEDAR_LANGUAGES, r) ||
      CEDAR_ALIASES.has(r) ||
      this.pluginLanguages.has(r) ||
      this.pluginAliases.has(r)
    );
  }
  isPluginLanguageId(r) {
    return this.pluginLanguages.has(r) || this.pluginAliases.has(r);
  }
  addPluginLanguage(r, e, o) {
    if (this.isReservedLanguageId(r)) return false;
    let sliced = o
      .map((s) => s.toLowerCase())
      .filter((s) => PLUGIN_LANGUAGE_ID_RE.test(s) && s !== r && !this.isReservedLanguageId(s))
      .slice(0, MAX_PLUGIN_LANGUAGE_ALIASES);
    let i = (s) => {
      let a = e(s);
      a.name = r;
      a.aliases = sliced;
      a.disableAutodetect = true;
      return a;
    };
    this.pluginLanguages.set(r, i);
    for (let s of sliced) this.pluginAliases.add(s);
    if (this.hljs && !this.hljs.getLanguage(r))
      return this.registerResolvedPluginLanguage(this.hljs, r, i, {
        emitSadTelemetry: false,
      });
    return true;
  }
  registerResolvedPluginLanguage(r, e, o, { emitSadTelemetry }) {
    try {
      let i = withBoundedRegexps(e, o)(r);
      r.registerLanguage(e, () => i);
      r.highlight("", {
        language: e,
        ignoreIllegals: true,
      });
      return true;
    } catch (error) {
      this.pluginLanguages.delete(e);
      if (r.getLanguage(e)) r.unregisterLanguage(e);
      if (emitSadTelemetry) logFeatureSad("plugin_hljs_languages", "resolve_failed");
      logForDebugging(
        `plugin hljs grammar '${e}' failed to resolve at registration: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      return false;
    }
  }
}
//@ chunk-n5fvvrgq.js:13568-13851 placement
function subLanguagesOf(r) {
  let e = new Set();
  let o = new Set();
  function n(i) {
    if (i === null || typeof i !== "object" || o.has(i)) return;
    o.add(i);
    let s = i;
    for (let a of [s.subLanguage ?? []].flat()) if (typeof a === "string") e.add(a);
    for (let a of s.contains ?? []) n(a);
    n(s.starts);
    for (let a of s.variants ?? []) n(a);
  }
  n(r);
  return e;
}
//@ chunk-n5fvvrgq.js:13851-13866 placement
/**
 * 插件提供的高亮语言注册表单例。
 */
var pluginHighlightLanguages = new PluginHighlightLanguages();
//@ chunk-n5fvvrgq.js:13866-14019 placement
/**
 * 把语言名或别名转为 highlight 支持的规范名，未知时为 null。
 */
function canonicalLanguageName(r) {
  let lower = r.toLowerCase();
  return Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, lower)
    ? lower
    : Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGE_NAME_MAP, lower)
      ? (HIGHLIGHT_LANGUAGE_NAME_MAP[lower] ?? null)
      : null;
}
//@ chunk-n5fvvrgq.js:14019-14266 placement
/**
 * 按文件扩展名判断代码语言（用于权限遥测），插件语言标为 plugin，未知为 unknown。
 */
async function languageForFilePath(r) {
  let sliced = extname(r).slice(1);
  if (!sliced) return lit("unknown");
  let lower = sliced.toLowerCase();
  let n = canonicalLanguageName(lower);
  if (n !== null) return sanitizeLanguageName(LANGUAGE_NAMES[n]);
  if (pluginHighlightLanguages.isPluginLanguageId(lower)) return lit("plugin");
  return sanitizeLanguageName(
    Object.prototype.hasOwnProperty.call(CEDAR_DISPLAY_NAMES, lower) ? CEDAR_DISPLAY_NAMES[lower] : undefined,
  );
}
//@ chunk-n5fvvrgq.js:14266-14318 placement
function sanitizeLanguageName(r) {
  return r === undefined ? lit("unknown") : fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
}
export { canonicalLanguageName, pluginHighlightLanguages, languageForFilePath };
