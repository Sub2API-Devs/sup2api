/**
 * utils/staticRender.tsx
 *
 * 把 Ink 节点离屏渲染为 ANSI 字符串，或渲染一次后退出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/staticRender.tsx
 * pieces: chunk-0b83n7d5.js (5)
 * attribution: placement 3, callgraph-fingerprint 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { PassThrough } from "stream";
import {
  init_react_production,
  createContext,
  useLayoutEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useApp } from "../ink/components/Input.js";
import {
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { TerminalWriteProvider } from "../ink/useTerminalNotification.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0b83n7d5.js:417-421 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0b83n7d5.js:417", () => {
  init_react_production();
});
//@ chunk-0b83n7d5.js:458-472 placement
function noopElement() {}
//@ chunk-0b83n7d5.js:472-487 placement
/**
 * 离屏渲染用的存储上下文（storageV5 槽）。
 */
var staticRenderStorageSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0b83n7d5.js:472", () => {
  staticRenderStorageSlot = createContext(false);
});
//@ chunk-0b83n7d5.js:487-742 callgraph-fingerprint (2.1.88 match: RenderOnceAndExit, 1)
function RenderOnceAndExit(props) {
  let $ = useMemoCache(5);
  let { children } = props;
  let { exit } = useApp();
  let t1;
  let t2;
  if ($[0] !== exit) {
    t1 = () => {
      let timer = setTimeout(exit, 0);
      return () => clearTimeout(timer);
    };
    t2 = [exit];
    $[0] = exit;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useLayoutEffect(t1, t2);
  let t3;
  if ($[3] !== children) {
    t3 = jsxProd_default(Fragment, {
      children,
    });
    $[3] = children;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
//@ chunk-0b83n7d5.js:818-1128 fingerprint (2.1.88 match: renderToAnsiString, 0.915)
/**
 * 把 React/Ink 节点离屏渲染为 ANSI 字符串（导出、截图用）。
 */
async function renderToAnsiString(node, { columns, storageV5 }) {
  let output = "";
  let gotOutput = false;
  let stream = new PassThrough();
  if (columns !== undefined) stream.columns = columns;
  stream.on("data", (chunk) => {
    if (gotOutput) return;
    gotOutput = true;
    output = chunk.toString();
  });
  await (
    await render(
      jsxProd_default(RenderOnceAndExit, {
        children: jsxProd_default(staticRenderStorageSlot.Provider, {
          value: true,
          children: jsxProd_default(TerminalWriteProvider, {
            value: noopElement,
            children: node,
          }),
        }),
      }),
      {
        stdout: stream,
        patchConsole: false,
      },
      {
        storageV5,
      },
    )
  ).waitUntilExit();
  return output;
}
export { RenderOnceAndExit, renderToAnsiString, staticRenderStorageSlot };
