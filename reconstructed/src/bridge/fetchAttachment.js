/**
 * bridge/fetchAttachment.ts
 *
 * 下载会话附件（文件名校验、仅第一方 API）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8rjc1mgh.js (2)
 * attribution: placement 2
 */
import { mkdir, lstat, rm } from "fs/promises";
import { posix } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { zodStrictObject, o, M, u, U } from "../../vendor/zod/v4/classic/schemas.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getStageFileRoot } from "../utils/stageFileRoots.js";
import { env } from "../utils/env.js";
import { retryFsOp } from "../utils/atomicPublishWrite.js";

/**
 * 附件下载请求的 zod 结构 {file_uuid, name, keep_existing}；同一声明里的 j 是结果结构 {outcome, reason}。
 */
//@ chunk-8rjc1mgh.js:1085-1289 placement
var fetchAttachmentInputSchema = DoctorLazy(() =>
    zodStrictObject({ file_uuid: o().min(1).max(256), name: o().min(1), keep_existing: M().optional() }),
  ),
  fetchAttachmentResultSchema = DoctorLazy(() =>
    u({
      outcome: U(["placed", "kept", "too_large", "failed"]),
      reason: o()
        .regex(/^[a-z_]{1,32}$/)
        .optional(),
    }),
  );
/**
 * 下载会话附件：校验文件名、只在第一方 API 提供方下可用
 */
//@ chunk-8rjc1mgh.js:1289-3668 placement
async function fetchSessionAttachment(
  y,
  r,
  {
    heldDirectory: heldDirectory,
    isPlaceableName: isPlaceableName,
    placeUnlessFileStands: placeUnlessFileStands,
    refuseLinkToNetworkPath: refuseLinkToNetworkPath,
  },
) {
  let parse = fetchAttachmentInputSchema().parse(y);
  if (!isPlaceableName(parse.name))
    throw Error(
      'name must be a file name of at most 255 bytes, with no directory, that does not begin with ".stage-tmp."',
    );
  if (getAPIProvider() !== "firstParty")
    return {
      summary: "not downloaded: not permitted on this API provider",
      output: { outcome: "failed", reason: "not_first_party" },
    };
  let a = getStageFileRoot();
  (await refuseLinkToNetworkPath(a), await mkdir(a, { recursive: !0 }));
  await using l = await heldDirectory(a);
  let joined = posix.join(l.path, parse.name);
  if (
    parse.keep_existing &&
    (await lstat(joined).then(
      (n) => n.isFile(),
      () => !1,
    ))
  )
    return { summary: "left the file that was there", output: { outcome: "kept" } };
  let [
    { DOWNLOAD_TRIES: d, downloadWithRetries: b },
    { openSpill: k },
    { getBridgeAccessToken: v, getBridgeBaseUrlOverride: x, isBridgeFileLoginRefused: z },
    { settleStoredLoginRefusal: T },
  ] = await Promise.all([
    import("./chunk-xth3wpgt.js"),
    import("./chunk-pw15vxqt.js"),
    import("./chunk-prxvet9q.js"),
    import("./chunk-4pp40e39.js"),
  ]);
  if ((await T(), z()))
    return {
      summary: "not downloaded (reason code: stored_login_refused)",
      output: { outcome: "failed", reason: "stored_login_refused" },
    };
  let abortController = new AbortController(),
    m = () => abortController.abort();
  if ((r.addEventListener("abort", m, { once: !0 }), r.aborted)) m();
  let e = await b(parse.keep_existing ? d.noTurn : d.startsTurn, 0, abortController, void 0, {
    fileUuid: parse.file_uuid,
    baseUrl: x() ?? env.ANTHROPIC_BASE_URL,
    modelCopy: !1,
    forPrefetch: !1,
    maxBytes: 0,
    spillTo: () => k({ at: l.path, release: async () => {} }, posix.join(a, parse.name), 292),
    token: v,
    admitBytes: () => !0,
  });
  if ((r.removeEventListener("abort", m), "failure" in e))
    return e.failure === "too_large"
      ? { summary: "not downloaded: over 500 MiB", output: { outcome: "too_large" } }
      : {
          summary: `not downloaded (reason code: ${e.failure})`,
          output: { outcome: "failed", reason: e.failure },
        };
  if ("writeFailed" in e)
    return { summary: "not placed: a write to disk failed", output: { outcome: "failed", reason: "write" } };
  if ("data" in e)
    return { summary: "not placed: the file is empty", output: { outcome: "failed", reason: "empty" } };
  try {
    r.throwIfAborted();
    let n = await lstat(e.file.path);
    if (`${n.dev}:${n.ino}` !== e.file.identity)
      return {
        summary: "not placed: the downloaded file was replaced",
        output: { outcome: "failed", reason: "replaced" },
      };
    if (!parse.keep_existing) await retryFsOp(e.file.path, joined);
    else if (!(await placeUnlessFileStands(e.file.path, joined)))
      return { summary: "left the file that was there", output: { outcome: "kept" } };
    return { summary: `placed ${e.file.size} bytes`, output: { outcome: "placed" } };
  } finally {
    await rm(e.file.path, { force: !0 }).catch(() => {});
  }
}
