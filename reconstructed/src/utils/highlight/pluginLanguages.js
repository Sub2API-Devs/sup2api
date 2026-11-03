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
import { y, Hr, withBoundedRegexps } from "./boundedHighlight.js";
import { Mis, LANGUAGE_NAMES, wPt, vki, sgr } from "../cliHighlight.js";
import { logError } from "../log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";

//@ chunk-n5fvvrgq.js:10960-11005 placement
var Zr = /^[a-z0-9][a-z0-9_+#.-]{0,63}$/,
  Fr = 16;
//@ chunk-n5fvvrgq.js:11005-11040 placement
function Jr(r) {
  return r.default ?? r;
}
/**
 * 插件提供的 highlight.js 语言注册与解析
 */
//@ chunk-n5fvvrgq.js:11040-13568 placement
class PluginHighlightLanguages {
  hljs = null;
  underMessage = y;
  loaded = new Set();
  failed = new Set();
  runtimeDepsEnsured = new WeakSet();
  pluginLanguages = new Map();
  pluginAliases = new Set();
  generation = 0;
  core(r) {
    if (this.hljs) return this.hljs;
    let core = r.loadCore();
    this.underMessage = Hr(core);
    for (let [o, n] of Object.entries(Mis))
      if (!core.getLanguage(o)) core.registerLanguage(o, withBoundedRegexps(o, n));
    for (let [o, n] of this.pluginLanguages)
      if (!core.getLanguage(o)) this.registerResolvedPluginLanguage(core, o, n, { emitSadTelemetry: !0 });
    return ((this.hljs = core), core);
  }
  highlightUnderMessage(r, e, o) {
    let core = this.core(r);
    return this.underMessage(e, () => o(core));
  }
  ensureLanguage(r, e) {
    let core = this.core(e),
      lower = r.toLowerCase(),
      id = e.resolveId(lower);
    if (id !== null) {
      if (this.failed.has(id)) return null;
      if (!this.loaded.has(id)) {
        let a = e.loaders[id];
        if (typeof a !== "function") return null;
        try {
          core.registerLanguage(id, withBoundedRegexps(id, Jr(a())));
        } catch (error) {
          return (this.failed.add(id), logError(error), null);
        }
        this.loaded.add(id);
        for (let p of e.subLanguageDeps[id] ?? []) this.ensureLanguage(p, e);
      }
      return id;
    }
    let language = core.getLanguage(lower);
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
    if ((this.generation++, this.hljs))
      for (let r of this.pluginLanguages.keys()) this.hljs.unregisterLanguage(r);
    (this.pluginLanguages.clear(), this.pluginAliases.clear());
  }
  isReservedLanguageId(r) {
    return (
      Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, r) ||
      Object.prototype.hasOwnProperty.call(wPt, r) ||
      Object.prototype.hasOwnProperty.call(Mis, r) ||
      vki.has(r) ||
      this.pluginLanguages.has(r) ||
      this.pluginAliases.has(r)
    );
  }
  isPluginLanguageId(r) {
    return this.pluginLanguages.has(r) || this.pluginAliases.has(r);
  }
  addPluginLanguage(r, e, o) {
    if (this.isReservedLanguageId(r)) return !1;
    let sliced = o
        .map((s) => s.toLowerCase())
        .filter((s) => Zr.test(s) && s !== r && !this.isReservedLanguageId(s))
        .slice(0, Fr),
      i = (s) => {
        let a = e(s);
        return ((a.name = r), (a.aliases = sliced), (a.disableAutodetect = !0), a);
      };
    this.pluginLanguages.set(r, i);
    for (let s of sliced) this.pluginAliases.add(s);
    if (this.hljs && !this.hljs.getLanguage(r))
      return this.registerResolvedPluginLanguage(this.hljs, r, i, { emitSadTelemetry: !1 });
    return !0;
  }
  registerResolvedPluginLanguage(r, e, o, { emitSadTelemetry: n }) {
    try {
      let i = withBoundedRegexps(e, o)(r);
      return (r.registerLanguage(e, () => i), r.highlight("", { language: e, ignoreIllegals: !0 }), !0);
    } catch (error) {
      if ((this.pluginLanguages.delete(e), r.getLanguage(e))) r.unregisterLanguage(e);
      if (n) logFeatureSad("plugin_hljs_languages", "resolve_failed");
      return (
        logForDebugging(
          `plugin hljs grammar '${e}' failed to resolve at registration: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        ),
        !1
      );
    }
  }
}
//@ chunk-n5fvvrgq.js:13568-13851 placement
function subLanguagesOf(r) {
  let e = new Set(),
    o = new Set();
  function n(i) {
    if (i === null || typeof i !== "object" || o.has(i)) return;
    o.add(i);
    let s = i;
    for (let a of [s.subLanguage ?? []].flat()) if (typeof a === "string") e.add(a);
    for (let a of s.contains ?? []) n(a);
    n(s.starts);
    for (let a of s.variants ?? []) n(a);
  }
  return (n(r), e);
}
//@ chunk-n5fvvrgq.js:13851-13866 placement
var BRe = new PluginHighlightLanguages();
/**
 * 把语言名或别名转为 highlight 支持的规范名，未知时为 null。
 */
//@ chunk-n5fvvrgq.js:13866-14019 placement
function canonicalLanguageName(r) {
  let lower = r.toLowerCase();
  return Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, lower)
    ? lower
    : Object.prototype.hasOwnProperty.call(wPt, lower)
      ? (wPt[lower] ?? null)
      : null;
}
/**
 * 按文件扩展名判断代码语言（用于权限遥测），插件语言标为 plugin，未知为 unknown。
 */
//@ chunk-n5fvvrgq.js:14019-14266 placement
async function languageForFilePath(r) {
  let sliced = extname(r).slice(1);
  if (!sliced) return lit("unknown");
  let lower = sliced.toLowerCase(),
    n = canonicalLanguageName(lower);
  if (n !== null) return yr(LANGUAGE_NAMES[n]);
  if (BRe.isPluginLanguageId(lower)) return lit("plugin");
  return yr(Object.prototype.hasOwnProperty.call(sgr, lower) ? sgr[lower] : void 0);
}
//@ chunk-n5fvvrgq.js:14266-14318 placement
function yr(r) {
  return r === void 0 ? lit("unknown") : fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
}

export { canonicalLanguageName, BRe, languageForFilePath };
