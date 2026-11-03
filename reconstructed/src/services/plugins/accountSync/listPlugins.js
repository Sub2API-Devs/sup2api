/**
 * services/plugins/accountSync/listPlugins.ts
 *
 * 2.1.316 新增：账号插件同步：列出账号插件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (22)
 * attribution: placement 22
 */
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { open, open as open_2, rm, writeFile } from "fs/promises";
import { wrr, Hee, sJ } from "./syncedPluginHooks.js";
import { logForDiagnosticsNoPII } from "../../../utils/diagLogs.js";
import {
  classifyAxiosError,
  sanitizedConnectionCodeForTelemetry,
  getErrnoCode,
} from "../../../utils/errors.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { EJr, vJr } from "../../../utils/plugins/marketplaceNames.js";
import { tn, convertSyncedPluginHooks, ge } from "./syncedHookSchema.js";
import { Oxe } from "../../../utils/plugins/commandSource.js";
import { env } from "../../../utils/env.js";
import { sleep } from "../../../utils/sleep.js";
import { pluginsScopeGate } from "./pluginsScopeGate.js";
import { apiClient } from "../../routines/routinesApi.js";
import { policyDenyKind } from "../../policyLimits/policyVerdicts.js";
import { getPluginsSyncVetoed } from "../../../bootstrap/state.js";
import { isRemoteOrCowork } from "../../../skills/skillSources.js";
import { ccrSessionIdForRefs } from "../../../utils/claudeAiSync/sessionRefsGate.js";

/**
 * 把账号技能/插件列表请求的失败响应归类：未认证、被拦、服务端错误信封（带错误类型与状态码）或格式不符。
 */
//@ chunk-f9asxqh1.js:11800-12359 placement
function listErrorResult(kind, response) {
  if (!response.ok)
    return response.reason === "no-auth"
      ? { success: !1, error: response.detail, kind: "no_auth" }
      : { success: !1, error: response.reason, kind: "gated" };
  let errorType = wrr().safeParse(response.data);
  if (errorType.success) {
    let r = errorType.data.error.type ?? "error_envelope_no_type";
    return (
      logForDiagnosticsNoPII(
        "warn",
        kind === "skills" ? "skills_sync_list_error" : "plugins_sync_list_error",
        { serverError: r, status: response.status },
      ),
      { success: !1, error: r, kind: "server_error", status: response.status }
    );
  }
  return (
    logForDiagnosticsNoPII(
      "warn",
      kind === "skills" ? "skills_sync_list_malformed" : "plugins_sync_list_malformed",
    ),
    { success: !1, error: `malformed list-${kind} response`, kind: "malformed" }
  );
}
/**
 * 把列表请求的网络异常转换为失败结果：错误类别、消息与可上报的 errno。
 */
//@ chunk-f9asxqh1.js:12359-12474 placement
function transportErrorResult(e) {
  let { kind: kind, message: message } = classifyAxiosError(e),
    r = sanitizedConnectionCodeForTelemetry(getErrnoCode(e));
  return { success: !1, error: message, kind: kind, ...(r !== void 0 && { errno: r }) };
}
/**
 * 生成列表失败的遥测字段：失败类别，以及可选的状态码与 errno。
 */
//@ chunk-f9asxqh1.js:12633-12749 placement
function listErrorTelemetry(e) {
  return {
    kind: fromEnum(e.kind),
    ...(e.status !== void 0 && { status: e.status }),
    ...(e.errno !== void 0 && { errno: e.errno }),
  };
}
/**
 * 从响应体前 2KB 里解析错误信封的错误类型，不是 JSON 时返回 non_json_body。
 */
//@ chunk-f9asxqh1.js:12840-13006 placement
function errorTypeFromBody(e) {
  try {
    let safeParse = wrr().safeParse(jsonParse(e.toString("utf8", 0, 2048)));
    if (safeParse.success) return safeParse.data.error.type ?? "error_envelope_no_type";
  } catch {}
  return "non_json_body";
}
/**
 * 把服务端插件条目转换为本地行：id、名称、版本、更新时间、市场名、安装偏好、市场类型、presents_as；需要时附带校验过的组件列表与 plugin.json 名称。
 */
//@ chunk-f9asxqh1.js:15123-15890 placement
function toAccountPluginRow(raw, { components: components = !1 } = {}) {
  let installationPreference = EJr(raw.installation_preference),
    marketplaceKind = vJr(raw.marketplace_kind);
  return {
    pluginId: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    version: raw.version ?? null,
    updatedAt: raw.updated_at ?? null,
    ...(typeof raw.marketplace_name === "string" &&
      raw.marketplace_name && { marketplaceName: raw.marketplace_name }),
    ...(installationPreference && { installationPreference: installationPreference }),
    ...(marketplaceKind && { marketplaceKind: marketplaceKind }),
    ...(typeof raw.presents_as === "string" && raw.presents_as && { presentsAs: raw.presents_as }),
    ...(components &&
      Array.isArray(raw.components) && {
        components: raw.components.flatMap((component) => {
          let safeParse = tn().safeParse(component);
          if (!safeParse.success) return [];
          let { type: S, name: h, description: description } = safeParse.data;
          return [{ type: S, name: h, ...(description != null && { description: description }) }];
        }),
      }),
    ...(components &&
      typeof raw.plugin_json_name === "string" &&
      raw.plugin_json_name && { pluginJsonName: raw.plugin_json_name }),
  };
}
/**
 * 账号插件列表的指纹：按 [pluginId, name, version, updatedAt] 序列化每行后排序拼接，用于判断列表是否变化。
 */
//@ chunk-f9asxqh1.js:15990-16091 placement
function pluginListFingerprint(e) {
  return e.map((n) => jsonStringify([n.pluginId, n.name, n.version, n.updatedAt])).toSorted().join(`
`);
}
//@ chunk-f9asxqh1.js:16091-16137 placement
var un = 1e4,
  ne = 60000,
  Se = 500,
  ye = 100,
  Q = 20,
  ee = Oxe;
//@ chunk-f9asxqh1.js:16137-16207 placement
function dn() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS ?? ne;
}
//@ chunk-f9asxqh1.js:16207-16302 placement
var he = "/api/oauth/organizations/:orgUUID/plugins/list-plugins?enabled_only=true&compact=true";
//@ chunk-f9asxqh1.js:16302-16452 placement
var COMPONENT_DETAILS_QUERY =
    "&include_component_details=true&include_hooks=true&include_plugin_json_names=true",
  CONVERTED_SKILLS_QUERY = "&wrapped_skills_as_plugins=true",
  FIRST_PAGE_URL = Me(`${he}${COMPONENT_DETAILS_QUERY}`, 0);
//@ chunk-f9asxqh1.js:16452-16529 placement
async function pn(e) {
  let n = await e();
  if (n.ok) return n;
  return (await sleep(Se), e());
}
/**
 * 列出账号（claude.ai 组织）里的插件：分页拉取，可选附带组件详情与钩子、把技能当插件返回；结果中 required 插件排前，策略允许时解析各插件的同步钩子。
 */
//@ chunk-f9asxqh1.js:16529-17006 placement
async function listAccountPlugins(e = {}) {
  let n = await fetchPluginRowsWithRetry(
    `${he}${e.componentDetails === !0 ? COMPONENT_DETAILS_QUERY : ""}${e.convertedSkillsAsPlugins === !0 ? CONVERTED_SKILLS_QUERY : ""}`,
    e,
  );
  return n.success
    ? {
        success: !0,
        plugins: n.rows.map((row) => toAccountPluginRow(row, { components: e.componentDetails === !0 })),
        ...(n.degraded && { degraded: n.degraded }),
        ...(n.convertedSkillsAsPlugins && { convertedSkillsAsPlugins: n.convertedSkillsAsPlugins }),
        ...(e.componentDetails === !0 &&
          !isPluginHooksSyncBlocked() && {
            hooks: new Map(
              n.rows.flatMap((row) => {
                let r = kn(row) ? void 0 : convertSyncedPluginHooks(row);
                return r === void 0 ? [] : [[row.id, r]];
              }),
            ),
          }),
      }
    : n;
}
/**
 * 列出账号插件：缺少 user:plugins 作用域时直接返回，失败（非 403）时等待后重试一次。
 */
//@ chunk-f9asxqh1.js:17006-17353 placement
async function fetchPluginRowsWithRetry(e, n) {
  if ((await pluginsScopeGate(n.signal, n.credentials)) === "skip_no_scope")
    return {
      success: !1,
      error: "claude.ai login lacks the user:plugins scope in this session",
      kind: "no_scope",
    };
  let r = await fetchPluginPages(e, n);
  if (r.success || r.status === 403) return r;
  await sleep(Se);
  let f = await fetchPluginPages(e, n);
  return !f.success && Hee(f) && !Hee(r) ? { success: !1, error: f.error, kind: f.kind } : f;
}
/**
 * 逐页 GET 账号插件列表直到没有更多，合并 degraded 与 converted_skills_as_plugins 标志，超过页数上限报 page_cap；错误交给统一分类。
 */
//@ chunk-f9asxqh1.js:17353-18185 placement
async function fetchPluginPages(query, options) {
  let rows = [],
    degraded = !1,
    convertedSkills = !0;
  try {
    for (let y = 0; y < Q; y++) {
      let S = await apiClient.get(Me(query, y), {
        auth: "teleport-org",
        isBackground: options.isBackground,
        timeout: un,
        credentials: options.credentials,
        earlyAnswer: options.earlyAnswer,
      });
      if (!S.ok || !Array.isArray(S.data?.plugins)) {
        let h = listErrorResult("plugins", S);
        return y > 0 && Hee(h) ? { success: !1, error: h.error, kind: h.kind } : h;
      }
      if (
        (rows.push(...S.data.plugins.filter(ge)),
        (degraded ||= S.data.degraded === !0),
        (convertedSkills &&= S.data.converted_skills_as_plugins === !0),
        S.data.has_more !== !0)
      )
        return {
          success: !0,
          rows: [
            ...rows.filter((h) => h.installation_preference === "required"),
            ...rows.filter((h) => h.installation_preference !== "required"),
          ],
          ...(degraded && { degraded: degraded }),
          ...(convertedSkills && { convertedSkillsAsPlugins: convertedSkills }),
        };
    }
    return (
      logForDiagnosticsNoPII("warn", "plugins_sync_list_page_cap", { pages: Q, collected: rows.length }),
      { success: !1, error: `list-plugins page cap (${Q}) exceeded`, kind: "page_cap" }
    );
  } catch (error) {
    return transportErrorResult(error);
  }
}
//@ chunk-f9asxqh1.js:18185-18318 placement
function isPluginHooksSyncBlocked() {
  let e = policyDenyKind("allow_account_plugins_sync"),
    n = e === "cache_miss" || e === "route_missing";
  return (sJ(), getPluginsSyncVetoed() || (e !== null && !(n && isRemoteOrCowork())));
}
//@ chunk-f9asxqh1.js:18318-18387 placement
function kn(e) {
  return e.enabled !== !0 || e.skills_display_degraded === !0;
}
/**
 * 生成账号插件 zip 的下载路径（可带版本；Tag 场景附带默认市场参数）。
 */
//@ chunk-f9asxqh1.js:18387-18684 placement
function pluginDownloadPath(e, n) {
  let s = [];
  if (n) s.push(`version=${encodeURIComponent(n)}`);
  if (env.CLAUDE_CODE_CCR_SURFACE === "tag") s.push("included_default_marketplaces=claude-tag-plugins");
  let r = s.length > 0 ? `?${s.join("&")}` : "";
  return `/api/oauth/organizations/:orgUUID/plugins/${encodeURIComponent(e)}/download${r}`;
}
//@ chunk-f9asxqh1.js:18684-18742 placement
async function B5r(e, n, s, r = {}) {
  return pn(() => downloadPluginZip(e, n, s, r));
}
/**
 * 以流方式下载账号插件 zip：带停滞超时与字节上限，写入目标路径后检查 PK 头，不是 zip 时删除并记录服务端错误；可用环境变量改为一次性缓冲下载。
 */
//@ chunk-f9asxqh1.js:18742-20178 placement
async function downloadPluginZip(pluginId, destPath, version, options) {
  let urlPath = pluginDownloadPath(pluginId, version);
  if (env.CLAUDE_CODE_SYNC_PLUGINS_BUFFERED_DOWNLOAD)
    return downloadPluginZipBuffered(urlPath, destPath, options);
  let receivedBytes = 0,
    stalled = !1;
  try {
    let C = function () {
        ((stalled = !0), x.destroy(Error("plugin download stream stalled")));
      },
      h = await apiClient.get(urlPath, {
        auth: "teleport-org",
        isBackground: options.isBackground,
        timeout: ne,
        responseType: "stream",
        credentials: options.credentials,
      });
    if (!h.ok || !h.data) {
      let R = h.ok ? "empty_body" : h.reason;
      return (
        logForDiagnosticsNoPII("warn", "plugins_sync_download_not_ok", { reason: R }),
        { ok: !1, reason: R }
      );
    }
    let w = dn(),
      b,
      x = new Transform({
        transform(R, G, P) {
          if ((clearTimeout(b), (b = setTimeout(C, w)), (receivedBytes += R.length), receivedBytes > ee))
            P(Error("plugin zip exceeds download byte cap"));
          else P(null, R);
        },
        flush(R) {
          (clearTimeout(b), R());
        },
      });
    b = setTimeout(C, w);
    try {
      await pipeline(h.data, x, createWriteStream(destPath));
    } finally {
      clearTimeout(b);
    }
    let alloc = Buffer.alloc(2048),
      F = await open(destPath, "r"),
      O;
    try {
      O = (await F.read(alloc, 0, alloc.length, 0)).bytesRead;
    } finally {
      await F.close();
    }
    if (O < 2 || alloc[0] !== 80 || alloc[1] !== 75) {
      await rm(destPath, { force: !0 });
      let R = O === 0 ? "empty_body" : errorTypeFromBody(alloc.subarray(0, O));
      return (
        logForDiagnosticsNoPII("warn", "plugins_sync_download_not_zip", {
          serverError: R,
          bodyLen: receivedBytes,
        }),
        { ok: !1, reason: R }
      );
    }
    return { ok: !0 };
  } catch (error) {
    await rm(destPath, { force: !0 }).catch(() => {});
    let w = error?.response?.data;
    if (w !== null && typeof w === "object" && "destroy" in w && typeof w.destroy === "function") w.destroy();
    let b = error !== null && typeof error === "object" && "code" in error ? error.code : void 0,
      x = stalled
        ? "timeout"
        : receivedBytes > ee
          ? "too_large"
          : b === "ECONNRESET" || b === "EPIPE" || b === "ETIMEDOUT"
            ? "network"
            : classifyAxiosError(error).kind;
    return (
      logForDiagnosticsNoPII("warn", "plugins_sync_download_exception", { kind: x }),
      { ok: !1, reason: x }
    );
  }
}
/**
 * 一次性缓冲下载账号插件 zip：检查 PK 头，不是 zip 时记录服务端错误类型，成功则写入目标文件。
 */
//@ chunk-f9asxqh1.js:20178-20826 placement
async function downloadPluginZipBuffered(urlPath, destPath, options) {
  try {
    let r = await apiClient.get(urlPath, {
      auth: "teleport-org",
      isBackground: options.isBackground,
      timeout: ne,
      responseType: "arraybuffer",
      maxContentLength: ee,
      credentials: options.credentials,
    });
    if (!r.ok || !r.data) {
      let y = r.ok ? "empty_body" : r.reason;
      return (
        logForDiagnosticsNoPII("warn", "plugins_sync_download_not_ok", { reason: y }),
        { ok: !1, reason: y }
      );
    }
    let buffer = Buffer.from(r.data);
    if (buffer.length < 2 || buffer[0] !== 80 || buffer[1] !== 75) {
      let y = buffer.length === 0 ? "empty_body" : errorTypeFromBody(buffer);
      return (
        logForDiagnosticsNoPII("warn", "plugins_sync_download_not_zip", {
          serverError: y,
          bodyLen: buffer.length,
        }),
        { ok: !1, reason: y }
      );
    }
    return (await writeFile(destPath, buffer), { ok: !0 });
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    return (
      logForDiagnosticsNoPII("warn", "plugins_sync_download_exception", { kind: kind }),
      { ok: !1, reason: kind }
    );
  }
}
//@ chunk-f9asxqh1.js:20826-20883 placement
function Me(e, n) {
  return `${e}&limit=${ye}&offset=${n * ye}`;
}
//@ chunk-f9asxqh1.js:21047-21085 placement
function Sn(e) {
  return ccrSessionIdForRefs(e) !== void 0;
}

export {
  B5r,
  pluginDownloadPath,
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
  Sn,
  listErrorResult,
  transportErrorResult,
  errorTypeFromBody,
};
