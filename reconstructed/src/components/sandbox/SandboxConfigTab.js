/**
 * components/sandbox/SandboxConfigTab.tsx
 *
 * /sandbox 配置标签页：当前沙箱设置、排除命令、网络/文件系统规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/sandbox/SandboxConfigTab.tsx
 * pieces: chunk-55w3ydvj.js (3)
 * attribution: placement 1, file-local 1, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { SandboxManager, shouldAllowManagedSandboxDomainsOnly } from "../../utils/sandbox/sandbox-adapter.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-55w3ydvj.js:14016-14020 placement
init_react_production();
//@ chunk-55w3ydvj.js:14020-14076 file-local
function renderDimLine(w, i) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children: w,
    },
    i,
  );
}
//@ chunk-55w3ydvj.js:14076-16494 fingerprint = SandboxConfigTab (0.616)
function SandboxConfigTab() {
  let $ = w(3);
  let isEnabled = SandboxManager.isSandboxingEnabled();
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let depCheck = SandboxManager.checkDependencies();
    t0 =
      depCheck.warnings.length > 0
        ? jsxProd_default(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: depCheck.warnings.map(renderDimLine),
          })
        : null;
    $[0] = t0;
  } else t0 = $[0];
  let warningsNote = t0;
  if (!isEnabled) {
    let t1;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            color: "subtle",
            children: "Sandbox is not enabled",
          }),
          warningsNote,
        ],
      });
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  let t1;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    let fsReadConfig = SandboxManager.getFsReadConfig();
    let fsWriteConfig = SandboxManager.getFsWriteConfig();
    let networkConfig = SandboxManager.getNetworkRestrictionConfig();
    let allowUnixSockets = SandboxManager.getAllowUnixSockets();
    let excludedCommands = SandboxManager.getExcludedCommands();
    let globPatternWarnings = SandboxManager.getLinuxGlobPatternWarnings();
    t1 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              bold: true,
              color: "permission",
              children: "Excluded Commands:",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: excludedCommands.length > 0 ? excludedCommands.join(", ") : "None",
            }),
          ],
        }),
        fsReadConfig.denyOnly.length > 0 &&
          jsxProd_default_2(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                bold: true,
                color: "permission",
                children: "Filesystem Read Restrictions:",
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: ["Denied: ", fsReadConfig.denyOnly.join(", ")],
              }),
              fsReadConfig.allowWithinDeny &&
                fsReadConfig.allowWithinDeny.length > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Allowed within denied: ", fsReadConfig.allowWithinDeny.join(", ")],
                }),
            ],
          }),
        fsWriteConfig.allowOnly.length > 0 &&
          jsxProd_default_2(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                bold: true,
                color: "permission",
                children: "Filesystem Write Restrictions:",
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: ["Allowed: ", fsWriteConfig.allowOnly.join(", ")],
              }),
              fsWriteConfig.denyWithinAllow.length > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Denied within allowed: ", fsWriteConfig.denyWithinAllow.join(", ")],
                }),
            ],
          }),
        ((networkConfig.allowedHosts && networkConfig.allowedHosts.length > 0) ||
          (networkConfig.deniedHosts && networkConfig.deniedHosts.length > 0)) &&
          jsxProd_default_2(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                color: "permission",
                children: [
                  "Network Restrictions",
                  shouldAllowManagedSandboxDomainsOnly() ? " (Managed)" : "",
                  ":",
                ],
              }),
              networkConfig.allowedHosts &&
                networkConfig.allowedHosts.length > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Allowed: ", networkConfig.allowedHosts.join(", ")],
                }),
              networkConfig.deniedHosts &&
                networkConfig.deniedHosts.length > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Denied: ", networkConfig.deniedHosts.join(", ")],
                }),
            ],
          }),
        allowUnixSockets &&
          allowUnixSockets.length > 0 &&
          jsxProd_default_2(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                bold: true,
                color: "permission",
                children: "Allowed Unix Sockets:",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: allowUnixSockets.join(", "),
              }),
            ],
          }),
        globPatternWarnings.length > 0 &&
          jsxProd_default_2(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                bold: true,
                color: "warning",
                children: "\u26A0 Warning: Glob patterns not fully supported on Linux",
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "The following patterns will be ignored:",
                  " ",
                  globPatternWarnings.slice(0, 3).join(", "),
                  globPatternWarnings.length > 3 && ` (${globPatternWarnings.length - 3} more)`,
                ],
              }),
            ],
          }),
        warningsNote,
      ],
    });
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
export { SandboxConfigTab };
