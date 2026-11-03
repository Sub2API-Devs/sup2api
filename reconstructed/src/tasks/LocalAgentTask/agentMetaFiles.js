/**
 * tasks/LocalAgentTask/agentMetaFiles.ts
 *
 * 2.1.316 新增。本地代理任务的元数据文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 6
 */
import { relative, dirname } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, M, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { keyFromMetaPath } from "../../utils/storage/storageKeys.js";
import { worktreeFromProgress, wrapStorageSource } from "../../utils/sessionStorage.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { subagentTranscriptKey } from "../../utils/subagentTranscripts.js";
import {
  readSessionLite,
  extractFieldFromFirstEntryStrict,
  extractFieldFromLastEntryStrict,
  LITE_READ_BUF_SIZE,
} from "../../utils/sessionStoragePortable.js";

//@ chunk-18hwfzwa.js:682221-682582 placement
/**
 * 子代理元数据读取常量：并发上限、文件大小上限与元数据结构。
 */
var MAX_META_READ_CONCURRENCY = 16;
var MAX_META_FILE_BYTES = 1048576;
var AGENT_META_SCHEMA = DoctorLazy(() =>
  u({
    agentType: string().optional().catch(undefined),
    description: string().optional().catch(undefined),
    name: string().optional().catch(undefined),
    parentAgentId: string().optional().catch(undefined),
    spawnDepth: E().int().positive().optional().catch(undefined),
    stoppedByUser: M().optional().catch(undefined),
    isObserver: M().optional().catch(undefined),
    taskKind: unknown().optional(),
  }),
);
//@ chunk-18hwfzwa.js:682744-683179 placement
/**
 * 读取子代理元数据文件（存储后端或本地，带大小上限），解析失败返回默认值。
 */
async function readAgentMetaFile(metaPath, storage) {
  let D = isStorageV5Enabled() && storage !== undefined ? keyFromMetaPath(metaPath) : undefined;
  let L = D === undefined ? worktreeFromProgress(metaPath) : undefined;
  let ee = await (
    D !== undefined && storage !== undefined
      ? storage
          .read([
            {
              key: D,
              offset: 0,
              length: MAX_META_FILE_BYTES + 1,
            },
          ])
          .then((ke) => {
            let [Re] = ke.ok ? ke.value.items : [];
            return Re?.found && Re.totalBytes <= MAX_META_FILE_BYTES
              ? jsonParse(Buffer.from(Re.value).toString("utf-8"))
              : null;
          })
      : L === undefined
        ? Promise.resolve(null)
        : getFsImplementation()
            .readFileFdGated(L, MAX_META_FILE_BYTES)
            .then((ke) => ke && jsonParse(ke.content))
  ).catch(() => null);
  return AGENT_META_SCHEMA().safeParse(ee ?? {}).data;
}
//@ chunk-18hwfzwa.js:683179-683807 placement
async function readAgentMetaFiles(h, { agentId, filePath }, storage) {
  let ee = storage === undefined ? null : subagentTranscriptKey(filePath);
  let [sessionLite, agentMetaFile] = await Promise.all([
    readSessionLite(
      filePath,
      wrapStorageSource(
        storage !== undefined && ee !== null
          ? {
              backend: storage,
              key: ee,
            }
          : undefined,
      ),
    ),
    readAgentMetaFile(filePath.replace(/\.jsonl$/, ".meta.json"), storage),
  ]);
  if (agentMetaFile?.isObserver || agentMetaFile?.taskKind !== undefined) return null;
  return {
    agentId,
    transcriptPath: filePath,
    group: relative(h, dirname(filePath)),
    agentType: agentMetaFile?.agentType,
    description: agentMetaFile?.description,
    name: agentMetaFile?.name,
    parentAgentId: agentMetaFile?.parentAgentId,
    spawnDepth: agentMetaFile?.spawnDepth,
    stoppedByUser: agentMetaFile?.stoppedByUser === true,
    startedAt: parseTimestampSafe(
      sessionLite && extractFieldFromFirstEntryStrict(sessionLite.head, "timestamp"),
    ),
    lastActivityAt:
      parseTimestampSafe(sessionLite && extractFieldFromLastEntryStrict(sessionLite.tail, "timestamp")) ??
      (sessionLite && sessionLite.size > LITE_READ_BUF_SIZE ? sessionLite.mtime : undefined),
    transcriptBytes: sessionLite?.size,
  };
}
//@ chunk-18hwfzwa.js:683807-683888 placement
function parseTimestampSafe(h) {
  if (!h) return;
  let timestamp = Date.parse(h);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}
//@ chunk-18hwfzwa.js:683888-684227 placement
/**
 * 按开始时间和父代理 id 把代理列表组织成树（无效父节点的作为根）。
 */
function buildAgentTree(h) {
  let x = h.toSorted(
    (ee, ke) => (ee.startedAt ?? 1 / 0) - (ke.startedAt ?? 1 / 0) || ee.agentId.localeCompare(ke.agentId),
  );
  let D = new Map();
  for (let ee of x)
    D.set(ee.agentId, {
      entry: ee,
      children: [],
    });
  let L = [];
  for (let ee of D.values()) {
    let ke = D.get(ee.entry.parentAgentId ?? "");
    if (ke === undefined || isAncestorAgent(ee, ke, D)) L.push(ee);
    else ke.children.push(ee);
  }
  return L;
}
//@ chunk-18hwfzwa.js:684227-684372 placement = _temp4 (0.465)
/**
 * 沿 parentAgentId 链向上查找，判断 target 是否是 start 本身或其祖先代理（带环检测）。
 */
function isAncestorAgent(h, x, D) {
  let L = new Set();
  let ee = x;
  while (ee !== undefined && !L.has(ee)) {
    if (ee === h) return true;
    L.add(ee);
    ee = D.get(ee.entry.parentAgentId ?? "");
  }
  return false;
}
export { readAgentMetaFiles, MAX_META_READ_CONCURRENCY, buildAgentTree, readAgentMetaFile };
