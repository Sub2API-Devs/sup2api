/**
 * tools/REPLTool/contexts.ts
 *
 * contexts API：派生子上下文、查看状态与 tail、报告扣留判定（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (15)
 * attribution: placement 15
 */
import { MAIN } from "../../utils/sessionPeers.js";
import { TEAM_PRELUDE } from "./preludes.js";
import {
  getSelectableBackgroundTasks,
  logHandbackSections,
  isAgentFlagged,
  handbackForRecipient,
  handbackKey,
  agentContract,
  isAutoHandbackArmed,
} from "../AgentTool/handbackReport.js";
import { SUBAGENTHANDBACK } from "../AgentTool/constants.js";
import { tailTaskOutput, getTaskOutputPath } from "../../utils/task/diskOutput.js";
import { isEvalToolName } from "./constants.js";
import { currentWarmupGate, prefixStaggerMs } from "../../services/workflow/usageLimitWait.js";
import { getCwd } from "../../utils/cwd.js";
import { sleep } from "../../utils/sleep.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-n51jggtb.js:76356-76485 placement
/**
 * 子上下文名与状态的限额常量。
 */
var CONTEXT_NAME_MAX_CHARS = 64;
var CONTEXT_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
var RESERVED_CONTEXT_NAMES = new Set(["lead", "system", "then", MAIN]);
var MAX_INITIAL_PROMPT_CHARS = 150000;
var MAX_LOG_TEXT_CHARS = 32768;
var DEFAULT_TAIL_LINES = 3;
var MAX_TAIL_LINES = 20;
var TOOL_INPUT_ECHO_MAX_CHARS = 300;
var TAIL_OUTPUT_MAX_BYTES = 4194304;
//@ chunk-n51jggtb.js:76485-76964 placement
/**
 * 上下文报告被安全审查否决时的说明，附带 contexts.<name> 写法。
 */
function unclearedReportText(name, method) {
  return `${/^[a-z_$][\w$]*$/i.test(name) ? `contexts.${name}` : `contexts['${name}']`}.${method}: auto mode's safety review did not approve this context's report (it flagged the report or could not review it), so result(), state.lastText and tail() on this context throw from now on. If the context ran in the background, its report is in a <task-notification> from it, with any note auto mode added; read that note before you act on the report. Start a new context for more work.`;
}
//@ chunk-n51jggtb.js:76964-77104 placement
/**
 * lead 角色的空 team 实现（spawn/view/tail 的空版本）。
 */
var LEAD_CONTEXT = {
  role: "lead",
  spawn: (thunk) => thunk(),
  view: () => {
    return;
  },
  reportUncleared: () => false,
  whenSettled: () => Promise.resolve(),
  tail: () => Promise.resolve([]),
};
//@ chunk-n51jggtb.js:77104-77362 placement
/**
 * 校验子上下文名字：格式、保留名、本会话内不可重名。
 */
function validateContextName(name, contexts) {
  if (!CONTEXT_NAME_RE.test(name))
    return `name must be 1-${CONTEXT_NAME_MAX_CHARS} chars of a-z, 0-9 and '-', starting with a letter or digit`;
  if (RESERVED_CONTEXT_NAMES.has(name)) return `'${name}' is a reserved name`;
  if (contexts.has(name)) return `'${name}' was already used in this session; a name is never reused`;
  return;
}
//@ chunk-n51jggtb.js:77362-77372 placement
/**
 * team prelude 的导出别名。
 */
var TEAM_PRELUDE_TEXT = TEAM_PRELUDE;
//@ chunk-n51jggtb.js:77372-77635 placement
/**
 * 把任务状态映射为显示用的 ready/idle/stepping/failed/released。
 */
function contextStatus(task) {
  switch (task.status) {
    case "pending":
      return "ready";
    case "running":
      return task.isIdle === true ? "idle" : "stepping";
    case "completed":
      return getSelectableBackgroundTasks(task)?.finalizing === true ? "stepping" : "idle";
    case "paused":
      return "idle";
    case "failed":
      return "failed";
    case "killed":
      return "released";
  }
}
//@ chunk-n51jggtb.js:77635-77740 placement
/**
 * 判断任务是否还在进行（pending/running/finalizing）。
 */
function isTaskActive(task) {
  return (
    task.status === "pending" ||
    (task.status === "running" && task.isIdle !== true) ||
    getSelectableBackgroundTasks(task)?.finalizing === true
  );
}
//@ chunk-n51jggtb.js:77740-78009 placement
/**
 * 取上下文报告正文，交给上层展示。
 */
function deliveredReportText(task) {
  if (task.result === undefined) return;
  if (task.result.handback === "send") return task.result.handbackReport?.text ?? "";
  let { body } = logHandbackSections(
    task.result.content,
    task.result.harnessNoteCount,
    0,
    task.result.harnessSectionHash,
  );
  return body.filter((section) => section.type === "text").map((section) => section.text).join(`
`);
}
//@ chunk-n51jggtb.js:78009-78401 placement
/**
 * 算上下文报告的扣留状态（flagged/pending/send/withheld）。
 */
function handbackState(task, agentId) {
  if (isAgentFlagged(agentId)) return "flagged";
  let handbackRecipient = getSelectableBackgroundTasks(task)?.handbackRecipient;
  let handback = task.result?.handback;
  if (handbackRecipient === undefined && handback === undefined) return;
  let recipientHandback =
    handbackRecipient === undefined ? undefined : handbackForRecipient(agentId, handbackRecipient);
  if (handback === "flagged" || recipientHandback?.flagged === true) return "flagged";
  if (task.result !== undefined && handback === undefined) return;
  if (task.status === "pending" || task.status === "running")
    return recipientHandback !== undefined ? "send" : "pending";
  if (handback !== undefined) return handback;
  return recipientHandback !== undefined ? "send" : "withheld";
}
//@ chunk-n51jggtb.js:78401-78857 placement
/**
 * 报告不可见时的各种占位说明。
 */
var CONTEXT_PLACEHOLDER_TEXTS = {
  report: "[the report is not shown here; result().text carries it when it was delivered without a flag]",
  flagged: `[withheld: the classifier flagged this context's ${SUBAGENTHANDBACK} report; none of its transcript is shown]`,
  withheld: `[withheld: no delivered ${SUBAGENTHANDBACK} report is on record for this context; its last turns are not shown]`,
  finishing:
    "[this context is still finishing, so its latest entry is hidden; await its result() and call tail() again to see it]",
};
//@ chunk-n51jggtb.js:78857-79053 placement (2.1.88 match: extractUsage, 0.861)
/**
 * 把 usage 汇总成 input/output token 数。
 */
function extractUsage(result) {
  let usage = result.result?.usage;
  if (usage === undefined) return;
  return {
    inputTokens:
      (usage.input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0,
  };
}
//@ chunk-n51jggtb.js:79053-79313 placement
/**
 * 组装上下文的一行状态（状态、正文、费用）。
 */
function taskStatusView(task) {
  let status = contextStatus(task);
  let lastText =
    handbackState(task, task.id) === "flagged" ||
    handbackKey(task.id) ||
    getSelectableBackgroundTasks(task)?.finalizing === true
      ? ""
      : deliveredReportText(task) ||
        (status === "failed" ? task.error : undefined) ||
        task.progress?.summary ||
        task.progress?.lastActivity?.activityDescription ||
        "";
  let usage = extractUsage(task);
  return {
    status,
    lastText,
    ...(usage !== undefined && {
      cost: usage,
    }),
  };
}
//@ chunk-n51jggtb.js:79313-80608 placement
/**
 * 从 transcript 里摘出最近若干条助手文本与工具调用作为 tail() 结果。
 */
async function readTaskTail(taskOutputPath, count, state) {
  let { content, bytesRead, bytesTotal } = await tailTaskOutput(taskOutputPath, TAIL_OUTPUT_MAX_BYTES);
  let tail = content;
  if (bytesTotal > bytesRead) {
    let index = tail.indexOf(`
`);
    tail = index === -1 ? "" : tail.slice(index + 1);
  }
  let entries = [];
  for (let line of tail.split(`
`)) {
    if (!line.includes('"type":"assistant"')) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== "object" || !("type" in parsed) || parsed.type !== "assistant")
      continue;
    let message = parsed;
    let content = Array.isArray(message.message?.content) ? message.message.content : [];
    let texts = [];
    let handback = false;
    for (let block of content) {
      if (block === null || typeof block !== "object" || !("type" in block)) continue;
      if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
      else if (block.type === "tool_use" && typeof block.name === "string") {
        if (message.isVirtual === true && isEvalToolName(block.name)) continue;
        let json = JSON.stringify(block.input ?? {});
        if (
          block.name === SUBAGENTHANDBACK ||
          (isEvalToolName(block.name) && json.includes(SUBAGENTHANDBACK))
        ) {
          handback = true;
          texts.push(`\u203A ${block.name}(${CONTEXT_PLACEHOLDER_TEXTS.report})`);
          continue;
        }
        texts.push(
          `\u203A ${block.name}(${json.length > TOOL_INPUT_ECHO_MAX_CHARS ? `${json.slice(0, TOOL_INPUT_ECHO_MAX_CHARS)}\u2026` : json})`,
        );
      }
    }
    if (texts.length === 0) continue;
    entries.push({
      at: typeof message.timestamp === "string" ? message.timestamp : "",
      text: texts.join(`
`),
      handback,
    });
  }
  let strip = (entries) =>
    entries.map(({ at, text }) => ({
      at,
      text,
    }));
  if (state === "flagged")
    return [
      {
        at: entries.at(-1)?.at ?? "",
        text: CONTEXT_PLACEHOLDER_TEXTS.flagged,
      },
    ];
  if (state !== "withheld" && state !== "finishing") return strip(entries.slice(-count));
  if (entries.length === 0) return [];
  let lastIndex = entries.findLastIndex((entry) => entry.handback);
  let cutIndex = lastIndex === -1 ? entries.length - 1 : lastIndex;
  return [
    ...strip(entries.slice(0, Math.max(cutIndex, 0))),
    {
      at: entries[cutIndex]?.at ?? "",
      text: CONTEXT_PLACEHOLDER_TEXTS[state],
    },
  ].slice(-count);
}
//@ chunk-n51jggtb.js:80608-80792 placement
/**
 * 在等待预算内执行一次调用，并按是否已有回应决定收尾。
 */
async function runThroughWarmupGate(warmupKey, condition, signal, runner) {
  let slot = await currentWarmupGate().enter(warmupKey, {
    capMs: prefixStaggerMs(),
    signal,
  });
  let result;
  try {
    result = await runner();
  } catch (error) {
    slot.done();
    throw error;
  }
  condition(result).then(
    (started) => (started ? slot.responded() : slot.done()),
    () => slot.done(),
  );
  return result;
}
//@ chunk-n51jggtb.js:80792-81683 placement
/**
 * 实现 contexts API：spawn/view/tail/whenSettled 等子上下文操作。
 */
function createContextApi(host) {
  let agentTask = (agentId) => {
    let task = host.taskRegistry.get(agentId);
    return task !== undefined && task.type === "local_agent" ? task : undefined;
  };
  let isBusy = (agentId) => {
    let task = agentTask(agentId);
    return task !== undefined && isTaskActive(task);
  };
  let hasTokenProgress = (agentId) => {
    let task = agentTask(agentId);
    return task !== undefined && "progress" in task && (task.progress?.tokenCount ?? 0) > 0;
  };
  return {
    role: host.agentId === undefined ? "lead" : "helper",
    spawn: (run, { fork }) => {
      if (fork) return run();
      let { signal } = host.abortController;
      return runThroughWarmupGate(
        ["spawnContext", host.options.mainLoopModel, getCwd()].join(`
`),
        async (agentId) => {
          while (!signal.aborted) {
            if (hasTokenProgress(agentId)) return true;
            if (!isBusy(agentId)) return false;
            await sleep(250);
          }
          return false;
        },
        signal,
        run,
      );
    },
    view: (agentId) => {
      let task = agentTask(agentId);
      return task === undefined ? undefined : taskStatusView(task);
    },
    reportUncleared: (agentId) => handbackKey(agentId),
    whenSettled: async (agentId) => {
      let { signal } = host.abortController;
      while (isBusy(agentId) && !signal.aborted) await sleep(250);
    },
    tail: (agentId, count) => {
      let task = agentTask(agentId);
      if (task !== undefined) {
        let handback = handbackState(task, agentId);
        return readTaskTail(
          getTaskOutputPath(agentId),
          count,
          handback === undefined && getSelectableBackgroundTasks(task)?.finalizing === true
            ? "finishing"
            : handback,
        );
      }
      let autoHandback = agentContract(agentId) ?? isAutoHandbackArmed(getToolPermissionContext(host));
      return readTaskTail(
        getTaskOutputPath(agentId),
        count,
        isAgentFlagged(agentId) ? "flagged" : autoHandback ? "withheld" : undefined,
      );
    },
  };
}
export {
  unclearedReportText,
  validateContextName,
  MAX_INITIAL_PROMPT_CHARS,
  MAX_TAIL_LINES,
  DEFAULT_TAIL_LINES,
  MAX_LOG_TEXT_CHARS,
  TEAM_PRELUDE_TEXT,
  LEAD_CONTEXT,
  createContextApi,
};
