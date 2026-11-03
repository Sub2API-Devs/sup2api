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
import { getJobsDir, readCappedStorageText, jobPinsState } from "../../services/daemon/jobState.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { writeFileAtomic, writeAndPublishSync } from "../../utils/atomicPublishWrite.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, array, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { getRootSession } from "../../bootstrap/state.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";

//@ chunk-3z29138t.js:699-724 placement
var DRAFT_TTL_MS = 86400000;
var DRAFT_MAX_BYTES = 8388608;
//@ chunk-3z29138t.js:724-792 placement
function shortHash(t) {
  return createHash("sha256").update(t).digest("hex").slice(0, 8);
}
//@ chunk-3z29138t.js:792-838 placement
function draftFileName(t) {
  return join(getJobsDir(), `.draft-${shortHash(t)}`);
}
//@ chunk-3z29138t.js:838-883 placement
function withTimestamp(t) {
  return jsonStringify({
    ...t,
    ts: Date.now(),
  });
}
//@ chunk-3z29138t.js:883-926 placement
/**
 * 函数 sweepDraft（执行一次草稿清理）。
 */
async function sweepDraft(canonicalLauncherCwd, r, storageV5) {
  await writeJobDraft(canonicalLauncherCwd, r, storageV5);
}
//@ chunk-3z29138t.js:926-1171 placement
/**
 * 保存作业草稿：storage v5 写入 jobDraft 空间（原子发布），否则写到 jobs 目录；成功返回 true。
 */
async function writeJobDraft(t, r, e) {
  if (isStorageV5Enabled() && e)
    return (
      (
        await e
          .write(STORAGE_SPACES.jobDraft(shortHash(t)), withTimestamp(r), {
            publishDiscipline: "atomic",
            mode: 438 & ~process.umask(),
          })
          .catch(() => {
            return;
          })
      )?.ok === true
    );
  try {
    await mkdir(getJobsDir(), {
      recursive: true,
    });
    await writeFileAtomic(draftFileName(t), withTimestamp(r));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-3z29138t.js:1171-1215 placement
/**
 * 函数 writeDraftBestEffort（写草稿并吞错误）。
 */
function writeDraftBestEffort(canonicalLauncherCwd, r) {
  try {
    writeAndPublishSync(draftFileName(canonicalLauncherCwd), withTimestamp(r));
  } catch {}
}
//@ chunk-3z29138t.js:1215-1328 placement
/**
 * 删除作业草稿（存储后端或本地文件），错误忽略。
 */
async function deleteJobDraft(t, r) {
  if (r) {
    await r.delete(STORAGE_SPACES.jobDraft(shortHash(t))).catch(() => {});
    return;
  }
  await unlink(draftFileName(t)).catch(() => {});
}
//@ chunk-3z29138t.js:1328-1387 placement
var DraftSchema = DoctorLazy(() =>
  u({
    q: string(),
    collapsed: array(string()).optional(),
    ts: E(),
  }),
);
//@ chunk-3z29138t.js:1387-1621 placement
/**
 * 读取作业草稿 {q, collapsed}：解析失败或超过一天返回 undefined。
 */
async function readJobDraft(t, storageV5) {
  let e = storageV5
    ? await screenDraftFile(storageV5, t)
    : await readSmallFileOrNull(draftFileName(t), DRAFT_MAX_BYTES);
  if (e === null) return;
  let a;
  try {
    a = DraftSchema().safeParse(jsonParse(e));
  } catch {
    return;
  }
  if (!a.success) return;
  let { q: i, collapsed, ts } = a.data;
  if (Date.now() - ts > DRAFT_TTL_MS) return;
  return {
    q: i,
    collapsed: collapsed ?? [],
  };
}
//@ chunk-3z29138t.js:1621-1710 placement
async function screenDraftFile(t, r) {
  return readCappedStorageText(t, STORAGE_SPACES.jobDraft(shortHash(r)), {
    cap: DRAFT_MAX_BYTES,
    screens: draftSetForHost(),
    screenKey: draftFileName(r),
  });
}
//@ chunk-3z29138t.js:1710-1754 placement
function draftSetForHost() {
  return jobPinsState.of(getRootSession().host).drafts;
}
//@ chunk-3z29138t.js:1754-2114 placement
/**
 * 清理过期的 job 草稿文件。
 */
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
          let a = join(getJobsDir(), e);
          let smallFileOrNull = await readSmallFileOrNull(a, DRAFT_MAX_BYTES);
          if (smallFileOrNull !== null)
            try {
              let s = DraftSchema().safeParse(jsonParse(smallFileOrNull));
              if (s.success && now - s.data.ts <= DRAFT_TTL_MS) return;
            } catch {}
          await rm(a, {
            recursive: true,
            force: true,
          }).catch(() => {});
        }),
    );
  });
}
export { sweepJobDrafts, readJobDraft, sweepDraft, writeJobDraft, writeDraftBestEffort, deleteJobDraft };
