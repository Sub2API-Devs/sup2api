/**
 * tools/MemoryTool/MemoryListTool.ts
 *
 * 2.1.316 新增：memory_list 工具：列出记忆存储及其文档；memory_list 工具 schema。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  _enum,
  array,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:77923-78786 placement
/**
 * 列目录（MemoryList）时一次返回的条目上限 50；Ps 是输入 schema，zs 是输出 schema。
 */
var MAX_LIST_ENTRIES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var memoryListInputSchema;
var memoryListOutputSchema;
deferInit("chunk-fmnbrxwy.js:77923", () => {
  MAX_LIST_ENTRIES = 50;
  memoryListInputSchema = DoctorLazy(() =>
    zodStrictObject({
      store: stringSchema()
        .optional()
        .describe(
          "Id of the memory store to list. Omit to list the memory stores available in this session (id, description, writable or read-only, and the path of its index document).",
        ),
      path_prefix: stringSchema()
        .optional()
        .describe(
          "Optional directory prefix to list only documents under it (e.g. /feedback/). Matching is directory-aligned (/x is the same as /x/). Omit to list the whole store.",
        ),
      cursor: stringSchema()
        .optional()
        .describe("Path of the last entry from a previous call. Returns entries after this path."),
    }),
  );
  memoryListOutputSchema = DoctorLazy(() =>
    objectSchema({
      outcome: _enum(["ok", "refused", "failed"]),
      store_kind: _enum(["personal", "project"]).optional(),
      entries: array(
        objectSchema({
          path: stringSchema(),
          bytes: numberSchema().optional(),
          updatedAt: stringSchema().optional(),
        }),
      ).optional(),
      remaining: numberSchema().optional(),
      stores: array(
        objectSchema({
          id: stringSchema(),
          description: stringSchema(),
          writable: booleanSchema(),
          index: stringSchema(),
        }),
      ).optional(),
      reason: stringSchema().optional(),
      message: stringSchema().optional(),
    }),
  );
});
//@ chunk-fmnbrxwy.js:78786-79016 placement
function formatMemoryDocEntry(entry) {
  let sizeText = entry.bytes === undefined ? "" : `${entry.bytes} bytes`;
  let updatedDate = entry.updatedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  let updatedText = updatedDate === undefined ? "" : `updated ${updatedDate}`;
  let joined = [sizeText, updatedText].filter(Boolean).join(", ");
  let json = JSON.stringify(entry.path);
  return joined === "" ? json : `${json}  (${joined})`;
}
//@ chunk-fmnbrxwy.js:79016-81931 placement
/**
 * memory_list 工具：列出记忆存储及其文档。
 */
var MemoryListTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:79016", () => {
  MemoryListTool = buildTool({
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
    toAutoClassifierInput(input) {
      return `list ${input.store ?? "stores"} ${input.path_prefix ?? ""}`.trim();
    },
    renderToolUseMessage(input) {
      return joinPrintable(input.store, input.path_prefix);
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
            let refusal = checkMemoryToolsAllowed();
            if (refusal) {
              logMemoryToolSad("stores", `refused_${refusal.reason}`);
              return {
                data: {
                  outcome: "refused",
                  reason: refusal.reason,
                  message: refusal.message,
                },
                ...memoryUnavailableRemedy(refusal),
              };
            }
            let storeEntries = listMemoryStoreEntries();
            let storeDescriptions = describeMemoryStores(storeEntries);
            let projectConnecting = isProjectStoreConnecting(storeEntries);
            if (storeDescriptions.length === 0)
              logMemoryToolSad("stores", projectConnecting ? "stores_connecting" : "stores_none");
            else logMemoryToolOk("stores", "none");
            return {
              data: {
                outcome: "ok",
                stores: storeDescriptions,
                ...(projectConnecting && {
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
            let normalizedPrefix = pathPrefix === undefined ? undefined : normalizePathPrefix(pathPrefix);
            let refusal =
              pathPrefix === undefined || normalizedPrefix === undefined
                ? null
                : (checkAbsoluteMemoryPath(pathPrefix, memoryStore.served.promptIndex) ??
                  validateMemoryPath(normalizedPrefix, {
                    trailingSlashAllowed: true,
                  }));
            if (refusal) {
              logMemoryToolSad("list", `refused_${refusal.reason}`, kind);
              return {
                data: {
                  outcome: "refused",
                  reason: refusal.reason,
                  message: refusal.message,
                },
              };
            }
            let listPrefix =
              normalizedPrefix === undefined || normalizedPrefix === "/"
                ? undefined
                : normalizedPrefix.endsWith("/")
                  ? normalizedPrefix
                  : `${normalizedPrefix}/`;
            let documents = await memoryStore.backend
              .list(listPrefix, {
                signal,
              })
              .catch((error) => {
                if (error instanceof MemoryNotFoundError && error.kind === "store") return [];
                throw error;
              });
            if (signal.aborted) throw new AbortError();
            let sorted = documents
              .filter((doc) => isValidMemoryDocumentKey(doc.path))
              .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
            let afterCursor = cursor === undefined ? sorted : sorted.filter((doc) => doc.path > cursor);
            let sliced = afterCursor.slice(0, MAX_LIST_ENTRIES);
            logMemoryToolOk("list", kind);
            return {
              data: {
                outcome: "ok",
                store_kind: kind,
                entries: sliced.map((doc) => ({
                  path: doc.path,
                  bytes: doc.sizeBytes,
                  updatedAt: doc.updatedAt,
                })),
                remaining: afterCursor.length - sliced.length,
              },
            };
          } catch (error) {
            if (signal.aborted) throw new AbortError();
            let failure = logMemoryErrorResult("list", error);
            return {
              data: {
                outcome: "failed",
                reason: failure.reason,
                message: failure.message,
              },
            };
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      if (result.outcome !== "ok")
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          is_error: true,
          content: result.message ?? `${MEMORY_LIST_TOOL_NAME} failed: ${result.reason}`,
        };
      if (result.stores !== undefined)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            result.stores.length === 0
              ? (result.message ?? "No memory stores are available in this session.")
              : `Memory stores available in this session \u2014 pass an id as store to list or read one:
${result.stores.map(
  (store) =>
    `${store.id}  (${store.description}, ${store.writable ? "writable" : "read-only"}, index ${store.index})`,
).join(`
`)}${
                  result.message === undefined
                    ? ""
                    : `
${result.message}`
                }`,
        };
      let entries = result.entries ?? [];
      if (entries.length === 0)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: "(empty)",
        };
      let remaining = result.remaining ?? 0;
      let moreSuffix =
        remaining > 0
          ? `
\u2026 ${remaining} more \u2014 call again with cursor=${JSON.stringify(entries.at(-1)?.path ?? "")} to continue.`
          : "";
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `${memoryStoreNote(result.store_kind)}

${entries.map(formatMemoryDocEntry).join(`
`)}${moreSuffix}`,
      };
    },
  });
});
export { MemoryListTool };
