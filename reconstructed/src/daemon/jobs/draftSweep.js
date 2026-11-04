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
import { objectSchema, stringSchema, array, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { getRootSession } from "../../bootstrap/state.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3z29138t.js:699-724 placement
var DRAFT_TTL_MS = 86400000;
var DRAFT_MAX_BYTES = 8388608;
//@ chunk-3z29138t.js:724-792 placement
function shortHash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}
//@ chunk-3z29138t.js:792-838 placement
function draftFileName(canonicalLauncherCwd) {
  return join(getJobsDir(), `.draft-${shortHash(canonicalLauncherCwd)}`);
}
//@ chunk-3z29138t.js:838-883 placement
function withTimestamp(draft) {
  return jsonStringify({
    ...draft,
    ts: Date.now(),
  });
}
//@ chunk-3z29138t.js:883-926 placement
/**
 * 函数 sweepDraft（执行一次草稿清理）。
 */
async function sweepDraft(canonicalLauncherCwd, draft, storageV5) {
  await writeJobDraft(canonicalLauncherCwd, draft, storageV5);
}
//@ chunk-3z29138t.js:926-1171 placement
/**
 * 保存作业草稿：storage v5 写入 jobDraft 空间（原子发布），否则写到 jobs 目录；成功返回 true。
 */
async function writeJobDraft(canonicalLauncherCwd, draft, storageV5) {
  if (isStorageV5Enabled() && storageV5)
    return (
      (
        await storageV5
          .write(STORAGE_SPACES.jobDraft(shortHash(canonicalLauncherCwd)), withTimestamp(draft), {
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
    await writeFileAtomic(draftFileName(canonicalLauncherCwd), withTimestamp(draft));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-3z29138t.js:1171-1215 placement
/**
 * 函数 writeDraftBestEffort（写草稿并吞错误）。
 */
function writeDraftBestEffort(canonicalLauncherCwd, draft) {
  try {
    writeAndPublishSync(draftFileName(canonicalLauncherCwd), withTimestamp(draft));
  } catch {}
}
//@ chunk-3z29138t.js:1215-1328 placement
/**
 * 删除作业草稿（存储后端或本地文件），错误忽略。
 */
async function deleteJobDraft(canonicalLauncherCwd, storageV5) {
  if (storageV5) {
    await storageV5.delete(STORAGE_SPACES.jobDraft(shortHash(canonicalLauncherCwd))).catch(() => {});
    return;
  }
  await unlink(draftFileName(canonicalLauncherCwd)).catch(() => {});
}
//@ chunk-3z29138t.js:1328-1387 placement
var DraftSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3z29138t.js:1328", () => {
  DraftSchema = DoctorLazy(() =>
    objectSchema({
      q: stringSchema(),
      collapsed: array(stringSchema()).optional(),
      ts: numberSchema(),
    }),
  );
});
//@ chunk-3z29138t.js:1387-1621 placement
/**
 * 读取作业草稿 {q, collapsed}：解析失败或超过一天返回 undefined。
 */
async function readJobDraft(canonicalLauncherCwd, storageV5) {
  let text = storageV5
    ? await screenDraftFile(storageV5, canonicalLauncherCwd)
    : await readSmallFileOrNull(draftFileName(canonicalLauncherCwd), DRAFT_MAX_BYTES);
  if (text === null) return;
  let parsed;
  try {
    parsed = DraftSchema().safeParse(jsonParse(text));
  } catch {
    return;
  }
  if (!parsed.success) return;
  let { q: prompt, collapsed, ts } = parsed.data;
  if (Date.now() - ts > DRAFT_TTL_MS) return;
  return {
    q: prompt,
    collapsed: collapsed ?? [],
  };
}
//@ chunk-3z29138t.js:1621-1710 placement
async function screenDraftFile(storageV5, canonicalLauncherCwd) {
  return readCappedStorageText(storageV5, STORAGE_SPACES.jobDraft(shortHash(canonicalLauncherCwd)), {
    cap: DRAFT_MAX_BYTES,
    screens: draftSetForHost(),
    screenKey: draftFileName(canonicalLauncherCwd),
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
    let entries;
    try {
      entries = await readdir(getJobsDir());
    } catch {
      return;
    }
    let now = Date.now();
    await Promise.all(
      entries
        .filter((name) => name.startsWith(".draft-"))
        .map(async (name) => {
          let filePath = join(getJobsDir(), name);
          let smallFileOrNull = await readSmallFileOrNull(filePath, DRAFT_MAX_BYTES);
          if (smallFileOrNull !== null)
            try {
              let parsed = DraftSchema().safeParse(jsonParse(smallFileOrNull));
              if (parsed.success && now - parsed.data.ts <= DRAFT_TTL_MS) return;
            } catch {}
          await rm(filePath, {
            recursive: true,
            force: true,
          }).catch(() => {});
        }),
    );
  });
}
export { sweepJobDrafts, readJobDraft, sweepDraft, writeJobDraft, writeDraftBestEffort, deleteJobDraft };
