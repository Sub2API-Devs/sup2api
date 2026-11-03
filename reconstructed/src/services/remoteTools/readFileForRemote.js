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
import { u, o, E, U, M, T } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_DIRECTORY_PATH_LENGTH,
  safeSerializedPermissionContextSchema,
  PV,
} from "../../utils/permissions/permissionContextSerialization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { readFileForRemote } from "./remoteFileRead.js";
import { buildNativeDoctorDiagnostics, Lgt } from "../../screens/Doctor.js";
import { xo } from "../../bootstrap/sessionSlices.js";
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
import { Avr } from "./runPluginHook.js";
import {
  applyPermissionRulesToPermissionContext,
  getDenyRuleForTool,
  getAskRuleForTool,
} from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE } from "../../utils/permissions/filesystem.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-q2swdab7.js:804-1124 placement
var READFILEFORREMOTE = "ReadFileForRemote",
  pZt = 4194304,
  g = 3000000,
  d = DoctorLazy(() =>
    u({
      path: o().max(MAX_DIRECTORY_PATH_LENGTH),
      max_bytes: E().optional(),
      encoding: U(["utf-8", "base64"]).optional(),
    }),
  ),
  f = DoctorLazy(() => d().extend({ permission_context: safeSerializedPermissionContextSchema() }).strict()),
  D = DoctorLazy(() =>
    u({
      file: u({
        contents: o().refine(m),
        truncated: M().optional(),
        encoding: T("base64").optional(),
      }).optional(),
    }),
  );
/**
 * 远程调用"读文件"：用启动时权限上下文合并当前策略/用户/项目设置的拒绝与询问规则，在这些规则与工作目录限制下读取文件（有大小上限），返回文本或"read denied"。
 */
//@ chunk-q2swdab7.js:1124-1746 placement
async function serveReadFileForRemote(input, c, context) {
  if (isPlainObject(input) && PV(input.permission_context)) throw Error("permission_context is too large");
  let {
      permission_context: permission_context,
      path: path,
      max_bytes: max_bytes,
      encoding: encoding,
    } = f().parse(input),
    i = context.launchPermissionContext && remoteReadPermissionContext(context.launchPermissionContext),
    s =
      i &&
      (await readFileForRemote(
        path,
        max_bytes && Math.min(max_bytes, g),
        {
          ...buildNativeDoctorDiagnostics(permission_context, i, xo(context.session).originalCwd),
          ...(i.blockReadsOutsideWorkingDirectories && { blockReadsOutsideWorkingDirectories: !0 }),
        },
        { encoding: encoding, telemetrySource: "headless_stream" },
      ).catch(() => {
        return;
      }));
  if (s && !m(s.contents)) throw Error("the file is too large to send back as text");
  return { summary: s ? `${s.contents.length} characters` : "read denied", output: { file: s } };
}
/**
 * 构造远程读文件所用的权限上下文：从各来源设置文件重新读取规则（只取 deny/ask），若对读探针存在拒绝或询问规则则返回 undefined（不允许远程读）。
 */
//@ chunk-q2swdab7.js:1746-2323 placement
function remoteReadPermissionContext(launchContext) {
  let c = [...getPolicySettingsLoadErrors()],
    r = getPermissionRulesForSource("policySettings"),
    l = [getSettingsForSource("policySettings")];
  for (let [t, a] of [
    ["userSettings", getSettingsFilePathForSource("userSettings")],
    ["projectSettings", getSettingsFilePathForSource("projectSettings")],
    ["localSettings", getSettingsFilePathForSource("localSettings")],
    ["localSettings", getLegacyLocalSettingsFilePath()],
  ])
    if (a !== void 0) {
      let i = parseSettingsFileUncached(a);
      (c.push(...i.errors), r.push(...settingsJsonToRules(i.settings, t)), l.push(i.settings));
    }
  if ((logSkippedInvalidSetting(Lgt(c).slice(0, 10)), Avr())) return;
  let n = applyPermissionRulesToPermissionContext(
    launchContext,
    r.filter((t) => t.ruleBehavior !== "allow"),
    { announce: !1 },
  );
  return getDenyRuleForTool(n, READ_PATH_PROBE) || getAskRuleForTool(n, READ_PATH_PROBE)
    ? void 0
    : {
        ...n,
        blockReadsOutsideWorkingDirectories: l.some(
          (t) => t?.permissions?.blockReadsOutsideWorkingDirectories,
        ),
      };
}
//@ chunk-q2swdab7.js:2323-2388 placement
function m(e) {
  return e.length <= pZt && Buffer.byteLength(jsonStringify(e)) <= pZt;
}

export { remoteReadPermissionContext, pZt, READFILEFORREMOTE, serveReadFileForRemote };
