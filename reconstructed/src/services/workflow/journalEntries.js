/**
 * services/workflow/journalEntries.ts
 *
 * 工作流日志条目（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0djyfj7x.js (4), chunk-41w44bgm.js (10)
 * attribution: placement 14
 */
import { createHash } from "crypto";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import {
  getAutoModeClassifierRole,
  awaitServerVerdict,
  summarizeServerVerdict,
  classifyServerVerdict,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { SHA256_HEX_RE, computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-41w44bgm.js:28151-28243 placement
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
//@ chunk-41w44bgm.js:28243-28418 placement
/**
 * 对 agent 结构化输出做服务端审查判定：被标记时返回原因，否则返回未标记；非判定结果返回 undefined。
 */
async function structuredOutputVerdict(response, n) {
  let r = await awaitServerVerdict(response, n);
  let h = summarizeServerVerdict(r, n);
  if (h.kind !== "verdict") return;
  return h.outcome === "flagged"
    ? {
        flagged: true,
        reason: classifyServerVerdict(r, n, () => {
          return;
        }).reason,
      }
    : {
        flagged: false,
      };
}
//@ chunk-41w44bgm.js:28578-28714 placement
/**
 * 工作流日志的固定行：键版本 v2，restoring/restored/resumed 标记行，launched 行前缀，以及不可读标记。
 */
var JOURNAL_KEY_VERSION = "v2";
var RESTORING_LINE = jsonStringify({
  type: "restoring",
});
var RESTORED_LINE = jsonStringify({
  type: "restored",
});
var RESUMED_LINE = jsonStringify({
  type: "resumed",
});
var sliced = jsonStringify({
  type: "launched",
}).slice(0, -1);
var UNREADABLE = "unreadable";
//@ chunk-41w44bgm.js:28714-28794 placement
/**
 * 合法文本原样返回，否则返回 unreadable 标记。
 */
function textOrUnreadable(e) {
  if (e === undefined) return;
  return typeof e === "string" && SHA256_HEX_RE.test(e) ? e : UNREADABLE;
}
//@ chunk-41w44bgm.js:28794-28964 placement
/**
 * 判断文本中是否包含 launched 日志行（含被截断在末尾的部分前缀）。
 */
function containsLaunchedLine(e) {
  for (let index = e.indexOf("{"); index !== -1; index = e.indexOf("{", index + 1)) {
    let r = e.startsWith(sliced, index);
    let h = e.length - index < sliced.length && sliced.startsWith(e.slice(index));
    if (r || h) return true;
  }
  return false;
}
//@ chunk-41w44bgm.js:28964-29484 placement
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
      let j = started.get(entry.key);
      if (j) j.push(entry);
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
//@ chunk-41w44bgm.js:29484-30000 placement
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
  for (let T of OPTION_KEYS) {
    let y = options[T];
    if (y === undefined || typeof y === "function") continue;
    picked[T] = y;
  }
  let canonicalize = (picked) => {
    if (typeof picked === "function") return;
    if (Array.isArray(picked)) {
      let y = [];
      let A = picked.length;
      let L = Number.isSafeInteger(A) ? A : 0;
      for (let j = 0; j < L; j++) y[j] = canonicalize(picked[j]);
      return y;
    }
    if (picked && typeof picked === "object") {
      let y = {};
      for (let key of Object.keys(picked).sort()) {
        if (key === "__proto__") continue;
        y[key] = canonicalize(picked[key]);
      }
      return y;
    }
    return picked;
  };
  return jsonStringify(canonicalize(picked));
}
//@ chunk-41w44bgm.js:30000-30135 placement
/**
 * 计算 agent() 调用的日志键：对调用点、提示词与稳定化后的选项做 sha256，并加版本前缀。
 */
function agentCallKey(e, options, prev) {
  let h = createHash("sha256")
    .update(prev)
    .update("\x00")
    .update(e)
    .update("\x00")
    .update(agentOptionsKey(options))
    .digest("hex");
  return `${JOURNAL_KEY_VERSION}:${h}`;
}
//@ chunk-41w44bgm.js:30135-30391 placement
/**
 * 计算子调用的日志键：父键与名称加上槽位号、fork 或 join 成员列表后做 sha256。
 */
function childCallKey(prev, n, r) {
  let h = createHash("sha256").update(prev).update("\x00").update(n).update("\x00");
  if (typeof r === "number") h.update(`slot:${r}`);
  else if (r === "fork") h.update("fork");
  else {
    h.update("join");
    for (let T of r) h.update("\x00").update(T);
  }
  return h.digest("hex");
}
//@ chunk-41w44bgm.js:30391-30489 placement
/**
 * 计算「旧内容 → 新内容」替换后的 sha256。
 */
function hashReplacedContent(e, n) {
  return createHash("sha256").update(e).update("\x00replaced\x00").update(n).digest("hex");
}
//@ chunk-0djyfj7x.js:227-262 placement
/**
 * 按工作流运行 id 缓存隐藏脚本的 sha256。
 */
class HiddenScriptShaCache {
  scriptSha256ById = new Map();
}
//@ chunk-0djyfj7x.js:262-527 placement
/**
 * 取隐藏脚本的工作流运行的脚本 sha256：先查缓存，再在任务列表中找对应运行并计算脚本哈希。
 */
function hiddenScriptSha(r, s, i) {
  let n = s.get(HiddenScriptShaCache).scriptSha256ById.get(r);
  if (n !== undefined) return n;
  let found = Object.values(i.all()).find(
    (t) => t.type === "local_workflow" && t.workflowRunId === r && t.withholdScriptFromSdkEvents === true,
  );
  if (found === undefined) return;
  return found.script === "" ? "" : computeContentHash(found.script);
}
//@ chunk-0djyfj7x.js:527-688 placement
/**
 * 隐藏脚本的工作流运行无法在未加载脚本的会话中恢复时的拒绝文案。
 */
var HIDDEN_SCRIPT_RESUME_REFUSAL =
  "This workflow run hides its script, and this session has not loaded that script, so it cannot resume the run. Start a new run without resumeFromRunId.";
//@ chunk-0djyfj7x.js:688-1427 placement
async function readWorkflowJournal(r, toolState, taskRegistry, n) {
  let e = hiddenScriptSha(r, toolState, taskRegistry);
  if (e === "")
    return {
      kind: "refused",
      reason: HIDDEN_SCRIPT_RESUME_REFUSAL,
    };
  if (e !== undefined)
    return {
      kind: "hidden",
      scriptSha256: e,
    };
  let t = await n();
  if ("refusal" in t)
    return {
      kind: "refused",
      reason: t.refusal,
    };
  if (t.hiddenScriptSha256 !== undefined)
    return {
      kind: "refused",
      reason:
        "This workflow run hides its script, and this process has no record of starting it, so it will not resume it. Start a new run without resumeFromRunId.",
    };
  if (t.hasUnreadLine === true)
    return {
      kind: "refused",
      reason: `A line of the journal of workflow run ${r} cannot be read, so this session cannot tell whether the run hides its script and will not resume it. Start a new run without resumeFromRunId; it runs again the agents this run had finished.`,
    };
  return {
    kind: "shared",
  };
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
