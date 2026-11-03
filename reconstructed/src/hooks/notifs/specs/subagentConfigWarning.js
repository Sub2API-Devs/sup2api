/**
 * hooks/notifs/specs/subagentConfigWarning.ts
 *
 * 2.1.316 新增。启动通知：子代理配置警告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (23)
 * attribution: sole-consumer 1, placement 22
 */
import { extractToolInputForTelemetry } from "../../../services/analytics/metadata.js";
import { ZVo, eKo, w_t, k_t, CONFIG_PROFILE_SOURCES, EEe, v_t } from "./_new/CONFIG_PROFILE_SOURCES.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { o, zodStrictObject, M, E, A, U, u } from "../../../../vendor/zod/v4/classic/schemas.js";
import { LP, GD } from "../../../utils/effortMediumNudge.js";
import { logForDebugging } from "../../../utils/debug.js";
import { wi } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { env } from "../../../utils/env.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../../../services/analytics/growthbook.js";
import { errorMessage } from "../../../utils/errors.js";
import { getProjectRoot } from "../../../bootstrap/state.js";
import { getMemoryFilesCached } from "../../../utils/claudemd.js";
import { getSkillToolCommands } from "../../../commands.js";
import { getAgentDefinitionsWithOverrides } from "../../../tools/AgentTool/loadAgentsDir.js";
import { isBuiltinPluginId } from "../../../plugins/builtinPlugins.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { $U } from "../../../utils/json.js";
import { getGlobalConfig, saveGlobalConfig } from "../../../utils/config.js";
import { hDt } from "../../../utils/pastedContent.js";
import { getDefaultSonnetModel, getMainLoopModel } from "../../../utils/model/model.js";
import { getSideQueryThinkingSettings } from "../../../utils/thinking.js";
import { aN } from "../../../utils/sideQuery.js";
import { isFable51Model } from "../../../utils/modelCost.js";
import { Xj } from "../../../utils/sessionRestore.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../../../utils/model/telemetryModelName.js";
import { stripNonPrintable } from "../../../utils/truncateGraphemes.js";
import { renderModelName } from "../../../utils/model/modelDisplay.js";

/**
 * 把 CLAUDE.md、用户技能、自定义代理的描述截断拼成 <claude_md>/<skills>/<agents> 三段文本，交给子代理配置分类器。
 */
//@ chunk-18hwfzwa.js:1743938-1744325 sole-consumer
function buildSubagentConfigProbe(h) {
  let x = extractToolInputForTelemetry(
      h.claudeMd.map((ee) => extractToolInputForTelemetry(ee.trim(), ZVo)).join(`

---

`),
      eKo,
    ),
    D = extractToolInputForTelemetry(
      h.skills.map((skill) =>
        extractToolInputForTelemetry(
          `- ${skill.name}: ${[skill.description, skill.whenToUse].filter(Boolean).join(" \u2014 ")}`,
          w_t,
        ),
      ).join(`
`),
      k_t,
    ),
    L = extractToolInputForTelemetry(
      h.agents.map((agent) => extractToolInputForTelemetry(`- ${agent.agentType}: ${agent.whenToUse}`, w_t))
        .join(`
`),
      k_t,
    );
  return `<claude_md>
${x}
</claude_md>
<skills>
${D}
</skills>
<agents>
${L}
</agents>`;
}
/**
 * 某个提示/通知的展示频率常量与记忆类型集合（每日上限、冷却等）。用途未确认。
 */
//@ chunk-18hwfzwa.js:1744325-1744468 placement = INSTRUCTIONS_MEMORY_TYPES (0.819)
var DISABLED_STATE = { off: !0 },
  oKo = 3,
  T_t = 1,
  NEe = 86400000,
  R_t = { views: 0, lastShownAt: 0 },
  nKo = 20000,
  rKo = 8,
  sKo = 10,
  iKo = new Set(["User", "Project", "Local", "Managed"]);
/**
 * 子代理配置警告的远程配置 schema：开关、最多显示次数、最小间隔天数，以及单行的前后缀文案（有长度上限）。
 */
//@ chunk-18hwfzwa.js:1744518-1744819 placement
var MAX_CONFIG_WARNING_WORDS = 120,
  configWarningWordsSchema = DoctorLazy(() =>
    o()
      .min(1)
      .max(MAX_CONFIG_WARNING_WORDS)
      .refine((h) => h.trim() !== "", "must not be blank")
      .refine(LP, "must not contain control chars")
      .refine(GD, "must be a single line"),
  ),
  subagentConfigWarningConfigSchema = DoctorLazy(() =>
    zodStrictObject({
      off: M().optional(),
      maxViews: E().optional(),
      minDaysApart: E().optional(),
      lead: configWarningWordsSchema().optional(),
      tail: configWarningWordsSchema().optional(),
    }),
  );
/**
 * 解析子代理配置警告的远程配置：只有前后缀文案不合法时丢弃它们并使用内置文案，其余错误时关闭该警告。
 */
//@ chunk-18hwfzwa.js:1744819-1745204 placement
function parseSubagentConfigWarningConfig(h) {
  let x = subagentConfigWarningConfigSchema(),
    safeParse = x.safeParse(h);
  if (safeParse.success) return safeParse.data;
  let L = new Set(safeParse.error.issues.map((issue) => issue.path[0]));
  if (typeof h !== "object" || h === null || [...L].some((ee) => ee !== "lead" && ee !== "tail"))
    return { off: !0 };
  return (
    logForDebugging(
      `subagent config check: served ${[...L].join(" and ")} dropped, using the built-in words`,
      { level: "warn" },
    ),
    x.safeParse(wi(h, (ee, ke) => L.has(ke))).data ?? { off: !0 }
  );
}
//@ chunk-18hwfzwa.js:1745204-1745341 placement
function readSubagentConfigWarningConfig() {
  let CLAUDE_CODE_SUBAGENT_CONFIG_WARNING = env.CLAUDE_CODE_SUBAGENT_CONFIG_WARNING;
  if (CLAUDE_CODE_SUBAGENT_CONFIG_WARNING !== void 0)
    return CLAUDE_CODE_SUBAGENT_CONFIG_WARNING ? {} : { off: !0 };
  return parseSubagentConfigWarningConfig(
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_luminous_locket", DISABLED_STATE),
  );
}
//@ chunk-18hwfzwa.js:1745341-1745438 placement
function mKo(h) {
  return h.claudeMd.some((x) => x.trim() !== "") || h.skills.length > 0 || h.agents.length > 0;
}
//@ chunk-18hwfzwa.js:1745438-1745529 placement
function OEe(h, x) {
  logForDebugging(`subagent config check: could not read ${h}: ${errorMessage(x)}`, { level: "error" });
}
/**
 * 并行收集子代理配置检查的输入：项目/用户 CLAUDE.md 内容、非内置的提示型技能、非内置代理；任一失败按空处理。
 */
//@ chunk-18hwfzwa.js:1745529-1746191 placement
async function collectSubagentConfigInputs(ctx) {
  let projectRoot = getProjectRoot(),
    [memoryFiles, skills, agentDefinitions] = await Promise.all([
      getMemoryFilesCached(ctx.session, !1, ctx.storageV5, ctx.credentials).catch(
        (ke) => (OEe("CLAUDE.md", ke), []),
      ),
      getSkillToolCommands(projectRoot, ctx.storageV5).catch((ke) => (OEe("skills", ke), [])),
      getAgentDefinitionsWithOverrides(projectRoot, ctx.storageV5).catch((ke) => (OEe("agents", ke), null)),
    ]);
  return {
    claudeMd: memoryFiles.filter((ke) => iKo.has(ke.type)).map((ke) => ke.content),
    skills: skills
      .filter((ke) => ke.type === "prompt" && ke.source !== "builtin" && ke.loadedFrom !== "bundled")
      .map((ke) => ({ name: ke.name, description: ke.description, whenToUse: ke.whenToUse })),
    agents: (agentDefinitions?.activeAgents ?? [])
      .filter((ke) => ke.source !== "built-in" && !(ke.source === "plugin" && isBuiltinPluginId(ke.plugin)))
      .map((ke) => ({ agentType: ke.agentType, whenToUse: ke.whenToUse })),
  };
}
//@ chunk-18hwfzwa.js:1746191-1746254 placement
var pKo = DoctorLazy(() =>
  zodStrictObject({ encourages_subagents: M(), sources: A(U(CONFIG_PROFILE_SOURCES)) }),
);
//@ chunk-18hwfzwa.js:1746254-1746470 placement
function parseSubagentConfigVerdict(h) {
  try {
    let safeParse = pKo().safeParse(jsonParse($U(h.trim())));
    if (!safeParse.success) return null;
    let encourages_subagents = safeParse.data.encourages_subagents;
    return {
      encourages: encourages_subagents,
      sources: encourages_subagents
        ? CONFIG_PROFILE_SOURCES.filter((L) => safeParse.data.sources.includes(L))
        : [],
    };
  } catch {
    return null;
  }
}
//@ chunk-18hwfzwa.js:1746470-1746529 placement
var gKo = DoctorLazy(() => u({ encourages: M(), sources: A(U(CONFIG_PROFILE_SOURCES)), at: E() }));
//@ chunk-18hwfzwa.js:1746529-1746677 placement
function cachedSubagentConfigVerdict(h) {
  let safeParse = gKo().safeParse(getGlobalConfig().subagentConfigChecks?.[h]);
  return safeParse.success
    ? { encourages: safeParse.data.encourages, sources: safeParse.data.sources }
    : void 0;
}
//@ chunk-18hwfzwa.js:1746677-1746947 placement
function saveSubagentConfigVerdict(h, x, D) {
  saveGlobalConfig((L) => {
    let sliced = Object.entries(L.subagentConfigChecks ?? {})
      .filter(([ke, Re]) => ke !== h && typeof Re?.at === "number")
      .sort(([, ke], [, Re]) => Re.at - ke.at)
      .slice(0, rKo - 1);
    return { ...L, subagentConfigChecks: Object.fromEntries([[h, { ...x, at: Date.now() }], ...sliced]) };
  }, D);
}
//@ chunk-18hwfzwa.js:1746947-1747225 placement
function takeClassifierCallBudget(h) {
  let now = Date.now(),
    D = (L) =>
      Array.isArray(L) ? L.filter((ee) => typeof ee === "number" && ee <= now && now - ee < NEe) : [];
  if (D(getGlobalConfig().subagentConfigClassifierCalls).length >= sKo) return !1;
  return (
    saveGlobalConfig(
      (L) => ({ ...L, subagentConfigClassifierCalls: [...D(L.subagentConfigClassifierCalls), now] }),
      h,
    ),
    !0
  );
}
/**
 * 判断用户配置是否鼓励使用子代理：按输入哈希读缓存，没有缓存且当日调用预算用完时跳过，否则调用分类器并缓存结论。
 */
//@ chunk-18hwfzwa.js:1747225-1747615 placement
async function checkSubagentConfig(h, x, D) {
  if (!mKo(h)) return { verdict: "none", sources: [], ranClassifier: !1 };
  let L = buildSubagentConfigProbe(h),
    ee = hDt(EEe, L),
    ke = cachedSubagentConfigVerdict(ee);
  if (!ke && !takeClassifierCallBudget(x)) return { verdict: "skipped", sources: [], ranClassifier: !1 };
  let Re = ke ?? (await classifySubagentConfig(L, D));
  if (!Re) return { verdict: "error", sources: [], ranClassifier: !0 };
  if (!ke) saveSubagentConfigVerdict(ee, Re, x);
  return { verdict: Re.encourages ? "positive" : "negative", sources: Re.sources, ranClassifier: !ke };
}
/**
 * 用默认 Sonnet 模型以 JSON schema 输出调用子代理配置分类器，返回是否鼓励子代理及来源；失败返回 null。
 */
//@ chunk-18hwfzwa.js:1747615-1748116 placement
async function classifySubagentConfig(probeText, credentials) {
  try {
    let D = getDefaultSonnetModel(),
      [L, ee] = getSideQueryThinkingSettings(D),
      found = (
        await aN({
          model: D,
          system: EEe,
          skipSystemPromptPrefix: !0,
          messages: [{ role: "user", content: [{ type: "text", text: probeText }] }],
          max_tokens: 64 + ee,
          thinking: L,
          effort: "low",
          output_format: { type: "json_schema", schema: v_t },
          maxRetries: 0,
          timeout: nKo,
          querySource: "subagent_config_classifier",
          credentials: credentials,
        })
      ).content.find((Be) => Be.type === "text");
    return found && found.type === "text" ? parseSubagentConfigVerdict(found.text) : null;
  } catch (error) {
    return (
      logForDebugging(`subagent config check failed: ${errorMessage(error)}`, { level: "error" }),
      null
    );
  }
}
//@ chunk-18hwfzwa.js:1748116-1748180 placement
function E_t() {
  return getGlobalConfig().subagentConfigWarningShown?.views ?? 0;
}
//@ chunk-18hwfzwa.js:1748180-1748302 placement
function canShowSubagentConfigWarning(h = oKo, x = T_t) {
  let { views: views, lastShownAt: lastShownAt } = getGlobalConfig().subagentConfigWarningShown ?? R_t;
  return views < h && Date.now() - lastShownAt >= x * NEe;
}
//@ chunk-18hwfzwa.js:1748302-1748492 placement
function recordSubagentConfigWarningShown(h, x = T_t) {
  saveGlobalConfig((D) => {
    let L = D.subagentConfigWarningShown ?? R_t;
    return Date.now() - L.lastShownAt < x * NEe
      ? D
      : { ...D, subagentConfigWarningShown: { views: L.views + 1, lastShownAt: Date.now() } };
  }, h);
}
//@ chunk-18hwfzwa.js:1748492-1748563 placement
var wKo = { claude_md: "CLAUDE.md", skills: "skills", agents: "custom agents" };
//@ chunk-18hwfzwa.js:1748563-1748702 placement
function describeConfigSources(h) {
  let mapped = h.map((D) => wKo[D]);
  return mapped.length === 0
    ? "Your config"
    : mapped.length === 1
      ? mapped[0]
      : `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`;
}
//@ chunk-18hwfzwa.js:1748702-1748831 placement
function configSourceTelemetry(h) {
  return {
    from_claude_md: h.includes("claude_md"),
    from_skills: h.includes("skills"),
    from_agents: h.includes("agents"),
  };
}
//@ chunk-18hwfzwa.js:1748831-1749887 placement
var subagentConfigWarningNoticeSpec = {
  id: "subagent-config-warning",
  compute: async (h) => {
    let x = getMainLoopModel();
    if (!h || !isFable51Model(x)) return null;
    await initializeGrowthBook().catch(() => null);
    let D = readSubagentConfigWarningConfig();
    if (D.off) return null;
    let L = Xj(h.session.host),
      ee = await collectSubagentConfigInputs(h),
      {
        verdict: verdict,
        sources: sources,
        ranClassifier: ranClassifier,
      } = await checkSubagentConfig(ee, h.storageV5, h.credentials);
    if (
      (logEvent("tengu_config_driven_subagent_check", {
        verdict: fromEnum(verdict),
        ran_classifier: ranClassifier,
        cached: !ranClassifier && (verdict === "positive" || verdict === "negative"),
        on_resume: L,
        model: telemetrySafeModelName(x),
        ...configSourceTelemetry(sources),
      }),
      verdict !== "positive" || !canShowSubagentConfigWarning(D.maxViews, D.minDaysApart))
    )
      return null;
    (logEvent("tengu_config_driven_subagent_warning_shown", {
      on_resume: L,
      impression: E_t() + 1,
      model: telemetrySafeModelName(x),
      ...configSourceTelemetry(sources),
    }),
      recordSubagentConfigWarningShown(h.storageV5, D.minDaysApart));
    let He = sources.length === 0 || (sources.length === 1 && sources[0] === "claude_md"),
      We = (ze) =>
        stripNonPrintable(
          ze
            .replaceAll("{sources}", describeConfigSources(sources))
            .replaceAll("{model}", renderModelName(x)),
        );
    return {
      key: "subagent-config-warning",
      kind: "warning",
      segments: [
        {
          text: D.lead
            ? We(D.lead)
            : `${describeConfigSources(sources)} ${He ? "asks" : "ask"} for subagents`,
          color: "warning",
        },
        {
          text: D.tail
            ? ` \xB7 ${We(D.tail)}`
            : ` \xB7 editing ${He ? "it" : "them"} may save tokens on ${renderModelName(x)}`,
          dim: !0,
        },
      ],
      priority: "high",
      timeoutMs: 15000,
    };
  },
};

export { subagentConfigWarningNoticeSpec };
