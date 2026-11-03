/**
 * services/homeSeed/applyHomeSeed.ts
 *
 * 2.1.316 新增：在云会话中应用 home seed
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-twq47pff.js (35)
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
import { record, string, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { readOnlyNoFollowFlags } from "../../utils/platformTargets.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";
import { createHomeFileWriter, resolveDestinationSpelling } from "./destination.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  markInternalWrite,
  consumeInternalWrite,
  INTERNAL_WRITE_WINDOW_MS,
} from "../../cli/headlessCloud/attachServe.js";
import { runInSettingsWriteQueue, getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { isSettingsToCloudAvailable } from "../../cli/remoteIO/workerAuth.js";
import { SYNCED_FILE_ROOT } from "../syncedFiles/syncedFileSyncer.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { count } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { MAX_PACK_BYTES } from "./homePack.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-twq47pff.js:36275-36405 placement = formatRecentMessages (1)
function formatRecentMessages(homeReal, e) {
  try {
    return processMemoryFile(e.content.toString("utf8"), join(homeReal, ...e.path.split("/")), "User").every(
      (n) => isSkillPathOutsideOutputStyles(homeReal, n),
    );
  } catch {
    return false;
  }
}
//@ chunk-twq47pff.js:36405-36571 placement = getOutputStyleAttachment (0.676)
/**
 * 路径在技能根目录内且不是 output_style 类型。旧版名 getOutputStyleAttachment 为错配；归错文件（技能改进相关）。
 */
function isSkillPathOutsideOutputStyles(t, e) {
  let n = relative(t, e);
  if (n === "" || n === ".." || n.startsWith(`..${sep}`) || isAbsolute(n)) return false;
  let l = workingFileDestination(n.split(sep).join("/"));
  return l !== null && l.kind !== "output_style";
}
//@ chunk-twq47pff.js:36571-36663 placement = isFileReadDenied (1)
/**
 * 读 ccr-home-seed.json 并解析。归错文件。
 */
async function readHomeSeedFile(filePath) {
  let denyRule = await readBoundedFile(join(filePath, CCR_HOME_SEED_JSON), MAX_SIDECAR_BYTES);
  return denyRule.kind === "read" ? parseHomeSidecar(denyRule.content) : null;
}
//@ chunk-twq47pff.js:36663-36812 placement
async function checkSidecarState(t) {
  let boundedFile = await readBoundedFile(join(t, CCR_HOME_SEED_JSON), MAX_SIDECAR_BYTES);
  if (boundedFile.kind === "absent") return "absent";
  return boundedFile.kind === "read" && parseHomeSidecar(boundedFile.content) !== null ? "valid" : "invalid";
}
//@ chunk-twq47pff.js:36812-36869 placement
/**
 * 读取云会话的 settings 文件并判断可用状态（absent/unusable/object）。
 */
async function readCloudSettingsForSeed(t) {
  let boundedFile = await readBoundedFile(t, MAX_RENDERED_SETTINGS_BYTES);
  return parseExistingSettings(boundedFile, t);
}
//@ chunk-twq47pff.js:36869-37165 placement
/**
 * 解析云端现有 settings 文件：不存在、不可读或过大分别返回 absent/unusable，能解析为对象时返回 object。
 */
function parseExistingSettings(t, e) {
  if (t.kind === "absent")
    return {
      kind: "absent",
    };
  if (t.kind !== "read" || t.content.length > MAX_RENDERED_SETTINGS_BYTES)
    return {
      kind: "unusable",
    };
  let str = t.content.toString("utf8");
  let l = stripBom(str);
  let d = cloudSettingsSchema().safeParse(l.trim() === "" ? {} : tryJsonParse(l));
  return d.success && parseSettingsContent(str, e).settings !== null
    ? {
        kind: "object",
        value: d.data,
      }
    : {
        kind: "unusable",
      };
}
//@ chunk-twq47pff.js:37165-37274 placement
function isEmptySettingsFile(existing, settingsPath) {
  try {
    let existingSettings = parseExistingSettings(existing, settingsPath);
    return existingSettings.kind === "object" && Object.keys(existingSettings.value).length === 0;
  } catch {
    return false;
  }
}
//@ chunk-twq47pff.js:37274-37301 placement
/**
 * 云会话 settings 的宽松 schema（未知键原样保留）。
 */
var cloudSettingsSchema = DoctorLazy(() => record(string(), unknown()));
//@ chunk-twq47pff.js:37301-37351 placement = isRealPathWithinTeamDir (1)
function isNotFoundCode_2(realCandidate) {
  return realCandidate === "ENOENT" || realCandidate === "ENOTDIR";
}
//@ chunk-twq47pff.js:37351-37734 placement
/**
 * 打开并读取不超过上限的普通文件，返回 read/absent/not_regular/too_large/unreadable。
 */
async function readBoundedFile(t, e) {
  try {
    let n = await open(t, readOnlyNoFollowFlags());
    try {
      let stats = await n.stat();
      if (!stats.isFile())
        return {
          kind: "not_regular",
        };
      if (stats.size > e)
        return {
          kind: "too_large",
        };
      return {
        kind: "read",
        content: await readJSONLFile(n, stats.size),
      };
    } finally {
      await n.close();
    }
  } catch (error) {
    let l = getErrnoCode(error) ?? "unknown";
    if (isNotFoundCode_2(l))
      return {
        kind: "absent",
      };
    return l === "ELOOP" || l === "EISDIR" || l === "ENXIO"
      ? {
          kind: "not_regular",
        }
      : {
          kind: "unreadable",
          code: l,
        };
  }
}
//@ chunk-twq47pff.js:37734-38001 placement
function createApplyDeps({ storageV5, configHome }) {
  return {
    writeHomeFile: createHomeFileWriter({
      storageV5,
      flagOn: isStorageV5Enabled(),
      configHome,
    }),
    markInternalWrite,
    consumeInternalWrite: (n) => {
      consumeInternalWrite(n, INTERNAL_WRITE_WINDOW_MS);
    },
    inSettingsWriteQueue: (n) =>
      runInSettingsWriteQueue(
        getSettingsFilePathForSource("userSettings") ?? join(configHome, SETTINGS_JSON),
        n,
      ),
    now: () => Date.now(),
    settingsToCloud: isSettingsToCloudAvailable,
  };
}
//@ chunk-twq47pff.js:38001-38742 placement
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
      (E) =>
        E !== null &&
        (isPathInside({
          path: realHome,
          directory: E,
        }) ||
          isPathInside({
            path: E,
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
//@ chunk-twq47pff.js:38742-38854 placement
async function isInsideGitWorktree(t) {
  for (let e = t; ; e = dirname(e)) {
    if ((await statOrState(join(e, ".git"))) !== "absent") return true;
    if (dirname(e) === e) return false;
  }
}
//@ chunk-twq47pff.js:38854-38948 placement
/**
 * 取路径状态：不存在返回 absent，其他错误返回 unverifiable。
 */
async function statOrState(t) {
  try {
    return await lstat(t);
  } catch (error) {
    return isNotFoundCode_2(getErrnoCode(error)) ? "absent" : "unverifiable";
  }
}
//@ chunk-twq47pff.js:38948-39032 placement
/**
 * 判断 path 是否等于 directory 或在其中。
 */
function isPathInside({ path, directory }) {
  return path === directory || path.startsWith(directory.endsWith(sep) ? directory : directory + sep);
}
//@ chunk-twq47pff.js:39032-42658 placement
async function applyHomeSeedToCloudSession(t, e, n) {
  let l = await Promise.resolve()
    .then(n.settingsToCloud)
    .then(
      (S) => (S ? "on" : "off"),
      () => "threw",
    );
  if (l !== "on") {
    logForDiagnosticsNoPII("info", "home_seed_apply_flag_off", {
      gate: l,
    });
    return {
      outcome: "flag_off",
      generation: t.generation,
    };
  }
  let d = await vetHomeSeedRoot(e.configHome, e.repoRoot, e.syncedRoot);
  if (!d.ok) {
    logForDiagnosticsNoPII("warn", "home_seed_config_home_unsafe", {
      reason: d.reason,
    });
    return {
      outcome: "config_home_unsafe",
      generation: t.generation,
      reason: d.reason,
    };
  }
  let ctx = {
    configHome: resolve(e.configHome),
    homeReal: d.real,
    keepsForeignFiles: e.foreignFiles !== "replaced",
    deps: n,
  };
  let w = [];
  for (let removal of t.removals)
    w.push({
      removal,
      result: await removeSeedFile(removal, ctx),
    });
  let v = [];
  for (let write of t.writes) {
    let { result: ee, stoodForeign } = await applySeedFile(write, t.priorEntries.get(write.path), ctx);
    v.push({
      file: write,
      result: ee,
      stoodForeign,
    });
    let ae = t.priorEntries.get(write.path);
    if (ee === "loader_reach" && ae !== undefined) {
      let Re = {
        path: write.path,
        kind: write.kind,
        sha256: ae,
      };
      w.push({
        removal: Re,
        result: await removeSeedFile(Re, ctx),
      });
    }
  }
  let P = await ctx.deps.inSettingsWriteQueue(() => applySeedSettings(t, e.settingsPath, ctx));
  let filtered = v.filter(({ result: S }) => S === "applied");
  let filtered_2 = w.filter(({ result: S }) => S === "removed");
  let j = new Set(w.filter(({ result: S }) => S !== "failed").map(({ removal }) => removal.path));
  let filtered_3 = v.filter(({ result: S }) => S === "applied" || S === "unverified");
  let Q = new Set(filtered_3.map(({ file }) => file.path));
  let x = new Map([
    ...[...t.priorEntries].filter(([S]) => !j.has(S) && !Q.has(S)),
    ...filtered_3.map(({ file }) => [file.path, file.sha256]),
  ]);
  let N = t.settings !== null && e.settingsPath !== undefined;
  let q = t.settings === null && t.priorSettingsSha256 !== null && e.settingsPath !== undefined;
  let X = N || q || (e.settingsPath !== undefined && t.counts.refused.settings !== "none");
  let Te = t.counts.refused.settings === "none" && !P.keptForeign && (P.written || (q && !P.removeFailed));
  let K = t.writes.length + t.counts.refilteredCredentialFiles + w.length + (X ? 1 : 0);
  let de = count(w, ({ result: S }) => S === "failed");
  let ue = filtered.length + (w.length - de) + (Te ? 1 : 0);
  let se = (S) => count(v, (ee) => ee.result === S);
  let Me = K === 0 ? "empty" : ue === K ? "applied" : "partial";
  let be = t.restoreRecord === true;
  let we =
    !(be
      ? !P.written
      : x.size === 0 &&
        P.sha256After === null &&
        t.priorEntries.size === 0 &&
        t.priorSettingsSha256 === null) &&
    (await writeHomeSidecar(ctx, {
      version: SIDECAR_VERSION,
      generation: t.generation,
      writtenAtMs: n.now(),
      entries: be
        ? ((await readHomeSeedFile(e.configHome))?.entries ?? [])
        : [...x].map(([S, ee]) => ({
            path: S,
            sha256: ee,
          })),
      settingsSha256: be && !(ctx.keepsForeignFiles && P.nothingStood) ? null : P.sha256After,
      ...(Me !== "partial" && {
        packEtag: t.packEtag,
      }),
    }));
  if (we && x.size > MAX_SIDECAR_ENTRIES)
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_trimmed", {
      dropped: x.size - MAX_SIDECAR_ENTRIES,
    });
  return {
    outcome: Me,
    generation: t.generation,
    filesApplied: filtered.length,
    appliedByKind: {
      claude_md: count(filtered, ({ file }) => file.kind === "claude_md"),
      rule: count(filtered, ({ file }) => file.kind === "rule"),
      output_style: count(filtered, ({ file }) => file.kind === "output_style"),
    },
    filesReplacedForeign: count(filtered, ({ stoodForeign }) => stoodForeign),
    filesRefused: {
      destination: t.counts.refused.destination,
      overCap: t.counts.refused.overCap,
      resolvedDestination: se("refused") + se("unverified"),
      parentNotDirectory: se("parent_not_directory"),
      destIsDirectory: se("dest_is_directory"),
      loaderReach: se("loader_reach"),
      credential: t.counts.refilteredCredentialFiles,
      keptForeign: se("kept_foreign"),
    },
    filesFailed: se("failed"),
    filesRemoved: filtered_2.length,
    removalsFailed: de,
    settingsAttempted: N,
    settingsWritten: P.written,
    settingsKeptForeign: P.keptForeign,
    rulesLeftOut: P.keptForeign ? (t.restrictingSettings?.rulesLeftOut ?? 0) : 0,
    settingsRemoved: P.removed,
    settingsRemoveFailed: P.removeFailed,
    standingSettingsUnreadable: P.unreadable,
    settingsRefused: t.counts.refused.settings,
    replacedExistingSettings: P.replaced,
    refilteredKeys: t.counts.refilteredKeys,
    refilteredCredentials: t.counts.refilteredCredentials,
    refilteredCredentialRestrictions: t.counts.refilteredCredentialRestrictions,
    permissionsDropped: t.counts.permissionsDropped,
    touchedKinds: new Set([
      ...filtered_3.map(({ file }) => file.kind),
      ...filtered_2.map(({ removal }) => removal.kind),
    ]),
    sidecarWritten: we,
  };
}
//@ chunk-twq47pff.js:42658-42704 placement
/**
 * 在根目录下按 / 分隔的相对路径拼接。
 */
function joinUnder(configHome, e) {
  return join(configHome, ...e.split("/"));
}
//@ chunk-twq47pff.js:42704-42940 placement
async function applySeedFile(write, e, n) {
  let l = await checkSeedFileDestination(write, n);
  if (l !== "clear")
    return {
      result: l,
      stoodForeign: false,
    };
  let d = await hasForeignFileAt(write.path, e, n);
  if (d && n.keepsForeignFiles)
    return {
      result: "kept_foreign",
      stoodForeign: false,
    };
  return {
    result: await writeSeedFile(write, n),
    stoodForeign: d,
  };
}
//@ chunk-twq47pff.js:42940-43542 placement
/**
 * 检查单个种子文件能否写入：非输出样式需在加载器可达范围；解析后的拼写须是合法目的地；路径无阻碍且 home 已核实。返回 clear 或拒绝原因（均记诊断）。
 */
async function checkSeedFileDestination(t, e) {
  if (t.kind !== "output_style" && !formatRecentMessages(e.homeReal, t)) {
    logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
      reason: "loader_reach",
    });
    return "loader_reach";
  }
  let destPath = joinUnder(e.configHome, t.path);
  let resolvedRel = await resolveDestinationSpelling(e.homeReal, destPath);
  if (resolvedRel === null || !isWorkingFilePath(resolvedRel)) {
    logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
      reason: "resolved_spelling",
    });
    return "refused";
  }
  let obstruction = await findDestinationObstruction(t.path, e);
  if (obstruction !== "clear") {
    logForDiagnosticsNoPII("warn", "home_seed_destination_obstructed", {
      reason: obstruction,
    });
    return obstruction === "parent_not_directory" || obstruction === "dest_is_directory"
      ? obstruction
      : "refused";
  }
  if (!(await isHomeStillVetted(e))) {
    logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
      reason: "home_unvetted",
    });
    return "refused";
  }
  return "clear";
}
//@ chunk-twq47pff.js:43542-43928 placement
/**
 * 写入种子文件并核实落点，返回 applied/unverified；目标被拒或写入失败时记诊断。
 */
async function writeSeedFile(t, e) {
  let n = joinUnder(e.configHome, t.path);
  try {
    await e.deps.writeHomeFile(e.configHome, n, t.content);
    if (!(await verifyWrittenSeedFile(t.path, e))) return "unverified";
    return "applied";
  } catch (error) {
    let d = getErrnoCode(error) ?? "unknown";
    if (d.startsWith("WORKING_") || d.startsWith("HOME_DEST_")) {
      logForDiagnosticsNoPII("warn", "home_seed_destination_refused", {
        reason: d,
      });
      return "refused";
    }
    logForDiagnosticsNoPII("warn", "home_seed_write_failed", {
      code: d,
    });
    return "failed";
  }
}
//@ chunk-twq47pff.js:43928-44035 placement
async function isHomeStillVetted(t) {
  try {
    return (await realpath(t.configHome)) === t.homeReal && !(await isInsideGitWorktree(t.homeReal));
  } catch {
    return false;
  }
}
//@ chunk-twq47pff.js:44035-44290 placement
async function verifyWrittenSeedFile(path, e) {
  let n = joinUnder(e.configHome, path);
  let d =
    (await resolveDestinationSpelling(e.homeReal, n)) !== path
      ? "resolved_spelling"
      : await checkLeafRegular(n);
  if (d !== null) {
    logForDiagnosticsNoPII("warn", "home_seed_write_escaped", {
      reason: d,
    });
    return false;
  }
  if (!(await isHomeStillVetted(e))) {
    logForDiagnosticsNoPII("warn", "home_seed_write_unverified", {});
    return false;
  }
  return true;
}
//@ chunk-twq47pff.js:44290-44437 placement
async function checkLeafRegular(t) {
  let e = await statOrState(t);
  return e === "absent"
    ? "leaf_absent"
    : e === "unverifiable"
      ? "leaf_unverifiable"
      : e.isFile()
        ? null
        : "leaf_not_regular";
}
//@ chunk-twq47pff.js:44437-44886 placement
/**
 * 逐级检查目标的祖先：不存在为 none；无法验证、是符号链接、不是目录或位于 git 工作区内则返回相应阻碍。
 */
async function findAncestorObstruction(t, e) {
  let parts = t.split("/");
  for (let j = 1; j < parts.length; j++) {
    let d = joinUnder(e.configHome, parts.slice(0, j).join("/"));
    let u = await statOrState(d);
    if (u === "absent") return "none";
    if (u === "unverifiable") return "ancestor_unverifiable";
    if (u.isSymbolicLink()) return "ancestor_is_symlink";
    if (!u.isDirectory()) return "parent_not_directory";
    let w = await statOrState(join(d, ".git"));
    if (w === "unverifiable") return "ancestor_unverifiable";
    if (w !== "absent") return "ancestor_in_worktree";
  }
  return "none";
}
//@ chunk-twq47pff.js:44886-45201 placement
/**
 * 检查目标位置是否被占用：先查上层障碍，再看目标叶子（不存在、无法核验、符号链接、目录或非普通文件）。
 */
async function findDestinationObstruction(path, e) {
  let ancestorObstruction = await findAncestorObstruction(path, e);
  if (ancestorObstruction !== "none") return ancestorObstruction;
  let l = await statOrState(joinUnder(e.configHome, path));
  if (l === "absent") return "clear";
  if (l === "unverifiable") return "leaf_unverifiable";
  if (l.isSymbolicLink()) return "leaf_is_symlink";
  if (l.isDirectory()) return "dest_is_directory";
  return l.isFile() ? "clear" : "leaf_not_regular";
}
//@ chunk-twq47pff.js:45201-45411 placement
async function hasForeignFileAt(path, e, n) {
  let boundedFile = await readBoundedFile(joinUnder(n.configHome, path), MAX_WORKING_FILE_BYTES);
  switch (boundedFile.kind) {
    case "absent":
    case "not_regular":
      return false;
    case "too_large":
    case "unreadable":
      return true;
    case "read":
      return e === undefined || computeContentHash(boundedFile.content) !== e;
  }
}
//@ chunk-twq47pff.js:45411-46159 placement
/**
 * 删除之前由种子写入的文件：home 未核实、无法解析或位置不合法时失败；文件已不存在为 gone；内容摘要不符视为别人的文件不删。
 */
async function removeSeedFile(t, e) {
  let destPath = joinUnder(e.configHome, t.path);
  let resolvedRel = await resolveDestinationSpelling(e.homeReal, destPath);
  let obstruction = !(await isHomeStillVetted(e))
    ? "home_unvetted"
    : resolvedRel === null
      ? "unresolvable"
      : !isWorkingFilePath(resolvedRel)
        ? "resolves_elsewhere"
        : await findAncestorObstruction(t.path, e);
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
  if (computeContentHash(read.content) !== t.sha256) return "not_ours";
  try {
    await unlink(destPath);
    return "removed";
  } catch (error) {
    let v = getErrnoCode(error) ?? "unknown";
    if (isNotFoundCode_2(v)) return "gone";
    logForDiagnosticsNoPII("warn", "home_seed_remove_failed", {
      code: v,
    });
    return "failed";
  }
}
//@ chunk-twq47pff.js:46159-48413 placement
/**
 * 把种子设置写入云端 settings.json：校验路径与 home；按现有文件是否为本方写入或他人文件决定替换、保留或只合并限制性规则；设置为空且文件是本方写入时删除；写后核实并返回各状态与新摘要。
 */
async function applySeedSettings(t, settingsPath, n) {
  let baseResult = {
    written: false,
    keptForeign: false,
    nothingStood: false,
    removed: false,
    removeFailed: false,
    unreadable: false,
    replaced: "none",
    sha256After: t.priorSettingsSha256,
  };
  if (settingsPath === undefined || (t.settings === null && t.priorSettingsSha256 === null))
    return baseResult;
  if (basename(settingsPath) !== SETTINGS_JSON || !(await isFileDirectlyIn(n.homeReal, settingsPath))) {
    logForDiagnosticsNoPII("warn", "home_seed_settings_path_refused", {});
    return t.settings === null
      ? {
          ...baseResult,
          removeFailed: true,
        }
      : baseResult;
  }
  let settingsPath_2 = settingsPath;
  if (t.settings === null && !(await isHomeStillVetted(n))) {
    logForDiagnosticsNoPII("warn", "home_seed_settings_remove_failed", {
      code: "home_unvetted",
    });
    return {
      ...baseResult,
      removeFailed: true,
    };
  }
  let existing = await readBoundedFile(settingsPath_2, MAX_PACK_BYTES);
  if (existing.kind === "not_regular" || existing.kind === "unreadable") {
    logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", {
      reason: existing.kind,
    });
    return {
      ...baseResult,
      unreadable: true,
      removeFailed: t.settings === null,
    };
  }
  let ownership =
    existing.kind === "absent"
      ? "none"
      : existing.kind === "read" && computeContentHash(existing.content) === t.priorSettingsSha256
        ? "ours"
        : "foreign";
  let isRestore = t.restoreRecord === true;
  let refusedSettings = t.counts.refused.settings !== "none" && !isRestore;
  let nothingStood =
    existing.kind === "absent" || (n.keepsForeignFiles && isEmptySettingsFile(existing, settingsPath_2));
  let foreignStands = n.keepsForeignFiles && ownership === "foreign" && !nothingStood;
  let keepForeign = foreignStands && t.settings !== null && !isRestore;
  let result = {
    ...baseResult,
    keptForeign: keepForeign,
    nothingStood,
    replaced: keepForeign ? "none" : ownership,
  };
  let renderRestrictive = (settings) => {
    try {
      return renderRestrictiveSettings(
        settings,
        parseExistingSettings(existing, settingsPath_2),
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
    ? renderRestrictive(t.restrictingSettings?.plan ?? null)
    : refusedSettings || isRestore
      ? renderRestrictive(t.settings)
      : t.settings;
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
      await unlink(settingsPath_2);
      return {
        ...result,
        removed: true,
        sha256After: null,
      };
    } catch (error) {
      let X = getErrnoCode(error) ?? "unknown";
      if (isNotFoundCode_2(X))
        return {
          ...result,
          sha256After: null,
        };
      logForDiagnosticsNoPII("warn", "home_seed_settings_remove_failed", {
        code: X,
      });
      return {
        ...result,
        removeFailed: true,
      };
    }
  }
  if (!(await isHomeStillVetted(n))) {
    logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", {
      reason: "home_unvetted",
    });
    return result;
  }
  let shaAfter =
    (refusedSettings || keepForeign) && ownership === "foreign" && !nothingStood ? null : toWrite.sha256;
  n.deps.markInternalWrite(settingsPath_2);
  try {
    await n.deps.writeHomeFile(n.configHome, settingsPath_2, Buffer.from(toWrite.rendered));
    let q = await checkLeafRegular(settingsPath_2);
    if (q !== null || !(await isHomeStillVetted(n))) {
      logForDiagnosticsNoPII("warn", "home_seed_write_unverified", {
        reason: q ?? "home_unvetted",
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
    n.deps.consumeInternalWrite(settingsPath_2);
    logForDiagnosticsNoPII("warn", "home_seed_settings_write_failed", {
      code: getErrnoCode(error) ?? "unknown",
    });
    return {
      ...result,
      sha256After: ownership === "ours" ? t.priorSettingsSha256 : null,
    };
  }
}
//@ chunk-twq47pff.js:48413-48495 placement
/**
 * 判断文件是否直接位于目录 t 下（不跟随到别处）。
 */
async function isFileDirectlyIn(homeReal, e) {
  try {
    return (await realpath(dirname(e))) === homeReal && basename(e) !== "";
  } catch {
    return false;
  }
}
//@ chunk-twq47pff.js:48495-49023 placement
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
//@ chunk-twq47pff.js:49023-49173 placement = readJSONLFile (1)
async function readJSONLFile(t, e) {
  let buf = Buffer.allocUnsafe(e);
  let totalRead = 0;
  while (totalRead < e) {
    let { bytesRead } = await t.read(buf, totalRead, e - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-twq47pff.js:49173-49189 placement
/**
 * 生成空的更新对象（占位）。
 */
var emptyUpdate = () => ({});
//@ chunk-twq47pff.js:49189-52227 placement
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
      let y =
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
          ...(y !== null && {
            files_applied: y.filesApplied,
            files_replaced_foreign: y.filesReplacedForeign,
            files_refused_destination: y.filesRefused.destination,
            files_refused_over_cap: y.filesRefused.overCap,
            files_refused_resolved_destination: y.filesRefused.resolvedDestination,
            files_refused_parent_not_directory: y.filesRefused.parentNotDirectory,
            files_refused_dest_is_directory: y.filesRefused.destIsDirectory,
            files_refused_loader_reach: y.filesRefused.loaderReach,
            files_refused_credential: y.filesRefused.credential,
            files_refused_kept_foreign: y.filesRefused.keptForeign,
            files_failed: y.filesFailed,
            files_removed: y.filesRemoved,
            removals_failed: y.removalsFailed,
            settings_written: y.settingsWritten,
            settings_kept_foreign: y.settingsKeptForeign,
            rules_left_out: y.rulesLeftOut,
            settings_removed: y.settingsRemoved,
            settings_refused: fromEnum(y.settingsRefused),
            settings_attempted: y.settingsAttempted,
            standing_settings_unreadable: y.standingSettingsUnreadable,
            replaced_existing_settings: fromEnum(y.replacedExistingSettings),
            refiltered_keys: y.refilteredKeys,
            refiltered_credentials: y.refilteredCredentials,
            refiltered_credential_restrictions: y.refilteredCredentialRestrictions,
            permissions_dropped: y.permissionsDropped,
            sidecar_written: y.sidecarWritten,
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
//@ chunk-twq47pff.js:52227-52668 placement
/**
 * 种子应用后按变化刷新：设置变化重载用户设置，CLAUDE.md/规则变化清记忆与用户上下文，首个询问后清系统提示分段，输出样式变化清样式缓存。
 */
function reloadAfterSeedApply(t, e, reloaders) {
  if (t.outcome === "config_home_unsafe" || t.outcome === "flag_off") return;
  if (t.settingsWritten || t.settingsRemoved) reloaders.reloadUserSettings();
  if (t.touchedKinds.has("claude_md") || t.touchedKinds.has("rule")) {
    reloaders.clearMemoryFiles();
    reloaders.clearUserContext();
  }
  if (
    (t.filesApplied > 0 || t.filesRemoved > 0 || t.settingsWritten || t.settingsRemoved) &&
    !e.beforeFirstAsk
  )
    reloaders.clearSystemPromptSections();
  if (t.touchedKinds.has("output_style")) reloaders.clearOutputStyles();
}
//@ chunk-twq47pff.js:52668-53774 placement
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
