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
import { open, rm, writeFile } from "fs/promises";
import { errorEnvelopeSchema, isNotFoundServerError, refreshSyncVeto } from "./syncedPluginHooks.js";
import { logForDiagnosticsNoPII } from "../../../utils/diagLogs.js";
import {
  classifyAxiosError,
  sanitizedConnectionCodeForTelemetry,
  getErrnoCode,
} from "../../../utils/errors.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { parsePluginAvailability, parsePluginOriginKind } from "../../../utils/plugins/marketplaceNames.js";
import { syncedHookEntrySchema, convertSyncedPluginHooks, isEnabledEntry } from "./syncedHookSchema.js";
import { MAX_SPILL_BYTES } from "../../../utils/plugins/commandSource.js";
import { env } from "../../../utils/env.js";
import { sleep } from "../../../utils/sleep.js";
import { pluginsScopeGate } from "./pluginsScopeGate.js";
import { apiClient } from "../../routines/routinesApi.js";
import { policyDenyKind } from "../../policyLimits/policyVerdicts.js";
import { getPluginsSyncVetoed } from "../../../bootstrap/state.js";
import { isRemoteOrCowork } from "../../../skills/skillSources.js";
import { ccrSessionIdForRefs } from "../../../utils/claudeAiSync/sessionRefsGate.js";

//@ chunk-f9asxqh1.js:11800-12359 placement
/**
 * 把账号技能/插件列表请求的失败响应归类：未认证、被拦、服务端错误信封（带错误类型与状态码）或格式不符。
 */
function listErrorResult(kind, response) {
  if (!response.ok)
    return response.reason === "no-auth"
      ? {
          success: false,
          error: response.detail,
          kind: "no_auth",
        }
      : {
          success: false,
          error: response.reason,
          kind: "gated",
        };
  let errorType = errorEnvelopeSchema().safeParse(response.data);
  if (errorType.success) {
    let r = errorType.data.error.type ?? "error_envelope_no_type";
    logForDiagnosticsNoPII("warn", kind === "skills" ? "skills_sync_list_error" : "plugins_sync_list_error", {
      serverError: r,
      status: response.status,
    });
    return {
      success: false,
      error: r,
      kind: "server_error",
      status: response.status,
    };
  }
  logForDiagnosticsNoPII(
    "warn",
    kind === "skills" ? "skills_sync_list_malformed" : "plugins_sync_list_malformed",
  );
  return {
    success: false,
    error: `malformed list-${kind} response`,
    kind: "malformed",
  };
}
//@ chunk-f9asxqh1.js:12359-12474 placement
/**
 * 把列表请求的网络异常转换为失败结果：错误类别、消息与可上报的 errno。
 */
function transportErrorResult(error) {
  let { kind, message } = classifyAxiosError(error);
  let r = sanitizedConnectionCodeForTelemetry(getErrnoCode(error));
  return {
    success: false,
    error: message,
    kind,
    ...(r !== undefined && {
      errno: r,
    }),
  };
}
//@ chunk-f9asxqh1.js:12633-12749 placement
/**
 * 生成列表失败的遥测字段：失败类别，以及可选的状态码与 errno。
 */
function listErrorTelemetry(e) {
  return {
    kind: fromEnum(e.kind),
    ...(e.status !== undefined && {
      status: e.status,
    }),
    ...(e.errno !== undefined && {
      errno: e.errno,
    }),
  };
}
//@ chunk-f9asxqh1.js:12840-13006 placement
/**
 * 从响应体前 2KB 里解析错误信封的错误类型，不是 JSON 时返回 non_json_body。
 */
function errorTypeFromBody(e) {
  try {
    let n = errorEnvelopeSchema().safeParse(jsonParse(e.toString("utf8", 0, 2048)));
    if (n.success) return n.data.error.type ?? "error_envelope_no_type";
  } catch {}
  return "non_json_body";
}
//@ chunk-f9asxqh1.js:15123-15890 placement
/**
 * 把服务端插件条目转换为本地行：id、名称、版本、更新时间、市场名、安装偏好、市场类型、presents_as；需要时附带校验过的组件列表与 plugin.json 名称。
 */
function toAccountPluginRow(raw, { components = false } = {}) {
  let installationPreference = parsePluginAvailability(raw.installation_preference);
  let marketplaceKind = parsePluginOriginKind(raw.marketplace_kind);
  return {
    pluginId: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    version: raw.version ?? null,
    updatedAt: raw.updated_at ?? null,
    ...(typeof raw.marketplace_name === "string" &&
      raw.marketplace_name && {
        marketplaceName: raw.marketplace_name,
      }),
    ...(installationPreference && {
      installationPreference,
    }),
    ...(marketplaceKind && {
      marketplaceKind,
    }),
    ...(typeof raw.presents_as === "string" &&
      raw.presents_as && {
        presentsAs: raw.presents_as,
      }),
    ...(components &&
      Array.isArray(raw.components) && {
        components: raw.components.flatMap((component) => {
          let y = syncedHookEntrySchema().safeParse(component);
          if (!y.success) return [];
          let { type: S, name: h, description } = y.data;
          return [
            {
              type: S,
              name: h,
              ...(description != null && {
                description,
              }),
            },
          ];
        }),
      }),
    ...(components &&
      typeof raw.plugin_json_name === "string" &&
      raw.plugin_json_name && {
        pluginJsonName: raw.plugin_json_name,
      }),
  };
}
//@ chunk-f9asxqh1.js:15990-16091 placement
/**
 * 账号插件列表的指纹：按 [pluginId, name, version, updatedAt] 序列化每行后排序拼接，用于判断列表是否变化。
 */
function pluginListFingerprint(plugins) {
  return plugins.map((n) => jsonStringify([n.pluginId, n.name, n.version, n.updatedAt])).toSorted().join(`
`);
}
//@ chunk-f9asxqh1.js:16091-16137 placement
/**
 * 插件 zip 下载的字节上限。
 */
var LIST_PLUGINS_TIMEOUT_MS = 1e4;
var DOWNLOAD_STALL_MS = 60000;
var RETRY_DELAY_MS = 500;
var LIST_PAGE_SIZE = 100;
var MAX_LIST_PAGES = 20;
var MAX_DOWNLOAD_BYTES = MAX_SPILL_BYTES;
//@ chunk-f9asxqh1.js:16137-16207 placement
/**
 * 取下载停滞超时（环境变量可覆盖）。
 */
function downloadStallMs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS ?? DOWNLOAD_STALL_MS;
}
//@ chunk-f9asxqh1.js:16207-16302 placement
/**
 * 账号插件列表的接口路径。
 */
var LIST_PLUGINS_PATH =
  "/api/oauth/organizations/:orgUUID/plugins/list-plugins?enabled_only=true&compact=true";
//@ chunk-f9asxqh1.js:16302-16452 placement
var COMPONENT_DETAILS_QUERY =
  "&include_component_details=true&include_hooks=true&include_plugin_json_names=true";
var CONVERTED_SKILLS_QUERY = "&wrapped_skills_as_plugins=true";
var FIRST_PAGE_URL = pageUrl(`${LIST_PLUGINS_PATH}${COMPONENT_DETAILS_QUERY}`, 0);
//@ chunk-f9asxqh1.js:16452-16529 placement
/**
 * 失败后等待一次再重试。
 */
async function retryOnce(e) {
  let n = await e();
  if (n.ok) return n;
  await sleep(RETRY_DELAY_MS);
  return e();
}
//@ chunk-f9asxqh1.js:16529-17006 placement
/**
 * 列出账号（claude.ai 组织）里的插件：分页拉取，可选附带组件详情与钩子、把技能当插件返回；结果中 required 插件排前，策略允许时解析各插件的同步钩子。
 */
async function listAccountPlugins(e = {}) {
  let pluginRowsWithRetry = await fetchPluginRowsWithRetry(
    `${LIST_PLUGINS_PATH}${e.componentDetails === true ? COMPONENT_DETAILS_QUERY : ""}${e.convertedSkillsAsPlugins === true ? CONVERTED_SKILLS_QUERY : ""}`,
    e,
  );
  return pluginRowsWithRetry.success
    ? {
        success: true,
        plugins: pluginRowsWithRetry.rows.map((s) =>
          toAccountPluginRow(s, {
            components: e.componentDetails === true,
          }),
        ),
        ...(pluginRowsWithRetry.degraded && {
          degraded: pluginRowsWithRetry.degraded,
        }),
        ...(pluginRowsWithRetry.convertedSkillsAsPlugins && {
          convertedSkillsAsPlugins: pluginRowsWithRetry.convertedSkillsAsPlugins,
        }),
        ...(e.componentDetails === true &&
          !isPluginHooksSyncBlocked() && {
            hooks: new Map(
              pluginRowsWithRetry.rows.flatMap((s) => {
                let r = hasDegradedSkills(s) ? undefined : convertSyncedPluginHooks(s);
                return r === undefined ? [] : [[s.id, r]];
              }),
            ),
          }),
      }
    : pluginRowsWithRetry;
}
//@ chunk-f9asxqh1.js:17006-17353 placement
/**
 * 列出账号插件：缺少 user:plugins 作用域时直接返回，失败（非 403）时等待后重试一次。
 */
async function fetchPluginRowsWithRetry(query, options) {
  if ((await pluginsScopeGate(options.signal, options.credentials)) === "skip_no_scope")
    return {
      success: false,
      error: "claude.ai login lacks the user:plugins scope in this session",
      kind: "no_scope",
    };
  let pluginPages = await fetchPluginPages(query, options);
  if (pluginPages.success || pluginPages.status === 403) return pluginPages;
  await sleep(RETRY_DELAY_MS);
  let pluginPages_2 = await fetchPluginPages(query, options);
  return !pluginPages_2.success && isNotFoundServerError(pluginPages_2) && !isNotFoundServerError(pluginPages)
    ? {
        success: false,
        error: pluginPages_2.error,
        kind: pluginPages_2.kind,
      }
    : pluginPages_2;
}
//@ chunk-f9asxqh1.js:17353-18185 placement
/**
 * 逐页 GET 账号插件列表直到没有更多，合并 degraded 与 converted_skills_as_plugins 标志，超过页数上限报 page_cap；错误交给统一分类。
 */
async function fetchPluginPages(query, options) {
  let rows = [];
  let degraded = false;
  let convertedSkills = true;
  try {
    for (let j = 0; j < MAX_LIST_PAGES; j++) {
      let response = await apiClient.get(pageUrl(query, j), {
        auth: "teleport-org",
        isBackground: options.isBackground,
        timeout: LIST_PLUGINS_TIMEOUT_MS,
        credentials: options.credentials,
        earlyAnswer: options.earlyAnswer,
      });
      if (!response.ok || !Array.isArray(response.data?.plugins)) {
        let h = listErrorResult("plugins", response);
        return j > 0 && isNotFoundServerError(h)
          ? {
              success: false,
              error: h.error,
              kind: h.kind,
            }
          : h;
      }
      rows.push(...response.data.plugins.filter(isEnabledEntry));
      degraded ||= response.data.degraded === true;
      convertedSkills &&= response.data.converted_skills_as_plugins === true;
      if (response.data.has_more !== true)
        return {
          success: true,
          rows: [
            ...rows.filter((h) => h.installation_preference === "required"),
            ...rows.filter((h) => h.installation_preference !== "required"),
          ],
          ...(degraded && {
            degraded,
          }),
          ...(convertedSkills && {
            convertedSkillsAsPlugins: convertedSkills,
          }),
        };
    }
    logForDiagnosticsNoPII("warn", "plugins_sync_list_page_cap", {
      pages: MAX_LIST_PAGES,
      collected: rows.length,
    });
    return {
      success: false,
      error: `list-plugins page cap (${MAX_LIST_PAGES}) exceeded`,
      kind: "page_cap",
    };
  } catch (error) {
    return transportErrorResult(error);
  }
}
//@ chunk-f9asxqh1.js:18185-18318 placement
function isPluginHooksSyncBlocked() {
  let e = policyDenyKind("allow_account_plugins_sync");
  let n = e === "cache_miss" || e === "route_missing";
  refreshSyncVeto();
  return getPluginsSyncVetoed() || (e !== null && !(n && isRemoteOrCowork()));
}
//@ chunk-f9asxqh1.js:18318-18387 placement
/**
 * 判断该插件行是否仅以降级形式提供技能。
 */
function hasDegradedSkills(e) {
  return e.enabled !== true || e.skills_display_degraded === true;
}
//@ chunk-f9asxqh1.js:18387-18684 placement
/**
 * 生成账号插件 zip 的下载路径（可带版本；Tag 场景附带默认市场参数）。
 */
function pluginDownloadPath(pluginId, n) {
  let s = [];
  if (n) s.push(`version=${encodeURIComponent(n)}`);
  if (env.CLAUDE_CODE_CCR_SURFACE === "tag") s.push("included_default_marketplaces=claude-tag-plugins");
  let r = s.length > 0 ? `?${s.join("&")}` : "";
  return `/api/oauth/organizations/:orgUUID/plugins/${encodeURIComponent(pluginId)}/download${r}`;
}
//@ chunk-f9asxqh1.js:18684-18742 placement
/**
 * 带重试的插件 zip 下载。
 */
async function downloadWithRetry(pluginId, destPath, version, options = {}) {
  return retryOnce(() => downloadPluginZip(pluginId, destPath, version, options));
}
//@ chunk-f9asxqh1.js:18742-20178 placement
/**
 * 以流方式下载账号插件 zip：带停滞超时与字节上限，写入目标路径后检查 PK 头，不是 zip 时删除并记录服务端错误；可用环境变量改为一次性缓冲下载。
 */
async function downloadPluginZip(pluginId, destPath, version, options) {
  let urlPath = pluginDownloadPath(pluginId, version);
  if (env.CLAUDE_CODE_SYNC_PLUGINS_BUFFERED_DOWNLOAD)
    return downloadPluginZipBuffered(urlPath, destPath, options);
  let receivedBytes = 0;
  let stalled = false;
  try {
    let C = function () {
      stalled = true;
      x.destroy(Error("plugin download stream stalled"));
    };
    let h = await apiClient.get(urlPath, {
      auth: "teleport-org",
      isBackground: options.isBackground,
      timeout: DOWNLOAD_STALL_MS,
      responseType: "stream",
      credentials: options.credentials,
    });
    if (!h.ok || !h.data) {
      let reason = h.ok ? "empty_body" : h.reason;
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_ok", {
        reason,
      });
      return {
        ok: false,
        reason,
      };
    }
    let w = downloadStallMs();
    let b;
    let x = new Transform({
      transform(R, G, P) {
        clearTimeout(b);
        b = setTimeout(C, w);
        receivedBytes += R.length;
        if (receivedBytes > MAX_DOWNLOAD_BYTES) P(Error("plugin zip exceeds download byte cap"));
        else P(null, R);
      },
      flush(R) {
        clearTimeout(b);
        R();
      },
    });
    b = setTimeout(C, w);
    try {
      await pipeline(h.data, x, createWriteStream(destPath));
    } finally {
      clearTimeout(b);
    }
    let H = Buffer.alloc(2048);
    let F = await open(destPath, "r");
    let O;
    try {
      O = (await F.read(H, 0, H.length, 0)).bytesRead;
    } finally {
      await F.close();
    }
    if (O < 2 || H[0] !== 80 || H[1] !== 75) {
      await rm(destPath, {
        force: true,
      });
      let R = O === 0 ? "empty_body" : errorTypeFromBody(H.subarray(0, O));
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_zip", {
        serverError: R,
        bodyLen: receivedBytes,
      });
      return {
        ok: false,
        reason: R,
      };
    }
    return {
      ok: true,
    };
  } catch (error) {
    await rm(destPath, {
      force: true,
    }).catch(() => {});
    let w = error?.response?.data;
    if (w !== null && typeof w === "object" && "destroy" in w && typeof w.destroy === "function") w.destroy();
    let code = error !== null && typeof error === "object" && "code" in error ? error.code : undefined;
    let x = stalled
      ? "timeout"
      : receivedBytes > MAX_DOWNLOAD_BYTES
        ? "too_large"
        : code === "ECONNRESET" || code === "EPIPE" || code === "ETIMEDOUT"
          ? "network"
          : classifyAxiosError(error).kind;
    logForDiagnosticsNoPII("warn", "plugins_sync_download_exception", {
      kind: x,
    });
    return {
      ok: false,
      reason: x,
    };
  }
}
//@ chunk-f9asxqh1.js:20178-20826 placement
/**
 * 一次性缓冲下载账号插件 zip：检查 PK 头，不是 zip 时记录服务端错误类型，成功则写入目标文件。
 */
async function downloadPluginZipBuffered(urlPath, destPath, options) {
  try {
    let r = await apiClient.get(urlPath, {
      auth: "teleport-org",
      isBackground: options.isBackground,
      timeout: DOWNLOAD_STALL_MS,
      responseType: "arraybuffer",
      maxContentLength: MAX_DOWNLOAD_BYTES,
      credentials: options.credentials,
    });
    if (!r.ok || !r.data) {
      let reason = r.ok ? "empty_body" : r.reason;
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_ok", {
        reason,
      });
      return {
        ok: false,
        reason,
      };
    }
    let buffer = Buffer.from(r.data);
    if (buffer.length < 2 || buffer[0] !== 80 || buffer[1] !== 75) {
      let y = buffer.length === 0 ? "empty_body" : errorTypeFromBody(buffer);
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_zip", {
        serverError: y,
        bodyLen: buffer.length,
      });
      return {
        ok: false,
        reason: y,
      };
    }
    await writeFile(destPath, buffer);
    return {
      ok: true,
    };
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    logForDiagnosticsNoPII("warn", "plugins_sync_download_exception", {
      kind,
    });
    return {
      ok: false,
      reason: kind,
    };
  }
}
//@ chunk-f9asxqh1.js:20826-20883 placement
/**
 * 生成列表分页地址。
 */
function pageUrl(query, n) {
  return `${query}&limit=${LIST_PAGE_SIZE}&offset=${n * LIST_PAGE_SIZE}`;
}
//@ chunk-f9asxqh1.js:21047-21085 placement
/**
 * 判断会话引用是否属于已知 CCR 会话。
 */
function isKnownCcrSessionRef(e) {
  return ccrSessionIdForRefs(e) !== undefined;
}
export {
  downloadWithRetry,
  pluginDownloadPath,
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
  isKnownCcrSessionRef,
  listErrorResult,
  transportErrorResult,
  errorTypeFromBody,
};
