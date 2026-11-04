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
import {
  objectSchema,
  stringSchema,
  numberSchema,
  booleanSchema,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:682221-682582 placement
/**
 * 子代理元数据读取常量：并发上限、文件大小上限与元数据结构。
 */
var MAX_META_READ_CONCURRENCY; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_META_FILE_BYTES;
var AGENT_META_SCHEMA;
deferInit("chunk-18hwfzwa.js:682221", () => {
  MAX_META_READ_CONCURRENCY = 16;
  MAX_META_FILE_BYTES = 1048576;
  AGENT_META_SCHEMA = DoctorLazy(() =>
    objectSchema({
      agentType: stringSchema().optional().catch(undefined),
      description: stringSchema().optional().catch(undefined),
      name: stringSchema().optional().catch(undefined),
      parentAgentId: stringSchema().optional().catch(undefined),
      spawnDepth: numberSchema().int().positive().optional().catch(undefined),
      stoppedByUser: booleanSchema().optional().catch(undefined),
      isObserver: booleanSchema().optional().catch(undefined),
      taskKind: unknown().optional(),
    }),
  );
});
//@ chunk-18hwfzwa.js:682744-683179 placement
/**
 * 读取子代理元数据文件（存储后端或本地，带大小上限），解析失败返回默认值。
 */
async function readAgentMetaFile(metaPath, storage) {
  let sideKey = isStorageV5Enabled() && storage !== undefined ? keyFromMetaPath(metaPath) : undefined;
  let realMetaPath = sideKey === undefined ? worktreeFromProgress(metaPath) : undefined;
  let parsed = await (
    sideKey !== undefined && storage !== undefined
      ? storage
          .read([
            {
              key: sideKey,
              offset: 0,
              length: MAX_META_FILE_BYTES + 1,
            },
          ])
          .then((readResult) => {
            let [item] = readResult.ok ? readResult.value.items : [];
            return item?.found && item.totalBytes <= MAX_META_FILE_BYTES
              ? jsonParse(Buffer.from(item.value).toString("utf-8"))
              : null;
          })
      : realMetaPath === undefined
        ? Promise.resolve(null)
        : getFsImplementation()
            .readFileFdGated(realMetaPath, MAX_META_FILE_BYTES)
            .then((fileContents) => fileContents && jsonParse(fileContents.content))
  ).catch(() => null);
  return AGENT_META_SCHEMA().safeParse(parsed ?? {}).data;
}
//@ chunk-18hwfzwa.js:683179-683807 placement
async function readAgentMetaFiles(groupDir, { agentId, filePath }, storage) {
  let sideKey = storage === undefined ? null : subagentTranscriptKey(filePath);
  let [sessionLite, agentMetaFile] = await Promise.all([
    readSessionLite(
      filePath,
      wrapStorageSource(
        storage !== undefined && sideKey !== null
          ? {
              backend: storage,
              key: sideKey,
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
    group: relative(groupDir, dirname(filePath)),
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
function parseTimestampSafe(value) {
  if (!value) return;
  let timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}
//@ chunk-18hwfzwa.js:683888-684227 placement
/**
 * 按开始时间和父代理 id 把代理列表组织成树（无效父节点的作为根）。
 */
function buildAgentTree(entries) {
  let sorted = entries.toSorted(
    (left, right) =>
      (left.startedAt ?? 1 / 0) - (right.startedAt ?? 1 / 0) || left.agentId.localeCompare(right.agentId),
  );
  let byId = new Map();
  for (let entry of sorted)
    byId.set(entry.agentId, {
      entry,
      children: [],
    });
  let roots = [];
  for (let node of byId.values()) {
    let parent = byId.get(node.entry.parentAgentId ?? "");
    if (parent === undefined || isAncestorAgent(node, parent, byId)) roots.push(node);
    else parent.children.push(node);
  }
  return roots;
}
//@ chunk-18hwfzwa.js:684227-684372 placement = _temp4 (0.465)
/**
 * 沿 parentAgentId 链向上查找，判断 target 是否是 start 本身或其祖先代理（带环检测）。
 */
function isAncestorAgent(ancestorId, startId, byId) {
  let seen = new Set();
  let current = startId;
  while (current !== undefined && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = byId.get(current.entry.parentAgentId ?? "");
  }
  return false;
}
export { readAgentMetaFiles, MAX_META_READ_CONCURRENCY, buildAgentTree, readAgentMetaFile };
