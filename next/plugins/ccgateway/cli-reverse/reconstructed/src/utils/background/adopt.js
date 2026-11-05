/**
 * utils/background/adopt.ts
 *
 * 2.1.316 新增（门面模块 serializeAdoptable）。后台会话接管（路径、cron、代理文件校验）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-73r4a0j7.js (85), chunk-aydmtcax.js (3)
 * attribution: placement 88
 */
import { isAbsolute, relative, join, sep, dirname, basename } from "path";
import {
  lstat,
  readlink,
  realpath,
  open,
  unlink,
  readFile,
  link,
  stat,
  mkdir,
  copyFile,
  symlink,
  readdir,
  rmdir,
  rm,
} from "fs/promises";
import { constants } from "fs";
import { createHash, randomBytes } from "crypto";
import { isSafeIdSegment_2, normalizeUuidOrNull, identityAgentId2 } from "../agentId.js";
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  isNetworkMountPath,
  networkMountRootCached,
  normalizeMountPath,
  isNonWslUncPath,
  isNetworkMountRoot,
} from "../networkPaths.js";
import {
  create_2,
  INVALID_default,
  create,
  create_3,
  create_12,
  create_26,
  create_6,
  create_25,
  create_15,
} from "../../../vendor/zod/lib/index.mjs";
import { ZodIssueCode } from "../../../vendor/zod/v3/ZodError.js";
import { nativeRealpathLong, isWindowsDevicePath, toUncLongPath } from "../windowsUncPaths.js";
import { isDeviceNamespacePath, hasDotSegment } from "../pathClassification.js";
import { hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import {
  findIntermediateUncJunction,
  NodeFsOperations,
  UNVERIFIED_ANCESTRY,
  hasUntouchableRecordSpelling,
} from "../fsOperations.js";
import { sanitizePath } from "../sessionStoragePortable.js";
import {
  getOriginalCwd,
  getSessionCronTasks,
  getLoopWakeFires,
  removeSessionCronTasks,
  mainAgentId,
  addSessionCronTask,
  setScheduledTasksEnabled,
  recordLoopWakeFire,
} from "../../bootstrap/state.js";
import { projectTempDirName, projectTempDirNames } from "../tempDir.js";
import { getClaudeTempDirRealpath, sessionTempDirRealpath } from "../tempDirRealpaths.js";
import { sanitizeMetadataText } from "../agentMetadata.js";
import { safeIdentifierOrUndefined } from "../safeIdentifier.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { WORKFLOW_RUN_ID_PATTERN } from "../../tools/WorkflowTool/constants.js";
import {
  getProjectsDir,
  getAgentTranscriptPath,
  flushSessionStorage,
  getSessionSubagentsDir,
  getProjectKeyIfRepresentable,
} from "../sessionStorage.js";
import {
  MAX_UNATTENDED_REPLY_COUNT,
  getAutoReactSlugs,
  getBootingAutoReactSlugs,
  stopArtifactSupervisors,
} from "../../services/artifactComments/autoReplyNotices.js";
import { pinWriteTarget, openNoFollow } from "../fsSafety/pathRevalidation.js";
import { getPlatform } from "../platform.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { captureProcessStartTimeAsync } from "../processIdentity.js";
import { readProcessStartTicks, killIfSameProcess } from "../../daemon/deadProbe.js";
import { subagentWorkflowDir } from "../../services/workflow/snapshots.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { isAdoptEnabled, summarizeBackgroundWork } from "../../tasks/backgroundTaskLabels.js";
import {
  isAutoReactArmedMonitorTask,
  isMonitorWsTask,
  stopMonitorWsTasks,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import {
  getLiveState,
  REFUSED_CAPACITY_HINT,
  REFUSED_CAPACITY_WINDOW,
} from "../../services/liveReplica/liveReplica.js";
import { forgetCommentMonitorIntents } from "../../services/artifacts/commentMonitor.js";
import { userAbortReason } from "../abortController.js";
import { pauseWorkflowTask } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { STORAGE_SPACES, isValidKeySegment } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { getJobDir } from "../../services/daemon/jobState.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  sanitizedErrCodeForTelemetry,
} from "../errors.js";
import { writeFileAtomic, retryFsOp } from "../atomicPublishWrite.js";
import { sleep } from "../sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { TRANSIENT_FS_ERRORS } from "../plugins/safeCopy.js";
import { getMcpAuthCache } from "../plugins/safeFileRead.js";
import { countWhere } from "../collections.js";
import { pendingWritesTracker } from "../shutdown/pendingWrites.js";
import { DEFAULT_OPEN_BUFFER_BYTES } from "../fsSafety/hardenedRead.js";
import {
  forkedSkillSidecarPaths,
  readScopingFromFiles,
  writeForkedSkillMarker,
} from "../../skills/forkedSkillMarkers.js";
import { logError } from "../log.js";
import {
  INVISIBLE_CHAR_CLASSES,
  foldLookalikeChars,
  escapeXml_2 as escapeXml,
  unescapeHtmlEntities,
} from "../confusables.js";
import { normalizeNfkc } from "../sanitization.js";
import { countCodePoints } from "../stringUtils.js";
import { safeParseJSON } from "../json.js";
import { formatTaskNotification } from "../xmlTags.js";
import { emitTaskNotification } from "../task/taskNotifications.js";
import { evictTerminalTask } from "../task/framework.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { singleLineText } from "../printableName.js";
import { isValidPluginName } from "../cronTasks.js";
import { isKairosCronEnabled } from "../../tools/ScheduleCronTool/prompt.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { isWorkflowTask } from "../../tasks/taskKinds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aydmtcax.js:336-448 placement
function isValidSessionIdForAdopt(sessionId) {
  if (!isSafeIdSegment_2(sessionId)) return false;
  if (normalizeUuidOrNull(sessionId)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9_]*$/.test(sessionId) && decodeTaggedUuid(sessionId) !== undefined;
}
//@ chunk-aydmtcax.js:448-507 placement
/**
 * 判断恢复会话时是否沿用转录里的会话 id。
 */
function isValidAdoptedSessionId(sessionId, options = {}) {
  return options.acceptCustomIds ? isSafeIdSegment_2(sessionId) : isValidSessionIdForAdopt(sessionId);
}
//@ chunk-aydmtcax.js:507-920 placement
/**
 * 恢复会话时决定是否沿用转录里的会话 id：显式 fork 或无 id 时不沿用；通过接管闸门时沿用，否则记录遥测并以新会话 id 作为 fork 继续。
 */
function resolveResumeSessionAdoption(sessionId, explicitFork, options = {}) {
  if (explicitFork)
    return {
      adoptedSessionId: null,
      effectiveFork: true,
    };
  if (sessionId === undefined)
    return {
      adoptedSessionId: null,
      effectiveFork: false,
    };
  if (isValidAdoptedSessionId(sessionId, options))
    return {
      adoptedSessionId: sessionId,
      effectiveFork: false,
    };
  logForDebugging(
    `resume: transcript session id (${typeof sessionId}) rejected by the adoption gate; continuing as a fork under the fresh session id`,
  );
  logFeatureSad("session_resume", "unadoptable_session_id");
  return {
    adoptedSessionId: null,
    effectiveFork: true,
  };
}
//@ chunk-73r4a0j7.js:2741-2825 placement
/**
 * 等待接管落地的轮询间隔（250 毫秒）。
 */
var STALE_THRESHOLD_MS = 120000;
var CLOCK_SKEW_ALLOWANCE_MS = 60000;
var TAKEOVER_ADOPT_WAIT_MS = 4000;
var ADOPT_POLL_MS = 250;
var ADOPT_ID_PATTERN = /^[\w-]+$/;
var ADOPT_ID_MAX_CHARS = 256;
var WORKFLOW_RUN_ID_MAX_CHARS = 128;
var MAX_MCP_AUTH_CACHE_BYTES = 16777216;
//@ chunk-73r4a0j7.js:2825-4396 placement
function validateAdoptPath(adoptShellRoots) {
  let allowedRoots = () => [...adoptShellRoots(), ...[]];
  let automountRootOf = (path) => {
    let mountRoot = isNetworkMountPath(path) ? networkMountRootCached(path) : null;
    return mountRoot === null ? null : normalizeMountPath(mountRoot);
  };
  return create_2().transform((rawPath, ctx) => {
    let reject = (message) => {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message,
      });
      return INVALID_default;
    };
    let roots;
    let resolveRoots = () => {
      if (roots === undefined) {
        let rawRoots = allowedRoots();
        let filtered = rawRoots.map(nativeRealpathLong).filter((resolved) => resolved !== null);
        roots = {
          allowed: filtered,
          anchor: [...rawRoots, ...filtered],
        };
      }
      return roots;
    };
    if (isWindowsDevicePath(rawPath)) return reject(`adopt path is remote UNC: ${rawPath}`);
    let uncLongPath = toUncLongPath(rawPath);
    if (
      isDeviceNamespacePath(uncLongPath) ||
      hasWin32DevicePrefixSpelling(uncLongPath) ||
      (uncLongPath !== rawPath && /[. ](?:[\\/]|$)/.test(uncLongPath))
    )
      return reject(
        `adopt path is a Windows device-namespace spelling (\\\\?\\, \\\\.\\ or \\??\\) other than a plain \\\\?\\<drive>:\\ path: ${rawPath}`,
      );
    rawPath = uncLongPath;
    if (!isAbsolute(rawPath) || hasDotSegment(rawPath))
      return reject(`adopt path is not an absolute, dot-free spelling: ${rawPath}`);
    let pathMountRoot = automountRootOf(rawPath);
    let matchingAnchors =
      pathMountRoot !== null && pathMountRoot.startsWith("/net/")
        ? resolveRoots().anchor.filter((anchor) => automountRootOf(anchor) === pathMountRoot)
        : [];
    if (pathMountRoot !== null && matchingAnchors.length === 0)
      return reject(
        pathMountRoot.startsWith("/net/")
          ? `adopt path is on an automount host (or map) none of the allowed roots live on: ${rawPath}`
          : `adopt path is under the macOS /Network/Servers automount directory, refused regardless of the allowed roots: ${rawPath}`,
      );
    let intermediateUncJunction = findIntermediateUncJunction(
      NodeFsOperations,
      rawPath,
      matchingAnchors.length > 0
        ? {
            anchors: matchingAnchors,
            unreadableAncestry: "unverified",
            surfaceNetworkRaw: true,
          }
        : undefined,
    );
    if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
      return reject(
        `adopt path runs through a directory that could not be examined or a symlink chain too long to follow: ${rawPath}`,
      );
    if (intermediateUncJunction !== undefined)
      return reject(`adopt path traverses symlink/junction to remote UNC: ${intermediateUncJunction}`);
    let resolvedPath = nativeRealpathLong(rawPath);
    if (resolvedPath === null) return reject(`adopt path unresolvable: ${rawPath}`);
    let allowed = resolveRoots().allowed;
    if (allowed.length === 0) return reject("adopt path roots unresolvable");
    if (
      !allowed.some((root) => {
        let relToRoot = relative(root, resolvedPath);
        return relToRoot === "" || (!relToRoot.startsWith("..") && !isAbsolute(relToRoot));
      })
    )
      return reject(`adopt path outside allowed roots: ${resolvedPath}`);
    return resolvedPath;
  });
}
//@ chunk-73r4a0j7.js:4396-4564 placement
/**
 * 接管 shell 条目时允许的额外输出根目录。
 */
function adoptShellRoots() {
  let cwd = sanitizePath(getOriginalCwd());
  let currentDirName = projectTempDirName(cwd);
  return projectTempDirNames(cwd).flatMap((candidateDirName) => {
    let candidatePath = join(getClaudeTempDirRealpath(), candidateDirName);
    if (candidateDirName !== currentDirName)
      try {
        if (!NodeFsOperations.lstatSync(candidatePath).isDirectory()) return [];
      } catch {
        return [];
      }
    return [candidatePath + sep];
  });
}
//@ chunk-73r4a0j7.js:4564-4610 placement
/**
 * 接管用 id 的 schema（字符集与长度受限）。
 */
function adoptIdSchema() {
  return create_2().max(ADOPT_ID_MAX_CHARS).regex(ADOPT_ID_PATTERN);
}
//@ chunk-73r4a0j7.js:4610-4975 placement
/**
 * 被接管的后台 shell 条目的 schema：任务 id、pid、启动时间、命令与描述等。
 */
function adoptShellEntrySchema(adoptShellRoots) {
  return create({
    taskId: adoptIdSchema(),
    pid: create_3().int().positive(),
    procStart: create_2().optional(),
    startTimeTicks: create_3().int().optional(),
    command: create_2().transform((command) => sanitizeMetadataText(command) ?? ""),
    description: create_2().transform((description) => sanitizeMetadataText(description) ?? ""),
    outputPath: validateAdoptPath(adoptShellRoots),
    lastReportedTotalLines: create_3().int(),
    toolUseId: create_12().transform(safeIdentifierOrUndefined).optional(),
    kind: create_26(["bash", "monitor"]).optional(),
    agentId: adoptIdSchema().optional(),
  });
}
//@ chunk-73r4a0j7.js:4975-6074 placement
/**
 * 接管的定时任务提示词长度上限（10 万字符）。
 */
var ADOPT_CRON_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_ADOPTED_CRON_PROMPT_CHARS;
var adoptedCronSchema;
var adoptedWorkflowsSchema;
var adoptedAgentsSchema;
var adoptedFrameLiveSchema;
deferInit("chunk-73r4a0j7.js:4975", () => {
  ADOPT_CRON_SCHEMA = DoctorLazy(() => adoptShellEntrySchema(adoptShellRoots));
  MAX_ADOPTED_CRON_PROMPT_CHARS = 1e5;
  adoptedCronSchema = DoctorLazy(() =>
    create({
      id: create_2().max(ADOPT_ID_MAX_CHARS),
      cron: create_2(),
      prompt: create_2(),
      createdAt: create_3(),
      recurring: create_6().optional(),
      agentId: create_2().max(ADOPT_ID_MAX_CHARS).optional(),
      plugin: create_12().optional(),
      kind: create_25("loop").optional(),
      scheduledFor: create_3().optional(),
      reason: create_2()
        .transform((reason) => sanitizeMetadataText(reason))
        .optional(),
      keepalive: create_25(true).optional(),
    }),
  );
  adoptedWorkflowsSchema = DoctorLazy(() =>
    create({
      taskId: adoptIdSchema(),
      workflowRunId: create_2().max(WORKFLOW_RUN_ID_MAX_CHARS).regex(WORKFLOW_RUN_ID_PATTERN),
      scriptPath: create_2(),
      scriptSha256: create_2()
        .regex(/^[0-9a-f]{64}$/)
        .optional(),
      argsJson: create_2().optional(),
      description: create_2().transform((description) => sanitizeMetadataText(description) ?? ""),
      startTime: create_3().optional(),
      withholdScriptFromSdkEvents: create_6().optional(),
      transcriptDir: validateAdoptPath(() => [getProjectsDir()]),
    }),
  );
  adoptedAgentsSchema = DoctorLazy(() =>
    create({
      agentId: adoptIdSchema(),
      agentType: create_2().optional(),
      description: create_2()
        .transform((description) => sanitizeMetadataText(description))
        .optional(),
      toolUseId: create_12().transform(safeIdentifierOrUndefined).optional(),
      spawnDepth: create_3().int().optional(),
      startTime: create_3().optional(),
      transcriptPath: validateAdoptPath(() => [getProjectsDir()]).optional(),
      parentAgentId: adoptIdSchema().optional(),
      forkedSkillName: create_2().min(1).max(256).optional(),
    }),
  );
  adoptedFrameLiveSchema = DoctorLazy(() =>
    create({
      slug: create_2().uuid(),
      title: create_2().min(1).max(256).optional(),
      writtenAtMs: create_3().finite().optional(),
      unattendedReplies: create_3().int().min(0).max(MAX_UNATTENDED_REPLY_COUNT).optional(),
    }),
  );
});
//@ chunk-73r4a0j7.js:6074-6405 placement
/**
 * 接管文件的 schema：写入时间、来源、shell 列表、定时任务、循环唤醒次数与子代理等。
 */
function adoptFileSchema(shellSchema = ADOPT_CRON_SCHEMA()) {
  return create({
    writtenAtMs: create_3(),
    origin: create_26(["background", "exit"]).optional(),
    shells: create_15(shellSchema),
    cron: create_15(adoptedCronSchema()),
    loopWakeFires: create_3().int().nonnegative().optional(),
    agents: create_15(adoptedAgentsSchema()).optional(),
    workflows: create_15(adoptedWorkflowsSchema()).optional(),
    frameLive: create_15(adoptedFrameLiveSchema()).optional(),
    prefill: create({
      text: create_2(),
      boundaryUuid: create_2().max(ADOPT_ID_MAX_CHARS).optional(),
    }).optional(),
  });
}
//@ chunk-73r4a0j7.js:6405-6424 placement
/**
 * 接管文件的 schema。
 */
var adoptFileSchemaLazy; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-73r4a0j7.js:6405", () => {
  adoptFileSchemaLazy = DoctorLazy(() => adoptFileSchema());
});
//@ chunk-73r4a0j7.js:6424-6502 placement
/**
 * 带额外输出根目录的接管文件 schema。
 */
function adoptFileSchemaWithRoots(outputRoots) {
  let extraRoots = Array.isArray(outputRoots) ? outputRoots : [outputRoots];
  return adoptFileSchema(adoptShellEntrySchema(() => [...adoptShellRoots(), ...extraRoots]));
}
//@ chunk-73r4a0j7.js:6502-6518 placement
/**
 * 接管文件的大小上限（64 MiB）。
 */
var MAX_ADOPT_FILE_BYTES = 67108864;
//@ chunk-73r4a0j7.js:6518-9155 placement
async function detachAndSerializeShell(shellTask, options) {
  let pid = await shellTask.shellCommand?.detach?.();
  if (pid === undefined) return null;
  let path = shellTask.shellCommand.taskOutput.path;
  let rerootOutputsTo = options?.rerootOutputsTo;
  if (rerootOutputsTo !== undefined) {
    let dropShell = async (reason) => {
      logForDebugging(`[adopt] dropping shell ${shellTask.id} from the handoff (${reason})`, {
        level: "error",
      });
      try {
        await shellTask.shellCommand?.kill?.();
      } catch {}
      return null;
    };
    let gatePassed = false;
    try {
      if (isNonWslUncPath(path) || isNetworkMountRoot(path)) throw Error("network-spelled output path");
      let intermediateUncJunction = findIntermediateUncJunction(NodeFsOperations, path);
      if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
        throw Error("output path has a symlink chain too long to vet");
      if (intermediateUncJunction !== undefined)
        throw Error("output path traverses a junction to remote UNC");
      if ((await lstat(path)).isSymbolicLink()) {
        let linkTarget = await readlink(path);
        if (isNonWslUncPath(linkTarget) || isNetworkMountRoot(linkTarget))
          throw Error("network-spelled symlink target");
        let absoluteTarget = isAbsolute(linkTarget) ? linkTarget : join(dirname(path), linkTarget);
        if (isNonWslUncPath(absoluteTarget) || isNetworkMountRoot(absoluteTarget))
          throw Error("network-spelled symlink hop");
        let intermediateUncJunction = findIntermediateUncJunction(NodeFsOperations, absoluteTarget);
        if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
          throw Error("symlink target has a symlink chain too long to vet");
        if (intermediateUncJunction !== undefined)
          throw Error("symlink target traverses a junction to remote UNC");
        if ((await lstat(absoluteTarget)).isSymbolicLink()) throw Error("multi-hop symlink chain");
      }
      let resolvedPath = await realpath(path);
      let gateStats = await lstat(resolvedPath);
      gatePassed = true;
      let rerootReal = await realpath(rerootOutputsTo).catch(() => rerootOutputsTo);
      if (!resolvedPath.startsWith(rerootReal + sep)) {
        if (
          !(
            await Promise.all(
              [getClaudeTempDirRealpath(), ...[]].map((allowedDir) => realpath(allowedDir).catch(() => null)),
            )
          )
            .filter((allowedReal) => allowedReal !== null)
            .some((allowedPrefix) => resolvedPath.startsWith(allowedPrefix + sep))
        )
          return await dropShell("its output resolves outside the task-output tree");
        let rerootPath = join(rerootOutputsTo, "rerooted", `${shellTask.id}.output`);
        let writeTarget;
        try {
          writeTarget = await pinWriteTarget(rerootPath, [rerootPath], {
            createParents: true,
            leaf: "replace",
          });
        } catch {
          return await dropShell("reroot directory not trustworthy");
        }
        let ioPath = writeTarget.ioPath;
        try {
          if (!gateStats.isFile()) return await dropShell("gate target is not a regular file");
          if (gateStats.nlink !== 1) return await dropShell("gate target has another name");
          let sourceHandle = await open(
            resolvedPath,
            getPlatform() === "windows"
              ? "r"
              : constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | NOFOLLOW_NONBLOCK_FLAGS,
          );
          try {
            let stats = await sourceHandle.stat();
            if (
              !stats.isFile() ||
              stats.nlink !== 1 ||
              stats.dev !== gateStats.dev ||
              stats.ino !== gateStats.ino
            )
              return await dropShell("handle identity mismatch");
            {
              await writeTarget.recheckBeforeWrite();
              await unlink(ioPath).catch(() => {});
              if (stats.size > MAX_ADOPT_FILE_BYTES) return await dropShell("over-cap escaping output");
              let destHandle;
              try {
                await writeTarget.recheckBeforeWrite();
                destHandle =
                  getPlatform() === "windows"
                    ? await open(ioPath, "wx")
                    : await openNoFollow(
                        ioPath,
                        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
                        getPlatform(),
                      );
              } catch {
                return await dropShell("reroot destination not creatable");
              }
              try {
                let copiedBytes = 0;
                let buffer = Buffer.allocUnsafe(65536);
                while (copiedBytes < MAX_ADOPT_FILE_BYTES) {
                  let { bytesRead } = await sourceHandle.read(
                    buffer,
                    0,
                    Math.min(buffer.length, MAX_ADOPT_FILE_BYTES - copiedBytes),
                    copiedBytes,
                  );
                  if (bytesRead === 0) break;
                  let writtenOffset = 0;
                  while (writtenOffset < bytesRead) {
                    let { bytesWritten } = await destHandle.write(
                      buffer,
                      writtenOffset,
                      bytesRead - writtenOffset,
                    );
                    writtenOffset += bytesWritten;
                  }
                  copiedBytes += bytesRead;
                }
              } finally {
                await destHandle.close();
              }
              path = rerootPath;
            }
          } finally {
            await sourceHandle.close();
          }
        } finally {
          await writeTarget.close();
        }
      }
    } catch {
      if (gatePassed) return await dropShell("reroot failed after the gate");
    }
  }
  return {
    taskId: shellTask.id,
    pid,
    procStart: await captureProcessStartTimeAsync(pid),
    startTimeTicks: (await readProcessStartTicks(pid)) ?? undefined,
    command: shellTask.command,
    description: shellTask.description,
    outputPath: path,
    lastReportedTotalLines: shellTask.lastReportedTotalLines,
    toolUseId: shellTask.toolUseId,
    kind: shellTask.kind,
    agentId: shellTask.agentId,
  };
}
//@ chunk-73r4a0j7.js:9155-9483 placement
async function serializeAdoptAgent(agentTask, options = {}) {
  let transcriptPath =
    options.derivedTranscriptPath ?? getAgentTranscriptPath(identityAgentId2(agentTask.agentId));
  return {
    agentId: agentTask.agentId,
    agentType: agentTask.agentType,
    description: agentTask.description,
    toolUseId: agentTask.toolUseId,
    spawnDepth: agentTask.spawnDepth,
    startTime: agentTask.startTime,
    transcriptPath: await realpath(transcriptPath).catch(() => {
      return;
    }),
    parentAgentId: agentTask.parentAgentId,
    forkedSkillName: agentTask.forkedSkillName,
  };
}
//@ chunk-73r4a0j7.js:9483-9893 placement
async function serializeAdoptWorkflow(workflowTask, options = {}) {
  let transcriptDir = options.derivedTranscriptDir ?? subagentWorkflowDir(workflowTask.workflowRunId);
  return {
    taskId: workflowTask.id,
    workflowRunId: workflowTask.workflowRunId,
    scriptPath: workflowTask.scriptPath,
    scriptSha256: workflowTask.script
      ? createHash("sha256").update(workflowTask.script).digest("hex")
      : undefined,
    argsJson: workflowTask.args !== undefined ? jsonStringify(workflowTask.args) : undefined,
    description: workflowTask.description,
    startTime: workflowTask.startTime,
    withholdScriptFromSdkEvents: workflowTask.withholdScriptFromSdkEvents,
    transcriptDir: await realpath(transcriptDir).catch(() => transcriptDir),
  };
}
//@ chunk-73r4a0j7.js:9893-9951 placement
function isCarriedFrameLiveWatch(task) {
  return isAdoptEnabled() && isAutoReactArmedMonitorTask(task) && task.frameLive !== undefined;
}
//@ chunk-73r4a0j7.js:9951-10150 placement
function carriedFrameLiveSlugs(tasks) {
  let slugs = new Set();
  if (!isAdoptEnabled()) return slugs;
  for (let task of Object.values(tasks))
    if (isCarriedFrameLiveWatch(task) && task.frameLive !== undefined) slugs.add(task.frameLive.slug);
  for (let slug of getAutoReactSlugs()) slugs.add(slug);
  for (let slug of getBootingAutoReactSlugs()) slugs.add(slug);
  return slugs;
}
//@ chunk-73r4a0j7.js:10150-10477 placement
function collectFrameLiveConsent(tasks) {
  let { supervisors, bootingWiredArms } = getLiveState().live;
  let bootingAutoReactSlugs = getBootingAutoReactSlugs();
  let consent = [];
  let writtenAtMs = Date.now();
  for (let slug of carriedFrameLiveSlugs(tasks)) {
    let supervisor = supervisors.get(slug);
    let bootingArm = bootingAutoReactSlugs.has(slug) ? bootingWiredArms.get(slug) : undefined;
    if (supervisor === undefined && bootingArm === undefined) continue;
    let title = bootingArm?.title ?? supervisor?.autoReactWiring?.title;
    let hasTitle = title !== undefined && title.length >= 1 && title.length <= 256;
    consent.push({
      slug,
      writtenAtMs,
      ...(hasTitle && {
        title,
      }),
    });
  }
  return consent;
}
//@ chunk-73r4a0j7.js:10477-13280 placement
async function serializeAdoptable(tasks, options) {
  let adoptability = computeAdoptability(tasks);
  let filtered = Object.values(tasks).filter((task) => isAdoptableShellTask(task, adoptability));
  let filtered_2 = Object.values(tasks).filter((task) => isAdoptableAgentTask(task, adoptability));
  let filtered_3 = Object.values(tasks).filter((task) => isAdoptableWorkflowTask(task, adoptability));
  let filtered_4 = getSessionCronTasks().filter((task) => isAdoptableCron(task, adoptability));
  if (
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    filtered_4.length === 0 &&
    collectFrameLiveConsent(tasks).length === 0
  )
    return null;
  let filtered_5 = (
    await Promise.all(
      filtered.map((task) =>
        detachAndSerializeShell(task, {
          rerootOutputsTo: sessionTempDirRealpath(),
        }),
      ),
    )
  ).filter((shell) => shell !== null);
  let results = await Promise.all(filtered_2.map((task) => serializeAdoptAgent(task)));
  let results_2 = await Promise.all(filtered_3.map((task) => serializeAdoptWorkflow(task)));
  let frameLiveConsent = collectFrameLiveConsent(tasks);
  let consentSlugs = new Set(frameLiveConsent.map((entry) => entry.slug));
  let mapped = Object.values(tasks)
    .filter(
      (task) =>
        isCarriedFrameLiveWatch(task) &&
        task.frameLive !== undefined &&
        consentSlugs.has(task.frameLive.slug),
    )
    .map((task) => task.id);
  if (
    filtered_5.length === 0 &&
    results.length === 0 &&
    results_2.length === 0 &&
    filtered_4.length === 0 &&
    frameLiveConsent.length === 0
  )
    return null;
  let abandoned = false;
  let watchesStopped = false;
  let stopCarriedWatches = (taskStore) => {
    if (watchesStopped) return;
    watchesStopped = true;
    forgetCommentMonitorIntents(consentSlugs);
    stopArtifactSupervisors(consentSlugs);
    let idsToStop = new Set(mapped);
    if (consentSlugs.size > 0) {
      for (let task of Object.values(taskStore.all()))
        if (
          isMonitorWsTask(task) &&
          task.status === "running" &&
          task.frameLive !== undefined &&
          consentSlugs.has(task.frameLive.slug)
        )
          idsToStop.add(task.id);
    }
    for (let id of idsToStop)
      stopMonitorWsTasks(id, taskStore, {
        quiet: true,
      });
  };
  return {
    payload: {
      writtenAtMs: Date.now(),
      shells: filtered_5,
      cron: filtered_4.map((task) => ({
        id: task.id,
        cron: task.cron,
        prompt: task.prompt,
        createdAt: task.createdAt,
        recurring: task.recurring,
        agentId: task.agentId,
        plugin: task.plugin,
        kind: task.kind,
        scheduledFor: task.scheduledFor,
        reason: task.reason,
        keepalive: task.keepalive,
      })),
      ...(getLoopWakeFires() > 0 && {
        loopWakeFires: getLoopWakeFires(),
      }),
      agents: results,
      workflows: results_2,
      ...(frameLiveConsent.length > 0 && {
        frameLive: frameLiveConsent,
      }),
    },
    checkpointAgents: async (taskStore) => {
      for (let task of filtered_3) {
        task.abortController?.abort(userAbortReason("background"));
        pauseWorkflowTask(task.id, taskStore);
      }
      if (results.length === 0) return;
      for (let shell of filtered_5) if (shell.agentId !== undefined) taskStore.remove(shell.taskId);
      for (let task of filtered_2) task.abortController.abort(userAbortReason("background"));
      await yieldToEventLoop();
      await flushSessionStorage().catch((error) => {
        logFeatureSad("task_local_agent", "adopt_checkpoint_flush_failed");
        logForDebugging(`[adopt] checkpoint flush: ${error}`, {
          level: "warn",
        });
      });
    },
    stopCarriedWatches,
    disown: (taskStore) => {
      stopCarriedWatches(taskStore);
      for (let shell of filtered_5) taskStore.remove(shell.taskId);
      for (let agent of results) taskStore.remove(agent.agentId);
      for (let workflow of results_2) taskStore.remove(workflow.taskId);
      if (filtered_4.length > 0) removeSessionCronTasks(filtered_4.map((task) => task.id));
    },
    abandon: () => {
      if (abandoned) return;
      abandoned = true;
      for (let task of filtered)
        try {
          task.shellCommand?.kill();
        } catch (error) {
          logForDebugging(`[adopt] abandon ${task.id}: ${error}`, {
            level: "warn",
          });
        }
      for (let task of filtered_2) {
        let notice = `Background agent "${noticeDescriptionOf(task.description)}" was checkpointed for the background fork but the fork failed to spawn; the agent was not resumed.`;
        enqueueFailedTaskNotification(task.agentId, notice, options);
      }
      if (filtered_2.length > 0) logFeatureSad("task_local_agent", "adopt_spawn_failed");
      for (let task of filtered_3) {
        let resumeHint =
          task.withholdScriptFromSdkEvents === true
            ? ""
            : manualWorkflowResumeHint(
                {
                  workflowRunId: task.workflowRunId ?? "",
                  scriptPath: task.scriptPath,
                  argsJson: task.args !== undefined ? jsonStringify(task.args) : undefined,
                },
                "",
              );
        let notice = `Background workflow "${noticeDescriptionOf(task.description)}" was checkpointed for the background fork but the fork failed to spawn; it was not resumed.${resumeHint}`;
        enqueueFailedTaskNotification(task.id, notice, options);
      }
      if (filtered_3.length > 0) logFeatureSad("task_local_workflow", "adopt_spawn_failed");
      if (watchesStopped) {
        for (let taskId of mapped)
          enqueueFailedTaskNotification(
            taskId,
            "The background session didn't start, so automatic replies to Artifact comments stopped. Publish the Artifact again to turn them back on.",
            options,
          );
        if (frameLiveConsent.length > 0) logFeatureSad("artifact_live_subscribe", "adopt_spawn_failed");
      }
    },
  };
}
//@ chunk-73r4a0j7.js:13280-13738 placement
function dedupFrameLiveNewest(groups) {
  let bySlug = new Map();
  for (let group of groups)
    for (let entry of group.entries) {
      let entry_2 = {
        ...entry,
        writtenAtMs: entry.writtenAtMs ?? group.fallbackBasis,
      };
      let existing = bySlug.get(entry.slug);
      let min = Math.min(
        (existing?.unattendedReplies ?? 0) + (entry.unattendedReplies ?? 0),
        MAX_UNATTENDED_REPLY_COUNT,
      );
      let newest =
        existing === undefined || entry_2.writtenAtMs > (existing.writtenAtMs ?? 0) ? entry_2 : existing;
      bySlug.set(
        entry.slug,
        min > 0
          ? {
              ...newest,
              unattendedReplies: min,
            }
          : newest,
      );
    }
  if (bySlug.size > REFUSED_CAPACITY_HINT) logFeatureSad("artifact_live_subscribe", "merged_consent_capped");
  return [...bySlug.values()]
    .sort((left, right) => (right.writtenAtMs ?? 0) - (left.writtenAtMs ?? 0))
    .slice(0, REFUSED_CAPACITY_WINDOW);
}
//@ chunk-73r4a0j7.js:13738-14388 placement
/**
 * 合并两份 adopt.json：shells/cron/agents/workflows 按各自键去重（先旧后新），frameLive 取最新，其他字段以新值优先。
 */
function mergeAdoptFiles(current, incoming) {
  let mergeUnique = (currentItems, incomingItems, keyOf) =>
    [...currentItems, ...incomingItems].filter(
      (item, index, items) => items.findIndex((other) => keyOf(other) === keyOf(item)) === index,
    );
  return {
    writtenAtMs: incoming.writtenAtMs,
    origin: incoming.origin ?? current.origin,
    shells: mergeUnique(current.shells, incoming.shells, (shell) => shell.pid),
    cron: mergeUnique(current.cron, incoming.cron, (cronTask) => cronTask.id),
    ...((incoming.loopWakeFires ?? current.loopWakeFires) !== undefined && {
      loopWakeFires: incoming.loopWakeFires ?? current.loopWakeFires,
    }),
    agents: mergeUnique(current.agents ?? [], incoming.agents ?? [], (agent) => agent.agentId),
    workflows: mergeUnique(current.workflows ?? [], incoming.workflows ?? [], (workflow) => workflow.taskId),
    ...(((current.frameLive?.length ?? 0) > 0 || (incoming.frameLive?.length ?? 0) > 0) && {
      frameLive: dedupFrameLiveNewest([
        {
          entries: current.frameLive ?? [],
          fallbackBasis: current.writtenAtMs,
        },
        {
          entries: incoming.frameLive ?? [],
          fallbackBasis: incoming.writtenAtMs,
        },
      ]),
    }),
    prefill: incoming.prefill ?? current.prefill,
  };
}
//@ chunk-73r4a0j7.js:14388-14622 placement
async function readAdoptJsonFromStorage(storage, jobId) {
  let readResult = await storage.read([STORAGE_SPACES.job(jobId, ["adopt.json"])]);
  if (!readResult.ok) {
    logForDebugging(`[adopt] v5 merge read refused: ${formatStorageError(readResult.error)}`);
    return null;
  }
  let item = readResult.value.items[0];
  if (!item.found) return null;
  return Buffer.from(item.value).toString("utf8");
}
//@ chunk-73r4a0j7.js:14622-15441 placement
async function writeAdoptJson(jobDir, incoming, options = {}, storage) {
  let filePath = join(jobDir, "adopt.json");
  let jobId = basename(jobDir);
  let storageForJob =
    isStorageV5Enabled() && storage !== undefined && isValidKeySegment(jobId) && jobDir === getJobDir(jobId)
      ? storage
      : undefined;
  let payload = incoming;
  try {
    let existingText = storageForJob
      ? await readAdoptJsonFromStorage(storageForJob, jobId)
      : await readFile(filePath, "utf-8");
    if (existingText !== null && existingText.length <= 1e6) {
      let parseResult = (
        options.mergeShellOutputRoot !== undefined
          ? adoptFileSchemaWithRoots(options.mergeShellOutputRoot)
          : adoptFileSchemaLazy()
      ).safeParse(jsonParse(existingText));
      if (parseResult.success) {
        if (
          parseResult.data.shells.length +
            (parseResult.data.cron?.length ?? 0) +
            (parseResult.data.agents?.length ?? 0) +
            (parseResult.data.workflows?.length ?? 0) +
            (parseResult.data.frameLive?.length ?? 0) <=
          256
        )
          payload = mergeAdoptFiles(parseResult.data, incoming);
      }
    }
  } catch {}
  if (storageForJob) {
    let writeResult = await storageForJob.write(
      STORAGE_SPACES.job(jobId, ["adopt.json"]),
      jsonStringify(payload),
      {
        publishDiscipline: "atomic",
        mode: 438 & ~process.umask(),
        parent: options.parent ?? "mustExist",
      },
    );
    if (!writeResult.ok)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopt.json v5 write failed: ${formatStorageError(writeResult.error)}`,
          "adopt.json v5 write failed",
        ),
        "telemetryCode" in writeResult.error && writeResult.error.telemetryCode !== undefined
          ? {
              code: writeResult.error.telemetryCode,
            }
          : {},
      );
    return;
  }
  await writeFileAtomic(filePath, jsonStringify(payload));
}
//@ chunk-73r4a0j7.js:15441-17473 placement
async function readAndConsumeAdoptJson(bgJobDir, options = {}) {
  if (!bgJobDir) return null;
  let adoptPath = join(bgJobDir, "adopt.json");
  let claimedPath = `${adoptPath}.${process.pid}`;
  let deadline = Date.now() + (options.waitMs ?? 0);
  let wasBusy = false;
  for (;;)
    try {
      wasBusy = await retryFsOp(adoptPath, claimedPath);
      break;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") {
        if (Date.now() < deadline) {
          await sleep(ADOPT_POLL_MS);
          continue;
        }
        logEvent("tengu_adopt_claim", {
          result: lit("enoent"),
        });
        return null;
      }
      logForDebugging(`[adopt] rename failed: ${error}`, {
        level: "warn",
      });
      logEvent("tengu_adopt_claim", {
        result:
          errnoCode !== undefined && TRANSIENT_FS_ERRORS.has(errnoCode)
            ? lit("ebusy_gave_up")
            : sanitizedErrCodeForTelemetry(error),
      });
      return null;
    }
  let now = Date.now();
  let result = wasBusy ? lit("ebusy_retry") : lit("ok");
  try {
    let mcpAuthCache = await getMcpAuthCache(claimedPath, MAX_MCP_AUTH_CACHE_BYTES);
    if (mcpAuthCache.kind !== "ok") {
      logForDebugging(`[adopt] carrier not read: ${mcpAuthCache.kind}`, {
        level: "warn",
      });
      logEvent("tengu_adopt_claim", {
        result: lit("not_read"),
      });
      return null;
    }
    let content = mcpAuthCache.content;
    let parseResult = (
      options.extraShellOutputRoot !== undefined
        ? adoptFileSchemaWithRoots(options.extraShellOutputRoot)
        : adoptFileSchemaLazy()
    ).safeParse(JSON.parse(content));
    if (!parseResult.success) {
      logForDebugging(`[adopt] schema rejected: ${parseResult.error.message}`, {
        level: "warn",
      });
      logEvent("tengu_adopt_claim", {
        result: lit("schema_rejected"),
      });
      return null;
    }
    let ageMs = now - parseResult.data.writtenAtMs;
    if (parseResult.data.origin !== "exit" && ageMs > STALE_THRESHOLD_MS) {
      logForDebugging(`[adopt] stale (age ${ageMs}ms)`, {
        level: "warn",
      });
      let frameLive = parseResult.data.frameLive ?? [];
      if (frameLive.length === 0) {
        logEvent("tengu_adopt_claim", {
          result: lit("stale"),
        });
        return null;
      }
      logEvent("tengu_adopt_claim", {
        result: lit("stale"),
        frame_live_stale: lit("true"),
      });
      logFeatureSad("artifact_live_subscribe", "carried_consent_stale_dropped");
      return {
        writtenAtMs: parseResult.data.writtenAtMs,
        ...(parseResult.data.origin !== undefined && {
          origin: parseResult.data.origin,
        }),
        shells: [],
        cron: [],
        frameLive: frameLive.map((entry) => ({
          ...entry,
          writtenAtMs: entry.writtenAtMs ?? parseResult.data.writtenAtMs,
          stale: true,
        })),
      };
    }
    if ((parseResult.data.frameLive?.length ?? 0) > 0) {
      let mapped = parseResult.data.frameLive.map((entry) => {
        let writtenAtMs = entry.writtenAtMs ?? parseResult.data.writtenAtMs;
        let ageMs = now - writtenAtMs;
        return ageMs >= -CLOCK_SKEW_ALLOWANCE_MS && ageMs <= STALE_THRESHOLD_MS
          ? {
              ...entry,
              writtenAtMs,
            }
          : {
              ...entry,
              writtenAtMs,
              stale: true,
            };
      });
      let staleCount = countWhere(mapped, (entry) => "stale" in entry);
      if (staleCount > 0)
        logForDebugging(`[adopt] ${staleCount}/${mapped.length} frameLive entries marked stale`, {
          level: "warn",
        });
      logEvent("tengu_adopt_claim", {
        result,
        ...(staleCount > 0 && {
          frame_live_stale: lit("true"),
        }),
      });
      return Object.assign(parseResult.data, {
        frameLive: mapped,
      });
    }
    logEvent("tengu_adopt_claim", {
      result,
    });
    return parseResult.data;
  } catch (error) {
    logForDebugging(`[adopt] read/parse failed: ${error}`, {
      level: "warn",
    });
    logEvent("tengu_adopt_claim", {
      result: lit("parse_failed"),
    });
    return null;
  } finally {
    await unlink(claimedPath).catch(() => {});
  }
}
//@ chunk-73r4a0j7.js:17473-17627 placement
function recordUnresumedAdopt(bgJobDir, registered, workflowIds, owner) {
  let tracker = pendingWritesTracker();
  if (registered.length === 0 && workflowIds.length === 0) {
    tracker.unresumedAdopt.delete(bgJobDir);
    return;
  }
  tracker.unresumedAdopt.set(bgJobDir, {
    agents: registered,
    workflows: workflowIds,
    owner,
  });
}
//@ chunk-73r4a0j7.js:17627-17732 placement
function takeUnresumedAdopt(jobDir, owner) {
  if (pendingWritesTracker().unresumedAdopt.get(jobDir)?.owner !== owner)
    return {
      agents: [],
      workflows: [],
    };
  return drainUnresumedAdopt(jobDir);
}
//@ chunk-73r4a0j7.js:17732-17870 placement
function drainUnresumedAdopt(jobDir) {
  let tracker = pendingWritesTracker();
  let entry = tracker.unresumedAdopt.get(jobDir);
  tracker.unresumedAdopt.delete(jobDir);
  return {
    agents: entry?.agents ?? [],
    workflows: entry?.workflows ?? [],
  };
}
//@ chunk-73r4a0j7.js:17870-18030 placement
function recordUnresumedFrameLive(bgJobDir, frameLive, owner) {
  let tracker = pendingWritesTracker();
  if (frameLive.length === 0) {
    tracker.unresumedFrameLive.delete(bgJobDir);
    return;
  }
  tracker.unresumedFrameLive.set(bgJobDir, {
    entries: frameLive.map(({ stale, ...entry }) => entry),
    owner,
  });
}
//@ chunk-73r4a0j7.js:18030-18117 placement
function takeUnresumedFrameLive(jobDir, owner) {
  if (pendingWritesTracker().unresumedFrameLive.get(jobDir)?.owner !== owner) return [];
  return drainUnresumedFrameLive(jobDir);
}
//@ chunk-73r4a0j7.js:18117-18228 placement
function drainUnresumedFrameLive(jobDir) {
  let tracker = pendingWritesTracker();
  let entry = tracker.unresumedFrameLive.get(jobDir);
  tracker.unresumedFrameLive.delete(jobDir);
  return entry?.entries ?? [];
}
//@ chunk-73r4a0j7.js:18228-18391 placement
function reparkUnresumedFrameLive(jobDir, entries, owner) {
  let tracker = pendingWritesTracker();
  let existing = tracker.unresumedFrameLive.get(jobDir);
  if (entries.length === 0 || (existing !== undefined && existing.owner !== owner)) return;
  tracker.unresumedFrameLive.set(jobDir, {
    entries: [...entries],
    owner,
  });
}
//@ chunk-73r4a0j7.js:18391-18625 placement
function releaseReparkedFrameLive(jobDir, slug, owner) {
  let tracker = pendingWritesTracker();
  let entry = tracker.unresumedFrameLive.get(jobDir);
  if (entry === undefined || entry.owner !== owner) return;
  let filtered = entry.entries.filter((entry) => entry.slug !== slug);
  if (filtered.length > 0)
    tracker.unresumedFrameLive.set(jobDir, {
      entries: filtered,
      owner,
    });
  else tracker.unresumedFrameLive.delete(jobDir);
}
//@ chunk-73r4a0j7.js:18625-18696 placement
function recordExitRetryFrameLive(jobDir, frameLive) {
  if (frameLive.length > 0) pendingWritesTracker().exitRetryFrameLive.set(jobDir, [...frameLive]);
}
//@ chunk-73r4a0j7.js:18696-18821 placement
function takeExitRetryFrameLive(jobDir) {
  if (jobDir === undefined) return [];
  let tracker = pendingWritesTracker();
  let entries = tracker.exitRetryFrameLive.get(jobDir) ?? [];
  tracker.exitRetryFrameLive.delete(jobDir);
  return entries;
}
//@ chunk-73r4a0j7.js:18821-18927 placement
/**
 * 复制文件时使用的缓冲块大小（1 MiB）。
 */
var RELINK_FALLBACK_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COPY_CHUNK_BYTES;
var ADOPT_RELINK_MARK;
deferInit("chunk-73r4a0j7.js:18821", () => {
  RELINK_FALLBACK_ERRNOS = new Set(["EXDEV", "EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EMLINK"]);
  COPY_CHUNK_BYTES = 1048576;
  ADOPT_RELINK_MARK = ".adopt-relink.";
});
//@ chunk-73r4a0j7.js:18927-19013 placement (2.1.88 match: generatePlaceholders, 0.793)
function makeAdoptRelinkName(targetPath) {
  return `${targetPath}${ADOPT_RELINK_MARK}${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`;
}
//@ chunk-73r4a0j7.js:19013-19336 placement
/**
 * 尝试重链接子代理文件，按错误码决定是否回退为复制，并记录采用的方式。
 */
async function relinkOrCopyAgentFile(sourcePath, targetPath, sourceIdentity, linkFn) {
  let fallbackCode;
  try {
    await linkFn(sourcePath, targetPath);
    fallbackCode = "UNVERIFIED";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined || !RELINK_FALLBACK_ERRNOS.has(errnoCode)) throw error;
    fallbackCode = errnoCode;
  }
  if (fallbackCode === "UNVERIFIED") {
    let linkedStats = await lstat(targetPath);
    if (
      linkedStats.isFile() &&
      linkedStats.dev === sourceIdentity.dev &&
      linkedStats.ino === sourceIdentity.ino
    )
      return {
        method: "hardlink",
        identity: sourceIdentity,
      };
    await unlink(targetPath);
  }
  let identity = await copyAdoptedFile(sourcePath, targetPath, sourceIdentity);
  return {
    method: "copy",
    fallbackCode,
    identity,
  };
}
//@ chunk-73r4a0j7.js:19336-20194 placement
async function copyAdoptedFile(sourcePath, targetPath, sourceIdentity) {
  let sourceHandle = await open(sourcePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await sourceHandle.stat();
    if (!stats.isFile() || stats.dev !== sourceIdentity.dev || stats.ino !== sourceIdentity.ino)
      throw Object.assign(Error("adopted file copy source is not the validated inode"), {
        code: "ADOPT_IDENTITY_MISMATCH",
      });
    let targetHandle = await open(targetPath, "wx", DEFAULT_OPEN_BUFFER_BYTES);
    let completed = false;
    try {
      let buffer = Buffer.allocUnsafe(COPY_CHUNK_BYTES);
      for (;;) {
        let { bytesRead } = await sourceHandle.read(buffer, 0, buffer.length, null);
        if (bytesRead === 0) break;
        let writtenOffset = 0;
        while (writtenOffset < bytesRead) {
          let { bytesWritten } = await targetHandle.write(buffer, writtenOffset, bytesRead - writtenOffset);
          if (bytesWritten === 0)
            throw Object.assign(Error("adopted file copy made no progress"), {
              code: "ADOPT_COPY_STALLED",
            });
          writtenOffset += bytesWritten;
        }
      }
      let { dev, ino } = await targetHandle.stat();
      await targetHandle.utimes(stats.atime, stats.mtime).catch((error) => {
        logForDebugging(`[adopt] copied file keeps fresh timestamps (${getErrnoCode(error) ?? "error"})`, {
          level: "warn",
        });
      });
      await targetHandle.close();
      completed = true;
      return {
        dev,
        ino,
      };
    } finally {
      if (!completed) {
        await targetHandle.close().catch(() => {});
        await unlink(targetPath).catch(() => {});
      }
    }
  } finally {
    await sourceHandle.close().catch(() => {});
  }
}
//@ chunk-73r4a0j7.js:20194-20583 placement
/**
 * 把被接管的子代理文件放到目标位置，已存在的非符号链接文件不覆盖。
 */
async function placeAdoptedAgentFile(adoptRelinkName, targetPath, keepExisting) {
  let existing;
  try {
    existing = await lstat(targetPath);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  if (existing !== undefined && !existing.isSymbolicLink()) {
    if (!existing.isFile())
      throw Object.assign(Error("adopted agent name is held by a non-file entry"), {
        code: "ADOPT_NAME_NOT_FILE",
      });
    if (keepExisting) return "kept";
  }
  try {
    await retryFsOp(adoptRelinkName, targetPath);
  } catch (error) {
    if (existing === undefined || getErrnoCode(error) !== "EEXIST") throw error;
    await unlink(targetPath);
    await retryFsOp(adoptRelinkName, targetPath);
  }
  return existing === undefined ? "created" : "replaced";
}
//@ chunk-73r4a0j7.js:20583-20939 placement
/**
 * 接管子代理记录文件：已是普通文件则保留，否则重链接或复制。
 */
async function adoptAgentFile(targetPath, sourcePath, sourceIdentity, linkFn, keepExisting) {
  if (keepExisting) {
    let existing = await lstat(targetPath).catch(() => {
      return;
    });
    if (existing !== undefined && !existing.isSymbolicLink() && existing.isFile())
      return {
        method: "kept",
        created: null,
      };
  }
  let adoptRelinkName = makeAdoptRelinkName(targetPath);
  let relinkResult = await relinkOrCopyAgentFile(sourcePath, adoptRelinkName, sourceIdentity, linkFn);
  let placement = "kept";
  try {
    placement = await placeAdoptedAgentFile(adoptRelinkName, targetPath, keepExisting);
  } finally {
    await unlink(adoptRelinkName).catch(() => {});
  }
  let { identity, ...methodInfo } = relinkResult;
  return placement === "kept"
    ? {
        method: "kept",
        created: null,
      }
    : {
        ...methodInfo,
        created: placement === "created" ? identity : null,
      };
}
//@ chunk-73r4a0j7.js:20939-21262 placement
async function linkAdoptedAgentTranscript(agent, { storageV5, linkFn = link } = {}) {
  if (storageV5 === undefined) return checkAdoptedForkedSkill(agent);
  try {
    let result = await validateAdoptedAgentFiles(agent, linkFn);
    if (result.method !== undefined)
      logEvent("tengu_adopt_link", {
        kind: lit("agent"),
        method: fromEnum(result.method),
        fallback_code: sanitizedErrCodeForTelemetry({
          code: result.fallbackCode,
        }),
      });
    return result;
  } catch (error) {
    logEvent("tengu_adopt_link", {
      kind: lit("agent"),
      method: fromEnum("fail"),
      error_code: sanitizedErrCodeForTelemetry(error),
    });
    throw error;
  }
}
//@ chunk-73r4a0j7.js:21262-22785 placement
async function checkAdoptedForkedSkill(agent) {
  if (!agent.transcriptPath) return {};
  let agentTranscriptPath = getAgentTranscriptPath(identityAgentId2(agent.agentId));
  let metaPathOf = (transcriptPath) => transcriptPath.replace(/\.jsonl$/, ".meta.json");
  await stat(metaPathOf(agent.transcriptPath));
  let sidecarPair = null;
  let forkedSkillName;
  let parentSidecars = forkedSkillSidecarPaths(agent.transcriptPath);
  if (agent.forkedSkillName !== undefined) {
    let scopingFromFiles = await readScopingFromFiles(parentSidecars);
    if (scopingFromFiles.status !== "valid")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${agent.agentId} declares forked-skill ${agent.forkedSkillName} but its scoping record is unusable (${scopingFromFiles.status})`,
        "adopted forked-skill scoping record unusable",
      );
    if (scopingFromFiles.scoping.skillName !== agent.forkedSkillName)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${agent.agentId} declares forked-skill ${agent.forkedSkillName} but its scoping record names a different skill`,
        "adopted forked-skill scoping identity mismatch",
      );
    sidecarPair = {
      parent: parentSidecars,
      fork: forkedSkillSidecarPaths(agentTranscriptPath),
    };
  } else {
    let scopingFromFiles = await readScopingFromFiles(parentSidecars);
    switch (scopingFromFiles.status) {
      case "absent":
        break;
      case "valid":
        sidecarPair = {
          parent: parentSidecars,
          fork: forkedSkillSidecarPaths(agentTranscriptPath),
        };
        forkedSkillName = scopingFromFiles.scoping.skillName;
        break;
      case "malformed":
      case "absent-but-marked":
      case "diskless":
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${agent.agentId} has an unusable forked-skill scoping record (${scopingFromFiles.status})`,
          "adopted forked-skill scoping record unusable",
        );
    }
  }
  if (agentTranscriptPath === agent.transcriptPath)
    return {
      forkedSkillNameFromSidecar: forkedSkillName,
    };
  if (
    (await realpath(agentTranscriptPath).catch(() => {
      return;
    })) === agent.transcriptPath
  )
    return {
      forkedSkillNameFromSidecar: forkedSkillName,
    };
  await mkdir(dirname(agentTranscriptPath), {
    recursive: true,
  });
  if (sidecarPair) {
    await unlink(sidecarPair.fork.provenanceMarker).catch(() => {});
    await writeForkedSkillMarker(sidecarPair.fork.provenanceMarker, agent.forkedSkillName ?? forkedSkillName);
    await unlink(sidecarPair.fork.scoping).catch(() => {});
    await copyFile(sidecarPair.parent.scoping, sidecarPair.fork.scoping);
  }
  for (let [fromPath, toPath] of [
    [agentTranscriptPath, agent.transcriptPath],
    [metaPathOf(agentTranscriptPath), metaPathOf(agent.transcriptPath)],
  ]) {
    await unlink(fromPath).catch(() => {});
    await symlink(toPath, fromPath);
  }
  return {
    forkedSkillNameFromSidecar: forkedSkillName,
  };
}
//@ chunk-73r4a0j7.js:22785-22834 placement
/**
 * 给错误对象附加 code 字段。
 */
function withErrorCode(error, code) {
  return Object.assign(error, {
    code,
  });
}
//@ chunk-73r4a0j7.js:22834-25561 placement
async function validateAdoptedAgentFiles(agent, linkFn) {
  if (!agent.transcriptPath) return {};
  let targetPath = getAgentTranscriptPath(identityAgentId2(agent.agentId));
  let metaPathOf = (transcriptPath) => transcriptPath.replace(/\.jsonl$/, ".meta.json");
  if (basename(agent.transcriptPath) !== basename(targetPath))
    throw withErrorCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${agent.agentId} carrier names a transcript that is not agent-${agent.agentId}.jsonl`,
        "adopted agent transcript path has the wrong leaf name",
      ),
      "ADOPT_WRONG_LEAF",
    );
  let [transcriptStats, metaStats] = await Promise.all([
    lstat(agent.transcriptPath),
    lstat(metaPathOf(agent.transcriptPath)),
  ]);
  if (!transcriptStats.isFile() || !metaStats.isFile())
    throw withErrorCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${agent.agentId} parent transcript or .meta.json is not a regular file`,
        "adopted agent parent file is not a regular file",
      ),
      "ADOPT_PARENT_NOT_REGULAR",
    );
  let sidecarPair = null;
  let forkedSkillName;
  let parentSidecars = forkedSkillSidecarPaths(agent.transcriptPath);
  if (agent.forkedSkillName !== undefined) {
    let scopingFromFiles = await readScopingFromFiles(parentSidecars);
    if (scopingFromFiles.status !== "valid")
      throw withErrorCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${agent.agentId} declares forked-skill ${agent.forkedSkillName} but its scoping record is unusable (${scopingFromFiles.status})`,
          "adopted forked-skill scoping record unusable",
        ),
        "ADOPT_SCOPING_UNUSABLE",
      );
    if (scopingFromFiles.scoping.skillName !== agent.forkedSkillName)
      throw withErrorCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${agent.agentId} declares forked-skill ${agent.forkedSkillName} but its scoping record names a different skill`,
          "adopted forked-skill scoping identity mismatch",
        ),
        "ADOPT_SCOPING_MISMATCH",
      );
    sidecarPair = {
      parent: parentSidecars,
      fork: forkedSkillSidecarPaths(targetPath),
    };
  } else {
    let scopingFromFiles = await readScopingFromFiles(parentSidecars);
    switch (scopingFromFiles.status) {
      case "absent":
        break;
      case "valid":
        sidecarPair = {
          parent: parentSidecars,
          fork: forkedSkillSidecarPaths(targetPath),
        };
        forkedSkillName = scopingFromFiles.scoping.skillName;
        break;
      case "malformed":
      case "absent-but-marked":
      case "diskless":
        throw withErrorCode(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `adopted agent ${agent.agentId} has an unusable forked-skill scoping record (${scopingFromFiles.status})`,
            "adopted forked-skill scoping record unusable",
          ),
          "ADOPT_SCOPING_UNUSABLE",
        );
    }
  }
  if (targetPath === agent.transcriptPath)
    return {
      forkedSkillNameFromSidecar: forkedSkillName,
      method: "noop",
    };
  let realDir = await realpath(dirname(targetPath)).catch(() => {
    return;
  });
  if (realDir !== undefined && join(realDir, basename(targetPath)) === agent.transcriptPath)
    return {
      forkedSkillNameFromSidecar: forkedSkillName,
      method: "noop",
    };
  await mkdir(dirname(targetPath), {
    recursive: true,
  });
  if (sidecarPair) {
    await unlink(sidecarPair.fork.provenanceMarker).catch(() => {});
    await writeForkedSkillMarker(sidecarPair.fork.provenanceMarker, agent.forkedSkillName ?? forkedSkillName);
    await unlink(sidecarPair.fork.scoping).catch(() => {});
    await copyFile(sidecarPair.parent.scoping, sidecarPair.fork.scoping);
  }
  let existing = await lstat(targetPath).catch(() => {
    return;
  });
  let transcriptAlreadyAdopted =
    existing !== undefined &&
    (existing.isFile() ||
      (existing.isSymbolicLink() &&
        (await realpath(targetPath).catch(() => {
          return;
        })) === agent.transcriptPath));
  let metaResult = await adoptAgentFile(
    metaPathOf(targetPath),
    metaPathOf(agent.transcriptPath),
    metaStats,
    linkFn,
    transcriptAlreadyAdopted,
  );
  let transcriptResult;
  try {
    transcriptResult = await adoptAgentFile(targetPath, agent.transcriptPath, transcriptStats, linkFn, true);
  } catch (error) {
    if (metaResult.created !== null) {
      let created = metaResult.created;
      await lstat(metaPathOf(targetPath))
        .then(async (metaStat) => {
          if (metaStat.dev === created.dev && metaStat.ino === created.ino)
            await unlink(metaPathOf(targetPath));
        })
        .catch(() => {});
    }
    throw error;
  }
  let fallbackCode = transcriptResult.fallbackCode ?? metaResult.fallbackCode;
  if (fallbackCode !== undefined) {
    let joined = [
      ...(transcriptResult.method === "copy" ? ["transcript"] : []),
      ...(metaResult.method === "copy" ? ["meta"] : []),
    ].join("+");
    logForDebugging(
      `[adopt] agent ${agent.agentId}: hard link impossible (${fallbackCode}) \u2014 materialised a copy of ${joined}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("task_local_agent", "adopt_link_fallback_copy");
  }
  return {
    forkedSkillNameFromSidecar: forkedSkillName,
    method: transcriptResult.method,
    fallbackCode,
  };
}
//@ chunk-73r4a0j7.js:25561-25735 placement
var AGENT_FILE_NAME_RE; // deferred: uses RELINK_FALLBACK_ERRNOS of its import cycle while loading; runs once the cycle is complete
var RELINK_TEMP_NAME_RE;
var STALE_RELINK_TEMP_MS;
var MAX_ADOPTED_AGENT_LINKS;
deferInit("chunk-73r4a0j7.js:25561", () => {
  AGENT_FILE_NAME_RE = /^agent-[\w-]+\.(?:jsonl|meta\.json)$/;
  RELINK_TEMP_NAME_RE = new RegExp(
    "^agent-[\\w-]+\\.(?:jsonl|meta\\.json)" +
      ADOPT_RELINK_MARK.replace(/[.]/g, "\\.") +
      "\\d+\\.(\\d+)\\.[0-9a-f]{8}$",
  );
  STALE_RELINK_TEMP_MS = 900000;
  MAX_ADOPTED_AGENT_LINKS = 64;
});
//@ chunk-73r4a0j7.js:25735-25923 placement
function parseSubagentTranscriptPath(storeRoot, dir) {
  let relPath = relative(storeRoot, dir);
  if (relPath === "" || relPath.startsWith("..") || isAbsolute(relPath)) return null;
  let parts = relPath.split(sep);
  if (parts.length < 3 || parts[2] !== "subagents") return null;
  return {
    session: join(parts[0], parts[1]),
    depth: parts.length,
  };
}
//@ chunk-73r4a0j7.js:25923-26112 placement
async function relinkAdoptedAgentSymlinks({ storageV5, linkFn = link } = {}) {
  if (storageV5 === undefined) return;
  try {
    await relinkSweep(getSessionSubagentsDir(), linkFn);
  } catch (error) {
    if (getErrnoCode(error) !== undefined) {
      logForDebugging(`[adopt] relink sweep abandoned: ${error}`, {
        level: "warn",
      });
      return;
    }
    logError(error);
  }
}
//@ chunk-73r4a0j7.js:26112-28266 placement
async function relinkSweep(dir, linkFn) {
  let entries;
  try {
    entries = await readdir(dir, {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  let now = Date.now();
  let symlinkNames = [];
  for (let entry of entries) {
    let match = RELINK_TEMP_NAME_RE.exec(entry.name);
    if (match) {
      if (Math.abs(now - Number(match[1])) > STALE_RELINK_TEMP_MS)
        await unlink(join(dir, entry.name)).catch(() => {});
      continue;
    }
    if (entry.isSymbolicLink() && AGENT_FILE_NAME_RE.test(entry.name)) symlinkNames.push(entry.name);
  }
  if (symlinkNames.length === 0) return;
  let stemOf = (name) => name.replace(/\.(?:jsonl|meta\.json)$/, "");
  let groups = new Map();
  for (let name of symlinkNames) {
    let group = groups.get(stemOf(name)) ?? {};
    if (name.endsWith(".jsonl")) group.transcript = name;
    else group.meta = name;
    groups.set(stemOf(name), group);
  }
  let groupList = [...groups.entries()];
  let offset = groupList.length > 1 ? randomBytes(4).readUInt32BE() % groupList.length : 0;
  let ordered = [...groupList.slice(offset), ...groupList.slice(0, offset)];
  let [realStoreRoot, realSubagentsDir] = await Promise.all([
    realpath(getProjectsDir()).catch(() => null),
    realpath(dir).catch(() => null),
  ]);
  if (realStoreRoot === null || realSubagentsDir === null) return;
  let subagentTranscriptPath = parseSubagentTranscriptPath(realStoreRoot, realSubagentsDir);
  if (
    getProjectKeyIfRepresentable(dirname(dirname(dir))) === undefined ||
    subagentTranscriptPath === null ||
    subagentTranscriptPath.depth !== 3
  ) {
    logForDebugging(
      `[adopt] relink sweep: ${symlinkNames.length} symlinked name(s) left as is (session dir outside the transcript store)`,
      {
        level: "warn",
      },
    );
    return;
  }
  let session = subagentTranscriptPath.session;
  let linkedCount = 0;
  let copiedCount = 0;
  let skippedByCap = 0;
  let budgetUsed = 0;
  let leftAsIs = [];
  let countMethod = (method) => {
    if (method === "copy") copiedCount++;
    else linkedCount++;
  };
  let adopted = new Set();
  for (let [index, [stem, files]] of ordered.entries()) {
    let filtered = [files.transcript, files.meta].filter((fileName) => fileName !== undefined);
    if (budgetUsed + filtered.length > MAX_ADOPTED_AGENT_LINKS) {
      skippedByCap = ordered
        .slice(index)
        .reduce((acc, [, remaining]) => acc + Number(!!remaining.transcript) + Number(!!remaining.meta), 0);
      leftAsIs.push(`${skippedByCap} more (per-pass cap)`);
      break;
    }
    budgetUsed += filtered.length;
    try {
      let transcriptFileName = `${stem}.jsonl`;
      let transcriptGate =
        files.transcript !== undefined
          ? await checkAdoptedAgentLink(dir, transcriptFileName, realStoreRoot, session)
          : await checkAgentMetaFile(dir, transcriptFileName);
      if (typeof transcriptGate === "string") {
        for (let fileName of filtered)
          leftAsIs.push(
            `${fileName} (${fileName === files.meta && files.transcript !== undefined ? "transcript not convertible" : transcriptGate})`,
          );
        continue;
      }
      let metaGate;
      if (files.meta !== undefined) {
        let metaGate_2 =
          transcriptGate !== null && transcriptGate.gate.size === 0
            ? "meta beside an empty transcript"
            : await checkAdoptedAgentLink(dir, files.meta, realStoreRoot, session, {
                besideDir: transcriptGate === null ? undefined : dirname(transcriptGate.real),
              });
        if (typeof metaGate_2 === "string") {
          for (let fileName of filtered)
            leftAsIs.push(`${fileName} (${fileName === files.meta ? metaGate_2 : "meta not convertible"})`);
          continue;
        }
        metaGate = metaGate_2;
      }
      if (transcriptGate !== null) {
        countMethod(await adoptAgentFileMethod(transcriptGate, linkFn));
        adopted.add(transcriptFileName);
      }
      if (metaGate !== undefined && files.meta !== undefined) {
        countMethod(await adoptAgentFileMethod(metaGate, linkFn));
        adopted.add(files.meta);
      }
    } catch (error) {
      if (getErrnoCode(error) === undefined) logError(error);
      for (let fileName of filtered)
        if (!adopted.has(fileName)) leftAsIs.push(`${fileName} (${getErrnoCode(error) ?? "error"})`);
    }
  }
  if (copiedCount > 0) logFeatureSad("task_local_agent", "adopt_link_fallback_copy");
  logForDebugging(
    `[adopt] relink sweep: ${linkedCount} hard-linked, ${copiedCount} copied, ${leftAsIs.length - (skippedByCap > 0 ? 1 : 0) + skippedByCap} left as is${leftAsIs.length > 0 ? ` (${leftAsIs.slice(0, 5).join(", ")})` : ""}`,
    {
      level: leftAsIs.length > 0 || copiedCount > 0 ? "warn" : "debug",
    },
  );
  logEvent("tengu_adopt_relink", {
    linked: linkedCount,
    copied: copiedCount,
    left: leftAsIs.length - (skippedByCap > 0 ? 1 : 0) + skippedByCap,
  });
}
//@ chunk-73r4a0j7.js:28266-28338 placement
/**
 * agent 元数据文件的大小上限（64 KiB）。
 */
var MAX_META_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var agentMetaSchema;
var agentIdMetaSchema;
deferInit("chunk-73r4a0j7.js:28266", () => {
  MAX_META_BYTES = 65536;
  agentMetaSchema = DoctorLazy(() =>
    create({
      agentType: create_2(),
    }),
  );
  agentIdMetaSchema = DoctorLazy(() =>
    create({
      agentId: create_2(),
    }),
  );
});
//@ chunk-73r4a0j7.js:28338-29060 placement
async function readAgentMetaSafely(filePath, expectedIdentity, fileName) {
  let filePath_2 = await open(filePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await filePath_2.stat();
    if (stats.dev !== expectedIdentity.dev || stats.ino !== expectedIdentity.ino)
      return "target changed during the check";
    if (fileName.endsWith(".meta.json")) {
      if (stats.size > MAX_META_BYTES) return "meta too large";
      let jsonOrNull = parseJsonOrNull((await readJSONLFile(filePath_2)).toString("utf-8"));
      return agentMetaSchema().safeParse(jsonOrNull).success ? undefined : "not an agent meta";
    }
    if (stats.size === 0) return;
    let agentId = fileName.slice(6, -6);
    let jsonlFile = await readJSONLFile(filePath_2);
    let text = jsonlFile.toString("utf-8");
    if (jsonlFile.length >= MAX_META_BYTES && jsonlFile.indexOf(10) === -1)
      return hasTopLevelAgentId(text, agentId)
        ? undefined
        : "no record naming this agent in the first 64 KiB";
    for (let line of text.split(`
`)) {
      let jsonOrNull = parseJsonOrNull(line);
      if (jsonOrNull === null) continue;
      let parseResult = agentIdMetaSchema().safeParse(jsonOrNull);
      if (parseResult.success && parseResult.data.agentId === agentId) return;
    }
    return "no record naming this agent in the first 64 KiB";
  } finally {
    await filePath_2.close().catch(() => {});
  }
}
//@ chunk-73r4a0j7.js:29060-29111 placement
/**
 * 解析 JSON，失败返回 null。
 */
function parseJsonOrNull(text) {
  try {
    return jsonParse(text);
  } catch {
    return null;
  }
}
//@ chunk-73r4a0j7.js:29111-29259 placement (2.1.88 match: readJSONLFile, 1)
async function readJSONLFile(filePath) {
  let buf = Buffer.allocUnsafe(MAX_META_BYTES);
  let totalRead = 0;
  while (totalRead < MAX_META_BYTES) {
    let { bytesRead } = await filePath.read(buf, totalRead, MAX_META_BYTES - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-73r4a0j7.js:29259-29616 placement
/**
 * 判断 JSONL 行的顶层对象是否带指定 agentId 字段（逐字符扫描，忽略嵌套）。
 */
function hasTopLevelAgentId(text, agentId) {
  if (text[0] !== "{") return false;
  let needle = `"agentId":"${agentId}"`;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    let char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") {
      depth--;
      if (depth === 0) return false;
    } else if (char === '"') {
      if (
        depth === 1 &&
        text.startsWith(needle, index) &&
        (text[index - 1] === "{" || text[index - 1] === ",")
      )
        return true;
      inString = true;
    }
  }
  return false;
}
//@ chunk-73r4a0j7.js:29616-30279 placement
/**
 * 校验交接给后台会话的子代理转录符号链接：目标须为绝对路径、同名、普通文件、位于转录存储内且不属于本会话、身份未在检查期间变化，并检查对应元数据；返回不合格原因或 null。
 */
async function checkAdoptedAgentLink(dir, expectedName, storeRoot, session, { besideDir } = {}) {
  let linkPath = join(dir, expectedName);
  let targetPath = await readlink(linkPath);
  if (
    !isAbsolute(targetPath) ||
    basename(targetPath) !== expectedName ||
    hasUntouchableRecordSpelling(targetPath)
  )
    return "unexpected target spelling";
  let linkStats;
  try {
    linkStats = await lstat(targetPath);
  } catch (error) {
    return `target ${getErrnoCode(error) ?? "unreadable"}`;
  }
  if (!linkStats.isFile()) return linkStats.isSymbolicLink() ? "chained link" : "non-regular target";
  let realTarget = await realpath(targetPath);
  let subagentTranscriptPath = parseSubagentTranscriptPath(storeRoot, realTarget);
  if (
    subagentTranscriptPath === null ||
    subagentTranscriptPath.depth < 4 ||
    basename(realTarget) !== expectedName
  )
    return "outside the transcript store";
  if (subagentTranscriptPath.session === session) return "this session's own file";
  if (besideDir !== undefined && dirname(realTarget) !== besideDir) return "not beside its transcript";
  let targetStats = await lstat(realTarget);
  if (!targetStats.isFile() || targetStats.dev !== linkStats.dev || targetStats.ino !== linkStats.ino)
    return "target changed during the check";
  let agentMeta = await readAgentMetaSafely(realTarget, linkStats, expectedName);
  if (agentMeta !== undefined) return agentMeta;
  return {
    linkPath,
    real: realTarget,
    gate: linkStats,
  };
}
//@ chunk-73r4a0j7.js:30279-30502 placement
async function checkAgentMetaFile(dir, fileName) {
  let path = join(dir, fileName);
  let stats;
  try {
    stats = await lstat(path);
  } catch {
    return "meta without its transcript";
  }
  if (!stats.isFile() || stats.size === 0) return "meta without its transcript";
  let agentMeta = await readAgentMetaSafely(path, stats, fileName);
  return agentMeta === undefined ? null : `transcript ${agentMeta}`;
}
//@ chunk-73r4a0j7.js:30502-30580 placement
/**
 * 接管 agent 文件并返回实际采用的方式。
 */
async function adoptAgentFileMethod(gate, linkFn) {
  return (await adoptAgentFile(gate.linkPath, gate.real, gate.gate, linkFn, true)).method;
}
//@ chunk-73r4a0j7.js:30580-30643 placement
function killOrphanedAdoptedShell(shell) {
  return killIfSameProcess(shell.pid, shell.startTimeTicks, shell.procStart);
}
//@ chunk-73r4a0j7.js:30643-31017 placement
async function linkAdoptedWorkflowDir(workflow) {
  let targetDir = subagentWorkflowDir(workflow.workflowRunId);
  if (targetDir === workflow.transcriptDir) return;
  if (
    (await realpath(targetDir).catch(() => {
      return;
    })) === workflow.transcriptDir
  )
    return;
  await stat(join(workflow.transcriptDir, "journal.jsonl"));
  await mkdir(dirname(targetDir), {
    recursive: true,
  });
  try {
    await unlink(targetDir);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      try {
        await rmdir(targetDir);
      } catch (error) {
        if (getErrnoCode(error) === "ENOTEMPTY")
          await rm(targetDir, {
            recursive: true,
            force: true,
          });
      }
  }
  await symlink(workflow.transcriptDir, targetDir, undefined);
}
//@ chunk-73r4a0j7.js:31017-31251 placement
function emitAdoptWorkflowFailed(workflow, reason, messageQueue, argsJson = "") {
  let resumeHint =
    workflow.withholdScriptFromSdkEvents === true ? "" : manualWorkflowResumeHint(workflow, argsJson);
  let notice = `Background workflow "${noticeDescriptionOf(workflow.description)}" was checkpointed for the background fork but could not be resumed (${noticeFieldOf(reason, MAX_NOTICE_TEXT_CHARS, regExp_2) ?? UNREPEATED_REASON}).${resumeHint}`;
  enqueueFailedTaskNotification(workflow.taskId, notice, messageQueue);
}
//@ chunk-73r4a0j7.js:31251-32067 placement
/**
 * 提示文案里各字段的长度上限：ye 是内联 JSON 参数最多 16000 字符；yt 是脚本路径 4096；pe 是描述/原因 1000；$e/xe 是安全字符集，_t/oe/bt/vt 是据此拼出的正则，Tt 是组合符类。
 */
var NOTICE_FIELD_CHARS; // deferred: uses INVISIBLE_CHAR_CLASSES (../confusables.js) of its import cycle while loading; runs once the cycle is complete
var MAX_NOTICE_PATH_CHARS;
var MAX_NOTICE_TEXT_CHARS;
var NOTICE_SAFE_CHARS;
var NOTICE_SAFE_CHARS_WITH_CLOSE;
var regExp;
var regExp_2;
var regExp_3;
var COMBINING_MARK_CLASS;
var regExp_4;
deferInit("chunk-73r4a0j7.js:31251", () => {
  NOTICE_FIELD_CHARS = 16000;
  MAX_NOTICE_PATH_CHARS = 4096;
  MAX_NOTICE_TEXT_CHARS = 1000;
  NOTICE_SAFE_CHARS = "!#$%&(*+,\\-./:;<=>?@[\\\\\\]^_{|~\\u00b7\\u2013\\u2014\\u3001\\u3002";
  NOTICE_SAFE_CHARS_WITH_CLOSE = `${NOTICE_SAFE_CHARS})}`;
  regExp = new RegExp(
    `^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '${NOTICE_SAFE_CHARS_WITH_CLOSE}])*$`,
    "u",
  );
  regExp_2 = new RegExp(`^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '${NOTICE_SAFE_CHARS}])*$`, "u");
  regExp_3 = new RegExp(
    `^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '"${NOTICE_SAFE_CHARS_WITH_CLOSE}])*$`,
    "u",
  );
  COMBINING_MARK_CLASS =
    "\\u030b\\u030d-\\u030f\\u0312-\\u0315\\u0329\\u0334-\\u0338\\u0348\\u0350\\u0351\\u0354-\\u0358\\u0485\\u0486\\u059c-\\u059e\\u08f7-\\u08fd\\u1ab0-\\u1aff\\u1cd4\\u1ce2-\\u1ce8\\u1dce\\u1dfe\\u1dff\\u{10efa}\\u20d2\\u20d3\\u20d8-\\u20da\\u20e5\\u20e6\\u20ea\\u20eb\\u{10a39}\\u{16af0}-\\u{16af4}\\u{1bc9e}\\u{1d167}-\\u{1d169}";
  regExp_4 = new RegExp(
    `[${INVISIBLE_CHAR_CLASSES}\\u02b0-\\u02ff\\u0559\\u07f4\\u07f5\\ua700-\\ua721\\ua788-\\ua78c\\u144a\\ua4f8-\\ua4ff${COMBINING_MARK_CLASS}]|\\\\$`,
    "u",
  );
});
//@ chunk-73r4a0j7.js:32067-32198 placement
function noticeFieldOf(value, maxChars, regExp_2 = regExp) {
  if (!(
    foldLookalikeChars(value) === value &&
    normalizeNfkc(value) === value &&
    regExp_2.test(value) &&
    !regExp_4.test(value)
  ))
    return;
  let escaped = escapeXml(value);
  return escaped.length <= maxChars || countCodePoints(escaped) <= maxChars ? escaped : undefined;
}
//@ chunk-73r4a0j7.js:32198-32554 placement
/**
 * 生成手动恢复工作流的提示（脚本文件名与运行 id），字段不安全时给出替代说明。
 */
function manualWorkflowResumeHint(workflow, argsTail) {
  if (workflow.scriptPath === undefined) return "";
  let scriptPath = noticeFieldOf(workflow.scriptPath, MAX_NOTICE_PATH_CHARS, regExp_2);
  let runId = noticeFieldOf(workflow.workflowRunId, WORKFLOW_RUN_ID_MAX_CHARS);
  if (scriptPath === undefined || runId === undefined)
    return " Its script's file name or run id holds what this notice does not repeat, so no call to resume it is given.";
  return ` To resume manually: Workflow({scriptPath: ${jsonStringify(scriptPath)}, resumeFromRunId: ${jsonStringify(runId)}${formatWorkflowArgsTail(workflow.argsJson)}${argsTail}`;
}
//@ chunk-73r4a0j7.js:32554-32657 placement
var UNREPEATED_DESCRIPTION = "(a description this notice does not repeat)";
var UNREPEATED_REASON = "a reason this notice does not repeat";
var MAX_NOTICE_DESCRIPTION_CHARS = 1000;
//@ chunk-73r4a0j7.js:32657-32697 placement
function noticeDescriptionOf(description) {
  return noticeFieldOf(description, MAX_NOTICE_DESCRIPTION_CHARS, regExp_2) ?? UNREPEATED_DESCRIPTION;
}
//@ chunk-73r4a0j7.js:32697-32913 placement
var UNREPEATED_ARGS_NOTE =
  " The launch's args are not in this call: they are not JSON, are too long or too deeply nested for a notice, or hold characters a notice never repeats. Add them as args, or the run resumes without its input.";
//@ chunk-73r4a0j7.js:32913-33167 placement
function formatWorkflowArgsTail(argsJson) {
  if (argsJson === undefined) return "}).";
  if (argsJson.length > NOTICE_FIELD_CHARS) return `}).${UNREPEATED_ARGS_NOTE}`;
  let parsedArgs = safeParseJSON(argsJson, false);
  if (parsedArgs === null) return argsJson.trim() === "null" ? "})." : `}).${UNREPEATED_ARGS_NOTE}`;
  try {
    let jsonLiteral = noticeFieldOf(jsonStringify(jsonStringify(parsedArgs)), NOTICE_FIELD_CHARS, regExp_3);
    return jsonLiteral === undefined ? `}).${UNREPEATED_ARGS_NOTE}` : `, args: JSON.parse(${jsonLiteral})}).`;
  } catch {
    return `}).${UNREPEATED_ARGS_NOTE}`;
  }
}
//@ chunk-73r4a0j7.js:33167-33382 placement
function enqueueFailedTaskNotification(
  taskId,
  summary,
  messageQueue,
  agentId = mainAgentId(),
  status = "failed",
) {
  messageQueue.enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      status,
      summary,
    }),
    agentId,
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    taskId,
  });
  emitTaskNotification(taskId, status, {
    summary: unescapeHtmlEntities(summary),
  });
}
//@ chunk-73r4a0j7.js:33382-33551 placement
function resolveAdoptedScriptPath(scriptPath) {
  let parseResult = validateAdoptPath(() => [getProjectsDir()]).safeParse(scriptPath);
  if (!parseResult.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      parseResult.error.issues[0]?.message ?? "scriptPath rejected",
      "adopt scriptPath rejected",
    );
  return parseResult.data;
}
//@ chunk-73r4a0j7.js:33551-33650 placement
function mcpSettledForAdopt(state) {
  return (
    state.mcp.clientsInitialized === true && !state.mcp.clients.some((client) => client.type === "pending")
  );
}
//@ chunk-73r4a0j7.js:33650-33771 placement
function classifyAdoptLinkFailure(agent) {
  let hasParent = agent.parentAgentId !== undefined;
  let hasForkedSkill = agent.forkedSkillName !== undefined;
  return {
    emit: hasParent || hasForkedSkill,
    excludeFromReconcile: !hasParent && hasForkedSkill,
  };
}
//@ chunk-73r4a0j7.js:33771-33967 placement
function emitAdoptAgentFailed(agent, reason, taskStore, messageQueue) {
  let notice = `Background agent "${noticeDescriptionOf(agent.description ?? agent.agentId)}" was checkpointed for the background fork but could not be resumed (${noticeFieldOf(reason, MAX_NOTICE_TEXT_CHARS, regExp_2) ?? UNREPEATED_REASON}).`;
  enqueueFailedTaskNotification(agent.agentId, notice, messageQueue, notificationAgentFor(agent, taskStore));
}
//@ chunk-73r4a0j7.js:33967-34234 placement
function emitAdoptAgentDenied(agent, deniedByPlugin, taskRegistry, messageQueue) {
  evictTerminalTask(agent.agentId, taskRegistry);
  enqueueFailedTaskNotification(
    agent.agentId,
    `Background agent "${noticeDescriptionOf(agent.description ?? agent.agentId)}" was checkpointed for the background fork and was not resumed (${noticeFieldOf(deniedByPlugin, MAX_NOTICE_TEXT_CHARS, regExp_2) ?? UNREPEATED_REASON}). Sending it a message with ${SENDMESSAGE} asks to resume it again.`,
    messageQueue,
    notificationAgentFor(agent, taskRegistry),
    "stopped",
  );
}
//@ chunk-73r4a0j7.js:34234-34336 placement
function notificationAgentFor(agent, taskStore) {
  return agent.parentAgentId !== undefined && isLocalAgent(taskStore.get(agent.parentAgentId))
    ? identityAgentId2(agent.parentAgentId)
    : mainAgentId();
}
//@ chunk-73r4a0j7.js:34336-34940 placement
function adoptCron(cronTasks, loopWakeFires) {
  let lastFiredAt = Date.now();
  let existingIds = new Set(getSessionCronTasks().map((task) => task.id));
  let addedCount = 0;
  for (let task of cronTasks) {
    if (task.prompt.length > MAX_ADOPTED_CRON_PROMPT_CHARS) {
      logFeatureSad("task_local_agent", "adopt_cron_prompt_too_long");
      logForDebugging(
        `[adopt] cron ${singleLineText(task.id, 64)} skipped: prompt is ${task.prompt.length} characters, over the ${MAX_ADOPTED_CRON_PROMPT_CHARS} limit`,
        {
          level: "warn",
        },
      );
      continue;
    }
    let { plugin, ...rest } = task;
    if (plugin !== undefined && !isValidPluginName(plugin)) {
      logForDebugging(
        `[adopt] cron ${singleLineText(task.id, 64)} skipped: its plugin name fails the rule for a stored name`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (!existingIds.has(task.id)) {
      addSessionCronTask({
        ...rest,
        ...(plugin !== undefined && {
          plugin,
        }),
        ...(task.recurring && {
          lastFiredAt,
        }),
      });
      existingIds.add(task.id);
      addedCount++;
    }
  }
  if (addedCount > 0) {
    if (isKairosCronEnabled()) setScheduledTasksEnabled(true);
  }
  for (let i = 0; i < (loopWakeFires ?? 0); i++) recordLoopWakeFire();
}
//@ chunk-73r4a0j7.js:34940-35884 placement
function computeAdoptability(tasks) {
  let adoptability = new Map();
  if (!isAdoptEnabled()) return adoptability;
  let parentKeyOf = (task) =>
    isLocalAgent(task) ? task.parentAgentId : "agentId" in task ? task.agentId : undefined;
  let childrenByParent = new Map();
  for (let task of Object.values(tasks)) {
    if ((task.status !== "running" && task.status !== "pending") || (isLocalAgent(task) && task.forkWorker))
      continue;
    let parentKey = parentKeyOf(task);
    if (parentKey !== undefined) {
      let children = childrenByParent.get(parentKey) ?? [];
      children.push(task);
      childrenByParent.set(parentKey, children);
    }
  }
  let isAdoptable = (task) => {
    if (isLocalAgent(task))
      return (
        task.agentType !== "main-session" &&
        task.status === "running" &&
        task.isBackgrounded &&
        task.abortController !== undefined
      );
    if (isLocalShellTask(task))
      return (
        task.kind !== "monitor" &&
        task.status === "running" &&
        task.isBackgrounded &&
        task.shellCommand !== null &&
        task.shellCommand.detach !== undefined
      );
    if (isWorkflowTask(task))
      return (
        task.status === "running" &&
        task.v2Run === undefined &&
        task.scriptPath !== undefined &&
        task.workflowRunId !== undefined &&
        task.abortController !== undefined
      );
    return false;
  };
  let walk = (task, ids) => {
    ids.push(task.id);
    let adoptable = isAdoptable(task);
    for (let child of childrenByParent.get(task.id) ?? []) adoptable = walk(child, ids) && adoptable;
    return adoptable;
  };
  for (let task of Object.values(tasks)) {
    if (
      !(isLocalAgent(task)
        ? task.parentAgentId === undefined
        : isLocalShellTask(task)
          ? task.agentId === undefined
          : isWorkflowTask(task))
    )
      continue;
    let ids = [];
    let adoptable = walk(task, ids);
    for (let id of ids) adoptability.set(id, adoptable);
  }
  return adoptability;
}
//@ chunk-73r4a0j7.js:35884-35934 placement
function isAdoptableShellTask(task, adoptability) {
  return isLocalShellTask(task) && (adoptability.get(task.id) ?? false);
}
//@ chunk-73r4a0j7.js:35934-36011 placement
function isAdoptableCron(task, adoptability) {
  return isAdoptEnabled() && (task.agentId === undefined || (adoptability.get(task.agentId) ?? false));
}
//@ chunk-73r4a0j7.js:36011-36061 placement
function isAdoptableAgentTask(task, adoptability) {
  return isLocalAgent(task) && (adoptability.get(task.id) ?? false);
}
//@ chunk-73r4a0j7.js:36061-36112 placement
function isAdoptableWorkflowTask(task, adoptability) {
  return isWorkflowTask(task) && (adoptability.get(task.id) ?? false);
}
//@ chunk-73r4a0j7.js:36112-36153 placement
function isAdoptableTask(task, adoptability) {
  return adoptability.get(task.id) ?? false;
}
//@ chunk-73r4a0j7.js:36153-36261 placement
function countAdoptable(tasks, adoptability = computeAdoptability(tasks)) {
  let frameLiveSlugs = carriedFrameLiveSlugs(tasks);
  return (
    countWhere(Object.values(tasks), (task) => isAdoptableTask(task, adoptability)) +
    countWhere(getSessionCronTasks(), (task) => isAdoptableCron(task, adoptability)) +
    frameLiveSlugs.size
  );
}
//@ chunk-73r4a0j7.js:36261-36314 placement
function countAbandonable(tasks, adoptability = computeAdoptability(tasks)) {
  return summarizeBackgroundWork(tasks).count - countAdoptable(tasks, adoptability);
}
//@ chunk-73r4a0j7.js:36314-36773 placement
function countLiveWorkflowAgents(tasks, adoptability = computeAdoptability(tasks)) {
  let running = 0;
  let finished = 0;
  let rerun = 0;
  for (let task of Object.values(tasks)) {
    if (!isAdoptableWorkflowTask(task, adoptability)) continue;
    let firstErroredIndex = 1 / 0;
    for (let step of task.workflowProgress)
      if (step.type === "workflow_agent" && step.state === "error")
        firstErroredIndex = Math.min(firstErroredIndex, step.index);
    for (let step of task.workflowProgress) {
      if (step.type !== "workflow_agent") continue;
      if (step.state === "done") {
        if (step.index > firstErroredIndex) rerun++;
        else finished++;
      } else if (
        step.state === "progress" ||
        (step.state === "start" && !(step.queuedAt !== undefined && step.startedAt === undefined))
      )
        running++;
    }
  }
  return {
    running,
    finished,
    rerun,
  };
}
//@ chunk-73r4a0j7.js:36773-36851 placement
function leftArrowNeedsInterstitial(tasks, adoptability = computeAdoptability(tasks)) {
  return (
    countAbandonable(tasks, adoptability) > 0 ||
    carriedFrameLiveSlugs(tasks).size > 0 ||
    countLiveWorkflowAgents(tasks, adoptability).running > 0
  );
}
//@ chunk-73r4a0j7.js:36851-36923 placement
function countCarriedSince(tasks, carriedAtPress) {
  let carriedCount = 0;
  for (let slug of carriedFrameLiveSlugs(tasks)) if (!carriedAtPress.has(slug)) carriedCount++;
  return carriedCount;
}
//@ chunk-73r4a0j7.js:36923-37034 placement
function carriesTasks(payload) {
  return (
    payload.shells.length > 0 ||
    (payload.agents?.length ?? 0) > 0 ||
    (payload.workflows?.length ?? 0) > 0 ||
    payload.cron.length > 0
  );
}
//@ chunk-73r4a0j7.js:37034-37245 placement
function adoptedCounts(payload) {
  return {
    adopted_shells: payload?.shells.length ?? 0,
    adopted_agents: payload?.agents?.length ?? 0,
    adopted_workflows: payload?.workflows?.length ?? 0,
    adopted_cron: payload?.cron.length ?? 0,
    adopted_frame_live: payload?.frameLive?.length ?? 0,
  };
}
export {
  resolveResumeSessionAdoption,
  isValidAdoptedSessionId,
  isValidSessionIdForAdopt,
  drainUnresumedFrameLive,
  computeAdoptability,
  isAdoptableWorkflowTask,
  isAdoptableAgentTask,
  drainUnresumedAdopt,
  dedupFrameLiveNewest,
  collectFrameLiveConsent,
  takeExitRetryFrameLive,
  isAdoptableShellTask,
  isCarriedFrameLiveWatch,
  serializeAdoptAgent,
  detachAndSerializeShell,
  serializeAdoptWorkflow,
  writeAdoptJson,
  recordExitRetryFrameLive,
  serializeAdoptable,
  carriesTasks,
  adoptedCounts,
  countLiveWorkflowAgents,
  isAdoptableTask,
  isAdoptableCron,
  carriedFrameLiveSlugs,
  countAdoptable,
  STALE_THRESHOLD_MS,
  countAbandonable,
  countCarriedSince,
  leftArrowNeedsInterstitial,
  linkAdoptedAgentTranscript,
  classifyAdoptLinkFailure,
  emitAdoptAgentFailed,
  emitAdoptWorkflowFailed,
  readAndConsumeAdoptJson,
  TAKEOVER_ADOPT_WAIT_MS,
  recordUnresumedFrameLive,
  killOrphanedAdoptedShell,
  adoptCron,
  resolveAdoptedScriptPath,
  linkAdoptedWorkflowDir,
  recordUnresumedAdopt,
  mcpSettledForAdopt,
  takeUnresumedAdopt,
  emitAdoptAgentDenied,
  takeUnresumedFrameLive,
  reparkUnresumedFrameLive,
  releaseReparkedFrameLive,
  relinkAdoptedAgentSymlinks,
  ADOPT_ID_PATTERN,
  ADOPT_ID_MAX_CHARS,
  noticeDescriptionOf,
  noticeFieldOf,
  WORKFLOW_RUN_ID_MAX_CHARS,
  CLOCK_SKEW_ALLOWANCE_MS,
};
