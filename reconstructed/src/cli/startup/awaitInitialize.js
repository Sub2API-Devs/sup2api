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
import { u, literal, looseObject, unknown, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { SDKLocalMessageSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { getOriginalCwd, getInlinePlugins, getInlinePluginsNoMcp } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { normalizeControlMessage } from "../../utils/controlMessageCompat.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { iterateStreamUntilClose, isStdinUnusableError } from "../../utils/process.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { cliErrorAfterAnalyticsFlush } from "../exit.js";

//@ chunk-151tygw9.js:1207-1369 placement
var MAX_INITIALIZE_LINE_BYTES = 268435456;
var FIRST_LINE_TOO_LONG = Symbol("first line too long");
var STDIN_STASH_CHUNK = 65536;
var initializeWait;
var stdinPump;
var INITIALIZE_REQUEST_SCHEMA = DoctorLazy(() =>
  u({
    type: literal("control_request"),
    request: looseObject({
      subtype: literal("initialize"),
      plugins: unknown().optional(),
    }),
  }),
);
//@ chunk-151tygw9.js:1369-1585 placement
/**
 * --await-initialize：在 stdin 上等待第一个 initialize 控制请求后再继续启动。
 */
function startAwaitInitialize(createGenerator) {
  if (initializeWait) return;
  let stdinPump = createStdinPump(createGenerator);
  initializeWait = readFirstStdinLine(stdinPump)
    .then(parseInitializeLine, (error) => {
      stdinPump.error = error;
      logFeatureSad("sdk_launch_initialize", "stdin_error");
      return {
        kind: "absent",
      };
    })
    .catch(() => {
      logFeatureBad("sdk_launch_initialize", "parse_threw");
      return {
        kind: "absent",
      };
    });
  initializeWait.then(() => pumpStdin(stdinPump));
}
//@ chunk-151tygw9.js:1585-1629 placement
function startStdinPump(createGenerator) {
  if (stdinPump) return;
  let stdinPump_2 = createStdinPump(createGenerator);
  pumpStdin(stdinPump_2);
}
//@ chunk-151tygw9.js:1629-1861 placement
function watchStdinLines(e) {
  let n = stdinPump;
  if (!n || !n.pumping || n.capped || n.adopted || n.watch) return;
  let r = {
    watcher: e,
    held: [],
    heldChars: 0,
    passing: false,
  };
  n.watch = r;
  for (let s of n.stash.splice(0)) routeStdinChunk(n, s);
  if (n.ended || n.error !== undefined) e.ended();
  return () => endWatch(n, r);
}
//@ chunk-151tygw9.js:1861-1910 placement
function awaitInitializeResult() {
  return initializeWait ?? Promise.resolve(undefined);
}
//@ chunk-151tygw9.js:1910-2007 placement
function adoptStdinStream() {
  let e = stdinPump;
  if (!e || e.adopted) return;
  if (e.watch) endWatch(e, e.watch);
  e.adopted = true;
  return replayStdinStash(e);
}
//@ chunk-151tygw9.js:2007-2335 placement
function applyInitializePlugins(plugins) {
  let n = array(SDKLocalMessageSchema()).optional().safeParse(plugins);
  if (!n.success) return false;
  let r = n.data;
  if (r === undefined || r.length === 0) return;
  let currentWorktreeSession = getCurrentWorktreeSession();
  let a =
    currentWorktreeSession?.preEnterOriginalCwd ?? currentWorktreeSession?.originalCwd ?? getOriginalCwd();
  let o = new Set(getInlinePlugins().map((h) => resolve(a, h)));
  let c = new Set(getInlinePluginsNoMcp().map((h) => resolve(a, h)));
  return r.every((h) => (h.skipMcpDiscovery ? c.has(resolve(a, h.path)) : o.has(resolve(a, h.path))));
}
//@ chunk-151tygw9.js:2335-2476 placement
function createStdinPump(createGenerator) {
  let n = {
    generator: createGenerator(),
    stash: [],
    inflight: undefined,
    ended: false,
    error: undefined,
    adopted: false,
    capped: false,
    pumping: false,
    watch: undefined,
  };
  stdinPump = n;
  return n;
}
//@ chunk-151tygw9.js:2476-2787 placement
async function readFirstStdinLine(stdinPump) {
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
    if (n.length > MAX_INITIALIZE_LINE_BYTES) {
      stdinPump.capped = true;
      return FIRST_LINE_TOO_LONG;
    }
    stdinPump.inflight = stdinPump.generator.next();
    let inflight = await stdinPump.inflight;
    stdinPump.inflight = undefined;
    if (inflight.done) {
      stdinPump.ended = true;
      return null;
    }
    stdinPump.stash.push(inflight.value);
    n += inflight.value;
  }
}
//@ chunk-151tygw9.js:2787-3083 placement
async function pumpStdin(stdinPump) {
  stdinPump.pumping = true;
  try {
    while (!stdinPump.adopted && !stdinPump.ended && !stdinPump.capped && stdinPump.error === undefined) {
      stdinPump.inflight = stdinPump.generator.next();
      let inflight = await stdinPump.inflight;
      stdinPump.inflight = undefined;
      if (inflight.done) stdinPump.ended = true;
      else routeStdinChunk(stdinPump, inflight.value);
    }
  } catch (error) {
    stdinPump.inflight = undefined;
    stdinPump.error = error;
  }
  if (stdinPump.ended || stdinPump.error !== undefined) stdinPump.watch?.watcher.ended();
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
    watch.passing = false;
    if (h && watch.watcher.takes(watch.held.join("") + sliced)) {
      watch.held = [];
      watch.heldChars = 0;
      continue;
    }
    flushHeldWatchItems(e, watch);
    e.stash.push(
      sliced +
        `
`,
    );
  }
  if (s === n.length) return;
  let a = s === 0 ? n : n.slice(s);
  if (watch.passing) {
    e.stash.push(a);
    return;
  }
  watch.held.push(a);
  watch.heldChars += a.length;
  if (watch.heldChars > STDIN_STASH_CHUNK) {
    flushHeldWatchItems(e, watch);
    watch.passing = true;
  }
}
//@ chunk-151tygw9.js:3539-3615 placement
function flushHeldWatchItems(e, watch) {
  for (let r of watch.held) e.stash.push(r);
  watch.held = [];
  watch.heldChars = 0;
}
//@ chunk-151tygw9.js:3615-3675 placement
function endWatch(e, n) {
  if (e.watch !== n) return;
  flushHeldWatchItems(e, n);
  e.watch = undefined;
}
//@ chunk-151tygw9.js:3675-3986 placement
async function* replayStdinStash(e) {
  let n = false;
  try {
    while (e.stash.length > 0) yield e.stash.shift();
    if (e.inflight) {
      await e.inflight.catch(() => {});
      while (e.stash.length > 0) yield e.stash.shift();
    }
    if (e.error !== undefined) throw e.error;
    if (e.ended) return;
    n = true;
    yield* e.generator;
  } finally {
    if (!n && !e.ended) e.generator.return(undefined).catch(() => {});
  }
}
//@ chunk-151tygw9.js:3986-5326 placement
function parseInitializeLine(e) {
  if (e === null) {
    logForDebugging("--await-initialize: stdin ended before an initialize request arrived", {
      level: "warn",
    });
    logFeatureSad("sdk_launch_initialize", "stdin_ended");
    return {
      kind: "absent",
    };
  }
  if (e === FIRST_LINE_TOO_LONG) {
    logForDebugging("--await-initialize: first stdin line exceeds the line-size ceiling; not parsed", {
      level: "error",
    });
    logFeatureBad("sdk_launch_initialize", "first_line_too_long");
    return {
      kind: "absent",
    };
  }
  let n;
  try {
    n = normalizeControlMessage(jsonParse(stripBom(e)));
  } catch {
    logFeatureBad("sdk_launch_initialize", "first_line_not_json");
    return {
      kind: "violation",
      message:
        "Error: --await-initialize requires the initialize control request as the first stdin line, and the first line is not valid JSON.",
    };
  }
  let r = INITIALIZE_REQUEST_SCHEMA().safeParse(n);
  if (!r.success) {
    logFeatureBad("sdk_launch_initialize", "first_line_not_initialize");
    return {
      kind: "violation",
      message:
        "Error: --await-initialize requires the initialize control request as the first stdin line, and the first line is a different message.",
    };
  }
  let s = array(SDKLocalMessageSchema()).optional().safeParse(r.data.request.plugins);
  if (!s.success) {
    logFeatureBad("sdk_launch_initialize", "plugins_malformed");
    return {
      kind: "violation",
      message:
        "Error: initialize.plugins must be an array of { type: 'local', path: string, skipMcpDiscovery?: boolean } entries.",
    };
  }
  let a = s.data ?? [];
  logFeatureOk("sdk_launch_initialize");
  return {
    kind: "applied",
    pluginDirs: a.filter((o) => !o.skipMcpDiscovery).map((o) => o.path),
    pluginDirsNoMcp: a.filter((o) => o.skipMcpDiscovery).map((o) => o.path),
  };
}
//@ chunk-151tygw9.js:5326-5398 placement
var STDIN_LIMITS = 10485760;
var STDIN_MESSAGES_MARKER = Symbol("stream-json messages of this process's stdin");
//@ chunk-151tygw9.js:5398-5449 placement
function isStreamJsonStdin(e) {
  return typeof e !== "string" && STDIN_MESSAGES_MARKER in e;
}
//@ chunk-151tygw9.js:5449-5908 placement
async function* readStreamJsonStdin() {
  try {
    process.stdin.setEncoding("utf8");
    yield* iterateStreamUntilClose(process.stdin);
  } catch (error) {
    if (!isStdinUnusableError(error)) throw error;
    logForDebugging(`getInputPrompt: stream-json stdin unreadable: ${errorMessage(error)}`, {
      level: "error",
    });
    logError(
      Object.assign(Error("getInputPrompt: stream-json stdin unreadable"), {
        code: getErrnoCode(error),
      }),
    );
    await cliErrorAfterAnalyticsFlush(
      `Error: cannot read --input-format=stream-json messages from stdin (${getErrnoCode(error)}): stdin is unreadable. stream-json input requires a readable stdin for the lifetime of the session.`,
    );
  }
}
export {
  startAwaitInitialize,
  readStreamJsonStdin,
  awaitInitializeResult,
  adoptStdinStream,
  STDIN_MESSAGES_MARKER,
  STDIN_LIMITS,
  isStreamJsonStdin,
  applyInitializePlugins,
  startStdinPump,
  watchStdinLines,
};
