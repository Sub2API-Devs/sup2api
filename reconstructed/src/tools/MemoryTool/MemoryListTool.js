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
import { zodStrictObject, o, u, U, A, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { MEMORY_LIST_TOOL_NAME } from "./memoryToolNames.js";
import {
  MEMORY_LIST_DESCRIPTION,
  joined,
  URe,
  w6,
  BEt,
  validateMemoryPath,
  $Js,
  t2t,
  r2t,
} from "./memoryWrite.js";
import { _Pe } from "../../services/memorySync/availability.js";
import {
  checkMemoryToolsAllowed,
  UEt,
  iVr,
  describeMemoryStores,
  k2o,
  v2o,
  resolveMemoryStore,
  checkAbsoluteMemoryPath,
} from "../../services/memoryStore/memoryDocumentFs.js";
import { Pk } from "../../services/orgMemory/storeApi.js";
import { MemoryNotFoundError } from "../../services/orgMemory/storeErrors.js";
import { AbortError } from "../../utils/errors.js";

/**
 * memory_list 工具 schema。
 */
//@ chunk-kxyd0g16.js:63209-64072 placement
var MemoryListInputSchema = 50,
  Ps = DoctorLazy(() =>
    zodStrictObject({
      store: o()
        .optional()
        .describe(
          "Id of the memory store to list. Omit to list the memory stores available in this session (id, description, writable or read-only, and the path of its index document).",
        ),
      path_prefix: o()
        .optional()
        .describe(
          "Optional directory prefix to list only documents under it (e.g. /feedback/). Matching is directory-aligned (/x is the same as /x/). Omit to list the whole store.",
        ),
      cursor: o()
        .optional()
        .describe("Path of the last entry from a previous call. Returns entries after this path."),
    }),
  ),
  zs = DoctorLazy(() =>
    u({
      outcome: U(["ok", "refused", "failed"]),
      store_kind: U(["personal", "project"]).optional(),
      entries: A(u({ path: o(), bytes: E().optional(), updatedAt: o().optional() })).optional(),
      remaining: E().optional(),
      stores: A(u({ id: o(), description: o(), writable: M(), index: o() })).optional(),
      reason: o().optional(),
      message: o().optional(),
    }),
  );
//@ chunk-kxyd0g16.js:64072-64302 placement
function formatMemoryDocEntry(e) {
  let r = e.bytes === void 0 ? "" : `${e.bytes} bytes`,
    n = e.updatedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0],
    s = n === void 0 ? "" : `updated ${n}`,
    joined = [r, s].filter(Boolean).join(", "),
    json = JSON.stringify(e.path);
  return joined === "" ? json : `${json}  (${joined})`;
}
/**
 * memory_list 工具：列出记忆存储及其文档。
 */
//@ chunk-kxyd0g16.js:64302-67217 placement
var MemoryListTool = buildTool({
  name: MEMORY_LIST_TOOL_NAME,
  searchHint: "list the memory stores and the documents in them",
  shouldDefer: !1,
  backgrounding: "never",
  maxResultSizeChars: 1 / 0,
  async description() {
    return MEMORY_LIST_DESCRIPTION;
  },
  async prompt() {
    return joined;
  },
  get inputSchema() {
    return Ps();
  },
  get outputSchema() {
    return zs();
  },
  userFacingName() {
    return MEMORY_LIST_TOOL_NAME;
  },
  isEnabled() {
    return _Pe();
  },
  isReadOnly() {
    return !0;
  },
  isConcurrencySafe() {
    return !0;
  },
  toAutoClassifierInput(e) {
    return `list ${e.store ?? "stores"} ${e.path_prefix ?? ""}`.trim();
  },
  renderToolUseMessage(e) {
    return URe(e.store, e.path_prefix);
  },
  extractSearchText() {
    return "";
  },
  getActivityDescription() {
    return "Listing memory documents";
  },
  create() {
    return {
      async call({ store: e, path_prefix: r, cursor: n }, { signal: s }) {
        if (e === void 0) {
          let y = checkMemoryToolsAllowed();
          if (y)
            return (
              w6("stores", `refused_${y.reason}`),
              { data: { outcome: "refused", reason: y.reason, message: y.message }, ...UEt(y) }
            );
          let k = iVr(),
            w = describeMemoryStores(k),
            S = k2o(k);
          if (w.length === 0) w6("stores", S ? "stores_connecting" : "stores_none");
          else BEt("stores", "none");
          return { data: { outcome: "ok", stores: w, ...(S && { message: v2o }) } };
        }
        let f = resolveMemoryStore({ storeId: e });
        if (f.outcome === "refused")
          return (
            w6("list", `refused_${f.reason}`),
            { data: { outcome: "refused", reason: f.reason, message: f.message }, ...UEt(f) }
          );
        let { kind: kind } = f.served;
        try {
          let y = r === void 0 ? void 0 : Pk(r),
            k =
              r === void 0 || y === void 0
                ? null
                : (checkAbsoluteMemoryPath(r, f.served.promptIndex) ??
                  validateMemoryPath(y, { trailingSlashAllowed: !0 }));
          if (k)
            return (
              w6("list", `refused_${k.reason}`, kind),
              { data: { outcome: "refused", reason: k.reason, message: k.message } }
            );
          let w = y === void 0 || y === "/" ? void 0 : y.endsWith("/") ? y : `${y}/`,
            S = await f.backend.list(w, { signal: s }).catch((x) => {
              if (x instanceof MemoryNotFoundError && x.kind === "store") return [];
              throw x;
            });
          if (s.aborted) throw new AbortError();
          let sorted = S.filter((x) => $Js(x.path)).sort((x, B) =>
              x.path < B.path ? -1 : x.path > B.path ? 1 : 0,
            ),
            I = n === void 0 ? sorted : sorted.filter((x) => x.path > n),
            sliced = I.slice(0, MemoryListInputSchema);
          return (
            BEt("list", kind),
            {
              data: {
                outcome: "ok",
                store_kind: kind,
                entries: sliced.map((x) => ({ path: x.path, bytes: x.sizeBytes, updatedAt: x.updatedAt })),
                remaining: I.length - sliced.length,
              },
            }
          );
        } catch (error) {
          if (s.aborted) throw new AbortError();
          let k = t2t("list", error);
          return { data: { outcome: "failed", reason: k.reason, message: k.message } };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, r) {
    if (e.outcome !== "ok")
      return {
        tool_use_id: r,
        type: "tool_result",
        is_error: !0,
        content: e.message ?? `${MEMORY_LIST_TOOL_NAME} failed: ${e.reason}`,
      };
    if (e.stores !== void 0)
      return {
        tool_use_id: r,
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
                e.message === void 0
                  ? ""
                  : `
${e.message}`
              }`,
      };
    let n = e.entries ?? [];
    if (n.length === 0) return { tool_use_id: r, type: "tool_result", content: "(empty)" };
    let s = e.remaining ?? 0,
      f =
        s > 0
          ? `
\u2026 ${s} more \u2014 call again with cursor=${JSON.stringify(n.at(-1)?.path ?? "")} to continue.`
          : "";
    return {
      tool_use_id: r,
      type: "tool_result",
      content: `${r2t(e.store_kind)}

${n.map(formatMemoryDocEntry).join(`
`)}${f}`,
    };
  },
});

export { MemoryListTool };
