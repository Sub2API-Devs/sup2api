/**
 * utils/claudeInChrome/fileUpload.ts
 *
 * 2.1.316 新增：Claude in Chrome / 桌面浏览器面板的 file_upload：路径校验（网络路径、别名命名空间、读权限、凭据目录）与安全读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8nfjhq0y.js (47), chunk-z68qgrbt.js (1)
 * attribution: placement 48
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
  getCountedWorkingDirPaths,
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
import { getDenyRuleForTool, findAskRuleForTool } from "../permissions/permissions.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { foldCase_2, isNetworkRelatedPath } from "../networkPaths.js";
import {
  classifyCredentialPath,
  MAX_SENSITIVE_PATH_LENGTH,
  isInClaudeConfigDir,
} from "../permissions/sensitivePaths.js";
import { isReservedDeviceName } from "../windowsProfileFolders.js";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { isPathAllowed, isOnlyOutsideWorkingFoldersRefusal } from "../permissions/pathValidation.js";
import { OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { CCR_OAUTH_TOKEN_PATH } from "../authFileDescriptor.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8nfjhq0y.js:1528-1651 placement
/**
 * --restricted 会话或"禁止读工作目录外"时判断路径是否被拒：受限模式下不在允许工作路径且内部可读检查不放行，或命中外部读阻断。
 */
function isRestrictedReadBlocked(path, permissionContext) {
  let spellings = permissionContext.restricted && spellingsToJudge(path);
  return (
    (spellings &&
      !pathInAllowedWorkingPath(path, permissionContext, spellings) &&
      checkReadableInternalPath(path, {}, spellings, {
        restricted: true,
      }).behavior !== "allow") ||
    outsideReadBlocked(path, permissionContext)
  );
}
//@ chunk-8nfjhq0y.js:1651-1737 placement
/**
 * 上传路径命中凭据名称或目录时抛出的错误类型。
 */
class CredentialPathError extends Error {
  constructor() {
    super("the name or the place of a credential");
  }
}
//@ chunk-8nfjhq0y.js:1737-1966 placement
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
//@ chunk-8nfjhq0y.js:1966-2363 placement
/**
 * 列出上传可信的暂存根目录：附件目录，远程模式或设置 CLAUDE_STAGE_FILE_ROOT 时加上暂存根（来自聊天）与输出根。
 */
async function stagingRoots(permissionContext) {
  let roots = [
    {
      path: sessionUploadsDir(),
      kind: "attachments",
    },
  ];
  if (permissionContext.isRemoteMode || env.CLAUDE_STAGE_FILE_ROOT)
    try {
      roots.push({
        path: getStageFileRoot(),
        kind: "staging",
        fromChat: true,
      });
      if (isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND))
        roots.push({
          path: getOutputsRoot(),
          kind: "staging",
        });
    } catch (error) {
      logForDebugging(
        `[chrome file_upload] stage root unresolvable, skipping staging roots (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  return roots;
}
//@ chunk-8nfjhq0y.js:2363-3055 placement
async function prepareChromeFileUploadInput(
  toolName,
  args,
  permissionContext,
  { maxTotalBytes = FILE_UPLOAD_MAX_TOTAL_BYTES, hosted, screen = CHROME_FILE_UPLOAD_POLICY.validate } = {},
) {
  let budget = {
    remaining: maxTotalBytes,
    total: maxTotalBytes,
  };
  let runThroughRoute = () =>
    routeFileUploadCalls(toolName, args, (input) =>
      prepareFileUploadInput(input, permissionContext, budget, {
        ...CHROME_FILE_UPLOAD_POLICY,
        validate: screen,
      }),
    );
  if (hosted === undefined) return runThroughRoute();
  if (toolName !== "file_upload") {
    let unavailable = {
      error: UPLOAD_IN_BATCH_UNAVAILABLE,
    };
    return routeFileUploadCalls(
      toolName,
      args,
      async () => unavailable,
      disklessHostState.peek(hosted.session)?.host ? unavailable : UPLOAD_UNAVAILABLE_RESULT,
    );
  }
  if ("files" in args)
    return {
      error: "file_upload takes `paths`, not `files`. Nothing was uploaded. Call it again without `files`.",
    };
  let host = isDiskless() ? disklessHostState.peek(hosted.session)?.host : undefined;
  let files;
  if (host) {
    let { paths } = args;
    if (!Array.isArray(paths) || paths.length === 0)
      return {
        error: CHROME_FILE_UPLOAD_POLICY.noPaths,
      };
    files = await host.read(paths, permissionContext, maxTotalBytes, hosted.signal, false);
  } else {
    let routed = await runThroughRoute();
    files = {
      files: routed.input?.files,
      error: routed.error,
    };
  }
  return files.error !== undefined
    ? {
        error: files.error,
      }
    : {
        input: args,
        callMeta: {
          [ANTHROPIC_CHROMEUPLOADFILES]: files.files,
        },
      };
}
//@ chunk-8nfjhq0y.js:3055-3496 placement
async function preparePaneFileUploadInput(input, permissionContext, { hostAsksPerFile }) {
  if (isDiskless()) return UPLOAD_UNAVAILABLE_RESULT;
  if (Array.isArray(input.paths) && input.paths.length > 1)
    return {
      error:
        "file_upload takes one file per call in this browser pane. Nothing was uploaded. Call it once for each file.",
    };
  return prepareFileUploadInput(
    input,
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
//@ chunk-8nfjhq0y.js:3496-4079 placement
async function passThroughChromeFileUploadInput(toolName, args, screen) {
  return routeFileUploadCalls(toolName, args, async (input) => {
    let paths = input.paths;
    if (!Array.isArray(paths) || paths.length === 0)
      return {
        error:
          "file_upload requires a non-empty `paths` array of files the user has shared with this session.",
      };
    let screenedPaths = [];
    for (let path of paths) {
      if (typeof path !== "string")
        return {
          error: "file_upload `paths` entries must be strings.",
        };
      try {
        screenedPaths.push(await screenUploadPath(path, screen));
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
    let { files, paths: paths_2, ...rest } = input;
    return {
      input: {
        ...rest,
        paths: screenedPaths,
      },
    };
  });
}
//@ chunk-8nfjhq0y.js:4079-5041 placement
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
    let actions = [...args.actions];
    let changed = false;
    for (let idx = 0; idx < actions.length; idx++) {
      let action = actions[idx];
      if (typeof action !== "object" || action === null || typeof action.name !== "string")
        return {
          error:
            "browser_batch sub-actions must be objects with a string name, and browser_batch cannot be nested.",
        };
      let actionName = action.name;
      if (!/^[\x20-\x7E]+$/.test(actionName))
        return {
          error: invalidSubActionName(actionName),
        };
      let lower = actionName.trim().toLowerCase();
      if (lower === "browser_batch")
        return {
          error:
            "browser_batch sub-actions must be objects with a string name, and browser_batch cannot be nested.",
        };
      if (lower === "file_upload" && actionName !== "file_upload")
        return {
          error: invalidSubActionName(actionName),
        };
      if (actionName !== "file_upload") continue;
      let uploadAction = action;
      let input =
        typeof uploadAction.input === "object" && uploadAction.input !== null ? uploadAction.input : {};
      let prepared = isDiskless() ? disklessResult : await prepareInput(input);
      if (prepared.error)
        return {
          error: prepared.error,
        };
      if (prepared.input !== uploadAction.input) {
        actions[idx] = {
          ...uploadAction,
          input: prepared.input,
        };
        changed = true;
      }
    }
    return changed
      ? {
          input: {
            ...args,
            actions,
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
//@ chunk-8nfjhq0y.js:5041-5059 placement
/**
 * 无法上传时的统一结果（带不可用原因）。
 */
var UPLOAD_UNAVAILABLE_RESULT; // deferred: uses BATCH_RESTRICTED_TOOLS (./common.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8nfjhq0y.js:5041", () => {
  UPLOAD_UNAVAILABLE_RESULT = {
    error: FILE_UPLOAD_UNAVAILABLE,
  };
});
//@ chunk-8nfjhq0y.js:5059-5145 placement
/**
 * 把引号与控制字符替换成 U+FFFD，避免提示文本被伪造。
 */
function sanitizeForMessage(text) {
  return text.replace(/["\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "\uFFFD");
}
//@ chunk-8nfjhq0y.js:5145-5339 placement
function notReadableUploadMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": only files this session is allowed to read can be uploaded. Ask the user to share the file with this session, or to add its folder with /add-dir.`;
}
//@ chunk-8nfjhq0y.js:5339-5572 placement
function credentialPathUploadMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": its name or folder is one that credentials are kept under (such as .env, a .pem or .key file, or .ssh), so it is not uploaded on Claude's word alone. Tell the user it was not uploaded.`;
}
//@ chunk-8nfjhq0y.js:5572-5744 placement
function notSharedUploadMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": only files this session is allowed to read can be uploaded. Ask the user to share the file or its folder with this session.`;
}
//@ chunk-8nfjhq0y.js:5744-5945 placement
function relativeUploadPathMessage(path) {
  return `Cannot upload "${sanitizeForMessage(path)}": file_upload \`paths\` must be absolute paths as this session sees them (for example /sessions/\u2026 in a Cowork VM, or a drive-letter path on Windows).`;
}
//@ chunk-8nfjhq0y.js:5945-6034 placement
/**
 * 构造 browser_batch 子动作名非法的错误文本。
 */
function invalidSubActionName(name) {
  return `browser_batch sub-action name "${sanitizeForMessage(name)}" is not a valid tool name.`;
}
//@ chunk-8nfjhq0y.js:6034-7106 placement
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
  let files = [];
  for (let path of paths) {
    if (typeof path !== "string")
      return {
        error: "file_upload `paths` entries must be strings.",
      };
    let realPath;
    let requiredDigest;
    let outsideWorkingFolders;
    let needsHostAsk;
    try {
      ({ realPath, requiredDigest, outsideWorkingFolders, needsHostAsk } = await options.validate(
        path,
        permissionContext,
      ));
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
      realPath,
      budget,
      options.tag,
      outsideWorkingFolders ? options.rejection : undefined,
    );
    if ("error" in uploadFile)
      return {
        error: uploadFile.error,
      };
    if (requiredDigest !== undefined && computeContentHash(uploadFile.buf) !== requiredDigest) {
      logForDebugging(`[${options.tag} file_upload] registered attachment digest mismatch: ${path}`);
      return {
        error: options.rejection(path),
      };
    }
    files.push({
      data: uploadFile.buf.toString("base64"),
      name: await uploadDisplayName(realPath),
      mimeType: guessMimeType(realPath),
      ...(options.namesSource && {
        sourcePath: realPath,
        requestedPath: sanitizeForMessage(path).replace(
          /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
          "\uFFFD",
        ),
        needsHostAsk: needsHostAsk !== false,
      }),
    });
  }
  let { paths: paths_2, ...rest } = input;
  if (!options.namesSource)
    return {
      input: {
        ...rest,
        files,
      },
    };
  let { needsHostAsk, sourcePath, requestedPath, hostAsksPerFile, ...restPaths } = rest;
  return {
    input: {
      ...restPaths,
      files,
    },
  };
}
//@ chunk-8nfjhq0y.js:7106-7214 placement
async function uploadDisplayName(realPath) {
  let sessionDirReal = await realpath(sessionUploadsDir()).catch(() => {
    return;
  });
  return sessionDirReal !== undefined && dirname(realPath) === sessionDirReal
    ? uploadDisplayName_2(basename(realPath))
    : basename(realPath);
}
//@ chunk-8nfjhq0y.js:7214-7699 placement
/**
 * 访问文件系统前拒绝网络路径（UNC、自动挂载）与无法核验祖先链的路径，返回绝对路径及其链。
 */
function screenNetworkPath(rawPath, permissionContext) {
  let absPath = expandPath(rawPath);
  let trimmed = rawPath.trim();
  if (isDevicePrefixPath(trimmed) || isDevicePrefixPath(absPath))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `network path not allowed: ${isDevicePrefixPath(trimmed) ? trimmed : absPath}`,
      "claudeInChrome/fileUpload: network path rejected before filesystem access",
    );
  let { paths, vetted } = getPathsForNetworkScreen(absPath);
  if (!vetted)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path could not be vetted (symbolic link chain or unreadable component)",
      "claudeInChrome/fileUpload: unvettable path ancestry rejected before filesystem access",
    );
  let trustedNetworkDirectories = permissionContext.trustedNetworkDirectories;
  for (let candidatePath of [trimmed, ...paths])
    assertNotNetworkOrSuspicious(candidatePath, trustedNetworkDirectories);
  return {
    absPath,
    absChain: paths,
  };
}
//@ chunk-8nfjhq0y.js:7699-7961 placement
function assertNotNetworkOrSuspicious(path, trustedNetworkDirectories) {
  if (
    isUntrustedUncPath(path, trustedNetworkDirectories) ||
    isUntrustedAutomountPath(path, trustedNetworkDirectories)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `network path not allowed: ${path}`,
      "claudeInChrome/fileUpload: network path rejected",
    );
  if (hasSuspiciousWindowsPathPattern(path, trustedNetworkDirectories))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `suspicious path spelling: ${path}`,
      "claudeInChrome/fileUpload: suspicious Windows path pattern rejected",
    );
}
//@ chunk-8nfjhq0y.js:7961-8246 placement
function assertNoReadRule(paths, permissionContext, options = {}) {
  for (let checkPath of paths) {
    if (matchingRuleForInput(checkPath, permissionContext, "read", "deny", options))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read denied: ${checkPath}`,
        "claudeInChrome/fileUpload: path matches a read deny rule",
      );
    if (matchingRuleForInput(checkPath, permissionContext, "read", "ask", options))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read requires approval: ${checkPath}`,
        "claudeInChrome/fileUpload: path matches a read ask rule",
      );
  }
}
//@ chunk-8nfjhq0y.js:8246-8269 placement
/**
 * 上传路径的最大字符数（4096）。
 */
var MAX_UPLOAD_PATH_CHARS = 4096;
var MAX_PATH_ALIAS_DEPTH = 3;
var MAX_SCREENED_PATHS = 64;
//@ chunk-8nfjhq0y.js:8269-8340 placement
/**
 * 审查单个上传路径并返回其判定结果。
 */
async function screenUploadPath(path, permissionContext, depth = MAX_PATH_ALIAS_DEPTH, seen = new Set()) {
  return (await screenUnreadUpload(path, permissionContext, depth, seen)).judged;
}
//@ chunk-8nfjhq0y.js:8340-10482 placement
/**
 * 审查要上传的文件路径（空白填充、过长、网络路径、别名命名空间、读权限、凭据目录），返回拒绝原因或可读句柄。
 */
async function screenUnreadUpload(path, permissionContext, depth = MAX_PATH_ALIAS_DEPTH, seen = new Set()) {
  let trimmed = path.trim();
  if (trimmed !== path)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "surrounding whitespace",
      "claudeInChrome/fileUpload: whitespace-padded path rejected on the pass-through",
    );
  if (trimmed.length > MAX_UPLOAD_PATH_CHARS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "path too long",
      "claudeInChrome/fileUpload: over-long path rejected on the pass-through",
    );
  if (depth < 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `nested percent-encoding: ${trimmed}`,
      "claudeInChrome/fileUpload: multiply percent-encoded path rejected on the pass-through",
    );
  if (trimmed.split(/[/\\]/).some((segment) => segment === ".."))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `parent-segment spelling not allowed: ${trimmed}`,
      "claudeInChrome/fileUpload: dot-dot segment rejected on the pass-through",
    );
  assertNotAliasNamespace(trimmed);
  let judgedPath = expandPath(trimmed);
  if (!isAbsoluteAsSeen(trimmed, judgedPath)) throw new NotAnchoredAbsolutePathError();
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
    getDenyRuleForTool(permissionContext, {
      name: READ,
    }) !== null ||
    findAskRuleForTool(permissionContext, {
      name: READ,
    }) !== null
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Read tool is restricted for this session",
      "claudeInChrome/fileUpload: Read tool denied or ask-gated for this session (pass-through)",
    );
  for (let candidate of [trimmed, judgedPath]) {
    let refusal = await isCredentialPath(candidate);
    if (refusal !== undefined)
      throw refusal === "credential_name"
        ? new CredentialPathError()
        : passThroughRefusal("a kernel or device path, or one of Claude Code's own credentials");
  }
  let path_2 = trimmed
    .split(/([/\\])/)
    .map((part) => {
      if (part === "/" || part === "\\" || !part.includes("%")) return part;
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("");
  if (path_2 !== trimmed) await screenUploadPath(path_2, permissionContext, depth - 1, seen);
  let { absChain } = screenNetworkPath(trimmed, permissionContext);
  for (let linkPath of absChain) assertNotAliasNamespace(linkPath);
  let { realPath, looped, spellings } = await realpathWithSpellings(judgedPath);
  for (let spelling of spellings) {
    assertNotNetworkOrSuspicious(spelling, permissionContext.trustedNetworkDirectories);
    assertNotAliasNamespace(spelling);
  }
  let foldedPaths = new Set();
  for (let spelling of new Set([trimmed, ...absChain, ...spellings])) {
    let strippedPath = stripStreamSuffix(spelling);
    if (strippedPath !== null && !seen.has(strippedPath)) {
      if (seen.size >= MAX_SCREENED_PATHS)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "too many stream-base spellings",
          "claudeInChrome/fileUpload: stream-base fan-out rejected on the pass-through",
        );
      seen.add(strippedPath);
      try {
        await screenUploadPath(strippedPath, permissionContext, depth, seen);
      } catch (error) {
        throw error instanceof CredentialPathError ? passThroughRefusal(PASS_THROUGH_REFUSAL_NOTE) : error;
      }
    }
    for (let spellingVariant of [spelling, foldCase_2(spelling)])
      foldedPaths
        .add(spellingVariant)
        .add(spellingVariant.normalize("NFC"))
        .add(spellingVariant.normalize("NFD"));
  }
  assertNoReadRule(foldedPaths, permissionContext);
  assertNoReadRule(foldedPaths, permissionContext, {
    caseInsensitiveTarget: true,
  });
  for (let foldedPath of foldedPaths)
    if ((await isCredentialPath(foldedPath)) !== undefined)
      throw passThroughRefusal(PASS_THROUGH_REFUSAL_NOTE);
  return {
    judged: judgedPath,
    resolved: realPath,
    linked: absChain.length > 1 || looped,
  };
}
//@ chunk-8nfjhq0y.js:10482-10527 placement
/**
 * 判断路径是否命中凭据名称或目录。
 */
function isCredentialPath(path) {
  return classifyCredentialPath(path, path, {
    readable: true,
  });
}
//@ chunk-8nfjhq0y.js:10527-10643 placement
var PASS_THROUGH_REFUSAL_NOTE =
  "a name or place reached through a link, a case- or Unicode-folded spelling, or the file before a ':stream'";
//@ chunk-8nfjhq0y.js:10643-10756 placement
function passThroughRefusal(note) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    note,
    "claudeInChrome/fileUpload: path refused by its name or place on the pass-through",
  );
}
//@ chunk-8nfjhq0y.js:10756-10865 placement
function isAbsoluteAsSeen(judgedPath, resolvedPath) {
  if (isUncOrDevicePath(judgedPath) || isUncOrDevicePath(resolvedPath)) return true;
  if (!isAbsolute(judgedPath)) return false;
  return getPlatform() !== "windows" || /^[a-z]:[\\/]/i.test(resolvedPath);
}
//@ chunk-8nfjhq0y.js:10865-11207 placement
/**
 * 若路径末段带 NTFS 备用数据流（name:stream），返回去掉 ":stream" 的部分（先去掉尾部的 / 和 /.）；否则返回 null。
 */
function stripStreamSuffix(path) {
  let end = path.length;
  for (;;) {
    let char = path[end - 1];
    if (char === "/" || char === "\\") {
      end -= 1;
      continue;
    }
    if (char === "." && end >= 2 && (path[end - 2] === "/" || path[end - 2] === "\\")) {
      end -= 2;
      continue;
    }
    break;
  }
  let sliced = path.slice(0, end);
  let lastSeparator = Math.max(sliced.lastIndexOf("/"), sliced.lastIndexOf("\\")) + 1;
  let index = sliced.indexOf(":", lastSeparator + 1);
  if (index === -1 || (lastSeparator === 0 && index === 1)) return null;
  let cursor = index;
  while (cursor > lastSeparator && sliced[cursor - 1] === " ") cursor -= 1;
  return sliced.slice(0, cursor);
}
//@ chunk-8nfjhq0y.js:11207-11283 placement
/**
 * 路径不是锚定的绝对路径时抛出的错误类型。
 */
class NotAnchoredAbsolutePathError extends Error {
  constructor() {
    super("not an anchored absolute path");
  }
}
//@ chunk-8nfjhq0y.js:11283-11440 placement
async function realpathWithSpellings(path) {
  let resolved;
  try {
    resolved = await realpath(path);
  } catch (error) {
    return {
      realPath: undefined,
      looped: getErrnoCode(error) === "ELOOP",
      spellings: [],
    };
  }
  return {
    realPath: resolved,
    looped: false,
    spellings: getPathsForPermissionCheck(resolved),
  };
}
//@ chunk-8nfjhq0y.js:11440-11760 placement
/**
 * 拒绝内核别名命名空间路径：/dev、/proc、..namedfork、:$ 类 NTFS 属性、及其他别名拼写。
 */
function assertNotAliasNamespace(path) {
  let replaced = path.replace(/\\/g, "/");
  if (
    /^\/(?:dev|proc)(?:\/|$)/i.test(replaced) ||
    isMacSpecialPath(replaced) ||
    /(?:^|\/)\.\.namedfork(?:\/|$)/i.test(replaced) ||
    /:\$[a-z_]/i.test(replaced) ||
    isNetworkRelatedPath(replaced) ||
    replaced.split("/").some(isReservedDeviceName)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `alias namespace path not allowed: ${path}`,
      "claudeInChrome/fileUpload: kernel alias namespace path rejected on the pass-through",
    );
}
//@ chunk-8nfjhq0y.js:11760-11848 placement
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
//@ chunk-8nfjhq0y.js:11848-13801 placement
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
  let realPath = await realpath(absPath_2);
  let pathsToCheck = new Set([...absChain, ...getPathsForPermissionCheck(realPath)]);
  for (let checkPath of pathsToCheck) assertNotNetworkOrSuspicious(checkPath, trustedNetworkDirectories);
  assertNoReadRule(pathsToCheck, permissionContext);
  if (
    (await classifyCredentialPath(absPath_2, realPath, {
      readable: true,
      attached: true,
    })) !== undefined
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `kernel or device path, or one of Claude Code's credentials: ${realPath}`,
      "claudeInChrome/fileUpload: kernel or device path, or one of Claude Code's own credentials",
    );
  for (let root of roots) {
    let rootStat = await lstat(root.path).catch(() => null);
    if (rootStat === null || rootStat.isSymbolicLink() || !rootStat.isDirectory()) continue;
    let rootHandle = await open(root.path, constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW).catch(() => null);
    if (rootHandle === null) continue;
    let rootReal;
    try {
      let stats = await rootHandle.stat();
      if (!stats.isDirectory()) continue;
      let realFromRoot = await realpath(root.path).catch(() => {
        return;
      });
      if (realFromRoot === undefined) continue;
      let restat = await stat(realFromRoot).catch(() => null);
      if (restat === null || restat.ino !== stats.ino || restat.dev !== stats.dev) continue;
      rootReal = realFromRoot;
    } finally {
      await rootHandle.close();
    }
    if (realPath === rootReal || realPath.startsWith(rootReal + sep)) {
      if (root.kind === "staging") {
        let configDirReal = await realpath(getClaudeConfigDir()).catch(() => getClaudeConfigDir());
        if (
          rootReal === configDirReal ||
          rootReal.startsWith(configDirReal + sep) ||
          configDirReal.startsWith(rootReal + sep)
        )
          continue;
        if (!root.fromChat) await assertUploadPathAllowed(absPath_2, realPath);
        return {
          absPath: absPath_2,
          realPath,
          pathsToCheck,
          sharedWithSession: root.fromChat
            ? {
                fromChat: true,
              }
            : {},
          sessionRoot: root.kind,
        };
      }
      let sharedDigest = attachmentDigestOf(realPath);
      if (sharedDigest !== undefined)
        return {
          absPath: absPath_2,
          realPath,
          pathsToCheck,
          sharedWithSession: {
            requiredDigest: sharedDigest,
          },
          sessionRoot: root.kind,
        };
      break;
    }
  }
  if (
    getDenyRuleForTool(permissionContext, {
      name: READ,
    }) !== null ||
    findAskRuleForTool(permissionContext, {
      name: READ,
    }) !== null
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Read tool is restricted for this session",
      "claudeInChrome/fileUpload: Read tool denied or ask-gated for this session",
    );
  if (permissionContext.blockReadsOutsideWorkingDirectories)
    for (let checkedPath of pathsToCheck) {
      let allowedResult = isPathAllowed(checkedPath, permissionContext, "read");
      if (
        !allowedResult.allowed &&
        allowedResult.decisionReason?.type === "safetyCheck" &&
        allowedResult.decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `read not allowed: ${checkedPath}`,
          "claudeInChrome/fileUpload: path outside the working directories under the read block",
        );
    }
  return {
    absPath: absPath_2,
    realPath,
    pathsToCheck,
  };
}
//@ chunk-8nfjhq0y.js:13801-13943 placement
/**
 * Chrome 文件上传里“会话权限不允许读该路径”的错误类型。
 */
let OutsideWorkingFoldersRefusal; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8nfjhq0y.js:13801", () => {
  OutsideWorkingFoldersRefusal = class OutsideWorkingFoldersRefusal extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(checkPath) {
      super(
        `read not allowed: ${checkPath}`,
        "claudeInChrome/fileUpload: path read not allowed by session permissions",
      );
    }
  };
});
//@ chunk-8nfjhq0y.js:13943-14550 placement
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
  for (let checkPath of pathsToCheck) {
    let result = isPathAllowed(checkPath, permissionContext, "read");
    if (isOnlyOutsideWorkingFoldersRefusal(result)) throw new OutsideWorkingFoldersRefusal(checkPath);
    if (!result.allowed)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed: ${checkPath}`,
        "claudeInChrome/fileUpload: path read not allowed by session permissions",
      );
    if (permissionContext.restricted && isRestrictedReadBlocked(checkPath, permissionContext))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed under --restricted: ${checkPath}`,
        "claudeInChrome/fileUpload: restricted mode refused a file only an allow rule opens",
      );
  }
  await assertUploadPathAllowed(absPath, realPath);
  return {
    realPath,
  };
}
//@ chunk-8nfjhq0y.js:14550-15775 placement
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
  let inWorkingDir = isInWorkingDirectory(realPath, permissionContext);
  let sawAllowed = false;
  let sawRule = false;
  for (let checkPath of pathsToCheck) {
    let allowedResult = isPathAllowed(checkPath, permissionContext, "read");
    if (
      allowedResult.allowed &&
      !(restricted && allowedResult.decisionReason?.type === "rule") &&
      (allowedResult.decisionReason !== undefined || inWorkingDir)
    ) {
      sawRule ||= allowedResult.decisionReason !== undefined;
      continue;
    }
    let refusalNote =
      !allowedResult.allowed && !isOnlyOutsideWorkingFoldersRefusal(allowedResult)
        ? `refused by isPathAllowed (${allowedResult.decisionReason?.type ?? "no reason given"})`
        : restricted
          ? "--restricted session: no rule or host question reaches outside the working folders"
          : !hostAsksPerFile
            ? "outside the working folders, and the host does not ask per file"
            : undefined;
    if (refusalNote !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `read not allowed (${refusalNote}): ${checkPath}`,
        "claudeInChrome/fileUpload: pane path read not allowed by session permissions",
      );
    sawAllowed = true;
  }
  if (!sawAllowed) {
    await assertUploadPathAllowed(absPath, realPath);
    return {
      realPath,
      needsHostAsk:
        sawRule ||
        (await isInClaudeConfigDir(realPath, realpathOrUndefined).catch((error) => {
          logForDebugging(
            `[pane file_upload] own-files check failed, so the host asks: ${errorMessage(error)}`,
          );
          return true;
        })),
    };
  }
  let credentialRefusal = await classifyCredentialPath(absPath, realPath, {
    realDirectory: realpathOrUndefined,
  });
  if (credentialRefusal !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `refused by its name or place (${credentialRefusal}): ${realPath}`,
      "claudeInChrome/fileUpload: pane path outside the working folders is one of Claude Code's own files or is named like a credential",
    );
  return {
    realPath,
    outsideWorkingFolders: true,
    needsHostAsk: true,
  };
}
//@ chunk-8nfjhq0y.js:15775-15909 placement
function isInWorkingDirectory(realPath, permissionContext) {
  return Array.from(allWorkingDirectories(permissionContext))
    .flatMap((workingDir) => getCountedWorkingDirPaths(workingDir))
    .some((workingPath) =>
      pathInWorkingPath(realPath, workingPath, {
        caseFold: false,
        skipPrivateAlias: true,
        uncShapeParity: true,
      }),
    );
}
//@ chunk-8nfjhq0y.js:15909-15988 placement
/**
 * 取路径的真实值，缺失或凭据目录无权限时返回 undefined。
 */
async function realpathOrUndefined(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (isIgnorableRealpathError(path, error)) return;
    throw error;
  }
}
//@ chunk-8nfjhq0y.js:15988-16082 placement
/**
 * 判断取真实路径时的错误是否可忽略（不存在，或 CCR 凭据目录的 EACCES/EPERM）。
 */
function isIgnorableRealpathError(path, error) {
  if (isPathAbsent(error)) return true;
  let errnoCode = getErrnoCode(error);
  return path === dirname(CCR_OAUTH_TOKEN_PATH) && (errnoCode === "EACCES" || errnoCode === "EPERM");
}
//@ chunk-8nfjhq0y.js:16082-16263 placement
async function readAtMost(handle, limit) {
  let capacity = limit + 1;
  let buf = Buffer.allocUnsafe(capacity);
  let total = 0;
  while (total < capacity) {
    let { bytesRead } = await handle.read(buf, total, capacity - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  if (total > limit) return "grew";
  return {
    buf: buf.subarray(0, total),
  };
}
//@ chunk-8nfjhq0y.js:16263-16360 placement
/**
 * 把重命名失败归类为 moved 或 fallback。
 */
function classifyRenameFailure(error) {
  return error instanceof Error && "code" in error && error.code === "ENAMETOOLONG" ? "moved" : "fallback";
}
//@ chunk-8nfjhq0y.js:16360-16831 placement
async function verifyHandleBinding(handle, path, stats) {
  {
    let linkedPath = null;
    try {
      linkedPath = await readlink(`/proc/self/fd/${handle.fd}`);
    } catch (error) {
      if (classifyRenameFailure(error) === "moved") return "moved";
      logForDebugging(
        `verifyHandleBinding: /proc handle-path read unavailable, using two-sample fallback (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (linkedPath !== null) {
      if (linkedPath.endsWith(" (deleted)")) return "moved";
      return linkedPath === path ? "ok" : "moved";
    }
  }
  let restat = (await realpath(path).catch(() => null)) === path ? await stat(path).catch(() => null) : null;
  if (restat === null || restat.ino !== stats.ino || restat.dev !== stats.dev) return "moved";
  return "ok";
}
//@ chunk-8nfjhq0y.js:16831-17648 placement
async function readValidatedFileWithin(path, maxBytes, onOpen) {
  let pathStat = await lstat(path).catch(() => null);
  if (pathStat === null || !pathStat.isFile())
    return {
      refusal: "not_regular",
    };
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    logForDebugging(`readValidatedFileWithin: open failed: ${errorMessage(error)}`);
    return {
      refusal: "open_failed",
      detail: sanitizeErrnoForTelemetry(error) ?? "unknown error",
    };
  }
  try {
    let stats = await handle.stat();
    if (stats.nlink > 1)
      return {
        refusal: "hard_links",
      };
    if (!stats.isFile())
      return {
        refusal: "moved",
      };
    if ((await verifyHandleBinding(handle, path, stats)) === "moved")
      return {
        refusal: "moved",
      };
    if (onOpen !== undefined) {
      if (stats.size > maxBytes)
        return {
          refusal: "too_large",
          size: stats.size,
        };
      await onOpen(handle, stats.size);
      return {
        buf: Buffer.alloc(0),
      };
    }
    if (stats.size > maxBytes)
      return {
        refusal: "too_large",
      };
    let atMost = await readAtMost(handle, stats.size);
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
    await handle.close();
  }
}
//@ chunk-8nfjhq0y.js:17648-17921 placement
async function readUploadFile(path, realPath, budget, tag, errorFor) {
  let refusal = await readValidatedFileWithin(realPath, budget.remaining);
  if ("buf" in refusal) {
    budget.remaining -= refusal.buf.length;
    return refusal;
  }
  if (errorFor !== undefined) {
    let detailSuffix = "detail" in refusal ? `: ${refusal.detail}` : "";
    logForDebugging(`[${tag} file_upload] read refused (${refusal.refusal}${detailSuffix}): ${path}`);
    return {
      error: errorFor(path),
    };
  }
  return {
    error: uploadReadRefusalMessage(path, refusal, budget.total),
  };
}
//@ chunk-8nfjhq0y.js:17921-19014 placement
/**
 * 把文件读取拒绝原因（非普通文件、打开失败、多硬链接、路径移动、超总量等）映射成给模型的文案。
 */
function uploadReadRefusalMessage(path, refusal, totalLimit = FILE_UPLOAD_MAX_TOTAL_BYTES) {
  let displayPath = sanitizeForMessage(path);
  switch (refusal.refusal) {
    case "not_regular":
      return `Cannot upload "${displayPath}": not a regular file.`;
    case "open_failed":
      return `Cannot upload "${displayPath}": failed to open file (${refusal.detail}).`;
    case "hard_links":
      return `Cannot upload "${displayPath}": the file has multiple hard links, which can alias a file outside the session's allowed directories. This commonly triggers for files inside package-manager stores like node_modules (Bun and pnpm hard-link packages). Copy the file (e.g. with cp) and upload the copy.`;
    case "moved":
      return `Cannot upload "${displayPath}": path moved during validation.`;
    case "too_large":
      return `Cannot upload "${displayPath}": total upload size would exceed ${totalLimit >= 1048576 ? `${Math.floor((totalLimit * 10) / 1048576) / 10} MB` : totalLimit >= 1024 ? `${Math.floor(totalLimit / 1024)} KB` : `${totalLimit} bytes`}. file_upload sends file contents over the browser bridge in a single message; use a smaller file, or split across multiple file_upload calls if the page accepts files one at a time.`;
    case "grew":
      return `Cannot upload "${displayPath}": file grew during read.`;
    case "read_failed":
      return `Cannot upload "${displayPath}": failed to read file (${refusal.detail}).`;
  }
}
//@ chunk-8nfjhq0y.js:19014-19804 placement
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
//@ chunk-8nfjhq0y.js:19804-19878 placement (2.1.88 match: guessMimeType, 1)
/**
 * 按扩展名猜 MIME（文档/图片/音视频），未知为 application/octet-stream。
 */
function guessMimeType(filename) {
  return FILE_MIME_BY_EXT[extname(filename).toLowerCase()] ?? "application/octet-stream";
}
//@ chunk-z68qgrbt.js:868-897 placement
/**
 * 面板上传的总字节上限（10 MiB）。
 */
var MAX_PANE_UPLOAD_BYTES = 10485760;
var MAX_CHROME_UPLOAD_BYTES = 134217728;
export {
  MAX_CHROME_UPLOAD_BYTES,
  isRestrictedReadBlocked,
  verifyHandleBinding,
  preparePaneFileUploadInput,
  FILE_UPLOAD_MAX_TOTAL_BYTES,
  validateUploadPath,
  uploadDisplayName,
  prepareChromeFileUploadInput,
  screenUnreadUpload,
  readValidatedFileWithin,
  CredentialPathError,
  OutsideWorkingFoldersRefusal,
  MAX_PANE_UPLOAD_BYTES,
  passThroughChromeFileUploadInput,
};
