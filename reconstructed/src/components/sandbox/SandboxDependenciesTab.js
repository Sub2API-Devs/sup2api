/**
 * components/sandbox/SandboxDependenciesTab.tsx
 *
 * /sandbox 依赖检查：ripgrep、bubblewrap、socat、seatbelt、Windows WFP 等是否就绪与安装提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/sandbox/SandboxDependenciesTab.tsx
 * pieces: chunk-55w3ydvj.js (14), chunk-rtnapjwv.js (1)
 * attribution: placement 1, fingerprint 3, layout 9, callgraph-fingerprint 1, file-local 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  willSandboxTlsTerminate,
  isInstalledWindowsTlsCaCurrent,
  resolveWindowsTlsTerminateCaSource,
} from "../../utils/sandbox/sandbox-adapter.js";
import { describeWindowsSandboxRemedy, tD } from "../../utils/sandbox/windowsSandbox.js";
import { errorMessage } from "../../utils/errors.js";
import { checkWindowsSandboxStatusAsync } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getPlatform } from "../../utils/platform.js";
import { SandboxDepCheckLine } from "./WindowsSandboxStatus.js";
import { dyr } from "../../utils/subprocessEnv.js";
import { w0 } from "../../utils/which.js";

//@ chunk-55w3ydvj.js:16494-16498 placement
j();
//@ chunk-55w3ydvj.js:16498-16542 fingerprint = _temp (1)
function Ao(e) {
  return e.includes("ripgrep");
}
//@ chunk-55w3ydvj.js:16542-16589 layout
function Wo(q) {
  return q.startsWith(`${H}not `);
}
//@ chunk-55w3ydvj.js:16589-16638 layout
function vo(ne) {
  return ne.startsWith(`${U}not `);
}
//@ chunk-55w3ydvj.js:16638-16736 callgraph-fingerprint = _temp4 (0.413)
function Do(e_2) {
  return !e_2.includes("ripgrep") && !e_2.startsWith(`${H}not `) && !e_2.startsWith(`${U}not `);
}
//@ chunk-55w3ydvj.js:16736-16792 file-local
function Eo(err) {
  return e(Text, { color: "error", children: err }, err);
}
//@ chunk-55w3ydvj.js:16792-16955 layout
function withWindowsTlsCaStatus(i) {
  let p = null;
  let a = !0;
  if (willSandboxTlsTerminate())
    ((p = i.user.caCertThumb !== void 0 && isInstalledWindowsTlsCaCurrent(i.user.caCertThumb)),
      (a = resolveWindowsTlsTerminateCaSource().source === "managed"));
  return { ...i, caTrusted: p, caManaged: a };
}
//@ chunk-55w3ydvj.js:16955-17016 layout
function Mo(c) {
  return { probeError: describeWindowsSandboxRemedy(errorMessage(c), { omitCcRemedy: !0 }) };
}
//@ chunk-55w3ydvj.js:17016-17075 layout
function To() {
  return checkWindowsSandboxStatusAsync({ srtWin: tD() }).then(withWindowsTlsCaStatus).catch(Mo);
}
//@ chunk-55w3ydvj.js:17075-17189 layout
function isWindowsSandboxBlockingError(c) {
  return !c.startsWith("Sandbox user is not provisioned") && !c.startsWith("WFP filters not installed");
}
//@ chunk-55w3ydvj.js:17189-17217 layout
function Ho(C) {
  return describeWindowsSandboxRemedy(C);
}
//@ chunk-55w3ydvj.js:17217-17273 layout
function Uo(g) {
  return e(Text, { color: "error", children: g }, g);
}
//@ chunk-55w3ydvj.js:17273-17331 layout
var H = "bubblewrap (bwrap) ",
  U = "socat ",
  ee = "not installed";
//@ chunk-55w3ydvj.js:17331-19789 fingerprint = SandboxDependenciesTab (0.369)
function SandboxDependenciesTab(t0) {
  let $ = w(26),
    { depCheck: depCheck } = t0,
    o;
  if ($[0] === MEMO_CACHE_SENTINEL) ((o = getPlatform()), ($[0] = o));
  else o = $[0];
  let m = o,
    u = m === "macos";
  if (m === "windows") {
    let i;
    if ($[1] !== depCheck)
      ((i = e(SandboxDepCheckLine, { depCheck: depCheck })), ($[1] = depCheck), ($[2] = i));
    else i = $[2];
    return i;
  }
  let i;
  if ($[3] !== depCheck.errors) ((i = depCheck.errors.some(Ao)), ($[3] = depCheck.errors), ($[4] = i));
  else i = $[4];
  let p = i,
    a;
  if ($[5] !== depCheck.errors)
    ((a = depCheck.errors.find(Wo)?.slice(H.length)), ($[5] = depCheck.errors), ($[6] = a));
  else a = $[6];
  let c = a,
    C;
  if ($[7] !== depCheck.errors)
    ((C = depCheck.errors.find(vo)?.slice(U.length)), ($[7] = depCheck.errors), ($[8] = C));
  else C = $[8];
  let g = C,
    b = depCheck.warnings.length > 0,
    x;
  if ($[9] !== c || $[10] !== depCheck.errors || $[11] !== p || $[12] !== b || $[13] !== g) {
    let otherErrors = depCheck.errors.filter(Do);
    let rgInstallHint = u ? "brew install ripgrep" : "apt install ripgrep";
    let v;
    if ($[15] === MEMO_CACHE_SENTINEL)
      ((v =
        u &&
        e(Box, {
          flexDirection: "column",
          children: r(Text, {
            children: ["seatbelt: ", e(Text, { color: "success", children: "built-in (macOS)" })],
          }),
        })),
        ($[15] = v));
    else v = $[15];
    let D, R;
    if ($[16] !== p)
      ((D = r(Text, {
        children: [
          "ripgrep (rg):",
          " ",
          p
            ? e(Text, { color: "error", children: "not found" })
            : e(Text, { color: "success", children: "found" }),
        ],
      })),
        (R = p && r(Text, { dimColor: !0, children: ["  ", "\xB7 ", rgInstallHint] })),
        ($[16] = p),
        ($[17] = D),
        ($[18] = R));
    else ((D = $[17]), (R = $[18]));
    let A;
    if ($[19] !== D || $[20] !== R)
      ((A = r(Box, { flexDirection: "column", children: [D, R] })), ($[19] = D), ($[20] = R), ($[21] = A));
    else A = $[21];
    let G;
    if ($[22] !== c || $[23] !== b || $[24] !== g)
      ((G =
        !u &&
        r(Fragment, {
          children: [
            r(Box, {
              flexDirection: "column",
              children: [
                r(Text, {
                  children: [
                    "bubblewrap (bwrap):",
                    " ",
                    c !== void 0
                      ? e(Text, { color: "error", children: c })
                      : e(Text, { color: "success", children: "installed" }),
                  ],
                }),
                c === ee && r(Text, { dimColor: !0, children: ["  ", "\xB7 apt install bubblewrap"] }),
              ],
            }),
            r(Box, {
              flexDirection: "column",
              children: [
                r(Text, {
                  children: [
                    "socat:",
                    " ",
                    g !== void 0
                      ? e(Text, { color: "error", children: g })
                      : e(Text, { color: "success", children: "installed" }),
                  ],
                }),
                g === ee && r(Text, { dimColor: !0, children: ["  ", "\xB7 apt install socat"] }),
              ],
            }),
            r(Box, {
              flexDirection: "column",
              children: [
                r(Text, {
                  children: [
                    "seccomp filter:",
                    " ",
                    b
                      ? e(Text, { color: "warning", children: "not installed" })
                      : e(Text, { color: "success", children: "installed" }),
                    b && e(Text, { dimColor: !0, children: " (required to block unix domain sockets)" }),
                  ],
                }),
                b &&
                  r(Box, {
                    flexDirection: "column",
                    children: [
                      r(Text, {
                        dimColor: !0,
                        children: ["  ", "\xB7 npm install -g @anthropic-ai/sandbox-runtime"],
                      }),
                      r(Text, {
                        dimColor: !0,
                        children: ["  ", "\xB7 or copy vendor/seccomp/* from sandbox-runtime and set"],
                      }),
                      r(Text, {
                        dimColor: !0,
                        children: ["    ", "sandbox.seccomp.bpfPath and applyPath in settings.json"],
                      }),
                    ],
                  }),
              ],
            }),
          ],
        })),
        ($[22] = c),
        ($[23] = b),
        ($[24] = g),
        ($[25] = G));
    else G = $[25];
    x = r(Box, { flexDirection: "column", gap: 1, children: [v, A, G, otherErrors.map(Eo)] });
    (($[9] = c), ($[10] = depCheck.errors), ($[11] = p), ($[12] = b), ($[13] = g), ($[14] = x));
  } else x = $[14];
  return x;
}
//@ chunk-rtnapjwv.js:2100-2164 fingerprint = _temp2 (1)
function NPn() {
  let e = dyr();
  if (e) return w0(e);
  return w0("bwrap");
}

export { NPn, To, isWindowsSandboxBlockingError, Ho, Uo, SandboxDependenciesTab };
