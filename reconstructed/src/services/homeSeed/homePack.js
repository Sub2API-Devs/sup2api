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
import { tc, u, M, zodStrictObject, o, SIi, T, A, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { AS, computeContentHash } from "../../utils/commitAttribution.js";
import { wln, O7e, uue, Sln, RUt } from "./workingFiles.js";
import {
  isWithinValueBounds,
  isJsonPlainValue,
  ke,
  sortedPortableCopy,
  exceedsJsonNesting,
  bln,
  Oe,
  Pe,
  Ce,
  decodePackFile,
  L,
  be,
} from "./portableSettings.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { extractRestrictivePermissions } from "../../utils/permissions/permissionsLoader.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

/**
 * home seed 包的版本、大小与结构上限，可移植设置键白名单，以及包（文件、设置、摘要）的 zod schema。
 */
//@ chunk-bwpc82tt.js:1363-2614 placement
var HOME_PACK_VERSION = 1,
  MAX_PACK_GENERATION = 2147483648,
  MAX_PACK_BYTES = 8388608,
  MAX_SETTINGS_DEPTH = 32,
  MAX_SETTINGS_VALUES = 1e5,
  MAX_PACK_PATH_LENGTH = 1024,
  MAX_PACK_FILES = 4096,
  MAX_JSON_NESTING = MAX_SETTINGS_DEPTH + 16,
  FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]),
  PORTABLE_SETTING_KEYS = new Set([
    "language",
    "outputStyle",
    "attribution",
    "includeCoAuthoredBy",
    "includeGitInstructions",
    "alwaysThinkingEnabled",
    "showThinkingSummaries",
    "permissions",
  ]),
  PORTABLE_ATTRIBUTION_KEYS = new Set(["commit", "pr", "sessionUrl", "commitTrailers"]),
  PORTABLE_PERMISSION_KEYS = new Set(["allow", "deny", "ask"]),
  MAX_SETTINGS_KEYS = 32,
  MAX_SETTINGS_KEY_LENGTH = 64,
  nonNegativeIntSchema = DoctorLazy(() => tc().min(0)),
  countSchema = DoctorLazy(() => tc().min(0).default(0)),
  packVersionSchema = DoctorLazy(() => u({ version: tc() })),
  packGenerationSchema = DoctorLazy(() => u({ generation: tc().min(1).max(MAX_PACK_GENERATION) })),
  packSummarySchema = DoctorLazy(() =>
    u({
      withheldSensitive: countSchema(),
      withheldReadDenied: countSchema(),
      rulesUnreadable: M().default(!1),
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
  ),
  packFileSchema = DoctorLazy(() =>
    zodStrictObject({
      path: o().min(1).max(MAX_PACK_PATH_LENGTH),
      size: nonNegativeIntSchema(),
      sha256: o().regex(AS),
      content: SIi(),
    }),
  ),
  homePackSchema = DoctorLazy(() =>
    u({
      version: T(HOME_PACK_VERSION),
      generation: tc().min(1).max(MAX_PACK_GENERATION),
      writtenAtMs: nonNegativeIntSchema(),
      files: A(packFileSchema()).max(MAX_PACK_FILES),
      settings: pe(o(), oe()).nullable(),
      summary: packSummarySchema(),
      forRunner: T(!0).optional(),
    }),
  );
//@ chunk-bwpc82tt.js:2614-2795 placement
function arePathsDisjoint(e) {
  let mapped = e.map(wln),
    n = new Set(
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
function DOo(e, t) {
  return { path: e, content: t, sha256: computeContentHash(t) };
}
//@ chunk-bwpc82tt.js:2851-2937 placement
function W(e) {
  return e.length <= O7e && e.every((t) => t <= uue) && e.reduce((t, n) => t + n, 0) <= Sln;
}
//@ chunk-bwpc82tt.js:2937-2991 placement
function Te(e) {
  return W(e.map((t) => t.content.length));
}
/**
 * 按条数、单文件大小与总字节上限依次保留清点条目，其余记为超限丢弃。
 */
//@ chunk-bwpc82tt.js:2991-3290 placement
function capInventoryEntries(e) {
  let { kept: kept, droppedOverCap: droppedOverCap } = e.reduce(
    (r, s) => {
      if (r.kept.length < O7e && s.content.length <= uue && r.keptBytes + s.content.length <= Sln)
        (r.kept.push(s), (r.keptBytes += s.content.length));
      else r.droppedOverCap.push(s);
      return r;
    },
    { kept: [], droppedOverCap: [], keptBytes: 0 },
  );
  return { kept: kept, droppedOverCap: droppedOverCap };
}
/**
 * 校验并编码 home seed 包：检查文件数/大小、路径不重叠、摘要新鲜、路径为合法目的地、设置深度与可移植性，按 schema 序列化（内容 base64），超过行大小上限时抛错。
 */
//@ chunk-bwpc82tt.js:3290-4610 placement
function encodeHomePack(pack) {
  if (!Te(pack.files)) throw Error("home pack files exceed the caps");
  if (!arePathsDisjoint(pack.files.map((file) => file.path)))
    throw Error("home pack lists two paths that are one file, or one as a directory of another");
  if (pack.files.some((file) => computeContentHash(file.content) !== file.sha256))
    throw Error("home pack file digest is stale");
  if (!pack.files.every((file) => RUt(file.path)))
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
      files: pack.files
        .toSorted(ke)
        .map((i) => ({
          path: i.path,
          size: i.content.length,
          sha256: i.sha256,
          content: i.content.toString("base64"),
        })),
      settings: pack.settings === null ? null : sortedPortableCopy(pack.settings),
      summary: pack.summary,
      ...(pack.forRunner && { forRunner: pack.forRunner }),
    },
    safeParse = homePackSchema().safeParse(packJson);
  if (!safeParse.success) throw Error("home pack is off its own schema");
  let buffer = Buffer.from(jsonStringify(safeParse.data));
  if (buffer.length > MAX_PACK_BYTES) throw Error("home pack exceeds the row byte cap");
  return buffer;
}
/**
 * 解码 home seed 包：检查大小、嵌套深度、版本与 schema，过滤非目的地与超限文件、校验内容摘要；设置不可移植时只保留限制性权限。返回 pack 与被拒计数。
 */
//@ chunk-bwpc82tt.js:4610-5606 placement
function decodeHomePack(bytes) {
  if (bytes.length > MAX_PACK_BYTES) return { ok: !1, reason: "oversize" };
  let str = bytes.toString("utf8");
  if (exceedsJsonNesting(str)) return { ok: !1, reason: "malformed" };
  let parsed = bln(str),
    safeParse = packVersionSchema().safeParse(parsed);
  if (safeParse.success && safeParse.data.version !== HOME_PACK_VERSION)
    return { ok: !1, reason: "unsupported_version" };
  if (Oe(parsed)) return { ok: !1, reason: "malformed" };
  if (!Pe(parsed)) return { ok: !1, reason: "malformed" };
  let safeParse_2 = homePackSchema().safeParse(parsed);
  if (!safeParse_2.success) return { ok: !1, reason: "malformed" };
  let pack = safeParse_2.data,
    filtered = pack.files.filter(Ce);
  if (!arePathsDisjoint(filtered.map((h) => h.path))) return { ok: !1, reason: "malformed" };
  let filtered_2 = filtered.filter((h) => h.size <= uue);
  if (!W(filtered_2.map((h) => h.size))) return { ok: !1, reason: "over_cap" };
  let mapped = filtered_2.map(decodePackFile),
    filtered_3 = mapped.filter((h) => h !== null);
  if (filtered_3.length !== mapped.length) return { ok: !1, reason: "content_mismatch" };
  let settingsCheck = checkPortableSettings(pack.settings);
  return {
    ok: !0,
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
      ...(pack.forRunner && { forRunner: pack.forRunner }),
    },
    refused: {
      destination: pack.files.length - filtered.length,
      overCap: filtered.length - filtered_2.length,
      settings: settingsCheck,
    },
  };
}
/**
 * 只读取包的 generation 字段（超大或嵌套过深返回 null）。
 */
//@ chunk-bwpc82tt.js:5606-5764 placement
function readHomePackGeneration(e) {
  if (e.length > MAX_PACK_BYTES) return null;
  let str = e.toString("utf8");
  if (exceedsJsonNesting(str)) return null;
  let safeParse = packGenerationSchema().safeParse(bln(str));
  return safeParse.success ? safeParse.data.generation : null;
}
/**
 * 检查设置是否只含可移植键（以及 attribution/permissions 子键）且数量与长度在上限内，返回 none/over_bounds/not_portable_key。
 */
//@ chunk-bwpc82tt.js:5764-6091 placement
function checkPortableSettings(e) {
  if (e === null) return "none";
  let filtered = Object.keys(e).filter((r) => !FORBIDDEN_KEYS.has(r));
  if (filtered.length > MAX_SETTINGS_KEYS || filtered.some((r) => r.length > MAX_SETTINGS_KEY_LENGTH))
    return "over_bounds";
  return filtered.every((r) => PORTABLE_SETTING_KEYS.has(r)) &&
    L(e.attribution, PORTABLE_ATTRIBUTION_KEYS) &&
    L(e.permissions, PORTABLE_PERMISSION_KEYS) &&
    (!isPlainObject(e.permissions) ||
      Object.entries(e.permissions).every(([r, s]) => FORBIDDEN_KEYS.has(r) || be(s)))
    ? "none"
    : "not_portable_key";
}

export {
  capInventoryEntries,
  encodeHomePack,
  DOo,
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
