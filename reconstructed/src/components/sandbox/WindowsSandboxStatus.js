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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, suspenseTypeExport, use } from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-55w3ydvj.js:19789-20078 placement
function SandboxDepCheckLine(props) {
  let $ = useMemoCache(4);
  let { depCheck } = props;
  let [depCheckResult] = useState(probeSandboxDependencies);
  let fallback;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Checking Windows sandbox status\u2026",
    });
    $[0] = fallback;
  } else fallback = $[0];
  let statusElement;
  if ($[1] !== depCheck || $[2] !== depCheckResult) {
    statusElement = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(WindowsSandboxStatus, {
        statusPromise: depCheckResult,
        depCheck,
      }),
    });
    $[1] = depCheck;
    $[2] = depCheckResult;
    $[3] = statusElement;
  } else statusElement = $[3];
  return statusElement;
}
//@ chunk-55w3ydvj.js:20078-21857 placement
/**
 * 显示 Windows 沙箱状态与依赖检查结果。
 */
function WindowsSandboxStatus(props) {
  let $ = useMemoCache(10);
  let { statusPromise, depCheck } = props;
  let statusResult = use(statusPromise);
  let content;
  if ($[0] !== statusResult) {
    content =
      "probeError" in statusResult
        ? jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                color: "error",
                children: ["could not check sandbox status: ", statusResult.probeError],
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
                  statusResult.user.provisioned && statusResult.user.credPresent
                    ? jsxProd_default(Text, {
                        color: "success",
                        children: "provisioned",
                      })
                    : statusResult.user.provisioned
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
                  statusResult.wfp.state === "installed"
                    ? jsxProd_default(Text, {
                        color: "success",
                        children: "installed",
                      })
                    : statusResult.wfp.state === "cannot-read"
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
              statusResult.caTrusted !== null &&
                jsxProd_default_2(Text, {
                  children: [
                    "TLS inspection CA:",
                    " ",
                    statusResult.caTrusted
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
              (!statusResult.user.provisioned ||
                !statusResult.user.credPresent ||
                statusResult.wfp.state === "absent" ||
                (statusResult.caTrusted === false && statusResult.caManaged)) &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "\xB7 run /sandbox install"],
                }),
              statusResult.caTrusted === false &&
                !statusResult.caManaged &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "  ",
                    "\xB7 ask your administrator to trust the configured sandbox CA \u2014 see https://code.claude.com/docs/en/sandboxing",
                  ],
                }),
            ],
          });
    $[0] = statusResult;
    $[1] = content;
  } else content = $[1];
  let errorNotice;
  if ($[2] !== depCheck.errors || $[3] !== statusResult) {
    errorNotice =
      "probeError" in statusResult ? depCheck.errors : depCheck.errors.filter(isWindowsSandboxBlockingError);
    $[2] = depCheck.errors;
    $[3] = statusResult;
    $[4] = errorNotice;
  } else errorNotice = $[4];
  let body;
  if ($[5] !== errorNotice) {
    body = errorNotice.map(describeProbeResult).map(renderProbeError);
    $[5] = errorNotice;
    $[6] = body;
  } else body = $[6];
  let boxElement;
  if ($[7] !== content || $[8] !== body) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [content, body],
    });
    $[7] = content;
    $[8] = body;
    $[9] = boxElement;
  } else boxElement = $[9];
  return boxElement;
}
//@ chunk-55w3ydvj.js:21857-21900 placement
var WINDOWS_SANDBOX_DENIED_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-55w3ydvj.js:21857", () => {
  WINDOWS_SANDBOX_DENIED_ERRORS = new Set(["EACCES", "EPERM", "EROFS"]);
});
//@ chunk-55w3ydvj.js:21900-21932 placement
function describeWindowsSandboxState(state) {
  return toInlineCode(escapeControlCharsForDisplay(state));
}
//@ chunk-55w3ydvj.js:21932-22234 placement
function sandboxSettingsErrorText({ error }, fallback) {
  if (error === null) return fallback;
  let cause = error.cause instanceof Error ? error.cause : error;
  let errnoCode = getErrnoCode(cause);
  let causeErrno = getSettingsFilePathForSource("localSettings") ?? ".claude/settings.local.json";
  let path =
    errnoCode !== undefined && WINDOWS_SANDBOX_DENIED_ERRORS.has(errnoCode)
      ? " Start Claude Code in a project folder you can write to."
      : "";
  return `${SANDBOX_NOT_CHANGED_PREFIX}${describeWindowsSandboxState(causeErrno)} couldn't be updated (${describeWindowsSandboxState(errnoCode ?? cause.message)}).${path}`;
}
export { SandboxDepCheckLine, sandboxSettingsErrorText };
