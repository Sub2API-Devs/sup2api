/**
 * services/remoteTools/readFileForRemote.ts
 *
 * 2.1.316 新增。为远程读取文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q2swdab7.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, _enum, M, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_DIRECTORY_PATH_LENGTH,
  safeSerializedPermissionContextSchema,
  exceedsSerializedContextLimit,
} from "../../utils/permissions/permissionContextSerialization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { readFileForRemote } from "./remoteFileRead.js";
import { buildNativeDoctorDiagnostics, isReportableDiagnostic } from "../../screens/Doctor.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import {
  getPolicySettingsLoadErrors,
  getSettingsForSource,
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  parseSettingsFileUncached,
} from "../../utils/settings/settings.js";
import {
  getPermissionRulesForSource,
  settingsJsonToRules,
} from "../../utils/permissions/permissionsLoader.js";
import { logSkippedInvalidSetting } from "../../utils/settings/settingsErrorsHeadless.js";
import { policyLoadFailureRefusesPluginHooks } from "./runPluginHook.js";
import {
  applyPermissionRulesToPermissionContext,
  getDenyRuleForTool,
  getAskRuleForTool,
} from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE } from "../../utils/permissions/filesystem.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-q2swdab7.js:804-1124 placement
/**
 * 远程读文件（ReadFileForRemote）的工具名、大小上限与三个 schema（输入、带权限上下文、结果）。
 */
var READFILEFORREMOTE = "ReadFileForRemote";
var MAX_REMOTE_READ_BYTES = 4194304;
var MAX_REMOTE_READ_SERVE_BYTES = 3000000;
var remoteReadInputSchema = DoctorLazy(() =>
  u({
    path: string().max(MAX_DIRECTORY_PATH_LENGTH),
    max_bytes: E().optional(),
    encoding: _enum(["utf-8", "base64"]).optional(),
  }),
);
var remoteReadWithContextInputSchema = DoctorLazy(() =>
  remoteReadInputSchema()
    .extend({
      permission_context: safeSerializedPermissionContextSchema(),
    })
    .strict(),
);
var remoteReadResultSchema = DoctorLazy(() =>
  u({
    file: u({
      contents: string().refine(isWithinSizeLimit),
      truncated: M().optional(),
      encoding: literal("base64").optional(),
    }).optional(),
  }),
);
//@ chunk-q2swdab7.js:1124-1746 placement
/**
 * 远程调用"读文件"：用启动时权限上下文合并当前策略/用户/项目设置的拒绝与询问规则，在这些规则与工作目录限制下读取文件（有大小上限），返回文本或"read denied"。
 */
async function serveReadFileForRemote(input, c, context) {
  if (isPlainObject(input) && exceedsSerializedContextLimit(input.permission_context))
    throw Error("permission_context is too large");
  let {
    permission_context: permissionContext,
    path,
    max_bytes: maxBytes,
    encoding,
  } = remoteReadWithContextInputSchema().parse(input);
  let i = context.launchPermissionContext && remoteReadPermissionContext(context.launchPermissionContext);
  let s =
    i &&
    (await readFileForRemote(
      path,
      maxBytes && Math.min(maxBytes, MAX_REMOTE_READ_SERVE_BYTES),
      {
        ...buildNativeDoctorDiagnostics(permissionContext, i, getSessionProject(context.session).originalCwd),
        ...(i.blockReadsOutsideWorkingDirectories && {
          blockReadsOutsideWorkingDirectories: true,
        }),
      },
      {
        encoding,
        telemetrySource: "headless_stream",
      },
    ).catch(() => {
      return;
    }));
  if (s && !isWithinSizeLimit(s.contents)) throw Error("the file is too large to send back as text");
  return {
    summary: s ? `${s.contents.length} characters` : "read denied",
    output: {
      file: s,
    },
  };
}
//@ chunk-q2swdab7.js:1746-2323 placement
/**
 * 构造远程读文件所用的权限上下文：从各来源设置文件重新读取规则（只取 deny/ask），若对读探针存在拒绝或询问规则则返回 undefined（不允许远程读）。
 */
function remoteReadPermissionContext(launchContext) {
  let error = [...getPolicySettingsLoadErrors()];
  let permissionRulesForSource = getPermissionRulesForSource("policySettings");
  let l = [getSettingsForSource("policySettings")];
  for (let [t, a] of [
    ["userSettings", getSettingsFilePathForSource("userSettings")],
    ["projectSettings", getSettingsFilePathForSource("projectSettings")],
    ["localSettings", getSettingsFilePathForSource("localSettings")],
    ["localSettings", getLegacyLocalSettingsFilePath()],
  ])
    if (a !== undefined) {
      let settingsFileUncached = parseSettingsFileUncached(a);
      error.push(...settingsFileUncached.errors);
      permissionRulesForSource.push(...settingsJsonToRules(settingsFileUncached.settings, t));
      l.push(settingsFileUncached.settings);
    }
  logSkippedInvalidSetting(isReportableDiagnostic(error).slice(0, 10));
  if (policyLoadFailureRefusesPluginHooks()) return;
  let n = applyPermissionRulesToPermissionContext(
    launchContext,
    permissionRulesForSource.filter((t) => t.ruleBehavior !== "allow"),
    {
      announce: false,
    },
  );
  return getDenyRuleForTool(n, READ_PATH_PROBE) || getAskRuleForTool(n, READ_PATH_PROBE)
    ? undefined
    : {
        ...n,
        blockReadsOutsideWorkingDirectories: l.some(
          (t) => t?.permissions?.blockReadsOutsideWorkingDirectories,
        ),
      };
}
//@ chunk-q2swdab7.js:2323-2388 placement
/**
 * 判断文本长度与其 JSON 字节数是否都在远程读上限内。
 */
function isWithinSizeLimit(contents) {
  return (
    contents.length <= MAX_REMOTE_READ_BYTES &&
    Buffer.byteLength(jsonStringify(contents)) <= MAX_REMOTE_READ_BYTES
  );
}
export { remoteReadPermissionContext, MAX_REMOTE_READ_BYTES, READFILEFORREMOTE, serveReadFileForRemote };
