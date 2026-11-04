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
  objectSchema,
  _enum,
  numberSchema,
  booleanSchema,
  array,
  unknown,
  stringSchema,
  int,
  discriminatedUnion,
  literal,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { factSchema, HOST_SCOPE, ROW_STATUSES } from "./worldStore.js";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-y1shfdfm.js:48333-48395 placement
function isAgentEvalRow(row) {
  return row.kind === "eval" && row.fact.topic === "agent";
}
//@ chunk-y1shfdfm.js:48395-48484 placement
function hasErrorField(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && value.error !== undefined;
}
//@ chunk-y1shfdfm.js:48484-48550 placement
function finiteOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
//@ chunk-y1shfdfm.js:48550-48572 placement
class RunIndex {
  byId = new Map();
}
//@ chunk-y1shfdfm.js:48572-48912 placement
function collectRunStatuses(world, runIndex) {
  let rowsByRun = new Map();
  for (let row of world.rows) {
    if (!isFoundingScriptRow(row) || row.status === "pending" || typeof row.fact.runId !== "string") continue;
    let runRows = rowsByRun.get(row.fact.runId);
    if (runRows) runRows.push(row);
    else rowsByRun.set(row.fact.runId, [row]);
  }
  let lostCount = 0;
  for (let [runId, rows] of rowsByRun) {
    if (runIndex.byId.has(runId)) continue;
    let last = rows.at(-1);
    runIndex.byId.set(
      runId,
      WorkflowScriptRun.lost(
        runId,
        world,
        last.addr,
        rows.slice(0, -1).map((row) => row.addr),
      ),
    );
    lostCount++;
  }
  return lostCount;
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
function resolveWorkflowRun({ toolState, taskRegistry, name, runId, now = Date.now() }) {
  if (name === undefined) return;
  let byName = toolState.get(RunIndex_2).byName;
  let previous = byName.get(name);
  byName.set(name, {
    runId,
    at: now,
  });
  if (!previous || now - previous.at > RUN_INDEX_TTL_MS) return;
  let run = toolState.get(RunIndex).byId.get(previous.runId);
  logFeatureOk("workflow_relaunch_soon", {
    name: fromEnum(name),
    seconds_since_prev: Math.round((now - previous.at) / 1000),
    prev_state: fromEnum(run ? run.state() : workflowTaskStatus(taskRegistry, previous.runId)),
    prev_was_steered: run?.wasSteered ?? false,
  });
}
//@ chunk-y1shfdfm.js:49321-49595 placement
function workflowTaskStatus(taskRegistry, runId) {
  for (let task of Object.values(taskRegistry.all())) {
    if (task.type !== "local_workflow" || task.workflowRunId !== runId) continue;
    switch (task.status) {
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
function describeWorldOp(input) {
  if (typeof input.runId !== "string") return;
  let hasOp = input.put !== undefined || typeof input.retract === "number" || input.read !== undefined;
  return {
    runId: input.runId,
    ...(input.put !== undefined && {
      put: input.put,
    }),
    ...(typeof input.retract === "number" && {
      retract: input.retract,
    }),
    ...(input.read !== undefined && {
      read: input.read,
    }),
    ...(!hasOp &&
      typeof input.script === "string" &&
      input.script !== "" && {
        script: input.script,
      }),
  };
}
//@ chunk-y1shfdfm.js:49920-50288 placement
var worldOpSchema; // deferred: uses STOP_REASONS (./scriptRunner.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-y1shfdfm.js:49920", () => {
  worldOpSchema = DoctorLazy(() =>
    objectSchema({
      verb: _enum(["put", "retract", "read", "script"]),
      addr: numberSchema().optional(),
      retracted: booleanSchema().optional(),
      rows: array(unknown()).optional(),
      rowsTotal: numberSchema().optional(),
      foreignArtifactContent: booleanSchema().optional(),
      error: stringSchema().optional(),
      reopened: booleanSchema(),
      status: objectSchema({
        pending: numberSchema(),
      }),
      killed: objectSchema({
        at: numberSchema(),
        reason: _enum([...STOP_REASONS, "unknown"]).catch("unknown"),
        rows: numberSchema(),
        pending: numberSchema(),
        rules: numberSchema(),
        agents: numberSchema(),
      }).optional(),
    }),
  );
});
//@ chunk-y1shfdfm.js:50288-50488 placement
function worldOpVerbs(worldOp) {
  let verbs = [];
  if (worldOp.put !== undefined) verbs.push("put");
  if (worldOp.retract !== undefined) verbs.push("retract");
  if (worldOp.read !== undefined) verbs.push("read");
  if (worldOp.script !== undefined) verbs.push("script");
  return verbs.length === 1 ? verbs[0] : undefined;
}
//@ chunk-y1shfdfm.js:50615-51018 placement
/**
 * world 日志行的 schema（地址、类型、事实、时间等）。
 */
var worldJournalLineSchema; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORLD_JSONL;
var MAX_WORLD_JOURNAL_READ_BYTES;
deferInit("chunk-y1shfdfm.js:50615", () => {
  worldJournalLineSchema = DoctorLazy(() => {
    let addr = int().nonnegative();
    return discriminatedUnion("k", [
      objectSchema({
        k: literal("put"),
        addr,
        kind: _enum(["put", "eval", "sub"]),
        fact: factSchema(),
        by: stringSchema(),
        in: int().min(HOST_SCOPE),
        at: numberSchema().finite(),
        status: _enum(ROW_STATUSES),
      }).refine((row) => row.in < row.addr, {
        message: "`in` must be ROOT or an earlier address",
      }),
      objectSchema({
        k: literal("settled"),
        addr,
        status: _enum(["done", "failed"]),
        value: unknown().optional(),
        error: stringSchema().optional(),
      }),
      objectSchema({
        k: literal("retracted"),
        addr,
      }),
    ]);
  });
  WORLD_JSONL = "world.jsonl";
  MAX_WORLD_JOURNAL_READ_BYTES = 4194304;
});

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/tools/WorkflowTool/world/runRegistry.js");
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
