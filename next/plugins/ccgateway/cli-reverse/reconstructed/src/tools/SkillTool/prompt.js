/**
 * tools/SkillTool/prompt.ts
 *
 * Skill 工具 prompt 与 skill 列表的字符预算、描述截断、格式化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SkillTool/prompt.ts
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: fingerprint 4, sole-consumer 2, affinity 1, file-local 1, layout 8, placement 2
 */
import {
  isShadowedSkillName,
  isPlaidHarborOn,
  getSkillOverrideState,
  dropSyncedNameClashes,
  isHiddenFromModel,
  dropSyncedClashes,
} from "../../utils/commandPredicates.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { parseNumberWithSeparators } from "../../utils/envUtils.js";
import { isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import {
  getCommandName as getCommandName_2,
  findCommand,
  getSkillToolCommands,
  filterCommandsByAllowlist,
  hiddenCommandsWhenSlashDisabled,
  dedupeBundledSkills,
  dropShadowedFallbackSkills,
} from "../../commands.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isUnicodeIdentifier } from "../../utils/sanitization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { COMMAND_NAME } from "../../constants/xml.js";
import { leanRewriteOf } from "../../utils/model/promptBundles.js";
import { SKILL_TOOL_DESCRIPTION } from "../../constants/promptSections.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { getSessionSkillAllowlist, getSdkBetas, getProjectRootOrNull } from "../../bootstrap/state.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { getSkillUsageScore } from "../../utils/suggestions/skillUsageTracking.js";
import { getContextWindow } from "../../utils/model/configs.js";
import { roughTokenCountEstimation } from "../../services/tokenEstimation.js";
import { memorySkillCommands } from "../../services/memorySync/memorySkills.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:959430-959509 fingerprint (2.1.88 match: formatCommandDescription, 1)
/**
 * 命令是否可以用不带插件前缀的名字列出/调用（非插件 prompt 命令且满足 k2e 与 V1t()）。
 */
function formatCommandDescription(cmd) {
  return !(cmd.type === "prompt" && cmd.source === "plugin") && isShadowedSkillName(cmd) && isPlaidHarborOn();
}
//@ chunk-e6aww6q8.js:2297485-2297515 sole-consumer
var DEFAULT_SKILL_LISTING_BUDGET_FRACTION = 0.01;
var CHARS_PER_TOKEN_2 = 4;
var DEFAULT_CONTEXT_TOKENS = 200000;
//@ chunk-e6aww6q8.js:2297515-2297536 sole-consumer
var MAX_REMOTE_SKILL_BUDGET = 1e5;
var DEFAULT_SKILL_DESC_MAX_CHARS = 1536;
//@ chunk-e6aww6q8.js:2297536-2297593 affinity
/**
 * 单条 skill 描述长度上限：settings.skillListingMaxDescChars，默认 1536。
 */
function getSkillDescMaxChars() {
  return getInitialSettings_2().skillListingMaxDescChars ?? DEFAULT_SKILL_DESC_MAX_CHARS;
}
//@ chunk-e6aww6q8.js:2297593-2297882 fingerprint (2.1.88 match: getCharBudget, 0.358)
/**
 * skill 列表的字符预算：SLASH_COMMAND_TOOL_CHAR_BUDGET 环境变量优先；否则上下文窗口 × 4 字符/token × skillListingBudgetFraction（默认 1%），未配置时可被 GrowthBook tengu_typed_pebble 抬高（上限 100000）。
 */
function getCharBudget(contextWindowTokens, charsPerToken = CHARS_PER_TOKEN_2) {
  let numberWithSeparators = parseNumberWithSeparators(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET);
  if (numberWithSeparators) return numberWithSeparators;
  let skillListingBudgetFraction = getInitialSettings_2().skillListingBudgetFraction;
  let fractionBudget =
    (contextWindowTokens ?? DEFAULT_CONTEXT_TOKENS) *
    charsPerToken *
    (skillListingBudgetFraction ?? DEFAULT_SKILL_LISTING_BUDGET_FRACTION);
  let pinnedBudget =
    skillListingBudgetFraction === undefined && isClaudeAiChatCowork()
      ? getFeatureValue_SESSION_PINNED("tengu_typed_pebble", 0)
      : 0;
  return Math.max(
    1,
    Math.floor(fractionBudget),
    typeof pinnedBudget === "number" && Number.isInteger(pinnedBudget)
      ? Math.min(pinnedBudget, MAX_REMOTE_SKILL_BUDGET)
      : 0,
  );
}
//@ chunk-e6aww6q8.js:2297882-2297967 file-local
/**
 * skill 描述：description，有 whenToUse 时拼成 "描述 - whenToUse"。
 */
function getCommandDescription(cmd) {
  return cmd.whenToUse ? `${cmd.description} - ${cmd.whenToUse}` : cmd.description;
}
//@ chunk-e6aww6q8.js:2297967-2297987 layout
var skillDigestCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2297967", () => {
  skillDigestCache = new WeakMap();
});
//@ chunk-e6aww6q8.js:2297987-2298194 layout
/**
 * skill 名+描述的 16 位哈希（缓存于 WeakMap），用于判断列表是否变化。
 */
function getSkillListingDigest(cmd) {
  let commandName = getCommandName_2(cmd);
  let commandDescription = getCommandDescription(cmd);
  let cached = skillDigestCache.get(cmd);
  if (cached !== undefined && cached.name === commandName && cached.description === commandDescription)
    return cached.digest;
  let sliced = computeContentHash(JSON.stringify([commandName, commandDescription])).slice(0, 16);
  skillDigestCache.set(cmd, {
    name: commandName,
    description: commandDescription,
    digest: sliced,
  });
  return sliced;
}
//@ chunk-e6aww6q8.js:2298194-2298327 layout
/**
 * skill 列表显示名：短名与全名不同且短名唯一指向它时显示 "全名 (短名)"。
 */
function getSkillListingLabel(command, allCommands) {
  let commandName = getCommandName_2(command);
  return commandName === command.name ||
    command.name.endsWith(`:${commandName}`) ||
    !isUnicodeIdentifier(commandName) ||
    findCommand(commandName, allCommands)?.name !== command.name
    ? command.name
    : `${command.name} (${commandName})`;
}
//@ chunk-e6aww6q8.js:2298327-2298390 layout
function isBundledPromptSkill(cmd) {
  return cmd.type === "prompt" && cmd.source === "bundled";
}
//@ chunk-e6aww6q8.js:2298390-2299616 layout
/**
 * 分析 skill 列表预算：返回是否装得下、需截断描述的 skill、总字符等（供 /context 等统计）。
 */
function analyzeSkillListingBudget(
  commands,
  usageScore,
  contextWindow,
  nameOnlySet,
  charsPerToken = CHARS_PER_TOKEN_2,
) {
  let charBudget = getCharBudget(contextWindow, charsPerToken);
  let budgetFromEnv = parseNumberWithSeparators(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET) > 0;
  let skillDescMaxChars = getSkillDescMaxChars();
  let capped = [];
  let max = Math.max(0, commands.length - 1);
  let mapped = commands.map((command) => {
    if (nameOnlySet?.has(command.name)) {
      let nameLength = command.name.length;
      max += nameLength + 2;
      return {
        cmd: command,
        nameLength,
        descLen: 0,
        entryLen: nameLength + 2,
      };
    }
    let labelLength = getSkillListingLabel(command, commands).length;
    let commandDescription = getCommandDescription(command);
    let min = Math.min(commandDescription.length, skillDescMaxChars);
    if (commandDescription.length > skillDescMaxChars)
      capped.push({
        name: command.name,
        rawLen: commandDescription.length,
      });
    max += labelLength + 4 + commandDescription.length;
    return {
      cmd: command,
      nameLength: labelLength,
      descLen: min,
      entryLen: labelLength + 4 + min,
    };
  });
  capped.sort((left, right) => right.rawLen - left.rawLen);
  let cappedSkills = capped.map((entry) => entry.name);
  let totalChars = mapped.reduce((acc, entry) => acc + entry.entryLen, 0) + Math.max(0, mapped.length - 1);
  if (totalChars <= charBudget)
    return {
      cappedSkills,
      budgetMode: "fits",
      budgetTruncatedSkills: [],
      totalChars,
      rawTotalChars: max,
      budget: charBudget,
      budgetFromEnv,
      bytesPerToken: charsPerToken,
    };
  let isFixedEntry = (entry) => isBundledPromptSkill(entry.cmd) || nameOnlySet?.has(entry.cmd.name);
  let filtered = mapped.filter((entry) => !isFixedEntry(entry));
  let fixedChars =
    mapped.reduce((acc, entry) => acc + (isFixedEntry(entry) ? entry.entryLen : entry.nameLength + 2), 0) +
    Math.max(0, mapped.length - 1);
  let remainingChars = charBudget - fixedChars;
  filtered.sort((left, right) => usageScore(right.cmd) - usageScore(left.cmd));
  let truncatedEntries = [];
  for (let entry of filtered) {
    let descCost = entry.entryLen - (entry.nameLength + 2);
    if (descCost <= remainingChars) remainingChars -= descCost;
    else truncatedEntries.push(entry);
  }
  truncatedEntries.sort((left, right) => right.descLen - left.descLen);
  return {
    cappedSkills,
    budgetMode: "priority",
    budgetTruncatedSkills: truncatedEntries.map((entry) => entry.cmd.name),
    totalChars,
    rawTotalChars: max,
    budget: charBudget,
    budgetFromEnv,
    bytesPerToken: charsPerToken,
  };
}
//@ chunk-e6aww6q8.js:2299616-2299697 layout
function truncateSkillDescription(command) {
  let desc = getCommandDescription(command);
  let skillDescMaxChars = getSkillDescMaxChars();
  return desc.length > skillDescMaxChars ? desc.slice(0, skillDescMaxChars - 1) + "\u2026" : desc;
}
//@ chunk-e6aww6q8.js:2299697-2301072 fingerprint (2.1.88 match: formatCommandsWithinBudget, 0.508)
/**
 * 把 skill 列表格式化成 "- 名字: 描述" 行；超预算时保留打包 skill 与 name-only 项的全文，其余按优先级在剩余预算内保留描述、超出的只留名字，并记 tengu_skill_descriptions_truncated。
 */
function formatCommandsWithinBudget(
  newSkills,
  usageScore,
  contextWindowTokens,
  charsPerToken,
  allCommands = newSkills,
) {
  if (newSkills.length === 0) return "";
  let budget = getCharBudget(contextWindowTokens, charsPerToken);
  let fixedIndices = new Set();
  let fullEntries = newSkills.map((command, index) => {
    if (getSkillOverrideState(command) === "name-only") {
      fixedIndices.add(index);
      let nameOnlyLine = `- ${command.name}`;
      return {
        cmd: command,
        nameOnly: nameOnlyLine,
        full: nameOnlyLine,
      };
    }
    let labelLine = `- ${getSkillListingLabel(command, allCommands)}`;
    return {
      cmd: command,
      nameOnly: labelLine,
      full: `${labelLine}: ${truncateSkillDescription(command)}`,
    };
  });
  let fullTotal = fullEntries.reduce((sum, e) => sum + bunStringWidth(e.full), 0) + (fullEntries.length - 1);
  if (fullTotal <= budget)
    return fullEntries.map((e) => e.full).join(`
`);
  logForDebugging(
    `Skill listing over budget: ${newSkills.length} skills, ${fullTotal} chars > ${budget} budget \u2014 descriptions will be truncated. Run /skills to disable some, or raise skillListingBudgetFraction in settings.`,
    {
      level: "warn",
    },
  );
  let bundledIndices = new Set(fixedIndices);
  for (let i = 0; i < newSkills.length; i++) {
    let cmd = newSkills[i];
    if (cmd.type === "prompt" && cmd.source === "bundled") bundledIndices.add(i);
  }
  let filtered = newSkills.map((command, index) => index).filter((i) => !bundledIndices.has(i));
  if (filtered.length === 0)
    return fullEntries.map((e) => e.full).join(`
`);
  let nameOnlyWidth = (index) => bunStringWidth(fullEntries[index].nameOnly);
  let fullWidth = (index) => bunStringWidth(fullEntries[index].full);
  let baselineChars =
    newSkills.reduce(
      (sum, command, index) => sum + (bundledIndices.has(index) ? fullWidth(index) : nameOnlyWidth(index)),
      0,
    ) +
    (newSkills.length - 1);
  let remainingChars = budget - baselineChars;
  let keptFullIndices = new Set();
  filtered.sort((sum, cmd) => usageScore(newSkills[cmd]) - usageScore(newSkills[sum]));
  for (let index of filtered) {
    let descCost = fullWidth(index) - nameOnlyWidth(index);
    if (descCost <= remainingChars) {
      keptFullIndices.add(index);
      remainingChars -= descCost;
    }
  }
  let fixedChars = fullEntries.reduce(
    (sum, e, i) => (bundledIndices.has(i) ? sum + bunStringWidth(e.full) + 1 : sum),
    0,
  );
  logEvent("tengu_skill_descriptions_truncated", {
    skill_count: newSkills.length,
    budget,
    full_total: fullTotal,
    truncation_mode: lit_2("priority"),
    kept_full_count: keptFullIndices.size,
    collapsed_count: filtered.length - keptFullIndices.size,
    fixed_count: bundledIndices.size,
    fixed_chars: fixedChars,
  });
  return fullEntries.map((cmd, i) =>
    bundledIndices.has(i) || keptFullIndices.has(i) ? cmd.full : cmd.nameOnly,
  ).join(`
`);
}
//@ chunk-e6aww6q8.js:2301072-2303177 layout
var SKILL_TOOL_PROMPT = `Invoke a skill.

A skill is a packaged set of instructions the user or project has set up for a particular kind of task (deploy steps, a review checklist, a repo-specific workflow). Available skills appear in a system-reminder listing with one-line descriptions. When the task at hand is one a listed skill covers, call this tool first \u2014 the skill's instructions load into the turn for you to follow in place of your default approach; some skills instead run in a subagent and return the finished result. A skill that runs in the background returns only the agent's name \u2014 its result arrives later as a task notification, so don't wait on it or invoke it again in the meantime. Users may also ask for one by name (\`/<name>\`, or "slash command"); that's a request to invoke it.

- \`skill\`: exact name from the listing, no leading slash. Plugin skills use \`plugin:skill\`. Directory-scoped skills are listed with a path prefix (\`apps/web:deploy\`); when both scoped and unscoped variants of a name exist, pick the one whose directory contains the files you're working on (most specific wins; unscoped otherwise).
- \`args\`: optional arguments to pass through.

Only names from the listing (or that the user typed explicitly) are valid. Built-in CLI commands (\`/help\`, \`/clear\`, \u2026) aren't skills. If a \`<${COMMAND_NAME}>\` block is already present this turn, the skill is loaded \u2014 follow it directly rather than calling again.
`;
var SKILL_TOOL_COORDINATOR_ADDENDUM = `
In a coordinator session, the coordinator's own use of this tool is read-only: it loads the skill's instructions to inform replies, triage, and coordination but does not run the skill \u2014 no fork, no permission grants, no hooks, no preamble shell commands. Execution happens in workers: hand the skill to one worker, or when its recipe is orchestration, spawn workers per that recipe and synthesize their results. Worker skill invocations execute normally. A \`<${COMMAND_NAME}>\` block that arrived with only a delegation summary (no skill content) does not mean the skill is loaded \u2014 calling this tool to load it is still appropriate then.
`;
//@ chunk-e6aww6q8.js:2303177-2303242 layout
/**
 * Skill 工具 prompt：lean 模式用短版，否则 SKILL_TOOL_PROMPT；协调者模式追加"协调者调用只读加载"说明。
 */
async function getSkillToolPrompt(options = {}) {
  let basePrompt = leanRewriteOf(options) ? SKILL_TOOL_DESCRIPTION : SKILL_TOOL_PROMPT;
  return isCoordinatorMode_2() ? basePrompt + SKILL_TOOL_COORDINATOR_ADDENDUM : basePrompt;
}
//@ chunk-e6aww6q8.js:2303242-2303366 fingerprint (2.1.88 match: getSkillToolInfo, 1)
/**
 * 统计 skill 总数与可进入列表的数量（analyzeContext 使用）。
 */
async function getSkillToolInfo(cwd, hiddenCommands, storageV5) {
  let agentCommands = dropSyncedNameClashes(await getSkillToolCommands(cwd, storageV5), hiddenCommands);
  let allowlisted = filterCommandsByAllowlist(agentCommands, getSessionSkillAllowlist());
  return {
    totalCommands: agentCommands.length,
    includedCommands: allowlisted.length,
  };
}
//@ chunk-e6aww6q8.js:2314569-2314915 placement
/**
 * 估算每个技能在技能列表中占用的 token 数（考虑仅显示名称、预算截断与描述长度上限）。
 */
function skillListingTokenCounts(commands, countModel, budgetModel) {
  let budgetCharsPerToken = bytesPerTokenForModel(budgetModel);
  let countCharsPerToken = bytesPerTokenForModel(countModel);
  let nameOnlyNames = new Set(
    commands
      .filter((command) => getSkillOverrideState(command) === "name-only")
      .map((command) => command.name),
  );
  let budgetInfo = analyzeSkillListingBudget(
    commands,
    (command) => getSkillUsageScore(command.name),
    getContextWindow(budgetModel, getSdkBetas()),
    nameOnlyNames,
    budgetCharsPerToken,
  );
  let truncatedNames = new Set(budgetInfo.budgetTruncatedSkills);
  let skillDescMaxChars = getSkillDescMaxChars();
  let tokensByName = new Map();
  for (let command of commands) {
    let skillListingLabel = getSkillListingLabel(command, commands);
    let line = nameOnlyNames.has(command.name)
      ? `- ${command.name}`
      : truncatedNames.has(command.name)
        ? `- ${skillListingLabel}`
        : `- ${skillListingLabel}: ${getCommandDescription(command).slice(0, skillDescMaxChars)}`;
    tokensByName.set(command.name, roughTokenCountEstimation(line, countCharsPerToken));
  }
  return tokensByName;
}
//@ chunk-e6aww6q8.js:2314915-2315166 placement
/**
 * 合并技能列表的各来源（本地、内置、MCP），去重后得到全集，并按会话技能白名单得到实际包含的集合。
 */
async function mergedSkillListing(options, includeHidden, storageV5) {
  let skillToolCommands = await getSkillToolCommands(getProjectRootOrNull(), storageV5);
  let hiddenCommands = hiddenCommandsWhenSlashDisabled(options);
  let filtered = memorySkillCommands().filter(
    (command) => !command.disableModelInvocation && !isHiddenFromModel(command),
  );
  let skillCommands = dropSyncedClashes(skillToolCommands, options);
  let mergedCommands = dedupeBundledSkills(
    hiddenCommands.length > 0
      ? dropShadowedFallbackSkills(uniqByExport([...skillCommands, ...filtered, ...hiddenCommands], "name"))
      : uniqByExport([...skillCommands, ...filtered], "name"),
  );
  let included =
    includeHidden === undefined
      ? filterCommandsByAllowlist(mergedCommands, getSessionSkillAllowlist())
      : mergedCommands;
  return {
    merged: mergedCommands,
    included,
  };
}
export {
  getCharBudget,
  mergedSkillListing,
  skillListingTokenCounts,
  getSkillToolPrompt,
  getSkillListingDigest,
  formatCommandsWithinBudget,
  formatCommandDescription,
  getSkillToolInfo,
  getCommandDescription,
  getSkillDescMaxChars,
  getSkillListingLabel,
};
