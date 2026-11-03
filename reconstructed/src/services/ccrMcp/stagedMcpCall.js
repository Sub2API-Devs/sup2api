/**
 * services/ccrMcp/stagedMcpCall.ts
 *
 * 2.1.316 新增：校验请求、准备输入输出文件路径后执行 MCP 调用（Windows 不支持）；执行 CCR 暂存的 MCP 调用并上报结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-km6145cp.js (10)
 * attribution: placement 10
 */
import { posix } from "path";
import { mkdir, mkdtemp, rm, realpath, writeFile, open } from "fs/promises";
import { constants } from "fs";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-km6145cp.js:3808-3962 placement
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
//@ chunk-km6145cp.js:3962-4024 placement
/**
 * 构造暂存调用失败的返回值（staging + telemetryCode）。
 */
function stagingErrorResult(errorCode, t, retryable, telemetryCode) {
  return {
    staging: stagingError(errorCode, t, retryable),
    telemetryCode,
  };
}
//@ chunk-km6145cp.js:4024-4189 placement
function collectLanePathRefs(e, t) {
  if (typeof e === "string") {
    if (LANE_TEMPLATE_RE.test(e)) t.add(e);
    return;
  }
  if (Array.isArray(e)) {
    for (let n of e) collectLanePathRefs(n, t);
    return;
  }
  if (isPlainObject(e)) for (let n of Object.values(e)) collectLanePathRefs(n, t);
}
//@ chunk-km6145cp.js:4189-4359 placement
function substituteLanePaths(e, t) {
  if (typeof e === "string") {
    if (LANE_TEMPLATE_RE.test(e)) return t.get(e) ?? e;
    return e;
  }
  if (Array.isArray(e)) return e.map((n) => substituteLanePaths(n, t));
  if (isPlainObject(e)) return xr(e, (n) => substituteLanePaths(n, t));
  return e;
}
//@ chunk-km6145cp.js:4359-4427 placement
/**
 * 取安全的文件扩展名：只接受 1–8 位字母数字，否则空串。
 */
function safeExtname(lanePath) {
  let t = extname(lanePath);
  return /^\.[A-Za-z0-9]{1,8}$/.test(t) ? t : "";
}
//@ chunk-km6145cp.js:4427-4675 placement
function resolveLanePath(e, lanePath) {
  let n;
  try {
    n = relUnderSyncDir(WORKING_FILESTORE_PREFIX, lanePath);
  } catch (error) {
    return {
      refused: stagingErrorResult(
        "tool_error",
        `invalid ${e} lane_path ${jsonStringify(lanePath)}: ${errorMessage(error)}`,
      ),
    };
  }
  if (isSeedPath(n))
    return {
      refused: stagingErrorResult(
        "tool_error",
        `invalid ${e} lane_path ${jsonStringify(lanePath)}: ${DIR_SYNC_LANE_RESERVED}`,
        undefined,
        "lane_path_reserved",
      ),
    };
  return {
    rel: n,
  };
}
//@ chunk-km6145cp.js:4675-4993 placement
/**
 * 执行 CCR 暂存的 MCP 调用并上报结果。
 */
async function runStagedMcpCall(e, t) {
  let n;
  let tool;
  let b;
  try {
    let c = await stageMcpCall(e, t);
    n = c.staging;
    tool = c.tool;
    b = c.telemetryCode;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    n = stagingError("tool_error", `unexpected failure: ${errnoCode ?? errorMessage(error)}`);
  }
  if (t.signal?.aborted)
    return {
      staging: n,
      tool,
    };
  if (n.ok) logFeatureOk("ccr_mcp_call_staged");
  else logFeatureBad("ccr_mcp_call_staged", b ?? n.error_code);
  return {
    staging: n,
    tool,
  };
}
//@ chunk-km6145cp.js:4993-5120 placement
function stagingError(errorCode, t, n) {
  return {
    ok: false,
    error_code: errorCode,
    detail: t.slice(0, MAX_ERROR_DETAIL_CHARS).replace(/[\uD800-\uDBFF]$/, ""),
    ...(n !== undefined && {
      retryable: n,
    }),
  };
}
//@ chunk-km6145cp.js:5120-5321 placement
function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((t) =>
        t !== null && typeof t === "object" && "text" in t && typeof t.text === "string" ? t.text : "",
      )
      .filter(Boolean).join(`
`);
  return "";
}
//@ chunk-km6145cp.js:5321-10780 placement
/**
 * 校验请求、准备输入输出文件路径后执行 MCP 调用（Windows 不支持）。
 */
async function stageMcpCall(e, t) {
  let n = SDKMcpCallMcpCallMessageSchema().safeParse(e);
  if (!n.success) return stagingErrorResult("tool_error", `invalid request: ${n.error.message}`);
  let a = n.data;
  if (getPlatform() === "windows")
    return stagingErrorResult("tool_error", "staged mcp_call is not supported on this platform");
  if (a.output_files !== undefined && a.expires_at === undefined)
    return stagingErrorResult(
      "tool_error",
      "invalid request: expires_at is required when output_files are declared",
    );
  if (a.expires_at !== undefined) {
    let isoTimestamp = parseIsoTimestamp(a.expires_at);
    if (Number.isNaN(isoTimestamp))
      return stagingErrorResult(
        "expired",
        `expires_at is not an RFC3339 timestamp with a zone: ${a.expires_at}`,
        undefined,
        "expires_at_unparseable",
      );
    if (Date.now() > isoTimestamp) return stagingErrorResult("expired", `request expired at ${a.expires_at}`);
  }
  let b = [];
  for (let i of a.input_files ?? []) {
    let lanePath = resolveLanePath("input", i.lane_path);
    if ("refused" in lanePath) return lanePath.refused;
    b.push({
      spec: i,
      rel: lanePath.rel,
    });
  }
  let c = [];
  let x = new Map();
  for (let i of a.output_files ?? []) {
    let lanePath = resolveLanePath("output", i.lane_path);
    if ("refused" in lanePath) return lanePath.refused;
    let { rel } = lanePath;
    let p = x.get(rel);
    if (p !== undefined)
      return stagingErrorResult(
        "tool_error",
        `duplicate output lane_path: ${i.lane_path} collides with ${p}`,
      );
    x.set(rel, i.lane_path);
    c.push({
      spec: i,
      rel,
    });
  }
  for (let [i, s] of [
    ["input", a.input_files ?? []],
    ["output", a.output_files ?? []],
  ]) {
    let f = new Set();
    for (let { name: p } of s) {
      if (f.has(p)) return stagingErrorResult("tool_error", `duplicate ${i} name: ${p}`);
      f.add(p);
    }
  }
  let X = a.input_files !== undefined || a.output_files !== undefined;
  if (X) {
    let i = new Set([
      ...b.map(({ spec }) => `{{in:${spec.name}}}`),
      ...c.map(({ spec }) => `{{out:${spec.name}}}`),
    ]);
    let s = new Set();
    collectLanePathRefs(a.arguments ?? {}, s);
    let filtered = [...s].filter((l) => !i.has(l));
    if (filtered.length > 0)
      return stagingErrorResult(
        "tool_error",
        `invalid request: args token names no declared file: ${filtered.join(", ")}`,
      );
    let mapped = c.filter(({ spec }) => !s.has(`{{out:${spec.name}}}`)).map(({ spec }) => spec.name);
    if (mapped.length > 0)
      return stagingErrorResult(
        "tool_error",
        `invalid request: declared output not referenced by any {{out:NAME}} token in arguments: ${mapped.join(", ")}`,
      );
  }
  let S;
  try {
    let i;
    if (t.tempRoot === undefined) i = pluginToolStagingRoot();
    else {
      i = t.tempRoot;
      await mkdir(i, {
        recursive: true,
        mode: 448,
      });
    }
    S = await mkdtemp(join(i, "plugin-tool-"));
    await mkdir(join(S, "in"), {
      mode: 448,
    });
    await mkdir(join(S, "out"), {
      mode: 448,
    });
  } catch (error) {
    if (S !== undefined)
      await rm(S, {
        recursive: true,
        force: true,
      }).catch(() => {});
    let errnoCode = getErrnoCode(error);
    logForDiagnosticsNoPII("warn", "ptc_staging_unavailable", {
      code: errnoCode ?? "temp_dir_refused",
    });
    return stagingErrorResult("tool_error", `staging unavailable: ${errnoCode ?? "temp_dir_refused"}`);
  }
  let T = S;
  try {
    let i = new Map();
    let s = [];
    for (let [o, { spec: h, rel: M }] of b.entries()) {
      if (t.signal?.aborted) return stagingErrorResult("tool_error", CANCELLED_BY_CLIENT_MESSAGE);
      let laneRowFromWorker = await readLaneRowFromWorker(M);
      if (laneRowFromWorker.kind === "not_found")
        return stagingErrorResult("input_missing", `input not found: ${h.lane_path}`);
      if (laneRowFromWorker.kind === "error")
        return stagingErrorResult(
          "tool_error",
          `input fetch failed for ${h.lane_path}: ${laneRowFromWorker.message}`,
          laneRowFromWorker.retryable,
        );
      let L = `${o}${safeExtname(h.lane_path)}`;
      let R = join(T, "in", L);
      try {
        if (
          readFlagWithOverride(PLUGIN_TOOL_STAGING_GUARD_FLAG, {
            safe: true,
          })
        ) {
          let w = dirname(dirname(dirname(T)));
          await writeNewFileExclusive(join(await realpath(w), relative(w, R)), laneRowFromWorker.buf);
        } else
          await writeFile(R, laneRowFromWorker.buf, {
            mode: 384,
          });
      } catch (error) {
        return stagingErrorResult("tool_error", `input stage failed: ${getErrnoCode(error) ?? "unknown"}`);
      }
      i.set(`{{in:${h.name}}}`, R);
      s.push({
        lane_path: h.lane_path,
        etag: laneRowFromWorker.content_sha256,
      });
    }
    let mapped = c.map(({ spec, rel }, M) => {
      let u = join(T, "out", `${M}${safeExtname(spec.lane_path)}`);
      i.set(`{{out:${spec.name}}}`, u);
      return {
        spec,
        rel,
        path: u,
      };
    });
    let p = X ? xr(a.arguments ?? {}, (o) => substituteLanePaths(o, i)) : (a.arguments ?? {});
    let min = Math.min(
      Math.max(a.timeout_ms ?? DEFAULT_STAGING_TIMEOUT_MS, MIN_STAGING_TIMEOUT_MS),
      MAX_STAGING_TIMEOUT_MS,
    );
    let abortController = createAbortController();
    let q = false;
    let timer = setTimeout(() => {
      if (abortController.signal.aborted) return;
      q = true;
      abortController.abort(Error("staged mcp_call timed out"));
    }, min);
    let P = () => abortController.abort(t.signal?.reason);
    if (t.signal?.aborted) P();
    else
      t.signal?.addEventListener("abort", P, {
        once: true,
      });
    let C;
    try {
      C = await t.call(p, abortController.signal);
    } catch (error) {
      if (q)
        return stagingErrorResult(
          "timeout",
          `tool did not complete within ${min}ms (${errorMessage(error)})`,
        );
      if (t.signal?.aborted)
        return stagingErrorResult("tool_error", `${CANCELLED_BY_CLIENT_MESSAGE} (${errorMessage(error)})`);
      return stagingErrorResult("tool_error", `tool call failed: ${errorMessage(error)}`);
    } finally {
      clearTimeout(timer);
      t.signal?.removeEventListener("abort", P);
    }
    if (C.isError) {
      if (q) return stagingErrorResult("timeout", `tool call exceeded ${min}ms`);
      if (t.signal?.aborted) return stagingErrorResult("tool_error", CANCELLED_BY_CLIENT_MESSAGE);
      let o = contentToText(C.content);
      return stagingErrorResult("tool_error", o || "tool returned an error result");
    }
    let ot = await realpath(T);
    let j = [];
    for (let { spec, rel, path } of mapped) {
      if (t.signal?.aborted) return stagingErrorResult("tool_error", CANCELLED_BY_CLIENT_MESSAGE);
      let u;
      try {
        u = await realpath(path);
      } catch (error) {
        if (isENOENT(error))
          return stagingErrorResult("tool_error", `tool did not produce output: ${spec.name}`);
        return stagingErrorResult(
          "tool_error",
          `output read failed for ${spec.name}: ${getErrnoCode(error) ?? "unknown"}`,
        );
      }
      if (!u.startsWith(ot + "/"))
        return stagingErrorResult("tool_error", `output path escapes the staging dir: ${spec.name}`);
      let L = MAX_WORKING_FILE_BYTES;
      let R;
      try {
        let y = await open(u, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await y.stat();
          if (!stats.isFile())
            return stagingErrorResult("tool_error", `output is not a regular file: ${spec.name}`);
          if (stats.nlink > 1)
            return stagingErrorResult("tool_error", `output has multiple hard links: ${spec.name}`);
          if (stats.size > L)
            return stagingErrorResult(
              "output_too_large",
              `output ${spec.name} is ${stats.size} bytes (cap ${L})`,
            );
          let G = Number(stats.size);
          let Z = Buffer.allocUnsafe(G + 1);
          let A = 0;
          for (;;) {
            let { bytesRead } = await y.read(Z, A, G + 1 - A, A);
            if (bytesRead === 0) break;
            A += bytesRead;
          }
          if (A !== G)
            return stagingErrorResult("tool_error", `output changed during collection: ${spec.name}`);
          R = Z.subarray(0, A);
        } finally {
          await y.close();
        }
      } catch (error) {
        if (isENOENT(error))
          return stagingErrorResult("tool_error", `tool did not produce output: ${spec.name}`);
        return stagingErrorResult(
          "tool_error",
          `output read failed for ${spec.name}: ${getErrnoCode(error) ?? "unknown"}`,
        );
      }
      let w = await writeLaneRowFromWorker(t.syncDir ?? SYNCED_FILE_ROOT, rel, R, spec.if_match);
      if (!w.ok)
        return stagingErrorResult(
          w.reason === "too_large"
            ? "output_too_large"
            : w.reason === "conflict"
              ? "output_conflict"
              : "tool_error",
          `output write failed for ${spec.lane_path}: ${w.error}`,
          w.retryable,
        );
      j.push({
        lane_path: spec.lane_path,
        etag: w.etag,
        bytes: R.length,
      });
    }
    logForDiagnosticsNoPII("info", "mcp_call_staged_ok", {
      inputs: s.length,
      outputs: j.length,
    });
    return {
      staging: {
        ok: true,
        outputs: j,
        inputs_used: s,
      },
      tool: {
        content: C.content,
        structuredContent: C.structuredContent,
        _meta: C._meta,
      },
    };
  } finally {
    await rm(T, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
