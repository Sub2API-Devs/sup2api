/**
 * bridge/fetchAttachment.ts
 *
 * 下载会话附件（文件名校验、仅第一方 API）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zffzzkds.js (2)
 * attribution: placement 2
 */
import { mkdir, lstat, rm } from "fs/promises";
import { posix } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  booleanSchema,
  objectSchema,
  _enum,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE } from "../utils/commitAttribution.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getStageFileRoot } from "../utils/stageFileRoots.js";
import { env } from "../utils/env.js";
import { retryFsOp } from "../utils/atomicPublishWrite.js";

//@ chunk-zffzzkds.js:1207-1483 placement
/**
 * 附件下载请求的 zod 结构 {file_uuid, name, keep_existing}；同一声明里的 j 是结果结构 {outcome, reason}。
 */
var fetchAttachmentInputSchema = DoctorLazy(() =>
  zodStrictObject({
    file_uuid: stringSchema().min(1).max(256),
    name: stringSchema().min(1),
    keep_existing: booleanSchema().optional(),
  }),
);
var fetchAttachmentOutputSchema = DoctorLazy(() =>
  objectSchema({
    outcome: _enum(["placed", "kept", "too_large", "failed"]),
    reason: stringSchema()
      .regex(/^[a-z_]{1,32}$/)
      .optional(),
    sha256: stringSchema().regex(SHA256_HEX_RE).optional(),
    size: numberSchema().int().nonnegative().optional(),
  }),
);
//@ chunk-zffzzkds.js:1483-3900 placement
/**
 * 下载会话附件：校验文件名、只在第一方 API 提供方下可用
 */
async function fetchSessionAttachment(
  input,
  signal,
  { heldDirectory, isPlaceableName, placeUnlessFileStands, refuseLinkToNetworkPath },
) {
  let request = fetchAttachmentInputSchema().parse(input);
  if (!isPlaceableName(request.name))
    throw Error(
      'name must be a file name of at most 255 bytes, with no directory, that does not begin with ".stage-tmp."',
    );
  if (getAPIProvider() !== "firstParty")
    return {
      summary: "not downloaded: not permitted on this API provider",
      output: {
        outcome: "failed",
        reason: "not_first_party",
      },
    };
  let stageFileRoot = getStageFileRoot();
  await refuseLinkToNetworkPath(stageFileRoot);
  await mkdir(stageFileRoot, {
    recursive: true,
  });
  await using holding = await heldDirectory(stageFileRoot);
  let joined = posix.join(holding.path, request.name);
  if (
    request.keep_existing &&
    (await lstat(joined).then(
      (stat) => stat.isFile(),
      () => false,
    ))
  )
    return {
      summary: "left the file that was there",
      output: {
        outcome: "kept",
      },
    };
  let [
    { DOWNLOAD_TRIES: tries, downloadWithRetries },
    { openSpill },
    { getBridgeAccessToken, getBridgeBaseUrlOverride, isBridgeFileLoginRefused },
    { settleStoredLoginRefusal },
  ] = await Promise.all([
    import("./inboundAttachments.js"),
    import("./inboundAttachmentSpill.js"),
    import("./bridgeConfig.js"),
    import("../utils/auth/storedLoginRefused.js"),
  ]);
  await settleStoredLoginRefusal();
  if (isBridgeFileLoginRefused())
    return {
      summary: "not downloaded (reason code: stored_login_refused)",
      output: {
        outcome: "failed",
        reason: "stored_login_refused",
      },
    };
  let abortController = new AbortController();
  let onAbort = () => abortController.abort();
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  if (signal.aborted) onAbort();
  let download = await downloadWithRetries(
    request.keep_existing ? tries.noTurn : tries.startsTurn,
    0,
    abortController,
    undefined,
    {
      fileUuid: request.file_uuid,
      baseUrl: getBridgeBaseUrlOverride() ?? env.ANTHROPIC_BASE_URL,
      modelCopy: false,
      forPrefetch: false,
      maxBytes: 0,
      spillTo: () =>
        openSpill(
          {
            at: holding.path,
            release: async () => {},
          },
          posix.join(stageFileRoot, request.name),
          292,
        ),
      token: getBridgeAccessToken,
      admitBytes: () => true,
    },
  );
  signal.removeEventListener("abort", onAbort);
  if ("failure" in download)
    return download.failure === "too_large"
      ? {
          summary: "not downloaded: over 500 MiB",
          output: {
            outcome: "too_large",
          },
        }
      : {
          summary: `not downloaded (reason code: ${download.failure})`,
          output: {
            outcome: "failed",
            reason: download.failure,
          },
        };
  if ("writeFailed" in download)
    return {
      summary: "not placed: a write to disk failed",
      output: {
        outcome: "failed",
        reason: "write",
      },
    };
  if ("data" in download)
    return {
      summary: "not placed: the file is empty",
      output: {
        outcome: "failed",
        reason: "empty",
      },
    };
  try {
    signal.throwIfAborted();
    let stat = await lstat(download.file.path);
    if (`${stat.dev}:${stat.ino}` !== download.file.identity)
      return {
        summary: "not placed: the downloaded file was replaced",
        output: {
          outcome: "failed",
          reason: "replaced",
        },
      };
    if (!request.keep_existing) await retryFsOp(download.file.path, joined);
    else if (!(await placeUnlessFileStands(download.file.path, joined)))
      return {
        summary: "left the file that was there",
        output: {
          outcome: "kept",
        },
      };
    return {
      summary: `placed ${download.file.size} bytes`,
      output: {
        outcome: "placed",
        sha256: download.file.sha256,
        size: download.file.size,
      },
    };
  } finally {
    await rm(download.file.path, {
      force: true,
    }).catch(() => {});
  }
}
export { fetchSessionAttachment };
