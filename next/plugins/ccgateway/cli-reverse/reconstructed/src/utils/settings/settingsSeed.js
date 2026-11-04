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
async function readSettingsSeed(backend, settingsPath, previous) {
  let readResult = await backend.read([
    {
      key: STORAGE_SPACES.userSettings(),
      offset: 0,
      length: MAX_SETTINGS_JSON_BYTES + 1,
    },
  ]);
  if (!readResult.ok)
    return {
      kind: "failing",
      code: readResult.error.code,
      failureClass: "failureClass" in readResult.error ? readResult.error.failureClass : undefined,
    };
  let item = readResult.value.items[0];
  if (!item.found) return statHomeSpace(backend.hostFiles, settingsPath);
  if (item.totalBytes > MAX_SETTINGS_JSON_BYTES)
    return {
      kind: "oversize",
    };
  let contentHash = computeContentHash(item.value);
  let parsed =
    previous !== undefined && previous.contentHash === contentHash
      ? previous.parsed
      : parseSettingsContent(decodeTextBuffer(item.value), settingsPath);
  return {
    kind: "seeded",
    contentHash,
    size: item.totalBytes,
    parsed,
  };
}
//@ chunk-q8cqcff6.js:90809-91049 placement
async function statHomeSpace(hostFiles, settingsPath) {
  let statResult;
  try {
    statResult = await hostFiles.stat(PathSpace.home(settingsPath));
  } catch (error) {
    return {
      kind: "failing",
      code: errorMessage(error),
    };
  }
  if (statResult.ok)
    return statResult.value.kind === "absent"
      ? {
          kind: "absent",
        }
      : {
          kind: "failing",
          code: statResult.value.kind,
        };
  return isUnsupportedStorageError(statResult.error)
    ? {
        kind: "absent",
      }
    : failingReadDescriptor(statResult.error);
}
//@ chunk-q8cqcff6.js:91049-91715 placement
async function seedUserSettings(store, read) {
  if (!isStorageV5Enabled()) return;
  let epoch = store.epoch;
  try {
    let result = await read.read();
    let parsed =
      result.kind === "seeded"
        ? result.parsed
        : result.kind === "absent" && read.whenAbsent === "seedAbsence"
          ? missingSettingsFileResult()
          : undefined;
    if (parsed === undefined) {
      logForDebugging(
        `settings: ${read.label} not re-seeded (${seedOutcomeLabel(result)}); the file read serves`,
      );
      return;
    }
    if (read.source !== "userSettings" && store.walkReadDiffers(read.path, parsed)) {
      logForDebugging(
        `settings: ${read.label} not re-seeded (the file read already saw different content this generation); the file read serves`,
      );
      return;
    }
    if (result.kind === "absent") logMissingSettingsFile(read.path);
    return store.seedParsedFile(read.path, read.source, parsed, epoch)
      ? store.retainLayer(read.path, parsed)
      : undefined;
  } catch (error) {
    logForDebugging(`settings: ${read.label} not re-seeded: ${errorMessage(error)}; the file read serves`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-q8cqcff6.js:91715-91835 placement
/**
 * 构造用户设置的预读描述（来源、路径、读取函数、缺省处理）。
 */
function userSettingsSeedRead(backend, settingsPath) {
  return {
    source: "userSettings",
    path: settingsPath,
    read: () => readSettingsSeed(backend, settingsPath),
    label: "user settings",
    whenAbsent: "seedAbsence",
  };
}
//@ chunk-q8cqcff6.js:91835-92019 placement
async function readUserNamedSeed(hostFiles, settingsPath) {
  if (!hostFiles.serves("userNamed"))
    return {
      kind: "failing",
      code: UNSUPPORTED,
    };
  if (!isInClaudeConfigHome(settingsPath))
    try {
      await vetRepoSettingsPathAsync(getFsImplementation(), settingsPath);
    } catch {
      return {
        kind: "failing",
        code: SYMLINK_TO_NETWORK_PATH_CODE,
      };
    }
  return readSeedFile(hostFiles, PathSpace.userNamed(settingsPath), settingsPath, false);
}
//@ chunk-q8cqcff6.js:92019-92281 placement
async function readSystemSeed(backend, settingsPath, previous) {
  let seedBytes = await readSeedBytes(backend, PathSpace.system(settingsPath));
  if (seedBytes.kind !== "bytes") return seedBytes;
  return {
    kind: "seeded",
    contentHash: seedBytes.contentHash,
    size: seedBytes.size,
    parsed:
      previous !== undefined && previous.contentHash === seedBytes.contentHash
        ? previous.parsed
        : {
            ...parseSettingsContent(decodeTextBuffer(seedBytes.bytes), settingsPath, true),
            ...(seedBytes.owner && {
              fileOwner: seedBytes.owner,
            }),
          },
  };
}
//@ chunk-q8cqcff6.js:92281-92445 placement
async function readSeedFile(backend, space, settingsPath, isSystemSpace) {
  let seedBytes = await readSeedBytes(backend, space);
  if (seedBytes.kind !== "bytes") return seedBytes;
  return {
    kind: "seeded",
    contentHash: seedBytes.contentHash,
    size: seedBytes.size,
    parsed: parseSettingsContent(decodeTextBuffer(seedBytes.bytes), settingsPath, isSystemSpace),
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
async function listManagedDropIns(hostFiles, dropInDir) {
  let listResult = await hostFiles.listFolder(PathSpace.system(dropInDir));
  if (!listResult.ok) {
    if (listResult.error.code === "Failed" && listResult.error.telemetryCode === "ENOTDIR")
      return {
        kind: "listed",
        names: [],
      };
    return failingReadDescriptor(listResult.error);
  }
  if (!listResult.value.found)
    return {
      kind: "listed",
      names: [],
    };
  return {
    kind: "listed",
    names: listResult.value.entries
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
function seedOutcomeLabel(outcome) {
  if (outcome.kind !== "failing") return outcome.kind;
  return outcome.code === UNSUPPORTED
    ? "the backend does not serve this space"
    : `backend read failed: ${outcome.code}`;
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
function projectSettingsSeedRead(context, source, settingsPath, label) {
  return {
    source,
    path: settingsPath,
    read: () => readUserNamedSeed(context.hostFiles, settingsPath),
    label,
    whenAbsent: "seedAbsence",
  };
}
//@ chunk-q8cqcff6.js:93700-93846 placement
/**
 * 构造托管设置文件的预读描述（可复用已读内容）。
 */
function managedSettingsSeedRead(context, settingsPath, label, store) {
  return {
    source: "policySettings",
    path: settingsPath,
    read: () => readSystemSeed(context.hostFiles, settingsPath, store.managedFileReads.get(settingsPath)),
    label,
    whenAbsent: "fileServes",
  };
}
//@ chunk-q8cqcff6.js:93846-93895 placement
/**
 * seedProjectSettings：预热项目设置读取。
 */
async function seedProjectSettings(context, store, settingsPath) {
  return seedUserSettings(store, userSettingsSeedRead(context, settingsPath));
}
//@ chunk-q8cqcff6.js:93895-94076 placement
class LegacyLocalSettingsProbe {
  firedSites = new Set();
  fire(site) {
    if (this.firedSites.has(site)) return;
    this.firedSites.add(site);
    logEvent("tengu_dead_probe_legacy_local_settings", {
      site: fromEnum(site),
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
