/**
 * components/design-system/Byline.tsx
 *
 * 用 " · " 连接多个子元素的行内组件（被 140+ 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Byline.tsx
 * pieces: chunk-k1hxk1ex.js (5)
 * attribution: sole-consumer 4, callgraph-witnessed 1
 */
import {
  init_react_production,
  Kc,
  isValidElement_default,
  Fy,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-k1hxk1ex.js:380-384 sole-consumer
init_react_production();
//@ chunk-k1hxk1ex.js:384-388 sole-consumer
init_react_production();
//@ chunk-k1hxk1ex.js:388-416 sole-consumer
function isNonEmptyString(s) {
  return s !== "";
}
//@ chunk-k1hxk1ex.js:416-519 sole-consumer
function renderBylineItem(o, a) {
  return jsxProd_default_2(
    Kc,
    {
      children: [
        a > 0 &&
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          }),
        o,
      ],
    },
    isValidElement_default(o) ? (o.key ?? a) : a,
  );
}
//@ chunk-k1hxk1ex.js:519-790 callgraph-witnessed = Byline (0.375)
function Byline(props) {
  let $ = w(5);
  let { children } = props;
  let children_2;
  let t2;
  if ($[0] !== children) {
    t2 = EARLY_RETURN_SENTINEL;
    T: {
      let validChildren = Fy.toArray(children).filter(isNonEmptyString);
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
