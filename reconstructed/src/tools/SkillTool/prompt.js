/**
 * tools/SkillTool/prompt.ts
 *
 * Skill 工具 prompt 与 skill 列表的字符预算、描述截断、格式化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SkillTool/prompt.ts
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: fingerprint 4, affinity 3, file-local 1, layout 8, placement 2
 */
import {
  k2e,
  V1t,
  getSkillOverrideState,
  dropSyncedNameClashes,
  isHiddenFromModel,
  Z5,
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
  F7,
  dedupeBundledSkills,
  dropShadowedFallbackSkills,
} from "../../commands.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { Xwr } from "../../utils/sanitization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { COMMAND_NAME } from "../../constants/xml.js";
import { nK } from "../../utils/model/promptBundles.js";
import { upi } from "../../constants/promptSections.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { getSessionSkillAllowlist, getSdkBetas, getProjectRootOrNull } from "../../bootstrap/state.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { getSkillUsageScore } from "../../utils/suggestions/skillUsageTracking.js";
import { getContextWindow } from "../../utils/model/configs.js";
import { roughTokenCountEstimation } from "../../services/tokenEstimation.js";
import { QRe } from "../../services/memorySync/memorySkills.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";

/**
 * 命令是否可以用不带插件前缀的名字列出/调用（非插件 prompt 命令且满足 k2e 与 V1t()）。
 */
//@ chunk-e6aww6q8.js:959430-959509 fingerprint = formatCommandDescription (1)
function formatCommandDescription(cmd) {
  return !(cmd.type === "prompt" && cmd.source === "plugin") && k2e(cmd) && V1t();
}
//@ chunk-e6aww6q8.js:2297485-2297515 affinity
var DEFAULT_SKILL_LISTING_BUDGET_FRACTION = 0.01,
  CHARS_PER_TOKEN_2 = 4,
  DEFAULT_CONTEXT_TOKENS = 200000;
//@ chunk-e6aww6q8.js:2297515-2297536 affinity
var MAX_REMOTE_SKILL_BUDGET = 1e5,
  DEFAULT_SKILL_DESC_MAX_CHARS = 1536;
/**
 * 单条 skill 描述长度上限：settings.skillListingMaxDescChars，默认 1536。
 */
//@ chunk-e6aww6q8.js:2297536-2297593 affinity
function getSkillDescMaxChars() {
  return getInitialSettings_2().skillListingMaxDescChars ?? DEFAULT_SKILL_DESC_MAX_CHARS;
}
/**
 * skill 列表的字符预算：SLASH_COMMAND_TOOL_CHAR_BUDGET 环境变量优先；否则上下文窗口 × 4 字符/token × skillListingBudgetFraction（默认 1%），未配置时可被 GrowthBook tengu_typed_pebble 抬高（上限 100000）。
 */
//@ chunk-e6aww6q8.js:2297593-2297882 fingerprint = getCharBudget (0.358)
function getCharBudget(e, n = CHARS_PER_TOKEN_2) {
  let r = parseNumberWithSeparators(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET);
  if (r) return r;
  let skillListingBudgetFraction = getInitialSettings_2().skillListingBudgetFraction,
    h =
      (e ?? DEFAULT_CONTEXT_TOKENS) *
      n *
      (skillListingBudgetFraction ?? DEFAULT_SKILL_LISTING_BUDGET_FRACTION),
    y =
      skillListingBudgetFraction === void 0 && isClaudeAiChatCowork()
        ? getFeatureValue_SESSION_PINNED("tengu_typed_pebble", 0)
        : 0;
  return Math.max(
    1,
    Math.floor(h),
    typeof y === "number" && Number.isInteger(y) ? Math.min(y, MAX_REMOTE_SKILL_BUDGET) : 0,
  );
}
/**
 * skill 描述：description，有 whenToUse 时拼成 "描述 - whenToUse"。
 */
//@ chunk-e6aww6q8.js:2297882-2297967 file-local
function getCommandDescription(cmd) {
  return cmd.whenToUse ? `${cmd.description} - ${cmd.whenToUse}` : cmd.description;
}
//@ chunk-e6aww6q8.js:2297967-2297987 layout
var skillDigestCache = new WeakMap();
/**
 * skill 名+描述的 16 位哈希（缓存于 WeakMap），用于判断列表是否变化。
 */
//@ chunk-e6aww6q8.js:2297987-2298194 layout
function getSkillListingDigest(e) {
  let n = getCommandName_2(e),
    r = getCommandDescription(e),
    s = skillDigestCache.get(e);
  if (s !== void 0 && s.name === n && s.description === r) return s.digest;
  let sliced = computeContentHash(JSON.stringify([n, r])).slice(0, 16);
  return (skillDigestCache.set(e, { name: n, description: r, digest: sliced }), sliced);
}
/**
 * skill 列表显示名：短名与全名不同且短名唯一指向它时显示 "全名 (短名)"。
 */
//@ chunk-e6aww6q8.js:2298194-2298327 layout
function getSkillListingLabel(e, n) {
  let r = getCommandName_2(e);
  return r === e.name || e.name.endsWith(`:${r}`) || !Xwr(r) || findCommand(r, n)?.name !== e.name
    ? e.name
    : `${e.name} (${r})`;
}
//@ chunk-e6aww6q8.js:2298327-2298390 layout
function isBundledPromptSkill(e) {
  return e.type === "prompt" && e.source === "bundled";
}
/**
 * 分析 skill 列表预算：返回是否装得下、需截断描述的 skill、总字符等（供 /context 等统计）。
 */
//@ chunk-e6aww6q8.js:2298390-2299616 layout
function analyzeSkillListingBudget(e, n, r, s, h = CHARS_PER_TOKEN_2) {
  let y = getCharBudget(r, h),
    S = parseNumberWithSeparators(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET) > 0,
    w = getSkillDescMaxChars(),
    L = [],
    max = Math.max(0, e.length - 1),
    mapped = e.map((Me) => {
      if (s?.has(Me.name)) {
        let Je = Me.name.length;
        return ((max += Je + 2), { cmd: Me, nameLength: Je, descLen: 0, entryLen: Je + 2 });
      }
      let We = getSkillListingLabel(Me, e).length,
        ze = getCommandDescription(Me),
        min = Math.min(ze.length, w);
      if (ze.length > w) L.push({ name: Me.name, rawLen: ze.length });
      return ((max += We + 4 + ze.length), { cmd: Me, nameLength: We, descLen: min, entryLen: We + 4 + min });
    });
  L.sort((Me, We) => We.rawLen - Me.rawLen);
  let mapped_2 = L.map((Me) => Me.name),
    Se = mapped.reduce((Me, We) => Me + We.entryLen, 0) + Math.max(0, mapped.length - 1);
  if (Se <= y)
    return {
      cappedSkills: mapped_2,
      budgetMode: "fits",
      budgetTruncatedSkills: [],
      totalChars: Se,
      rawTotalChars: max,
      budget: y,
      budgetFromEnv: S,
      bytesPerToken: h,
    };
  let ke = (Me) => isBundledPromptSkill(Me.cmd) || s?.has(Me.cmd.name),
    filtered = mapped.filter((Me) => !ke(Me)),
    Ee =
      mapped.reduce((Me, We) => Me + (ke(We) ? We.entryLen : We.nameLength + 2), 0) +
      Math.max(0, mapped.length - 1),
    Ae = y - Ee;
  filtered.sort((Me, We) => n(We.cmd) - n(Me.cmd));
  let Ie = [];
  for (let Me of filtered) {
    let We = Me.entryLen - (Me.nameLength + 2);
    if (We <= Ae) Ae -= We;
    else Ie.push(Me);
  }
  return (
    Ie.sort((Me, We) => We.descLen - Me.descLen),
    {
      cappedSkills: mapped_2,
      budgetMode: "priority",
      budgetTruncatedSkills: Ie.map((Me) => Me.cmd.name),
      totalChars: Se,
      rawTotalChars: max,
      budget: y,
      budgetFromEnv: S,
      bytesPerToken: h,
    }
  );
}
//@ chunk-e6aww6q8.js:2299616-2299697 layout
function truncateSkillDescription(e) {
  let n = getCommandDescription(e),
    r = getSkillDescMaxChars();
  return n.length > r ? n.slice(0, r - 1) + "\u2026" : n;
}
/**
 * 把 skill 列表格式化成 "- 名字: 描述" 行；超预算时保留打包 skill 与 name-only 项的全文，其余按优先级在剩余预算内保留描述、超出的只留名字，并记 tengu_skill_descriptions_truncated。
 */
//@ chunk-e6aww6q8.js:2299697-2301072 fingerprint = formatCommandsWithinBudget (0.508)
function formatCommandsWithinBudget(e, n, r, s, h = e) {
  if (e.length === 0) return "";
  let y = getCharBudget(r, s),
    S = new Set(),
    fullEntries = e.map((Ie, Me) => {
      if (getSkillOverrideState(Ie) === "name-only") {
        S.add(Me);
        let ze = `- ${Ie.name}`;
        return { cmd: Ie, nameOnly: ze, full: ze };
      }
      let We = `- ${getSkillListingLabel(Ie, h)}`;
      return { cmd: Ie, nameOnly: We, full: `${We}: ${truncateSkillDescription(Ie)}` };
    }),
    L = fullEntries.reduce((sum, Me) => sum + bunStringWidth(Me.full), 0) + (fullEntries.length - 1);
  if (L <= y)
    return fullEntries.map((Ie) => Ie.full).join(`
`);
  logForDebugging(
    `Skill listing over budget: ${e.length} skills, ${L} chars > ${y} budget \u2014 descriptions will be truncated. Run /skills to disable some, or raise skillListingBudgetFraction in settings.`,
    { level: "warn" },
  );
  let G = new Set(S);
  for (let Ie = 0; Ie < e.length; Ie++) {
    let cmd = e[Ie];
    if (cmd.type === "prompt" && cmd.source === "bundled") G.add(Ie);
  }
  let filtered = e.map((Ie, Me) => Me).filter((Ie) => !G.has(Ie));
  if (filtered.length === 0)
    return fullEntries.map((Ie) => Ie.full).join(`
`);
  let Z = (Ie) => bunStringWidth(fullEntries[Ie].nameOnly),
    Se = (Ie) => bunStringWidth(fullEntries[Ie].full),
    ke = e.reduce((sum, Me, We) => sum + (G.has(We) ? Se(We) : Z(We)), 0) + (e.length - 1),
    we = y - ke,
    Ee = new Set();
  filtered.sort((sum, cmd) => n(e[cmd]) - n(e[sum]));
  for (let Ie of filtered) {
    let Me = Se(Ie) - Z(Ie);
    if (Me <= we) (Ee.add(Ie), (we -= Me));
  }
  let reduced = fullEntries.reduce((Ie, Me, We) => (G.has(We) ? Ie + bunStringWidth(Me.full) + 1 : Ie), 0);
  return (
    logEvent("tengu_skill_descriptions_truncated", {
      skill_count: e.length,
      budget: y,
      full_total: L,
      truncation_mode: lit_2("priority"),
      kept_full_count: Ee.size,
      collapsed_count: filtered.length - Ee.size,
      fixed_count: G.size,
      fixed_chars: reduced,
    }),
    fullEntries.map((cmd, Me) => (G.has(Me) || Ee.has(Me) ? cmd.full : cmd.nameOnly)).join(`
`)
  );
}
//@ chunk-e6aww6q8.js:2301072-2303177 layout
var SKILL_TOOL_PROMPT = `Invoke a skill.

A skill is a packaged set of instructions the user or project has set up for a particular kind of task (deploy steps, a review checklist, a repo-specific workflow). Available skills appear in a system-reminder listing with one-line descriptions. When the task at hand is one a listed skill covers, call this tool first \u2014 the skill's instructions load into the turn for you to follow in place of your default approach; some skills instead run in a subagent and return the finished result. A skill that runs in the background returns only the agent's name \u2014 its result arrives later as a task notification, so don't wait on it or invoke it again in the meantime. Users may also ask for one by name (\`/<name>\`, or "slash command"); that's a request to invoke it.

- \`skill\`: exact name from the listing, no leading slash. Plugin skills use \`plugin:skill\`. Directory-scoped skills are listed with a path prefix (\`apps/web:deploy\`); when both scoped and unscoped variants of a name exist, pick the one whose directory contains the files you're working on (most specific wins; unscoped otherwise).
- \`args\`: optional arguments to pass through.

Only names from the listing (or that the user typed explicitly) are valid. Built-in CLI commands (\`/help\`, \`/clear\`, \u2026) aren't skills. If a \`<${COMMAND_NAME}>\` block is already present this turn, the skill is loaded \u2014 follow it directly rather than calling again.
`,
  SKILL_TOOL_COORDINATOR_ADDENDUM = `
In a coordinator session, the coordinator's own use of this tool is read-only: it loads the skill's instructions to inform replies, triage, and coordination but does not run the skill \u2014 no fork, no permission grants, no hooks, no preamble shell commands. Execution happens in workers: hand the skill to one worker, or when its recipe is orchestration, spawn workers per that recipe and synthesize their results. Worker skill invocations execute normally. A \`<${COMMAND_NAME}>\` block that arrived with only a delegation summary (no skill content) does not mean the skill is loaded \u2014 calling this tool to load it is still appropriate then.
`;
/**
 * Skill 工具 prompt：lean 模式用短版，否则 SKILL_TOOL_PROMPT；协调者模式追加"协调者调用只读加载"说明。
 */
//@ chunk-e6aww6q8.js:2303177-2303242 layout
async function getSkillToolPrompt(e = {}) {
  let n = nK(e) ? upi : SKILL_TOOL_PROMPT;
  return isCoordinatorMode_2() ? n + SKILL_TOOL_COORDINATOR_ADDENDUM : n;
}
/**
 * 统计 skill 总数与可进入列表的数量（analyzeContext 使用）。
 */
//@ chunk-e6aww6q8.js:2303242-2303366 fingerprint = getSkillToolInfo (1)
async function getSkillToolInfo(e, n, r) {
  let s = dropSyncedNameClashes(await getSkillToolCommands(e, r), n),
    h = filterCommandsByAllowlist(s, getSessionSkillAllowlist());
  return { totalCommands: s.length, includedCommands: h.length };
}
/**
 * 估算每个技能在技能列表中占用的 token 数（考虑仅显示名称、预算截断与描述长度上限）。
 */
//@ chunk-e6aww6q8.js:2314569-2314915 placement
function skillListingTokenCounts(e, n, r) {
  let s = bytesPerTokenForModel(r),
    h = bytesPerTokenForModel(n),
    y = new Set(e.filter((q) => getSkillOverrideState(q) === "name-only").map((q) => q.name)),
    S = analyzeSkillListingBudget(
      e,
      (q) => getSkillUsageScore(q.name),
      getContextWindow(r, getSdkBetas()),
      y,
      s,
    ),
    w = new Set(S.budgetTruncatedSkills),
    L = getSkillDescMaxChars(),
    G = new Map();
  for (let q of e) {
    let Z = getSkillListingLabel(q, e),
      Se = y.has(q.name)
        ? `- ${q.name}`
        : w.has(q.name)
          ? `- ${Z}`
          : `- ${Z}: ${getCommandDescription(q).slice(0, L)}`;
    G.set(q.name, roughTokenCountEstimation(Se, h));
  }
  return G;
}
/**
 * 合并技能列表的各来源（本地、内置、MCP），去重后得到全集，并按会话技能白名单得到实际包含的集合。
 */
//@ chunk-e6aww6q8.js:2314915-2315166 placement
async function mergedSkillListing(e, n, r) {
  let s = await getSkillToolCommands(getProjectRootOrNull(), r),
    h = F7(e),
    filtered = QRe().filter((G) => !G.disableModelInvocation && !isHiddenFromModel(G)),
    S = Z5(s, e),
    w = dedupeBundledSkills(
      h.length > 0
        ? dropShadowedFallbackSkills(Ji([...S, ...filtered, ...h], "name"))
        : Ji([...S, ...filtered], "name"),
    ),
    L = n === void 0 ? filterCommandsByAllowlist(w, getSessionSkillAllowlist()) : w;
  return { merged: w, included: L };
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
