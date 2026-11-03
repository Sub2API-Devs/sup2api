/**
 * services/taskFiles/taskFileReadSchema.ts
 *
 * 2.1.316 新增：任务文件可读性检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pf54t43m.js (3)
 * attribution: placement 3
 */
import { isUtf8 } from "buffer";
import { REPO_RULES_UNREAD } from "../mcpServe/uploadRules.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, Ue, u, T, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { XHe } from "../mcp/inputSchemaCheck.js";
import { holdsWholeToolReadRule, attachableFileAt } from "./taskFileUpload.js";
import { Ope } from "../../utils/permissions/sensitivePaths.js";
import { readValidatedFileWithin } from "../../utils/claudeInChrome/fileUpload.js";

/**
 * 任务文件读取的上限、拒绝码与输入输出 schema。
 */
//@ chunk-pf54t43m.js:12478-12627 placement
var TASK_FILE_READ_MAX_BYTES = 1048576,
  READ_REFUSAL_CODES = ["over_the_cap", "refused", REPO_RULES_UNREAD],
  READ_INPUT_SCHEMA = DoctorLazy(() => zodStrictObject({ path: o().min(1).max(XHe) })),
  READ_OUTPUT_SCHEMA = DoctorLazy(() =>
    Ue([u({ ok: T(!0), text: o() }), u({ ok: T(!1), code: U(READ_REFUSAL_CODES) })]),
  );
/**
 * 读取任务文件：校验路径，返回 read 或 not read 及原因。
 */
//@ chunk-pf54t43m.js:12627-12811 placement
async function readTaskFileTool(a, i, n, e) {
  let { path: path } = READ_INPUT_SCHEMA().parse(a),
    t = e === REPO_RULES_UNREAD ? e : await checkTaskFileReadable(path, i, n, e);
  return {
    summary: typeof t === "string" ? `not read: ${t}` : "read",
    output: typeof t === "string" ? { ok: !1, code: t } : t,
  };
}
//@ chunk-pf54t43m.js:12811-13101 placement
async function checkTaskFileReadable(a, i, n, e) {
  if (e !== void 0 && holdsWholeToolReadRule(e)) return "refused";
  let r = await attachableFileAt(a, i, n, e);
  if (r === void 0 || (await Ope(a, r))) return "refused";
  let t = await readValidatedFileWithin(r, TASK_FILE_READ_MAX_BYTES);
  if (!("buf" in t)) return t.refusal === "too_large" ? "over_the_cap" : "refused";
  return isUtf8(t.buf) ? { ok: !0, text: t.buf.toString("utf8") } : "refused";
}
