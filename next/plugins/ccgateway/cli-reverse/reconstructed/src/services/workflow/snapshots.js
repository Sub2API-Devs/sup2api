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
function workflowSnapshotPath(workflowRunId) {
  return join(sessionWorkflowsDir(), `${workflowRunId}.json`);
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
function subagentWorkflowDir(runId) {
  let sessionProjectDir = resolveSessionProjectDir();
  return join(sessionProjectDir, getSessionId(), "subagents", "workflows", runId);
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
function workflowSidecarKey(projectKey, sessionId, runId) {
  return STORAGE_SPACES.sidecar(projectKey, sessionId, ["workflows", `${runId}.json`]);
}
//@ chunk-3w426tt0.js:796-1278 placement
async function writeWorkflowSnapshot(workflowRunId, fields, storageV5) {
  try {
    let snapshot = {
      runId: workflowRunId,
      timestamp: new Date().toISOString(),
      ...fields,
    };
    let filePath = workflowSnapshotPath(workflowRunId);
    let projectKey = isStorageV5Enabled() && storageV5 ? sessionProjectKey() : undefined;
    let sessionId = getSessionId();
    await mkdir(dirname(filePath), {
      recursive: true,
      mode: 448,
    });
    if (
      isStorageV5Enabled() &&
      storageV5 &&
      projectKey !== undefined &&
      isValidKeySegment(`${workflowRunId}.json`)
    ) {
      let writeResult = await storageV5.write(
        workflowSidecarKey(projectKey, sessionId, workflowRunId),
        jsonStringify(snapshot),
        {
          publishDiscipline: "inPlace",
          mode: 384,
        },
      );
      if (!writeResult.ok)
        logForDebugging(`Failed to write workflow snapshot ${workflowRunId}: ${writeResult.error.code}`);
      return;
    }
    await writeFile(filePath, jsonStringify(snapshot), {
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
async function readWorkflowSnapshot(storage) {
  let projectKey = storage ? sessionProjectKey() : undefined;
  if (storage && projectKey !== undefined) return listWorkflowSnapshots(storage, projectKey);
  let dir = sessionWorkflowsDir();
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  let filtered = (
    await Promise.all(
      entries
        .filter((fileName) => fileName.endsWith(".json"))
        .map(async (fileName) => {
          try {
            let file = await readFile(join(dir, fileName), "utf8");
            let record = jsonParse(file);
            return normalizeWorkflowSnapshot(record, fileName.replace(/\.json$/, ""));
          } catch (error) {
            logForDebugging(
              `Failed to parse workflow snapshot ${fileName}: ${error instanceof Error ? error.message : error}`,
            );
            return null;
          }
        }),
    )
  ).filter((snapshot) => snapshot !== null);
  filtered.sort((left, right) => right.startTime - left.startTime);
  return filtered;
}
//@ chunk-3w426tt0.js:2383-3367 placement
async function listWorkflowSnapshots(storage, projectKey) {
  let scope = {
    namespace: "sidecar",
    projectKey,
    sessionId: getSessionId(),
    relPath: ["workflows"],
  };
  let keys = [];
  let cursor;
  do {
    let page = await storage.listEntries(
      scope,
      cursor === undefined
        ? undefined
        : {
            cursor,
          },
    );
    if (!page.ok) {
      logForDebugging(`Failed to list workflow snapshots: ${page.error.code}`);
      return [];
    }
    for (let item of page.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "sidecar") continue;
      if ((item.key.relPath.at(-1) ?? "").endsWith(".json")) keys.push(item.key);
    }
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  let filtered = (
    await Promise.all(
      keys.map(async (key) => {
        let fileName = key.relPath.at(-1) ?? "";
        try {
          let readResult = await storage.read([key]);
          if (!readResult.ok) {
            logForDebugging(`Failed to parse workflow snapshot ${fileName}: ${readResult.error.code}`);
            return null;
          }
          let item = readResult.value.items[0];
          if (!item?.found) {
            logForDebugging(`Failed to parse workflow snapshot ${fileName}: deleted between list and read`);
            return null;
          }
          let record = jsonParse(Buffer.from(item.value).toString("utf8"));
          return normalizeWorkflowSnapshot(record, fileName.replace(/\.json$/, ""));
        } catch (error) {
          logForDebugging(
            `Failed to parse workflow snapshot ${fileName}: ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      }),
    )
  ).filter((snapshot) => snapshot !== null);
  filtered.sort((left, right) => right.startTime - left.startTime);
  return filtered;
}
export { subagentWorkflowDir, sessionProjectKey, writeWorkflowSnapshot, readWorkflowSnapshot };
