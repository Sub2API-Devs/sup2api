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
import { join, join as join_2, join as join_3 } from "path";
import { j } from "../../../vendor/react/cjs/react.production.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { Iz } from "../../services/workflow/snapshots.js";
import { readJSONLFile_2 } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTranscriptMessage } from "../../utils/sessionStorage.js";
import {
  stripHarnessFraming,
  VGn,
  qGn,
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
import { Ogi, Pgi, Bkn } from "../../tools/AgentTool/handbackReport.js";
import { count } from "../../utils/collections.js";
import { truncateToLength, countCharInString } from "../../utils/stringUtils.js";

//@ chunk-axsvbsqv.js:2394-2398 placement
j();
//@ chunk-axsvbsqv.js:2427-2475 placement
var Ji = 4000,
  Vi = 2000,
  bn = 3,
  xn = [
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    STRUCTUREDOUTPUT,
  ];
//@ chunk-axsvbsqv.js:2475-4981 placement
async function readWorkflowAgentTranscript(o, i, { promptFramed: l } = {}) {
  let u = join(Iz(o), `agent-${i}.jsonl`),
    d;
  try {
    d = await readJSONLFile_2(u);
  } catch (error) {
    return (
      logForDebugging(
        `readWorkflowAgentTranscript: ${u} not readable (${error instanceof Error ? error.message : String(error)})`,
      ),
      null
    );
  }
  let filtered = d.filter(isTranscriptMessage),
    index = filtered.findIndex((U) => U.type === "user"),
    b = index === -1 ? void 0 : filtered[index];
  for (let U = index + 1; index !== -1 && U < filtered.length; U++) {
    let X = filtered[U];
    if (X === void 0 || X.type !== "user" || X.isMeta === !0) break;
    b = X;
  }
  let x = b?.type === "user" ? b.message?.content : void 0,
    A = typeof x === "string" ? x : textOfBlocks(x).trim(),
    v = l ? stripHarnessFraming(A) : A,
    T = [],
    M = VGn(),
    I = new Map(),
    N,
    E = new Map(),
    V = { pendingCreates: new Map(), tasks: new Map() },
    J = void 0,
    z = "",
    L = [],
    B = "";
  for (let [U, X] of filtered.entries()) {
    if (X.type === "user") {
      let W = X.message?.content;
      if (Array.isArray(W))
        for (let G of W) {
          if (!Co(G) || G.type !== "tool_result" || typeof G.tool_use_id !== "string") continue;
          let dt = G.is_error === !0;
          if (
            (qGn(M, G.tool_use_id, X.isVirtual === !0, dt), X.isVirtual !== !0 && M.uses.has(G.tool_use_id))
          )
            N = G.tool_use_id;
          let St = contentToText(G.content),
            kt = St;
          (E.set(G.tool_use_id, { ...textHead(kt, Vi), isError: dt }),
            resolvePendingTaskCreate(V, { tool_use_id: G.tool_use_id, is_error: dt, content: St }));
        }
      continue;
    }
    if (X.type !== "assistant" || !Array.isArray(X.message?.content)) continue;
    let ot = X.message.id || `entry-${U}`;
    ((B = ot), (N = void 0));
    let rt = "";
    for (let W of X.message.content) {
      if (!Co(W)) continue;
      if (W.type === "tool_use" && typeof W.name === "string") {
        if (
          (noteWorkflowToolUse(M, { id: W.id, name: W.name }, X.isVirtual === !0),
          X.isVirtual === !0 && typeof W.id === "string" && N !== void 0)
        )
          I.set(W.id, N);
        if (
          (T.push({
            id: typeof W.id === "string" ? W.id : "",
            name: W.name,
            input: W.input,
            responseKey: ot,
          }),
          typeof W.id === "string" && W.id !== "")
        )
          trackTaskToolUse(V, W);
        if (W.name === TODO_WRITE_TOOL_NAME) J = W.input;
        if (
          W.name === SUBAGENTHANDBACK &&
          typeof W.id === "string" &&
          isPlainObject(W.input) &&
          typeof W.input.message === "string"
        )
          L.push({ id: W.id, message: W.input.message });
        if (W.name === STRUCTUREDOUTPUT && W.input !== void 0)
          try {
            rt = jsonStringify(W.input, null, 2);
          } catch {
            rt = String(W.input);
          }
      } else if (W.type === "text" && typeof W.text === "string") rt += W.text;
    }
    if (rt) z = rt;
  }
  let H = Ogi(i),
    found = L.find((U) => U.id === H);
  if (found !== void 0)
    z = Pgi(i)
      ? `Auto mode's check flagged this report or could not review it. Read it with care.

${found.message}`
      : found.message;
  else if (
    Bkn(i) === void 0 &&
    L.some((U) => {
      let X = E.get(U.id);
      return X !== void 0 && !X.isError && X.head.startsWith('{"success":true');
    })
  )
    z = "";
  let pt = T,
    gt = (U) => !1,
    wt = count(pt, (U) => !gt(U)),
    mapped = pt.map((U) => {
      let X = U.responseKey === B,
        ot = gt(U);
      if (!ot) wt--;
      let rt = ot || ((wt < bn || X) && !xn.includes(U.name));
      return {
        name: U.name,
        summary: ot ? "" : describeWorkflowStep(U.input, U.name),
        fromLastResponse: X,
        fields: rt && !ot ? inputFieldsPreview(U.input) : [],
        result: Gi(U.id ? E.get(U.id) : void 0, rt),
      };
    }),
    at = getAllTrackedTasks(V),
    ct = at.length > 0 ? at : parseTodoWriteTodos(J);
  return { prompt: v, toolCalls: mapped, finalText: z, tasks: ct };
}
//@ chunk-axsvbsqv.js:4981-5027 placement
var Bi = { head: "", lineCount: 0, truncatedChars: 0 };
//@ chunk-axsvbsqv.js:5027-5099 placement
function Gi(o, i) {
  if (!o) return null;
  return i ? o : { ...Bi, isError: o.isError };
}
//@ chunk-axsvbsqv.js:5099-5227 placement
function textHead(o, i) {
  let trimEnd = o.trimEnd(),
    u = trimEnd.length > i ? truncateToLength(trimEnd, i) : trimEnd;
  return {
    head: u,
    lineCount:
      countCharInString(
        trimEnd,
        `
`,
      ) + 1,
    truncatedChars: trimEnd.length - u.length,
  };
}
//@ chunk-axsvbsqv.js:5227-5305 placement
function Co(o) {
  return typeof o === "object" && o !== null && typeof o.type === "string";
}
//@ chunk-axsvbsqv.js:5305-5446 placement
function textOfBlocks(o) {
  if (!Array.isArray(o)) return "";
  return o.filter(Co).flatMap((i) => (i.type === "text" && typeof i.text === "string" ? i.text : [])).join(`
`);
}
//@ chunk-axsvbsqv.js:5446-5625 placement
function contentToText(o) {
  if (typeof o === "string") return o;
  let i = textOfBlocks(o);
  if (i || !Array.isArray(o)) return i;
  let filtered = o.filter(Co);
  return filtered.length === 0 ? "" : `(${filtered.map((u) => u.type).join(", ")} content)`;
}
//@ chunk-axsvbsqv.js:5625-5872 placement = _temp7 (1)
function inputFieldsPreview(opt) {
  if (opt === void 0 || opt === null) return [];
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
      return { key: l, ...textHead(d, Ji) };
    },
  );
}

export { xn, bn, readWorkflowAgentTranscript };
