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
import { init_react_production, R, y } from "../../../vendor/react/cjs/react.production.js";
import {
  collectPermissionTrustSources,
  hasTrustRiskSources,
  formatListWithAnd_2,
  getOtelHeadersHelperSources,
} from "../../components/TrustDialog/utils.js";
import { logForDebugging } from "../../utils/debug.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
    let de = error;
    logForDebugging(`/cd: reading the project settings for the backstop prompt failed: ${de}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-fh3th4b7.js:14381-14452 placement
function logPersistTrustFailure(I) {
  logForDebugging(`/cd: persisting trust failed: ${I}`, {
    level: "error",
  });
}
//@ chunk-fh3th4b7.js:14452-14810 placement
/**
 * /cd 结果消息组件（立即结束）。
 */
function CdResultMessage(props) {
  let u = w(7);
  let { message, args, onDone } = props;
  useTimeout(onDone, 0);
  let l;
  if (u[0] !== args) {
    l = jsxProd_default_2(Text, {
      dimColor: true,
      children: [figures_default.pointer, " /cd ", args],
    });
    u[0] = args;
    u[1] = l;
  } else l = u[1];
  let p;
  if (u[2] !== message) {
    p = jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        children: message,
      }),
    });
    u[2] = message;
    u[3] = p;
  } else p = u[3];
  let c;
  if (u[4] !== l || u[5] !== p) {
    c = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [l, p],
    });
    u[4] = l;
    u[5] = p;
    u[6] = c;
  } else c = u[6];
  return c;
}
//@ chunk-fh3th4b7.js:14810-17326 placement
function CdTrustPrompt(props) {
  let o = w(36);
  let { directory, trustRoot, disclosures, backstop, onConfirm, onCancel } = props;
  let c = backstop === undefined ? false : backstop;
  let v = R(false);
  let inputClock = useInputClock();
  let C;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    C = Date.now();
    o[0] = C;
  } else C = o[0];
  let M = R(C);
  let b;
  if (o[1] !== inputClock) {
    b = (L) => {
      if (v.current || isWithinRecentInput(inputClock, M.current, RECENT_INPUT_GUARD_MS)) {
        return;
      }
      v.current = true;
      L();
    };
    o[1] = inputClock;
    o[2] = b;
  } else b = o[2];
  let k = b;
  const title = c ? "Now in a new directory:" : "Moving to a new directory:";
  let children;
  if (o[3] !== directory) {
    children = escapePathForDisplay(directory);
    o[3] = directory;
    o[4] = children;
  } else children = o[4];
  let P;
  if (o[5] !== children) {
    P = jsxProd_default(Text, {
      bold: true,
      children,
    });
    o[5] = children;
    o[6] = P;
  } else P = o[6];
  let X;
  if (o[7] !== trustRoot) {
    X =
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
    o[7] = trustRoot;
    o[8] = X;
  } else X = o[8];
  let F;
  if (o[9] !== c) {
    F = c
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
    o[9] = c;
    o[10] = F;
  } else F = o[10];
  let Y;
  if (o[11] !== c || o[12] !== disclosures) {
    Y =
      disclosures !== undefined &&
      hasTrustRiskSources(disclosures, {
        backstop: c,
      }) &&
      jsxProd_default(TrustDisclosures, {
        disclosures,
        backstop: c,
      });
    o[11] = c;
    o[12] = disclosures;
    o[13] = Y;
  } else Y = o[13];
  let de;
  if (o[14] === MEMO_CACHE_SENTINEL) {
    de = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(Link, {
        url: "https://code.claude.com/docs/en/security",
        children: "Security guide",
      }),
    });
    o[14] = de;
  } else de = o[14];
  const confirmLabel = c ? "Yes, trust it and apply them" : "Yes, move here";
  const cancelLabel = c ? "No, keep them off" : "No, stay put";
  let onConfirm_2;
  if (o[15] !== k || o[16] !== onConfirm) {
    onConfirm_2 = () => k(onConfirm);
    o[15] = k;
    o[16] = onConfirm;
    o[17] = onConfirm_2;
  } else onConfirm_2 = o[17];
  let onCancel_2;
  if (o[18] !== k || o[19] !== onCancel) {
    onCancel_2 = () => k(onCancel);
    o[18] = k;
    o[19] = onCancel;
    o[20] = onCancel_2;
  } else onCancel_2 = o[20];
  let W;
  if (o[21] !== confirmLabel || o[22] !== cancelLabel || o[23] !== onConfirm_2 || o[24] !== onCancel_2) {
    W = jsxProd_default(ConfirmSelect, {
      hideIndexes: true,
      cancelFirst: true,
      focus: "cancel",
      confirmLabel,
      cancelLabel,
      onConfirm: onConfirm_2,
      onCancel: onCancel_2,
      windowMs: RECENT_INPUT_GUARD_MS,
    });
    o[21] = confirmLabel;
    o[22] = cancelLabel;
    o[23] = onConfirm_2;
    o[24] = onCancel_2;
    o[25] = W;
  } else W = o[25];
  let Se;
  if (o[26] === MEMO_CACHE_SENTINEL) {
    Se = jsxProd_default(Text, {
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
    o[26] = Se;
  } else Se = o[26];
  let children_2;
  if (o[27] !== W || o[28] !== P || o[29] !== X || o[30] !== F || o[31] !== Y) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      paddingTop: 1,
      children: [P, X, F, Y, de, W, Se],
    });
    o[27] = W;
    o[28] = P;
    o[29] = X;
    o[30] = F;
    o[31] = Y;
    o[32] = children_2;
  } else children_2 = o[32];
  let Pe;
  if (o[33] !== children_2 || o[34] !== title) {
    Pe = jsxProd_default(PermissionDialog_2, {
      color: "warning",
      titleColor: "warning",
      title,
      children: children_2,
    });
    o[33] = children_2;
    o[34] = title;
    o[35] = Pe;
  } else Pe = o[35];
  return Pe;
}
//@ chunk-fh3th4b7.js:17326-19183 placement
/**
 * 进入目录前的信任披露：预批准规则、额外目录、钩子与命令助手来源。
 */
function TrustDisclosures(props) {
  let c = w(22);
  let { disclosures, backstop } = props;
  let { allowRules, additionalDirectories, hookSources, commandHelperSources } = disclosures;
  let v;
  if (c[0] !== allowRules.rawCount || c[1] !== allowRules.rules || c[2] !== allowRules.sources) {
    v =
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
    c[0] = allowRules.rawCount;
    c[1] = allowRules.rules;
    c[2] = allowRules.sources;
    c[3] = v;
  } else v = c[3];
  let f;
  if (
    c[4] !== additionalDirectories.dirs ||
    c[5] !== additionalDirectories.rawCount ||
    c[6] !== additionalDirectories.sources
  ) {
    f =
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
    c[4] = additionalDirectories.dirs;
    c[5] = additionalDirectories.rawCount;
    c[6] = additionalDirectories.sources;
    c[7] = f;
  } else f = c[7];
  let o;
  if (c[8] !== backstop || c[9] !== hookSources) {
    o =
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
    c[8] = backstop;
    c[9] = hookSources;
    c[10] = o;
  } else o = c[10];
  let C;
  if (c[11] !== backstop || c[12] !== commandHelperSources) {
    C =
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
    c[11] = backstop;
    c[12] = commandHelperSources;
    c[13] = C;
  } else C = c[13];
  const children = backstop
    ? "These apply to this session only if you trust it. Only proceed if you trust this configuration."
    : "These will apply to this session as soon as you move. Only proceed if you trust this configuration.";
  let b;
  if (c[14] !== children) {
    b = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    c[14] = children;
    c[15] = b;
  } else b = c[15];
  let L;
  if (c[16] !== v || c[17] !== f || c[18] !== o || c[19] !== C || c[20] !== b) {
    L = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [v, f, o, C, b],
    });
    c[16] = v;
    c[17] = f;
    c[18] = o;
    c[19] = C;
    c[20] = b;
    c[21] = L;
  } else L = c[21];
  return L;
}
//@ chunk-fh3th4b7.js:19183-21594 placement
/**
 * 先校验路径（不存在、不是目录等给出提示），需要时进入信任对话框； 切换后重载插件与 MCP，待批准的项目 MCP 服务器逐个弹出确认。
 */
async function runCdCommand(onDone, context, args) {
  let trimmed = (args ?? "").trim();
  if (!trimmed)
    return jsxProd_default(CdResultMessage, {
      message: "Usage: /cd <path>",
      args: "",
      onDone: () => onDone("Usage: /cd <path>"),
    });
  let validation = await validateCdTarget(trimmed, getToolPermissionContext(context));
  switch (validation.result) {
    case "not_found": {
      let o = `Couldn't find a directory at ${sequential.bold(validation.path)}.`;
      return jsxProd_default(CdResultMessage, {
        message: o,
        args: trimmed,
        onDone: () => onDone(o),
      });
    }
    case "not_a_directory": {
      let o = `${sequential.bold(validation.path)} is not a directory. Did you mean ${sequential.bold(validation.parent)}?`;
      return jsxProd_default(CdResultMessage, {
        message: o,
        args: trimmed,
        onDone: () => onDone(o),
      });
    }
    case "same": {
      let o = `Already in ${sequential.bold(stripInvisibleChars(validation.directory))}.`;
      return jsxProd_default(CdResultMessage, {
        message: o,
        args: trimmed,
        onDone: () => onDone(o),
      });
    }
    case "blocked_by_rule": {
      let o = cdRuleRefusalMessage(validation.directory, validation.check, sequential.bold, {
        display: stripInvisibleChars,
      });
      return jsxProd_default(CdResultMessage, {
        message: o,
        args: trimmed,
        onDone: () => onDone(o),
      });
    }
    case "ok":
      break;
  }
  let directory = validation.directory;
  let p = async () => {
    let o;
    try {
      o = await relocateSession(context.session, directory, "cd_command", {
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
      context.retireDepartedAdditionalDirectories?.(o.departedAdditionalDirectories);
    } catch (error) {
      logForDebugging(
        `/cd: retiring the previous project's additional directories failed (continuing): ${error}`,
        {
          level: "error",
        },
      );
    }
    return {
      modelMessage: o.modelMessage,
      pending: await collectPendingMcpServers(context),
      projectGrantsGated: o.projectGrantsGated,
      gatedNotice: o.gatedNotice,
    };
  };
  let c = async (modelMessage, C) => {
    await reloadPluginsSafe(context);
    if (C?.persistFailed) logFeatureBad("mcp_project_approval_dialog", "mcp_approval_persist_failed");
    else if (C) logFeatureOk("mcp_project_approval_dialog");
    onDone(
      C?.persistFailed
        ? `Moved to ${sequential.bold(stripInvisibleChars(directory))}. One or more of your MCP server choices could not be saved (check permissions on .claude/settings.local.json) \u2014 you will be asked again next time.`
        : `Moved to ${sequential.bold(stripInvisibleChars(directory))}`,
      {
        display: "system",
        metaMessages: [modelMessage],
      },
    );
  };
  if (isPathTrusted(directory)) {
    let o = await p();
    if (o === null) return null;
    if (o.projectGrantsGated)
      return jsxProd_default(CdOutcomeView, {
        outcome: o,
        onComplete: c,
      });
    if (o.pending.pendingServers.length === 0) {
      await c(o.modelMessage);
      return null;
    }
    return jsxProd_default(PendingMcpApprovals, {
      pending: o.pending,
      onComplete: (C) => void c(o.modelMessage, C),
    });
  }
  let v = uncachedStorageRootFor(resolve(directory));
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
    trustRoot: v != null && v !== resolve(directory) ? v : undefined,
    disclosures,
    onConfirm: async () => {
      await recordDirectoryTrust(directory, context.storageV5).catch((error) => {
        logForDebugging(`/cd: persisting trust failed: ${error}`, {
          level: "error",
        });
      });
      return p();
    },
    onComplete: c,
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
  let i = {
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
      return i;
    }
    return pendingProjectMcpServers;
  } catch (error) {
    logForDebugging(
      `/cd: collecting the new directory's project MCP servers failed (continuing without approvals): ${error}`,
      {
        level: "error",
      },
    );
    return i;
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
  let l = w(11);
  let { pending, onComplete } = props;
  let [a, ...u] = pending.pendingServers;
  if (a !== undefined && u.length === 0) {
    let isPluginServer;
    if (l[0] !== a || l[1] !== pending.pluginServerNames) {
      isPluginServer = pending.pluginServerNames.has(a);
      l[0] = a;
      l[1] = pending.pluginServerNames;
      l[2] = isPluginServer;
    } else isPluginServer = l[2];
    let c;
    if (l[3] !== onComplete || l[4] !== a || l[5] !== isPluginServer) {
      c = jsxProd_default(MCPServerApprovalDialog, {
        serverName: a,
        isPluginServer,
        onDone: onComplete,
      });
      l[3] = onComplete;
      l[4] = a;
      l[5] = isPluginServer;
      l[6] = c;
    } else c = l[6];
    return c;
  }
  let p;
  if (l[7] !== onComplete || l[8] !== pending.pendingServers || l[9] !== pending.pluginServerNames) {
    p = jsxProd_default(MCPServerMultiselectDialog, {
      serverNames: pending.pendingServers,
      pluginServerNames: pending.pluginServerNames,
      onDone: onComplete,
    });
    l[7] = onComplete;
    l[8] = pending.pendingServers;
    l[9] = pending.pluginServerNames;
    l[10] = p;
  } else p = l[10];
  return p;
}
//@ chunk-fh3th4b7.js:22787-23697 placement
function CdUntrustedMoveFlow(props) {
  let f = w(18);
  let { directory, trustRoot, disclosures, onConfirm, onComplete, onCancel } = props;
  let [c, v] = y(null);
  if (c !== null) {
    if (c.projectGrantsGated) {
      let o;
      if (f[0] !== c || f[1] !== onComplete) {
        o = jsxProd_default(CdOutcomeView, {
          outcome: c,
          onComplete,
        });
        f[0] = c;
        f[1] = onComplete;
        f[2] = o;
      } else o = f[2];
      return o;
    }
    let onComplete_2;
    if (f[3] !== c.modelMessage || f[4] !== onComplete) {
      onComplete_2 = (C) => void onComplete(c.modelMessage, C);
      f[3] = c.modelMessage;
      f[4] = onComplete;
      f[5] = onComplete_2;
    } else onComplete_2 = f[5];
    let M;
    if (f[6] !== c.pending || f[7] !== onComplete_2) {
      M = jsxProd_default(PendingMcpApprovals, {
        pending: c.pending,
        onComplete: onComplete_2,
      });
      f[6] = c.pending;
      f[7] = onComplete_2;
      f[8] = M;
    } else M = f[8];
    return M;
  }
  let onConfirm_2;
  if (f[9] !== onComplete || f[10] !== onConfirm) {
    onConfirm_2 = () => {
      onConfirm().then((b) => {
        if (b === null) {
          return;
        }
        if (!b.projectGrantsGated && b.pending.pendingServers.length === 0) {
          return onComplete(b.modelMessage);
        }
        v(b);
      });
    };
    f[9] = onComplete;
    f[10] = onConfirm;
    f[11] = onConfirm_2;
  } else onConfirm_2 = f[11];
  let M;
  if (
    f[12] !== directory ||
    f[13] !== disclosures ||
    f[14] !== onCancel ||
    f[15] !== onConfirm_2 ||
    f[16] !== trustRoot
  ) {
    M = jsxProd_default(CdTrustPrompt, {
      directory,
      trustRoot,
      disclosures,
      onConfirm: onConfirm_2,
      onCancel,
    });
    f[12] = directory;
    f[13] = disclosures;
    f[14] = onCancel;
    f[15] = onConfirm_2;
    f[16] = trustRoot;
    f[17] = M;
  } else M = f[17];
  return M;
}
//@ chunk-fh3th4b7.js:23697-25009 placement
/**
 * /cd 结果视图（先处理项目授权，再完成）。
 */
function CdOutcomeView(props) {
  let f = w(25);
  let { outcome, onComplete } = props;
  let { storageV5 } = useTheme_2();
  let [modelMessage, setModelMessage] = y(outcome.modelMessage);
  let [p, c] = y(!outcome.projectGrantsGated);
  let [v] = y(getCwd);
  let o;
  if (f[0] !== v) {
    o = () => uncachedStorageRootFor(v);
    f[0] = v;
    f[1] = o;
  } else o = f[1];
  let [C] = y(o);
  let [M] = y(readBackstopSettingsSafe);
  if (!p) {
    let b;
    if (f[2] !== onComplete || f[3] !== outcome.pending.pendingServers.length) {
      b = (L) => {
        setModelMessage(L);
        c(true);
        if (outcome.pending.pendingServers.length === 0) onComplete(L);
      };
      f[2] = onComplete;
      f[3] = outcome.pending.pendingServers.length;
      f[4] = b;
    } else b = f[4];
    let k = b;
    const trustRoot = C != null && C !== v ? C : undefined;
    let onConfirm;
    if (f[5] !== v || f[6] !== k || f[7] !== outcome || f[8] !== storageV5) {
      onConfirm = () => {
        recordDirectoryTrust(v, storageV5)
          .catch(logPersistTrustFailure)
          .then(() => {
            try {
              reapplyProjectSettingsAfterTrustChange();
            } catch (error) {
              let X = error;
              logForDebugging(`/cd: re-applying the project settings after the trust change failed: ${X}`, {
                level: "error",
              });
            }
            k(withGatedGrantsApplied(outcome));
          });
      };
      f[5] = v;
      f[6] = k;
      f[7] = outcome;
      f[8] = storageV5;
      f[9] = onConfirm;
    } else onConfirm = f[9];
    let onCancel;
    if (f[10] !== k || f[11] !== outcome.modelMessage) {
      onCancel = () => k(outcome.modelMessage);
      f[10] = k;
      f[11] = outcome.modelMessage;
      f[12] = onCancel;
    } else onCancel = f[12];
    let F;
    if (f[13] !== v || f[14] !== M || f[15] !== trustRoot || f[16] !== onConfirm || f[17] !== onCancel) {
      F = jsxProd_default(CdTrustPrompt, {
        backstop: true,
        directory: v,
        trustRoot,
        disclosures: M,
        onConfirm,
        onCancel,
      });
      f[13] = v;
      f[14] = M;
      f[15] = trustRoot;
      f[16] = onConfirm;
      f[17] = onCancel;
      f[18] = F;
    } else F = f[18];
    return F;
  }
  if (outcome.pending.pendingServers.length === 0) {
    return null;
  }
  let onComplete_2;
  if (f[19] !== modelMessage || f[20] !== onComplete) {
    onComplete_2 = (Y) => void onComplete(modelMessage, Y);
    f[19] = modelMessage;
    f[20] = onComplete;
    f[21] = onComplete_2;
  } else onComplete_2 = f[21];
  let D;
  if (f[22] !== outcome.pending || f[23] !== onComplete_2) {
    D = jsxProd_default(PendingMcpApprovals, {
      pending: outcome.pending,
      onComplete: onComplete_2,
    });
    f[22] = outcome.pending;
    f[23] = onComplete_2;
    f[24] = D;
  } else D = f[24];
  return D;
}
