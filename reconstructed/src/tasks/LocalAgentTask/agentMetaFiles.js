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
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, M, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { keyFromMetaPath } from "../../utils/storage/storageKeys.js";
import { yH, wrapStorageSource } from "../../utils/sessionStorage.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { subagentTranscriptKey } from "../../utils/subagentTranscripts.js";
import {
  readSessionLite,
  extractFieldFromFirstEntryStrict,
  extractFieldFromLastEntryStrict,
  LITE_READ_BUF_SIZE,
} from "../../utils/sessionStoragePortable.js";

/**
 * 子代理元数据读取常量：并发上限、文件大小上限与元数据结构。
 */
//@ chunk-18hwfzwa.js:682221-682582 placement
var MAX_META_READ_CONCURRENCY = 16,
  MAX_META_FILE_BYTES = 1048576,
  AGENT_META_SCHEMA = DoctorLazy(() =>
    u({
      agentType: o()
        .optional()
        .catch(void 0),
      description: o()
        .optional()
        .catch(void 0),
      name: o()
        .optional()
        .catch(void 0),
      parentAgentId: o()
        .optional()
        .catch(void 0),
      spawnDepth: E()
        .int()
        .positive()
        .optional()
        .catch(void 0),
      stoppedByUser: M()
        .optional()
        .catch(void 0),
      isObserver: M()
        .optional()
        .catch(void 0),
      taskKind: oe().optional(),
    }),
  );
/**
 * 读取子代理元数据文件（存储后端或本地，带大小上限），解析失败返回默认值。
 */
//@ chunk-18hwfzwa.js:682744-683179 placement
async function readAgentMetaFile(metaPath, storage) {
  let D = isStorageV5Enabled() && storage !== void 0 ? keyFromMetaPath(metaPath) : void 0,
    L = D === void 0 ? yH(metaPath) : void 0,
    ee = await (
      D !== void 0 && storage !== void 0
        ? storage.read([{ key: D, offset: 0, length: MAX_META_FILE_BYTES + 1 }]).then((ke) => {
            let [Re] = ke.ok ? ke.value.items : [];
            return Re?.found && Re.totalBytes <= MAX_META_FILE_BYTES
              ? jsonParse(Buffer.from(Re.value).toString("utf-8"))
              : null;
          })
        : L === void 0
          ? Promise.resolve(null)
          : getFsImplementation()
              .readFileFdGated(L, MAX_META_FILE_BYTES)
              .then((ke) => ke && jsonParse(ke.content))
    ).catch(() => null);
  return AGENT_META_SCHEMA().safeParse(ee ?? {}).data;
}
//@ chunk-18hwfzwa.js:683179-683807 placement
async function readAgentMetaFiles(h, { agentId: agentId, filePath: filePath }, L) {
  let ee = L === void 0 ? null : subagentTranscriptKey(filePath),
    [ke, Re] = await Promise.all([
      readSessionLite(
        filePath,
        wrapStorageSource(L !== void 0 && ee !== null ? { backend: L, key: ee } : void 0),
      ),
      readAgentMetaFile(filePath.replace(/\.jsonl$/, ".meta.json"), L),
    ]);
  if (Re?.isObserver || Re?.taskKind !== void 0) return null;
  return {
    agentId: agentId,
    transcriptPath: filePath,
    group: relative_2(h, dirname_5(filePath)),
    agentType: Re?.agentType,
    description: Re?.description,
    name: Re?.name,
    parentAgentId: Re?.parentAgentId,
    spawnDepth: Re?.spawnDepth,
    stoppedByUser: Re?.stoppedByUser === !0,
    startedAt: OQe(ke && extractFieldFromFirstEntryStrict(ke.head, "timestamp")),
    lastActivityAt:
      OQe(ke && extractFieldFromLastEntryStrict(ke.tail, "timestamp")) ??
      (ke && ke.size > LITE_READ_BUF_SIZE ? ke.mtime : void 0),
    transcriptBytes: ke?.size,
  };
}
//@ chunk-18hwfzwa.js:683807-683888 placement
function OQe(h) {
  if (!h) return;
  let parse = Date.parse(h);
  return Number.isNaN(parse) ? void 0 : parse;
}
/**
 * 按开始时间和父代理 id 把代理列表组织成树（无效父节点的作为根）。
 */
//@ chunk-18hwfzwa.js:683888-684227 placement
function buildAgentTree(h) {
  let toSorted = h.toSorted(
      (ee, ke) => (ee.startedAt ?? 1 / 0) - (ke.startedAt ?? 1 / 0) || ee.agentId.localeCompare(ke.agentId),
    ),
    D = new Map();
  for (let ee of toSorted) D.set(ee.agentId, { entry: ee, children: [] });
  let L = [];
  for (let ee of D.values()) {
    let ke = D.get(ee.entry.parentAgentId ?? "");
    if (ke === void 0 || isAncestorAgent(ee, ke, D)) L.push(ee);
    else ke.children.push(ee);
  }
  return L;
}
/**
 * 沿 parentAgentId 链向上查找，判断 target 是否是 start 本身或其祖先代理（带环检测）。
 */
//@ chunk-18hwfzwa.js:684227-684372 placement = _temp4 (0.465)
function isAncestorAgent(h, x, D) {
  let L = new Set(),
    ee = x;
  while (ee !== void 0 && !L.has(ee)) {
    if (ee === h) return !0;
    (L.add(ee), (ee = D.get(ee.entry.parentAgentId ?? "")));
  }
  return !1;
}

export { readAgentMetaFiles, MAX_META_READ_CONCURRENCY, buildAgentTree, readAgentMetaFile };
