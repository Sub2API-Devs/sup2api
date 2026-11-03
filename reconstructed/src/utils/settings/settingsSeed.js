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
import { isUnsupportedStorageError, UNSUPPORTED } from "../storage/storageErrors.js";
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
  let s = await e.read([
    {
      key: STORAGE_SPACES.userSettings(),
      offset: 0,
      length: MAX_SETTINGS_JSON_BYTES + 1,
    },
  ]);
  if (!s.ok)
    return {
      kind: "failing",
      code: s.error.code,
      failureClass: "failureClass" in s.error ? s.error.failureClass : undefined,
    };
  let S = s.value.items[0];
  if (!S.found) return statHomeSpace(e.hostFiles, n);
  if (S.totalBytes > MAX_SETTINGS_JSON_BYTES)
    return {
      kind: "oversize",
    };
  let contentHash = computeContentHash(S.value);
  let parsed =
    r !== undefined && r.contentHash === contentHash
      ? r.parsed
      : parseSettingsContent(decodeTextBuffer(S.value), n);
  return {
    kind: "seeded",
    contentHash,
    size: S.totalBytes,
    parsed,
  };
}
//@ chunk-q8cqcff6.js:90809-91049 placement
async function statHomeSpace(hostFiles, n) {
  let r;
  try {
    r = await hostFiles.stat(PathSpace.home(n));
  } catch (error) {
    return {
      kind: "failing",
      code: errorMessage(error),
    };
  }
  if (r.ok)
    return r.value.kind === "absent"
      ? {
          kind: "absent",
        }
      : {
          kind: "failing",
          code: r.value.kind,
        };
  return isUnsupportedStorageError(r.error)
    ? {
        kind: "absent",
      }
    : failingReadDescriptor(r.error);
}
//@ chunk-q8cqcff6.js:91049-91715 placement
async function seedUserSettings(e, n) {
  if (!isStorageV5Enabled()) return;
  let epoch = e.epoch;
  try {
    let s = await n.read();
    let S =
      s.kind === "seeded"
        ? s.parsed
        : s.kind === "absent" && n.whenAbsent === "seedAbsence"
          ? missingSettingsFileResult()
          : undefined;
    if (S === undefined) {
      logForDebugging(`settings: ${n.label} not re-seeded (${seedOutcomeLabel(s)}); the file read serves`);
      return;
    }
    if (n.source !== "userSettings" && e.walkReadDiffers(n.path, S)) {
      logForDebugging(
        `settings: ${n.label} not re-seeded (the file read already saw different content this generation); the file read serves`,
      );
      return;
    }
    if (s.kind === "absent") logMissingSettingsFile(n.path);
    return e.seedParsedFile(n.path, n.source, S, epoch) ? e.retainLayer(n.path, S) : undefined;
  } catch (error) {
    logForDebugging(`settings: ${n.label} not re-seeded: ${errorMessage(error)}; the file read serves`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-q8cqcff6.js:91715-91835 placement
/**
 * 构造用户设置的预读描述（来源、路径、读取函数、缺省处理）。
 */
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
async function readUserNamedSeed(hostFiles, n) {
  if (!hostFiles.serves("userNamed"))
    return {
      kind: "failing",
      code: UNSUPPORTED,
    };
  if (!isInClaudeConfigHome(n))
    try {
      await vetRepoSettingsPathAsync(getFsImplementation(), n);
    } catch {
      return {
        kind: "failing",
        code: SYMLINK_TO_NETWORK_PATH_CODE,
      };
    }
  return readSeedFile(hostFiles, PathSpace.userNamed(n), n, false);
}
//@ chunk-q8cqcff6.js:92019-92281 placement
async function readSystemSeed(backend, n, r) {
  let seedBytes = await readSeedBytes(backend, PathSpace.system(n));
  if (seedBytes.kind !== "bytes") return seedBytes;
  return {
    kind: "seeded",
    contentHash: seedBytes.contentHash,
    size: seedBytes.size,
    parsed:
      r !== undefined && r.contentHash === seedBytes.contentHash
        ? r.parsed
        : {
            ...parseSettingsContent(decodeTextBuffer(seedBytes.bytes), n, true),
            ...(seedBytes.owner && {
              fileOwner: seedBytes.owner,
            }),
          },
  };
}
//@ chunk-q8cqcff6.js:92281-92445 placement
async function readSeedFile(backend, space, r, s) {
  let seedBytes = await readSeedBytes(backend, space);
  if (seedBytes.kind !== "bytes") return seedBytes;
  return {
    kind: "seeded",
    contentHash: seedBytes.contentHash,
    size: seedBytes.size,
    parsed: parseSettingsContent(decodeTextBuffer(seedBytes.bytes), r, s),
  };
}
//@ chunk-q8cqcff6.js:92445-92991 placement
/**
 * 经存储后端读取设置文件字节：检查存在、类型与大小上限，返回内容、哈希、大小与属主信息，或 absent/oversize/failing。
 */
async function readSeedBytes(backend, space) {
  let stats = await backend.stat(space);
  if (!stats.ok) return failingReadDescriptor(stats.error);
  if (stats.value.kind === "absent")
    return {
      kind: "absent",
    };
  if (stats.value.kind !== "file")
    return {
      kind: "failing",
      code: stats.value.kind,
    };
  if (stats.value.size > MAX_SETTINGS_JSON_BYTES)
    return {
      kind: "oversize",
    };
  let bytes = await backend.readBytes(space);
  if (!bytes.ok) return failingReadDescriptor(bytes.error);
  if (!bytes.value.found)
    return {
      kind: "absent",
    };
  if (bytes.value.bytes > MAX_SETTINGS_JSON_BYTES)
    return {
      kind: "oversize",
    };
  return {
    kind: "bytes",
    bytes: bytes.value.value,
    contentHash: computeContentHash(bytes.value.value),
    size: bytes.value.bytes,
    owner:
      stats.value.uid === undefined
        ? undefined
        : {
            uid: stats.value.uid,
            gid: stats.value.gid,
            mode: stats.value.mode,
          },
  };
}
//@ chunk-q8cqcff6.js:92991-93354 placement
/**
 * 经存储后端列出托管设置 drop-in 目录中的设置文件名（排序），目录不存在或不是目录时为空列表。
 */
async function listManagedDropIns(hostFiles, n) {
  let r = await hostFiles.listFolder(PathSpace.system(n));
  if (!r.ok) {
    if (r.error.code === "Failed" && r.error.telemetryCode === "ENOTDIR")
      return {
        kind: "listed",
        names: [],
      };
    return failingReadDescriptor(r.error);
  }
  if (!r.value.found)
    return {
      kind: "listed",
      names: [],
    };
  return {
    kind: "listed",
    names: r.value.entries
      .filter(
        (entry) =>
          (entry.kind === "file" || entry.kind === "link") && isManagedSettingsDropInName(entry.name),
      )
      .map((entry) => entry.name)
      .sort(),
  };
}
//@ chunk-q8cqcff6.js:93354-93499 placement
/**
 * 把设置预读结果转为日志用的标签。
 */
function seedOutcomeLabel(e) {
  if (e.kind !== "failing") return e.kind;
  return e.code === UNSUPPORTED ? "the backend does not serve this space" : `backend read failed: ${e.code}`;
}
//@ chunk-q8cqcff6.js:93499-93594 placement
function failingReadDescriptor(error) {
  return {
    kind: "failing",
    code: error.telemetryCode ?? error.code,
    failureClass: error.failureClass,
  };
}
//@ chunk-q8cqcff6.js:93594-93700 placement
/**
 * 构造项目设置的预读描述。
 */
function projectSettingsSeedRead(e, source, r, label) {
  return {
    source,
    path: r,
    read: () => readUserNamedSeed(e.hostFiles, r),
    label,
    whenAbsent: "seedAbsence",
  };
}
//@ chunk-q8cqcff6.js:93700-93846 placement
/**
 * 构造托管设置文件的预读描述（可复用已读内容）。
 */
function managedSettingsSeedRead(e, n, label, s) {
  return {
    source: "policySettings",
    path: n,
    read: () => readSystemSeed(e.hostFiles, n, s.managedFileReads.get(n)),
    label,
    whenAbsent: "fileServes",
  };
}
//@ chunk-q8cqcff6.js:93846-93895 placement
/**
 * seedProjectSettings：预热项目设置读取。
 */
async function seedProjectSettings(e, n, r) {
  return seedUserSettings(n, userSettingsSeedRead(e, r));
}
//@ chunk-q8cqcff6.js:93895-94076 placement
class LegacyLocalSettingsProbe {
  firedSites = new Set();
  fire(e) {
    if (this.firedSites.has(e)) return;
    this.firedSites.add(e);
    logEvent("tengu_dead_probe_legacy_local_settings", {
      site: fromEnum(e),
    });
  }
  reset() {
    this.firedSites.clear();
  }
}
export {
  LegacyLocalSettingsProbe,
  seedProjectSettings,
  readSettingsSeed,
  seedOutcomeLabel,
  seedUserSettings,
  userSettingsSeedRead,
  projectSettingsSeedRead,
  managedSettingsSeedRead,
  listManagedDropIns,
};
