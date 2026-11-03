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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { SandboxManager, shouldAllowManagedSandboxDomainsOnly } from "../../utils/sandbox/sandbox-adapter.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-55w3ydvj.js:14016-14020 placement
j();
//@ chunk-55w3ydvj.js:14020-14076 file-local
function po(w, i) {
  return e(Text, { dimColor: !0, children: w }, i);
}
//@ chunk-55w3ydvj.js:14076-16494 fingerprint = SandboxConfigTab (0.616)
function SandboxConfigTab() {
  let $ = w(3),
    isEnabled = SandboxManager.isSandboxingEnabled(),
    l;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let depCheck = SandboxManager.checkDependencies();
    l =
      depCheck.warnings.length > 0
        ? e(Box, { marginTop: 1, flexDirection: "column", children: depCheck.warnings.map(po) })
        : null;
    $[0] = l;
  } else l = $[0];
  let warningsNote = l;
  if (!isEnabled) {
    let u;
    if ($[1] === MEMO_CACHE_SENTINEL)
      ((u = r(Box, {
        flexDirection: "column",
        children: [e(Text, { color: "subtle", children: "Sandbox is not enabled" }), warningsNote],
      })),
        ($[1] = u));
    else u = $[1];
    return u;
  }
  let u;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    let fsReadConfig = SandboxManager.getFsReadConfig();
    let fsWriteConfig = SandboxManager.getFsWriteConfig();
    let networkConfig = SandboxManager.getNetworkRestrictionConfig();
    let allowUnixSockets = SandboxManager.getAllowUnixSockets();
    let excludedCommands = SandboxManager.getExcludedCommands();
    let globPatternWarnings = SandboxManager.getLinuxGlobPatternWarnings();
    u = r(Box, {
      flexDirection: "column",
      children: [
        r(Box, {
          flexDirection: "column",
          children: [
            e(Text, { bold: !0, color: "permission", children: "Excluded Commands:" }),
            e(Text, {
              dimColor: !0,
              children: excludedCommands.length > 0 ? excludedCommands.join(", ") : "None",
            }),
          ],
        }),
        fsReadConfig.denyOnly.length > 0 &&
          r(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              e(Text, { bold: !0, color: "permission", children: "Filesystem Read Restrictions:" }),
              r(Text, { dimColor: !0, children: ["Denied: ", fsReadConfig.denyOnly.join(", ")] }),
              fsReadConfig.allowWithinDeny &&
                fsReadConfig.allowWithinDeny.length > 0 &&
                r(Text, {
                  dimColor: !0,
                  children: ["Allowed within denied: ", fsReadConfig.allowWithinDeny.join(", ")],
                }),
            ],
          }),
        fsWriteConfig.allowOnly.length > 0 &&
          r(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              e(Text, { bold: !0, color: "permission", children: "Filesystem Write Restrictions:" }),
              r(Text, { dimColor: !0, children: ["Allowed: ", fsWriteConfig.allowOnly.join(", ")] }),
              fsWriteConfig.denyWithinAllow.length > 0 &&
                r(Text, {
                  dimColor: !0,
                  children: ["Denied within allowed: ", fsWriteConfig.denyWithinAllow.join(", ")],
                }),
            ],
          }),
        ((networkConfig.allowedHosts && networkConfig.allowedHosts.length > 0) ||
          (networkConfig.deniedHosts && networkConfig.deniedHosts.length > 0)) &&
          r(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              r(Text, {
                bold: !0,
                color: "permission",
                children: [
                  "Network Restrictions",
                  shouldAllowManagedSandboxDomainsOnly() ? " (Managed)" : "",
                  ":",
                ],
              }),
              networkConfig.allowedHosts &&
                networkConfig.allowedHosts.length > 0 &&
                r(Text, { dimColor: !0, children: ["Allowed: ", networkConfig.allowedHosts.join(", ")] }),
              networkConfig.deniedHosts &&
                networkConfig.deniedHosts.length > 0 &&
                r(Text, { dimColor: !0, children: ["Denied: ", networkConfig.deniedHosts.join(", ")] }),
            ],
          }),
        allowUnixSockets &&
          allowUnixSockets.length > 0 &&
          r(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              e(Text, { bold: !0, color: "permission", children: "Allowed Unix Sockets:" }),
              e(Text, { dimColor: !0, children: allowUnixSockets.join(", ") }),
            ],
          }),
        globPatternWarnings.length > 0 &&
          r(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              e(Text, {
                bold: !0,
                color: "warning",
                children: "\u26A0 Warning: Glob patterns not fully supported on Linux",
              }),
              r(Text, {
                dimColor: !0,
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
    $[2] = u;
  } else u = $[2];
  return u;
}

export { SandboxConfigTab };
