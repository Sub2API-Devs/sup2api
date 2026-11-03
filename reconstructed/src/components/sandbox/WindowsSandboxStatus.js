/**
 * components/sandbox/WindowsSandboxStatus.tsx
 *
 * 2.1.316 新增：Windows 沙箱状态与依赖检查显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-55w3ydvj.js (5)
 * attribution: placement 5
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { To, isWindowsSandboxBlockingError, Ho, Uo } from "./SandboxDependenciesTab.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { toInlineCode, SANDBOX_NOT_CHANGED_PREFIX } from "../../commands/model/modelMessages.js";
import { Mu } from "../../utils/stringUtils.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";

//@ chunk-55w3ydvj.js:19789-20078 placement
function SandboxDepCheckLine(f) {
  let o = w(4),
    { depCheck: depCheck } = f,
    [l] = y(To),
    m;
  if (o[0] === MEMO_CACHE_SENTINEL)
    ((m = e(Text, { dimColor: !0, children: "Checking Windows sandbox status\u2026" })), (o[0] = m));
  else m = o[0];
  let u;
  if (o[1] !== depCheck || o[2] !== l)
    ((u = e(fo, {
      fallback: m,
      children: e(WindowsSandboxStatus, { statusPromise: l, depCheck: depCheck }),
    })),
      (o[1] = depCheck),
      (o[2] = l),
      (o[3] = u));
  else u = o[3];
  return u;
}
/**
 * 显示 Windows 沙箱状态与依赖检查结果。
 */
//@ chunk-55w3ydvj.js:20078-21857 placement
function WindowsSandboxStatus(f) {
  let m = w(10),
    { statusPromise: statusPromise, depCheck: depCheck } = f,
    o = Qr(statusPromise),
    u;
  if (m[0] !== o)
    ((u =
      "probeError" in o
        ? r(Box, {
            flexDirection: "column",
            children: [
              r(Text, { color: "error", children: ["could not check sandbox status: ", o.probeError] }),
              r(Text, {
                dimColor: !0,
                children: [
                  "  ",
                  "\xB7 ask your administrator to install the network filters, or see https://code.claude.com/docs/en/sandboxing",
                ],
              }),
            ],
          })
        : r(Box, {
            flexDirection: "column",
            children: [
              r(Text, {
                children: [
                  "sandbox user:",
                  " ",
                  o.user.provisioned && o.user.credPresent
                    ? e(Text, { color: "success", children: "provisioned" })
                    : o.user.provisioned
                      ? e(Text, { color: "warning", children: "provisioned \u2014 credential not readable" })
                      : e(Text, { color: "error", children: "not installed" }),
                ],
              }),
              r(Text, {
                children: [
                  "network filters (WFP):",
                  " ",
                  o.wfp.state === "installed"
                    ? e(Text, { color: "success", children: "installed" })
                    : o.wfp.state === "cannot-read"
                      ? e(Text, { color: "warning", children: "cannot read (run elevated to check)" })
                      : e(Text, { color: "error", children: "not installed" }),
                ],
              }),
              o.caTrusted !== null &&
                r(Text, {
                  children: [
                    "TLS inspection CA:",
                    " ",
                    o.caTrusted
                      ? e(Text, { color: "success", children: "trusted" })
                      : e(Text, { color: "error", children: "not trusted" }),
                  ],
                }),
              (!o.user.provisioned ||
                !o.user.credPresent ||
                o.wfp.state === "absent" ||
                (o.caTrusted === !1 && o.caManaged)) &&
                r(Text, { dimColor: !0, children: ["  ", "\xB7 run /sandbox install"] }),
              o.caTrusted === !1 &&
                !o.caManaged &&
                r(Text, {
                  dimColor: !0,
                  children: [
                    "  ",
                    "\xB7 ask your administrator to trust the configured sandbox CA \u2014 see https://code.claude.com/docs/en/sandboxing",
                  ],
                }),
            ],
          })),
      (m[0] = o),
      (m[1] = u));
  else u = m[1];
  let i;
  if (m[2] !== depCheck.errors || m[3] !== o)
    ((i = "probeError" in o ? depCheck.errors : depCheck.errors.filter(isWindowsSandboxBlockingError)),
      (m[2] = depCheck.errors),
      (m[3] = o),
      (m[4] = i));
  else i = m[4];
  let p;
  if (m[5] !== i) ((p = i.map(Ho).map(Uo)), (m[5] = i), (m[6] = p));
  else p = m[6];
  let a;
  if (m[7] !== u || m[8] !== p)
    ((a = r(Box, { flexDirection: "column", gap: 1, children: [u, p] })), (m[7] = u), (m[8] = p), (m[9] = a));
  else a = m[9];
  return a;
}
//@ chunk-55w3ydvj.js:21857-21900 placement
var $o = new Set(["EACCES", "EPERM", "EROFS"]);
//@ chunk-55w3ydvj.js:21900-21932 placement
function $e(f) {
  return toInlineCode(Mu(f));
}
//@ chunk-55w3ydvj.js:21932-22234 placement
function sandboxSettingsErrorText({ error: error }, t) {
  if (error === null) return t;
  let l = error.cause instanceof Error ? error.cause : error,
    o = getErrnoCode(l),
    m = getSettingsFilePathForSource("localSettings") ?? ".claude/settings.local.json",
    u = o !== void 0 && $o.has(o) ? " Start Claude Code in a project folder you can write to." : "";
  return `${SANDBOX_NOT_CHANGED_PREFIX}${$e(m)} couldn't be updated (${$e(o ?? l.message)}).${u}`;
}

export { SandboxDepCheckLine, sandboxSettingsErrorText };
