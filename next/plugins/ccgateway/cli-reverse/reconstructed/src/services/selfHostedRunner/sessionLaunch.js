/**
 * services/selfHostedRunner/sessionLaunch.ts
 *
 * 2.1.316 新增：自托管 runner 启动会话进程的辅助：系统提示词文件投递、启动失败分类、会话 JWT 字段读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (42)
 * attribution: placement 33, layout 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, relative, sep } from "path";
import { constants } from "fs";
import { open, readdir, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { pushFlagArg } from "./childArgs.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { writeSessionFileAtomically } from "./hostConfigSnapshot.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedErrCodeForTelemetry,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
} from "../../utils/errors.js";
import { isReviewOriginSession } from "./handleSession.js";
import { isEnvDefinedFalsy, isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { parseSettingSourcesFlag } from "../../utils/settings/constants.js";
import { RepositoryAccessError } from "../../selfHostedRunner/git/repoPrepare.js";
import { REPO_NAME_RE } from "../../utils/git/githubUrl.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { ATOMIC_WRITE_DIRNAME } from "../../utils/plugins/safeCopy.js";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "../../utils/fsBoundRead.js";
import { safeParseJSON } from "../../utils/json.js";
import { escapeInvisibleChars } from "../../utils/resultError.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getFileKind } from "../../utils/fileKind.js";
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { withDeadline, sleep } from "../../utils/sleep.js";
import { decodeJwtExpiry, decodeJwtPayload, createTokenRefreshScheduler } from "../../bridge/jwtUtils.js";
import { formatDuration } from "../../utils/format.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { SYNTHETIC_MODEL } from "../../utils/messages.js";

//@ chunk-asf5gh8x.js:61249-61260 placement
var SYSTEM_PROMPT_FILE_WRITE_TIMEOUT_MS = 1e4;
//@ chunk-asf5gh8x.js:61289-61571 placement
/**
 * --system-prompt / --append-system-prompt 等参数与对应投递文件名表。
 */
var MAX_INLINE_PROMPT_BYTES_2 = 131072;
var MAX_INLINE_PROMPT_BYTES = 1e4;
var APPEND_SUBAGENT_SYSTEM_PROMPT = "append-subagent-system-prompt";
var SYSTEM_PROMPT_FILE_ARGS = [
  {
    key: "system-prompt",
    fileName: "remote-system-prompt.txt",
  },
  {
    key: "append-system-prompt",
    fileName: "remote-append-system-prompt.txt",
  },
  {
    key: APPEND_SUBAGENT_SYSTEM_PROMPT,
    fileName: "remote-append-subagent-system-prompt.txt",
    pinnedChildMayLackFileFlag: true,
  },
];
//@ chunk-asf5gh8x.js:61571-61656 placement
/**
 * 按开关决定是否保留子代理系统提示词，其余系统提示词键一律保留。
 */
function stripSystemPromptFileArgs(args, subagentPromptInline) {
  let kept = {
    ...args,
  };
  for (let { key } of SYSTEM_PROMPT_FILE_ARGS)
    if (key !== APPEND_SUBAGENT_SYSTEM_PROMPT || !subagentPromptInline) delete kept[key];
  return kept;
}
//@ chunk-asf5gh8x.js:61656-62433 placement
/**
 * 把服务器下发的系统提示词写入会话目录并改用 *-file 参数传递。
 */
async function writeSystemPromptFile(options) {
  let { args, claudeCodeArgs, configDir, stagedPaths, onDebug } = options;
  let remainingArgs = {
    ...claudeCodeArgs,
  };
  for (let { key, fileName, pinnedChildMayLackFileFlag } of SYSTEM_PROMPT_FILE_ARGS) {
    let rawValue = claudeCodeArgs[key];
    let promptText = rawValue === undefined ? "" : String(rawValue);
    if (promptText === "") continue;
    let promptBytes = Buffer.byteLength(promptText, "utf8");
    if (pinnedChildMayLackFileFlag && !options.childIsOwnBinary) {
      let inlineArgs = [];
      pushFlagArg(inlineArgs, key, promptText);
      if (inlineArgs.every((inlineArg) => Buffer.byteLength(inlineArg, "utf8") < MAX_INLINE_PROMPT_BYTES_2))
        continue;
    }
    delete remainingArgs[key];
    let promptPath = join(configDir, fileName);
    stagedPaths.push(promptPath);
    let cancelState = {
      cancelled: false,
    };
    try {
      await withBoundedTimeout(
        writeSessionFileAtomically(configDir, fileName, promptText, 384, cancelState),
        MAX_INLINE_PROMPT_BYTES,
        `[runner:stuck] write ${promptPath} (check NFS/CSI mount health)`,
      );
    } catch (error) {
      cancelState.cancelled = true;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `could not write the ${key} file for the session (${promptBytes} bytes, ${sanitizedErrCodeForTelemetry(error) ?? "unknown error"})`,
        "could not write a system prompt file for the session",
      );
    }
    args.push(`--${key}-file`, promptPath);
    onDebug(`[runner:session] delivering ${key} by file: ${promptPath} (${promptBytes} bytes)`);
  }
  return remainingArgs;
}
//@ chunk-asf5gh8x.js:62433-62845 layout
function isRestrictedSession(remoteConfig) {
  if (isReviewOriginSession(remoteConfig)) return true;
  let claudeCodeArgs = remoteConfig.claude_code_args;
  let environmentVariables = remoteConfig.environment_variables ?? {};
  if (
    (Object.hasOwn(claudeCodeArgs, "restricted") && !isEnvDefinedFalsy(String(claudeCodeArgs.restricted))) ||
    Object.entries(environmentVariables).some(
      ([key, value]) => key.toUpperCase() === "CLAUDE_CODE_RESTRICTED" && isEnvTruthy(String(value)),
    ) ||
    env.CLAUDE_CODE_RESTRICTED
  )
    return true;
  if (!Object.hasOwn(claudeCodeArgs, "setting-sources")) return false;
  try {
    return !parseSettingSourcesFlag(String(claudeCodeArgs["setting-sources"])).includes("projectSettings");
  } catch {
    return true;
  }
}
//@ chunk-asf5gh8x.js:62845-62965 placement
function repositoryDenialOf(error) {
  if (!(error instanceof RepositoryAccessError) || error.denial === undefined) return;
  return {
    denial: error.denial,
    error,
    repository: error.repository,
  };
}
//@ chunk-asf5gh8x.js:62965-62976 placement
var MAX_REPO_SPEC_CHARS = 200;
//@ chunk-asf5gh8x.js:62976-63060 placement
/**
 * 仓库规格字符串是否可安全显示（长度、路径字符、无密钥）。
 */
function isPrintableRepoSpec(repoSpec) {
  return (
    repoSpec.length <= MAX_REPO_SPEC_CHARS &&
    repoSpec.split("/").every((segment) => REPO_NAME_RE.test(segment)) &&
    redactSecretsInText(repoSpec) === repoSpec
  );
}
//@ chunk-asf5gh8x.js:63060-63461 placement
function formatRepoNotAccessibleError(repoSpec) {
  return `This runner couldn't read ${isPrintableRepoSpec(repoSpec) ? repoSpec : "one of this session's repositories (the output below may show which)"}. Either it doesn't exist or this runner can't access it. If it's the wrong repository, start a new session with the right one. If it's the right one, ask the team that manages your runners to check that the runners can access it. Once that's fixed, start a new session.`;
}
//@ chunk-asf5gh8x.js:63461-63570 placement
function REPO_NOT_FOUND_REASON(error) {
  let denialInfo = repositoryDenialOf(error);
  return denialInfo?.denial === "repo_not_found_or_no_permission"
    ? formatRepoNotAccessibleError(denialInfo.repository.repo)
    : undefined;
}
//@ chunk-asf5gh8x.js:63570-63931 placement
/**
 * 子进程启动失败（E2BIG、ENOENT、EACCES 等）的说明表。
 */
var SPAWN_FAILURE_DESCRIPTIONS = {
  e2big: "the launch configuration was too large",
  enoent: "the Claude Code executable or working directory was not found",
  eacces: "the Claude Code executable could not be executed",
  enoexec: "the Claude Code executable could not be executed",
  eio: "the system could not start the Claude Code process",
  enomem: "the system could not start the Claude Code process",
};
//@ chunk-asf5gh8x.js:63931-64030 placement
/**
 * 把启动失败的 errno 归类成已知类别或 other。
 */
function spawnFailureClass(error) {
  if (error === undefined || error === null) return;
  let code = getErrnoCode(error)?.toLowerCase() ?? "";
  return isKnownSpawnFailureCode(code) ? code : "other";
}
//@ chunk-asf5gh8x.js:64030-64072 placement
function isKnownSpawnFailureCode(code) {
  return Object.hasOwn(SPAWN_FAILURE_DESCRIPTIONS, code);
}
//@ chunk-asf5gh8x.js:64072-64169 placement
/**
 * 生成启动失败的遥测字段（错误类别、最长参数与环境变量长度）。
 */
function spawnFailureFields(failure) {
  return {
    start_error_class: failure.class,
    max_arg_len: failure.maxArgLen,
    max_env_len: failure.maxEnvLen,
  };
}
//@ chunk-asf5gh8x.js:64169-64258 placement
/**
 * 计算一组字符串中最大的 UTF-8 字节长度。
 */
function maxUtf8ByteLength(strings) {
  let maxLen = 0;
  for (let text of strings) maxLen = Math.max(maxLen, Buffer.byteLength(text, "utf8"));
  return maxLen;
}
//@ chunk-asf5gh8x.js:64258-64604 placement
/**
 * 描述启动失败原因（含参数/环境最长项长度）。
 */
function describeSpawnFailure(error, args, env) {
  let failureClass = spawnFailureClass(error) ?? "other";
  let maxArgLen = maxUtf8ByteLength(args);
  let maxEnvLen = maxUtf8ByteLength(
    Object.entries(env).flatMap(([key, value]) => (value === undefined ? [] : [`${key}=${value}`])),
  );
  let detail =
    failureClass === "other"
      ? (sanitizeErrnoForTelemetry(error) ?? "unknown error")
      : `${SPAWN_FAILURE_DESCRIPTIONS[failureClass]} (${failureClass.toUpperCase()}${failureClass === "e2big" ? `; longest argument ${maxArgLen} bytes, longest environment entry ${maxEnvLen} bytes` : ""})`;
  return {
    class: failureClass,
    maxArgLen,
    maxEnvLen,
    description: `spawn error: ${detail}`,
  };
}
//@ chunk-asf5gh8x.js:67379-67795 placement
var MAX_STDERR_TAIL_CHARS = 1e4;
var MAX_LISTABLE_ENTRY_BYTES = 65536n;
var DISPLAY_PATH_SEGMENTS = 80;
var CLAUDE_CONFIG_DIR_NAME = ".claude";
var EXPECTED_FOLDER_ENTRY_KINDS = new Map([
  ["settings.local.json", "file"],
  [ATOMIC_WRITE_DIRNAME, "dir"],
]);
var DIR_OPEN_FLAGS = O_NOFOLLOW_ANY | constants.O_DIRECTORY | READ_LIMITS;
var BIGINT_STAT_OPTIONS = {
  bigint: true,
};
var NO_FOLDER_REASON = "no folder, or a link to one, stands there";
var OUT_OF_TIME_REASON = "out of time";
var MOUNTED_REASON =
  "a file system is mounted on it, or this system's /proc does not say which mount it is on";
var ENTRY_KIND_NOUNS = {
  file: "a file",
  dir: "a folder",
  symlink: "a link",
  other: "something else",
  unknown: "something whose kind could not be read",
};
//@ chunk-asf5gh8x.js:67795-68101 layout
function parseStartFolderLine(message) {
  let parsed = safeParseJSON(message, false);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed && parsed.type === "system") ||
    !("subtype" in parsed && parsed.subtype === "start_folder") ||
    !("dev" in parsed && "ino" in parsed)
  )
    return;
  let { dev, ino } = parsed;
  let isNumeric = (value) => typeof value === "string" && /^\d{1,20}$/.test(value);
  return isNumeric(dev) && isNumeric(ino)
    ? {
        dev: BigInt(dev),
        ino: BigInt(ino),
      }
    : undefined;
}
//@ chunk-asf5gh8x.js:68101-68145 layout
function describePathShort(path) {
  return escapeInvisibleChars(jsonStringify(path.slice(0, DISPLAY_PATH_SEGMENTS)));
}
//@ chunk-asf5gh8x.js:68145-68264 layout
function couldNotList(label, path, reason) {
  return {
    keeps: "own_folder_unknown",
    says: `${label} could not be listed${path === "" ? "" : ` at ${describePathShort(path)}`}: ${reason}`,
  };
}
//@ chunk-asf5gh8x.js:68264-68391 layout
function wrongKindInFolder(label, path, kind) {
  return {
    keeps: kind === "unknown" ? "own_folder_unknown" : "own_folder_entries",
    says: `${label} holds ${describePathShort(path)} (${ENTRY_KIND_NOUNS[kind]})`,
  };
}
//@ chunk-asf5gh8x.js:68391-68681 layout
async function openUnderHandle(fs, handle, name) {
  let childHandle = await fs.open(
    `/proc/self/fd/${handle.fd}/${name}`,
    DIR_OPEN_FLAGS | constants.O_NOFOLLOW,
  );
  let [mappedHandle, parentMountId] = await Promise.all(
    [childHandle, handle].map((infoText) =>
      fs.readFile(`/proc/self/fdinfo/${infoText.fd}`, "utf8").then(
        (childMountId) => /^mnt_id:\s*(\d+)$/m.exec(childMountId)?.[1],
        () => {
          return;
        },
      ),
    ),
  );
  if (mappedHandle !== undefined && mappedHandle === parentMountId) return childHandle;
  await childHandle.close();
  return;
}
//@ chunk-asf5gh8x.js:68681-68932 layout
async function listDirectory(fs, dirPath, stats) {
  if (!stats.isDirectory()) return NO_FOLDER_REASON;
  if (stats.size > MAX_LISTABLE_ENTRY_BYTES) return "it is, or once was, too large to list";
  let entries = await fs.readdir(dirPath, {
    withFileTypes: true,
  });
  return Promise.all(
    entries.map(async (dirent) => ({
      name: dirent.name,
      kind: await getFileKind(dirent, join(dirPath, dirent.name), "unknown"),
    })),
  );
}
//@ chunk-asf5gh8x.js:68932-71718 layout
function checkOwnFolder(
  { sessionFolder, startFolder, checkouts, saidByChildOfScript },
  report,
  {
    capMs = MAX_STDERR_TAIL_CHARS,
    fs = {
      open,
      readdir,
      readFile,
    },
    hasHandles = O_NOFOLLOW_ANY !== 0,
  } = {},
) {
  let sessionParent = dirname(sessionFolder);
  let any = checkouts.some((checkout) => isSubpathOf(checkout, startFolder, true));
  let tooSlow = false;
  return async () => {
    if (!hasHandles) return "own_folder_not_linux";
    if (tooSlow) return "own_folder_too_slow";
    let scriptStart = saidByChildOfScript?.();
    if (
      saidByChildOfScript !== undefined &&
      (typeof scriptStart !== "object" || startFolder !== sessionFolder)
    ) {
      report(
        `the session's process, which --exec-path or a command hook started, ${scriptStart === undefined ? "has not said where it was started: nothing has come on file descriptor 3 (the script closes it or does not pass it on, as docker run and sudo do not, or drops CLAUDE_RUNNER_ACTIVITY_FD or CLAUDE_CODE_TEE_SDK_STDOUT)" : scriptStart === "unusable" ? "has not said where it was started: the first line on file descriptor 3 was something else (a Claude Code older than this runner, the script's own output there, or a Claude Code that could not read its start folder)" : "was not started in the session's own folder (but in a checkout, or in a folder that Anthropic's control plane named): it can vouch only for the folder in which it was started, so the listing is not believed"}`,
      );
      return "own_folder_behind_script";
    }
    if (!any && isSubpathOf(sessionFolder, startFolder, false)) return "own_folder_start_named";
    tooSlow = true;
    let timedOut = false;
    let results = await withDeadline(
      Promise.all(
        (any || startFolder === sessionFolder ? [sessionFolder] : [sessionFolder, startFolder]).map(
          async (folder) => {
            let folderPath =
              folder === sessionFolder
                ? "its own folder under --base-dir/_sessions"
                : "the folder where it started";
            let label = "";
            try {
              if (!isSubpathOf(sessionParent, folder, false))
                return couldNotList(
                  folderPath,
                  "",
                  "it lies outside --base-dir/_sessions, where the runner does not look",
                );
              let handle = await fs.open(sessionParent, DIR_OPEN_FLAGS);
              for (let segment of relative(sessionParent, folder).split(sep)) {
                await using current = handle;
                if (timedOut) return couldNotList(folderPath, "", OUT_OF_TIME_REASON);
                let nextHandle = await openUnderHandle(fs, current, segment);
                if (nextHandle === undefined) return couldNotList(folderPath, "", MOUNTED_REASON);
                handle = nextHandle;
              }
              await using folderHandle = handle;
              let folderStat = await folderHandle.stat(BIGINT_STAT_OPTIONS);
              if (
                typeof scriptStart === "object" &&
                !(
                  scriptStart.ino !== 0n &&
                  scriptStart.ino === folderStat.ino &&
                  scriptStart.dev === folderStat.dev
                )
              )
                return {
                  keeps: "own_folder_behind_script",
                  says: "the session's process, which --exec-path or a command hook started, was started in another folder than the runner named, or in a container or mount where that path is another folder",
                };
              let listing = timedOut
                ? OUT_OF_TIME_REASON
                : await listDirectory(fs, `/proc/self/fd/${folderHandle.fd}`, folderStat);
              if (typeof listing === "string") return couldNotList(folderPath, "", listing);
              let unexpectedEntry = listing.find(
                ({ name: entryName, kind: entryKind }) =>
                  entryKind !== "dir" ||
                  !(entryName === CLAUDE_CONFIG_DIR_NAME || checkouts.includes(join(folder, entryName))),
              );
              if (unexpectedEntry !== undefined)
                return wrongKindInFolder(folderPath, unexpectedEntry.name, unexpectedEntry.kind);
              if (
                !listing.some(({ name: configDirLabel }) => configDirLabel === CLAUDE_CONFIG_DIR_NAME) ||
                checkouts.includes(join(folder, CLAUDE_CONFIG_DIR_NAME))
              )
                return;
              label = CLAUDE_CONFIG_DIR_NAME;
              if (timedOut) return couldNotList(folderPath, label, OUT_OF_TIME_REASON);
              await using configHandle = await openUnderHandle(fs, folderHandle, CLAUDE_CONFIG_DIR_NAME);
              if (configHandle === undefined) return couldNotList(folderPath, label, MOUNTED_REASON);
              let configListing = timedOut
                ? OUT_OF_TIME_REASON
                : await listDirectory(
                    fs,
                    `/proc/self/fd/${configHandle.fd}`,
                    await configHandle.stat(BIGINT_STAT_OPTIONS),
                  );
              if (typeof configListing === "string") return couldNotList(folderPath, label, configListing);
              let badConfigEntry = configListing.find(
                ({ name: entryKind, kind: configEntryKind }) =>
                  EXPECTED_FOLDER_ENTRY_KINDS.get(entryKind) !== configEntryKind,
              );
              return (
                badConfigEntry &&
                wrongKindInFolder(folderPath, `${label}/${badConfigEntry.name}`, badConfigEntry.kind)
              );
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              return couldNotList(
                folderPath,
                label,
                errnoCode === "ENOTDIR" ? NO_FOLDER_REASON : (errnoCode ?? "a call failed"),
              );
            }
          },
        ),
      ).finally(() => {
        tooSlow = false;
      }),
      capMs,
    );
    timedOut = true;
    if (results === undefined) return "own_folder_too_slow";
    let keptVerdict =
      results.find((verdict) => verdict?.keeps === "own_folder_entries") ??
      results.find((verdict) => verdict !== undefined);
    if (keptVerdict === undefined) return;
    report(keptVerdict.says);
    return keptVerdict.keeps;
  };
}
//@ chunk-asf5gh8x.js:71718-72006 placement
function createPrepTimer() {
  let startedAt;
  let lastMarkAt;
  let phases = {};
  return {
    start(now = Date.now()) {
      if (startedAt === undefined) {
        startedAt = now;
        lastMarkAt = now;
      }
    },
    mark(phase, now = Date.now()) {
      if (lastMarkAt === undefined) return;
      phases[phase] = (phases[phase] ?? 0) + Math.max(0, now - lastMarkAt);
      lastMarkAt = now;
    },
    lap(now = Date.now()) {
      if (lastMarkAt !== undefined) lastMarkAt = now;
    },
    finish(now = Date.now()) {
      if (startedAt === undefined) return {};
      return {
        ...phases,
        runner_prep_total_ms: Math.max(0, now - startedAt),
      };
    },
  };
}
//@ chunk-asf5gh8x.js:72006-72035 placement
var CCR_SHR_START_MARKS = "CCR_SHR_START_MARKS";
//@ chunk-asf5gh8x.js:72035-72054 layout
var HOOK_TIMEOUT_MS = 1e4;
var HOOK_TOTAL_BUDGET_MS = 4 * HOOK_TIMEOUT_MS;
//@ chunk-asf5gh8x.js:72054-72112 placement
function decodeSessionJwt(token) {
  return decodeJwtExpiry(token.replace(/^sk-ant-[a-z]+-/, ""));
}
//@ chunk-asf5gh8x.js:72112-72323 placement
function getSessionIdFromJwt(token) {
  let replaced = token.replace(/^sk-ant-[a-z]+-/, "");
  let payload = decodeJwtPayload(replaced);
  if (payload === null || typeof payload !== "object") return null;
  let act = payload.act;
  if (act === null || typeof act !== "object") return null;
  let email = act.email;
  return typeof email === "string" ? email : null;
}
//@ chunk-asf5gh8x.js:72323-72507 placement
function getSpawnSessionIdFromJwt(token) {
  let replaced = token.replace(/^sk-ant-[a-z]+-/, "");
  let payload = decodeJwtPayload(replaced);
  if (payload === null || typeof payload !== "object") return null;
  let spawnSessionId = payload["ccr:spawn_session_id"];
  return typeof spawnSessionId === "string" && spawnSessionId.length > 0 ? spawnSessionId : null;
}
//@ chunk-asf5gh8x.js:72507-72647 placement
function isPoolSpawnJwt(token) {
  let payload = decodeJwtPayload(token.replace(/^sk-ant-[a-z]+-/, ""));
  return (
    payload !== null &&
    typeof payload === "object" &&
    "ccr:role" in payload &&
    payload["ccr:role"] === "pool_spawn"
  );
}
//@ chunk-asf5gh8x.js:72647-72747 placement
async function notAvailableInThisBuild({ tokenState, refreshToken, adopt }) {
  throw Error("not available in this build");
}
//@ chunk-asf5gh8x.js:72747-72941 placement
function getJwtExpiry({ getAccessToken, onRefresh, label }) {
  return createTokenRefreshScheduler({
    getAccessToken,
    onRefresh,
    label,
    maxFailures: 1 / 0,
    adaptiveBuffer: true,
    rescheduleFromNewToken: true,
    decodeExpiry: decodeSessionJwt,
    formatDelay: formatDuration,
  });
}
//@ chunk-asf5gh8x.js:72978-72990 placement
var STDERR_TAIL_CHARS = 2000;
//@ chunk-asf5gh8x.js:72990-73078 placement
function isEpochMismatchError(error) {
  return error instanceof Error && "isEpochMismatch" in error && error.isEpochMismatch === true;
}
//@ chunk-asf5gh8x.js:73078-73156 placement
function isNotFoundError(error) {
  return error instanceof Error && "isNotFound" in error && error.isNotFound === true;
}
//@ chunk-asf5gh8x.js:73156-73250 placement
function isSessionNotActiveError(error) {
  return error instanceof Error && "isSessionNotActive" in error && error.isSessionNotActive === true;
}
//@ chunk-asf5gh8x.js:73250-73285 placement
/**
 * 判断错误是否表示仓库/会话不存在或会话未活动。
 */
function isNotFoundOrInactive(error) {
  return isNotFoundError(error) || isSessionNotActiveError(error);
}
//@ chunk-asf5gh8x.js:73285-75110 placement
/**
 * 会话启动失败时向服务器发布失败结果（主动中止的会话跳过）。
 */
async function postSessionFailureResult(options) {
  let {
    apiClient,
    apiBaseUrl,
    sessionId,
    sessionToken,
    workerEpoch,
    exitCode,
    exitSignal,
    stderrTail,
    setupTerminal,
    setupFailureKind,
    startError,
    refusedByHostPolicy,
    ranAsThread,
    insteadOfRetryHint,
    onDebug,
    onStatus,
    signal,
  } = options;
  if (signal.aborted) {
    onDebug(
      `[runner:session] Skipping failure-result post for ${sessionId} \u2014 session was deliberately aborted`,
    );
    return "skipped";
  }
  let events = [
    ...(startError ? [logEnvManagerError(startError)] : []),
    ...describeSessionProcessExit({
      exitCode,
      exitSignal,
      stderrTail,
      setupTerminal,
      setupFailureKind,
      startError,
      refusedByHostPolicy,
      ranAsThread,
      insteadOfRetryHint,
    }),
  ];
  let postEvents = () =>
    apiClient.postWorkerEvents(apiBaseUrl, sessionId, sessionToken, workerEpoch, events, signal);
  try {
    await postEvents();
    onDebug(
      `[runner:session] Posted failure result for ${sessionId} (exitCode=${exitCode} signal=${exitSignal})`,
    );
    return "posted";
  } catch (error) {
    if (isNotFoundOrInactive(error)) {
      onDebug(
        `[runner:session] failure-result rejected (session gone) \u2014 ${sessionId} is archived or deleted server-side`,
      );
      return "session_gone";
    }
    if (isEpochMismatchError(error)) {
      onDebug(
        `[runner:session] failure-result rejected (stale epoch) \u2014 another runner has taken over ${sessionId}. This process was the orphan.`,
      );
      return "epoch_stale";
    }
    let message = redactSecretsInText(error instanceof Error ? error.message : String(error));
    onStatus(
      `[runner:stuck] Failed to post failure-result for ${sessionId} (attempt 1): ${message} \u2014 retrying in 2s`,
    );
    await sleep(2000, signal);
  }
  try {
    await postEvents();
    onDebug(
      `[runner:session] Posted failure result for ${sessionId} on retry (exitCode=${exitCode} signal=${exitSignal})`,
    );
    return "posted";
  } catch (error) {
    if (isNotFoundOrInactive(error)) {
      onDebug(
        `[runner:session] failure-result rejected (session gone on retry) \u2014 ${sessionId} is archived or deleted server-side`,
      );
      return "session_gone";
    }
    if (isEpochMismatchError(error)) {
      onDebug(
        `[runner:session] failure-result rejected (stale epoch on retry) \u2014 another runner has taken over ${sessionId}. This process was the orphan.`,
      );
      return "epoch_stale";
    }
    let message = redactSecretsInText(error instanceof Error ? error.message : String(error));
    onStatus(
      `[runner:stuck] Failed to post failure-result for ${sessionId} after retry: ${message} \u2014 UI spinner may not stop`,
    );
    return "post_failed";
  }
}
//@ chunk-asf5gh8x.js:75110-75360 placement
function logEnvManagerError(failure) {
  return {
    type: "env_manager_log",
    uuid: randomUUID(),
    data: {
      level: "error",
      category: "execute",
      content: "Claude Code execution failed",
      timestamp: new Date().toISOString(),
      extra: {
        error: failure.description,
        exit_code: -1,
        duration_ms: 0,
        stderr_class: "",
        ...spawnFailureFields(failure),
      },
    },
  };
}
//@ chunk-asf5gh8x.js:75360-76642 placement
/**
 * 描述会话进程退出（启动失败、退出码、托管设置 disableSideloadFlags 拒绝等）。
 */
function describeSessionProcessExit({
  exitCode,
  exitSignal,
  stderrTail,
  setupTerminal,
  setupFailureKind,
  startError,
  refusedByHostPolicy = false,
  ranAsThread = false,
  insteadOfRetryHint,
}) {
  let didRun = exitCode !== null || exitSignal !== null;
  let exitText = exitCode === null ? "failed to start" : `exited with code ${exitCode}`;
  let summary = ranAsThread ? "Claude stopped unexpectedly." : `The session process ${exitText}.`;
  let message = refusedByHostPolicy
    ? `${summary} This machine's managed settings (disableSideloadFlags) refused the launch.`
    : `${summary} ${insteadOfRetryHint ?? (ranAsThread ? "Send a message to continue. If this keeps happening, start a new session." : "You can try again by sending a new message or starting a new session.")}`;
  if (stderrTail.trim().length > 0) {
    let tail =
      stderrTail.length > STDERR_TAIL_CHARS
        ? `\u2026${takeLastChars(stderrTail, STDERR_TAIL_CHARS)}`
        : stderrTail;
    message += `

Last output before exit:
${tail}`;
  }
  let assistantMessage = {
    type: "assistant",
    uuid: randomUUID(),
    message: {
      role: "assistant",
      model: SYNTHETIC_MODEL,
      content: [
        {
          type: "text",
          text: message,
        },
      ],
      stop_reason: "stop_sequence",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    },
    parent_tool_use_id: null,
    isApiErrorMessage: true,
  };
  let resultMessage = {
    type: "result",
    uuid: randomUUID(),
    subtype: "error_during_execution",
    is_error: true,
    duration_ms: 0,
    duration_api_ms: 0,
    num_turns: 0,
    total_cost_usd: 0,
    errors: [message],
    runner_exit: didRun
      ? {
          phase: "run",
          exit_code: exitCode,
          signal: exitSignal,
        }
      : {
          phase: "setup",
          ...(startError && spawnFailureFields(startError)),
          ...(setupTerminal && {
            terminal: true,
          }),
          ...(setupFailureKind && {
            setup_failure_kind: setupFailureKind,
          }),
        },
    modelUsage: {},
    permission_denials: [],
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
  return [assistantMessage, resultMessage];
}
//@ chunk-asf5gh8x.js:76642-76841 placement
/**
 * 启动器钩子文件名模式、受支持的钩子事件集合与仓库不存在输出上限。
 */
var LAUNCHER_HOOK_FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}\.(py|sh)$/;
var LAUNCHER_HOOK_EVENTS = new Set([
  "Stop",
  "SubagentStop",
  "UserPromptSubmit",
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "Notification",
]);
var MAX_REPO_NOT_FOUND_OUTPUT_BYTES = 131072;
export {
  createPrepTimer,
  isEpochMismatchError,
  isRestrictedSession,
  isNotFoundOrInactive,
  decodeSessionJwt,
  getJwtExpiry,
  writeSystemPromptFile,
  APPEND_SUBAGENT_SYSTEM_PROMPT,
  postSessionFailureResult,
  REPO_NOT_FOUND_REASON,
  stripSystemPromptFileArgs,
  getSessionIdFromJwt,
  CCR_SHR_START_MARKS,
  describeSpawnFailure,
  checkOwnFolder,
  parseStartFolderLine,
  LAUNCHER_HOOK_EVENTS,
  LAUNCHER_HOOK_FILENAME_PATTERN,
  MAX_REPO_NOT_FOUND_OUTPUT_BYTES,
  SYSTEM_PROMPT_FILE_WRITE_TIMEOUT_MS,
  isPoolSpawnJwt,
  getSpawnSessionIdFromJwt,
  notAvailableInThisBuild,
  isNotFoundError,
};
