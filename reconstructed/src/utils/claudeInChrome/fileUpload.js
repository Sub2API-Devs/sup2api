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
import { constants } from "fs";
import { realpath, lstat, open, stat, readlink } from "fs/promises";
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
import {
  sessionUploadsDir,
  uploadDisplayName as uploadDisplayName_2,
  attachmentDigestOf,
} from "../uploadsDir.js";
import { env } from "../env.js";
import { getStageFileRoot, getOutputsRoot } from "../stageFileRoots.js";
import { isFirstPartyRemoteSession } from "../userDataRoots.js";
import { logForDebugging } from "../debug.js";
import { UPLOAD_IN_BATCH_UNAVAILABLE, FILE_UPLOAD_UNAVAILABLE } from "./common.js";
import {
  disklessHostState,
  ANTHROPIC_CHROMEUPLOADFILES,
} from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { isDiskless } from "../../bootstrap/state.js";
import { computeContentHash } from "../commitAttribution.js";
import { expandPath } from "../path.js";
import { isDevicePrefixPath, isUncOrDevicePath, isMacSpecialPath } from "../pathClassification.js";
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
import { foldCase_2, isNetworkRelatedPath } from "../networkPaths.js";
import {
  classifyCredentialPath,
  MAX_SENSITIVE_PATH_LENGTH,
  isInClaudeConfigDir,
} from "../permissions/sensitivePaths.js";
import { isReservedDeviceName } from "../windowsProfileFolders.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { isPathAllowed, isOnlyOutsideWorkingFoldersRefusal } from "../permissions/pathValidation.js";
import { OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { CCR_OAUTH_TOKEN_PATH } from "../authFileDescriptor.js";

//@ chunk-wn385gmf.js:1508-1631 placement
/**
 * --restricted 会话或"禁止读工作目录外"时判断路径是否被拒：受限模式下不在允许工作路径且内部可读检查不放行，或命中外部读阻断。
 */
function isRestrictedReadBlocked(n, e) {
  let r = e.restricted && spellingsToJudge(n);
  return (
    (r &&
      !pathInAllowedWorkingPath(n, e, r) &&
      checkReadableInternalPath(n, {}, r, {
        restricted: true,
      }).behavior !== "allow") ||
    outsideReadBlocked(n, e)
  );
}
//@ chunk-wn385gmf.js:1631-1717 placement
/**
 * 上传路径命中凭据名称或目录时抛出的错误类型。
 */
class CredentialPathError extends Error {
  constructor() {
    super("the name or the place of a credential");
  }
}
//@ chunk-wn385gmf.js:1717-1945 placement
/**
 * Chrome 文件上传通道的校验策略（标签、校验函数、拒绝文案与无路径说明）。
 */
var O_NOFOLLOW = constants.O_NOFOLLOW;
var O_NONBLOCK = constants.O_NONBLOCK;
var O_DIRECTORY = constants.O_DIRECTORY;
var FILE_UPLOAD_MAX_TOTAL_BYTES = 10485760;
var CHROME_FILE_UPLOAD_POLICY = {
  tag: "chrome",
  validate: validateUploadPath,
  rejection: notReadableUploadMessage,
  noPaths: "file_upload requires a non-empty `paths` array of files the user has shared with this session.",
  namesSource: false,
};
//@ chunk-wn385gmf.js:1945-2341 placement
/**
 * 列出上传可信的暂存根目录：附件目录，远程模式或设置 CLAUDE_STAGE_FILE_ROOT 时加上暂存根（来自聊天）与输出根。
 */
async function stagingRoots(permissionContext) {
  let e = [
    {
      path: sessionUploadsDir(),
      kind: "attachments",
    },
  ];
  if (permissionContext.isRemoteMode || env.CLAUDE_STAGE_FILE_ROOT)
    try {
      e.push({
        path: getStageFileRoot(),
        kind: "staging",
        fromChat: true,
      });
      if (isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND))
        e.push({
          path: getOutputsRoot(),
          kind: "staging",
        });
    } catch (error) {
      logForDebugging(
        `[chrome file_upload] stage root unresolvable, skipping staging roots (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  return e;
}
//@ chunk-wn385gmf.js:2341-3033 placement
async function prepareChromeFileUploadInput(
  toolName,
  e,
  permissionContext,
  {
    maxTotalBytes: s = FILE_UPLOAD_MAX_TOTAL_BYTES,
    hosted: o,
    screen: a = CHROME_FILE_UPLOAD_POLICY.validate,
  } = {},
) {
  let budget = {
    remaining: s,
    total: s,
  };
  let l = () =>
    routeFileUploadCalls(toolName, e, (h) =>
      prepareFileUploadInput(h, permissionContext, budget, {
        ...CHROME_FILE_UPLOAD_POLICY,
        validate: a,
      }),
    );
  if (o === undefined) return l();
  if (toolName !== "file_upload") {
    let h = {
      error: UPLOAD_IN_BATCH_UNAVAILABLE,
    };
    return routeFileUploadCalls(
      toolName,
      e,
      async () => h,
      disklessHostState.peek(o.session)?.host ? h : UPLOAD_UNAVAILABLE_RESULT,
    );
  }
  if ("files" in e)
    return {
      error: "file_upload takes `paths`, not `files`. Nothing was uploaded. Call it again without `files`.",
    };
  let host = isDiskless() ? disklessHostState.peek(o.session)?.host : undefined;
  let f;
  if (host) {
    let { paths } = e;
    if (!Array.isArray(paths) || paths.length === 0)
      return {
        error: CHROME_FILE_UPLOAD_POLICY.noPaths,
      };
    f = await host.read(paths, permissionContext, s, o.signal, false);
  } else {
    let h = await l();
    f = {
      files: h.input?.files,
      error: h.error,
    };
  }
  return f.error !== undefined
    ? {
        error: f.error,
      }
    : {
        input: e,
        callMeta: {
          [ANTHROPIC_CHROMEUPLOADFILES]: f.files,
        },
      };
}
//@ chunk-wn385gmf.js:3033-3474 placement
async function preparePaneFileUploadInput(n, permissionContext, { hostAsksPerFile }) {
  if (isDiskless()) return UPLOAD_UNAVAILABLE_RESULT;
  if (Array.isArray(n.paths) && n.paths.length > 1)
    return {
      error:
        "file_upload takes one file per call in this browser pane. Nothing was uploaded. Call it once for each file.",
    };
  return prepareFileUploadInput(
    n,
    permissionContext,
    {
      remaining: FILE_UPLOAD_MAX_TOTAL_BYTES,
      total: FILE_UPLOAD_MAX_TOTAL_BYTES,
    },
    {
      tag: "pane",
      validate: (path, permissionContext) => validatePaneUploadPath(path, permissionContext, hostAsksPerFile),
      rejection: notSharedUploadMessage,
      noPaths:
        "file_upload needs `paths` to be an array holding one absolute file path. Nothing was uploaded.",
      namesSource: true,
    },
  );
}
//@ chunk-wn385gmf.js:3474-4057 placement
async function passThroughChromeFileUploadInput(toolName, e, r) {
  return routeFileUploadCalls(toolName, e, async (s) => {
    let paths = s.paths;
    if (!Array.isArray(paths) || paths.length === 0)
      return {
        error:
          "file_upload requires a non-empty `paths` array of files the user has shared with this session.",
      };
    let a = [];
    for (let path of paths) {
      if (typeof path !== "string")
        return {
          error: "file_upload `paths` entries must be strings.",
        };
      try {
        a.push(await screenUploadPath(path, r));
      } catch (error) {
        logForDebugging(
          `[chrome file_upload] rejected path (pass-through): ${path} (${error instanceof Error ? error.message : String(error)})`,
        );
        return {
          error:
            error instanceof NotAnchoredAbsolutePathError
              ? relativeUploadPathMessage(path)
              : error instanceof CredentialPathError
                ? credentialPathUploadMessage(path)
                : notSharedUploadMessage(path),
        };
      }
    }
    let { files, paths: paths_2, ...c } = s;
    return {
      input: {
        ...c,
        paths: a,
      },
    };
  });
}
//@ chunk-wn385gmf.js:4057-5017 placement
/**
 * 对 file_upload（含 browser_batch 中的 file_upload 子动作）调用 r 改写输入；无盘模式直接返回 s（拒绝）。
 * batch 子动作必须是带字符串名的对象、不能嵌套，伪装成 file_upload 的名字被拒。
 */
async function routeFileUploadCalls(
  toolName,
  args,
  prepareInput,
  disklessResult = UPLOAD_UNAVAILABLE_RESULT,
) {
  if (toolName === "file_upload") return isDiskless() ? disklessResult : prepareInput(args);
  if (toolName === "browser_batch") {
    if (!Array.isArray(args.actions))
      return {
        error: "browser_batch requires an `actions` array.",
      };
    let o = [...args.actions];
    let a = false;
    for (let idx = 0; idx < o.length; idx++) {
      let l = o[idx];
      if (typeof l !== "object" || l === null || typeof l.name !== "string")
        return {
          error:
            "browser_batch sub-actions must be objects with a string name, and browser_batch cannot be nested.",
        };
      let c = l.name;
      if (!/^[\x20-\x7E]+$/.test(c))
        return {
          error: invalidSubActionName(c),
        };
      let lower = c.trim().toLowerCase();
      if (lower === "browser_batch")
        return {
          error:
            "browser_batch sub-actions must be objects with a string name, and browser_batch cannot be nested.",
        };
      if (lower === "file_upload" && c !== "file_upload")
        return {
          error: invalidSubActionName(c),
        };
      if (c !== "file_upload") continue;
      let h = l;
      let input = typeof h.input === "object" && h.input !== null ? h.input : {};
      let p = isDiskless() ? disklessResult : await prepareInput(input);
      if (p.error)
        return {
          error: p.error,
        };
      if (p.input !== h.input) {
        o[idx] = {
          ...h,
          input: p.input,
        };
        a = true;
      }
    }
    return a
      ? {
          input: {
            ...args,
            actions: o,
          },
        }
      : {
          input: args,
        };
  }
  return {
    input: args,
  };
}
//@ chunk-wn385gmf.js:5017-5035 placement
/**
 * 无法上传时的统一结果（带不可用原因）。
 */
var UPLOAD_UNAVAILABLE_RESULT = {
  error: FILE_UPLOAD_UNAVAILABLE,
};
//@ chunk-wn385gmf.js:5035-5121 placement
/**
 * 把引号与控制字符替换成 U+FFFD，避免提示文本被伪造。
 */
function sanitizeForMessage(n) {
  return n.replace(/["\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "\uFFFD");
}
//@ chunk-wn385gmf.js:5121-5315 placement
function notReadableUploadMessage(n) {
  return `Cannot upload "${sanitizeForMessage(n)}": only files this session is allowed to read can be uploaded. Ask the user to share the file with this session, or to add its folder with /add-dir.`;
}
//@ chunk-wn385gmf.js:5315-5548 placement
function credentialPathUploadMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": its name or folder is one that credentials are kept under (such as .env, a .pem or .key file, or .ssh), so it is not uploaded on Claude's word alone. Tell the user it was not uploaded.`;
}
//@ chunk-wn385gmf.js:5548-5720 placement
function notSharedUploadMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": only files this session is allowed to read can be uploaded. Ask the user to share the file or its folder with this session.`;
}
//@ chunk-wn385gmf.js:5720-5921 placement
function relativeUploadPathMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": file_upload \`paths\` must be absolute paths as this session sees them (for example /sessions/\u2026 in a Cowork VM, or a drive-letter path on Windows).`;
}
//@ chunk-wn385gmf.js:5921-6009 placement
/**
 * 构造 browser_batch 子动作名非法的错误文本。
 */
function invalidSubActionName(n) {
  return `browser_batch sub-action name "${sanitizeForMessage(n)}" is not a valid tool name.`;
}
//@ chunk-wn385gmf.js:6009-7081 placement
/**
 * 校验并读取 file_upload 的每个路径：调用 s.validate 得到真实路径与需要的摘要，按总量上限读取文件、核对摘要，
 * 把内容编码进新的输入；任一路径失败返回 {error}（凭据目录用专门文案）。
 */
async function prepareFileUploadInput(input, permissionContext, budget, options) {
  let paths = input.paths;
  if (!Array.isArray(paths) || paths.length === 0)
    return {
      error: options.noPaths,
    };
  let a = [];
  for (let path of paths) {
    if (typeof path !== "string")
      return {
        error: "file_upload `paths` entries must be strings.",
      };
    let filename;
    let b;
    let R;
    let _;
    try {
      ({
        realPath: filename,
        requiredDigest: b,
        outsideWorkingFolders: R,
        needsHostAsk: _,
      } = await options.validate(path, permissionContext));
    } catch (error) {
      logForDebugging(
        `[${options.tag} file_upload] rejected path: ${path} (${error instanceof Error ? error.message : String(error)})`,
      );
      return {
        error:
          error instanceof CredentialPathError ? credentialPathUploadMessage(path) : options.rejection(path),
      };
    }
    let uploadFile = await readUploadFile(
      path,
      filename,
      budget,
      options.tag,
      R ? options.rejection : undefined,
    );
    if ("error" in uploadFile)
      return {
        error: uploadFile.error,
      };
    if (b !== undefined && computeContentHash(uploadFile.buf) !== b) {
      logForDebugging(`[${options.tag} file_upload] registered attachment digest mismatch: ${path}`);
      return {
        error: options.rejection(path),
      };
    }
    a.push({
      data: uploadFile.buf.toString("base64"),
      name: await uploadDisplayName(filename),
      mimeType: guessMimeType(filename),
      ...(options.namesSource && {
        sourcePath: filename,
        requestedPath: sanitizeForMessage(path).replace(
          /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
          "\uFFFD",
        ),
        needsHostAsk: _ !== false,
      }),
    });
  }
  let { paths: paths_2, ...l } = input;
  if (!options.namesSource)
    return {
      input: {
        ...l,
        files: a,
      },
    };
  let { needsHostAsk, sourcePath, requestedPath, hostAsksPerFile, ...p } = l;
  return {
    input: {
      ...p,
      files: a,
    },
  };
}
//@ chunk-wn385gmf.js:7081-7186 placement
async function uploadDisplayName(realPath) {
  let e = await realpath(sessionUploadsDir()).catch(() => {
    return;
  });
  return e !== undefined && dirname(realPath) === e
    ? uploadDisplayName_2(basename(realPath))
    : basename(realPath);
}
//@ chunk-wn385gmf.js:7186-7671 placement
/**
 * 访问文件系统前拒绝网络路径（UNC、自动挂载）与无法核验祖先链的路径，返回绝对路径及其链。
 */
function screenNetworkPath(n, e) {
  let r = expandPath(n);
  let trimmed = n.trim();
  if (isDevicePrefixPath(trimmed) || isDevicePrefixPath(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `network path not allowed: ${isDevicePrefixPath(trimmed) ? trimmed : r}`,
      "claudeInChrome/fileUpload: network path rejected before filesystem access",
    );
  let { paths, vetted } = getPathsForNetworkScreen(r);
  if (!vetted)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path could not be vetted (symbolic link chain or unreadable component)",
      "claudeInChrome/fileUpload: unvettable path ancestry rejected before filesystem access",
    );
  let trustedNetworkDirectories = e.trustedNetworkDirectories;
  for (let l of [trimmed, ...paths]) assertNotNetworkOrSuspicious(l, trustedNetworkDirectories);
  return {
    absPath: r,
    absChain: paths,
  };
}
//@ chunk-wn385gmf.js:7671-7933 placement
function assertNotNetworkOrSuspicious(n, trustedNetworkDirectories) {
  if (
    isUntrustedUncPath(n, trustedNetworkDirectories) ||
    isUntrustedAutomountPath(n, trustedNetworkDirectories)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `network path not allowed: ${n}`,
      "claudeInChrome/fileUpload: network path rejected",
    );
  if (hasSuspiciousWindowsPathPattern(n, trustedNetworkDirectories))
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
/**
 * 上传路径的最大字符数（4096）。
 */
var MAX_UPLOAD_PATH_CHARS = 4096;
var MAX_PATH_ALIAS_DEPTH = 3;
var MAX_SCREENED_PATHS = 64;
//@ chunk-wn385gmf.js:8241-8312 placement
/**
 * 审查单个上传路径并返回其判定结果。
 */
async function screenUploadPath(n, e, r = MAX_PATH_ALIAS_DEPTH, s = new Set()) {
  return (await screenUnreadUpload(n, e, r, s)).judged;
}
//@ chunk-wn385gmf.js:8312-10450 placement
/**
 * 审查要上传的文件路径（空白填充、过长、网络路径、别名命名空间、读权限、凭据目录），返回拒绝原因或可读句柄。
 */
async function screenUnreadUpload(n, e, r = MAX_PATH_ALIAS_DEPTH, s = new Set()) {
  let trimmed = n.trim();
  if (trimmed !== n)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "surrounding whitespace",
      "claudeInChrome/fileUpload: whitespace-padded path rejected on the pass-through",
    );
  if (trimmed.length > MAX_UPLOAD_PATH_CHARS)
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
  if (!isAbsoluteAsSeen(trimmed, a)) throw new NotAnchoredAbsolutePathError();
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
    getDenyRuleForTool(e, {
      name: FILE_READ_TOOL_NAME,
    }) !== null ||
    getAskRuleForTool(e, {
      name: FILE_READ_TOOL_NAME,
    }) !== null
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Read tool is restricted for this session",
      "claudeInChrome/fileUpload: Read tool denied or ask-gated for this session (pass-through)",
    );
  for (let p of [trimmed, a]) {
    let m = await isCredentialPath(p);
    if (m !== undefined)
      throw m === "credential_name"
        ? new CredentialPathError()
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
  if (joined !== trimmed) await screenUploadPath(joined, e, r - 1, s);
  let { absChain } = screenNetworkPath(trimmed, e);
  for (let p of absChain) assertNotAliasNamespace(p);
  let { realPath, looped, spellings } = await realpathWithSpellings(a);
  for (let spelling of spellings) {
    assertNotNetworkOrSuspicious(spelling, e.trustedNetworkDirectories);
    assertNotAliasNamespace(spelling);
  }
  let g = new Set();
  for (let p of new Set([trimmed, ...absChain, ...spellings])) {
    let m = stripStreamSuffix(p);
    if (m !== null && !s.has(m)) {
      if (s.size >= MAX_SCREENED_PATHS)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "too many stream-base spellings",
          "claudeInChrome/fileUpload: stream-base fan-out rejected on the pass-through",
        );
      s.add(m);
      try {
        await screenUploadPath(m, e, r, s);
      } catch (error) {
        throw error instanceof CredentialPathError ? passThroughRefusal(PASS_THROUGH_REFUSAL_NOTE) : error;
      }
    }
    for (let w of [p, foldCase_2(p)]) g.add(w).add(w.normalize("NFC")).add(w.normalize("NFD"));
  }
  assertNoReadRule(g, e);
  assertNoReadRule(g, e, {
    caseInsensitiveTarget: true,
  });
  for (let p of g)
    if ((await isCredentialPath(p)) !== undefined) throw passThroughRefusal(PASS_THROUGH_REFUSAL_NOTE);
  return {
    judged: a,
    resolved: realPath,
    linked: absChain.length > 1 || looped,
  };
}
//@ chunk-wn385gmf.js:10450-10494 placement
/**
 * 判断路径是否命中凭据名称或目录。
 */
function isCredentialPath(n) {
  return classifyCredentialPath(n, n, {
    readable: true,
  });
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
  if (isUncOrDevicePath(n) || isUncOrDevicePath(e)) return true;
  if (!isAbsolute(n)) return false;
  return getPlatform() !== "windows" || /^[a-z]:[\\/]/i.test(e);
}
//@ chunk-wn385gmf.js:10831-11173 placement
/**
 * 若路径末段带 NTFS 备用数据流（name:stream），返回去掉 ":stream" 的部分（先去掉尾部的 / 和 /.）；否则返回 null。
 */
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
  let sliced = n.slice(0, e);
  let s = Math.max(sliced.lastIndexOf("/"), sliced.lastIndexOf("\\")) + 1;
  let index = sliced.indexOf(":", s + 1);
  if (index === -1 || (s === 0 && index === 1)) return null;
  let a = index;
  while (a > s && sliced[a - 1] === " ") a -= 1;
  return sliced.slice(0, a);
}
//@ chunk-wn385gmf.js:11173-11249 placement
/**
 * 路径不是锚定的绝对路径时抛出的错误类型。
 */
class NotAnchoredAbsolutePathError extends Error {
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
    return {
      realPath: undefined,
      looped: getErrnoCode(error) === "ELOOP",
      spellings: [],
    };
  }
  return {
    realPath: e,
    looped: false,
    spellings: getPathsForPermissionCheck(e),
  };
}
//@ chunk-wn385gmf.js:11406-11726 placement
/**
 * 拒绝内核别名命名空间路径：/dev、/proc、..namedfork、:$ 类 NTFS 属性、及其他别名拼写。
 */
function assertNotAliasNamespace(n) {
  let replaced = n.replace(/\\/g, "/");
  if (
    /^\/(?:dev|proc)(?:\/|$)/i.test(replaced) ||
    isMacSpecialPath(replaced) ||
    /(?:^|\/)\.\.namedfork(?:\/|$)/i.test(replaced) ||
    /:\$[a-z_]/i.test(replaced) ||
    isNetworkRelatedPath(replaced) ||
    replaced.split("/").some(isReservedDeviceName)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `alias namespace path not allowed: ${n}`,
      "claudeInChrome/fileUpload: kernel alias namespace path rejected on the pass-through",
    );
}
//@ chunk-wn385gmf.js:11726-11814 placement
/**
 * 公共的上传路径核验（长度、通道、网络路径、读规则、凭据），失败抛错。
 */
async function assertUploadPathAllowed(absPath, realPath) {
  if (
    (await classifyCredentialPath(absPath, realPath, {
      readable: true,
    })) === "credential_name"
  )
    throw new CredentialPathError();
}
//@ chunk-wn385gmf.js:11814-13725 placement
/**
 * file_upload 路径的公共核验：长度上限、非暂存目录时的通道检查、网络路径、读规则、内核/设备路径或 Claude Code 凭据、Read 工具受限、外部读阻断等；
 * 返回 {absPath, realPath, pathsToCheck, sharedWithSession?}。
 */
async function vetUploadPath(path, permissionContext) {
  if (path.length > MAX_SENSITIVE_PATH_LENGTH)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path too long",
      "claudeInChrome/fileUpload: over-long path rejected",
    );
  let roots = await stagingRoots(permissionContext);
  let absPath = expandPath(path);
  if (
    !roots.some(
      (root) => (root.fromChat || root.kind === "attachments") && absPath.startsWith(root.path + sep),
    )
  )
    await assertUploadPathAllowed(absPath, absPath);
  let { absPath: absPath_2, absChain } = screenNetworkPath(path, permissionContext);
  let trustedNetworkDirectories = permissionContext.trustedNetworkDirectories;
  let l = await realpath(absPath_2);
  let c = new Set([...absChain, ...getPathsForPermissionCheck(l)]);
  for (let f of c) assertNotNetworkOrSuspicious(f, trustedNetworkDirectories);
  assertNoReadRule(c, permissionContext);
  if (
    (await classifyCredentialPath(absPath_2, l, {
      readable: true,
      attached: true,
    })) !== undefined
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `kernel or device path, or one of Claude Code's credentials: ${l}`,
      "claudeInChrome/fileUpload: kernel or device path, or one of Claude Code's own credentials",
    );
  for (let root of roots) {
    let h = await lstat(root.path).catch(() => null);
    if (h === null || h.isSymbolicLink() || !h.isDirectory()) continue;
    let g = await open(root.path, constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW).catch(() => null);
    if (g === null) continue;
    let p;
    try {
      let stats = await g.stat();
      if (!stats.isDirectory()) continue;
      let w = await realpath(root.path).catch(() => {
        return;
      });
      if (w === undefined) continue;
      let b = await stat(w).catch(() => null);
      if (b === null || b.ino !== stats.ino || b.dev !== stats.dev) continue;
      p = w;
    } finally {
      await g.close();
    }
    if (l === p || l.startsWith(p + sep)) {
      if (root.kind === "staging") {
        let w = await realpath(getClaudeConfigDir()).catch(() => getClaudeConfigDir());
        if (p === w || p.startsWith(w + sep) || w.startsWith(p + sep)) continue;
        if (!root.fromChat) await assertUploadPathAllowed(absPath_2, l);
        return {
          absPath: absPath_2,
          realPath: l,
          pathsToCheck: c,
          sharedWithSession: root.fromChat
            ? {
                fromChat: true,
              }
            : {},
        };
      }
      let m = attachmentDigestOf(l);
      if (m !== undefined)
        return {
          absPath: absPath_2,
          realPath: l,
          pathsToCheck: c,
          sharedWithSession: {
            requiredDigest: m,
          },
        };
      break;
    }
  }
  if (
    getDenyRuleForTool(permissionContext, {
      name: FILE_READ_TOOL_NAME,
    }) !== null ||
    getAskRuleForTool(permissionContext, {
      name: FILE_READ_TOOL_NAME,
    }) !== null
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
  return {
    absPath: absPath_2,
    realPath: l,
    pathsToCheck: c,
  };
}
//@ chunk-wn385gmf.js:13725-14297 placement
async function validateUploadPath(path, permissionContext) {
  let { absPath, realPath, pathsToCheck, sharedWithSession } = await vetUploadPath(path, permissionContext);
  if (sharedWithSession !== undefined)
    return {
      realPath,
      ...sharedWithSession,
    };
  if (permissionContext.mode === "bypassPermissions" && !permissionContext.restricted) {
    await assertUploadPathAllowed(absPath, realPath);
    return {
      realPath,
    };
  }
  for (let u of pathsToCheck) {
    if (!isPathAllowed(u, permissionContext, "read").allowed)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed: ${u}`,
        "claudeInChrome/fileUpload: path read not allowed by session permissions",
      );
    if (permissionContext.restricted && isRestrictedReadBlocked(u, permissionContext))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed under --restricted: ${u}`,
        "claudeInChrome/fileUpload: restricted mode refused a file only an allow rule opens",
      );
  }
  await assertUploadPathAllowed(absPath, realPath);
  return {
    realPath,
  };
}
//@ chunk-wn385gmf.js:14297-15520 placement
/**
 * 桌面浏览器面板的路径校验：在 vetUploadPath 基础上逐个用 isPathAllowed 判断，工作目录外的文件标记 outsideWorkingFolders / needsHostAsk，交由宿主逐个询问。
 */
async function validatePaneUploadPath(path, permissionContext, hostAsksPerFile) {
  let { absPath, realPath, pathsToCheck, sharedWithSession } = await vetUploadPath(path, permissionContext);
  if (sharedWithSession !== undefined)
    return {
      realPath,
      ...sharedWithSession,
      needsHostAsk: true,
    };
  let { restricted } = permissionContext;
  let c = isInWorkingDirectory(realPath, permissionContext);
  let f = false;
  let h = false;
  for (let p of pathsToCheck) {
    let m = isPathAllowed(p, permissionContext, "read");
    if (
      m.allowed &&
      !(restricted && m.decisionReason?.type === "rule") &&
      (m.decisionReason !== undefined || c)
    ) {
      h ||= m.decisionReason !== undefined;
      continue;
    }
    let w =
      !m.allowed && !isOnlyOutsideWorkingFoldersRefusal(m)
        ? `refused by isPathAllowed (${m.decisionReason?.type ?? "no reason given"})`
        : restricted
          ? "--restricted session: no rule or host question reaches outside the working folders"
          : !hostAsksPerFile
            ? "outside the working folders, and the host does not ask per file"
            : undefined;
    if (w !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed (${w}): ${p}`,
        "claudeInChrome/fileUpload: pane path read not allowed by session permissions",
      );
    f = true;
  }
  if (!f) {
    await assertUploadPathAllowed(absPath, realPath);
    return {
      realPath,
      needsHostAsk:
        h ||
        (await isInClaudeConfigDir(realPath, realpathOrUndefined).catch((error) => {
          logForDebugging(
            `[pane file_upload] own-files check failed, so the host asks: ${errorMessage(error)}`,
          );
          return true;
        })),
    };
  }
  let g = await classifyCredentialPath(absPath, realPath, {
    realDirectory: realpathOrUndefined,
  });
  if (g !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `refused by its name or place (${g}): ${realPath}`,
      "claudeInChrome/fileUpload: pane path outside the working folders is one of Claude Code's own files or is named like a credential",
    );
  return {
    realPath,
    outsideWorkingFolders: true,
    needsHostAsk: true,
  };
}
//@ chunk-wn385gmf.js:15520-15654 placement
function isInWorkingDirectory(realPath, permissionContext) {
  return Array.from(allWorkingDirectories(permissionContext))
    .flatMap((r) => getResolvedWorkingDirPaths(r))
    .some((r) =>
      pathInWorkingPath(realPath, r, {
        caseFold: false,
        skipPrivateAlias: true,
        uncShapeParity: true,
      }),
    );
}
//@ chunk-wn385gmf.js:15654-15732 placement
/**
 * 取路径的真实值，缺失或凭据目录无权限时返回 undefined。
 */
async function realpathOrUndefined(n) {
  try {
    return await realpath(n);
  } catch (error) {
    if (isIgnorableRealpathError(n, error)) return;
    throw error;
  }
}
//@ chunk-wn385gmf.js:15732-15824 placement
/**
 * 判断取真实路径时的错误是否可忽略（不存在，或 CCR 凭据目录的 EACCES/EPERM）。
 */
function isIgnorableRealpathError(n, error) {
  if (isPathAbsent(error)) return true;
  let errnoCode = getErrnoCode(error);
  return n === dirname(CCR_OAUTH_TOKEN_PATH) && (errnoCode === "EACCES" || errnoCode === "EPERM");
}
//@ chunk-wn385gmf.js:15824-16005 placement
async function readAtMost(n, e) {
  let r = e + 1;
  let s = Buffer.allocUnsafe(r);
  let o = 0;
  while (o < r) {
    let { bytesRead } = await n.read(s, o, r - o, o);
    if (bytesRead === 0) break;
    o += bytesRead;
  }
  if (o > e) return "grew";
  return {
    buf: s.subarray(0, o),
  };
}
//@ chunk-wn385gmf.js:16005-16102 placement
/**
 * 把重命名失败归类为 moved 或 fallback。
 */
function classifyRenameFailure(error) {
  return error instanceof Error && "code" in error && error.code === "ENAMETOOLONG" ? "moved" : "fallback";
}
//@ chunk-wn385gmf.js:16102-16572 placement
async function verifyHandleBinding(n, e, r) {
  {
    let a = null;
    try {
      a = await readlink(`/proc/self/fd/${n.fd}`);
    } catch (error) {
      if (classifyRenameFailure(error) === "moved") return "moved";
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
  if (r === null || !r.isFile())
    return {
      refusal: "not_regular",
    };
  let s;
  try {
    s = await open(n, constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    logForDebugging(`readValidatedFileWithin: open failed: ${errorMessage(error)}`);
    return {
      refusal: "open_failed",
      detail: sanitizeErrnoForTelemetry(error) ?? "unknown error",
    };
  }
  try {
    let stats = await s.stat();
    if (stats.nlink > 1)
      return {
        refusal: "hard_links",
      };
    if (!stats.isFile())
      return {
        refusal: "moved",
      };
    if ((await verifyHandleBinding(s, n, stats)) === "moved")
      return {
        refusal: "moved",
      };
    if (stats.size > e)
      return {
        refusal: "too_large",
      };
    let atMost = await readAtMost(s, stats.size);
    if (atMost === "grew")
      return {
        refusal: "grew",
      };
    return {
      buf: atMost.buf,
    };
  } catch (error) {
    logForDebugging(`readValidatedFileWithin: read failed: ${errorMessage(error)}`);
    return {
      refusal: "read_failed",
      detail: sanitizeErrnoForTelemetry(error) ?? "unknown error",
    };
  } finally {
    await s.close();
  }
}
//@ chunk-wn385gmf.js:17270-17543 placement
async function readUploadFile(path, e, budget, tag, o) {
  let refusal = await readValidatedFileWithin(e, budget.remaining);
  if ("buf" in refusal) {
    budget.remaining -= refusal.buf.length;
    return refusal;
  }
  if (o !== undefined) {
    let u = "detail" in refusal ? `: ${refusal.detail}` : "";
    logForDebugging(`[${tag} file_upload] read refused (${refusal.refusal}${u}): ${path}`);
    return {
      error: o(path),
    };
  }
  return {
    error: uploadReadRefusalMessage(path, refusal, budget.total),
  };
}
//@ chunk-wn385gmf.js:17543-18636 placement
/**
 * 把文件读取拒绝原因（非普通文件、打开失败、多硬链接、路径移动、超总量等）映射成给模型的文案。
 */
function uploadReadRefusalMessage(path, refusal, totalLimit = FILE_UPLOAD_MAX_TOTAL_BYTES) {
  let s = sanitizeForMessage(path);
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
//@ chunk-wn385gmf.js:19426-19500 placement = guessMimeType (1)
/**
 * 按扩展名猜 MIME（文档/图片/音视频），未知为 application/octet-stream。
 */
function guessMimeType(filename) {
  return FILE_MIME_BY_EXT[extname(filename).toLowerCase()] ?? "application/octet-stream";
}
//@ chunk-wn385gmf.js:19685-19715 placement
/**
 * 面板上传的总字节上限（10 MiB）。
 */
var MAX_PANE_UPLOAD_BYTES = 10485760;
var MAX_CHROME_UPLOAD_BYTES = 134217728;
export {
  uploadDisplayName,
  readValidatedFileWithin,
  screenUnreadUpload,
  isRestrictedReadBlocked,
  validateUploadPath,
  CredentialPathError,
  MAX_CHROME_UPLOAD_BYTES,
  FILE_UPLOAD_MAX_TOTAL_BYTES,
  prepareChromeFileUploadInput,
  verifyHandleBinding,
  preparePaneFileUploadInput,
  MAX_PANE_UPLOAD_BYTES,
};
