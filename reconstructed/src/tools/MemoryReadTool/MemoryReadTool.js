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
import { zodStrictObject, o, u, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ } from "../MemoryTool/memoryToolNames.js";
import {
  xVe,
  resolveMemoryStore,
  UEt,
  checkAbsoluteMemoryPath,
} from "../../services/memoryStore/memoryDocumentFs.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  BJs,
  joined_2 as joined_2_2,
  URe,
  w6,
  validateMemoryPath,
  aVr,
  Chn,
  BEt,
  hNe,
  t2t,
  r2t,
  lVr,
} from "../MemoryTool/memoryWrite.js";
import { _Pe } from "../../services/memorySync/availability.js";
import { Pk } from "../../services/orgMemory/storeApi.js";
import { AbortError as AbortError_2 } from "../../utils/errors.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";

/**
 * MemoryRead 的输入 schema（store、path）与输出 schema（outcome、path、store_kind、content 等）。
 */
//@ chunk-e6aww6q8.js:1460606-1461075 placement
var memoryReadInputSchema = DoctorLazy(() =>
    zodStrictObject({
      store: o().describe(
        `Id of the memory store to read from (call ${MEMORY_LIST_TOOL_NAME} with no arguments to see the stores available in this session).`,
      ),
      path: o().describe("Path of the memory document to read (e.g. /MEMORY.md)."),
    }),
  ),
  O9t = DoctorLazy(() =>
    u({
      outcome: U(["ok", "not_found", "refused", "failed"]),
      path: o(),
      store_kind: U(["personal", "project"]).optional(),
      content: o().optional(),
      updatedAt: o().optional(),
      version: o().optional(),
      reason: o().optional(),
      message: o().optional(),
    }),
  );
/**
 * 若 MemoryRead 结果成功且来自个人存储，返回对应的本地路径，否则 null。
 */
//@ chunk-e6aww6q8.js:1461075-1461210 placement
function personalMemoryReadPath(e) {
  let safeParse = O9t().safeParse(e);
  return safeParse.success && safeParse.data.outcome === "ok" && safeParse.data.store_kind === "personal"
    ? xVe(safeParse.data.path)
    : null;
}
/**
 * MemoryReadTool：从记忆存储读取文档的工具定义。
 */
//@ chunk-e6aww6q8.js:1461210-1463370 placement
var MemoryReadTool = buildTool({
  name: MEMORY_READ,
  searchHint: "read a document from a memory store",
  shouldDefer: !1,
  backgrounding: "never",
  maxResultSizeChars: 1 / 0,
  async description() {
    return BJs;
  },
  async prompt() {
    return joined_2_2;
  },
  get inputSchema() {
    return memoryReadInputSchema();
  },
  get outputSchema() {
    return O9t();
  },
  userFacingName() {
    return MEMORY_READ;
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
    return `read ${e.store}:${e.path}`;
  },
  renderToolUseMessage(e) {
    return URe(e.store, e.path);
  },
  extractSearchText() {
    return "";
  },
  getActivityDescription(e) {
    return URe("Reading memory", e?.path);
  },
  create() {
    return {
      async call({ store: e, path: n }, { signal: r }) {
        let s = resolveMemoryStore({ storeId: e });
        if (s.outcome === "refused")
          return (
            w6("read", `refused_${s.reason}`),
            { data: { outcome: "refused", path: n, reason: s.reason, message: s.message }, ...UEt(s) }
          );
        try {
          let { kind: kind } = s.served,
            y = Pk(n),
            S = checkAbsoluteMemoryPath(n, s.served.promptIndex) ?? validateMemoryPath(y);
          if (S)
            return (
              w6("read", `refused_${S.reason}`, kind),
              { data: { outcome: "refused", path: y, reason: S.reason, message: S.message } }
            );
          let w = s.backend.readByPath ? await s.backend.readByPath(y, { signal: r }) : null;
          if (r.aborted) throw new AbortError_2();
          if (w === null)
            return (w6("read", "read_not_found", kind), { data: { outcome: "not_found", path: y } });
          if (aVr(w.content))
            return (
              w6("read", "refused_too_large", kind),
              {
                data: {
                  outcome: "refused",
                  path: y,
                  reason: "too_large",
                  message: `"${y}" is ${Buffer.byteLength(w.content, "utf8")} bytes, over the ${Chn}-byte read cap, so its content is not returned.`,
                },
              }
            );
          return (
            BEt("read", kind),
            {
              data: {
                outcome: "ok",
                path: y,
                store_kind: kind,
                content: normalizeMemoryText(w.content),
                updatedAt: w.updatedAt,
                version: hNe(w.content),
              },
            }
          );
        } catch (error) {
          if (r.aborted) throw new AbortError_2();
          let y = t2t("read", error);
          return { data: { outcome: "failed", path: Pk(n), reason: y.reason, message: y.message } };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, n) {
    switch (e.outcome) {
      case "ok":
        return {
          tool_use_id: n,
          type: "tool_result",
          content: `${r2t(e.store_kind)}
[updated: ${e.updatedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "unknown"}] [version: ${e.version ?? ""}]${lVr}
${e.content ?? ""}`,
        };
      case "not_found":
        return {
          tool_use_id: n,
          type: "tool_result",
          is_error: !0,
          content: `${MEMORY_READ} failed: not found`,
        };
      case "refused":
      case "failed":
        return {
          tool_use_id: n,
          type: "tool_result",
          is_error: !0,
          content: e.message ?? `${MEMORY_READ} failed: ${e.reason}`,
        };
    }
  },
});

export { MemoryReadTool, personalMemoryReadPath };
