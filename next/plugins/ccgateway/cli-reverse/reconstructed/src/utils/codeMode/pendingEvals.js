/**
 * utils/codeMode/pendingEvals.ts
 *
 * Code 模式里尚未开始的 eval 的进度文案与状态行事件投递（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8tee4zrd.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";
import { formatDuration } from "../format.js";
import { validatePollEvent } from "../pollEvents.js";
import { logForDebugging } from "../debug.js";

//@ chunk-8tee4zrd.js:3863-5477 placement
/**
 * 拼“还没有输出，eval 仍在等待”的状态文案：按 eval 状态（等待/运行/脱离/已结算）逐条列出尚未开始的调用。
 */
function describePendingEvals(evals, brief = false) {
  if (codeModeAccepted()) {
    let filtered = evals.filter((item) => item.notYetStarted.length > 0);
    let namedIds = new Set(filtered.slice(0, MAX_NAMED_EVALS).map((item) => item.id));
    let omittedCount = filtered.length - namedIds.size;
    let omittedNote =
      omittedCount === 0
        ? ""
        : `; ${omittedCount} more ${omittedCount === 1 ? "eval has calls" : "evals have calls"} that haven't started`;
    if (evals.length > 0 && evals.every((item) => item.state === "late")) {
      let joined = evals.map((item) => `#${item.id}`).join(", ");
      if (filtered.length === 0)
        return evals.length === 1
          ? `no late output yet \u2014 eval ${joined} settled; the calls it left running are finishing. Poll again to keep waiting.`
          : `no late output yet \u2014 evals ${joined} settled; the calls they left running are finishing. Poll again to keep waiting.`;
      if (evals.length === 1)
        return `no late output yet \u2014 eval ${joined} settled; ${describeNotStarted(evals[0].notYetStarted)}. Poll again to keep waiting.`;
      let mapped = evals
        .filter((item) => namedIds.has(item.id))
        .map((item) => `#${item.id}: ${describeNotStarted(item.notYetStarted)}`);
      let othersNote =
        evals.length > filtered.length ? "; the calls the others left running are finishing" : "";
      return `no late output yet \u2014 evals ${joined} settled; ${mapped.join("; ")}${omittedNote}${othersNote}. Poll again to keep waiting.`;
    }
    let mapped = evals.map((item) => {
      let pendingNote = namedIds.has(item.id) ? `, and ${describeNotStarted(item.notYetStarted)}` : "";
      switch (item.state) {
        case "waiting":
          return `#${item.id} waiting for its turn`;
        case "running":
          return `#${item.id} running for ${formatDuration(item.runningMs)}${pendingNote}`;
        case "detached":
          return `#${item.id} running for ${formatDuration(item.runningMs)} (detached: later evals run beside it)${pendingNote}`;
        case "late":
          return namedIds.has(item.id)
            ? `#${item.id} settled, and ${describeNotStarted(item.notYetStarted)}`
            : `#${item.id} settled; calls it left running are finishing`;
      }
    });
    let noun = evals.length === 1 ? "eval" : "evals";
    if (brief) return `${evals.length} ${noun} still pending: ${mapped.join("; ")}${omittedNote}.`;
    return `no output yet \u2014 ${evals.length} ${noun} pending: ${mapped.join("; ")}${omittedNote}. Poll again to keep waiting.`;
  }
  return "";
}
//@ chunk-8tee4zrd.js:5477-5485 placement
var MAX_NAMED_EVALS = 3;
//@ chunk-8tee4zrd.js:5485-5937 placement
/**
 * 描述某 eval 尚未开始的调用与已等时长，提示可能在等用户回答权限框。
 */
function describeNotStarted(notYetStarted) {
  let pronoun = notYetStarted.length === 1 ? "it" : "they";
  let mapped = notYetStarted
    .slice(0, MAX_LISTED_CALLS)
    .map((call) => `${call.toolName} after ${formatDuration(call.waitingMs)}`);
  let omittedCount = notYetStarted.length - mapped.length;
  let listed = omittedCount > 0 ? `${mapped.join(", ")} and ${omittedCount} more` : mapped.join(", ");
  return notYetStarted.length === 1
    ? `its ${notYetStarted[0].toolName} call hasn't started after ${formatDuration(notYetStarted[0].waitingMs)} (${pronoun} may be waiting for the user to answer a permission prompt)`
    : `${notYetStarted.length} of its calls haven't started: ${listed} (${pronoun} may be waiting for the user to answer a permission prompt)`;
}
//@ chunk-8tee4zrd.js:5937-5945 placement
var MAX_LISTED_CALLS = 5;
//@ chunk-8tee4zrd.js:5945-6500 placement
/**
 * 把待处理 eval 的进度作为 REPL 状态事件投递（typed 或元素形态），失败只记 debug。
 */
function emitStatusLine(sink, evals, agentId, brief = false) {
  if (codeModeAccepted()) {
    let { REPL_STATUS_EVENT_KIND } = require("../pollEvents/EVAL_LOST_STATUS.lazy.js");
    let { isHostError } = require("../errors/hostError.js");
    let { isReplTypedEventsOn } = require("./typedEvents.js");
    let at = new Date().toISOString();
    sink
      .enqueuePollEvent({
        kind: REPL_STATUS_EVENT_KIND,
        ...(isReplTypedEventsOn()
          ? {
              typed: {
                at,
                fields: {
                  pending: evals.length,
                  text: describePendingEvals(evals, brief),
                },
              },
            }
          : {
              element: validatePollEvent({
                kind: REPL_STATUS_EVENT_KIND,
                at,
                content: describePendingEvals(evals, brief),
                attributes: {
                  pending: String(evals.length),
                },
              }),
            }),
        allowReservedKind: true,
        ...(agentId !== undefined && {
          agentId,
        }),
      })
      .catch((error) => {
        logForDebugging(
          `async REPL status line not delivered: ${isHostError(error) ? error.message : "non-Error rejection"}`,
          {
            level: "debug",
          },
        );
      });
  }
}
export { emitStatusLine };
