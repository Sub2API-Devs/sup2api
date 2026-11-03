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
import { join, join as join_2 } from "path";
import { lstat, realpath, open, open as open_2 } from "fs/promises";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { isSafeSkillName } from "./syncedSkills.js";
import { remoteToolsState } from "../remote/tools/callResults.js";
import { isCoworkWithRemote, hasRemoteSessionOrControl } from "../utils/sessionShape.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { zq, $c } from "../utils/platformTargets.js";
import { limitConcurrency } from "../utils/concurrencyLimit.js";
import { withDeadline } from "../utils/sleep.js";
import { getErrnoCode } from "../utils/errors.js";
import { L5r } from "../services/plugins/accountSync/sessionSkillManifest.js";
import { By } from "../services/plugins/accountSync/pluginsScopeGate.js";
import { isServerPluginId } from "../utils/plugins/pluginAttribution.js";

/**
 * 宿主技能挂载的常量：挂载根 /mnt/skills、公共/示例来源映射、读取预算、文件大小上限、新鲜度容差、时间格式正则。
 */
//@ chunk-f9asxqh1.js:23651-23814 placement
var HOST_SKILLS_MOUNT = "/mnt/skills",
  MOUNT_SOURCES = { public: "anthropic", examples: "anthropic-example" },
  PUBLIC = "public",
  HOST_MOUNT_BUDGET_MS = 3000,
  MAX_SKILL_ZIP_BYTES = 33554432,
  MOUNT_FRESHNESS_SLACK_MS = 600000,
  ISO_TIME_RE = /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/;
/**
 * 记录一次宿主技能挂载未命中（按原因计数并写诊断日志）。
 */
//@ chunk-f9asxqh1.js:23814-23927 placement
function recordMountMiss(e, n, s) {
  (s.set(n.reason, (s.get(n.reason) ?? 0) + 1),
    logForDiagnosticsNoPII("info", "skills_sync_host_mount_miss", { kind: e, ...n }));
}
//@ chunk-f9asxqh1.js:23927-24015 placement
function hrr(e) {
  return Object.fromEntries(Array.from(e, ([n, s]) => [`mount_miss_${n}`, s]));
}
//@ chunk-f9asxqh1.js:24015-24215 placement
function getHostMountKind(e) {
  if (e.creator_type !== "anthropic" || e.id !== e.name || !isSafeSkillName(e.name)) return;
  if (e.source === MOUNT_SOURCES.public) return "public";
  return e.source === MOUNT_SOURCES.examples && e.is_public_provisioned === !0 ? "examples" : void 0;
}
/**
 * 为宿主挂载的技能建立 id→挂载类型的索引。
 */
//@ chunk-f9asxqh1.js:24215-24325 placement
function indexHostMountKinds(e) {
  let { hostMountKinds: hostMountKinds } = remoteToolsState();
  hostMountKinds.clear();
  for (let s of e) {
    let r = getHostMountKind(s);
    if (r !== void 0) hostMountKinds.set(s.id, r);
  }
}
//@ chunk-f9asxqh1.js:24325-24401 placement
function xe() {
  return (
    (isCoworkWithRemote() ||
      (hasRemoteSessionOrControl() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bright_fog", !0) !== !1)) &&
    zq() !== 0
  );
}
//@ chunk-f9asxqh1.js:24401-24462 placement
function nii(e) {
  let n = matchHostMountKind(e);
  return n !== void 0 && xe() ? n : void 0;
}
//@ chunk-f9asxqh1.js:24462-24612 placement
function matchHostMountKind(e) {
  let n = remoteToolsState().hostMountKinds.get(e.skillId);
  return n !== void 0 &&
    e.name === e.skillId &&
    e.source === MOUNT_SOURCES[n] &&
    e.requestedVersion === void 0
    ? n
    : void 0;
}
/**
 * 在时间预算内探测宿主技能挂载（各类目录是否为独立挂载设备），返回按 kind 读取技能 zip 的读取器（文件须比服务端记录新且为 zip），并记录花费/等待时间；不适用时返回 null。
 */
//@ chunk-f9asxqh1.js:24612-25026 placement
async function createHostSkillReader(e, n) {
  if (!xe()) return null;
  let s = { deadline: performance.now() + HOST_MOUNT_BUDGET_MS, spentMs: 0, waitedMs: 0 },
    r = await runHostMountWork(s, () => probeMountKinds(e)),
    f = limitConcurrency(1, (y, S, h) => runHostMountWork(s, () => readMountedSkillZip(y, S, h)));
  return {
    async readZip(y, S) {
      let h = "reason" in r ? r : (r.get(y) ?? z),
        w =
          "reason" in h ? h : await f(join_2(HOST_SKILLS_MOUNT, y, `${S.name}.skill`), S.updatedAt, h.device);
      if ("zip" in w) return w.zip;
      recordMountMiss(y, w, n);
      return;
    },
    spentMs: () => Math.round(s.spentMs),
    waitedMs: () => Math.round(s.waitedMs),
  };
}
/**
 * 在预算内执行一项宿主挂载工作：先等待正在进行的目录类工作（有上限），仍有未完成工作或预算耗尽时返回原因，否则执行并在截止前取结果。
 */
//@ chunk-f9asxqh1.js:25026-25599 placement
async function runHostMountWork(budget, work) {
  let state = remoteToolsState();
  while (state.hostMountWorkOutstanding !== null && state.hostMountWorkIsCatalogs) {
    let hostMountWorkOutstanding = state.hostMountWorkOutstanding,
      startTime = performance.now(),
      waitMs = Math.min(budget.deadline, state.hostMountWorkStartedAt + HOST_MOUNT_BUDGET_MS) - startTime;
    if (waitMs > 0)
      (await withDeadline(
        hostMountWorkOutstanding.catch(() => {}),
        waitMs,
      ),
        (budget.waitedMs += performance.now() - startTime));
    if (state.hostMountWorkOutstanding === hostMountWorkOutstanding) break;
  }
  let startTime = performance.now();
  if (state.hostMountWorkOutstanding !== null) return { reason: "earlier_work_outstanding" };
  if (startTime >= budget.deadline) return { reason: "budget_spent" };
  let pendingWork = trackHostMountWork(state, work, startTime, !1),
    result = await withDeadline(pendingWork, budget.deadline - startTime);
  return ((budget.spentMs += performance.now() - startTime), result ?? { reason: "timed_out" });
}
/**
 * 等待其他宿主挂载工作完成后独占执行本次工作。
 */
//@ chunk-f9asxqh1.js:25599-25830 placement
async function runHostMountWorkExclusive(e) {
  let n = remoteToolsState();
  while (n.hostMountWorkOutstanding !== null) {
    let hostMountWorkOutstanding = n.hostMountWorkOutstanding;
    if (
      (await hostMountWorkOutstanding.catch(() => {}),
      n.hostMountWorkOutstanding === hostMountWorkOutstanding)
    )
      n.hostMountWorkOutstanding = null;
  }
  return trackHostMountWork(n, e, performance.now(), !0);
}
/**
 * 判断进行中的宿主挂载工作是否已超时。
 */
//@ chunk-f9asxqh1.js:25830-25945 placement
function isHostMountWorkStale() {
  let e = remoteToolsState();
  return (
    e.hostMountWorkOutstanding !== null &&
    performance.now() - e.hostMountWorkStartedAt >= HOST_MOUNT_BUDGET_MS
  );
}
//@ chunk-f9asxqh1.js:25945-26159 placement
function trackHostMountWork(e, n, s, r) {
  let f = n();
  ((e.hostMountWorkOutstanding = f), (e.hostMountWorkStartedAt = s), (e.hostMountWorkIsCatalogs = r));
  let y = () => {
    if (e.hostMountWorkOutstanding === f) e.hostMountWorkOutstanding = null;
  };
  return (f.then(y, y), f);
}
//@ chunk-f9asxqh1.js:26159-26188 placement
var z = { reason: "not_a_mount" };
//@ chunk-f9asxqh1.js:26188-26454 placement
async function probeMountKinds(e) {
  let n = await lstat(HOST_SKILLS_MOUNT).catch(toProbeFailure),
    s = "reason" in n || n.isDirectory() ? n : z,
    r = new Map();
  for (let f of e) {
    if ("reason" in s) {
      r.set(f, s);
      continue;
    }
    let y = await lstat(join_2(HOST_SKILLS_MOUNT, f)).catch(toProbeFailure);
    r.set(f, "reason" in y ? y : y.isDirectory() && y.dev !== s.dev ? { device: y.dev } : z);
  }
  return r;
}
//@ chunk-f9asxqh1.js:26454-26562 placement
function toProbeFailure(e) {
  let n = getErrnoCode(e);
  return n === "ENOENT" ? { reason: "no_mount" } : { reason: "probe_failed", code: n ?? "unknown" };
}
//@ chunk-f9asxqh1.js:26562-26842 placement
function readMountedSkillZip(e, n, s) {
  return withOpenedRegularFile(e, s, MAX_SKILL_ZIP_BYTES, async (r, f) => {
    let y = n !== null && ISO_TIME_RE.test(n) ? Date.parse(n) : Number.NaN;
    if (Number.isNaN(y)) return { reason: "row_date_unreadable" };
    if (f.mtimeMs <= y + MOUNT_FRESHNESS_SLACK_MS) return { reason: "not_newer_than_row" };
    let content = await r.readFile();
    return L5r(content) ? { zip: content } : { reason: "not_zip" };
  });
}
//@ chunk-f9asxqh1.js:26842-26905 placement
async function K5o(e) {
  return (await probeMountKinds(new Set([e]))).get(e) ?? z;
}
/**
 * 解析公共技能目录的根（设备与真实路径），失败时写诊断日志并返回原因。
 */
//@ chunk-f9asxqh1.js:26905-27093 placement
async function resolvePublicCatalogRoot() {
  let e = await K5o(PUBLIC),
    n =
      "reason" in e
        ? e
        : await realpath(join_2(HOST_SKILLS_MOUNT, PUBLIC)).then(
            (s) => ({ device: e.device, root: s }),
            toProbeFailure,
          );
  if ("reason" in n) logForDiagnosticsNoPII("warn", "skill_host_catalog_not_read", n);
  return n;
}
/**
 * 读取挂载技能目录中的 SKILL.md（优先缓存/特殊读取，否则作为普通文件读取），返回文本与路径或失败原因。
 */
//@ chunk-f9asxqh1.js:27093-27235 placement
async function readMountedSkillMd(e, n, s) {
  let r = join_2(e, n, "SKILL.md"),
    f = (await checkNotSymlink(r)) ?? (await readRegularFileText(r, s, By));
  return "reason" in f ? f : ((await checkNotSymlink(r)) ?? { text: f.text, filePath: r });
}
//@ chunk-f9asxqh1.js:27235-27337 placement
async function checkNotSymlink(e) {
  try {
    return (await realpath(e)) === e ? void 0 : { reason: "file_is_link" };
  } catch (error) {
    return toReadFailure(error);
  }
}
/**
 * 安全读取文本文件：同一设备、普通文件、大小不超过上限，否则返回原因。
 */
//@ chunk-f9asxqh1.js:27337-27430 placement = readJsonFile (0.83)
function readRegularFileText(e, n, s) {
  return withOpenedRegularFile(e, n, s, async (r) => ({ text: await r.readFile({ encoding: "utf-8" }) }));
}
/**
 * 打开文件并做 dev/isFile/size 检查后交给回调，最后关闭。
 */
//@ chunk-f9asxqh1.js:27430-27722 placement
async function withOpenedRegularFile(e, n, s, r) {
  let f;
  try {
    f = await open_2(e, $c());
    let stats = await f.stat();
    if (stats.dev !== n) return { reason: "file_on_other_device" };
    if (!stats.isFile()) return { reason: "not_a_file" };
    if (stats.size > s) return { reason: "too_large" };
    return await r(f, stats);
  } catch (error) {
    return toReadFailure(error);
  } finally {
    await f?.close().catch(() => {});
  }
}
//@ chunk-f9asxqh1.js:27722-27898 placement
function toReadFailure(e) {
  let n = getErrnoCode(e);
  switch (n) {
    case "ENOENT":
      return { reason: "file_absent" };
    case "ELOOP":
      return { reason: "file_is_link" };
    default:
      return { reason: "read_failed", code: n ?? "unknown" };
  }
}
/**
 * 把服务端技能记录转成内部行：id、名称、描述、来源、更新时间，以及可选的背后插件 id、是否用户可调用、是否禁用模型调用。
 */
//@ chunk-f9asxqh1.js:27898-28297 placement
function toSkillRow(e) {
  return {
    skillId: e.id,
    name: e.name,
    description: e.description ?? "",
    source: e.source ?? "custom",
    updatedAt: e.updated_at ?? null,
    ...(typeof e.backing_plugin_id === "string" &&
      isServerPluginId(e.backing_plugin_id) && { backingPluginId: e.backing_plugin_id }),
    ...(e.user_invocable != null && { userInvocable: e.user_invocable === !0 }),
    ...(e.disable_model_invocation != null && { disableModelInvocation: e.disable_model_invocation !== !1 }),
  };
}
/**
 * 根据技能元数据判断归属：anthropic、共享、组织、自己或他人。
 */
//@ chunk-f9asxqh1.js:28297-28630 placement
function getSkillOwnership(e) {
  if (typeof e.creator_type !== "string") return;
  if (e.creator_type === "anthropic") return "anthropic";
  if (e.is_shared === !0) return "shared";
  if (e.partition_by === "organization") return "org";
  let n = e.partition_by === "account";
  if (typeof e.backing_plugin_id === "string") return n ? "own" : "other";
  return n || e.partition_by == null ? "own" : "other";
}
//@ chunk-f9asxqh1.js:28630-28668 placement
function lii(e) {
  return e.enabled !== !1;
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
  K5o,
  hrr,
  getSkillOwnership,
  lii,
  toSkillRow,
  indexHostMountKinds,
  recordMountMiss,
  nii,
  createHostSkillReader,
};
