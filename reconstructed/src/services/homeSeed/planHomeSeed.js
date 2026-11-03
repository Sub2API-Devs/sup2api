/**
 * services/homeSeed/planHomeSeed.ts
 *
 * 2.1.316 新增：规划要转发的 home seed 内容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (19)
 * attribution: placement 19
 */
import {
  resolvePreToolUseCoverage,
  createHookCoverageSources,
  readUserSettingsForSeed,
  makeHookCoveragePredicate,
} from "./hookAndSettingsInventory.js";
import {
  homeSettingsForwardingFeature,
  isForwardModeEffective,
} from "../../utils/teleport/homeSettingsMode.js";
import { canForwardHomeSettings } from "../analytics/violinGates.js";
import { isAbortError } from "../../utils/errors.js";
import { isAborted } from "../../utils/abortSignalUtils.js";
import { logError } from "../../utils/log.js";
import { getEnabledSettingSources } from "../../utils/settings/constants.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { resolveUploadFilterRules, resolveDirSyncRules } from "../../utils/teleport/dirSyncRules.js";
import { buildHomeInventory } from "./homeInventory.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { filterPortableSettings } from "./portableSettings.js";
import { settingsSourceLabel } from "../../utils/settings/settingsLabel.js";
import { encodeHomePack, packFileEntry } from "./homePack.js";
import { count } from "../../utils/collections.js";
import {
  CLAUDE_MD,
  MAX_WORKING_PATH_CHARS,
  MAX_WORKING_FILE_BYTES as MAX_WORKING_FILE_BYTES_2_2,
  MAX_WORKING_FILE_TOTAL_BYTES,
  RULES,
  OUTPUT_STYLES,
} from "./workingFiles.js";
import { plural } from "../../utils/stringUtils.js";
import { tildify } from "../../utils/path.js";
import { formatFileSize } from "../../utils/format.js";
import { replaceControlChars } from "../../utils/resultError.js";

//@ chunk-axmbhcjg.js:34831-34845 placement
/**
 * writtenAtMs 的初始值（0）。
 */
var MAX_PLANNED_FILES = 3;
var WRITTEN_AT_PLACEHOLDER = 0;
//@ chunk-axmbhcjg.js:34845-35258 placement
async function planHomeSeed({
  signal,
  storageV5: pluginOptions,
  sessionPreToolUse: getSkillHooks = () => {
    return;
  },
  launchConsent: consent,
  now: i = Date.now,
  hookGuardHere: getHookCoverage = () =>
    resolvePreToolUseCoverage(
      createHookCoverageSources(pluginOptions, getSkillHooks, homeSettingsForwardingFeature(consent).enabled),
    ),
  withRunnerPack = false,
} = {}) {
  let flags = homeSettingsForwardingFeature(consent);
  if (!canForwardHomeSettings(flags.enabledNow()))
    return {
      kind: "none",
      reason: "flag_off",
    };
  let f = i();
  let plan = await buildHomeSeedPlan(signal, getHookCoverage, consent, flags, withRunnerPack).catch(
    (error) => {
      if (isAbortError(error) || isAborted(signal))
        return {
          kind: "none",
          reason: "aborted",
        };
      logError(error);
      return {
        kind: "none",
        reason: "failed",
      };
    },
  );
  logHomeSeedPlan(plan, i() - f);
  return plan;
}
//@ chunk-axmbhcjg.js:35258-36430 placement
/**
 * 规划要转发到云会话的本机设置包：检查同意与用户设置开关，并行清点 home 目录与 PreToolUse 钩子覆盖（记 tengu_home_seed_hook_guard），筛选可移植设置，最后组装为 ready/empty/none 计划。
 */
async function buildHomeSeedPlan(signal, getHookCoverage, consent, flags, withRunnerPack) {
  if (!isForwardModeEffective(consent))
    return {
      kind: "none",
      reason: "no_consent",
    };
  if (!getEnabledSettingSources().includes("userSettings"))
    return {
      kind: "none",
      reason: "user_settings_disabled",
    };
  let configHome = getClaudeConfigDir();
  let userSettings = await readUserSettingsForSeed();
  let sendableSettings = userSettings.kind === "sendable" ? userSettings : null;
  let readRules = resolveUploadFilterRules();
  let [inventory, hookCoverage] = await Promise.all([
    buildHomeInventory({
      configHome,
      isUserSettingsFileSendable: sendableSettings !== null,
      readRules,
      createFilter: resolveDirSyncRules,
      signal,
      settingsToCloud: flags.enabled,
    }),
    getHookCoverage().catch(() => ({
      covers: "all",
    })),
  ]);
  logEvent("tengu_home_seed_hook_guard", {
    kind: lit(hookCoverage.covers === "all" ? "all" : hookCoverage.matchers.length > 0 ? "matchers" : "none"),
    matcher_count: hookCoverage.covers === "all" ? 0 : hookCoverage.matchers.length,
    allow_entry_lost_at_parse: sendableSettings?.hasLostAnAllowEntry ?? false,
  });
  if (isAborted(signal) || (!inventory.ok && inventory.reason === "aborted"))
    return {
      kind: "none",
      reason: "aborted",
    };
  if (!inventory.ok)
    return inventory.reason === "flag_off"
      ? {
          kind: "none",
          reason: "flag_off",
        }
      : {
          kind: "none",
          reason: "home_unvettable",
          cause: inventory.reason === "too_many_links" ? inventory.reason : "alias_unreadable",
          configHome,
        };
  let portableSettings = filterPortableSettings(sendableSettings?.settings ?? null, {
    preToolUseHookActiveHere: makeHookCoveragePredicate(hookCoverage),
    hasLostAnAllowEntryAtParse: sendableSettings?.hasLostAnAllowEntry ?? false,
    settingsToCloud: flags.enabledNow,
  });
  return assembleHomeSeedPlan({
    inventory: inventory.inventory,
    settings: portableSettings,
    configHome,
    unreadableSettingsFiles: (readRules.unreadableSettingsFiles ?? []).map(settingsSourceLabel),
    writtenAtMs: WRITTEN_AT_PLACEHOLDER,
    withRunnerPack,
  });
}
//@ chunk-axmbhcjg.js:36430-37138 placement
/**
 * 由清点结果与可移植设置组装计划：规则不可读或无内容时返回 empty，否则打包为 ready（含 pack 与描述）。
 */
function assembleHomeSeedPlan({
  inventory,
  settings,
  configHome,
  unreadableSettingsFiles,
  writtenAtMs,
  withRunnerPack = false,
}) {
  let settingsDocument = settings.document;
  let summary = buildHomeSeedSummary(inventory, settings);
  let common = {
    summary,
    leftBehind: inventory.leftBehind,
    unreadable: inventory.summary.unreadable,
    settings: settingsDocument === null ? settings.reason : "sent",
    configHome,
  };
  if (inventory.summary.rulesUnreadable)
    return {
      kind: "empty",
      reason: "rules_unreadable",
      unreadableSettingsFiles,
      ...common,
      settings: settingsDocument === null ? settings.reason : "nothing_to_send",
    };
  if (inventory.entries.length === 0 && settingsDocument === null)
    return {
      kind: "empty",
      reason: "nothing_to_send",
      ...common,
    };
  let plan = {
    kind: "ready",
    pack: encodeHomePack({
      generation: 1,
      writtenAtMs,
      files: inventory.entries.map((entry) => packFileEntry(entry.path, entry.content)),
      settings: settingsDocument,
      summary,
    }),
    description: describeHomeSeedPack(inventory, settingsDocument),
    ...common,
  };
  let y = withRunnerPack ? inventory.entries.find((entry) => entry.kind === "claude_md") : undefined;
  return plan;
}
//@ chunk-axmbhcjg.js:37138-37498 placement
/**
 * 描述打包内容：是否含 CLAUDE.md、规则与输出样式数、内联 import 数、设置键与权限规则数。
 */
function describeHomeSeedPack(inventory, settingsDocument) {
  return {
    claudeMd: inventory.entries.some((entry) => entry.kind === "claude_md"),
    rules: count(inventory.entries, (r) => r.kind === "rule"),
    outputStyles: count(inventory.entries, (r) => r.kind === "output_style"),
    inlinedImports: inventory.summary.inlinedImports,
    settingsKeys: settingsDocument === null ? [] : portableSettingKeys(settingsDocument),
    permissionRules:
      (settingsDocument?.permissions?.allow?.length ?? 0) +
      (settingsDocument?.permissions?.deny?.length ?? 0) +
      (settingsDocument?.permissions?.ask?.length ?? 0),
  };
}
//@ chunk-axmbhcjg.js:37498-37563 placement
/**
 * 取对象里出现的可移植设置键。
 */
function portableSettingKeys(e) {
  return Object.keys(PORTABLE_SETTING_LABELS).filter((key) => e[key] !== undefined);
}
//@ chunk-axmbhcjg.js:37563-38327 placement
/**
 * 合并清点摘要与设置筛选计数，得到打包摘要（各类未发送数、被丢弃规则的分类计数）。
 */
function buildHomeSeedSummary(plan, filtered) {
  let { counts } = filtered;
  return {
    withheldSensitive: plan.summary.withheldSensitive,
    withheldReadDenied: plan.summary.withheldReadDenied,
    rulesUnreadable: plan.summary.rulesUnreadable,
    includesNotSent: plan.summary.includesNotSent,
    symlinksNotSent: plan.summary.symlinksNotSent,
    notDestinations: plan.summary.notDestinations,
    overCap: plan.summary.overCap,
    unreadable: plan.summary.unreadable,
    settingsKeysWithheld: counts.withheldKeys,
    credentialTextsWithheld: counts.withheldCredentialTexts,
    rulesCoveringDeviceTools: counts.rules.coveringDeviceTools,
    droppedRules: {
      rooted: counts.rules.droppedRooted,
      device: counts.rules.droppedDevice,
      invalid: counts.rules.droppedInvalid,
      guarded: counts.rules.droppedGuarded,
      overCap: counts.rules.droppedOverCap,
      credential: counts.rules.droppedCredential,
      credentialRestrictions: counts.rules.droppedCredentialRestrictions,
    },
  };
}
//@ chunk-axmbhcjg.js:38327-38377 placement
var SELF_HOSTED_RUNNER_PLAN = {
  kind: "none",
  reason: "self_hosted_runner",
};
//@ chunk-axmbhcjg.js:38377-38402 placement
function logSelfHostedRunnerPlan() {
  logHomeSeedPlan(SELF_HOSTED_RUNNER_PLAN, 0);
}
//@ chunk-axmbhcjg.js:38402-39986 placement
/**
 * 记录 tengu_home_seed_plan 事件：none 只记原因；empty/ready 附带各类计数、文件数、包大小与保留规则数。
 */
function logHomeSeedPlan(plan, durationMs) {
  if (plan.kind === "none") {
    logEvent("tengu_home_seed_plan", {
      outcome: fromEnum(plan.reason),
      cause: plan.reason === "home_unvettable" ? fromEnum(plan.cause) : undefined,
      duration_ms: durationMs,
    });
    return;
  }
  let { summary } = plan;
  let credentialKept = filesKeptForCredential(plan.leftBehind);
  let commonFields = {
    settings_keys_withheld: summary.settingsKeysWithheld,
    credential_texts_withheld: summary.credentialTextsWithheld,
    rules_dropped_rooted: summary.droppedRules.rooted,
    rules_dropped_device: summary.droppedRules.device,
    rules_dropped_invalid: summary.droppedRules.invalid,
    rules_dropped_over_cap: summary.droppedRules.overCap,
    rules_dropped_credential: summary.droppedRules.credential,
    restrictions_dropped_credential: summary.droppedRules.credentialRestrictions,
    rules_dropped_guarded: summary.droppedRules.guarded,
    rules_covering_device_tools: summary.rulesCoveringDeviceTools,
    withheld_sensitive: summary.withheldSensitive,
    withheld_read_denied: summary.withheldReadDenied,
    withheld_credential: credentialKept.others + (credentialKept.claudeMd ? 1 : 0),
    claude_md_withheld_credential: credentialKept.claudeMd,
    includes_not_sent: summary.includesNotSent,
    symlinks_not_sent: summary.symlinksNotSent,
    claude_md_link_not_sent: plan.leftBehind.some(
      (u) => u.reason === "symlink_not_sent" && u.path === CLAUDE_MD,
    ),
    not_destinations: summary.notDestinations,
    over_cap: summary.overCap,
    unreadable: plan.unreadable,
    duration_ms: durationMs,
  };
  if (plan.kind === "empty") {
    logEvent("tengu_home_seed_plan", {
      outcome: fromEnum(plan.reason),
      settings: fromEnum(plan.settings),
      settings_files_in_error:
        plan.reason === "rules_unreadable" ? plan.unreadableSettingsFiles.length : undefined,
      ...commonFields,
    });
    return;
  }
  let { description } = plan;
  logEvent("tengu_home_seed_plan", {
    outcome: lit("ready"),
    settings: fromEnum(plan.settings),
    files: description.rules + description.outputStyles + (description.claudeMd ? 1 : 0),
    pack_bytes: plan.pack.length,
    settings_keys: description.settingsKeys.length,
    rules_kept: description.permissionRules,
    includes_inlined: description.inlinedImports,
    ...commonFields,
  });
}
//@ chunk-axmbhcjg.js:39986-40291 placement
/**
 * 可转发设置键与其面向用户的名称。
 */
var PORTABLE_SETTING_LABELS = {
  language: "language",
  outputStyle: "output style",
  attribution: "attribution",
  includeCoAuthoredBy: "co-author preference",
  includeGitInstructions: "git-instructions preference",
  alwaysThinkingEnabled: "thinking preference",
  showThinkingSummaries: "thinking-summary preference",
  permissions: "permission rules",
};
//@ chunk-axmbhcjg.js:40291-40800 placement
function formatHomeSeedSentLine(e) {
  let n = [
    ...(e.claudeMd ? ["CLAUDE.md"] : []),
    ...formatCountLine(e.rules, "rules file"),
    ...formatCountLine(e.outputStyles, "output-style file"),
    ...formatCountLine(e.permissionRules, "permission rule"),
    ...e.settingsKeys.flatMap((settingsKey) =>
      settingsKey === "permissions" ? [] : [PORTABLE_SETTING_LABELS[settingsKey]],
    ),
    ...(e.inlinedImports > 0 ? [`${e.inlinedImports} @${plural(e.inlinedImports, "import")} folded in`] : []),
  ];
  return n.length === 0
    ? "Sent settings from this machine to the cloud session: only the narrowed permission allow list"
    : `Sent settings from this machine to the cloud session: ${n.join(", ")}`;
}
//@ chunk-axmbhcjg.js:40800-40850 placement
/**
 * 生成 “N 个 X” 的计数行（数量为 0 时为空）。
 */
function formatCountLine(e, n) {
  return e > 0 ? [`${e} ${plural(e, n)}`] : [];
}
//@ chunk-axmbhcjg.js:40850-41046 placement
var RULES_NOT_IN_FORCE = "Your deny and ask rules are not in force in the cloud session";
var SETTINGS_STAY = "The cloud session's settings stay as they were";
var RULES_MAY_NOT_BE_IN_FORCE = "Your deny and ask rules may not be in force in the cloud session";
//@ chunk-axmbhcjg.js:41046-43652 placement
function formatHomeSeedLeftBehindLine(
  { summary, leftBehind, unreadable, settings, configHome },
  { launch, settingsFile },
) {
  let d = tildify(configHome);
  let flattened = [
    formatLeftBehindList(
      leftBehind,
      "symlink_not_sent",
      summary.symlinksNotSent,
      (g) => `${g} linked ${plural(g, "file")} (links are not followed)`,
    ),
    formatLeftBehindList(
      leftBehind,
      "include_not_sent",
      summary.includesNotSent,
      (g) => `${g} @${plural(g, "import")} outside ${d} or not markdown`,
    ),
    formatLeftBehindList(
      leftBehind,
      "sensitive",
      summary.withheldSensitive,
      (g) => `${g} ${plural(g, "file")} named like credentials`,
    ),
    formatLeftBehindList(
      leftBehind,
      "read_denied",
      summary.withheldReadDenied,
      (g) => `${g} ${plural(g, "file")} your Read rules or sandbox settings cover`,
    ),
    formatLeftBehindList(
      leftBehind,
      "not_destination",
      summary.notDestinations,
      (g) => `${g} ${plural(g, "file")} with ${plural(g, "a name", "names")} the cloud session cannot create`,
    ),
    formatLeftBehindList(
      leftBehind,
      "over_cap",
      summary.overCap,
      (g) =>
        `${g} ${plural(g, "file")} over a limit of ${MAX_WORKING_PATH_CHARS} files, ${formatFileSize(MAX_WORKING_FILE_BYTES_2_2)} per file or ${formatFileSize(MAX_WORKING_FILE_TOTAL_BYTES)} in total`,
    ),
    formatLeftBehindList(
      leftBehind,
      "unreadable",
      unreadable,
      (g) => `${g} ${plural(g, "file")} that changed while being read`,
    ),
    formatLeftBehindList(
      leftBehind,
      "undefusable",
      count(leftBehind, (g) => g.reason === "undefusable"),
      (g) => `${g} ${plural(g, "file")} whose @imports could not be made safe`,
    ),
    formatLeftBehindList(
      leftBehind,
      "credential",
      count(leftBehind, (g) => g.reason === "credential"),
      (g) => `${g} ${plural(g, "file")} ${describeCredentialLike(g)}`,
    ),
  ].flatMap((g) => (g === null ? [] : [g]));
  let m =
    summary.droppedRules.rooted +
    summary.droppedRules.device +
    summary.droppedRules.invalid +
    summary.droppedRules.overCap;
  let credentialRestrictions = summary.droppedRules.credentialRestrictions;
  let y = summary.droppedRules.credential - credentialRestrictions;
  let credentialTextsWithheld = summary.credentialTextsWithheld;
  let guarded = summary.droppedRules.guarded;
  let L =
    settings === "schema_rejected"
      ? "failed validation"
      : settings === "settings_too_large"
        ? "is over the size limit"
        : settings === "settings_unreadable"
          ? "could not be read"
          : null;
  let E = [
    ...(summary.settingsKeysWithheld > 0
      ? [
          `${summary.settingsKeysWithheld} ${plural(summary.settingsKeysWithheld, "key")} (hooks, env and the like are never sent)`,
        ]
      : []),
    ...(m > 0
      ? [
          `${m} permission ${plural(m, "rule")} that ${plural(m, "names", "name")} a path or device tool on this machine or could not be read`,
        ]
      : []),
    ...(y > 0 ? [`${y} allow ${plural(y, "rule")} ${describeCredentialLike(y)}`] : []),
    ...(credentialTextsWithheld > 0
      ? [
          `${credentialTextsWithheld} ${plural(credentialTextsWithheld, "text")} (attribution, language, output style) ${describeCredentialLike(credentialTextsWithheld)}`,
        ]
      : []),
    ...(guarded > 0
      ? [
          `${guarded} allow ${plural(guarded, "rule")} that stayed because a hook, a plugin or a rule that was not sent may guard ${plural(guarded, "it", "them")}`,
        ]
      : []),
  ];
  let x = flattened.length > 0 ? [`Not sent from ${d}: ${flattened.join("; ")}`] : [];
  if (L !== null)
    return [
      launch === "reopen_sent_nothing"
        ? `${SETTINGS_STAY}: ${settingsFile} ${L}`
        : `${RULES_NOT_IN_FORCE}: ${settingsFile} ${L}; ${settings === "settings_too_large" ? "make it smaller" : "fix it"} and ${launch === "reopen_sent" ? "re-open the session" : "start a new cloud session"}`,
      ...x,
    ].join(". ");
  let I = E.length > 0 ? [`Settings kept on this machine: ${E.join("; ")}`] : [];
  let h =
    credentialRestrictions > 0
      ? [
          `${credentialRestrictions} deny or ask ${plural(credentialRestrictions, "rule is", "rules are")} not in force in the cloud session: ${plural(credentialRestrictions, "it looks like it holds", "they look like they hold")} a credential (reword ${plural(credentialRestrictions, "it", "them")} in ${settingsFile})`,
          ...I,
          ...x,
        ]
      : [...x, ...I];
  return h.length === 0 ? null : h.join(". ");
}
//@ chunk-axmbhcjg.js:43652-43788 placement
function filesKeptForCredential(leftBehind) {
  let mapped = leftBehind.filter((r) => r.reason === "credential").map((r) => r.path);
  return {
    claudeMd: mapped.includes(CLAUDE_MD),
    others: count(mapped, (r) => r !== CLAUDE_MD),
  };
}
//@ chunk-axmbhcjg.js:43788-44019 placement
function filesKeptAsLinks(leftBehind) {
  let mapped = leftBehind.filter((o) => o.reason === "symlink_not_sent").map((o) => o.path);
  let mapped_2 = [...mapped.filter((o) => o === CLAUDE_MD), ...mapped.filter((o) => o !== CLAUDE_MD)]
    .slice(0, 2)
    .map((o) => (o === RULES || o === OUTPUT_STYLES ? `${o}/` : replaceControlChars(o)));
  return {
    names: mapped_2,
    more: mapped.length - mapped_2.length,
  };
}
//@ chunk-axmbhcjg.js:44019-44119 placement
function describeCredentialLike(e) {
  return `that ${plural(e, "looks", "look")} like ${plural(e, "it holds", "they hold")} a credential`;
}
//@ chunk-axmbhcjg.js:44119-44364 placement
function formatLeftBehindList(leftBehind, n, r, o) {
  if (r === 0) return null;
  let mapped = leftBehind
    .filter((f) => f.reason === n)
    .map((f) => replaceControlChars(f.path) + (f.line === undefined ? "" : `:${f.line}`));
  let sliced = mapped.slice(0, MAX_PLANNED_FILES);
  let u = mapped.length - sliced.length;
  let d = sliced.length === 0 ? "" : ` (${sliced.join(", ")}${u > 0 ? ` and ${u} more` : ""})`;
  return o(r) + d;
}
export {
  logSelfHostedRunnerPlan,
  SELF_HOSTED_RUNNER_PLAN,
  planHomeSeed,
  filesKeptForCredential,
  filesKeptAsLinks,
  formatHomeSeedSentLine,
  formatHomeSeedLeftBehindLine,
  RULES_MAY_NOT_BE_IN_FORCE,
  RULES_NOT_IN_FORCE,
  SETTINGS_STAY,
};
