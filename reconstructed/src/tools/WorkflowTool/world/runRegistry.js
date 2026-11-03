/**
 * tools/WorkflowTool/world/runRegistry.ts
 *
 * 2.1.316 新增：工作流运行登记与 world 操作描述
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y1shfdfm.js (13)
 * attribution: placement 13
 */
import { isFoundingScriptRow, WorkflowScriptRun, STOP_REASONS } from "./scriptRunner.js";
import { logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, U, E, M, A, oe, o, tc, Ir, T } from "../../../../vendor/zod/v4/classic/schemas.js";
import { factSchema, HOST_SCOPE, ROW_STATUSES } from "./worldStore.js";

//@ chunk-y1shfdfm.js:48333-48395 placement
function isAgentEvalRow(e) {
  return e.kind === "eval" && e.fact.topic === "agent";
}
//@ chunk-y1shfdfm.js:48395-48484 placement
function hasErrorField(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && e.error !== void 0;
}
//@ chunk-y1shfdfm.js:48484-48550 placement
function finiteOrZero(e) {
  return typeof e === "number" && Number.isFinite(e) ? e : 0;
}
//@ chunk-y1shfdfm.js:48550-48572 placement
class RunIndex {
  byId = new Map();
}
//@ chunk-y1shfdfm.js:48572-48912 placement
function collectRunStatuses(e, r) {
  let n = new Map();
  for (let row of e.rows) {
    if (!isFoundingScriptRow(row) || row.status === "pending" || typeof row.fact.runId !== "string") continue;
    let w = n.get(row.fact.runId);
    if (w) w.push(row);
    else n.set(row.fact.runId, [row]);
  }
  let s = 0;
  for (let [i, w] of n) {
    if (r.byId.has(i)) continue;
    let at = w.at(-1);
    (r.byId.set(
      i,
      WorkflowScriptRun.lost(
        i,
        e,
        at.addr,
        w.slice(0, -1).map((k) => k.addr),
      ),
    ),
      s++);
  }
  return s;
}
//@ chunk-y1shfdfm.js:48912-48926 placement
var Lt = 600000;
//@ chunk-y1shfdfm.js:48926-48950 placement
class Jr {
  byName = new Map();
}
//@ chunk-y1shfdfm.js:48950-49321 placement
function resolveWorkflowRun({
  toolState: toolState,
  taskRegistry: taskRegistry,
  name: n,
  runId: runId,
  now: now = Date.now(),
}) {
  if (n === void 0) return;
  let byName = toolState.get(Jr).byName,
    h = byName.get(n);
  if ((byName.set(n, { runId: runId, at: now }), !h || now - h.at > Lt)) return;
  let k = toolState.get(RunIndex).byId.get(h.runId);
  logFeatureOk("workflow_relaunch_soon", {
    name: fromEnum(n),
    seconds_since_prev: Math.round((now - h.at) / 1000),
    prev_state: fromEnum(k ? k.state() : workflowTaskStatus(taskRegistry, h.runId)),
    prev_was_steered: k?.wasSteered ?? !1,
  });
}
//@ chunk-y1shfdfm.js:49321-49595 placement
function workflowTaskStatus(e, r) {
  for (let n of Object.values(e.all())) {
    if (n.type !== "local_workflow" || n.workflowRunId !== r) continue;
    switch (n.status) {
      case "pending":
      case "running":
        return "open";
      case "killed":
        return "killed";
      case "completed":
      case "failed":
      case "paused":
        return "settled";
    }
  }
  return "unknown";
}
//@ chunk-y1shfdfm.js:49595-49920 placement
function describeWorldOp(e) {
  if (typeof e.runId !== "string") return;
  let r = e.put !== void 0 || typeof e.retract === "number" || e.read !== void 0;
  return {
    runId: e.runId,
    ...(e.put !== void 0 && { put: e.put }),
    ...(typeof e.retract === "number" && { retract: e.retract }),
    ...(e.read !== void 0 && { read: e.read }),
    ...(!r && typeof e.script === "string" && e.script !== "" && { script: e.script }),
  };
}
//@ chunk-y1shfdfm.js:49920-50288 placement
var worldOpSchema = DoctorLazy(() =>
  u({
    verb: U(["put", "retract", "read", "script"]),
    addr: E().optional(),
    retracted: M().optional(),
    rows: A(oe()).optional(),
    rowsTotal: E().optional(),
    foreignArtifactContent: M().optional(),
    error: o().optional(),
    reopened: M(),
    status: u({ pending: E() }),
    killed: u({
      at: E(),
      reason: U([...STOP_REASONS, "unknown"]).catch("unknown"),
      rows: E(),
      pending: E(),
      rules: E(),
      agents: E(),
    }).optional(),
  }),
);
//@ chunk-y1shfdfm.js:50288-50488 placement
function worldOpVerbs(e) {
  let r = [];
  if (e.put !== void 0) r.push("put");
  if (e.retract !== void 0) r.push("retract");
  if (e.read !== void 0) r.push("read");
  if (e.script !== void 0) r.push("script");
  return r.length === 1 ? r[0] : void 0;
}
//@ chunk-y1shfdfm.js:50615-51018 placement
var worldJournalLineSchema = DoctorLazy(() => {
    let nonnegative = tc().nonnegative();
    return Ir("k", [
      u({
        k: T("put"),
        addr: nonnegative,
        kind: U(["put", "eval", "sub"]),
        fact: factSchema(),
        by: o(),
        in: tc().min(HOST_SCOPE),
        at: E().finite(),
        status: U(ROW_STATUSES),
      }).refine((r) => r.in < r.addr, { message: "`in` must be ROOT or an earlier address" }),
      u({
        k: T("settled"),
        addr: nonnegative,
        status: U(["done", "failed"]),
        value: oe().optional(),
        error: o().optional(),
      }),
      u({ k: T("retracted"), addr: nonnegative }),
    ]);
  }),
  WORLD_JSONL = "world.jsonl",
  Kt = 4194304;

export {
  finiteOrZero,
  hasErrorField,
  isAgentEvalRow,
  WORLD_JSONL,
  worldJournalLineSchema,
  Kt,
  collectRunStatuses,
  RunIndex,
  describeWorldOp,
  worldOpVerbs,
  resolveWorkflowRun,
};
