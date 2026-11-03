/**
 * services/projects/channelMemory.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (9)
 * attribution: placement 9
 */
import { Rz, ChannelApiError, W, checkChannelResponse } from "./channelApi.js";
import { apiClient } from "../routines/routinesApi.js";
import { printableName } from "../../utils/printableName.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { sleep } from "../../utils/sleep.js";
import { AbortError } from "../../utils/errors.js";
import { MEMORY_ID_PATTERN } from "../../utils/taggedId.js";

//@ chunk-dz3q485w.js:30880-30946 placement
var Pe = 15000,
  xe = "/MEMORY.md",
  un = [1000, 2000, 4000, 8000, 12000],
  gs = 10;
//@ chunk-dz3q485w.js:30946-31122 placement
function channelMemoriesPath(e, n) {
  if (!Rz.test(e))
    throw new ChannelApiError(n, null, "the project id has an unexpected shape", "invalid_input");
  return `/v1/code/memory/channel/${encodeURIComponent(e)}/memories`;
}
/**
 * 在项目记忆中创建文件（前置条件：路径不存在）：404 表示存储未就绪，409 表示已存在（路径与其他文件重叠时抛错）。
 */
//@ chunk-dz3q485w.js:31122-31667 placement
async function createMemoryFile(channelId, file, signal, credentials) {
  let response = await apiClient.post(
    channelMemoriesPath(channelId, "save to project memory"),
    { path: file.path, content: file.content, precondition: { type: "not_exists" } },
    {
      auth: "teleport-org",
      ...(await W()),
      validateStatus: () => !0,
      timeout: Pe,
      signal: signal,
      credentials: credentials,
    },
  );
  if (response.ok && response.status === 404) return { status: 404 };
  if (response.ok && response.status === 409) {
    let l = response.data?.error?.conflicting_path;
    if (l === void 0 || l === file.path) return { status: 409 };
    throw new ChannelApiError(
      "save to project memory",
      409,
      `another memory file (${printableName(String(l), 120)}) overlaps this path`,
    );
  }
  return { status: checkChannelResponse(response, "save to project memory").status };
}
/**
 * 保存项目记忆文件（若已存在则保留原文件）：存储未就绪时按间隔重试，返回 created / kept-existing / null，并记录特性状态。
 */
//@ chunk-dz3q485w.js:31667-32122 placement
async function saveMemoryFileIfAbsent(e, n, s, r, a = un, l = !0) {
  try {
    for (let c = 0; ; c++) {
      let { status: status } = await createMemoryFile(e, n, s, r);
      if (status === 409) {
        if (l) logFeatureOk("projects_memory_write");
        return "kept-existing";
      }
      if (status !== 404) return (logFeatureOk("projects_memory_write"), "created");
      let b = a[c];
      if (b === void 0) return (logFeatureSad("projects_memory_write", "store_unavailable"), null);
      if ((await sleep(b, s), s?.aborted === !0)) throw new AbortError();
    }
  } catch (error) {
    if (s?.aborted !== !0)
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
      ? [{ id: r.id, path: r.path, contentSha256: r.content_sha256 }]
      : [];
  });
}
/**
 * 分页列出项目记忆文件，按路径查找条目（id、路径、内容 sha256），页数过多时抛错。
 */
//@ chunk-dz3q485w.js:32381-32964 placement
async function findMemoryFileByPath(channelId, path, signal, credentials) {
  let page = null;
  for (let l = 0; l < gs; l++) {
    let uRLSearchParams = new URLSearchParams({ limit: "100" });
    if (page !== null) uRLSearchParams.set("page", page);
    let h = await apiClient.get(
      `${channelMemoriesPath(channelId, "read project memory")}?${uRLSearchParams}`,
      {
        auth: "teleport-org",
        ...(await W()),
        validateStatus: () => !0,
        timeout: Pe,
        signal: signal,
        credentials: credentials,
      },
    );
    if (page === null && h.ok && h.status === 404) return;
    let b = checkChannelResponse(h, "read project memory").data,
      found = parseMemoryFileList(b).find((j) => j.path === path);
    if (found !== void 0) return found;
    let y = b?.next_page;
    if (typeof y !== "string" || y === "") return;
    page = y;
  }
  throw new ChannelApiError(
    "read project memory",
    null,
    "the project memory store has too many files to search",
    "bad_response",
  );
}
/**
 * 读取项目记忆中指定路径的文件内容与 sha256，不存在时返回 null。
 */
//@ chunk-dz3q485w.js:32964-33662 placement
async function readMemoryFile(channelId, path, signal, credentials) {
  try {
    let a = await findMemoryFileByPath(channelId, path, signal, credentials);
    if (a === void 0) return (logFeatureOk("projects_memory_read"), null);
    let l = await apiClient.get(
        `${channelMemoriesPath(channelId, "read project memory")}/${encodeURIComponent(a.id)}`,
        {
          auth: "teleport-org",
          ...(await W()),
          validateStatus: () => !0,
          timeout: Pe,
          signal: signal,
          credentials: credentials,
        },
      ),
      c = checkChannelResponse(l, "read project memory").data;
    if (typeof c?.content !== "string")
      throw new ChannelApiError(
        "read project memory",
        null,
        "the server returned an unexpected shape",
        "bad_response",
      );
    return (
      logFeatureOk("projects_memory_read"),
      {
        id: a.id,
        content: c.content,
        contentSha256: typeof c.content_sha256 === "string" ? c.content_sha256 : a.contentSha256,
      }
    );
  } catch (error) {
    if (signal?.aborted !== !0)
      logFeatureBad(
        "projects_memory_read",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
/**
 * 以内容 sha256 为前置条件替换项目记忆文件内容。
 */
//@ chunk-dz3q485w.js:33662-34247 placement
async function replaceMemoryFile(channelId, update, signal, credentials) {
  if (!MEMORY_ID_PATTERN.test(update.id))
    throw new ChannelApiError(
      "save to project memory",
      null,
      "the memory id has an unexpected shape",
      "invalid_input",
    );
  try {
    let post = await apiClient.post(
      `${channelMemoriesPath(channelId, "save to project memory")}/${encodeURIComponent(update.id)}`,
      {
        content: update.content,
        precondition: { type: "content_sha256", content_sha256: update.expectedSha256 },
      },
      {
        auth: "teleport-org",
        ...(await W()),
        validateStatus: () => !0,
        timeout: Pe,
        signal: signal,
        credentials: credentials,
      },
    );
    (checkChannelResponse(post, "save to project memory"), logFeatureOk("projects_memory_write"));
  } catch (error) {
    if (signal?.aborted !== !0)
      logFeatureBad(
        "projects_memory_write",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
/**
 * 保存项目记忆文件：不存在时创建，已存在时按当前 sha256 替换，返回 created / replaced / null。
 */
//@ chunk-dz3q485w.js:34247-34702 placement
async function saveOrReplaceMemoryFile(e, n, s, r, a = un) {
  let l = await saveMemoryFileIfAbsent(e, n, s, r, a, !1);
  if (l !== "kept-existing") return l;
  let c;
  try {
    if (((c = await findMemoryFileByPath(e, n.path, s, r)), c === void 0))
      throw new ChannelApiError(
        "save to project memory",
        null,
        "the existing file could not be found to update",
        "bad_response",
      );
  } catch (error) {
    if (s?.aborted !== !0)
      logFeatureBad(
        "projects_memory_write",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
  return (
    await replaceMemoryFile(e, { id: c.id, content: n.content, expectedSha256: c.contentSha256 }, s, r),
    "replaced"
  );
}

export { saveOrReplaceMemoryFile, saveMemoryFileIfAbsent, xe, readMemoryFile, replaceMemoryFile };
