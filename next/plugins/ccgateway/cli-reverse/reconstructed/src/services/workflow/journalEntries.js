/**
 * services/workflow/journalEntries.ts
 *
 * 工作流日志条目（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bb967bhs.js (4), chunk-kd2wbncj.js (10)
 * attribution: placement 14
 */
import { createHash } from "crypto";
import { computeContentHash, SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import {
  getAutoModeClassifierRole,
  awaitServerVerdict,
  summarizeServerVerdict,
  classifyServerVerdict,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bb967bhs.js:227-262 placement
/**
 * 按工作流运行 id 缓存隐藏脚本的 sha256。
 */
class HiddenScriptShaCache {
  scriptSha256ById = new Map();
}
//@ chunk-bb967bhs.js:262-527 placement
/**
 * 取隐藏脚本的工作流运行的脚本 sha256：先查缓存，再在任务列表中找对应运行并计算脚本哈希。
 */
function hiddenScriptSha(workflowRunId, slot, runs) {
  let cachedSha = slot.get(HiddenScriptShaCache).scriptSha256ById.get(workflowRunId);
  if (cachedSha !== undefined) return cachedSha;
  let found = Object.values(runs.all()).find(
    (run) =>
      run.type === "local_workflow" &&
      run.workflowRunId === workflowRunId &&
      run.withholdScriptFromSdkEvents === true,
  );
  if (found === undefined) return;
  return found.script === "" ? "" : computeContentHash(found.script);
}
//@ chunk-bb967bhs.js:527-688 placement
/**
 * 隐藏脚本的工作流运行无法在未加载脚本的会话中恢复时的拒绝文案。
 */
var HIDDEN_SCRIPT_RESUME_REFUSAL =
  "This workflow run hides its script, and this session has not loaded that script, so it cannot resume the run. Start a new run without resumeFromRunId.";
//@ chunk-bb967bhs.js:688-1427 placement
async function readWorkflowJournal(workflowRunId, slot, runs, readRun) {
  let sha = hiddenScriptSha(workflowRunId, slot, runs);
  if (sha === "")
    return {
      kind: "refused",
      reason: HIDDEN_SCRIPT_RESUME_REFUSAL,
    };
  if (sha !== undefined)
    return {
      kind: "hidden",
      scriptSha256: sha,
    };
  let runInfo = await readRun();
  if ("refusal" in runInfo)
    return {
      kind: "refused",
      reason: runInfo.refusal,
    };
  if (runInfo.hiddenScriptSha256 !== undefined)
    return {
      kind: "refused",
      reason:
        "This workflow run hides its script, and this process has no record of starting it, so it will not resume it. Start a new run without resumeFromRunId.",
    };
  if (runInfo.hasUnreadLine === true)
    return {
      kind: "refused",
      reason: `A line of the journal of workflow run ${workflowRunId} cannot be read, so this session cannot tell whether the run hides its script and will not resume it. Start a new run without resumeFromRunId; it runs again the agents this run had finished.`,
    };
  return {
    kind: "shared",
  };
}
//@ chunk-kd2wbncj.js:20426-20518 placement
/**
 * 判断 agent 结构化输出审查是否生效（开关打开且当前角色为 arbiter）。
 */
function isArbiterStructuredOutputReviewOn(mode) {
  return (
    readFlagWithOverride("tengu_harmonic_bumblebee", {
      safe: false,
    }) &&
    getAutoModeClassifierRole(mode, {
      peek: true,
    }) === "arbiter"
  );
}
//@ chunk-kd2wbncj.js:20518-20693 placement
/**
 * 对 agent 结构化输出做服务端审查判定：被标记时返回原因，否则返回未标记；非判定结果返回 undefined。
 */
async function structuredOutputVerdict(assistantMessage, options) {
  let serverVerdict = await awaitServerVerdict(assistantMessage, options);
  let summary = summarizeServerVerdict(serverVerdict, options);
  if (summary.kind !== "verdict") return;
  return summary.outcome === "flagged"
    ? {
        flagged: true,
        reason: classifyServerVerdict(serverVerdict, options, () => {
          return;
        }).reason,
      }
    : {
        flagged: false,
      };
}
//@ chunk-kd2wbncj.js:20853-20989 placement
/**
 * 工作流日志的固定行：键版本 v2，restoring/restored/resumed 标记行，launched 行前缀，以及不可读标记。
 */
var JOURNAL_KEY_VERSION; // deferred: uses jsonStringify (../../utils/slowOperations.js) of its import cycle while loading; runs once the cycle is complete
var RESTORING_LINE;
var RESTORED_LINE;
var RESUMED_LINE;
var sliced;
var UNREADABLE;
deferInit("chunk-kd2wbncj.js:20853", () => {
  JOURNAL_KEY_VERSION = "v2";
  RESTORING_LINE = jsonStringify({
    type: "restoring",
  });
  RESTORED_LINE = jsonStringify({
    type: "restored",
  });
  RESUMED_LINE = jsonStringify({
    type: "resumed",
  });
  sliced = jsonStringify({
    type: "launched",
  }).slice(0, -1);
  UNREADABLE = "unreadable";
});
//@ chunk-kd2wbncj.js:20989-21069 placement
/**
 * 合法文本原样返回，否则返回 unreadable 标记。
 */
function textOrUnreadable(value) {
  if (value === undefined) return;
  return typeof value === "string" && SHA256_HEX_RE.test(value) ? value : UNREADABLE;
}
//@ chunk-kd2wbncj.js:21069-21239 placement
/**
 * 判断文本中是否包含 launched 日志行（含被截断在末尾的部分前缀）。
 */
function containsLaunchedLine(text) {
  for (let index = text.indexOf("{"); index !== -1; index = text.indexOf("{", index + 1)) {
    let isFullMatch = text.startsWith(sliced, index);
    let isPartialMatch = text.length - index < sliced.length && sliced.startsWith(text.slice(index));
    if (isFullMatch || isPartialMatch) return true;
  }
  return false;
}
//@ chunk-kd2wbncj.js:21239-21759 placement
/**
 * 索引工作流 journal 条目：按 key 汇总最终结果、开始记录、失败、被降级（结果后又开始）与被替换的 key，并取 launched 中的隐藏脚本哈希。
 */
function indexJournalEntries(entries) {
  let results = new Map();
  let started = new Map();
  let failed = new Set();
  let demoted = new Set();
  let replaced = new Set();
  let hiddenScriptSha256;
  for (let entry of entries)
    if (entry.type === "launched") hiddenScriptSha256 ??= textOrUnreadable(entry.hiddenScriptSha256);
    else if (entry.type === "result") {
      if (results.has(entry.key) || demoted.has(entry.key) || failed.has(entry.key)) replaced.add(entry.key);
      results.set(entry.key, entry);
      demoted.delete(entry.key);
    } else if (entry.type === "started") {
      if (results.delete(entry.key)) demoted.add(entry.key);
      let list = started.get(entry.key);
      if (list) list.push(entry);
      else started.set(entry.key, [entry]);
    } else if (entry.type === "failed") {
      results.delete(entry.key);
      failed.add(entry.key);
    }
  return {
    results,
    started,
    failed,
    demoted,
    replaced,
    ...(hiddenScriptSha256 !== undefined && {
      hiddenScriptSha256,
    }),
  };
}
//@ chunk-kd2wbncj.js:21759-22275 placement
/**
 * 生成 agent 调用选项的稳定键：只取 schema/model/effort/isolation/agentType/disallowedTools/bashCommandClamp，递归按键排序（跳过函数与 __proto__）后序列化。
 */
function agentOptionsKey(options) {
  if (!options) return "{}";
  let picked = {};
  let OPTION_KEYS = [
    "schema",
    "model",
    "effort",
    "isolation",
    "agentType",
    "disallowedTools",
    "bashCommandClamp",
  ];
  for (let optionKey of OPTION_KEYS) {
    let optionValue = options[optionKey];
    if (optionValue === undefined || typeof optionValue === "function") continue;
    picked[optionKey] = optionValue;
  }
  let canonicalize = (picked) => {
    if (typeof picked === "function") return;
    if (Array.isArray(picked)) {
      let out = [];
      let length = picked.length;
      let safeLength = Number.isSafeInteger(length) ? length : 0;
      for (let index = 0; index < safeLength; index++) out[index] = canonicalize(picked[index]);
      return out;
    }
    if (picked && typeof picked === "object") {
      let out = {};
      for (let key of Object.keys(picked).sort()) {
        if (key === "__proto__") continue;
        out[key] = canonicalize(picked[key]);
      }
      return out;
    }
    return picked;
  };
  return jsonStringify(canonicalize(picked));
}
//@ chunk-kd2wbncj.js:22275-22410 placement
/**
 * 计算 agent() 调用的日志键：对调用点、提示词与稳定化后的选项做 sha256，并加版本前缀。
 */
function agentCallKey(prompt, options, prev) {
  let hash = createHash("sha256")
    .update(prev)
    .update("\x00")
    .update(prompt)
    .update("\x00")
    .update(agentOptionsKey(options))
    .digest("hex");
  return `${JOURNAL_KEY_VERSION}:${hash}`;
}
//@ chunk-kd2wbncj.js:22410-22666 placement
/**
 * 计算子调用的日志键：父键与名称加上槽位号、fork 或 join 成员列表后做 sha256。
 */
function childCallKey(prev, target, slot) {
  let hash = createHash("sha256").update(prev).update("\x00").update(target).update("\x00");
  if (typeof slot === "number") hash.update(`slot:${slot}`);
  else if (slot === "fork") hash.update("fork");
  else {
    hash.update("join");
    for (let priorKey of slot) hash.update("\x00").update(priorKey);
  }
  return hash.digest("hex");
}
//@ chunk-kd2wbncj.js:22666-22764 placement
/**
 * 计算「旧内容 → 新内容」替换后的 sha256。
 */
function hashReplacedContent(key, content) {
  return createHash("sha256").update(key).update("\x00replaced\x00").update(content).digest("hex");
}
export {
  HiddenScriptShaCache,
  RESTORING_LINE,
  RESTORED_LINE,
  indexJournalEntries,
  RESUMED_LINE,
  containsLaunchedLine,
  childCallKey,
  agentCallKey,
  hashReplacedContent,
  isArbiterStructuredOutputReviewOn,
  structuredOutputVerdict,
  textOrUnreadable,
  readWorkflowJournal,
  hiddenScriptSha,
  HIDDEN_SCRIPT_RESUME_REFUSAL,
};
