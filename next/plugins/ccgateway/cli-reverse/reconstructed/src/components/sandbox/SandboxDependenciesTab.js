/**
 * components/sandbox/SandboxDependenciesTab.tsx
 *
 * /sandbox 依赖检查：ripgrep、bubblewrap、socat、seatbelt、Windows WFP 等是否就绪与安装提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/sandbox/SandboxDependenciesTab.tsx
 * pieces: chunk-ex0jqs9a.js (1), chunk-y07105e8.js (14)
 * attribution: fingerprint 3, placement 1, layout 9, callgraph-fingerprint 1, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSandboxBwrapPath } from "../../utils/subprocessEnv.js";
import { bunWhichSync } from "../../utils/which.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  willSandboxTlsTerminate,
  isInstalledWindowsTlsCaCurrent,
  resolveWindowsTlsTerminateCaSource,
} from "../../utils/sandbox/sandbox-adapter.js";
import { describeWindowsSandboxRemedy, rgRunner } from "../../utils/sandbox/windowsSandbox.js";
import { errorMessage } from "../../utils/errors.js";
import { checkWindowsSandboxStatusAsync } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getPlatform } from "../../utils/platform.js";
import { SandboxDepCheckLine } from "./WindowsSandboxStatus.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ex0jqs9a.js:2100-2164 fingerprint (2.1.88 match: _temp2, 1)
/**
 * 函数 sandboxBinaryPath（取沙箱二进制路径）；位于「/sandbox 依赖检查：ripgrep、bubblewrap、socat、seatbelt、Windows WFP 等是否就绪与安装提示」模块。
 */
function sandboxBinaryPath() {
  let sandboxBwrapPath = getSandboxBwrapPath();
  if (sandboxBwrapPath) return bunWhichSync(sandboxBwrapPath);
  return bunWhichSync("bwrap");
}
//@ chunk-y07105e8.js:17671-17675 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y07105e8.js:17671", () => {
  init_react_production();
});
//@ chunk-y07105e8.js:17675-17719 fingerprint (2.1.88 match: _temp, 1)
function hasRipgrep(e) {
  return e.includes("ripgrep");
}
//@ chunk-y07105e8.js:17719-17766 layout
function isBubblewrapMissing(output) {
  return output.startsWith(`${BWRAP_LABEL}not `);
}
//@ chunk-y07105e8.js:17766-17815 layout
function isSocatMissing(output) {
  return output.startsWith(`${SOCAT_LABEL}not `);
}
//@ chunk-y07105e8.js:17815-17913 callgraph-fingerprint (2.1.88 match: _temp4, 0.413)
function isOtherMissingDep(e_2) {
  return (
    !e_2.includes("ripgrep") && !e_2.startsWith(`${BWRAP_LABEL}not `) && !e_2.startsWith(`${SOCAT_LABEL}not `)
  );
}
//@ chunk-y07105e8.js:17913-17969 file-local
function renderErrorLine(err) {
  return jsxProd_default(
    Text,
    {
      color: "error",
      children: err,
    },
    err,
  );
}
//@ chunk-y07105e8.js:17969-18132 layout
function withWindowsTlsCaStatus(state) {
  let caTrusted = null;
  let caManaged = true;
  if (willSandboxTlsTerminate()) {
    caTrusted =
      state.user.caCertThumb !== undefined && isInstalledWindowsTlsCaCurrent(state.user.caCertThumb);
    caManaged = resolveWindowsTlsTerminateCaSource().source === "managed";
  }
  return {
    ...state,
    caTrusted,
    caManaged,
  };
}
//@ chunk-y07105e8.js:18132-18193 layout
function probeErrorResult(error) {
  return {
    probeError: describeWindowsSandboxRemedy(errorMessage(error), {
      omitCcRemedy: true,
    }),
  };
}
//@ chunk-y07105e8.js:18193-18252 layout
function probeSandboxDependencies() {
  return checkWindowsSandboxStatusAsync({
    srtWin: rgRunner(),
  })
    .then(withWindowsTlsCaStatus)
    .catch(probeErrorResult);
}
//@ chunk-y07105e8.js:18252-18366 layout
function isWindowsSandboxBlockingError(message) {
  return (
    !message.startsWith("Sandbox user is not provisioned") && !message.startsWith("WFP filters not installed")
  );
}
//@ chunk-y07105e8.js:18366-18394 layout
function describeProbeResult(output) {
  return describeWindowsSandboxRemedy(output);
}
//@ chunk-y07105e8.js:18394-18450 layout
function renderProbeError(err) {
  return jsxProd_default(
    Text,
    {
      color: "error",
      children: err,
    },
    err,
  );
}
//@ chunk-y07105e8.js:18450-18507 layout
var BWRAP_LABEL = "bubblewrap (bwrap) ";
var SOCAT_LABEL = "socat ";
var NOT_INSTALLED_LABEL = "not installed";
//@ chunk-y07105e8.js:18507-20964 fingerprint (2.1.88 match: SandboxDependenciesTab, 0.369)
function SandboxDependenciesTab(props) {
  let $ = useMemoCache(26);
  let { depCheck } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = getPlatform();
    $[0] = t1;
  } else t1 = $[0];
  let platform = t1;
  let isMac = platform === "macos";
  if (platform === "windows") {
    let t2;
    if ($[1] !== depCheck) {
      t2 = jsxProd_default(SandboxDepCheckLine, {
        depCheck,
      });
      $[1] = depCheck;
      $[2] = t2;
    } else t2 = $[2];
    return t2;
  }
  let t3;
  if ($[3] !== depCheck.errors) {
    t3 = depCheck.errors.some(hasRipgrep);
    $[3] = depCheck.errors;
    $[4] = t3;
  } else t3 = $[4];
  let socatLine = t3;
  let t4;
  if ($[5] !== depCheck.errors) {
    t4 = depCheck.errors.find(isBubblewrapMissing)?.slice(BWRAP_LABEL.length);
    $[5] = depCheck.errors;
    $[6] = t4;
  } else t4 = $[6];
  let bwrapMissing = t4;
  let socatReason;
  if ($[7] !== depCheck.errors) {
    socatReason = depCheck.errors.find(isSocatMissing)?.slice(SOCAT_LABEL.length);
    $[7] = depCheck.errors;
    $[8] = socatReason;
  } else socatReason = $[8];
  let socatMissing = socatReason;
  let seccompMissing = depCheck.warnings.length > 0;
  let t5;
  if (
    $[9] !== bwrapMissing ||
    $[10] !== depCheck.errors ||
    $[11] !== socatLine ||
    $[12] !== seccompMissing ||
    $[13] !== socatMissing
  ) {
    let otherErrors = depCheck.errors.filter(isOtherMissingDep);
    let rgInstallHint = isMac ? "brew install ripgrep" : "apt install ripgrep";
    let t6;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      t6 =
        isMac &&
        jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default_2(Text, {
            children: [
              "seatbelt: ",
              jsxProd_default(Text, {
                color: "success",
                children: "built-in (macOS)",
              }),
            ],
          }),
        });
      $[15] = t6;
    } else t6 = $[15];
    let t7;
    let t8;
    if ($[16] !== socatLine) {
      t7 = jsxProd_default_2(Text, {
        children: [
          "ripgrep (rg):",
          " ",
          socatLine
            ? jsxProd_default(Text, {
                color: "error",
                children: "not found",
              })
            : jsxProd_default(Text, {
                color: "success",
                children: "found",
              }),
        ],
      });
      t8 =
        socatLine &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 ", rgInstallHint],
        });
      $[16] = socatLine;
      $[17] = t7;
      $[18] = t8;
    } else {
      t7 = $[17];
      t8 = $[18];
    }
    let t9;
    if ($[19] !== t7 || $[20] !== t8) {
      t9 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t7, t8],
      });
      $[19] = t7;
      $[20] = t8;
      $[21] = t9;
    } else t9 = $[21];
    let t10;
    if ($[22] !== bwrapMissing || $[23] !== seccompMissing || $[24] !== socatMissing) {
      t10 =
        !isMac &&
        jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default_2(Text, {
                  children: [
                    "bubblewrap (bwrap):",
                    " ",
                    bwrapMissing !== undefined
                      ? jsxProd_default(Text, {
                          color: "error",
                          children: bwrapMissing,
                        })
                      : jsxProd_default(Text, {
                          color: "success",
                          children: "installed",
                        }),
                  ],
                }),
                bwrapMissing === NOT_INSTALLED_LABEL &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["  ", "\xB7 apt install bubblewrap"],
                  }),
              ],
            }),
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default_2(Text, {
                  children: [
                    "socat:",
                    " ",
                    socatMissing !== undefined
                      ? jsxProd_default(Text, {
                          color: "error",
                          children: socatMissing,
                        })
                      : jsxProd_default(Text, {
                          color: "success",
                          children: "installed",
                        }),
                  ],
                }),
                socatMissing === NOT_INSTALLED_LABEL &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["  ", "\xB7 apt install socat"],
                  }),
              ],
            }),
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default_2(Text, {
                  children: [
                    "seccomp filter:",
                    " ",
                    seccompMissing
                      ? jsxProd_default(Text, {
                          color: "warning",
                          children: "not installed",
                        })
                      : jsxProd_default(Text, {
                          color: "success",
                          children: "installed",
                        }),
                    seccompMissing &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: " (required to block unix domain sockets)",
                      }),
                  ],
                }),
                seccompMissing &&
                  jsxProd_default_2(Box, {
                    flexDirection: "column",
                    children: [
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: ["  ", "\xB7 npm install -g @anthropic-ai/sandbox-runtime"],
                      }),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: ["  ", "\xB7 or copy vendor/seccomp/* from sandbox-runtime and set"],
                      }),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: ["    ", "sandbox.seccomp.bpfPath and applyPath in settings.json"],
                      }),
                    ],
                  }),
              ],
            }),
          ],
        });
      $[22] = bwrapMissing;
      $[23] = seccompMissing;
      $[24] = socatMissing;
      $[25] = t10;
    } else t10 = $[25];
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t6, t9, t10, otherErrors.map(renderErrorLine)],
    });
    $[9] = bwrapMissing;
    $[10] = depCheck.errors;
    $[11] = socatLine;
    $[12] = seccompMissing;
    $[13] = socatMissing;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
}
export {
  sandboxBinaryPath,
  probeSandboxDependencies,
  isWindowsSandboxBlockingError,
  describeProbeResult,
  renderProbeError,
  SandboxDependenciesTab,
};
