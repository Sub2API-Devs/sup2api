/**
 * utils/claudeInChrome/fileUpload.ts
 *
 * 2.1.316 新增：Claude in Chrome / 桌面浏览器面板的 file_upload：路径校验（网络路径、别名命名空间、读权限、凭据目录）与安全读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wn385gmf.js (47)
 * attribution: placement 47
 */
import { constants, constants as constants_2 } from "fs";
import {
  realpath,
  lstat,
  open,
  open as open_2,
  stat,
  stat as stat_2,
  readlink,
  readlink as readlink_2,
} from "fs/promises";
import { dirname, basename, isAbsolute, sep, extname } from "path";
import {
  spellingsToJudge,
  pathInAllowedWorkingPath,
  checkReadableInternalPath,
  outsideReadBlocked,
  isUntrustedUncPath,
  isUntrustedAutomountPath,
  hasSuspiciousWindowsPathPattern,
  matchingRuleForInput,
  allWorkingDirectories,
  getResolvedWorkingDirPaths,
  pathInWorkingPath,
} from "../permissions/filesystem.js";
import { NA, Mai, Dot } from "../uploadsDir.js";
import { env } from "../env.js";
import { getStageFileRoot, getOutputsRoot } from "../stageFileRoots.js";
import { S1 } from "../userDataRoots.js";
import { logForDebugging } from "../debug.js";
import { UPLOAD_IN_BATCH_UNAVAILABLE, FILE_UPLOAD_UNAVAILABLE } from "./common.js";
import { x$e, ANTHROPIC_CHROMEUPLOADFILES } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { isDiskless } from "../../bootstrap/state.js";
import { computeContentHash } from "../commitAttribution.js";
import { expandPath } from "../path.js";
import { gb, Qn, isMacSpecialPath } from "../pathClassification.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
  isPathAbsent,
  sanitizeErrnoForTelemetry,
} from "../errors.js";
import { getPathsForNetworkScreen, getPathsForPermissionCheck } from "../fsOperations.js";
import { getPlatform } from "../platform.js";
import { getDenyRuleForTool, getAskRuleForTool } from "../permissions/permissions.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { foldCase, Qg } from "../networkPaths.js";
import { classifyCredentialPath, j$e, isInClaudeConfigDir } from "../permissions/sensitivePaths.js";
import { isReservedDeviceName } from "../windowsProfileFolders.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { isPathAllowed, isOnlyOutsideWorkingFoldersRefusal } from "../permissions/pathValidation.js";
import { OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { CCR_OAUTH_TOKEN_PATH } from "../authFileDescriptor.js";

/**
 * --restricted 会话或"禁止读工作目录外"时判断路径是否被拒：受限模式下不在允许工作路径且内部可读检查不放行，或命中外部读阻断。
 */
//@ chunk-wn385gmf.js:1508-1631 placement
function isRestrictedReadBlocked(n, e) {
  let r = e.restricted && spellingsToJudge(n);
  return (
    (r &&
      !pathInAllowedWorkingPath(n, e, r) &&
      checkReadableInternalPath(n, {}, r, { restricted: !0 }).behavior !== "allow") ||
    outsideReadBlocked(n, e)
  );
}
//@ chunk-wn385gmf.js:1631-1717 placement
class vot extends Error {
  constructor() {
    super("the name or the place of a credential");
  }
}
//@ chunk-wn385gmf.js:1717-1945 placement
var O_NOFOLLOW = constants.O_NOFOLLOW,
  O_NONBLOCK = constants.O_NONBLOCK,
  O_DIRECTORY = constants.O_DIRECTORY,
  FILE_UPLOAD_MAX_TOTAL_BYTES = 10485760,
  L = {
    tag: "chrome",
    validate: validateUploadPath,
    rejection: notReadableUploadMessage,
    noPaths: "file_upload requires a non-empty `paths` array of files the user has shared with this session.",
    namesSource: !1,
  };
/**
 * 列出上传可信的暂存根目录：附件目录，远程模式或设置 CLAUDE_STAGE_FILE_ROOT 时加上暂存根（来自聊天）与输出根。
 */
//@ chunk-wn385gmf.js:1945-2341 placement
async function stagingRoots(n) {
  let e = [{ path: NA(), kind: "attachments" }];
  if (n.isRemoteMode || env.CLAUDE_STAGE_FILE_ROOT)
    try {
      if (
        (e.push({ path: getStageFileRoot(), kind: "staging", fromChat: !0 }),
        S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND))
      )
        e.push({ path: getOutputsRoot(), kind: "staging" });
    } catch (error) {
      logForDebugging(
        `[chrome file_upload] stage root unresolvable, skipping staging roots (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  return e;
}
//@ chunk-wn385gmf.js:2341-3033 placement
async function prepareChromeFileUploadInput(
  n,
  e,
  r,
  { maxTotalBytes: s = FILE_UPLOAD_MAX_TOTAL_BYTES, hosted: o, screen: a = L.validate } = {},
) {
  let u = { remaining: s, total: s },
    l = () => routeFileUploadCalls(n, e, (h) => prepareFileUploadInput(h, r, u, { ...L, validate: a }));
  if (o === void 0) return l();
  if (n !== "file_upload") {
    let h = { error: UPLOAD_IN_BATCH_UNAVAILABLE };
    return routeFileUploadCalls(n, e, async () => h, x$e.peek(o.session)?.host ? h : M);
  }
  if ("files" in e)
    return {
      error: "file_upload takes `paths`, not `files`. Nothing was uploaded. Call it again without `files`.",
    };
  let c = isDiskless() ? x$e.peek(o.session)?.host : void 0,
    f;
  if (c) {
    let { paths: paths } = e;
    if (!Array.isArray(paths) || paths.length === 0) return { error: L.noPaths };
    f = await c.read(paths, r, s, o.signal, !1);
  } else {
    let h = await l();
    f = { files: h.input?.files, error: h.error };
  }
  return f.error !== void 0
    ? { error: f.error }
    : { input: e, callMeta: { [ANTHROPIC_CHROMEUPLOADFILES]: f.files } };
}
//@ chunk-wn385gmf.js:3033-3474 placement
async function preparePaneFileUploadInput(n, e, { hostAsksPerFile: hostAsksPerFile }) {
  if (isDiskless()) return M;
  if (Array.isArray(n.paths) && n.paths.length > 1)
    return {
      error:
        "file_upload takes one file per call in this browser pane. Nothing was uploaded. Call it once for each file.",
    };
  return prepareFileUploadInput(
    n,
    e,
    { remaining: FILE_UPLOAD_MAX_TOTAL_BYTES, total: FILE_UPLOAD_MAX_TOTAL_BYTES },
    {
      tag: "pane",
      validate: (o, a) => validatePaneUploadPath(o, a, hostAsksPerFile),
      rejection: notSharedUploadMessage,
      noPaths:
        "file_upload needs `paths` to be an array holding one absolute file path. Nothing was uploaded.",
      namesSource: !0,
    },
  );
}
//@ chunk-wn385gmf.js:3474-4057 placement
async function passThroughChromeFileUploadInput(n, e, r) {
  return routeFileUploadCalls(n, e, async (s) => {
    let paths = s.paths;
    if (!Array.isArray(paths) || paths.length === 0)
      return {
        error:
          "file_upload requires a non-empty `paths` array of files the user has shared with this session.",
      };
    let a = [];
    for (let f of paths) {
      if (typeof f !== "string") return { error: "file_upload `paths` entries must be strings." };
      try {
        a.push(await D(f, r));
      } catch (error) {
        return (
          logForDebugging(
            `[chrome file_upload] rejected path (pass-through): ${f} (${error instanceof Error ? error.message : String(error)})`,
          ),
          {
            error:
              error instanceof j
                ? relativeUploadPathMessage(f)
                : error instanceof vot
                  ? credentialPathUploadMessage(f)
                  : notSharedUploadMessage(f),
          }
        );
      }
    }
    let { files: files, paths: paths_2, ...c } = s;
    return { input: { ...c, paths: a } };
  });
}
/**
 * 对 file_upload（含 browser_batch 中的 file_upload 子动作）调用 r 改写输入；无盘模式直接返回 s（拒绝）。
 * batch 子动作必须是带字符串名的对象、不能嵌套，伪装成 file_upload 的名字被拒。
 */
//@ chunk-wn385gmf.js:4057-5017 placement
async function routeFileUploadCalls(toolName, args, prepareInput, disklessResult = M) {
  if (toolName === "file_upload") return isDiskless() ? disklessResult : prepareInput(args);
  if (toolName === "browser_batch") {
    if (!Array.isArray(args.actions)) return { error: "browser_batch requires an `actions` array." };
    let o = [...args.actions],
      a = !1;
    for (let u = 0; u < o.length; u++) {
      let l = o[u];
      if (typeof l !== "object" || l === null || typeof l.name !== "string")
        return {
          error:
            "browser_batch sub-actions must be objects with a string name, and browser_batch cannot be nested.",
        };
      let c = l.name;
      if (!/^[\x20-\x7E]+$/.test(c)) return { error: z(c) };
      let lower = c.trim().toLowerCase();
      if (lower === "browser_batch")
        return {
          error:
            "browser_batch sub-actions must be objects with a string name, and browser_batch cannot be nested.",
        };
      if (lower === "file_upload" && c !== "file_upload") return { error: z(c) };
      if (c !== "file_upload") continue;
      let h = l,
        g = typeof h.input === "object" && h.input !== null ? h.input : {},
        p = isDiskless() ? disklessResult : await prepareInput(g);
      if (p.error) return { error: p.error };
      if (p.input !== h.input) ((o[u] = { ...h, input: p.input }), (a = !0));
    }
    return a ? { input: { ...args, actions: o } } : { input: args };
  }
  return { input: args };
}
//@ chunk-wn385gmf.js:5017-5035 placement
var M = { error: FILE_UPLOAD_UNAVAILABLE };
//@ chunk-wn385gmf.js:5035-5121 placement
function x(n) {
  return n.replace(/["\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "\uFFFD");
}
//@ chunk-wn385gmf.js:5121-5315 placement
function notReadableUploadMessage(n) {
  return `Cannot upload "${x(n)}": only files this session is allowed to read can be uploaded. Ask the user to share the file with this session, or to add its folder with /add-dir.`;
}
//@ chunk-wn385gmf.js:5315-5548 placement
function credentialPathUploadMessage(n) {
  return `Cannot upload "${x(n)}": its name or folder is one that credentials are kept under (such as .env, a .pem or .key file, or .ssh), so it is not uploaded on Claude's word alone. Tell the user it was not uploaded.`;
}
//@ chunk-wn385gmf.js:5548-5720 placement
function notSharedUploadMessage(n) {
  return `Cannot upload "${x(n)}": only files this session is allowed to read can be uploaded. Ask the user to share the file or its folder with this session.`;
}
//@ chunk-wn385gmf.js:5720-5921 placement
function relativeUploadPathMessage(n) {
  return `Cannot upload "${x(n)}": file_upload \`paths\` must be absolute paths as this session sees them (for example /sessions/\u2026 in a Cowork VM, or a drive-letter path on Windows).`;
}
//@ chunk-wn385gmf.js:5921-6009 placement
function z(n) {
  return `browser_batch sub-action name "${x(n)}" is not a valid tool name.`;
}
/**
 * 校验并读取 file_upload 的每个路径：调用 s.validate 得到真实路径与需要的摘要，按总量上限读取文件、核对摘要，
 * 把内容编码进新的输入；任一路径失败返回 {error}（凭据目录用专门文案）。
 */
//@ chunk-wn385gmf.js:6009-7081 placement
async function prepareFileUploadInput(input, permissionContext, budget, options) {
  let paths = input.paths;
  if (!Array.isArray(paths) || paths.length === 0) return { error: options.noPaths };
  let a = [];
  for (let m of paths) {
    if (typeof m !== "string") return { error: "file_upload `paths` entries must be strings." };
    let w, b, R, _;
    try {
      ({
        realPath: w,
        requiredDigest: b,
        outsideWorkingFolders: R,
        needsHostAsk: _,
      } = await options.validate(m, permissionContext));
    } catch (error) {
      return (
        logForDebugging(
          `[${options.tag} file_upload] rejected path: ${m} (${error instanceof Error ? error.message : String(error)})`,
        ),
        { error: error instanceof vot ? credentialPathUploadMessage(m) : options.rejection(m) }
      );
    }
    let y = await readUploadFile(m, w, budget, options.tag, R ? options.rejection : void 0);
    if ("error" in y) return { error: y.error };
    if (b !== void 0 && computeContentHash(y.buf) !== b)
      return (
        logForDebugging(`[${options.tag} file_upload] registered attachment digest mismatch: ${m}`),
        { error: options.rejection(m) }
      );
    a.push({
      data: y.buf.toString("base64"),
      name: await uploadDisplayName(w),
      mimeType: guessMimeType(w),
      ...(options.namesSource && {
        sourcePath: w,
        requestedPath: x(m).replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "\uFFFD"),
        needsHostAsk: _ !== !1,
      }),
    });
  }
  let { paths: paths_2, ...l } = input;
  if (!options.namesSource) return { input: { ...l, files: a } };
  let {
    needsHostAsk: needsHostAsk,
    sourcePath: sourcePath,
    requestedPath: requestedPath,
    hostAsksPerFile: hostAsksPerFile,
    ...p
  } = l;
  return { input: { ...p, files: a } };
}
//@ chunk-wn385gmf.js:7081-7186 placement
async function uploadDisplayName(n) {
  let e = await realpath(NA()).catch(() => {
    return;
  });
  return e !== void 0 && dirname(n) === e ? Mai(basename(n)) : basename(n);
}
/**
 * 访问文件系统前拒绝网络路径（UNC、自动挂载）与无法核验祖先链的路径，返回绝对路径及其链。
 */
//@ chunk-wn385gmf.js:7186-7671 placement
function screenNetworkPath(n, e) {
  let r = expandPath(n),
    trimmed = n.trim();
  if (gb(trimmed) || gb(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `network path not allowed: ${gb(trimmed) ? trimmed : r}`,
      "claudeInChrome/fileUpload: network path rejected before filesystem access",
    );
  let { paths: paths, vetted: vetted } = getPathsForNetworkScreen(r);
  if (!vetted)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path could not be vetted (symbolic link chain or unreadable component)",
      "claudeInChrome/fileUpload: unvettable path ancestry rejected before filesystem access",
    );
  let trustedNetworkDirectories = e.trustedNetworkDirectories;
  for (let l of [trimmed, ...paths]) assertNotNetworkOrSuspicious(l, trustedNetworkDirectories);
  return { absPath: r, absChain: paths };
}
//@ chunk-wn385gmf.js:7671-7933 placement
function assertNotNetworkOrSuspicious(n, e) {
  if (isUntrustedUncPath(n, e) || isUntrustedAutomountPath(n, e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `network path not allowed: ${n}`,
      "claudeInChrome/fileUpload: network path rejected",
    );
  if (hasSuspiciousWindowsPathPattern(n, e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `suspicious path spelling: ${n}`,
      "claudeInChrome/fileUpload: suspicious Windows path pattern rejected",
    );
}
//@ chunk-wn385gmf.js:7933-8218 placement
function assertNoReadRule(n, e, r = {}) {
  for (let s of n) {
    if (matchingRuleForInput(s, e, "read", "deny", r))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read denied: ${s}`,
        "claudeInChrome/fileUpload: path matches a read deny rule",
      );
    if (matchingRuleForInput(s, e, "read", "ask", r))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read requires approval: ${s}`,
        "claudeInChrome/fileUpload: path matches a read ask rule",
      );
  }
}
//@ chunk-wn385gmf.js:8218-8241 placement
var we = 4096,
  oe = 3,
  ye = 64;
//@ chunk-wn385gmf.js:8241-8312 placement
async function D(n, e, r = oe, s = new Set()) {
  return (await screenUnreadUpload(n, e, r, s)).judged;
}
/**
 * 审查要上传的文件路径（空白填充、过长、网络路径、别名命名空间、读权限、凭据目录），返回拒绝原因或可读句柄。
 */
//@ chunk-wn385gmf.js:8312-10450 placement
async function screenUnreadUpload(n, e, r = oe, s = new Set()) {
  let trimmed = n.trim();
  if (trimmed !== n)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "surrounding whitespace",
      "claudeInChrome/fileUpload: whitespace-padded path rejected on the pass-through",
    );
  if (trimmed.length > we)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path too long",
      "claudeInChrome/fileUpload: over-long path rejected on the pass-through",
    );
  if (r < 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `nested percent-encoding: ${trimmed}`,
      "claudeInChrome/fileUpload: multiply percent-encoded path rejected on the pass-through",
    );
  if (trimmed.split(/[/\\]/).some((p) => p === ".."))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `parent-segment spelling not allowed: ${trimmed}`,
      "claudeInChrome/fileUpload: dot-dot segment rejected on the pass-through",
    );
  assertNotAliasNamespace(trimmed);
  let a = expandPath(trimmed);
  if (!isAbsoluteAsSeen(trimmed, a)) throw new j();
  if (getPlatform() !== "windows" && trimmed.includes("\\"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `backslash in a POSIX spelling: ${trimmed}`,
      "claudeInChrome/fileUpload: backslash spelling rejected on the pass-through",
    );
  if (/[/\\]\.?$/.test(trimmed))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "trailing separator",
      "claudeInChrome/fileUpload: trailing-separator path rejected on the pass-through",
    );
  if (
    getDenyRuleForTool(e, { name: FILE_READ_TOOL_NAME }) !== null ||
    getAskRuleForTool(e, { name: FILE_READ_TOOL_NAME }) !== null
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Read tool is restricted for this session",
      "claudeInChrome/fileUpload: Read tool denied or ask-gated for this session (pass-through)",
    );
  for (let p of [trimmed, a]) {
    let m = await q(p);
    if (m !== void 0)
      throw m === "credential_name"
        ? new vot()
        : passThroughRefusal("a kernel or device path, or one of Claude Code's own credentials");
  }
  let joined = trimmed
    .split(/([/\\])/)
    .map((p) => {
      if (p === "/" || p === "\\" || !p.includes("%")) return p;
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    })
    .join("");
  if (joined !== trimmed) await D(joined, e, r - 1, s);
  let { absChain: absChain } = screenNetworkPath(trimmed, e);
  for (let p of absChain) assertNotAliasNamespace(p);
  let { realPath: realPath, looped: looped, spellings: spellings } = await realpathWithSpellings(a);
  for (let p of spellings)
    (assertNotNetworkOrSuspicious(p, e.trustedNetworkDirectories), assertNotAliasNamespace(p));
  let g = new Set();
  for (let p of new Set([trimmed, ...absChain, ...spellings])) {
    let m = stripStreamSuffix(p);
    if (m !== null && !s.has(m)) {
      if (s.size >= ye)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "too many stream-base spellings",
          "claudeInChrome/fileUpload: stream-base fan-out rejected on the pass-through",
        );
      s.add(m);
      try {
        await D(m, e, r, s);
      } catch (error) {
        throw error instanceof vot ? passThroughRefusal(PASS_THROUGH_REFUSAL_NOTE) : error;
      }
    }
    for (let w of [p, foldCase(p)]) g.add(w).add(w.normalize("NFC")).add(w.normalize("NFD"));
  }
  (assertNoReadRule(g, e), assertNoReadRule(g, e, { caseInsensitiveTarget: !0 }));
  for (let p of g) if ((await q(p)) !== void 0) throw passThroughRefusal(PASS_THROUGH_REFUSAL_NOTE);
  return { judged: a, resolved: realPath, linked: absChain.length > 1 || looped };
}
//@ chunk-wn385gmf.js:10450-10494 placement
function q(n) {
  return classifyCredentialPath(n, n, { readable: !0 });
}
//@ chunk-wn385gmf.js:10494-10609 placement
var PASS_THROUGH_REFUSAL_NOTE =
  "a name or place reached through a link, a case- or Unicode-folded spelling, or the file before a ':stream'";
//@ chunk-wn385gmf.js:10609-10722 placement
function passThroughRefusal(n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    n,
    "claudeInChrome/fileUpload: path refused by its name or place on the pass-through",
  );
}
//@ chunk-wn385gmf.js:10722-10831 placement
function isAbsoluteAsSeen(n, e) {
  if (Qn(n) || Qn(e)) return !0;
  if (!isAbsolute(n)) return !1;
  return getPlatform() !== "windows" || /^[a-z]:[\\/]/i.test(e);
}
/**
 * 若路径末段带 NTFS 备用数据流（name:stream），返回去掉 ":stream" 的部分（先去掉尾部的 / 和 /.）；否则返回 null。
 */
//@ chunk-wn385gmf.js:10831-11173 placement
function stripStreamSuffix(n) {
  let e = n.length;
  for (;;) {
    let u = n[e - 1];
    if (u === "/" || u === "\\") {
      e -= 1;
      continue;
    }
    if (u === "." && e >= 2 && (n[e - 2] === "/" || n[e - 2] === "\\")) {
      e -= 2;
      continue;
    }
    break;
  }
  let sliced = n.slice(0, e),
    s = Math.max(sliced.lastIndexOf("/"), sliced.lastIndexOf("\\")) + 1,
    index = sliced.indexOf(":", s + 1);
  if (index === -1 || (s === 0 && index === 1)) return null;
  let a = index;
  while (a > s && sliced[a - 1] === " ") a -= 1;
  return sliced.slice(0, a);
}
//@ chunk-wn385gmf.js:11173-11249 placement
class j extends Error {
  constructor() {
    super("not an anchored absolute path");
  }
}
//@ chunk-wn385gmf.js:11249-11406 placement
async function realpathWithSpellings(n) {
  let e;
  try {
    e = await realpath(n);
  } catch (error) {
    return { realPath: void 0, looped: getErrnoCode(error) === "ELOOP", spellings: [] };
  }
  return { realPath: e, looped: !1, spellings: getPathsForPermissionCheck(e) };
}
/**
 * 拒绝内核别名命名空间路径：/dev、/proc、..namedfork、:$ 类 NTFS 属性、及其他别名拼写。
 */
//@ chunk-wn385gmf.js:11406-11726 placement
function assertNotAliasNamespace(n) {
  let replaced = n.replace(/\\/g, "/");
  if (
    /^\/(?:dev|proc)(?:\/|$)/i.test(replaced) ||
    isMacSpecialPath(replaced) ||
    /(?:^|\/)\.\.namedfork(?:\/|$)/i.test(replaced) ||
    /:\$[a-z_]/i.test(replaced) ||
    Qg(replaced) ||
    replaced.split("/").some(isReservedDeviceName)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `alias namespace path not allowed: ${n}`,
      "claudeInChrome/fileUpload: kernel alias namespace path rejected on the pass-through",
    );
}
//@ chunk-wn385gmf.js:11726-11814 placement
async function A(n, e) {
  if ((await classifyCredentialPath(n, e, { readable: !0 })) === "credential_name") throw new vot();
}
/**
 * file_upload 路径的公共核验：长度上限、非暂存目录时的通道检查、网络路径、读规则、内核/设备路径或 Claude Code 凭据、Read 工具受限、外部读阻断等；
 * 返回 {absPath, realPath, pathsToCheck, sharedWithSession?}。
 */
//@ chunk-wn385gmf.js:11814-13725 placement
async function vetUploadPath(path, permissionContext) {
  if (path.length > j$e)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path too long",
      "claudeInChrome/fileUpload: over-long path rejected",
    );
  let roots = await stagingRoots(permissionContext),
    absPath = expandPath(path);
  if (!roots.some((f) => (f.fromChat || f.kind === "attachments") && absPath.startsWith(f.path + sep)))
    await A(absPath, absPath);
  let { absPath: absPath_2, absChain: absChain } = screenNetworkPath(path, permissionContext),
    trustedNetworkDirectories = permissionContext.trustedNetworkDirectories,
    l = await realpath(absPath_2),
    c = new Set([...absChain, ...getPathsForPermissionCheck(l)]);
  for (let f of c) assertNotNetworkOrSuspicious(f, trustedNetworkDirectories);
  if (
    (assertNoReadRule(c, permissionContext),
    (await classifyCredentialPath(absPath_2, l, { readable: !0, attached: !0 })) !== void 0)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `kernel or device path, or one of Claude Code's credentials: ${l}`,
      "claudeInChrome/fileUpload: kernel or device path, or one of Claude Code's own credentials",
    );
  for (let f of roots) {
    let h = await lstat(f.path).catch(() => null);
    if (h === null || h.isSymbolicLink() || !h.isDirectory()) continue;
    let g = await open(f.path, constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW).catch(() => null);
    if (g === null) continue;
    let p;
    try {
      let stats = await g.stat();
      if (!stats.isDirectory()) continue;
      let w = await realpath(f.path).catch(() => {
        return;
      });
      if (w === void 0) continue;
      let b = await stat(w).catch(() => null);
      if (b === null || b.ino !== stats.ino || b.dev !== stats.dev) continue;
      p = w;
    } finally {
      await g.close();
    }
    if (l === p || l.startsWith(p + sep)) {
      if (f.kind === "staging") {
        let w = await realpath(getClaudeConfigDir()).catch(() => getClaudeConfigDir());
        if (p === w || p.startsWith(w + sep) || w.startsWith(p + sep)) continue;
        if (!f.fromChat) await A(absPath_2, l);
        return {
          absPath: absPath_2,
          realPath: l,
          pathsToCheck: c,
          sharedWithSession: f.fromChat ? { fromChat: !0 } : {},
        };
      }
      let m = Dot(l);
      if (m !== void 0)
        return { absPath: absPath_2, realPath: l, pathsToCheck: c, sharedWithSession: { requiredDigest: m } };
      break;
    }
  }
  if (
    getDenyRuleForTool(permissionContext, { name: FILE_READ_TOOL_NAME }) !== null ||
    getAskRuleForTool(permissionContext, { name: FILE_READ_TOOL_NAME }) !== null
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Read tool is restricted for this session",
      "claudeInChrome/fileUpload: Read tool denied or ask-gated for this session",
    );
  if (permissionContext.blockReadsOutsideWorkingDirectories)
    for (let f of c) {
      let h = isPathAllowed(f, permissionContext, "read");
      if (
        !h.allowed &&
        h.decisionReason?.type === "safetyCheck" &&
        h.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `read not allowed: ${f}`,
          "claudeInChrome/fileUpload: path outside the working directories under the read block",
        );
    }
  return { absPath: absPath_2, realPath: l, pathsToCheck: c };
}
//@ chunk-wn385gmf.js:13725-14297 placement
async function validateUploadPath(n, e) {
  let {
    absPath: absPath,
    realPath: realPath,
    pathsToCheck: pathsToCheck,
    sharedWithSession: sharedWithSession,
  } = await vetUploadPath(n, e);
  if (sharedWithSession !== void 0) return { realPath: realPath, ...sharedWithSession };
  if (e.mode === "bypassPermissions" && !e.restricted)
    return (await A(absPath, realPath), { realPath: realPath });
  for (let u of pathsToCheck) {
    if (!isPathAllowed(u, e, "read").allowed)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed: ${u}`,
        "claudeInChrome/fileUpload: path read not allowed by session permissions",
      );
    if (e.restricted && isRestrictedReadBlocked(u, e))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed under --restricted: ${u}`,
        "claudeInChrome/fileUpload: restricted mode refused a file only an allow rule opens",
      );
  }
  return (await A(absPath, realPath), { realPath: realPath });
}
/**
 * 桌面浏览器面板的路径校验：在 vetUploadPath 基础上逐个用 isPathAllowed 判断，工作目录外的文件标记 outsideWorkingFolders / needsHostAsk，交由宿主逐个询问。
 */
//@ chunk-wn385gmf.js:14297-15520 placement
async function validatePaneUploadPath(path, permissionContext, hostAsksPerFile) {
  let {
    absPath: absPath,
    realPath: realPath,
    pathsToCheck: pathsToCheck,
    sharedWithSession: sharedWithSession,
  } = await vetUploadPath(path, permissionContext);
  if (sharedWithSession !== void 0) return { realPath: realPath, ...sharedWithSession, needsHostAsk: !0 };
  let { restricted: restricted } = permissionContext,
    c = isInWorkingDirectory(realPath, permissionContext),
    f = !1,
    h = !1;
  for (let p of pathsToCheck) {
    let m = isPathAllowed(p, permissionContext, "read");
    if (
      m.allowed &&
      !(restricted && m.decisionReason?.type === "rule") &&
      (m.decisionReason !== void 0 || c)
    ) {
      h ||= m.decisionReason !== void 0;
      continue;
    }
    let w =
      !m.allowed && !isOnlyOutsideWorkingFoldersRefusal(m)
        ? `refused by isPathAllowed (${m.decisionReason?.type ?? "no reason given"})`
        : restricted
          ? "--restricted session: no rule or host question reaches outside the working folders"
          : !hostAsksPerFile
            ? "outside the working folders, and the host does not ask per file"
            : void 0;
    if (w !== void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed (${w}): ${p}`,
        "claudeInChrome/fileUpload: pane path read not allowed by session permissions",
      );
    f = !0;
  }
  if (!f)
    return (
      await A(absPath, realPath),
      {
        realPath: realPath,
        needsHostAsk:
          h ||
          (await isInClaudeConfigDir(realPath, K).catch(
            (p) => (
              logForDebugging(
                `[pane file_upload] own-files check failed, so the host asks: ${errorMessage(p)}`,
              ),
              !0
            ),
          )),
      }
    );
  let g = await classifyCredentialPath(absPath, realPath, { realDirectory: K });
  if (g !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `refused by its name or place (${g}): ${realPath}`,
      "claudeInChrome/fileUpload: pane path outside the working folders is one of Claude Code's own files or is named like a credential",
    );
  return { realPath: realPath, outsideWorkingFolders: !0, needsHostAsk: !0 };
}
//@ chunk-wn385gmf.js:15520-15654 placement
function isInWorkingDirectory(n, e) {
  return Array.from(allWorkingDirectories(e))
    .flatMap((r) => getResolvedWorkingDirPaths(r))
    .some((r) => pathInWorkingPath(n, r, { caseFold: !1, skipPrivateAlias: !0, uncShapeParity: !0 }));
}
//@ chunk-wn385gmf.js:15654-15732 placement
async function K(n) {
  try {
    return await realpath(n);
  } catch (error) {
    if (_e(n, error)) return;
    throw error;
  }
}
//@ chunk-wn385gmf.js:15732-15824 placement
function _e(n, e) {
  if (isPathAbsent(e)) return !0;
  let r = getErrnoCode(e);
  return n === dirname(CCR_OAUTH_TOKEN_PATH) && (r === "EACCES" || r === "EPERM");
}
//@ chunk-wn385gmf.js:15824-16005 placement
async function readAtMost(n, e) {
  let r = e + 1,
    allocUnsafe = Buffer.allocUnsafe(r),
    o = 0;
  while (o < r) {
    let { bytesRead: bytesRead } = await n.read(allocUnsafe, o, r - o, o);
    if (bytesRead === 0) break;
    o += bytesRead;
  }
  if (o > e) return "grew";
  return { buf: allocUnsafe.subarray(0, o) };
}
//@ chunk-wn385gmf.js:16005-16102 placement
function Fe(n) {
  return n instanceof Error && "code" in n && n.code === "ENAMETOOLONG" ? "moved" : "fallback";
}
//@ chunk-wn385gmf.js:16102-16572 placement
async function verifyHandleBinding(n, e, r) {
  {
    let a = null;
    try {
      a = await readlink(`/proc/self/fd/${n.fd}`);
    } catch (error) {
      if (Fe(error) === "moved") return "moved";
      logForDebugging(
        `verifyHandleBinding: /proc handle-path read unavailable, using two-sample fallback (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (a !== null) {
      if (a.endsWith(" (deleted)")) return "moved";
      return a === e ? "ok" : "moved";
    }
  }
  let o = (await realpath(e).catch(() => null)) === e ? await stat(e).catch(() => null) : null;
  if (o === null || o.ino !== r.ino || o.dev !== r.dev) return "moved";
  return "ok";
}
//@ chunk-wn385gmf.js:16572-17270 placement
async function readValidatedFileWithin(n, e) {
  let r = await lstat(n).catch(() => null);
  if (r === null || !r.isFile()) return { refusal: "not_regular" };
  let s;
  try {
    s = await open(n, constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    return (
      logForDebugging(`readValidatedFileWithin: open failed: ${errorMessage(error)}`),
      { refusal: "open_failed", detail: sanitizeErrnoForTelemetry(error) ?? "unknown error" }
    );
  }
  try {
    let stats = await s.stat();
    if (stats.nlink > 1) return { refusal: "hard_links" };
    if (!stats.isFile()) return { refusal: "moved" };
    if ((await verifyHandleBinding(s, n, stats)) === "moved") return { refusal: "moved" };
    if (stats.size > e) return { refusal: "too_large" };
    let a = await readAtMost(s, stats.size);
    if (a === "grew") return { refusal: "grew" };
    return { buf: a.buf };
  } catch (error) {
    return (
      logForDebugging(`readValidatedFileWithin: read failed: ${errorMessage(error)}`),
      { refusal: "read_failed", detail: sanitizeErrnoForTelemetry(error) ?? "unknown error" }
    );
  } finally {
    await s.close();
  }
}
//@ chunk-wn385gmf.js:17270-17543 placement
async function readUploadFile(n, e, r, s, o) {
  let a = await readValidatedFileWithin(e, r.remaining);
  if ("buf" in a) return ((r.remaining -= a.buf.length), a);
  if (o !== void 0) {
    let u = "detail" in a ? `: ${a.detail}` : "";
    return (logForDebugging(`[${s} file_upload] read refused (${a.refusal}${u}): ${n}`), { error: o(n) });
  }
  return { error: uploadReadRefusalMessage(n, a, r.total) };
}
/**
 * 把文件读取拒绝原因（非普通文件、打开失败、多硬链接、路径移动、超总量等）映射成给模型的文案。
 */
//@ chunk-wn385gmf.js:17543-18636 placement
function uploadReadRefusalMessage(path, refusal, totalLimit = FILE_UPLOAD_MAX_TOTAL_BYTES) {
  let s = x(path);
  switch (refusal.refusal) {
    case "not_regular":
      return `Cannot upload "${s}": not a regular file.`;
    case "open_failed":
      return `Cannot upload "${s}": failed to open file (${refusal.detail}).`;
    case "hard_links":
      return `Cannot upload "${s}": the file has multiple hard links, which can alias a file outside the session's allowed directories. This commonly triggers for files inside package-manager stores like node_modules (Bun and pnpm hard-link packages). Copy the file (e.g. with cp) and upload the copy.`;
    case "moved":
      return `Cannot upload "${s}": path moved during validation.`;
    case "too_large":
      return `Cannot upload "${s}": total upload size would exceed ${totalLimit >= 1048576 ? `${Math.floor((totalLimit * 10) / 1048576) / 10} MB` : totalLimit >= 1024 ? `${Math.floor(totalLimit / 1024)} KB` : `${totalLimit} bytes`}. file_upload sends file contents over the browser bridge in a single message; use a smaller file, or split across multiple file_upload calls if the page accepts files one at a time.`;
    case "grew":
      return `Cannot upload "${s}": file grew during read.`;
    case "read_failed":
      return `Cannot upload "${s}": failed to read file (${refusal.detail}).`;
  }
}
//@ chunk-wn385gmf.js:18636-19426 placement
var FILE_MIME_BY_EXT = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".html": "text/html",
  ".htm": "text/html",
  ".xml": "application/xml",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
/**
 * 按扩展名猜 MIME（文档/图片/音视频），未知为 application/octet-stream。
 */
//@ chunk-wn385gmf.js:19426-19500 placement = guessMimeType (1)
function guessMimeType(filename) {
  return FILE_MIME_BY_EXT[extname(filename).toLowerCase()] ?? "application/octet-stream";
}
//@ chunk-wn385gmf.js:19685-19715 placement
var Ue = 10485760,
  y3o = 134217728;

export {
  uploadDisplayName,
  readValidatedFileWithin,
  screenUnreadUpload,
  isRestrictedReadBlocked,
  validateUploadPath,
  vot,
  y3o,
  FILE_UPLOAD_MAX_TOTAL_BYTES,
  prepareChromeFileUploadInput,
  verifyHandleBinding,
  preparePaneFileUploadInput,
  Ue,
};
