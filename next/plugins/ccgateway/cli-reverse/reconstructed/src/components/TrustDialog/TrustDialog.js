/**
 * components/TrustDialog/TrustDialog.tsx
 *
 * 工作区信任对话框：首次进入目录时列出该项目的 hooks/MCP/bash 权限/apiKeyHelper/技能等风险来源，信任或退出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TrustDialog/TrustDialog.tsx
 * pieces: chunk-wabs2mr4.js (7)
 * attribution: placement 1, file-local 2, fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useEffect, useRef } from "../../../vendor/react/cjs/react.production.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
  useRecentInputWithin,
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

//@ chunk-wabs2mr4.js:15187-15191 placement
init_react_production();
//@ chunk-wabs2mr4.js:15191-15245 file-local
function isNotebookEditTool(tool) {
  return tool === BASH_TOOL_NAME || tool.startsWith(BASH_TOOL_NAME + "(");
}
//@ chunk-wabs2mr4.js:15245-15409 fingerprint (2.1.88 match: _temp2, 1)
function isLegacyProjectCommandWithBashAllow(command) {
  return (
    command.type === "prompt" &&
    command.loadedFrom === "commands_DEPRECATED" &&
    (command.source === "projectSettings" || command.source === "localSettings") &&
    command.allowedTools?.some(isNotebookEditTool)
  );
}
//@ chunk-wabs2mr4.js:15409-15463 file-local
function isFileEditTool(tool) {
  return tool === BASH_TOOL_NAME || tool.startsWith(BASH_TOOL_NAME + "(");
}
//@ chunk-wabs2mr4.js:15463-15662 fingerprint (2.1.88 match: _temp4, 1)
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
//@ chunk-wabs2mr4.js:15662-15718 fingerprint (2.1.88 match: _temp5, 1)
function withTrustAccepted(current) {
  return {
    ...current,
    hasTrustDialogAccepted: true,
  };
}
//@ chunk-wabs2mr4.js:15718-21875 fingerprint (2.1.88 match: TrustDialog, 0.487)
/**
 * 工作区信任对话框：列出项目中会自动执行或放权的配置（hooks、MCP 服务器、bash 权限、apiKeyHelper、OTEL headers helper、AWS/GCP 命令、危险 env、技能/插件），用户选择信任后写入项目配置；拒绝则退出。
 */
function TrustDialog(props) {
  let $ = useMemoCache(67);
  let { onDone, commands } = props;
  let { storageV5 } = useTheme_2();
  let projectMcpConfigs;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    projectMcpConfigs = getMcpConfigsByScope("project");
    $[0] = projectMcpConfigs;
  } else projectMcpConfigs = $[0];
  let { servers: projectServers } = projectMcpConfigs;
  let projectServerNames;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    projectServerNames = Object.keys(projectServers);
    $[1] = projectServerNames;
  } else projectServerNames = $[1];
  let hasMcpServers = projectServerNames.length > 0;
  let hookSourcesList;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    hookSourcesList = getHooksSources_3();
    $[2] = hookSourcesList;
  } else hookSourcesList = $[2];
  let hasHooks = hookSourcesList.length > 0;
  let hooksSources;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    hooksSources = getHooksSources();
    $[3] = hooksSources;
  } else hooksSources = $[3];
  let hookSourceLabels = hooksSources;
  let allowRuleSources = collectAllowRuleSources();
  let hasProjectAllowRules = allowRuleSources.sources.length > 0;
  let additionalDirectorySources = collectAdditionalDirectorySources();
  let hasProjectAddDirs = additionalDirectorySources.sources.length > 0;
  let apiKeyHelperSources;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    apiKeyHelperSources = getHooksSources_6();
    $[4] = apiKeyHelperSources;
  } else apiKeyHelperSources = $[4];
  let hasApiKeyHelper = apiKeyHelperSources.length > 0;
  let awsSources;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    awsSources = getHooksSources_7();
    $[5] = awsSources;
  } else awsSources = $[5];
  let hasAwsCommands = awsSources.length > 0;
  let gcpSources;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    gcpSources = getHooksSources_8();
    $[6] = gcpSources;
  } else gcpSources = $[6];
  let hasGcpCommands = gcpSources.length > 0;
  let otelSources;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    otelSources = getHooksSources_4();
    $[7] = otelSources;
  } else otelSources = $[7];
  let hasOtelHeadersHelper = otelSources.length > 0;
  let proxyAuthSources;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    proxyAuthSources = getHooksSources_9();
    $[8] = proxyAuthSources;
  } else proxyAuthSources = $[8];
  let hasProxyAuthHelper = proxyAuthSources.length > 0;
  let permissionSources;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    let bashPermissionSources = getBashPermissionSources();
    let bashAndMcpPermissionSources = getBashAndMcpPermissionSources(bashPermissionSources);
    permissionSources = {
      marketplaceHelperSources: bashPermissionSources,
      repoHelperSources: bashAndMcpPermissionSources,
      offerBackstop: hasUngatedTrustSources(bashAndMcpPermissionSources),
    };
    $[9] = permissionSources;
  } else permissionSources = $[9];
  let { marketplaceHelperSources, repoHelperSources, offerBackstop } = permissionSources;
  let hasMarketplaceHeadersHelper = marketplaceHelperSources.length > 0;
  let hasRepoHeadersHelpers = repoHelperSources.length > 0;
  let dangerousEnvSources;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    dangerousEnvSources = getHooksSources_10();
    $[10] = dangerousEnvSources;
  } else dangerousEnvSources = $[10];
  let hasDangerousEnvVars = dangerousEnvSources.length > 0;
  let autoMemorySources;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    autoMemorySources = getHooksSources_5();
    $[11] = autoMemorySources;
  } else autoMemorySources = $[11];
  let hasAutoMemoryDirectory = autoMemorySources.length > 0;
  let hasLegacyBashCommand;
  if ($[12] !== commands) {
    hasLegacyBashCommand = commands?.some(isLegacyProjectCommandWithBashAllow) ?? false;
    $[12] = commands;
    $[13] = hasLegacyBashCommand;
  } else hasLegacyBashCommand = $[13];
  let hasLegacyBashCommand_ = hasLegacyBashCommand;
  let hasSkillBashAllow;
  if ($[14] !== commands) {
    hasSkillBashAllow = commands?.some(isProjectSkillWithBashAllow) ?? false;
    $[14] = commands;
    $[15] = hasSkillBashAllow;
  } else hasSkillBashAllow = $[15];
  let hasSkillBashAllow_ = hasSkillBashAllow;
  let hasBashExecution = hookSourceLabels.length > 0 || hasLegacyBashCommand_ || hasSkillBashAllow_;
  let trustAccepted;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    trustAccepted = checkHasTrustDialogAccepted();
    $[16] = trustAccepted;
  } else trustAccepted = $[16];
  let hasAcceptedTrust = trustAccepted;
  let hasAcceptedTrust_ = hasAcceptedTrust;
  let logShown;
  let logShownDeps;
  if ($[17] !== hasBashExecution) {
    logShown = () => {
      let isHomeDir = isHomeDirectorySession();
      logEvent("tengu_trust_dialog_shown", {
        isHomeDir,
        hasMcpServers,
        hasHooks,
        hasBashExecution,
        hasProjectAllowRules,
        hasProjectAddDirs,
        hasApiKeyHelper,
        hasAwsCommands,
        hasGcpCommands,
        hasOtelHeadersHelper,
        hasProxyAuthHelper,
        hasMarketplaceHeadersHelper,
        hasRepoHeadersHelpers,
        hasDangerousEnvVars,
        hasAutoMemoryDirectory,
      });
    };
    logShownDeps = [
      hasMcpServers,
      hasHooks,
      hasBashExecution,
      hasProjectAllowRules,
      hasProjectAddDirs,
      hasApiKeyHelper,
      hasAwsCommands,
      hasGcpCommands,
      hasOtelHeadersHelper,
      hasProxyAuthHelper,
      hasMarketplaceHeadersHelper,
      hasRepoHeadersHelpers,
      hasDangerousEnvVars,
      hasAutoMemoryDirectory,
    ];
    $[17] = hasBashExecution;
    $[18] = logShown;
    $[19] = logShownDeps;
  } else {
    logShown = $[18];
    logShownDeps = $[19];
  }
  useEffect(logShown, logShownDeps);
  let hasAnsweredRef = useRef(false);
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let isInputRefused;
  if ($[20] !== isRecentInput || $[21] !== noteRefused || $[22] !== refusedWithin) {
    isInputRefused = function isInputRefused_() {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[20] = isRecentInput;
    $[21] = noteRefused;
    $[22] = refusedWithin;
    $[23] = isInputRefused;
  } else isInputRefused = $[23];
  let refuseInput = isInputRefused;
  let openedAt = useMountTime();
  let remount = settleKey(epoch);
  let handleChange;
  if (
    $[24] !== hasBashExecution ||
    $[25] !== hasAcceptedTrust_ ||
    $[26] !== isRecentInput ||
    $[27] !== noteRefused ||
    $[28] !== onDone ||
    $[29] !== refusedWithin ||
    $[30] !== storageV5
  ) {
    handleChange = function onChange(value) {
      if (hasAnsweredRef.current || isShuttingDown()) {
        return;
      }
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      hasAnsweredRef.current = true;
      if (value === "exit") {
        if (hasAcceptedTrust_) {
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
        hasMcpServers,
        hasHooks,
        hasBashExecution,
        hasProjectAllowRules,
        hasProjectAddDirs,
        hasApiKeyHelper,
        hasAwsCommands,
        hasGcpCommands,
        hasOtelHeadersHelper,
        hasProxyAuthHelper,
        hasMarketplaceHeadersHelper,
        hasRepoHeadersHelpers,
        hasDangerousEnvVars,
        hasAutoMemoryDirectory,
      });
      if (isHomeDir) {
        setSessionTrustAccepted(true);
        setHomeTrustDialogAccepted(true);
      } else saveCurrentProjectConfig(withTrustAccepted, storageV5);
      onDone();
    };
    $[24] = hasBashExecution;
    $[25] = hasAcceptedTrust_;
    $[26] = isRecentInput;
    $[27] = noteRefused;
    $[28] = onDone;
    $[29] = refusedWithin;
    $[30] = storageV5;
    $[31] = handleChange;
  } else handleChange = $[31];
  let handleChange_ = handleChange;
  let handleExit;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    handleExit = () => {
      hasAnsweredRef.current = true;
      gracefulShutdownSync(1);
    };
    $[32] = handleExit;
  } else handleExit = $[32];
  let exitState = useGlobalExitKeybindings(handleExit);
  let handleCancel;
  if (
    $[33] !== hasAcceptedTrust_ ||
    $[34] !== isRecentInput ||
    $[35] !== noteRefused ||
    $[36] !== handleChange_ ||
    $[37] !== refusedWithin
  ) {
    handleCancel = () => {
      if (isKbCohesionFixesOn()) {
        handleChange_("exit");
        return;
      }
      if (hasAcceptedTrust_) {
        handleChange_("exit");
        return;
      }
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (hasAnsweredRef.current || isShuttingDown()) {
        return;
      }
      hasAnsweredRef.current = true;
      gracefulShutdownSync(0);
    };
    $[33] = hasAcceptedTrust_;
    $[34] = isRecentInput;
    $[35] = noteRefused;
    $[36] = handleChange_;
    $[37] = refusedWithin;
    $[38] = handleCancel;
  } else handleCancel = $[38];
  let confirmationKeybindingOptions;
  if ($[39] === MEMO_CACHE_SENTINEL) {
    confirmationKeybindingOptions = {
      context: "Confirmation",
    };
    $[39] = confirmationKeybindingOptions;
  } else confirmationKeybindingOptions = $[39];
  useKeybinding("confirm:no", handleCancel, confirmationKeybindingOptions);
  if (hasAcceptedTrust && !offerBackstop) {
    queueMicrotask(onDone);
    return null;
  }
  const PermissionDialogComponent = PermissionDialog_2;
  const color = "warning";
  const titleColor = "warning";
  const title = "Accessing workspace:";
  const BoxComponent = Box;
  const flexDirection = "column";
  const gap = 1;
  const paddingTop = 1;
  let cwdElement;
  let questionElement;
  let accessElement;
  if ($[40] === MEMO_CACHE_SENTINEL) {
    cwdElement = jsxProd_default(Text, {
      bold: true,
      children: escapePathForDisplay(getFsImplementation().cwd()),
    });
    questionElement = jsxProd_default_2(Text, {
      children: [
        "Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what",
        "'",
        "s in this folder first.",
      ],
    });
    accessElement = jsxProd_default_2(Text, {
      children: ["Claude Code", "'", "ll be able to read, edit, and execute files here."],
    });
    $[40] = cwdElement;
    $[41] = questionElement;
    $[42] = accessElement;
  } else {
    cwdElement = $[40];
    questionElement = $[41];
    accessElement = $[42];
  }
  const preapprovedGrantsElement =
    (hasProjectAllowRules || hasProjectAddDirs || hasRepoHeadersHelpers) &&
    jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        hasProjectAllowRules &&
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
        hasProjectAddDirs &&
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
        hasRepoHeadersHelpers &&
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
  let securityLinkElement;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    securityLinkElement = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(Link, {
        url: "https://code.claude.com/docs/en/security",
        children: "Security guide",
      }),
    });
    $[43] = securityLinkElement;
  } else securityLinkElement = $[43];
  let onConfirm;
  let onCancel;
  if ($[44] !== handleChange_) {
    onConfirm = () => handleChange_("enable_all");
    onCancel = () => handleChange_("exit");
    $[44] = handleChange_;
    $[45] = onConfirm;
    $[46] = onCancel;
  } else {
    onConfirm = $[45];
    onCancel = $[46];
  }
  let confirmElement;
  if (
    $[47] !== remount.remountKey ||
    $[48] !== refuseInput ||
    $[49] !== openedAt ||
    $[50] !== onConfirm ||
    $[51] !== onCancel
  ) {
    confirmElement = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, I trust this folder",
        cancelLabel: hasAcceptedTrust_ ? "No, continue without these permissions" : "No, exit",
        onConfirm,
        onCancel,
      },
      remount.remountKey,
    );
    $[47] = remount.remountKey;
    $[48] = refuseInput;
    $[49] = openedAt;
    $[50] = onConfirm;
    $[51] = onCancel;
    $[52] = confirmElement;
  } else confirmElement = $[52];
  let exitHintElement;
  if ($[53] !== exitState.keyName || $[54] !== exitState.pending) {
    exitHintElement = jsxProd_default(Text, {
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
    $[55] = exitHintElement;
  } else exitHintElement = $[55];
  let children;
  if (
    $[56] !== BoxComponent ||
    $[57] !== cwdElement ||
    $[58] !== questionElement ||
    $[59] !== accessElement ||
    $[60] !== preapprovedGrantsElement ||
    $[61] !== confirmElement ||
    $[62] !== exitHintElement
  ) {
    children = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      paddingTop,
      children: [
        cwdElement,
        questionElement,
        accessElement,
        preapprovedGrantsElement,
        securityLinkElement,
        confirmElement,
        exitHintElement,
      ],
    });
    $[56] = BoxComponent;
    $[57] = cwdElement;
    $[58] = questionElement;
    $[59] = accessElement;
    $[60] = preapprovedGrantsElement;
    $[61] = confirmElement;
    $[62] = exitHintElement;
    $[63] = children;
  } else children = $[63];
  let dialogElement;
  if ($[64] !== PermissionDialogComponent || $[65] !== children) {
    dialogElement = jsxProd_default(PermissionDialogComponent, {
      color,
      titleColor,
      title,
      children,
    });
    $[64] = PermissionDialogComponent;
    $[65] = children;
    $[66] = dialogElement;
  } else dialogElement = $[66];
  return dialogElement;
}
export { TrustDialog };
