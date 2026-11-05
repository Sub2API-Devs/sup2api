/**
 * skills/hostSkillMounts.ts
 *
 * 2.1.316 新增：宿主技能挂载
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q1gbn2mn.js (28)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { lstat, realpath, open } from "fs/promises";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { isSafeSkillName } from "./syncedSkills.js";
import { remoteToolsState } from "../remote/tools/callResults.js";
import { isCoworkWithRemote, hasRemoteSessionOrControl } from "../utils/sessionShape.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { platformNoFollowFlags, readOnlyNoFollowFlags } from "../utils/platformTargets.js";
import { limitConcurrency } from "../utils/concurrencyLimit.js";
import { withDeadline } from "../utils/sleep.js";
import { getErrnoCode } from "../utils/errors.js";
import { isZipMagic } from "../services/plugins/accountSync/sessionSkillManifest.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../services/plugins/accountSync/pluginsScopeGate.js";
import { isServerPluginId } from "../utils/plugins/pluginAttribution.js";

//@ chunk-q1gbn2mn.js:25334-25497 placement
/**
 * 宿主技能挂载的常量：挂载根 /mnt/skills、公共/示例来源映射、读取预算、文件大小上限、新鲜度容差、时间格式正则。
 */
var HOST_SKILLS_MOUNT = "/mnt/skills";
var MOUNT_SOURCES = {
  public: "anthropic",
  examples: "anthropic-example",
};
var PUBLIC = "public";
var HOST_MOUNT_BUDGET_MS = 3000;
var MAX_SKILL_ZIP_BYTES = 33554432;
var MOUNT_FRESHNESS_SLACK_MS = 600000;
var ISO_TIME_RE = /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/;
//@ chunk-q1gbn2mn.js:25497-25610 placement
/**
 * 记录一次宿主技能挂载未命中（按原因计数并写诊断日志）。
 */
function recordMountMiss(kind, miss, counts) {
  counts.set(miss.reason, (counts.get(miss.reason) ?? 0) + 1);
  logForDiagnosticsNoPII("info", "skills_sync_host_mount_miss", {
    kind,
    ...miss,
  });
}
//@ chunk-q1gbn2mn.js:25610-25698 placement
/**
 * 把挂载失败原因计数转成 mount_miss_* 字段。
 */
function flattenMountMissCounts(counts) {
  return Object.fromEntries(Array.from(counts, ([reason, count]) => [`mount_miss_${reason}`, count]));
}
//@ chunk-q1gbn2mn.js:25698-25898 placement
function getHostMountKind(row) {
  if (row.creator_type !== "anthropic" || row.id !== row.name || !isSafeSkillName(row.name)) return;
  if (row.source === MOUNT_SOURCES.public) return "public";
  return row.source === MOUNT_SOURCES.examples && row.is_public_provisioned === true ? "examples" : undefined;
}
//@ chunk-q1gbn2mn.js:25898-26008 placement
/**
 * 为宿主挂载的技能建立 id→挂载类型的索引。
 */
function indexHostMountKinds(skills) {
  let { hostMountKinds } = remoteToolsState();
  hostMountKinds.clear();
  for (let skill of skills) {
    let hostMountKind = getHostMountKind(skill);
    if (hostMountKind !== undefined) hostMountKinds.set(skill.id, hostMountKind);
  }
}
//@ chunk-q1gbn2mn.js:26008-26084 placement
function isHostSkillMountActive() {
  return (
    (isCoworkWithRemote() ||
      (hasRemoteSessionOrControl() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_bright_fog", true) !== false)) &&
    platformNoFollowFlags() !== 0
  );
}
//@ chunk-q1gbn2mn.js:26084-26145 placement
/**
 * 行匹配到挂载类型且挂载在当前会话生效时返回该类型。
 */
function hostMountKindForRow(row) {
  let kind = matchHostMountKind(row);
  return kind !== undefined && isHostSkillMountActive() ? kind : undefined;
}
//@ chunk-q1gbn2mn.js:26145-26295 placement
function matchHostMountKind(row) {
  let kind = remoteToolsState().hostMountKinds.get(row.skillId);
  return kind !== undefined &&
    row.name === row.skillId &&
    row.source === MOUNT_SOURCES[kind] &&
    row.requestedVersion === undefined
    ? kind
    : undefined;
}
//@ chunk-q1gbn2mn.js:26295-26709 placement
/**
 * 在时间预算内探测宿主技能挂载（各类目录是否为独立挂载设备），返回按 kind 读取技能 zip 的读取器（文件须比服务端记录新且为 zip），并记录花费/等待时间；不适用时返回 null。
 */
async function createHostSkillReader(skills, missCounts) {
  if (!isHostSkillMountActive()) return null;
  let budget = {
    deadline: performance.now() + HOST_MOUNT_BUDGET_MS,
    spentMs: 0,
    waitedMs: 0,
  };
  let probes = await runHostMountWork(budget, () => probeMountKinds(skills));
  let readLimited = limitConcurrency(1, (zipPath, updatedAt, device) =>
    runHostMountWork(budget, () => readMountedSkillZip(zipPath, updatedAt, device)),
  );
  return {
    async readZip(kind, row) {
      let probe = "reason" in probes ? probes : (probes.get(kind) ?? NOT_A_MOUNT_PROBE);
      let readResult =
        "reason" in probe
          ? probe
          : await readLimited(
              join(HOST_SKILLS_MOUNT, kind, `${row.name}.skill`),
              row.updatedAt,
              probe.device,
            );
      if ("zip" in readResult) return readResult.zip;
      recordMountMiss(kind, readResult, missCounts);
      return;
    },
    spentMs: () => Math.round(budget.spentMs),
    waitedMs: () => Math.round(budget.waitedMs),
  };
}
//@ chunk-q1gbn2mn.js:26709-27282 placement
/**
 * 在预算内执行一项宿主挂载工作：先等待正在进行的目录类工作（有上限），仍有未完成工作或预算耗尽时返回原因，否则执行并在截止前取结果。
 */
async function runHostMountWork(budget, work) {
  let state = remoteToolsState();
  while (state.hostMountWorkOutstanding !== null && state.hostMountWorkIsCatalogs) {
    let hostMountWorkOutstanding = state.hostMountWorkOutstanding;
    let startTime = performance.now();
    let waitMs = Math.min(budget.deadline, state.hostMountWorkStartedAt + HOST_MOUNT_BUDGET_MS) - startTime;
    if (waitMs > 0) {
      await withDeadline(
        hostMountWorkOutstanding.catch(() => {}),
        waitMs,
      );
      budget.waitedMs += performance.now() - startTime;
    }
    if (state.hostMountWorkOutstanding === hostMountWorkOutstanding) break;
  }
  let startTime = performance.now();
  if (state.hostMountWorkOutstanding !== null)
    return {
      reason: "earlier_work_outstanding",
    };
  if (startTime >= budget.deadline)
    return {
      reason: "budget_spent",
    };
  let pendingWork = trackHostMountWork(state, work, startTime, false);
  let result = await withDeadline(pendingWork, budget.deadline - startTime);
  budget.spentMs += performance.now() - startTime;
  return (
    result ?? {
      reason: "timed_out",
    }
  );
}
//@ chunk-q1gbn2mn.js:27282-27513 placement
/**
 * 等待其他宿主挂载工作完成后独占执行本次工作。
 */
async function runHostMountWorkExclusive(work) {
  let state = remoteToolsState();
  while (state.hostMountWorkOutstanding !== null) {
    let hostMountWorkOutstanding = state.hostMountWorkOutstanding;
    await hostMountWorkOutstanding.catch(() => {});
    if (state.hostMountWorkOutstanding === hostMountWorkOutstanding) state.hostMountWorkOutstanding = null;
  }
  return trackHostMountWork(state, work, performance.now(), true);
}
//@ chunk-q1gbn2mn.js:27513-27628 placement
/**
 * 判断进行中的宿主挂载工作是否已超时。
 */
function isHostMountWorkStale() {
  let state = remoteToolsState();
  return (
    state.hostMountWorkOutstanding !== null &&
    performance.now() - state.hostMountWorkStartedAt >= HOST_MOUNT_BUDGET_MS
  );
}
//@ chunk-q1gbn2mn.js:27628-27842 placement
function trackHostMountWork(state, startWork, hostMountWorkStartedAt, hostMountWorkIsCatalogs) {
  let work = startWork();
  state.hostMountWorkOutstanding = work;
  state.hostMountWorkStartedAt = hostMountWorkStartedAt;
  state.hostMountWorkIsCatalogs = hostMountWorkIsCatalogs;
  let clear = () => {
    if (state.hostMountWorkOutstanding === work) state.hostMountWorkOutstanding = null;
  };
  work.then(clear, clear);
  return work;
}
//@ chunk-q1gbn2mn.js:27842-27871 placement
var NOT_A_MOUNT_PROBE = {
  reason: "not_a_mount",
};
//@ chunk-q1gbn2mn.js:27871-28137 placement
async function probeMountKinds(kinds) {
  let rootStat = await lstat(HOST_SKILLS_MOUNT).catch(toProbeFailure);
  let rootProbe = "reason" in rootStat || rootStat.isDirectory() ? rootStat : NOT_A_MOUNT_PROBE;
  let probes = new Map();
  for (let kind of kinds) {
    if ("reason" in rootProbe) {
      probes.set(kind, rootProbe);
      continue;
    }
    let kindStat = await lstat(join(HOST_SKILLS_MOUNT, kind)).catch(toProbeFailure);
    probes.set(
      kind,
      "reason" in kindStat
        ? kindStat
        : kindStat.isDirectory() && kindStat.dev !== rootProbe.dev
          ? {
              device: kindStat.dev,
            }
          : NOT_A_MOUNT_PROBE,
    );
  }
  return probes;
}
//@ chunk-q1gbn2mn.js:28137-28245 placement
function toProbeFailure(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT"
    ? {
        reason: "no_mount",
      }
    : {
        reason: "probe_failed",
        code: errnoCode ?? "unknown",
      };
}
//@ chunk-q1gbn2mn.js:28245-28525 placement
function readMountedSkillZip(zipPath, updatedAt, device) {
  return withOpenedRegularFile(zipPath, device, MAX_SKILL_ZIP_BYTES, async (handle, stats) => {
    let rowUpdatedMs = updatedAt !== null && ISO_TIME_RE.test(updatedAt) ? Date.parse(updatedAt) : Number.NaN;
    if (Number.isNaN(rowUpdatedMs))
      return {
        reason: "row_date_unreadable",
      };
    if (stats.mtimeMs <= rowUpdatedMs + MOUNT_FRESHNESS_SLACK_MS)
      return {
        reason: "not_newer_than_row",
      };
    let bytes = await handle.readFile();
    return isZipMagic(bytes)
      ? {
          zip: bytes,
        }
      : {
          reason: "not_zip",
        };
  });
}
//@ chunk-q1gbn2mn.js:28525-28588 placement
/**
 * 探测单个技能 id 的宿主挂载情况（失败时返回原因）。
 */
async function probeOneMountKind(kind) {
  return (await probeMountKinds(new Set([kind]))).get(kind) ?? NOT_A_MOUNT_PROBE;
}
//@ chunk-q1gbn2mn.js:28588-28776 placement
/**
 * 解析公共技能目录的根（设备与真实路径），失败时写诊断日志并返回原因。
 */
async function resolvePublicCatalogRoot() {
  let probe = await probeOneMountKind(PUBLIC);
  let result =
    "reason" in probe
      ? probe
      : await realpath(join(HOST_SKILLS_MOUNT, PUBLIC)).then(
          (root) => ({
            device: probe.device,
            root,
          }),
          toProbeFailure,
        );
  if ("reason" in result) logForDiagnosticsNoPII("warn", "skill_host_catalog_not_read", result);
  return result;
}
//@ chunk-q1gbn2mn.js:28776-28918 placement
/**
 * 读取挂载技能目录中的 SKILL.md（优先缓存/特殊读取，否则作为普通文件读取），返回文本与路径或失败原因。
 */
async function readMountedSkillMd(root, skillName, device) {
  let skillPath = join(root, skillName, "SKILL.md");
  let readResult =
    (await checkNotSymlink(skillPath)) ??
    (await readRegularFileText(skillPath, device, MAX_SCOPE_RESPONSE_BYTES));
  return "reason" in readResult
    ? readResult
    : ((await checkNotSymlink(skillPath)) ?? {
        text: readResult.text,
        filePath: skillPath,
      });
}
//@ chunk-q1gbn2mn.js:28918-29020 placement
async function checkNotSymlink(filePath) {
  try {
    return (await realpath(filePath)) === filePath
      ? undefined
      : {
          reason: "file_is_link",
        };
  } catch (error) {
    return toReadFailure(error);
  }
}
//@ chunk-q1gbn2mn.js:29020-29113 placement (2.1.88 match: readJsonFile, 0.83)
/**
 * 安全读取文本文件：同一设备、普通文件、大小不超过上限，否则返回原因。
 */
function readRegularFileText(filePath, device, maxBytes) {
  return withOpenedRegularFile(filePath, device, maxBytes, async (handle) => ({
    text: await handle.readFile({
      encoding: "utf-8",
    }),
  }));
}
//@ chunk-q1gbn2mn.js:29113-29405 placement
/**
 * 打开文件并做 dev/isFile/size 检查后交给回调，最后关闭。
 */
async function withOpenedRegularFile(filePath, expectedDevice, maxBytes, useFile) {
  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
    let stats = await handle.stat();
    if (stats.dev !== expectedDevice)
      return {
        reason: "file_on_other_device",
      };
    if (!stats.isFile())
      return {
        reason: "not_a_file",
      };
    if (stats.size > maxBytes)
      return {
        reason: "too_large",
      };
    return await useFile(handle, stats);
  } catch (error) {
    return toReadFailure(error);
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-q1gbn2mn.js:29405-29581 placement
function toReadFailure(error) {
  let errnoCode = getErrnoCode(error);
  switch (errnoCode) {
    case "ENOENT":
      return {
        reason: "file_absent",
      };
    case "ELOOP":
      return {
        reason: "file_is_link",
      };
    default:
      return {
        reason: "read_failed",
        code: errnoCode ?? "unknown",
      };
  }
}
//@ chunk-q1gbn2mn.js:29581-29980 placement
/**
 * 把服务端技能记录转成内部行：id、名称、描述、来源、更新时间，以及可选的背后插件 id、是否用户可调用、是否禁用模型调用。
 */
function toSkillRow(skill) {
  return {
    skillId: skill.id,
    name: skill.name,
    description: skill.description ?? "",
    source: skill.source ?? "custom",
    updatedAt: skill.updated_at ?? null,
    ...(typeof skill.backing_plugin_id === "string" &&
      isServerPluginId(skill.backing_plugin_id) && {
        backingPluginId: skill.backing_plugin_id,
      }),
    ...(skill.user_invocable != null && {
      userInvocable: skill.user_invocable === true,
    }),
    ...(skill.disable_model_invocation != null && {
      disableModelInvocation: skill.disable_model_invocation !== false,
    }),
  };
}
//@ chunk-q1gbn2mn.js:29980-30313 placement
/**
 * 根据技能元数据判断归属：anthropic、共享、组织、自己或他人。
 */
function getSkillOwnership(skill) {
  if (typeof skill.creator_type !== "string") return;
  if (skill.creator_type === "anthropic") return "anthropic";
  if (skill.is_shared === true) return "shared";
  if (skill.partition_by === "organization") return "org";
  let isAccountPartitioned = skill.partition_by === "account";
  if (typeof skill.backing_plugin_id === "string") return isAccountPartitioned ? "own" : "other";
  return isAccountPartitioned || skill.partition_by == null ? "own" : "other";
}
//@ chunk-q1gbn2mn.js:30313-30351 placement
/**
 * 判断技能行是否启用（enabled 不为 false）。
 */
function isSkillEnabled(skill) {
  return skill.enabled !== false;
}
//@ chunk-q1gbn2mn.js:30351-30377 placement
var COLLISION_LOSER = "collision-loser";
export {
  HOST_SKILLS_MOUNT,
  PUBLIC,
  COLLISION_LOSER,
  readRegularFileText,
  probeOneMountKind,
  flattenMountMissCounts,
  isHostMountWorkStale,
  runHostMountWorkExclusive,
  resolvePublicCatalogRoot,
  readMountedSkillMd,
  recordMountMiss,
  hostMountKindForRow,
  createHostSkillReader,
  getSkillOwnership,
  isSkillEnabled,
  toSkillRow,
  indexHostMountKinds,
};
