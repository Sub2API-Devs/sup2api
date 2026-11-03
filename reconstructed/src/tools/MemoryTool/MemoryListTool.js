/**
 * tools/MemoryTool/MemoryListTool.ts
 *
 * 2.1.316 新增：memory_list 工具：列出记忆存储及其文档；memory_list 工具 schema。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, u, _enum, array, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { MEMORY_LIST_TOOL_NAME } from "./memoryToolNames.js";
import {
  MEMORY_LIST_DESCRIPTION,
  joined,
  joinPrintable,
  logMemoryToolSad,
  logMemoryToolOk,
  validateMemoryPath,
  isValidMemoryDocumentKey,
  logMemoryErrorResult,
  memoryStoreNote,
} from "./memoryWrite.js";
import { areMemoryToolsEnabled } from "../../services/memorySync/availability.js";
import {
  checkMemoryToolsAllowed,
  memoryUnavailableRemedy,
  listMemoryStoreEntries,
  describeMemoryStores,
  isProjectStoreConnecting,
  PROJECT_STORE_CONNECTING_TEXT,
  resolveMemoryStore,
  checkAbsoluteMemoryPath,
} from "../../services/memoryStore/memoryDocumentFs.js";
import { normalizePathPrefix } from "../../services/orgMemory/storeApi.js";
import { MemoryNotFoundError } from "../../services/orgMemory/storeErrors.js";
import { AbortError } from "../../utils/errors.js";

//@ chunk-kxyd0g16.js:63209-64072 placement
/**
 * MemoryList 的输入 schema。
 */
var MemoryListInputSchema = 50;
var memoryListInputSchema = DoctorLazy(() =>
  zodStrictObject({
    store: string()
      .optional()
      .describe(
        "Id of the memory store to list. Omit to list the memory stores available in this session (id, description, writable or read-only, and the path of its index document).",
      ),
    path_prefix: string()
      .optional()
      .describe(
        "Optional directory prefix to list only documents under it (e.g. /feedback/). Matching is directory-aligned (/x is the same as /x/). Omit to list the whole store.",
      ),
    cursor: string()
      .optional()
      .describe("Path of the last entry from a previous call. Returns entries after this path."),
  }),
);
var memoryListOutputSchema = DoctorLazy(() =>
  u({
    outcome: _enum(["ok", "refused", "failed"]),
    store_kind: _enum(["personal", "project"]).optional(),
    entries: array(
      u({
        path: string(),
        bytes: E().optional(),
        updatedAt: string().optional(),
      }),
    ).optional(),
    remaining: E().optional(),
    stores: array(
      u({
        id: string(),
        description: string(),
        writable: M(),
        index: string(),
      }),
    ).optional(),
    reason: string().optional(),
    message: string().optional(),
  }),
);
//@ chunk-kxyd0g16.js:64072-64302 placement
function formatMemoryDocEntry(e) {
  let r = e.bytes === undefined ? "" : `${e.bytes} bytes`;
  let n = e.updatedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  let s = n === undefined ? "" : `updated ${n}`;
  let joined = [r, s].filter(Boolean).join(", ");
  let json = JSON.stringify(e.path);
  return joined === "" ? json : `${json}  (${joined})`;
}
//@ chunk-kxyd0g16.js:64302-67217 placement
/**
 * memory_list 工具：列出记忆存储及其文档。
 */
var MemoryListTool = buildTool({
  name: MEMORY_LIST_TOOL_NAME,
  searchHint: "list the memory stores and the documents in them",
  shouldDefer: false,
  backgrounding: "never",
  maxResultSizeChars: 1 / 0,
  async description() {
    return MEMORY_LIST_DESCRIPTION;
  },
  async prompt() {
    return joined;
  },
  get inputSchema() {
    return memoryListInputSchema();
  },
  get outputSchema() {
    return memoryListOutputSchema();
  },
  userFacingName() {
    return MEMORY_LIST_TOOL_NAME;
  },
  isEnabled() {
    return areMemoryToolsEnabled();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  toAutoClassifierInput(e) {
    return `list ${e.store ?? "stores"} ${e.path_prefix ?? ""}`.trim();
  },
  renderToolUseMessage(e) {
    return joinPrintable(e.store, e.path_prefix);
  },
  extractSearchText() {
    return "";
  },
  getActivityDescription() {
    return "Listing memory documents";
  },
  create() {
    return {
      async call({ store, path_prefix: pathPrefix, cursor }, { signal }) {
        if (store === undefined) {
          let y = checkMemoryToolsAllowed();
          if (y) {
            logMemoryToolSad("stores", `refused_${y.reason}`);
            return {
              data: {
                outcome: "refused",
                reason: y.reason,
                message: y.message,
              },
              ...memoryUnavailableRemedy(y),
            };
          }
          let k = listMemoryStoreEntries();
          let w = describeMemoryStores(k);
          let S = isProjectStoreConnecting(k);
          if (w.length === 0) logMemoryToolSad("stores", S ? "stores_connecting" : "stores_none");
          else logMemoryToolOk("stores", "none");
          return {
            data: {
              outcome: "ok",
              stores: w,
              ...(S && {
                message: PROJECT_STORE_CONNECTING_TEXT,
              }),
            },
          };
        }
        let memoryStore = resolveMemoryStore({
          storeId: store,
        });
        if (memoryStore.outcome === "refused") {
          logMemoryToolSad("list", `refused_${memoryStore.reason}`);
          return {
            data: {
              outcome: "refused",
              reason: memoryStore.reason,
              message: memoryStore.message,
            },
            ...memoryUnavailableRemedy(memoryStore),
          };
        }
        let { kind } = memoryStore.served;
        try {
          let y = pathPrefix === undefined ? undefined : normalizePathPrefix(pathPrefix);
          let k =
            pathPrefix === undefined || y === undefined
              ? null
              : (checkAbsoluteMemoryPath(pathPrefix, memoryStore.served.promptIndex) ??
                validateMemoryPath(y, {
                  trailingSlashAllowed: true,
                }));
          if (k) {
            logMemoryToolSad("list", `refused_${k.reason}`, kind);
            return {
              data: {
                outcome: "refused",
                reason: k.reason,
                message: k.message,
              },
            };
          }
          let w = y === undefined || y === "/" ? undefined : y.endsWith("/") ? y : `${y}/`;
          let S = await memoryStore.backend
            .list(w, {
              signal,
            })
            .catch((error) => {
              if (error instanceof MemoryNotFoundError && error.kind === "store") return [];
              throw error;
            });
          if (signal.aborted) throw new AbortError();
          let sorted = S.filter((x) => isValidMemoryDocumentKey(x.path)).sort((x, B) =>
            x.path < B.path ? -1 : x.path > B.path ? 1 : 0,
          );
          let I = cursor === undefined ? sorted : sorted.filter((x) => x.path > cursor);
          let sliced = I.slice(0, MemoryListInputSchema);
          logMemoryToolOk("list", kind);
          return {
            data: {
              outcome: "ok",
              store_kind: kind,
              entries: sliced.map((x) => ({
                path: x.path,
                bytes: x.sizeBytes,
                updatedAt: x.updatedAt,
              })),
              remaining: I.length - sliced.length,
            },
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          let k = logMemoryErrorResult("list", error);
          return {
            data: {
              outcome: "failed",
              reason: k.reason,
              message: k.message,
            },
          };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    if (e.outcome !== "ok")
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        is_error: true,
        content: e.message ?? `${MEMORY_LIST_TOOL_NAME} failed: ${e.reason}`,
      };
    if (e.stores !== undefined)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content:
          e.stores.length === 0
            ? (e.message ?? "No memory stores are available in this session.")
            : `Memory stores available in this session \u2014 pass an id as store to list or read one:
${e.stores.map(
  (store) =>
    `${store.id}  (${store.description}, ${store.writable ? "writable" : "read-only"}, index ${store.index})`,
).join(`
`)}${
                e.message === undefined
                  ? ""
                  : `
${e.message}`
              }`,
      };
    let entries = e.entries ?? [];
    if (entries.length === 0)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: "(empty)",
      };
    let remaining = e.remaining ?? 0;
    let f =
      remaining > 0
        ? `
\u2026 ${remaining} more \u2014 call again with cursor=${JSON.stringify(entries.at(-1)?.path ?? "")} to continue.`
        : "";
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: `${memoryStoreNote(e.store_kind)}

${entries.map(formatMemoryDocEntry).join(`
`)}${f}`,
    };
  },
});
export { MemoryListTool };
