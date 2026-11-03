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
import { L_e } from "../../utils/parseIsoTimestamp.js";
import { pluginToolStagingRoot, PLUGIN_TOOL_STAGING_GUARD_FLAG } from "../../utils/tempDir.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { writeNewFileExclusive } from "../../utils/tempFiles.js";
import { createAbortController } from "../../utils/abortController.js";

//@ chunk-km6145cp.js:3808-3962 placement
var { dirname: dirname, extname: extname, join: join, relative: relative } = posix,
  ft = 120000,
  dt = 600000,
  pt = 1000,
  gt = 2000,
  et = /^\{\{(in|out):([A-Za-z0-9_-]{1,64})\}\}$/,
  F = "cancelled by client";
//@ chunk-km6145cp.js:3962-4024 placement
function r(e, t, n, a) {
  return { staging: stagingError(e, t, n), telemetryCode: a };
}
//@ chunk-km6145cp.js:4024-4189 placement
function collectLanePathRefs(e, t) {
  if (typeof e === "string") {
    if (et.test(e)) t.add(e);
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
    if (et.test(e)) return t.get(e) ?? e;
    return e;
  }
  if (Array.isArray(e)) return e.map((n) => substituteLanePaths(n, t));
  if (isPlainObject(e)) return xr(e, (n) => substituteLanePaths(n, t));
  return e;
}
//@ chunk-km6145cp.js:4359-4427 placement
function Q(e) {
  let t = extname(e);
  return /^\.[A-Za-z0-9]{1,8}$/.test(t) ? t : "";
}
//@ chunk-km6145cp.js:4427-4675 placement
function resolveLanePath(e, t) {
  let n;
  try {
    n = relUnderSyncDir(WORKING_FILESTORE_PREFIX, t);
  } catch (error) {
    return { refused: r("tool_error", `invalid ${e} lane_path ${jsonStringify(t)}: ${errorMessage(error)}`) };
  }
  if (isSeedPath(n))
    return {
      refused: r(
        "tool_error",
        `invalid ${e} lane_path ${jsonStringify(t)}: ${DIR_SYNC_LANE_RESERVED}`,
        void 0,
        "lane_path_reserved",
      ),
    };
  return { rel: n };
}
/**
 * 执行 CCR 暂存的 MCP 调用并上报结果。
 */
//@ chunk-km6145cp.js:4675-4993 placement
async function runStagedMcpCall(e, t) {
  let n, a, b;
  try {
    let c = await stageMcpCall(e, t);
    ((n = c.staging), (a = c.tool), (b = c.telemetryCode));
  } catch (error) {
    let x = getErrnoCode(error);
    n = stagingError("tool_error", `unexpected failure: ${x ?? errorMessage(error)}`);
  }
  if (t.signal?.aborted) return { staging: n, tool: a };
  if (n.ok) logFeatureOk("ccr_mcp_call_staged");
  else logFeatureBad("ccr_mcp_call_staged", b ?? n.error_code);
  return { staging: n, tool: a };
}
//@ chunk-km6145cp.js:4993-5120 placement
function stagingError(e, t, n) {
  return {
    ok: !1,
    error_code: e,
    detail: t.slice(0, gt).replace(/[\uD800-\uDBFF]$/, ""),
    ...(n !== void 0 && { retryable: n }),
  };
}
//@ chunk-km6145cp.js:5120-5321 placement
function contentToText(e) {
  if (typeof e === "string") return e;
  if (Array.isArray(e))
    return e
      .map((t) =>
        t !== null && typeof t === "object" && "text" in t && typeof t.text === "string" ? t.text : "",
      )
      .filter(Boolean).join(`
`);
  return "";
}
/**
 * 校验请求、准备输入输出文件路径后执行 MCP 调用（Windows 不支持）。
 */
//@ chunk-km6145cp.js:5321-10780 placement
async function stageMcpCall(e, t) {
  let safeParse = SDKMcpCallMcpCallMessageSchema().safeParse(e);
  if (!safeParse.success) return r("tool_error", `invalid request: ${safeParse.error.message}`);
  let a = safeParse.data;
  if (getPlatform() === "windows")
    return r("tool_error", "staged mcp_call is not supported on this platform");
  if (a.output_files !== void 0 && a.expires_at === void 0)
    return r("tool_error", "invalid request: expires_at is required when output_files are declared");
  if (a.expires_at !== void 0) {
    let i = L_e(a.expires_at);
    if (Number.isNaN(i))
      return r(
        "expired",
        `expires_at is not an RFC3339 timestamp with a zone: ${a.expires_at}`,
        void 0,
        "expires_at_unparseable",
      );
    if (Date.now() > i) return r("expired", `request expired at ${a.expires_at}`);
  }
  let b = [];
  for (let i of a.input_files ?? []) {
    let s = resolveLanePath("input", i.lane_path);
    if ("refused" in s) return s.refused;
    b.push({ spec: i, rel: s.rel });
  }
  let c = [],
    x = new Map();
  for (let i of a.output_files ?? []) {
    let s = resolveLanePath("output", i.lane_path);
    if ("refused" in s) return s.refused;
    let { rel: rel } = s,
      p = x.get(rel);
    if (p !== void 0) return r("tool_error", `duplicate output lane_path: ${i.lane_path} collides with ${p}`);
    (x.set(rel, i.lane_path), c.push({ spec: i, rel: rel }));
  }
  for (let [i, s] of [
    ["input", a.input_files ?? []],
    ["output", a.output_files ?? []],
  ]) {
    let f = new Set();
    for (let { name: p } of s) {
      if (f.has(p)) return r("tool_error", `duplicate ${i} name: ${p}`);
      f.add(p);
    }
  }
  let X = a.input_files !== void 0 || a.output_files !== void 0;
  if (X) {
    let i = new Set([
        ...b.map(({ spec: spec }) => `{{in:${spec.name}}}`),
        ...c.map(({ spec: spec }) => `{{out:${spec.name}}}`),
      ]),
      s = new Set();
    collectLanePathRefs(a.arguments ?? {}, s);
    let filtered = [...s].filter((l) => !i.has(l));
    if (filtered.length > 0)
      return r("tool_error", `invalid request: args token names no declared file: ${filtered.join(", ")}`);
    let mapped = c
      .filter(({ spec: spec }) => !s.has(`{{out:${spec.name}}}`))
      .map(({ spec: spec }) => spec.name);
    if (mapped.length > 0)
      return r(
        "tool_error",
        `invalid request: declared output not referenced by any {{out:NAME}} token in arguments: ${mapped.join(", ")}`,
      );
  }
  let S;
  try {
    let i;
    if (t.tempRoot === void 0) i = pluginToolStagingRoot();
    else ((i = t.tempRoot), await mkdir(i, { recursive: !0, mode: 448 }));
    ((S = await mkdtemp(join(i, "plugin-tool-"))),
      await mkdir(join(S, "in"), { mode: 448 }),
      await mkdir(join(S, "out"), { mode: 448 }));
  } catch (error) {
    if (S !== void 0) await rm(S, { recursive: !0, force: !0 }).catch(() => {});
    let s = getErrnoCode(error);
    return (
      logForDiagnosticsNoPII("warn", "ptc_staging_unavailable", { code: s ?? "temp_dir_refused" }),
      r("tool_error", `staging unavailable: ${s ?? "temp_dir_refused"}`)
    );
  }
  let T = S;
  try {
    let i = new Map(),
      s = [];
    for (let [o, { spec: h, rel: M }] of b.entries()) {
      if (t.signal?.aborted) return r("tool_error", F);
      let u = await readLaneRowFromWorker(M);
      if (u.kind === "not_found") return r("input_missing", `input not found: ${h.lane_path}`);
      if (u.kind === "error")
        return r("tool_error", `input fetch failed for ${h.lane_path}: ${u.message}`, u.retryable);
      let L = `${o}${Q(h.lane_path)}`,
        R = join(T, "in", L);
      try {
        if (readFlagWithOverride(PLUGIN_TOOL_STAGING_GUARD_FLAG, { safe: !0 })) {
          let w = dirname(dirname(dirname(T)));
          await writeNewFileExclusive(join(await realpath(w), relative(w, R)), u.buf);
        } else await writeFile(R, u.buf, { mode: 384 });
      } catch (error) {
        return r("tool_error", `input stage failed: ${getErrnoCode(error) ?? "unknown"}`);
      }
      (i.set(`{{in:${h.name}}}`, R), s.push({ lane_path: h.lane_path, etag: u.content_sha256 }));
    }
    let mapped = c.map(({ spec: spec, rel: rel }, M) => {
        let u = join(T, "out", `${M}${Q(spec.lane_path)}`);
        return (i.set(`{{out:${spec.name}}}`, u), { spec: spec, rel: rel, path: u });
      }),
      p = X ? xr(a.arguments ?? {}, (o) => substituteLanePaths(o, i)) : (a.arguments ?? {}),
      min = Math.min(Math.max(a.timeout_ms ?? ft, pt), dt),
      O = createAbortController(),
      q = !1,
      nt = setTimeout(() => {
        if (O.signal.aborted) return;
        ((q = !0), O.abort(Error("staged mcp_call timed out")));
      }, min),
      P = () => O.abort(t.signal?.reason);
    if (t.signal?.aborted) P();
    else t.signal?.addEventListener("abort", P, { once: !0 });
    let C;
    try {
      C = await t.call(p, O.signal);
    } catch (error) {
      if (q) return r("timeout", `tool did not complete within ${min}ms (${errorMessage(error)})`);
      if (t.signal?.aborted) return r("tool_error", `${F} (${errorMessage(error)})`);
      return r("tool_error", `tool call failed: ${errorMessage(error)}`);
    } finally {
      (clearTimeout(nt), t.signal?.removeEventListener("abort", P));
    }
    if (C.isError) {
      if (q) return r("timeout", `tool call exceeded ${min}ms`);
      if (t.signal?.aborted) return r("tool_error", F);
      let o = contentToText(C.content);
      return r("tool_error", o || "tool returned an error result");
    }
    let ot = await realpath(T),
      j = [];
    for (let { spec: spec, rel: rel, path: path } of mapped) {
      if (t.signal?.aborted) return r("tool_error", F);
      let u;
      try {
        u = await realpath(path);
      } catch (error) {
        if (isENOENT(error)) return r("tool_error", `tool did not produce output: ${spec.name}`);
        return r("tool_error", `output read failed for ${spec.name}: ${getErrnoCode(error) ?? "unknown"}`);
      }
      if (!u.startsWith(ot + "/"))
        return r("tool_error", `output path escapes the staging dir: ${spec.name}`);
      let L = MAX_WORKING_FILE_BYTES,
        R;
      try {
        let y = await open(u, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await y.stat();
          if (!stats.isFile()) return r("tool_error", `output is not a regular file: ${spec.name}`);
          if (stats.nlink > 1) return r("tool_error", `output has multiple hard links: ${spec.name}`);
          if (stats.size > L)
            return r("output_too_large", `output ${spec.name} is ${stats.size} bytes (cap ${L})`);
          let G = Number(stats.size),
            allocUnsafe = Buffer.allocUnsafe(G + 1),
            A = 0;
          for (;;) {
            let { bytesRead: bytesRead } = await y.read(allocUnsafe, A, G + 1 - A, A);
            if (bytesRead === 0) break;
            A += bytesRead;
          }
          if (A !== G) return r("tool_error", `output changed during collection: ${spec.name}`);
          R = allocUnsafe.subarray(0, A);
        } finally {
          await y.close();
        }
      } catch (error) {
        if (isENOENT(error)) return r("tool_error", `tool did not produce output: ${spec.name}`);
        return r("tool_error", `output read failed for ${spec.name}: ${getErrnoCode(error) ?? "unknown"}`);
      }
      let w = await writeLaneRowFromWorker(t.syncDir ?? SYNCED_FILE_ROOT, rel, R, spec.if_match);
      if (!w.ok)
        return r(
          w.reason === "too_large"
            ? "output_too_large"
            : w.reason === "conflict"
              ? "output_conflict"
              : "tool_error",
          `output write failed for ${spec.lane_path}: ${w.error}`,
          w.retryable,
        );
      j.push({ lane_path: spec.lane_path, etag: w.etag, bytes: R.length });
    }
    return (
      logForDiagnosticsNoPII("info", "mcp_call_staged_ok", { inputs: s.length, outputs: j.length }),
      {
        staging: { ok: !0, outputs: j, inputs_used: s },
        tool: { content: C.content, structuredContent: C.structuredContent, _meta: C._meta },
      }
    );
  } finally {
    await rm(T, { recursive: !0, force: !0 }).catch(() => {});
  }
}
