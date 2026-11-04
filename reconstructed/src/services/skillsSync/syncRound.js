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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hme9amad.js:13495-14841 placement = createSkillCommand (0.55)
/**
 * 为尚未下载正文的同步 skill 创建占位命令；调用时等待下载完成再转交真正的命令，失败时返回「Skill X could not be downloaded … Proceed without it.」。
 */
function createDeferredSyncedSkillCommand(skillName, entry, baseDir) {
  let skillCommand = createSkillCommand({
    skillName,
    displayName: undefined,
    description: escapeXmlInline(entry.description),
    hasUserSpecifiedDescription: true,
    markdownContent: "",
    allowedTools: [],
    argumentHint: undefined,
    argumentNames: [],
    whenToUse: undefined,
    version: undefined,
    model: undefined,
    disableModelInvocation: entry.disableModelInvocation ?? false,
    userInvocable: entry.userInvocable ?? true,
    source: "userSettings",
    baseDir,
    serverAttribution: buildSkillAttribution(entry.skillId, entry.backingPluginId),
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
    skillCommand.getPromptForCommand = async (args, context) => {
      let downloadResult = await raceWithAbortSignal(
        startPendingDownload(skillName),
        context.abortController.signal,
        () => new AbortError(),
      );
      if (downloadResult.ok) {
        let found = (await getCommands(getProjectRootOrNull(), context.storageV5)).find(
          (command) =>
            command.loadedFrom === "syncedSkills" &&
            isHostCatalogSkill(command) === isHostCatalogSkill(skillCommand) &&
            command.name === skillCommand.name &&
            command.type === "prompt" &&
            command.getPromptForCommand !== skillCommand.getPromptForCommand,
        );
        if (found && found.type === "prompt") {
          skillCommand.source = found.source;
          skillCommand.skillRoot = found.skillRoot;
          skillCommand.skillFile = found.skillFile;
          skillCommand.contentLength = found.contentLength;
          skillCommand.progressMessage = found.progressMessage;
          skillCommand.userInvocable = found.userInvocable;
          return found.getPromptForCommand(args, context);
        }
      }
      let reason = downloadResult.ok ? "skill not found after download" : downloadResult.reason;
      return [
        {
          type: "text",
          text:
            !downloadResult.ok && downloadResult.withheld
              ? `${skillSwitchedOffText(skillCommand.name)} Proceed without it.`
              : `Skill ${skillName} could not be downloaded (${reason}). Proceed without it.`,
        },
      ];
    };
  return skillCommand;
}
//@ chunk-hme9amad.js:14841-14955 placement
function checkSkillsSyncRoot(storageV5, bucket) {
  return freshRootState({
    root: () => bucket,
    configHome: getClaudeConfigDir,
    rootLabel: SKILLS_SYNC_DIR_2,
    event: "skills_sync_root_refused",
    storageV5,
  });
}
//@ chunk-hme9amad.js:14955-15041 placement
var ZIP_FETCH_FAILED_RESULT; // deferred: uses downloadFailure (../../utils/claudeAiSync/syncOwnedRoot.js) of its import cycle while loading; runs once the cycle is complete
var ARCHIVE_UNUSABLE_RESULT;
deferInit("chunk-hme9amad.js:14955", () => {
  ZIP_FETCH_FAILED_RESULT = downloadFailure("zip fetch failed");
  ARCHIVE_UNUSABLE_RESULT = extractFailure("skill archive unusable or landing obstructed");
});
//@ chunk-hme9amad.js:15041-16971 placement
async function downloadSyncedSkill(
  item,
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
  zipBytes,
) {
  let root = round.root;
  let targetDir = syncedSkillDirPath(root, item.name);
  let stagingDir = join(perProcessTempDir(root), relative(root, targetDir));
  let zipPath = join(tmpdir(), `claude-skill-${process.pid}-${Math.random().toString(36).slice(2)}.zip`);
  try {
    if (round.guard.refused()) return ROOT_REFUSED_RESULT;
    if (zipBytes !== undefined) await writeFile(zipPath, zipBytes);
    else {
      if (
        !replacesAttributedCopy &&
        targetHeldSkillFile &&
        (await classifyOccupant(basename(targetDir))) === "inFlight"
      ) {
        logForDiagnosticsNoPII("info", "skills_sync_target_in_flight_elsewhere");
        return DEFERRED_PLACEMENT;
      }
      if (
        !(await downloadOrgSkillZip(item.skillId, zipPath, item.requestedVersion, {
          isBackground: true,
          credentials,
        }))
      )
        return ZIP_FETCH_FAILED_RESULT;
      noteDownloadedBytes((await lstat(zipPath).catch(() => null))?.size ?? 0);
    }
    if (!(await round.guard.verify())) return ROOT_REFUSED_RESULT;
    await rm(stagingDir, {
      recursive: true,
      force: true,
    });
    await mkdir(perProcessTempDir(root), {
      recursive: true,
    });
    await readAndUnzipFile(zipPath, stagingDir, {
      skipEntry: (entryName) => entryName.split(/[\\/]/).some((segment) => isHiddenFoldName(segment)),
    });
    let contentRoot = stagingDir;
    let extracted = await readdir(stagingDir, {
      withFileTypes: true,
    });
    if (
      !extracted.some((entry) => entry.name === "SKILL.md") &&
      extracted.length === 1 &&
      extracted[0].isDirectory()
    )
      contentRoot = join(stagingDir, extracted[0].name);
    try {
      if (!(await stat(join(contentRoot, "SKILL.md"))).isFile()) {
        logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable");
        return ARCHIVE_UNUSABLE_RESULT;
      }
    } catch {
      logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable");
      return ARCHIVE_UNUSABLE_RESULT;
    }
    if (await containsGitDirectory(contentRoot)) {
      logForDiagnosticsNoPII("warn", "skills_sync_extracted_zip_unusable");
      return ARCHIVE_UNUSABLE_RESULT;
    }
    if (!(await round.guard.verify())) return ROOT_REFUSED_RESULT;
    if (replacesAttributedCopy)
      await rm(targetDir, {
        recursive: true,
        force: true,
      });
    try {
      await rename(contentRoot, targetDir);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (replacesAttributedCopy || !isDirConflictErrno(errnoCode)) {
        if (replacesAttributedCopy) markTargetDestroyed();
        logForDiagnosticsNoPII("warn", "skills_sync_promotion_failed", {
          code: errnoCode ?? "unknown",
        });
        return buildLocalPlacementFailure(errnoCode);
      }
      let occupancy = await classifyOccupant(basename(targetDir));
      if (occupancy === "inFlight") {
        logForDiagnosticsNoPII("info", "skills_sync_target_in_flight_elsewhere");
        return DEFERRED_PLACEMENT;
      }
      if (occupancy === "landed")
        await rm(targetDir, {
          recursive: true,
          force: true,
        });
      else if (!(await moveToSyncTrash(targetDir, storageV5))) return LOCAL_PLACEMENT_FAILURE;
      try {
        await rename(contentRoot, targetDir);
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
    await rm(zipPath, {
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
      await rm(stagingDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-hme9amad.js:16971-16982 placement
var SYNC_RETRY_SLEEP_MS = 500;
//@ chunk-hme9amad.js:16982-17116 placement
async function downloadWithRetry(item, ctx) {
  try {
    return await downloadSyncedSkill(item, ctx, undefined);
  } catch {
    logForDiagnosticsNoPII("warn", "skills_sync_extract_retry");
    await sleep(SYNC_RETRY_SLEEP_MS);
    return downloadSyncedSkill(item, ctx, undefined);
  }
}
//@ chunk-hme9amad.js:17116-17404 placement
async function landSyncedSkill(item, ctx) {
  let { fromHostMount } = ctx;
  if (fromHostMount !== undefined) {
    let mountResult = await downloadSyncedSkill(item, ctx, fromHostMount.zip).catch(() => null);
    if (mountResult?.ok) ctx.markLandedFromHostMount();
    if (mountResult !== null && (mountResult.ok || mountResult.cause !== "extract")) return mountResult;
    recordMountMiss(
      fromHostMount.kind,
      {
        reason: mountResult === null ? "landing_threw" : "zip_unusable",
      },
      ctx.hostMountMissCounts,
    );
  }
  return downloadWithRetry(item, ctx);
}
//@ chunk-hme9amad.js:17404-17561 placement
/**
 * 启动一轮技能同步；已有同步进行时复用同一 Promise。
 */
async function runSyncRoundOnce(sessionId, credentials, storageV5, trigger) {
  let state = remoteToolsState();
  if (state.syncPromise) return state.syncPromise;
  state.syncPromise = runSkillsSyncRound(sessionId, credentials, storageV5, trigger).finally(() => {
    state.syncPromise = null;
  });
  return state.syncPromise;
}
//@ chunk-hme9amad.js:17561-18945 placement
async function reconcileSkillsManifest(bucketDir, storageV5) {
  let manifestPath = join(bucketDir, SYNCED_MANIFEST_FILE);
  let manifest;
  let originalText;
  let parsedJson;
  try {
    originalText = (await readFileChecked(manifestPath, MAX_SYNCED_SKILL_BYTES)).content;
    parsedJson = jsonParse(originalText);
  } catch {
    return null;
  }
  let parsed = syncedSkillsManifestSchema().safeParse(parsedJson);
  if (parsed.success) {
    let { lastUpdated, skills, staleDirs, pendingClaims, ...rest } = parsed.data;
    manifest = {
      ...rest,
      lastUpdated,
      skills: parseValidRows(syncedSkillEntrySchema(), skills),
      staleDirs: stringArray(staleDirs),
      pendingClaims: stringArray(pendingClaims),
    };
  } else return null;
  let rows = [
    ...manifest.skills.map((row) => ({
      row,
      syntheticListName: null,
    })),
    ...["staleDirs", "pendingClaims"].flatMap((listName) =>
      (manifest[listName] ?? []).map((claim) => ({
        row: {
          name: listName === "pendingClaims" ? parsePendingClaim(claim).name : claim,
        },
        syntheticListName: listName,
        entry: claim,
      })),
    ),
  ];
  let trashedCount = 0;
  let keptSkills = [];
  let keptStaleDirs = [];
  let keptClaims = [];
  for (let rowEntry of rows) {
    let row = rowEntry.row;
    if (rowEntry.syntheticListName === "pendingClaims" && (await isClaimOwnerAlive(rowEntry.entry))) {
      keptClaims.push(rowEntry.entry);
      continue;
    }
    try {
      let itemPath = syncedItemPath_2(row.name, bucketDir);
      if (await isSameFileIdentity(itemPath, skillsSyncDir())) {
        logForDiagnosticsNoPII("info", "skills_sync_sibling_root_row_skipped");
        continue;
      }
      if (await isSameFileIdentity(itemPath, trashRootDir())) {
        logForDiagnosticsNoPII("info", "skills_sync_trash_root_row_skipped");
        continue;
      }
      if (await moveToSyncTrash(itemPath, storageV5)) trashedCount++;
      else if (rowEntry.syntheticListName === "staleDirs") keptStaleDirs.push(rowEntry.entry);
      else if (rowEntry.syntheticListName === "pendingClaims") keptClaims.push(rowEntry.entry);
      else keptSkills.push(rowEntry.row);
    } catch (error) {
      if (error instanceof LegacyReservedSpellingError) {
        if (rowEntry.syntheticListName === "staleDirs") keptStaleDirs.push(rowEntry.entry);
        else if (rowEntry.syntheticListName === "pendingClaims") keptClaims.push(rowEntry.entry);
        else keptSkills.push(rowEntry.row);
        continue;
      }
    }
  }
  if (keptSkills.length > 0 || keptStaleDirs.length > 0 || keptClaims.length > 0) {
    let nextText = jsonStringify(
      {
        ...manifest,
        skills: keptSkills,
        staleDirs: keptStaleDirs.length > 0 ? keptStaleDirs : undefined,
        pendingClaims: keptClaims.length > 0 ? keptClaims : undefined,
      },
      null,
      2,
    );
    if (nextText !== originalText) await writeFileAtomic(manifestPath, nextText).catch(() => {});
  } else
    await rm(manifestPath, {
      force: true,
    }).catch(() => {});
  return trashedCount;
}
//@ chunk-hme9amad.js:18945-30122 placement
/**
 * claude.ai skills 同步一轮：检查开关与账号选择、解析 bucket、下载 skill zip 解压到同步目录、清理过期目录、记录 skills_sync_round 遥测；支持睡眠唤醒后的重同步。
 */
async function runSkillsSyncRound(sessionId, storageV5, credentials, trigger) {
  let now = Date.now();
  let startTime = performance.now();
  let hadLandedFailure = false;
  let changedLocally = false;
  let accountOptIn = false;
  let idle = false;
  let keptCount = 0;
  let downloadedBytes = 0;
  let baseTelemetry = () => {
    let durationMs = Date.now() - now;
    return {
      account_opt_in: accountOptIn,
      idle,
      woken: "woken" in trigger,
      trigger: fromEnum(trigger.trigger),
      ...("tickLateMs" in trigger && {
        tick_late_ms: trigger.tickLateMs,
      }),
      ...(keptCount > 0 && {
        kept: keptCount,
      }),
      ...(downloadedBytes > 0 && {
        approx_downloaded_bytes: Number(downloadedBytes.toPrecision(2)),
      }),
      duration_ms: durationMs,
      suspended_ms: Math.max(0, Math.round(durationMs - (performance.now() - startTime))),
    };
  };
  let pendingResolvers = new Map();
  let touchedBucket = false;
  let round = null;
  let state = remoteToolsState();
  let notEntitled = false;
  let previousLiveDirs = null;
  let removalTriedDirs = new Set();
  let started = false;
  try {
    accountOptIn = getAccountSkillsSyncEnabled();
    if (refreshAccountSkillsSyncFlag()) accountOptIn = true;
    if (!isSkillsSyncActive(sessionId) || !isSkillsCustomizationAllowed()) {
      logForDiagnosticsNoPII("info", "skills_sync_gate_closed");
      let { placeholders, listedOwnerships } = remoteToolsState();
      listedOwnerships.clear();
      if (placeholders.size > 0) {
        placeholders.clear();
        resetSkillSyncState();
      }
      logFeatureSad("skills_sync_round", "gate_closed", baseTelemetry());
      return;
    }
    if (readSkillsSyncSetting()) {
      logForDiagnosticsNoPII("info", "skills_sync_policy_verdict_pending");
      logFeatureSad("skills_sync_round", "policy_verdict_pending", baseTelemetry());
      return;
    }
    let syncBucket = await getSyncBucket(credentials);
    if (syncBucket === null) {
      logForDiagnosticsNoPII("info", "skills_sync_bucket_unresolved");
      logFeatureSad("skills_sync_round", "bucket_unresolved", baseTelemetry());
      return;
    }
    let syncRound = checkSkillsSyncRoot(storageV5, skillsSyncPath(syncBucket));
    round = syncRound;
    let root = syncRound.root;
    idle =
      trigger.trigger === "resync" &&
      !("woken" in trigger) &&
      state.consecutiveFailedRounds === 0 &&
      !isSessionRefsSkillsSyncOn(sessionId) &&
      shouldWeatherIdle();
    let convertedPin = convertedSkillsListPin(sessionId);
    if (convertedPin !== undefined) await convertedPin;
    let convertAsk = shouldConvertSkillsListAsks(sessionId);
    updateSessionConvertedSkillsAsk(convertAsk, storageV5);
    let reuse = await reuseSkillsSyncRound({
      syncedRoot: skillsSyncDir(),
      bucket: syncBucket,
      root,
      trigger: trigger.trigger,
      pinned: isSessionRefsSyncEnabled(sessionId),
      lastGeneration: state.bucketGeneration,
      holdsPlaceholders: state.placeholders.size > 0,
      idle,
      convertedSkillsAsPlugins: convertAsk,
    });
    if (!reuse.list) {
      state.bucketGeneration = reuse.generation;
      let hidingGone = await noteHidingFoldersGone(
        async () => (await readSkillsSyncManifest(storageV5, syncRound))?.skills ?? [],
      );
      if (reuse.reload) {
        let skillsSyncManifest = await readSkillsSyncManifest(storageV5, syncRound);
        if (skillsSyncManifest) {
          let liveNames = new Set();
          for (let skill of skillsSyncManifest.skills)
            try {
              liveNames.add(basename(syncedSkillDirPath(root, skill.name)));
            } catch {}
          pruneDynamicSkillsNotIn(liveNames);
        }
        previousLiveDirs = new Set();
        resetSkillSyncState();
      } else if (hidingGone) resetSkillSyncState();
      logFeatureOk("skills_sync_round", {
        ...baseTelemetry(),
        reused: true,
        reloaded: reuse.reload || hidingGone,
      });
      return;
    }
    started = true;
    logForDiagnosticsNoPII("info", "skills_sync_starting");
    let listResult;
    let sessionRefRows = [];
    let startTime_2 = performance.now();
    if (isSessionRefsSyncEnabled(sessionId)) {
      let [sessionManifest, orgList] = await Promise.all([
        sessionSkillManifestSlot.of(sessionId).listEntries("skills", {
          startup: trigger.trigger === "startup",
        }),
        env.CLAUDE_CODE_SYNC_SKILLS
          ? fetchOrgSkillsListWithRetry({
              isBackground: true,
              credentials,
              ...(convertAsk && {
                convertedSkillsAsPlugins: true,
              }),
            })
          : null,
      ]);
      if (!sessionManifest.success) listResult = sessionManifest;
      else {
        sessionRefRows = sessionManifest.entries.map(sessionRefSkillEntry);
        if (orgList === null)
          listResult = {
            success: true,
            skills: sessionRefRows,
          };
        else if (!orgList.success) listResult = orgList;
        else
          listResult = {
            success: true,
            skills: mergeRowsByKey(
              sessionRefRows,
              orgList.skills,
              (row) => row.skillId,
              (sessionRow, orgRow) => ({
                ...carryBackingPluginId(sessionRow, orgRow),
                userInvocable: orgRow.userInvocable,
                disableModelInvocation: orgRow.disableModelInvocation,
              }),
            ),
          };
      }
    } else
      listResult = await fetchOrgSkillsListWithRetry({
        isBackground: true,
        credentials,
        ...(convertAsk && {
          convertedSkillsAsPlugins: true,
        }),
      });
    let listMs = Math.round(performance.now() - startTime_2);
    notEntitled = !listResult.success && isNotFoundServerError(listResult);
    if (notEntitled) {
      logForDiagnosticsNoPII("warn", "skills_sync_list_refused");
      state.listedOwnerships.clear();
      listResult = {
        success: true,
        skills: sessionRefRows,
      };
    }
    if (!listResult.success) {
      state.consecutiveFailedRounds++;
      let errorTelemetry = listErrorTelemetry(listResult);
      let failureTelemetry = {
        ...baseTelemetry(),
        ...errorTelemetry,
      };
      logForDiagnosticsNoPII("warn", "skills_sync_list_failed", failureTelemetry);
      logEvent("tengu_skills_sync_list_failed", failureTelemetry);
      if (
        (listResult.kind === "timeout" || listResult.kind === "network" || listResult.kind === "http") &&
        failureTelemetry.suspended_ms > FIRST_FAILED_ROUND_THRESHOLD_MS
      )
        logFeatureSad("skills_sync_round", "suspended", failureTelemetry);
      else logFeatureBad("skills_sync_round", "list_failed", failureTelemetry);
      return;
    }
    state.consecutiveFailedRounds = notEntitled ? state.consecutiveFailedRounds + 1 : 0;
    let syncMarker = await readSyncMarker(skillsSyncDir(), syncBucket);
    if (
      syncMarker === "unmarked" &&
      (await lstat(root).then(
        (stats) => stats.isDirectory(),
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
    touchedBucket = true;
    let reuseStamp = await takeReuseStamp(root);
    if (
      (!notEntitled &&
        (await noteHidingFoldersGone(
          async () => (await readSkillsSyncManifest(storageV5, syncRound))?.skills ?? [],
        ))) ||
      (reuse.shared &&
        reuseStamp !== null &&
        state.bucketGeneration !== null &&
        reuseStamp.token !== state.bucketGeneration)
    )
      resetSkillSyncState();
    await trashStraySyncEntries(storageV5);
    let skillsSyncManifest = await readSkillsSyncManifest(storageV5, syncRound);
    let convertedRows =
      convertAsk && !notEntitled
        ? await resolveSkillsBucket(skillsSyncManifest?.skills ?? [], listResult.skills, syncBucket)
        : [];
    keptCount = convertedRows.length;
    let stampRows = reuseStamp !== null && convertAsk ? onlyConvertedSkills(reuseStamp) : reuseStamp;
    let { toDownload, toRemove, carryover, liveDirs, carryoverOwningLiveDir } = assignSkillDirs(
      root,
      [...listResult.skills, ...convertedRows],
      skillsSyncManifest?.skills ?? [],
    );
    let liveEntryClassifier = createLiveEntryClassifier(liveDirs);
    let inflightTrash = new Map();
    let trashIfNotLive = async (item) => {
      let itemPath;
      try {
        itemPath = syncedItemPath_2(item, root);
      } catch (error) {
        if (error instanceof LegacyReservedSpellingError) return false;
        return true;
      }
      let occupancy = await liveEntryClassifier(itemPath);
      if (occupancy === "live") return true;
      if (occupancy === "indeterminate") return false;
      removalTriedDirs.add(itemPath);
      let pendingTrash = inflightTrash.get(itemPath);
      if (pendingTrash !== undefined) return pendingTrash;
      let trashPromise = moveToSyncTrash(itemPath, storageV5).finally(() => inflightTrash.delete(itemPath));
      inflightTrash.set(itemPath, trashPromise);
      return trashPromise;
    };
    let liveDirNames = new Set(Array.from(liveDirs, (liveDir) => basename(liveDir)));
    let dynamicPruned = pruneDynamicSkillsNotIn(liveDirNames);
    if (pruneSyncedSkillState(liveDirNames) + dynamicPruned > 0) {
      clearCommandMemoizationCaches();
      markFirstRoundEmitted();
      skillsChangedSignal.emit();
    }
    previousLiveDirs = liveDirs;
    let results = await Promise.all(
      carryover.map((row) =>
        carryoverOwningLiveDir.has(row.skillId) ? hasSyncedSkillMd(root, row.name, storageV5) : null,
      ),
    );
    let reDownloadIds = new Set();
    for (let [idx, row] of carryover.entries()) {
      let hasMd = results[idx];
      if (hasMd === null) continue;
      if (!hasMd) {
        let found = listResult.skills.find((skill) => skill.skillId === row.skillId);
        if (found) {
          reDownloadIds.add(row.skillId);
          toDownload.push({
            item: found,
          });
        }
        continue;
      }
      let dirName = basename(syncedSkillDirPath(root, row.name));
      if (state.placeholders.delete(dirName)) {
        state.pendingDownloads.get(dirName)?.resolve({
          ok: true,
        });
        state.pendingDownloads.delete(dirName);
        clearSkillCaches();
        clearCommandMemoizationCaches();
        changedLocally = true;
        logForDiagnosticsNoPII("info", "skills_sync_materialized_elsewhere");
      }
    }
    let filtered = carryover.filter((row) => !reDownloadIds.has(row.skillId));
    let reDownloadRows = new Map(
      carryover.filter((row) => reDownloadIds.has(row.skillId)).map((row) => [row.skillId, row]),
    );
    let staleDirs = new Set(skillsSyncManifest?.staleDirs ?? []);
    let removedStaleDirs = new Set();
    let newClaims = new Set();
    let owner = {
      pid: process.pid,
      procStart: await getProcessStartTimeAsync(process.pid),
    };
    let deadClaims = [];
    if (skillsSyncManifest?.pendingClaims) {
      let pendingClaims = skillsSyncManifest.pendingClaims;
      let liveClaimNames = new Set();
      for (let pendingClaim of pendingClaims)
        if (await isClaimOwnerAlive(pendingClaim)) liveClaimNames.add(parsePendingClaim(pendingClaim).name);
        else deadClaims.push(pendingClaim);
      for (let claim of deadClaims) {
        let { name } = parsePendingClaim(claim);
        if (liveClaimNames.has(name) || liveDirNames.has(name)) continue;
        staleDirs.add(name);
        newClaims.add(claim);
      }
    }
    for (let dirName of staleDirs)
      if (await trashIfNotLive(dirName)) {
        staleDirs.delete(dirName);
        removedStaleDirs.add(dirName);
      }
    if (removedStaleDirs.size > 0 || newClaims.size > 0) changedLocally = true;
    let mergeResult = replaceRowsWithAttribution(
      skillsSyncManifest?.skills ?? [],
      [...carryover, ...toDownload.flatMap(({ prev }) => prev ?? [])],
      (row) => row.skillId,
      (prevRow, newRow) =>
        prevRow.backingPluginId === newRow.backingPluginId &&
        (prevRow.updatedAt === COLLISION_LOSER) === (newRow.updatedAt === COLLISION_LOSER),
    );
    if (toDownload.length === 0 && toRemove.length === 0) {
      if (changedLocally) resetSkillSyncState();
      if (
        (removedStaleDirs.size > 0 || newClaims.size > 0 || mergeResult.attributionMoved) &&
        skillsSyncManifest
      )
        await writeSkillsSyncManifest(
          {
            lastUpdated: skillsSyncManifest.lastUpdated,
            skills: mergeResult.rows,
            staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
            pendingClaims: undefined,
          },
          {
            staleDirs: removedStaleDirs,
            pendingClaims: newClaims,
            removedSkillIds: SKILLS_MANIFEST_SCHEMA,
            deferredRows: SKILLS_MANIFEST_SCHEMA_PLACEHOLDER,
          },
          storageV5,
          syncRound,
        );
      if (skillsSyncManifest) {
        let date = new Date();
        await lutimes(manifestPathIn(root), date, date).catch(() => {});
      }
      let reuseStampRows = changedLocally ? null : stampRows;
      noteBucketGeneration(
        await writeOrClearReuseStamp(
          root,
          "skills",
          staleDirs.size === 0 && !notEntitled && !isSessionRefsSyncEnabled(sessionId),
          reuseStampRows,
          listedForKey(convertAsk),
        ),
        reuseStampRows,
      );
      logForDiagnosticsNoPII("info", "skills_sync_no_changes", {
        duration_ms: Date.now() - now,
        list_ms: listMs,
        ...(trigger.trigger === "startup" && {
          first_message_gate_open_ms: Math.round(performance.now() - startTime),
        }),
      });
      let noChangesTelemetry = {
        ...baseTelemetry(),
        no_changes: true,
      };
      if (notEntitled) logFeatureSad("skills_sync_round", "not_entitled", noChangesTelemetry);
      else logFeatureOk("skills_sync_round", noChangesTelemetry);
      return;
    }
    let placeholderCount = 0;
    for (let { item, prev } of toDownload)
      if (!prev) {
        let baseDir = syncedSkillDirPath(root, item.name);
        let deferredSyncedSkillCommand = createDeferredSyncedSkillCommand(basename(baseDir), item, baseDir);
        if (deferredSyncedSkillCommand === undefined) continue;
        registerSkillPlaceholder(deferredSyncedSkillCommand);
        placeholderCount++;
        pendingResolvers.set(
          item.skillId,
          registerPendingDownload(basename(syncedSkillDirPath(root, item.name))),
        );
      }
    if (placeholderCount > 0) {
      clearCommandMemoizationCaches();
      markFirstRoundEmitted();
      skillsChangedSignal.emit();
    }
    let claimsWritten = true;
    try {
      let claimKeys = [];
      for (let { item } of toDownload)
        try {
          claimKeys.push(syncKeyOf(basename(syncedSkillDirPath(root, item.name)), owner));
        } catch {}
      if (claimKeys.length > 0)
        await writeSkillsSyncManifest(
          {
            lastUpdated: skillsSyncManifest?.lastUpdated ?? 0,
            skills: mergeResult.rows,
            staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
            pendingClaims: claimKeys,
          },
          {
            staleDirs: removedStaleDirs,
            pendingClaims: newClaims,
            removedSkillIds: SKILLS_MANIFEST_SCHEMA,
            deferredRows: SKILLS_MANIFEST_SCHEMA_PLACEHOLDER,
          },
          storageV5,
          syncRound,
        );
    } catch (error) {
      if (error instanceof SyncOwnedRootRefusedError) throw error;
      claimsWritten = false;
      logForDiagnosticsNoPII("warn", "skills_sync_pending_claims_write_failed");
    }
    firstListDeferred().resolve();
    let firstMessageGateOpenMs = Math.round(performance.now() - startTime);
    if (!claimsWritten) {
      logFeatureBad("skills_sync_round", "pending_claims_write_failed", baseTelemetry());
      if (changedLocally) resetSkillSyncState();
      return;
    }
    let skills = [];
    let failedPrevRows = [];
    let deferredPrevRows = [];
    let deferredCount = 0;
    let deferredRenames = 0;
    let failureCounts = {};
    let mountKindOf = ({ item, prev }) =>
      prev === undefined && !reDownloadRows.has(item.skillId) ? hostMountKindForRow(item) : undefined;
    let flattened = toDownload.flatMap((entry) => mountKindOf(entry) ?? []);
    let mountKinds = new Set(flattened);
    let mountMissCounts = new Map();
    let logMountError = (error) => {
      logForDiagnosticsNoPII("warn", "skills_sync_host_mount_threw");
      logError(toError(error));
      return null;
    };
    let hostReader =
      mountKinds.size > 0 ? createHostSkillReader(mountKinds, mountMissCounts).catch(logMountError) : null;
    let landedFromMount = new Set();
    let preloadedMd = new Map();
    await Promise.all(
      toDownload.map(
        limitConcurrency(MAX_INSTALL_WAIT_CHAIN, async ({ item }) => {
          preloadedMd.set(item, await readSyncedSkillMd(root, item.name, storageV5));
        }),
      ),
    );
    await Promise.all(
      toDownload.map(
        preloadThenLimit(
          MAX_INSTALL_WAIT_CHAIN,
          async (entry) => {
            let mountKind = mountKindOf(entry);
            if (mountKind === undefined) return;
            let zip = await (await hostReader)?.readZip(mountKind, entry.item).catch(logMountError);
            return zip
              ? {
                  kind: mountKind,
                  zip,
                }
              : undefined;
          },
          async ({ item, prev }, fromHostMount) => {
            let md = preloadedMd.get(item) ?? null;
            let result = ZIP_FETCH_FAILED_RESULT;
            try {
              result = await landSyncedSkill(item, {
                round: syncRound,
                credentials,
                storageV5,
                classifyOccupant: (dirName) => skillDirOccupancy(dirName, storageV5, syncRound),
                markTargetDestroyed: () => {
                  hadLandedFailure = true;
                },
                replacesAttributedCopy:
                  (prev !== undefined && (await isSameSkillDir(root, prev.name, item.name))) ||
                  reDownloadRows.has(item.skillId),
                targetHeldSkillFile: isQuizzicalWirthOn() && md !== null,
                fromHostMount,
                markLandedFromHostMount: () => {
                  landedFromMount.add(item.skillId);
                },
                hostMountMissCounts: mountMissCounts,
                noteDownloadedBytes: (bytes) => {
                  downloadedBytes += bytes;
                },
              });
            } catch {
              result = ARCHIVE_UNUSABLE_RESULT;
              logForDiagnosticsNoPII("warn", "skills_sync_extract_failed");
            }
            if (result.ok) {
              skills.push(item);
              if (prev && prev.name !== item.name) {
                if (!(await trashIfNotLive(prev.name))) staleDirs.add(prev.name);
              }
              unregisterSkillPlaceholder(basename(syncedSkillDirPath(root, item.name)));
              clearSkillCaches();
              clearCommandMemoizationCaches();
              logFeatureOk("skills_sync_download", {
                landed_from_mount: landedFromMount.has(item.skillId),
              });
            } else {
              let syncFailureEvent = getSyncFailureEvent(result.cause);
              if (syncFailureEvent === null) {
                deferredCount++;
                logForDiagnosticsNoPII("info", "skills_sync_landing_deferred");
              } else {
                failureCounts[syncFailureEvent] = (failureCounts[syncFailureEvent] ?? 0) + 1;
                logFeatureBad("skills_sync_download", syncFailureEvent);
              }
              let prevRow = prev ?? reDownloadRows.get(item.skillId);
              if (prevRow && result.cause === "deferred") {
                deferredPrevRows.push(prevRow);
                if (prev && prev.name !== item.name) {
                  staleDirs.add(prev.name);
                  deferredRenames++;
                }
              } else if (prevRow) failedPrevRows.push(prevRow);
              else
                try {
                  let skillDir = syncedSkillDirPath(root, item.name);
                  if (
                    await lstat(skillDir).then(
                      () => false,
                      (error) => isENOENT(error),
                    )
                  )
                    newClaims.add(syncKeyOf(basename(skillDir), owner));
                } catch {}
            }
            pendingResolvers.get(item.skillId)?.(
              result.ok
                ? {
                    ok: true,
                  }
                : {
                    ok: false,
                    reason: describeSyncFailure(result.cause),
                  },
            );
          },
        ),
      ),
    );
    let keptRemovals = [];
    await Promise.all(
      toRemove.map(
        limitConcurrency(MAX_INSTALL_WAIT_CHAIN, async (row) => {
          if (!(await trashIfNotLive(row.name))) keptRemovals.push(row);
        }),
      ),
    );
    let removedIds = new Set(toRemove.map((row) => row.skillId));
    for (let row of keptRemovals) removedIds.delete(row.skillId);
    let localChanged =
      skills.length > 0 ||
      hadLandedFailure ||
      keptRemovals.length < toRemove.length ||
      removedStaleDirs.size > 0 ||
      newClaims.size > 0;
    let needWrite = localChanged || deferredRenames > 0 || mergeResult.attributionMoved;
    if (removedIds.size > 0) clearCommandMemoizationCaches();
    if (localChanged || changedLocally) resetSkillSyncState();
    let rowsLost = false;
    if (needWrite) {
      let skills_2 = [...filtered, ...skills, ...failedPrevRows, ...keptRemovals];
      let finalNames = new Set();
      for (let row of [...skills_2, ...deferredPrevRows])
        try {
          finalNames.add(basename(syncedSkillDirPath(root, row.name)));
        } catch {}
      for (let dirName of finalNames) newClaims.add(syncKeyOf(dirName, owner));
      for (let claim of deadClaims) if (finalNames.has(parsePendingClaim(claim).name)) newClaims.add(claim);
      let writeFinal = (skills, onlyOverReadable) =>
        writeSkillsSyncManifest(
          {
            lastUpdated: Date.now(),
            skills,
            staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
          },
          {
            staleDirs: removedStaleDirs,
            pendingClaims: newClaims,
            removedSkillIds: removedIds,
            deferredRows: deferredPrevRows,
            onlyOverReadable,
          },
          storageV5,
          syncRound,
        );
      await writeFinal(skills_2, false);
      let recheckRounds = skills.length > 0 && isQuizzicalWirthOn() ? 2 : 0;
      for (let idx = 0; idx < recheckRounds; idx++) {
        await sleep(state.lostRowsRecheckMs * (1 + Math.random()));
        let skillsSyncManifest = await readSkillsSyncManifest(storageV5, syncRound);
        let writtenIds = new Set(skillsSyncManifest?.skills.map((skill) => skill.skillId));
        rowsLost = !skills.every((row) => writtenIds.has(row.skillId));
        if (!rowsLost) break;
        if (skillsSyncManifest === null) continue;
        logForDiagnosticsNoPII("info", "skills_sync_manifest_rows_lost");
        try {
          await writeFinal(skills, true);
        } catch (error) {
          if (error instanceof SyncOwnedRootRefusedError) throw error;
          logError(toError(error));
          break;
        }
      }
      if (rowsLost) logForDiagnosticsNoPII("warn", "skills_sync_manifest_rows_unconfirmed");
    }
    let failedDownloads = toDownload.length - skills.length - deferredCount;
    let reader = await hostReader;
    let downloadTelemetry = {
      downloaded: skills.length - landedFromMount.size,
      from_mount: landedFromMount.size,
      mount_eligible: flattened.length,
      mount_read_ms: reader?.spentMs() ?? 0,
      mount_wait_ms: reader?.waitedMs() ?? 0,
      ...flattenMountMissCounts(mountMissCounts),
    };
    logForDiagnosticsNoPII("info", "skills_sync_complete", {
      ...downloadTelemetry,
      removed: toRemove.length,
      duration_ms: Date.now() - now,
      list_ms: listMs,
      ...(trigger.trigger === "startup" && {
        first_message_gate_open_ms: firstMessageGateOpenMs,
      }),
    });
    let summary = baseTelemetry();
    logEvent("tengu_skills_sync_success", {
      ...summary,
      ...downloadTelemetry,
      removed: toRemove.length,
      total: listResult.skills.length,
    });
    let finalStampRows = localChanged || changedLocally ? null : stampRows;
    noteBucketGeneration(
      await writeOrClearReuseStamp(
        root,
        "skills",
        !notEntitled &&
          failedDownloads === 0 &&
          deferredCount === 0 &&
          !rowsLost &&
          keptRemovals.length === 0 &&
          staleDirs.size === 0 &&
          !isSessionRefsSyncEnabled(sessionId),
        finalStampRows,
        listedForKey(convertAsk),
      ),
      finalStampRows,
    );
    let roundTelemetry = {
      ...summary,
      ...downloadTelemetry,
      deferred: deferredCount,
      removed: toRemove.length,
      total: listResult.skills.length,
    };
    if (failedDownloads > 0)
      logFeatureSad("skills_sync_round", "download_failed", {
        ...roundTelemetry,
        failed: failedDownloads,
        download_failed: failureCounts.download_failed ?? 0,
        extract_failed: failureCounts.extract_failed ?? 0,
        root_refused: failureCounts.root_refused ?? 0,
        local_failed: failureCounts.local_failed ?? 0,
      });
    else if (notEntitled) logFeatureSad("skills_sync_round", "not_entitled", roundTelemetry);
    else logFeatureOk("skills_sync_round", roundTelemetry);
  } catch (error) {
    if (changedLocally || hadLandedFailure) resetSkillSyncState();
    if (error instanceof SyncOwnedRootRefusedError && touchedBucket) {
      logForDiagnosticsNoPII("warn", "skills_sync_late_root_refusal", {
        reason: error.reason,
        duration_ms: Date.now() - now,
      });
      logFeatureSad("skills_sync_round", "root_refused", baseTelemetry());
      touchedBucket = false;
    } else if (error instanceof SyncOwnedRootRefusedError) {
      logForDiagnosticsNoPII("warn", "skills_sync_root_refused_round", {
        reason: error.reason,
        duration_ms: Date.now() - now,
      });
      logFeatureSad("skills_sync_round", "root_refused", baseTelemetry());
    } else {
      if (!notEntitled) state.consecutiveFailedRounds++;
      logForDiagnosticsNoPII("error", "skills_sync_unexpected_error", {
        duration_ms: Date.now() - now,
      });
      let errorTelemetry = baseTelemetry();
      logEvent("tengu_skills_sync_error", errorTelemetry);
      logFeatureBad("skills_sync_round", "unexpected_error", errorTelemetry);
    }
  } finally {
    if (started) rescheduleResyncByBackoff();
    for (let resolve of pendingResolvers.values())
      resolve({
        ok: false,
        reason: "skills sync failed",
      });
    firstListDeferred().resolve();
    if (previousLiveDirs !== null && round !== null)
      await pruneGoneSkillDirs({
        bucketRoot: round.root,
        listedDirs: previousLiveDirs,
        removalTriedDirs,
        isSkillFileGone: (dirPath) => isSkillMdMissing(dirPath, storageV5),
      }).catch(() => {
        logForDiagnosticsNoPII("warn", "skills_sync_hooks_removal_failed");
      });
    if (round === null || round.guard.refused()) touchedBucket = false;
    if (touchedBucket && round !== null) {
      if (
        (await verifySyncRoot(
          round.root,
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
        await rm(perProcessTempDir(round.root), {
          recursive: true,
          force: true,
        }).catch(() => {});
    }
  }
}
//@ chunk-hme9amad.js:30122-30240 placement
async function isClaimOwnerAlive(claim) {
  let { ownerPid, ownerProcStart } = parsePendingClaim(claim);
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
async function skillDirOccupancy(dirName, storageV5, round) {
  let skillsSyncManifest = await readSkillsSyncManifest(storageV5, round);
  if (!skillsSyncManifest) return "unattributed";
  for (let skill of skillsSyncManifest.skills)
    if (await isSameSkillDir(round.root, skill.name, dirName)) return "landed";
  for (let claim of skillsSyncManifest.pendingClaims ?? [])
    if (parsePendingClaim(claim).name === dirName && (await isClaimOwnerAlive(claim))) {
      if (!isQuizzicalWirthOn()) return "inFlight";
      let ctimeMs = await lstat(join(round.root, dirName)).then(
        (stats) => Math.floor(stats.ctimeMs),
        (error) => {
          if (isENOENT(error)) return -1 / 0;
          logForDiagnosticsNoPII("warn", "skills_sync_occupant_unreadable", {
            code: getErrnoCode(error) ?? "unknown",
          });
          return 1 / 0;
        },
      );
      if (!(Date.now() - ctimeMs >= INSTALL_WAIT_CEILING_MS)) return "inFlight";
      logForDiagnosticsNoPII("info", "skills_sync_live_claim_timed_out");
      return "unattributed";
    }
  return "unattributed";
}
//@ chunk-hme9amad.js:30763-30865 placement
async function isSameSkillDir(root, name, otherName) {
  try {
    let dirA = syncedSkillDirPath(root, name);
    let dirB = syncedSkillDirPath(root, otherName);
    return basename(dirA) === basename(dirB) || (await isSameFileIdentity(dirA, dirB));
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
