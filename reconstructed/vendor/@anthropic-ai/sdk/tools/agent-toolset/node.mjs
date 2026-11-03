/**
 * @anthropic-ai/sdk/tools/agent-toolset/node.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (26)
 * attribution: esm-fingerprint 22, esm-layout 4
 */
import * as fsPromisesModule from "fs/promises";
import * as child_processModule from "child_process";
import * as cryptoModule from "crypto";
import * as fsModule from "fs";
import * as pathModule from "path";
import * as readlineModule from "readline";
import { pr } from "../../core/error.mjs";
import { Ie, ue, P, z, pe, q, te } from "./fs-util.mjs";
import { Kn, ke } from "../../internal/tslib.mjs";
import { SEn } from "../../internal/utils/promise.mjs";
import { R } from "../../helpers/beta/json-schema.mjs";
import { ch } from "../../lib/tools/ToolError.mjs";

//@ chunk-2cw52qnf.js:26431-26563 esm-fingerprint
var le,
  _,
  S,
  K,
  A,
  b,
  Me,
  fe,
  V,
  de,
  he,
  D,
  C,
  Y,
  x,
  X,
  N,
  tt,
  Je,
  Ze = 102400,
  nt = 120000,
  Yt = 262144,
  qt = 65536,
  buffer = Buffer.from(`
`),
  J = 102400,
  zt = 2000,
  Gt = 200;
//@ chunk-2cw52qnf.js:26563-26690 esm-fingerprint
class BashTimeoutError extends pr {
  constructor(r) {
    super(`bash command timed out after ${r}ms`);
    ((this.name = "BashTimeoutError"), (this.timeoutMs = r));
  }
}
//@ chunk-2cw52qnf.js:26690-26736 esm-fingerprint
var Ht = /\x1b\[[0-9;?]*[ -/]*[@-~]/g,
  glob = fsPromisesModule.glob;
//@ chunk-2cw52qnf.js:26736-26774 esm-layout
function st(r) {
  return r === void 0 ? Yt : r;
}
//@ chunk-2cw52qnf.js:26774-27205 esm-layout
function F(r) {
  if (r === void 0) return;
  throw new pr(
    "The `unrestrictedPaths` option you passed to the agent toolset (AgentToolContext) is no longer supported. The toolset's file tools (read, write, edit, glob, grep) are now always confined to the working directory plus the directories listed in `allowedRoots`. Remove `unrestrictedPaths` from your context; to let the file tools reach any other directory, add it to `allowedRoots`.",
  );
}
//@ chunk-2cw52qnf.js:27205-27264 esm-layout
function Wr(r) {
  return [Jt(r), Zt(r), er(r), tr(r), ir(r), nr(r)];
}
//@ chunk-2cw52qnf.js:27264-27366 esm-fingerprint
async function Q(r, e) {
  return (F(r.unrestrictedPaths), Ie(r.workdir, e, { allowedRoots: r.allowedRoots ?? [] }));
}
//@ chunk-2cw52qnf.js:27366-27416 esm-fingerprint
function at(r, e) {
  return ue(r.readOnlyRoots ?? [], e);
}
//@ chunk-2cw52qnf.js:27416-27538 esm-fingerprint
function Vt() {
  let r = {};
  for (let [e, t] of Object.entries(process.env)) {
    if (e.startsWith("ANTHROPIC_")) continue;
    r[e] = t;
  }
  return r;
}
//@ chunk-2cw52qnf.js:27538-29892 esm-fingerprint
var Xt = (() => {
  class r {
    constructor(e, t = Vt()) {
      (le.add(this),
        _.set(this, void 0),
        S.set(this, ""),
        K.set(this, !1),
        A.set(this, !1),
        b.set(this, null),
        Kn(
          this,
          _,
          child_processModule.spawn("/bin/bash", ["--noprofile", "--norc"], {
            cwd: e,
            env: { ...t, PS1: "", PS2: "", TERM: "dumb" },
            stdio: ["pipe", "pipe", "pipe"],
            detached: !0,
          }),
          "f",
        ),
        ke(this, _, "f").stdout.setEncoding("utf8"),
        ke(this, _, "f").stderr.setEncoding("utf8"),
        ke(this, _, "f").stdout.on("data", (n) => ke(this, le, "m", Me).call(this, n)),
        ke(this, _, "f").stderr.on("data", (n) => ke(this, le, "m", Me).call(this, n)),
        ke(this, _, "f").once("close", () => {
          Kn(this, A, !0, "f");
          let n = ke(this, b, "f");
          (Kn(this, b, null, "f"), n?.resolve());
        }));
    }
    get closed() {
      return ke(this, A, "f");
    }
    async exec(e, t = {}) {
      if (ke(this, A, "f")) throw new pr("bash session terminated");
      let n = t.timeoutMs ?? nt,
        signal = t.signal;
      (signal?.throwIfAborted(), Kn(this, S, "", "f"), Kn(this, K, !1, "f"));
      let o = `__ANT_CMD_${cryptoModule.randomUUID()}_DONE__`,
        s = `${o.slice(0, 8)}''${o.slice(8)}`,
        a = `{ ${e}
} </dev/null 2>&1; printf '\\n${s}%d\\n' $?
`;
      if ((ke(this, _, "f").stdin.write(a), ke(this, S, "f").indexOf(o) < 0)) {
        let { promise: promise, resolve: resolve } = SEn();
        Kn(this, b, { sentinel: o, resolve: resolve }, "f");
        let M, ee;
        try {
          await Promise.race([
            promise,
            new Promise((ft, me) => {
              M = setTimeout(() => me(new BashTimeoutError(n)), n);
            }),
            new Promise((ft, me) => {
              if (!signal) return;
              ((ee = () => me(signal.reason)), signal.addEventListener("abort", ee, { once: !0 }));
            }),
          ]);
        } finally {
          if (M) clearTimeout(M);
          if (ee && signal) signal.removeEventListener("abort", ee);
          Kn(this, b, null, "f");
        }
      }
      let index = ke(this, S, "f").indexOf(o);
      if (index < 0) throw new pr("bash session terminated");
      let match = ke(this, S, "f")
          .slice(index + o.length)
          .match(/^(-?\d+)/),
        h = match ? parseInt(match[1], 10) : -1,
        replaced = ke(this, S, "f").slice(0, index).replace(Ht, "").replace(/\n+$/, "");
      if (ke(this, K, "f"))
        replaced = `[output truncated]
${replaced}`;
      return { output: replaced, exitCode: h };
    }
    close() {
      if (ke(this, A, "f")) return;
      Kn(this, A, !0, "f");
      let e = ke(this, b, "f");
      (Kn(this, b, null, "f"),
        e?.resolve(),
        ke(this, _, "f").stdout.destroy(),
        ke(this, _, "f").stderr.destroy(),
        ke(this, _, "f").stdin.destroy());
      try {
        process.kill(-ke(this, _, "f").pid, "SIGKILL");
      } catch {
        ke(this, _, "f").kill("SIGKILL");
      }
      ke(this, _, "f").unref();
    }
  }
  return (
    (_ = new WeakMap()),
    (S = new WeakMap()),
    (K = new WeakMap()),
    (A = new WeakMap()),
    (b = new WeakMap()),
    (le = new WeakSet()),
    (Me = function (t) {
      if ((Kn(this, S, ke(this, S, "f") + t, "f"), ke(this, S, "f").length > Ze))
        (Kn(this, S, ke(this, S, "f").slice(ke(this, S, "f").length - Ze), "f"), Kn(this, K, !0, "f"));
      if (ke(this, b, "f") && ke(this, S, "f").indexOf(ke(this, b, "f").sentinel) >= 0) {
        let n = ke(this, b, "f");
        (Kn(this, b, null, "f"), n.resolve());
      }
    }),
    r
  );
})();
//@ chunk-2cw52qnf.js:29892-30880 esm-fingerprint
function Jt(r) {
  F(r.unrestrictedPaths);
  let e,
    resolved = Promise.resolve();
  return R({
    name: "bash",
    description: "Run a bash command in a persistent shell. State (cwd, env vars) persists across calls.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run" },
        restart: { type: "boolean", description: "Restart the persistent shell before running" },
        timeout_ms: { type: "integer", description: "Per-call timeout in milliseconds" },
      },
    },
    run: async ({ command: command, restart: restart, timeout_ms: timeout_ms }, s) => {
      let a = resolved,
        l = SEn();
      resolved = l.promise;
      try {
        await a;
      } catch {}
      try {
        if (restart) (e?.close(), (e = void 0));
        if (!command) {
          if (restart) return "bash session restarted";
          throw new ch("bash: command is required");
        }
        e ?? (e = new Xt(r.workdir, r.env));
        try {
          let { output: output, exitCode: exitCode } = await e.exec(command, {
            timeoutMs: timeout_ms ?? nt,
            signal: s?.signal,
          });
          if (exitCode !== 0) throw new ch(output || `exit ${exitCode}`);
          return output;
        } catch (error) {
          if (error instanceof ch) throw error;
          throw (
            e.close(),
            (e = void 0),
            new ch(`bash: ${error instanceof Error ? error.message : String(error)}`)
          );
        }
      } finally {
        l.resolve();
      }
    },
    close: () => {
      (e?.close(), (e = void 0));
    },
  });
}
//@ chunk-2cw52qnf.js:30880-31966 esm-fingerprint
function Zt(r) {
  return (
    F(r.unrestrictedPaths),
    R({
      name: "read",
      description: "Read a UTF-8 text file relative to the workdir.",
      inputSchema: {
        type: "object",
        properties: {
          file_path: { type: "string" },
          view_range: {
            type: "array",
            items: { type: "integer" },
            description: "[start_line, end_line] 1-indexed inclusive",
          },
        },
        required: ["file_path"],
      },
      run: async ({ file_path: file_path, view_range: view_range }) => {
        if (!file_path) throw new ch("read: file_path is required");
        let n = await Q(r, file_path);
        if (view_range?.length && view_range.length !== 2)
          throw new ch("read: view_range must be [start_line, end_line]");
        let i;
        try {
          let stats = await fsPromisesModule.stat(n);
          if (!stats.isFile()) throw new ch(`read: ${file_path} is not a regular file`);
          let h = st(r.maxFileBytes);
          if (h !== null && stats.size > h) {
            if (!view_range?.length)
              throw new ch(
                `read: ${file_path} is ${stats.size} bytes, exceeds ${h}-byte limit. Use the view_range parameter to read specific line ranges, e.g. view_range: [1, 500].`,
              );
            let [y, O] = view_range;
            return await Qt(n, file_path, y, O, h);
          }
          i = await fsPromisesModule.readFile(n, "utf8");
        } catch (error) {
          if (error instanceof ch) throw error;
          throw new ch(`read: ${P(error, file_path)}`);
        }
        if (!view_range?.length) return i;
        let [o, s] = view_range,
          parts = i.split(`
`),
          max = Math.max(0, o - 1),
          f = s > 0 ? s : parts.length;
        return parts.slice(max, f).join(`
`);
      },
    })
  );
}
//@ chunk-2cw52qnf.js:31966-32201 esm-fingerprint
async function Qt(r, e, t, n, i) {
  let o = new ct(e, t, n, i);
  if (o.rangeIsEmpty()) return "";
  let readStream = fsModule.createReadStream(r, { highWaterMark: qt });
  try {
    for await (let a of readStream) if ((o.collectFrom(a), o.rangeIsCollected())) break;
  } finally {
    readStream.destroy();
  }
  return o.text();
}
//@ chunk-2cw52qnf.js:32201-32973 esm-fingerprint
class ct {
  constructor(r, e, t, n) {
    (fe.add(this),
      V.set(this, void 0),
      de.set(this, void 0),
      he.set(this, void 0),
      D.set(this, void 0),
      C.set(this, void 0),
      Y.set(this, void 0),
      x.set(this, 0),
      X.set(this, []),
      N.set(this, 0),
      Kn(this, V, r, "f"),
      Kn(this, de, e, "f"),
      Kn(this, he, t, "f"),
      Kn(this, D, Math.max(0, e - 1), "f"),
      Kn(this, C, t > 0 ? t : 1 / 0, "f"),
      Kn(this, Y, n, "f"));
  }
  rangeIsEmpty() {
    return ke(this, C, "f") <= ke(this, D, "f");
  }
  rangeIsCollected() {
    return ke(this, x, "f") >= ke(this, C, "f");
  }
  collectFrom(r) {
    var e;
    let t = 0;
    while (t < r.length && !this.rangeIsCollected()) {
      let index = r.indexOf(10, t),
        i = index < 0 ? r.length : index;
      if (ke(this, x, "f") >= ke(this, D, "f"))
        ke(this, fe, "m", tt).call(this, r.subarray(t, i), index >= 0);
      if (index < 0) break;
      (Kn(this, x, ((e = ke(this, x, "f")), e++, e), "f"), (t = index + 1));
    }
  }
  text() {
    return Buffer.concat(ke(this, X, "f"), ke(this, N, "f")).toString("utf8");
  }
}
//@ chunk-2cw52qnf.js:32973-33801 esm-fingerprint
((V = new WeakMap()),
  (de = new WeakMap()),
  (he = new WeakMap()),
  (D = new WeakMap()),
  (C = new WeakMap()),
  (Y = new WeakMap()),
  (x = new WeakMap()),
  (X = new WeakMap()),
  (N = new WeakMap()),
  (fe = new WeakSet()),
  (tt = function (e, t) {
    if (
      (ke(this, X, "f").push(e),
      Kn(this, N, ke(this, N, "f") + e.length, "f"),
      t && ke(this, x, "f") + 1 < ke(this, C, "f"))
    )
      (ke(this, X, "f").push(buffer), Kn(this, N, ke(this, N, "f") + buffer.length, "f"));
    if (ke(this, N, "f") > ke(this, Y, "f")) throw ke(this, fe, "m", Je).call(this);
  }),
  (Je = function () {
    if (ke(this, C, "f") - ke(this, D, "f") === 1)
      return new ch(
        `read: line ${ke(this, D, "f") + 1} of ${ke(this, V, "f")} alone exceeds ${ke(this, Y, "f")}-byte limit. The read tool cannot return part of a line, so view_range cannot narrow this further.`,
      );
    return new ch(
      `read: view_range [${ke(this, de, "f")}, ${ke(this, he, "f")}] of ${ke(this, V, "f")} exceeds ${ke(this, Y, "f")}-byte limit. Narrow the view_range to read a smaller portion.`,
    );
  }));
//@ chunk-2cw52qnf.js:33801-34461 esm-fingerprint
function er(r) {
  return (
    F(r.unrestrictedPaths),
    R({
      name: "write",
      description: "Write a UTF-8 text file relative to the workdir, creating parent directories as needed.",
      inputSchema: {
        type: "object",
        properties: { file_path: { type: "string" }, content: { type: "string" } },
        required: ["file_path", "content"],
      },
      run: async ({ file_path: file_path, content: content }) => {
        if (!file_path) throw new ch("write: file_path is required");
        let n = await Q(r, file_path),
          i = await at(r, n);
        if (i !== void 0) throw new ch(`write: ${file_path} is inside read-only directory ${i}`);
        try {
          (await fsPromisesModule.mkdir(pathModule.dirname(n), { recursive: !0, mode: z }),
            await pe(n, content ?? ""));
        } catch (error) {
          throw new ch(`write: ${P(error, file_path)}`);
        }
        return `wrote ${Buffer.byteLength(content ?? "")} bytes to ${file_path}`;
      },
    })
  );
}
//@ chunk-2cw52qnf.js:34461-35832 esm-fingerprint
function tr(r) {
  return (
    F(r.unrestrictedPaths),
    R({
      name: "edit",
      description:
        "Replace old_string with new_string in a file. old_string must be unique unless replace_all.",
      inputSchema: {
        type: "object",
        properties: {
          file_path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" },
          replace_all: { type: "boolean" },
        },
        required: ["file_path", "old_string", "new_string"],
      },
      run: async ({
        file_path: file_path,
        old_string: old_string,
        new_string: new_string,
        replace_all: replace_all,
      }) => {
        if (!file_path) throw new ch("edit: file_path is required");
        if (!old_string) throw new ch("edit: old_string is required");
        let o = await Q(r, file_path),
          s = await at(r, o);
        if (s !== void 0) throw new ch(`edit: ${file_path} is inside read-only directory ${s}`);
        let a;
        try {
          let stats = await fsPromisesModule.stat(o);
          if (!stats.isFile()) throw new ch(`edit: ${file_path} is not a regular file`);
          let h = st(r.maxFileBytes);
          if (h !== null && stats.size > h)
            throw new ch(
              `edit: ${file_path} is ${stats.size} bytes, exceeds ${h}-byte limit. The edit tool loads the whole file and cannot modify a file this large.`,
            );
          a = await fsPromisesModule.readFile(o, "utf8");
        } catch (error) {
          if (error instanceof ch) throw error;
          throw new ch(`edit: ${P(error, file_path)}`);
        }
        let l = a.split(old_string).length - 1;
        if (l === 0) throw new ch(`edit: old_string not found in ${file_path}`);
        let f;
        if (replace_all) f = a.split(old_string).join(new_string);
        else {
          if (l > 1) throw new ch(`edit: old_string appears ${l} times in ${file_path} (must be unique)`);
          f = a.replace(old_string, () => new_string);
        }
        try {
          await pe(o, f);
        } catch (error) {
          throw new ch(`edit: write: ${P(error, file_path)}`);
        }
        return `edited ${file_path} (${replace_all ? l : 1} replacement(s))`;
      },
    })
  );
}
//@ chunk-2cw52qnf.js:35832-35889 esm-fingerprint
function rr(r) {
  return r.split(/[\\/{},]/).includes("..");
}
//@ chunk-2cw52qnf.js:35889-37073 esm-fingerprint
function ir(r) {
  return (
    F(r.unrestrictedPaths),
    R({
      name: "glob",
      description:
        "Match files under the workdir against a glob pattern. Results are mtime-sorted, newest first.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string", description: "Directory to search in. Defaults to the workdir." },
        },
        required: ["pattern"],
      },
      run: async ({ pattern: pattern, path: path }) => {
        if (!pattern) throw new ch("glob: pattern is required");
        if (pathModule.isAbsolute(pattern))
          throw new ch("glob: absolute pattern not permitted; pass a relative pattern (and optionally path)");
        if (rr(pattern)) throw new ch('glob: ".." is not permitted in the pattern');
        let n = path ? await Q(r, path) : pathModule.resolve(r.workdir),
          i = path ? n : await q(n),
          o = [],
          s = lt;
        try {
          for await (let a of glob(pattern, {
            cwd: n,
            withFileTypes: !0,
            exclude: (l) => l.name === ".git" || l.name === "node_modules",
          })) {
            if (s-- <= 0) break;
            if (!a.isFile()) continue;
            let joined = pathModule.join(a.parentPath, a.name),
              f;
            try {
              f = await fsPromisesModule.realpath(joined);
            } catch {
              continue;
            }
            if (!te(i, f)) continue;
            let c = 0;
            try {
              c = (await fsPromisesModule.stat(joined)).mtimeMs;
            } catch {}
            o.push({ path: joined, mtime: c });
          }
        } catch (error) {
          throw new ch(`glob: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (o.length === 0) return "no matches";
        return (
          o.sort((a, l) => l.mtime - a.mtime),
          o.slice(0, Gt).map((a) => a.path).join(`
`)
        );
      },
    })
  );
}
//@ chunk-2cw52qnf.js:37073-37540 esm-fingerprint
function nr(r) {
  return (
    F(r.unrestrictedPaths),
    R({
      name: "grep",
      description:
        "Search file contents for a regex. Uses ripgrep if available, otherwise a built-in walker.",
      inputSchema: {
        type: "object",
        properties: { pattern: { type: "string" }, path: { type: "string" } },
        required: ["pattern"],
      },
      run: async ({ pattern: pattern, path: path }, n) => {
        if (!pattern) throw new ch("grep: pattern is required");
        let resolved = pathModule.resolve(r.workdir);
        if (path) resolved = await Q(r, path);
        let o = await lr();
        return o ? or(o, pattern, resolved, n?.signal) : sr(pattern, resolved, n?.signal);
      },
    })
  );
}
//@ chunk-2cw52qnf.js:37540-38141 esm-fingerprint
function or(r, e, t, n) {
  return new Promise((i, o) => {
    let child = child_processModule.spawn(r, ["-n", "--no-heading", "-e", e, "--", t], {
        ...(n ? { signal: n } : {}),
      }),
      a = "",
      l = "",
      f = !1;
    (child.stdout.on("data", (c) => {
      if (f) return;
      if (((a += c), a.length > J)) ((f = !0), (a = a.slice(0, J)), child.kill("SIGKILL"));
    }),
      child.stderr.on("data", (c) => (l += c)),
      child.on("close", (c) => {
        if (n?.aborted) return o(new ch("grep: aborted"));
        if (f)
          return i(
            a +
              `
[output truncated at ${J} bytes]`,
          );
        if (c === 0) return i(a);
        if (c === 1) return i("no matches");
        o(new ch(`grep: rg failed: ${l || `exit ${c}`}`));
      }),
      child.on("error", (c) => {
        if (n?.aborted) return o(new ch("grep: aborted"));
        o(new ch(`grep: rg failed: ${c.message}`));
      }));
  });
}
//@ chunk-2cw52qnf.js:38141-38604 esm-fingerprint
async function sr(r, e, t) {
  let n;
  try {
    n = new RegExp(r);
  } catch (error) {
    throw new ch(`grep: invalid regex: ${error instanceof Error ? error.message : String(error)}`);
  }
  let i = [],
    o = J,
    s = (l) => {
      if (((o -= l.length + 1), o < 0)) return (i.push(`[output truncated at ${J} bytes]`), !1);
      return (i.push(l), !0);
    };
  if ((await fsPromisesModule.stat(e).catch(() => null))?.isFile()) await et(e, n, s);
  else await cr(e, "", (l) => et(pathModule.join(e, l), n, s), t);
  if (t?.aborted) throw new ch("grep: aborted");
  if (i.length === 0) return "no matches";
  return i.join(`
`);
}
//@ chunk-2cw52qnf.js:38604-38860 esm-fingerprint
async function et(r, e, t) {
  let readStream = fsModule.createReadStream(r, { encoding: "utf8" }),
    rl = readlineModule.createInterface({ input: readStream, crlfDelay: 1 / 0 }),
    o = 0;
  try {
    for await (let s of rl) {
      if ((o++, s.length > zt)) continue;
      if (e.test(s) && !t(`${r}:${o}:${s}`)) return !1;
    }
  } catch {
  } finally {
    readStream.destroy();
  }
  return !0;
}
//@ chunk-2cw52qnf.js:38860-38879 esm-layout
var ar = 40,
  lt = 50000;
//@ chunk-2cw52qnf.js:38879-39314 esm-fingerprint
async function cr(r, e, t, n) {
  let i = lt;
  async function o(s, a) {
    if (a > ar) return !0;
    if (n?.aborted) return !1;
    let l;
    try {
      l = await fsPromisesModule.readdir(pathModule.join(r, s), { withFileTypes: !0 });
    } catch {
      return !0;
    }
    for (let f of l) {
      if (f.name === ".git" || f.name === "node_modules") continue;
      if (i-- <= 0) return !1;
      if (n?.aborted) return !1;
      let c = s ? pathModule.join(s, f.name) : f.name;
      if (f.isDirectory()) {
        if (!(await o(c, a + 1))) return !1;
      } else if (f.isFile()) {
        if ((await t(c)) === !1) return !1;
      }
    }
    return !0;
  }
  await o(e, 0);
}
//@ chunk-2cw52qnf.js:39314-39487 esm-fingerprint
async function lr() {
  let parts = (process.env.PATH ?? "").split(pathModule.delimiter);
  for (let e of parts) {
    let joined = pathModule.join(e, "rg");
    try {
      return (await fsPromisesModule.access(joined, fsModule.constants.X_OK), joined);
    } catch {}
  }
  return null;
}
