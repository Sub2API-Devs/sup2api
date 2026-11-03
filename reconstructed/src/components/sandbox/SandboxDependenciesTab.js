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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getPlatform } from "../../utils/platform.js";
import { SandboxDepCheckLine } from "./WindowsSandboxStatus.js";
import { getSandboxBwrapPath } from "../../utils/subprocessEnv.js";
import { bunWhichSync } from "../../utils/which.js";

//@ chunk-55w3ydvj.js:16494-16498 placement
init_react_production();
//@ chunk-55w3ydvj.js:16498-16542 fingerprint = _temp (1)
function hasRipgrep(e) {
  return e.includes("ripgrep");
}
//@ chunk-55w3ydvj.js:16542-16589 layout
function isBubblewrapMissing(q) {
  return q.startsWith(`${BWRAP_LABEL}not `);
}
//@ chunk-55w3ydvj.js:16589-16638 layout
function isSocatMissing(ne) {
  return ne.startsWith(`${SOCAT_LABEL}not `);
}
//@ chunk-55w3ydvj.js:16638-16736 callgraph-fingerprint = _temp4 (0.413)
function isOtherMissingDep(e_2) {
  return (
    !e_2.includes("ripgrep") && !e_2.startsWith(`${BWRAP_LABEL}not `) && !e_2.startsWith(`${SOCAT_LABEL}not `)
  );
}
//@ chunk-55w3ydvj.js:16736-16792 file-local
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
//@ chunk-55w3ydvj.js:16792-16955 layout
function withWindowsTlsCaStatus(i) {
  let caTrusted = null;
  let caManaged = true;
  if (willSandboxTlsTerminate()) {
    caTrusted = i.user.caCertThumb !== undefined && isInstalledWindowsTlsCaCurrent(i.user.caCertThumb);
    caManaged = resolveWindowsTlsTerminateCaSource().source === "managed";
  }
  return {
    ...i,
    caTrusted,
    caManaged,
  };
}
//@ chunk-55w3ydvj.js:16955-17016 layout
function probeErrorResult(c) {
  return {
    probeError: describeWindowsSandboxRemedy(errorMessage(c), {
      omitCcRemedy: true,
    }),
  };
}
//@ chunk-55w3ydvj.js:17016-17075 layout
function probeSandboxDependencies() {
  return checkWindowsSandboxStatusAsync({
    srtWin: rgRunner(),
  })
    .then(withWindowsTlsCaStatus)
    .catch(probeErrorResult);
}
//@ chunk-55w3ydvj.js:17075-17189 layout
function isWindowsSandboxBlockingError(c) {
  return !c.startsWith("Sandbox user is not provisioned") && !c.startsWith("WFP filters not installed");
}
//@ chunk-55w3ydvj.js:17189-17217 layout
function describeProbeResult(C) {
  return describeWindowsSandboxRemedy(C);
}
//@ chunk-55w3ydvj.js:17217-17273 layout
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
//@ chunk-55w3ydvj.js:17273-17331 layout
var BWRAP_LABEL = "bubblewrap (bwrap) ";
var SOCAT_LABEL = "socat ";
var NOT_INSTALLED_LABEL = "not installed";
//@ chunk-55w3ydvj.js:17331-19789 fingerprint = SandboxDependenciesTab (0.369)
function SandboxDependenciesTab(props) {
  let $ = w(26);
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
  let p = t3;
  let t4;
  if ($[5] !== depCheck.errors) {
    t4 = depCheck.errors.find(isBubblewrapMissing)?.slice(BWRAP_LABEL.length);
    $[5] = depCheck.errors;
    $[6] = t4;
  } else t4 = $[6];
  let bwrapMissing = t4;
  let C;
  if ($[7] !== depCheck.errors) {
    C = depCheck.errors.find(isSocatMissing)?.slice(SOCAT_LABEL.length);
    $[7] = depCheck.errors;
    $[8] = C;
  } else C = $[8];
  let socatMissing = C;
  let seccompMissing = depCheck.warnings.length > 0;
  let t5;
  if (
    $[9] !== bwrapMissing ||
    $[10] !== depCheck.errors ||
    $[11] !== p ||
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
    if ($[16] !== p) {
      t7 = jsxProd_default_2(Text, {
        children: [
          "ripgrep (rg):",
          " ",
          p
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
        p &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 ", rgInstallHint],
        });
      $[16] = p;
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
    $[11] = p;
    $[12] = seccompMissing;
    $[13] = socatMissing;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
}
//@ chunk-rtnapjwv.js:2100-2164 fingerprint = _temp2 (1)
/**
 * 函数 sandboxBinaryPath（取沙箱二进制路径）；位于「/sandbox 依赖检查：ripgrep、bubblewrap、socat、seatbelt、Windows WFP 等是否就绪与安装提示」模块。
 */
function sandboxBinaryPath() {
  let sandboxBwrapPath = getSandboxBwrapPath();
  if (sandboxBwrapPath) return bunWhichSync(sandboxBwrapPath);
  return bunWhichSync("bwrap");
}
export {
  sandboxBinaryPath,
  probeSandboxDependencies,
  isWindowsSandboxBlockingError,
  describeProbeResult,
  renderProbeError,
  SandboxDependenciesTab,
};
