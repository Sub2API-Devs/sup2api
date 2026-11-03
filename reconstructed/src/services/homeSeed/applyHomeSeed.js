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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  isAbsolute,
  resolve,
  resolve as resolve_2,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  basename,
  basename as basename_2,
  basename as basename_3,
} from "path";
import {
  open,
  lstat,
  lstat as lstat_2,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  unlink,
} from "fs/promises";
import { processMemoryFile } from "../../utils/claudemd.js";
import { Kyt, SETTINGS_JSON, RUt, uue } from "./workingFiles.js";
import { CCR_HOME_SEED_JSON } from "../../utils/teleport/homeSeed.js";
import {
  MAX_SIDECAR_BYTES,
  parseHomeSidecar,
  Pe,
  SIDECAR_VERSION,
  MAX_SIDECAR_ENTRIES,
  renderRestrictiveSettings,
  encodeHomeSidecar,
} from "./homeSidecar.js";
import { Wo } from "../../utils/json.js";
import { bln } from "./portableSettings.js";
import { parseSettingsContent } from "../../utils/settings/settingsFileParsing.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { pe, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { $c } from "../../utils/platformTargets.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";
import { createHomeFileWriter, resolveDestinationSpelling } from "./destination.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { eOt, consumeInternalWrite, lIn } from "../../cli/headlessCloud/attachServe.js";
import { runInSettingsWriteQueue, getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { K1n } from "../../cli/remoteIO/workerAuth.js";
import { SYNCED_FILE_ROOT } from "../syncedFiles/syncedFileSyncer.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { count } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { MAX_PACK_BYTES } from "./homePack.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-twq47pff.js:36275-36405 placement = formatRecentMessages (1)
function formatRecentMessages(t, e) {
  try {
    return processMemoryFile(e.content.toString("utf8"), join_5(t, ...e.path.split("/")), "User").every((n) =>
      isSkillPathOutsideOutputStyles(t, n),
    );
  } catch {
    return !1;
  }
}
/**
 * 路径在技能根目录内且不是 output_style 类型。旧版名 getOutputStyleAttachment 为错配；归错文件（技能改进相关）。
 */
//@ chunk-twq47pff.js:36405-36571 placement = getOutputStyleAttachment (0.676)
function isSkillPathOutsideOutputStyles(t, e) {
  let n = relative_3(t, e);
  if (n === "" || n === ".." || n.startsWith(`..${sep_4}`) || isAbsolute(n)) return !1;
  let l = Kyt(n.split(sep_4).join("/"));
  return l !== null && l.kind !== "output_style";
}
/**
 * 读 ccr-home-seed.json 并解析。归错文件。
 */
//@ chunk-twq47pff.js:36571-36663 placement = isFileReadDenied (1)
async function readHomeSeedFile(t) {
  let e = await readBoundedFile(join_2(t, CCR_HOME_SEED_JSON), MAX_SIDECAR_BYTES);
  return e.kind === "read" ? parseHomeSidecar(e.content) : null;
}
//@ chunk-twq47pff.js:36663-36812 placement
async function checkSidecarState(t) {
  let e = await readBoundedFile(join_2(t, CCR_HOME_SEED_JSON), MAX_SIDECAR_BYTES);
  if (e.kind === "absent") return "absent";
  return e.kind === "read" && parseHomeSidecar(e.content) !== null ? "valid" : "invalid";
}
//@ chunk-twq47pff.js:36812-36869 placement
async function pn(t) {
  let e = await readBoundedFile(t, Pe);
  return parseExistingSettings(e, t);
}
/**
 * 解析云端现有 settings 文件：不存在、不可读或过大分别返回 absent/unusable，能解析为对象时返回 object。
 */
//@ chunk-twq47pff.js:36869-37165 placement
function parseExistingSettings(t, e) {
  if (t.kind === "absent") return { kind: "absent" };
  if (t.kind !== "read" || t.content.length > Pe) return { kind: "unusable" };
  let str = t.content.toString("utf8"),
    l = Wo(str),
    safeParse = ur().safeParse(l.trim() === "" ? {} : bln(l));
  return safeParse.success && parseSettingsContent(str, e).settings !== null
    ? { kind: "object", value: safeParse.data }
    : { kind: "unusable" };
}
//@ chunk-twq47pff.js:37165-37274 placement
function isEmptySettingsFile(t, e) {
  try {
    let n = parseExistingSettings(t, e);
    return n.kind === "object" && Object.keys(n.value).length === 0;
  } catch {
    return !1;
  }
}
//@ chunk-twq47pff.js:37274-37301 placement
var ur = DoctorLazy(() => pe(o(), oe()));
//@ chunk-twq47pff.js:37301-37351 placement = isRealPathWithinTeamDir (1)
function isNotFoundCode_2(realCandidate) {
  return realCandidate === "ENOENT" || realCandidate === "ENOTDIR";
}
/**
 * 打开并读取不超过上限的普通文件，返回 read/absent/not_regular/too_large/unreadable。
 */
//@ chunk-twq47pff.js:37351-37734 placement
async function readBoundedFile(t, e) {
  try {
    let n = await open(t, $c());
    try {
      let stats = await n.stat();
      if (!stats.isFile()) return { kind: "not_regular" };
      if (stats.size > e) return { kind: "too_large" };
      return { kind: "read", content: await readJSONLFile(n, stats.size) };
    } finally {
      await n.close();
    }
  } catch (error) {
    let l = getErrnoCode(error) ?? "unknown";
    if (isNotFoundCode_2(l)) return { kind: "absent" };
    return l === "ELOOP" || l === "EISDIR" || l === "ENXIO"
      ? { kind: "not_regular" }
      : { kind: "unreadable", code: l };
  }
}
//@ chunk-twq47pff.js:37734-38001 placement
function createApplyDeps({ storageV5: storageV5, configHome: configHome }) {
  return {
    writeHomeFile: createHomeFileWriter({
      storageV5: storageV5,
      flagOn: isStorageV5Enabled(),
      configHome: configHome,
    }),
    markInternalWrite: eOt,
    consumeInternalWrite: (n) => {
      consumeInternalWrite(n, lIn);
    },
    inSettingsWriteQueue: (n) =>
      runInSettingsWriteQueue(
        getSettingsFilePathForSource("userSettings") ?? join_2(configHome, SETTINGS_JSON),
        n,
      ),
    now: () => Date.now(),
    settingsToCloud: K1n,
  };
}
/**
 * 校验 home seed 的根目录：必须是真实目录、不与仓库重叠、不在 git 工作区内、不与同步文件根重叠，返回真实路径或原因。
 */
//@ chunk-twq47pff.js:38001-38742 placement
async function vetHomeSeedRoot(t, e, n = SYNCED_FILE_ROOT) {
  let resolved = resolve(t),
    stat;
  try {
    stat = await lstat(resolved);
  } catch (error) {
    return { ok: !1, reason: isENOENT(error) ? "missing" : "unresolvable" };
  }
  if (stat.isSymbolicLink()) return { ok: !1, reason: "symlink" };
  if (!stat.isDirectory()) return { ok: !1, reason: "not_directory" };
  let realHome, realRepo;
  try {
    ((realHome = await realpath(resolved)), (realRepo = await realpath(e)));
  } catch {
    return { ok: !1, reason: "unresolvable" };
  }
  if (et({ path: realRepo, directory: realHome })) return { ok: !1, reason: "overlaps_repo" };
  if (await isInsideGitWorktree(realHome)) return { ok: !1, reason: "inside_git_worktree" };
  if (et({ path: realHome, directory: realRepo }))
    logForDiagnosticsNoPII("info", "home_under_cwd_no_worktree", {});
  let realSyncedRoot;
  try {
    realSyncedRoot = await realpath(n);
  } catch (error) {
    if (!isNotFoundCode_2(getErrnoCode(error))) return { ok: !1, reason: "unresolvable" };
    realSyncedRoot = null;
  }
  if (
    [n, realSyncedRoot].some(
      (E) => E !== null && (et({ path: realHome, directory: E }) || et({ path: E, directory: realHome })),
    )
  )
    return { ok: !1, reason: "inside_synced_root" };
  return { ok: !0, real: realHome };
}
//@ chunk-twq47pff.js:38742-38854 placement
async function isInsideGitWorktree(t) {
  for (let e = t; ; e = dirname(e)) {
    if ((await $e(join_2(e, ".git"))) !== "absent") return !0;
    if (dirname(e) === e) return !1;
  }
}
//@ chunk-twq47pff.js:38854-38948 placement
async function $e(t) {
  try {
    return await lstat(t);
  } catch (error) {
    return isNotFoundCode_2(getErrnoCode(error)) ? "absent" : "unverifiable";
  }
}
//@ chunk-twq47pff.js:38948-39032 placement
function et({ path: path, directory: directory }) {
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
  if (l !== "on")
    return (
      logForDiagnosticsNoPII("info", "home_seed_apply_flag_off", { gate: l }),
      { outcome: "flag_off", generation: t.generation }
    );
  let d = await vetHomeSeedRoot(e.configHome, e.repoRoot, e.syncedRoot);
  if (!d.ok)
    return (
      logForDiagnosticsNoPII("warn", "home_seed_config_home_unsafe", { reason: d.reason }),
      { outcome: "config_home_unsafe", generation: t.generation, reason: d.reason }
    );
  let u = {
      configHome: resolve(e.configHome),
      homeReal: d.real,
      keepsForeignFiles: e.foreignFiles !== "replaced",
      deps: n,
    },
    w = [];
  for (let removal of t.removals) w.push({ removal: removal, result: await removeSeedFile(removal, u) });
  let v = [];
  for (let write of t.writes) {
    let { result: ee, stoodForeign: stoodForeign } = await applySeedFile(
      write,
      t.priorEntries.get(write.path),
      u,
    );
    v.push({ file: write, result: ee, stoodForeign: stoodForeign });
    let ae = t.priorEntries.get(write.path);
    if (ee === "loader_reach" && ae !== void 0) {
      let Re = { path: write.path, kind: write.kind, sha256: ae };
      w.push({ removal: Re, result: await removeSeedFile(Re, u) });
    }
  }
  let inSettingsWriteQueue = await u.deps.inSettingsWriteQueue(() => applySeedSettings(t, e.settingsPath, u)),
    filtered = v.filter(({ result: S }) => S === "applied"),
    filtered_2 = w.filter(({ result: S }) => S === "removed"),
    j = new Set(w.filter(({ result: S }) => S !== "failed").map(({ removal: removal }) => removal.path)),
    filtered_3 = v.filter(({ result: S }) => S === "applied" || S === "unverified"),
    Q = new Set(filtered_3.map(({ file: file }) => file.path)),
    x = new Map([
      ...[...t.priorEntries].filter(([S]) => !j.has(S) && !Q.has(S)),
      ...filtered_3.map(({ file: file }) => [file.path, file.sha256]),
    ]),
    N = t.settings !== null && e.settingsPath !== void 0,
    q = t.settings === null && t.priorSettingsSha256 !== null && e.settingsPath !== void 0,
    X = N || q || (e.settingsPath !== void 0 && t.counts.refused.settings !== "none"),
    Te =
      t.counts.refused.settings === "none" &&
      !inSettingsWriteQueue.keptForeign &&
      (inSettingsWriteQueue.written || (q && !inSettingsWriteQueue.removeFailed)),
    K = t.writes.length + t.counts.refilteredCredentialFiles + w.length + (X ? 1 : 0),
    de = count(w, ({ result: S }) => S === "failed"),
    ue = filtered.length + (w.length - de) + (Te ? 1 : 0),
    se = (S) => count(v, (ee) => ee.result === S),
    Me = K === 0 ? "empty" : ue === K ? "applied" : "partial",
    be = t.restoreRecord === !0,
    we =
      !(be
        ? !inSettingsWriteQueue.written
        : x.size === 0 &&
          inSettingsWriteQueue.sha256After === null &&
          t.priorEntries.size === 0 &&
          t.priorSettingsSha256 === null) &&
      (await writeHomeSidecar(u, {
        version: SIDECAR_VERSION,
        generation: t.generation,
        writtenAtMs: n.now(),
        entries: be
          ? ((await readHomeSeedFile(e.configHome))?.entries ?? [])
          : [...x].map(([S, ee]) => ({ path: S, sha256: ee })),
        settingsSha256:
          be && !(u.keepsForeignFiles && inSettingsWriteQueue.nothingStood)
            ? null
            : inSettingsWriteQueue.sha256After,
        ...(Me !== "partial" && { packEtag: t.packEtag }),
      }));
  if (we && x.size > MAX_SIDECAR_ENTRIES)
    logForDiagnosticsNoPII("warn", "home_seed_sidecar_trimmed", { dropped: x.size - MAX_SIDECAR_ENTRIES });
  return {
    outcome: Me,
    generation: t.generation,
    filesApplied: filtered.length,
    appliedByKind: {
      claude_md: count(filtered, ({ file: file }) => file.kind === "claude_md"),
      rule: count(filtered, ({ file: file }) => file.kind === "rule"),
      output_style: count(filtered, ({ file: file }) => file.kind === "output_style"),
    },
    filesReplacedForeign: count(filtered, ({ stoodForeign: stoodForeign }) => stoodForeign),
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
    settingsWritten: inSettingsWriteQueue.written,
    settingsKeptForeign: inSettingsWriteQueue.keptForeign,
    rulesLeftOut: inSettingsWriteQueue.keptForeign ? (t.restrictingSettings?.rulesLeftOut ?? 0) : 0,
    settingsRemoved: inSettingsWriteQueue.removed,
    settingsRemoveFailed: inSettingsWriteQueue.removeFailed,
    standingSettingsUnreadable: inSettingsWriteQueue.unreadable,
    settingsRefused: t.counts.refused.settings,
    replacedExistingSettings: inSettingsWriteQueue.replaced,
    refilteredKeys: t.counts.refilteredKeys,
    refilteredCredentials: t.counts.refilteredCredentials,
    refilteredCredentialRestrictions: t.counts.refilteredCredentialRestrictions,
    permissionsDropped: t.counts.permissionsDropped,
    touchedKinds: new Set([
      ...filtered_3.map(({ file: file }) => file.kind),
      ...filtered_2.map(({ removal: removal }) => removal.kind),
    ]),
    sidecarWritten: we,
  };
}
//@ chunk-twq47pff.js:42658-42704 placement
function Se(t, e) {
  return join_2(t, ...e.split("/"));
}
//@ chunk-twq47pff.js:42704-42940 placement
async function applySeedFile(t, e, n) {
  let l = await checkSeedFileDestination(t, n);
  if (l !== "clear") return { result: l, stoodForeign: !1 };
  let d = await hasForeignFileAt(t.path, e, n);
  if (d && n.keepsForeignFiles) return { result: "kept_foreign", stoodForeign: !1 };
  return { result: await writeSeedFile(t, n), stoodForeign: d };
}
/**
 * 检查单个种子文件能否写入：非输出样式需在加载器可达范围；解析后的拼写须是合法目的地；路径无阻碍且 home 已核实。返回 clear 或拒绝原因（均记诊断）。
 */
//@ chunk-twq47pff.js:42940-43542 placement
async function checkSeedFileDestination(t, e) {
  if (t.kind !== "output_style" && !formatRecentMessages(e.homeReal, t))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_destination_refused", { reason: "loader_reach" }),
      "loader_reach"
    );
  let destPath = Se(e.configHome, t.path),
    resolvedRel = await resolveDestinationSpelling(e.homeReal, destPath);
  if (resolvedRel === null || !RUt(resolvedRel))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_destination_refused", { reason: "resolved_spelling" }),
      "refused"
    );
  let obstruction = await findDestinationObstruction(t.path, e);
  if (obstruction !== "clear")
    return (
      logForDiagnosticsNoPII("warn", "home_seed_destination_obstructed", { reason: obstruction }),
      obstruction === "parent_not_directory" || obstruction === "dest_is_directory" ? obstruction : "refused"
    );
  if (!(await isHomeStillVetted(e)))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_destination_refused", { reason: "home_unvetted" }),
      "refused"
    );
  return "clear";
}
/**
 * 写入种子文件并核实落点，返回 applied/unverified；目标被拒或写入失败时记诊断。
 */
//@ chunk-twq47pff.js:43542-43928 placement
async function writeSeedFile(t, e) {
  let n = Se(e.configHome, t.path);
  try {
    if ((await e.deps.writeHomeFile(e.configHome, n, t.content), !(await verifyWrittenSeedFile(t.path, e))))
      return "unverified";
    return "applied";
  } catch (error) {
    let d = getErrnoCode(error) ?? "unknown";
    if (d.startsWith("WORKING_") || d.startsWith("HOME_DEST_"))
      return (logForDiagnosticsNoPII("warn", "home_seed_destination_refused", { reason: d }), "refused");
    return (logForDiagnosticsNoPII("warn", "home_seed_write_failed", { code: d }), "failed");
  }
}
//@ chunk-twq47pff.js:43928-44035 placement
async function isHomeStillVetted(t) {
  try {
    return (await realpath(t.configHome)) === t.homeReal && !(await isInsideGitWorktree(t.homeReal));
  } catch {
    return !1;
  }
}
//@ chunk-twq47pff.js:44035-44290 placement
async function verifyWrittenSeedFile(t, e) {
  let n = Se(e.configHome, t),
    d =
      (await resolveDestinationSpelling(e.homeReal, n)) !== t
        ? "resolved_spelling"
        : await checkLeafRegular(n);
  if (d !== null) return (logForDiagnosticsNoPII("warn", "home_seed_write_escaped", { reason: d }), !1);
  if (!(await isHomeStillVetted(e)))
    return (logForDiagnosticsNoPII("warn", "home_seed_write_unverified", {}), !1);
  return !0;
}
//@ chunk-twq47pff.js:44290-44437 placement
async function checkLeafRegular(t) {
  let e = await $e(t);
  return e === "absent"
    ? "leaf_absent"
    : e === "unverifiable"
      ? "leaf_unverifiable"
      : e.isFile()
        ? null
        : "leaf_not_regular";
}
/**
 * 逐级检查目标的祖先：不存在为 none；无法验证、是符号链接、不是目录或位于 git 工作区内则返回相应阻碍。
 */
//@ chunk-twq47pff.js:44437-44886 placement
async function findAncestorObstruction(t, e) {
  let parts = t.split("/");
  for (let l = 1; l < parts.length; l++) {
    let d = Se(e.configHome, parts.slice(0, l).join("/")),
      u = await $e(d);
    if (u === "absent") return "none";
    if (u === "unverifiable") return "ancestor_unverifiable";
    if (u.isSymbolicLink()) return "ancestor_is_symlink";
    if (!u.isDirectory()) return "parent_not_directory";
    let w = await $e(join_2(d, ".git"));
    if (w === "unverifiable") return "ancestor_unverifiable";
    if (w !== "absent") return "ancestor_in_worktree";
  }
  return "none";
}
/**
 * 检查目标位置是否被占用：先查上层障碍，再看目标叶子（不存在、无法核验、符号链接、目录或非普通文件）。
 */
//@ chunk-twq47pff.js:44886-45201 placement
async function findDestinationObstruction(t, e) {
  let n = await findAncestorObstruction(t, e);
  if (n !== "none") return n;
  let l = await $e(Se(e.configHome, t));
  if (l === "absent") return "clear";
  if (l === "unverifiable") return "leaf_unverifiable";
  if (l.isSymbolicLink()) return "leaf_is_symlink";
  if (l.isDirectory()) return "dest_is_directory";
  return l.isFile() ? "clear" : "leaf_not_regular";
}
//@ chunk-twq47pff.js:45201-45411 placement
async function hasForeignFileAt(t, e, n) {
  let l = await readBoundedFile(Se(n.configHome, t), uue);
  switch (l.kind) {
    case "absent":
    case "not_regular":
      return !1;
    case "too_large":
    case "unreadable":
      return !0;
    case "read":
      return e === void 0 || computeContentHash(l.content) !== e;
  }
}
/**
 * 删除之前由种子写入的文件：home 未核实、无法解析或位置不合法时失败；文件已不存在为 gone；内容摘要不符视为别人的文件不删。
 */
//@ chunk-twq47pff.js:45411-46159 placement
async function removeSeedFile(t, e) {
  let destPath = Se(e.configHome, t.path),
    resolvedRel = await resolveDestinationSpelling(e.homeReal, destPath),
    obstruction = !(await isHomeStillVetted(e))
      ? "home_unvetted"
      : resolvedRel === null
        ? "unresolvable"
        : !RUt(resolvedRel)
          ? "resolves_elsewhere"
          : await findAncestorObstruction(t.path, e);
  if (obstruction !== "none")
    return (logForDiagnosticsNoPII("warn", "home_seed_remove_obstructed", { reason: obstruction }), "failed");
  let read = await readBoundedFile(destPath, uue);
  switch (read.kind) {
    case "absent":
      return "gone";
    case "too_large":
      return "not_ours";
    case "not_regular":
      return (
        logForDiagnosticsNoPII("warn", "home_seed_remove_obstructed", { reason: "not_regular" }),
        "failed"
      );
    case "unreadable":
      return (logForDiagnosticsNoPII("warn", "home_seed_remove_failed", { code: read.code }), "failed");
    case "read":
      break;
  }
  if (computeContentHash(read.content) !== t.sha256) return "not_ours";
  try {
    return (await unlink(destPath), "removed");
  } catch (error) {
    let v = getErrnoCode(error) ?? "unknown";
    if (isNotFoundCode_2(v)) return "gone";
    return (logForDiagnosticsNoPII("warn", "home_seed_remove_failed", { code: v }), "failed");
  }
}
/**
 * 把种子设置写入云端 settings.json：校验路径与 home；按现有文件是否为本方写入或他人文件决定替换、保留或只合并限制性规则；设置为空且文件是本方写入时删除；写后核实并返回各状态与新摘要。
 */
//@ chunk-twq47pff.js:46159-48413 placement
async function applySeedSettings(t, e, n) {
  let baseResult = {
    written: !1,
    keptForeign: !1,
    nothingStood: !1,
    removed: !1,
    removeFailed: !1,
    unreadable: !1,
    replaced: "none",
    sha256After: t.priorSettingsSha256,
  };
  if (e === void 0 || (t.settings === null && t.priorSettingsSha256 === null)) return baseResult;
  if (basename(e) !== SETTINGS_JSON || !(await br(n.homeReal, e)))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_settings_path_refused", {}),
      t.settings === null ? { ...baseResult, removeFailed: !0 } : baseResult
    );
  let settingsPath = e;
  if (t.settings === null && !(await isHomeStillVetted(n)))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_settings_remove_failed", { code: "home_unvetted" }),
      { ...baseResult, removeFailed: !0 }
    );
  let existing = await readBoundedFile(settingsPath, MAX_PACK_BYTES);
  if (existing.kind === "not_regular" || existing.kind === "unreadable")
    return (
      logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", { reason: existing.kind }),
      { ...baseResult, unreadable: !0, removeFailed: t.settings === null }
    );
  let ownership =
      existing.kind === "absent"
        ? "none"
        : existing.kind === "read" && computeContentHash(existing.content) === t.priorSettingsSha256
          ? "ours"
          : "foreign",
    isRestore = t.restoreRecord === !0,
    refusedSettings = t.counts.refused.settings !== "none" && !isRestore,
    nothingStood =
      existing.kind === "absent" || (n.keepsForeignFiles && isEmptySettingsFile(existing, settingsPath)),
    foreignStands = n.keepsForeignFiles && ownership === "foreign" && !nothingStood,
    keepForeign = foreignStands && t.settings !== null && !isRestore,
    result = {
      ...baseResult,
      keptForeign: keepForeign,
      nothingStood: nothingStood,
      replaced: keepForeign ? "none" : ownership,
    },
    renderRestrictive = (q) => {
      try {
        return renderRestrictiveSettings(
          q,
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
    },
    toWrite = keepForeign
      ? renderRestrictive(t.restrictingSettings?.plan ?? null)
      : refusedSettings || isRestore
        ? renderRestrictive(t.settings)
        : t.settings;
  if (toWrite === "unreadable")
    return (
      logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", { reason: "not_read_whole" }),
      { ...result, replaced: "none", unreadable: !0 }
    );
  if (toWrite === null) {
    if (ownership !== "ours") return { ...result, sha256After: null };
    try {
      return (await unlink(settingsPath), { ...result, removed: !0, sha256After: null });
    } catch (error) {
      let X = getErrnoCode(error) ?? "unknown";
      if (isNotFoundCode_2(X)) return { ...result, sha256After: null };
      return (
        logForDiagnosticsNoPII("warn", "home_seed_settings_remove_failed", { code: X }),
        { ...result, removeFailed: !0 }
      );
    }
  }
  if (!(await isHomeStillVetted(n)))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_settings_not_replaceable", { reason: "home_unvetted" }),
      result
    );
  let shaAfter =
    (refusedSettings || keepForeign) && ownership === "foreign" && !nothingStood ? null : toWrite.sha256;
  n.deps.markInternalWrite(settingsPath);
  try {
    await n.deps.writeHomeFile(n.configHome, settingsPath, Buffer.from(toWrite.rendered));
    let q = await checkLeafRegular(settingsPath);
    if (q !== null || !(await isHomeStillVetted(n)))
      return (
        logForDiagnosticsNoPII("warn", "home_seed_write_unverified", { reason: q ?? "home_unvetted" }),
        { ...result, sha256After: shaAfter }
      );
    return { ...result, written: !0, sha256After: shaAfter };
  } catch (error) {
    return (
      n.deps.consumeInternalWrite(settingsPath),
      logForDiagnosticsNoPII("warn", "home_seed_settings_write_failed", {
        code: getErrnoCode(error) ?? "unknown",
      }),
      { ...result, sha256After: ownership === "ours" ? t.priorSettingsSha256 : null }
    );
  }
}
//@ chunk-twq47pff.js:48413-48495 placement
async function br(t, e) {
  try {
    return (await realpath(dirname(e))) === t && basename(e) !== "";
  } catch {
    return !1;
  }
}
/**
 * 写入 home seed 附带文件并核实；home 未核实、目标不是普通文件或写入失败时记诊断并返回 false。
 */
//@ chunk-twq47pff.js:48495-49023 placement
async function writeHomeSidecar(ctx, seed) {
  if (!(await isHomeStillVetted(ctx)))
    return (logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_failed", { code: "home_unvetted" }), !1);
  let sidecarPath = join_2(ctx.configHome, CCR_HOME_SEED_JSON),
    before = await checkLeafRegular(sidecarPath);
  if (before !== null && before !== "leaf_absent")
    return (logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_refused", { reason: before }), !1);
  try {
    await ctx.deps.writeHomeFile(ctx.configHome, sidecarPath, encodeHomeSidecar(seed));
  } catch (error) {
    return (
      logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_failed", {
        code: getErrnoCode(error) ?? "unknown",
      }),
      !1
    );
  }
  let after = await checkLeafRegular(sidecarPath);
  if (after !== null || !(await isHomeStillVetted(ctx)))
    return (
      logForDiagnosticsNoPII("warn", "home_seed_sidecar_write_unverified", {
        reason: after ?? "home_unvetted",
      }),
      !1
    );
  return !0;
}
//@ chunk-twq47pff.js:49023-49173 placement = readJSONLFile (1)
async function readJSONLFile(t, e) {
  let buf = Buffer.allocUnsafe(e),
    totalRead = 0;
  while (totalRead < e) {
    let { bytesRead: bytesRead } = await t.read(buf, totalRead, e - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-twq47pff.js:49173-49189 placement
var bn = () => ({});
//@ chunk-twq47pff.js:49189-52227 placement
function createHomeSeedTelemetry() {
  return {
    apply: ({
      outcome: outcome,
      probe: probe,
      report: report,
      generation: generation,
      epochGt1: epochGt1,
      durationMs: durationMs,
      appliedBeforeFirstAsk: appliedBeforeFirstAsk,
      outputStyleCheck: outputStyleCheck,
      restoreNoticeSuperseded: restoreNoticeSuperseded,
      answersNotRestored: answersNotRestored,
    }) => {
      let y =
        report !== null && report.outcome !== "config_home_unsafe" && report.outcome !== "flag_off"
          ? report
          : null;
      switch (
        (logEvent("tengu_home_seed_apply", {
          outcome: fromEnum(outcome),
          probe: fromEnum(probe),
          generation: generation,
          epoch_gt1: epochGt1,
          duration_ms: durationMs,
          applied_before_first_ask: appliedBeforeFirstAsk,
          output_style_check: fromEnum(outputStyleCheck),
          restore_notice_superseded: restoreNoticeSuperseded,
          answers_not_restored: answersNotRestored,
          ...bn(),
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
    hold: ({ outcome: outcome, waitedMs: waitedMs, verdictWaitMs: verdictWaitMs, firstAsk: firstAsk }) => {
      logEvent("tengu_home_seed_hold", {
        outcome: fromEnum(outcome),
        waited_ms: waitedMs,
        verdict_wait_ms: verdictWaitMs,
        first_ask: firstAsk,
      });
    },
    recovery: ({
      outcome: outcome,
      generation: generation,
      durationMs: durationMs,
      rulesDropped: rulesDropped,
      afterAnnouncedRun: afterAnnouncedRun,
      sidecarCountedAsAbsent: sidecarCountedAsAbsent,
    }) => {
      switch (
        (logEvent("tengu_home_seed_recovery", {
          outcome: fromEnum(outcome),
          generation: generation,
          duration_ms: durationMs,
          rules_dropped: rulesDropped,
          after_announced_run: afterAnnouncedRun,
          sidecar_counted_as_absent: sidecarCountedAsAbsent,
          ...bn(),
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
/**
 * 种子应用后按变化刷新：设置变化重载用户设置，CLAUDE.md/规则变化清记忆与用户上下文，首个询问后清系统提示分段，输出样式变化清样式缓存。
 */
//@ chunk-twq47pff.js:52227-52668 placement
function reloadAfterSeedApply(t, e, n) {
  if (t.outcome === "config_home_unsafe" || t.outcome === "flag_off") return;
  if (t.settingsWritten || t.settingsRemoved) n.reloadUserSettings();
  if (t.touchedKinds.has("claude_md") || t.touchedKinds.has("rule"))
    (n.clearMemoryFiles(), n.clearUserContext());
  if (
    (t.filesApplied > 0 || t.filesRemoved > 0 || t.settingsWritten || t.settingsRemoved) &&
    !e.beforeFirstAsk
  )
    n.clearSystemPromptSections();
  if (t.touchedKinds.has("output_style")) n.clearOutputStyles();
}
/**
 * 云端恢复本机设置时的提示文案：偏好名称、输出样式不可用、重新发送的提示与恢复失败原因。
 */
//@ chunk-twq47pff.js:52668-53774 placement
var SEED_PREFERENCE_LABELS = {
    outputStyle: "output style",
    includeCoAuthoredBy: "co-author preference",
    includeGitInstructions: "git-instructions preference",
    alwaysThinkingEnabled: "thinking preference",
    showThinkingSummaries: "thinking-summary preference",
  },
  OUTPUT_STYLE_UNAVAILABLE_NOTICE =
    "the output style your settings select is not available in this session, so it does not apply",
  RESEND_SETTINGS_HINT =
    "To send your settings again, re-open this session from the machine that started it.",
  RESTORE_FAILURE_REASONS = {
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
  pn,
  applyHomeSeedToCloudSession,
  createApplyDeps,
  reloadAfterSeedApply,
  createHomeSeedTelemetry,
};
