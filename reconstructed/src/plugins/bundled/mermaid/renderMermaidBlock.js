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
import { Ae } from "../../../ink/graphemeCells.js";
import { parseFlowchart, renderFlowchartAsList } from "./flowchartRender.js";
import {
  cacheRenderedDiagram,
  CC_PLUGIN_MERMAID,
  MERMAID_PLUGIN_DESCRIPTION,
  isMermaidPluginAvailable,
  Z,
} from "./index.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

//@ chunk-yb0ajcmt.js:3857-3942 placement = timing (0.363)
var timingManifest = x(function (Xn, Ke) {
  Ke.exports = { scan: { hooks: ["ui.render"], calls: [] }, files: {} };
});
//@ chunk-yb0ajcmt.js:27065-27085 placement
var $e = 20000,
  Xe = 300;
/**
 * 解析 mermaid 源（时序图或流程图）并绘制为字符图；过长或失败返回 undefined。
 */
//@ chunk-yb0ajcmt.js:27085-27369 placement
function renderMermaidSource(e, t, n) {
  if (e.length > $e) return;
  try {
    let o = splitMermaidStatements(e),
      i = o?.[0] ?? "";
    if (o === void 0 || !o.every(Ae)) return;
    let u = i === "sequenceDiagram" ? parseSequenceDiagram(o) : void 0,
      r = u ? void 0 : parseFlowchart(o),
      s = u ? drawSequenceDiagram(u, t) : r && renderFlowchartAsList(r, t);
    return s && s.length <= Xe ? { kind: u ? "sequence diagram" : "flowchart", lines: s } : void 0;
  } catch {
    n?.();
    return;
  }
}
//@ chunk-yb0ajcmt.js:27369-27468 placement
var Pt = /^( {0,3})(`{3,}|~{3,})([^\n]*)$/,
  Ht = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/,
  Wt = /`+/g,
  vt = 2,
  Ue = 60000;
/**
 * 扫描回复文本里的 ```mermaid 代码块，能画的替换成框线字符图，记录 drawn/kept/fell_back 遥测。
 */
//@ chunk-yb0ajcmt.js:27468-28410 placement
function renderMermaidFencesInText(e, t, n) {
  let parts = e.split(`
`),
    i = [],
    u,
    r = e.length;
  for (let s = 0; s < parts.length; s++) {
    let l = parts[s] ?? "";
    if ((i.push(l), !u)) {
      let match = Pt.exec(l),
        [, T = "", ee = "", V = ""] = match ?? [];
      u =
        match && !(ee.startsWith("`") && V.includes("`"))
          ? { indent: T, marker: ee, info: V.trim(), line: s }
          : void 0;
      continue;
    }
    let a = Ht.exec(l)?.[1] ?? "";
    if (!(a.startsWith(u.marker.charAt(0)) && a.length >= u.marker.length)) continue;
    let c = u;
    if (((u = void 0), c.info.toLowerCase() !== "mermaid")) continue;
    let p = !1,
      y = renderMermaidSource(
        parts.slice(c.line + 1, s).map((C) => (C.startsWith(c.indent) ? C.slice(c.indent.length) : C)).join(`
`),
        t - vt - c.indent.length,
        () => {
          p = !0;
        },
      );
    if (!y) {
      n?.(p ? "threw" : "kept");
      continue;
    }
    let S = 2;
    for (let line of y.lines) for (let T of line.match(Wt) ?? []) S = Math.max(S, T.length);
    let repeat = "`".repeat(S + 1),
      E = [
        `${c.indent}${repeat}mermaid \xB7 ${y.kind}`,
        ...y.lines.map((line) => c.indent + line),
        c.indent + repeat,
      ],
      sliced = i.slice(c.line - s - 1),
      I = je(E) - je(sliced);
    if (I > 0 && r + I > Ue) {
      n?.("kept");
      continue;
    }
    (n?.("drawn"), (r += I), (i.length -= sliced.length));
    for (let C of E) i.push(C);
  }
  return i.join(`
`);
}
//@ chunk-yb0ajcmt.js:28410-28464 placement
function je(e) {
  return e.reduce((t, n) => t + n.length + 1, 0);
}
//@ chunk-yb0ajcmt.js:28464-28526 placement
var Gt = /^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid[ \t\r]*$/im,
  $t = 80;
/**
 * 通过 ui.render 钩子拦截终端里的 AssistantMessage，按视口宽度缓存并替换 mermaid 块。
 */
//@ chunk-yb0ajcmt.js:28526-28867 placement
function registerMermaidRenderHook(e, t) {
  let n = new Map();
  e("ui.render", { component: "AssistantMessage", surface: "terminal", props: { text: Gt } }, (o, i, u) => {
    if (i.component !== "AssistantMessage") return u(i);
    let r = i.viewport?.columns ?? $t,
      s = `${r}
${i.props.text}`,
      l = n.get(s) ?? renderMermaidFencesInText(i.props.text, r, t.record);
    return (
      cacheRenderedDiagram(n, s, l),
      l === i.props.text ? u(i) : u({ ...i, props: { ...i.props, text: l } })
    );
  });
}
//@ chunk-yb0ajcmt.js:28867-28891 placement
function Xt(e) {
  registerMermaidRenderHook(e, {});
}
/**
 * mermaid 插件定义：注册钩子并记录 drawn/kept/threw 遥测（每种只记一次）。
 */
//@ chunk-yb0ajcmt.js:28891-29138 placement
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
/**
 * 内置插件 cc-plugin-mermaid 定义（GrowthBook tengu_mermaid_mod 控制可用性）。
 */
//@ chunk-yb0ajcmt.js:29138-29240 placement
var defineMermaidPlugin = () =>
  registerBuiltinPlugin({
    name: CC_PLUGIN_MERMAID,
    description: MERMAID_PLUGIN_DESCRIPTION,
    isAvailable: isMermaidPluginAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, createMermaidPlugin(Z), () => timingManifest()),
  });

export {
  defineMermaidPlugin,
  Ue,
  Xe,
  $e,
  Xt,
  registerMermaidRenderHook,
  renderMermaidSource,
  renderMermaidFencesInText,
};
