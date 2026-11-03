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
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { formatClockTime } from "../bridge/bridgeStatusUtil.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { y, P, j } from "../../vendor/react/cjs/react.production.js";
import { SandboxManager } from "../utils/sandbox/sandbox-adapter.js";
import { getPlatform } from "../utils/platform.js";

//@ chunk-18hwfzwa.js:107469-107652 fingerprint = _temp (1)
function renderViolationLine(v, i) {
  return e(
    Box,
    {
      paddingLeft: 2,
      children: r(Text, {
        dimColor: !0,
        children: [formatClockTime(v.timestamp), v.command ? ` ${v.command}:` : "", " ", v.line],
      }),
    },
    `${v.timestamp.getTime()}-${i}`,
  );
}
//@ chunk-18hwfzwa.js:107833-108843 fingerprint = SandboxViolationExpandedView (0.667)
function SandboxViolationExpandedView() {
  let $ = w(15),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL) ((x = []), ($[0] = x));
  else x = $[0];
  let [D, L] = y(x),
    [ee, ke] = y(0),
    Re,
    Be;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((Re = () => {
      let store = SandboxManager.getSandboxViolationStore();
      return store.subscribe((allViolations) => {
        (L(allViolations.slice(-10)), ke(store.getTotalCount()));
      });
    }),
      (Be = []),
      ($[1] = Re),
      ($[2] = Be));
  else ((Re = $[1]), (Be = $[2]));
  if ((P(Re, Be), !SandboxManager.isSandboxingEnabled() || getPlatform() === "linux")) {
    return null;
  }
  if (ee === 0) {
    return null;
  }
  const t3 = ee === 1 ? "operation" : "operations";
  let Xe;
  if ($[3] !== t3 || $[4] !== ee)
    ((Xe = e(Box, {
      marginLeft: 0,
      children: r(Text, {
        color: "permission",
        children: ["\u29C8 Sandbox blocked ", ee, " total", " ", t3],
      }),
    })),
      ($[3] = t3),
      ($[4] = ee),
      ($[5] = Xe));
  else Xe = $[5];
  let rt;
  if ($[6] !== D) ((rt = D.map(renderViolationLine)), ($[6] = D), ($[7] = rt));
  else rt = $[7];
  const t6 = Math.min(10, D.length);
  let At;
  if ($[8] !== t6 || $[9] !== ee)
    ((At = e(Box, {
      paddingLeft: 2,
      children: r(Text, { dimColor: !0, children: ["\u2026 showing last ", t6, " of ", ee] }),
    })),
      ($[8] = t6),
      ($[9] = ee),
      ($[10] = At));
  else At = $[10];
  let It;
  if ($[11] !== Xe || $[12] !== rt || $[13] !== At)
    ((It = r(Box, { flexDirection: "column", marginTop: 1, children: [Xe, rt, At] })),
      ($[11] = Xe),
      ($[12] = rt),
      ($[13] = At),
      ($[14] = It));
  else It = $[14];
  return It;
}
//@ chunk-18hwfzwa.js:108843-108847 placement
j();
//@ chunk-18hwfzwa.js:108847-108851 placement
j();

export { SandboxViolationExpandedView };
