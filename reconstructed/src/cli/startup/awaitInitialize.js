/**
 * cli/startup/awaitInitialize.ts
 *
 * 2.1.316 新增：--await-initialize：读取 stream-json stdin 的 initialize 行并应用插件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-151tygw9.js (18)
 * attribution: placement 18
 */
import { resolve } from "path";
import { DoctorLazy } from "../handlers/util.js";
import { u, T, kt, oe, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { SDKLocalMessageSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { getOriginalCwd, getInlinePlugins, getInlinePluginsNoMcp } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { normalizeControlMessage } from "../../utils/controlMessageCompat.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Wo } from "../../utils/json.js";
import { iterateStreamUntilClose, isStdinUnusableError } from "../../utils/process.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { cliErrorAfterAnalyticsFlush } from "../exit.js";

//@ chunk-151tygw9.js:1207-1369 placement
var MAX_INITIALIZE_LINE_BYTES = 268435456,
  FIRST_LINE_TOO_LONG = Symbol("first line too long"),
  STDIN_STASH_CHUNK = 65536,
  initializeWait,
  stdinPump,
  INITIALIZE_REQUEST_SCHEMA = DoctorLazy(() =>
    u({ type: T("control_request"), request: kt({ subtype: T("initialize"), plugins: oe().optional() }) }),
  );
/**
 * --await-initialize：在 stdin 上等待第一个 initialize 控制请求后再继续启动。
 */
//@ chunk-151tygw9.js:1369-1585 placement
function startAwaitInitialize(e) {
  if (initializeWait) return;
  let n = createStdinPump(e);
  ((initializeWait = readFirstStdinLine(n)
    .then(
      parseInitializeLine,
      (r) => ((n.error = r), logFeatureSad("sdk_launch_initialize", "stdin_error"), { kind: "absent" }),
    )
    .catch(() => (logFeatureBad("sdk_launch_initialize", "parse_threw"), { kind: "absent" }))),
    initializeWait.then(() => pumpStdin(n)));
}
//@ chunk-151tygw9.js:1585-1629 placement
function startStdinPump(e) {
  if (stdinPump) return;
  let n = createStdinPump(e);
  pumpStdin(n);
}
//@ chunk-151tygw9.js:1629-1861 placement
function watchStdinLines(e) {
  let n = stdinPump;
  if (!n || !n.pumping || n.capped || n.adopted || n.watch) return;
  let r = { watcher: e, held: [], heldChars: 0, passing: !1 };
  n.watch = r;
  for (let s of n.stash.splice(0)) routeStdinChunk(n, s);
  if (n.ended || n.error !== void 0) e.ended();
  return () => F(n, r);
}
//@ chunk-151tygw9.js:1861-1910 placement
function awaitInitializeResult() {
  return initializeWait ?? Promise.resolve(void 0);
}
//@ chunk-151tygw9.js:1910-2007 placement
function adoptStdinStream() {
  let e = stdinPump;
  if (!e || e.adopted) return;
  if (e.watch) F(e, e.watch);
  return ((e.adopted = !0), replayStdinStash(e));
}
//@ chunk-151tygw9.js:2007-2335 placement
function applyInitializePlugins(e) {
  let safeParse = A(SDKLocalMessageSchema()).optional().safeParse(e);
  if (!safeParse.success) return !1;
  let r = safeParse.data;
  if (r === void 0 || r.length === 0) return;
  let s = getCurrentWorktreeSession(),
    a = s?.preEnterOriginalCwd ?? s?.originalCwd ?? getOriginalCwd(),
    o = new Set(getInlinePlugins().map((h) => resolve(a, h))),
    c = new Set(getInlinePluginsNoMcp().map((h) => resolve(a, h)));
  return r.every((h) => (h.skipMcpDiscovery ? c.has(resolve(a, h.path)) : o.has(resolve(a, h.path))));
}
//@ chunk-151tygw9.js:2335-2476 placement
function createStdinPump(createGenerator) {
  let n = {
    generator: createGenerator(),
    stash: [],
    inflight: void 0,
    ended: !1,
    error: void 0,
    adopted: !1,
    capped: !1,
    pumping: !1,
    watch: void 0,
  };
  return ((stdinPump = n), n);
}
//@ chunk-151tygw9.js:2476-2787 placement
async function readFirstStdinLine(e) {
  let n = "";
  for (;;) {
    let index = n.indexOf(`
`);
    if (index !== -1) {
      let sliced = n.slice(0, index);
      if (sliced.trim() !== "") return sliced;
      n = n.slice(index + 1);
      continue;
    }
    if (n.length > MAX_INITIALIZE_LINE_BYTES) return ((e.capped = !0), FIRST_LINE_TOO_LONG);
    e.inflight = e.generator.next();
    let inflight = await e.inflight;
    if (((e.inflight = void 0), inflight.done)) return ((e.ended = !0), null);
    (e.stash.push(inflight.value), (n += inflight.value));
  }
}
//@ chunk-151tygw9.js:2787-3083 placement
async function pumpStdin(e) {
  e.pumping = !0;
  try {
    while (!e.adopted && !e.ended && !e.capped && e.error === void 0) {
      e.inflight = e.generator.next();
      let inflight = await e.inflight;
      if (((e.inflight = void 0), inflight.done)) e.ended = !0;
      else routeStdinChunk(e, inflight.value);
    }
  } catch (error) {
    ((e.inflight = void 0), (e.error = error));
  }
  if (e.ended || e.error !== void 0) e.watch?.watcher.ended();
}
//@ chunk-151tygw9.js:3083-3539 placement
function routeStdinChunk(e, n) {
  let watch = e.watch;
  if (!watch) {
    e.stash.push(n);
    return;
  }
  let s = 0;
  for (;;) {
    let index = n.indexOf(
      `
`,
      s,
    );
    if (index === -1) break;
    let sliced = n.slice(s, index);
    s = index + 1;
    let h = !watch.passing && watch.heldChars + sliced.length <= STDIN_STASH_CHUNK;
    if (((watch.passing = !1), h && watch.watcher.takes(watch.held.join("") + sliced))) {
      ((watch.held = []), (watch.heldChars = 0));
      continue;
    }
    (O(e, watch),
      e.stash.push(
        sliced +
          `
`,
      ));
  }
  if (s === n.length) return;
  let a = s === 0 ? n : n.slice(s);
  if (watch.passing) {
    e.stash.push(a);
    return;
  }
  if ((watch.held.push(a), (watch.heldChars += a.length), watch.heldChars > STDIN_STASH_CHUNK))
    (O(e, watch), (watch.passing = !0));
}
//@ chunk-151tygw9.js:3539-3615 placement
function O(e, n) {
  for (let r of n.held) e.stash.push(r);
  ((n.held = []), (n.heldChars = 0));
}
//@ chunk-151tygw9.js:3615-3675 placement
function F(e, n) {
  if (e.watch !== n) return;
  (O(e, n), (e.watch = void 0));
}
//@ chunk-151tygw9.js:3675-3986 placement
async function* replayStdinStash(e) {
  let n = !1;
  try {
    while (e.stash.length > 0) yield e.stash.shift();
    if (e.inflight) {
      await e.inflight.catch(() => {});
      while (e.stash.length > 0) yield e.stash.shift();
    }
    if (e.error !== void 0) throw e.error;
    if (e.ended) return;
    ((n = !0), yield* e.generator);
  } finally {
    if (!n && !e.ended) e.generator.return(void 0).catch(() => {});
  }
}
//@ chunk-151tygw9.js:3986-5326 placement
function parseInitializeLine(e) {
  if (e === null)
    return (
      logForDebugging("--await-initialize: stdin ended before an initialize request arrived", {
        level: "warn",
      }),
      logFeatureSad("sdk_launch_initialize", "stdin_ended"),
      { kind: "absent" }
    );
  if (e === FIRST_LINE_TOO_LONG)
    return (
      logForDebugging("--await-initialize: first stdin line exceeds the line-size ceiling; not parsed", {
        level: "error",
      }),
      logFeatureBad("sdk_launch_initialize", "first_line_too_long"),
      { kind: "absent" }
    );
  let n;
  try {
    n = normalizeControlMessage(jsonParse(Wo(e)));
  } catch {
    return (
      logFeatureBad("sdk_launch_initialize", "first_line_not_json"),
      {
        kind: "violation",
        message:
          "Error: --await-initialize requires the initialize control request as the first stdin line, and the first line is not valid JSON.",
      }
    );
  }
  let safeParse = INITIALIZE_REQUEST_SCHEMA().safeParse(n);
  if (!safeParse.success)
    return (
      logFeatureBad("sdk_launch_initialize", "first_line_not_initialize"),
      {
        kind: "violation",
        message:
          "Error: --await-initialize requires the initialize control request as the first stdin line, and the first line is a different message.",
      }
    );
  let safeParse_2 = A(SDKLocalMessageSchema()).optional().safeParse(safeParse.data.request.plugins);
  if (!safeParse_2.success)
    return (
      logFeatureBad("sdk_launch_initialize", "plugins_malformed"),
      {
        kind: "violation",
        message:
          "Error: initialize.plugins must be an array of { type: 'local', path: string, skipMcpDiscovery?: boolean } entries.",
      }
    );
  let a = safeParse_2.data ?? [];
  return (
    logFeatureOk("sdk_launch_initialize"),
    {
      kind: "applied",
      pluginDirs: a.filter((o) => !o.skipMcpDiscovery).map((o) => o.path),
      pluginDirsNoMcp: a.filter((o) => o.skipMcpDiscovery).map((o) => o.path),
    }
  );
}
//@ chunk-151tygw9.js:5326-5398 placement
var STDIN_LIMITS = 10485760,
  W = Symbol("stream-json messages of this process's stdin");
//@ chunk-151tygw9.js:5398-5449 placement
function isStreamJsonStdin(e) {
  return typeof e !== "string" && W in e;
}
//@ chunk-151tygw9.js:5449-5908 placement
async function* readStreamJsonStdin() {
  try {
    (process.stdin.setEncoding("utf8"), yield* iterateStreamUntilClose(process.stdin));
  } catch (error) {
    if (!isStdinUnusableError(error)) throw error;
    (logForDebugging(`getInputPrompt: stream-json stdin unreadable: ${errorMessage(error)}`, {
      level: "error",
    }),
      logError(
        Object.assign(Error("getInputPrompt: stream-json stdin unreadable"), { code: getErrnoCode(error) }),
      ),
      await cliErrorAfterAnalyticsFlush(
        `Error: cannot read --input-format=stream-json messages from stdin (${getErrnoCode(error)}): stdin is unreadable. stream-json input requires a readable stdin for the lifetime of the session.`,
      ));
  }
}

export {
  startAwaitInitialize,
  readStreamJsonStdin,
  awaitInitializeResult,
  adoptStdinStream,
  W,
  STDIN_LIMITS,
  isStreamJsonStdin,
  applyInitializePlugins,
  startStdinPump,
  watchStdinLines,
};
