/**
 * tasks/LocalWorkflowTask/workflowTranscript.ts
 *
 * 2.1.316 新增。工作流代理转录读取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (10)
 * attribution: placement 10
 */
import { join } from "path";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { subagentWorkflowDir } from "../../services/workflow/snapshots.js";
import { readJSONLFile_2 } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTranscriptMessage } from "../../utils/sessionStorage.js";
import {
  stripHarnessFraming,
  emptyWorkflowToolUseTracker,
  settleWorkflowToolUse,
  noteWorkflowToolUse,
  describeWorkflowStep,
} from "../../services/workflows/harnessFraming.js";
import {
  resolvePendingTaskCreate,
  trackTaskToolUse,
  getAllTrackedTasks,
  parseTodoWriteTodos,
} from "../../utils/task/framework.js";
import { SUBAGENTHANDBACK } from "../../tools/AgentTool/constants.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getAgentMissState, isAgentFlagged, agentContract } from "../../tools/AgentTool/handbackReport.js";
import { count } from "../../utils/collections.js";
import { truncateToLength, countCharInString } from "../../utils/stringUtils.js";

//@ chunk-axsvbsqv.js:2394-2398 placement
init_react_production();
//@ chunk-axsvbsqv.js:2427-2475 placement
/**
 * 转录提示词/输出字段字符上限与保留的工具结果条数、任务工具名列表。
 */
var MAX_TRANSCRIPT_PROMPT_CHARS = 4000;
var MAX_TRANSCRIPT_OUTPUT_CHARS = 2000;
var MAX_TRANSCRIPT_TOOL_RESULTS = 3;
var TASK_TODO_TOOL_NAMES = [
  TODO_WRITE_TOOL_NAME,
  TASK_CREATE_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  STRUCTUREDOUTPUT,
];
//@ chunk-axsvbsqv.js:2475-4981 placement
async function readWorkflowAgentTranscript(o, i, { promptFramed: l } = {}) {
  let filePath = join(subagentWorkflowDir(o), `agent-${i}.jsonl`);
  let d;
  try {
    d = await readJSONLFile_2(filePath);
  } catch (error) {
    logForDebugging(
      `readWorkflowAgentTranscript: ${filePath} not readable (${error instanceof Error ? error.message : String(error)})`,
    );
    return null;
  }
  let filtered = d.filter(isTranscriptMessage);
  let index = filtered.findIndex((U) => U.type === "user");
  let b = index === -1 ? undefined : filtered[index];
  for (let idx = index + 1; index !== -1 && idx < filtered.length; idx++) {
    let X = filtered[idx];
    if (X === undefined || X.type !== "user" || X.isMeta === true) break;
    b = X;
  }
  let content = b?.type === "user" ? b.message?.content : undefined;
  let A = typeof content === "string" ? content : textOfBlocks(content).trim();
  let prompt = l ? stripHarnessFraming(A) : A;
  let T = [];
  let M = emptyWorkflowToolUseTracker();
  let I = new Map();
  let N;
  let E = new Map();
  let V = {
    pendingCreates: new Map(),
    tasks: new Map(),
  };
  let J = undefined;
  let z = "";
  let L = [];
  let B = "";
  for (let [U, X] of filtered.entries()) {
    if (X.type === "user") {
      let content = X.message?.content;
      if (Array.isArray(content))
        for (let G of content) {
          if (!isContentBlock(G) || G.type !== "tool_result" || typeof G.tool_use_id !== "string") continue;
          let dt = G.is_error === true;
          settleWorkflowToolUse(M, G.tool_use_id, X.isVirtual === true, dt);
          if (X.isVirtual !== true && M.uses.has(G.tool_use_id)) N = G.tool_use_id;
          let St = contentToText(G.content);
          let kt = St;
          E.set(G.tool_use_id, {
            ...textHead(kt, MAX_TRANSCRIPT_OUTPUT_CHARS),
            isError: dt,
          });
          resolvePendingTaskCreate(V, {
            tool_use_id: G.tool_use_id,
            is_error: dt,
            content: St,
          });
        }
      continue;
    }
    if (X.type !== "assistant" || !Array.isArray(X.message?.content)) continue;
    let ot = X.message.id || `entry-${U}`;
    B = ot;
    N = undefined;
    let rt = "";
    for (let W of X.message.content) {
      if (!isContentBlock(W)) continue;
      if (W.type === "tool_use" && typeof W.name === "string") {
        noteWorkflowToolUse(
          M,
          {
            id: W.id,
            name: W.name,
          },
          X.isVirtual === true,
        );
        if (X.isVirtual === true && typeof W.id === "string" && N !== undefined) I.set(W.id, N);
        T.push({
          id: typeof W.id === "string" ? W.id : "",
          name: W.name,
          input: W.input,
          responseKey: ot,
        });
        if (typeof W.id === "string" && W.id !== "") trackTaskToolUse(V, W);
        if (W.name === TODO_WRITE_TOOL_NAME) J = W.input;
        if (
          W.name === SUBAGENTHANDBACK &&
          typeof W.id === "string" &&
          isPlainObject(W.input) &&
          typeof W.input.message === "string"
        )
          L.push({
            id: W.id,
            message: W.input.message,
          });
        if (W.name === STRUCTUREDOUTPUT && W.input !== undefined)
          try {
            rt = jsonStringify(W.input, null, 2);
          } catch {
            rt = String(W.input);
          }
      } else if (W.type === "text" && typeof W.text === "string") rt += W.text;
    }
    if (rt) z = rt;
  }
  let agentMissState = getAgentMissState(i);
  let found = L.find((U) => U.id === agentMissState);
  if (found !== undefined)
    z = isAgentFlagged(i)
      ? `Auto mode's check flagged this report or could not review it. Read it with care.

${found.message}`
      : found.message;
  else if (
    agentContract(i) === undefined &&
    L.some((U) => {
      let X = E.get(U.id);
      return X !== undefined && !X.isError && X.head.startsWith('{"success":true');
    })
  )
    z = "";
  let pt = T;
  let gt = (U) => false;
  let wt = count(pt, (U) => !gt(U));
  let toolCalls = pt.map((U) => {
    let X = U.responseKey === B;
    let ot = gt(U);
    if (!ot) wt--;
    let rt = ot || ((wt < MAX_TRANSCRIPT_TOOL_RESULTS || X) && !TASK_TODO_TOOL_NAMES.includes(U.name));
    return {
      name: U.name,
      summary: ot ? "" : describeWorkflowStep(U.input, U.name),
      fromLastResponse: X,
      fields: rt && !ot ? inputFieldsPreview(U.input) : [],
      result: textHeadOrError(U.id ? E.get(U.id) : undefined, rt),
    };
  });
  let allTrackedTasks = getAllTrackedTasks(V);
  let tasks = allTrackedTasks.length > 0 ? allTrackedTasks : parseTodoWriteTodos(J);
  return {
    prompt,
    toolCalls,
    finalText: z,
    tasks,
  };
}
//@ chunk-axsvbsqv.js:4981-5027 placement
/**
 * 文本头的空值（head 为空、行数 0）。
 */
var EMPTY_TEXT_HEAD = {
  head: "",
  lineCount: 0,
  truncatedChars: 0,
};
//@ chunk-axsvbsqv.js:5027-5099 placement
/**
 * 无文本时返回空文本头（保留 isError）。
 */
function textHeadOrError(o, i) {
  if (!o) return null;
  return i
    ? o
    : {
        ...EMPTY_TEXT_HEAD,
        isError: o.isError,
      };
}
//@ chunk-axsvbsqv.js:5099-5227 placement
function textHead(o, i) {
  let l = o.trimEnd();
  let u = l.length > i ? truncateToLength(l, i) : l;
  return {
    head: u,
    lineCount:
      countCharInString(
        l,
        `
`,
      ) + 1,
    truncatedChars: l.length - u.length,
  };
}
//@ chunk-axsvbsqv.js:5227-5305 placement
/**
 * 判断值是否是带 type 字符串的内容块。
 */
function isContentBlock(o) {
  return typeof o === "object" && o !== null && typeof o.type === "string";
}
//@ chunk-axsvbsqv.js:5305-5446 placement
function textOfBlocks(o) {
  if (!Array.isArray(o)) return "";
  return o
    .filter(isContentBlock)
    .flatMap((i) => (i.type === "text" && typeof i.text === "string" ? i.text : [])).join(`
`);
}
//@ chunk-axsvbsqv.js:5446-5625 placement
function contentToText(content) {
  if (typeof content === "string") return content;
  let i = textOfBlocks(content);
  if (i || !Array.isArray(content)) return i;
  let filtered = content.filter(isContentBlock);
  return filtered.length === 0 ? "" : `(${filtered.map((u) => u.type).join(", ")} content)`;
}
//@ chunk-axsvbsqv.js:5625-5872 placement = _temp7 (1)
function inputFieldsPreview(opt) {
  if (opt === undefined || opt === null) return [];
  return (typeof opt === "object" && !Array.isArray(opt) ? Object.entries(opt) : [["input", opt]]).map(
    ([l, u]) => {
      let d;
      if (typeof u === "string") d = u;
      else
        try {
          d = jsonStringify(u) ?? String(u);
        } catch {
          d = String(u);
        }
      return {
        key: l,
        ...textHead(d, MAX_TRANSCRIPT_PROMPT_CHARS),
      };
    },
  );
}
export { TASK_TODO_TOOL_NAMES, MAX_TRANSCRIPT_TOOL_RESULTS, readWorkflowAgentTranscript };
