/**
 * utils/settings/settingsSeed.ts
 *
 * 设置种子（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (15)
 * attribution: placement 15
 */
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { MAX_SETTINGS_JSON_BYTES } from "./settings.js";
import { computeContentHash } from "../commitAttribution.js";
import {
  parseSettingsContent,
  missingSettingsFileResult,
  logMissingSettingsFile,
  isInClaudeConfigHome,
} from "./settingsFileParsing.js";
import { decodeTextBuffer } from "../fileRead.js";
import { PathSpace } from "../resultError.js";
import { errorMessage } from "../errors.js";
import { kDt, UNSUPPORTED } from "../storage/storageErrors.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import {
  vetRepoSettingsPathAsync,
  getFsImplementation,
  SYMLINK_TO_NETWORK_PATH_CODE,
} from "../fsOperations.js";
import { isManagedSettingsDropInName } from "./managedFileSettings.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-q8cqcff6.js:90356-90809 placement
async function readSettingsSeed(e, n, r) {
  let read = await e.read([
    { key: STORAGE_SPACES.userSettings(), offset: 0, length: MAX_SETTINGS_JSON_BYTES + 1 },
  ]);
  if (!read.ok)
    return {
      kind: "failing",
      code: read.error.code,
      failureClass: "failureClass" in read.error ? read.error.failureClass : void 0,
    };
  let S = read.value.items[0];
  if (!S.found) return statHomeSpace(e.hostFiles, n);
  if (S.totalBytes > MAX_SETTINGS_JSON_BYTES) return { kind: "oversize" };
  let E = computeContentHash(S.value),
    h = r !== void 0 && r.contentHash === E ? r.parsed : parseSettingsContent(decodeTextBuffer(S.value), n);
  return { kind: "seeded", contentHash: E, size: S.totalBytes, parsed: h };
}
//@ chunk-q8cqcff6.js:90809-91049 placement
async function statHomeSpace(e, n) {
  let r;
  try {
    r = await e.stat(PathSpace.home(n));
  } catch (error) {
    return { kind: "failing", code: errorMessage(error) };
  }
  if (r.ok) return r.value.kind === "absent" ? { kind: "absent" } : { kind: "failing", code: r.value.kind };
  return kDt(r.error) ? { kind: "absent" } : it(r.error);
}
//@ chunk-q8cqcff6.js:91049-91715 placement
async function seedUserSettings(e, n) {
  if (!isStorageV5Enabled()) return;
  let epoch = e.epoch;
  try {
    let read = await n.read(),
      S =
        read.kind === "seeded"
          ? read.parsed
          : read.kind === "absent" && n.whenAbsent === "seedAbsence"
            ? missingSettingsFileResult()
            : void 0;
    if (S === void 0) {
      logForDebugging(`settings: ${n.label} not re-seeded (${seedOutcomeLabel(read)}); the file read serves`);
      return;
    }
    if (n.source !== "userSettings" && e.walkReadDiffers(n.path, S)) {
      logForDebugging(
        `settings: ${n.label} not re-seeded (the file read already saw different content this generation); the file read serves`,
      );
      return;
    }
    if (read.kind === "absent") logMissingSettingsFile(n.path);
    return e.seedParsedFile(n.path, n.source, S, epoch) ? e.retainLayer(n.path, S) : void 0;
  } catch (error) {
    logForDebugging(`settings: ${n.label} not re-seeded: ${errorMessage(error)}; the file read serves`, {
      level: "warn",
    });
    return;
  }
}
/**
 * 构造用户设置的预读描述（来源、路径、读取函数、缺省处理）。
 */
//@ chunk-q8cqcff6.js:91715-91835 placement
function userSettingsSeedRead(e, n) {
  return {
    source: "userSettings",
    path: n,
    read: () => readSettingsSeed(e, n),
    label: "user settings",
    whenAbsent: "seedAbsence",
  };
}
//@ chunk-q8cqcff6.js:91835-92019 placement
async function readUserNamedSeed(e, n) {
  if (!e.serves("userNamed")) return { kind: "failing", code: UNSUPPORTED };
  if (!isInClaudeConfigHome(n))
    try {
      await vetRepoSettingsPathAsync(getFsImplementation(), n);
    } catch {
      return { kind: "failing", code: SYMLINK_TO_NETWORK_PATH_CODE };
    }
  return readSeedFile(e, PathSpace.userNamed(n), n, !1);
}
//@ chunk-q8cqcff6.js:92019-92281 placement
async function readSystemSeed(e, n, r) {
  let s = await readSeedBytes(e, PathSpace.system(n));
  if (s.kind !== "bytes") return s;
  return {
    kind: "seeded",
    contentHash: s.contentHash,
    size: s.size,
    parsed:
      r !== void 0 && r.contentHash === s.contentHash
        ? r.parsed
        : {
            ...parseSettingsContent(decodeTextBuffer(s.bytes), n, !0),
            ...(s.owner && { fileOwner: s.owner }),
          },
  };
}
//@ chunk-q8cqcff6.js:92281-92445 placement
async function readSeedFile(e, n, r, s) {
  let S = await readSeedBytes(e, n);
  if (S.kind !== "bytes") return S;
  return {
    kind: "seeded",
    contentHash: S.contentHash,
    size: S.size,
    parsed: parseSettingsContent(decodeTextBuffer(S.bytes), r, s),
  };
}
/**
 * 经存储后端读取设置文件字节：检查存在、类型与大小上限，返回内容、哈希、大小与属主信息，或 absent/oversize/failing。
 */
//@ chunk-q8cqcff6.js:92445-92991 placement
async function readSeedBytes(backend, space) {
  let stats = await backend.stat(space);
  if (!stats.ok) return it(stats.error);
  if (stats.value.kind === "absent") return { kind: "absent" };
  if (stats.value.kind !== "file") return { kind: "failing", code: stats.value.kind };
  if (stats.value.size > MAX_SETTINGS_JSON_BYTES) return { kind: "oversize" };
  let bytes = await backend.readBytes(space);
  if (!bytes.ok) return it(bytes.error);
  if (!bytes.value.found) return { kind: "absent" };
  if (bytes.value.bytes > MAX_SETTINGS_JSON_BYTES) return { kind: "oversize" };
  return {
    kind: "bytes",
    bytes: bytes.value.value,
    contentHash: computeContentHash(bytes.value.value),
    size: bytes.value.bytes,
    owner:
      stats.value.uid === void 0
        ? void 0
        : { uid: stats.value.uid, gid: stats.value.gid, mode: stats.value.mode },
  };
}
/**
 * 经存储后端列出托管设置 drop-in 目录中的设置文件名（排序），目录不存在或不是目录时为空列表。
 */
//@ chunk-q8cqcff6.js:92991-93354 placement
async function listManagedDropIns(e, n) {
  let listFolder = await e.listFolder(PathSpace.system(n));
  if (!listFolder.ok) {
    if (listFolder.error.code === "Failed" && listFolder.error.telemetryCode === "ENOTDIR")
      return { kind: "listed", names: [] };
    return it(listFolder.error);
  }
  if (!listFolder.value.found) return { kind: "listed", names: [] };
  return {
    kind: "listed",
    names: listFolder.value.entries
      .filter(
        (entry) =>
          (entry.kind === "file" || entry.kind === "link") && isManagedSettingsDropInName(entry.name),
      )
      .map((s) => s.name)
      .sort(),
  };
}
/**
 * 把设置预读结果转为日志用的标签。
 */
//@ chunk-q8cqcff6.js:93354-93499 placement
function seedOutcomeLabel(e) {
  if (e.kind !== "failing") return e.kind;
  return e.code === UNSUPPORTED ? "the backend does not serve this space" : `backend read failed: ${e.code}`;
}
//@ chunk-q8cqcff6.js:93499-93594 placement
function it(e) {
  return { kind: "failing", code: e.telemetryCode ?? e.code, failureClass: e.failureClass };
}
/**
 * 构造项目设置的预读描述。
 */
//@ chunk-q8cqcff6.js:93594-93700 placement
function projectSettingsSeedRead(e, n, r, s) {
  return {
    source: n,
    path: r,
    read: () => readUserNamedSeed(e.hostFiles, r),
    label: s,
    whenAbsent: "seedAbsence",
  };
}
/**
 * 构造托管设置文件的预读描述（可复用已读内容）。
 */
//@ chunk-q8cqcff6.js:93700-93846 placement
function managedSettingsSeedRead(e, n, r, s) {
  return {
    source: "policySettings",
    path: n,
    read: () => readSystemSeed(e.hostFiles, n, s.managedFileReads.get(n)),
    label: r,
    whenAbsent: "fileServes",
  };
}
//@ chunk-q8cqcff6.js:93846-93895 placement
async function nio(e, n, r) {
  return seedUserSettings(n, userSettingsSeedRead(e, r));
}
//@ chunk-q8cqcff6.js:93895-94076 placement
class LegacyLocalSettingsProbe {
  firedSites = new Set();
  fire(e) {
    if (this.firedSites.has(e)) return;
    (this.firedSites.add(e), logEvent("tengu_dead_probe_legacy_local_settings", { site: fromEnum(e) }));
  }
  reset() {
    this.firedSites.clear();
  }
}

export {
  LegacyLocalSettingsProbe,
  nio,
  readSettingsSeed,
  seedOutcomeLabel,
  seedUserSettings,
  userSettingsSeedRead,
  projectSettingsSeedRead,
  managedSettingsSeedRead,
  listManagedDropIns,
};
