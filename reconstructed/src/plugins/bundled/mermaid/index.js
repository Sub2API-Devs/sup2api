/**
 * plugins/bundled/mermaid/index.ts
 *
 * 2.1.316 新增：内置 mermaid 插件定义与 ui.render 钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (9)
 * attribution: placement 9
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import {
  defineMermaidPlugin,
  Ue,
  Xe,
  $e,
  Xt,
  registerMermaidRenderHook,
  renderMermaidSource,
  renderMermaidFencesInText,
} from "./renderMermaidBlock.js";
import { areHooksModulesAllowed } from "../../../services/analytics/growthbookCredentials.js";
import { isScreenReaderMode } from "../../../utils/accessibility/screenReader.js";
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";

//@ chunk-yb0ajcmt.js:3942-3952 placement
var mermaidPluginModule = {};
//@ chunk-yb0ajcmt.js:3952-4083 placement
Ar(mermaidPluginModule, {
  PLUGIN_DESCRIPTION: () => MERMAID_PLUGIN_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_MERMAID,
  default: () => mermaidPluginModule,
  isAvailable: () => isMermaidPluginAvailable,
  isOnByDefault: () => MERMAID_PLUGIN_DEFAULT_ON,
  registerPlugin: () => defineMermaidPlugin,
});
//@ chunk-yb0ajcmt.js:4083-4092 placement
var Z = {};
//@ chunk-yb0ajcmt.js:4092-4261 placement
Ar(Z, {
  MAX_REWRITTEN_LENGTH: () => Ue,
  MAX_ROWS: () => Xe,
  MAX_SOURCE_LENGTH: () => $e,
  default: () => Z,
  register: () => Xt,
  registerHooks: () => registerMermaidRenderHook,
  renderMermaid: () => renderMermaidSource,
  withDiagrams: () => renderMermaidFencesInText,
});
//@ chunk-yb0ajcmt.js:4261-4271 placement
var MERMAID_PLUGIN_DEFAULT_ON = !1;
//@ chunk-yb0ajcmt.js:4271-4322 placement
var isMermaidPluginAvailable = () =>
  areHooksModulesAllowed() &&
  !isScreenReaderMode() &&
  getFeatureValue_SESSION_PINNED("tengu_mermaid_mod", MERMAID_PLUGIN_DEFAULT_ON);
//@ chunk-yb0ajcmt.js:4322-4470 placement
var MERMAID_PLUGIN_DESCRIPTION =
  "Mermaid diagrams in the terminal: flowcharts and sequence diagrams in a reply's mermaid code fences are drawn in place as box-drawing text";
//@ chunk-yb0ajcmt.js:4470-4497 placement
var CC_PLUGIN_MERMAID = "cc-plugin-mermaid";
/**
 * 缓存渲染结果（单项与总量有上限，超出时淘汰最旧的）。
 */
//@ chunk-yb0ajcmt.js:4497-4703 placement
function cacheRenderedDiagram(e, t, n) {
  if ((e.delete(t), t.length + n.length > 50000)) return;
  e.set(t, n);
  let o = 0;
  for (let [i, u] of e) o += i.length + u.length;
  for (let [i, u] of e) {
    if (e.size <= 32 && o <= 250000) return;
    (e.delete(i), (o -= i.length + u.length));
  }
}

export { cacheRenderedDiagram, CC_PLUGIN_MERMAID, MERMAID_PLUGIN_DESCRIPTION, isMermaidPluginAvailable, Z };
