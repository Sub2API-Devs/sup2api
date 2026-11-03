/**
 * services/pluginEval/mocks/mockResponders.ts
 *
 * 2.1.316 新增：plugin eval 的 mocks/ 目录：每个 MCP 服务器的 _server.md、_tools.json 与 <tool>.md 应答者分层加载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (16)
 * attribution: placement 16
 */
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  stat,
  stat as stat_2,
  stat as stat_3,
} from "fs/promises";
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { Ue, o, E, M, aA, A, pe, u, U, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { REPLAY_DIR_SUFFIX, loadMockReplayRecordings } from "./mockRecordings.js";
import {
  checkRepoAuthoredPath,
  Rm,
  compileExpectGuards,
} from "../../../cli/handlers/pluginEval/mockGuards.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../../utils/errors.js";
import { getFileKind } from "../../../utils/fileKind.js";
import { tn, parseProseFrontmatter } from "../caseSchema.js";
import { jsonParse } from "../../../utils/slowOperations.js";

//@ chunk-qchp9vrd.js:31046-31057 placement
var As = 256;
//@ chunk-qchp9vrd.js:31057-31135 placement
async function Ps(e) {
  try {
    return (await lstat_3(e)).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-qchp9vrd.js:31135-31654 placement
var MAX_MOCK_FILE_BYTES = 1048576,
  Rn = "_server.md",
  Ms = "_tools.json",
  no = 256,
  ei = /^[A-Za-z0-9_-]+$/,
  lu = DoctorLazy(() => {
    let transform = Ue([o(), E(), M()]).transform(String),
      n = aA(() => Ue([transform, A(transform), pe(o(), n)]));
    return n;
  }),
  cu = DoctorLazy(() =>
    u({
      type: U(["fixed", "agent"]).default("fixed"),
      expect: pe(o(), lu()).optional(),
      error: M().optional(),
      tools: A(o().regex(ei, 'tool names may contain only letters, digits, "_" and "-"')).optional(),
      abort_when: o().optional(),
    }).strict(),
  ),
  uu = DoctorLazy(() =>
    u({
      tools: A(u({ name: o().min(1), description: o().optional(), inputSchema: pe(o(), oe()).optional() })),
    }),
  );
//@ chunk-qchp9vrd.js:31654-31704 placement
function ni() {
  return { layers: new Map(), pins: new Map() };
}
/**
 * 汇总各层 mocks/<server>/ 的应答者；无应答者时提示。
 */
//@ chunk-qchp9vrd.js:31704-32587 placement
async function loadMockServers(e, n = ni()) {
  let r = [],
    a = new Set(),
    s = [];
  for (let w of e) {
    let resolved = path_3.resolve(w);
    if (a.has(resolved)) continue;
    a.add(resolved);
    let y = n.layers.get(resolved);
    if (!y)
      ((y = (async () => {
        let T = [];
        return { raw: await loadMocksDir(path_3.join(w, "mocks"), T), notes: T };
      })()),
        n.layers.set(resolved, y));
    let { raw: raw, notes: notes } = await y;
    (r.push(...notes), s.push(raw));
  }
  let h = new Map();
  for (let w of new Set(s.flatMap((b) => [...b.keys()]))) {
    let b = describeUncoveredAbortWhen(
      w,
      s.flatMap((y) => y.get(w) ?? []),
      r,
    );
    if (b.tools.size === 0) {
      r.push(`mocks: mocks/${w}/ has no <tool>.md responders in any layer \u2014 nothing is mocked for ${w}`);
      continue;
    }
    for (let y of new Set(b.tools.values())) {
      if (y.kind !== "agent") continue;
      let joined = path_3.join(path_3.dirname(path_3.dirname(y.sourceFile)), REPLAY_DIR_SUFFIX, w),
        S = n.pins.get(joined);
      if (S === void 0) {
        let T = [];
        ((S = loadMockReplayRecordings(joined, T).then((N) => ({ pinned: N, notes: T }))),
          n.pins.set(joined, S));
      }
      if (!(joined in b.recordings)) {
        let { pinned: pinned, notes: notes } = await S;
        ((b.recordings[joined] = pinned), r.push(...notes));
      }
    }
    h.set(w, b);
  }
  return { servers: h, notes: r };
}
//@ chunk-qchp9vrd.js:32587-33503 placement
async function loadMocksDir(e, n) {
  let r = new Map(),
    a;
  try {
    (await checkRepoAuthoredPath(path_3.dirname(e), path_3.basename(e), "mocks/"),
      (a = Us(await readdir_3(e, { withFileTypes: !0 }))));
  } catch (error) {
    if (isENOENT(error)) {
      if (await isDanglingSymlink(e))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "mocks/ is a symbolic link whose target does not exist",
          "mocks/: dangling symbolic link",
        );
      return r;
    }
    if (getErrnoCode(error) === "ENOTDIR") {
      if (await isDanglingSymlink(e))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "mocks/ is a symbolic link whose target does not exist",
          "mocks/: dangling symbolic link",
        );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "mocks is not a directory",
        "mocks/: not a directory",
      );
    }
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/ is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "mocks/: unreadable",
    );
  }
  if (a.length > no)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/ has ${a.length} entries (cap: ${no})`,
      "mocks/: too many entries",
    );
  for (let s of a) {
    if (s.name.startsWith(".")) continue;
    let h = await getFileKind(s, path_3.join(e, s.name), "unknown");
    if (h !== "dir" && h !== "symlink" && h !== "unknown") continue;
    let w = await loadMockServerDir(path_3.join(e, s.name), s.name, n);
    if (w !== null) r.set(s.name, w);
  }
  return r;
}
//@ chunk-qchp9vrd.js:33503-33575 placement
function Us(e) {
  return e.sort((n, r) => (n.name < r.name ? -1 : n.name > r.name ? 1 : 0));
}
//@ chunk-qchp9vrd.js:33575-33707 placement
async function isDanglingSymlink(e) {
  try {
    if (!(await lstat_2(e)).isSymbolicLink()) return !1;
  } catch {
    return !1;
  }
  try {
    return (await stat(e), !1);
  } catch (error) {
    return isENOENT(error);
  }
}
/**
 * 读取 mocks/<server>/ 下的 _server.md、_tools.json 与各工具应答者。
 */
//@ chunk-qchp9vrd.js:33707-35751 placement
async function loadMockServerDir(e, n, r) {
  let a;
  try {
    (await checkRepoAuthoredPath(path_3.dirname(e), n, `mocks/${Rm(n)}/`),
      (a = Us(await readdir_3(e, { withFileTypes: !0 }))));
  } catch (error) {
    if (isENOENT(error) || (getErrnoCode(error) === "ENOTDIR" && (await isDanglingSymlink(e))))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${Rm(n)} is a symbolic link whose target does not exist`,
        "mocks/<server>/: dangling symbolic link",
      );
    if (getErrnoCode(error) === "ENOTDIR") return null;
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${Rm(n)}/ is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "mocks/<server>/: unreadable",
    );
  }
  if (!ei.test(n))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${Rm(n)}/: name the directory after the server segment of the tool name (letters, digits, "_" and "-" only)`,
      "mocks: directory name not a tool-name segment",
    );
  if (a.length > no)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${n}/ has ${a.length} entries (cap: ${no})`,
      "mocks/<server>/: too many entries",
    );
  let s = new Map(),
    h = null,
    w = new Map();
  for (let b of a) {
    let joined = path_3.join(e, b.name);
    if (b.name === Ms) {
      w = await loadMockToolsJson(joined, n);
      continue;
    }
    if (b.name.startsWith(".") || !b.name.endsWith(".md") || b.isDirectory()) continue;
    let base = path_3.basename(b.name, ".md");
    if (b.name !== Rn && !ei.test(base))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${n}/${Rm(b.name)}: name responder files after the tool (letters, digits, "_" and "-" only), e.g. list_issues.md`,
        "mocks: tool file name not a tool-name segment",
      );
    let { responder: responder, tools: tools } = await loadMockToolResponder(joined, e, n);
    if (b.name === Rn) {
      if (responder.kind !== "agent")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${n}/${Rn}: only \`type: agent\` is meaningful here (one agent answering several tools); put a fixed answer in <tool>.md`,
          "mocks: _server.md not an agent",
        );
      if (tools.length === 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${n}/${Rn}: an agent answering several tools needs \`tools: [...]\``,
          "mocks: _server.md without tools",
        );
      if (responder.expect !== null && tools.length > 1)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${n}/${Rn}: \`expect:\` here would guard all ${tools.length} tools it answers; put the guard on the one tool it is meant for as mocks/${n}/<tool>.md`,
          "mocks: expect on multi-tool _server.md",
        );
      h = { responder: responder, tools: tools };
      continue;
    }
    s.set(base, responder);
  }
  if (s.size === 0 && h === null && w.size === 0)
    return (r.push(`mocks: mocks/${n}/ has no <tool>.md responders \u2014 nothing is mocked for ${n}`), null);
  return { dir: e, toolFiles: s, serverAgent: h, listings: w };
}
//@ chunk-qchp9vrd.js:35751-37469 placement
async function loadMockToolResponder(e, n, r) {
  let a = `mocks/${r}/${path_3.basename(e)}`,
    s,
    h;
  try {
    if (((s = await tn(e, MAX_MOCK_FILE_BYTES, a)), s === null))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: disappeared while loading`,
        "mocks: file vanished",
      );
    h = parseProseFrontmatter(s, e);
  } catch (error) {
    throw rebaseErrorPrefix(error, e, a);
  }
  let { fm: fm, body: body } = h,
    safeParse = cu().safeParse(fm);
  if (!safeParse.success) {
    let x = safeParse.error.issues[0],
      j = x?.path.length ? x.path.join(".") : "frontmatter";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: ${j}: ${x?.message ?? "invalid"} (keys: type, expect, error, tools, abort_when)`,
      "mocks: invalid frontmatter",
    );
  }
  let R = safeParse.data,
    S = R.expect ?? null;
  if (S !== null) {
    let x = compileExpectGuards(S);
    if (x.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: ${x[0]}`,
        "mocks: invalid expect",
      );
  }
  if (R.tools !== void 0 && path_3.basename(e) !== Rn)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: \`tools:\` belongs in ${Rn} (a <tool>.md answers the tool it is named after)`,
      "mocks: tools outside _server.md",
    );
  let T = R.tools ?? [],
    replaced = body.replace(/^\n+/, "").replace(/\s+$/, "");
  if (R.type === "agent") {
    if (R.error !== void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: \`error:\` applies to fixed responders only`,
        "mocks: error on agent",
      );
    if (replaced === "" || Ns(replaced))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: an agent responder needs a description of the server it plays as its body${replaced === "" ? "" : " (it still holds the scaffolded placeholder)"}`,
        "mocks: empty agent prompt",
      );
    return {
      responder: {
        kind: "agent",
        prompt: replaced,
        abortWhen: R.abort_when?.trim() ? R.abort_when : null,
        expect: S,
        baseDir: n,
        sourceFile: e,
        sourceHash: $s(s),
      },
      tools: T,
    };
  }
  if (R.abort_when !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: \`abort_when:\` needs \`type: agent\`; a fixed responder guards its input with \`expect:\``,
      "mocks: abort_when on fixed",
    );
  if (Ns(replaced))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: still holds the scaffolded placeholder \u2014 write the tool's canned answer as the body`,
      "mocks: unfilled stub",
    );
  return {
    responder: {
      kind: "fixed",
      body: replaced,
      isError: R.error ?? !1,
      expect: S,
      baseDir: n,
      sourceFile: e,
      sourceHash: $s(s),
    },
    tools: T,
  };
}
//@ chunk-qchp9vrd.js:37469-37562 placement
function $s(e) {
  return createHash_3("sha256")
    .update(
      e.replaceAll(
        `\r
`,
        `
`,
      ),
    )
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-qchp9vrd.js:37562-37632 placement
var MOCK_TOOL_TEMPLATE = "TODO: replace with the canned result this tool should return";
//@ chunk-qchp9vrd.js:37632-37669 placement
function Ns(e) {
  return e.includes(MOCK_TOOL_TEMPLATE);
}
/**
 * 解析 _tools.json（工具名、描述、输入模式）。
 */
//@ chunk-qchp9vrd.js:37669-38303 placement
async function loadMockToolsJson(e, n) {
  let r = `mocks/${n}/${Ms}`,
    a = await tn(e, MAX_MOCK_FILE_BYTES, r).catch((y) => {
      throw rebaseErrorPrefix(y, e, r);
    }),
    s = new Map();
  if (a === null) return s;
  let h;
  try {
    h = jsonParse(a);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      "mocks: _tools.json invalid",
    );
  }
  let w = typeof h === "object" && h !== null && "result" in h ? h.result : h,
    safeParse = uu().safeParse(w);
  if (!safeParse.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: expected a saved tools/list response ({"tools": [{"name", "description", "inputSchema"}]})`,
      "mocks: _tools.json shape",
    );
  for (let tool of safeParse.data.tools)
    s.set(tool.name, {
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? { type: "object" },
    });
  return s;
}
//@ chunk-qchp9vrd.js:38303-39231 placement
function describeUncoveredAbortWhen(e, n, r) {
  let a = new Map(),
    s = n.map((w) => w.serverAgent).findLast((w) => w !== null) ?? null;
  if (s !== null) for (let tool of s.tools) a.set(tool, s.responder);
  for (let w of n) for (let [b, y] of w.toolFiles) a.set(b, y);
  if (s !== null)
    for (let tool of s.tools) {
      let b = a.get(tool);
      if (b !== void 0 && b !== s.responder)
        r.push(
          `mocks: ${path_3.relative(path_3.dirname(path_3.dirname(s.responder.sourceFile)), s.responder.sourceFile)} will not see ${tool} \u2014 answered by ${path_3.relative(path_3.dirname(path_3.dirname(path_3.dirname(path_3.dirname(b.sourceFile)))), b.sourceFile)}, so its abort_when does not cover that tool`,
        );
    }
  let h = new Map(n.flatMap((w) => [...w.listings]));
  for (let w of new Set(a.values()))
    if (
      w.kind === "agent" &&
      w.abortWhen === null &&
      /\b(abort|fail)\b[^.]{0,40}\b(eval|run)\b/i.test(w.prompt)
    )
      r.push(
        `mocks: ${e}/${path_3.basename(w.sourceFile)} mentions failing the run in its prose but has no abort_when: \u2014 only abort_when can abort`,
      );
  return { dirName: e, tools: a, listings: h, recordings: {} };
}
//@ chunk-qchp9vrd.js:39231-39417 placement
function rebaseErrorPrefix(e, n, r) {
  let base = path_3.basename(n);
  if (
    e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    e.message.startsWith(base) &&
    !e.message.startsWith(r)
  )
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}${e.message.slice(base.length)}`,
      e.telemetryMessage,
    );
  return e;
}

export { Ps, As, MOCK_TOOL_TEMPLATE, ni, loadMockServers };
