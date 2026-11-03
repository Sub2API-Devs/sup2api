/**
 * utils/staticRender.tsx
 *
 * 把 Ink 节点离屏渲染为 ANSI 字符串，或渲染一次后退出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/staticRender.tsx
 * pieces: chunk-h6f3feta.js (6)
 * attribution: placement 3, callgraph-fingerprint 1, layout 1, fingerprint 1
 */
import { PassThrough } from "stream";
import { j, qt, zt } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useApp } from "../ink/components/Input.js";
import { e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { TerminalWriteProvider } from "../ink/useTerminalNotification.js";

//@ chunk-h6f3feta.js:416-420 placement
j();
//@ chunk-h6f3feta.js:457-471 placement
function m() {}
//@ chunk-h6f3feta.js:471-486 placement
var a0t = qt(!1);
//@ chunk-h6f3feta.js:486-740 callgraph-fingerprint = RenderOnceAndExit (1)
function RenderOnceAndExit(t0) {
  let i = w(5),
    { children: children } = t0,
    { exit: exit } = useApp(),
    a,
    o;
  if (i[0] !== exit)
    ((a = () => {
      let timer = setTimeout(exit, 0);
      return () => clearTimeout(timer);
    }),
      (o = [exit]),
      (i[0] = exit),
      (i[1] = a),
      (i[2] = o));
  else ((a = i[1]), (o = i[2]));
  zt(a, o);
  let c;
  if (i[3] !== children) ((c = e(Fragment, { children: children })), (i[3] = children), (i[4] = c));
  else c = i[4];
  return c;
}
/**
 * 在 Ink 根上渲染元素并等待退出（子命令用的简化版 renderAndRun）。
 */
//@ chunk-h6f3feta.js:740-816 layout = renderAndRun (1)
async function renderAndRun(root, element) {
  (root.render(e(RenderOnceAndExit, { children: element })), await root.waitUntilExit());
}
/**
 * 把 React/Ink 节点离屏渲染为 ANSI 字符串（导出、截图用）。
 */
//@ chunk-h6f3feta.js:816-1126 fingerprint = renderToAnsiString (0.915)
async function renderToAnsiString(node, { columns: columns, storageV5: storageV5 }) {
  let output = "",
    a = !1,
    stream = new PassThrough();
  if (columns !== void 0) stream.columns = columns;
  return (
    stream.on("data", (chunk) => {
      if (a) return;
      ((a = !0), (output = chunk.toString()));
    }),
    await (
      await render(
        e(RenderOnceAndExit, {
          children: e(a0t.Provider, {
            value: !0,
            children: e(TerminalWriteProvider, { value: m, children: node }),
          }),
        }),
        { stdout: stream, patchConsole: !1 },
        { storageV5: storageV5 },
      )
    ).waitUntilExit(),
    output
  );
}

export { renderToAnsiString, a0t, RenderOnceAndExit, renderAndRun };
