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
import {
  probeSandboxDependencies,
  isWindowsSandboxBlockingError,
  describeProbeResult,
  renderProbeError,
} from "./SandboxDependenciesTab.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { toInlineCode, SANDBOX_NOT_CHANGED_PREFIX } from "../../commands/model/modelMessages.js";
import { escapeControlCharsForDisplay } from "../../utils/stringUtils.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";

//@ chunk-55w3ydvj.js:19789-20078 placement
function SandboxDepCheckLine(props) {
  let o = w(4);
  let { depCheck } = props;
  let [l] = y(probeSandboxDependencies);
  let fallback;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Checking Windows sandbox status\u2026",
    });
    o[0] = fallback;
  } else fallback = o[0];
  let u;
  if (o[1] !== depCheck || o[2] !== l) {
    u = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(WindowsSandboxStatus, {
        statusPromise: l,
        depCheck,
      }),
    });
    o[1] = depCheck;
    o[2] = l;
    o[3] = u;
  } else u = o[3];
  return u;
}
//@ chunk-55w3ydvj.js:20078-21857 placement
/**
 * 显示 Windows 沙箱状态与依赖检查结果。
 */
function WindowsSandboxStatus(props) {
  let m = w(10);
  let { statusPromise, depCheck } = props;
  let o = Qr(statusPromise);
  let u;
  if (m[0] !== o) {
    u =
      "probeError" in o
        ? jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                color: "error",
                children: ["could not check sandbox status: ", o.probeError],
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "  ",
                  "\xB7 ask your administrator to install the network filters, or see https://code.claude.com/docs/en/sandboxing",
                ],
              }),
            ],
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                children: [
                  "sandbox user:",
                  " ",
                  o.user.provisioned && o.user.credPresent
                    ? jsxProd_default(Text, {
                        color: "success",
                        children: "provisioned",
                      })
                    : o.user.provisioned
                      ? jsxProd_default(Text, {
                          color: "warning",
                          children: "provisioned \u2014 credential not readable",
                        })
                      : jsxProd_default(Text, {
                          color: "error",
                          children: "not installed",
                        }),
                ],
              }),
              jsxProd_default_2(Text, {
                children: [
                  "network filters (WFP):",
                  " ",
                  o.wfp.state === "installed"
                    ? jsxProd_default(Text, {
                        color: "success",
                        children: "installed",
                      })
                    : o.wfp.state === "cannot-read"
                      ? jsxProd_default(Text, {
                          color: "warning",
                          children: "cannot read (run elevated to check)",
                        })
                      : jsxProd_default(Text, {
                          color: "error",
                          children: "not installed",
                        }),
                ],
              }),
              o.caTrusted !== null &&
                jsxProd_default_2(Text, {
                  children: [
                    "TLS inspection CA:",
                    " ",
                    o.caTrusted
                      ? jsxProd_default(Text, {
                          color: "success",
                          children: "trusted",
                        })
                      : jsxProd_default(Text, {
                          color: "error",
                          children: "not trusted",
                        }),
                  ],
                }),
              (!o.user.provisioned ||
                !o.user.credPresent ||
                o.wfp.state === "absent" ||
                (o.caTrusted === false && o.caManaged)) &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "\xB7 run /sandbox install"],
                }),
              o.caTrusted === false &&
                !o.caManaged &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "  ",
                    "\xB7 ask your administrator to trust the configured sandbox CA \u2014 see https://code.claude.com/docs/en/sandboxing",
                  ],
                }),
            ],
          });
    m[0] = o;
    m[1] = u;
  } else u = m[1];
  let i;
  if (m[2] !== depCheck.errors || m[3] !== o) {
    i = "probeError" in o ? depCheck.errors : depCheck.errors.filter(isWindowsSandboxBlockingError);
    m[2] = depCheck.errors;
    m[3] = o;
    m[4] = i;
  } else i = m[4];
  let p;
  if (m[5] !== i) {
    p = i.map(describeProbeResult).map(renderProbeError);
    m[5] = i;
    m[6] = p;
  } else p = m[6];
  let a;
  if (m[7] !== u || m[8] !== p) {
    a = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [u, p],
    });
    m[7] = u;
    m[8] = p;
    m[9] = a;
  } else a = m[9];
  return a;
}
//@ chunk-55w3ydvj.js:21857-21900 placement
var WINDOWS_SANDBOX_DENIED_ERRORS = new Set(["EACCES", "EPERM", "EROFS"]);
//@ chunk-55w3ydvj.js:21900-21932 placement
function describeWindowsSandboxState(f) {
  return toInlineCode(escapeControlCharsForDisplay(f));
}
//@ chunk-55w3ydvj.js:21932-22234 placement
function sandboxSettingsErrorText({ error }, t) {
  if (error === null) return t;
  let l = error.cause instanceof Error ? error.cause : error;
  let errnoCode = getErrnoCode(l);
  let m = getSettingsFilePathForSource("localSettings") ?? ".claude/settings.local.json";
  let u =
    errnoCode !== undefined && WINDOWS_SANDBOX_DENIED_ERRORS.has(errnoCode)
      ? " Start Claude Code in a project folder you can write to."
      : "";
  return `${SANDBOX_NOT_CHANGED_PREFIX}${describeWindowsSandboxState(m)} couldn't be updated (${describeWindowsSandboxState(errnoCode ?? l.message)}).${u}`;
}
export { SandboxDepCheckLine, sandboxSettingsErrorText };
