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
import { j, R, y } from "../../../vendor/react/cjs/react.production.js";
import {
  collectPermissionTrustSources,
  hasTrustRiskSources,
  formatListWithAnd_2,
  getOtelHeadersHelperSources,
} from "../../components/TrustDialog/utils.js";
import { logForDebugging } from "../../utils/debug.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { useInputClock } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isWithinRecentInput, So } from "../../hooks/useRecentInputGuard.js";
import { escapePathForDisplay, hr } from "../../utils/invisibleChars.js";
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
import { eA } from "../../utils/settings/settingsStorage.js";
import { getPendingProjectMcpServers } from "../../interactiveHelpers.js";
import { blockingSettingsErrors } from "../../utils/settings/settingsNotices.js";
import { MCPServerApprovalDialog } from "../../components/MCPServerApprovalDialog.js";
import { MCPServerMultiselectDialog } from "../../components/MCPServerMultiselectDialog.js";
import { Me } from "../../components/design-system/ThemeProvider.js";

//@ chunk-fh3th4b7.js:14226-14230 placement
j();
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
function no(I) {
  logForDebugging(`/cd: persisting trust failed: ${I}`, { level: "error" });
}
/**
 * /cd 结果消息组件（立即结束）。
 */
//@ chunk-fh3th4b7.js:14452-14810 placement
function CdResultMessage(h) {
  let u = w(7),
    { message: message, args: args, onDone: onDone } = h;
  useTimeout(onDone, 0);
  let l;
  if (u[0] !== args)
    ((l = r(Text, { dimColor: !0, children: [re.pointer, " /cd ", args] })), (u[0] = args), (u[1] = l));
  else l = u[1];
  let p;
  if (u[2] !== message)
    ((p = e(MessageResponse, { children: e(Text, { children: message }) })), (u[2] = message), (u[3] = p));
  else p = u[3];
  let c;
  if (u[4] !== l || u[5] !== p)
    ((c = r(Box, { flexDirection: "column", children: [l, p] })), (u[4] = l), (u[5] = p), (u[6] = c));
  else c = u[6];
  return c;
}
//@ chunk-fh3th4b7.js:14810-17326 placement
function CdTrustPrompt(h) {
  let o = w(36),
    {
      directory: directory,
      trustRoot: trustRoot,
      disclosures: disclosures,
      backstop: backstop,
      onConfirm: onConfirm,
      onCancel: onCancel,
    } = h,
    c = backstop === void 0 ? !1 : backstop,
    v = R(!1),
    f = useInputClock(),
    C;
  if (o[0] === MEMO_CACHE_SENTINEL) ((C = Date.now()), (o[0] = C));
  else C = o[0];
  let M = R(C),
    b;
  if (o[1] !== f)
    ((b = (L) => {
      if (v.current || isWithinRecentInput(f, M.current, So)) {
        return;
      }
      ((v.current = !0), L());
    }),
      (o[1] = f),
      (o[2] = b));
  else b = o[2];
  let k = b;
  const D = c ? "Now in a new directory:" : "Moving to a new directory:";
  let N;
  if (o[3] !== directory) ((N = escapePathForDisplay(directory)), (o[3] = directory), (o[4] = N));
  else N = o[4];
  let P;
  if (o[5] !== N) ((P = e(Text, { bold: !0, children: N })), (o[5] = N), (o[6] = P));
  else P = o[6];
  let X;
  if (o[7] !== trustRoot)
    ((X =
      trustRoot != null &&
      r(Text, {
        children: [
          "This directory is part of the repository at",
          " ",
          e(Text, { bold: !0, children: escapePathForDisplay(trustRoot) }),
          ". Trusting it trusts that whole repository, including its other worktrees and subdirectories.",
        ],
      })),
      (o[7] = trustRoot),
      (o[8] = X));
  else X = o[8];
  let F;
  if (o[9] !== c)
    ((F = c
      ? e(Text, {
          children:
            "Its settings declare project permission rules and/or additional directories. They apply only if you trust this directory explicitly (it is trusted through a parent directory so far).",
        })
      : r(Fragment, {
          children: [
            r(Text, {
              children: [
                "This session hasn",
                "'",
                "t worked here before. Is this a directory you created or one you trust?",
              ],
            }),
            r(Text, { children: ["Claude Code", "'", "ll be able to read, edit, and execute files here."] }),
          ],
        })),
      (o[9] = c),
      (o[10] = F));
  else F = o[10];
  let Y;
  if (o[11] !== c || o[12] !== disclosures)
    ((Y =
      disclosures !== void 0 &&
      hasTrustRiskSources(disclosures, { backstop: c }) &&
      e(TrustDisclosures, { disclosures: disclosures, backstop: c })),
      (o[11] = c),
      (o[12] = disclosures),
      (o[13] = Y));
  else Y = o[13];
  let de;
  if (o[14] === MEMO_CACHE_SENTINEL)
    ((de = e(Text, {
      dimColor: !0,
      children: e(Link, { url: "https://code.claude.com/docs/en/security", children: "Security guide" }),
    })),
      (o[14] = de));
  else de = o[14];
  const I = c ? "Yes, trust it and apply them" : "Yes, move here",
    le = c ? "No, keep them off" : "No, stay put";
  let Q;
  if (o[15] !== k || o[16] !== onConfirm)
    ((Q = () => k(onConfirm)), (o[15] = k), (o[16] = onConfirm), (o[17] = Q));
  else Q = o[17];
  let K;
  if (o[18] !== k || o[19] !== onCancel)
    ((K = () => k(onCancel)), (o[18] = k), (o[19] = onCancel), (o[20] = K));
  else K = o[20];
  let W;
  if (o[21] !== I || o[22] !== le || o[23] !== Q || o[24] !== K)
    ((W = e(ConfirmSelect, {
      hideIndexes: !0,
      cancelFirst: !0,
      focus: "cancel",
      confirmLabel: I,
      cancelLabel: le,
      onConfirm: Q,
      onCancel: K,
      windowMs: So,
    })),
      (o[21] = I),
      (o[22] = le),
      (o[23] = Q),
      (o[24] = K),
      (o[25] = W));
  else W = o[25];
  let Se;
  if (o[26] === MEMO_CACHE_SENTINEL)
    ((Se = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
        ],
      }),
    })),
      (o[26] = Se));
  else Se = o[26];
  let ee;
  if (o[27] !== W || o[28] !== P || o[29] !== X || o[30] !== F || o[31] !== Y)
    ((ee = r(Box, { flexDirection: "column", gap: 1, paddingTop: 1, children: [P, X, F, Y, de, W, Se] })),
      (o[27] = W),
      (o[28] = P),
      (o[29] = X),
      (o[30] = F),
      (o[31] = Y),
      (o[32] = ee));
  else ee = o[32];
  let Pe;
  if (o[33] !== ee || o[34] !== D)
    ((Pe = e(PermissionDialog_2, { color: "warning", titleColor: "warning", title: D, children: ee })),
      (o[33] = ee),
      (o[34] = D),
      (o[35] = Pe));
  else Pe = o[35];
  return Pe;
}
/**
 * 进入目录前的信任披露：预批准规则、额外目录、钩子与命令助手来源。
 */
//@ chunk-fh3th4b7.js:17326-19183 placement
function TrustDisclosures(h) {
  let c = w(22),
    { disclosures: disclosures, backstop: backstop } = h,
    {
      allowRules: allowRules,
      additionalDirectories: additionalDirectories,
      hookSources: hookSources,
      commandHelperSources: commandHelperSources,
    } = disclosures,
    v;
  if (c[0] !== allowRules.rawCount || c[1] !== allowRules.rules || c[2] !== allowRules.sources)
    ((v =
      allowRules.sources.length > 0 &&
      r(Text, {
        bold: !0,
        color: "warning",
        children: [
          e(StatusIcon, { status: "warning", withSpace: !0 }),
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
      })),
      (c[0] = allowRules.rawCount),
      (c[1] = allowRules.rules),
      (c[2] = allowRules.sources),
      (c[3] = v));
  else v = c[3];
  let f;
  if (
    c[4] !== additionalDirectories.dirs ||
    c[5] !== additionalDirectories.rawCount ||
    c[6] !== additionalDirectories.sources
  )
    ((f =
      additionalDirectories.sources.length > 0 &&
      r(Text, {
        bold: !0,
        color: "warning",
        children: [
          e(StatusIcon, { status: "warning", withSpace: !0 }),
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
      })),
      (c[4] = additionalDirectories.dirs),
      (c[5] = additionalDirectories.rawCount),
      (c[6] = additionalDirectories.sources),
      (c[7] = f));
  else f = c[7];
  let o;
  if (c[8] !== backstop || c[9] !== hookSources)
    ((o =
      !backstop &&
      hookSources.length > 0 &&
      r(Text, {
        bold: !0,
        color: "warning",
        children: [
          e(StatusIcon, { status: "warning", withSpace: !0 }),
          "This directory configures hooks that run commands, declared in",
          " ",
          formatListWithAnd_2(hookSources),
        ],
      })),
      (c[8] = backstop),
      (c[9] = hookSources),
      (c[10] = o));
  else o = c[10];
  let C;
  if (c[11] !== backstop || c[12] !== commandHelperSources)
    ((C =
      !backstop &&
      commandHelperSources.length > 0 &&
      r(Text, {
        bold: !0,
        color: "warning",
        children: [
          e(StatusIcon, { status: "warning", withSpace: !0 }),
          "This directory runs commands on the session",
          "'",
          "s behalf (auth / header helpers), declared in ",
          formatListWithAnd_2(commandHelperSources),
        ],
      })),
      (c[11] = backstop),
      (c[12] = commandHelperSources),
      (c[13] = C));
  else C = c[13];
  const M = backstop
    ? "These apply to this session only if you trust it. Only proceed if you trust this configuration."
    : "These will apply to this session as soon as you move. Only proceed if you trust this configuration.";
  let b;
  if (c[14] !== M) ((b = e(Text, { dimColor: !0, children: M })), (c[14] = M), (c[15] = b));
  else b = c[15];
  let L;
  if (c[16] !== v || c[17] !== f || c[18] !== o || c[19] !== C || c[20] !== b)
    ((L = r(Box, { flexDirection: "column", children: [v, f, o, C, b] })),
      (c[16] = v),
      (c[17] = f),
      (c[18] = o),
      (c[19] = C),
      (c[20] = b),
      (c[21] = L));
  else L = c[21];
  return L;
}
/**
 * 先校验路径（不存在、不是目录等给出提示），需要时进入信任对话框； 切换后重载插件与 MCP，待批准的项目 MCP 服务器逐个弹出确认。
 */
//@ chunk-fh3th4b7.js:19183-21594 placement
async function runCdCommand(onDone, context, args) {
  let trimmed = (args ?? "").trim();
  if (!trimmed)
    return e(CdResultMessage, {
      message: "Usage: /cd <path>",
      args: "",
      onDone: () => onDone("Usage: /cd <path>"),
    });
  let validation = await validateCdTarget(trimmed, getToolPermissionContext(context));
  switch (validation.result) {
    case "not_found": {
      let o = `Couldn't find a directory at ${sequential.bold(validation.path)}.`;
      return e(CdResultMessage, { message: o, args: trimmed, onDone: () => onDone(o) });
    }
    case "not_a_directory": {
      let o = `${sequential.bold(validation.path)} is not a directory. Did you mean ${sequential.bold(validation.parent)}?`;
      return e(CdResultMessage, { message: o, args: trimmed, onDone: () => onDone(o) });
    }
    case "same": {
      let o = `Already in ${sequential.bold(hr(validation.directory))}.`;
      return e(CdResultMessage, { message: o, args: trimmed, onDone: () => onDone(o) });
    }
    case "blocked_by_rule": {
      let o = cdRuleRefusalMessage(validation.directory, validation.check, sequential.bold, { display: hr });
      return e(CdResultMessage, { message: o, args: trimmed, onDone: () => onDone(o) });
    }
    case "ok":
      break;
  }
  let directory = validation.directory,
    p = async () => {
      let o;
      try {
        o = await relocateSession(context.session, directory, "cd_command", { storageV5: context.storageV5 });
      } catch (error) {
        return (
          logForDebugging(`/cd relocate failed: ${error}`, { level: "error" }),
          onDone(
            `Couldn't move to ${sequential.bold(hr(directory))} \u2014 the directory may no longer exist, or the session couldn't be moved. Staying in ${sequential.bold(hr(getCwd()))}.`,
          ),
          null
        );
      }
      try {
        context.retireDepartedAdditionalDirectories?.(o.departedAdditionalDirectories);
      } catch (error) {
        logForDebugging(
          `/cd: retiring the previous project's additional directories failed (continuing): ${error}`,
          { level: "error" },
        );
      }
      return {
        modelMessage: o.modelMessage,
        pending: await collectPendingMcpServers(context),
        projectGrantsGated: o.projectGrantsGated,
        gatedNotice: o.gatedNotice,
      };
    },
    c = async (o, C) => {
      if ((await reloadPluginsSafe(context), C?.persistFailed))
        logFeatureBad("mcp_project_approval_dialog", "mcp_approval_persist_failed");
      else if (C) logFeatureOk("mcp_project_approval_dialog");
      onDone(
        C?.persistFailed
          ? `Moved to ${sequential.bold(hr(directory))}. One or more of your MCP server choices could not be saved (check permissions on .claude/settings.local.json) \u2014 you will be asked again next time.`
          : `Moved to ${sequential.bold(hr(directory))}`,
        { display: "system", metaMessages: [o] },
      );
    };
  if (isPathTrusted(directory)) {
    let o = await p();
    if (o === null) return null;
    if (o.projectGrantsGated) return e(CdOutcomeView, { outcome: o, onComplete: c });
    if (o.pending.pendingServers.length === 0) return (await c(o.modelMessage), null);
    return e(PendingMcpApprovals, { pending: o.pending, onComplete: (C) => void c(o.modelMessage, C) });
  }
  let v = eA(resolve(directory)),
    f;
  try {
    f = getOtelHeadersHelperSources(directory);
  } catch (error) {
    logForDebugging(`/cd: reading the target's project settings for the trust prompt failed: ${error}`, {
      level: "error",
    });
  }
  return e(CdUntrustedMoveFlow, {
    directory: directory,
    trustRoot: v != null && v !== resolve(directory) ? v : void 0,
    disclosures: f,
    onConfirm: async () => (
      await recordDirectoryTrust(directory, context.storageV5).catch((o) => {
        logForDebugging(`/cd: persisting trust failed: ${o}`, { level: "error" });
      }),
      p()
    ),
    onComplete: c,
    onCancel: () => {
      onDone(`Staying in ${sequential.bold(hr(getCwd()))}`);
    },
  });
}
/**
 * 收集新目录待批准的项目 MCP 服务器（设置文件有错时不弹）。
 */
//@ chunk-fh3th4b7.js:21594-22016 placement
async function collectPendingMcpServers(h) {
  let i = { pendingServers: [], pluginServerNames: new Set() };
  try {
    let d = await getPendingProjectMcpServers(h.storageV5);
    if (d.pendingServers.length > 0 && blockingSettingsErrors().length > 0)
      return (
        logForDebugging(
          "/cd: project MCP servers await approval but a settings file has errors; leaving them pending",
          { level: "warn" },
        ),
        i
      );
    return d;
  } catch (error) {
    return (
      logForDebugging(
        `/cd: collecting the new directory's project MCP servers failed (continuing without approvals): ${error}`,
        { level: "error" },
      ),
      i
    );
  }
}
//@ chunk-fh3th4b7.js:22016-22174 placement
async function reloadPluginsSafe(h) {
  try {
    await h.reloadPlugins?.();
  } catch (error) {
    logForDebugging(`/cd: refreshing plugins/MCP for the new directory failed (continuing): ${error}`, {
      level: "error",
    });
  }
}
/**
 * 逐个弹出待批准 MCP 服务器的确认。
 */
//@ chunk-fh3th4b7.js:22174-22787 placement
function PendingMcpApprovals(h) {
  let l = w(11),
    { pending: pending, onComplete: onComplete } = h,
    [a, ...u] = pending.pendingServers;
  if (a !== void 0 && u.length === 0) {
    let p;
    if (l[0] !== a || l[1] !== pending.pluginServerNames)
      ((p = pending.pluginServerNames.has(a)), (l[0] = a), (l[1] = pending.pluginServerNames), (l[2] = p));
    else p = l[2];
    let c;
    if (l[3] !== onComplete || l[4] !== a || l[5] !== p)
      ((c = e(MCPServerApprovalDialog, { serverName: a, isPluginServer: p, onDone: onComplete })),
        (l[3] = onComplete),
        (l[4] = a),
        (l[5] = p),
        (l[6] = c));
    else c = l[6];
    return c;
  }
  let p;
  if (l[7] !== onComplete || l[8] !== pending.pendingServers || l[9] !== pending.pluginServerNames)
    ((p = e(MCPServerMultiselectDialog, {
      serverNames: pending.pendingServers,
      pluginServerNames: pending.pluginServerNames,
      onDone: onComplete,
    })),
      (l[7] = onComplete),
      (l[8] = pending.pendingServers),
      (l[9] = pending.pluginServerNames),
      (l[10] = p));
  else p = l[10];
  return p;
}
//@ chunk-fh3th4b7.js:22787-23697 placement
function CdUntrustedMoveFlow(h) {
  let f = w(18),
    {
      directory: directory,
      trustRoot: trustRoot,
      disclosures: disclosures,
      onConfirm: onConfirm,
      onComplete: onComplete,
      onCancel: onCancel,
    } = h,
    [c, v] = y(null);
  if (c !== null) {
    if (c.projectGrantsGated) {
      let o;
      if (f[0] !== c || f[1] !== onComplete)
        ((o = e(CdOutcomeView, { outcome: c, onComplete: onComplete })),
          (f[0] = c),
          (f[1] = onComplete),
          (f[2] = o));
      else o = f[2];
      return o;
    }
    let o;
    if (f[3] !== c.modelMessage || f[4] !== onComplete)
      ((o = (C) => void onComplete(c.modelMessage, C)),
        (f[3] = c.modelMessage),
        (f[4] = onComplete),
        (f[5] = o));
    else o = f[5];
    let M;
    if (f[6] !== c.pending || f[7] !== o)
      ((M = e(PendingMcpApprovals, { pending: c.pending, onComplete: o })),
        (f[6] = c.pending),
        (f[7] = o),
        (f[8] = M));
    else M = f[8];
    return M;
  }
  let o;
  if (f[9] !== onComplete || f[10] !== onConfirm)
    ((o = () => {
      onConfirm().then((b) => {
        if (b === null) {
          return;
        }
        if (!b.projectGrantsGated && b.pending.pendingServers.length === 0) {
          return onComplete(b.modelMessage);
        }
        v(b);
      });
    }),
      (f[9] = onComplete),
      (f[10] = onConfirm),
      (f[11] = o));
  else o = f[11];
  let M;
  if (
    f[12] !== directory ||
    f[13] !== disclosures ||
    f[14] !== onCancel ||
    f[15] !== o ||
    f[16] !== trustRoot
  )
    ((M = e(CdTrustPrompt, {
      directory: directory,
      trustRoot: trustRoot,
      disclosures: disclosures,
      onConfirm: o,
      onCancel: onCancel,
    })),
      (f[12] = directory),
      (f[13] = disclosures),
      (f[14] = onCancel),
      (f[15] = o),
      (f[16] = trustRoot),
      (f[17] = M));
  else M = f[17];
  return M;
}
/**
 * /cd 结果视图（先处理项目授权，再完成）。
 */
//@ chunk-fh3th4b7.js:23697-25009 placement
function CdOutcomeView(h) {
  let f = w(25),
    { outcome: outcome, onComplete: onComplete } = h,
    { storageV5: storageV5 } = Me(),
    [u, l] = y(outcome.modelMessage),
    [p, c] = y(!outcome.projectGrantsGated),
    [v] = y(getCwd),
    o;
  if (f[0] !== v) ((o = () => eA(v)), (f[0] = v), (f[1] = o));
  else o = f[1];
  let [C] = y(o),
    [M] = y(readBackstopSettingsSafe);
  if (!p) {
    let b;
    if (f[2] !== onComplete || f[3] !== outcome.pending.pendingServers.length)
      ((b = (L) => {
        if ((l(L), c(!0), outcome.pending.pendingServers.length === 0)) onComplete(L);
      }),
        (f[2] = onComplete),
        (f[3] = outcome.pending.pendingServers.length),
        (f[4] = b));
    else b = f[4];
    let k = b;
    const D = C != null && C !== v ? C : void 0;
    let N;
    if (f[5] !== v || f[6] !== k || f[7] !== outcome || f[8] !== storageV5)
      ((N = () => {
        recordDirectoryTrust(v, storageV5)
          .catch(no)
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
      }),
        (f[5] = v),
        (f[6] = k),
        (f[7] = outcome),
        (f[8] = storageV5),
        (f[9] = N));
    else N = f[9];
    let P;
    if (f[10] !== k || f[11] !== outcome.modelMessage)
      ((P = () => k(outcome.modelMessage)), (f[10] = k), (f[11] = outcome.modelMessage), (f[12] = P));
    else P = f[12];
    let F;
    if (f[13] !== v || f[14] !== M || f[15] !== D || f[16] !== N || f[17] !== P)
      ((F = e(CdTrustPrompt, {
        backstop: !0,
        directory: v,
        trustRoot: D,
        disclosures: M,
        onConfirm: N,
        onCancel: P,
      })),
        (f[13] = v),
        (f[14] = M),
        (f[15] = D),
        (f[16] = N),
        (f[17] = P),
        (f[18] = F));
    else F = f[18];
    return F;
  }
  if (outcome.pending.pendingServers.length === 0) {
    return null;
  }
  let b;
  if (f[19] !== u || f[20] !== onComplete)
    ((b = (Y) => void onComplete(u, Y)), (f[19] = u), (f[20] = onComplete), (f[21] = b));
  else b = f[21];
  let D;
  if (f[22] !== outcome.pending || f[23] !== b)
    ((D = e(PendingMcpApprovals, { pending: outcome.pending, onComplete: b })),
      (f[22] = outcome.pending),
      (f[23] = b),
      (f[24] = D));
  else D = f[24];
  return D;
}
