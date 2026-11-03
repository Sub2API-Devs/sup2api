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
import { Ya, networkMountRootCached, normalizeMountPath, ai, yl } from "../networkPaths.js";
import {
  create_2,
  r1i,
  create,
  create_3,
  create_12,
  create_26,
  create_6,
  create_25,
  create_15,
} from "../../../vendor/zod/lib/index.mjs";
import { arrayToEnum_2 } from "../../../vendor/zod/v3/ZodError.js";
import { Tm, isWindowsDevicePath, toUncLongPath } from "../windowsUncPaths.js";
import { uT, cl } from "../pathClassification.js";
import { iM } from "../fsJunctions.js";
import {
  findIntermediateUncJunction,
  NodeFsOperations,
  UNVERIFIED_ANCESTRY,
  hasUntouchableRecordSpelling,
} from "../fsOperations.js";
import { Sx, getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { sanitizeMetadataText } from "../agentMetadata.js";
import { kN } from "../safeIdentifier.js";
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
  oyt,
  getAutoReactSlugs,
  getBootingAutoReactSlugs,
  stopArtifactSupervisors,
} from "../../services/artifactComments/autoReplyNotices.js";
import { logForDebugging } from "../debug.js";
import { pinWriteTarget, openNoFollow } from "../fsSafety/pathRevalidation.js";
import { getPlatform } from "../platform.js";
import { ws } from "../fsFlags.js";
import { captureProcessStartTimeAsync } from "../processIdentity.js";
import { readProcessStartTicks, killIfSameProcess } from "../../daemon/deadProbe.js";
import { Mr, isSafeIdSegment, Vt } from "../agentId.js";
import { Iz } from "../../services/workflow/snapshots.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { NLe, summarizeBackgroundWork } from "../../tasks/backgroundTaskLabels.js";
import { Xye, eW, stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { getLiveState, FT, sIe } from "../../services/liveReplica/liveReplica.js";
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
import { Fue } from "../shutdown/pendingWrites.js";
import { vlo } from "../fsSafety/hardenedRead.js";
import { forkedSkillSidecarPaths, readScopingFromFiles, fLr } from "../../skills/forkedSkillMarkers.js";
import { logError } from "../log.js";
import {
  INVISIBLE_CHAR_CLASSES,
  bv,
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
import { p$e } from "../cronTasks.js";
import { isKairosCronEnabled } from "../../tools/ScheduleCronTool/prompt.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { isWorkflowTask } from "../../tasks/taskKinds.js";
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";

//@ chunk-jbv0t0w5.js:2594-2678 placement
var STALE_THRESHOLD_MS = 120000,
  CLOCK_SKEW_ALLOWANCE_MS = 60000,
  TAKEOVER_ADOPT_WAIT_MS = 4000,
  Ke = 250,
  ADOPT_ID_PATTERN = /^[\w-]+$/,
  ADOPT_ID_MAX_CHARS = 256,
  WORKFLOW_RUN_ID_MAX_CHARS = 128,
  Ge = 16777216;
//@ chunk-jbv0t0w5.js:2678-4249 placement
function validateAdoptPath(e) {
  let n = () => [...e(), ...[]],
    o = (r) => {
      let s = Ya(r) ? networkMountRootCached(r) : null;
      return s === null ? null : normalizeMountPath(s);
    };
  return create_2().transform((r, s) => {
    let d = (S) => (s.addIssue({ code: arrayToEnum_2.custom, message: S }), r1i),
      i,
      u = () => {
        if (i === void 0) {
          let S = n(),
            filtered = S.map(Tm).filter((A) => A !== null);
          i = { allowed: filtered, anchor: [...S, ...filtered] };
        }
        return i;
      };
    if (isWindowsDevicePath(r)) return d(`adopt path is remote UNC: ${r}`);
    let g = toUncLongPath(r);
    if (uT(g) || iM(g) || (g !== r && /[. ](?:[\\/]|$)/.test(g)))
      return d(
        `adopt path is a Windows device-namespace spelling (\\\\?\\, \\\\.\\ or \\??\\) other than a plain \\\\?\\<drive>:\\ path: ${r}`,
      );
    if (((r = g), !isAbsolute(r) || cl(r)))
      return d(`adopt path is not an absolute, dot-free spelling: ${r}`);
    let w = o(r),
      h = w !== null && w.startsWith("/net/") ? u().anchor.filter((S) => o(S) === w) : [];
    if (w !== null && h.length === 0)
      return d(
        w.startsWith("/net/")
          ? `adopt path is on an automount host (or map) none of the allowed roots live on: ${r}`
          : `adopt path is under the macOS /Network/Servers automount directory, refused regardless of the allowed roots: ${r}`,
      );
    let y = findIntermediateUncJunction(
      NodeFsOperations,
      r,
      h.length > 0 ? { anchors: h, unreadableAncestry: "unverified", surfaceNetworkRaw: !0 } : void 0,
    );
    if (y === UNVERIFIED_ANCESTRY)
      return d(
        `adopt path runs through a directory that could not be examined or a symlink chain too long to follow: ${r}`,
      );
    if (y !== void 0) return d(`adopt path traverses symlink/junction to remote UNC: ${y}`);
    let T = Tm(r);
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
function Xe() {
  return [Sx()];
}
//@ chunk-jbv0t0w5.js:4276-4322 placement
function re() {
  return create_2().max(ADOPT_ID_MAX_CHARS).regex(ADOPT_ID_PATTERN);
}
/**
 * 被接管的后台 shell 条目的 schema：任务 id、pid、启动时间、命令与描述等。
 */
//@ chunk-jbv0t0w5.js:4322-4687 placement
function adoptShellEntrySchema(e) {
  return create({
    taskId: re(),
    pid: create_3().int().positive(),
    procStart: create_2().optional(),
    startTimeTicks: create_3().int().optional(),
    command: create_2().transform((n) => sanitizeMetadataText(n) ?? ""),
    description: create_2().transform((n) => sanitizeMetadataText(n) ?? ""),
    outputPath: validateAdoptPath(e),
    lastReportedTotalLines: create_3().int(),
    toolUseId: create_12().transform(kN).optional(),
    kind: create_26(["bash", "monitor"]).optional(),
    agentId: re().optional(),
  });
}
//@ chunk-jbv0t0w5.js:4687-5786 placement
var ADOPT_CRON_SCHEMA = DoctorLazy(() => adoptShellEntrySchema(Xe)),
  he = 1e5,
  Je = DoctorLazy(() =>
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
      keepalive: create_25(!0).optional(),
    }),
  ),
  Qe = DoctorLazy(() =>
    create({
      taskId: re(),
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
  ),
  Ze = DoctorLazy(() =>
    create({
      agentId: re(),
      agentType: create_2().optional(),
      description: create_2()
        .transform((e) => sanitizeMetadataText(e))
        .optional(),
      toolUseId: create_12().transform(kN).optional(),
      spawnDepth: create_3().int().optional(),
      startTime: create_3().optional(),
      transcriptPath: validateAdoptPath(() => [getProjectsDir()]).optional(),
      parentAgentId: re().optional(),
      forkedSkillName: create_2().min(1).max(256).optional(),
    }),
  ),
  qe = DoctorLazy(() =>
    create({
      slug: create_2().uuid(),
      title: create_2().min(1).max(256).optional(),
      writtenAtMs: create_3().finite().optional(),
      unattendedReplies: create_3().int().min(0).max(oyt).optional(),
    }),
  );
/**
 * 接管文件的 schema：写入时间、来源、shell 列表、定时任务、循环唤醒次数与子代理等。
 */
//@ chunk-jbv0t0w5.js:5786-6117 placement
function adoptFileSchema(e = ADOPT_CRON_SCHEMA()) {
  return create({
    writtenAtMs: create_3(),
    origin: create_26(["background", "exit"]).optional(),
    shells: create_15(e),
    cron: create_15(Je()),
    loopWakeFires: create_3().int().nonnegative().optional(),
    agents: create_15(Ze()).optional(),
    workflows: create_15(Qe()).optional(),
    frameLive: create_15(qe()).optional(),
    prefill: create({
      text: create_2(),
      boundaryUuid: create_2().max(ADOPT_ID_MAX_CHARS).optional(),
    }).optional(),
  });
}
//@ chunk-jbv0t0w5.js:6117-6136 placement
var Fe = DoctorLazy(() => adoptFileSchema());
//@ chunk-jbv0t0w5.js:6136-6211 placement
function Oe(e) {
  let n = Array.isArray(e) ? e : [e];
  return adoptFileSchema(adoptShellEntrySchema(() => [Sx(), ...n]));
}
//@ chunk-jbv0t0w5.js:6211-6227 placement
var de = 67108864;
//@ chunk-jbv0t0w5.js:6227-8864 placement
async function detachAndSerializeShell(e, n) {
  let o = await e.shellCommand?.detach?.();
  if (o === void 0) return null;
  let path = e.shellCommand.taskOutput.path,
    s = n?.rerootOutputsTo;
  if (s !== void 0) {
    let d = async (u) => {
        logForDebugging(`[adopt] dropping shell ${e.id} from the handoff (${u})`, { level: "error" });
        try {
          await e.shellCommand?.kill?.();
        } catch {}
        return null;
      },
      i = !1;
    try {
      if (ai(path) || yl(path)) throw Error("network-spelled output path");
      let u = findIntermediateUncJunction(NodeFsOperations, path);
      if (u === UNVERIFIED_ANCESTRY) throw Error("output path has a symlink chain too long to vet");
      if (u !== void 0) throw Error("output path traverses a junction to remote UNC");
      if ((await lstat(path)).isSymbolicLink()) {
        let T = await readlink(path);
        if (ai(T) || yl(T)) throw Error("network-spelled symlink target");
        let v = isAbsolute(T) ? T : join(dirname(path), T);
        if (ai(v) || yl(v)) throw Error("network-spelled symlink hop");
        let P = findIntermediateUncJunction(NodeFsOperations, v);
        if (P === UNVERIFIED_ANCESTRY) throw Error("symlink target has a symlink chain too long to vet");
        if (P !== void 0) throw Error("symlink target traverses a junction to remote UNC");
        if ((await lstat(v)).isSymbolicLink()) throw Error("multi-hop symlink chain");
      }
      let w = await realpath(path),
        h = await lstat(w);
      i = !0;
      let y = await realpath(s).catch(() => s);
      if (!w.startsWith(y + sep)) {
        if (
          !(await Promise.all([getClaudeTempDirRealpath(), ...[]].map((A) => realpath(A).catch(() => null))))
            .filter((A) => A !== null)
            .some((A) => w.startsWith(A + sep))
        )
          return await d("its output resolves outside the task-output tree");
        let P = join(s, "rerooted", `${e.id}.output`),
          S;
        try {
          S = await pinWriteTarget(P, [P], { createParents: !0, leaf: "replace" });
        } catch {
          return await d("reroot directory not trustworthy");
        }
        let ioPath = S.ioPath;
        try {
          if (!h.isFile()) return await d("gate target is not a regular file");
          if (h.nlink !== 1) return await d("gate target has another name");
          let A = await open(
            w,
            getPlatform() === "windows" ? "r" : constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | ws,
          );
          try {
            let stats = await A.stat();
            if (!stats.isFile() || stats.nlink !== 1 || stats.dev !== h.dev || stats.ino !== h.ino)
              return await d("handle identity mismatch");
            {
              if ((await S.recheckBeforeWrite(), await unlink(ioPath).catch(() => {}), stats.size > de))
                return await d("over-cap escaping output");
              let z;
              try {
                (await S.recheckBeforeWrite(),
                  (z =
                    getPlatform() === "windows"
                      ? await open(ioPath, "wx")
                      : await openNoFollow(
                          ioPath,
                          constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
                          getPlatform(),
                        )));
              } catch {
                return await d("reroot destination not creatable");
              }
              try {
                let B = 0,
                  allocUnsafe = Buffer.allocUnsafe(65536);
                while (B < de) {
                  let { bytesRead: bytesRead } = await A.read(
                    allocUnsafe,
                    0,
                    Math.min(allocUnsafe.length, de - B),
                    B,
                  );
                  if (bytesRead === 0) break;
                  let L = 0;
                  while (L < bytesRead) {
                    let { bytesWritten: bytesWritten } = await z.write(allocUnsafe, L, bytesRead - L);
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
    startTimeTicks: (await readProcessStartTicks(o)) ?? void 0,
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
  let o = n.derivedTranscriptPath ?? getAgentTranscriptPath(Mr(e.agentId));
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
  let o = n.derivedTranscriptDir ?? Iz(e.workflowRunId);
  return {
    taskId: e.id,
    workflowRunId: e.workflowRunId,
    scriptPath: e.scriptPath,
    scriptSha256: e.script ? createHash("sha256").update(e.script).digest("hex") : void 0,
    argsJson: e.args !== void 0 ? jsonStringify(e.args) : void 0,
    description: e.description,
    startTime: e.startTime,
    withholdScriptFromSdkEvents: e.withholdScriptFromSdkEvents,
    transcriptDir: await realpath(o).catch(() => o),
  };
}
//@ chunk-jbv0t0w5.js:9602-9660 placement
function isCarriedFrameLiveWatch(e) {
  return NLe() && Xye(e) && e.frameLive !== void 0;
}
//@ chunk-jbv0t0w5.js:9660-9859 placement
function carriedFrameLiveSlugs(e) {
  let n = new Set();
  if (!NLe()) return n;
  for (let o of Object.values(e))
    if (isCarriedFrameLiveWatch(o) && o.frameLive !== void 0) n.add(o.frameLive.slug);
  for (let o of getAutoReactSlugs()) n.add(o);
  for (let o of getBootingAutoReactSlugs()) n.add(o);
  return n;
}
//@ chunk-jbv0t0w5.js:9859-10186 placement
function collectFrameLiveConsent(e) {
  let { supervisors: supervisors, bootingWiredArms: bootingWiredArms } = getLiveState().live,
    r = getBootingAutoReactSlugs(),
    s = [],
    now = Date.now();
  for (let i of carriedFrameLiveSlugs(e)) {
    let u = supervisors.get(i),
      g = r.has(i) ? bootingWiredArms.get(i) : void 0;
    if (u === void 0 && g === void 0) continue;
    let w = g?.title ?? u?.autoReactWiring?.title,
      h = w !== void 0 && w.length >= 1 && w.length <= 256;
    s.push({ slug: i, writtenAtMs: now, ...(h && { title: w }) });
  }
  return s;
}
//@ chunk-jbv0t0w5.js:10186-12987 placement
async function serializeAdoptable(e, n) {
  let o = computeAdoptability(e),
    filtered = Object.values(e).filter((m) => isAdoptableShellTask(m, o)),
    filtered_2 = Object.values(e).filter((m) => isAdoptableAgentTask(m, o)),
    filtered_3 = Object.values(e).filter((m) => isAdoptableWorkflowTask(m, o)),
    filtered_4 = getSessionCronTasks().filter((m) => isAdoptableCron(m, o));
  if (
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    filtered_4.length === 0 &&
    collectFrameLiveConsent(e).length === 0
  )
    return null;
  let filtered_5 = (
      await Promise.all(filtered.map((m) => detachAndSerializeShell(m, { rerootOutputsTo: Sx() })))
    ).filter((m) => m !== null),
    results = await Promise.all(filtered_2.map((m) => serializeAdoptAgent(m))),
    results_2 = await Promise.all(filtered_3.map((m) => serializeAdoptWorkflow(m))),
    h = collectFrameLiveConsent(e),
    y = new Set(h.map((m) => m.slug)),
    mapped = Object.values(e)
      .filter((m) => isCarriedFrameLiveWatch(m) && m.frameLive !== void 0 && y.has(m.frameLive.slug))
      .map((m) => m.id);
  if (
    filtered_5.length === 0 &&
    results.length === 0 &&
    results_2.length === 0 &&
    filtered_4.length === 0 &&
    h.length === 0
  )
    return null;
  let v = !1,
    P = !1,
    S = (m) => {
      if (P) return;
      ((P = !0), forgetCommentMonitorIntents(y), stopArtifactSupervisors(y));
      let A = new Set(mapped);
      if (y.size > 0) {
        for (let E of Object.values(m.all()))
          if (eW(E) && E.status === "running" && E.frameLive !== void 0 && y.has(E.frameLive.slug))
            A.add(E.id);
      }
      for (let E of A) stopMonitorWsTasks(E, m, { quiet: !0 });
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
      ...(getLoopWakeFires() > 0 && { loopWakeFires: getLoopWakeFires() }),
      agents: results,
      workflows: results_2,
      ...(h.length > 0 && { frameLive: h }),
    },
    checkpointAgents: async (m) => {
      for (let A of filtered_3)
        (A.abortController?.abort(userAbortReason("background")), pauseWorkflowTask(A.id, m));
      if (results.length === 0) return;
      for (let A of filtered_5) if (A.agentId !== void 0) m.remove(A.taskId);
      for (let A of filtered_2) A.abortController.abort(userAbortReason("background"));
      (await yieldToEventLoop(),
        await flushSessionStorage().catch((A) => {
          (logFeatureSad("task_local_agent", "adopt_checkpoint_flush_failed"),
            logForDebugging(`[adopt] checkpoint flush: ${A}`, { level: "warn" }));
        }));
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
      v = !0;
      for (let m of filtered)
        try {
          m.shellCommand?.kill();
        } catch (error) {
          logForDebugging(`[adopt] abandon ${m.id}: ${error}`, { level: "warn" });
        }
      for (let m of filtered_2) {
        let A = `Background agent "${noticeDescriptionOf(m.description)}" was checkpointed for the background fork but the fork failed to spawn; the agent was not resumed.`;
        enqueueFailedTaskNotification(m.agentId, A, n);
      }
      if (filtered_2.length > 0) logFeatureSad("task_local_agent", "adopt_spawn_failed");
      for (let m of filtered_3) {
        let A =
            m.withholdScriptFromSdkEvents === !0
              ? ""
              : manualWorkflowResumeHint(
                  {
                    workflowRunId: m.workflowRunId ?? "",
                    scriptPath: m.scriptPath,
                    argsJson: m.args !== void 0 ? jsonStringify(m.args) : void 0,
                  },
                  "",
                ),
          E = `Background workflow "${noticeDescriptionOf(m.description)}" was checkpointed for the background fork but the fork failed to spawn; it was not resumed.${A}`;
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
        if (h.length > 0) logFeatureSad("artifact_live_subscribe", "adopt_spawn_failed");
      }
    },
  };
}
//@ chunk-jbv0t0w5.js:12987-13445 placement
function dedupFrameLiveNewest(e) {
  let n = new Map();
  for (let o of e)
    for (let entry of o.entries) {
      let s = { ...entry, writtenAtMs: entry.writtenAtMs ?? o.fallbackBasis },
        d = n.get(entry.slug),
        min = Math.min((d?.unattendedReplies ?? 0) + (entry.unattendedReplies ?? 0), oyt),
        u = d === void 0 || s.writtenAtMs > (d.writtenAtMs ?? 0) ? s : d;
      n.set(entry.slug, min > 0 ? { ...u, unattendedReplies: min } : u);
    }
  if (n.size > FT) logFeatureSad("artifact_live_subscribe", "merged_consent_capped");
  return [...n.values()].sort((o, r) => (r.writtenAtMs ?? 0) - (o.writtenAtMs ?? 0)).slice(0, sIe);
}
/**
 * 合并两份 adopt.json：shells/cron/agents/workflows 按各自键去重（先旧后新），frameLive 取最新，其他字段以新值优先。
 */
//@ chunk-jbv0t0w5.js:13445-14095 placement
function mergeAdoptFiles(current, incoming) {
  let mergeUnique = (r, s, d) => [...r, ...s].filter((i, u, g) => g.findIndex((w) => d(w) === d(i)) === u);
  return {
    writtenAtMs: incoming.writtenAtMs,
    origin: incoming.origin ?? current.origin,
    shells: mergeUnique(current.shells, incoming.shells, (r) => r.pid),
    cron: mergeUnique(current.cron, incoming.cron, (r) => r.id),
    ...((incoming.loopWakeFires ?? current.loopWakeFires) !== void 0 && {
      loopWakeFires: incoming.loopWakeFires ?? current.loopWakeFires,
    }),
    agents: mergeUnique(current.agents ?? [], incoming.agents ?? [], (r) => r.agentId),
    workflows: mergeUnique(current.workflows ?? [], incoming.workflows ?? [], (r) => r.taskId),
    ...(((current.frameLive?.length ?? 0) > 0 || (incoming.frameLive?.length ?? 0) > 0) && {
      frameLive: dedupFrameLiveNewest([
        { entries: current.frameLive ?? [], fallbackBasis: current.writtenAtMs },
        { entries: incoming.frameLive ?? [], fallbackBasis: incoming.writtenAtMs },
      ]),
    }),
    prefill: incoming.prefill ?? current.prefill,
  };
}
//@ chunk-jbv0t0w5.js:14095-14329 placement
async function readAdoptJsonFromStorage(e, n) {
  let read = await e.read([STORAGE_SPACES.job(n, ["adopt.json"])]);
  if (!read.ok)
    return (logForDebugging(`[adopt] v5 merge read refused: ${formatStorageError(read.error)}`), null);
  let r = read.value.items[0];
  if (!r.found) return null;
  return Buffer.from(r.value).toString("utf8");
}
//@ chunk-jbv0t0w5.js:14329-15148 placement
async function writeAdoptJson(e, n, o = {}, r) {
  let s = join(e, "adopt.json"),
    d = basename(e),
    i = isStorageV5Enabled() && r !== void 0 && isValidKeySegment(d) && e === getJobDir(d) ? r : void 0,
    u = n;
  try {
    let g = i ? await readAdoptJsonFromStorage(i, d) : await readFile(s, "utf-8");
    if (g !== null && g.length <= 1e6) {
      let safeParse = (o.mergeShellOutputRoot !== void 0 ? Oe(o.mergeShellOutputRoot) : Fe()).safeParse(
        jsonParse(g),
      );
      if (safeParse.success) {
        if (
          safeParse.data.shells.length +
            (safeParse.data.cron?.length ?? 0) +
            (safeParse.data.agents?.length ?? 0) +
            (safeParse.data.workflows?.length ?? 0) +
            (safeParse.data.frameLive?.length ?? 0) <=
          256
        )
          u = mergeAdoptFiles(safeParse.data, n);
      }
    }
  } catch {}
  if (i) {
    let write = await i.write(STORAGE_SPACES.job(d, ["adopt.json"]), jsonStringify(u), {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
      parent: o.parent ?? "mustExist",
    });
    if (!write.ok)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopt.json v5 write failed: ${formatStorageError(write.error)}`,
          "adopt.json v5 write failed",
        ),
        "telemetryCode" in write.error && write.error.telemetryCode !== void 0
          ? { code: write.error.telemetryCode }
          : {},
      );
    return;
  }
  await writeFileAtomic(s, jsonStringify(u));
}
//@ chunk-jbv0t0w5.js:15148-17180 placement
async function readAndConsumeAdoptJson(e, n = {}) {
  if (!e) return null;
  let o = join(e, "adopt.json"),
    r = `${o}.${process.pid}`,
    s = Date.now() + (n.waitMs ?? 0),
    d = !1;
  for (;;)
    try {
      d = await retryFsOp(o, r);
      break;
    } catch (error) {
      let w = getErrnoCode(error);
      if (w === "ENOENT") {
        if (Date.now() < s) {
          await sleep(Ke);
          continue;
        }
        return (logEvent("tengu_adopt_claim", { result: lit("enoent") }), null);
      }
      return (
        logForDebugging(`[adopt] rename failed: ${error}`, { level: "warn" }),
        logEvent("tengu_adopt_claim", {
          result:
            w !== void 0 && TRANSIENT_FS_ERRORS.has(w)
              ? lit("ebusy_gave_up")
              : sanitizedErrCodeForTelemetry(error),
        }),
        null
      );
    }
  let now = Date.now(),
    u = d ? lit("ebusy_retry") : lit("ok");
  try {
    let g = await getMcpAuthCache(r, Ge);
    if (g.kind !== "ok")
      return (
        logForDebugging(`[adopt] carrier not read: ${g.kind}`, { level: "warn" }),
        logEvent("tengu_adopt_claim", { result: lit("not_read") }),
        null
      );
    let content = g.content,
      safeParse = (n.extraShellOutputRoot !== void 0 ? Oe(n.extraShellOutputRoot) : Fe()).safeParse(
        JSON.parse(content),
      );
    if (!safeParse.success)
      return (
        logForDebugging(`[adopt] schema rejected: ${safeParse.error.message}`, { level: "warn" }),
        logEvent("tengu_adopt_claim", { result: lit("schema_rejected") }),
        null
      );
    let T = now - safeParse.data.writtenAtMs;
    if (safeParse.data.origin !== "exit" && T > STALE_THRESHOLD_MS) {
      logForDebugging(`[adopt] stale (age ${T}ms)`, { level: "warn" });
      let v = safeParse.data.frameLive ?? [];
      if (v.length === 0) return (logEvent("tengu_adopt_claim", { result: lit("stale") }), null);
      return (
        logEvent("tengu_adopt_claim", { result: lit("stale"), frame_live_stale: lit("true") }),
        logFeatureSad("artifact_live_subscribe", "carried_consent_stale_dropped"),
        {
          writtenAtMs: safeParse.data.writtenAtMs,
          ...(safeParse.data.origin !== void 0 && { origin: safeParse.data.origin }),
          shells: [],
          cron: [],
          frameLive: v.map((P) => ({
            ...P,
            writtenAtMs: P.writtenAtMs ?? safeParse.data.writtenAtMs,
            stale: !0,
          })),
        }
      );
    }
    if ((safeParse.data.frameLive?.length ?? 0) > 0) {
      let mapped = safeParse.data.frameLive.map((S) => {
          let m = S.writtenAtMs ?? safeParse.data.writtenAtMs,
            A = now - m;
          return A >= -CLOCK_SKEW_ALLOWANCE_MS && A <= STALE_THRESHOLD_MS
            ? { ...S, writtenAtMs: m }
            : { ...S, writtenAtMs: m, stale: !0 };
        }),
        P = count(mapped, (S) => "stale" in S);
      if (P > 0)
        logForDebugging(`[adopt] ${P}/${mapped.length} frameLive entries marked stale`, { level: "warn" });
      return (
        logEvent("tengu_adopt_claim", { result: u, ...(P > 0 && { frame_live_stale: lit("true") }) }),
        Object.assign(safeParse.data, { frameLive: mapped })
      );
    }
    return (logEvent("tengu_adopt_claim", { result: u }), safeParse.data);
  } catch (error) {
    return (
      logForDebugging(`[adopt] read/parse failed: ${error}`, { level: "warn" }),
      logEvent("tengu_adopt_claim", { result: lit("parse_failed") }),
      null
    );
  } finally {
    await unlink(r).catch(() => {});
  }
}
//@ chunk-jbv0t0w5.js:17180-17334 placement
function recordUnresumedAdopt(e, n, o, r) {
  let s = Fue();
  if (n.length === 0 && o.length === 0) {
    s.unresumedAdopt.delete(e);
    return;
  }
  s.unresumedAdopt.set(e, { agents: n, workflows: o, owner: r });
}
//@ chunk-jbv0t0w5.js:17334-17439 placement
function takeUnresumedAdopt(e, n) {
  if (Fue().unresumedAdopt.get(e)?.owner !== n) return { agents: [], workflows: [] };
  return drainUnresumedAdopt(e);
}
//@ chunk-jbv0t0w5.js:17439-17577 placement
function drainUnresumedAdopt(e) {
  let n = Fue(),
    o = n.unresumedAdopt.get(e);
  return (n.unresumedAdopt.delete(e), { agents: o?.agents ?? [], workflows: o?.workflows ?? [] });
}
//@ chunk-jbv0t0w5.js:17577-17737 placement
function recordUnresumedFrameLive(e, n, o) {
  let r = Fue();
  if (n.length === 0) {
    r.unresumedFrameLive.delete(e);
    return;
  }
  r.unresumedFrameLive.set(e, { entries: n.map(({ stale: stale, ...d }) => d), owner: o });
}
//@ chunk-jbv0t0w5.js:17737-17824 placement
function takeUnresumedFrameLive(e, n) {
  if (Fue().unresumedFrameLive.get(e)?.owner !== n) return [];
  return drainUnresumedFrameLive(e);
}
//@ chunk-jbv0t0w5.js:17824-17935 placement
function drainUnresumedFrameLive(e) {
  let n = Fue(),
    o = n.unresumedFrameLive.get(e);
  return (n.unresumedFrameLive.delete(e), o?.entries ?? []);
}
//@ chunk-jbv0t0w5.js:17935-18098 placement
function reparkUnresumedFrameLive(e, n, o) {
  let r = Fue(),
    s = r.unresumedFrameLive.get(e);
  if (n.length === 0 || (s !== void 0 && s.owner !== o)) return;
  r.unresumedFrameLive.set(e, { entries: [...n], owner: o });
}
//@ chunk-jbv0t0w5.js:18098-18332 placement
function releaseReparkedFrameLive(e, n, o) {
  let r = Fue(),
    s = r.unresumedFrameLive.get(e);
  if (s === void 0 || s.owner !== o) return;
  let filtered = s.entries.filter((entry) => entry.slug !== n);
  if (filtered.length > 0) r.unresumedFrameLive.set(e, { entries: filtered, owner: o });
  else r.unresumedFrameLive.delete(e);
}
//@ chunk-jbv0t0w5.js:18332-18403 placement
function recordExitRetryFrameLive(e, n) {
  if (n.length > 0) Fue().exitRetryFrameLive.set(e, [...n]);
}
//@ chunk-jbv0t0w5.js:18403-18528 placement
function takeExitRetryFrameLive(e) {
  if (e === void 0) return [];
  let n = Fue(),
    o = n.exitRetryFrameLive.get(e) ?? [];
  return (n.exitRetryFrameLive.delete(e), o);
}
//@ chunk-jbv0t0w5.js:18528-18634 placement
var RELINK_FALLBACK_ERRNOS = new Set(["EXDEV", "EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EMLINK"]),
  ot = 1048576,
  ADOPT_RELINK_MARK = ".adopt-relink.";
//@ chunk-jbv0t0w5.js:18634-18720 placement = generatePlaceholders (0.792)
function makeAdoptRelinkName(e) {
  return `${e}${ADOPT_RELINK_MARK}${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`;
}
/**
 * 尝试重链接子代理文件，按错误码决定是否回退为复制，并记录采用的方式。
 */
//@ chunk-jbv0t0w5.js:18720-19043 placement
async function relinkOrCopyAgentFile(e, n, o, r) {
  let s;
  try {
    (await r(e, n), (s = "UNVERIFIED"));
  } catch (error) {
    let u = getErrnoCode(error);
    if (u === void 0 || !RELINK_FALLBACK_ERRNOS.has(u)) throw error;
    s = u;
  }
  if (s === "UNVERIFIED") {
    let i = await lstat(n);
    if (i.isFile() && i.dev === o.dev && i.ino === o.ino) return { method: "hardlink", identity: o };
    await unlink(n);
  }
  let d = await copyAdoptedFile(e, n, o);
  return { method: "copy", fallbackCode: s, identity: d };
}
//@ chunk-jbv0t0w5.js:19043-19901 placement
async function copyAdoptedFile(e, n, o) {
  let r = await open(e, constants.O_RDONLY | ws);
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.dev !== o.dev || stats.ino !== o.ino)
      throw Object.assign(Error("adopted file copy source is not the validated inode"), {
        code: "ADOPT_IDENTITY_MISMATCH",
      });
    let d = await open(n, "wx", vlo),
      i = !1;
    try {
      let allocUnsafe = Buffer.allocUnsafe(ot);
      for (;;) {
        let { bytesRead: bytesRead } = await r.read(allocUnsafe, 0, allocUnsafe.length, null);
        if (bytesRead === 0) break;
        let y = 0;
        while (y < bytesRead) {
          let { bytesWritten: bytesWritten } = await d.write(allocUnsafe, y, bytesRead - y);
          if (bytesWritten === 0)
            throw Object.assign(Error("adopted file copy made no progress"), { code: "ADOPT_COPY_STALLED" });
          y += bytesWritten;
        }
      }
      let { dev: dev, ino: ino } = await d.stat();
      return (
        await d.utimes(stats.atime, stats.mtime).catch((h) => {
          logForDebugging(`[adopt] copied file keeps fresh timestamps (${getErrnoCode(h) ?? "error"})`, {
            level: "warn",
          });
        }),
        await d.close(),
        (i = !0),
        { dev: dev, ino: ino }
      );
    } finally {
      if (!i) (await d.close().catch(() => {}), await unlink(n).catch(() => {}));
    }
  } finally {
    await r.close().catch(() => {});
  }
}
/**
 * 把被接管的子代理文件放到目标位置，已存在的非符号链接文件不覆盖。
 */
//@ chunk-jbv0t0w5.js:19901-20290 placement
async function placeAdoptedAgentFile(e, n, o) {
  let r;
  try {
    r = await lstat(n);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  if (r !== void 0 && !r.isSymbolicLink()) {
    if (!r.isFile())
      throw Object.assign(Error("adopted agent name is held by a non-file entry"), {
        code: "ADOPT_NAME_NOT_FILE",
      });
    if (o) return "kept";
  }
  try {
    await retryFsOp(e, n);
  } catch (error) {
    if (r === void 0 || getErrnoCode(error) !== "EEXIST") throw error;
    (await unlink(n), await retryFsOp(e, n));
  }
  return r === void 0 ? "created" : "replaced";
}
/**
 * 接管子代理记录文件：已是普通文件则保留，否则重链接或复制。
 */
//@ chunk-jbv0t0w5.js:20290-20646 placement
async function adoptAgentFile(e, n, o, r, s) {
  if (s) {
    let h = await lstat(e).catch(() => {
      return;
    });
    if (h !== void 0 && !h.isSymbolicLink() && h.isFile()) return { method: "kept", created: null };
  }
  let d = makeAdoptRelinkName(e),
    i = await relinkOrCopyAgentFile(n, d, o, r),
    u = "kept";
  try {
    u = await placeAdoptedAgentFile(d, e, s);
  } finally {
    await unlink(d).catch(() => {});
  }
  let { identity: identity, ...w } = i;
  return u === "kept"
    ? { method: "kept", created: null }
    : { ...w, created: u === "created" ? identity : null };
}
//@ chunk-jbv0t0w5.js:20646-20969 placement
async function linkAdoptedAgentTranscript(e, { storageV5: n, linkFn: o = link } = {}) {
  if (n === void 0) return checkAdoptedForkedSkill(e);
  try {
    let r = await validateAdoptedAgentFiles(e, o);
    if (r.method !== void 0)
      logEvent("tengu_adopt_link", {
        kind: lit("agent"),
        method: fromEnum(r.method),
        fallback_code: sanitizedErrCodeForTelemetry({ code: r.fallbackCode }),
      });
    return r;
  } catch (error) {
    throw (
      logEvent("tengu_adopt_link", {
        kind: lit("agent"),
        method: fromEnum("fail"),
        error_code: sanitizedErrCodeForTelemetry(error),
      }),
      error
    );
  }
}
//@ chunk-jbv0t0w5.js:20969-22492 placement
async function checkAdoptedForkedSkill(e) {
  if (!e.transcriptPath) return {};
  let n = getAgentTranscriptPath(Mr(e.agentId)),
    o = (i) => i.replace(/\.jsonl$/, ".meta.json");
  await stat(o(e.transcriptPath));
  let r = null,
    s,
    d = forkedSkillSidecarPaths(e.transcriptPath);
  if (e.forkedSkillName !== void 0) {
    let i = await readScopingFromFiles(d);
    if (i.status !== "valid")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record is unusable (${i.status})`,
        "adopted forked-skill scoping record unusable",
      );
    if (i.scoping.skillName !== e.forkedSkillName)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record names a different skill`,
        "adopted forked-skill scoping identity mismatch",
      );
    r = { parent: d, fork: forkedSkillSidecarPaths(n) };
  } else {
    let i = await readScopingFromFiles(d);
    switch (i.status) {
      case "absent":
        break;
      case "valid":
        ((r = { parent: d, fork: forkedSkillSidecarPaths(n) }), (s = i.scoping.skillName));
        break;
      case "malformed":
      case "absent-but-marked":
      case "diskless":
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${e.agentId} has an unusable forked-skill scoping record (${i.status})`,
          "adopted forked-skill scoping record unusable",
        );
    }
  }
  if (n === e.transcriptPath) return { forkedSkillNameFromSidecar: s };
  if (
    (await realpath(n).catch(() => {
      return;
    })) === e.transcriptPath
  )
    return { forkedSkillNameFromSidecar: s };
  if ((await mkdir(dirname(n), { recursive: !0 }), r))
    (await unlink(r.fork.provenanceMarker).catch(() => {}),
      await fLr(r.fork.provenanceMarker, e.forkedSkillName ?? s),
      await unlink(r.fork.scoping).catch(() => {}),
      await copyFile(r.parent.scoping, r.fork.scoping));
  for (let [i, u] of [
    [n, e.transcriptPath],
    [o(n), o(e.transcriptPath)],
  ])
    (await unlink(i).catch(() => {}), await symlink(u, i));
  return { forkedSkillNameFromSidecar: s };
}
//@ chunk-jbv0t0w5.js:22492-22541 placement
function Q(e, n) {
  return Object.assign(e, { code: n });
}
//@ chunk-jbv0t0w5.js:22541-25268 placement
async function validateAdoptedAgentFiles(e, n) {
  if (!e.transcriptPath) return {};
  let o = getAgentTranscriptPath(Mr(e.agentId)),
    r = (S) => S.replace(/\.jsonl$/, ".meta.json");
  if (basename(e.transcriptPath) !== basename(o))
    throw Q(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} carrier names a transcript that is not agent-${e.agentId}.jsonl`,
        "adopted agent transcript path has the wrong leaf name",
      ),
      "ADOPT_WRONG_LEAF",
    );
  let [s, d] = await Promise.all([lstat(e.transcriptPath), lstat(r(e.transcriptPath))]);
  if (!s.isFile() || !d.isFile())
    throw Q(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `adopted agent ${e.agentId} parent transcript or .meta.json is not a regular file`,
        "adopted agent parent file is not a regular file",
      ),
      "ADOPT_PARENT_NOT_REGULAR",
    );
  let i = null,
    u,
    g = forkedSkillSidecarPaths(e.transcriptPath);
  if (e.forkedSkillName !== void 0) {
    let S = await readScopingFromFiles(g);
    if (S.status !== "valid")
      throw Q(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record is unusable (${S.status})`,
          "adopted forked-skill scoping record unusable",
        ),
        "ADOPT_SCOPING_UNUSABLE",
      );
    if (S.scoping.skillName !== e.forkedSkillName)
      throw Q(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record names a different skill`,
          "adopted forked-skill scoping identity mismatch",
        ),
        "ADOPT_SCOPING_MISMATCH",
      );
    i = { parent: g, fork: forkedSkillSidecarPaths(o) };
  } else {
    let S = await readScopingFromFiles(g);
    switch (S.status) {
      case "absent":
        break;
      case "valid":
        ((i = { parent: g, fork: forkedSkillSidecarPaths(o) }), (u = S.scoping.skillName));
        break;
      case "malformed":
      case "absent-but-marked":
      case "diskless":
        throw Q(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `adopted agent ${e.agentId} has an unusable forked-skill scoping record (${S.status})`,
            "adopted forked-skill scoping record unusable",
          ),
          "ADOPT_SCOPING_UNUSABLE",
        );
    }
  }
  if (o === e.transcriptPath) return { forkedSkillNameFromSidecar: u, method: "noop" };
  let w = await realpath(dirname(o)).catch(() => {
    return;
  });
  if (w !== void 0 && join(w, basename(o)) === e.transcriptPath)
    return { forkedSkillNameFromSidecar: u, method: "noop" };
  if ((await mkdir(dirname(o), { recursive: !0 }), i))
    (await unlink(i.fork.provenanceMarker).catch(() => {}),
      await fLr(i.fork.provenanceMarker, e.forkedSkillName ?? u),
      await unlink(i.fork.scoping).catch(() => {}),
      await copyFile(i.parent.scoping, i.fork.scoping));
  let h = await lstat(o).catch(() => {
      return;
    }),
    y =
      h !== void 0 &&
      (h.isFile() ||
        (h.isSymbolicLink() &&
          (await realpath(o).catch(() => {
            return;
          })) === e.transcriptPath)),
    T = await adoptAgentFile(r(o), r(e.transcriptPath), d, n, y),
    v;
  try {
    v = await adoptAgentFile(o, e.transcriptPath, s, n, !0);
  } catch (error) {
    if (T.created !== null) {
      let created = T.created;
      await lstat(r(o))
        .then(async (A) => {
          if (A.dev === created.dev && A.ino === created.ino) await unlink(r(o));
        })
        .catch(() => {});
    }
    throw error;
  }
  let P = v.fallbackCode ?? T.fallbackCode;
  if (P !== void 0) {
    let joined = [
      ...(v.method === "copy" ? ["transcript"] : []),
      ...(T.method === "copy" ? ["meta"] : []),
    ].join("+");
    (logForDebugging(
      `[adopt] agent ${e.agentId}: hard link impossible (${P}) \u2014 materialised a copy of ${joined}`,
      { level: "warn" },
    ),
      logFeatureSad("task_local_agent", "adopt_link_fallback_copy"));
  }
  return { forkedSkillNameFromSidecar: u, method: v.method, fallbackCode: P };
}
//@ chunk-jbv0t0w5.js:25268-25442 placement
var AGENT_FILE_NAME_RE = /^agent-[\w-]+\.(?:jsonl|meta\.json)$/,
  RELINK_TEMP_NAME_RE = new RegExp(
    "^agent-[\\w-]+\\.(?:jsonl|meta\\.json)" +
      ADOPT_RELINK_MARK.replace(/[.]/g, "\\.") +
      "\\d+\\.(\\d+)\\.[0-9a-f]{8}$",
  ),
  STALE_RELINK_TEMP_MS = 900000,
  MAX_ADOPTED_AGENT_LINKS = 64;
//@ chunk-jbv0t0w5.js:25442-25630 placement
function parseSubagentTranscriptPath(e, n) {
  let o = relative(e, n);
  if (o === "" || o.startsWith("..") || isAbsolute(o)) return null;
  let parts = o.split(sep);
  if (parts.length < 3 || parts[2] !== "subagents") return null;
  return { session: join(parts[0], parts[1]), depth: parts.length };
}
//@ chunk-jbv0t0w5.js:25630-25819 placement
async function relinkAdoptedAgentSymlinks({ storageV5: e, linkFn: n = link } = {}) {
  if (e === void 0) return;
  try {
    await relinkSweep(getSessionSubagentsDir(), n);
  } catch (error) {
    if (getErrnoCode(error) !== void 0) {
      logForDebugging(`[adopt] relink sweep abandoned: ${error}`, { level: "warn" });
      return;
    }
    logError(error);
  }
}
//@ chunk-jbv0t0w5.js:25819-27973 placement
async function relinkSweep(e, n) {
  let o;
  try {
    o = await readdir(e, { withFileTypes: !0 });
  } catch {
    return;
  }
  let now = Date.now(),
    s = [];
  for (let R of o) {
    let match = RELINK_TEMP_NAME_RE.exec(R.name);
    if (match) {
      if (Math.abs(now - Number(match[1])) > STALE_RELINK_TEMP_MS)
        await unlink(join(e, R.name)).catch(() => {});
      continue;
    }
    if (R.isSymbolicLink() && AGENT_FILE_NAME_RE.test(R.name)) s.push(R.name);
  }
  if (s.length === 0) return;
  let d = (R) => R.replace(/\.(?:jsonl|meta\.json)$/, ""),
    i = new Map();
  for (let R of s) {
    let N = i.get(d(R)) ?? {};
    if (R.endsWith(".jsonl")) N.transcript = R;
    else N.meta = R;
    i.set(d(R), N);
  }
  let u = [...i.entries()],
    g = u.length > 1 ? randomBytes(4).readUInt32BE() % u.length : 0,
    w = [...u.slice(g), ...u.slice(0, g)],
    [h, y] = await Promise.all([realpath(getProjectsDir()).catch(() => null), realpath(e).catch(() => null)]);
  if (h === null || y === null) return;
  let T = parseSubagentTranscriptPath(h, y);
  if (getProjectKeyIfRepresentable(dirname(dirname(e))) === void 0 || T === null || T.depth !== 3) {
    logForDebugging(
      `[adopt] relink sweep: ${s.length} symlinked name(s) left as is (session dir outside the transcript store)`,
      { level: "warn" },
    );
    return;
  }
  let session = T.session,
    P = 0,
    S = 0,
    m = 0,
    A = 0,
    E = [],
    z = (R) => {
      if (R === "copy") S++;
      else P++;
    },
    B = new Set();
  for (let [R, [N, L]] of w.entries()) {
    let filtered = [L.transcript, L.meta].filter((W) => W !== void 0);
    if (A + filtered.length > MAX_ADOPTED_AGENT_LINKS) {
      ((m = w.slice(R).reduce((W, [, O]) => W + Number(!!O.transcript) + Number(!!O.meta), 0)),
        E.push(`${m} more (per-pass cap)`));
      break;
    }
    A += filtered.length;
    try {
      let W = `${N}.jsonl`,
        O =
          L.transcript !== void 0
            ? await checkAdoptedAgentLink(e, W, h, session)
            : await checkAgentMetaFile(e, W);
      if (typeof O === "string") {
        for (let K of filtered)
          E.push(`${K} (${K === L.meta && L.transcript !== void 0 ? "transcript not convertible" : O})`);
        continue;
      }
      let se;
      if (L.meta !== void 0) {
        let K =
          O !== null && O.gate.size === 0
            ? "meta beside an empty transcript"
            : await checkAdoptedAgentLink(e, L.meta, h, session, {
                besideDir: O === null ? void 0 : dirname(O.real),
              });
        if (typeof K === "string") {
          for (let ge of filtered) E.push(`${ge} (${ge === L.meta ? K : "meta not convertible"})`);
          continue;
        }
        se = K;
      }
      if (O !== null) (z(await Se(O, n)), B.add(W));
      if (se !== void 0 && L.meta !== void 0) (z(await Se(se, n)), B.add(L.meta));
    } catch (error) {
      if (getErrnoCode(error) === void 0) logError(error);
      for (let O of filtered) if (!B.has(O)) E.push(`${O} (${getErrnoCode(error) ?? "error"})`);
    }
  }
  if (S > 0) logFeatureSad("task_local_agent", "adopt_link_fallback_copy");
  (logForDebugging(
    `[adopt] relink sweep: ${P} hard-linked, ${S} copied, ${E.length - (m > 0 ? 1 : 0) + m} left as is${E.length > 0 ? ` (${E.slice(0, 5).join(", ")})` : ""}`,
    { level: E.length > 0 || S > 0 ? "warn" : "debug" },
  ),
    logEvent("tengu_adopt_relink", { linked: P, copied: S, left: E.length - (m > 0 ? 1 : 0) + m }));
}
//@ chunk-jbv0t0w5.js:27973-28045 placement
var Z = 65536,
  kt = DoctorLazy(() => create({ agentType: create_2() })),
  wt = DoctorLazy(() => create({ agentId: create_2() }));
//@ chunk-jbv0t0w5.js:28045-28767 placement
async function readAgentMetaSafely(e, n, o) {
  let r = await open(e, constants.O_RDONLY | ws);
  try {
    let stats = await r.stat();
    if (stats.dev !== n.dev || stats.ino !== n.ino) return "target changed during the check";
    if (o.endsWith(".meta.json")) {
      if (stats.size > Z) return "meta too large";
      let g = ke((await readJSONLFile(r)).toString("utf-8"));
      return kt().safeParse(g).success ? void 0 : "not an agent meta";
    }
    if (stats.size === 0) return;
    let sliced = o.slice(6, -6),
      i = await readJSONLFile(r),
      str = i.toString("utf-8");
    if (i.length >= Z && i.indexOf(10) === -1)
      return hasTopLevelAgentId(str, sliced) ? void 0 : "no record naming this agent in the first 64 KiB";
    for (let g of str.split(`
`)) {
      let w = ke(g);
      if (w === null) continue;
      let safeParse = wt().safeParse(w);
      if (safeParse.success && safeParse.data.agentId === sliced) return;
    }
    return "no record naming this agent in the first 64 KiB";
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-jbv0t0w5.js:28767-28818 placement
function ke(e) {
  try {
    return jsonParse(e);
  } catch {
    return null;
  }
}
//@ chunk-jbv0t0w5.js:28818-28966 placement = readJSONLFile (1)
async function readJSONLFile(filePath) {
  let buf = Buffer.allocUnsafe(Z),
    totalRead = 0;
  while (totalRead < Z) {
    let { bytesRead: bytesRead } = await filePath.read(buf, totalRead, Z - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
/**
 * 判断 JSONL 行的顶层对象是否带指定 agentId 字段（逐字符扫描，忽略嵌套）。
 */
//@ chunk-jbv0t0w5.js:28966-29323 placement
function hasTopLevelAgentId(e, n) {
  if (e[0] !== "{") return !1;
  let o = `"agentId":"${n}"`,
    r = 0,
    s = !1,
    d = !1;
  for (let i = 0; i < e.length; i++) {
    let u = e[i];
    if (s) {
      if (d) d = !1;
      else if (u === "\\") d = !0;
      else if (u === '"') s = !1;
      continue;
    }
    if (u === "{" || u === "[") r++;
    else if (u === "}" || u === "]") {
      if ((r--, r === 0)) return !1;
    } else if (u === '"') {
      if (r === 1 && e.startsWith(o, i) && (e[i - 1] === "{" || e[i - 1] === ",")) return !0;
      s = !0;
    }
  }
  return !1;
}
/**
 * 校验交接给后台会话的子代理转录符号链接：目标须为绝对路径、同名、普通文件、位于转录存储内且不属于本会话、身份未在检查期间变化，并检查对应元数据；返回不合格原因或 null。
 */
//@ chunk-jbv0t0w5.js:29323-29986 placement
async function checkAdoptedAgentLink(e, expectedName, o, r, { besideDir: s } = {}) {
  let d = join(e, expectedName),
    targetPath = await readlink(d);
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
  let g = await realpath(targetPath),
    w = parseSubagentTranscriptPath(o, g);
  if (w === null || w.depth < 4 || basename(g) !== expectedName) return "outside the transcript store";
  if (w.session === r) return "this session's own file";
  if (s !== void 0 && dirname(g) !== s) return "not beside its transcript";
  let h = await lstat(g);
  if (!h.isFile() || h.dev !== u.dev || h.ino !== u.ino) return "target changed during the check";
  let y = await readAgentMetaSafely(g, u, expectedName);
  if (y !== void 0) return y;
  return { linkPath: d, real: g, gate: u };
}
//@ chunk-jbv0t0w5.js:29986-30209 placement
async function checkAgentMetaFile(e, n) {
  let o = join(e, n),
    r;
  try {
    r = await lstat(o);
  } catch {
    return "meta without its transcript";
  }
  if (!r.isFile() || r.size === 0) return "meta without its transcript";
  let s = await readAgentMetaSafely(o, r, n);
  return s === void 0 ? null : `transcript ${s}`;
}
//@ chunk-jbv0t0w5.js:30209-30287 placement
async function Se(e, n) {
  return (await adoptAgentFile(e.linkPath, e.real, e.gate, n, !0)).method;
}
//@ chunk-jbv0t0w5.js:30287-30350 placement
function killOrphanedAdoptedShell(e) {
  return killIfSameProcess(e.pid, e.startTimeTicks, e.procStart);
}
//@ chunk-jbv0t0w5.js:30350-30724 placement
async function linkAdoptedWorkflowDir(e) {
  let n = Iz(e.workflowRunId);
  if (n === e.transcriptDir) return;
  if (
    (await realpath(n).catch(() => {
      return;
    })) === e.transcriptDir
  )
    return;
  (await stat(join(e.transcriptDir, "journal.jsonl")), await mkdir(dirname(n), { recursive: !0 }));
  try {
    await unlink(n);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      try {
        await rmdir(n);
      } catch (error) {
        if (getErrnoCode(error) === "ENOTEMPTY") await rm(n, { recursive: !0, force: !0 });
      }
  }
  await symlink(e.transcriptDir, n, void 0);
}
//@ chunk-jbv0t0w5.js:30724-30958 placement
function emitAdoptWorkflowFailed(e, n, o, r = "") {
  let s = e.withholdScriptFromSdkEvents === !0 ? "" : manualWorkflowResumeHint(e, r),
    d = `Background workflow "${noticeDescriptionOf(e.description)}" was checkpointed for the background fork but could not be resumed (${noticeFieldOf(n, pe, regExp_2) ?? UNREPEATED_REASON}).${s}`;
  enqueueFailedTaskNotification(e.taskId, d, o);
}
//@ chunk-jbv0t0w5.js:30958-31774 placement
var NOTICE_FIELD_CHARS = 16000,
  yt = 4096,
  pe = 1000,
  $e = "!#$%&(*+,\\-./:;<=>?@[\\\\\\]^_{|~\\u00b7\\u2013\\u2014\\u3001\\u3002",
  xe = `${$e})}`,
  regExp = new RegExp(`^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '${xe}])*$`, "u"),
  regExp_2 = new RegExp(`^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '${$e}])*$`, "u"),
  regExp_3 = new RegExp(`^(?:\\p{L}[\\p{Mn}\\p{Mc}]{0,4}|[\\p{N}\\p{Sc} '"${xe}])*$`, "u"),
  Tt =
    "\\u030b\\u030d-\\u030f\\u0312-\\u0315\\u0329\\u0334-\\u0338\\u0348\\u0350\\u0351\\u0354-\\u0358\\u0485\\u0486\\u059c-\\u059e\\u08f7-\\u08fd\\u1ab0-\\u1aff\\u1cd4\\u1ce2-\\u1ce8\\u1dce\\u1dfe\\u1dff\\u{10efa}\\u20d2\\u20d3\\u20d8-\\u20da\\u20e5\\u20e6\\u20ea\\u20eb\\u{10a39}\\u{16af0}-\\u{16af4}\\u{1bc9e}\\u{1d167}-\\u{1d169}",
  regExp_4 = new RegExp(
    `[${INVISIBLE_CHAR_CLASSES}\\u02b0-\\u02ff\\u0559\\u07f4\\u07f5\\ua700-\\ua721\\ua788-\\ua78c\\u144a\\ua4f8-\\ua4ff${Tt}]|\\\\$`,
    "u",
  );
//@ chunk-jbv0t0w5.js:31774-31905 placement
function noticeFieldOf(e, n, o = regExp) {
  if (!(bv(e) === e && normalizeNfkc(e) === e && o.test(e) && !regExp_4.test(e))) return;
  let s = escapeXml(e);
  return s.length <= n || countCodePoints(s) <= n ? s : void 0;
}
/**
 * 生成手动恢复工作流的提示（脚本文件名与运行 id），字段不安全时给出替代说明。
 */
//@ chunk-jbv0t0w5.js:31905-32261 placement
function manualWorkflowResumeHint(e, n) {
  if (e.scriptPath === void 0) return "";
  let o = noticeFieldOf(e.scriptPath, yt, regExp_2),
    r = noticeFieldOf(e.workflowRunId, WORKFLOW_RUN_ID_MAX_CHARS);
  if (o === void 0 || r === void 0)
    return " Its script's file name or run id holds what this notice does not repeat, so no call to resume it is given.";
  return ` To resume manually: Workflow({scriptPath: ${jsonStringify(o)}, resumeFromRunId: ${jsonStringify(r)}${formatWorkflowArgsTail(e.argsJson)}${n}`;
}
//@ chunk-jbv0t0w5.js:32261-32364 placement
var UNREPEATED_DESCRIPTION = "(a description this notice does not repeat)",
  UNREPEATED_REASON = "a reason this notice does not repeat",
  MAX_NOTICE_DESCRIPTION_CHARS = 1000;
//@ chunk-jbv0t0w5.js:32364-32404 placement
function noticeDescriptionOf(e) {
  return noticeFieldOf(e, MAX_NOTICE_DESCRIPTION_CHARS, regExp_2) ?? UNREPEATED_DESCRIPTION;
}
//@ chunk-jbv0t0w5.js:32404-32620 placement
var UNREPEATED_ARGS_NOTE =
  " The launch's args are not in this call: they are not JSON, are too long or too deeply nested for a notice, or hold characters a notice never repeats. Add them as args, or the run resumes without its input.";
//@ chunk-jbv0t0w5.js:32620-32874 placement
function formatWorkflowArgsTail(e) {
  if (e === void 0) return "}).";
  if (e.length > NOTICE_FIELD_CHARS) return `}).${UNREPEATED_ARGS_NOTE}`;
  let n = safeParseJSON(e, !1);
  if (n === null) return e.trim() === "null" ? "})." : `}).${UNREPEATED_ARGS_NOTE}`;
  try {
    let o = noticeFieldOf(jsonStringify(jsonStringify(n)), NOTICE_FIELD_CHARS, regExp_3);
    return o === void 0 ? `}).${UNREPEATED_ARGS_NOTE}` : `, args: JSON.parse(${o})}).`;
  } catch {
    return `}).${UNREPEATED_ARGS_NOTE}`;
  }
}
//@ chunk-jbv0t0w5.js:32874-33089 placement
function enqueueFailedTaskNotification(e, n, o, r = mainAgentId(), s = "failed") {
  (o.enqueuePendingNotification({
    value: formatTaskNotification({ taskId: escapeXml(e), status: s, summary: n }),
    agentId: r,
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
    taskId: e,
  }),
    emitTaskNotification(e, s, { summary: unescapeHtmlEntities(n) }));
}
//@ chunk-jbv0t0w5.js:33089-33258 placement
function resolveAdoptedScriptPath(e) {
  let safeParse = validateAdoptPath(() => [getProjectsDir()]).safeParse(e);
  if (!safeParse.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      safeParse.error.issues[0]?.message ?? "scriptPath rejected",
      "adopt scriptPath rejected",
    );
  return safeParse.data;
}
//@ chunk-jbv0t0w5.js:33258-33357 placement
function mcpSettledForAdopt(e) {
  return e.mcp.clientsInitialized === !0 && !e.mcp.clients.some((client) => client.type === "pending");
}
//@ chunk-jbv0t0w5.js:33357-33478 placement
function classifyAdoptLinkFailure(e) {
  let n = e.parentAgentId !== void 0,
    o = e.forkedSkillName !== void 0;
  return { emit: n || o, excludeFromReconcile: !n && o };
}
//@ chunk-jbv0t0w5.js:33478-33674 placement
function emitAdoptAgentFailed(e, n, o, r) {
  let s = `Background agent "${noticeDescriptionOf(e.description ?? e.agentId)}" was checkpointed for the background fork but could not be resumed (${noticeFieldOf(n, pe, regExp_2) ?? UNREPEATED_REASON}).`;
  enqueueFailedTaskNotification(e.agentId, s, r, notificationAgentFor(e, o));
}
//@ chunk-jbv0t0w5.js:33674-33941 placement
function emitAdoptAgentDenied(e, n, o, r) {
  (evictTerminalTask(e.agentId, o),
    enqueueFailedTaskNotification(
      e.agentId,
      `Background agent "${noticeDescriptionOf(e.description ?? e.agentId)}" was checkpointed for the background fork and was not resumed (${noticeFieldOf(n, pe, regExp_2) ?? UNREPEATED_REASON}). Sending it a message with ${SENDMESSAGE} asks to resume it again.`,
      r,
      notificationAgentFor(e, o),
      "stopped",
    ));
}
//@ chunk-jbv0t0w5.js:33941-34043 placement
function notificationAgentFor(e, n) {
  return e.parentAgentId !== void 0 && isLocalAgent(n.get(e.parentAgentId))
    ? Mr(e.parentAgentId)
    : mainAgentId();
}
//@ chunk-jbv0t0w5.js:34043-34647 placement
function adoptCron(e, n) {
  let now = Date.now(),
    r = new Set(getSessionCronTasks().map((d) => d.id)),
    s = 0;
  for (let d of e) {
    if (d.prompt.length > he) {
      (logFeatureSad("task_local_agent", "adopt_cron_prompt_too_long"),
        logForDebugging(
          `[adopt] cron ${singleLineText(d.id, 64)} skipped: prompt is ${d.prompt.length} characters, over the ${he} limit`,
          { level: "warn" },
        ));
      continue;
    }
    let { plugin: plugin, ...u } = d;
    if (plugin !== void 0 && !p$e(plugin)) {
      logForDebugging(
        `[adopt] cron ${singleLineText(d.id, 64)} skipped: its plugin name fails the rule for a stored name`,
        { level: "warn" },
      );
      continue;
    }
    if (!r.has(d.id))
      (addSessionCronTask({
        ...u,
        ...(plugin !== void 0 && { plugin: plugin }),
        ...(d.recurring && { lastFiredAt: now }),
      }),
        r.add(d.id),
        s++);
  }
  if (s > 0) {
    if (isKairosCronEnabled()) setScheduledTasksEnabled(!0);
  }
  for (let d = 0; d < (n ?? 0); d++) recordLoopWakeFire();
}
//@ chunk-jbv0t0w5.js:34647-35590 placement
function computeAdoptability(e) {
  let n = new Map();
  if (!NLe()) return n;
  let o = (i) => (isLocalAgent(i) ? i.parentAgentId : "agentId" in i ? i.agentId : void 0),
    r = new Map();
  for (let i of Object.values(e)) {
    if ((i.status !== "running" && i.status !== "pending") || (isLocalAgent(i) && i.forkWorker)) continue;
    let u = o(i);
    if (u !== void 0) {
      let g = r.get(u) ?? [];
      (g.push(i), r.set(u, g));
    }
  }
  let s = (i) => {
      if (isLocalAgent(i))
        return (
          i.agentType !== "main-session" &&
          i.status === "running" &&
          i.isBackgrounded &&
          i.abortController !== void 0
        );
      if (isLocalShellTask(i))
        return (
          i.kind !== "monitor" &&
          i.status === "running" &&
          i.isBackgrounded &&
          i.shellCommand !== null &&
          i.shellCommand.detach !== void 0
        );
      if (isWorkflowTask(i))
        return (
          i.status === "running" &&
          i.v2Run === void 0 &&
          i.scriptPath !== void 0 &&
          i.workflowRunId !== void 0 &&
          i.abortController !== void 0
        );
      return !1;
    },
    d = (i, u) => {
      u.push(i.id);
      let g = s(i);
      for (let w of r.get(i.id) ?? []) g = d(w, u) && g;
      return g;
    };
  for (let i of Object.values(e)) {
    if (
      !(isLocalAgent(i)
        ? i.parentAgentId === void 0
        : isLocalShellTask(i)
          ? i.agentId === void 0
          : isWorkflowTask(i))
    )
      continue;
    let g = [],
      w = d(i, g);
    for (let h of g) n.set(h, w);
  }
  return n;
}
//@ chunk-jbv0t0w5.js:35590-35640 placement
function isAdoptableShellTask(e, n) {
  return isLocalShellTask(e) && (n.get(e.id) ?? !1);
}
//@ chunk-jbv0t0w5.js:35640-35717 placement
function isAdoptableCron(e, n) {
  return NLe() && (e.agentId === void 0 || (n.get(e.agentId) ?? !1));
}
//@ chunk-jbv0t0w5.js:35717-35767 placement
function isAdoptableAgentTask(e, n) {
  return isLocalAgent(e) && (n.get(e.id) ?? !1);
}
//@ chunk-jbv0t0w5.js:35767-35818 placement
function isAdoptableWorkflowTask(e, n) {
  return isWorkflowTask(e) && (n.get(e.id) ?? !1);
}
//@ chunk-jbv0t0w5.js:35818-35859 placement
function isAdoptableTask(e, n) {
  return n.get(e.id) ?? !1;
}
//@ chunk-jbv0t0w5.js:35859-35966 placement
function countAdoptable(e, n = computeAdoptability(e)) {
  let o = carriedFrameLiveSlugs(e);
  return (
    count(Object.values(e), (r) => isAdoptableTask(r, n)) +
    count(getSessionCronTasks(), (r) => isAdoptableCron(r, n)) +
    o.size
  );
}
//@ chunk-jbv0t0w5.js:35966-36018 placement
function countAbandonable(e, n = computeAdoptability(e)) {
  return summarizeBackgroundWork(e).count - countAdoptable(e, n);
}
//@ chunk-jbv0t0w5.js:36018-36476 placement
function countLiveWorkflowAgents(e, n = computeAdoptability(e)) {
  let o = 0,
    r = 0,
    s = 0;
  for (let d of Object.values(e)) {
    if (!isAdoptableWorkflowTask(d, n)) continue;
    let i = 1 / 0;
    for (let u of d.workflowProgress)
      if (u.type === "workflow_agent" && u.state === "error") i = Math.min(i, u.index);
    for (let u of d.workflowProgress) {
      if (u.type !== "workflow_agent") continue;
      if (u.state === "done")
        if (u.index > i) s++;
        else r++;
      else if (
        u.state === "progress" ||
        (u.state === "start" && !(u.queuedAt !== void 0 && u.startedAt === void 0))
      )
        o++;
    }
  }
  return { running: o, finished: r, rerun: s };
}
//@ chunk-jbv0t0w5.js:36476-36553 placement
function leftArrowNeedsInterstitial(e, n = computeAdoptability(e)) {
  return (
    countAbandonable(e, n) > 0 ||
    carriedFrameLiveSlugs(e).size > 0 ||
    countLiveWorkflowAgents(e, n).running > 0
  );
}
//@ chunk-jbv0t0w5.js:36553-36625 placement
function countCarriedSince(e, n) {
  let o = 0;
  for (let r of carriedFrameLiveSlugs(e)) if (!n.has(r)) o++;
  return o;
}
//@ chunk-jbv0t0w5.js:36625-36736 placement
function carriesTasks(e) {
  return (
    e.shells.length > 0 || (e.agents?.length ?? 0) > 0 || (e.workflows?.length ?? 0) > 0 || e.cron.length > 0
  );
}
//@ chunk-jbv0t0w5.js:36736-36947 placement
function adoptedCounts(e) {
  return {
    adopted_shells: e?.shells.length ?? 0,
    adopted_agents: e?.agents?.length ?? 0,
    adopted_workflows: e?.workflows?.length ?? 0,
    adopted_cron: e?.cron.length ?? 0,
    adopted_frame_live: e?.frameLive?.length ?? 0,
  };
}
//@ chunk-1dp9p908.js:808-920 placement
function isValidSessionIdForAdopt(e) {
  if (!isSafeIdSegment(e)) return !1;
  if (Vt(e)) return !0;
  return /^[A-Za-z0-9][A-Za-z0-9_]*$/.test(e) && decodeTaggedUuid(e) !== void 0;
}
//@ chunk-1dp9p908.js:920-979 placement
function Hir(e, n = {}) {
  return n.acceptCustomIds ? isSafeIdSegment(e) : isValidSessionIdForAdopt(e);
}
/**
 * 恢复会话时决定是否沿用转录里的会话 id：显式 fork 或无 id 时不沿用；通过接管闸门时沿用，否则记录遥测并以新会话 id 作为 fork 继续。
 */
//@ chunk-1dp9p908.js:979-1392 placement
function resolveResumeSessionAdoption(e, n, i = {}) {
  if (n) return { adoptedSessionId: null, effectiveFork: !0 };
  if (e === void 0) return { adoptedSessionId: null, effectiveFork: !1 };
  if (Hir(e, i)) return { adoptedSessionId: e, effectiveFork: !1 };
  return (
    logForDebugging(
      `resume: transcript session id (${typeof e}) rejected by the adoption gate; continuing as a fork under the fresh session id`,
    ),
    logFeatureSad("session_resume", "unadoptable_session_id"),
    { adoptedSessionId: null, effectiveFork: !0 }
  );
}

export {
  resolveResumeSessionAdoption,
  Hir,
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
