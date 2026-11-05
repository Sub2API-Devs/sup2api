/**
 * cli/startup/awaitInitialize.ts
 *
 * 2.1.316 新增：--await-initialize：读取 stream-json stdin 的 initialize 行并应用插件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-405cd95w.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import { DoctorLazy } from "../handlers/util.js";
import {
  objectSchema,
  literal,
  looseObject,
  unknown,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-405cd95w.js:1272-1434 placement
var MAX_INITIALIZE_LINE_BYTES; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FIRST_LINE_TOO_LONG;
var STDIN_STASH_CHUNK;
var initializeWait;
var stdinPump;
var INITIALIZE_REQUEST_SCHEMA;
deferInit("chunk-405cd95w.js:1272", () => {
  MAX_INITIALIZE_LINE_BYTES = 268435456;
  FIRST_LINE_TOO_LONG = Symbol("first line too long");
  STDIN_STASH_CHUNK = 65536;
  INITIALIZE_REQUEST_SCHEMA = DoctorLazy(() =>
    objectSchema({
      type: literal("control_request"),
      request: looseObject({
        subtype: literal("initialize"),
        plugins: unknown().optional(),
      }),
    }),
  );
});
//@ chunk-405cd95w.js:1434-1650 placement
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
//@ chunk-405cd95w.js:1650-1694 placement
function startStdinPump(createGenerator) {
  if (stdinPump) return;
  let stdinPump_2 = createStdinPump(createGenerator);
  pumpStdin(stdinPump_2);
}
//@ chunk-405cd95w.js:1694-1926 placement
function watchStdinLines(watcher) {
  let pump = stdinPump;
  if (!pump || !pump.pumping || pump.capped || pump.adopted || pump.watch) return;
  let watch = {
    watcher,
    held: [],
    heldChars: 0,
    passing: false,
  };
  pump.watch = watch;
  for (let chunk of pump.stash.splice(0)) routeStdinChunk(pump, chunk);
  if (pump.ended || pump.error !== undefined) watcher.ended();
  return () => endWatch(pump, watch);
}
//@ chunk-405cd95w.js:1926-1975 placement
function awaitInitializeResult() {
  return initializeWait ?? Promise.resolve(undefined);
}
//@ chunk-405cd95w.js:1975-2072 placement
function adoptStdinStream() {
  let pump = stdinPump;
  if (!pump || pump.adopted) return;
  if (pump.watch) endWatch(pump, pump.watch);
  pump.adopted = true;
  return replayStdinStash(pump);
}
//@ chunk-405cd95w.js:2072-2400 placement
function applyInitializePlugins(plugins) {
  let parsed = array(SDKLocalMessageSchema()).optional().safeParse(plugins);
  if (!parsed.success) return false;
  let entries = parsed.data;
  if (entries === undefined || entries.length === 0) return;
  let currentWorktreeSession = getCurrentWorktreeSession();
  let baseDir =
    currentWorktreeSession?.preEnterOriginalCwd ?? currentWorktreeSession?.originalCwd ?? getOriginalCwd();
  let dirs = new Set(getInlinePlugins().map((dir) => resolve(baseDir, dir)));
  let noMcpDirs = new Set(getInlinePluginsNoMcp().map((dir) => resolve(baseDir, dir)));
  return entries.every((plugin) =>
    plugin.skipMcpDiscovery
      ? noMcpDirs.has(resolve(baseDir, plugin.path))
      : dirs.has(resolve(baseDir, plugin.path)),
  );
}
//@ chunk-405cd95w.js:2400-2541 placement
function createStdinPump(createGenerator) {
  let pump = {
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
  stdinPump = pump;
  return pump;
}
//@ chunk-405cd95w.js:2541-2852 placement
async function readFirstStdinLine(stdinPump) {
  let buffer = "";
  for (;;) {
    let index = buffer.indexOf(`
`);
    if (index !== -1) {
      let sliced = buffer.slice(0, index);
      if (sliced.trim() !== "") return sliced;
      buffer = buffer.slice(index + 1);
      continue;
    }
    if (buffer.length > MAX_INITIALIZE_LINE_BYTES) {
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
    buffer += inflight.value;
  }
}
//@ chunk-405cd95w.js:2852-3148 placement
async function pumpStdin(pump) {
  pump.pumping = true;
  try {
    while (!pump.adopted && !pump.ended && !pump.capped && pump.error === undefined) {
      pump.inflight = pump.generator.next();
      let inflight = await pump.inflight;
      pump.inflight = undefined;
      if (inflight.done) pump.ended = true;
      else routeStdinChunk(pump, inflight.value);
    }
  } catch (error) {
    pump.inflight = undefined;
    pump.error = error;
  }
  if (pump.ended || pump.error !== undefined) pump.watch?.watcher.ended();
}
//@ chunk-405cd95w.js:3148-3604 placement
function routeStdinChunk(pump, chunk) {
  let watch = pump.watch;
  if (!watch) {
    pump.stash.push(chunk);
    return;
  }
  let from = 0;
  for (;;) {
    let index = chunk.indexOf(
      `
`,
      from,
    );
    if (index === -1) break;
    let sliced = chunk.slice(from, index);
    from = index + 1;
    let fits = !watch.passing && watch.heldChars + sliced.length <= STDIN_STASH_CHUNK;
    watch.passing = false;
    if (fits && watch.watcher.takes(watch.held.join("") + sliced)) {
      watch.held = [];
      watch.heldChars = 0;
      continue;
    }
    flushHeldWatchItems(pump, watch);
    pump.stash.push(
      sliced +
        `
`,
    );
  }
  if (from === chunk.length) return;
  let rest = from === 0 ? chunk : chunk.slice(from);
  if (watch.passing) {
    pump.stash.push(rest);
    return;
  }
  watch.held.push(rest);
  watch.heldChars += rest.length;
  if (watch.heldChars > STDIN_STASH_CHUNK) {
    flushHeldWatchItems(pump, watch);
    watch.passing = true;
  }
}
//@ chunk-405cd95w.js:3604-3680 placement
function flushHeldWatchItems(pump, watch) {
  for (let item of watch.held) pump.stash.push(item);
  watch.held = [];
  watch.heldChars = 0;
}
//@ chunk-405cd95w.js:3680-3740 placement
function endWatch(pump, watch) {
  if (pump.watch !== watch) return;
  flushHeldWatchItems(pump, watch);
  pump.watch = undefined;
}
//@ chunk-405cd95w.js:3740-4051 placement
async function* replayStdinStash(pump) {
  let pumped = false;
  try {
    while (pump.stash.length > 0) yield pump.stash.shift();
    if (pump.inflight) {
      await pump.inflight.catch(() => {});
      while (pump.stash.length > 0) yield pump.stash.shift();
    }
    if (pump.error !== undefined) throw pump.error;
    if (pump.ended) return;
    pumped = true;
    yield* pump.generator;
  } finally {
    if (!pumped && !pump.ended) pump.generator.return(undefined).catch(() => {});
  }
}
//@ chunk-405cd95w.js:4051-5445 placement
function parseInitializeLine(line) {
  if (line === null) {
    logForDebugging("--await-initialize: stdin ended before an initialize request arrived", {
      level: "warn",
    });
    logFeatureSad("sdk_launch_initialize", "stdin_ended");
    return {
      kind: "absent",
    };
  }
  if (line === FIRST_LINE_TOO_LONG) {
    logForDebugging("--await-initialize: first stdin line exceeds the line-size ceiling; not parsed", {
      level: "error",
    });
    logFeatureBad("sdk_launch_initialize", "first_line_too_long");
    return {
      kind: "absent",
    };
  }
  let message;
  try {
    message = normalizeControlMessage(jsonParse(stripBom(line)));
  } catch {
    logFeatureBad("sdk_launch_initialize", "first_line_not_json");
    return {
      kind: "violation",
      cause: "first_line",
      message:
        "Error: --await-initialize requires the initialize control request as the first stdin line, and the first line is not valid JSON.",
    };
  }
  let parsed = INITIALIZE_REQUEST_SCHEMA().safeParse(message);
  if (!parsed.success) {
    logFeatureBad("sdk_launch_initialize", "first_line_not_initialize");
    return {
      kind: "violation",
      cause: "first_line",
      message:
        "Error: --await-initialize requires the initialize control request as the first stdin line, and the first line is a different message.",
    };
  }
  let plugins = array(SDKLocalMessageSchema()).optional().safeParse(parsed.data.request.plugins);
  if (!plugins.success) {
    logFeatureBad("sdk_launch_initialize", "plugins_malformed");
    return {
      kind: "violation",
      cause: "plugins",
      message:
        "Error: initialize.plugins must be an array of { type: 'local', path: string, skipMcpDiscovery?: boolean } entries.",
    };
  }
  let entries = plugins.data ?? [];
  logFeatureOk("sdk_launch_initialize");
  return {
    kind: "applied",
    pluginDirs: entries.filter((plugin) => !plugin.skipMcpDiscovery).map((plugin) => plugin.path),
    pluginDirsNoMcp: entries.filter((plugin) => plugin.skipMcpDiscovery).map((plugin) => plugin.path),
  };
}
//@ chunk-405cd95w.js:5445-5517 placement
var STDIN_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STDIN_MESSAGES_MARKER;
deferInit("chunk-405cd95w.js:5445", () => {
  STDIN_LIMITS = 10485760;
  STDIN_MESSAGES_MARKER = Symbol("stream-json messages of this process's stdin");
});
//@ chunk-405cd95w.js:5517-5568 placement
function isStreamJsonStdin(stream) {
  return typeof stream !== "string" && STDIN_MESSAGES_MARKER in stream;
}
//@ chunk-405cd95w.js:5568-6027 placement
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
  isStreamJsonStdin,
  applyInitializePlugins,
  adoptStdinStream,
  readStreamJsonStdin,
  STDIN_MESSAGES_MARKER,
  STDIN_LIMITS,
  startAwaitInitialize,
  awaitInitializeResult,
  startStdinPump,
  watchStdinLines,
};
