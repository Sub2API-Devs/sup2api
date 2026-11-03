/**
 * services/projects/channelMemory.ts
 *
 * 2.1.316 新增：频道记忆（claude.ai 频道里的 MEMORY.md）的读写 API：拉取、写入与重试退避。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (9)
 * attribution: placement 9
 */
import {
  CHANNEL_ID_REGEX,
  ChannelApiError,
  withTrustedDeviceHeaders,
  checkChannelResponse,
} from "./channelApi.js";
import { apiClient } from "../routines/routinesApi.js";
import { printableName } from "../../utils/printableName.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { sleep } from "../../utils/sleep.js";
import { AbortError } from "../../utils/errors.js";
import { MEMORY_ID_PATTERN } from "../../utils/taggedId.js";

//@ chunk-dz3q485w.js:30880-30946 placement
var MEMORY_FILE_REQUEST_TIMEOUT_MS = 15000;
var MEMORY_FILE_PATH = "/MEMORY.md";
var MEMORY_WRITE_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 12000];
var MEMORY_WRITE_MAX_ATTEMPTS = 10;
//@ chunk-dz3q485w.js:30946-31122 placement
function channelMemoriesPath(channelId, n) {
  if (!CHANNEL_ID_REGEX.test(channelId))
    throw new ChannelApiError(n, null, "the project id has an unexpected shape", "invalid_input");
  return `/v1/code/memory/channel/${encodeURIComponent(channelId)}/memories`;
}
//@ chunk-dz3q485w.js:31122-31667 placement
/**
 * 在项目记忆中创建文件（前置条件：路径不存在）：404 表示存储未就绪，409 表示已存在（路径与其他文件重叠时抛错）。
 */
async function createMemoryFile(channelId, file, signal, credentials) {
  let response = await apiClient.post(
    channelMemoriesPath(channelId, "save to project memory"),
    {
      path: file.path,
      content: file.content,
      precondition: {
        type: "not_exists",
      },
    },
    {
      auth: "teleport-org",
      ...(await withTrustedDeviceHeaders()),
      validateStatus: () => true,
      timeout: MEMORY_FILE_REQUEST_TIMEOUT_MS,
      signal,
      credentials,
    },
  );
  if (response.ok && response.status === 404)
    return {
      status: 404,
    };
  if (response.ok && response.status === 409) {
    let conflictingPath = response.data?.error?.conflicting_path;
    if (conflictingPath === undefined || conflictingPath === file.path)
      return {
        status: 409,
      };
    throw new ChannelApiError(
      "save to project memory",
      409,
      `another memory file (${printableName(String(conflictingPath), 120)}) overlaps this path`,
    );
  }
  return {
    status: checkChannelResponse(response, "save to project memory").status,
  };
}
//@ chunk-dz3q485w.js:31667-32122 placement
/**
 * 保存项目记忆文件（若已存在则保留原文件）：存储未就绪时按间隔重试，返回 created / kept-existing / null，并记录特性状态。
 */
async function saveMemoryFileIfAbsent(
  channelId,
  file,
  signal,
  credentials,
  a = MEMORY_WRITE_RETRY_DELAYS_MS,
  l = true,
) {
  try {
    for (let j = 0; ; j++) {
      let { status } = await createMemoryFile(channelId, file, signal, credentials);
      if (status === 409) {
        if (l) logFeatureOk("projects_memory_write");
        return "kept-existing";
      }
      if (status !== 404) {
        logFeatureOk("projects_memory_write");
        return "created";
      }
      let b = a[j];
      if (b === undefined) {
        logFeatureSad("projects_memory_write", "store_unavailable");
        return null;
      }
      await sleep(b, signal);
      if (signal?.aborted === true) throw new AbortError();
    }
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_memory_write",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:32122-32381 placement
function parseMemoryFileList(e) {
  let n = e?.data;
  if (!Array.isArray(n)) return [];
  return n.flatMap((s) => {
    let r = s;
    return typeof r?.id === "string" &&
      MEMORY_ID_PATTERN.test(r.id) &&
      typeof r.path === "string" &&
      typeof r.content_sha256 === "string"
      ? [
          {
            id: r.id,
            path: r.path,
            contentSha256: r.content_sha256,
          },
        ]
      : [];
  });
}
//@ chunk-dz3q485w.js:32381-32964 placement
/**
 * 分页列出项目记忆文件，按路径查找条目（id、路径、内容 sha256），页数过多时抛错。
 */
async function findMemoryFileByPath(channelId, path, signal, credentials) {
  let page = null;
  for (let idx = 0; idx < MEMORY_WRITE_MAX_ATTEMPTS; idx++) {
    let uRLSearchParams = new URLSearchParams({
      limit: "100",
    });
    if (page !== null) uRLSearchParams.set("page", page);
    let h = await apiClient.get(
      `${channelMemoriesPath(channelId, "read project memory")}?${uRLSearchParams}`,
      {
        auth: "teleport-org",
        ...(await withTrustedDeviceHeaders()),
        validateStatus: () => true,
        timeout: MEMORY_FILE_REQUEST_TIMEOUT_MS,
        signal,
        credentials,
      },
    );
    if (page === null && h.ok && h.status === 404) return;
    let b = checkChannelResponse(h, "read project memory").data;
    let found = parseMemoryFileList(b).find((j) => j.path === path);
    if (found !== undefined) return found;
    let nextPage = b?.next_page;
    if (typeof nextPage !== "string" || nextPage === "") return;
    page = nextPage;
  }
  throw new ChannelApiError(
    "read project memory",
    null,
    "the project memory store has too many files to search",
    "bad_response",
  );
}
//@ chunk-dz3q485w.js:32964-33662 placement
/**
 * 读取项目记忆中指定路径的文件内容与 sha256，不存在时返回 null。
 */
async function readMemoryFile(channelId, path, signal, credentials) {
  try {
    let memoryFileByPath = await findMemoryFileByPath(channelId, path, signal, credentials);
    if (memoryFileByPath === undefined) {
      logFeatureOk("projects_memory_read");
      return null;
    }
    let l = await apiClient.get(
      `${channelMemoriesPath(channelId, "read project memory")}/${encodeURIComponent(memoryFileByPath.id)}`,
      {
        auth: "teleport-org",
        ...(await withTrustedDeviceHeaders()),
        validateStatus: () => true,
        timeout: MEMORY_FILE_REQUEST_TIMEOUT_MS,
        signal,
        credentials,
      },
    );
    let c = checkChannelResponse(l, "read project memory").data;
    if (typeof c?.content !== "string")
      throw new ChannelApiError(
        "read project memory",
        null,
        "the server returned an unexpected shape",
        "bad_response",
      );
    logFeatureOk("projects_memory_read");
    return {
      id: memoryFileByPath.id,
      content: c.content,
      contentSha256: typeof c.content_sha256 === "string" ? c.content_sha256 : memoryFileByPath.contentSha256,
    };
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_memory_read",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:33662-34247 placement
/**
 * 以内容 sha256 为前置条件替换项目记忆文件内容。
 */
async function replaceMemoryFile(channelId, update, signal, credentials) {
  if (!MEMORY_ID_PATTERN.test(update.id))
    throw new ChannelApiError(
      "save to project memory",
      null,
      "the memory id has an unexpected shape",
      "invalid_input",
    );
  try {
    let a = await apiClient.post(
      `${channelMemoriesPath(channelId, "save to project memory")}/${encodeURIComponent(update.id)}`,
      {
        content: update.content,
        precondition: {
          type: "content_sha256",
          content_sha256: update.expectedSha256,
        },
      },
      {
        auth: "teleport-org",
        ...(await withTrustedDeviceHeaders()),
        validateStatus: () => true,
        timeout: MEMORY_FILE_REQUEST_TIMEOUT_MS,
        signal,
        credentials,
      },
    );
    checkChannelResponse(a, "save to project memory");
    logFeatureOk("projects_memory_write");
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_memory_write",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:34247-34702 placement
/**
 * 保存项目记忆文件：不存在时创建，已存在时按当前 sha256 替换，返回 created / replaced / null。
 */
async function saveOrReplaceMemoryFile(
  channelId,
  n,
  signal,
  credentials,
  memoryRetryDelaysMs = MEMORY_WRITE_RETRY_DELAYS_MS,
) {
  let l = await saveMemoryFileIfAbsent(channelId, n, signal, credentials, memoryRetryDelaysMs, false);
  if (l !== "kept-existing") return l;
  let c;
  try {
    c = await findMemoryFileByPath(channelId, n.path, signal, credentials);
    if (c === undefined)
      throw new ChannelApiError(
        "save to project memory",
        null,
        "the existing file could not be found to update",
        "bad_response",
      );
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_memory_write",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
  await replaceMemoryFile(
    channelId,
    {
      id: c.id,
      content: n.content,
      expectedSha256: c.contentSha256,
    },
    signal,
    credentials,
  );
  return "replaced";
}
export {
  saveOrReplaceMemoryFile,
  saveMemoryFileIfAbsent,
  MEMORY_FILE_PATH,
  readMemoryFile,
  replaceMemoryFile,
};
