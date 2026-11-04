/**
 * services/homeSeed/homeSidecar.ts
 *
 * 2.1.316 新增：home seed 附带文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-twq47pff.js (11)
 * attribution: placement 11
 */
import {
  MAX_WORKING_PATH_CHARS,
  MAX_WORKING_PATH_LENGTH,
  workingFileDestination,
  classifyWorkingFile,
} from "./workingFiles.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  literal,
  int,
  array,
  stringSchema,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE, computeContentHash } from "../../utils/commitAttribution.js";
import { MAX_CONTENT_HASH_CHARS } from "../../tools/PowerShellTool/sessionChannelPowerShell.js";
import {
  tryJsonParse,
  canonicalJson,
  looksLikeCredentialIncludingNul,
  filterPortableSettings,
} from "./portableSettings.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { uniq } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-twq47pff.js:12711-12973 placement
/**
 * home seed 附带文件（记录已写入文件摘要、设置摘要与包 etag）的版本、上限与 schema。
 */
var SIDECAR_VERSION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SIDECAR_ENTRY_FACTOR;
var MAX_SIDECAR_ENTRIES;
var MAX_SIDECAR_BYTES;
var homeSidecarSchema;
deferInit("chunk-twq47pff.js:12711", () => {
  SIDECAR_VERSION = 1;
  SIDECAR_ENTRY_FACTOR = 4;
  MAX_SIDECAR_ENTRIES = MAX_WORKING_PATH_CHARS * SIDECAR_ENTRY_FACTOR;
  MAX_SIDECAR_BYTES = 131072;
  homeSidecarSchema = DoctorLazy(() =>
    zodStrictObject({
      version: literal(SIDECAR_VERSION),
      generation: int().min(1),
      writtenAtMs: int().min(0),
      entries: array(
        zodStrictObject({
          path: stringSchema().min(1).max(MAX_WORKING_PATH_LENGTH),
          sha256: stringSchema().regex(SHA256_HEX_RE),
        }),
      ).max(MAX_SIDECAR_ENTRIES),
      settingsSha256: stringSchema().regex(SHA256_HEX_RE).nullable(),
      packEtag: stringSchema().min(1).max(MAX_CONTENT_HASH_CHARS).optional(),
    }),
  );
});
//@ chunk-twq47pff.js:12973-13166 placement
function parseHomeSidecar(content) {
  if (content.length > MAX_SIDECAR_BYTES) return null;
  let rawContent = tryJsonParse(content.toString("utf8"));
  if (
    !isPlainObject(rawContent) ||
    (Array.isArray(rawContent.entries) && rawContent.entries.length > MAX_SIDECAR_ENTRIES)
  )
    return null;
  let parsed = homeSidecarSchema().safeParse(rawContent);
  return parsed.success ? parsed.data : null;
}
//@ chunk-twq47pff.js:13166-13407 placement
function encodeHomeSidecar(seed) {
  let incomingSeed = homeSidecarSchema().safeParse({
    ...seed,
    entries: seed.entries.slice(-MAX_SIDECAR_ENTRIES),
  });
  if (!incomingSeed.success) throw Error("home sidecar is off its own schema");
  let buffer = Buffer.from(jsonStringify(incomingSeed.data));
  if (buffer.length > MAX_SIDECAR_BYTES) throw Error("home sidecar exceeds its byte bound");
  return buffer;
}
//@ chunk-twq47pff.js:13407-13478 placement
/**
 * 生成侧车计划（文档、渲染文本与哈希）。
 */
function renderSidecarPlan(settingsDoc) {
  let rendered = canonicalJson(settingsDoc);
  return {
    document: settingsDoc,
    rendered,
    sha256: computeContentHash(rendered),
  };
}
//@ chunk-twq47pff.js:13478-13516 placement
/**
 * 渲染后 settings 的字节上限（1 MiB）。
 */
var permissionsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_RENDERED_SETTINGS_BYTES;
deferInit("chunk-twq47pff.js:13478", () => {
  permissionsSchema = DoctorLazy(() => record(stringSchema(), unknown()));
  MAX_RENDERED_SETTINGS_BYTES = 1048576;
});
//@ chunk-twq47pff.js:13516-13618 placement
function toStringArray(value) {
  let parsed = array(unknown()).safeParse(value);
  return parsed.success ? parsed.data.filter((item) => typeof item === "string") : [];
}
//@ chunk-twq47pff.js:13618-13696 placement
/**
 * 合并两个规则列表并去重（保持前者顺序）。
 */
function mergeRuleLists(stringArray, incoming) {
  let seen = new Set(stringArray);
  return [...stringArray, ...uniq(incoming).filter((entry) => !seen.has(entry))];
}
//@ chunk-twq47pff.js:13696-14335 placement
/**
 * 把包里的 deny/ask 规则合并进云端现有 settings.json：恢复模式按记录合并，否则与现有规则去重；无规则返回 null，超过大小上限或无法读取返回 unreadable。
 */
function renderRestrictiveSettings(plan, existingSettings, mode) {
  if (existingSettings.kind === "unusable") return "unreadable";
  let existing = existingSettings.kind === "object" ? existingSettings.value : {};
  let parsedPermissions = permissionsSchema().safeParse(existing.permissions ?? {});
  if (!parsedPermissions.success) return "unreadable";
  let renderFull = mode !== "refused_over_ours";
  if (renderFull && plan === null) return null;
  let mergeRules = (ruleKind) => {
    let stringArray = toStringArray(parsedPermissions.data[ruleKind]);
    let incoming = plan?.document.permissions?.[ruleKind] ?? [];
    return mode === "restore"
      ? mergeRuleLists(stringArray, incoming)
      : uniq([...stringArray, ...incoming].toReversed()).toReversed();
  };
  let deny = mergeRules("deny");
  let ask = mergeRules("ask");
  if (deny.length === 0 && ask.length === 0) return null;
  let restrictive = {
    ...(deny.length > 0 && {
      deny,
    }),
    ...(ask.length > 0 && {
      ask,
    }),
  };
  if (!renderFull)
    return renderSidecarPlan({
      permissions: restrictive,
    });
  let rendered =
    jsonStringify(
      {
        ...existing,
        permissions: {
          ...parsedPermissions.data,
          ...restrictive,
        },
      },
      null,
      2,
    ) +
    `
`;
  return Buffer.byteLength(rendered) > MAX_RENDERED_SETTINGS_BYTES
    ? "unreadable"
    : {
        rendered,
        sha256: computeContentHash(rendered),
      };
}
//@ chunk-twq47pff.js:14335-15344 placement
/**
 * 规划在云会话应用 home seed 包：generation 不新于已应用时返回 stale_generation；否则按附带文件算写入、需删除的旧文件，过滤像凭证的文件与设置，返回计划与计数。
 */
function planHomeSeedApply({
  pack,
  packEtag,
  refused,
  sidecar,
  lastAppliedGeneration,
  permissionsAdmissible,
  onlyClaudeMd,
}) {
  if (pack.generation <= lastAppliedGeneration)
    return {
      kind: "stale_generation",
      generation: pack.generation,
      lastApplied: lastAppliedGeneration,
    };
  let priorByPath = new Map(
    (sidecar?.entries ?? []).flatMap((first) => {
      let second = workingFileDestination(first.path);
      return second === null
        ? []
        : [
            [
              second.destination,
              {
                path: second.destination,
                kind: second.kind,
                sha256: first.sha256,
              },
            ],
          ];
    }),
  );
  let priorSha = new Map([...priorByPath.values()].map(({ path, sha256 }) => [path, sha256]));
  let files = pack.files;
  let filtered = files.filter((file) => !looksLikeCredentialIncludingNul(file.content.toString("utf8")));
  let writablePaths = new Set(filtered.map((third) => third.path));
  let removals = [...priorByPath.values()].filter(({ path }) => !writablePaths.has(path));
  let settingsPlan = refilterSeedSettings(pack.settings, permissionsAdmissible);
  return {
    kind: "plan",
    plan: {
      generation: pack.generation,
      packEtag,
      writes: filtered.flatMap(classifyWorkingFileWrite),
      removals,
      settings: settingsPlan.plan,
      priorSettingsSha256: sidecar?.settingsSha256 ?? null,
      priorEntries: priorSha,
      counts: {
        refused,
        refilteredKeys: settingsPlan.refilteredKeys,
        refilteredCredentials: settingsPlan.refilteredCredentials + files.length - filtered.length,
        refilteredCredentialRestrictions: settingsPlan.refilteredCredentialRestrictions,
        refilteredCredentialFiles: files.length - filtered.length,
        permissionsDropped: settingsPlan.permissionsDropped,
      },
    },
  };
}
//@ chunk-twq47pff.js:15344-15412 placement
/**
 * 把工作文件条目归类成可写入项。
 */
function classifyWorkingFileWrite(write) {
  let kind = classifyWorkingFile(write.path);
  return kind === null
    ? []
    : [
        {
          ...write,
          kind,
        },
      ];
}
//@ chunk-twq47pff.js:15412-16188 placement
/**
 * 在云端重新筛选包里的设置：统计被去掉的键与凭证；不允许权限时去掉 allow，返回设置计划与计数。
 */
function refilterSeedSettings(userSettings, permissionsAdmissible) {
  if (userSettings === null)
    return {
      plan: null,
      refilteredKeys: 0,
      refilteredCredentials: 0,
      refilteredCredentialRestrictions: 0,
      permissionsDropped: false,
    };
  let filtered = filterPortableSettings(userSettings, {
    settingsToCloud: () => true,
    preToolUseHookActiveHere: false,
    hasLostAnAllowEntryAtParse: false,
  });
  let counts = {
    refilteredKeys: filtered.counts.withheldKeys,
    refilteredCredentials: filtered.counts.rules.droppedCredential + filtered.counts.withheldCredentialTexts,
    refilteredCredentialRestrictions: filtered.counts.rules.droppedCredentialRestrictions,
  };
  if (filtered.document === null)
    return {
      plan: null,
      ...counts,
      permissionsDropped: false,
    };
  let { permissions, ...plan } = filtered.document;
  let dropAllow = permissions?.allow !== undefined && !permissionsAdmissible;
  let { allow, ...keys } = permissions ?? {};
  let settingsDoc = dropAllow
    ? Object.keys(keys).length === 0
      ? plan
      : {
          ...plan,
          permissions: keys,
        }
    : filtered.document;
  if (Object.keys(settingsDoc).length === 0)
    return {
      plan: null,
      ...counts,
      permissionsDropped: dropAllow,
    };
  return {
    plan: renderSidecarPlan(settingsDoc),
    ...counts,
    permissionsDropped: dropAllow,
  };
}
export {
  planHomeSeedApply,
  permissionsSchema,
  toStringArray,
  mergeRuleLists,
  MAX_RENDERED_SETTINGS_BYTES,
  renderSidecarPlan,
  MAX_SIDECAR_BYTES,
  parseHomeSidecar,
  SIDECAR_VERSION,
  MAX_SIDECAR_ENTRIES,
  renderRestrictiveSettings,
  encodeHomeSidecar,
};
