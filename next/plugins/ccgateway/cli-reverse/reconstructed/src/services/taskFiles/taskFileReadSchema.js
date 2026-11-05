/**
 * services/taskFiles/taskFileReadSchema.ts
 *
 * 2.1.316 新增：任务文件可读性检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yd5j3nzk.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isUtf8 } from "buffer";
import { REPO_RULES_UNREAD } from "../mcpServe/uploadRules.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  union,
  objectSchema,
  literal,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_FILE_PATH_CHARS } from "../mcp/inputSchemaCheck.js";
import { holdsWholeToolReadRule, attachableFileAt } from "./taskFileUpload.js";
import { isCredentialPath } from "../../utils/permissions/sensitivePaths.js";
import { readValidatedFileWithin } from "../../utils/claudeInChrome/fileUpload.js";

//@ chunk-yd5j3nzk.js:13659-13808 placement
/**
 * 任务文件读取的上限、拒绝码与输入输出 schema。
 */
var TASK_FILE_READ_MAX_BYTES = 1048576;
var READ_REFUSAL_CODES = ["over_the_cap", "refused", REPO_RULES_UNREAD];
var READ_INPUT_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    path: stringSchema().min(1).max(MAX_FILE_PATH_CHARS),
  }),
);
var READ_OUTPUT_SCHEMA = DoctorLazy(() =>
  union([
    objectSchema({
      ok: literal(true),
      text: stringSchema(),
    }),
    objectSchema({
      ok: literal(false),
      code: _enum(READ_REFUSAL_CODES),
    }),
  ]),
);
//@ chunk-yd5j3nzk.js:13808-13992 placement
/**
 * 读取任务文件：校验路径，返回 read 或 not read 及原因。
 */
async function readTaskFileTool(input, sessionCtx, host, permissionCtx) {
  let { path } = READ_INPUT_SCHEMA().parse(input);
  let readResult =
    permissionCtx === REPO_RULES_UNREAD
      ? permissionCtx
      : await checkTaskFileReadable(path, sessionCtx, host, permissionCtx);
  return {
    summary: typeof readResult === "string" ? `not read: ${readResult}` : "read",
    output:
      typeof readResult === "string"
        ? {
            ok: false,
            code: readResult,
          }
        : readResult,
  };
}
//@ chunk-yd5j3nzk.js:13992-14282 placement
async function checkTaskFileReadable(requestedPath, sessionCtx, host, permissionCtx) {
  if (permissionCtx !== undefined && holdsWholeToolReadRule(permissionCtx)) return "refused";
  let attachedPath = await attachableFileAt(requestedPath, sessionCtx, host, permissionCtx);
  if (attachedPath === undefined || (await isCredentialPath(requestedPath, attachedPath))) return "refused";
  let validatedFileWithin = await readValidatedFileWithin(attachedPath, TASK_FILE_READ_MAX_BYTES);
  if (!("buf" in validatedFileWithin))
    return validatedFileWithin.refusal === "too_large" ? "over_the_cap" : "refused";
  return isUtf8(validatedFileWithin.buf)
    ? {
        ok: true,
        text: validatedFileWithin.buf.toString("utf8"),
      }
    : "refused";
}
export { readTaskFileTool };
