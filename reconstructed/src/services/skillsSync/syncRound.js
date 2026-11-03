/**
 * services/skillsSync/syncRound.ts
 *
 * 2.1.316 新增。skills 同步一轮的调度。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hme9amad.js (14)
 * attribution: placement 14
 */
import { join, relative, basename } from "path";
import { writeFile, lstat, lstat as lstat_2, rm, mkdir, readdir, stat, rename, lutimes } from "fs/promises";
import { createSkillCommand, pruneDynamicSkillsNotIn, clearSkillCaches } from "../../skills/loadSkillsDir.js";
import { escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { buildSkillAttribution } from "../../utils/telemetry/skillAttribution.js";
import { frontmatterProblemResult } from "../memorySync/pathScrub.js";
import { raceWithAbortSignal, sleep } from "../../utils/sleep.js";
import {
  startPendingDownload,
  S3n,
  cet,
  parseValidRows,
  uet,
  j1t,
  Zoe,
  det,
  YKs,
  _3n,
  dqs,
  shouldConvertSkillsListAsks,
  mergeRowsByKey,
  y3n,
  pruneSyncedSkillState,
  replaceRowsWithAttribution,
  dfn,
  rqs,
  registerPendingDownload,
  oqs,
  pruneGoneSkillDirs,
} from "../../utils/claudeAiSync/skillsSync.js";
import { AbortError, getErrnoCode, toError, isENOENT } from "../../utils/errors.js";
import { getCommands, clearCommandMemoizationCaches } from "../../commands.js";
import { getProjectRootOrNull, getAccountSkillsSyncEnabled } from "../../bootstrap/state.js";
import { isHostCatalogSkill } from "../../utils/commandPredicates.js";
import {
  DUr,
  LUr,
  W6n,
  ROOT_REFUSED_RESULT,
  a$o,
  G6n,
  buildLocalPlacementFailure,
  zun,
  SYNC_OK,
  verifySyncRoot,
  readSyncMarker,
  checkSyncRoots,
  toPosixLabelPath,
  SyncOwnedRootRefusedError,
  touchExclusive,
  getSyncFailureEvent,
  describeSyncFailure,
  checkSyncOwnedRoot,
} from "../../utils/claudeAiSync/syncOwnedRoot.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import {
  SKILLS_SYNC_DIR,
  MJ,
  SYNCED_MANIFEST_FILE,
  parsePendingClaim,
  syncedItemPath_2,
  LegacyReservedSpellingError,
  getSyncBucket,
  $Jr,
} from "../../utils/plugins/syncedItems.js";
import {
  Y,
  fn,
  moveToSyncTrash,
  $t,
  qt,
  ne,
  xe,
  Hce,
  rt,
  Hn,
  reuseSkillsSyncRound,
  noteHidingFoldersGone,
  readSkillsSyncManifest,
  sessionRefSkillEntry,
  ct,
  Ie,
  trashStraySyncEntries,
  resolveSkillsBucket,
  $n,
  assignSkillDirs,
  un,
  hasSyncedSkillMd,
  writeSkillsSyncManifest,
  SKILLS_MANIFEST_SCHEMA,
  nt,
  Be,
  noteBucketGeneration,
  ye,
  firstListDeferred,
  ln,
  readSyncedSkillMd,
  Fe,
  jn,
  isSkillMdMissing,
  Yt,
} from "./skillsSync.js";
import { tmpdir } from "../../utils/tempDir.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { downloadOrgSkillZip, Aln } from "./orgSkillsApi.js";
import { readAndUnzipFile } from "../../utils/dxt/zip.js";
import { containsGitDirectory, ifn, createLiveEntryClassifier } from "../../utils/plugins/fileIdentity.js";
import {
  recordMountMiss,
  COLLISION_LOSER,
  nii,
  createHostSkillReader,
  hrr,
} from "../../skills/hostSkillMounts.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { readFileChecked } from "../../utils/fileRead.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { updateSessionConvertedSkillsAsk } from "../../utils/concurrentSessions.js";
import { isSessionRefsSyncEnabled } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { zqe } from "../plugins/accountSync/sessionSkillManifest.js";
import { env } from "../../utils/env.js";
import { Hee } from "../plugins/accountSync/syncedPluginHooks.js";
import { listErrorTelemetry } from "../plugins/accountSync/listPlugins.js";
import { logEvent } from "../analytics/index.js";
import { Jz } from "../../utils/plugins/pluginsChangedSignal.js";
import { getProcessStartTimeAsync, isSameProcessAsync } from "../../utils/processIdentity.js";
import { logError } from "../../utils/log.js";
import { limitConcurrency, Idi } from "../../utils/concurrencyLimit.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";

/**
 * 为尚未下载正文的同步 skill 创建占位命令；调用时等待下载完成再转交真正的命令，失败时返回「Skill X could not be downloaded … Proceed without it.」。
 */
//@ chunk-hme9amad.js:13495-14841 placement = createSkillCommand (0.55)
function createDeferredSyncedSkillCommand(e, n, s) {
  let t = createSkillCommand({
    skillName: e,
    displayName: void 0,
    description: escapeXmlInline(n.description),
    hasUserSpecifiedDescription: !0,
    markdownContent: "",
    allowedTools: [],
    argumentHint: void 0,
    argumentNames: [],
    whenToUse: void 0,
    version: void 0,
    model: void 0,
    disableModelInvocation: n.disableModelInvocation ?? !1,
    userInvocable: n.userInvocable ?? !0,
    source: "userSettings",
    baseDir: s,
    serverAttribution: buildSkillAttribution(n.skillId, n.backingPluginId),
    loadedFrom: "syncedSkills",
    hooks: void 0,
    executionContext: void 0,
    agent: void 0,
    paths: void 0,
    effort: void 0,
    shell: void 0,
    skillFile: frontmatterProblemResult(
      "was not read: this command was listed before its file was downloaded",
    ),
  });
  if (t?.type === "prompt")
    t.getPromptForCommand = async (d, w) => {
      let h = await raceWithAbortSignal(
        startPendingDownload(e),
        w.abortController.signal,
        () => new AbortError(),
      );
      if (h.ok) {
        let found = (await getCommands(getProjectRootOrNull(), w.storageV5)).find(
          (D) =>
            D.loadedFrom === "syncedSkills" &&
            isHostCatalogSkill(D) === isHostCatalogSkill(t) &&
            D.name === t.name &&
            D.type === "prompt" &&
            D.getPromptForCommand !== t.getPromptForCommand,
        );
        if (found && found.type === "prompt")
          return (
            (t.source = found.source),
            (t.skillRoot = found.skillRoot),
            (t.skillFile = found.skillFile),
            (t.contentLength = found.contentLength),
            (t.progressMessage = found.progressMessage),
            (t.userInvocable = found.userInvocable),
            found.getPromptForCommand(d, w)
          );
      }
      let y = h.ok ? "skill not found after download" : h.reason;
      return [
        {
          type: "text",
          text:
            !h.ok && h.withheld
              ? `${S3n(t.name)} Proceed without it.`
              : `Skill ${e} could not be downloaded (${y}). Proceed without it.`,
        },
      ];
    };
  return t;
}
//@ chunk-hme9amad.js:14841-14955 placement
function checkSkillsSyncRoot(e, n) {
  return DUr({
    root: () => n,
    configHome: getClaudeConfigDir,
    rootLabel: SKILLS_SYNC_DIR,
    event: "skills_sync_root_refused",
    storageV5: e,
  });
}
//@ chunk-hme9amad.js:14955-15041 placement
var ut = LUr("zip fetch failed"),
  Pe = W6n("skill archive unusable or landing obstructed");
//@ chunk-hme9amad.js:15041-16971 placement
async function downloadSyncedSkill(
  e,
  {
    round: round,
    credentials: credentials,
    storageV5: storageV5,
    replacesAttributedCopy: replacesAttributedCopy,
    targetHeldSkillFile: targetHeldSkillFile,
    classifyOccupant: classifyOccupant,
    markTargetDestroyed: markTargetDestroyed,
    noteDownloadedBytes: noteDownloadedBytes,
  },
  R,
) {
  let root = round.root,
    M = Y(root, e.name),
    S = join(fn(root), relative(root, M)),
    O = join(tmpdir(), `claude-skill-${process.pid}-${Math.random().toString(36).slice(2)}.zip`);
  try {
    if (round.guard.refused()) return ROOT_REFUSED_RESULT;
    if (R !== void 0) await writeFile(O, R);
    else {
      if (
        !replacesAttributedCopy &&
        targetHeldSkillFile &&
        (await classifyOccupant(basename(M))) === "inFlight"
      )
        return (logForDiagnosticsNoPII("info", "skills_sync_target_in_flight_elsewhere"), a$o);
      if (
        !(await downloadOrgSkillZip(e.skillId, O, e.requestedVersion, {
          isBackground: !0,
          credentials: credentials,
        }))
      )
        return ut;
      noteDownloadedBytes((await lstat(O).catch(() => null))?.size ?? 0);
    }
    if (!(await round.guard.verify())) return ROOT_REFUSED_RESULT;
    (await rm(S, { recursive: !0, force: !0 }),
      await mkdir(fn(root), { recursive: !0 }),
      await readAndUnzipFile(O, S, { skipEntry: (C) => C.split(/[\\/]/).some((W) => MJ(W)) }));
    let I = S,
      B = await readdir(S, { withFileTypes: !0 });
    if (!B.some((C) => C.name === "SKILL.md") && B.length === 1 && B[0].isDirectory()) I = join(S, B[0].name);
    try {
      if (!(await stat(join(I, "SKILL.md"))).isFile())
        return (logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable"), Pe);
    } catch {
      return (logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable"), Pe);
    }
    if (await containsGitDirectory(I))
      return (logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable"), Pe);
    if (!(await round.guard.verify())) return ROOT_REFUSED_RESULT;
    if (replacesAttributedCopy) await rm(M, { recursive: !0, force: !0 });
    try {
      await rename(I, M);
    } catch (error) {
      let W = getErrnoCode(error);
      if (replacesAttributedCopy || !G6n(W)) {
        if (replacesAttributedCopy) markTargetDestroyed();
        return (
          logForDiagnosticsNoPII("warn", "skills_sync_promotion_failed", { code: W ?? "unknown" }),
          buildLocalPlacementFailure(W)
        );
      }
      let de = await classifyOccupant(basename(M));
      if (de === "inFlight")
        return (logForDiagnosticsNoPII("info", "skills_sync_target_in_flight_elsewhere"), a$o);
      if (de === "landed") await rm(M, { recursive: !0, force: !0 });
      else if (!(await moveToSyncTrash(M, storageV5))) return zun;
      try {
        await rename(I, M);
      } catch (error) {
        markTargetDestroyed();
        let ke = getErrnoCode(error);
        return (
          logForDiagnosticsNoPII("warn", "skills_sync_promotion_failed", { code: ke ?? "unknown" }),
          buildLocalPlacementFailure(ke)
        );
      }
    }
    return SYNC_OK;
  } finally {
    if (
      (await rm(O, { force: !0 }).catch(() => {}),
      !round.guard.refused() &&
        (await verifySyncRoot(
          root,
          getClaudeConfigDir(),
          { event: "skills_sync_root_refused", phase: "sweep", rootLabel: SKILLS_SYNC_DIR },
          { checkStagingLeaf: !0, storageV5: storageV5 },
        ).catch(() => null)) === "real")
    )
      await rm(S, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-hme9amad.js:16971-16982 placement
var ri = 500;
//@ chunk-hme9amad.js:16982-17116 placement
async function downloadWithRetry(e, n) {
  try {
    return await downloadSyncedSkill(e, n, void 0);
  } catch {
    return (
      logForDiagnosticsNoPII("warn", "skills_sync_extract_retry"),
      await sleep(ri),
      downloadSyncedSkill(e, n, void 0)
    );
  }
}
//@ chunk-hme9amad.js:17116-17404 placement
async function landSyncedSkill(e, n) {
  let { fromHostMount: fromHostMount } = n;
  if (fromHostMount !== void 0) {
    let t = await downloadSyncedSkill(e, n, fromHostMount.zip).catch(() => null);
    if (t?.ok) n.markLandedFromHostMount();
    if (t !== null && (t.ok || t.cause !== "extract")) return t;
    recordMountMiss(
      fromHostMount.kind,
      { reason: t === null ? "landing_threw" : "zip_unusable" },
      n.hostMountMissCounts,
    );
  }
  return downloadWithRetry(e, n);
}
/**
 * 启动一轮技能同步；已有同步进行时复用同一 Promise。
 */
//@ chunk-hme9amad.js:17404-17561 placement
async function runSyncRoundOnce(e, n, s, t) {
  let d = remoteToolsState();
  if (d.syncPromise) return d.syncPromise;
  return (
    (d.syncPromise = runSkillsSyncRound(e, n, s, t).finally(() => {
      d.syncPromise = null;
    })),
    d.syncPromise
  );
}
//@ chunk-hme9amad.js:17561-18945 placement
async function reconcileSkillsManifest(e, n) {
  let s = join(e, SYNCED_MANIFEST_FILE),
    t,
    d,
    w;
  try {
    ((d = (await readFileChecked(s, cet)).content), (w = jsonParse(d)));
  } catch {
    return null;
  }
  let safeParse = $t().safeParse(w);
  if (safeParse.success) {
    let {
      lastUpdated: lastUpdated,
      skills: skills,
      staleDirs: staleDirs,
      pendingClaims: pendingClaims,
      ...C
    } = safeParse.data;
    t = {
      ...C,
      lastUpdated: lastUpdated,
      skills: parseValidRows(qt(), skills),
      staleDirs: uet(staleDirs),
      pendingClaims: uet(pendingClaims),
    };
  } else return null;
  let y = [
      ...t.skills.map((skill) => ({ row: skill, syntheticListName: null })),
      ...["staleDirs", "pendingClaims"].flatMap((S) =>
        (t[S] ?? []).map((O) => ({
          row: { name: S === "pendingClaims" ? parsePendingClaim(O).name : O },
          syntheticListName: S,
          entry: O,
        })),
      ),
    ],
    b = 0,
    R = [],
    D = [],
    M = [];
  for (let S of y) {
    let row = S.row;
    if (S.syntheticListName === "pendingClaims" && (await isClaimOwnerAlive(S.entry))) {
      M.push(S.entry);
      continue;
    }
    try {
      let I = syncedItemPath_2(row.name, e);
      if (await ifn(I, ne())) {
        logForDiagnosticsNoPII("info", "skills_sync_sibling_root_row_skipped");
        continue;
      }
      if (await ifn(I, xe())) {
        logForDiagnosticsNoPII("info", "skills_sync_trash_root_row_skipped");
        continue;
      }
      if (await moveToSyncTrash(I, n)) b++;
      else if (S.syntheticListName === "staleDirs") D.push(S.entry);
      else if (S.syntheticListName === "pendingClaims") M.push(S.entry);
      else R.push(S.row);
    } catch (error) {
      if (error instanceof LegacyReservedSpellingError) {
        if (S.syntheticListName === "staleDirs") D.push(S.entry);
        else if (S.syntheticListName === "pendingClaims") M.push(S.entry);
        else R.push(S.row);
        continue;
      }
    }
  }
  if (R.length > 0 || D.length > 0 || M.length > 0) {
    let S = jsonStringify(
      { ...t, skills: R, staleDirs: D.length > 0 ? D : void 0, pendingClaims: M.length > 0 ? M : void 0 },
      null,
      2,
    );
    if (S !== d) await writeFileAtomic(s, S).catch(() => {});
  } else await rm(s, { force: !0 }).catch(() => {});
  return b;
}
/**
 * claude.ai skills 同步一轮：检查开关与账号选择、解析 bucket、下载 skill zip 解压到同步目录、清理过期目录、记录 skills_sync_round 遥测；支持睡眠唤醒后的重同步。
 */
//@ chunk-hme9amad.js:18945-30122 placement
async function runSkillsSyncRound(e, n, s, t) {
  let now = Date.now(),
    startTime = performance.now(),
    h = !1,
    y = !1,
    b = !1,
    R = !1,
    D = 0,
    M = 0,
    S = () => {
      let x = Date.now() - now;
      return {
        account_opt_in: b,
        idle: R,
        woken: "woken" in t,
        trigger: fromEnum(t.trigger),
        ...("tickLateMs" in t && { tick_late_ms: t.tickLateMs }),
        ...(D > 0 && { kept: D }),
        ...(M > 0 && { approx_downloaded_bytes: Number(M.toPrecision(2)) }),
        duration_ms: x,
        suspended_ms: Math.max(0, Math.round(x - (performance.now() - startTime))),
      };
    },
    O = new Map(),
    I = !1,
    B = null,
    C = remoteToolsState(),
    W = !1,
    de = null,
    Me = new Set(),
    ke = !1;
  try {
    if (((b = getAccountSkillsSyncEnabled()), j1t())) b = !0;
    if (!Zoe(e) || !det()) {
      logForDiagnosticsNoPII("info", "skills_sync_gate_closed");
      let { placeholders: placeholders, listedOwnerships: listedOwnerships } = remoteToolsState();
      if ((listedOwnerships.clear(), placeholders.size > 0)) (placeholders.clear(), Hce());
      logFeatureSad("skills_sync_round", "gate_closed", S());
      return;
    }
    if (YKs()) {
      (logForDiagnosticsNoPII("info", "skills_sync_policy_verdict_pending"),
        logFeatureSad("skills_sync_round", "policy_verdict_pending", S()));
      return;
    }
    let x = await getSyncBucket(s);
    if (x === null) {
      (logForDiagnosticsNoPII("info", "skills_sync_bucket_unresolved"),
        logFeatureSad("skills_sync_round", "bucket_unresolved", S()));
      return;
    }
    let G = checkSkillsSyncRoot(n, rt(x));
    B = G;
    let root = G.root;
    R = t.trigger === "resync" && !("woken" in t) && C.consecutiveFailedRounds === 0 && !_3n(e) && Hn();
    let gn = dqs(e);
    if (gn !== void 0) await gn;
    let se = shouldConvertSkillsListAsks(e);
    updateSessionConvertedSkillsAsk(se, n);
    let ge = await reuseSkillsSyncRound({
      syncedRoot: ne(),
      bucket: x,
      root: root,
      trigger: t.trigger,
      pinned: isSessionRefsSyncEnabled(e),
      lastGeneration: C.bucketGeneration,
      holdsPlaceholders: C.placeholders.size > 0,
      idle: R,
      convertedSkillsAsPlugins: se,
    });
    if (!ge.list) {
      C.bucketGeneration = ge.generation;
      let r = await noteHidingFoldersGone(async () => (await readSkillsSyncManifest(n, G))?.skills ?? []);
      if (ge.reload) {
        let u = await readSkillsSyncManifest(n, G);
        if (u) {
          let L = new Set();
          for (let skill of u.skills)
            try {
              L.add(basename(Y(root, skill.name)));
            } catch {}
          pruneDynamicSkillsNotIn(L);
        }
        ((de = new Set()), Hce());
      } else if (r) Hce();
      logFeatureOk("skills_sync_round", { ...S(), reused: !0, reloaded: ge.reload || r });
      return;
    }
    ((ke = !0), logForDiagnosticsNoPII("info", "skills_sync_starting"));
    let U,
      Re = [],
      startTime_2 = performance.now();
    if (isSessionRefsSyncEnabled(e)) {
      let [r, u] = await Promise.all([
        zqe.of(e).listEntries("skills", { startup: t.trigger === "startup" }),
        env.CLAUDE_CODE_SYNC_SKILLS
          ? Aln({ isBackground: !0, credentials: s, ...(se && { convertedSkillsAsPlugins: !0 }) })
          : null,
      ]);
      if (!r.success) U = r;
      else if (((Re = r.entries.map(sessionRefSkillEntry)), u === null)) U = { success: !0, skills: Re };
      else if (!u.success) U = u;
      else
        U = {
          success: !0,
          skills: mergeRowsByKey(
            Re,
            u.skills,
            (L) => L.skillId,
            (L, T) => ({
              ...ct(L, T),
              userInvocable: T.userInvocable,
              disableModelInvocation: T.disableModelInvocation,
            }),
          ),
        };
    } else U = await Aln({ isBackground: !0, credentials: s, ...(se && { convertedSkillsAsPlugins: !0 }) });
    let rounded = Math.round(performance.now() - startTime_2);
    if (((W = !U.success && Hee(U)), W))
      (logForDiagnosticsNoPII("warn", "skills_sync_list_refused"),
        C.listedOwnerships.clear(),
        (U = { success: !0, skills: Re }));
    if (!U.success) {
      C.consecutiveFailedRounds++;
      let r = listErrorTelemetry(U),
        u = { ...S(), ...r };
      if (
        (logForDiagnosticsNoPII("warn", "skills_sync_list_failed", u),
        logEvent("tengu_skills_sync_list_failed", u),
        (U.kind === "timeout" || U.kind === "network" || U.kind === "http") && u.suspended_ms > Ie)
      )
        logFeatureSad("skills_sync_round", "suspended", u);
      else logFeatureBad("skills_sync_round", "list_failed", u);
      return;
    }
    C.consecutiveFailedRounds = W ? C.consecutiveFailedRounds + 1 : 0;
    let be = await readSyncMarker(ne(), x);
    if (
      be === "unmarked" &&
      (await lstat(root).then(
        (r) => r.isDirectory(),
        () => !1,
      )) &&
      (await checkSyncRoots({
        dir: root,
        trashRoot: xe(),
        configHome: getClaudeConfigDir(),
        failureEvent: "skills_sync_trash_move_failed",
        storageV5: n,
      }).catch(() => !1))
    )
      logForDiagnosticsNoPII("info", "skills_sync_unmarked_bucket_quarantined");
    if ((await checkSyncOwnedRootFor(n, root), typeof be === "object"))
      throw (
        logForDiagnosticsNoPII("warn", "skills_sync_root_refused", {
          phase: "round_head",
          root: toPosixLabelPath(join(SKILLS_SYNC_DIR, x)),
          component: "marker",
          reason: "unverified",
          code: be.unreadable,
        }),
        new SyncOwnedRootRefusedError("unverified", { code: be.unreadable })
      );
    (await touchExclusive(ne(), x), (I = !0));
    let pe = await y3n(root);
    if (
      (!W && (await noteHidingFoldersGone(async () => (await readSkillsSyncManifest(n, G))?.skills ?? []))) ||
      (ge.shared && pe !== null && C.bucketGeneration !== null && pe.token !== C.bucketGeneration)
    )
      Hce();
    await trashStraySyncEntries(n);
    let Z = await readSkillsSyncManifest(n, G),
      Sn = se && !W ? await resolveSkillsBucket(Z?.skills ?? [], U.skills, x) : [];
    D = Sn.length;
    let wn = pe !== null && se ? $n(pe) : pe,
      {
        toDownload: toDownload,
        toRemove: toRemove,
        carryover: carryover,
        liveDirs: liveDirs,
        carryoverOwningLiveDir: carryoverOwningLiveDir,
      } = assignSkillDirs(root, [...U.skills, ...Sn], Z?.skills ?? []),
      gt = createLiveEntryClassifier(liveDirs),
      Ue = new Map(),
      He = async (r) => {
        let u;
        try {
          u = syncedItemPath_2(r, root);
        } catch (error) {
          if (error instanceof LegacyReservedSpellingError) return !1;
          return !0;
        }
        let L = await gt(u);
        if (L === "live") return !0;
        if (L === "indeterminate") return !1;
        Me.add(u);
        let T = Ue.get(u);
        if (T !== void 0) return T;
        let F = moveToSyncTrash(u, n).finally(() => Ue.delete(u));
        return (Ue.set(u, F), F);
      },
      Ke = new Set(Array.from(liveDirs, (r) => basename(r))),
      pt = pruneDynamicSkillsNotIn(Ke);
    if (pruneSyncedSkillState(Ke) + pt > 0) (clearCommandMemoizationCaches(), un(), Jz.emit());
    de = liveDirs;
    let results = await Promise.all(
        carryover.map((r) =>
          carryoverOwningLiveDir.has(r.skillId) ? hasSyncedSkillMd(root, r.name, n) : null,
        ),
      ),
      We = new Set();
    for (let [r, u] of carryover.entries()) {
      let L = results[r];
      if (L === null) continue;
      if (!L) {
        let found = U.skills.find((skill) => skill.skillId === u.skillId);
        if (found) (We.add(u.skillId), toDownload.push({ item: found }));
        continue;
      }
      let T = basename(Y(root, u.name));
      if (C.placeholders.delete(T))
        (C.pendingDownloads.get(T)?.resolve({ ok: !0 }),
          C.pendingDownloads.delete(T),
          clearSkillCaches(),
          clearCommandMemoizationCaches(),
          (y = !0),
          logForDiagnosticsNoPII("info", "skills_sync_materialized_elsewhere"));
    }
    let filtered = carryover.filter((r) => !We.has(r.skillId)),
      Ge = new Map(carryover.filter((r) => We.has(r.skillId)).map((r) => [r.skillId, r])),
      j = new Set(Z?.staleDirs ?? []),
      ue = new Set(),
      Q = new Set(),
      Ye = { pid: process.pid, procStart: await getProcessStartTimeAsync(process.pid) },
      Xe = [];
    if (Z?.pendingClaims) {
      let pendingClaims = Z.pendingClaims,
        u = new Set();
      for (let L of pendingClaims)
        if (await isClaimOwnerAlive(L)) u.add(parsePendingClaim(L).name);
        else Xe.push(L);
      for (let L of Xe) {
        let { name: T } = parsePendingClaim(L);
        if (u.has(T) || Ke.has(T)) continue;
        (j.add(T), Q.add(L));
      }
    }
    for (let r of j) if (await He(r)) (j.delete(r), ue.add(r));
    if (ue.size > 0 || Q.size > 0) y = !0;
    let ve = replaceRowsWithAttribution(
      Z?.skills ?? [],
      [...carryover, ...toDownload.flatMap(({ prev: prev }) => prev ?? [])],
      (r) => r.skillId,
      (r, u) =>
        r.backingPluginId === u.backingPluginId &&
        (r.updatedAt === COLLISION_LOSER) === (u.updatedAt === COLLISION_LOSER),
    );
    if (toDownload.length === 0 && toRemove.length === 0) {
      if (y) Hce();
      if ((ue.size > 0 || Q.size > 0 || ve.attributionMoved) && Z)
        await writeSkillsSyncManifest(
          {
            lastUpdated: Z.lastUpdated,
            skills: ve.rows,
            staleDirs: j.size > 0 ? Array.from(j) : void 0,
            pendingClaims: void 0,
          },
          { staleDirs: ue, pendingClaims: Q, removedSkillIds: SKILLS_MANIFEST_SCHEMA, deferredRows: nt },
          n,
          G,
        );
      if (Z) {
        let date = new Date();
        await lutimes(Be(root), date, date).catch(() => {});
      }
      let r = y ? null : wn;
      (noteBucketGeneration(
        await dfn(root, "skills", j.size === 0 && !W && !isSessionRefsSyncEnabled(e), r, ye(se)),
        r,
      ),
        logForDiagnosticsNoPII("info", "skills_sync_no_changes", {
          duration_ms: Date.now() - now,
          list_ms: rounded,
          ...(t.trigger === "startup" && {
            first_message_gate_open_ms: Math.round(performance.now() - startTime),
          }),
        }));
      let u = { ...S(), no_changes: !0 };
      if (W) logFeatureSad("skills_sync_round", "not_entitled", u);
      else logFeatureOk("skills_sync_round", u);
      return;
    }
    let hn = 0;
    for (let { item: item, prev: prev } of toDownload)
      if (!prev) {
        let L = Y(root, item.name),
          T = createDeferredSyncedSkillCommand(basename(L), item, L);
        if (T === void 0) continue;
        (rqs(T), hn++, O.set(item.skillId, registerPendingDownload(basename(Y(root, item.name)))));
      }
    if (hn > 0) (clearCommandMemoizationCaches(), un(), Jz.emit());
    let Mn = !0;
    try {
      let r = [];
      for (let { item: item } of toDownload)
        try {
          r.push($Jr(basename(Y(root, item.name)), Ye));
        } catch {}
      if (r.length > 0)
        await writeSkillsSyncManifest(
          {
            lastUpdated: Z?.lastUpdated ?? 0,
            skills: ve.rows,
            staleDirs: j.size > 0 ? Array.from(j) : void 0,
            pendingClaims: r,
          },
          { staleDirs: ue, pendingClaims: Q, removedSkillIds: SKILLS_MANIFEST_SCHEMA, deferredRows: nt },
          n,
          G,
        );
    } catch (error) {
      if (error instanceof SyncOwnedRootRefusedError) throw error;
      ((Mn = !1), logForDiagnosticsNoPII("warn", "skills_sync_pending_claims_write_failed"));
    }
    firstListDeferred().resolve();
    let rounded_2 = Math.round(performance.now() - startTime);
    if (!Mn) {
      if ((logFeatureBad("skills_sync_round", "pending_claims_write_failed", S()), y)) Hce();
      return;
    }
    let re = [],
      Rn = [],
      Ze = [],
      De = 0,
      vn = 0,
      me = {},
      Dn = ({ item: item, prev: prev }) => (prev === void 0 && !Ge.has(item.skillId) ? nii(item) : void 0),
      flattened = toDownload.flatMap((r) => Dn(r) ?? []),
      En = new Set(flattened),
      Je = new Map(),
      In = (r) => (
        logForDiagnosticsNoPII("warn", "skills_sync_host_mount_threw"),
        logError(toError(r)),
        null
      ),
      Cn = En.size > 0 ? createHostSkillReader(En, Je).catch(In) : null,
      Le = new Set(),
      Tn = new Map();
    (await Promise.all(
      toDownload.map(
        limitConcurrency(ln, async ({ item: item }) => {
          Tn.set(item, await readSyncedSkillMd(root, item.name, n));
        }),
      ),
    ),
      await Promise.all(
        toDownload.map(
          Idi(
            ln,
            async (r) => {
              let u = Dn(r);
              if (u === void 0) return;
              let T = await (await Cn)?.readZip(u, r.item).catch(In);
              return T ? { kind: u, zip: T } : void 0;
            },
            async ({ item: item, prev: prev }, L) => {
              let T = Tn.get(item) ?? null,
                F = ut;
              try {
                F = await landSyncedSkill(item, {
                  round: G,
                  credentials: s,
                  storageV5: n,
                  classifyOccupant: (K) => skillDirOccupancy(K, n, G),
                  markTargetDestroyed: () => {
                    h = !0;
                  },
                  replacesAttributedCopy:
                    (prev !== void 0 && (await isSameSkillDir(root, prev.name, item.name))) ||
                    Ge.has(item.skillId),
                  targetHeldSkillFile: Fe() && T !== null,
                  fromHostMount: L,
                  markLandedFromHostMount: () => {
                    Le.add(item.skillId);
                  },
                  hostMountMissCounts: Je,
                  noteDownloadedBytes: (K) => {
                    M += K;
                  },
                });
              } catch {
                ((F = Pe), logForDiagnosticsNoPII("warn", "skills_sync_extract_failed"));
              }
              if (F.ok) {
                if ((re.push(item), prev && prev.name !== item.name)) {
                  if (!(await He(prev.name))) j.add(prev.name);
                }
                (oqs(basename(Y(root, item.name))),
                  clearSkillCaches(),
                  clearCommandMemoizationCaches(),
                  logFeatureOk("skills_sync_download", { landed_from_mount: Le.has(item.skillId) }));
              } else {
                let K = getSyncFailureEvent(F.cause);
                if (K === null) (De++, logForDiagnosticsNoPII("info", "skills_sync_landing_deferred"));
                else ((me[K] = (me[K] ?? 0) + 1), logFeatureBad("skills_sync_download", K));
                let _e = prev ?? Ge.get(item.skillId);
                if (_e && F.cause === "deferred") {
                  if ((Ze.push(_e), prev && prev.name !== item.name)) (j.add(prev.name), vn++);
                } else if (_e) Rn.push(_e);
                else
                  try {
                    let ee = Y(root, item.name);
                    if (
                      await lstat(ee).then(
                        () => !1,
                        (Rt) => isENOENT(Rt),
                      )
                    )
                      Q.add($Jr(basename(ee), Ye));
                  } catch {}
              }
              O.get(item.skillId)?.(F.ok ? { ok: !0 } : { ok: !1, reason: describeSyncFailure(F.cause) });
            },
          ),
        ),
      ));
    let we = [];
    await Promise.all(
      toRemove.map(
        limitConcurrency(ln, async (r) => {
          if (!(await He(r.name))) we.push(r);
        }),
      ),
    );
    let Qe = new Set(toRemove.map((r) => r.skillId));
    for (let r of we) Qe.delete(r.skillId);
    let Ve = re.length > 0 || h || we.length < toRemove.length || ue.size > 0 || Q.size > 0,
      Mt = Ve || vn > 0 || ve.attributionMoved;
    if (Qe.size > 0) clearCommandMemoizationCaches();
    if (Ve || y) Hce();
    let Ee = !1;
    if (Mt) {
      let r = [...filtered, ...re, ...Rn, ...we],
        u = new Set();
      for (let F of [...r, ...Ze])
        try {
          u.add(basename(Y(root, F.name)));
        } catch {}
      for (let F of u) Q.add($Jr(F, Ye));
      for (let F of Xe) if (u.has(parsePendingClaim(F).name)) Q.add(F);
      let L = (F, K) =>
        writeSkillsSyncManifest(
          { lastUpdated: Date.now(), skills: F, staleDirs: j.size > 0 ? Array.from(j) : void 0 },
          { staleDirs: ue, pendingClaims: Q, removedSkillIds: Qe, deferredRows: Ze, onlyOverReadable: K },
          n,
          G,
        );
      await L(r, !1);
      let T = re.length > 0 && Fe() ? 2 : 0;
      for (let F = 0; F < T; F++) {
        await sleep(C.lostRowsRecheckMs * (1 + Math.random()));
        let K = await readSkillsSyncManifest(n, G),
          _e = new Set(K?.skills.map((ee) => ee.skillId));
        if (((Ee = !re.every((ee) => _e.has(ee.skillId))), !Ee)) break;
        if (K === null) continue;
        logForDiagnosticsNoPII("info", "skills_sync_manifest_rows_lost");
        try {
          await L(re, !0);
        } catch (error) {
          if (error instanceof SyncOwnedRootRefusedError) throw error;
          logError(toError(error));
          break;
        }
      }
      if (Ee) logForDiagnosticsNoPII("warn", "skills_sync_manifest_rows_unconfirmed");
    }
    let en = toDownload.length - re.length - De,
      Fn = await Cn,
      nn = {
        downloaded: re.length - Le.size,
        from_mount: Le.size,
        mount_eligible: flattened.length,
        mount_read_ms: Fn?.spentMs() ?? 0,
        mount_wait_ms: Fn?.waitedMs() ?? 0,
        ...hrr(Je),
      };
    logForDiagnosticsNoPII("info", "skills_sync_complete", {
      ...nn,
      removed: toRemove.length,
      duration_ms: Date.now() - now,
      list_ms: rounded,
      ...(t.trigger === "startup" && { first_message_gate_open_ms: rounded_2 }),
    });
    let Pn = S();
    logEvent("tengu_skills_sync_success", { ...Pn, ...nn, removed: toRemove.length, total: U.skills.length });
    let An = Ve || y ? null : wn;
    noteBucketGeneration(
      await dfn(
        root,
        "skills",
        !W && en === 0 && De === 0 && !Ee && we.length === 0 && j.size === 0 && !isSessionRefsSyncEnabled(e),
        An,
        ye(se),
      ),
      An,
    );
    let tn = { ...Pn, ...nn, deferred: De, removed: toRemove.length, total: U.skills.length };
    if (en > 0)
      logFeatureSad("skills_sync_round", "download_failed", {
        ...tn,
        failed: en,
        download_failed: me.download_failed ?? 0,
        extract_failed: me.extract_failed ?? 0,
        root_refused: me.root_refused ?? 0,
        local_failed: me.local_failed ?? 0,
      });
    else if (W) logFeatureSad("skills_sync_round", "not_entitled", tn);
    else logFeatureOk("skills_sync_round", tn);
  } catch (error) {
    if (y || h) Hce();
    if (error instanceof SyncOwnedRootRefusedError && I)
      (logForDiagnosticsNoPII("warn", "skills_sync_late_root_refusal", {
        reason: error.reason,
        duration_ms: Date.now() - now,
      }),
        logFeatureSad("skills_sync_round", "root_refused", S()),
        (I = !1));
    else if (error instanceof SyncOwnedRootRefusedError)
      (logForDiagnosticsNoPII("warn", "skills_sync_root_refused_round", {
        reason: error.reason,
        duration_ms: Date.now() - now,
      }),
        logFeatureSad("skills_sync_round", "root_refused", S()));
    else {
      if (!W) C.consecutiveFailedRounds++;
      logForDiagnosticsNoPII("error", "skills_sync_unexpected_error", { duration_ms: Date.now() - now });
      let G = S();
      (logEvent("tengu_skills_sync_error", G), logFeatureBad("skills_sync_round", "unexpected_error", G));
    }
  } finally {
    if (ke) jn();
    for (let x of O.values()) x({ ok: !1, reason: "skills sync failed" });
    if ((firstListDeferred().resolve(), de !== null && B !== null))
      await pruneGoneSkillDirs({
        bucketRoot: B.root,
        listedDirs: de,
        removalTriedDirs: Me,
        isSkillFileGone: (x) => isSkillMdMissing(x, n),
      }).catch(() => {
        logForDiagnosticsNoPII("warn", "skills_sync_hooks_removal_failed");
      });
    if (B === null || B.guard.refused()) I = !1;
    if (I && B !== null) {
      if (
        (await verifySyncRoot(
          B.root,
          getClaudeConfigDir(),
          { event: "skills_sync_root_refused", phase: "sweep", rootLabel: SKILLS_SYNC_DIR },
          { checkStagingLeaf: !0, storageV5: n },
        ).catch(() => null)) === "real"
      )
        await rm(fn(B.root), { recursive: !0, force: !0 }).catch(() => {});
    }
  }
}
//@ chunk-hme9amad.js:30122-30240 placement
async function isClaimOwnerAlive(e) {
  let { ownerPid: ownerPid, ownerProcStart: ownerProcStart } = parsePendingClaim(e);
  return (
    ownerPid !== void 0 &&
    ownerPid !== process.pid &&
    isProcessRunning(ownerPid) &&
    (await isSameProcessAsync(ownerPid, ownerProcStart))
  );
}
/**
 * 判断技能目录被谁占用：已落地、进行中或无归属。
 */
//@ chunk-hme9amad.js:30240-30763 placement
async function skillDirOccupancy(e, n, s) {
  let t = await readSkillsSyncManifest(n, s);
  if (!t) return "unattributed";
  for (let skill of t.skills) if (await isSameSkillDir(s.root, skill.name, e)) return "landed";
  for (let d of t.pendingClaims ?? [])
    if (parsePendingClaim(d).name === e && (await isClaimOwnerAlive(d))) {
      if (!Fe()) return "inFlight";
      let w = await lstat(join(s.root, e)).then(
        (h) => Math.floor(h.ctimeMs),
        (h) => {
          if (isENOENT(h)) return -1 / 0;
          return (
            logForDiagnosticsNoPII("warn", "skills_sync_occupant_unreadable", {
              code: getErrnoCode(h) ?? "unknown",
            }),
            1 / 0
          );
        },
      );
      if (!(Date.now() - w >= Yt)) return "inFlight";
      return (logForDiagnosticsNoPII("info", "skills_sync_live_claim_timed_out"), "unattributed");
    }
  return "unattributed";
}
//@ chunk-hme9amad.js:30763-30865 placement
async function isSameSkillDir(e, n, s) {
  try {
    let t = Y(e, n),
      d = Y(e, s);
    return basename(t) === basename(d) || (await ifn(t, d));
  } catch {
    return !1;
  }
}
/**
 * 检查技能同步拥有的根目录（带回收目录与配置目录）。
 */
//@ chunk-hme9amad.js:30865-30990 placement
function checkSyncOwnedRootFor(e, n) {
  return checkSyncOwnedRoot({
    root: n,
    trashRoot: xe(),
    configHome: getClaudeConfigDir(),
    events: { refused: "skills_sync_root_refused" },
    storageV5: e,
  });
}

export { runSyncRoundOnce, reconcileSkillsManifest, checkSyncOwnedRootFor };
