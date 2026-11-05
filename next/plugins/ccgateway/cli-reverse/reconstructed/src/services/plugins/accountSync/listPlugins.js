/**
 * services/plugins/accountSync/listPlugins.ts
 *
 * 2.1.316 新增：账号插件同步：列出账号插件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q1gbn2mn.js (22)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-q1gbn2mn.js:11916-12475 placement
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
    let serverErrorType = errorType.data.error.type ?? "error_envelope_no_type";
    logForDiagnosticsNoPII("warn", kind === "skills" ? "skills_sync_list_error" : "plugins_sync_list_error", {
      serverError: serverErrorType,
      status: response.status,
    });
    return {
      success: false,
      error: serverErrorType,
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
//@ chunk-q1gbn2mn.js:12475-12590 placement
/**
 * 把列表请求的网络异常转换为失败结果：错误类别、消息与可上报的 errno。
 */
function transportErrorResult(error) {
  let { kind, message } = classifyAxiosError(error);
  let errno = sanitizedConnectionCodeForTelemetry(getErrnoCode(error));
  return {
    success: false,
    error: message,
    kind,
    ...(errno !== undefined && {
      errno,
    }),
  };
}
//@ chunk-q1gbn2mn.js:12749-12865 placement
/**
 * 生成列表失败的遥测字段：失败类别，以及可选的状态码与 errno。
 */
function listErrorTelemetry(error) {
  return {
    kind: fromEnum(error.kind),
    ...(error.status !== undefined && {
      status: error.status,
    }),
    ...(error.errno !== undefined && {
      errno: error.errno,
    }),
  };
}
//@ chunk-q1gbn2mn.js:12956-13122 placement
/**
 * 从响应体前 2KB 里解析错误信封的错误类型，不是 JSON 时返回 non_json_body。
 */
function errorTypeFromBody(body) {
  try {
    let parsed = errorEnvelopeSchema().safeParse(jsonParse(body.toString("utf8", 0, 2048)));
    if (parsed.success) return parsed.data.error.type ?? "error_envelope_no_type";
  } catch {}
  return "non_json_body";
}
//@ chunk-q1gbn2mn.js:16802-17569 placement
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
          let parsedHook = syncedHookEntrySchema().safeParse(component);
          if (!parsedHook.success) return [];
          let { type: hookType, name: hookName, description } = parsedHook.data;
          return [
            {
              type: hookType,
              name: hookName,
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
//@ chunk-q1gbn2mn.js:17669-17770 placement
/**
 * 账号插件列表的指纹：按 [pluginId, name, version, updatedAt] 序列化每行后排序拼接，用于判断列表是否变化。
 */
function pluginListFingerprint(plugins) {
  return plugins
    .map((plugin) => jsonStringify([plugin.pluginId, plugin.name, plugin.version, plugin.updatedAt]))
    .toSorted().join(`
`);
}
//@ chunk-q1gbn2mn.js:17770-17817 placement
/**
 * 插件 zip 下载的字节上限。
 */
var LIST_PLUGINS_TIMEOUT_MS; // deferred: uses MAX_SPILL_BYTES (../../../utils/plugins/commandSource.js) of its import cycle while loading; runs once the cycle is complete
var DOWNLOAD_STALL_MS;
var RETRY_DELAY_MS;
var LIST_PAGE_SIZE;
var MAX_LIST_PAGES;
var MAX_DOWNLOAD_BYTES;
deferInit("chunk-q1gbn2mn.js:17770", () => {
  LIST_PLUGINS_TIMEOUT_MS = 1e4;
  DOWNLOAD_STALL_MS = 60000;
  RETRY_DELAY_MS = 500;
  LIST_PAGE_SIZE = 100;
  MAX_LIST_PAGES = 20;
  MAX_DOWNLOAD_BYTES = MAX_SPILL_BYTES;
});
//@ chunk-q1gbn2mn.js:17817-17887 placement
/**
 * 取下载停滞超时（环境变量可覆盖）。
 */
function downloadStallMs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS ?? DOWNLOAD_STALL_MS;
}
//@ chunk-q1gbn2mn.js:17887-17982 placement
/**
 * 账号插件列表的接口路径。
 */
var LIST_PLUGINS_PATH =
  "/api/oauth/organizations/:orgUUID/plugins/list-plugins?enabled_only=true&compact=true";
//@ chunk-q1gbn2mn.js:17982-18132 placement
var COMPONENT_DETAILS_QUERY; // deferred: uses pageUrl of its import cycle while loading; runs once the cycle is complete
var CONVERTED_SKILLS_QUERY;
var FIRST_PAGE_URL;
deferInit("chunk-q1gbn2mn.js:17982", () => {
  COMPONENT_DETAILS_QUERY =
    "&include_component_details=true&include_hooks=true&include_plugin_json_names=true";
  CONVERTED_SKILLS_QUERY = "&wrapped_skills_as_plugins=true";
  FIRST_PAGE_URL = pageUrl(`${LIST_PLUGINS_PATH}${COMPONENT_DETAILS_QUERY}`, 0);
});
//@ chunk-q1gbn2mn.js:18132-18209 placement
/**
 * 失败后等待一次再重试。
 */
async function retryOnce(attempt) {
  let firstResult = await attempt();
  if (firstResult.ok) return firstResult;
  await sleep(RETRY_DELAY_MS);
  return attempt();
}
//@ chunk-q1gbn2mn.js:18209-18686 placement
/**
 * 列出账号（claude.ai 组织）里的插件：分页拉取，可选附带组件详情与钩子、把技能当插件返回；结果中 required 插件排前，策略允许时解析各插件的同步钩子。
 */
async function listAccountPlugins(options = {}) {
  let pluginRowsWithRetry = await fetchPluginRowsWithRetry(
    `${LIST_PLUGINS_PATH}${options.componentDetails === true ? COMPONENT_DETAILS_QUERY : ""}${options.convertedSkillsAsPlugins === true ? CONVERTED_SKILLS_QUERY : ""}`,
    options,
  );
  return pluginRowsWithRetry.success
    ? {
        success: true,
        plugins: pluginRowsWithRetry.rows.map((pluginRow) =>
          toAccountPluginRow(pluginRow, {
            components: options.componentDetails === true,
          }),
        ),
        ...(pluginRowsWithRetry.degraded && {
          degraded: pluginRowsWithRetry.degraded,
        }),
        ...(pluginRowsWithRetry.convertedSkillsAsPlugins && {
          convertedSkillsAsPlugins: pluginRowsWithRetry.convertedSkillsAsPlugins,
        }),
        ...(options.componentDetails === true &&
          !isPluginHooksSyncBlocked() && {
            hooks: new Map(
              pluginRowsWithRetry.rows.flatMap((pluginRow) => {
                let hooks = hasDegradedSkills(pluginRow) ? undefined : convertSyncedPluginHooks(pluginRow);
                return hooks === undefined ? [] : [[pluginRow.id, hooks]];
              }),
            ),
          }),
      }
    : pluginRowsWithRetry;
}
//@ chunk-q1gbn2mn.js:18686-19033 placement
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
//@ chunk-q1gbn2mn.js:19033-19868 placement
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
        let errorResult = listErrorResult("plugins", response);
        return j > 0 && isNotFoundServerError(errorResult)
          ? {
              success: false,
              error: errorResult.error,
              kind: errorResult.kind,
            }
          : errorResult;
      }
      rows.push(...response.data.plugins.filter(isEnabledEntry));
      degraded ||= response.data.degraded === true;
      convertedSkills &&= response.data.converted_skills_as_plugins === true;
      if (response.data.has_more !== true)
        return {
          success: true,
          rows: [
            ...rows.filter((row) => row.installation_preference === "required"),
            ...rows.filter((row) => row.installation_preference !== "required"),
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
//@ chunk-q1gbn2mn.js:19868-20001 placement
function isPluginHooksSyncBlocked() {
  let denyKind = policyDenyKind("allow_account_plugins_sync");
  let isTransientDeny = denyKind === "cache_miss" || denyKind === "route_missing";
  refreshSyncVeto();
  return getPluginsSyncVetoed() || (denyKind !== null && !(isTransientDeny && isRemoteOrCowork()));
}
//@ chunk-q1gbn2mn.js:20001-20070 placement
/**
 * 判断该插件行是否仅以降级形式提供技能。
 */
function hasDegradedSkills(plugin) {
  return plugin.enabled !== true || plugin.skills_display_degraded === true;
}
//@ chunk-q1gbn2mn.js:20070-20367 placement
/**
 * 生成账号插件 zip 的下载路径（可带版本；Tag 场景附带默认市场参数）。
 */
function pluginDownloadPath(pluginId, version) {
  let queryParts = [];
  if (version) queryParts.push(`version=${encodeURIComponent(version)}`);
  if (env.CLAUDE_CODE_CCR_SURFACE === "tag")
    queryParts.push("included_default_marketplaces=claude-tag-plugins");
  let queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return `/api/oauth/organizations/:orgUUID/plugins/${encodeURIComponent(pluginId)}/download${queryString}`;
}
//@ chunk-q1gbn2mn.js:20367-20425 placement
/**
 * 带重试的插件 zip 下载。
 */
async function downloadWithRetry(pluginId, destPath, version, options = {}) {
  return retryOnce(() => downloadPluginZip(pluginId, destPath, version, options));
}
//@ chunk-q1gbn2mn.js:20425-21861 placement
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
    let onStall = function () {
      stalled = true;
      meterStream.destroy(Error("plugin download stream stalled"));
    };
    let response = await apiClient.get(urlPath, {
      auth: "teleport-org",
      isBackground: options.isBackground,
      timeout: DOWNLOAD_STALL_MS,
      responseType: "stream",
      credentials: options.credentials,
    });
    if (!response.ok || !response.data) {
      let reason = response.ok ? "empty_body" : response.reason;
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_ok", {
        reason,
      });
      return {
        ok: false,
        reason,
      };
    }
    let stallMs = downloadStallMs();
    let stallTimer;
    let meterStream = new Transform({
      transform(chunk, encoding, callback) {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(onStall, stallMs);
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_DOWNLOAD_BYTES) callback(Error("plugin zip exceeds download byte cap"));
        else callback(null, chunk);
      },
      flush(callback) {
        clearTimeout(stallTimer);
        callback();
      },
    });
    stallTimer = setTimeout(onStall, stallMs);
    try {
      await pipeline(response.data, meterStream, createWriteStream(destPath));
    } finally {
      clearTimeout(stallTimer);
    }
    let headerBytes = Buffer.alloc(2048);
    let fileHandle = await open(destPath, "r");
    let bytesRead;
    try {
      bytesRead = (await fileHandle.read(headerBytes, 0, headerBytes.length, 0)).bytesRead;
    } finally {
      await fileHandle.close();
    }
    if (bytesRead < 2 || headerBytes[0] !== 80 || headerBytes[1] !== 75) {
      await rm(destPath, {
        force: true,
      });
      let reason = bytesRead === 0 ? "empty_body" : errorTypeFromBody(headerBytes.subarray(0, bytesRead));
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_zip", {
        serverError: reason,
        bodyLen: receivedBytes,
      });
      return {
        ok: false,
        reason,
      };
    }
    return {
      ok: true,
    };
  } catch (error) {
    await rm(destPath, {
      force: true,
    }).catch(() => {});
    let responseData = error?.response?.data;
    if (
      responseData !== null &&
      typeof responseData === "object" &&
      "destroy" in responseData &&
      typeof responseData.destroy === "function"
    )
      responseData.destroy();
    let code = error !== null && typeof error === "object" && "code" in error ? error.code : undefined;
    let kind = stalled
      ? "timeout"
      : receivedBytes > MAX_DOWNLOAD_BYTES
        ? "too_large"
        : code === "ECONNRESET" || code === "EPIPE" || code === "ETIMEDOUT"
          ? "network"
          : classifyAxiosError(error).kind;
    logForDiagnosticsNoPII("warn", "plugins_sync_download_exception", {
      kind,
    });
    return {
      ok: false,
      reason: kind,
    };
  }
}
//@ chunk-q1gbn2mn.js:21861-22509 placement
/**
 * 一次性缓冲下载账号插件 zip：检查 PK 头，不是 zip 时记录服务端错误类型，成功则写入目标文件。
 */
async function downloadPluginZipBuffered(urlPath, destPath, options) {
  try {
    let response = await apiClient.get(urlPath, {
      auth: "teleport-org",
      isBackground: options.isBackground,
      timeout: DOWNLOAD_STALL_MS,
      responseType: "arraybuffer",
      maxContentLength: MAX_DOWNLOAD_BYTES,
      credentials: options.credentials,
    });
    if (!response.ok || !response.data) {
      let reason = response.ok ? "empty_body" : response.reason;
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_ok", {
        reason,
      });
      return {
        ok: false,
        reason,
      };
    }
    let buffer = Buffer.from(response.data);
    if (buffer.length < 2 || buffer[0] !== 80 || buffer[1] !== 75) {
      let reason = buffer.length === 0 ? "empty_body" : errorTypeFromBody(buffer);
      logForDiagnosticsNoPII("warn", "plugins_sync_download_not_zip", {
        serverError: reason,
        bodyLen: buffer.length,
      });
      return {
        ok: false,
        reason,
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
//@ chunk-q1gbn2mn.js:22509-22566 placement
/**
 * 生成列表分页地址。
 */
function pageUrl(query, pageIndex) {
  return `${query}&limit=${LIST_PAGE_SIZE}&offset=${pageIndex * LIST_PAGE_SIZE}`;
}
//@ chunk-q1gbn2mn.js:22730-22768 placement
/**
 * 判断会话引用是否属于已知 CCR 会话。
 */
function isKnownCcrSessionRef(refs) {
  return ccrSessionIdForRefs(refs) !== undefined;
}
export {
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
  downloadWithRetry,
  pluginDownloadPath,
  isKnownCcrSessionRef,
  listErrorResult,
  transportErrorResult,
  errorTypeFromBody,
};
