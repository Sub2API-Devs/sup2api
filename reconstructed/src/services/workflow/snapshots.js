/**
 * services/workflow/snapshots.ts
 *
 * 工作流快照读写（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3w426tt0.js (9)
 * attribution: placement 9
 */
import { join, dirname, basename } from "path";
import { mkdir, writeFile, readdir, readFile } from "fs/promises";
import { resolveSessionProjectDir, getProjectsDir } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-3w426tt0.js:512-552 placement
/**
 * 工作流快照文件路径。
 */
function workflowSnapshotPath(r) {
  return join(sessionWorkflowsDir(), `${r}.json`);
}
//@ chunk-3w426tt0.js:552-604 placement
/**
 * 会话工作流目录。
 */
function sessionWorkflowsDir() {
  let sessionProjectDir = resolveSessionProjectDir();
  return join(sessionProjectDir, getSessionId(), "workflows");
}
//@ chunk-3w426tt0.js:604-672 placement
/**
 * 子代理工作流目录。
 */
function subagentWorkflowDir(r) {
  let sessionProjectDir = resolveSessionProjectDir();
  return join(sessionProjectDir, getSessionId(), "subagents", "workflows", r);
}
//@ chunk-3w426tt0.js:672-729 placement
/**
 * 会话目录名（不在项目目录下时返回 undefined）。
 */
function sessionProjectKey() {
  let sessionProjectDir = resolveSessionProjectDir();
  return dirname(sessionProjectDir) === getProjectsDir() ? basename(sessionProjectDir) : undefined;
}
//@ chunk-3w426tt0.js:729-796 placement
/**
 * 工作流快照的存储键。
 */
function workflowSidecarKey(r, sessionId, n) {
  return STORAGE_SPACES.sidecar(r, sessionId, ["workflows", `${n}.json`]);
}
//@ chunk-3w426tt0.js:796-1278 placement
async function writeWorkflowSnapshot(workflowRunId, a, storageV5) {
  try {
    let i = {
      runId: workflowRunId,
      timestamp: new Date().toISOString(),
      ...a,
    };
    let l = workflowSnapshotPath(workflowRunId);
    let s = isStorageV5Enabled() && storageV5 ? sessionProjectKey() : undefined;
    let sessionId = getSessionId();
    await mkdir(dirname(l), {
      recursive: true,
      mode: 448,
    });
    if (isStorageV5Enabled() && storageV5 && s !== undefined && isValidKeySegment(`${workflowRunId}.json`)) {
      let e = await storageV5.write(workflowSidecarKey(s, sessionId, workflowRunId), jsonStringify(i), {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!e.ok) logForDebugging(`Failed to write workflow snapshot ${workflowRunId}: ${e.error.code}`);
      return;
    }
    await writeFile(l, jsonStringify(i), {
      encoding: "utf8",
      mode: 384,
    });
  } catch (error) {
    logForDebugging(
      `Failed to write workflow snapshot ${workflowRunId}: ${error instanceof Error ? error.message : error}`,
    );
  }
}
//@ chunk-3w426tt0.js:1278-1938 placement
/**
 * 把读到的工作流快照记录补齐默认值：runId 缺省用文件名推出的 id，taskId 缺省同 runId，时间戳、脚本、agent 数、日志等缺省为空值。
 */
function normalizeWorkflowSnapshot(record, fallbackRunId) {
  let runId = record.runId ?? fallbackRunId;
  return {
    runId,
    taskId: record.taskId ?? runId,
    timestamp: record.timestamp ?? new Date(0).toISOString(),
    script: record.script ?? "",
    scriptPath: record.scriptPath,
    args: record.args,
    result: record.result,
    agentCount: record.agentCount ?? 0,
    logs: record.logs ?? [],
    durationMs: record.durationMs ?? 0,
    error: record.error,
    summary: typeof record.summary === "string" ? record.summary : undefined,
    workflowName: typeof record.workflowName === "string" ? record.workflowName : undefined,
    title: record.title,
    status: record.status ?? (record.error ? "failed" : "completed"),
    startTime: record.startTime ?? (Date.parse(record.timestamp ?? "") || 0),
    phases: record.phases,
    defaultModel: record.defaultModel,
    workflowProgress: record.workflowProgress ?? [],
    totalTokens: record.totalTokens ?? 0,
    totalToolCalls: record.totalToolCalls ?? 0,
  };
}
//@ chunk-3w426tt0.js:1938-2383 placement
async function readWorkflowSnapshot(storageV5) {
  let projectKey = storageV5 ? sessionProjectKey() : undefined;
  if (storageV5 && projectKey !== undefined) return listWorkflowSnapshots(storageV5, projectKey);
  let n = sessionWorkflowsDir();
  let i;
  try {
    i = await readdir(n);
  } catch {
    return [];
  }
  let filtered = (
    await Promise.all(
      i
        .filter((s) => s.endsWith(".json"))
        .map(async (s) => {
          try {
            let file = await readFile(join(n, s), "utf8");
            let record = jsonParse(file);
            return normalizeWorkflowSnapshot(record, s.replace(/\.json$/, ""));
          } catch (error) {
            logForDebugging(
              `Failed to parse workflow snapshot ${s}: ${error instanceof Error ? error.message : error}`,
            );
            return null;
          }
        }),
    )
  ).filter((s) => s !== null);
  filtered.sort((s, o) => o.startTime - s.startTime);
  return filtered;
}
//@ chunk-3w426tt0.js:2383-3367 placement
async function listWorkflowSnapshots(r, projectKey) {
  let n = {
    namespace: "sidecar",
    projectKey,
    sessionId: getSessionId(),
    relPath: ["workflows"],
  };
  let i = [];
  let l;
  do {
    let o = await r.listEntries(
      n,
      l === undefined
        ? undefined
        : {
            cursor: l,
          },
    );
    if (!o.ok) {
      logForDebugging(`Failed to list workflow snapshots: ${o.error.code}`);
      return [];
    }
    for (let item of o.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "sidecar") continue;
      if ((item.key.relPath.at(-1) ?? "").endsWith(".json")) i.push(item.key);
    }
    l = o.value.cursor;
  } while (l !== undefined);
  let filtered = (
    await Promise.all(
      i.map(async (o) => {
        let e = o.relPath.at(-1) ?? "";
        try {
          let f = await r.read([o]);
          if (!f.ok) {
            logForDebugging(`Failed to parse workflow snapshot ${e}: ${f.error.code}`);
            return null;
          }
          let c = f.value.items[0];
          if (!c?.found) {
            logForDebugging(`Failed to parse workflow snapshot ${e}: deleted between list and read`);
            return null;
          }
          let record = jsonParse(Buffer.from(c.value).toString("utf8"));
          return normalizeWorkflowSnapshot(record, e.replace(/\.json$/, ""));
        } catch (error) {
          logForDebugging(
            `Failed to parse workflow snapshot ${e}: ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      }),
    )
  ).filter((o) => o !== null);
  filtered.sort((o, e) => e.startTime - o.startTime);
  return filtered;
}
export { subagentWorkflowDir, sessionProjectKey, writeWorkflowSnapshot, readWorkflowSnapshot };
