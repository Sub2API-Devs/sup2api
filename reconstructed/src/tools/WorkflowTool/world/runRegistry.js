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
import {
  u,
  _enum,
  E,
  M,
  array,
  unknown,
  string,
  int,
  discriminatedUnion,
  literal,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { factSchema, HOST_SCOPE, ROW_STATUSES } from "./worldStore.js";

//@ chunk-y1shfdfm.js:48333-48395 placement
function isAgentEvalRow(e) {
  return e.kind === "eval" && e.fact.topic === "agent";
}
//@ chunk-y1shfdfm.js:48395-48484 placement
function hasErrorField(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && e.error !== undefined;
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
  for (let i of e.rows) {
    if (!isFoundingScriptRow(i) || i.status === "pending" || typeof i.fact.runId !== "string") continue;
    let w = n.get(i.fact.runId);
    if (w) w.push(i);
    else n.set(i.fact.runId, [i]);
  }
  let s = 0;
  for (let [i, w] of n) {
    if (r.byId.has(i)) continue;
    let last = w.at(-1);
    r.byId.set(
      i,
      WorkflowScriptRun.lost(
        i,
        e,
        last.addr,
        w.slice(0, -1).map((k) => k.addr),
      ),
    );
    s++;
  }
  return s;
}
//@ chunk-y1shfdfm.js:48912-48926 placement
/**
 * 运行索引记录的有效期（10 分钟）。
 */
var RUN_INDEX_TTL_MS = 600000;
//@ chunk-y1shfdfm.js:48926-48950 placement
/**
 * 按名字记录运行 id 与时间的小索引。
 */
class RunIndex_2 {
  byName = new Map();
}
//@ chunk-y1shfdfm.js:48950-49321 placement
function resolveWorkflowRun({ toolState, taskRegistry, name: n, runId, now = Date.now() }) {
  if (n === undefined) return;
  let byName = toolState.get(RunIndex_2).byName;
  let h = byName.get(n);
  byName.set(n, {
    runId,
    at: now,
  });
  if (!h || now - h.at > RUN_INDEX_TTL_MS) return;
  let k = toolState.get(RunIndex).byId.get(h.runId);
  logFeatureOk("workflow_relaunch_soon", {
    name: fromEnum(n),
    seconds_since_prev: Math.round((now - h.at) / 1000),
    prev_state: fromEnum(k ? k.state() : workflowTaskStatus(taskRegistry, h.runId)),
    prev_was_steered: k?.wasSteered ?? false,
  });
}
//@ chunk-y1shfdfm.js:49321-49595 placement
function workflowTaskStatus(taskRegistry, runId) {
  for (let n of Object.values(taskRegistry.all())) {
    if (n.type !== "local_workflow" || n.workflowRunId !== runId) continue;
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
  let r = e.put !== undefined || typeof e.retract === "number" || e.read !== undefined;
  return {
    runId: e.runId,
    ...(e.put !== undefined && {
      put: e.put,
    }),
    ...(typeof e.retract === "number" && {
      retract: e.retract,
    }),
    ...(e.read !== undefined && {
      read: e.read,
    }),
    ...(!r &&
      typeof e.script === "string" &&
      e.script !== "" && {
        script: e.script,
      }),
  };
}
//@ chunk-y1shfdfm.js:49920-50288 placement
var worldOpSchema = DoctorLazy(() =>
  u({
    verb: _enum(["put", "retract", "read", "script"]),
    addr: E().optional(),
    retracted: M().optional(),
    rows: array(unknown()).optional(),
    rowsTotal: E().optional(),
    foreignArtifactContent: M().optional(),
    error: string().optional(),
    reopened: M(),
    status: u({
      pending: E(),
    }),
    killed: u({
      at: E(),
      reason: _enum([...STOP_REASONS, "unknown"]).catch("unknown"),
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
  if (e.put !== undefined) r.push("put");
  if (e.retract !== undefined) r.push("retract");
  if (e.read !== undefined) r.push("read");
  if (e.script !== undefined) r.push("script");
  return r.length === 1 ? r[0] : undefined;
}
//@ chunk-y1shfdfm.js:50615-51018 placement
/**
 * world 日志行的 schema（地址、类型、事实、时间等）。
 */
var worldJournalLineSchema = DoctorLazy(() => {
  let addr = int().nonnegative();
  return discriminatedUnion("k", [
    u({
      k: literal("put"),
      addr,
      kind: _enum(["put", "eval", "sub"]),
      fact: factSchema(),
      by: string(),
      in: int().min(HOST_SCOPE),
      at: E().finite(),
      status: _enum(ROW_STATUSES),
    }).refine((r) => r.in < r.addr, {
      message: "`in` must be ROOT or an earlier address",
    }),
    u({
      k: literal("settled"),
      addr,
      status: _enum(["done", "failed"]),
      value: unknown().optional(),
      error: string().optional(),
    }),
    u({
      k: literal("retracted"),
      addr,
    }),
  ]);
});
var WORLD_JSONL = "world.jsonl";
var MAX_WORLD_JOURNAL_READ_BYTES = 4194304;
export {
  finiteOrZero,
  hasErrorField,
  isAgentEvalRow,
  WORLD_JSONL,
  worldJournalLineSchema,
  MAX_WORLD_JOURNAL_READ_BYTES,
  collectRunStatuses,
  RunIndex,
  describeWorldOp,
  worldOpVerbs,
  resolveWorkflowRun,
};
