/**
 * commands/cd/cd.tsx
 *
 * 2.1.316 新增：/cd 命令：切换工作目录，进入不受信任目录时的信任提示流程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fh3th4b7.js (12)
 * attribution: placement 12
 */
import { resolve } from "path";
import { init_react_production, useRef, useState } from "../../../vendor/react/cjs/react.production.js";
import {
  collectPermissionTrustSources,
  hasTrustRiskSources,
  formatListWithAnd_2,
  getOtelHeadersHelperSources,
} from "../../components/TrustDialog/utils.js";
import { logForDebugging } from "../../utils/debug.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { useInputClock } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isWithinRecentInput, RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { escapePathForDisplay, stripInvisibleChars } from "../../utils/invisibleChars.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { PermissionDialog_2 } from "../../components/permissions/PermissionDialog.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { plural } from "../../utils/stringUtils.js";
import {
  validateCdTarget,
  cdRuleRefusalMessage,
  relocateSession,
  recordDirectoryTrust,
  reapplyProjectSettingsAfterTrustChange,
  withGatedGrantsApplied,
} from "../../utils/sessionRelocation.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { sequential } from "../../utils/sequential.js";
import { getCwd } from "../../utils/cwd.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isPathTrusted } from "../../utils/config.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { getPendingProjectMcpServers } from "../../interactiveHelpers.js";
import { blockingSettingsErrors } from "../../utils/settings/settingsNotices.js";
import { MCPServerApprovalDialog } from "../../components/MCPServerApprovalDialog.js";
import { MCPServerMultiselectDialog } from "../../components/MCPServerMultiselectDialog.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";

//@ chunk-fh3th4b7.js:14226-14230 placement
init_react_production();
//@ chunk-fh3th4b7.js:14230-14381 placement
function readBackstopSettingsSafe() {
  try {
    return collectPermissionTrustSources();
  } catch (error) {
    let caught = error;
    logForDebugging(`/cd: reading the project settings for the backstop prompt failed: ${caught}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-fh3th4b7.js:14381-14452 placement
function logPersistTrustFailure(error) {
  logForDebugging(`/cd: persisting trust failed: ${error}`, {
    level: "error",
  });
}
//@ chunk-fh3th4b7.js:14452-14810 placement
/**
 * /cd 结果消息组件（立即结束）。
 */
function CdResultMessage(props) {
  let $ = useMemoCache(7);
  let { message, args, onDone } = props;
  useTimeout(onDone, 0);
  let pointer;
  if ($[0] !== args) {
    pointer = jsxProd_default_2(Text, {
      dimColor: true,
      children: [figures_default.pointer, " /cd ", args],
    });
    $[0] = args;
    $[1] = pointer;
  } else pointer = $[1];
  let response;
  if ($[2] !== message) {
    response = jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        children: message,
      }),
    });
    $[2] = message;
    $[3] = response;
  } else response = $[3];
  let layout;
  if ($[4] !== pointer || $[5] !== response) {
    layout = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [pointer, response],
    });
    $[4] = pointer;
    $[5] = response;
    $[6] = layout;
  } else layout = $[6];
  return layout;
}
//@ chunk-fh3th4b7.js:14810-17326 placement
function CdTrustPrompt(props) {
  let $ = useMemoCache(36);
  let { directory, trustRoot, disclosures, backstop, onConfirm, onCancel } = props;
  let isBackstop = backstop === undefined ? false : backstop;
  let committed = useRef(false);
  let inputClock = useInputClock();
  let startedAt;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    startedAt = Date.now();
    $[0] = startedAt;
  } else startedAt = $[0];
  let lastInput = useRef(startedAt);
  let guard;
  if ($[1] !== inputClock) {
    guard = (fn) => {
      if (committed.current || isWithinRecentInput(inputClock, lastInput.current, RECENT_INPUT_GUARD_MS)) {
        return;
      }
      committed.current = true;
      fn();
    };
    $[1] = inputClock;
    $[2] = guard;
  } else guard = $[2];
  let guarded = guard;
  const title = isBackstop ? "Now in a new directory:" : "Moving to a new directory:";
  let children;
  if ($[3] !== directory) {
    children = escapePathForDisplay(directory);
    $[3] = directory;
    $[4] = children;
  } else children = $[4];
  let dirText;
  if ($[5] !== children) {
    dirText = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[5] = children;
    $[6] = dirText;
  } else dirText = $[6];
  let trustRootText;
  if ($[7] !== trustRoot) {
    trustRootText =
      trustRoot != null &&
      jsxProd_default_2(Text, {
        children: [
          "This directory is part of the repository at",
          " ",
          jsxProd_default(Text, {
            bold: true,
            children: escapePathForDisplay(trustRoot),
          }),
          ". Trusting it trusts that whole repository, including its other worktrees and subdirectories.",
        ],
      });
    $[7] = trustRoot;
    $[8] = trustRootText;
  } else trustRootText = $[8];
  let introText;
  if ($[9] !== isBackstop) {
    introText = isBackstop
      ? jsxProd_default(Text, {
          children:
            "Its settings declare project permission rules and/or additional directories. They apply only if you trust this directory explicitly (it is trusted through a parent directory so far).",
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Text, {
              children: [
                "This session hasn",
                "'",
                "t worked here before. Is this a directory you created or one you trust?",
              ],
            }),
            jsxProd_default_2(Text, {
              children: ["Claude Code", "'", "ll be able to read, edit, and execute files here."],
            }),
          ],
        });
    $[9] = isBackstop;
    $[10] = introText;
  } else introText = $[10];
  let disclosuresText;
  if ($[11] !== isBackstop || $[12] !== disclosures) {
    disclosuresText =
      disclosures !== undefined &&
      hasTrustRiskSources(disclosures, {
        backstop: isBackstop,
      }) &&
      jsxProd_default(TrustDisclosures, {
        disclosures,
        backstop: isBackstop,
      });
    $[11] = isBackstop;
    $[12] = disclosures;
    $[13] = disclosuresText;
  } else disclosuresText = $[13];
  let guide;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    guide = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(Link, {
        url: "https://code.claude.com/docs/en/security",
        children: "Security guide",
      }),
    });
    $[14] = guide;
  } else guide = $[14];
  const confirmLabel = isBackstop ? "Yes, trust it and apply them" : "Yes, move here";
  const cancelLabel = isBackstop ? "No, keep them off" : "No, stay put";
  let onConfirm_2;
  if ($[15] !== guarded || $[16] !== onConfirm) {
    onConfirm_2 = () => guarded(onConfirm);
    $[15] = guarded;
    $[16] = onConfirm;
    $[17] = onConfirm_2;
  } else onConfirm_2 = $[17];
  let onCancel_2;
  if ($[18] !== guarded || $[19] !== onCancel) {
    onCancel_2 = () => guarded(onCancel);
    $[18] = guarded;
    $[19] = onCancel;
    $[20] = onCancel_2;
  } else onCancel_2 = $[20];
  let selector;
  if ($[21] !== confirmLabel || $[22] !== cancelLabel || $[23] !== onConfirm_2 || $[24] !== onCancel_2) {
    selector = jsxProd_default(ConfirmSelect, {
      hideIndexes: true,
      cancelFirst: true,
      focus: "cancel",
      confirmLabel,
      cancelLabel,
      onConfirm: onConfirm_2,
      onCancel: onCancel_2,
      windowMs: RECENT_INPUT_GUARD_MS,
    });
    $[21] = confirmLabel;
    $[22] = cancelLabel;
    $[23] = onConfirm_2;
    $[24] = onCancel_2;
    $[25] = selector;
  } else selector = $[25];
  let body;
  if ($[26] === MEMO_CACHE_SENTINEL) {
    body = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
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
    $[26] = body;
  } else body = $[26];
  let children_2;
  if (
    $[27] !== selector ||
    $[28] !== dirText ||
    $[29] !== trustRootText ||
    $[30] !== introText ||
    $[31] !== disclosuresText
  ) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      paddingTop: 1,
      children: [dirText, trustRootText, introText, disclosuresText, guide, selector, body],
    });
    $[27] = selector;
    $[28] = dirText;
    $[29] = trustRootText;
    $[30] = introText;
    $[31] = disclosuresText;
    $[32] = children_2;
  } else children_2 = $[32];
  let footer;
  if ($[33] !== children_2 || $[34] !== title) {
    footer = jsxProd_default(PermissionDialog_2, {
      color: "warning",
      titleColor: "warning",
      title,
      children: children_2,
    });
    $[33] = children_2;
    $[34] = title;
    $[35] = footer;
  } else footer = $[35];
  return footer;
}
//@ chunk-fh3th4b7.js:17326-19183 placement
/**
 * 进入目录前的信任披露：预批准规则、额外目录、钩子与命令助手来源。
 */
function TrustDisclosures(props) {
  let $ = useMemoCache(22);
  let { disclosures, backstop } = props;
  let { allowRules, additionalDirectories, hookSources, commandHelperSources } = disclosures;
  let allowRulesNode;
  if ($[0] !== allowRules.rawCount || $[1] !== allowRules.rules || $[2] !== allowRules.sources) {
    allowRulesNode =
      allowRules.sources.length > 0 &&
      jsxProd_default_2(Text, {
        bold: true,
        color: "warning",
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "This directory pre-approves ",
          allowRules.rawCount,
          " ",
          plural(allowRules.rawCount, "tool permission", "tool permissions"),
          " ",
          "in ",
          formatListWithAnd_2(allowRules.sources),
          ":",
          " ",
          formatListWithAnd_2(allowRules.rules, 8),
        ],
      });
    $[0] = allowRules.rawCount;
    $[1] = allowRules.rules;
    $[2] = allowRules.sources;
    $[3] = allowRulesNode;
  } else allowRulesNode = $[3];
  let body;
  if (
    $[4] !== additionalDirectories.dirs ||
    $[5] !== additionalDirectories.rawCount ||
    $[6] !== additionalDirectories.sources
  ) {
    body =
      additionalDirectories.sources.length > 0 &&
      jsxProd_default_2(Text, {
        bold: true,
        color: "warning",
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "This directory grants access to ",
          additionalDirectories.rawCount,
          " ",
          "additional",
          " ",
          plural(additionalDirectories.rawCount, "directory", "directories"),
          " ",
          "in ",
          formatListWithAnd_2(additionalDirectories.sources),
          ":",
          " ",
          formatListWithAnd_2(additionalDirectories.dirs, 6),
        ],
      });
    $[4] = additionalDirectories.dirs;
    $[5] = additionalDirectories.rawCount;
    $[6] = additionalDirectories.sources;
    $[7] = body;
  } else body = $[7];
  let content;
  if ($[8] !== backstop || $[9] !== hookSources) {
    content =
      !backstop &&
      hookSources.length > 0 &&
      jsxProd_default_2(Text, {
        bold: true,
        color: "warning",
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "This directory configures hooks that run commands, declared in",
          " ",
          formatListWithAnd_2(hookSources),
        ],
      });
    $[8] = backstop;
    $[9] = hookSources;
    $[10] = content;
  } else content = $[10];
  let footer;
  if ($[11] !== backstop || $[12] !== commandHelperSources) {
    footer =
      !backstop &&
      commandHelperSources.length > 0 &&
      jsxProd_default_2(Text, {
        bold: true,
        color: "warning",
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "This directory runs commands on the session",
          "'",
          "s behalf (auth / header helpers), declared in ",
          formatListWithAnd_2(commandHelperSources),
        ],
      });
    $[11] = backstop;
    $[12] = commandHelperSources;
    $[13] = footer;
  } else footer = $[13];
  const children = backstop
    ? "These apply to this session only if you trust it. Only proceed if you trust this configuration."
    : "These will apply to this session as soon as you move. Only proceed if you trust this configuration.";
  let status;
  if ($[14] !== children) {
    status = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[14] = children;
    $[15] = status;
  } else status = $[15];
  let disclosureBox;
  if (
    $[16] !== allowRulesNode ||
    $[17] !== body ||
    $[18] !== content ||
    $[19] !== footer ||
    $[20] !== status
  ) {
    disclosureBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [allowRulesNode, body, content, footer, status],
    });
    $[16] = allowRulesNode;
    $[17] = body;
    $[18] = content;
    $[19] = footer;
    $[20] = status;
    $[21] = disclosureBox;
  } else disclosureBox = $[21];
  return disclosureBox;
}
//@ chunk-fh3th4b7.js:19183-21594 placement
/**
 * 先校验路径（不存在、不是目录等给出提示），需要时进入信任对话框； 切换后重载插件与 MCP，待批准的项目 MCP 服务器逐个弹出确认。
 */
async function runCdCommand(onDone, context, args) {
  let inputPath = (args ?? "").trim();
  if (!inputPath)
    return jsxProd_default(CdResultMessage, {
      message: "Usage: /cd <path>",
      args: "",
      onDone: () => onDone("Usage: /cd <path>"),
    });
  let validation = await validateCdTarget(inputPath, getToolPermissionContext(context));
  switch (validation.result) {
    case "not_found": {
      let notFoundMessage = `Couldn't find a directory at ${sequential.bold(validation.path)}.`;
      return jsxProd_default(CdResultMessage, {
        message: notFoundMessage,
        args: inputPath,
        onDone: () => onDone(notFoundMessage),
      });
    }
    case "not_a_directory": {
      let notDirMessage = `${sequential.bold(validation.path)} is not a directory. Did you mean ${sequential.bold(validation.parent)}?`;
      return jsxProd_default(CdResultMessage, {
        message: notDirMessage,
        args: inputPath,
        onDone: () => onDone(notDirMessage),
      });
    }
    case "same": {
      let alreadyMessage = `Already in ${sequential.bold(stripInvisibleChars(validation.directory))}.`;
      return jsxProd_default(CdResultMessage, {
        message: alreadyMessage,
        args: inputPath,
        onDone: () => onDone(alreadyMessage),
      });
    }
    case "blocked_by_rule": {
      let refusalMessage = cdRuleRefusalMessage(validation.directory, validation.check, sequential.bold, {
        display: stripInvisibleChars,
      });
      return jsxProd_default(CdResultMessage, {
        message: refusalMessage,
        args: inputPath,
        onDone: () => onDone(refusalMessage),
      });
    }
    case "ok":
      break;
  }
  let directory = validation.directory;
  let runCheck = async () => {
    let check;
    try {
      check = await relocateSession(context.session, directory, "cd_command", {
        storageV5: context.storageV5,
      });
    } catch (error) {
      logForDebugging(`/cd relocate failed: ${error}`, {
        level: "error",
      });
      onDone(
        `Couldn't move to ${sequential.bold(stripInvisibleChars(directory))} \u2014 the directory may no longer exist, or the session couldn't be moved. Staying in ${sequential.bold(stripInvisibleChars(getCwd()))}.`,
      );
      return null;
    }
    try {
      context.retireDepartedAdditionalDirectories?.(check.departedAdditionalDirectories);
    } catch (error) {
      logForDebugging(
        `/cd: retiring the previous project's additional directories failed (continuing): ${error}`,
        {
          level: "error",
        },
      );
    }
    return {
      modelMessage: check.modelMessage,
      pending: await collectPendingMcpServers(context),
      projectGrantsGated: check.projectGrantsGated,
      gatedNotice: check.gatedNotice,
    };
  };
  let handleComplete = async (modelMessage, symbol) => {
    await reloadPluginsSafe(context);
    if (symbol?.persistFailed) logFeatureBad("mcp_project_approval_dialog", "mcp_approval_persist_failed");
    else if (symbol) logFeatureOk("mcp_project_approval_dialog");
    onDone(
      symbol?.persistFailed
        ? `Moved to ${sequential.bold(stripInvisibleChars(directory))}. One or more of your MCP server choices could not be saved (check permissions on .claude/settings.local.json) \u2014 you will be asked again next time.`
        : `Moved to ${sequential.bold(stripInvisibleChars(directory))}`,
      {
        display: "system",
        metaMessages: [modelMessage],
      },
    );
  };
  if (isPathTrusted(directory)) {
    let validated = await runCheck();
    if (validated === null) return null;
    if (validated.projectGrantsGated)
      return jsxProd_default(CdOutcomeView, {
        outcome: validated,
        onComplete: handleComplete,
      });
    if (validated.pending.pendingServers.length === 0) {
      await handleComplete(validated.modelMessage);
      return null;
    }
    return jsxProd_default(PendingMcpApprovals, {
      pending: validated.pending,
      onComplete: (result) => void handleComplete(validated.modelMessage, result),
    });
  }
  let storageRoot = uncachedStorageRootFor(resolve(directory));
  let disclosures;
  try {
    disclosures = getOtelHeadersHelperSources(directory);
  } catch (error) {
    logForDebugging(`/cd: reading the target's project settings for the trust prompt failed: ${error}`, {
      level: "error",
    });
  }
  return jsxProd_default(CdUntrustedMoveFlow, {
    directory,
    trustRoot: storageRoot != null && storageRoot !== resolve(directory) ? storageRoot : undefined,
    disclosures,
    onConfirm: async () => {
      await recordDirectoryTrust(directory, context.storageV5).catch((error) => {
        logForDebugging(`/cd: persisting trust failed: ${error}`, {
          level: "error",
        });
      });
      return runCheck();
    },
    onComplete: handleComplete,
    onCancel: () => {
      onDone(`Staying in ${sequential.bold(stripInvisibleChars(getCwd()))}`);
    },
  });
}
//@ chunk-fh3th4b7.js:21594-22016 placement
/**
 * 收集新目录待批准的项目 MCP 服务器（设置文件有错时不弹）。
 */
async function collectPendingMcpServers(context) {
  let pending = {
    pendingServers: [],
    pluginServerNames: new Set(),
  };
  try {
    let pendingProjectMcpServers = await getPendingProjectMcpServers(context.storageV5);
    if (pendingProjectMcpServers.pendingServers.length > 0 && blockingSettingsErrors().length > 0) {
      logForDebugging(
        "/cd: project MCP servers await approval but a settings file has errors; leaving them pending",
        {
          level: "warn",
        },
      );
      return pending;
    }
    return pendingProjectMcpServers;
  } catch (error) {
    logForDebugging(
      `/cd: collecting the new directory's project MCP servers failed (continuing without approvals): ${error}`,
      {
        level: "error",
      },
    );
    return pending;
  }
}
//@ chunk-fh3th4b7.js:22016-22174 placement
async function reloadPluginsSafe(context) {
  try {
    await context.reloadPlugins?.();
  } catch (error) {
    logForDebugging(`/cd: refreshing plugins/MCP for the new directory failed (continuing): ${error}`, {
      level: "error",
    });
  }
}
//@ chunk-fh3th4b7.js:22174-22787 placement
/**
 * 逐个弹出待批准 MCP 服务器的确认。
 */
function PendingMcpApprovals(props) {
  let $ = useMemoCache(11);
  let { pending, onComplete } = props;
  let [firstServer, ...restServers] = pending.pendingServers;
  if (firstServer !== undefined && restServers.length === 0) {
    let isPluginServer;
    if ($[0] !== firstServer || $[1] !== pending.pluginServerNames) {
      isPluginServer = pending.pluginServerNames.has(firstServer);
      $[0] = firstServer;
      $[1] = pending.pluginServerNames;
      $[2] = isPluginServer;
    } else isPluginServer = $[2];
    let content;
    if ($[3] !== onComplete || $[4] !== firstServer || $[5] !== isPluginServer) {
      content = jsxProd_default(MCPServerApprovalDialog, {
        serverName: firstServer,
        isPluginServer,
        onDone: onComplete,
      });
      $[3] = onComplete;
      $[4] = firstServer;
      $[5] = isPluginServer;
      $[6] = content;
    } else content = $[6];
    return content;
  }
  let footer;
  if ($[7] !== onComplete || $[8] !== pending.pendingServers || $[9] !== pending.pluginServerNames) {
    footer = jsxProd_default(MCPServerMultiselectDialog, {
      serverNames: pending.pendingServers,
      pluginServerNames: pending.pluginServerNames,
      onDone: onComplete,
    });
    $[7] = onComplete;
    $[8] = pending.pendingServers;
    $[9] = pending.pluginServerNames;
    $[10] = footer;
  } else footer = $[10];
  return footer;
}
//@ chunk-fh3th4b7.js:22787-23697 placement
function CdUntrustedMoveFlow(props) {
  let $ = useMemoCache(18);
  let { directory, trustRoot, disclosures, onConfirm, onComplete, onCancel } = props;
  let [validated, setValidated] = useState(null);
  if (validated !== null) {
    if (validated.projectGrantsGated) {
      let content;
      if ($[0] !== validated || $[1] !== onComplete) {
        content = jsxProd_default(CdOutcomeView, {
          outcome: validated,
          onComplete,
        });
        $[0] = validated;
        $[1] = onComplete;
        $[2] = content;
      } else content = $[2];
      return content;
    }
    let onComplete_2;
    if ($[3] !== validated.modelMessage || $[4] !== onComplete) {
      onComplete_2 = (result) => void onComplete(validated.modelMessage, result);
      $[3] = validated.modelMessage;
      $[4] = onComplete;
      $[5] = onComplete_2;
    } else onComplete_2 = $[5];
    let footer;
    if ($[6] !== validated.pending || $[7] !== onComplete_2) {
      footer = jsxProd_default(PendingMcpApprovals, {
        pending: validated.pending,
        onComplete: onComplete_2,
      });
      $[6] = validated.pending;
      $[7] = onComplete_2;
      $[8] = footer;
    } else footer = $[8];
    return footer;
  }
  let onConfirm_2;
  if ($[9] !== onComplete || $[10] !== onConfirm) {
    onConfirm_2 = () => {
      onConfirm().then((moveResult) => {
        if (moveResult === null) {
          return;
        }
        if (!moveResult.projectGrantsGated && moveResult.pending.pendingServers.length === 0) {
          return onComplete(moveResult.modelMessage);
        }
        setValidated(moveResult);
      });
    };
    $[9] = onComplete;
    $[10] = onConfirm;
    $[11] = onConfirm_2;
  } else onConfirm_2 = $[11];
  let statusLine;
  if (
    $[12] !== directory ||
    $[13] !== disclosures ||
    $[14] !== onCancel ||
    $[15] !== onConfirm_2 ||
    $[16] !== trustRoot
  ) {
    statusLine = jsxProd_default(CdTrustPrompt, {
      directory,
      trustRoot,
      disclosures,
      onConfirm: onConfirm_2,
      onCancel,
    });
    $[12] = directory;
    $[13] = disclosures;
    $[14] = onCancel;
    $[15] = onConfirm_2;
    $[16] = trustRoot;
    $[17] = statusLine;
  } else statusLine = $[17];
  return statusLine;
}
//@ chunk-fh3th4b7.js:23697-25009 placement
/**
 * /cd 结果视图（先处理项目授权，再完成）。
 */
function CdOutcomeView(props) {
  let $ = useMemoCache(25);
  let { outcome, onComplete } = props;
  let { storageV5 } = useTheme_2();
  let [modelMessage, setModelMessage] = useState(outcome.modelMessage);
  let [grantConfirmed, setGrantConfirmed] = useState(!outcome.projectGrantsGated);
  let [cwdGetter] = useState(getCwd);
  let backstop;
  if ($[0] !== cwdGetter) {
    backstop = () => uncachedStorageRootFor(cwdGetter);
    $[0] = cwdGetter;
    $[1] = backstop;
  } else backstop = $[1];
  let [backstopState] = useState(backstop);
  let [backstopSettings] = useState(readBackstopSettingsSafe);
  if (!grantConfirmed) {
    let runGrant;
    if ($[2] !== onComplete || $[3] !== outcome.pending.pendingServers.length) {
      runGrant = (reason) => {
        setModelMessage(reason);
        setGrantConfirmed(true);
        if (outcome.pending.pendingServers.length === 0) onComplete(reason);
      };
      $[2] = onComplete;
      $[3] = outcome.pending.pendingServers.length;
      $[4] = runGrant;
    } else runGrant = $[4];
    let grantFlow = runGrant;
    const trustRoot = backstopState != null && backstopState !== cwdGetter ? backstopState : undefined;
    let onConfirm;
    if ($[5] !== cwdGetter || $[6] !== grantFlow || $[7] !== outcome || $[8] !== storageV5) {
      onConfirm = () => {
        recordDirectoryTrust(cwdGetter, storageV5)
          .catch(logPersistTrustFailure)
          .then(() => {
            try {
              reapplyProjectSettingsAfterTrustChange();
            } catch (error) {
              let caughtError = error;
              logForDebugging(
                `/cd: re-applying the project settings after the trust change failed: ${caughtError}`,
                {
                  level: "error",
                },
              );
            }
            grantFlow(withGatedGrantsApplied(outcome));
          });
      };
      $[5] = cwdGetter;
      $[6] = grantFlow;
      $[7] = outcome;
      $[8] = storageV5;
      $[9] = onConfirm;
    } else onConfirm = $[9];
    let onCancel;
    if ($[10] !== grantFlow || $[11] !== outcome.modelMessage) {
      onCancel = () => grantFlow(outcome.modelMessage);
      $[10] = grantFlow;
      $[11] = outcome.modelMessage;
      $[12] = onCancel;
    } else onCancel = $[12];
    let content;
    if (
      $[13] !== cwdGetter ||
      $[14] !== backstopSettings ||
      $[15] !== trustRoot ||
      $[16] !== onConfirm ||
      $[17] !== onCancel
    ) {
      content = jsxProd_default(CdTrustPrompt, {
        backstop: true,
        directory: cwdGetter,
        trustRoot,
        disclosures: backstopSettings,
        onConfirm,
        onCancel,
      });
      $[13] = cwdGetter;
      $[14] = backstopSettings;
      $[15] = trustRoot;
      $[16] = onConfirm;
      $[17] = onCancel;
      $[18] = content;
    } else content = $[18];
    return content;
  }
  if (outcome.pending.pendingServers.length === 0) {
    return null;
  }
  let onComplete_2;
  if ($[19] !== modelMessage || $[20] !== onComplete) {
    onComplete_2 = (result) => void onComplete(modelMessage, result);
    $[19] = modelMessage;
    $[20] = onComplete;
    $[21] = onComplete_2;
  } else onComplete_2 = $[21];
  let footer;
  if ($[22] !== outcome.pending || $[23] !== onComplete_2) {
    footer = jsxProd_default(PendingMcpApprovals, {
      pending: outcome.pending,
      onComplete: onComplete_2,
    });
    $[22] = outcome.pending;
    $[23] = onComplete_2;
    $[24] = footer;
  } else footer = $[24];
  return footer;
}
export { CdTrustPrompt, CdUntrustedMoveFlow, runCdCommand };
