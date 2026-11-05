/**
 * @anthropic-ai/sdk/tools/agent-toolset/node.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-m6wtswwx.js (26)
 * attribution: esm-fingerprint 22, esm-layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as fsPromisesModule from "fs/promises";
import * as child_processModule from "child_process";
import * as cryptoModule from "crypto";
import * as fsModule from "fs";
import * as pathModule from "path";
import * as readlineModule from "readline";
import { AnthropicError } from "../../core/error.mjs";
import {
  confineToRoot,
  containingRoot,
  fsErrorMessage,
  DIR_CREATE_MODE,
  atomicWriteFile,
  canonicalize,
  isWithin,
} from "./fs-util.mjs";
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../../internal/tslib.mjs";
import { promiseWithResolvers } from "../../internal/utils/promise.mjs";
import { betaTool } from "../../helpers/beta/json-schema.mjs";
import { ToolError } from "../../lib/tools/ToolError.mjs";

//@ chunk-m6wtswwx.js:26431-26563 esm-fingerprint
var _BashSession_instances;
var _BashSession_proc;
var _BashSession_buf;
var _BashSession_truncated;
var _BashSession_closed;
var _BashSession_waiting;
var _BashSession_append;
var _LineRangeCollector_instances;
var _LineRangeCollector_filePath;
var _LineRangeCollector_startLine;
var _LineRangeCollector_endLine;
var _LineRangeCollector_start;
var _LineRangeCollector_end;
var _LineRangeCollector_limit;
var _LineRangeCollector_line;
var _LineRangeCollector_collected;
var _LineRangeCollector_collectedBytes;
var _LineRangeCollector_collect;
var _LineRangeCollector_overLimitError;
var BASH_OUTPUT_LIMIT = 102400;
var BASH_DEFAULT_TIMEOUT_MS = 120000;
var DEFAULT_MAX_FILE_BYTES = 262144;
var READ_STREAM_CHUNK_BYTES = 65536;
var NEWLINE = Buffer.from(`
`);
var GREP_OUTPUT_LIMIT = 102400;
var GREP_MAX_LINE_LENGTH = 2000;
var GLOB_RESULT_LIMIT = 200;
//@ chunk-m6wtswwx.js:26563-26690 esm-fingerprint
class BashTimeoutError extends AnthropicError {
  constructor(timeoutMs) {
    super(`bash command timed out after ${timeoutMs}ms`);
    this.name = "BashTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}
//@ chunk-m6wtswwx.js:26690-26736 esm-fingerprint
var ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
var fsGlob = fsPromisesModule.glob;
//@ chunk-m6wtswwx.js:26736-26774 esm-layout
function resolveMaxBytes(configured) {
  return configured === undefined ? DEFAULT_MAX_FILE_BYTES : configured;
}
//@ chunk-m6wtswwx.js:26774-27205 esm-layout
function rejectUnrestrictedPaths(value) {
  if (value === undefined) return;
  throw new AnthropicError(
    "The `unrestrictedPaths` option you passed to the agent toolset (AgentToolContext) is no longer supported. The toolset's file tools (read, write, edit, glob, grep) are now always confined to the working directory plus the directories listed in `allowedRoots`. Remove `unrestrictedPaths` from your context; to let the file tools reach any other directory, add it to `allowedRoots`.",
  );
}
//@ chunk-m6wtswwx.js:27205-27264 esm-layout
function allowedRootCandidates(ctx) {
  return [
    betaBashTool(ctx),
    betaReadTool(ctx),
    betaWriteTool(ctx),
    betaEditTool(ctx),
    betaGlobTool(ctx),
    betaGrepTool(ctx),
  ];
}
//@ chunk-m6wtswwx.js:27264-27366 esm-fingerprint
async function resolvePath(ctx, p) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  return confineToRoot(ctx.workdir, p, {
    allowedRoots: ctx.allowedRoots ?? [],
  });
}
//@ chunk-m6wtswwx.js:27366-27416 esm-fingerprint
function readOnlyRootFor(ctx, target) {
  return containingRoot(ctx.readOnlyRoots ?? [], target);
}
//@ chunk-m6wtswwx.js:27416-27538 esm-fingerprint
function scrubbedShellEnv() {
  let env = {};
  for (let [key, value] of Object.entries(process.env)) {
    if (key.startsWith("ANTHROPIC_")) continue;
    env[key] = value;
  }
  return env;
}
//@ chunk-m6wtswwx.js:27538-29892 esm-fingerprint
var BashSession = (() => {
  class BashSession {
    constructor(dir, env = scrubbedShellEnv()) {
      _BashSession_instances.add(this);
      _BashSession_proc.set(this, undefined);
      _BashSession_buf.set(this, "");
      _BashSession_truncated.set(this, false);
      _BashSession_closed.set(this, false);
      _BashSession_waiting.set(this, null);
      __classPrivateFieldSet(
        this,
        _BashSession_proc,
        child_processModule.spawn("/bin/bash", ["--noprofile", "--norc"], {
          cwd: dir,
          env: {
            ...env,
            PS1: "",
            PS2: "",
            TERM: "dumb",
          },
          stdio: ["pipe", "pipe", "pipe"],
          detached: true,
        }),
        "f",
      );
      __classPrivateFieldGet(this, _BashSession_proc, "f").stdout.setEncoding("utf8");
      __classPrivateFieldGet(this, _BashSession_proc, "f").stderr.setEncoding("utf8");
      __classPrivateFieldGet(this, _BashSession_proc, "f").stdout.on("data", (d) =>
        __classPrivateFieldGet(this, _BashSession_instances, "m", _BashSession_append).call(this, d),
      );
      __classPrivateFieldGet(this, _BashSession_proc, "f").stderr.on("data", (d) =>
        __classPrivateFieldGet(this, _BashSession_instances, "m", _BashSession_append).call(this, d),
      );
      __classPrivateFieldGet(this, _BashSession_proc, "f").once("close", () => {
        __classPrivateFieldSet(this, _BashSession_closed, true, "f");
        let w = __classPrivateFieldGet(this, _BashSession_waiting, "f");
        __classPrivateFieldSet(this, _BashSession_waiting, null, "f");
        w?.resolve();
      });
    }
    get closed() {
      return __classPrivateFieldGet(this, _BashSession_closed, "f");
    }
    async exec(command, opts = {}) {
      if (__classPrivateFieldGet(this, _BashSession_closed, "f"))
        throw new AnthropicError("bash session terminated");
      let timeoutMs = opts.timeoutMs ?? BASH_DEFAULT_TIMEOUT_MS;
      let signal = opts.signal;
      signal?.throwIfAborted();
      __classPrivateFieldSet(this, _BashSession_buf, "", "f");
      __classPrivateFieldSet(this, _BashSession_truncated, false, "f");
      let sentinel = `__ANT_CMD_${cryptoModule.randomUUID()}_DONE__`;
      let sentinelSplit = `${sentinel.slice(0, 8)}''${sentinel.slice(8)}`;
      let wrapped = `{ ${command}
} </dev/null 2>&1; printf '\\n${sentinelSplit}%d\\n' $?
`;
      __classPrivateFieldGet(this, _BashSession_proc, "f").stdin.write(wrapped);
      if (__classPrivateFieldGet(this, _BashSession_buf, "f").indexOf(sentinel) < 0) {
        let { promise: sentinelSeen, resolve } = promiseWithResolvers();
        __classPrivateFieldSet(
          this,
          _BashSession_waiting,
          {
            sentinel,
            resolve,
          },
          "f",
        );
        let timer;
        let onAbort;
        try {
          await Promise.race([
            sentinelSeen,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new BashTimeoutError(timeoutMs)), timeoutMs);
            }),
            new Promise((_, reject) => {
              if (!signal) return;
              onAbort = () => reject(signal.reason);
              signal.addEventListener("abort", onAbort, {
                once: true,
              });
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
          if (onAbort && signal) signal.removeEventListener("abort", onAbort);
          __classPrivateFieldSet(this, _BashSession_waiting, null, "f");
        }
      }
      let idx = __classPrivateFieldGet(this, _BashSession_buf, "f").indexOf(sentinel);
      if (idx < 0) throw new AnthropicError("bash session terminated");
      let m = __classPrivateFieldGet(this, _BashSession_buf, "f")
        .slice(idx + sentinel.length)
        .match(/^(-?\d+)/);
      let exitCode = m ? parseInt(m[1], 10) : -1;
      let out = __classPrivateFieldGet(this, _BashSession_buf, "f")
        .slice(0, idx)
        .replace(ANSI_RE, "")
        .replace(/\n+$/, "");
      if (__classPrivateFieldGet(this, _BashSession_truncated, "f"))
        out = `[output truncated]
${out}`;
      return {
        output: out,
        exitCode,
      };
    }
    close() {
      if (__classPrivateFieldGet(this, _BashSession_closed, "f")) return;
      __classPrivateFieldSet(this, _BashSession_closed, true, "f");
      let w = __classPrivateFieldGet(this, _BashSession_waiting, "f");
      __classPrivateFieldSet(this, _BashSession_waiting, null, "f");
      w?.resolve();
      __classPrivateFieldGet(this, _BashSession_proc, "f").stdout.destroy();
      __classPrivateFieldGet(this, _BashSession_proc, "f").stderr.destroy();
      __classPrivateFieldGet(this, _BashSession_proc, "f").stdin.destroy();
      try {
        process.kill(-__classPrivateFieldGet(this, _BashSession_proc, "f").pid, "SIGKILL");
      } catch {
        __classPrivateFieldGet(this, _BashSession_proc, "f").kill("SIGKILL");
      }
      __classPrivateFieldGet(this, _BashSession_proc, "f").unref();
    }
  }
  _BashSession_proc = new WeakMap();
  _BashSession_buf = new WeakMap();
  _BashSession_truncated = new WeakMap();
  _BashSession_closed = new WeakMap();
  _BashSession_waiting = new WeakMap();
  _BashSession_instances = new WeakSet();
  _BashSession_append = function (d) {
    __classPrivateFieldSet(
      this,
      _BashSession_buf,
      __classPrivateFieldGet(this, _BashSession_buf, "f") + d,
      "f",
    );
    if (__classPrivateFieldGet(this, _BashSession_buf, "f").length > BASH_OUTPUT_LIMIT) {
      __classPrivateFieldSet(
        this,
        _BashSession_buf,
        __classPrivateFieldGet(this, _BashSession_buf, "f").slice(
          __classPrivateFieldGet(this, _BashSession_buf, "f").length - BASH_OUTPUT_LIMIT,
        ),
        "f",
      );
      __classPrivateFieldSet(this, _BashSession_truncated, true, "f");
    }
    if (
      __classPrivateFieldGet(this, _BashSession_waiting, "f") &&
      __classPrivateFieldGet(this, _BashSession_buf, "f").indexOf(
        __classPrivateFieldGet(this, _BashSession_waiting, "f").sentinel,
      ) >= 0
    ) {
      let w = __classPrivateFieldGet(this, _BashSession_waiting, "f");
      __classPrivateFieldSet(this, _BashSession_waiting, null, "f");
      w.resolve();
    }
  };
  return BashSession;
})();
//@ chunk-m6wtswwx.js:29892-30880 esm-fingerprint
function betaBashTool(ctx) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  let session;
  let tail = Promise.resolve();
  return betaTool({
    name: "bash",
    description: "Run a bash command in a persistent shell. State (cwd, env vars) persists across calls.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to run",
        },
        restart: {
          type: "boolean",
          description: "Restart the persistent shell before running",
        },
        timeout_ms: {
          type: "integer",
          description: "Per-call timeout in milliseconds",
        },
      },
    },
    run: async ({ command, restart, timeout_ms }, context) => {
      let prev = tail;
      let gate = promiseWithResolvers();
      tail = gate.promise;
      try {
        await prev;
      } catch {}
      try {
        if (restart) {
          session?.close();
          session = undefined;
        }
        if (!command) {
          if (restart) return "bash session restarted";
          throw new ToolError("bash: command is required");
        }
        session ?? (session = new BashSession(ctx.workdir, ctx.env));
        try {
          let { output, exitCode } = await session.exec(command, {
            timeoutMs: timeout_ms ?? BASH_DEFAULT_TIMEOUT_MS,
            signal: context?.signal,
          });
          if (exitCode !== 0) throw new ToolError(output || `exit ${exitCode}`);
          return output;
        } catch (e) {
          if (e instanceof ToolError) throw e;
          session.close();
          session = undefined;
          throw new ToolError(`bash: ${e instanceof Error ? e.message : String(e)}`);
        }
      } finally {
        gate.resolve();
      }
    },
    close: () => {
      session?.close();
      session = undefined;
    },
  });
}
//@ chunk-m6wtswwx.js:30880-31966 esm-fingerprint
function betaReadTool(ctx) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  return betaTool({
    name: "read",
    description: "Read a UTF-8 text file relative to the workdir.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
        },
        view_range: {
          type: "array",
          items: {
            type: "integer",
          },
          description: "[start_line, end_line] 1-indexed inclusive",
        },
      },
      required: ["file_path"],
    },
    run: async ({ file_path, view_range }) => {
      if (!file_path) throw new ToolError("read: file_path is required");
      let abs = await resolvePath(ctx, file_path);
      if (view_range?.length && view_range.length !== 2)
        throw new ToolError("read: view_range must be [start_line, end_line]");
      let data;
      try {
        let st = await fsPromisesModule.stat(abs);
        if (!st.isFile()) throw new ToolError(`read: ${file_path} is not a regular file`);
        let limit = resolveMaxBytes(ctx.maxFileBytes);
        if (limit !== null && st.size > limit) {
          if (!view_range?.length)
            throw new ToolError(
              `read: ${file_path} is ${st.size} bytes, exceeds ${limit}-byte limit. Use the view_range parameter to read specific line ranges, e.g. view_range: [1, 500].`,
            );
          let [startLine, endLine] = view_range;
          return await readRangeStreaming(abs, file_path, startLine, endLine, limit);
        }
        data = await fsPromisesModule.readFile(abs, "utf8");
      } catch (e) {
        if (e instanceof ToolError) throw e;
        throw new ToolError(`read: ${fsErrorMessage(e, file_path)}`);
      }
      if (!view_range?.length) return data;
      let [startLine, endLine] = view_range;
      let lines = data.split(`
`);
      let start = Math.max(0, startLine - 1);
      let end = endLine > 0 ? endLine : lines.length;
      return lines.slice(start, end).join(`
`);
    },
  });
}
//@ chunk-m6wtswwx.js:31966-32201 esm-fingerprint
async function readRangeStreaming(abs, filePath, startLine, endLine, limit) {
  let lines = new LineRangeCollector(filePath, startLine, endLine, limit);
  if (lines.rangeIsEmpty()) return "";
  let stream = fsModule.createReadStream(abs, {
    highWaterMark: READ_STREAM_CHUNK_BYTES,
  });
  try {
    for await (let chunk of stream) {
      lines.collectFrom(chunk);
      if (lines.rangeIsCollected()) break;
    }
  } finally {
    stream.destroy();
  }
  return lines.text();
}
//@ chunk-m6wtswwx.js:32201-32973 esm-fingerprint
class LineRangeCollector {
  constructor(filePath, startLine, endLine, limit) {
    _LineRangeCollector_instances.add(this);
    _LineRangeCollector_filePath.set(this, undefined);
    _LineRangeCollector_startLine.set(this, undefined);
    _LineRangeCollector_endLine.set(this, undefined);
    _LineRangeCollector_start.set(this, undefined);
    _LineRangeCollector_end.set(this, undefined);
    _LineRangeCollector_limit.set(this, undefined);
    _LineRangeCollector_line.set(this, 0);
    _LineRangeCollector_collected.set(this, []);
    _LineRangeCollector_collectedBytes.set(this, 0);
    __classPrivateFieldSet(this, _LineRangeCollector_filePath, filePath, "f");
    __classPrivateFieldSet(this, _LineRangeCollector_startLine, startLine, "f");
    __classPrivateFieldSet(this, _LineRangeCollector_endLine, endLine, "f");
    __classPrivateFieldSet(this, _LineRangeCollector_start, Math.max(0, startLine - 1), "f");
    __classPrivateFieldSet(this, _LineRangeCollector_end, endLine > 0 ? endLine : 1 / 0, "f");
    __classPrivateFieldSet(this, _LineRangeCollector_limit, limit, "f");
  }
  rangeIsEmpty() {
    return (
      __classPrivateFieldGet(this, _LineRangeCollector_end, "f") <=
      __classPrivateFieldGet(this, _LineRangeCollector_start, "f")
    );
  }
  rangeIsCollected() {
    return (
      __classPrivateFieldGet(this, _LineRangeCollector_line, "f") >=
      __classPrivateFieldGet(this, _LineRangeCollector_end, "f")
    );
  }
  collectFrom(chunk) {
    var _a;
    let lineStart = 0;
    while (lineStart < chunk.length && !this.rangeIsCollected()) {
      let newline = chunk.indexOf(10, lineStart);
      let lineEnd = newline < 0 ? chunk.length : newline;
      if (
        __classPrivateFieldGet(this, _LineRangeCollector_line, "f") >=
        __classPrivateFieldGet(this, _LineRangeCollector_start, "f")
      )
        __classPrivateFieldGet(this, _LineRangeCollector_instances, "m", _LineRangeCollector_collect).call(
          this,
          chunk.subarray(lineStart, lineEnd),
          newline >= 0,
        );
      if (newline < 0) break;
      __classPrivateFieldSet(
        this,
        _LineRangeCollector_line,
        ((_a = __classPrivateFieldGet(this, _LineRangeCollector_line, "f")), _a++, _a),
        "f",
      );
      lineStart = newline + 1;
    }
  }
  text() {
    return Buffer.concat(
      __classPrivateFieldGet(this, _LineRangeCollector_collected, "f"),
      __classPrivateFieldGet(this, _LineRangeCollector_collectedBytes, "f"),
    ).toString("utf8");
  }
}
//@ chunk-m6wtswwx.js:32973-33801 esm-fingerprint
_LineRangeCollector_filePath = new WeakMap();
_LineRangeCollector_startLine = new WeakMap();
_LineRangeCollector_endLine = new WeakMap();
_LineRangeCollector_start = new WeakMap();
_LineRangeCollector_end = new WeakMap();
_LineRangeCollector_limit = new WeakMap();
_LineRangeCollector_line = new WeakMap();
_LineRangeCollector_collected = new WeakMap();
_LineRangeCollector_collectedBytes = new WeakMap();
_LineRangeCollector_instances = new WeakSet();
_LineRangeCollector_collect = function (lineBytes, newlineTerminated) {
  __classPrivateFieldGet(this, _LineRangeCollector_collected, "f").push(lineBytes);
  __classPrivateFieldSet(
    this,
    _LineRangeCollector_collectedBytes,
    __classPrivateFieldGet(this, _LineRangeCollector_collectedBytes, "f") + lineBytes.length,
    "f",
  );
  if (
    newlineTerminated &&
    __classPrivateFieldGet(this, _LineRangeCollector_line, "f") + 1 <
      __classPrivateFieldGet(this, _LineRangeCollector_end, "f")
  ) {
    __classPrivateFieldGet(this, _LineRangeCollector_collected, "f").push(NEWLINE);
    __classPrivateFieldSet(
      this,
      _LineRangeCollector_collectedBytes,
      __classPrivateFieldGet(this, _LineRangeCollector_collectedBytes, "f") + NEWLINE.length,
      "f",
    );
  }
  if (
    __classPrivateFieldGet(this, _LineRangeCollector_collectedBytes, "f") >
    __classPrivateFieldGet(this, _LineRangeCollector_limit, "f")
  )
    throw __classPrivateFieldGet(
      this,
      _LineRangeCollector_instances,
      "m",
      _LineRangeCollector_overLimitError,
    ).call(this);
};
_LineRangeCollector_overLimitError = function () {
  if (
    __classPrivateFieldGet(this, _LineRangeCollector_end, "f") -
      __classPrivateFieldGet(this, _LineRangeCollector_start, "f") ===
    1
  )
    return new ToolError(
      `read: line ${__classPrivateFieldGet(this, _LineRangeCollector_start, "f") + 1} of ${__classPrivateFieldGet(this, _LineRangeCollector_filePath, "f")} alone exceeds ${__classPrivateFieldGet(this, _LineRangeCollector_limit, "f")}-byte limit. The read tool cannot return part of a line, so view_range cannot narrow this further.`,
    );
  return new ToolError(
    `read: view_range [${__classPrivateFieldGet(this, _LineRangeCollector_startLine, "f")}, ${__classPrivateFieldGet(this, _LineRangeCollector_endLine, "f")}] of ${__classPrivateFieldGet(this, _LineRangeCollector_filePath, "f")} exceeds ${__classPrivateFieldGet(this, _LineRangeCollector_limit, "f")}-byte limit. Narrow the view_range to read a smaller portion.`,
  );
};
//@ chunk-m6wtswwx.js:33801-34461 esm-fingerprint
function betaWriteTool(ctx) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  return betaTool({
    name: "write",
    description: "Write a UTF-8 text file relative to the workdir, creating parent directories as needed.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
        },
        content: {
          type: "string",
        },
      },
      required: ["file_path", "content"],
    },
    run: async ({ file_path, content }) => {
      if (!file_path) throw new ToolError("write: file_path is required");
      let abs = await resolvePath(ctx, file_path);
      let ro = await readOnlyRootFor(ctx, abs);
      if (ro !== undefined) throw new ToolError(`write: ${file_path} is inside read-only directory ${ro}`);
      try {
        await fsPromisesModule.mkdir(pathModule.dirname(abs), {
          recursive: true,
          mode: DIR_CREATE_MODE,
        });
        await atomicWriteFile(abs, content ?? "");
      } catch (e) {
        throw new ToolError(`write: ${fsErrorMessage(e, file_path)}`);
      }
      return `wrote ${Buffer.byteLength(content ?? "")} bytes to ${file_path}`;
    },
  });
}
//@ chunk-m6wtswwx.js:34461-35832 esm-fingerprint
function betaEditTool(ctx) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  return betaTool({
    name: "edit",
    description:
      "Replace old_string with new_string in a file. old_string must be unique unless replace_all.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
        },
        old_string: {
          type: "string",
        },
        new_string: {
          type: "string",
        },
        replace_all: {
          type: "boolean",
        },
      },
      required: ["file_path", "old_string", "new_string"],
    },
    run: async ({ file_path, old_string, new_string, replace_all }) => {
      if (!file_path) throw new ToolError("edit: file_path is required");
      if (!old_string) throw new ToolError("edit: old_string is required");
      let abs = await resolvePath(ctx, file_path);
      let ro = await readOnlyRootFor(ctx, abs);
      if (ro !== undefined) throw new ToolError(`edit: ${file_path} is inside read-only directory ${ro}`);
      let data;
      try {
        let st = await fsPromisesModule.stat(abs);
        if (!st.isFile()) throw new ToolError(`edit: ${file_path} is not a regular file`);
        let limit = resolveMaxBytes(ctx.maxFileBytes);
        if (limit !== null && st.size > limit)
          throw new ToolError(
            `edit: ${file_path} is ${st.size} bytes, exceeds ${limit}-byte limit. The edit tool loads the whole file and cannot modify a file this large.`,
          );
        data = await fsPromisesModule.readFile(abs, "utf8");
      } catch (e) {
        if (e instanceof ToolError) throw e;
        throw new ToolError(`edit: ${fsErrorMessage(e, file_path)}`);
      }
      let count = data.split(old_string).length - 1;
      if (count === 0) throw new ToolError(`edit: old_string not found in ${file_path}`);
      let updated;
      if (replace_all) updated = data.split(old_string).join(new_string);
      else {
        if (count > 1)
          throw new ToolError(`edit: old_string appears ${count} times in ${file_path} (must be unique)`);
        updated = data.replace(old_string, () => new_string);
      }
      try {
        await atomicWriteFile(abs, updated);
      } catch (e) {
        throw new ToolError(`edit: write: ${fsErrorMessage(e, file_path)}`);
      }
      return `edited ${file_path} (${replace_all ? count : 1} replacement(s))`;
    },
  });
}
//@ chunk-m6wtswwx.js:35832-35889 esm-fingerprint
function patternCanAscend(pattern) {
  return pattern.split(/[\\/{},]/).includes("..");
}
//@ chunk-m6wtswwx.js:35889-37073 esm-fingerprint
function betaGlobTool(ctx) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  return betaTool({
    name: "glob",
    description:
      "Match files under the workdir against a glob pattern. Results are mtime-sorted, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
        },
        path: {
          type: "string",
          description: "Directory to search in. Defaults to the workdir.",
        },
      },
      required: ["pattern"],
    },
    run: async ({ pattern, path: searchPath }) => {
      if (!pattern) throw new ToolError("glob: pattern is required");
      if (pathModule.isAbsolute(pattern))
        throw new ToolError(
          "glob: absolute pattern not permitted; pass a relative pattern (and optionally path)",
        );
      if (patternCanAscend(pattern)) throw new ToolError('glob: ".." is not permitted in the pattern');
      let root = searchPath ? await resolvePath(ctx, searchPath) : pathModule.resolve(ctx.workdir);
      let realRoot = searchPath ? root : await canonicalize(root);
      let matches = [];
      let remaining = WALK_MAX_ENTRIES;
      try {
        for await (let entry of fsGlob(pattern, {
          cwd: root,
          withFileTypes: true,
          exclude: (d) => d.name === ".git" || d.name === "node_modules",
        })) {
          if (remaining-- <= 0) break;
          if (!entry.isFile()) continue;
          let full = pathModule.join(entry.parentPath, entry.name);
          let real;
          try {
            real = await fsPromisesModule.realpath(full);
          } catch {
            continue;
          }
          if (!isWithin(realRoot, real)) continue;
          let mtime = 0;
          try {
            mtime = (await fsPromisesModule.stat(full)).mtimeMs;
          } catch {}
          matches.push({
            path: full,
            mtime,
          });
        }
      } catch (e) {
        throw new ToolError(`glob: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (matches.length === 0) return "no matches";
      matches.sort((entry, b) => b.mtime - entry.mtime);
      return matches.slice(0, GLOB_RESULT_LIMIT).map((m) => m.path).join(`
`);
    },
  });
}
//@ chunk-m6wtswwx.js:37073-37540 esm-fingerprint
function betaGrepTool(ctx) {
  rejectUnrestrictedPaths(ctx.unrestrictedPaths);
  return betaTool({
    name: "grep",
    description: "Search file contents for a regex. Uses ripgrep if available, otherwise a built-in walker.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
        },
        path: {
          type: "string",
        },
      },
      required: ["pattern"],
    },
    run: async ({ pattern, path: p }, context) => {
      if (!pattern) throw new ToolError("grep: pattern is required");
      let searchPath = pathModule.resolve(ctx.workdir);
      if (p) searchPath = await resolvePath(ctx, p);
      let rg = await findRg();
      return rg
        ? runRipgrep(rg, pattern, searchPath, context?.signal)
        : runWalkGrep(pattern, searchPath, context?.signal);
    },
  });
}
//@ chunk-m6wtswwx.js:37540-38141 esm-fingerprint
function runRipgrep(rg, pattern, searchPath, signal) {
  return new Promise((resolve, reject) => {
    let proc = child_processModule.spawn(rg, ["-n", "--no-heading", "-e", pattern, "--", searchPath], {
      ...(signal
        ? {
            signal,
          }
        : {}),
    });
    let out = "";
    let errOut = "";
    let truncated = false;
    proc.stdout.on("data", (d) => {
      if (truncated) return;
      out += d;
      if (out.length > GREP_OUTPUT_LIMIT) {
        truncated = true;
        out = out.slice(0, GREP_OUTPUT_LIMIT);
        proc.kill("SIGKILL");
      }
    });
    proc.stderr.on("data", (d) => (errOut += d));
    proc.on("close", (code) => {
      if (signal?.aborted) return reject(new ToolError("grep: aborted"));
      if (truncated)
        return resolve(
          out +
            `
[output truncated at ${GREP_OUTPUT_LIMIT} bytes]`,
        );
      if (code === 0) return resolve(out);
      if (code === 1) return resolve("no matches");
      reject(new ToolError(`grep: rg failed: ${errOut || `exit ${code}`}`));
    });
    proc.on("error", (e) => {
      if (signal?.aborted) return reject(new ToolError("grep: aborted"));
      reject(new ToolError(`grep: rg failed: ${e.message}`));
    });
  });
}
//@ chunk-m6wtswwx.js:38141-38604 esm-fingerprint
async function runWalkGrep(pattern, root, signal) {
  let re;
  try {
    re = new RegExp(pattern);
  } catch (e) {
    throw new ToolError(`grep: invalid regex: ${e instanceof Error ? e.message : String(e)}`);
  }
  let hits = [];
  let budget = GREP_OUTPUT_LIMIT;
  let push = (line) => {
    budget -= line.length + 1;
    if (budget < 0) {
      hits.push(`[output truncated at ${GREP_OUTPUT_LIMIT} bytes]`);
      return false;
    }
    hits.push(line);
    return true;
  };
  if ((await fsPromisesModule.stat(root).catch(() => null))?.isFile()) await grepFile(root, re, push);
  else await walk_2(root, "", (rel) => grepFile(pathModule.join(root, rel), re, push), signal);
  if (signal?.aborted) throw new ToolError("grep: aborted");
  if (hits.length === 0) return "no matches";
  return hits.join(`
`);
}
//@ chunk-m6wtswwx.js:38604-38860 esm-fingerprint
async function grepFile(file, re, push) {
  let stream = fsModule.createReadStream(file, {
    encoding: "utf8",
  });
  let rl = readlineModule.createInterface({
    input: stream,
    crlfDelay: 1 / 0,
  });
  let i = 0;
  try {
    for await (let line of rl) {
      i++;
      if (line.length > GREP_MAX_LINE_LENGTH) continue;
      if (re.test(line) && !push(`${file}:${i}:${line}`)) return false;
    }
  } catch {
  } finally {
    stream.destroy();
  }
  return true;
}
//@ chunk-m6wtswwx.js:38860-38879 esm-layout
var WALK_MAX_DEPTH = 40;
var WALK_MAX_ENTRIES = 50000;
//@ chunk-m6wtswwx.js:38879-39314 esm-fingerprint
async function walk_2(root, rel, fn, signal) {
  let remaining = WALK_MAX_ENTRIES;
  async function inner(rel, depth) {
    if (depth > WALK_MAX_DEPTH) return true;
    if (signal?.aborted) return false;
    let entries;
    try {
      entries = await fsPromisesModule.readdir(pathModule.join(root, rel), {
        withFileTypes: true,
      });
    } catch {
      return true;
    }
    for (let e of entries) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      if (remaining-- <= 0) return false;
      if (signal?.aborted) return false;
      let childRel = rel ? pathModule.join(rel, e.name) : e.name;
      if (e.isDirectory()) {
        if (!(await inner(childRel, depth + 1))) return false;
      } else if (e.isFile()) {
        if ((await fn(childRel)) === false) return false;
      }
    }
    return true;
  }
  await inner(rel, 0);
}
//@ chunk-m6wtswwx.js:39314-39487 esm-fingerprint
async function findRg() {
  let dirs = (process.env.PATH ?? "").split(pathModule.delimiter);
  for (let d of dirs) {
    let candidate = pathModule.join(d, "rg");
    try {
      await fsPromisesModule.access(candidate, fsModule.constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
}
export { allowedRootCandidates };
