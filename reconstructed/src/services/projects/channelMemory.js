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
function channelMemoriesPath(channelId, action) {
  if (!CHANNEL_ID_REGEX.test(channelId))
    throw new ChannelApiError(action, null, "the project id has an unexpected shape", "invalid_input");
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
  retryDelaysMs = MEMORY_WRITE_RETRY_DELAYS_MS,
  logSuccess = true,
) {
  try {
    for (let j = 0; ; j++) {
      let { status } = await createMemoryFile(channelId, file, signal, credentials);
      if (status === 409) {
        if (logSuccess) logFeatureOk("projects_memory_write");
        return "kept-existing";
      }
      if (status !== 404) {
        logFeatureOk("projects_memory_write");
        return "created";
      }
      let retryDelayMs = retryDelaysMs[j];
      if (retryDelayMs === undefined) {
        logFeatureSad("projects_memory_write", "store_unavailable");
        return null;
      }
      await sleep(retryDelayMs, signal);
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
function parseMemoryFileList(payload) {
  let rawEntries = payload?.data;
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries.flatMap((rawEntry) => {
    let entry = rawEntry;
    return typeof entry?.id === "string" &&
      MEMORY_ID_PATTERN.test(entry.id) &&
      typeof entry.path === "string" &&
      typeof entry.content_sha256 === "string"
      ? [
          {
            id: entry.id,
            path: entry.path,
            contentSha256: entry.content_sha256,
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
    let response = await apiClient.get(
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
    if (page === null && response.ok && response.status === 404) return;
    let payload = checkChannelResponse(response, "read project memory").data;
    let found = parseMemoryFileList(payload).find((memoryFile) => memoryFile.path === path);
    if (found !== undefined) return found;
    let nextPage = payload?.next_page;
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
    let response = await apiClient.get(
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
    let payload = checkChannelResponse(response, "read project memory").data;
    if (typeof payload?.content !== "string")
      throw new ChannelApiError(
        "read project memory",
        null,
        "the server returned an unexpected shape",
        "bad_response",
      );
    logFeatureOk("projects_memory_read");
    return {
      id: memoryFileByPath.id,
      content: payload.content,
      contentSha256:
        typeof payload.content_sha256 === "string" ? payload.content_sha256 : memoryFileByPath.contentSha256,
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
    let response = await apiClient.post(
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
    checkChannelResponse(response, "save to project memory");
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
  file,
  signal,
  credentials,
  retryDelaysMs = MEMORY_WRITE_RETRY_DELAYS_MS,
) {
  let saveOutcome = await saveMemoryFileIfAbsent(channelId, file, signal, credentials, retryDelaysMs, false);
  if (saveOutcome !== "kept-existing") return saveOutcome;
  let existingFile;
  try {
    existingFile = await findMemoryFileByPath(channelId, file.path, signal, credentials);
    if (existingFile === undefined)
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
      id: existingFile.id,
      content: file.content,
      expectedSha256: existingFile.contentSha256,
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
