/**
 * services/fileInputs/uploadPut.ts
 *
 * 2.1.316 新增：附件 PUT 上传与上传筛查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0c614h9c.js (7)
 * attribution: placement 7
 */
import { sep, join, basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { httpsOrigin, apiClient } from "../routines/routinesApi.js";
import { sleep } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { expandPathOrNull } from "../../utils/path.js";
import { env } from "../../utils/env.js";
import { isSyncedAttachPath } from "../../utils/readFileInRange.js";
import {
  DEFAULT_OUTPUTS_ROOT,
  DEFAULT_ATTACH_OUTPUTS_ROOT,
  PROJECT_FILES_LINK,
} from "../../utils/stageFileRoots.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { normalizeTrustedSymlink } from "../../utils/permissions/filesystem.js";
import { identity } from "../../utils/pathClassification.js";
import {
  isCredentialPath,
  isSensitiveBasenameWithVariants,
  isCredentialConfigPath_2,
} from "../../utils/permissions/sensitivePaths.js";
import { sessionUploadsDir } from "../../utils/uploadsDir.js";
import { uploadDisplayName, readValidatedFileWithin } from "../../utils/claudeInChrome/fileUpload.js";
import { BIDI_CONTROL_PATTERN } from "./screenPath.js";
import { computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-0c614h9c.js:887-1151 placement
/**
 * 重试等待上限（10 秒）。
 */
var UPLOAD_PUT_CONSTANTS = new Set(["x-upload-token", "content-type"]);
var MAX_TOKEN_HEADER_CHARS = 4096;
var PUT_TIMEOUT_MS = 120000;
var MAX_CONTENT_LENGTH = 4096;
var putResultSchema = DoctorLazy(() =>
  u({
    sha256: string(),
    size: E(),
  }),
);
var PUT_STATUS_REASONS = {
  400: "put_hash_mismatch",
  403: "put_refused",
  409: "put_already_used",
  410: "put_expired",
  413: "put_size_mismatch",
  429: "put_busy",
  503: "put_busy",
};
var MAX_BUSY_RETRIES = 2;
var DEFAULT_RETRY_DELAY_MS = 2000;
var MAX_RETRY_DELAY_MS = 1e4;
//@ chunk-0c614h9c.js:1151-2402 placement
/**
 * 把文件以 PUT 上传到预签名地址，校验主机、响应哈希与大小。
 */
async function putUploadFile(e, buf, l, uploadPathPrefix, n) {
  let _ = httpsOrigin(e.url);
  let f = _ === undefined ? undefined : new URL(e.url);
  if (
    _ === undefined ||
    f === undefined ||
    f.search !== "" ||
    f.hash !== "" ||
    !uploadPathPrefix.endsWith("/") ||
    !f.pathname.startsWith(uploadPathPrefix) ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(f.pathname.slice(uploadPathPrefix.length))
  )
    return "put_url_refused";
  let s = {
    "content-type": "application/octet-stream",
  };
  for (let [key, value] of Object.entries(e.headers)) {
    if (
      !UPLOAD_PUT_CONSTANTS.has(key.toLowerCase()) ||
      value.length > MAX_TOKEN_HEADER_CHARS ||
      /[^\x20-\x7e]/.test(value)
    )
      return "put_header_refused";
    s[key.toLowerCase()] = value;
  }
  try {
    for (let j = 0; ; j++) {
      let r = await apiClient.put(`/${f.pathname.slice(1)}`, buf, {
        auth: "none",
        baseUrl: _,
        headers: s,
        maxRedirects: 0,
        maxBodyLength: buf.length,
        maxContentLength: MAX_CONTENT_LENGTH,
        timeout: PUT_TIMEOUT_MS,
        signal: n,
        validateStatus: () => true,
      });
      if (!r.ok) return r.reason === "essential-traffic-only" ? "essential_traffic" : "egress_blocked";
      if (r.status === 200) {
        let b = putResultSchema().safeParse(r.data);
        return b.success && b.data.sha256 === l && b.data.size === buf.length ? undefined : "put_bad_answer";
      }
      let m = PUT_STATUS_REASONS[r.status] ?? "put_failed";
      if (m !== "put_busy" || j === MAX_BUSY_RETRIES) return m;
      let R = Number(r.response.headers["retry-after"]);
      await sleep(
        Number.isFinite(R) && R >= 0 ? Math.min(R * 1000, MAX_RETRY_DELAY_MS) : DEFAULT_RETRY_DELAY_MS,
        n,
      );
      if (n.aborted) return "canceled";
    }
  } catch (error) {
    if (n.aborted) return "canceled";
    logForDebugging(`[file inputs] upload threw: ${errorMessage(error)}`, {
      level: "error",
    });
    return getErrnoCode(error) === "ERR_BAD_RESPONSE" ? "put_bad_answer" : "put_network";
  }
}
//@ chunk-0c614h9c.js:2402-3294 placement
function createUploadScreen({
  screen,
  maxFileBytes,
  maxTotalBytes,
  uploadPathPrefix,
  namesResolvedPaths = false,
}) {
  return {
    async hash(_, f) {
      let s = [];
      let c = 0;
      for (let r of _) {
        if (f.aborted)
          return [
            ...s,
            {
              path: r,
              code: "canceled",
            },
          ];
        let m = await statUploadCandidate(r, screen, maxFileBytes);
        if ("code" in m)
          return [
            ...s,
            namesResolvedPaths
              ? m
              : {
                  path: r,
                  code: m.code,
                },
          ];
        c += m.buf.length;
        if (c > maxTotalBytes)
          return [
            ...s,
            {
              path: r,
              code: "too_large_total",
            },
          ];
        s.push({
          path: r,
          name: m.name,
          size: m.buf.length,
          sha256: m.sha256,
        });
      }
      return s;
    },
    async put(_, f) {
      let s = [];
      let c = 0;
      for (let { path, sha256, url, headers } of _) {
        if (f.aborted)
          return [
            ...s,
            {
              path,
              code: "canceled",
            },
          ];
        let g = await statUploadCandidate(path, screen, maxFileBytes);
        if ("code" in g)
          return [
            ...s,
            g.code === "resolves_elsewhere"
              ? {
                  path,
                  code: "changed",
                }
              : g,
          ];
        c += g.buf.length;
        if (c > maxTotalBytes)
          return [
            ...s,
            {
              path,
              code: "too_large_total",
            },
          ];
        if (g.sha256 !== sha256)
          return [
            ...s,
            {
              path,
              code: "changed",
            },
          ];
        let S = await putUploadFile(
          {
            url,
            headers,
          },
          g.buf,
          sha256,
          uploadPathPrefix,
          f,
        );
        if (S !== undefined)
          return [
            ...s,
            {
              path,
              code: S,
            },
          ];
        s.push({
          path,
          ok: true,
        });
      }
      return s;
    },
  };
}
//@ chunk-0c614h9c.js:3294-3512 placement
function isOutsideUploadRoot(e, realPath) {
  let l = expandPathOrNull(e);
  if (l === null) return true;
  return (
    e !== realPath &&
    normalizeUploadPath(l) !== normalizeUploadPath(realPath) &&
    !(
      env.CLAUDE_CODE_REMOTE === true &&
      isSyncedAttachPath(l, realPath, {
        product: DEFAULT_OUTPUTS_ROOT,
        attach: DEFAULT_ATTACH_OUTPUTS_ROOT,
      })
    ) &&
    !(
      isRemoteManagedEnvironment() &&
      env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" &&
      isSyncedAttachPath(l, realPath, PROJECT_FILES_LINK)
    )
  );
}
//@ chunk-0c614h9c.js:3512-3624 placement
function normalizeUploadPath(e) {
  return normalizeTrustedSymlink(identity(e.length > 1 && e.endsWith(sep) ? e.slice(0, -1) : e)).replace(
    /^[a-z]:/,
    (a) => a.toUpperCase(),
  );
}
//@ chunk-0c614h9c.js:3624-3726 placement
async function isUploadAllowedPath(e, a, { fromChat: l = false } = {}) {
  return (
    (await isCredentialPath(e, a)) ||
    (!l && [e, a].some((h) => isSensitiveBasenameWithVariants(h) || isCredentialConfigPath_2(h)))
  );
}
//@ chunk-0c614h9c.js:3726-4443 placement
async function statUploadCandidate(path, screen, maxFileBytes, { followsLinks: h = false } = {}) {
  let n = await screen(path);
  if (n === undefined)
    return {
      path,
      code: "path_rejected",
    };
  if (n.requiredDigest === undefined && (await isUploadAllowedPath(path, n.realPath, n))) {
    logForDebugging("[file inputs] a path was rejected: a credential, or Claude's own");
    return {
      path,
      code: "path_rejected",
    };
  }
  if (
    !h &&
    isOutsideUploadRoot(path, n.realPath) &&
    !(
      n.requiredDigest !== undefined &&
      expandPathOrNull(path) === join(sessionUploadsDir(), basename(n.realPath))
    )
  )
    return {
      path,
      code: "resolves_elsewhere",
      resolved: n.realPath,
    };
  let _ = await uploadDisplayName(n.realPath);
  if (BIDI_CONTROL_PATTERN.test(_))
    return {
      path,
      code: "name_direction",
    };
  let validatedFileWithin = await readValidatedFileWithin(n.realPath, maxFileBytes);
  if (!("buf" in validatedFileWithin))
    return {
      path,
      code: validatedFileWithin.refusal,
    };
  let contentHash = computeContentHash(validatedFileWithin.buf);
  if (n.requiredDigest !== undefined && contentHash !== n.requiredDigest)
    return {
      path,
      code: "path_rejected",
    };
  return {
    buf: validatedFileWithin.buf,
    name: _,
    sha256: contentHash,
  };
}
export { isUploadAllowedPath, statUploadCandidate, createUploadScreen };
