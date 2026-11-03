/**
 * bridge/workspaceTrustPrompt.ts
 *
 * 2.1.316 新增。claude rc（Remote Control）启动前的工作区信任询问与警告排版。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p3rkx9n6.js (14)
 * attribution: placement 14
 */
import { isDemoOrClaubbet } from "../plugins/functionHooks/policyGate.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { getEnvCaseInsensitive } from "../utils/plugins/securityDefaultPlugin.js";
import { getPreSettingsEnvSnapshot } from "../utils/managedEnvApply.js";
import { MIN_CONFIRM_ANSWER_DELAY_MS, TOO_FAST_ANSWER_TEXT, confirmPrompt } from "../utils/confirmPrompt.js";
import {
  escapePathForDisplay,
  truncatePathForDisplay,
  truncatePathForDisplay_2,
} from "../utils/invisibleChars.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { uncachedStorageRootFor } from "../utils/settings/settingsStorage.js";
import { samePath } from "../utils/file.js";
import { identity } from "../utils/pathClassification.js";
import { createCombinedAbortSignal } from "../utils/combinedAbortSignal.js";
import { recordDirectoryTrust } from "../utils/sessionRelocation.js";
import { logForDebugging } from "../utils/debug.js";
import { getHomeTrustDialogAccepted, setSessionTrustAccepted } from "../bootstrap/state.js";
import {
  getOtelHeadersHelperSources,
  getBashAndMcpPermissionSources,
  truncateTrustLine,
  getHooksSources_10,
  getHooksSources_5,
  formatListWithAnd_2,
} from "../components/TrustDialog/utils.js";
import { projectSettingsAliasesUserSettings } from "../utils/settings/settings.js";
import { getMcpConfigsByScope } from "../services/mcp/config.js";
import { plural } from "../utils/stringUtils.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { truncateToWidth } from "../utils/format.js";

//@ chunk-p3rkx9n6.js:12247-12630 placement
/**
 * Remote Control（claude rc）工作区信任提示的文案。
 */
var REMOTE_CONTROL_TRUST_COPY = {
  feature: "remote_control_workspace_trust",
  name: "Remote Control",
  command: "claude rc",
  opening: "Remote Control starts Claude Code sessions in this folder, driven from your other devices:",
  grant:
    "Sessions started here can read, edit, and execute files, and this folder's project settings (hooks, MCP servers, permission rules, helper commands) apply to them.",
  unattendedRemedy: "",
};
//@ chunk-p3rkx9n6.js:12630-12731 placement
/**
 * stdin/stdout 都是 TTY、非某种无头模式且不在 CI 时才能交互询问。
 */
function canPromptInteractively() {
  return (
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    !isDemoOrClaubbet() &&
    !isEnvTruthy(getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CI"))
  );
}
//@ chunk-p3rkx9n6.js:12731-14945 placement
async function promptWorkspaceTrustForRemoteControl({
  dir,
  isHomeDir,
  canPrompt,
  storageV5,
  asker = REMOTE_CONTROL_TRUST_COPY,
  input = process.stdin,
  answerGraceMs = MIN_CONFIRM_ANSWER_DELAY_MS,
  answerTimeoutMs,
  screen = getTerminalSize(),
}) {
  let i = escapePathForDisplay(dir);
  let y = truncatePathForDisplay(i);
  let S = truncatePathForDisplay_2(i);
  let a =
    (isHomeDir
      ? `Error: Workspace not trusted. ${i} is your home directory, and for security home-directory trust is never saved, so running \`claude\` here first won't help. Run \`${asker.command}\` from a project directory instead (run \`claude\` there once to accept the trust dialog).`
      : `Error: Workspace not trusted. Please run \`claude\` in ${i} first to review and accept the workspace trust dialog.`) +
    asker.unattendedRemedy;
  if (!canPrompt) {
    logFeatureBad(asker.feature, "cannot_ask");
    return {
      trusted: false,
      reason: "no_prompt",
      message: a,
    };
  }
  let u = uncachedStorageRootFor(dir);
  let d = !isHomeDir && u !== null && !samePath(u, identity(dir));
  let w = [
    "",
    asker.opening,
    `  ${y}`,
    "",
    `Quick safety check: is this a project you created or one you trust? ${asker.grant}`,
  ];
  let c = [
    ...(d
      ? [
          `This folder is part of the repository at ${truncatePathForDisplay(u)}; trusting it trusts that whole repository, including when you run \`claude\` there.`,
        ]
      : []),
    ...(isHomeDir ? ["This is your home directory, so trust lasts for this run only and is not saved."] : []),
    "Security guide: https://code.claude.com/docs/en/security",
  ];
  let _ = `Trust ${S}?`;
  let v = fitTrustWarnings(
    workspaceTrustWarnings(dir),
    screen,
    screen === undefined
      ? 0
      : countWrappedRows([...w, ...c, TOO_FAST_ANSWER_TEXT, `${_} [y/N] `], screen.columns),
  );
  if (v === "too_small" && screen !== undefined) {
    logFeatureBad(asker.feature, "terminal_too_small");
    return {
      trusted: false,
      reason: "no_prompt",
      message: formatTerminalTooSmallError(screen, i, isHomeDir, asker.command),
    };
  }
  let E = v === "too_small" ? [] : v;
  let joined = [...w, ...E, ...c]
    .map(
      (R) => `${R}
`,
    )
    .join("");
  process.stdout.write(joined);
  let k =
    answerTimeoutMs === undefined
      ? undefined
      : createCombinedAbortSignal(undefined, {
          timeoutMs: answerTimeoutMs,
          refTimer: true,
        });
  let A = await confirmPrompt(_, input, {
    ignoreAnswersWithinMs: answerGraceMs,
    reaskPreamble: joined,
    signal: k?.signal,
  }).finally(() => k?.cleanup());
  if (k?.signal.aborted === true) {
    logFeatureBad(asker.feature, "no_answer");
    return {
      trusted: false,
      reason: "no_prompt",
      message: `
No answer in time.
${a}`,
    };
  }
  if (!A) {
    logFeatureSad(asker.feature, "declined");
    return {
      trusted: false,
      reason: "declined",
      message: `${asker.name} did not start: ${i} is not trusted. Run \`${asker.command}\` again to trust it.`,
    };
  }
  let x = await recordDirectoryTrust(dir, storageV5).catch((error) => {
    logForDebugging(`[bridge:init] persisting workspace trust failed: ${error}`, {
      level: "error",
    });
    return false;
  });
  let M = isHomeDir || getHomeTrustDialogAccepted();
  if (!x && !M) {
    process.stderr
      .write(`Couldn't save that choice to your Claude Code config, so you'll be asked again next time.
`);
    logFeatureSad(asker.feature, "not_saved");
  } else
    logFeatureOk(asker.feature, {
      saved: x,
    });
  setSessionTrustAccepted(true);
  return {
    trusted: true,
  };
}
//@ chunk-p3rkx9n6.js:14945-16666 placement
function workspaceTrustWarnings(dir) {
  let otelHeadersHelperSources = getOtelHeadersHelperSources(dir);
  let s = projectSettingsAliasesUserSettings();
  let { allowRules, additionalDirectories, hookSources, commandHelperSources } = s
    ? dropSourceOnlyWarnings(otelHeadersHelperSources)
    : otelHeadersHelperSources;
  let h = (hooksSources) =>
    s ? hooksSources.filter((_) => _ !== PROJECT_SETTINGS_RELATIVE_PATH) : hooksSources;
  let bashAndMcpPermissionSources = getBashAndMcpPermissionSources();
  let keys = Object.keys(
    getMcpConfigsByScope("project", {
      expandVars: false,
    }).servers,
  );
  let filtered = keys.map(truncateTrustLine).filter((c) => c.length > 0);
  let S = h(getHooksSources_10());
  let a = h(getHooksSources_5());
  let u = [];
  let d = (text) =>
    u.push({
      text,
      endsInList: false,
    });
  let w = (text) =>
    u.push({
      text,
      endsInList: true,
    });
  if (commandHelperSources.length > 0)
    d(
      `This folder runs credential helper commands (apiKeyHelper, awsAuthRefresh and the like), declared in ${formatListWithAnd_2(commandHelperSources)}`,
    );
  if (bashAndMcpPermissionSources.length > 0)
    d(
      `This folder runs commands to mint HTTP headers (headersHelper), declared in ${formatListWithAnd_2(bashAndMcpPermissionSources)}`,
    );
  if (S.length > 0)
    d(
      `This folder sets environment variables for every session here (they can redirect requests and credentials, or change which programs run), declared in ${formatListWithAnd_2(S)}`,
    );
  if (hookSources.length > 0)
    d(`This folder configures hooks that run commands, declared in ${formatListWithAnd_2(hookSources)}`);
  if (keys.length > 0)
    w(
      `Sessions started here launch, without asking, ${keys.length} ${plural(keys.length, "MCP server")} from .mcp.json files in this folder or above it: ` +
        (filtered.length > 0
          ? formatListWithAnd_2(filtered, 8)
          : "(server names contain unprintable characters)"),
    );
  if (allowRules.sources.length > 0)
    w(
      `This folder pre-approves ${allowRules.rawCount} ${plural(allowRules.rawCount, "tool permission")} in ${formatListWithAnd_2(allowRules.sources)}: ` +
        (allowRules.rules.length > 0
          ? formatListWithAnd_2(allowRules.rules, 8)
          : "(rule names contain unprintable characters)"),
    );
  if (additionalDirectories.sources.length > 0)
    w(
      `This folder adds ${additionalDirectories.rawCount} ${plural(additionalDirectories.rawCount, "directory", "directories")} to the workspace in ${formatListWithAnd_2(additionalDirectories.sources)}: ` +
        (additionalDirectories.dirs.length > 0
          ? formatListWithAnd_2(additionalDirectories.dirs, 6)
          : "(directory names contain unprintable characters)"),
    );
  if (a.length > 0)
    d(
      `This folder changes where automatic memory is written (autoMemoryDirectory), declared in ${formatListWithAnd_2(a)}`,
    );
  return u.length === 0
    ? []
    : [
        ...u.map((c) => ({
          ...c,
          text: `  ${figures_default.warning} ${c.text}`,
        })),
        {
          text: TRUST_PROMPT_FOOTNOTE,
          endsInList: false,
        },
      ];
}
//@ chunk-p3rkx9n6.js:16666-16753 placement
var TRUST_PROMPT_FOOTNOTE = "These will apply without asking. Only proceed if you trust this configuration.";
//@ chunk-p3rkx9n6.js:16753-16906 placement
/**
 * 读终端行列数；拿不到时返回 24×80 并标 assumed。
 */
function getTerminalSize() {
  if (process.stdout.isTTY !== true) return;
  let { rows, columns } = process.stdout;
  return rows > 0 && columns > 0
    ? {
        rows,
        columns,
      }
    : {
        rows: 24,
        columns: 80,
        assumed: true,
      };
}
//@ chunk-p3rkx9n6.js:16906-17374 placement
/**
 * 终端太小（或尺寸未知）无法完整显示信任警告时的错误文本。
 */
function formatTerminalTooSmallError(screen, o, isHomeDir, command) {
  let e = isHomeDir ? "." : ", or run `claude` there once to review the trust dialog.";
  return screen.assumed === true
    ? `Error: Workspace not trusted. This terminal did not report its size, so the warnings for ${o} can't be fitted to the screen. Run \`${command}\` again in a normal terminal window${e}`
    : `Error: Workspace not trusted. This terminal (${screen.columns} columns \xD7 ${screen.rows} rows) is too small to show what trusting ${o} turns on. Enlarge it and run \`${command}\` again${e}`;
}
//@ chunk-p3rkx9n6.js:17374-17470 placement
function countWrappedRows(r, columns) {
  let max = Math.max(1, columns - 1);
  return r.reduce((acc, e) => acc + Math.max(1, Math.ceil(textWidth(e) / max)), 0);
}
//@ chunk-p3rkx9n6.js:17470-17559 placement
function textWidth(r) {
  let o = 0;
  for (let s of r) o += s.charCodeAt(0) < 128 ? 1 : 2;
  return Math.max(o, bunStringWidth(r));
}
//@ chunk-p3rkx9n6.js:17559-17567 placement
var MAX_LIST_ITEM_ROWS = 3;
//@ chunk-p3rkx9n6.js:17567-17693 placement
/**
 * 逐步缩短文本直到折行后不超过指定行数。
 */
function truncateToFitRows(text, o, columns) {
  let n = o * Math.max(1, columns - 1) - 1;
  let e = truncateToWidth(text, n);
  while (countWrappedRows([e], columns) > o && n > 1) {
    n -= Math.max(1, Math.ceil(n / 10));
    e = truncateToWidth(text, n);
  }
  return e;
}
//@ chunk-p3rkx9n6.js:17693-18429 placement
function fitTrustWarnings(r, screen, s) {
  if (screen === undefined) return r.map((a) => a.text);
  let { rows, columns } = screen;
  if (s > rows || (screen.assumed === true && r.length > 0)) return "too_small";
  if (r.length === 0) return [];
  let text = r.at(-1).text;
  let mapped = r
    .slice(0, -1)
    .map((a) => (a.endsInList ? truncateToFitRows(a.text, MAX_LIST_ITEM_ROWS, columns) : a.text));
  let h = rows - s - countWrappedRows([text], columns);
  let l = (a) =>
    `  ${figures_default.warning} ${a} more ${a === 1 ? "warning doesn't" : "warnings don't"} fit on this screen: read this folder's .claude/settings.json and .claude/settings.local.json, and the .mcp.json files here or above, before answering`;
  let i = [];
  let y = 0;
  for (let [a, u] of mapped.entries()) {
    let sliced = mapped.slice(a);
    if (y + countWrappedRows(sliced, columns) <= h) {
      i.push(...sliced);
      break;
    }
    let w = countWrappedRows([l(sliced.length - 1)], columns);
    if (y + countWrappedRows([u], columns) + w > h) break;
    i.push(u);
    y += countWrappedRows([u], columns);
  }
  if (i.length === 0) return "too_small";
  let S = mapped.length - i.length;
  return [...i, ...(S > 0 ? [l(S)] : []), text];
}
//@ chunk-p3rkx9n6.js:18429-18459 placement
var PROJECT_SETTINGS_RELATIVE_PATH = ".claude/settings.json";
//@ chunk-p3rkx9n6.js:18459-18821 placement
/**
 * 去掉只来自某个来源的 allow 规则、附加目录，以及该来源的钩子/命令助手来源。
 */
function dropSourceOnlyWarnings(otelHeadersHelperSources) {
  let o = (sources) => sources.length > 0 && sources.every((e) => e === PROJECT_SETTINGS_RELATIVE_PATH);
  let s = (n) => n !== PROJECT_SETTINGS_RELATIVE_PATH;
  return {
    allowRules: o(otelHeadersHelperSources.allowRules.sources)
      ? {
          rules: [],
          sources: [],
          rawCount: 0,
        }
      : otelHeadersHelperSources.allowRules,
    additionalDirectories: o(otelHeadersHelperSources.additionalDirectories.sources)
      ? {
          dirs: [],
          sources: [],
          rawCount: 0,
        }
      : otelHeadersHelperSources.additionalDirectories,
    hookSources: otelHeadersHelperSources.hookSources.filter(s),
    commandHelperSources: otelHeadersHelperSources.commandHelperSources.filter(s),
  };
}
