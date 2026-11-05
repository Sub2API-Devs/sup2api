/**
 * bridge/workspaceTrustPrompt.ts
 *
 * 2.1.316 新增。claude rc（Remote Control）启动前的工作区信任询问与警告排版。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jc9ry9f9.js (14)
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

//@ chunk-jc9ry9f9.js:991-1374 placement
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
//@ chunk-jc9ry9f9.js:1374-1476 placement
/**
 * stdin/stdout 都是 TTY、非某种无头模式且不在 CI 时才能交互询问。
 */
function canPromptForWorkspaceTrust() {
  return (
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    !isDemoOrClaubbet() &&
    !isEnvTruthy(getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CI"))
  );
}
//@ chunk-jc9ry9f9.js:1476-3691 placement
async function offerBridgeWorkspaceTrust({
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
  let displayPath = escapePathForDisplay(dir);
  let shortPath = truncatePathForDisplay(displayPath);
  let promptPath = truncatePathForDisplay_2(displayPath);
  let untrustedMessage =
    (isHomeDir
      ? `Error: Workspace not trusted. ${displayPath} is your home directory, and for security home-directory trust is never saved, so running \`claude\` here first won't help. Run \`${asker.command}\` from a project directory instead (run \`claude\` there once to accept the trust dialog).`
      : `Error: Workspace not trusted. Please run \`claude\` in ${displayPath} first to review and accept the workspace trust dialog.`) +
    asker.unattendedRemedy;
  if (!canPrompt) {
    logFeatureBad(asker.feature, "cannot_ask");
    return {
      trusted: false,
      reason: "no_prompt",
      message: untrustedMessage,
    };
  }
  let repoRoot = uncachedStorageRootFor(dir);
  let isInsideRepo = !isHomeDir && repoRoot !== null && !samePath(repoRoot, identity(dir));
  let preambleLines = [
    "",
    asker.opening,
    `  ${shortPath}`,
    "",
    `Quick safety check: is this a project you created or one you trust? ${asker.grant}`,
  ];
  let noteLines = [
    ...(isInsideRepo
      ? [
          `This folder is part of the repository at ${truncatePathForDisplay(repoRoot)}; trusting it trusts that whole repository, including when you run \`claude\` there.`,
        ]
      : []),
    ...(isHomeDir ? ["This is your home directory, so trust lasts for this run only and is not saved."] : []),
    "Security guide: https://code.claude.com/docs/en/security",
  ];
  let question = `Trust ${promptPath}?`;
  let fittedWarnings = fitTrustWarnings(
    workspaceTrustWarnings(dir),
    screen,
    screen === undefined
      ? 0
      : countWrappedRows(
          [...preambleLines, ...noteLines, TOO_FAST_ANSWER_TEXT, `${question} [y/N] `],
          screen.columns,
        ),
  );
  if (fittedWarnings === "too_small" && screen !== undefined) {
    logFeatureBad(asker.feature, "terminal_too_small");
    return {
      trusted: false,
      reason: "no_prompt",
      message: formatTerminalTooSmallError(screen, displayPath, isHomeDir, asker.command),
    };
  }
  let warningLines = fittedWarnings === "too_small" ? [] : fittedWarnings;
  let joined = [...preambleLines, ...warningLines, ...noteLines]
    .map(
      (line) => `${line}
`,
    )
    .join("");
  process.stdout.write(joined);
  let timeout =
    answerTimeoutMs === undefined
      ? undefined
      : createCombinedAbortSignal(undefined, {
          timeoutMs: answerTimeoutMs,
          refTimer: true,
        });
  let didTrust = await confirmPrompt(question, input, {
    ignoreAnswersWithinMs: answerGraceMs,
    reaskPreamble: joined,
    signal: timeout?.signal,
  }).finally(() => timeout?.cleanup());
  if (timeout?.signal.aborted === true) {
    logFeatureBad(asker.feature, "no_answer");
    return {
      trusted: false,
      reason: "no_prompt",
      message: `
No answer in time.
${untrustedMessage}`,
    };
  }
  if (!didTrust) {
    logFeatureSad(asker.feature, "declined");
    return {
      trusted: false,
      reason: "declined",
      message: `${asker.name} did not start: ${displayPath} is not trusted. Run \`${asker.command}\` again to trust it.`,
    };
  }
  let didSave = await recordDirectoryTrust(dir, storageV5).catch((error) => {
    logForDebugging(`[bridge:init] persisting workspace trust failed: ${error}`, {
      level: "error",
    });
    return false;
  });
  let isHomeTrustAccepted = isHomeDir || getHomeTrustDialogAccepted();
  if (!didSave && !isHomeTrustAccepted) {
    process.stderr
      .write(`Couldn't save that choice to your Claude Code config, so you'll be asked again next time.
`);
    logFeatureSad(asker.feature, "not_saved");
  } else
    logFeatureOk(asker.feature, {
      saved: didSave,
    });
  setSessionTrustAccepted(true);
  return {
    trusted: true,
  };
}
//@ chunk-jc9ry9f9.js:3691-5412 placement
function workspaceTrustWarnings(cwd) {
  let otelHeadersHelperSources = getOtelHeadersHelperSources(cwd);
  let projectAliasesUser = projectSettingsAliasesUserSettings();
  let { allowRules, additionalDirectories, hookSources, commandHelperSources } = projectAliasesUser
    ? dropSourceOnlyWarnings(otelHeadersHelperSources)
    : otelHeadersHelperSources;
  let withoutProjectSettings = (hooksSources) =>
    projectAliasesUser
      ? hooksSources.filter((source) => source !== PROJECT_SETTINGS_RELATIVE_PATH)
      : hooksSources;
  let bashAndMcpPermissionSources = getBashAndMcpPermissionSources();
  let keys = Object.keys(
    getMcpConfigsByScope("project", {
      expandVars: false,
    }).servers,
  );
  let filtered = keys.map(truncateTrustLine).filter((name) => name.length > 0);
  let envHookSources = withoutProjectSettings(getHooksSources_10());
  let memoryHookSources = withoutProjectSettings(getHooksSources_5());
  let warnings = [];
  let addInlineWarning = (text) =>
    warnings.push({
      text,
      endsInList: false,
    });
  let addListWarning = (text) =>
    warnings.push({
      text,
      endsInList: true,
    });
  if (commandHelperSources.length > 0)
    addInlineWarning(
      `This folder runs credential helper commands (apiKeyHelper, awsAuthRefresh and the like), declared in ${formatListWithAnd_2(commandHelperSources)}`,
    );
  if (bashAndMcpPermissionSources.length > 0)
    addInlineWarning(
      `This folder runs commands to mint HTTP headers (headersHelper), declared in ${formatListWithAnd_2(bashAndMcpPermissionSources)}`,
    );
  if (envHookSources.length > 0)
    addInlineWarning(
      `This folder sets environment variables for every session here (they can redirect requests and credentials, or change which programs run), declared in ${formatListWithAnd_2(envHookSources)}`,
    );
  if (hookSources.length > 0)
    addInlineWarning(
      `This folder configures hooks that run commands, declared in ${formatListWithAnd_2(hookSources)}`,
    );
  if (keys.length > 0)
    addListWarning(
      `Sessions started here launch, without asking, ${keys.length} ${plural(keys.length, "MCP server")} from .mcp.json files in this folder or above it: ` +
        (filtered.length > 0
          ? formatListWithAnd_2(filtered, 8)
          : "(server names contain unprintable characters)"),
    );
  if (allowRules.sources.length > 0)
    addListWarning(
      `This folder pre-approves ${allowRules.rawCount} ${plural(allowRules.rawCount, "tool permission")} in ${formatListWithAnd_2(allowRules.sources)}: ` +
        (allowRules.rules.length > 0
          ? formatListWithAnd_2(allowRules.rules, 8)
          : "(rule names contain unprintable characters)"),
    );
  if (additionalDirectories.sources.length > 0)
    addListWarning(
      `This folder adds ${additionalDirectories.rawCount} ${plural(additionalDirectories.rawCount, "directory", "directories")} to the workspace in ${formatListWithAnd_2(additionalDirectories.sources)}: ` +
        (additionalDirectories.dirs.length > 0
          ? formatListWithAnd_2(additionalDirectories.dirs, 6)
          : "(directory names contain unprintable characters)"),
    );
  if (memoryHookSources.length > 0)
    addInlineWarning(
      `This folder changes where automatic memory is written (autoMemoryDirectory), declared in ${formatListWithAnd_2(memoryHookSources)}`,
    );
  return warnings.length === 0
    ? []
    : [
        ...warnings.map((warning) => ({
          ...warning,
          text: `  ${figures_default.warning} ${warning.text}`,
        })),
        {
          text: TRUST_PROMPT_FOOTNOTE,
          endsInList: false,
        },
      ];
}
//@ chunk-jc9ry9f9.js:5412-5499 placement
var TRUST_PROMPT_FOOTNOTE = "These will apply without asking. Only proceed if you trust this configuration.";
//@ chunk-jc9ry9f9.js:5499-5652 placement
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
//@ chunk-jc9ry9f9.js:5652-6120 placement
/**
 * 终端太小（或尺寸未知）无法完整显示信任警告时的错误文本。
 */
function formatTerminalTooSmallError(screen, displayPath, isHomeDir, command) {
  let nextStep = isHomeDir ? "." : ", or run `claude` there once to review the trust dialog.";
  return screen.assumed === true
    ? `Error: Workspace not trusted. This terminal did not report its size, so the warnings for ${displayPath} can't be fitted to the screen. Run \`${command}\` again in a normal terminal window${nextStep}`
    : `Error: Workspace not trusted. This terminal (${screen.columns} columns \xD7 ${screen.rows} rows) is too small to show what trusting ${displayPath} turns on. Enlarge it and run \`${command}\` again${nextStep}`;
}
//@ chunk-jc9ry9f9.js:6120-6216 placement
function countWrappedRows(lines, columns) {
  let max = Math.max(1, columns - 1);
  return lines.reduce((acc, line) => acc + Math.max(1, Math.ceil(textWidth(line) / max)), 0);
}
//@ chunk-jc9ry9f9.js:6216-6305 placement
function textWidth(text) {
  let width = 0;
  for (let char of text) width += char.charCodeAt(0) < 128 ? 1 : 2;
  return Math.max(width, bunStringWidth(text));
}
//@ chunk-jc9ry9f9.js:6305-6313 placement
var MAX_LIST_ITEM_ROWS = 3;
//@ chunk-jc9ry9f9.js:6313-6439 placement
/**
 * 逐步缩短文本直到折行后不超过指定行数。
 */
function truncateToFitRows(text, maxRows, columns) {
  let maxWidth = maxRows * Math.max(1, columns - 1) - 1;
  let truncated = truncateToWidth(text, maxWidth);
  while (countWrappedRows([truncated], columns) > maxRows && maxWidth > 1) {
    maxWidth -= Math.max(1, Math.ceil(maxWidth / 10));
    truncated = truncateToWidth(text, maxWidth);
  }
  return truncated;
}
//@ chunk-jc9ry9f9.js:6439-7175 placement
function fitTrustWarnings(warnings, screen, reservedRows) {
  if (screen === undefined) return warnings.map((warning) => warning.text);
  let { rows, columns } = screen;
  if (reservedRows > rows || (screen.assumed === true && warnings.length > 0)) return "too_small";
  if (warnings.length === 0) return [];
  let text = warnings.at(-1).text;
  let mapped = warnings
    .slice(0, -1)
    .map((warning) =>
      warning.endsInList ? truncateToFitRows(warning.text, MAX_LIST_ITEM_ROWS, columns) : warning.text,
    );
  let availableRows = rows - reservedRows - countWrappedRows([text], columns);
  let overflowLine = (count) =>
    `  ${figures_default.warning} ${count} more ${count === 1 ? "warning doesn't" : "warnings don't"} fit on this screen: read this folder's .claude/settings.json and .claude/settings.local.json, and the .mcp.json files here or above, before answering`;
  let kept = [];
  let usedRows = 0;
  for (let [index, warning] of mapped.entries()) {
    let sliced = mapped.slice(index);
    if (usedRows + countWrappedRows(sliced, columns) <= availableRows) {
      kept.push(...sliced);
      break;
    }
    let overflowRows = countWrappedRows([overflowLine(sliced.length - 1)], columns);
    if (usedRows + countWrappedRows([warning], columns) + overflowRows > availableRows) break;
    kept.push(warning);
    usedRows += countWrappedRows([warning], columns);
  }
  if (kept.length === 0) return "too_small";
  let droppedCount = mapped.length - kept.length;
  return [...kept, ...(droppedCount > 0 ? [overflowLine(droppedCount)] : []), text];
}
//@ chunk-jc9ry9f9.js:7175-7205 placement
var PROJECT_SETTINGS_RELATIVE_PATH = ".claude/settings.json";
//@ chunk-jc9ry9f9.js:7205-7567 placement
/**
 * 去掉只来自某个来源的 allow 规则、附加目录，以及该来源的钩子/命令助手来源。
 */
function dropSourceOnlyWarnings(otelHeadersHelperSources) {
  let isProjectOnly = (sources) =>
    sources.length > 0 && sources.every((source) => source === PROJECT_SETTINGS_RELATIVE_PATH);
  let notProject = (source) => source !== PROJECT_SETTINGS_RELATIVE_PATH;
  return {
    allowRules: isProjectOnly(otelHeadersHelperSources.allowRules.sources)
      ? {
          rules: [],
          sources: [],
          rawCount: 0,
        }
      : otelHeadersHelperSources.allowRules,
    additionalDirectories: isProjectOnly(otelHeadersHelperSources.additionalDirectories.sources)
      ? {
          dirs: [],
          sources: [],
          rawCount: 0,
        }
      : otelHeadersHelperSources.additionalDirectories,
    hookSources: otelHeadersHelperSources.hookSources.filter(notProject),
    commandHelperSources: otelHeadersHelperSources.commandHelperSources.filter(notProject),
  };
}
export { canPromptForWorkspaceTrust, offerBridgeWorkspaceTrust };
