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
import { u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { kgr, apiClient } from "../routines/routinesApi.js";
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
import { mn } from "../../utils/remoteEnvironment.js";
import { normalizeTrustedSymlink } from "../../utils/permissions/filesystem.js";
import { Mn } from "../../utils/pathClassification.js";
import { Ope, B$e, isCredentialConfigPath } from "../../utils/permissions/sensitivePaths.js";
import { NA } from "../../utils/uploadsDir.js";
import { uploadDisplayName, readValidatedFileWithin } from "../../utils/claudeInChrome/fileUpload.js";
import { BIDI_CONTROL_PATTERN } from "./screenPath.js";
import { computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-0c614h9c.js:887-1151 placement
var UPLOAD_PUT_CONSTANTS = new Set(["x-upload-token", "content-type"]),
  A = 4096,
  P = 120000,
  D = 4096,
  U = DoctorLazy(() => u({ sha256: o(), size: E() })),
  C = {
    400: "put_hash_mismatch",
    403: "put_refused",
    409: "put_already_used",
    410: "put_expired",
    413: "put_size_mismatch",
    429: "put_busy",
    503: "put_busy",
  },
  F = 2,
  O = 2000,
  x = 1e4;
/**
 * 把文件以 PUT 上传到预签名地址，校验主机、响应哈希与大小。
 */
//@ chunk-0c614h9c.js:1151-2402 placement
async function putUploadFile(e, a, l, h, n) {
  let _ = kgr(e.url),
    f = _ === void 0 ? void 0 : new URL(e.url);
  if (
    _ === void 0 ||
    f === void 0 ||
    f.search !== "" ||
    f.hash !== "" ||
    !h.endsWith("/") ||
    !f.pathname.startsWith(h) ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(f.pathname.slice(h.length))
  )
    return "put_url_refused";
  let s = { "content-type": "application/octet-stream" };
  for (let [c, r] of Object.entries(e.headers)) {
    if (!UPLOAD_PUT_CONSTANTS.has(c.toLowerCase()) || r.length > A || /[^\x20-\x7e]/.test(r))
      return "put_header_refused";
    s[c.toLowerCase()] = r;
  }
  try {
    for (let c = 0; ; c++) {
      let put = await apiClient.put(`/${f.pathname.slice(1)}`, a, {
        auth: "none",
        baseUrl: _,
        headers: s,
        maxRedirects: 0,
        maxBodyLength: a.length,
        maxContentLength: D,
        timeout: P,
        signal: n,
        validateStatus: () => !0,
      });
      if (!put.ok) return put.reason === "essential-traffic-only" ? "essential_traffic" : "egress_blocked";
      if (put.status === 200) {
        let safeParse = U().safeParse(put.data);
        return safeParse.success && safeParse.data.sha256 === l && safeParse.data.size === a.length
          ? void 0
          : "put_bad_answer";
      }
      let m = C[put.status] ?? "put_failed";
      if (m !== "put_busy" || c === F) return m;
      let R = Number(put.response.headers["retry-after"]);
      if ((await sleep(Number.isFinite(R) && R >= 0 ? Math.min(R * 1000, x) : O, n), n.aborted))
        return "canceled";
    }
  } catch (error) {
    if (n.aborted) return "canceled";
    return (
      logForDebugging(`[file inputs] upload threw: ${errorMessage(error)}`, { level: "error" }),
      getErrnoCode(error) === "ERR_BAD_RESPONSE" ? "put_bad_answer" : "put_network"
    );
  }
}
//@ chunk-0c614h9c.js:2402-3294 placement
function createUploadScreen({
  screen: screen,
  maxFileBytes: maxFileBytes,
  maxTotalBytes: maxTotalBytes,
  uploadPathPrefix: uploadPathPrefix,
  namesResolvedPaths: namesResolvedPaths = !1,
}) {
  return {
    async hash(_, f) {
      let s = [],
        c = 0;
      for (let r of _) {
        if (f.aborted) return [...s, { path: r, code: "canceled" }];
        let m = await statUploadCandidate(r, screen, maxFileBytes);
        if ("code" in m) return [...s, namesResolvedPaths ? m : { path: r, code: m.code }];
        if (((c += m.buf.length), c > maxTotalBytes)) return [...s, { path: r, code: "too_large_total" }];
        s.push({ path: r, name: m.name, size: m.buf.length, sha256: m.sha256 });
      }
      return s;
    },
    async put(_, f) {
      let s = [],
        c = 0;
      for (let { path: path, sha256: sha256, url: url, headers: headers } of _) {
        if (f.aborted) return [...s, { path: path, code: "canceled" }];
        let g = await statUploadCandidate(path, screen, maxFileBytes);
        if ("code" in g) return [...s, g.code === "resolves_elsewhere" ? { path: path, code: "changed" } : g];
        if (((c += g.buf.length), c > maxTotalBytes)) return [...s, { path: path, code: "too_large_total" }];
        if (g.sha256 !== sha256) return [...s, { path: path, code: "changed" }];
        let S = await putUploadFile({ url: url, headers: headers }, g.buf, sha256, uploadPathPrefix, f);
        if (S !== void 0) return [...s, { path: path, code: S }];
        s.push({ path: path, ok: !0 });
      }
      return s;
    },
  };
}
//@ chunk-0c614h9c.js:3294-3512 placement
function isOutsideUploadRoot(e, a) {
  let l = expandPathOrNull(e);
  if (l === null) return !0;
  return (
    e !== a &&
    normalizeUploadPath(l) !== normalizeUploadPath(a) &&
    !(
      env.CLAUDE_CODE_REMOTE === !0 &&
      isSyncedAttachPath(l, a, { product: DEFAULT_OUTPUTS_ROOT, attach: DEFAULT_ATTACH_OUTPUTS_ROOT })
    ) &&
    !(
      mn() &&
      env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" &&
      isSyncedAttachPath(l, a, PROJECT_FILES_LINK)
    )
  );
}
//@ chunk-0c614h9c.js:3512-3624 placement
function normalizeUploadPath(e) {
  return normalizeTrustedSymlink(Mn(e.length > 1 && e.endsWith(sep) ? e.slice(0, -1) : e)).replace(
    /^[a-z]:/,
    (a) => a.toUpperCase(),
  );
}
//@ chunk-0c614h9c.js:3624-3726 placement
async function isUploadAllowedPath(e, a, { fromChat: l = !1 } = {}) {
  return (await Ope(e, a)) || (!l && [e, a].some((h) => B$e(h) || isCredentialConfigPath(h)));
}
//@ chunk-0c614h9c.js:3726-4443 placement
async function statUploadCandidate(e, a, l, { followsLinks: h = !1 } = {}) {
  let n = await a(e);
  if (n === void 0) return { path: e, code: "path_rejected" };
  if (n.requiredDigest === void 0 && (await isUploadAllowedPath(e, n.realPath, n)))
    return (
      logForDebugging("[file inputs] a path was rejected: a credential, or Claude's own"),
      { path: e, code: "path_rejected" }
    );
  if (
    !h &&
    isOutsideUploadRoot(e, n.realPath) &&
    !(n.requiredDigest !== void 0 && expandPathOrNull(e) === join(NA(), basename(n.realPath)))
  )
    return { path: e, code: "resolves_elsewhere", resolved: n.realPath };
  let _ = await uploadDisplayName(n.realPath);
  if (BIDI_CONTROL_PATTERN.test(_)) return { path: e, code: "name_direction" };
  let f = await readValidatedFileWithin(n.realPath, l);
  if (!("buf" in f)) return { path: e, code: f.refusal };
  let s = computeContentHash(f.buf);
  if (n.requiredDigest !== void 0 && s !== n.requiredDigest) return { path: e, code: "path_rejected" };
  return { buf: f.buf, name: _, sha256: s };
}

export { isUploadAllowedPath, statUploadCandidate, createUploadScreen };
