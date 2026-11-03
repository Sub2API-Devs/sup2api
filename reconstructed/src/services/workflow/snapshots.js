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
function P(r) {
  return join(m(), `${r}.json`);
}
//@ chunk-3w426tt0.js:552-604 placement
function m() {
  let r = resolveSessionProjectDir();
  return join(r, getSessionId(), "workflows");
}
//@ chunk-3w426tt0.js:604-672 placement
function Iz(r) {
  let a = resolveSessionProjectDir();
  return join(a, getSessionId(), "subagents", "workflows", r);
}
//@ chunk-3w426tt0.js:672-729 placement
function nDr() {
  let r = resolveSessionProjectDir();
  return dirname(r) === getProjectsDir() ? basename(r) : void 0;
}
//@ chunk-3w426tt0.js:729-796 placement
function W(r, a, n) {
  return STORAGE_SPACES.sidecar(r, a, ["workflows", `${n}.json`]);
}
//@ chunk-3w426tt0.js:796-1278 placement
async function writeWorkflowSnapshot(r, a, n) {
  try {
    let i = { runId: r, timestamp: new Date().toISOString(), ...a },
      l = P(r),
      s = isStorageV5Enabled() && n ? nDr() : void 0,
      o = getSessionId();
    if (
      (await mkdir(dirname(l), { recursive: !0, mode: 448 }),
      isStorageV5Enabled() && n && s !== void 0 && isValidKeySegment(`${r}.json`))
    ) {
      let write = await n.write(W(s, o, r), jsonStringify(i), { publishDiscipline: "inPlace", mode: 384 });
      if (!write.ok) logForDebugging(`Failed to write workflow snapshot ${r}: ${write.error.code}`);
      return;
    }
    await writeFile(l, jsonStringify(i), { encoding: "utf8", mode: 384 });
  } catch (error) {
    logForDebugging(
      `Failed to write workflow snapshot ${r}: ${error instanceof Error ? error.message : error}`,
    );
  }
}
/**
 * 把读到的工作流快照记录补齐默认值：runId 缺省用文件名推出的 id，taskId 缺省同 runId，时间戳、脚本、agent 数、日志等缺省为空值。
 */
//@ chunk-3w426tt0.js:1278-1938 placement
function normalizeWorkflowSnapshot(record, fallbackRunId) {
  let runId = record.runId ?? fallbackRunId;
  return {
    runId: runId,
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
    summary: typeof record.summary === "string" ? record.summary : void 0,
    workflowName: typeof record.workflowName === "string" ? record.workflowName : void 0,
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
async function readWorkflowSnapshot(r) {
  let a = r ? nDr() : void 0;
  if (r && a !== void 0) return listWorkflowSnapshots(r, a);
  let n = m(),
    i;
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
            let o = await readFile(join(n, s), "utf8"),
              e = jsonParse(o);
            return normalizeWorkflowSnapshot(e, s.replace(/\.json$/, ""));
          } catch (error) {
            return (
              logForDebugging(
                `Failed to parse workflow snapshot ${s}: ${error instanceof Error ? error.message : error}`,
              ),
              null
            );
          }
        }),
    )
  ).filter((s) => s !== null);
  return (filtered.sort((s, o) => o.startTime - s.startTime), filtered);
}
//@ chunk-3w426tt0.js:2383-3367 placement
async function listWorkflowSnapshots(r, a) {
  let n = { namespace: "sidecar", projectKey: a, sessionId: getSessionId(), relPath: ["workflows"] },
    i = [],
    l;
  do {
    let listEntries = await r.listEntries(n, l === void 0 ? void 0 : { cursor: l });
    if (!listEntries.ok)
      return (logForDebugging(`Failed to list workflow snapshots: ${listEntries.error.code}`), []);
    for (let item of listEntries.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "sidecar") continue;
      if ((item.key.relPath.at(-1) ?? "").endsWith(".json")) i.push(item.key);
    }
    l = listEntries.value.cursor;
  } while (l !== void 0);
  let filtered = (
    await Promise.all(
      i.map(async (o) => {
        let e = o.relPath.at(-1) ?? "";
        try {
          let read = await r.read([o]);
          if (!read.ok)
            return (logForDebugging(`Failed to parse workflow snapshot ${e}: ${read.error.code}`), null);
          let c = read.value.items[0];
          if (!c?.found)
            return (
              logForDebugging(`Failed to parse workflow snapshot ${e}: deleted between list and read`),
              null
            );
          let w = jsonParse(Buffer.from(c.value).toString("utf8"));
          return normalizeWorkflowSnapshot(w, e.replace(/\.json$/, ""));
        } catch (error) {
          return (
            logForDebugging(
              `Failed to parse workflow snapshot ${e}: ${error instanceof Error ? error.message : error}`,
            ),
            null
          );
        }
      }),
    )
  ).filter((o) => o !== null);
  return (filtered.sort((o, e) => e.startTime - o.startTime), filtered);
}

export { Iz, nDr, writeWorkflowSnapshot, readWorkflowSnapshot };
