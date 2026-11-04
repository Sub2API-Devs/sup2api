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
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1460606-1461075 placement
/**
 * MemoryRead 的输出 schema（outcome、path、store_kind、content、version 等）。
 */
var memoryReadInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var memoryReadOutputSchema;
deferInit("chunk-e6aww6q8.js:1460606", () => {
  memoryReadInputSchema = DoctorLazy(() =>
    zodStrictObject({
      store: stringSchema().describe(
        `Id of the memory store to read from (call ${MEMORY_LIST_TOOL_NAME} with no arguments to see the stores available in this session).`,
      ),
      path: stringSchema().describe("Path of the memory document to read (e.g. /MEMORY.md)."),
    }),
  );
  memoryReadOutputSchema = DoctorLazy(() =>
    objectSchema({
      outcome: _enum(["ok", "not_found", "refused", "failed"]),
      path: stringSchema(),
      store_kind: _enum(["personal", "project"]).optional(),
      content: stringSchema().optional(),
      updatedAt: stringSchema().optional(),
      version: stringSchema().optional(),
      reason: stringSchema().optional(),
      message: stringSchema().optional(),
    }),
  );
});
//@ chunk-e6aww6q8.js:1461075-1461210 placement
/**
 * 若 MemoryRead 结果成功且来自个人存储，返回对应的本地路径，否则 null。
 */
function personalMemoryReadPath(toolResponse) {
  let parsed = memoryReadOutputSchema().safeParse(toolResponse);
  return parsed.success && parsed.data.outcome === "ok" && parsed.data.store_kind === "personal"
    ? autoMemFilePath(parsed.data.path)
    : null;
}
//@ chunk-e6aww6q8.js:1461210-1463370 placement
/**
 * MemoryReadTool：从记忆存储读取文档的工具定义。
 */
var MemoryReadTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1461210", () => {
  MemoryReadTool = buildTool({
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
    toAutoClassifierInput(input) {
      return `read ${input.store}:${input.path}`;
    },
    renderToolUseMessage(input) {
      return joinPrintable(input.store, input.path);
    },
    extractSearchText() {
      return "";
    },
    getActivityDescription(input) {
      return joinPrintable("Reading memory", input?.path);
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
            let normalizedPath = normalizePathPrefix(path);
            let pathRefusal =
              checkAbsoluteMemoryPath(path, memoryStore.served.promptIndex) ??
              validateMemoryPath(normalizedPath);
            if (pathRefusal) {
              logMemoryToolSad("read", `refused_${pathRefusal.reason}`, kind);
              return {
                data: {
                  outcome: "refused",
                  path: normalizedPath,
                  reason: pathRefusal.reason,
                  message: pathRefusal.message,
                },
              };
            }
            let storedDoc = memoryStore.backend.readByPath
              ? await memoryStore.backend.readByPath(normalizedPath, {
                  signal,
                })
              : null;
            if (signal.aborted) throw new AbortError_2();
            if (storedDoc === null) {
              logMemoryToolSad("read", "read_not_found", kind);
              return {
                data: {
                  outcome: "not_found",
                  path: normalizedPath,
                },
              };
            }
            if (isOversizeMemoryContent(storedDoc.content)) {
              logMemoryToolSad("read", "refused_too_large", kind);
              return {
                data: {
                  outcome: "refused",
                  path: normalizedPath,
                  reason: "too_large",
                  message: `"${normalizedPath}" is ${Buffer.byteLength(storedDoc.content, "utf8")} bytes, over the ${MAX_MEMORY_DOC_BYTES}-byte read cap, so its content is not returned.`,
                },
              };
            }
            logMemoryToolOk("read", kind);
            return {
              data: {
                outcome: "ok",
                path: normalizedPath,
                store_kind: kind,
                content: normalizeMemoryText(storedDoc.content),
                updatedAt: storedDoc.updatedAt,
                version: memoryVersionHash(storedDoc.content),
              },
            };
          } catch (error) {
            if (signal.aborted) throw new AbortError_2();
            let errorResult = logMemoryErrorResult("read", error);
            return {
              data: {
                outcome: "failed",
                path: normalizePathPrefix(path),
                reason: errorResult.reason,
                message: errorResult.message,
              },
            };
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      switch (result.outcome) {
        case "ok":
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: `${memoryStoreNote(result.store_kind)}
[updated: ${result.updatedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "unknown"}] [version: ${result.version ?? ""}]${VERSION_FOLLOWUP_NOTE}
${result.content ?? ""}`,
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
            content: result.message ?? `${MEMORY_READ} failed: ${result.reason}`,
          };
      }
    },
  });
});
export { MemoryReadTool, personalMemoryReadPath };
