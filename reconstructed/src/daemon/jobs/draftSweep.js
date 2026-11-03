/**
 * daemon/jobs/draftSweep.ts
 *
 * 2.1.316 新增：清理过期的 job 草稿文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3z29138t.js (13)
 * attribution: placement 13
 */
import { createHash } from "crypto";
import { join } from "path";
import { mkdir, unlink, readdir, rm } from "fs/promises";
import { getJobsDir, readCappedStorageText, JVr } from "../../services/daemon/jobState.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { writeFileAtomic, writeAndPublishSync } from "../../utils/atomicPublishWrite.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { getRootSession } from "../../bootstrap/state.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";

//@ chunk-3z29138t.js:699-724 placement
var l = 86400000,
  m = 8388608;
//@ chunk-3z29138t.js:724-792 placement
function c(t) {
  return createHash("sha256").update(t).digest("hex").slice(0, 8);
}
//@ chunk-3z29138t.js:792-838 placement
function n(t) {
  return join(getJobsDir(), `.draft-${c(t)}`);
}
//@ chunk-3z29138t.js:838-883 placement
function f(t) {
  return jsonStringify({ ...t, ts: Date.now() });
}
//@ chunk-3z29138t.js:883-926 placement
async function TVn(t, r, e) {
  await writeJobDraft(t, r, e);
}
/**
 * 保存作业草稿：storage v5 写入 jobDraft 空间（原子发布），否则写到 jobs 目录；成功返回 true。
 */
//@ chunk-3z29138t.js:926-1171 placement
async function writeJobDraft(t, r, e) {
  if (isStorageV5Enabled() && e)
    return (
      (
        await e
          .write(STORAGE_SPACES.jobDraft(c(t)), f(r), {
            publishDiscipline: "atomic",
            mode: 438 & ~process.umask(),
          })
          .catch(() => {
            return;
          })
      )?.ok === !0
    );
  try {
    return (await mkdir(getJobsDir(), { recursive: !0 }), await writeFileAtomic(n(t), f(r)), !0);
  } catch {
    return !1;
  }
}
//@ chunk-3z29138t.js:1171-1215 placement
function ZOo(t, r) {
  try {
    writeAndPublishSync(n(t), f(r));
  } catch {}
}
/**
 * 删除作业草稿（存储后端或本地文件），错误忽略。
 */
//@ chunk-3z29138t.js:1215-1328 placement
async function deleteJobDraft(t, r) {
  if (r) {
    await r.delete(STORAGE_SPACES.jobDraft(c(t))).catch(() => {});
    return;
  }
  await unlink(n(t)).catch(() => {});
}
//@ chunk-3z29138t.js:1328-1387 placement
var g = DoctorLazy(() => u({ q: o(), collapsed: A(o()).optional(), ts: E() }));
/**
 * 读取作业草稿 {q, collapsed}：解析失败或超过一天返回 undefined。
 */
//@ chunk-3z29138t.js:1387-1621 placement
async function readJobDraft(t, r) {
  let e = r ? await k(r, t) : await readSmallFileOrNull(n(t), m);
  if (e === null) return;
  let a;
  try {
    a = g().safeParse(jsonParse(e));
  } catch {
    return;
  }
  if (!a.success) return;
  let { q: i, collapsed: collapsed, ts: ts } = a.data;
  if (Date.now() - ts > l) return;
  return { q: i, collapsed: collapsed ?? [] };
}
//@ chunk-3z29138t.js:1621-1710 placement
async function k(t, r) {
  return readCappedStorageText(t, STORAGE_SPACES.jobDraft(c(r)), { cap: m, screens: P(), screenKey: n(r) });
}
//@ chunk-3z29138t.js:1710-1754 placement
function P() {
  return JVr.of(getRootSession().host).drafts;
}
/**
 * 清理过期的 job 草稿文件。
 */
//@ chunk-3z29138t.js:1754-2114 placement
async function sweepJobDrafts() {
  return withFeatureTelemetry("job_sweep_drafts", async () => {
    let t;
    try {
      t = await readdir(getJobsDir());
    } catch {
      return;
    }
    let now = Date.now();
    await Promise.all(
      t
        .filter((e) => e.startsWith(".draft-"))
        .map(async (e) => {
          let a = join(getJobsDir(), e),
            i = await readSmallFileOrNull(a, m);
          if (i !== null)
            try {
              let safeParse = g().safeParse(jsonParse(i));
              if (safeParse.success && now - safeParse.data.ts <= l) return;
            } catch {}
          await rm(a, { recursive: !0, force: !0 }).catch(() => {});
        }),
    );
  });
}

export { sweepJobDrafts, readJobDraft, TVn, writeJobDraft, ZOo, deleteJobDraft };
