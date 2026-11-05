/**
 * services/homeSeed/applyHomeSeed.ts
 *
 * 2.1.316 新增：在云会话中应用 home seed
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9x09krra.js (35)
 * attribution: placement 35
 */
import { join, relative, sep, isAbsolute, resolve, dirname, basename } from "path";
import { open, lstat, realpath, unlink } from "fs/promises";
import { processMemoryFile } from "../../utils/claudemd.js";
import {
  workingFileDestination,
  SETTINGS_JSON,
  isWorkingFilePath,
  MAX_WORKING_FILE_BYTES,
} from "./workingFiles.js";
import { CCR_HOME_SEED_JSON } from "../../utils/teleport/homeSeed.js";
import {
  MAX_SIDECAR_BYTES,
  parseHomeSidecar,
  MAX_RENDERED_SETTINGS_BYTES,
  SIDECAR_VERSION,
  MAX_SIDECAR_ENTRIES,
  renderRestrictiveSettings,
  encodeHomeSidecar,
} from "./homeSidecar.js";
import { stripBom } from "../../utils/json.js";
import { tryJsonParse } from "./portableSettings.js";
import { parseSettingsContent } from "../../utils/settings/settingsFileParsing.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { record, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { readOnlyNoFollowFlags } from "../../utils/platformTargets.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";
import { createHomeFileWriter, resolveDestinationSpelling } from "./destination.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { markInternalWrite, withdrawInternalWrite } from "../../cli/headlessCloud/attachServe.js";
import { runInSettingsWriteQueue, getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { isSettingsToCloudAvailable } from "../../cli/remoteIO/workerAuth.js";
import { SYNCED_FILE_ROOT } from "../syncedFiles/syncedFileSyncer.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { countWhere } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { MAX_PACK_BYTES } from "./homePack.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9x09krra.js:37438-37568 placement (2.1.88 match: formatRecentMessages, 1)
function formatRecentMessages(homeReal, entry) {
  try {
    return processMemoryFile(
      entry.content.toString("utf8"),
      join(homeReal, ...entry.path.split("/")),
      "User",
    ).every((label) => isSkillPathOutsideOutputStyles(homeReal, label));
  } catch {
    return false;
  }
}
//@ chunk-9x09krra.js:37568-37734 placement (2.1.88 match: getOutputStyleAttachment, 0.676)
/**
 * 路径在技能根目录内且不是 output_style 类型。旧版名 getOutputStyleAttachment 为错配；归错文件（技能改进相关）。
 */
function isSkillPathOutsideOutputStyles(input, options) {
  let deps = relative(input, options);
  if (deps === "" || deps === ".." || deps.startsWith(`..${sep}`) || isAbsolute(deps)) return false;
  let report = workingFileDestination(deps.split(sep).join("/"));
  return report !== null && report.kind !== "output_style";
}
//@ chunk-9x09krra.js:37734-37826 placement (2.1.88 match: isFileReadDenied, 1)
/**
 * 读 ccr-home-seed.json 并解析。归错文件。
 */
async function readHomeSeedFile(filePath) {
  let denyRule = await readBoundedFile(join(filePath, CCR_HOME_SEED_JSON), MAX_SIDECAR_BYTES);
  return denyRule.kind === "read" ? parseHomeSidecar(denyRule.content) : null;
}
//@ chunk-9x09krra.js:37826-37975 placement
async function checkSidecarState(configHome) {
  let boundedFile = await readBoundedFile(join(configHome, CCR_HOME_SEED_JSON), MAX_SIDECAR_BYTES);
  if (boundedFile.kind === "absent") return "absent";
  return boundedFile.kind === "read" && parseHomeSidecar(boundedFile.content) !== null ? "valid" : "invalid";
}
//@ chunk-9x09krra.js:37975-38032 placement
/**
 * 读取云会话的 settings 文件并判断可用状态（absent/unusable/object）。
 */
async function readCloudSettingsForSeed(path) {
  let boundedFile = await readBoundedFile(path, MAX_RENDERED_SETTINGS_BYTES);
  return parseExistingSettings(boundedFile, path);
}
//@ chunk-9x09krra.js:38032-38328 placement
/**
 * 解析云端现有 settings 文件：不存在、不可读或过大分别返回 absent/unusable，能解析为对象时返回 object。
 */
function parseExistingSettings(input, options) {
  if (input.kind === "absent")
    return {
      kind: "absent",
    };
  if (input.kind !== "read" || input.content.length > MAX_RENDERED_SETTINGS_BYTES)
    return {
      kind: "unusable",
    };
  let str = input.content.toString("utf8");
  let deps = stripBom(str);
  let report = cloudSettingsSchema().safeParse(deps.trim() === "" ? {} : tryJsonParse(deps));
  return report.success && parseSettingsContent(str, options).settings !== null
    ? {
        kind: "object",
        value: report.data,
      }
    : {
        kind: "unusable",
      };
}
//@ chunk-9x09krra.js:38328-38437 placement
function isEmptySettingsFile(existing, options) {
  try {
    let existingSettings = parseExistingSettings(existing, options);
    return existingSettings.kind === "object" && Object.keys(existingSettings.value).length === 0;
  } catch {
    return false;
  }
}
//@ chunk-9x09krra.js:38437-38464 placement
/**
 * 云会话 settings 的宽松 schema（未知键原样保留）。
 */
var cloudSettingsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9x09krra.js:38437", () => {
  cloudSettingsSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-9x09krra.js:38464-38514 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isNotFoundCode_2(realCandidate) {
  return realCandidate === "ENOENT" || realCandidate === "ENOTDIR";
}
//@ chunk-9x09krra.js:38514-38897 placement
/**
 * 打开并读取不超过上限的普通文件，返回 read/absent/not_regular/too_large/unreadable。
 */
async function readBoundedFile(filePath, maxBytes) {
  try {
    let handle = await open(filePath, readOnlyNoFollowFlags());
    try {
      let stats = await handle.stat();
      if (!stats.isFile())
        return {
          kind: "not_regular",
        };
      if (stats.size > maxBytes)
        return {
          kind: "too_large",
        };
      return {
        kind: "read",
        content: await readJSONLFile(handle, stats.size),
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    let code = getErrnoCode(error) ?? "unknown";
    if (isNotFoundCode_2(code))
      return {
        kind: "absent",
      };
    return code === "ELOOP" || code === "EISDIR" || code === "ENXIO"
      ? {
          kind: "not_regular",
        }
      : {
          kind: "unreadable",
          code,
        };
  }
}
//@ chunk-9x09krra.js:38897-39151 placement
function createApplyDeps({ storageV5, configHome }) {
  return {
    writeHomeFile: createHomeFileWriter({
      storageV5,
      flagOn: isStorageV5Enabled(),
      configHome,
    }),
    markInternalWrite,
    withdrawInternalWrite,
    inSettingsWriteQueue: (key) =>
      runInSettingsWriteQueue(
        getSettingsFilePathForSource("userSettings") ?? join(configHome, SETTINGS_JSON),
        key,
      ),
    now: () => Date.now(),
    settingsToCloud: isSettingsToCloudAvailable,
  };
}
//@ chunk-9x09krra.js:39151-39892 placement
/**
 * 校验 home seed 的根目录：必须是真实目录、不与仓库重叠、不在 git 工作区内、不与同步文件根重叠，返回真实路径或原因。
 */
async function vetHomeSeedRoot(configHome, repoRoot, syncedRoot = SYNCED_FILE_ROOT) {
  let resolved = resolve(configHome);
  let stat;
  try {
    stat = await lstat(resolved);
  } catch (error) {
    return {
      ok: false,
      reason: isENOENT(error) ? "missing" : "unresolvable",
    };
  }
  if (stat.isSymbolicLink())
    return {
      ok: false,
      reason: "symlink",
    };
  if (!stat.isDirectory())
    return {
      ok: false,
      reason: "not_directory",
    };
  let realHome;
  let realRepo;
  try {
    realHome = await realpath(resolved);
    realRepo = await realpath(repoRoot);
  } catch {
    return {
      ok: false,
      reason: "unresolvable",
    };
  }
  if (
    isPathInside({
      path: realRepo,
      directory: realHome,
    })
  )
    return {
      ok: false,
      reason: "overlaps_repo",
    };
  if (await isInsideGitWorktree(realHome))
    return {
      ok: false,
      reason: "inside_git_worktree",
    };
  if (
    isPathInside({
      path: realHome,
      directory: realRepo,
    })
  )
    logForDiagnosticsNoPII("info", "home_under_cwd_no_worktree", {});
  let realSyncedRoot;
  try {
    realSyncedRoot = await realpath(syncedRoot);
  } catch (error) {
    if (!isNotFoundCode_2(getErrnoCode(error)))
      return {
        ok: false,
        reason: "unresolvable",
      };
    realSyncedRoot = null;
  }
  if (
    [syncedRoot, realSyncedRoot].some(
      (resolved) =>
        resolved !== null &&
        (isPathInside({
          path: realHome,
          directory: resolved,
        }) ||
          isPathInside({
            path: resolved,
            directory: realHome,
          })),
    )
  )
    return {
      ok: false,
      reason: "inside_synced_root",
    };
  return {
    ok: true,
    real: realHome,
  };
}
//@ chunk-9x09krra.js:39892-40004 placement
async function isInsideGitWorktree(root) {
  for (let dir = root; ; dir = dirname(dir)) {
    if ((await statOrState(join(dir, ".git"))) !== "absent") return true;
    if (dirname(dir) === dir) return false;
  }
}
//@ chunk-9x09krra.js:40004-40098 placement
/**
 * 取路径状态：不存在返回 absent，其他错误返回 unverifiable。
 */
async function statOrState(path) {
  try {
    return await lstat(path);
  } catch (error) {
    return isNotFoundCode_2(getErrnoCode(error)) ? "absent" : "unverifiable";
  }
}
//@ chunk-9x09krra.js:40098-40182 placement
/**
 * 判断 path 是否等于 directory 或在其中。
 */
function isPathInside({ path, directory }) {
  return path === directory || path.startsWith(directory.endsWith(sep) ? directory : directory + sep);
}
//@ chunk-9x09krra.js:40182-43808 placement
async function applyHomeSeedToCloudSession(plan, options, deps) {
  let flagState = await Promise.resolve()
    .then(deps.settingsToCloud)
    .then(
      (on) => (on ? "on" : "off"),
      () => "threw",
    );
  if (flagState !== "on") {
    logForDiagnosticsNoPII("info", "home_seed_apply_flag_off", {
      gate: flagState,
    });
    return {
      outcome: "flag_off",
      generation: plan.generation,
    };
  }
  let vetResult = await vetHomeSeedRoot(options.configHome, options.repoRoot, options.syncedRoot);
  if (!vetResult.ok) {
    logForDiagnosticsNoPII("warn", "home_seed_config_home_unsafe", {
      reason: vetResult.reason,
    });
    return {
      outcome: "config_home_unsafe",
      generation: plan.generation,
      reason: vetResult.reason,
    };
  }
  let applyContext = {
    configHome: resolve(options.configHome),
    homeReal: vetResult.real,
    keepsForeignFiles: options.foreignFiles !== "replaced",
    deps,
  };
  let removals = [];
  for (let removal of plan.removals)
    removals.push({
      removal,
      result: await removeSeedFile(removal, applyContext),
    });
  let writes = [];
  for (let write of plan.writes) {
    let { result, stoodForeign } = await applySeedFile(
      write,
      plan.priorEntries.get(write.path),
      applyContext,
    );
    writes.push({
      file: write,
      result,
      stoodForeign,
    });
    let priorSha = plan.priorEntries.get(write.path);
    if (result === "loader_reach" && priorSha !== undefined) {
      let removal = {
        path: write.path,
        kind: write.kind,
        sha256: priorSha,
      };
      removals.push({
        removal,
        result: await removeSeedFile(removal, applyContext),
      });
    }
  }
  let settingsResult = await applyContext.deps.inSettingsWriteQueue(() =>
    applySeedSettings(plan, options.settingsPath, applyContext),
  );
  let filtered = writes.filter(({ result }) => result === "applied");
  let filtered_2 = removals.filter(({ result }) => result === "removed");
  let removedPaths = new Set(
    removals.filter(({ result }) => result !== "failed").map(({ removal }) => removal.path),
  );
  let filtered_3 = writes.filter(({ result }) => result === "applied" || result === "unverified");
  let writtenPaths = new Set(filtered_3.map(({ file }) => file.path));
  let entries = new Map([
    ...[...plan.priorEntries].filter(([path]) => !removedPaths.has(path) && !writtenPaths.has(path)),
    ...filtered_3.map(({ file }) => [file.path, file.sha256]),
  ]);
  let settingsAttempted = plan.settings !== null && options.settingsPath !== undefined;
  let settingsRemovalWanted =
    plan.settings === null && plan.priorSettingsSha256 !== null && options.settingsPath !== undefined;
  let settingsTouched =
    settingsAttempted ||
    settingsRemovalWanted ||
    (options.settingsPath !== undefined && plan.counts.refused.settings !== "none");
  let settingsApplied =
    plan.counts.refused.settings === "none" &&
    !settingsResult.keptForeign &&
    (settingsResult.written || (settingsRemovalWanted && !settingsResult.removeFailed));
  let totalExpected =
    plan.writes.length + plan.counts.refilteredCredentialFiles + removals.length + (settingsTouched ? 1 : 0);
  let removalsFailed = countWhere(removals, ({ result }) => result === "failed");
  let totalDone = filtered.length + (removals.length - removalsFailed) + (settingsApplied ? 1 : 0);
  let countByResult = (wanted) => countWhere(writes, (entry) => entry.result === wanted);
  let outcome = totalExpected === 0 ? "empty" : totalDone === totalExpected ? "applied" : "partial";
  let isRestore = plan.restoreRecord === true;
  let sidecarWritten =
    !(isRestore
      ? !settingsResult.written
      : entries.size === 0 &&
        settingsResult.sha256After === null &&
        plan.priorEntries.size === 0 &&
        plan.priorSettingsSha256 === null) &&
    (await writeHomeSidecar(applyContext, {
      version: SIDECAR_VERSION,
      generation: plan.generation,
      writtenAtMs: deps.now(),
      entries: isRestore
        ? ((await readHomeSeedFile(options.configHome))?.entries ?? [])
        : [...entries].map(([path, sha256]) => ({
            path,
            sha256,
          })),
      settingsSha256:
        isRestore && !(applyContext.keepsForeignFiles && settingsResult.nothingStood)
          ? null
          : settingsResult.sha256After,
      ...(outcome !== "partial" && {
        packEtag: plan.packEtag,
      }),
    }));
  if (sidecarWritten && entries.size > MAX_SIDECAR_ENTRIES)
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_trimmed", {
      dropped: entries.size - MAX_SIDECAR_ENTRIES,
    });
  return {
    outcome,
    generation: plan.generation,
    filesApplied: filtered.length,
    appliedByKind: {
      claude_md: countWhere(filtered, ({ file }) => file.kind === "claude_md"),
      rule: countWhere(filtered, ({ file }) => file.kind === "rule"),
      output_style: countWhere(filtered, ({ file }) => file.kind === "output_style"),
    },
    filesReplacedForeign: countWhere(filtered, ({ stoodForeign }) => stoodForeign),
    filesRefused: {
      destination: plan.counts.refused.destination,
      overCap: plan.counts.refused.overCap,
      resolvedDestination: countByResult("refused") + countByResult("unverified"),
      parentNotDirectory: countByResult("parent_not_directory"),
      destIsDirectory: countByResult("dest_is_directory"),
      loaderReach: countByResult("loader_reach"),
      credential: plan.counts.refilteredCredentialFiles,
      keptForeign: countByResult("kept_foreign"),
    },
    filesFailed: countByResult("failed"),
    filesRemoved: filtered_2.length,
    removalsFailed,
    settingsAttempted,
    settingsWritten: settingsResult.written,
    settingsKeptForeign: settingsResult.keptForeign,
    rulesLeftOut: settingsResult.keptForeign ? (plan.restrictingSettings?.rulesLeftOut ?? 0) : 0,
    settingsRemoved: settingsResult.removed,
    settingsRemoveFailed: settingsResult.removeFailed,
    standingSettingsUnreadable: settingsResult.unreadable,
    settingsRefused: plan.counts.refused.settings,
    replacedExistingSettings: settingsResult.replaced,
    refilteredKeys: plan.counts.refilteredKeys,
    refilteredCredentials: plan.counts.refilteredCredentials,
    refilteredCredentialRestrictions: plan.counts.refilteredCredentialRestrictions,
    permissionsDropped: plan.counts.permissionsDropped,
    touchedKinds: new Set([
      ...filtered_3.map(({ file }) => file.kind),
      ...filtered_2.map(({ removal }) => removal.kind),
    ]),
    sidecarWritten,
  };
}
//@ chunk-9x09krra.js:43808-43854 placement
/**
 * 在根目录下按 / 分隔的相对路径拼接。
 */
function joinUnder(configHome, relPath) {
  return join(configHome, ...relPath.split("/"));
}
//@ chunk-9x09krra.js:43854-44090 placement
async function applySeedFile(write, priorSha, ctx) {
  let destination = await checkSeedFileDestination(write, ctx);
  if (destination !== "clear")
    return {
      result: destination,
      stoodForeign: false,
    };
  let foreign = await hasForeignFileAt(write.path, priorSha, ctx);
  if (foreign && ctx.keepsForeignFiles)
    return {
      result: "kept_foreign",
      stoodForeign: false,
    };
  return {
    result: await writeSeedFile(write, ctx),
    stoodForeign: foreign,
  };
}
//@ chunk-9x09krra.js:44090-44692 placement
/**
 * 检查单个种子文件能否写入：非输出样式需在加载器可达范围；解析后的拼写须是合法目的地；路径无阻碍且 home 已核实。返回 clear 或拒绝原因（均记诊断）。
 */
async function checkSeedFileDestination(file, context) {
  if (file.kind !== "output_style" && !formatRecentMessages(context.homeReal, file)) {
    logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
      reason: "loader_reach",
    });
    return "loader_reach";
  }
  let destPath = joinUnder(context.configHome, file.path);
  let resolvedRel = await resolveDestinationSpelling(context.homeReal, destPath);
  if (resolvedRel === null || !isWorkingFilePath(resolvedRel)) {
    logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
      reason: "resolved_spelling",
    });
    return "refused";
  }
  let obstruction = await findDestinationObstruction(file.path, context);
  if (obstruction !== "clear") {
    logForDiagnosticsNoPII("warn", "home_seed_destination_obstructed", {
      reason: obstruction,
    });
    return obstruction === "parent_not_directory" || obstruction === "dest_is_directory"
      ? obstruction
      : "refused";
  }
  if (!(await isHomeStillVetted(context))) {
    logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
      reason: "home_unvetted",
    });
    return "refused";
  }
  return "clear";
}
//@ chunk-9x09krra.js:44692-45078 placement
/**
 * 写入种子文件并核实落点，返回 applied/unverified；目标被拒或写入失败时记诊断。
 */
async function writeSeedFile(write, ctx) {
  let fullPath = joinUnder(ctx.configHome, write.path);
  try {
    await ctx.deps.writeHomeFile(ctx.configHome, fullPath, write.content);
    if (!(await verifyWrittenSeedFile(write.path, ctx))) return "unverified";
    return "applied";
  } catch (error) {
    let code = getErrnoCode(error) ?? "unknown";
    if (code.startsWith("WORKING_") || code.startsWith("HOME_DEST_")) {
      logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
        reason: code,
      });
      return "refused";
    }
    logForDiagnosticsNoPII("warn", "home_seed_write_failed", {
      code,
    });
    return "failed";
  }
}
//@ chunk-9x09krra.js:45078-45185 placement
async function isHomeStillVetted(context) {
  try {
    return (
      (await realpath(context.configHome)) === context.homeReal &&
      !(await isInsideGitWorktree(context.homeReal))
    );
  } catch {
    return false;
  }
}
//@ chunk-9x09krra.js:45185-45440 placement
async function verifyWrittenSeedFile(path, context) {
  let destPath = joinUnder(context.configHome, path);
  let actual =
    (await resolveDestinationSpelling(context.homeReal, destPath)) !== path
      ? "resolved_spelling"
      : await checkLeafRegular(destPath);
  if (actual !== null) {
    logForDiagnosticsNoPII("warn", "home_seed_write_escaped", {
      reason: actual,
    });
    return false;
  }
  if (!(await isHomeStillVetted(context))) {
    logForDiagnosticsNoPII("warn", "home_seed_write_unverified", {});
    return false;
  }
  return true;
}
//@ chunk-9x09krra.js:45440-45587 placement
async function checkLeafRegular(path) {
  let state = await statOrState(path);
  return state === "absent"
    ? "leaf_absent"
    : state === "unverifiable"
      ? "leaf_unverifiable"
      : state.isFile()
        ? null
        : "leaf_not_regular";
}
//@ chunk-9x09krra.js:45587-46036 placement
/**
 * 逐级检查目标的祖先：不存在为 none；无法验证、是符号链接、不是目录或位于 git 工作区内则返回相应阻碍。
 */
async function findAncestorObstruction(relPath, ctx) {
  let parts = relPath.split("/");
  for (let j = 1; j < parts.length; j++) {
    let ancestorPath = joinUnder(ctx.configHome, parts.slice(0, j).join("/"));
    let stats = await statOrState(ancestorPath);
    if (stats === "absent") return "none";
    if (stats === "unverifiable") return "ancestor_unverifiable";
    if (stats.isSymbolicLink()) return "ancestor_is_symlink";
    if (!stats.isDirectory()) return "parent_not_directory";
    let gitStats = await statOrState(join(ancestorPath, ".git"));
    if (gitStats === "unverifiable") return "ancestor_unverifiable";
    if (gitStats !== "absent") return "ancestor_in_worktree";
  }
  return "none";
}
//@ chunk-9x09krra.js:46036-46351 placement
/**
 * 检查目标位置是否被占用：先查上层障碍，再看目标叶子（不存在、无法核验、符号链接、目录或非普通文件）。
 */
async function findDestinationObstruction(relPath, context) {
  let ancestorObstruction = await findAncestorObstruction(relPath, context);
  if (ancestorObstruction !== "none") return ancestorObstruction;
  let leaf = await statOrState(joinUnder(context.configHome, relPath));
  if (leaf === "absent") return "clear";
  if (leaf === "unverifiable") return "leaf_unverifiable";
  if (leaf.isSymbolicLink()) return "leaf_is_symlink";
  if (leaf.isDirectory()) return "dest_is_directory";
  return leaf.isFile() ? "clear" : "leaf_not_regular";
}
//@ chunk-9x09krra.js:46351-46561 placement
async function hasForeignFileAt(path, relPath, context) {
  let boundedFile = await readBoundedFile(joinUnder(context.configHome, path), MAX_WORKING_FILE_BYTES);
  switch (boundedFile.kind) {
    case "absent":
    case "not_regular":
      return false;
    case "too_large":
    case "unreadable":
      return true;
    case "read":
      return relPath === undefined || computeContentHash(boundedFile.content) !== relPath;
  }
}
//@ chunk-9x09krra.js:46561-47309 placement
/**
 * 删除之前由种子写入的文件：home 未核实、无法解析或位置不合法时失败；文件已不存在为 gone；内容摘要不符视为别人的文件不删。
 */
async function removeSeedFile(file, context) {
  let destPath = joinUnder(context.configHome, file.path);
  let resolvedRel = await resolveDestinationSpelling(context.homeReal, destPath);
  let obstruction = !(await isHomeStillVetted(context))
    ? "home_unvetted"
    : resolvedRel === null
      ? "unresolvable"
      : !isWorkingFilePath(resolvedRel)
        ? "resolves_elsewhere"
        : await findAncestorObstruction(file.path, context);
  if (obstruction !== "none") {
    logForDiagnosticsNoPII("warn", "home_seed_remove_obstructed", {
      reason: obstruction,
    });
    return "failed";
  }
  let read = await readBoundedFile(destPath, MAX_WORKING_FILE_BYTES);
  switch (read.kind) {
    case "absent":
      return "gone";
    case "too_large":
      return "not_ours";
    case "not_regular":
      logForDiagnosticsNoPII("warn", "home_seed_remove_obstructed", {
        reason: "not_regular",
      });
      return "failed";
    case "unreadable":
      logForDiagnosticsNoPII("warn", "home_seed_remove_failed", {
        code: read.code,
      });
      return "failed";
    case "read":
      break;
  }
  if (computeContentHash(read.content) !== file.sha256) return "not_ours";
  try {
    await unlink(destPath);
    return "removed";
  } catch (error) {
    let resolved = getErrnoCode(error) ?? "unknown";
    if (isNotFoundCode_2(resolved)) return "gone";
    logForDiagnosticsNoPII("warn", "home_seed_remove_failed", {
      code: resolved,
    });
    return "failed";
  }
}
//@ chunk-9x09krra.js:47309-49564 placement
/**
 * 把种子设置写入云端 settings.json：校验路径与 home；按现有文件是否为本方写入或他人文件决定替换、保留或只合并限制性规则；设置为空且文件是本方写入时删除；写后核实并返回各状态与新摘要。
 */
async function applySeedSettings(plan, filePath, ctx) {
  let baseResult = {
    written: false,
    keptForeign: false,
    nothingStood: false,
    removed: false,
    removeFailed: false,
    unreadable: false,
    replaced: "none",
    sha256After: plan.priorSettingsSha256,
  };
  if (filePath === undefined || (plan.settings === null && plan.priorSettingsSha256 === null))
    return baseResult;
  if (basename(filePath) !== SETTINGS_JSON || !(await isFileDirectlyIn(ctx.homeReal, filePath))) {
    logForDiagnosticsNoPII("warn", "home_seed_settings_path_refused", {});
    return plan.settings === null
      ? {
          ...baseResult,
          removeFailed: true,
        }
      : baseResult;
  }
  let settingsPath = filePath;
  if (plan.settings === null && !(await isHomeStillVetted(ctx))) {
    logForDiagnosticsNoPII("warn", "home_seed_settings_remove_failed", {
      code: "home_unvetted",
    });
    return {
      ...baseResult,
      removeFailed: true,
    };
  }
  let existing = await readBoundedFile(settingsPath, MAX_PACK_BYTES);
  if (existing.kind === "not_regular" || existing.kind === "unreadable") {
    logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", {
      reason: existing.kind,
    });
    return {
      ...baseResult,
      unreadable: true,
      removeFailed: plan.settings === null,
    };
  }
  let ownership =
    existing.kind === "absent"
      ? "none"
      : existing.kind === "read" && computeContentHash(existing.content) === plan.priorSettingsSha256
        ? "ours"
        : "foreign";
  let isRestore = plan.restoreRecord === true;
  let refusedSettings = plan.counts.refused.settings !== "none" && !isRestore;
  let nothingStood =
    existing.kind === "absent" || (ctx.keepsForeignFiles && isEmptySettingsFile(existing, settingsPath));
  let foreignStands = ctx.keepsForeignFiles && ownership === "foreign" && !nothingStood;
  let keepForeign = foreignStands && plan.settings !== null && !isRestore;
  let result = {
    ...baseResult,
    keptForeign: keepForeign,
    nothingStood,
    replaced: keepForeign ? "none" : ownership,
  };
  let renderRestrictive = (plan) => {
    try {
      return renderRestrictiveSettings(
        plan,
        parseExistingSettings(existing, settingsPath),
        isRestore && !foreignStands
          ? "restore"
          : ownership === "foreign"
            ? "refused_over_foreign"
            : "refused_over_ours",
      );
    } catch {
      return "unreadable";
    }
  };
  let toWrite = keepForeign
    ? renderRestrictive(plan.restrictingSettings?.plan ?? null)
    : refusedSettings || isRestore
      ? renderRestrictive(plan.settings)
      : plan.settings;
  if (toWrite === "unreadable") {
    logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", {
      reason: "not_read_whole",
    });
    return {
      ...result,
      replaced: "none",
      unreadable: true,
    };
  }
  if (toWrite === null) {
    if (ownership !== "ours")
      return {
        ...result,
        sha256After: null,
      };
    try {
      await unlink(settingsPath);
      return {
        ...result,
        removed: true,
        sha256After: null,
      };
    } catch (error) {
      let code = getErrnoCode(error) ?? "unknown";
      if (isNotFoundCode_2(code))
        return {
          ...result,
          sha256After: null,
        };
      logForDiagnosticsNoPII("warn", "home_seed_settings_remove_failed", {
        code,
      });
      return {
        ...result,
        removeFailed: true,
      };
    }
  }
  if (!(await isHomeStillVetted(ctx))) {
    logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", {
      reason: "home_unvetted",
    });
    return result;
  }
  let shaAfter =
    (refusedSettings || keepForeign) && ownership === "foreign" && !nothingStood ? null : toWrite.sha256;
  ctx.deps.markInternalWrite(settingsPath);
  try {
    await ctx.deps.writeHomeFile(ctx.configHome, settingsPath, Buffer.from(toWrite.rendered));
    let leafProblem = await checkLeafRegular(settingsPath);
    if (leafProblem !== null || !(await isHomeStillVetted(ctx))) {
      logForDiagnosticsNoPII("warn", "home_seed_write_unverified", {
        reason: leafProblem ?? "home_unvetted",
      });
      return {
        ...result,
        sha256After: shaAfter,
      };
    }
    return {
      ...result,
      written: true,
      sha256After: shaAfter,
    };
  } catch (error) {
    ctx.deps.withdrawInternalWrite(settingsPath);
    logForDiagnosticsNoPII("warn", "home_seed_settings_write_failed", {
      code: getErrnoCode(error) ?? "unknown",
    });
    return {
      ...result,
      sha256After: ownership === "ours" ? plan.priorSettingsSha256 : null,
    };
  }
}
//@ chunk-9x09krra.js:49564-49646 placement
/**
 * 判断文件是否直接位于目录 t 下（不跟随到别处）。
 */
async function isFileDirectlyIn(homeReal, filePath) {
  try {
    return (await realpath(dirname(filePath))) === homeReal && basename(filePath) !== "";
  } catch {
    return false;
  }
}
//@ chunk-9x09krra.js:49646-50174 placement
/**
 * 写入 home seed 附带文件并核实；home 未核实、目标不是普通文件或写入失败时记诊断并返回 false。
 */
async function writeHomeSidecar(ctx, seed) {
  if (!(await isHomeStillVetted(ctx))) {
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_failed", {
      code: "home_unvetted",
    });
    return false;
  }
  let sidecarPath = join(ctx.configHome, CCR_HOME_SEED_JSON);
  let before = await checkLeafRegular(sidecarPath);
  if (before !== null && before !== "leaf_absent") {
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_refused", {
      reason: before,
    });
    return false;
  }
  try {
    await ctx.deps.writeHomeFile(ctx.configHome, sidecarPath, encodeHomeSidecar(seed));
  } catch (error) {
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_failed", {
      code: getErrnoCode(error) ?? "unknown",
    });
    return false;
  }
  let after = await checkLeafRegular(sidecarPath);
  if (after !== null || !(await isHomeStillVetted(ctx))) {
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_unverified", {
      reason: after ?? "home_unvetted",
    });
    return false;
  }
  return true;
}
//@ chunk-9x09krra.js:50174-50324 placement (2.1.88 match: readJSONLFile, 1)
async function readJSONLFile(path, size) {
  let buf = Buffer.allocUnsafe(size);
  let totalRead = 0;
  while (totalRead < size) {
    let { bytesRead } = await path.read(buf, totalRead, size - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-9x09krra.js:50324-50340 placement
/**
 * 生成空的更新对象（占位）。
 */
var emptyUpdate = () => ({});
//@ chunk-9x09krra.js:50340-53378 placement
function createHomeSeedTelemetry() {
  return {
    apply: ({
      outcome,
      probe,
      report,
      generation,
      epochGt1,
      durationMs,
      appliedBeforeFirstAsk,
      outputStyleCheck,
      restoreNoticeSuperseded,
      answersNotRestored,
    }) => {
      let unused =
        report !== null && report.outcome !== "config_home_unsafe" && report.outcome !== "flag_off"
          ? report
          : null;
      switch (
        (logEvent("tengu_home_seed_apply", {
          outcome: fromEnum(outcome),
          probe: fromEnum(probe),
          generation,
          epoch_gt1: epochGt1,
          duration_ms: durationMs,
          applied_before_first_ask: appliedBeforeFirstAsk,
          output_style_check: fromEnum(outputStyleCheck),
          restore_notice_superseded: restoreNoticeSuperseded,
          answers_not_restored: answersNotRestored,
          ...emptyUpdate(),
          ...(unused !== null && {
            files_applied: unused.filesApplied,
            files_replaced_foreign: unused.filesReplacedForeign,
            files_refused_destination: unused.filesRefused.destination,
            files_refused_over_cap: unused.filesRefused.overCap,
            files_refused_resolved_destination: unused.filesRefused.resolvedDestination,
            files_refused_parent_not_directory: unused.filesRefused.parentNotDirectory,
            files_refused_dest_is_directory: unused.filesRefused.destIsDirectory,
            files_refused_loader_reach: unused.filesRefused.loaderReach,
            files_refused_credential: unused.filesRefused.credential,
            files_refused_kept_foreign: unused.filesRefused.keptForeign,
            files_failed: unused.filesFailed,
            files_removed: unused.filesRemoved,
            removals_failed: unused.removalsFailed,
            settings_written: unused.settingsWritten,
            settings_kept_foreign: unused.settingsKeptForeign,
            rules_left_out: unused.rulesLeftOut,
            settings_removed: unused.settingsRemoved,
            settings_refused: fromEnum(unused.settingsRefused),
            settings_attempted: unused.settingsAttempted,
            standing_settings_unreadable: unused.standingSettingsUnreadable,
            replaced_existing_settings: fromEnum(unused.replacedExistingSettings),
            refiltered_keys: unused.refilteredKeys,
            refiltered_credentials: unused.refilteredCredentials,
            refiltered_credential_restrictions: unused.refilteredCredentialRestrictions,
            permissions_dropped: unused.permissionsDropped,
            sidecar_written: unused.sidecarWritten,
          }),
          ...(report?.outcome === "config_home_unsafe" && {
            config_home_unsafe_reason: fromEnum(report.reason),
          }),
        }),
        outcome)
      ) {
        case "applied":
        case "already_applied":
        case "empty":
          logFeatureOk("ccr_home_seed");
          break;
        case "partial":
        case "stale_generation":
        case "auth_skipped":
        case "transport_failed":
        case "request_rejected":
        case "pack_absent":
        case "unannounced_row":
        case "not_for_runner":
        case "refused_lane":
        case "flag_off":
          logFeatureSad("ccr_home_seed", outcome);
          break;
        case "bad_pack":
        case "config_home_unsafe":
          logFeatureBad("ccr_home_seed", outcome);
          break;
        default:
      }
    },
    hold: ({ outcome, waitedMs, verdictWaitMs, firstAsk }) => {
      logEvent("tengu_home_seed_hold", {
        outcome: fromEnum(outcome),
        waited_ms: waitedMs,
        verdict_wait_ms: verdictWaitMs,
        first_ask: firstAsk,
      });
    },
    recovery: ({
      outcome,
      generation,
      durationMs,
      rulesDropped,
      afterAnnouncedRun,
      sidecarCountedAsAbsent,
    }) => {
      switch (
        (logEvent("tengu_home_seed_recovery", {
          outcome: fromEnum(outcome),
          generation,
          duration_ms: durationMs,
          rules_dropped: rulesDropped,
          after_announced_run: afterAnnouncedRun,
          sidecar_counted_as_absent: sidecarCountedAsAbsent,
          ...emptyUpdate(),
        }),
        outcome)
      ) {
        case "restored":
        case "no_ready_row":
        case "no_rules":
        case "superseded":
        case "gate_closed":
        case "nothing_applied":
        case "restore_gate_off":
          break;
        case "lane_unavailable":
        case "settings_gone":
        case "pack_absent":
        case "generation_mismatch":
        case "request_failed":
        case "sidecar_invalid":
        case "rules_unverifiable":
        case "settings_refused":
        case "auth_failed":
          logFeatureSad("ccr_home_seed", `recovery_${outcome}`);
          break;
        case "ready_unreadable":
        case "pack_unreadable":
        case "settings_unusable":
        case "threw":
          logFeatureBad("ccr_home_seed", `recovery_${outcome}`);
          break;
      }
    },
  };
}
//@ chunk-9x09krra.js:53378-53822 placement
/**
 * 种子应用后按变化刷新：设置变化重载用户设置，CLAUDE.md/规则变化清记忆与用户上下文，首个询问后清系统提示分段，输出样式变化清样式缓存。
 */
function reloadAfterSeedApply(applyReport, reloaders, reloader, countsAsStart) {
  if (applyReport.outcome === "config_home_unsafe" || applyReport.outcome === "flag_off") return;
  if (applyReport.settingsWritten || applyReport.settingsRemoved) reloader.reloadUserSettings(countsAsStart);
  if (applyReport.touchedKinds.has("claude_md") || applyReport.touchedKinds.has("rule")) {
    reloader.clearMemoryFiles();
    reloader.clearUserContext();
  }
  if (
    (applyReport.filesApplied > 0 ||
      applyReport.filesRemoved > 0 ||
      applyReport.settingsWritten ||
      applyReport.settingsRemoved) &&
    !reloaders.beforeFirstAsk
  )
    reloader.clearSystemPromptSections();
  if (applyReport.touchedKinds.has("output_style")) reloader.clearOutputStyles();
}
//@ chunk-9x09krra.js:53822-54928 placement
/**
 * 云端恢复本机设置时的提示文案：偏好名称、输出样式不可用、重新发送的提示与恢复失败原因。
 */
var SEED_PREFERENCE_LABELS = {
  outputStyle: "output style",
  includeCoAuthoredBy: "co-author preference",
  includeGitInstructions: "git-instructions preference",
  alwaysThinkingEnabled: "thinking preference",
  showThinkingSummaries: "thinking-summary preference",
};
var OUTPUT_STYLE_UNAVAILABLE_NOTICE =
  "the output style your settings select is not available in this session, so it does not apply";
var RESEND_SETTINGS_HINT =
  "To send your settings again, re-open this session from the machine that started it.";
var RESTORE_FAILURE_REASONS = {
  ready_unreadable: "the earlier acknowledgement could not be read",
  rules_unverifiable: "none of them is in a form this environment can take without your machine",
  settings_refused: "this environment's build could not read the settings your machine sent",
  auth_failed: "this environment's credentials were refused while fetching them",
  pack_absent: "they are no longer stored for this session",
  pack_unreadable: "the stored copy could not be read",
  generation_mismatch: "the stored copy is not the one this session acknowledged",
  request_failed: "the stored copy could not be fetched",
  settings_unusable: "the settings file here could not be merged into",
  nothing_applied: "they could not be written here",
};
export {
  RESEND_SETTINGS_HINT,
  RESTORE_FAILURE_REASONS,
  SEED_PREFERENCE_LABELS,
  OUTPUT_STYLE_UNAVAILABLE_NOTICE,
  readHomeSeedFile,
  checkSidecarState,
  readCloudSettingsForSeed,
  applyHomeSeedToCloudSession,
  createApplyDeps,
  reloadAfterSeedApply,
  createHomeSeedTelemetry,
};
