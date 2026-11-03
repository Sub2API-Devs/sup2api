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
import { x } from "../../../../runtime/bun-runtime.js";
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

//@ chunk-yb0ajcmt.js:3857-3942 placement = timing (0.363)
var timingManifest = x(function (Xn, Ke) {
  Ke.exports = {
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
function renderMermaidSource(e, t, n) {
  if (e.length > MAX_MERMAID_SOURCE_CHARS) return;
  try {
    let o = splitMermaidStatements(e);
    let i = o?.[0] ?? "";
    if (o === undefined || !o.every(isAllNarrowSafe)) return;
    let u = i === "sequenceDiagram" ? parseSequenceDiagram(o) : undefined;
    let r = u ? undefined : parseFlowchart(o);
    let s = u ? drawSequenceDiagram(u, t) : r && renderFlowchartAsList(r, t);
    return s && s.length <= MIN_PLOT_WIDTH
      ? {
          kind: u ? "sequence diagram" : "flowchart",
          lines: s,
        }
      : undefined;
  } catch {
    n?.();
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
  let i = [];
  let u;
  let r = text.length;
  for (let k = 0; k < lines.length; k++) {
    let l = lines[k] ?? "";
    i.push(l);
    if (!u) {
      let match = FENCE_OPEN_RE.exec(l);
      let [, T = "", ee = "", V = ""] = match ?? [];
      u =
        match && !(ee.startsWith("`") && V.includes("`"))
          ? {
              indent: T,
              marker: ee,
              info: V.trim(),
              line: k,
            }
          : undefined;
      continue;
    }
    let a = FENCE_CLOSE_RE.exec(l)?.[1] ?? "";
    if (!(a.startsWith(u.marker.charAt(0)) && a.length >= u.marker.length)) continue;
    let c = u;
    u = undefined;
    if (c.info.toLowerCase() !== "mermaid") continue;
    let p = false;
    let y = renderMermaidSource(
      lines
        .slice(c.line + 1, k)
        .map((line) => (line.startsWith(c.indent) ? line.slice(c.indent.length) : line)).join(`
`),
      columns - MIN_SOURCE_LINES - c.indent.length,
      () => {
        p = true;
      },
    );
    if (!y) {
      record?.(p ? "threw" : "kept");
      continue;
    }
    let S = 2;
    for (let line of y.lines) for (let T of line.match(BACKTICKS_RE) ?? []) S = Math.max(S, T.length);
    let w = "`".repeat(S + 1);
    let E = [
      `${c.indent}${w}mermaid \xB7 ${y.kind}`,
      ...y.lines.map((line) => c.indent + line),
      c.indent + w,
    ];
    let sliced = i.slice(c.line - k - 1);
    let I = totalLineChars(E) - totalLineChars(sliced);
    if (I > 0 && r + I > MAX_RENDER_MS) {
      record?.("kept");
      continue;
    }
    record?.("drawn");
    r += I;
    i.length -= sliced.length;
    for (let C of E) i.push(C);
  }
  return i.join(`
`);
}
//@ chunk-yb0ajcmt.js:28410-28464 placement
/**
 * 行字符总数
 */
function totalLineChars(e) {
  return e.reduce((acc, n) => acc + n.length + 1, 0);
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
function registerMermaidRenderHook(e, t) {
  let n = new Map();
  e(
    "ui.render",
    {
      component: "AssistantMessage",
      surface: "terminal",
      props: {
        text: MERMAID_FENCE_RE,
      },
    },
    (o, i, u) => {
      if (i.component !== "AssistantMessage") return u(i);
      let columns = i.viewport?.columns ?? MIN_VIEWPORT_WIDTH;
      let s = `${columns}
${i.props.text}`;
      let l = n.get(s) ?? renderMermaidFencesInText(i.props.text, columns, t.record);
      cacheRenderedDiagram(n, s, l);
      return l === i.props.text
        ? u(i)
        : u({
            ...i,
            props: {
              ...i.props,
              text: l,
            },
          });
    },
  );
}
//@ chunk-yb0ajcmt.js:28867-28891 placement
/**
 * 注册 mermaid 渲染钩子
 */
function registerMermaidPlugin(e) {
  registerMermaidRenderHook(e, {});
}
//@ chunk-yb0ajcmt.js:28891-29138 placement
/**
 * mermaid 插件定义：注册钩子并记录 drawn/kept/threw 遥测（每种只记一次）。
 */
var createMermaidPlugin = (e) => ({
  register: (t) => {
    let n = new Set();
    e.registerHooks(t, {
      record: (o) => {
        if (n.has(o)) return;
        switch ((n.add(o), o)) {
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
