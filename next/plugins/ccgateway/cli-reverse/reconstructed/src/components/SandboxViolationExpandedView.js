/**
 * components/SandboxViolationExpandedView.tsx
 *
 * 沙箱拦截记录的展开视图（"⧈ Sandbox blocked N operations"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SandboxViolationExpandedView.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: fingerprint 2, placement 2
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { formatClockTime } from "../bridge/bridgeStatusUtil.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useState, useEffect, init_react_production } from "../../vendor/react/cjs/react.production.js";
import { SandboxManager } from "../utils/sandbox/sandbox-adapter.js";
import { getPlatform } from "../utils/platform.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:107469-107652 fingerprint (2.1.88 match: _temp, 1)
function renderViolationLine(v, i) {
  return jsxProd_default(
    Box,
    {
      paddingLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [formatClockTime(v.timestamp), v.command ? ` ${v.command}:` : "", " ", v.line],
      }),
    },
    `${v.timestamp.getTime()}-${i}`,
  );
}
//@ chunk-18hwfzwa.js:107833-108843 fingerprint (2.1.88 match: SandboxViolationExpandedView, 0.667)
function SandboxViolationExpandedView() {
  let $ = useMemoCache(15);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = [];
    $[0] = t0;
  } else t0 = $[0];
  let [violations, setViolations] = useState(t0);
  let [totalCount, setTotalCount] = useState(0);
  let t1;
  let t2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t1 = () => {
      let store = SandboxManager.getSandboxViolationStore();
      return store.subscribe((allViolations) => {
        setViolations(allViolations.slice(-10));
        setTotalCount(store.getTotalCount());
      });
    };
    t2 = [];
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useEffect(t1, t2);
  if (!SandboxManager.isSandboxingEnabled() || getPlatform() === "linux") {
    return null;
  }
  if (totalCount === 0) {
    return null;
  }
  const t3 = totalCount === 1 ? "operation" : "operations";
  let t4;
  if ($[3] !== t3 || $[4] !== totalCount) {
    t4 = jsxProd_default(Box, {
      marginLeft: 0,
      children: jsxProd_default_2(Text, {
        color: "permission",
        children: ["\u29C8 Sandbox blocked ", totalCount, " total", " ", t3],
      }),
    });
    $[3] = t3;
    $[4] = totalCount;
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  if ($[6] !== violations) {
    t5 = violations.map(renderViolationLine);
    $[6] = violations;
    $[7] = t5;
  } else t5 = $[7];
  const min = Math.min(10, violations.length);
  let t7;
  if ($[8] !== min || $[9] !== totalCount) {
    t7 = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 showing last ", min, " of ", totalCount],
      }),
    });
    $[8] = min;
    $[9] = totalCount;
    $[10] = t7;
  } else t7 = $[10];
  let t8;
  if ($[11] !== t4 || $[12] !== t5 || $[13] !== t7) {
    t8 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [t4, t5, t7],
    });
    $[11] = t4;
    $[12] = t5;
    $[13] = t7;
    $[14] = t8;
  } else t8 = $[14];
  return t8;
}
//@ chunk-18hwfzwa.js:108843-108847 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:108843", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:108847-108851 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:108847", () => {
  init_react_production();
});
export { SandboxViolationExpandedView };
