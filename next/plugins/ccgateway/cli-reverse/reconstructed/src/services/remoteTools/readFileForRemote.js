/**
 * services/remoteTools/readFileForRemote.ts
 *
 * 2.1.316 新增。为远程读取文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s0hesbce.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  _enum,
  booleanSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
  findAskRuleForTool,
} from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE } from "../../utils/permissions/filesystem.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-s0hesbce.js:804-1145 placement
/**
 * 远程读文件（ReadFileForRemote）的工具名、大小上限与三个 schema（输入、带权限上下文、结果）。
 */
var READFILEFORREMOTE = "ReadFileForRemote";
var MAX_REMOTE_READ_BYTES = 4194304;
var MAX_REMOTE_READ_SERVE_BYTES = 3000000;
var remoteReadInputSchema = DoctorLazy(() =>
  objectSchema({
    path: stringSchema().max(MAX_DIRECTORY_PATH_LENGTH),
    max_bytes: numberSchema().optional(),
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
  objectSchema({
    file: objectSchema({
      contents: stringSchema().refine(isWithinSizeLimit),
      truncated: booleanSchema().optional(),
      encoding: literal("base64").optional(),
      lossy: booleanSchema().optional(),
    }).optional(),
  }),
);
//@ chunk-s0hesbce.js:1145-1767 placement
/**
 * 远程调用"读文件"：用启动时权限上下文合并当前策略/用户/项目设置的拒绝与询问规则，在这些规则与工作目录限制下读取文件（有大小上限），返回文本或"read denied"。
 */
async function serveReadFileForRemote(input, signal, context) {
  if (isPlainObject(input) && exceedsSerializedContextLimit(input.permission_context))
    throw Error("permission_context is too large");
  let {
    permission_context: permissionContext,
    path,
    max_bytes: maxBytes,
    encoding,
  } = remoteReadWithContextInputSchema().parse(input);
  let launchContext =
    context.launchPermissionContext && remoteReadPermissionContext(context.launchPermissionContext);
  let read =
    launchContext &&
    (await readFileForRemote(
      path,
      maxBytes && Math.min(maxBytes, MAX_REMOTE_READ_SERVE_BYTES),
      {
        ...buildNativeDoctorDiagnostics(
          permissionContext,
          launchContext,
          getSessionProject(context.session).originalCwd,
        ),
        ...(launchContext.blockReadsOutsideWorkingDirectories && {
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
  if (read && !isWithinSizeLimit(read.contents)) throw Error("the file is too large to send back as text");
  return {
    summary: read ? `${read.contents.length} characters` : "read denied",
    output: {
      file: read,
    },
  };
}
//@ chunk-s0hesbce.js:1767-2344 placement
/**
 * 构造远程读文件所用的权限上下文：从各来源设置文件重新读取规则（只取 deny/ask），若对读探针存在拒绝或询问规则则返回 undefined（不允许远程读）。
 */
function remoteReadPermissionContext(launchContext) {
  let error = [...getPolicySettingsLoadErrors()];
  let permissionRulesForSource = getPermissionRulesForSource("policySettings");
  let policySettingsList = [getSettingsForSource("policySettings")];
  for (let [source, filePath] of [
    ["userSettings", getSettingsFilePathForSource("userSettings")],
    ["projectSettings", getSettingsFilePathForSource("projectSettings")],
    ["localSettings", getSettingsFilePathForSource("localSettings")],
    ["localSettings", getLegacyLocalSettingsFilePath()],
  ])
    if (filePath !== undefined) {
      let settingsFileUncached = parseSettingsFileUncached(filePath);
      error.push(...settingsFileUncached.errors);
      permissionRulesForSource.push(...settingsJsonToRules(settingsFileUncached.settings, source));
      policySettingsList.push(settingsFileUncached.settings);
    }
  logSkippedInvalidSetting(isReportableDiagnostic(error).slice(0, 10));
  if (policyLoadFailureRefusesPluginHooks()) return;
  let context = applyPermissionRulesToPermissionContext(
    launchContext,
    permissionRulesForSource.filter((rule) => rule.ruleBehavior !== "allow"),
    {
      announce: false,
    },
  );
  return getDenyRuleForTool(context, READ_PATH_PROBE) || findAskRuleForTool(context, READ_PATH_PROBE)
    ? undefined
    : {
        ...context,
        blockReadsOutsideWorkingDirectories: policySettingsList.some(
          (settings) => settings?.permissions?.blockReadsOutsideWorkingDirectories,
        ),
      };
}
//@ chunk-s0hesbce.js:2344-2409 placement
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
