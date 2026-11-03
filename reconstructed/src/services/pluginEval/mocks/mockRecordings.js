/**
 * services/pluginEval/mocks/mockRecordings.ts
 *
 * 2.1.316 新增：plugin eval 模拟调用的录制与回放（.replay 目录、按参数哈希命名）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (7)
 * attribution: placement 7
 */
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
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
} from "fs/promises";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, oe, o, U } from "../../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { canonicalJsonStringify } from "../canonicalJson.js";
import { safeParseJSON } from "../../../utils/json.js";
import { MOCK_OUTPUT_MAX_CHARS } from "./agentMockResponder.js";
import { checkRepoAuthoredPath } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { openNoFollow_2 } from "../../../utils/fsSafety/hardenedRead.js";

//@ chunk-qchp9vrd.js:19805-19931 placement
var MAX_MOCK_RECORDING_BYTES = 262144,
  Wc = DoctorLazy(() =>
    u({
      input: oe(),
      output: o(),
      verdict: U(["ok", "tool_error", "abort"]),
      recordedAt: o(),
      model: o().nullable(),
    }),
  );
//@ chunk-qchp9vrd.js:19931-20237 placement
function hashMockCallArgs({
  server: server,
  tool: tool,
  input: input,
  mockHash: mockHash,
  prompt: prompt,
  history: history,
}) {
  let digest = createHash_2("sha256")
      .update(
        history.map((y) => jsonStringify([y.tool, canonicalJsonStringify(y.input), y.verdict, y.output]))
          .join(`
`),
      )
      .digest("hex"),
    digest_2 = createHash_2("sha256")
      .update(
        prompt.replaceAll(
          `\r
`,
          `
`,
        ),
      )
      .digest("hex");
  return createHash_2("sha256")
    .update([server, tool, canonicalJsonStringify(input), mockHash, digest_2, digest].join(" "))
    .digest("hex");
}
//@ chunk-qchp9vrd.js:20237-20396 placement
function mockRecordingFileName(e, n) {
  if (!/^[A-Za-z0-9_-]+$/.test(e) || !/^[0-9a-f]+$/.test(n))
    throw Error("recording name components must be plain segments");
  return `${e}-${n}.json`;
}
//@ chunk-qchp9vrd.js:20396-20696 placement
async function readMockRecording(e, n, r, a) {
  let s = mockRecordingFileName(n, r),
    h = a[s];
  if (h === void 0) return null;
  let w = await loadMockReplayRecording(e, s);
  if (w === null || createHash_2("sha256").update(w).digest("hex") !== h) return null;
  let safeParse = Wc().safeParse(safeParseJSON(w.toString("utf8"), !1));
  return safeParse.success && safeParse.data.output.length <= MOCK_OUTPUT_MAX_CHARS
    ? { verdict: safeParse.data.verdict, text: safeParse.data.output }
    : null;
}
/**
 * 加载 mocks/ 下的回放录制，同一调用多份时只取第一份并提示。
 */
//@ chunk-qchp9vrd.js:20696-21227 placement
async function loadMockReplayRecordings(e, n = []) {
  let create = Object.create(null),
    dir = path.dirname(path.dirname(e));
  try {
    await checkRepoAuthoredPath(dir, path.relative(dir, e), "mock replay recordings");
  } catch {
    return create;
  }
  let s;
  try {
    s = await readdir_2(e);
  } catch {
    return create;
  }
  let filtered = s.filter((w) => Jo.test(w));
  if (filtered.length > Vo)
    n.push(
      `mocks: ${path.basename(path.dirname(e))}/${path.basename(e)} holds ${filtered.length} recordings; only the first ${Vo} are pinned for replay \u2014 prune ones no case reaches any more`,
    );
  for (let w of filtered.slice(0, Vo)) {
    let b = await loadMockReplayRecording(e, w);
    if (b !== null) create[w] = createHash_2("sha256").update(b).digest("hex");
  }
  return create;
}
//@ chunk-qchp9vrd.js:21227-21672 placement
async function loadMockReplayRecording(e, n) {
  try {
    let dir = path.dirname(path.dirname(e));
    await checkRepoAuthoredPath(dir, path.relative(dir, path.join(e, n)), "mock replay recording");
    let a = await openNoFollow_2(path.join(e, n));
    if (!a.ok) return null;
    let s = a.value;
    try {
      let stats = await s.stat();
      if (!stats.isFile() || stats.size > MAX_MOCK_RECORDING_BYTES) return null;
      let alloc = Buffer.alloc(stats.size),
        b = 0;
      while (b < stats.size) {
        let { bytesRead: bytesRead } = await s.read({ buffer: alloc, offset: b, position: b });
        if (bytesRead <= 0) break;
        b += bytesRead;
      }
      return alloc.subarray(0, b);
    } finally {
      await s.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-qchp9vrd.js:21672-21738 placement
var REPLAY_DIR_SUFFIX = ".replay",
  Jo = /^[A-Za-z0-9_-]+-[0-9a-f]{64}\.json$/,
  Vo = 2000;

export {
  REPLAY_DIR_SUFFIX,
  loadMockReplayRecordings,
  hashMockCallArgs,
  readMockRecording,
  MAX_MOCK_RECORDING_BYTES,
  mockRecordingFileName,
  Jo,
};
