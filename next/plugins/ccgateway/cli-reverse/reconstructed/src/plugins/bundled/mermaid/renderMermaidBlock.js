/**
 * plugins/bundled/mermaid/renderMermaidBlock.ts
 *
 * 2.1.316 新增：替换回复中的 mermaid 代码块为字符图
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (11)
 * attribution: placement 11
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { splitMermaidStatements, parseSequenceDiagram, drawSequenceDiagram } from "./sequenceDiagram.js";
import { isAllNarrowSafe } from "../../../ink/graphemeCells.js";
import { parseFlowchart, renderFlowchartAsList } from "./flowchartRender.js";
import {
  cacheRenderedDiagram,
  CC_PLUGIN_MERMAID,
  MERMAID_PLUGIN_DESCRIPTION,
  isMermaidPluginAvailable,
  EMPTY_OBJECT,
} from "./index.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

//@ chunk-yb0ajcmt.js:3857-3942 placement (2.1.88 match: timing, 0.363)
var timingManifest = __commonJS(function (requireFn, moduleObject) {
  moduleObject.exports = {
    scan: {
      hooks: ["ui.render"],
      calls: [],
    },
    files: {},
  };
});
//@ chunk-yb0ajcmt.js:27065-27085 placement
/**
 * 20000
 */
var MAX_MERMAID_SOURCE_CHARS = 20000;
var MIN_PLOT_WIDTH = 300;
//@ chunk-yb0ajcmt.js:27085-27369 placement
/**
 * 解析 mermaid 源（时序图或流程图）并绘制为字符图；过长或失败返回 undefined。
 */
function renderMermaidSource(source, columns, onThrow) {
  if (source.length > MAX_MERMAID_SOURCE_CHARS) return;
  try {
    let statements = splitMermaidStatements(source);
    let firstLine = statements?.[0] ?? "";
    if (statements === undefined || !statements.every(isAllNarrowSafe)) return;
    let sequence = firstLine === "sequenceDiagram" ? parseSequenceDiagram(statements) : undefined;
    let flowchart = sequence ? undefined : parseFlowchart(statements);
    let lines = sequence
      ? drawSequenceDiagram(sequence, columns)
      : flowchart && renderFlowchartAsList(flowchart, columns);
    return lines && lines.length <= MIN_PLOT_WIDTH
      ? {
          kind: sequence ? "sequence diagram" : "flowchart",
          lines,
        }
      : undefined;
  } catch {
    onThrow?.();
    return;
  }
}
//@ chunk-yb0ajcmt.js:27369-27468 placement
/**
 * 代码围栏开始
 */
var FENCE_OPEN_RE = /^( {0,3})(`{3,}|~{3,})([^\n]*)$/;
var FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/;
var BACKTICKS_RE = /`+/g;
var MIN_SOURCE_LINES = 2;
var MAX_RENDER_MS = 60000;
//@ chunk-yb0ajcmt.js:27468-28410 placement
/**
 * 扫描回复文本里的 ```mermaid 代码块，能画的替换成框线字符图，记录 drawn/kept/fell_back 遥测。
 */
function renderMermaidFencesInText(text, columns, record) {
  let lines = text.split(`
`);
  let out = [];
  let open;
  let totalChars = text.length;
  for (let k = 0; k < lines.length; k++) {
    let line = lines[k] ?? "";
    out.push(line);
    if (!open) {
      let match = FENCE_OPEN_RE.exec(line);
      let [, indent = "", marker = "", info = ""] = match ?? [];
      open =
        match && !(marker.startsWith("`") && info.includes("`"))
          ? {
              indent,
              marker,
              info: info.trim(),
              line: k,
            }
          : undefined;
      continue;
    }
    let closer = FENCE_CLOSE_RE.exec(line)?.[1] ?? "";
    if (!(closer.startsWith(open.marker.charAt(0)) && closer.length >= open.marker.length)) continue;
    let fence = open;
    open = undefined;
    if (fence.info.toLowerCase() !== "mermaid") continue;
    let isThrew = false;
    let rendered = renderMermaidSource(
      lines
        .slice(fence.line + 1, k)
        .map((line) => (line.startsWith(fence.indent) ? line.slice(fence.indent.length) : line)).join(`
`),
      columns - MIN_SOURCE_LINES - fence.indent.length,
      () => {
        isThrew = true;
      },
    );
    if (!rendered) {
      record?.(isThrew ? "threw" : "kept");
      continue;
    }
    let maxTicks = 2;
    for (let line of rendered.lines)
      for (let ticks of line.match(BACKTICKS_RE) ?? []) maxTicks = Math.max(maxTicks, ticks.length);
    let tickFence = "`".repeat(maxTicks + 1);
    let newLines = [
      `${fence.indent}${tickFence}mermaid \xB7 ${rendered.kind}`,
      ...rendered.lines.map((line) => fence.indent + line),
      fence.indent + tickFence,
    ];
    let lines_2 = out.slice(fence.line - k - 1);
    let growth = totalLineChars(newLines) - totalLineChars(lines_2);
    if (growth > 0 && totalChars + growth > MAX_RENDER_MS) {
      record?.("kept");
      continue;
    }
    record?.("drawn");
    totalChars += growth;
    out.length -= lines_2.length;
    for (let line of newLines) out.push(line);
  }
  return out.join(`
`);
}
//@ chunk-yb0ajcmt.js:28410-28464 placement
/**
 * 行字符总数
 */
function totalLineChars(lines) {
  return lines.reduce((acc, line) => acc + line.length + 1, 0);
}
//@ chunk-yb0ajcmt.js:28464-28526 placement
/**
 * ```mermaid 围栏
 */
var MERMAID_FENCE_RE = /^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid[ \t\r]*$/im;
var MIN_VIEWPORT_WIDTH = 80;
//@ chunk-yb0ajcmt.js:28526-28867 placement
/**
 * 通过 ui.render 钩子拦截终端里的 AssistantMessage，按视口宽度缓存并替换 mermaid 块。
 */
function registerMermaidRenderHook(on, options) {
  let cache = new Map();
  on(
    "ui.render",
    {
      component: "AssistantMessage",
      surface: "terminal",
      props: {
        text: MERMAID_FENCE_RE,
      },
    },
    (ctx, payload, next) => {
      if (payload.component !== "AssistantMessage") return next(payload);
      let columns = payload.viewport?.columns ?? MIN_VIEWPORT_WIDTH;
      let cacheKey = `${columns}
${payload.props.text}`;
      let rendered =
        cache.get(cacheKey) ?? renderMermaidFencesInText(payload.props.text, columns, options.record);
      cacheRenderedDiagram(cache, cacheKey, rendered);
      return rendered === payload.props.text
        ? next(payload)
        : next({
            ...payload,
            props: {
              ...payload.props,
              text: rendered,
            },
          });
    },
  );
}
//@ chunk-yb0ajcmt.js:28867-28891 placement
/**
 * 注册 mermaid 渲染钩子
 */
function registerMermaidPlugin(on) {
  registerMermaidRenderHook(on, {});
}
//@ chunk-yb0ajcmt.js:28891-29138 placement
/**
 * mermaid 插件定义：注册钩子并记录 drawn/kept/threw 遥测（每种只记一次）。
 */
var createMermaidPlugin = (host) => ({
  register: (on) => {
    let recorded = new Set();
    host.registerHooks(on, {
      record: (outcome) => {
        if (recorded.has(outcome)) return;
        switch ((recorded.add(outcome), outcome)) {
          case "drawn":
            logFeatureOk("mermaid_render");
            break;
          case "kept":
            logFeatureSad("mermaid_render", "fell_back");
            break;
          case "threw":
            logFeatureSad("mermaid_render", "threw");
        }
      },
    });
  },
});
//@ chunk-yb0ajcmt.js:29138-29240 placement
/**
 * 内置插件 cc-plugin-mermaid 定义（GrowthBook tengu_mermaid_mod 控制可用性）。
 */
var defineMermaidPlugin = () =>
  registerBuiltinPlugin({
    name: CC_PLUGIN_MERMAID,
    description: MERMAID_PLUGIN_DESCRIPTION,
    isAvailable: isMermaidPluginAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, createMermaidPlugin(EMPTY_OBJECT), () =>
      timingManifest(),
    ),
  });
export {
  defineMermaidPlugin,
  MAX_RENDER_MS,
  MIN_PLOT_WIDTH,
  MAX_MERMAID_SOURCE_CHARS,
  registerMermaidPlugin,
  registerMermaidRenderHook,
  renderMermaidSource,
  renderMermaidFencesInText,
};
