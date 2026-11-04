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
import { __export } from "../../../../runtime/bun-runtime.js";
import {
  defineMermaidPlugin,
  MAX_RENDER_MS,
  MIN_PLOT_WIDTH,
  MAX_MERMAID_SOURCE_CHARS,
  registerMermaidPlugin,
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
__export(mermaidPluginModule, {
  PLUGIN_DESCRIPTION: () => MERMAID_PLUGIN_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_MERMAID,
  default: () => mermaidPluginModule,
  isAvailable: () => isMermaidPluginAvailable,
  isOnByDefault: () => MERMAID_PLUGIN_DEFAULT_ON,
  registerPlugin: () => defineMermaidPlugin,
});
//@ chunk-yb0ajcmt.js:4083-4092 placement
/**
 * 空对象
 */
var EMPTY_OBJECT = {};
//@ chunk-yb0ajcmt.js:4092-4261 placement
__export(EMPTY_OBJECT, {
  MAX_REWRITTEN_LENGTH: () => MAX_RENDER_MS,
  MAX_ROWS: () => MIN_PLOT_WIDTH,
  MAX_SOURCE_LENGTH: () => MAX_MERMAID_SOURCE_CHARS,
  default: () => EMPTY_OBJECT,
  register: () => registerMermaidPlugin,
  registerHooks: () => registerMermaidRenderHook,
  renderMermaid: () => renderMermaidSource,
  withDiagrams: () => renderMermaidFencesInText,
});
//@ chunk-yb0ajcmt.js:4261-4271 placement
var MERMAID_PLUGIN_DEFAULT_ON = false;
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
//@ chunk-yb0ajcmt.js:4497-4703 placement
/**
 * 缓存渲染结果（单项与总量有上限，超出时淘汰最旧的）。
 */
function cacheRenderedDiagram(cache, source, rendered) {
  cache.delete(source);
  if (source.length + rendered.length > 50000) return;
  cache.set(source, rendered);
  let total = 0;
  for (let [key, value] of cache) total += key.length + value.length;
  for (let [key, value] of cache) {
    if (cache.size <= 32 && total <= 250000) return;
    cache.delete(key);
    total -= key.length + value.length;
  }
}
export {
  cacheRenderedDiagram,
  CC_PLUGIN_MERMAID,
  MERMAID_PLUGIN_DESCRIPTION,
  isMermaidPluginAvailable,
  EMPTY_OBJECT,
  mermaidPluginModule,
  MERMAID_PLUGIN_DEFAULT_ON,
};
