/**
 * components/design-system/Byline.tsx
 *
 * 用 " · " 连接多个子元素的行内组件（被 140+ 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Byline.tsx
 * pieces: chunk-3ne3bnw4.js (4)
 * attribution: placement 3, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, childrenExport } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { renderBylineItem } from "../Spinner/SpinnerAnimationRow.js";
import {
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3ne3bnw4.js:381-385 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3ne3bnw4.js:381", () => {
  init_react_production();
});
//@ chunk-3ne3bnw4.js:385-389 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3ne3bnw4.js:385", () => {
  init_react_production();
});
//@ chunk-3ne3bnw4.js:389-417 placement
function isNonEmptyString(text) {
  return text !== "";
}
//@ chunk-3ne3bnw4.js:520-792 callgraph-witnessed (2.1.88 match: Byline, 0.375)
function Byline(props) {
  let $ = useMemoCache(5);
  let { children } = props;
  let children_2;
  let t2;
  if ($[0] !== children) {
    t2 = EARLY_RETURN_SENTINEL;
    T: {
      let validChildren = childrenExport.toArray(children).filter(isNonEmptyString);
      if (validChildren.length === 0) {
        t2 = null;
        break T;
      }
      children_2 = validChildren.map(renderBylineItem);
    }
    $[0] = children;
    $[1] = children_2;
    $[2] = t2;
  } else {
    children_2 = $[1];
    t2 = $[2];
  }
  if (t2 !== EARLY_RETURN_SENTINEL) return t2;
  let t3;
  if ($[3] !== children_2) {
    t3 = jsxProd_default(Fragment, {
      children: children_2,
    });
    $[3] = children_2;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
export { Byline };
