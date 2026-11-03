/**
 * tools/MemoryReadTool/MemoryReadTool.ts
 *
 * 2.1.316 新增：读取记忆存储文档的工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, u, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ } from "../MemoryTool/memoryToolNames.js";
import {
  autoMemFilePath,
  resolveMemoryStore,
  memoryUnavailableRemedy,
  checkAbsoluteMemoryPath,
} from "../../services/memoryStore/memoryDocumentFs.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  MEMORY_READ_DESCRIPTION,
  joined_2 as joined_2_2,
  joinPrintable,
  logMemoryToolSad,
  validateMemoryPath,
  isOversizeMemoryContent,
  MAX_MEMORY_DOC_BYTES,
  logMemoryToolOk,
  memoryVersionHash,
  logMemoryErrorResult,
  memoryStoreNote,
  VERSION_FOLLOWUP_NOTE,
} from "../MemoryTool/memoryWrite.js";
import { areMemoryToolsEnabled } from "../../services/memorySync/availability.js";
import { normalizePathPrefix } from "../../services/orgMemory/storeApi.js";
import { AbortError as AbortError_2 } from "../../utils/errors.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";

//@ chunk-e6aww6q8.js:1460606-1461075 placement
/**
 * MemoryRead 的输出 schema（outcome、path、store_kind、content、version 等）。
 */
var memoryReadInputSchema = DoctorLazy(() =>
  zodStrictObject({
    store: string().describe(
      `Id of the memory store to read from (call ${MEMORY_LIST_TOOL_NAME} with no arguments to see the stores available in this session).`,
    ),
    path: string().describe("Path of the memory document to read (e.g. /MEMORY.md)."),
  }),
);
var memoryReadOutputSchema = DoctorLazy(() =>
  u({
    outcome: _enum(["ok", "not_found", "refused", "failed"]),
    path: string(),
    store_kind: _enum(["personal", "project"]).optional(),
    content: string().optional(),
    updatedAt: string().optional(),
    version: string().optional(),
    reason: string().optional(),
    message: string().optional(),
  }),
);
//@ chunk-e6aww6q8.js:1461075-1461210 placement
/**
 * 若 MemoryRead 结果成功且来自个人存储，返回对应的本地路径，否则 null。
 */
function personalMemoryReadPath(toolResponse) {
  let n = memoryReadOutputSchema().safeParse(toolResponse);
  return n.success && n.data.outcome === "ok" && n.data.store_kind === "personal"
    ? autoMemFilePath(n.data.path)
    : null;
}
//@ chunk-e6aww6q8.js:1461210-1463370 placement
/**
 * MemoryReadTool：从记忆存储读取文档的工具定义。
 */
var MemoryReadTool = buildTool({
  name: MEMORY_READ,
  searchHint: "read a document from a memory store",
  shouldDefer: false,
  backgrounding: "never",
  maxResultSizeChars: 1 / 0,
  async description() {
    return MEMORY_READ_DESCRIPTION;
  },
  async prompt() {
    return joined_2_2;
  },
  get inputSchema() {
    return memoryReadInputSchema();
  },
  get outputSchema() {
    return memoryReadOutputSchema();
  },
  userFacingName() {
    return MEMORY_READ;
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
    return `read ${e.store}:${e.path}`;
  },
  renderToolUseMessage(e) {
    return joinPrintable(e.store, e.path);
  },
  extractSearchText() {
    return "";
  },
  getActivityDescription(e) {
    return joinPrintable("Reading memory", e?.path);
  },
  create() {
    return {
      async call({ store, path }, { signal }) {
        let memoryStore = resolveMemoryStore({
          storeId: store,
        });
        if (memoryStore.outcome === "refused") {
          logMemoryToolSad("read", `refused_${memoryStore.reason}`);
          return {
            data: {
              outcome: "refused",
              path,
              reason: memoryStore.reason,
              message: memoryStore.message,
            },
            ...memoryUnavailableRemedy(memoryStore),
          };
        }
        try {
          let { kind } = memoryStore.served;
          let y = normalizePathPrefix(path);
          let S = checkAbsoluteMemoryPath(path, memoryStore.served.promptIndex) ?? validateMemoryPath(y);
          if (S) {
            logMemoryToolSad("read", `refused_${S.reason}`, kind);
            return {
              data: {
                outcome: "refused",
                path: y,
                reason: S.reason,
                message: S.message,
              },
            };
          }
          let w = memoryStore.backend.readByPath
            ? await memoryStore.backend.readByPath(y, {
                signal,
              })
            : null;
          if (signal.aborted) throw new AbortError_2();
          if (w === null) {
            logMemoryToolSad("read", "read_not_found", kind);
            return {
              data: {
                outcome: "not_found",
                path: y,
              },
            };
          }
          if (isOversizeMemoryContent(w.content)) {
            logMemoryToolSad("read", "refused_too_large", kind);
            return {
              data: {
                outcome: "refused",
                path: y,
                reason: "too_large",
                message: `"${y}" is ${Buffer.byteLength(w.content, "utf8")} bytes, over the ${MAX_MEMORY_DOC_BYTES}-byte read cap, so its content is not returned.`,
              },
            };
          }
          logMemoryToolOk("read", kind);
          return {
            data: {
              outcome: "ok",
              path: y,
              store_kind: kind,
              content: normalizeMemoryText(w.content),
              updatedAt: w.updatedAt,
              version: memoryVersionHash(w.content),
            },
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError_2();
          let y = logMemoryErrorResult("read", error);
          return {
            data: {
              outcome: "failed",
              path: normalizePathPrefix(path),
              reason: y.reason,
              message: y.message,
            },
          };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    switch (e.outcome) {
      case "ok":
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: `${memoryStoreNote(e.store_kind)}
[updated: ${e.updatedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "unknown"}] [version: ${e.version ?? ""}]${VERSION_FOLLOWUP_NOTE}
${e.content ?? ""}`,
        };
      case "not_found":
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          is_error: true,
          content: `${MEMORY_READ} failed: not found`,
        };
      case "refused":
      case "failed":
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          is_error: true,
          content: e.message ?? `${MEMORY_READ} failed: ${e.reason}`,
        };
    }
  },
});
export { MemoryReadTool, personalMemoryReadPath };
