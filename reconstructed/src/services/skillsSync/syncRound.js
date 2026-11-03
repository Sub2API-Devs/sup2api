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
import { writeFile, lstat, rm, mkdir, readdir, stat, rename, lutimes } from "fs/promises";
import { createSkillCommand, pruneDynamicSkillsNotIn, clearSkillCaches } from "../../skills/loadSkillsDir.js";
import { escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { buildSkillAttribution } from "../../utils/telemetry/skillAttribution.js";
import { frontmatterProblemResult } from "../memorySync/pathScrub.js";
import { raceWithAbortSignal, sleep } from "../../utils/sleep.js";
import {
  startPendingDownload,
  skillSwitchedOffText,
  MAX_SYNCED_SKILL_BYTES,
  parseValidRows,
  stringArray,
  refreshAccountSkillsSyncFlag,
  isSkillsSyncActive,
  isSkillsCustomizationAllowed,
  readSkillsSyncSetting,
  isSessionRefsSkillsSyncOn,
  convertedSkillsListPin,
  shouldConvertSkillsListAsks,
  mergeRowsByKey,
  takeReuseStamp,
  pruneSyncedSkillState,
  replaceRowsWithAttribution,
  writeOrClearReuseStamp,
  registerSkillPlaceholder,
  registerPendingDownload,
  unregisterSkillPlaceholder,
  pruneGoneSkillDirs,
} from "../../utils/claudeAiSync/skillsSync.js";
import { AbortError, getErrnoCode, toError, isENOENT } from "../../utils/errors.js";
import { getCommands, clearCommandMemoizationCaches } from "../../commands.js";
import { getProjectRootOrNull, getAccountSkillsSyncEnabled } from "../../bootstrap/state.js";
import { isHostCatalogSkill } from "../../utils/commandPredicates.js";
import {
  freshRootState,
  downloadFailure,
  extractFailure,
  ROOT_REFUSED_RESULT,
  DEFERRED_PLACEMENT,
  isDirConflictErrno,
  buildLocalPlacementFailure,
  LOCAL_PLACEMENT_FAILURE,
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
  SKILLS_SYNC_DIR_2,
  isHiddenFoldName,
  SYNCED_MANIFEST_FILE,
  parsePendingClaim,
  syncedItemPath_2,
  LegacyReservedSpellingError,
  getSyncBucket,
  syncKeyOf,
} from "../../utils/plugins/syncedItems.js";
import {
  syncedSkillDirPath,
  perProcessTempDir,
  moveToSyncTrash,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
  skillsSyncDir,
  trashRootDir,
  resetSkillSyncState,
  skillsSyncPath,
  shouldWeatherIdle,
  reuseSkillsSyncRound,
  noteHidingFoldersGone,
  readSkillsSyncManifest,
  sessionRefSkillEntry,
  carryBackingPluginId,
  FIRST_FAILED_ROUND_THRESHOLD_MS,
  trashStraySyncEntries,
  resolveSkillsBucket,
  onlyConvertedSkills,
  assignSkillDirs,
  markFirstRoundEmitted,
  hasSyncedSkillMd,
  writeSkillsSyncManifest,
  SKILLS_MANIFEST_SCHEMA,
  SKILLS_MANIFEST_SCHEMA_PLACEHOLDER,
  manifestPathIn,
  noteBucketGeneration,
  listedForKey,
  firstListDeferred,
  MAX_INSTALL_WAIT_CHAIN,
  readSyncedSkillMd,
  isQuizzicalWirthOn,
  rescheduleResyncByBackoff,
  isSkillMdMissing,
  INSTALL_WAIT_CEILING_MS,
} from "./skillsSync.js";
import { tmpdir } from "../../utils/tempDir.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { downloadOrgSkillZip, fetchOrgSkillsListWithRetry } from "./orgSkillsApi.js";
import { readAndUnzipFile } from "../../utils/dxt/zip.js";
import {
  containsGitDirectory,
  isSameFileIdentity,
  createLiveEntryClassifier,
} from "../../utils/plugins/fileIdentity.js";
import {
  recordMountMiss,
  COLLISION_LOSER,
  hostMountKindForRow,
  createHostSkillReader,
  flattenMountMissCounts,
} from "../../skills/hostSkillMounts.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { readFileChecked } from "../../utils/fileRead.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { updateSessionConvertedSkillsAsk } from "../../utils/concurrentSessions.js";
import { isSessionRefsSyncEnabled } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { sessionSkillManifestSlot } from "../plugins/accountSync/sessionSkillManifest.js";
import { env } from "../../utils/env.js";
import { isNotFoundServerError } from "../plugins/accountSync/syncedPluginHooks.js";
import { listErrorTelemetry } from "../plugins/accountSync/listPlugins.js";
import { logEvent } from "../analytics/index.js";
import { skillsChangedSignal } from "../../utils/plugins/pluginsChangedSignal.js";
import { getProcessStartTimeAsync, isSameProcessAsync } from "../../utils/processIdentity.js";
import { logError } from "../../utils/log.js";
import { limitConcurrency, preloadThenLimit } from "../../utils/concurrencyLimit.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";

//@ chunk-hme9amad.js:13495-14841 placement = createSkillCommand (0.55)
/**
 * 为尚未下载正文的同步 skill 创建占位命令；调用时等待下载完成再转交真正的命令，失败时返回「Skill X could not be downloaded … Proceed without it.」。
 */
function createDeferredSyncedSkillCommand(e, n, baseDir) {
  let skillCommand = createSkillCommand({
    skillName: e,
    displayName: undefined,
    description: escapeXmlInline(n.description),
    hasUserSpecifiedDescription: true,
    markdownContent: "",
    allowedTools: [],
    argumentHint: undefined,
    argumentNames: [],
    whenToUse: undefined,
    version: undefined,
    model: undefined,
    disableModelInvocation: n.disableModelInvocation ?? false,
    userInvocable: n.userInvocable ?? true,
    source: "userSettings",
    baseDir,
    serverAttribution: buildSkillAttribution(n.skillId, n.backingPluginId),
    loadedFrom: "syncedSkills",
    hooks: undefined,
    executionContext: undefined,
    agent: undefined,
    paths: undefined,
    effort: undefined,
    shell: undefined,
    skillFile: frontmatterProblemResult(
      "was not read: this command was listed before its file was downloaded",
    ),
  });
  if (skillCommand?.type === "prompt")
    skillCommand.getPromptForCommand = async (d, w) => {
      let h = await raceWithAbortSignal(
        startPendingDownload(e),
        w.abortController.signal,
        () => new AbortError(),
      );
      if (h.ok) {
        let found = (await getCommands(getProjectRootOrNull(), w.storageV5)).find(
          (D) =>
            D.loadedFrom === "syncedSkills" &&
            isHostCatalogSkill(D) === isHostCatalogSkill(skillCommand) &&
            D.name === skillCommand.name &&
            D.type === "prompt" &&
            D.getPromptForCommand !== skillCommand.getPromptForCommand,
        );
        if (found && found.type === "prompt") {
          skillCommand.source = found.source;
          skillCommand.skillRoot = found.skillRoot;
          skillCommand.skillFile = found.skillFile;
          skillCommand.contentLength = found.contentLength;
          skillCommand.progressMessage = found.progressMessage;
          skillCommand.userInvocable = found.userInvocable;
          return found.getPromptForCommand(d, w);
        }
      }
      let reason = h.ok ? "skill not found after download" : h.reason;
      return [
        {
          type: "text",
          text:
            !h.ok && h.withheld
              ? `${skillSwitchedOffText(skillCommand.name)} Proceed without it.`
              : `Skill ${e} could not be downloaded (${reason}). Proceed without it.`,
        },
      ];
    };
  return skillCommand;
}
//@ chunk-hme9amad.js:14841-14955 placement
function checkSkillsSyncRoot(storageV5, n) {
  return freshRootState({
    root: () => n,
    configHome: getClaudeConfigDir,
    rootLabel: SKILLS_SYNC_DIR_2,
    event: "skills_sync_root_refused",
    storageV5,
  });
}
//@ chunk-hme9amad.js:14955-15041 placement
var ZIP_FETCH_FAILED_RESULT = downloadFailure("zip fetch failed");
var ARCHIVE_UNUSABLE_RESULT = extractFailure("skill archive unusable or landing obstructed");
//@ chunk-hme9amad.js:15041-16971 placement
async function downloadSyncedSkill(
  e,
  {
    round,
    credentials,
    storageV5,
    replacesAttributedCopy,
    targetHeldSkillFile,
    classifyOccupant,
    markTargetDestroyed,
    noteDownloadedBytes,
  },
  R,
) {
  let root = round.root;
  let M = syncedSkillDirPath(root, e.name);
  let S = join(perProcessTempDir(root), relative(root, M));
  let O = join(tmpdir(), `claude-skill-${process.pid}-${Math.random().toString(36).slice(2)}.zip`);
  try {
    if (round.guard.refused()) return ROOT_REFUSED_RESULT;
    if (R !== undefined) await writeFile(O, R);
    else {
      if (
        !replacesAttributedCopy &&
        targetHeldSkillFile &&
        (await classifyOccupant(basename(M))) === "inFlight"
      ) {
        logForDiagnosticsNoPII("info", "skills_sync_target_in_flight_elsewhere");
        return DEFERRED_PLACEMENT;
      }
      if (
        !(await downloadOrgSkillZip(e.skillId, O, e.requestedVersion, {
          isBackground: true,
          credentials,
        }))
      )
        return ZIP_FETCH_FAILED_RESULT;
      noteDownloadedBytes((await lstat(O).catch(() => null))?.size ?? 0);
    }
    if (!(await round.guard.verify())) return ROOT_REFUSED_RESULT;
    await rm(S, {
      recursive: true,
      force: true,
    });
    await mkdir(perProcessTempDir(root), {
      recursive: true,
    });
    await readAndUnzipFile(O, S, {
      skipEntry: (C) => C.split(/[\\/]/).some((W) => isHiddenFoldName(W)),
    });
    let I = S;
    let B = await readdir(S, {
      withFileTypes: true,
    });
    if (!B.some((C) => C.name === "SKILL.md") && B.length === 1 && B[0].isDirectory()) I = join(S, B[0].name);
    try {
      if (!(await stat(join(I, "SKILL.md"))).isFile()) {
        logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable");
        return ARCHIVE_UNUSABLE_RESULT;
      }
    } catch {
      logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable");
      return ARCHIVE_UNUSABLE_RESULT;
    }
    if (await containsGitDirectory(I)) {
      logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable");
      return ARCHIVE_UNUSABLE_RESULT;
    }
    if (!(await round.guard.verify())) return ROOT_REFUSED_RESULT;
    if (replacesAttributedCopy)
      await rm(M, {
        recursive: true,
        force: true,
      });
    try {
      await rename(I, M);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (replacesAttributedCopy || !isDirConflictErrno(errnoCode)) {
        if (replacesAttributedCopy) markTargetDestroyed();
        logForDiagnosticsNoPII("warn", "skills_sync_promotion_failed", {
          code: errnoCode ?? "unknown",
        });
        return buildLocalPlacementFailure(errnoCode);
      }
      let de = await classifyOccupant(basename(M));
      if (de === "inFlight") {
        logForDiagnosticsNoPII("info", "skills_sync_target_in_flight_elsewhere");
        return DEFERRED_PLACEMENT;
      }
      if (de === "landed")
        await rm(M, {
          recursive: true,
          force: true,
        });
      else if (!(await moveToSyncTrash(M, storageV5))) return LOCAL_PLACEMENT_FAILURE;
      try {
        await rename(I, M);
      } catch (error) {
        markTargetDestroyed();
        let errnoCode = getErrnoCode(error);
        logForDiagnosticsNoPII("warn", "skills_sync_promotion_failed", {
          code: errnoCode ?? "unknown",
        });
        return buildLocalPlacementFailure(errnoCode);
      }
    }
    return SYNC_OK;
  } finally {
    await rm(O, {
      force: true,
    }).catch(() => {});
    if (
      !round.guard.refused() &&
      (await verifySyncRoot(
        root,
        getClaudeConfigDir(),
        {
          event: "skills_sync_root_refused",
          phase: "sweep",
          rootLabel: SKILLS_SYNC_DIR_2,
        },
        {
          checkStagingLeaf: true,
          storageV5,
        },
      ).catch(() => null)) === "real"
    )
      await rm(S, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-hme9amad.js:16971-16982 placement
var SYNC_RETRY_SLEEP_MS = 500;
//@ chunk-hme9amad.js:16982-17116 placement
async function downloadWithRetry(e, n) {
  try {
    return await downloadSyncedSkill(e, n, undefined);
  } catch {
    logForDiagnosticsNoPII("warn", "skills_sync_extract_retry");
    await sleep(SYNC_RETRY_SLEEP_MS);
    return downloadSyncedSkill(e, n, undefined);
  }
}
//@ chunk-hme9amad.js:17116-17404 placement
async function landSyncedSkill(e, n) {
  let { fromHostMount } = n;
  if (fromHostMount !== undefined) {
    let t = await downloadSyncedSkill(e, n, fromHostMount.zip).catch(() => null);
    if (t?.ok) n.markLandedFromHostMount();
    if (t !== null && (t.ok || t.cause !== "extract")) return t;
    recordMountMiss(
      fromHostMount.kind,
      {
        reason: t === null ? "landing_threw" : "zip_unusable",
      },
      n.hostMountMissCounts,
    );
  }
  return downloadWithRetry(e, n);
}
//@ chunk-hme9amad.js:17404-17561 placement
/**
 * 启动一轮技能同步；已有同步进行时复用同一 Promise。
 */
async function runSyncRoundOnce(e, n, s, t) {
  let d = remoteToolsState();
  if (d.syncPromise) return d.syncPromise;
  d.syncPromise = runSkillsSyncRound(e, n, s, t).finally(() => {
    d.syncPromise = null;
  });
  return d.syncPromise;
}
//@ chunk-hme9amad.js:17561-18945 placement
async function reconcileSkillsManifest(e, n) {
  let s = join(e, SYNCED_MANIFEST_FILE);
  let t;
  let d;
  let w;
  try {
    d = (await readFileChecked(s, MAX_SYNCED_SKILL_BYTES)).content;
    w = jsonParse(d);
  } catch {
    return null;
  }
  let h = syncedSkillsManifestSchema().safeParse(w);
  if (h.success) {
    let { lastUpdated, skills, staleDirs, pendingClaims, ...C } = h.data;
    t = {
      ...C,
      lastUpdated,
      skills: parseValidRows(syncedSkillEntrySchema(), skills),
      staleDirs: stringArray(staleDirs),
      pendingClaims: stringArray(pendingClaims),
    };
  } else return null;
  let y = [
    ...t.skills.map((row) => ({
      row,
      syntheticListName: null,
    })),
    ...["staleDirs", "pendingClaims"].flatMap((S) =>
      (t[S] ?? []).map((O) => ({
        row: {
          name: S === "pendingClaims" ? parsePendingClaim(O).name : O,
        },
        syntheticListName: S,
        entry: O,
      })),
    ),
  ];
  let b = 0;
  let R = [];
  let D = [];
  let M = [];
  for (let S of y) {
    let row = S.row;
    if (S.syntheticListName === "pendingClaims" && (await isClaimOwnerAlive(S.entry))) {
      M.push(S.entry);
      continue;
    }
    try {
      let I = syncedItemPath_2(row.name, e);
      if (await isSameFileIdentity(I, skillsSyncDir())) {
        logForDiagnosticsNoPII("info", "skills_sync_sibling_root_row_skipped");
        continue;
      }
      if (await isSameFileIdentity(I, trashRootDir())) {
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
      {
        ...t,
        skills: R,
        staleDirs: D.length > 0 ? D : undefined,
        pendingClaims: M.length > 0 ? M : undefined,
      },
      null,
      2,
    );
    if (S !== d) await writeFileAtomic(s, S).catch(() => {});
  } else
    await rm(s, {
      force: true,
    }).catch(() => {});
  return b;
}
//@ chunk-hme9amad.js:18945-30122 placement
/**
 * claude.ai skills 同步一轮：检查开关与账号选择、解析 bucket、下载 skill zip 解压到同步目录、清理过期目录、记录 skills_sync_round 遥测；支持睡眠唤醒后的重同步。
 */
async function runSkillsSyncRound(e, storageV5, s, t) {
  let now = Date.now();
  let startTime = performance.now();
  let h = false;
  let y = false;
  let b = false;
  let idle = false;
  let D = 0;
  let M = 0;
  let S = () => {
    let x = Date.now() - now;
    return {
      account_opt_in: b,
      idle,
      woken: "woken" in t,
      trigger: fromEnum(t.trigger),
      ...("tickLateMs" in t && {
        tick_late_ms: t.tickLateMs,
      }),
      ...(D > 0 && {
        kept: D,
      }),
      ...(M > 0 && {
        approx_downloaded_bytes: Number(M.toPrecision(2)),
      }),
      duration_ms: x,
      suspended_ms: Math.max(0, Math.round(x - (performance.now() - startTime))),
    };
  };
  let O = new Map();
  let I = false;
  let B = null;
  let C = remoteToolsState();
  let W = false;
  let de = null;
  let Me = new Set();
  let ke = false;
  try {
    b = getAccountSkillsSyncEnabled();
    if (refreshAccountSkillsSyncFlag()) b = true;
    if (!isSkillsSyncActive(e) || !isSkillsCustomizationAllowed()) {
      logForDiagnosticsNoPII("info", "skills_sync_gate_closed");
      let { placeholders, listedOwnerships } = remoteToolsState();
      listedOwnerships.clear();
      if (placeholders.size > 0) {
        placeholders.clear();
        resetSkillSyncState();
      }
      logFeatureSad("skills_sync_round", "gate_closed", S());
      return;
    }
    if (readSkillsSyncSetting()) {
      logForDiagnosticsNoPII("info", "skills_sync_policy_verdict_pending");
      logFeatureSad("skills_sync_round", "policy_verdict_pending", S());
      return;
    }
    let syncBucket = await getSyncBucket(s);
    if (syncBucket === null) {
      logForDiagnosticsNoPII("info", "skills_sync_bucket_unresolved");
      logFeatureSad("skills_sync_round", "bucket_unresolved", S());
      return;
    }
    let G = checkSkillsSyncRoot(storageV5, skillsSyncPath(syncBucket));
    B = G;
    let root = G.root;
    idle =
      t.trigger === "resync" &&
      !("woken" in t) &&
      C.consecutiveFailedRounds === 0 &&
      !isSessionRefsSkillsSyncOn(e) &&
      shouldWeatherIdle();
    let gn = convertedSkillsListPin(e);
    if (gn !== undefined) await gn;
    let se = shouldConvertSkillsListAsks(e);
    updateSessionConvertedSkillsAsk(se, storageV5);
    let ge = await reuseSkillsSyncRound({
      syncedRoot: skillsSyncDir(),
      bucket: syncBucket,
      root,
      trigger: t.trigger,
      pinned: isSessionRefsSyncEnabled(e),
      lastGeneration: C.bucketGeneration,
      holdsPlaceholders: C.placeholders.size > 0,
      idle,
      convertedSkillsAsPlugins: se,
    });
    if (!ge.list) {
      C.bucketGeneration = ge.generation;
      let r = await noteHidingFoldersGone(
        async () => (await readSkillsSyncManifest(storageV5, G))?.skills ?? [],
      );
      if (ge.reload) {
        let skillsSyncManifest = await readSkillsSyncManifest(storageV5, G);
        if (skillsSyncManifest) {
          let L = new Set();
          for (let skill of skillsSyncManifest.skills)
            try {
              L.add(basename(syncedSkillDirPath(root, skill.name)));
            } catch {}
          pruneDynamicSkillsNotIn(L);
        }
        de = new Set();
        resetSkillSyncState();
      } else if (r) resetSkillSyncState();
      logFeatureOk("skills_sync_round", {
        ...S(),
        reused: true,
        reloaded: ge.reload || r,
      });
      return;
    }
    ke = true;
    logForDiagnosticsNoPII("info", "skills_sync_starting");
    let U;
    let Re = [];
    let startTime_2 = performance.now();
    if (isSessionRefsSyncEnabled(e)) {
      let [r, u] = await Promise.all([
        sessionSkillManifestSlot.of(e).listEntries("skills", {
          startup: t.trigger === "startup",
        }),
        env.CLAUDE_CODE_SYNC_SKILLS
          ? fetchOrgSkillsListWithRetry({
              isBackground: true,
              credentials: s,
              ...(se && {
                convertedSkillsAsPlugins: true,
              }),
            })
          : null,
      ]);
      if (!r.success) U = r;
      else {
        Re = r.entries.map(sessionRefSkillEntry);
        if (u === null)
          U = {
            success: true,
            skills: Re,
          };
        else if (!u.success) U = u;
        else
          U = {
            success: true,
            skills: mergeRowsByKey(
              Re,
              u.skills,
              (L) => L.skillId,
              (L, T) => ({
                ...carryBackingPluginId(L, T),
                userInvocable: T.userInvocable,
                disableModelInvocation: T.disableModelInvocation,
              }),
            ),
          };
      }
    } else
      U = await fetchOrgSkillsListWithRetry({
        isBackground: true,
        credentials: s,
        ...(se && {
          convertedSkillsAsPlugins: true,
        }),
      });
    let listMs = Math.round(performance.now() - startTime_2);
    W = !U.success && isNotFoundServerError(U);
    if (W) {
      logForDiagnosticsNoPII("warn", "skills_sync_list_refused");
      C.listedOwnerships.clear();
      U = {
        success: true,
        skills: Re,
      };
    }
    if (!U.success) {
      C.consecutiveFailedRounds++;
      let r = listErrorTelemetry(U);
      let u = {
        ...S(),
        ...r,
      };
      logForDiagnosticsNoPII("warn", "skills_sync_list_failed", u);
      logEvent("tengu_skills_sync_list_failed", u);
      if (
        (U.kind === "timeout" || U.kind === "network" || U.kind === "http") &&
        u.suspended_ms > FIRST_FAILED_ROUND_THRESHOLD_MS
      )
        logFeatureSad("skills_sync_round", "suspended", u);
      else logFeatureBad("skills_sync_round", "list_failed", u);
      return;
    }
    C.consecutiveFailedRounds = W ? C.consecutiveFailedRounds + 1 : 0;
    let syncMarker = await readSyncMarker(skillsSyncDir(), syncBucket);
    if (
      syncMarker === "unmarked" &&
      (await lstat(root).then(
        (r) => r.isDirectory(),
        () => false,
      )) &&
      (await checkSyncRoots({
        dir: root,
        trashRoot: trashRootDir(),
        configHome: getClaudeConfigDir(),
        failureEvent: "skills_sync_trash_move_failed",
        storageV5,
      }).catch(() => false))
    )
      logForDiagnosticsNoPII("info", "skills_sync_unmarked_bucket_quarantined");
    await checkSyncOwnedRootFor(storageV5, root);
    if (typeof syncMarker === "object") {
      logForDiagnosticsNoPII("warn", "skills_sync_root_refused", {
        phase: "round_head",
        root: toPosixLabelPath(join(SKILLS_SYNC_DIR_2, syncBucket)),
        component: "marker",
        reason: "unverified",
        code: syncMarker.unreadable,
      });
      throw new SyncOwnedRootRefusedError("unverified", {
        code: syncMarker.unreadable,
      });
    }
    await touchExclusive(skillsSyncDir(), syncBucket);
    I = true;
    let pe = await takeReuseStamp(root);
    if (
      (!W &&
        (await noteHidingFoldersGone(
          async () => (await readSkillsSyncManifest(storageV5, G))?.skills ?? [],
        ))) ||
      (ge.shared && pe !== null && C.bucketGeneration !== null && pe.token !== C.bucketGeneration)
    )
      resetSkillSyncState();
    await trashStraySyncEntries(storageV5);
    let skillsSyncManifest = await readSkillsSyncManifest(storageV5, G);
    let Sn =
      se && !W ? await resolveSkillsBucket(skillsSyncManifest?.skills ?? [], U.skills, syncBucket) : [];
    D = Sn.length;
    let wn = pe !== null && se ? onlyConvertedSkills(pe) : pe;
    let { toDownload, toRemove, carryover, liveDirs, carryoverOwningLiveDir } = assignSkillDirs(
      root,
      [...U.skills, ...Sn],
      skillsSyncManifest?.skills ?? [],
    );
    let liveEntryClassifier = createLiveEntryClassifier(liveDirs);
    let Ue = new Map();
    let He = async (name) => {
      let u;
      try {
        u = syncedItemPath_2(name, root);
      } catch (error) {
        if (error instanceof LegacyReservedSpellingError) return false;
        return true;
      }
      let L = await liveEntryClassifier(u);
      if (L === "live") return true;
      if (L === "indeterminate") return false;
      Me.add(u);
      let T = Ue.get(u);
      if (T !== undefined) return T;
      let F = moveToSyncTrash(u, storageV5).finally(() => Ue.delete(u));
      Ue.set(u, F);
      return F;
    };
    let Ke = new Set(Array.from(liveDirs, (r) => basename(r)));
    let pt = pruneDynamicSkillsNotIn(Ke);
    if (pruneSyncedSkillState(Ke) + pt > 0) {
      clearCommandMemoizationCaches();
      markFirstRoundEmitted();
      skillsChangedSignal.emit();
    }
    de = liveDirs;
    let results = await Promise.all(
      carryover.map((r) =>
        carryoverOwningLiveDir.has(r.skillId) ? hasSyncedSkillMd(root, r.name, storageV5) : null,
      ),
    );
    let We = new Set();
    for (let [r, u] of carryover.entries()) {
      let L = results[r];
      if (L === null) continue;
      if (!L) {
        let found = U.skills.find((skill) => skill.skillId === u.skillId);
        if (found) {
          We.add(u.skillId);
          toDownload.push({
            item: found,
          });
        }
        continue;
      }
      let T = basename(syncedSkillDirPath(root, u.name));
      if (C.placeholders.delete(T)) {
        C.pendingDownloads.get(T)?.resolve({
          ok: true,
        });
        C.pendingDownloads.delete(T);
        clearSkillCaches();
        clearCommandMemoizationCaches();
        y = true;
        logForDiagnosticsNoPII("info", "skills_sync_materialized_elsewhere");
      }
    }
    let filtered = carryover.filter((r) => !We.has(r.skillId));
    let Ge = new Map(carryover.filter((r) => We.has(r.skillId)).map((r) => [r.skillId, r]));
    let j = new Set(skillsSyncManifest?.staleDirs ?? []);
    let ue = new Set();
    let Q = new Set();
    let Ye = {
      pid: process.pid,
      procStart: await getProcessStartTimeAsync(process.pid),
    };
    let Xe = [];
    if (skillsSyncManifest?.pendingClaims) {
      let pendingClaims = skillsSyncManifest.pendingClaims;
      let u = new Set();
      for (let pendingClaim of pendingClaims)
        if (await isClaimOwnerAlive(pendingClaim)) u.add(parsePendingClaim(pendingClaim).name);
        else Xe.push(pendingClaim);
      for (let L of Xe) {
        let { name: T } = parsePendingClaim(L);
        if (u.has(T) || Ke.has(T)) continue;
        j.add(T);
        Q.add(L);
      }
    }
    for (let r of j)
      if (await He(r)) {
        j.delete(r);
        ue.add(r);
      }
    if (ue.size > 0 || Q.size > 0) y = true;
    let ve = replaceRowsWithAttribution(
      skillsSyncManifest?.skills ?? [],
      [...carryover, ...toDownload.flatMap(({ prev }) => prev ?? [])],
      (r) => r.skillId,
      (r, u) =>
        r.backingPluginId === u.backingPluginId &&
        (r.updatedAt === COLLISION_LOSER) === (u.updatedAt === COLLISION_LOSER),
    );
    if (toDownload.length === 0 && toRemove.length === 0) {
      if (y) resetSkillSyncState();
      if ((ue.size > 0 || Q.size > 0 || ve.attributionMoved) && skillsSyncManifest)
        await writeSkillsSyncManifest(
          {
            lastUpdated: skillsSyncManifest.lastUpdated,
            skills: ve.rows,
            staleDirs: j.size > 0 ? Array.from(j) : undefined,
            pendingClaims: undefined,
          },
          {
            staleDirs: ue,
            pendingClaims: Q,
            removedSkillIds: SKILLS_MANIFEST_SCHEMA,
            deferredRows: SKILLS_MANIFEST_SCHEMA_PLACEHOLDER,
          },
          storageV5,
          G,
        );
      if (skillsSyncManifest) {
        let date = new Date();
        await lutimes(manifestPathIn(root), date, date).catch(() => {});
      }
      let r = y ? null : wn;
      noteBucketGeneration(
        await writeOrClearReuseStamp(
          root,
          "skills",
          j.size === 0 && !W && !isSessionRefsSyncEnabled(e),
          r,
          listedForKey(se),
        ),
        r,
      );
      logForDiagnosticsNoPII("info", "skills_sync_no_changes", {
        duration_ms: Date.now() - now,
        list_ms: listMs,
        ...(t.trigger === "startup" && {
          first_message_gate_open_ms: Math.round(performance.now() - startTime),
        }),
      });
      let u = {
        ...S(),
        no_changes: true,
      };
      if (W) logFeatureSad("skills_sync_round", "not_entitled", u);
      else logFeatureOk("skills_sync_round", u);
      return;
    }
    let hn = 0;
    for (let { item, prev } of toDownload)
      if (!prev) {
        let baseDir = syncedSkillDirPath(root, item.name);
        let deferredSyncedSkillCommand = createDeferredSyncedSkillCommand(basename(baseDir), item, baseDir);
        if (deferredSyncedSkillCommand === undefined) continue;
        registerSkillPlaceholder(deferredSyncedSkillCommand);
        hn++;
        O.set(item.skillId, registerPendingDownload(basename(syncedSkillDirPath(root, item.name))));
      }
    if (hn > 0) {
      clearCommandMemoizationCaches();
      markFirstRoundEmitted();
      skillsChangedSignal.emit();
    }
    let Mn = true;
    try {
      let r = [];
      for (let { item } of toDownload)
        try {
          r.push(syncKeyOf(basename(syncedSkillDirPath(root, item.name)), Ye));
        } catch {}
      if (r.length > 0)
        await writeSkillsSyncManifest(
          {
            lastUpdated: skillsSyncManifest?.lastUpdated ?? 0,
            skills: ve.rows,
            staleDirs: j.size > 0 ? Array.from(j) : undefined,
            pendingClaims: r,
          },
          {
            staleDirs: ue,
            pendingClaims: Q,
            removedSkillIds: SKILLS_MANIFEST_SCHEMA,
            deferredRows: SKILLS_MANIFEST_SCHEMA_PLACEHOLDER,
          },
          storageV5,
          G,
        );
    } catch (error) {
      if (error instanceof SyncOwnedRootRefusedError) throw error;
      Mn = false;
      logForDiagnosticsNoPII("warn", "skills_sync_pending_claims_write_failed");
    }
    firstListDeferred().resolve();
    let firstMessageGateOpenMs = Math.round(performance.now() - startTime);
    if (!Mn) {
      logFeatureBad("skills_sync_round", "pending_claims_write_failed", S());
      if (y) resetSkillSyncState();
      return;
    }
    let skills = [];
    let Rn = [];
    let Ze = [];
    let De = 0;
    let vn = 0;
    let me = {};
    let Dn = ({ item, prev }) =>
      prev === undefined && !Ge.has(item.skillId) ? hostMountKindForRow(item) : undefined;
    let flattened = toDownload.flatMap((r) => Dn(r) ?? []);
    let En = new Set(flattened);
    let Je = new Map();
    let In = (r) => {
      logForDiagnosticsNoPII("warn", "skills_sync_host_mount_threw");
      logError(toError(r));
      return null;
    };
    let Cn = En.size > 0 ? createHostSkillReader(En, Je).catch(In) : null;
    let Le = new Set();
    let Tn = new Map();
    await Promise.all(
      toDownload.map(
        limitConcurrency(MAX_INSTALL_WAIT_CHAIN, async ({ item }) => {
          Tn.set(item, await readSyncedSkillMd(root, item.name, storageV5));
        }),
      ),
    );
    await Promise.all(
      toDownload.map(
        preloadThenLimit(
          MAX_INSTALL_WAIT_CHAIN,
          async (r) => {
            let u = Dn(r);
            if (u === undefined) return;
            let T = await (await Cn)?.readZip(u, r.item).catch(In);
            return T
              ? {
                  kind: u,
                  zip: T,
                }
              : undefined;
          },
          async ({ item, prev }, fromHostMount) => {
            let T = Tn.get(item) ?? null;
            let F = ZIP_FETCH_FAILED_RESULT;
            try {
              F = await landSyncedSkill(item, {
                round: G,
                credentials: s,
                storageV5,
                classifyOccupant: (K) => skillDirOccupancy(K, storageV5, G),
                markTargetDestroyed: () => {
                  h = true;
                },
                replacesAttributedCopy:
                  (prev !== undefined && (await isSameSkillDir(root, prev.name, item.name))) ||
                  Ge.has(item.skillId),
                targetHeldSkillFile: isQuizzicalWirthOn() && T !== null,
                fromHostMount,
                markLandedFromHostMount: () => {
                  Le.add(item.skillId);
                },
                hostMountMissCounts: Je,
                noteDownloadedBytes: (K) => {
                  M += K;
                },
              });
            } catch {
              F = ARCHIVE_UNUSABLE_RESULT;
              logForDiagnosticsNoPII("warn", "skills_sync_extract_failed");
            }
            if (F.ok) {
              skills.push(item);
              if (prev && prev.name !== item.name) {
                if (!(await He(prev.name))) j.add(prev.name);
              }
              unregisterSkillPlaceholder(basename(syncedSkillDirPath(root, item.name)));
              clearSkillCaches();
              clearCommandMemoizationCaches();
              logFeatureOk("skills_sync_download", {
                landed_from_mount: Le.has(item.skillId),
              });
            } else {
              let syncFailureEvent = getSyncFailureEvent(F.cause);
              if (syncFailureEvent === null) {
                De++;
                logForDiagnosticsNoPII("info", "skills_sync_landing_deferred");
              } else {
                me[syncFailureEvent] = (me[syncFailureEvent] ?? 0) + 1;
                logFeatureBad("skills_sync_download", syncFailureEvent);
              }
              let _e = prev ?? Ge.get(item.skillId);
              if (_e && F.cause === "deferred") {
                Ze.push(_e);
                if (prev && prev.name !== item.name) {
                  j.add(prev.name);
                  vn++;
                }
              } else if (_e) Rn.push(_e);
              else
                try {
                  let ee = syncedSkillDirPath(root, item.name);
                  if (
                    await lstat(ee).then(
                      () => false,
                      (error) => isENOENT(error),
                    )
                  )
                    Q.add(syncKeyOf(basename(ee), Ye));
                } catch {}
            }
            O.get(item.skillId)?.(
              F.ok
                ? {
                    ok: true,
                  }
                : {
                    ok: false,
                    reason: describeSyncFailure(F.cause),
                  },
            );
          },
        ),
      ),
    );
    let we = [];
    await Promise.all(
      toRemove.map(
        limitConcurrency(MAX_INSTALL_WAIT_CHAIN, async (r) => {
          if (!(await He(r.name))) we.push(r);
        }),
      ),
    );
    let Qe = new Set(toRemove.map((r) => r.skillId));
    for (let r of we) Qe.delete(r.skillId);
    let Ve = skills.length > 0 || h || we.length < toRemove.length || ue.size > 0 || Q.size > 0;
    let Mt = Ve || vn > 0 || ve.attributionMoved;
    if (Qe.size > 0) clearCommandMemoizationCaches();
    if (Ve || y) resetSkillSyncState();
    let Ee = false;
    if (Mt) {
      let skills_2 = [...filtered, ...skills, ...Rn, ...we];
      let u = new Set();
      for (let F of [...skills_2, ...Ze])
        try {
          u.add(basename(syncedSkillDirPath(root, F.name)));
        } catch {}
      for (let F of u) Q.add(syncKeyOf(F, Ye));
      for (let F of Xe) if (u.has(parsePendingClaim(F).name)) Q.add(F);
      let L = (skills, onlyOverReadable) =>
        writeSkillsSyncManifest(
          {
            lastUpdated: Date.now(),
            skills,
            staleDirs: j.size > 0 ? Array.from(j) : undefined,
          },
          {
            staleDirs: ue,
            pendingClaims: Q,
            removedSkillIds: Qe,
            deferredRows: Ze,
            onlyOverReadable,
          },
          storageV5,
          G,
        );
      await L(skills_2, false);
      let T = skills.length > 0 && isQuizzicalWirthOn() ? 2 : 0;
      for (let idx = 0; idx < T; idx++) {
        await sleep(C.lostRowsRecheckMs * (1 + Math.random()));
        let skillsSyncManifest = await readSkillsSyncManifest(storageV5, G);
        let _e = new Set(skillsSyncManifest?.skills.map((skill) => skill.skillId));
        Ee = !skills.every((ee) => _e.has(ee.skillId));
        if (!Ee) break;
        if (skillsSyncManifest === null) continue;
        logForDiagnosticsNoPII("info", "skills_sync_manifest_rows_lost");
        try {
          await L(skills, true);
        } catch (error) {
          if (error instanceof SyncOwnedRootRefusedError) throw error;
          logError(toError(error));
          break;
        }
      }
      if (Ee) logForDiagnosticsNoPII("warn", "skills_sync_manifest_rows_unconfirmed");
    }
    let en = toDownload.length - skills.length - De;
    let Fn = await Cn;
    let nn = {
      downloaded: skills.length - Le.size,
      from_mount: Le.size,
      mount_eligible: flattened.length,
      mount_read_ms: Fn?.spentMs() ?? 0,
      mount_wait_ms: Fn?.waitedMs() ?? 0,
      ...flattenMountMissCounts(Je),
    };
    logForDiagnosticsNoPII("info", "skills_sync_complete", {
      ...nn,
      removed: toRemove.length,
      duration_ms: Date.now() - now,
      list_ms: listMs,
      ...(t.trigger === "startup" && {
        first_message_gate_open_ms: firstMessageGateOpenMs,
      }),
    });
    let Pn = S();
    logEvent("tengu_skills_sync_success", {
      ...Pn,
      ...nn,
      removed: toRemove.length,
      total: U.skills.length,
    });
    let An = Ve || y ? null : wn;
    noteBucketGeneration(
      await writeOrClearReuseStamp(
        root,
        "skills",
        !W && en === 0 && De === 0 && !Ee && we.length === 0 && j.size === 0 && !isSessionRefsSyncEnabled(e),
        An,
        listedForKey(se),
      ),
      An,
    );
    let tn = {
      ...Pn,
      ...nn,
      deferred: De,
      removed: toRemove.length,
      total: U.skills.length,
    };
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
    if (y || h) resetSkillSyncState();
    if (error instanceof SyncOwnedRootRefusedError && I) {
      logForDiagnosticsNoPII("warn", "skills_sync_late_root_refusal", {
        reason: error.reason,
        duration_ms: Date.now() - now,
      });
      logFeatureSad("skills_sync_round", "root_refused", S());
      I = false;
    } else if (error instanceof SyncOwnedRootRefusedError) {
      logForDiagnosticsNoPII("warn", "skills_sync_root_refused_round", {
        reason: error.reason,
        duration_ms: Date.now() - now,
      });
      logFeatureSad("skills_sync_round", "root_refused", S());
    } else {
      if (!W) C.consecutiveFailedRounds++;
      logForDiagnosticsNoPII("error", "skills_sync_unexpected_error", {
        duration_ms: Date.now() - now,
      });
      let G = S();
      logEvent("tengu_skills_sync_error", G);
      logFeatureBad("skills_sync_round", "unexpected_error", G);
    }
  } finally {
    if (ke) rescheduleResyncByBackoff();
    for (let x of O.values())
      x({
        ok: false,
        reason: "skills sync failed",
      });
    firstListDeferred().resolve();
    if (de !== null && B !== null)
      await pruneGoneSkillDirs({
        bucketRoot: B.root,
        listedDirs: de,
        removalTriedDirs: Me,
        isSkillFileGone: (x) => isSkillMdMissing(x, storageV5),
      }).catch(() => {
        logForDiagnosticsNoPII("warn", "skills_sync_hooks_removal_failed");
      });
    if (B === null || B.guard.refused()) I = false;
    if (I && B !== null) {
      if (
        (await verifySyncRoot(
          B.root,
          getClaudeConfigDir(),
          {
            event: "skills_sync_root_refused",
            phase: "sweep",
            rootLabel: SKILLS_SYNC_DIR_2,
          },
          {
            checkStagingLeaf: true,
            storageV5,
          },
        ).catch(() => null)) === "real"
      )
        await rm(perProcessTempDir(B.root), {
          recursive: true,
          force: true,
        }).catch(() => {});
    }
  }
}
//@ chunk-hme9amad.js:30122-30240 placement
async function isClaimOwnerAlive(e) {
  let { ownerPid, ownerProcStart } = parsePendingClaim(e);
  return (
    ownerPid !== undefined &&
    ownerPid !== process.pid &&
    isProcessRunning(ownerPid) &&
    (await isSameProcessAsync(ownerPid, ownerProcStart))
  );
}
//@ chunk-hme9amad.js:30240-30763 placement
/**
 * 判断技能目录被谁占用：已落地、进行中或无归属。
 */
async function skillDirOccupancy(e, n, s) {
  let skillsSyncManifest = await readSkillsSyncManifest(n, s);
  if (!skillsSyncManifest) return "unattributed";
  for (let skill of skillsSyncManifest.skills)
    if (await isSameSkillDir(s.root, skill.name, e)) return "landed";
  for (let d of skillsSyncManifest.pendingClaims ?? [])
    if (parsePendingClaim(d).name === e && (await isClaimOwnerAlive(d))) {
      if (!isQuizzicalWirthOn()) return "inFlight";
      let w = await lstat(join(s.root, e)).then(
        (h) => Math.floor(h.ctimeMs),
        (error) => {
          if (isENOENT(error)) return -1 / 0;
          logForDiagnosticsNoPII("warn", "skills_sync_occupant_unreadable", {
            code: getErrnoCode(error) ?? "unknown",
          });
          return 1 / 0;
        },
      );
      if (!(Date.now() - w >= INSTALL_WAIT_CEILING_MS)) return "inFlight";
      logForDiagnosticsNoPII("info", "skills_sync_live_claim_timed_out");
      return "unattributed";
    }
  return "unattributed";
}
//@ chunk-hme9amad.js:30763-30865 placement
async function isSameSkillDir(root, name, s) {
  try {
    let t = syncedSkillDirPath(root, name);
    let d = syncedSkillDirPath(root, s);
    return basename(t) === basename(d) || (await isSameFileIdentity(t, d));
  } catch {
    return false;
  }
}
//@ chunk-hme9amad.js:30865-30990 placement
/**
 * 检查技能同步拥有的根目录（带回收目录与配置目录）。
 */
function checkSyncOwnedRootFor(storageV5, root) {
  return checkSyncOwnedRoot({
    root,
    trashRoot: trashRootDir(),
    configHome: getClaudeConfigDir(),
    events: {
      refused: "skills_sync_root_refused",
    },
    storageV5,
  });
}
export { runSyncRoundOnce, reconcileSkillsManifest, checkSyncOwnedRootFor };
