/**
 * services/ccrMcp/stagedMcpCall.ts
 *
 * 2.1.316 新增：校验请求、准备输入输出文件路径后执行 MCP 调用（Windows 不支持）；执行 CCR 暂存的 MCP 调用并上报结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tcnfdqpw.js (10)
 * attribution: placement 10
 */
import { posix } from "path";
import { mkdir, mkdtemp, rm, realpath, writeFile, open } from "fs/promises";
import { constants } from "fs";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  relUnderSyncDir,
  WORKING_FILESTORE_PREFIX,
  DIR_SYNC_LANE_RESERVED,
  readLaneRowFromWorker,
  MAX_WORKING_FILE_BYTES,
  writeLaneRowFromWorker,
  SYNCED_FILE_ROOT,
} from "../syncedFiles/syncedFileSyncer.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage, getErrnoCode, isENOENT } from "../../utils/errors.js";
import { isSeedPath } from "../../utils/teleport/seedPaths.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { SDKMcpCallMcpCallMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { getPlatform } from "../../utils/platform.js";
import { parseIsoTimestamp } from "../../utils/parseIsoTimestamp.js";
import { pluginToolStagingRoot, PLUGIN_TOOL_STAGING_GUARD_FLAG } from "../../utils/tempDir.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { writeNewFileExclusive } from "../../utils/tempFiles.js";
import { createAbortController } from "../../utils/abortController.js";

//@ chunk-tcnfdqpw.js:4116-4270 placement
/**
 * 客户端取消时返回给模型的错误文本。
 */
var { dirname, extname, join, relative } = posix;
var DEFAULT_STAGING_TIMEOUT_MS = 120000;
var MAX_STAGING_TIMEOUT_MS = 600000;
var MIN_STAGING_TIMEOUT_MS = 1000;
var MAX_ERROR_DETAIL_CHARS = 2000;
var LANE_TEMPLATE_RE = /^\{\{(in|out):([A-Za-z0-9_-]{1,64})\}\}$/;
var CANCELLED_BY_CLIENT_MESSAGE = "cancelled by client";
//@ chunk-tcnfdqpw.js:4270-4332 placement
/**
 * 构造暂存调用失败的返回值（staging + telemetryCode）。
 */
function stagingErrorResult(errorCode, detail, retryable, telemetryCode) {
  return {
    staging: stagingError(errorCode, detail, retryable),
    telemetryCode,
  };
}
//@ chunk-tcnfdqpw.js:4332-4497 placement
function collectLanePathRefs(value, refs) {
  if (typeof value === "string") {
    if (LANE_TEMPLATE_RE.test(value)) refs.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (let item of value) collectLanePathRefs(item, refs);
    return;
  }
  if (isPlainObject(value))
    for (let objectValue of Object.values(value)) collectLanePathRefs(objectValue, refs);
}
//@ chunk-tcnfdqpw.js:4497-4667 placement
function substituteLanePaths(value, tokens) {
  if (typeof value === "string") {
    if (LANE_TEMPLATE_RE.test(value)) return tokens.get(value) ?? value;
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => substituteLanePaths(item, tokens));
  if (isPlainObject(value)) return import_mapValues(value, (value) => substituteLanePaths(value, tokens));
  return value;
}
//@ chunk-tcnfdqpw.js:4667-4735 placement
/**
 * 取安全的文件扩展名：只接受 1–8 位字母数字，否则空串。
 */
function safeExtname(lanePath) {
  let ext = extname(lanePath);
  return /^\.[A-Za-z0-9]{1,8}$/.test(ext) ? ext : "";
}
//@ chunk-tcnfdqpw.js:4735-4983 placement
function resolveLanePath(kind, path) {
  let relPath;
  try {
    relPath = relUnderSyncDir(WORKING_FILESTORE_PREFIX, path);
  } catch (error) {
    return {
      refused: stagingErrorResult(
        "tool_error",
        `invalid ${kind} lane_path ${jsonStringify(path)}: ${errorMessage(error)}`,
      ),
    };
  }
  if (isSeedPath(relPath))
    return {
      refused: stagingErrorResult(
        "tool_error",
        `invalid ${kind} lane_path ${jsonStringify(path)}: ${DIR_SYNC_LANE_RESERVED}`,
        undefined,
        "lane_path_reserved",
      ),
    };
  return {
    rel: relPath,
  };
}
//@ chunk-tcnfdqpw.js:4983-5301 placement
/**
 * 执行 CCR 暂存的 MCP 调用并上报结果。
 */
async function runStagedMcpCall(request, options) {
  let staging;
  let tool;
  let telemetryCode;
  try {
    let staged = await stageMcpCall(request, options);
    staging = staged.staging;
    tool = staged.tool;
    telemetryCode = staged.telemetryCode;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    staging = stagingError("tool_error", `unexpected failure: ${errnoCode ?? errorMessage(error)}`);
  }
  if (options.signal?.aborted)
    return {
      staging,
      tool,
    };
  if (staging.ok) logFeatureOk("ccr_mcp_call_staged");
  else logFeatureBad("ccr_mcp_call_staged", telemetryCode ?? staging.error_code);
  return {
    staging,
    tool,
  };
}
//@ chunk-tcnfdqpw.js:5301-5428 placement
function stagingError(errorCode, detail, retryable) {
  return {
    ok: false,
    error_code: errorCode,
    detail: detail.slice(0, MAX_ERROR_DETAIL_CHARS).replace(/[\uD800-\uDBFF]$/, ""),
    ...(retryable !== undefined && {
      retryable,
    }),
  };
}
//@ chunk-tcnfdqpw.js:5428-5629 placement
function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((item) =>
        item !== null && typeof item === "object" && "text" in item && typeof item.text === "string"
          ? item.text
          : "",
      )
      .filter(Boolean).join(`
`);
  return "";
}
//@ chunk-tcnfdqpw.js:5629-11088 placement
/**
 * 校验请求、准备输入输出文件路径后执行 MCP 调用（Windows 不支持）。
 */
async function stageMcpCall(request, options) {
  let parseResult = SDKMcpCallMcpCallMessageSchema().safeParse(request);
  if (!parseResult.success)
    return stagingErrorResult("tool_error", `invalid request: ${parseResult.error.message}`);
  let req = parseResult.data;
  if (getPlatform() === "windows")
    return stagingErrorResult("tool_error", "staged mcp_call is not supported on this platform");
  if (req.output_files !== undefined && req.expires_at === undefined)
    return stagingErrorResult(
      "tool_error",
      "invalid request: expires_at is required when output_files are declared",
    );
  if (req.expires_at !== undefined) {
    let isoTimestamp = parseIsoTimestamp(req.expires_at);
    if (Number.isNaN(isoTimestamp))
      return stagingErrorResult(
        "expired",
        `expires_at is not an RFC3339 timestamp with a zone: ${req.expires_at}`,
        undefined,
        "expires_at_unparseable",
      );
    if (Date.now() > isoTimestamp)
      return stagingErrorResult("expired", `request expired at ${req.expires_at}`);
  }
  let inputEntries = [];
  for (let fileSpec of req.input_files ?? []) {
    let lanePath = resolveLanePath("input", fileSpec.lane_path);
    if ("refused" in lanePath) return lanePath.refused;
    inputEntries.push({
      spec: fileSpec,
      rel: lanePath.rel,
    });
  }
  let outputEntries = [];
  let outputLaneOwner = new Map();
  for (let fileSpec of req.output_files ?? []) {
    let lanePath = resolveLanePath("output", fileSpec.lane_path);
    if ("refused" in lanePath) return lanePath.refused;
    let { rel } = lanePath;
    let firstLanePath = outputLaneOwner.get(rel);
    if (firstLanePath !== undefined)
      return stagingErrorResult(
        "tool_error",
        `duplicate output lane_path: ${fileSpec.lane_path} collides with ${firstLanePath}`,
      );
    outputLaneOwner.set(rel, fileSpec.lane_path);
    outputEntries.push({
      spec: fileSpec,
      rel,
    });
  }
  for (let [kind, specs] of [
    ["input", req.input_files ?? []],
    ["output", req.output_files ?? []],
  ]) {
    let seenNames = new Set();
    for (let { name } of specs) {
      if (seenNames.has(name)) return stagingErrorResult("tool_error", `duplicate ${kind} name: ${name}`);
      seenNames.add(name);
    }
  }
  let hasLanes = req.input_files !== undefined || req.output_files !== undefined;
  if (hasLanes) {
    let declaredTokens = new Set([
      ...inputEntries.map(({ spec }) => `{{in:${spec.name}}}`),
      ...outputEntries.map(({ spec }) => `{{out:${spec.name}}}`),
    ]);
    let referencedTokens = new Set();
    collectLanePathRefs(req.arguments ?? {}, referencedTokens);
    let filtered = [...referencedTokens].filter((token) => !declaredTokens.has(token));
    if (filtered.length > 0)
      return stagingErrorResult(
        "tool_error",
        `invalid request: args token names no declared file: ${filtered.join(", ")}`,
      );
    let mapped = outputEntries
      .filter(({ spec }) => !referencedTokens.has(`{{out:${spec.name}}}`))
      .map(({ spec }) => spec.name);
    if (mapped.length > 0)
      return stagingErrorResult(
        "tool_error",
        `invalid request: declared output not referenced by any {{out:NAME}} token in arguments: ${mapped.join(", ")}`,
      );
  }
  let stageDir;
  try {
    let root;
    if (options.tempRoot === undefined) root = pluginToolStagingRoot();
    else {
      root = options.tempRoot;
      await mkdir(root, {
        recursive: true,
        mode: 448,
      });
    }
    stageDir = await mkdtemp(join(root, "plugin-tool-"));
    await mkdir(join(stageDir, "in"), {
      mode: 448,
    });
    await mkdir(join(stageDir, "out"), {
      mode: 448,
    });
  } catch (error) {
    if (stageDir !== undefined)
      await rm(stageDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    let errnoCode = getErrnoCode(error);
    logForDiagnosticsNoPII("warn", "ptc_staging_unavailable", {
      code: errnoCode ?? "temp_dir_refused",
    });
    return stagingErrorResult("tool_error", `staging unavailable: ${errnoCode ?? "temp_dir_refused"}`);
  }
  let stagingRoot = stageDir;
  try {
    let pathTokens = new Map();
    let inputsUsed = [];
    for (let [index, { spec, rel: relPath }] of inputEntries.entries()) {
      if (options.signal?.aborted) return stagingErrorResult("tool_error", CANCELLED_BY_CLIENT_MESSAGE);
      let laneRowFromWorker = await readLaneRowFromWorker(relPath);
      if (laneRowFromWorker.kind === "not_found")
        return stagingErrorResult("input_missing", `input not found: ${spec.lane_path}`);
      if (laneRowFromWorker.kind === "error")
        return stagingErrorResult(
          "tool_error",
          `input fetch failed for ${spec.lane_path}: ${laneRowFromWorker.message}`,
          laneRowFromWorker.retryable,
        );
      let fileName = `${index}${safeExtname(spec.lane_path)}`;
      let destPath = join(stagingRoot, "in", fileName);
      try {
        if (
          readFlagWithOverride(PLUGIN_TOOL_STAGING_GUARD_FLAG, {
            safe: true,
          })
        ) {
          let pluginRoot = dirname(dirname(dirname(stagingRoot)));
          await writeNewFileExclusive(
            join(await realpath(pluginRoot), relative(pluginRoot, destPath)),
            laneRowFromWorker.buf,
          );
        } else
          await writeFile(destPath, laneRowFromWorker.buf, {
            mode: 384,
          });
      } catch (error) {
        return stagingErrorResult("tool_error", `input stage failed: ${getErrnoCode(error) ?? "unknown"}`);
      }
      pathTokens.set(`{{in:${spec.name}}}`, destPath);
      inputsUsed.push({
        lane_path: spec.lane_path,
        etag: laneRowFromWorker.content_sha256,
      });
    }
    let mapped = outputEntries.map(({ spec, rel }, index) => {
      let outPath = join(stagingRoot, "out", `${index}${safeExtname(spec.lane_path)}`);
      pathTokens.set(`{{out:${spec.name}}}`, outPath);
      return {
        spec,
        rel,
        path: outPath,
      };
    });
    let args = hasLanes
      ? import_mapValues(req.arguments ?? {}, (value) => substituteLanePaths(value, pathTokens))
      : (req.arguments ?? {});
    let min = Math.min(
      Math.max(req.timeout_ms ?? DEFAULT_STAGING_TIMEOUT_MS, MIN_STAGING_TIMEOUT_MS),
      MAX_STAGING_TIMEOUT_MS,
    );
    let abortController = createAbortController();
    let timedOut = false;
    let timer = setTimeout(() => {
      if (abortController.signal.aborted) return;
      timedOut = true;
      abortController.abort(Error("staged mcp_call timed out"));
    }, min);
    let onClientAbort = () => abortController.abort(options.signal?.reason);
    if (options.signal?.aborted) onClientAbort();
    else
      options.signal?.addEventListener("abort", onClientAbort, {
        once: true,
      });
    let toolResult;
    try {
      toolResult = await options.call(args, abortController.signal);
    } catch (error) {
      if (timedOut)
        return stagingErrorResult(
          "timeout",
          `tool did not complete within ${min}ms (${errorMessage(error)})`,
        );
      if (options.signal?.aborted)
        return stagingErrorResult("tool_error", `${CANCELLED_BY_CLIENT_MESSAGE} (${errorMessage(error)})`);
      return stagingErrorResult("tool_error", `tool call failed: ${errorMessage(error)}`);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onClientAbort);
    }
    if (toolResult.isError) {
      if (timedOut) return stagingErrorResult("timeout", `tool call exceeded ${min}ms`);
      if (options.signal?.aborted) return stagingErrorResult("tool_error", CANCELLED_BY_CLIENT_MESSAGE);
      let errorText = contentToText(toolResult.content);
      return stagingErrorResult("tool_error", errorText || "tool returned an error result");
    }
    let stagingRealRoot = await realpath(stagingRoot);
    let outputsUsed = [];
    for (let { spec, rel, path } of mapped) {
      if (options.signal?.aborted) return stagingErrorResult("tool_error", CANCELLED_BY_CLIENT_MESSAGE);
      let realOutPath;
      try {
        realOutPath = await realpath(path);
      } catch (error) {
        if (isENOENT(error))
          return stagingErrorResult("tool_error", `tool did not produce output: ${spec.name}`);
        return stagingErrorResult(
          "tool_error",
          `output read failed for ${spec.name}: ${getErrnoCode(error) ?? "unknown"}`,
        );
      }
      if (!realOutPath.startsWith(stagingRealRoot + "/"))
        return stagingErrorResult("tool_error", `output path escapes the staging dir: ${spec.name}`);
      let sizeCap = MAX_WORKING_FILE_BYTES;
      let outputBuf;
      try {
        let handle = await open(
          realOutPath,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
        try {
          let stats = await handle.stat();
          if (!stats.isFile())
            return stagingErrorResult("tool_error", `output is not a regular file: ${spec.name}`);
          if (stats.nlink > 1)
            return stagingErrorResult("tool_error", `output has multiple hard links: ${spec.name}`);
          if (stats.size > sizeCap)
            return stagingErrorResult(
              "output_too_large",
              `output ${spec.name} is ${stats.size} bytes (cap ${sizeCap})`,
            );
          let expectedSize = Number(stats.size);
          let readBuffer = Buffer.allocUnsafe(expectedSize + 1);
          let offset = 0;
          for (;;) {
            let { bytesRead } = await handle.read(readBuffer, offset, expectedSize + 1 - offset, offset);
            if (bytesRead === 0) break;
            offset += bytesRead;
          }
          if (offset !== expectedSize)
            return stagingErrorResult("tool_error", `output changed during collection: ${spec.name}`);
          outputBuf = readBuffer.subarray(0, offset);
        } finally {
          await handle.close();
        }
      } catch (error) {
        if (isENOENT(error))
          return stagingErrorResult("tool_error", `tool did not produce output: ${spec.name}`);
        return stagingErrorResult(
          "tool_error",
          `output read failed for ${spec.name}: ${getErrnoCode(error) ?? "unknown"}`,
        );
      }
      let writeResult = await writeLaneRowFromWorker(
        options.syncDir ?? SYNCED_FILE_ROOT,
        rel,
        outputBuf,
        spec.if_match,
      );
      if (!writeResult.ok)
        return stagingErrorResult(
          writeResult.reason === "too_large"
            ? "output_too_large"
            : writeResult.reason === "conflict"
              ? "output_conflict"
              : "tool_error",
          `output write failed for ${spec.lane_path}: ${writeResult.error}`,
          writeResult.retryable,
        );
      outputsUsed.push({
        lane_path: spec.lane_path,
        etag: writeResult.etag,
        bytes: outputBuf.length,
      });
    }
    logForDiagnosticsNoPII("info", "mcp_call_staged_ok", {
      inputs: inputsUsed.length,
      outputs: outputsUsed.length,
    });
    return {
      staging: {
        ok: true,
        outputs: outputsUsed,
        inputs_used: inputsUsed,
      },
      tool: {
        content: toolResult.content,
        structuredContent: toolResult.structuredContent,
        _meta: toolResult._meta,
      },
    };
  } finally {
    await rm(stagingRoot, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
export { runStagedMcpCall };
