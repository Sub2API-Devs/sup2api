/**
 * utils/background/adopt.ts
 *
 * 2.1.316 新增（门面模块 serializeAdoptable）。后台会话接管（路径、cron、代理文件校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1dp9p908.js (3), chunk-jbv0t0w5.js (85)
 * attribution: placement 88
 */
import { isAbsolute, relative, join, dirname, sep, basename } from "path";
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
import { sessionTempDirRealpath, getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
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
import { logForDebugging } from "../debug.js";
import { pinWriteTarget, openNoFollow } from "../fsSafety/pathRevalidation.js";
import { getPlatform } from "../platform.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { captureProcessStartTimeAsync } from "../processIdentity.js";
import { readProcessStartTicks, killIfSameProcess } from "../../daemon/deadProbe.js";
import { identityAgentId2, isSafeIdSegment_2, normalizeUuidOrNull } from "../agentId.js";
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
import {
  getSessionCronTasks,
  getLoopWakeFires,
  removeSessionCronTasks,
  mainAgentId,
  addSessionCronTask,
  setScheduledTasksEnabled,
  recordLoopWakeFire,
} from "../../bootstrap/state.js";
import { forgetCommentMonitorIntents } from "../../services/artifacts/commentMonitor.js";
import { userAbortReason } from "../abortController.js";
import { pauseWorkflowTask } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
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
import { count } from "../collections.js";
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
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";

//@ chunk-jbv0t0w5.js:2594-2678 placement
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
//@ chunk-jbv0t0w5.js:2678-4249 placement
function validateAdoptPath(e) {
  let n = () => [...e(), ...[]];
  let o = (r) => {
    let s = isNetworkMountPath(r) ? networkMountRootCached(r) : null;
    return s === null ? null : normalizeMountPath(s);
  };
  return create_2().transform((r, s) => {
    let d = (message) => {
      s.addIssue({
        code: ZodIssueCode.custom,
        message,
      });
      return INVALID_default;
    };
    let i;
    let u = () => {
      if (i === undefined) {
        let S = n();
        let filtered = S.map(nativeRealpathLong).filter((A) => A !== null);
        i = {
          allowed: filtered,
          anchor: [...S, ...filtered],
        };
      }
      return i;
    };
    if (isWindowsDevicePath(r)) return d(`adopt path is remote UNC: ${r}`);
    let uncLongPath = toUncLongPath(r);
    if (
      isDeviceNamespacePath(uncLongPath) ||
      hasWin32DevicePrefixSpelling(uncLongPath) ||
      (uncLongPath !== r && /[. ](?:[\\/]|$)/.test(uncLongPath))
    )
      return d(
        `adopt path is a Windows device-namespace spelling (\\\\?\\, \\\\.\\ or \\??\\) other than a plain \\\\?\\<drive>:\\ path: ${r}`,
      );
    r = uncLongPath;
    if (!isAbsolute(r) || hasDotSegment(r))
      return d(`adopt path is not an absolute, dot-free spelling: ${r}`);
    let w = o(r);
    let h = w !== null && w.startsWith("/net/") ? u().anchor.filter((S) => o(S) === w) : [];
    if (w !== null && h.length === 0)
      return d(
        w.startsWith("/net/")
          ? `adopt path is on an automount host (or map) none of the allowed roots live on: ${r}`
          : `adopt path is under the macOS /Network/Servers automount directory, refused regardless of the allowed roots: ${r}`,
      );
    let intermediateUncJunction = findIntermediateUncJunction(
      NodeFsOperations,
      r,
      h.length > 0
        ? {
            anchors: h,
            unreadableAncestry: "unverified",
            surfaceNetworkRaw: true,
          }
        : undefined,
    );
    if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
      return d(
        `adopt path runs through a directory that could not be examined or a symlink chain too long to follow: ${r}`,
      );
    if (intermediateUncJunction !== undefined)
      return d(`adopt path traverses symlink/junction to remote UNC: ${intermediateUncJunction}`);
    let T = nativeRealpathLong(r);
    if (T === null) return d(`adopt path unresolvable: ${r}`);
    let allowed = u().allowed;
    if (allowed.length === 0) return d("adopt path roots unresolvable");
    if (
      !allowed.some((S) => {
        let m = relative(S, T);
        return m === "" || (!m.startsWith("..") && !isAbsolute(m));
      })
    )
      return d(`adopt path outside allowed roots: ${T}`);
    return T;
  });
}
//@ chunk-jbv0t0w5.js:4249-4276 placement
/**
 * 接管 shell 条目时允许的额外输出根目录。
 */
function adoptShellRoots() {
  return [sessionTempDirRealpath()];
}
//@ chunk-jbv0t0w5.js:4276-4322 placement
/**
 * 接管用 id 的 schema（字符集与长度受限）。
 */
function adoptIdSchema() {
  return create_2().max(ADOPT_ID_MAX_CHARS).regex(ADOPT_ID_PATTERN);
}
//@ chunk-jbv0t0w5.js:4322-4687 placement
/**
 * 被接管的后台 shell 条目的 schema：任务 id、pid、启动时间、命令与描述等。
 */
function adoptShellEntrySchema(adoptShellRoots) {
  return create({
    taskId: adoptIdSchema(),
    pid: create_3().int().positive(),
    procStart: create_2().optional(),
    startTimeTicks: create_3().int().optional(),
    command: create_2().transform((n) => sanitizeMetadataText(n) ?? ""),
    description: create_2().transform((n) => sanitizeMetadataText(n) ?? ""),
    outputPath: validateAdoptPath(adoptShellRoots),
    lastReportedTotalLines: create_3().int(),
    toolUseId: create_12().transform(safeIdentifierOrUndefined).optional(),
    kind: create_26(["bash", "monitor"]).optional(),
    agentId: adoptIdSchema().optional(),
  });
}
//@ chunk-jbv0t0w5.js:4687-5786 placement
/**
 * 接管的定时任务提示词长度上限（10 万字符）。
 */
var ADOPT_CRON_SCHEMA = DoctorLazy(() => adoptShellEntrySchema(adoptShellRoots));
var MAX_ADOPTED_CRON_PROMPT_CHARS = 1e5;
var adoptedCronSchema = DoctorLazy(() =>
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
      .transform((e) => sanitizeMetadataText(e))
      .optional(),
    keepalive: create_25(true).optional(),
  }),
);
var adoptedWorkflowsSchema = DoctorLazy(() =>
  create({
    taskId: adoptIdSchema(),
    workflowRunId: create_2().max(WORKFLOW_RUN_ID_MAX_CHARS).regex(WORKFLOW_RUN_ID_PATTERN),
    scriptPath: create_2(),
    scriptSha256: create_2()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
    argsJson: create_2().optional(),
    description: create_2().transform((e) => sanitizeMetadataText(e) ?? ""),
    startTime: create_3().optional(),
    withholdScriptFromSdkEvents: create_6().optional(),
    transcriptDir: validateAdoptPath(() => [getProjectsDir()]),
  }),
);
var adoptedAgentsSchema = DoctorLazy(() =>
  create({
    agentId: adoptIdSchema(),
    agentType: create_2().optional(),
    description: create_2()
      .transform((e) => sanitizeMetadataText(e))
      .optional(),
    toolUseId: create_12().transform(safeIdentifierOrUndefined).optional(),
    spawnDepth: create_3().int().optional(),
    startTime: create_3().optional(),
    transcriptPath: validateAdoptPath(() => [getProjectsDir()]).optional(),
    parentAgentId: adoptIdSchema().optional(),
    forkedSkillName: create_2().min(1).max(256).optional(),
  }),
);
var adoptedFrameLiveSchema = DoctorLazy(() =>
  create({
    slug: create_2().uuid(),
    title: create_2().min(1).max(256).optional(),
    writtenAtMs: create_3().finite().optional(),
    unattendedReplies: create_3().int().min(0).max(MAX_UNATTENDED_REPLY_COUNT).optional(),
  }),
);
//@ chunk-jbv0t0w5.js:5786-6117 placement
/**
 * 接管文件的 schema：写入时间、来源、shell 列表、定时任务、循环唤醒次数与子代理等。
 */
function adoptFileSchema(e = ADOPT_CRON_SCHEMA()) {
  return create({
    writtenAtMs: create_3(),
    origin: create_26(["background", "exit"]).optional(),
    shells: create_15(e),
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
//@ chunk-jbv0t0w5.js:6117-6136 placement
/**
 * 接管文件的 schema。
 */
var adoptFileSchemaLazy = DoctorLazy(() => adoptFileSchema());
//@ chunk-jbv0t0w5.js:6136-6211 placement
/**
 * 带额外输出根目录的接管文件 schema。
 */
function adoptFileSchemaWithRoots(e) {
  let n = Array.isArray(e) ? e : [e];
  return adoptFileSchema(adoptShellEntrySchema(() => [sessionTempDirRealpath(), ...n]));
}
//@ chunk-jbv0t0w5.js:6211-6227 placement
/**
 * 接管文件的大小上限（64 MiB）。
 */
var MAX_ADOPT_FILE_BYTES = 67108864;
//@ chunk-jbv0t0w5.js:6227-8864 placement
async function detachAndSerializeShell(e, n) {
  let o = await e.shellCommand?.detach?.();
  if (o === undefined) return null;
  let path = e.shellCommand.taskOutput.path;
  let rerootOutputsTo = n?.rerootOutputsTo;
  if (rerootOutputsTo !== undefined) {
    let d = async (u) => {
      logForDebugging(`[adopt] dropping shell ${e.id} from the handoff (${u})`, {
        level: "error",
      });
      try {
        await e.shellCommand?.kill?.();
      } catch {}
      return null;
    };
    let i = false;
    try {
      if (isNonWslUncPath(path) || isNetworkMountRoot(path)) throw Error("network-spelled output path");
      let intermediateUncJunction = findIntermediateUncJunction(NodeFsOperations, path);
      if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
        throw Error("output path has a symlink chain too long to vet");
      if (intermediateUncJunction !== undefined)
        throw Error("output path traverses a junction to remote UNC");
      if ((await lstat(path)).isSymbolicLink()) {
        let T = await readlink(path);
        if (isNonWslUncPath(T) || isNetworkMountRoot(T)) throw Error("network-spelled symlink target");
        let v = isAbsolute(T) ? T : join(dirname(path), T);
        if (isNonWslUncPath(v) || isNetworkMountRoot(v)) throw Error("network-spelled symlink hop");
        let intermediateUncJunction = findIntermediateUncJunction(NodeFsOperations, v);
        if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
          throw Error("symlink target has a symlink chain too long to vet");
        if (intermediateUncJunction !== undefined)
          throw Error("symlink target traverses a junction to remote UNC");
        if ((await lstat(v)).isSymbolicLink()) throw Error("multi-hop symlink chain");
      }
      let w = await realpath(path);
      let h = await lstat(w);
      i = true;
      let y = await realpath(rerootOutputsTo).catch(() => rerootOutputsTo);
      if (!w.startsWith(y + sep)) {
        if (
          !(await Promise.all([getClaudeTempDirRealpath(), ...[]].map((A) => realpath(A).catch(() => null))))
            .filter((A) => A !== null)
            .some((A) => w.startsWith(A + sep))
        )
          return await d("its output resolves outside the task-output tree");
        let P = join(rerootOutputsTo, "rerooted", `${e.id}.output`);
        let S;
        try {
          S = await pinWriteTarget(P, [P], {
            createParents: true,
            leaf: "replace",
          });
        } catch {
          return await d("reroot directory not trustworthy");
        }
        let ioPath = S.ioPath;
        try {
          if (!h.isFile()) return await d("gate target is not a regular file");
          if (h.nlink !== 1) return await d("gate target has another name");
          let A = await open(
            w,
            getPlatform() === "windows"
              ? "r"
              : constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | NOFOLLOW_NONBLOCK_FLAGS,
          );
          try {
            let stats = await A.stat();
            if (!stats.isFile() || stats.nlink !== 1 || stats.dev !== h.dev || stats.ino !== h.ino)
              return await d("handle identity mismatch");
            {
              await S.recheckBeforeWrite();
              await unlink(ioPath).catch(() => {});
              if (stats.size > MAX_ADOPT_FILE_BYTES) return await d("over-cap escaping output");
              let z;
              try {
                await S.recheckBeforeWrite();
                z =
                  getPlatform() === "windows"
                    ? await open(ioPath, "wx")
                    : await openNoFollow(
                        ioPath,
                        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
                        getPlatform(),
                      );
              } catch {
                return await d("reroot destination not creatable");
              }
              try {
                let B = 0;
                let R = Buffer.allocUnsafe(65536);
                while (B < MAX_ADOPT_FILE_BYTES) {
                  let { bytesRead } = await A.read(R, 0, Math.min(R.length, MAX_ADOPT_FILE_BYTES - B), B);
                  if (bytesRead === 0) break;
                  let L = 0;
                  while (L < bytesRead) {
                    let { bytesWritten } = await z.write(R, L, bytesRead - L);
                    L += bytesWritten;
                  }
                  B += bytesRead;
                }
              } finally {
                await z.close();
              }
              path = P;
            }
          } finally {
            await A.close();
          }
        } finally {
          await S.close();
        }
      }
    } catch {
      if (i) return await d("reroot failed after the gate");
    }
  }
  return {
    taskId: e.id,
    pid: o,
    procStart: await captureProcessStartTimeAsync(o),
    startTimeTicks: (await readProcessStartTicks(o)) ?? undefined,
    command: e.command,
    description: e.description,
    outputPath: path,
    lastReportedTotalLines: e.lastReportedTotalLines,
    toolUseId: e.toolUseId,
    kind: e.kind,
    agentId: e.agentId,
  };
}
//@ chunk-jbv0t0w5.js:8864-9192 placement
async function serializeAdoptAgent(e, n = {}) {
  let o = n.derivedTranscriptPath ?? getAgentTranscriptPath(identityAgentId2(e.agentId));
  return {
    agentId: e.agentId,
    agentType: e.agentType,
    description: e.description,
    toolUseId: e.toolUseId,
    spawnDepth: e.spawnDepth,
    startTime: e.startTime,
    transcriptPath: await realpath(o).catch(() => {
      return;
    }),
    parentAgentId: e.parentAgentId,
    forkedSkillName: e.forkedSkillName,
  };
}
//@ chunk-jbv0t0w5.js:9192-9602 placement
async function serializeAdoptWorkflow(e, n = {}) {
  let o = n.derivedTranscriptDir ?? subagentWorkflowDir(e.workflowRunId);
  return {
    taskId: e.id,
    workflowRunId: e.workflowRunId,
    scriptPath: e.scriptPath,
    scriptSha256: e.script ? createHash("sha256").update(e.script).digest("hex") : undefined,
    argsJson: e.args !== undefined ? jsonStringify(e.args) : undefined,
    description: e.description,
    startTime: e.startTime,
    withholdScriptFromSdkEvents: e.withholdScriptFromSdkEvents,
    transcriptDir: await realpath(o).catch(() => o),
  };
}
//@ chunk-jbv0t0w5.js:9602-9660 placement
function isCarriedFrameLiveWatch(e) {
  return isAdoptEnabled() && isAutoReactArmedMonitorTask(e) && e.frameLive !== undefined;
}
//@ chunk-jbv0t0w5.js:9660-9859 placement
function carriedFrameLiveSlugs(e) {
  let n = new Set();
  if (!isAdoptEnabled()) return n;
  for (let o of Object.values(e))
    if (isCarriedFrameLiveWatch(o) && o.frameLive !== undefined) n.add(o.frameLive.slug);
  for (let o of getAutoReactSlugs()) n.add(o);
  for (let o of getBootingAutoReactSlugs()) n.add(o);
  return n;
}
//@ chunk-jbv0t0w5.js:9859-10186 placement
function collectFrameLiveConsent(e) {
  let { supervisors, bootingWiredArms } = getLiveState().live;
  let bootingAutoReactSlugs = getBootingAutoReactSlugs();
  let s = [];
  let writtenAtMs = Date.now();
  for (let i of carriedFrameLiveSlugs(e)) {
    let u = supervisors.get(i);
    let g = bootingAutoReactSlugs.has(i) ? bootingWiredArms.get(i) : undefined;
    if (u === undefined && g === undefined) continue;
    let title = g?.title ?? u?.autoReactWiring?.title;
    let h = title !== undefined && title.length >= 1 && title.length <= 256;
    s.push({
      slug: i,
      writtenAtMs,
      ...(h && {
        title,
      }),
    });
  }
  return s;
}
//@ chunk-jbv0t0w5.js:10186-12987 placement
async function serializeAdoptable(e, n) {
  let adoptability = computeAdoptability(e);
  let filtered = Object.values(e).filter((m) => isAdoptableShellTask(m, adoptability));
  let filtered_2 = Object.values(e).filter((m) => isAdoptableAgentTask(m, adoptability));
  let filtered_3 = Object.values(e).filter((m) => isAdoptableWorkflowTask(m, adoptability));
  let filtered_4 = getSessionCronTasks().filter((m) => isAdoptableCron(m, adoptability));
  if (
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    filtered_4.length === 0 &&
    collectFrameLiveConsent(e).length === 0
  )
    return null;
  let filtered_5 = (
    await Promise.all(
      filtered.map((m) =>
        detachAndSerializeShell(m, {
          rerootOutputsTo: sessionTempDirRealpath(),
        }),
      ),
    )
  ).filter((m) => m !== null);
  let results = await Promise.all(filtered_2.map((m) => serializeAdoptAgent(m)));
  let results_2 = await Promise.all(filtered_3.map((m) => serializeAdoptWorkflow(m)));
  let frameLiveConsent = collectFrameLiveConsent(e);
  let y = new Set(frameLiveConsent.map((m) => m.slug));
  let mapped = Object.values(e)
    .filter((m) => isCarriedFrameLiveWatch(m) && m.frameLive !== undefined && y.has(m.frameLive.slug))
    .map((m) => m.id);
  if (
    filtered_5.length === 0 &&
    results.length === 0 &&
    results_2.length === 0 &&
    filtered_4.length === 0 &&
    frameLiveConsent.length === 0
  )
    return null;
  let v = false;
  let P = false;
  let S = (m) => {
    if (P) return;
    P = true;
    forgetCommentMonitorIntents(y);
    stopArtifactSupervisors(y);
    let A = new Set(mapped);
    if (y.size > 0) {
      for (let E of Object.values(m.all()))
        if (
          isMonitorWsTask(E) &&
          E.status === "running" &&
          E.frameLive !== undefined &&
          y.has(E.frameLive.slug)
        )
          A.add(E.id);
    }
    for (let E of A)
      stopMonitorWsTasks(E, m, {
        quiet: true,
      });
  };
  return {
    payload: {
      writtenAtMs: Date.now(),
      shells: filtered_5,
      cron: filtered_4.map((m) => ({
        id: m.id,
        cron: m.cron,
        prompt: m.prompt,
        createdAt: m.createdAt,
        recurring: m.recurring,
        agentId: m.agentId,
        plugin: m.plugin,
        kind: m.kind,
        scheduledFor: m.scheduledFor,
        reason: m.reason,
        keepalive: m.keepalive,
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
    checkpointAgents: async (m) => {
      for (let A of filtered_3) {
        A.abortController?.abort(userAbortReason("background"));
        pauseWorkflowTask(A.id, m);
      }
      if (results.length === 0) return;
      for (let A of filtered_5) if (A.agentId !== undefined) m.remove(A.taskId);
      for (let A of filtered_2) A.abortController.abort(userAbortReason("background"));
      await yieldToEventLoop();
      await flushSessionStorage().catch((error) => {
        logFeatureSad("task_local_agent", "adopt_checkpoint_flush_failed");
        logForDebugging(`[adopt] checkpoint flush: ${error}`, {
          level: "warn",
        });
      });
    },
    stopCarriedWatches: S,
    disown: (m) => {
      S(m);
      for (let A of filtered_5) m.remove(A.taskId);
      for (let A of results) m.remove(A.agentId);
      for (let A of results_2) m.remove(A.taskId);
      if (filtered_4.length > 0) removeSessionCronTasks(filtered_4.map((A) => A.id));
    },
    abandon: () => {
      if (v) return;
      v = true;
      for (let m of filtered)
        try {
          m.shellCommand?.kill();
        } catch (error) {
          logForDebugging(`[adopt] abandon ${m.id}: ${error}`, {
            level: "warn",
          });
        }
      for (let m of filtered_2) {
        let A = `Background agent "${noticeDescriptionOf(m.description)}" was checkpointed for the background fork but the fork failed to spawn; the agent was not resumed.`;
        enqueueFailedTaskNotification(m.agentId, A, n);
      }
      if (filtered_2.length > 0) logFeatureSad("task_local_agent", "adopt_spawn_failed");
      for (let m of filtered_3) {
        let A =
          m.withholdScriptFromSdkEvents === true
            ? ""
            : manualWorkflowResumeHint(
                {
                  workflowRunId: m.workflowRunId ?? "",
                  scriptPath: m.scriptPath,
                  argsJson: m.args !== undefined ? jsonStringify(m.args) : undefined,
                },
                "",
              );
        let E = `Background workflow "${noticeDescriptionOf(m.description)}" was checkpointed for the background fork but the fork failed to spawn; it was not resumed.${A}`;
        enqueueFailedTaskNotification(m.id, E, n);
      }
      if (filtered_3.length > 0) logFeatureSad("task_local_workflow", "adopt_spawn_failed");
      if (P) {
        for (let m of mapped)
          enqueueFailedTaskNotification(
            m,
            "The background session didn't start, so automatic replies to Artifact comments stopped. Publish the Artifact again to turn them back on.",
            n,
          );
        if (frameLiveConsent.length > 0) logFeatureSad("artifact_live_subscribe", "adopt_spawn_failed");
      }
    },
  };
}
//@ chunk-jbv0t0w5.js:12987-13445 placement
function dedupFrameLiveNewest(e) {
  let n = new Map();
  for (let o of e)
    for (let entry of o.entries) {
      let s = {
        ...entry,
        writtenAtMs: entry.writtenAtMs ?? o.fallbackBasis,
      };
      let d = n.get(entry.slug);
      let min = Math.min(
        (d?.unattendedReplies ?? 0) + (entry.unattendedReplies ?? 0),
        MAX_UNATTENDED_REPLY_COUNT,
      );
      let u = d === undefined || s.writtenAtMs > (d.writtenAtMs ?? 0) ? s : d;
      n.set(
        entry.slug,
        min > 0
          ? {
              ...u,
              unattendedReplies: min,
            }
          : u,
      );
    }
  if (n.size > REFUSED_CAPACITY_HINT) logFeatureSad("artifact_live_subscribe", "merged_consent_capped");
  return [...n.values()]
    .sort((o, r) => (r.writtenAtMs ?? 0) - (o.writtenAtMs ?? 0))
    .slice(0, REFUSED_CAPACITY_WINDOW);
}
//@ chunk-jbv0t0w5.js:13445-14095 placement
/**
 * 合并两份 adopt.json：shells/cron/agents/workflows 按各自键去重（先旧后新），frameLive 取最新，其他字段以新值优先。
 */
function mergeAdoptFiles(current, incoming) {
  let mergeUnique = (r, s, d) => [...r, ...s].filter((i, u, g) => g.findIndex((w) => d(w) === d(i)) === u);
  return {
    writtenAtMs: incoming.writtenAtMs,
    origin: incoming.origin ?? current.origin,
    shells: mergeUnique(current.shells, incoming.shells, (r) => r.pid),
    cron: mergeUnique(current.cron, incoming.cron, (r) => r.id),
    ...((incoming.loopWakeFires ?? current.loopWakeFires) !== undefined && {
      loopWakeFires: incoming.loopWakeFires ?? current.loopWakeFires,
    }),
    agents: mergeUnique(current.agents ?? [], incoming.agents ?? [], (r) => r.agentId),
    workflows: mergeUnique(current.workflows ?? [], incoming.workflows ?? [], (r) => r.taskId),
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
//@ chunk-jbv0t0w5.js:14095-14329 placement
async function readAdoptJsonFromStorage(e, n) {
  let o = await e.read([STORAGE_SPACES.job(n, ["adopt.json"])]);
  if (!o.ok) {
    logForDebugging(`[adopt] v5 merge read refused: ${formatStorageError(o.error)}`);
    return null;
  }
  let r = o.value.items[0];
  if (!r.found) return null;
  return Buffer.from(r.value).toString("utf8");
}
//@ chunk-jbv0t0w5.js:14329-15148 placement
async function writeAdoptJson(jobDir, incoming, o = {}, r) {
  let s = join(jobDir, "adopt.json");
  let d = basename(jobDir);
  let i =
    isStorageV5Enabled() && r !== undefined && isValidKeySegment(d) && jobDir === getJobDir(d)
      ? r
      : undefined;
  let u = incoming;
  try {
    let g = i ? await readAdoptJsonFromStorage(i, d) : await readFile(s, "utf-8");
    if (g !== null && g.length <= 1e6) {
      let h = (
        o.mergeShellOutputRoot !== undefined
          ? adoptFileSchemaWithRoots(o.mergeShellOutputRoot)
          : adoptFileSchemaLazy()
      ).safeParse(jsonParse(g));
      if (h.success) {
        if (
          h.data.shells.length +
            (h.data.cron?.length ?? 0) +
            (h.data.agents?.length ?? 0) +
            (h.data.workflows?.length ?? 0) +
            (h.data.frameLive?.length ?? 0) <=
          256
        )
          u = mergeAdoptFiles(h.data, incoming);
      }
    }
  } catch {}
  if (i) {
    let g = await i.write(STORAGE_SPACES.job(d, ["adopt.json"]), jsonStringify(u), {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
      parent: o.parent ?? "mustExist",
    });
    if (!g.ok)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopt.json v5 write failed: ${formatStorageError(g.error)}`,
          "adopt.json v5 write failed",
        ),
        "telemetryCode" in g.error && g.error.telemetryCode !== undefined
          ? {
              code: g.error.telemetryCode,
            }
          : {},
      );
    return;
  }
  await writeFileAtomic(s, jsonStringify(u));
}
//@ chunk-jbv0t0w5.js:15148-17180 placement
async function readAndConsumeAdoptJson(bgJobDir, n = {}) {
  if (!bgJobDir) return null;
  let o = join(bgJobDir, "adopt.json");
  let r = `${o}.${process.pid}`;
  let s = Date.now() + (n.waitMs ?? 0);
  let d = false;
  for (;;)
    try {
      d = await retryFsOp(o, r);
      break;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") {
        if (Date.now() < s) {
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
  let result = d ? lit("ebusy_retry") : lit("ok");
  try {
    let mcpAuthCache = await getMcpAuthCache(r, MAX_MCP_AUTH_CACHE_BYTES);
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
    let y = (
      n.extraShellOutputRoot !== undefined
        ? adoptFileSchemaWithRoots(n.extraShellOutputRoot)
        : adoptFileSchemaLazy()
    ).safeParse(JSON.parse(content));
    if (!y.success) {
      logForDebugging(`[adopt] schema rejected: ${y.error.message}`, {
        level: "warn",
      });
      logEvent("tengu_adopt_claim", {
        result: lit("schema_rejected"),
      });
      return null;
    }
    let T = now - y.data.writtenAtMs;
    if (y.data.origin !== "exit" && T > STALE_THRESHOLD_MS) {
      logForDebugging(`[adopt] stale (age ${T}ms)`, {
        level: "warn",
      });
      let frameLive = y.data.frameLive ?? [];
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
        writtenAtMs: y.data.writtenAtMs,
        ...(y.data.origin !== undefined && {
          origin: y.data.origin,
        }),
        shells: [],
        cron: [],
        frameLive: frameLive.map((P) => ({
          ...P,
          writtenAtMs: P.writtenAtMs ?? y.data.writtenAtMs,
          stale: true,
        })),
      };
    }
    if ((y.data.frameLive?.length ?? 0) > 0) {
      let mapped = y.data.frameLive.map((S) => {
        let writtenAtMs = S.writtenAtMs ?? y.data.writtenAtMs;
        let A = now - writtenAtMs;
        return A >= -CLOCK_SKEW_ALLOWANCE_MS && A <= STALE_THRESHOLD_MS
          ? {
              ...S,
              writtenAtMs,
            }
          : {
              ...S,
              writtenAtMs,
              stale: true,
            };
      });
      let P = count(mapped, (S) => "stale" in S);
      if (P > 0)
        logForDebugging(`[adopt] ${P}/${mapped.length} frameLive entries marked stale`, {
          level: "warn",
        });
      logEvent("tengu_adopt_claim", {
        result,
        ...(P > 0 && {
          frame_live_stale: lit("true"),
        }),
      });
      return Object.assign(y.data, {
        frameLive: mapped,
      });
    }
    logEvent("tengu_adopt_claim", {
      result,
    });
    return y.data;
  } catch (error) {
    logForDebugging(`[adopt] read/parse failed: ${error}`, {
      level: "warn",
    });
    logEvent("tengu_adopt_claim", {
      result: lit("parse_failed"),
    });
    return null;
  } finally {
    await unlink(r).catch(() => {});
  }
}
//@ chunk-jbv0t0w5.js:17180-17334 placement
function recordUnresumedAdopt(bgJobDir, registered, o, owner) {
  let s = pendingWritesTracker();
  if (registered.length === 0 && o.length === 0) {
    s.unresumedAdopt.delete(bgJobDir);
    return;
  }
  s.unresumedAdopt.set(bgJobDir, {
    agents: registered,
    workflows: o,
    owner,
  });
}
//@ chunk-jbv0t0w5.js:17334-17439 placement
function takeUnresumedAdopt(e, n) {
  if (pendingWritesTracker().unresumedAdopt.get(e)?.owner !== n)
    return {
      agents: [],
      workflows: [],
    };
  return drainUnresumedAdopt(e);
}
//@ chunk-jbv0t0w5.js:17439-17577 placement
function drainUnresumedAdopt(e) {
  let n = pendingWritesTracker();
  let o = n.unresumedAdopt.get(e);
  n.unresumedAdopt.delete(e);
  return {
    agents: o?.agents ?? [],
    workflows: o?.workflows ?? [],
  };
}
//@ chunk-jbv0t0w5.js:17577-17737 placement
function recordUnresumedFrameLive(bgJobDir, frameLive, owner) {
  let r = pendingWritesTracker();
  if (frameLive.length === 0) {
    r.unresumedFrameLive.delete(bgJobDir);
    return;
  }
  r.unresumedFrameLive.set(bgJobDir, {
    entries: frameLive.map(({ stale, ...d }) => d),
    owner,
  });
}
//@ chunk-jbv0t0w5.js:17737-17824 placement
function takeUnresumedFrameLive(jobDir, owner) {
  if (pendingWritesTracker().unresumedFrameLive.get(jobDir)?.owner !== owner) return [];
  return drainUnresumedFrameLive(jobDir);
}
//@ chunk-jbv0t0w5.js:17824-17935 placement
function drainUnresumedFrameLive(e) {
  let n = pendingWritesTracker();
  let o = n.unresumedFrameLive.get(e);
  n.unresumedFrameLive.delete(e);
  return o?.entries ?? [];
}
//@ chunk-jbv0t0w5.js:17935-18098 placement
function reparkUnresumedFrameLive(jobDir, n, owner) {
  let r = pendingWritesTracker();
  let s = r.unresumedFrameLive.get(jobDir);
  if (n.length === 0 || (s !== undefined && s.owner !== owner)) return;
  r.unresumedFrameLive.set(jobDir, {
    entries: [...n],
    owner,
  });
}
//@ chunk-jbv0t0w5.js:18098-18332 placement
function releaseReparkedFrameLive(jobDir, n, owner) {
  let r = pendingWritesTracker();
  let s = r.unresumedFrameLive.get(jobDir);
  if (s === undefined || s.owner !== owner) return;
  let filtered = s.entries.filter((entry) => entry.slug !== n);
  if (filtered.length > 0)
    r.unresumedFrameLive.set(jobDir, {
      entries: filtered,
      owner,
    });
  else r.unresumedFrameLive.delete(jobDir);
}
//@ chunk-jbv0t0w5.js:18332-18403 placement
function recordExitRetryFrameLive(jobDir, frameLive) {
  if (frameLive.length > 0) pendingWritesTracker().exitRetryFrameLive.set(jobDir, [...frameLive]);
}
//@ chunk-jbv0t0w5.js:18403-18528 placement
function takeExitRetryFrameLive(e) {
  if (e === undefined) return [];
  let n = pendingWritesTracker();
  let o = n.exitRetryFrameLive.get(e) ?? [];
  n.exitRetryFrameLive.delete(e);
  return o;
}
//@ chunk-jbv0t0w5.js:18528-18634 placement
/**
 * 复制文件时使用的缓冲块大小（1 MiB）。
 */
var RELINK_FALLBACK_ERRNOS = new Set(["EXDEV", "EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EMLINK"]);
var COPY_CHUNK_BYTES = 1048576;
var ADOPT_RELINK_MARK = ".adopt-relink.";
//@ chunk-jbv0t0w5.js:18634-18720 placement = generatePlaceholders (0.792)
function makeAdoptRelinkName(e) {
  return `${e}${ADOPT_RELINK_MARK}${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`;
}
//@ chunk-jbv0t0w5.js:18720-19043 placement
/**
 * 尝试重链接子代理文件，按错误码决定是否回退为复制，并记录采用的方式。
 */
async function relinkOrCopyAgentFile(e, adoptRelinkName, o, r) {
  let s;
  try {
    await r(e, adoptRelinkName);
    s = "UNVERIFIED";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined || !RELINK_FALLBACK_ERRNOS.has(errnoCode)) throw error;
    s = errnoCode;
  }
  if (s === "UNVERIFIED") {
    let i = await lstat(adoptRelinkName);
    if (i.isFile() && i.dev === o.dev && i.ino === o.ino)
      return {
        method: "hardlink",
        identity: o,
      };
    await unlink(adoptRelinkName);
  }
  let identity = await copyAdoptedFile(e, adoptRelinkName, o);
  return {
    method: "copy",
    fallbackCode: s,
    identity,
  };
}
//@ chunk-jbv0t0w5.js:19043-19901 placement
async function copyAdoptedFile(e, n, o) {
  let r = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.dev !== o.dev || stats.ino !== o.ino)
      throw Object.assign(Error("adopted file copy source is not the validated inode"), {
        code: "ADOPT_IDENTITY_MISMATCH",
      });
    let d = await open(n, "wx", DEFAULT_OPEN_BUFFER_BYTES);
    let i = false;
    try {
      let u = Buffer.allocUnsafe(COPY_CHUNK_BYTES);
      for (;;) {
        let { bytesRead } = await r.read(u, 0, u.length, null);
        if (bytesRead === 0) break;
        let y = 0;
        while (y < bytesRead) {
          let { bytesWritten } = await d.write(u, y, bytesRead - y);
          if (bytesWritten === 0)
            throw Object.assign(Error("adopted file copy made no progress"), {
              code: "ADOPT_COPY_STALLED",
            });
          y += bytesWritten;
        }
      }
      let { dev, ino } = await d.stat();
      await d.utimes(stats.atime, stats.mtime).catch((error) => {
        logForDebugging(`[adopt] copied file keeps fresh timestamps (${getErrnoCode(error) ?? "error"})`, {
          level: "warn",
        });
      });
      await d.close();
      i = true;
      return {
        dev,
        ino,
      };
    } finally {
      if (!i) {
        await d.close().catch(() => {});
        await unlink(n).catch(() => {});
      }
    }
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-jbv0t0w5.js:19901-20290 placement
/**
 * 把被接管的子代理文件放到目标位置，已存在的非符号链接文件不覆盖。
 */
async function placeAdoptedAgentFile(adoptRelinkName, n, o) {
  let r;
  try {
    r = await lstat(n);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  if (r !== undefined && !r.isSymbolicLink()) {
    if (!r.isFile())
      throw Object.assign(Error("adopted agent name is held by a non-file entry"), {
        code: "ADOPT_NAME_NOT_FILE",
      });
    if (o) return "kept";
  }
  try {
    await retryFsOp(adoptRelinkName, n);
  } catch (error) {
    if (r === undefined || getErrnoCode(error) !== "EEXIST") throw error;
    await unlink(n);
    await retryFsOp(adoptRelinkName, n);
  }
  return r === undefined ? "created" : "replaced";
}
//@ chunk-jbv0t0w5.js:20290-20646 placement
/**
 * 接管子代理记录文件：已是普通文件则保留，否则重链接或复制。
 */
async function adoptAgentFile(e, n, o, r, s) {
  if (s) {
    let h = await lstat(e).catch(() => {
      return;
    });
    if (h !== undefined && !h.isSymbolicLink() && h.isFile())
      return {
        method: "kept",
        created: null,
      };
  }
  let adoptRelinkName = makeAdoptRelinkName(e);
  let i = await relinkOrCopyAgentFile(n, adoptRelinkName, o, r);
  let u = "kept";
  try {
    u = await placeAdoptedAgentFile(adoptRelinkName, e, s);
  } finally {
    await unlink(adoptRelinkName).catch(() => {});
  }
  let { identity, ...w } = i;
  return u === "kept"
    ? {
        method: "kept",
        created: null,
      }
    : {
        ...w,
        created: u === "created" ? identity : null,
      };
}
//@ chunk-jbv0t0w5.js:20646-20969 placement
async function linkAdoptedAgentTranscript(e, { storageV5: n, linkFn: o = link } = {}) {
  if (n === undefined) return checkAdoptedForkedSkill(e);
  try {
    let r = await validateAdoptedAgentFiles(e, o);
    if (r.method !== undefined)
      logEvent("tengu_adopt_link", {
        kind: lit("agent"),
        method: fromEnum(r.method),
        fallback_code: sanitizedErrCodeForTelemetry({
          code: r.fallbackCode,
        }),
      });
    return r;
  } catch (error) {
    logEvent("tengu_adopt_link", {
      kind: lit("agent"),
      method: fromEnum("fail"),
      error_code: sanitizedErrCodeForTelemetry(error),
    });
    throw error;
  }
}
//@ chunk-jbv0t0w5.js:20969-22492 placement
async function checkAdoptedForkedSkill(e) {
  if (!e.transcriptPath) return {};
  let agentTranscriptPath = getAgentTranscriptPath(identityAgentId2(e.agentId));
  let o = (transcriptPath) => transcriptPath.replace(/\.jsonl$/, ".meta.json");
  await stat(o(e.transcriptPath));
  let r = null;
  let s;
  let d = forkedSkillSidecarPaths(e.transcriptPath);
  if (e.forkedSkillName !== undefined) {
    let scopingFromFiles = await readScopingFromFiles(d);
    if (scopingFromFiles.status !== "valid")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record is unusable (${scopingFromFiles.status})`,
        "adopted forked-skill scoping record unusable",
      );
    if (scopingFromFiles.scoping.skillName !== e.forkedSkillName)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record names a different skill`,
        "adopted forked-skill scoping identity mismatch",
      );
    r = {
      parent: d,
      fork: forkedSkillSidecarPaths(agentTranscriptPath),
    };
  } else {
    let scopingFromFiles = await readScopingFromFiles(d);
    switch (scopingFromFiles.status) {
      case "absent":
        break;
      case "valid":
        r = {
          parent: d,
          fork: forkedSkillSidecarPaths(agentTranscriptPath),
        };
        s = scopingFromFiles.scoping.skillName;
        break;
      case "malformed":
      case "absent-but-marked":
      case "diskless":
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${e.agentId} has an unusable forked-skill scoping record (${scopingFromFiles.status})`,
          "adopted forked-skill scoping record unusable",
        );
    }
  }
  if (agentTranscriptPath === e.transcriptPath)
    return {
      forkedSkillNameFromSidecar: s,
    };
  if (
    (await realpath(agentTranscriptPath).catch(() => {
      return;
    })) === e.transcriptPath
  )
    return {
      forkedSkillNameFromSidecar: s,
    };
  await mkdir(dirname(agentTranscriptPath), {
    recursive: true,
  });
  if (r) {
    await unlink(r.fork.provenanceMarker).catch(() => {});
    await writeForkedSkillMarker(r.fork.provenanceMarker, e.forkedSkillName ?? s);
    await unlink(r.fork.scoping).catch(() => {});
    await copyFile(r.parent.scoping, r.fork.scoping);
  }
  for (let [i, u] of [
    [agentTranscriptPath, e.transcriptPath],
    [o(agentTranscriptPath), o(e.transcriptPath)],
  ]) {
    await unlink(i).catch(() => {});
    await symlink(u, i);
  }
  return {
    forkedSkillNameFromSidecar: s,
  };
}
//@ chunk-jbv0t0w5.js:22492-22541 placement
/**
 * 给错误对象附加 code 字段。
 */
function withErrorCode(e, code) {
  return Object.assign(e, {
    code,
  });
}
//@ chunk-jbv0t0w5.js:22541-25268 placement
async function validateAdoptedAgentFiles(e, n) {
  if (!e.transcriptPath) return {};
  let agentTranscriptPath = getAgentTranscriptPath(identityAgentId2(e.agentId));
  let r = (S) => S.replace(/\.jsonl$/, ".meta.json");
  if (basename(e.transcriptPath) !== basename(agentTranscriptPath))
    throw withErrorCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} carrier names a transcript that is not agent-${e.agentId}.jsonl`,
        "adopted agent transcript path has the wrong leaf name",
      ),
      "ADOPT_WRONG_LEAF",
    );
  let [s, d] = await Promise.all([lstat(e.transcriptPath), lstat(r(e.transcriptPath))]);
  if (!s.isFile() || !d.isFile())
    throw withErrorCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} parent transcript or .meta.json is not a regular file`,
        "adopted agent parent file is not a regular file",
      ),
      "ADOPT_PARENT_NOT_REGULAR",
    );
  let i = null;
  let u;
  let g = forkedSkillSidecarPaths(e.transcriptPath);
  if (e.forkedSkillName !== undefined) {
    let scopingFromFiles = await readScopingFromFiles(g);
    if (scopingFromFiles.status !== "valid")
      throw withErrorCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record is unusable (${scopingFromFiles.status})`,
          "adopted forked-skill scoping record unusable",
        ),
        "ADOPT_SCOPING_UNUSABLE",
      );
    if (scopingFromFiles.scoping.skillName !== e.forkedSkillName)
      throw withErrorCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record names a different skill`,
          "adopted forked-skill scoping identity mismatch",
        ),
        "ADOPT_SCOPING_MISMATCH",
      );
    i = {
      parent: g,
      fork: forkedSkillSidecarPaths(agentTranscriptPath),
    };
  } else {
    let scopingFromFiles = await readScopingFromFiles(g);
    switch (scopingFromFiles.status) {
      case "absent":
        break;
      case "valid":
        i = {
          parent: g,
          fork: forkedSkillSidecarPaths(agentTranscriptPath),
        };
        u = scopingFromFiles.scoping.skillName;
        break;
      case "malformed":
      case "absent-but-marked":
      case "diskless":
        throw withErrorCode(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `adopted agent ${e.agentId} has an unusable forked-skill scoping record (${scopingFromFiles.status})`,
            "adopted forked-skill scoping record unusable",
          ),
          "ADOPT_SCOPING_UNUSABLE",
        );
    }
  }
  if (agentTranscriptPath === e.transcriptPath)
    return {
      forkedSkillNameFromSidecar: u,
      method: "noop",
    };
  let w = await realpath(dirname(agentTranscriptPath)).catch(() => {
    return;
  });
  if (w !== undefined && join(w, basename(agentTranscriptPath)) === e.transcriptPath)
    return {
      forkedSkillNameFromSidecar: u,
      method: "noop",
    };
  await mkdir(dirname(agentTranscriptPath), {
    recursive: true,
  });
  if (i) {
    await unlink(i.fork.provenanceMarker).catch(() => {});
    await writeForkedSkillMarker(i.fork.provenanceMarker, e.forkedSkillName ?? u);
    await unlink(i.fork.scoping).catch(() => {});
    await copyFile(i.parent.scoping, i.fork.scoping);
  }
  let h = await lstat(agentTranscriptPath).catch(() => {
    return;
  });
  let y =
    h !== undefined &&
    (h.isFile() ||
      (h.isSymbolicLink() &&
        (await realpath(agentTranscriptPath).catch(() => {
          return;
        })) === e.transcriptPath));
  let T = await adoptAgentFile(r(agentTranscriptPath), r(e.transcriptPath), d, n, y);
  let v;
  try {
    v = await adoptAgentFile(agentTranscriptPath, e.transcriptPath, s, n, true);
  } catch (error) {
    if (T.created !== null) {
      let created = T.created;
      await lstat(r(agentTranscriptPath))
        .then(async (A) => {
          if (A.dev === created.dev && A.ino === created.ino) await unlink(r(agentTranscriptPath));
        })
        .catch(() => {});
    }
    throw error;
  }
  let fallbackCode = v.fallbackCode ?? T.fallbackCode;
  if (fallbackCode !== undefined) {
    let joined = [
      ...(v.method === "copy" ? ["transcript"] : []),
      ...(T.method === "copy" ? ["meta"] : []),
    ].join("+");
    logForDebugging(
      `[adopt] agent ${e.agentId}: hard link impossible (${fallbackCode}) \u2014 materialised a copy of ${joined}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("task_local_agent", "adopt_link_fallback_copy");
  }
  return {
    forkedSkillNameFromSidecar: u,
    method: v.method,
    fallbackCode,
  };
}
//@ chunk-jbv0t0w5.js:25268-25442 placement
var AGENT_FILE_NAME_RE = /^agent-[\w-]+\.(?:jsonl|meta\.json)$/;
var RELINK_TEMP_NAME_RE = new RegExp(
  "^agent-[\\w-]+\\.(?:jsonl|meta\\.json)" +
    ADOPT_RELINK_MARK.replace(/[.]/g, "\\.") +
    "\\d+\\.(\\d+)\\.[0-9a-f]{8}$",
);
var STALE_RELINK_TEMP_MS = 900000;
var MAX_ADOPTED_AGENT_LINKS = 64;
//@ chunk-jbv0t0w5.js:25442-25630 placement
function parseSubagentTranscriptPath(e, n) {
  let o = relative(e, n);
  if (o === "" || o.startsWith("..") || isAbsolute(o)) return null;
  let parts = o.split(sep);
  if (parts.length < 3 || parts[2] !== "subagents") return null;
  return {
    session: join(parts[0], parts[1]),
    depth: parts.length,
  };
}
//@ chunk-jbv0t0w5.js:25630-25819 placement
async function relinkAdoptedAgentSymlinks({ storageV5: e, linkFn: n = link } = {}) {
  if (e === undefined) return;
  try {
    await relinkSweep(getSessionSubagentsDir(), n);
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
//@ chunk-jbv0t0w5.js:25819-27973 placement
async function relinkSweep(sessionSubagentsDir, n) {
  let o;
  try {
    o = await readdir(sessionSubagentsDir, {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  let now = Date.now();
  let s = [];
  for (let R of o) {
    let match = RELINK_TEMP_NAME_RE.exec(R.name);
    if (match) {
      if (Math.abs(now - Number(match[1])) > STALE_RELINK_TEMP_MS)
        await unlink(join(sessionSubagentsDir, R.name)).catch(() => {});
      continue;
    }
    if (R.isSymbolicLink() && AGENT_FILE_NAME_RE.test(R.name)) s.push(R.name);
  }
  if (s.length === 0) return;
  let d = (R) => R.replace(/\.(?:jsonl|meta\.json)$/, "");
  let i = new Map();
  for (let R of s) {
    let N = i.get(d(R)) ?? {};
    if (R.endsWith(".jsonl")) N.transcript = R;
    else N.meta = R;
    i.set(d(R), N);
  }
  let u = [...i.entries()];
  let g = u.length > 1 ? randomBytes(4).readUInt32BE() % u.length : 0;
  let w = [...u.slice(g), ...u.slice(0, g)];
  let [h, y] = await Promise.all([
    realpath(getProjectsDir()).catch(() => null),
    realpath(sessionSubagentsDir).catch(() => null),
  ]);
  if (h === null || y === null) return;
  let subagentTranscriptPath = parseSubagentTranscriptPath(h, y);
  if (
    getProjectKeyIfRepresentable(dirname(dirname(sessionSubagentsDir))) === undefined ||
    subagentTranscriptPath === null ||
    subagentTranscriptPath.depth !== 3
  ) {
    logForDebugging(
      `[adopt] relink sweep: ${s.length} symlinked name(s) left as is (session dir outside the transcript store)`,
      {
        level: "warn",
      },
    );
    return;
  }
  let session = subagentTranscriptPath.session;
  let P = 0;
  let S = 0;
  let m = 0;
  let A = 0;
  let E = [];
  let z = (R) => {
    if (R === "copy") S++;
    else P++;
  };
  let B = new Set();
  for (let [R, [N, L]] of w.entries()) {
    let filtered = [L.transcript, L.meta].filter((W) => W !== undefined);
    if (A + filtered.length > MAX_ADOPTED_AGENT_LINKS) {
      m = w.slice(R).reduce((acc, [, O]) => acc + Number(!!O.transcript) + Number(!!O.meta), 0);
      E.push(`${m} more (per-pass cap)`);
      break;
    }
    A += filtered.length;
    try {
      let expectedName = `${N}.jsonl`;
      let O =
        L.transcript !== undefined
          ? await checkAdoptedAgentLink(sessionSubagentsDir, expectedName, h, session)
          : await checkAgentMetaFile(sessionSubagentsDir, expectedName);
      if (typeof O === "string") {
        for (let K of filtered)
          E.push(`${K} (${K === L.meta && L.transcript !== undefined ? "transcript not convertible" : O})`);
        continue;
      }
      let se;
      if (L.meta !== undefined) {
        let K =
          O !== null && O.gate.size === 0
            ? "meta beside an empty transcript"
            : await checkAdoptedAgentLink(sessionSubagentsDir, L.meta, h, session, {
                besideDir: O === null ? undefined : dirname(O.real),
              });
        if (typeof K === "string") {
          for (let ge of filtered) E.push(`${ge} (${ge === L.meta ? K : "meta not convertible"})`);
          continue;
        }
        se = K;
      }
      if (O !== null) {
        z(await adoptAgentFileMethod(O, n));
        B.add(expectedName);
      }
      if (se !== undefined && L.meta !== undefined) {
        z(await adoptAgentFileMethod(se, n));
        B.add(L.meta);
      }
    } catch (error) {
      if (getErrnoCode(error) === undefined) logError(error);
      for (let O of filtered) if (!B.has(O)) E.push(`${O} (${getErrnoCode(error) ?? "error"})`);
    }
  }
  if (S > 0) logFeatureSad("task_local_agent", "adopt_link_fallback_copy");
  logForDebugging(
    `[adopt] relink sweep: ${P} hard-linked, ${S} copied, ${E.length - (m > 0 ? 1 : 0) + m} left as is${E.length > 0 ? ` (${E.slice(0, 5).join(", ")})` : ""}`,
    {
      level: E.length > 0 || S > 0 ? "warn" : "debug",
    },
  );
  logEvent("tengu_adopt_relink", {
    linked: P,
    copied: S,
    left: E.length - (m > 0 ? 1 : 0) + m,
  });
}
//@ chunk-jbv0t0w5.js:27973-28045 placement
/**
 * agent 元数据文件的大小上限（64 KiB）。
 */
var MAX_META_BYTES = 65536;
var agentMetaSchema = DoctorLazy(() =>
  create({
    agentType: create_2(),
  }),
);
var agentIdMetaSchema = DoctorLazy(() =>
  create({
    agentId: create_2(),
  }),
);
//@ chunk-jbv0t0w5.js:28045-28767 placement
async function readAgentMetaSafely(e, n, o) {
  let filePath = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await filePath.stat();
    if (stats.dev !== n.dev || stats.ino !== n.ino) return "target changed during the check";
    if (o.endsWith(".meta.json")) {
      if (stats.size > MAX_META_BYTES) return "meta too large";
      let jsonOrNull = parseJsonOrNull((await readJSONLFile(filePath)).toString("utf-8"));
      return agentMetaSchema().safeParse(jsonOrNull).success ? undefined : "not an agent meta";
    }
    if (stats.size === 0) return;
    let sliced = o.slice(6, -6);
    let jsonlFile = await readJSONLFile(filePath);
    let str = jsonlFile.toString("utf-8");
    if (jsonlFile.length >= MAX_META_BYTES && jsonlFile.indexOf(10) === -1)
      return hasTopLevelAgentId(str, sliced) ? undefined : "no record naming this agent in the first 64 KiB";
    for (let line of str.split(`
`)) {
      let jsonOrNull = parseJsonOrNull(line);
      if (jsonOrNull === null) continue;
      let h = agentIdMetaSchema().safeParse(jsonOrNull);
      if (h.success && h.data.agentId === sliced) return;
    }
    return "no record naming this agent in the first 64 KiB";
  } finally {
    await filePath.close().catch(() => {});
  }
}
//@ chunk-jbv0t0w5.js:28767-28818 placement
/**
 * 解析 JSON，失败返回 null。
 */
function parseJsonOrNull(e) {
  try {
    return jsonParse(e);
  } catch {
    return null;
  }
}
//@ chunk-jbv0t0w5.js:28818-28966 placement = readJSONLFile (1)
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
//@ chunk-jbv0t0w5.js:28966-29323 placement
/**
 * 判断 JSONL 行的顶层对象是否带指定 agentId 字段（逐字符扫描，忽略嵌套）。
 */
function hasTopLevelAgentId(e, n) {
  if (e[0] !== "{") return false;
  let o = `"agentId":"${n}"`;
  let r = 0;
  let s = false;
  let d = false;
  for (let i = 0; i < e.length; i++) {
    let u = e[i];
    if (s) {
      if (d) d = false;
      else if (u === "\\") d = true;
      else if (u === '"') s = false;
      continue;
    }
    if (u === "{" || u === "[") r++;
    else if (u === "}" || u === "]") {
      r--;
      if (r === 0) return false;
    } else if (u === '"') {
      if (r === 1 && e.startsWith(o, i) && (e[i - 1] === "{" || e[i - 1] === ",")) return true;
      s = true;
    }
  }
  return false;
}
//@ chunk-jbv0t0w5.js:29323-29986 placement
/**
 * 校验交接给后台会话的子代理转录符号链接：目标须为绝对路径、同名、普通文件、位于转录存储内且不属于本会话、身份未在检查期间变化，并检查对应元数据；返回不合格原因或 null。
 */
async function checkAdoptedAgentLink(e, expectedName, o, session, { besideDir: s } = {}) {
  let d = join(e, expectedName);
  let targetPath = await readlink(d);
  if (
    !isAbsolute(targetPath) ||
    basename(targetPath) !== expectedName ||
    hasUntouchableRecordSpelling(targetPath)
  )
    return "unexpected target spelling";
  let u;
  try {
    u = await lstat(targetPath);
  } catch (error) {
    return `target ${getErrnoCode(error) ?? "unreadable"}`;
  }
  if (!u.isFile()) return u.isSymbolicLink() ? "chained link" : "non-regular target";
  let g = await realpath(targetPath);
  let subagentTranscriptPath = parseSubagentTranscriptPath(o, g);
  if (subagentTranscriptPath === null || subagentTranscriptPath.depth < 4 || basename(g) !== expectedName)
    return "outside the transcript store";
  if (subagentTranscriptPath.session === session) return "this session's own file";
  if (s !== undefined && dirname(g) !== s) return "not beside its transcript";
  let h = await lstat(g);
  if (!h.isFile() || h.dev !== u.dev || h.ino !== u.ino) return "target changed during the check";
  let agentMeta = await readAgentMetaSafely(g, u, expectedName);
  if (agentMeta !== undefined) return agentMeta;
  return {
    linkPath: d,
    real: g,
    gate: u,
  };
}
//@ chunk-jbv0t0w5.js:29986-30209 placement
async function checkAgentMetaFile(e, n) {
  let o = join(e, n);
  let r;
  try {
    r = await lstat(o);
  } catch {
    return "meta without its transcript";
  }
  if (!r.isFile() || r.size === 0) return "meta without its transcript";
  let agentMeta = await readAgentMetaSafely(o, r, n);
  return agentMeta === undefined ? null : `transcript ${agentMeta}`;
}
//@ chunk-jbv0t0w5.js:30209-30287 placement
/**
 * 接管 agent 文件并返回实际采用的方式。
 */
async function adoptAgentFileMethod(e, n) {
  return (await adoptAgentFile(e.linkPath, e.real, e.gate, n, true)).method;
}
//@ chunk-jbv0t0w5.js:30287-30350 placement
function killOrphanedAdoptedShell(shell) {
  return killIfSameProcess(shell.pid, shell.startTimeTicks, shell.procStart);
}
//@ chunk-jbv0t0w5.js:30350-30724 placement
async function linkAdoptedWorkflowDir(e) {
  let n = subagentWorkflowDir(e.workflowRunId);
  if (n === e.transcriptDir) return;
  if (
    (await realpath(n).catch(() => {
      return;
    })) === e.transcriptDir
  )
    return;
  await stat(join(e.transcriptDir, "journal.jsonl"));
  await mkdir(dirname(n), {
    recursive: true,
  });
  try {
    await unlink(n);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      try {
        await rmdir(n);
      } catch (error) {
        if (getErrnoCode(error) === "ENOTEMPTY")
          await rm(n, {
            recursive: true,
            force: true,
          });
      }
  }
  await symlink(e.transcriptDir, n, undefined);
}
//@ chunk-jbv0t0w5.js:30724-30958 placement
function emitAdoptWorkflowFailed(e, n, messageQueue, r = "") {
  let s = e.withholdScriptFromSdkEvents === true ? "" : manualWorkflowResumeHint(e, r);
  let d = `Background workflow "${noticeDescriptionOf(e.description)}" was checkpointed for the background fork but could not be resumed (${noticeFieldOf(n, MAX_NOTICE_TEXT_CHARS, regExp_2) ?? UNREPEATED_REASON}).${s}`;
  enqueueFailedTaskNotification(e.taskId, d, messageQueue);
}
//@ chunk-jbv0t0w5.js:30958-31774 placement
/**
 * 提示里路径字段的最大字符数（4096）。
 */
var NOTICE_FIELD_CHARS = 16000;
var MAX_NOTICE_PATH_CHARS = 4096;
var MAX_NOTICE_TEXT_CHARS = 1000;
var NOTICE_SAFE_CHARS = "!#$%&(*+,\\-./:;<=>?@[\\\\\\]^_{|~\\u00b7\\u2013\\u2014\\u3001\\u3002";
var NOTICE_SAFE_CHARS_WITH_CLOSE = `${NOTICE_SAFE_CHARS})}`;
var regExp = new RegExp(
  `^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '${NOTICE_SAFE_CHARS_WITH_CLOSE}])*$`,
  "u",
);
var regExp_2 = new RegExp(`^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '${NOTICE_SAFE_CHARS}])*$`, "u");
var regExp_3 = new RegExp(
  `^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '"${NOTICE_SAFE_CHARS_WITH_CLOSE}])*$`,
  "u",
);
var COMBINING_MARK_CLASS =
  "\\u030b\\u030d-\\u030f\\u0312-\\u0315\\u0329\\u0334-\\u0338\\u0348\\u0350\\u0351\\u0354-\\u0358\\u0485\\u0486\\u059c-\\u059e\\u08f7-\\u08fd\\u1ab0-\\u1aff\\u1cd4\\u1ce2-\\u1ce8\\u1dce\\u1dfe\\u1dff\\u{10efa}\\u20d2\\u20d3\\u20d8-\\u20da\\u20e5\\u20e6\\u20ea\\u20eb\\u{10a39}\\u{16af0}-\\u{16af4}\\u{1bc9e}\\u{1d167}-\\u{1d169}";
var regExp_4 = new RegExp(
  `[${INVISIBLE_CHAR_CLASSES}\\u02b0-\\u02ff\\u0559\\u07f4\\u07f5\\ua700-\\ua721\\ua788-\\ua78c\\u144a\\ua4f8-\\ua4ff${COMBINING_MARK_CLASS}]|\\\\$`,
  "u",
);
//@ chunk-jbv0t0w5.js:31774-31905 placement
function noticeFieldOf(e, n, regExp_2 = regExp) {
  if (!(foldLookalikeChars(e) === e && normalizeNfkc(e) === e && regExp_2.test(e) && !regExp_4.test(e)))
    return;
  let s = escapeXml(e);
  return s.length <= n || countCodePoints(s) <= n ? s : undefined;
}
//@ chunk-jbv0t0w5.js:31905-32261 placement
/**
 * 生成手动恢复工作流的提示（脚本文件名与运行 id），字段不安全时给出替代说明。
 */
function manualWorkflowResumeHint(e, n) {
  if (e.scriptPath === undefined) return "";
  let o = noticeFieldOf(e.scriptPath, MAX_NOTICE_PATH_CHARS, regExp_2);
  let r = noticeFieldOf(e.workflowRunId, WORKFLOW_RUN_ID_MAX_CHARS);
  if (o === undefined || r === undefined)
    return " Its script's file name or run id holds what this notice does not repeat, so no call to resume it is given.";
  return ` To resume manually: Workflow({scriptPath: ${jsonStringify(o)}, resumeFromRunId: ${jsonStringify(r)}${formatWorkflowArgsTail(e.argsJson)}${n}`;
}
//@ chunk-jbv0t0w5.js:32261-32364 placement
var UNREPEATED_DESCRIPTION = "(a description this notice does not repeat)";
var UNREPEATED_REASON = "a reason this notice does not repeat";
var MAX_NOTICE_DESCRIPTION_CHARS = 1000;
//@ chunk-jbv0t0w5.js:32364-32404 placement
function noticeDescriptionOf(description) {
  return noticeFieldOf(description, MAX_NOTICE_DESCRIPTION_CHARS, regExp_2) ?? UNREPEATED_DESCRIPTION;
}
//@ chunk-jbv0t0w5.js:32404-32620 placement
var UNREPEATED_ARGS_NOTE =
  " The launch's args are not in this call: they are not JSON, are too long or too deeply nested for a notice, or hold characters a notice never repeats. Add them as args, or the run resumes without its input.";
//@ chunk-jbv0t0w5.js:32620-32874 placement
function formatWorkflowArgsTail(argsJson) {
  if (argsJson === undefined) return "}).";
  if (argsJson.length > NOTICE_FIELD_CHARS) return `}).${UNREPEATED_ARGS_NOTE}`;
  let n = safeParseJSON(argsJson, false);
  if (n === null) return argsJson.trim() === "null" ? "})." : `}).${UNREPEATED_ARGS_NOTE}`;
  try {
    let o = noticeFieldOf(jsonStringify(jsonStringify(n)), NOTICE_FIELD_CHARS, regExp_3);
    return o === undefined ? `}).${UNREPEATED_ARGS_NOTE}` : `, args: JSON.parse(${o})}).`;
  } catch {
    return `}).${UNREPEATED_ARGS_NOTE}`;
  }
}
//@ chunk-jbv0t0w5.js:32874-33089 placement
function enqueueFailedTaskNotification(e, n, o, agentId = mainAgentId(), s = "failed") {
  o.enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(e),
      status: s,
      summary: n,
    }),
    agentId,
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    taskId: e,
  });
  emitTaskNotification(e, s, {
    summary: unescapeHtmlEntities(n),
  });
}
//@ chunk-jbv0t0w5.js:33089-33258 placement
function resolveAdoptedScriptPath(scriptPath) {
  let n = validateAdoptPath(() => [getProjectsDir()]).safeParse(scriptPath);
  if (!n.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      n.error.issues[0]?.message ?? "scriptPath rejected",
      "adopt scriptPath rejected",
    );
  return n.data;
}
//@ chunk-jbv0t0w5.js:33258-33357 placement
function mcpSettledForAdopt(e) {
  return e.mcp.clientsInitialized === true && !e.mcp.clients.some((client) => client.type === "pending");
}
//@ chunk-jbv0t0w5.js:33357-33478 placement
function classifyAdoptLinkFailure(e) {
  let n = e.parentAgentId !== undefined;
  let o = e.forkedSkillName !== undefined;
  return {
    emit: n || o,
    excludeFromReconcile: !n && o,
  };
}
//@ chunk-jbv0t0w5.js:33478-33674 placement
function emitAdoptAgentFailed(e, n, taskRegistry, r) {
  let s = `Background agent "${noticeDescriptionOf(e.description ?? e.agentId)}" was checkpointed for the background fork but could not be resumed (${noticeFieldOf(n, MAX_NOTICE_TEXT_CHARS, regExp_2) ?? UNREPEATED_REASON}).`;
  enqueueFailedTaskNotification(e.agentId, s, r, notificationAgentFor(e, taskRegistry));
}
//@ chunk-jbv0t0w5.js:33674-33941 placement
function emitAdoptAgentDenied(e, deniedByPlugin, setAppState, messageQueue) {
  evictTerminalTask(e.agentId, setAppState);
  enqueueFailedTaskNotification(
    e.agentId,
    `Background agent "${noticeDescriptionOf(e.description ?? e.agentId)}" was checkpointed for the background fork and was not resumed (${noticeFieldOf(deniedByPlugin, MAX_NOTICE_TEXT_CHARS, regExp_2) ?? UNREPEATED_REASON}). Sending it a message with ${SENDMESSAGE} asks to resume it again.`,
    messageQueue,
    notificationAgentFor(e, setAppState),
    "stopped",
  );
}
//@ chunk-jbv0t0w5.js:33941-34043 placement
function notificationAgentFor(e, n) {
  return e.parentAgentId !== undefined && isLocalAgent(n.get(e.parentAgentId))
    ? identityAgentId2(e.parentAgentId)
    : mainAgentId();
}
//@ chunk-jbv0t0w5.js:34043-34647 placement
function adoptCron(e, loopWakeFires) {
  let lastFiredAt = Date.now();
  let r = new Set(getSessionCronTasks().map((d) => d.id));
  let s = 0;
  for (let d of e) {
    if (d.prompt.length > MAX_ADOPTED_CRON_PROMPT_CHARS) {
      logFeatureSad("task_local_agent", "adopt_cron_prompt_too_long");
      logForDebugging(
        `[adopt] cron ${singleLineText(d.id, 64)} skipped: prompt is ${d.prompt.length} characters, over the ${MAX_ADOPTED_CRON_PROMPT_CHARS} limit`,
        {
          level: "warn",
        },
      );
      continue;
    }
    let { plugin, ...u } = d;
    if (plugin !== undefined && !isValidPluginName(plugin)) {
      logForDebugging(
        `[adopt] cron ${singleLineText(d.id, 64)} skipped: its plugin name fails the rule for a stored name`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (!r.has(d.id)) {
      addSessionCronTask({
        ...u,
        ...(plugin !== undefined && {
          plugin,
        }),
        ...(d.recurring && {
          lastFiredAt,
        }),
      });
      r.add(d.id);
      s++;
    }
  }
  if (s > 0) {
    if (isKairosCronEnabled()) setScheduledTasksEnabled(true);
  }
  for (let i = 0; i < (loopWakeFires ?? 0); i++) recordLoopWakeFire();
}
//@ chunk-jbv0t0w5.js:34647-35590 placement
function computeAdoptability(e) {
  let n = new Map();
  if (!isAdoptEnabled()) return n;
  let o = (i) => (isLocalAgent(i) ? i.parentAgentId : "agentId" in i ? i.agentId : undefined);
  let r = new Map();
  for (let i of Object.values(e)) {
    if ((i.status !== "running" && i.status !== "pending") || (isLocalAgent(i) && i.forkWorker)) continue;
    let u = o(i);
    if (u !== undefined) {
      let g = r.get(u) ?? [];
      g.push(i);
      r.set(u, g);
    }
  }
  let s = (i) => {
    if (isLocalAgent(i))
      return (
        i.agentType !== "main-session" &&
        i.status === "running" &&
        i.isBackgrounded &&
        i.abortController !== undefined
      );
    if (isLocalShellTask(i))
      return (
        i.kind !== "monitor" &&
        i.status === "running" &&
        i.isBackgrounded &&
        i.shellCommand !== null &&
        i.shellCommand.detach !== undefined
      );
    if (isWorkflowTask(i))
      return (
        i.status === "running" &&
        i.v2Run === undefined &&
        i.scriptPath !== undefined &&
        i.workflowRunId !== undefined &&
        i.abortController !== undefined
      );
    return false;
  };
  let d = (i, u) => {
    u.push(i.id);
    let g = s(i);
    for (let w of r.get(i.id) ?? []) g = d(w, u) && g;
    return g;
  };
  for (let i of Object.values(e)) {
    if (
      !(isLocalAgent(i)
        ? i.parentAgentId === undefined
        : isLocalShellTask(i)
          ? i.agentId === undefined
          : isWorkflowTask(i))
    )
      continue;
    let g = [];
    let w = d(i, g);
    for (let h of g) n.set(h, w);
  }
  return n;
}
//@ chunk-jbv0t0w5.js:35590-35640 placement
function isAdoptableShellTask(e, adoptability) {
  return isLocalShellTask(e) && (adoptability.get(e.id) ?? false);
}
//@ chunk-jbv0t0w5.js:35640-35717 placement
function isAdoptableCron(e, adoptability) {
  return isAdoptEnabled() && (e.agentId === undefined || (adoptability.get(e.agentId) ?? false));
}
//@ chunk-jbv0t0w5.js:35717-35767 placement
function isAdoptableAgentTask(e, adoptability) {
  return isLocalAgent(e) && (adoptability.get(e.id) ?? false);
}
//@ chunk-jbv0t0w5.js:35767-35818 placement
function isAdoptableWorkflowTask(e, adoptability) {
  return isWorkflowTask(e) && (adoptability.get(e.id) ?? false);
}
//@ chunk-jbv0t0w5.js:35818-35859 placement
function isAdoptableTask(e, adoptability) {
  return adoptability.get(e.id) ?? false;
}
//@ chunk-jbv0t0w5.js:35859-35966 placement
function countAdoptable(e, adoptability = computeAdoptability(e)) {
  let o = carriedFrameLiveSlugs(e);
  return (
    count(Object.values(e), (r) => isAdoptableTask(r, adoptability)) +
    count(getSessionCronTasks(), (r) => isAdoptableCron(r, adoptability)) +
    o.size
  );
}
//@ chunk-jbv0t0w5.js:35966-36018 placement
function countAbandonable(tasks, n = computeAdoptability(tasks)) {
  return summarizeBackgroundWork(tasks).count - countAdoptable(tasks, n);
}
//@ chunk-jbv0t0w5.js:36018-36476 placement
function countLiveWorkflowAgents(tasks, adoptability = computeAdoptability(tasks)) {
  let o = 0;
  let r = 0;
  let s = 0;
  for (let d of Object.values(tasks)) {
    if (!isAdoptableWorkflowTask(d, adoptability)) continue;
    let i = 1 / 0;
    for (let u of d.workflowProgress)
      if (u.type === "workflow_agent" && u.state === "error") i = Math.min(i, u.index);
    for (let u of d.workflowProgress) {
      if (u.type !== "workflow_agent") continue;
      if (u.state === "done") {
        if (u.index > i) s++;
        else r++;
      } else if (
        u.state === "progress" ||
        (u.state === "start" && !(u.queuedAt !== undefined && u.startedAt === undefined))
      )
        o++;
    }
  }
  return {
    running: o,
    finished: r,
    rerun: s,
  };
}
//@ chunk-jbv0t0w5.js:36476-36553 placement
function leftArrowNeedsInterstitial(tasks, adoptability = computeAdoptability(tasks)) {
  return (
    countAbandonable(tasks, adoptability) > 0 ||
    carriedFrameLiveSlugs(tasks).size > 0 ||
    countLiveWorkflowAgents(tasks, adoptability).running > 0
  );
}
//@ chunk-jbv0t0w5.js:36553-36625 placement
function countCarriedSince(tasks, carriedAtPress) {
  let o = 0;
  for (let r of carriedFrameLiveSlugs(tasks)) if (!carriedAtPress.has(r)) o++;
  return o;
}
//@ chunk-jbv0t0w5.js:36625-36736 placement
function carriesTasks(payload) {
  return (
    payload.shells.length > 0 ||
    (payload.agents?.length ?? 0) > 0 ||
    (payload.workflows?.length ?? 0) > 0 ||
    payload.cron.length > 0
  );
}
//@ chunk-jbv0t0w5.js:36736-36947 placement
function adoptedCounts(payload) {
  return {
    adopted_shells: payload?.shells.length ?? 0,
    adopted_agents: payload?.agents?.length ?? 0,
    adopted_workflows: payload?.workflows?.length ?? 0,
    adopted_cron: payload?.cron.length ?? 0,
    adopted_frame_live: payload?.frameLive?.length ?? 0,
  };
}
//@ chunk-1dp9p908.js:808-920 placement
function isValidSessionIdForAdopt(e) {
  if (!isSafeIdSegment_2(e)) return false;
  if (normalizeUuidOrNull(e)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9_]*$/.test(e) && decodeTaggedUuid(e) !== undefined;
}
//@ chunk-1dp9p908.js:920-979 placement
/**
 * 判断恢复会话时是否沿用转录里的会话 id。
 */
function isValidAdoptedSessionId(sessionId, options = {}) {
  return options.acceptCustomIds ? isSafeIdSegment_2(sessionId) : isValidSessionIdForAdopt(sessionId);
}
//@ chunk-1dp9p908.js:979-1392 placement
/**
 * 恢复会话时决定是否沿用转录里的会话 id：显式 fork 或无 id 时不沿用；通过接管闸门时沿用，否则记录遥测并以新会话 id 作为 fork 继续。
 */
function resolveResumeSessionAdoption(sessionId, n, i = {}) {
  if (n)
    return {
      adoptedSessionId: null,
      effectiveFork: true,
    };
  if (sessionId === undefined)
    return {
      adoptedSessionId: null,
      effectiveFork: false,
    };
  if (isValidAdoptedSessionId(sessionId, i))
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
export {
  resolveResumeSessionAdoption,
  isValidAdoptedSessionId,
  relinkAdoptedAgentSymlinks,
  ADOPT_ID_PATTERN,
  ADOPT_ID_MAX_CHARS,
  noticeDescriptionOf,
  noticeFieldOf,
  WORKFLOW_RUN_ID_MAX_CHARS,
  writeAdoptJson,
  serializeAdoptable,
  carriesTasks,
  adoptedCounts,
  computeAdoptability,
  countLiveWorkflowAgents,
  isAdoptableTask,
  isCarriedFrameLiveWatch,
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
  isValidSessionIdForAdopt,
  drainUnresumedFrameLive,
  isAdoptableWorkflowTask,
  isAdoptableAgentTask,
  drainUnresumedAdopt,
  dedupFrameLiveNewest,
  collectFrameLiveConsent,
  takeExitRetryFrameLive,
  isAdoptableShellTask,
  serializeAdoptAgent,
  detachAndSerializeShell,
  serializeAdoptWorkflow,
  recordExitRetryFrameLive,
};
