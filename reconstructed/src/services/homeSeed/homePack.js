/**
 * services/homeSeed/homePack.ts
 *
 * 2.1.316 新增：home seed 打包
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwpc82tt.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  int,
  u,
  M,
  zodStrictObject,
  string,
  SIi,
  literal,
  array,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE, computeContentHash } from "../../utils/commitAttribution.js";
import {
  normalizedPath,
  MAX_WORKING_PATH_CHARS,
  MAX_WORKING_FILE_BYTES,
  MAX_WORKING_FILE_TOTAL_BYTES,
  isWorkingFilePath as isWorkingFilePath_2,
} from "./workingFiles.js";
import {
  isWithinValueBounds,
  isJsonPlainValue,
  compareByPath,
  sortedPortableCopy,
  exceedsJsonNesting,
  tryJsonParse,
  exceedsMaxPackFiles,
  hasSerializableSettings,
  isWorkingFilePath,
  decodePackFile,
  hasOnlyAllowedKeys,
  isStringArray,
} from "./portableSettings.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { extractRestrictivePermissions } from "../../utils/permissions/permissionsLoader.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-bwpc82tt.js:1363-2614 placement
/**
 * home seed 包的版本、大小与结构上限，可移植设置键白名单，以及包（文件、设置、摘要）的 zod schema。
 */
var HOME_PACK_VERSION = 1;
var MAX_PACK_GENERATION = 2147483648;
var MAX_PACK_BYTES = 8388608;
var MAX_SETTINGS_DEPTH = 32;
var MAX_SETTINGS_VALUES = 1e5;
var MAX_PACK_PATH_LENGTH = 1024;
var MAX_PACK_FILES = 4096;
var MAX_JSON_NESTING = MAX_SETTINGS_DEPTH + 16;
var FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
var PORTABLE_SETTING_KEYS = new Set([
  "language",
  "outputStyle",
  "attribution",
  "includeCoAuthoredBy",
  "includeGitInstructions",
  "alwaysThinkingEnabled",
  "showThinkingSummaries",
  "permissions",
]);
var PORTABLE_ATTRIBUTION_KEYS = new Set(["commit", "pr", "sessionUrl", "commitTrailers"]);
var PORTABLE_PERMISSION_KEYS = new Set(["allow", "deny", "ask"]);
var MAX_SETTINGS_KEYS = 32;
var MAX_SETTINGS_KEY_LENGTH = 64;
var nonNegativeIntSchema = DoctorLazy(() => int().min(0));
var countSchema = DoctorLazy(() => int().min(0).default(0));
var packVersionSchema = DoctorLazy(() =>
  u({
    version: int(),
  }),
);
var packGenerationSchema = DoctorLazy(() =>
  u({
    generation: int().min(1).max(MAX_PACK_GENERATION),
  }),
);
var packSummarySchema = DoctorLazy(() =>
  u({
    withheldSensitive: countSchema(),
    withheldReadDenied: countSchema(),
    rulesUnreadable: M().default(false),
    includesNotSent: countSchema(),
    symlinksNotSent: countSchema(),
    notDestinations: countSchema(),
    overCap: countSchema(),
    unreadable: countSchema(),
    settingsKeysWithheld: countSchema(),
    credentialTextsWithheld: countSchema(),
    rulesCoveringDeviceTools: countSchema(),
    droppedRules: u({
      rooted: countSchema(),
      device: countSchema(),
      invalid: countSchema(),
      overCap: countSchema(),
      credential: countSchema(),
      credentialRestrictions: countSchema(),
      guarded: countSchema(),
    }).default(() => ({
      rooted: 0,
      device: 0,
      invalid: 0,
      overCap: 0,
      credential: 0,
      credentialRestrictions: 0,
      guarded: 0,
    })),
  }),
);
var packFileSchema = DoctorLazy(() =>
  zodStrictObject({
    path: string().min(1).max(MAX_PACK_PATH_LENGTH),
    size: nonNegativeIntSchema(),
    sha256: string().regex(SHA256_HEX_RE),
    content: SIi(),
  }),
);
var homePackSchema = DoctorLazy(() =>
  u({
    version: literal(HOME_PACK_VERSION),
    generation: int().min(1).max(MAX_PACK_GENERATION),
    writtenAtMs: nonNegativeIntSchema(),
    files: array(packFileSchema()).max(MAX_PACK_FILES),
    settings: record(string(), unknown()).nullable(),
    summary: packSummarySchema(),
    forRunner: literal(true).optional(),
  }),
);
//@ chunk-bwpc82tt.js:2614-2795 placement
function arePathsDisjoint(e) {
  let mapped = e.map(normalizedPath);
  let n = new Set(
    mapped.flatMap((r) =>
      r
        .split("/")
        .slice(0, -1)
        .map((s, i, c) => c.slice(0, i + 1).join("/")),
    ),
  );
  return new Set(mapped).size === mapped.length && mapped.every((r) => !n.has(r));
}
//@ chunk-bwpc82tt.js:2795-2851 placement
/**
 * 构造打包文件条目（路径、内容、内容哈希）。
 */
function packFileEntry(path, content) {
  return {
    path,
    content,
    sha256: computeContentHash(content),
  };
}
//@ chunk-bwpc82tt.js:2851-2937 placement
/**
 * 检查文件大小列表是否在条数、单文件与总字节上限内。
 */
function withinPackCaps(e) {
  return (
    e.length <= MAX_WORKING_PATH_CHARS &&
    e.every((t) => t <= MAX_WORKING_FILE_BYTES) &&
    e.reduce((acc, n) => acc + n, 0) <= MAX_WORKING_FILE_TOTAL_BYTES
  );
}
//@ chunk-bwpc82tt.js:2937-2991 placement
/**
 * 检查文件条目是否都在上限内。
 */
function filesWithinPackCaps(files) {
  return withinPackCaps(files.map((t) => t.content.length));
}
//@ chunk-bwpc82tt.js:2991-3290 placement
/**
 * 按条数、单文件大小与总字节上限依次保留清点条目，其余记为超限丢弃。
 */
function capInventoryEntries(sorted) {
  let { kept, droppedOverCap } = sorted.reduce(
    (acc, s) => {
      if (
        acc.kept.length < MAX_WORKING_PATH_CHARS &&
        s.content.length <= MAX_WORKING_FILE_BYTES &&
        acc.keptBytes + s.content.length <= MAX_WORKING_FILE_TOTAL_BYTES
      ) {
        acc.kept.push(s);
        acc.keptBytes += s.content.length;
      } else acc.droppedOverCap.push(s);
      return acc;
    },
    {
      kept: [],
      droppedOverCap: [],
      keptBytes: 0,
    },
  );
  return {
    kept,
    droppedOverCap,
  };
}
//@ chunk-bwpc82tt.js:3290-4610 placement
/**
 * 校验并编码 home seed 包：检查文件数/大小、路径不重叠、摘要新鲜、路径为合法目的地、设置深度与可移植性，按 schema 序列化（内容 base64），超过行大小上限时抛错。
 */
function encodeHomePack(pack) {
  if (!filesWithinPackCaps(pack.files)) throw Error("home pack files exceed the caps");
  if (!arePathsDisjoint(pack.files.map((file) => file.path)))
    throw Error("home pack lists two paths that are one file, or one as a directory of another");
  if (pack.files.some((file) => computeContentHash(file.content) !== file.sha256))
    throw Error("home pack file digest is stale");
  if (!pack.files.every((file) => isWorkingFilePath_2(file.path)))
    throw Error("home pack names a path that is no destination");
  if (pack.settings !== null && !isWithinValueBounds(pack.settings))
    throw Error("home pack settings nest too deep or hold too much");
  if (pack.settings !== null && !isJsonPlainValue(pack.settings))
    throw Error("home pack settings hold a value JSON cannot carry");
  let settingsCheck = checkPortableSettings(pack.settings);
  if (settingsCheck === "over_bounds")
    throw Error("home pack settings carry more or longer keys than the portable filter writes");
  if (settingsCheck === "not_portable_key")
    throw Error("home pack settings carry a key the portable filter never writes");
  let packJson = {
    version: HOME_PACK_VERSION,
    generation: pack.generation,
    writtenAtMs: pack.writtenAtMs,
    files: pack.files.toSorted(compareByPath).map((file) => ({
      path: file.path,
      size: file.content.length,
      sha256: file.sha256,
      content: file.content.toString("base64"),
    })),
    settings: pack.settings === null ? null : sortedPortableCopy(pack.settings),
    summary: pack.summary,
    ...(pack.forRunner && {
      forRunner: pack.forRunner,
    }),
  };
  let r = homePackSchema().safeParse(packJson);
  if (!r.success) throw Error("home pack is off its own schema");
  let buffer = Buffer.from(jsonStringify(r.data));
  if (buffer.length > MAX_PACK_BYTES) throw Error("home pack exceeds the row byte cap");
  return buffer;
}
//@ chunk-bwpc82tt.js:4610-5606 placement
/**
 * 解码 home seed 包：检查大小、嵌套深度、版本与 schema，过滤非目的地与超限文件、校验内容摘要；设置不可移植时只保留限制性权限。返回 pack 与被拒计数。
 */
function decodeHomePack(bytes) {
  if (bytes.length > MAX_PACK_BYTES)
    return {
      ok: false,
      reason: "oversize",
    };
  let str = bytes.toString("utf8");
  if (exceedsJsonNesting(str))
    return {
      ok: false,
      reason: "malformed",
    };
  let parsed = tryJsonParse(str);
  let r = packVersionSchema().safeParse(parsed);
  if (r.success && r.data.version !== HOME_PACK_VERSION)
    return {
      ok: false,
      reason: "unsupported_version",
    };
  if (exceedsMaxPackFiles(parsed))
    return {
      ok: false,
      reason: "malformed",
    };
  if (!hasSerializableSettings(parsed))
    return {
      ok: false,
      reason: "malformed",
    };
  let s = homePackSchema().safeParse(parsed);
  if (!s.success)
    return {
      ok: false,
      reason: "malformed",
    };
  let pack = s.data;
  let filtered = pack.files.filter(isWorkingFilePath);
  if (!arePathsDisjoint(filtered.map((h) => h.path)))
    return {
      ok: false,
      reason: "malformed",
    };
  let filtered_2 = filtered.filter((h) => h.size <= MAX_WORKING_FILE_BYTES);
  if (!withinPackCaps(filtered_2.map((h) => h.size)))
    return {
      ok: false,
      reason: "over_cap",
    };
  let mapped = filtered_2.map(decodePackFile);
  let filtered_3 = mapped.filter((h) => h !== null);
  if (filtered_3.length !== mapped.length)
    return {
      ok: false,
      reason: "content_mismatch",
    };
  let settingsCheck = checkPortableSettings(pack.settings);
  return {
    ok: true,
    pack: {
      generation: pack.generation,
      writtenAtMs: pack.writtenAtMs,
      files: filtered_3,
      settings:
        pack.settings === null
          ? null
          : settingsCheck === "none"
            ? sortedPortableCopy(pack.settings)
            : extractRestrictivePermissions(pack.settings),
      summary: pack.summary,
      ...(pack.forRunner && {
        forRunner: pack.forRunner,
      }),
    },
    refused: {
      destination: pack.files.length - filtered.length,
      overCap: filtered.length - filtered_2.length,
      settings: settingsCheck,
    },
  };
}
//@ chunk-bwpc82tt.js:5606-5764 placement
/**
 * 只读取包的 generation 字段（超大或嵌套过深返回 null）。
 */
function readHomePackGeneration(e) {
  if (e.length > MAX_PACK_BYTES) return null;
  let str = e.toString("utf8");
  if (exceedsJsonNesting(str)) return null;
  let n = packGenerationSchema().safeParse(tryJsonParse(str));
  return n.success ? n.data.generation : null;
}
//@ chunk-bwpc82tt.js:5764-6091 placement
/**
 * 检查设置是否只含可移植键（以及 attribution/permissions 子键）且数量与长度在上限内，返回 none/over_bounds/not_portable_key。
 */
function checkPortableSettings(settings) {
  if (settings === null) return "none";
  let filtered = Object.keys(settings).filter((key) => !FORBIDDEN_KEYS.has(key));
  if (filtered.length > MAX_SETTINGS_KEYS || filtered.some((r) => r.length > MAX_SETTINGS_KEY_LENGTH))
    return "over_bounds";
  return filtered.every((r) => PORTABLE_SETTING_KEYS.has(r)) &&
    hasOnlyAllowedKeys(settings.attribution, PORTABLE_ATTRIBUTION_KEYS) &&
    hasOnlyAllowedKeys(settings.permissions, PORTABLE_PERMISSION_KEYS) &&
    (!isPlainObject(settings.permissions) ||
      Object.entries(settings.permissions).every(
        ([key, value]) => FORBIDDEN_KEYS.has(key) || isStringArray(value),
      ))
    ? "none"
    : "not_portable_key";
}
export {
  capInventoryEntries,
  encodeHomePack,
  packFileEntry,
  FORBIDDEN_KEYS,
  MAX_JSON_NESTING,
  MAX_PACK_FILES,
  MAX_SETTINGS_DEPTH,
  MAX_SETTINGS_VALUES,
  decodeHomePack,
  readHomePackGeneration,
  MAX_PACK_GENERATION,
  MAX_PACK_BYTES,
};
