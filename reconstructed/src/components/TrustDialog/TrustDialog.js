/**
 * components/TrustDialog/TrustDialog.tsx
 *
 * 工作区信任对话框：首次进入目录时列出该项目的 hooks/MCP/bash 权限/apiKeyHelper/技能等风险来源，信任或退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TrustDialog/TrustDialog.tsx
 * pieces: chunk-8rmevhsy.js (7)
 * attribution: placement 1, file-local 2, fingerprint 4
 */
import { init_react_production, P, R } from "../../../vendor/react/cjs/react.production.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getMcpConfigsByScope } from "../../services/mcp/config.js";
import {
  getHooksSources_3,
  getHooksSources,
  collectAllowRuleSources,
  collectAdditionalDirectorySources,
  getHooksSources_6,
  getHooksSources_7,
  getHooksSources_8,
  getHooksSources_4,
  getHooksSources_9,
  getBashPermissionSources,
  getBashAndMcpPermissionSources,
  hasUngatedTrustSources,
  getHooksSources_10,
  getHooksSources_5,
  formatListWithAnd_2,
} from "./utils.js";
import { checkHasTrustDialogAccepted, saveCurrentProjectConfig } from "../../utils/config.js";
import {
  isHomeDirectorySession,
  setSessionTrustAccepted,
  setHomeTrustDialogAccepted,
} from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { isShuttingDown, gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { isKbCohesionFixesOn } from "../../utils/kbCohesionFixes.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { escapePathForDisplay } from "../../utils/invisibleChars.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { plural } from "../../utils/stringUtils.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-8rmevhsy.js:14038-14042 placement
init_react_production();
//@ chunk-8rmevhsy.js:14042-14096 file-local
function isNotebookEditTool(tool) {
  return tool === BASH_TOOL_NAME || tool.startsWith(BASH_TOOL_NAME + "(");
}
//@ chunk-8rmevhsy.js:14096-14260 fingerprint = _temp2 (1)
function isLegacyProjectCommandWithBashAllow(command) {
  return (
    command.type === "prompt" &&
    command.loadedFrom === "commands_DEPRECATED" &&
    (command.source === "projectSettings" || command.source === "localSettings") &&
    command.allowedTools?.some(isNotebookEditTool)
  );
}
//@ chunk-8rmevhsy.js:14260-14314 file-local
function isFileEditTool(tool) {
  return tool === BASH_TOOL_NAME || tool.startsWith(BASH_TOOL_NAME + "(");
}
//@ chunk-8rmevhsy.js:14314-14513 fingerprint = _temp4 (1)
function isProjectSkillWithBashAllow(command) {
  return (
    command.type === "prompt" &&
    (command.loadedFrom === "skills" || command.loadedFrom === "plugin") &&
    (command.source === "projectSettings" ||
      command.source === "localSettings" ||
      command.source === "plugin") &&
    command.allowedTools?.some(isFileEditTool)
  );
}
//@ chunk-8rmevhsy.js:14513-14569 fingerprint = _temp5 (1)
function withTrustAccepted(current) {
  return {
    ...current,
    hasTrustDialogAccepted: true,
  };
}
//@ chunk-8rmevhsy.js:14569-20723 fingerprint = TrustDialog (0.487)
/**
 * 工作区信任对话框：列出项目中会自动执行或放权的配置（hooks、MCP 服务器、bash 权限、apiKeyHelper、OTEL headers helper、AWS/GCP 命令、危险 env、技能/插件），用户选择信任后写入项目配置；拒绝则退出。
 */
function TrustDialog(props) {
  let $ = w(67);
  let { onDone, commands } = props;
  let { storageV5 } = useTheme_2();
  let qe;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    qe = getMcpConfigsByScope("project");
    $[0] = qe;
  } else qe = $[0];
  let { servers: projectServers } = qe;
  let Qe;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    Qe = Object.keys(projectServers);
    $[1] = Qe;
  } else Qe = $[1];
  let we = Qe.length > 0;
  let Ue;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Ue = getHooksSources_3();
    $[2] = Ue;
  } else Ue = $[2];
  let He = Ue.length > 0;
  let Xe;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    Xe = getHooksSources();
    $[3] = Xe;
  } else Xe = $[3];
  let Lo = Xe;
  let allowRuleSources = collectAllowRuleSources();
  let B = allowRuleSources.sources.length > 0;
  let additionalDirectorySources = collectAdditionalDirectorySources();
  let E = additionalDirectorySources.sources.length > 0;
  let Ye;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    Ye = getHooksSources_6();
    $[4] = Ye;
  } else Ye = $[4];
  let ye = Ye.length > 0;
  let ze;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    ze = getHooksSources_7();
    $[5] = ze;
  } else ze = $[5];
  let Ae = ze.length > 0;
  let Je;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    Je = getHooksSources_8();
    $[6] = Je;
  } else Je = $[6];
  let ke = Je.length > 0;
  let Ze;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Ze = getHooksSources_4();
    $[7] = Ze;
  } else Ze = $[7];
  let De = Ze.length > 0;
  let $e;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    $e = getHooksSources_9();
    $[8] = $e;
  } else $e = $[8];
  let Se = $e.length > 0;
  let Le;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    let bashPermissionSources = getBashPermissionSources();
    let bashAndMcpPermissionSources = getBashAndMcpPermissionSources(bashPermissionSources);
    Le = {
      marketplaceHelperSources: bashPermissionSources,
      repoHelperSources: bashAndMcpPermissionSources,
      offerBackstop: hasUngatedTrustSources(bashAndMcpPermissionSources),
    };
    $[9] = Le;
  } else Le = $[9];
  let { marketplaceHelperSources, repoHelperSources, offerBackstop } = Le;
  let je = marketplaceHelperSources.length > 0;
  let _ = repoHelperSources.length > 0;
  let so;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    so = getHooksSources_10();
    $[10] = so;
  } else so = $[10];
  let Ce = so.length > 0;
  let to;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    to = getHooksSources_5();
    $[11] = to;
  } else to = $[11];
  let be = to.length > 0;
  let ao;
  if ($[12] !== commands) {
    ao = commands?.some(isLegacyProjectCommandWithBashAllow) ?? false;
    $[12] = commands;
    $[13] = ao;
  } else ao = $[13];
  let rr = ao;
  let no;
  if ($[14] !== commands) {
    no = commands?.some(isProjectSkillWithBashAllow) ?? false;
    $[14] = commands;
    $[15] = no;
  } else no = $[15];
  let sr = no;
  let p = Lo.length > 0 || rr || sr;
  let co;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    co = checkHasTrustDialogAccepted();
    $[16] = co;
  } else co = $[16];
  let io = co;
  let u = io;
  let lo;
  let po;
  if ($[17] !== p) {
    lo = () => {
      let isHomeDir = isHomeDirectorySession();
      logEvent("tengu_trust_dialog_shown", {
        isHomeDir,
        hasMcpServers: we,
        hasHooks: He,
        hasBashExecution: p,
        hasProjectAllowRules: B,
        hasProjectAddDirs: E,
        hasApiKeyHelper: ye,
        hasAwsCommands: Ae,
        hasGcpCommands: ke,
        hasOtelHeadersHelper: De,
        hasProxyAuthHelper: Se,
        hasMarketplaceHeadersHelper: je,
        hasRepoHeadersHelpers: _,
        hasDangerousEnvVars: Ce,
        hasAutoMemoryDirectory: be,
      });
    };
    po = [we, He, p, B, E, ye, Ae, ke, De, Se, je, _, Ce, be];
    $[17] = p;
    $[18] = lo;
    $[19] = po;
  } else {
    lo = $[18];
    po = $[19];
  }
  P(lo, po);
  let G = R(false);
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let uo;
  if ($[20] !== inputRefusalWindow || $[21] !== noteRefused || $[22] !== refusedWithin) {
    uo = function K() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[20] = inputRefusalWindow;
    $[21] = noteRefused;
    $[22] = refusedWithin;
    $[23] = uo;
  } else uo = $[23];
  let refuseInput = uo;
  let openedAt = useMountTime();
  let xe = settleKey(epoch);
  let ho;
  if (
    $[24] !== p ||
    $[25] !== u ||
    $[26] !== inputRefusalWindow ||
    $[27] !== noteRefused ||
    $[28] !== onDone ||
    $[29] !== refusedWithin ||
    $[30] !== storageV5
  ) {
    ho = function onChange(value) {
      if (G.current || isShuttingDown()) {
        return;
      }
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      G.current = true;
      if (value === "exit") {
        if (u) {
          logFeatureBad("onboarding_trust_dialog", "gated_grants_backstop_declined");
          onDone();
          return;
        }
        logFeatureBad("onboarding_trust_dialog", "onboarding_trust_denied");
        gracefulShutdownSync(1);
        return;
      }
      let isHomeDir = isHomeDirectorySession();
      logFeatureOk("onboarding_trust_dialog");
      logEvent("tengu_trust_dialog_accept", {
        isHomeDir,
        hasMcpServers: we,
        hasHooks: He,
        hasBashExecution: p,
        hasProjectAllowRules: B,
        hasProjectAddDirs: E,
        hasApiKeyHelper: ye,
        hasAwsCommands: Ae,
        hasGcpCommands: ke,
        hasOtelHeadersHelper: De,
        hasProxyAuthHelper: Se,
        hasMarketplaceHeadersHelper: je,
        hasRepoHeadersHelpers: _,
        hasDangerousEnvVars: Ce,
        hasAutoMemoryDirectory: be,
      });
      if (isHomeDir) {
        setSessionTrustAccepted(true);
        setHomeTrustDialogAccepted(true);
      } else saveCurrentProjectConfig(withTrustAccepted, storageV5);
      onDone();
    };
    $[24] = p;
    $[25] = u;
    $[26] = inputRefusalWindow;
    $[27] = noteRefused;
    $[28] = onDone;
    $[29] = refusedWithin;
    $[30] = storageV5;
    $[31] = ho;
  } else ho = $[31];
  let l = ho;
  let fo;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    fo = () => {
      G.current = true;
      gracefulShutdownSync(1);
    };
    $[32] = fo;
  } else fo = $[32];
  let exitState = useGlobalExitKeybindings(fo);
  let go;
  if (
    $[33] !== u ||
    $[34] !== inputRefusalWindow ||
    $[35] !== noteRefused ||
    $[36] !== l ||
    $[37] !== refusedWithin
  ) {
    go = () => {
      if (isKbCohesionFixesOn()) {
        l("exit");
        return;
      }
      if (u) {
        l("exit");
        return;
      }
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (G.current || isShuttingDown()) {
        return;
      }
      G.current = true;
      gracefulShutdownSync(0);
    };
    $[33] = u;
    $[34] = inputRefusalWindow;
    $[35] = noteRefused;
    $[36] = l;
    $[37] = refusedWithin;
    $[38] = go;
  } else go = $[38];
  let wo;
  if ($[39] === MEMO_CACHE_SENTINEL) {
    wo = {
      context: "Confirmation",
    };
    $[39] = wo;
  } else wo = $[39];
  useKeybinding("confirm:no", go, wo);
  if (io && !offerBackstop) {
    queueMicrotask(onDone);
    return null;
  }
  const ve = PermissionDialog_2;
  const color = "warning";
  const titleColor = "warning";
  const title = "Accessing workspace:";
  const Pe = Box;
  const flexDirection = "column";
  const gap = 1;
  const paddingTop = 1;
  let F;
  let W;
  let N;
  if ($[40] === MEMO_CACHE_SENTINEL) {
    F = jsxProd_default(Text, {
      bold: true,
      children: escapePathForDisplay(getFsImplementation().cwd()),
    });
    W = jsxProd_default_2(Text, {
      children: [
        "Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what",
        "'",
        "s in this folder first.",
      ],
    });
    N = jsxProd_default_2(Text, {
      children: ["Claude Code", "'", "ll be able to read, edit, and execute files here."],
    });
    $[40] = F;
    $[41] = W;
    $[42] = N;
  } else {
    F = $[40];
    W = $[41];
    N = $[42];
  }
  const Te =
    (B || E || _) &&
    jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        B &&
          jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                color: "warning",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "warning",
                    withSpace: true,
                  }),
                  "This folder pre-approves ",
                  allowRuleSources.rawCount,
                  " ",
                  plural(allowRuleSources.rawCount, "tool permission"),
                  " in",
                  " ",
                  formatListWithAnd_2(allowRuleSources.sources),
                  ":",
                ],
              }),
              jsxProd_default_2(Text, {
                children: [
                  "  ",
                  allowRuleSources.rules.length > 0
                    ? formatListWithAnd_2(allowRuleSources.rules, 8)
                    : "(rule names contain unprintable characters)",
                ],
              }),
            ],
          }),
        E &&
          jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                color: "warning",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "warning",
                    withSpace: true,
                  }),
                  "This folder adds ",
                  additionalDirectorySources.rawCount,
                  " ",
                  plural(additionalDirectorySources.rawCount, "directory", "directories"),
                  " ",
                  "to the workspace in",
                  " ",
                  formatListWithAnd_2(additionalDirectorySources.sources),
                  ":",
                ],
              }),
              jsxProd_default_2(Text, {
                children: [
                  "  ",
                  additionalDirectorySources.dirs.length > 0
                    ? formatListWithAnd_2(additionalDirectorySources.dirs, 6)
                    : "(directory names contain unprintable characters)",
                ],
              }),
            ],
          }),
        _ &&
          jsxProd_default_2(Text, {
            bold: true,
            color: "warning",
            children: [
              jsxProd_default(StatusIcon, {
                status: "warning",
                withSpace: true,
              }),
              "This folder runs commands to mint HTTP headers (headersHelper), declared in ",
              formatListWithAnd_2(repoHelperSources),
            ],
          }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "These will apply without asking. Only proceed if you trust this configuration.",
        }),
      ],
    });
  let Ho;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    Ho = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(Link, {
        url: "https://code.claude.com/docs/en/security",
        children: "Security guide",
      }),
    });
    $[43] = Ho;
  } else Ho = $[43];
  let onConfirm;
  let onCancel;
  if ($[44] !== l) {
    onConfirm = () => l("enable_all");
    onCancel = () => l("exit");
    $[44] = l;
    $[45] = onConfirm;
    $[46] = onCancel;
  } else {
    onConfirm = $[45];
    onCancel = $[46];
  }
  let Y;
  if (
    $[47] !== xe.remountKey ||
    $[48] !== refuseInput ||
    $[49] !== openedAt ||
    $[50] !== onConfirm ||
    $[51] !== onCancel
  ) {
    Y = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, I trust this folder",
        cancelLabel: u ? "No, continue without these permissions" : "No, exit",
        onConfirm,
        onCancel,
      },
      xe.remountKey,
    );
    $[47] = xe.remountKey;
    $[48] = refuseInput;
    $[49] = openedAt;
    $[50] = onConfirm;
    $[51] = onCancel;
    $[52] = Y;
  } else Y = $[52];
  let z;
  if ($[53] !== exitState.keyName || $[54] !== exitState.pending) {
    z = jsxProd_default(Text, {
      dimColor: true,
      children: exitState.pending
        ? jsxProd_default_2(Fragment, {
            children: ["Press ", exitState.keyName, " again to exit"],
          })
        : jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "confirm",
              }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "cancel",
              }),
            ],
          }),
    });
    $[53] = exitState.keyName;
    $[54] = exitState.pending;
    $[55] = z;
  } else z = $[55];
  let children;
  if (
    $[56] !== Pe ||
    $[57] !== F ||
    $[58] !== W ||
    $[59] !== N ||
    $[60] !== Te ||
    $[61] !== Y ||
    $[62] !== z
  ) {
    children = jsxProd_default_2(Pe, {
      flexDirection,
      gap,
      paddingTop,
      children: [F, W, N, Te, Ho, Y, z],
    });
    $[56] = Pe;
    $[57] = F;
    $[58] = W;
    $[59] = N;
    $[60] = Te;
    $[61] = Y;
    $[62] = z;
    $[63] = children;
  } else children = $[63];
  let yo;
  if ($[64] !== ve || $[65] !== children) {
    yo = jsxProd_default(ve, {
      color,
      titleColor,
      title,
      children,
    });
    $[64] = ve;
    $[65] = children;
    $[66] = yo;
  } else yo = $[66];
  return yo;
}
