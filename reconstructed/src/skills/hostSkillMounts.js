/**
 * skills/hostSkillMounts.ts
 *
 * 2.1.316 新增：宿主技能挂载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (28)
 * attribution: placement 28
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

//@ chunk-f9asxqh1.js:23651-23814 placement
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
//@ chunk-f9asxqh1.js:23814-23927 placement
/**
 * 记录一次宿主技能挂载未命中（按原因计数并写诊断日志）。
 */
function recordMountMiss(kind, n, s) {
  s.set(n.reason, (s.get(n.reason) ?? 0) + 1);
  logForDiagnosticsNoPII("info", "skills_sync_host_mount_miss", {
    kind,
    ...n,
  });
}
//@ chunk-f9asxqh1.js:23927-24015 placement
/**
 * 把挂载失败原因计数转成 mount_miss_* 字段。
 */
function flattenMountMissCounts(e) {
  return Object.fromEntries(Array.from(e, ([n, s]) => [`mount_miss_${n}`, s]));
}
//@ chunk-f9asxqh1.js:24015-24215 placement
function getHostMountKind(e) {
  if (e.creator_type !== "anthropic" || e.id !== e.name || !isSafeSkillName(e.name)) return;
  if (e.source === MOUNT_SOURCES.public) return "public";
  return e.source === MOUNT_SOURCES.examples && e.is_public_provisioned === true ? "examples" : undefined;
}
//@ chunk-f9asxqh1.js:24215-24325 placement
/**
 * 为宿主挂载的技能建立 id→挂载类型的索引。
 */
function indexHostMountKinds(e) {
  let { hostMountKinds } = remoteToolsState();
  hostMountKinds.clear();
  for (let s of e) {
    let hostMountKind = getHostMountKind(s);
    if (hostMountKind !== undefined) hostMountKinds.set(s.id, hostMountKind);
  }
}
//@ chunk-f9asxqh1.js:24325-24401 placement
function isHostSkillMountActive() {
  return (
    (isCoworkWithRemote() ||
      (hasRemoteSessionOrControl() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_bright_fog", true) !== false)) &&
    platformNoFollowFlags() !== 0
  );
}
//@ chunk-f9asxqh1.js:24401-24462 placement
/**
 * 行匹配到挂载类型且挂载在当前会话生效时返回该类型。
 */
function hostMountKindForRow(e) {
  let n = matchHostMountKind(e);
  return n !== undefined && isHostSkillMountActive() ? n : undefined;
}
//@ chunk-f9asxqh1.js:24462-24612 placement
function matchHostMountKind(e) {
  let n = remoteToolsState().hostMountKinds.get(e.skillId);
  return n !== undefined &&
    e.name === e.skillId &&
    e.source === MOUNT_SOURCES[n] &&
    e.requestedVersion === undefined
    ? n
    : undefined;
}
//@ chunk-f9asxqh1.js:24612-25026 placement
/**
 * 在时间预算内探测宿主技能挂载（各类目录是否为独立挂载设备），返回按 kind 读取技能 zip 的读取器（文件须比服务端记录新且为 zip），并记录花费/等待时间；不适用时返回 null。
 */
async function createHostSkillReader(e, n) {
  if (!isHostSkillMountActive()) return null;
  let budget = {
    deadline: performance.now() + HOST_MOUNT_BUDGET_MS,
    spentMs: 0,
    waitedMs: 0,
  };
  let r = await runHostMountWork(budget, () => probeMountKinds(e));
  let f = limitConcurrency(1, (y, S, h) => runHostMountWork(budget, () => readMountedSkillZip(y, S, h)));
  return {
    async readZip(kind, S) {
      let h = "reason" in r ? r : (r.get(kind) ?? NOT_A_MOUNT_PROBE);
      let w =
        "reason" in h ? h : await f(join(HOST_SKILLS_MOUNT, kind, `${S.name}.skill`), S.updatedAt, h.device);
      if ("zip" in w) return w.zip;
      recordMountMiss(kind, w, n);
      return;
    },
    spentMs: () => Math.round(budget.spentMs),
    waitedMs: () => Math.round(budget.waitedMs),
  };
}
//@ chunk-f9asxqh1.js:25026-25599 placement
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
//@ chunk-f9asxqh1.js:25599-25830 placement
/**
 * 等待其他宿主挂载工作完成后独占执行本次工作。
 */
async function runHostMountWorkExclusive(e) {
  let n = remoteToolsState();
  while (n.hostMountWorkOutstanding !== null) {
    let hostMountWorkOutstanding = n.hostMountWorkOutstanding;
    await hostMountWorkOutstanding.catch(() => {});
    if (n.hostMountWorkOutstanding === hostMountWorkOutstanding) n.hostMountWorkOutstanding = null;
  }
  return trackHostMountWork(n, e, performance.now(), true);
}
//@ chunk-f9asxqh1.js:25830-25945 placement
/**
 * 判断进行中的宿主挂载工作是否已超时。
 */
function isHostMountWorkStale() {
  let e = remoteToolsState();
  return (
    e.hostMountWorkOutstanding !== null &&
    performance.now() - e.hostMountWorkStartedAt >= HOST_MOUNT_BUDGET_MS
  );
}
//@ chunk-f9asxqh1.js:25945-26159 placement
function trackHostMountWork(e, n, hostMountWorkStartedAt, hostMountWorkIsCatalogs) {
  let f = n();
  e.hostMountWorkOutstanding = f;
  e.hostMountWorkStartedAt = hostMountWorkStartedAt;
  e.hostMountWorkIsCatalogs = hostMountWorkIsCatalogs;
  let y = () => {
    if (e.hostMountWorkOutstanding === f) e.hostMountWorkOutstanding = null;
  };
  f.then(y, y);
  return f;
}
//@ chunk-f9asxqh1.js:26159-26188 placement
var NOT_A_MOUNT_PROBE = {
  reason: "not_a_mount",
};
//@ chunk-f9asxqh1.js:26188-26454 placement
async function probeMountKinds(e) {
  let n = await lstat(HOST_SKILLS_MOUNT).catch(toProbeFailure);
  let s = "reason" in n || n.isDirectory() ? n : NOT_A_MOUNT_PROBE;
  let r = new Map();
  for (let f of e) {
    if ("reason" in s) {
      r.set(f, s);
      continue;
    }
    let y = await lstat(join(HOST_SKILLS_MOUNT, f)).catch(toProbeFailure);
    r.set(
      f,
      "reason" in y
        ? y
        : y.isDirectory() && y.dev !== s.dev
          ? {
              device: y.dev,
            }
          : NOT_A_MOUNT_PROBE,
    );
  }
  return r;
}
//@ chunk-f9asxqh1.js:26454-26562 placement
function toProbeFailure(e) {
  let errnoCode = getErrnoCode(e);
  return errnoCode === "ENOENT"
    ? {
        reason: "no_mount",
      }
    : {
        reason: "probe_failed",
        code: errnoCode ?? "unknown",
      };
}
//@ chunk-f9asxqh1.js:26562-26842 placement
function readMountedSkillZip(e, n, s) {
  return withOpenedRegularFile(e, s, MAX_SKILL_ZIP_BYTES, async (r, f) => {
    let y = n !== null && ISO_TIME_RE.test(n) ? Date.parse(n) : Number.NaN;
    if (Number.isNaN(y))
      return {
        reason: "row_date_unreadable",
      };
    if (f.mtimeMs <= y + MOUNT_FRESHNESS_SLACK_MS)
      return {
        reason: "not_newer_than_row",
      };
    let content = await r.readFile();
    return isZipMagic(content)
      ? {
          zip: content,
        }
      : {
          reason: "not_zip",
        };
  });
}
//@ chunk-f9asxqh1.js:26842-26905 placement
/**
 * 探测单个技能 id 的宿主挂载情况（失败时返回原因）。
 */
async function probeOneMountKind(e) {
  return (await probeMountKinds(new Set([e]))).get(e) ?? NOT_A_MOUNT_PROBE;
}
//@ chunk-f9asxqh1.js:26905-27093 placement
/**
 * 解析公共技能目录的根（设备与真实路径），失败时写诊断日志并返回原因。
 */
async function resolvePublicCatalogRoot() {
  let e = await probeOneMountKind(PUBLIC);
  let n =
    "reason" in e
      ? e
      : await realpath(join(HOST_SKILLS_MOUNT, PUBLIC)).then(
          (root) => ({
            device: e.device,
            root,
          }),
          toProbeFailure,
        );
  if ("reason" in n) logForDiagnosticsNoPII("warn", "skill_host_catalog_not_read", n);
  return n;
}
//@ chunk-f9asxqh1.js:27093-27235 placement
/**
 * 读取挂载技能目录中的 SKILL.md（优先缓存/特殊读取，否则作为普通文件读取），返回文本与路径或失败原因。
 */
async function readMountedSkillMd(root, skillName, device) {
  let r = join(root, skillName, "SKILL.md");
  let f = (await checkNotSymlink(r)) ?? (await readRegularFileText(r, device, MAX_SCOPE_RESPONSE_BYTES));
  return "reason" in f
    ? f
    : ((await checkNotSymlink(r)) ?? {
        text: f.text,
        filePath: r,
      });
}
//@ chunk-f9asxqh1.js:27235-27337 placement
async function checkNotSymlink(e) {
  try {
    return (await realpath(e)) === e
      ? undefined
      : {
          reason: "file_is_link",
        };
  } catch (error) {
    return toReadFailure(error);
  }
}
//@ chunk-f9asxqh1.js:27337-27430 placement = readJsonFile (0.83)
/**
 * 安全读取文本文件：同一设备、普通文件、大小不超过上限，否则返回原因。
 */
function readRegularFileText(e, n, s) {
  return withOpenedRegularFile(e, n, s, async (r) => ({
    text: await r.readFile({
      encoding: "utf-8",
    }),
  }));
}
//@ chunk-f9asxqh1.js:27430-27722 placement
/**
 * 打开文件并做 dev/isFile/size 检查后交给回调，最后关闭。
 */
async function withOpenedRegularFile(e, n, s, r) {
  let f;
  try {
    f = await open(e, readOnlyNoFollowFlags());
    let stats = await f.stat();
    if (stats.dev !== n)
      return {
        reason: "file_on_other_device",
      };
    if (!stats.isFile())
      return {
        reason: "not_a_file",
      };
    if (stats.size > s)
      return {
        reason: "too_large",
      };
    return await r(f, stats);
  } catch (error) {
    return toReadFailure(error);
  } finally {
    await f?.close().catch(() => {});
  }
}
//@ chunk-f9asxqh1.js:27722-27898 placement
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
//@ chunk-f9asxqh1.js:27898-28297 placement
/**
 * 把服务端技能记录转成内部行：id、名称、描述、来源、更新时间，以及可选的背后插件 id、是否用户可调用、是否禁用模型调用。
 */
function toSkillRow(e) {
  return {
    skillId: e.id,
    name: e.name,
    description: e.description ?? "",
    source: e.source ?? "custom",
    updatedAt: e.updated_at ?? null,
    ...(typeof e.backing_plugin_id === "string" &&
      isServerPluginId(e.backing_plugin_id) && {
        backingPluginId: e.backing_plugin_id,
      }),
    ...(e.user_invocable != null && {
      userInvocable: e.user_invocable === true,
    }),
    ...(e.disable_model_invocation != null && {
      disableModelInvocation: e.disable_model_invocation !== false,
    }),
  };
}
//@ chunk-f9asxqh1.js:28297-28630 placement
/**
 * 根据技能元数据判断归属：anthropic、共享、组织、自己或他人。
 */
function getSkillOwnership(e) {
  if (typeof e.creator_type !== "string") return;
  if (e.creator_type === "anthropic") return "anthropic";
  if (e.is_shared === true) return "shared";
  if (e.partition_by === "organization") return "org";
  let n = e.partition_by === "account";
  if (typeof e.backing_plugin_id === "string") return n ? "own" : "other";
  return n || e.partition_by == null ? "own" : "other";
}
//@ chunk-f9asxqh1.js:28630-28668 placement
/**
 * 判断技能行是否启用（enabled 不为 false）。
 */
function isSkillEnabled(e) {
  return e.enabled !== false;
}
//@ chunk-f9asxqh1.js:28668-28694 placement
var COLLISION_LOSER = "collision-loser";
export {
  isHostMountWorkStale,
  runHostMountWorkExclusive,
  resolvePublicCatalogRoot,
  readMountedSkillMd,
  COLLISION_LOSER,
  HOST_SKILLS_MOUNT,
  PUBLIC,
  readRegularFileText,
  probeOneMountKind,
  flattenMountMissCounts,
  getSkillOwnership,
  isSkillEnabled,
  toSkillRow,
  indexHostMountKinds,
  recordMountMiss,
  hostMountKindForRow,
  createHostSkillReader,
};
