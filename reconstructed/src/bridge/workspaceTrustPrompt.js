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
import { JKe } from "../plugins/functionHooks/policyGate.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { getEnvCaseInsensitive } from "../utils/plugins/securityDefaultPlugin.js";
import { getPreSettingsEnvSnapshot } from "../utils/managedEnvApply.js";
import { Agt, vSo, confirmPrompt } from "../utils/confirmPrompt.js";
import { escapePathForDisplay, HD, truncatePathForDisplay } from "../utils/invisibleChars.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { eA } from "../utils/settings/settingsStorage.js";
import { samePath } from "../utils/file.js";
import { Mn } from "../utils/pathClassification.js";
import { createCombinedAbortSignal } from "../utils/combinedAbortSignal.js";
import { recordDirectoryTrust } from "../utils/sessionRelocation.js";
import { logForDebugging } from "../utils/debug.js";
import { getHomeTrustDialogAccepted, setSessionTrustAccepted } from "../bootstrap/state.js";
import {
  getOtelHeadersHelperSources,
  getBashAndMcpPermissionSources,
  Yxr,
  getHooksSources_10,
  getHooksSources_5,
  formatListWithAnd_2,
} from "../components/TrustDialog/utils.js";
import { projectSettingsAliasesUserSettings } from "../utils/settings/settings.js";
import { getMcpConfigsByScope } from "../services/mcp/config.js";
import { plural } from "../utils/stringUtils.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { truncateToWidth } from "../utils/format.js";

/**
 * Remote Control（claude rc）工作区信任提示的文案。
 */
//@ chunk-p3rkx9n6.js:12247-12630 placement
var REMOTE_CONTROL_TRUST_COPY = {
  feature: "remote_control_workspace_trust",
  name: "Remote Control",
  command: "claude rc",
  opening: "Remote Control starts Claude Code sessions in this folder, driven from your other devices:",
  grant:
    "Sessions started here can read, edit, and execute files, and this folder's project settings (hooks, MCP servers, permission rules, helper commands) apply to them.",
  unattendedRemedy: "",
};
/**
 * stdin/stdout 都是 TTY、非某种无头模式且不在 CI 时才能交互询问。
 */
//@ chunk-p3rkx9n6.js:12630-12731 placement
function canPromptInteractively() {
  return (
    process.stdin.isTTY === !0 &&
    process.stdout.isTTY === !0 &&
    !JKe() &&
    !isEnvTruthy(getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CI"))
  );
}
//@ chunk-p3rkx9n6.js:12731-14945 placement
async function promptWorkspaceTrustForRemoteControl({
  dir: dir,
  isHomeDir: isHomeDir,
  canPrompt: canPrompt,
  storageV5: storageV5,
  asker: asker = REMOTE_CONTROL_TRUST_COPY,
  input: input = process.stdin,
  answerGraceMs: answerGraceMs = Agt,
  answerTimeoutMs: answerTimeoutMs,
  screen: screen = getTerminalSize(),
}) {
  let i = escapePathForDisplay(dir),
    y = HD(i),
    S = truncatePathForDisplay(i),
    a =
      (isHomeDir
        ? `Error: Workspace not trusted. ${i} is your home directory, and for security home-directory trust is never saved, so running \`claude\` here first won't help. Run \`${asker.command}\` from a project directory instead (run \`claude\` there once to accept the trust dialog).`
        : `Error: Workspace not trusted. Please run \`claude\` in ${i} first to review and accept the workspace trust dialog.`) +
      asker.unattendedRemedy;
  if (!canPrompt)
    return (logFeatureBad(asker.feature, "cannot_ask"), { trusted: !1, reason: "no_prompt", message: a });
  let u = eA(dir),
    d = !isHomeDir && u !== null && !samePath(u, Mn(dir)),
    w = [
      "",
      asker.opening,
      `  ${y}`,
      "",
      `Quick safety check: is this a project you created or one you trust? ${asker.grant}`,
    ],
    c = [
      ...(d
        ? [
            `This folder is part of the repository at ${HD(u)}; trusting it trusts that whole repository, including when you run \`claude\` there.`,
          ]
        : []),
      ...(isHomeDir
        ? ["This is your home directory, so trust lasts for this run only and is not saved."]
        : []),
      "Security guide: https://code.claude.com/docs/en/security",
    ],
    _ = `Trust ${S}?`,
    v = fitTrustWarnings(
      workspaceTrustWarnings(dir),
      screen,
      screen === void 0 ? 0 : b([...w, ...c, vSo, `${_} [y/N] `], screen.columns),
    );
  if (v === "too_small" && screen !== void 0)
    return (
      logFeatureBad(asker.feature, "terminal_too_small"),
      {
        trusted: !1,
        reason: "no_prompt",
        message: formatTerminalTooSmallError(screen, i, isHomeDir, asker.command),
      }
    );
  let E = v === "too_small" ? [] : v,
    joined = [...w, ...E, ...c]
      .map(
        (R) => `${R}
`,
      )
      .join("");
  process.stdout.write(joined);
  let k =
      answerTimeoutMs === void 0
        ? void 0
        : createCombinedAbortSignal(void 0, { timeoutMs: answerTimeoutMs, refTimer: !0 }),
    A = await confirmPrompt(_, input, {
      ignoreAnswersWithinMs: answerGraceMs,
      reaskPreamble: joined,
      signal: k?.signal,
    }).finally(() => k?.cleanup());
  if (k?.signal.aborted === !0)
    return (
      logFeatureBad(asker.feature, "no_answer"),
      {
        trusted: !1,
        reason: "no_prompt",
        message: `
No answer in time.
${a}`,
      }
    );
  if (!A)
    return (
      logFeatureSad(asker.feature, "declined"),
      {
        trusted: !1,
        reason: "declined",
        message: `${asker.name} did not start: ${i} is not trusted. Run \`${asker.command}\` again to trust it.`,
      }
    );
  let x = await recordDirectoryTrust(dir, storageV5).catch(
      (R) => (
        logForDebugging(`[bridge:init] persisting workspace trust failed: ${R}`, { level: "error" }),
        !1
      ),
    ),
    M = isHomeDir || getHomeTrustDialogAccepted();
  if (!x && !M)
    (process.stderr
      .write(`Couldn't save that choice to your Claude Code config, so you'll be asked again next time.
`),
      logFeatureSad(asker.feature, "not_saved"));
  else logFeatureOk(asker.feature, { saved: x });
  return (setSessionTrustAccepted(!0), { trusted: !0 });
}
//@ chunk-p3rkx9n6.js:14945-16666 placement
function workspaceTrustWarnings(r) {
  let o = getOtelHeadersHelperSources(r),
    s = projectSettingsAliasesUserSettings(),
    {
      allowRules: allowRules,
      additionalDirectories: additionalDirectories,
      hookSources: hookSources,
      commandHelperSources: commandHelperSources,
    } = s ? dropSourceOnlyWarnings(o) : o,
    h = (c) => (s ? c.filter((_) => _ !== C) : c),
    l = getBashAndMcpPermissionSources(),
    keys = Object.keys(getMcpConfigsByScope("project", { expandVars: !1 }).servers),
    filtered = keys.map(Yxr).filter((c) => c.length > 0),
    S = h(getHooksSources_10()),
    a = h(getHooksSources_5()),
    u = [],
    d = (c) => u.push({ text: c, endsInList: !1 }),
    w = (c) => u.push({ text: c, endsInList: !0 });
  if (commandHelperSources.length > 0)
    d(
      `This folder runs credential helper commands (apiKeyHelper, awsAuthRefresh and the like), declared in ${formatListWithAnd_2(commandHelperSources)}`,
    );
  if (l.length > 0)
    d(
      `This folder runs commands to mint HTTP headers (headersHelper), declared in ${formatListWithAnd_2(l)}`,
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
    : [...u.map((c) => ({ ...c, text: `  ${re.warning} ${c.text}` })), { text: j, endsInList: !1 }];
}
//@ chunk-p3rkx9n6.js:16666-16753 placement
var j = "These will apply without asking. Only proceed if you trust this configuration.";
/**
 * 读终端行列数；拿不到时返回 24×80 并标 assumed。
 */
//@ chunk-p3rkx9n6.js:16753-16906 placement
function getTerminalSize() {
  if (process.stdout.isTTY !== !0) return;
  let { rows: rows, columns: columns } = process.stdout;
  return rows > 0 && columns > 0 ? { rows: rows, columns: columns } : { rows: 24, columns: 80, assumed: !0 };
}
/**
 * 终端太小（或尺寸未知）无法完整显示信任警告时的错误文本。
 */
//@ chunk-p3rkx9n6.js:16906-17374 placement
function formatTerminalTooSmallError(r, o, s, n) {
  let e = s ? "." : ", or run `claude` there once to review the trust dialog.";
  return r.assumed === !0
    ? `Error: Workspace not trusted. This terminal did not report its size, so the warnings for ${o} can't be fitted to the screen. Run \`${n}\` again in a normal terminal window${e}`
    : `Error: Workspace not trusted. This terminal (${r.columns} columns \xD7 ${r.rows} rows) is too small to show what trusting ${o} turns on. Enlarge it and run \`${n}\` again${e}`;
}
//@ chunk-p3rkx9n6.js:17374-17470 placement
function b(r, o) {
  let max = Math.max(1, o - 1);
  return r.reduce((n, e) => n + Math.max(1, Math.ceil(F(e) / max)), 0);
}
//@ chunk-p3rkx9n6.js:17470-17559 placement
function F(r) {
  let o = 0;
  for (let s of r) o += s.charCodeAt(0) < 128 ? 1 : 2;
  return Math.max(o, bunStringWidth(r));
}
//@ chunk-p3rkx9n6.js:17559-17567 placement
var I = 3;
/**
 * 逐步缩短文本直到折行后不超过指定行数。
 */
//@ chunk-p3rkx9n6.js:17567-17693 placement
function truncateToFitRows(r, o, s) {
  let n = o * Math.max(1, s - 1) - 1,
    e = truncateToWidth(r, n);
  while (b([e], s) > o && n > 1) ((n -= Math.max(1, Math.ceil(n / 10))), (e = truncateToWidth(r, n)));
  return e;
}
//@ chunk-p3rkx9n6.js:17693-18429 placement
function fitTrustWarnings(r, o, s) {
  if (o === void 0) return r.map((a) => a.text);
  let { rows: rows, columns: columns } = o;
  if (s > rows || (o.assumed === !0 && r.length > 0)) return "too_small";
  if (r.length === 0) return [];
  let text = r.at(-1).text,
    mapped = r.slice(0, -1).map((a) => (a.endsInList ? truncateToFitRows(a.text, I, columns) : a.text)),
    h = rows - s - b([text], columns),
    l = (a) =>
      `  ${re.warning} ${a} more ${a === 1 ? "warning doesn't" : "warnings don't"} fit on this screen: read this folder's .claude/settings.json and .claude/settings.local.json, and the .mcp.json files here or above, before answering`,
    i = [],
    y = 0;
  for (let [a, u] of mapped.entries()) {
    let sliced = mapped.slice(a);
    if (y + b(sliced, columns) <= h) {
      i.push(...sliced);
      break;
    }
    let w = b([l(sliced.length - 1)], columns);
    if (y + b([u], columns) + w > h) break;
    (i.push(u), (y += b([u], columns)));
  }
  if (i.length === 0) return "too_small";
  let S = mapped.length - i.length;
  return [...i, ...(S > 0 ? [l(S)] : []), text];
}
//@ chunk-p3rkx9n6.js:18429-18459 placement
var C = ".claude/settings.json";
/**
 * 去掉只来自某个来源的 allow 规则、附加目录，以及该来源的钩子/命令助手来源。
 */
//@ chunk-p3rkx9n6.js:18459-18821 placement
function dropSourceOnlyWarnings(r) {
  let o = (n) => n.length > 0 && n.every((e) => e === C),
    s = (n) => n !== C;
  return {
    allowRules: o(r.allowRules.sources) ? { rules: [], sources: [], rawCount: 0 } : r.allowRules,
    additionalDirectories: o(r.additionalDirectories.sources)
      ? { dirs: [], sources: [], rawCount: 0 }
      : r.additionalDirectories,
    hookSources: r.hookSources.filter(s),
    commandHelperSources: r.commandHelperSources.filter(s),
  };
}
