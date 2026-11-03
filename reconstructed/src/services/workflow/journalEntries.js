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
import { createHash, createHash as createHash_2 } from "crypto";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import {
  getAutoModeClassifierRole,
  awaitServerVerdict,
  summarizeServerVerdict,
  classifyServerVerdict,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { AS, computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-41w44bgm.js:28151-28243 placement
function Io(e) {
  return (
    readFlagWithOverride("tengu_harmonic_bumblebee", { safe: !1 }) &&
    getAutoModeClassifierRole(e, { peek: !0 }) === "arbiter"
  );
}
/**
 * 对 agent 结构化输出做服务端审查判定：被标记时返回原因，否则返回未标记；非判定结果返回 undefined。
 */
//@ chunk-41w44bgm.js:28243-28418 placement
async function structuredOutputVerdict(e, n) {
  let r = await awaitServerVerdict(e, n),
    h = summarizeServerVerdict(r, n);
  if (h.kind !== "verdict") return;
  return h.outcome === "flagged"
    ? {
        flagged: !0,
        reason: classifyServerVerdict(r, n, () => {
          return;
        }).reason,
      }
    : { flagged: !1 };
}
/**
 * 工作流日志的固定行：键版本 v2，restoring/restored/resumed 标记行，launched 行前缀，以及不可读标记。
 */
//@ chunk-41w44bgm.js:28578-28714 placement
var JOURNAL_KEY_VERSION = "v2",
  RESTORING_LINE = jsonStringify({ type: "restoring" }),
  RESTORED_LINE = jsonStringify({ type: "restored" }),
  RESUMED_LINE = jsonStringify({ type: "resumed" }),
  sliced = jsonStringify({ type: "launched" }).slice(0, -1),
  UNREADABLE = "unreadable";
//@ chunk-41w44bgm.js:28714-28794 placement
function No(e) {
  if (e === void 0) return;
  return typeof e === "string" && AS.test(e) ? e : UNREADABLE;
}
/**
 * 判断文本中是否包含 launched 日志行（含被截断在末尾的部分前缀）。
 */
//@ chunk-41w44bgm.js:28794-28964 placement
function containsLaunchedLine(e) {
  for (let index = e.indexOf("{"); index !== -1; index = e.indexOf("{", index + 1)) {
    let startsWith = e.startsWith(sliced, index),
      h = e.length - index < sliced.length && sliced.startsWith(e.slice(index));
    if (startsWith || h) return !0;
  }
  return !1;
}
/**
 * 索引工作流 journal 条目：按 key 汇总最终结果、开始记录、失败、被降级（结果后又开始）与被替换的 key，并取 launched 中的隐藏脚本哈希。
 */
//@ chunk-41w44bgm.js:28964-29484 placement
function indexJournalEntries(entries) {
  let results = new Map(),
    started = new Map(),
    failed = new Set(),
    demoted = new Set(),
    replaced = new Set(),
    hiddenScriptSha256;
  for (let entry of entries)
    if (entry.type === "launched") hiddenScriptSha256 ??= No(entry.hiddenScriptSha256);
    else if (entry.type === "result") {
      if (results.has(entry.key) || demoted.has(entry.key) || failed.has(entry.key)) replaced.add(entry.key);
      (results.set(entry.key, entry), demoted.delete(entry.key));
    } else if (entry.type === "started") {
      if (results.delete(entry.key)) demoted.add(entry.key);
      let j = started.get(entry.key);
      if (j) j.push(entry);
      else started.set(entry.key, [entry]);
    } else if (entry.type === "failed") (results.delete(entry.key), failed.add(entry.key));
  return {
    results: results,
    started: started,
    failed: failed,
    demoted: demoted,
    replaced: replaced,
    ...(hiddenScriptSha256 !== void 0 && { hiddenScriptSha256: hiddenScriptSha256 }),
  };
}
/**
 * 生成 agent 调用选项的稳定键：只取 schema/model/effort/isolation/agentType/disallowedTools/bashCommandClamp，递归按键排序（跳过函数与 __proto__）后序列化。
 */
//@ chunk-41w44bgm.js:29484-30000 placement
function agentOptionsKey(options) {
  if (!options) return "{}";
  let picked = {},
    OPTION_KEYS = [
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
    if (y === void 0 || typeof y === "function") continue;
    picked[T] = y;
  }
  let canonicalize = (T) => {
    if (typeof T === "function") return;
    if (Array.isArray(T)) {
      let y = [],
        A = T.length,
        L = Number.isSafeInteger(A) ? A : 0;
      for (let j = 0; j < L; j++) y[j] = canonicalize(T[j]);
      return y;
    }
    if (T && typeof T === "object") {
      let y = {};
      for (let A of Object.keys(T).sort()) {
        if (A === "__proto__") continue;
        y[A] = canonicalize(T[A]);
      }
      return y;
    }
    return T;
  };
  return jsonStringify(canonicalize(picked));
}
/**
 * 计算 agent() 调用的日志键：对调用点、提示词与稳定化后的选项做 sha256，并加版本前缀。
 */
//@ chunk-41w44bgm.js:30000-30135 placement
function agentCallKey(e, n, r) {
  let digest = createHash("sha256")
    .update(r)
    .update("\x00")
    .update(e)
    .update("\x00")
    .update(agentOptionsKey(n))
    .digest("hex");
  return `${JOURNAL_KEY_VERSION}:${digest}`;
}
/**
 * 计算子调用的日志键：父键与名称加上槽位号、fork 或 join 成员列表后做 sha256。
 */
//@ chunk-41w44bgm.js:30135-30391 placement
function childCallKey(e, n, r) {
  let update = createHash("sha256").update(e).update("\x00").update(n).update("\x00");
  if (typeof r === "number") update.update(`slot:${r}`);
  else if (r === "fork") update.update("fork");
  else {
    update.update("join");
    for (let T of r) update.update("\x00").update(T);
  }
  return update.digest("hex");
}
//@ chunk-41w44bgm.js:30391-30489 placement
function Fo(e, n) {
  return createHash("sha256").update(e).update("\x00replaced\x00").update(n).digest("hex");
}
//@ chunk-0djyfj7x.js:227-262 placement
class sFt {
  scriptSha256ById = new Map();
}
/**
 * 取隐藏脚本的工作流运行的脚本 sha256：先查缓存，再在任务列表中找对应运行并计算脚本哈希。
 */
//@ chunk-0djyfj7x.js:262-527 placement
function hiddenScriptSha(r, s, i) {
  let n = s.get(sFt).scriptSha256ById.get(r);
  if (n !== void 0) return n;
  let found = Object.values(i.all()).find(
    (t) => t.type === "local_workflow" && t.workflowRunId === r && t.withholdScriptFromSdkEvents === !0,
  );
  if (found === void 0) return;
  return found.script === "" ? "" : computeContentHash(found.script);
}
/**
 * 隐藏脚本的工作流运行无法在未加载脚本的会话中恢复时的拒绝文案。
 */
//@ chunk-0djyfj7x.js:527-688 placement
var HIDDEN_SCRIPT_RESUME_REFUSAL =
  "This workflow run hides its script, and this session has not loaded that script, so it cannot resume the run. Start a new run without resumeFromRunId.";
//@ chunk-0djyfj7x.js:688-1427 placement
async function readWorkflowJournal(r, s, i, n) {
  let e = hiddenScriptSha(r, s, i);
  if (e === "") return { kind: "refused", reason: HIDDEN_SCRIPT_RESUME_REFUSAL };
  if (e !== void 0) return { kind: "hidden", scriptSha256: e };
  let t = await n();
  if ("refusal" in t) return { kind: "refused", reason: t.refusal };
  if (t.hiddenScriptSha256 !== void 0)
    return {
      kind: "refused",
      reason:
        "This workflow run hides its script, and this process has no record of starting it, so it will not resume it. Start a new run without resumeFromRunId.",
    };
  if (t.hasUnreadLine === !0)
    return {
      kind: "refused",
      reason: `A line of the journal of workflow run ${r} cannot be read, so this session cannot tell whether the run hides its script and will not resume it. Start a new run without resumeFromRunId; it runs again the agents this run had finished.`,
    };
  return { kind: "shared" };
}

export {
  sFt,
  RESTORING_LINE,
  RESTORED_LINE,
  indexJournalEntries,
  RESUMED_LINE,
  containsLaunchedLine,
  childCallKey,
  agentCallKey,
  Fo,
  Io,
  structuredOutputVerdict,
  No,
  readWorkflowJournal,
  hiddenScriptSha,
  HIDDEN_SCRIPT_RESUME_REFUSAL,
};
