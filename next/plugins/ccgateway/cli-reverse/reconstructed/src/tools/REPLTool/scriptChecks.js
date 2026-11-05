/**
 * tools/REPLTool/scriptChecks.ts
 *
 * 自动模式下把尚未审批的脚本攒批交给分类器检查，并给每个脚本记允许/阻止状态（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomBytes } from "crypto";
import { hasPermissionsToUseTool } from "../../utils/permissions/permissions.js";
import { logError } from "../../utils/log.js";
import { AbortError, isAbortError } from "../../utils/errors.js";
import { getToolCallOutcomeCode } from "../../utils/permissions/yoloClassifier.js";

//@ chunk-n51jggtb.js:16877-16905 placement
/**
 * 自动模式脚本检查的批量阈值：未检查脚本满 20 个或累计 20000 字符即触发一次检查；检查被判定为不可用后 30 秒内不再重试。
 */
var MAX_UNCHECKED_SCRIPTS = 20;
var MAX_UNCHECKED_CODE_BYTES = 20000;
var AUTOMODE_UNAVAILABLE_COOLDOWN_MS = 30000;
//@ chunk-n51jggtb.js:16905-19602 placement
/**
 * 脚本检查队列：把自动模式尚未审批的脚本攒起来，达到阈值后交给分类器一次性判断，并给每个脚本分别记录允许/阻止状态与随行说明。
 */
class ScriptCheckQueue {
  unclassifiedCode;
  unchecked = [];
  inFlight;
  everAdded = false;
  unavailableUntil = 0;
  constructor(unclassifiedCode) {
    this.unclassifiedCode = unclassifiedCode;
  }
  inUse() {
    return this.everAdded;
  }
  add(entry, checkContext) {
    this.everAdded = true;
    let reduced = this.unchecked.reduce((acc, entry) => acc + entry.code.length, 0);
    if (
      this.unchecked.length > 0 &&
      (this.unchecked.length >= MAX_UNCHECKED_SCRIPTS || reduced >= MAX_UNCHECKED_CODE_BYTES) &&
      this.inFlight === undefined &&
      Date.now() >= this.unavailableUntil
    ) {
      this.inFlight = this.startCheck(
        {
          ...checkContext,
          abortController: new AbortController(),
        },
        hasPermissionsToUseTool,
      );
      this.inFlight.then((outcome) => {
        if (!outcome.settled && outcome.cause === "threw") logError(outcome.error);
      });
    }
    for (let entry of this.unchecked) entry.runCheck = undefined;
    this.unchecked.push(entry);
  }
  handleFor(record) {
    return {
      awaitVerdict: (checkContext, runCheck) => this.awaitVerdict(record, checkContext, runCheck),
      ridesNow: () => this.ridesNow(record),
      inUse: () => this.everAdded,
    };
  }
  drop() {
    for (let entry of this.unchecked.splice(0)) entry.record.state = "none";
  }
  ended(record) {
    for (let entry of this.unchecked) if (entry.record === record) entry.stop = () => {};
  }
  ridesNow(record) {
    return record.state === "allowed" && this.unchecked.length === 0 && !this.unclassifiedCode.ran;
  }
  async awaitVerdict(record, checkContext, runCheck) {
    for (;;) {
      if (record.state === "blocked" && record.blocked !== undefined)
        return {
          kind: "blocked",
          decision: record.blocked,
        };
      if (this.unclassifiedCode.ran)
        return {
          kind: "checkCall",
        };
      if (this.unchecked.length === 0)
        return record.state === "allowed"
          ? {
              kind: "ride",
            }
          : {
              kind: "checkCall",
            };
      if (checkContext.abortController.signal.aborted) throw new AbortError();
      if (this.inFlight === undefined && Date.now() < this.unavailableUntil)
        return {
          kind: "checkCall",
        };
      let startedThisWait = this.inFlight === undefined;
      let inFlightCheck = (this.inFlight ??= this.startCheck(checkContext, runCheck));
      let outcome;
      try {
        outcome = await raceAbort(inFlightCheck, checkContext);
      } catch (error) {
        if (record.state === "blocked" && record.blocked !== undefined)
          return {
            kind: "blocked",
            decision: record.blocked,
          };
        throw error;
      }
      if (outcome.settled) continue;
      if (startedThisWait && outcome.cause !== "unavailable") throw outcome.error;
      if (!startedThisWait && outcome.cause === "aborted") continue;
      return {
        kind: "checkCall",
      };
    }
  }
  startCheck(checkContext, runCheck) {
    return this.check(checkContext, runCheck).finally(() => {
      this.inFlight = undefined;
    });
  }
  async check(checkContext, runCheck) {
    let entries = this.unchecked.slice();
    let last = entries.at(-1);
    let combinedCode = joinScriptCodes(entries);
    let decision;
    try {
      if (last?.runCheck === undefined) throw Error("no check to run for the unchecked scripts");
      decision = await last.runCheck(combinedCode, checkContext, runCheck);
    } catch (error) {
      return checkContext.abortController.signal.aborted
        ? {
            settled: false,
            cause: "aborted",
            error,
          }
        : {
            settled: false,
            cause: "threw",
            error,
          };
    }
    if (
      decision.behavior === "deny" &&
      getToolCallOutcomeCode(decision) === "automode-unavailable" &&
      !(decision.decisionReason.type === "classifier" && decision.decisionReason.monitorBlocked === true)
    ) {
      if (checkContext.abortController.signal.aborted)
        return {
          settled: false,
          cause: "aborted",
          error: new AbortError(),
        };
      this.unavailableUntil = Date.now() + AUTOMODE_UNAVAILABLE_COOLDOWN_MS;
      return {
        settled: false,
        cause: "unavailable",
      };
    }
    this.unchecked.splice(0, entries.length);
    let state = recordStateOf(decision);
    let blockedBy =
      decision.behavior === "deny" &&
      decision.decisionReason.type === "classifier" &&
      decision.decisionReason.monitorBlocked === true
        ? "monitor"
        : "classifier";
    for (let entry of entries) {
      entry.record.state = state;
      if (state === "blocked" && decision.behavior === "deny") {
        entry.record.blocked = decision;
        try {
          entry.stop(decision.message, entries.length, blockedBy);
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
      }
    }
    if (state !== "allowed") {
      this.unclassifiedCode.ran = true;
      this.drop();
    }
    return {
      settled: true,
    };
  }
}
//@ chunk-n51jggtb.js:19602-20052 placement
/**
 * 把权限判定结果（allow/ask/deny）折算成脚本状态：allowed / atLimit / none / blocked，供脚本队列决定能否与正在运行的调用并跑。
 */
function recordStateOf(decision) {
  let decisionReason = decision.decisionReason;
  if (decision.behavior === "allow") {
    if (decisionReason?.type === "classifier" && decisionReason.classifierAllowed === true) return "allowed";
    if (decisionReason?.type === "mode" && decisionReason.denialLimitRun === true) return "atLimit";
    return "none";
  }
  if (decision.behavior === "ask")
    return decision.denialLimitFallback !== undefined || decisionReason?.type === "classifier"
      ? "atLimit"
      : "none";
  if (decision.decisionReason.type === "classifier" && decision.decisionReason.monitorBlocked === true)
    return "blocked";
  return getToolCallOutcomeCode(decision) === "automode-blocked" ? "blocked" : "none";
}
//@ chunk-n51jggtb.js:20052-20569 placement
/**
 * 生成脚本被分类器或 API 转义监控阻止时的模型可见说明，含受牵连的其他脚本数量与先后顺序。
 */
function describeBlockedScript(
  reason,
  otherCount,
  { cause: blockedBy = "classifier", late: othersPhrase = false } = {},
) {
  let remaining = otherCount - 1;
  let scriptWord = `${remaining} other ${remaining === 1 ? "script" : "scripts"} in this REPL that it had not checked yet`;
  return `${blockedBy === "monitor" ? `The API's escape monitor blocked auto mode's check of this script${remaining > 0 ? ` and ${scriptWord}` : ""}` : remaining > 0 ? `Auto mode's classifier judged this script together with ${scriptWord}, and blocked them` : "Auto mode's classifier blocked this script"}, ${othersPhrase ? "so auto mode stopped the calls this script left running" : "so auto mode stopped this script after it had started"}. ${reason}`;
}
//@ chunk-n51jggtb.js:20569-20777 placement
/**
 * 把一个 REPL 中按顺序启动的多个脚本拼成一次检查输入，超过一个时加上随机标记与序号注释以便回溯。
 */
function joinScriptCodes(entries) {
  if (entries.length === 1) return entries[0].code;
  let marker = randomBytes(4).toString("hex");
  return entries.map(
    (
      entry,
      index,
    ) => `// [${marker}] Script ${index + 1} of ${entries.length}; these scripts started in this order in one REPL
${entry.code}`,
  ).join(`

`);
}
//@ chunk-n51jggtb.js:20777-21032 placement
/**
 * 给等待中的检查 Promise 套上 abort 信号，abort 时以 AbortError 拒绝。
 */
async function raceAbort(promise, checkContext) {
  let signal = checkContext.abortController.signal;
  if (signal.aborted) throw new AbortError();
  let onAbort;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        onAbort = () => reject(new AbortError());
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
      }),
    ]);
  } finally {
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
}
//@ chunk-n51jggtb.js:21032-21089 placement
/**
 * 脚本生命周期的常量钩子：后继脚本是否已启动恒为真，脚本是否已返回恒为假（当前实现）。
 */
var SCRIPT_OUTCOME = {
  laterScriptStarted: () => true,
  scriptReturned: () => false,
};
//@ chunk-n51jggtb.js:21089-21177 placement
/**
 * 给运行记录标上启动顺序号，供“后继脚本已启动”判断使用。
 */
function markScriptStarted(verdictOrder, record, order) {
  record.order = order;
  verdictOrder.newestStarted = order === undefined ? 1 / 0 : Math.max(verdictOrder.newestStarted, order);
}
//@ chunk-n51jggtb.js:21177-21243 placement
/**
 * 判断给定记录是否比当前最新的启动顺序更新。
 */
function startedAfterThis(verdictOrder, record) {
  return record.order === undefined || verdictOrder.newestStarted > record.order;
}
export { SCRIPT_OUTCOME, ScriptCheckQueue, startedAfterThis, describeBlockedScript, markScriptStarted };
