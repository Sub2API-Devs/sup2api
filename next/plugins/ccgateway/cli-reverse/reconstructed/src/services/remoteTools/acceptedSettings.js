/**
 * services/remoteTools/acceptedSettings.ts
 *
 * 2.1.316 新增：远程工具宿主接受的设置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pd9bp1k5.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, resolve, basename } from "path";
import { lstatSync, utimesSync, mkdirSync, writeFileSync, unlinkSync, constants } from "fs";
import { readdir, lstat, rm, mkdir, writeFile, open } from "fs/promises";
import { randomBytes } from "crypto";
import { MAX_SETTINGS_JSON_BYTES } from "../../utils/settings/settings.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { servedCallsDir } from "../../remote/tools/servedCallLog.js";
import { readFileSync } from "../../utils/fileRead.js";
import { isENOENT, getErrnoCode, toError } from "../../utils/errors.js";
import { syncTarget } from "../../utils/atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pd9bp1k5.js:1071-1149 placement
/**
 * 已接受设置记录（settings-/folder- 两种 .jsonl）的常量：格式版本、文件大小上限、过期清理时间与各种文件名片段。
 */
var ACCEPTED_SETTINGS_VERSION; // deferred: uses MAX_SETTINGS_JSON_BYTES (../../utils/settings/settings.js) of its import cycle while loading; runs once the cycle is complete
var MAX_ACCEPTED_SETTINGS_BYTES;
var STALE_SETTINGS_PRUNE_MS;
var ACCEPTED;
var SETTINGS_FILE_EXT;
var SEEN_MARKER_EXT;
var ACCEPTING_TEMP_INFIX;
deferInit("chunk-pd9bp1k5.js:1071", () => {
  ACCEPTED_SETTINGS_VERSION = 1;
  MAX_ACCEPTED_SETTINGS_BYTES = 8 * MAX_SETTINGS_JSON_BYTES;
  STALE_SETTINGS_PRUNE_MS = 900000;
  ACCEPTED = "accepted-";
  SETTINGS_FILE_EXT = ".jsonl";
  SEEN_MARKER_EXT = ".seen";
  ACCEPTING_TEMP_INFIX = ".accepting-";
});
//@ chunk-pd9bp1k5.js:1149-1192 placement
/**
 * 计算设置内容哈希；内容为 null 时返回 null。
 */
function hashOrNull(settings) {
  return settings === null ? null : computeContentHash(settings);
}
//@ chunk-pd9bp1k5.js:1192-1479 placement
var ACCEPTED_FILE_RECORD_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ACCEPTED_FOLDER_RECORD_SCHEMA;
deferInit("chunk-pd9bp1k5.js:1192", () => {
  ACCEPTED_FILE_RECORD_SCHEMA = DoctorLazy(() =>
    objectSchema({
      v: literal(ACCEPTED_SETTINGS_VERSION),
      kind: literal("file"),
      path: stringSchema(),
      text: stringSchema().nullable(),
      sha256: stringSchema()
        .regex(/^[0-9a-f]{64}$/)
        .nullable(),
      at: stringSchema(),
      by: _enum(["first_attach", "own_write", "person"]),
    }),
  );
  ACCEPTED_FOLDER_RECORD_SCHEMA = DoctorLazy(() =>
    objectSchema({
      v: literal(ACCEPTED_SETTINGS_VERSION),
      kind: literal("folder"),
      key: stringSchema(),
      project: stringSchema().nullable(),
      local: stringSchema().nullable(),
      legacy: stringSchema().nullable(),
      at: stringSchema(),
    }),
  );
});
//@ chunk-pd9bp1k5.js:1479-1536 placement
/**
 * 比较两个路径是否相同（Windows 下忽略盘符大小写）。
 */
function samePathCaseAware(left, right) {
  return getPlatform() === "windows"
    ? normalizeDriveLetter(left) === normalizeDriveLetter(right)
    : left === right;
}
//@ chunk-pd9bp1k5.js:1536-1603 placement
/**
 * 把路径的盘符字母转成大写，供 Windows 路径比较。
 */
function normalizeDriveLetter(path) {
  return path.replace(/^[a-z](?=:)/, (letter) => letter.toUpperCase());
}
//@ chunk-pd9bp1k5.js:1603-1647 placement (2.1.88 match: setCwdState, 1)
function nfcKey(cwd) {
  return normalizeCaseForComparison(cwd.normalize("NFC"));
}
//@ chunk-pd9bp1k5.js:1647-1726 placement
/**
 * 按规范化路径算出的哈希拼出「已接受设置」记录文件路径。
 */
function settingsRecordPath(serverPath, dir = servedCallsDir()) {
  return join(
    dir,
    `${ACCEPTED}settings-${computeContentHash(nfcKey(resolve(serverPath))).slice(0, 32)}${SETTINGS_FILE_EXT}`,
  );
}
//@ chunk-pd9bp1k5.js:1726-1800 placement
/**
 * 按文件夹名哈希拼出「已接受文件夹设置」记录路径。
 */
function folderRecordPath(folderKey, dir = servedCallsDir()) {
  return join(
    dir,
    `${ACCEPTED}folder-${computeContentHash(nfcKey(folderKey)).slice(0, 32)}${SETTINGS_FILE_EXT}`,
  );
}
//@ chunk-pd9bp1k5.js:1800-1851 placement
/**
 * 把 .jsonl 记录路径换成 .seen 存在标记路径。
 */
function seenMarkerPath(recordPath) {
  return `${recordPath.slice(0, -SETTINGS_FILE_EXT.length)}${SEEN_MARKER_EXT}`;
}
//@ chunk-pd9bp1k5.js:1851-1986 placement
function readAcceptedRecord(recordPath) {
  try {
    return readFileSync(recordPath, MAX_ACCEPTED_SETTINGS_BYTES);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  try {
    lstatSync(seenMarkerPath(recordPath));
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  throw Error("record aged out");
}
//@ chunk-pd9bp1k5.js:1986-2036 placement
/**
 * 把文件的访问与修改时间更新为当前时间，用于保留标记（失败忽略）。
 */
function touchFile(path) {
  try {
    let date = new Date();
    utimesSync(path, date, date);
  } catch {}
}
//@ chunk-pd9bp1k5.js:2036-3582 placement
/**
 * 远程工具宿主"已接受设置"的记录存储：按路径记录文件文本与哈希、按文件夹记录项目/本地/旧版设置；读取时校验格式与哈希，不可读返回 "unreadable"；写入采用原子发布并维护存在标记。
 */
function createAcceptedSettingsStore(dir = servedCallsDir()) {
  let writeRecord = (recordPath, record) => {
    mkdirSync(dir, {
      recursive: true,
      mode: 448,
    });
    let markerPath = seenMarkerPath(recordPath);
    let createdMarker = false;
    try {
      writeFileSync(markerPath, "", {
        mode: 384,
        flag: "wx",
      });
      createdMarker = true;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    try {
      syncTarget(
        recordPath,
        `${jsonStringify(record)}
`,
        384,
      );
    } catch (error) {
      let hasRecord;
      try {
        hasRecord = lstatSync(recordPath).isFile();
      } catch (error) {
        hasRecord = !isENOENT(error);
      }
      if (createdMarker && !hasRecord) {
        try {
          unlinkSync(markerPath);
        } catch {}
        try {
          if (lstatSync(recordPath).isFile())
            writeFileSync(markerPath, "", {
              mode: 384,
              flag: "wx",
            });
        } catch {}
      }
      throw error;
    }
    try {
      writeFileSync(markerPath, "", {
        mode: 384,
        flag: "wx",
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  };
  let reportedTails = new Set();
  let firstLineOfRecord = (kind, key, acceptedRecord) => {
    let firstLine = getFirstLine(acceptedRecord);
    if (acceptedRecord.length > firstLine.length + 1 && !reportedTails.has(key)) {
      reportedTails.add(key);
      try {
        logEvent("tengu_remote_tool_serving", {
          event: lit("accepted_record_has_tail"),
          record_kind: fromEnum(kind),
        });
      } catch (error) {
        logError(toError(error));
      }
    }
    return firstLine;
  };
  return {
    file: (serverPath) => {
      try {
        let acceptedRecord = readAcceptedRecord(settingsRecordPath(serverPath, dir));
        if (acceptedRecord === undefined) return "none";
        let parsed = ACCEPTED_FILE_RECORD_SCHEMA().safeParse(
          jsonParse(firstLineOfRecord("file", serverPath, acceptedRecord)),
        );
        if (
          !parsed.success ||
          !samePathCaseAware(resolve(parsed.data.path), resolve(serverPath)) ||
          hashOrNull(parsed.data.text) !== parsed.data.sha256
        )
          return "unreadable";
        return {
          text: parsed.data.text,
          sha256: parsed.data.sha256,
        };
      } catch {
        return "unreadable";
      }
    },
    recordFile: (serverPath, text, by) => {
      if (text !== null && Buffer.byteLength(text) > MAX_SETTINGS_JSON_BYTES)
        throw Error("accepted settings text exceeds the settings size limit");
      writeRecord(settingsRecordPath(serverPath, dir), {
        v: ACCEPTED_SETTINGS_VERSION,
        kind: "file",
        path: serverPath,
        text,
        sha256: hashOrNull(text),
        at: new Date().toISOString(),
        by,
      });
      reportedTails.delete(serverPath);
    },
    folder: (folderKey) => {
      try {
        let acceptedRecord = readAcceptedRecord(folderRecordPath(folderKey, dir));
        if (acceptedRecord === undefined) return "none";
        let parsed = ACCEPTED_FOLDER_RECORD_SCHEMA().safeParse(
          jsonParse(firstLineOfRecord("folder", folderKey, acceptedRecord)),
        );
        if (!parsed.success || !samePathCaseAware(parsed.data.key, folderKey)) return "unreadable";
        let { project, local, legacy } = parsed.data;
        return {
          project,
          local,
          legacy,
        };
      } catch {
        return "unreadable";
      }
    },
    recordFolder: (folderKey, record) => {
      writeRecord(folderRecordPath(folderKey, dir), {
        v: ACCEPTED_SETTINGS_VERSION,
        kind: "folder",
        key: folderKey,
        project: record.project,
        local: record.local,
        legacy: record.legacy,
        at: new Date().toISOString(),
      });
      reportedTails.delete(folderKey);
    },
    noteServed: (folderKey, serverPaths) => {
      touchFile(folderRecordPath(folderKey, dir));
      for (let serverPath of serverPaths) touchFile(settingsRecordPath(serverPath, dir));
    },
  };
}
//@ chunk-pd9bp1k5.js:3582-3826 placement
async function pruneStaleSettingsCopies(dir) {
  try {
    let cutoffMs = Date.now() - STALE_SETTINGS_PRUNE_MS;
    for (let name of await readdir(dir)) {
      let index = name.lastIndexOf(ACCEPTING_TEMP_INFIX);
      if (index <= 0 || !/^[0-9a-f]{8}\.jsonl$/.test(name.slice(index + ACCEPTING_TEMP_INFIX.length)))
        continue;
      let path = join(dir, name);
      if ((await lstat(path)).mtimeMs < cutoffMs)
        await rm(path, {
          recursive: true,
          force: true,
        });
    }
  } catch {}
}
//@ chunk-pd9bp1k5.js:3826-4488 placement
/**
 * 把待审设置写成临时文件交给检查函数，检查后确认文件未被替换（inode、大小、内容一致），返回 allowed/blocked/tampered，最后删除临时文件。
 */
async function checkSettingsCopy(settings, isBlocked) {
  let dir = settings.dir ?? servedCallsDir();
  await mkdir(dir, {
    recursive: true,
    mode: 448,
  });
  await pruneStaleSettingsCopies(dir);
  let tempPath = join(
    dir,
    `${basename(settings.name)}${ACCEPTING_TEMP_INFIX}${randomBytes(4).toString("hex")}${SETTINGS_FILE_EXT}`,
  );
  await writeFile(tempPath, settings.text, {
    mode: 384,
    flag: "wx",
  });
  try {
    let written = await lstat(tempPath);
    if (await isBlocked(tempPath)) return "blocked";
    let handle;
    try {
      if (getPlatform() === "windows" && (await lstat(tempPath)).isSymbolicLink()) return "tampered";
      handle = await open(tempPath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
      let stats = await handle.stat();
      return stats.isFile() &&
        stats.nlink === 1 &&
        stats.ino === written.ino &&
        stats.dev === written.dev &&
        stats.size === written.size &&
        (await handle.readFile({
          encoding: "utf8",
        })) === settings.text
        ? "allowed"
        : "tampered";
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ELOOP") return "tampered";
      throw error;
    } finally {
      await handle?.close().catch(() => {});
    }
  } finally {
    await rm(tempPath, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
export { createAcceptedSettingsStore, hashOrNull, checkSettingsCopy };
