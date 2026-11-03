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
import { createHash } from "crypto";
import path from "path";
import { readdir } from "fs/promises";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, unknown, string, _enum } from "../../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { canonicalJsonStringify } from "../canonicalJson.js";
import { safeParseJSON } from "../../../utils/json.js";
import { MOCK_OUTPUT_MAX_CHARS } from "./agentMockResponder.js";
import { checkRepoAuthoredPath } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { openNoFollow_2 } from "../../../utils/fsSafety/hardenedRead.js";

//@ chunk-qchp9vrd.js:19805-19931 placement
/**
 * 模拟录制的 schema。
 */
var MAX_MOCK_RECORDING_BYTES = 262144;
var mockRecordingSchema = DoctorLazy(() =>
  u({
    input: unknown(),
    output: string(),
    verdict: _enum(["ok", "tool_error", "abort"]),
    recordedAt: string(),
    model: string().nullable(),
  }),
);
//@ chunk-qchp9vrd.js:19931-20237 placement
function hashMockCallArgs({ server, tool, input, mockHash, prompt, history }) {
  let w = createHash("sha256")
    .update(
      history.map((y) => jsonStringify([y.tool, canonicalJsonStringify(y.input), y.verdict, y.output])).join(`
`),
    )
    .digest("hex");
  let b = createHash("sha256")
    .update(
      prompt.replaceAll(
        `\r
`,
        `
`,
      ),
    )
    .digest("hex");
  return createHash("sha256")
    .update([server, tool, canonicalJsonStringify(input), mockHash, b, w].join(" "))
    .digest("hex");
}
//@ chunk-qchp9vrd.js:20237-20396 placement
function mockRecordingFileName(e, n) {
  if (!/^[A-Za-z0-9_-]+$/.test(e) || !/^[0-9a-f]+$/.test(n))
    throw Error("recording name components must be plain segments");
  return `${e}-${n}.json`;
}
//@ chunk-qchp9vrd.js:20396-20696 placement
async function readMockRecording(replayDir, tool, r, pinned) {
  let s = mockRecordingFileName(tool, r);
  let h = pinned[s];
  if (h === undefined) return null;
  let mockReplayRecording = await loadMockReplayRecording(replayDir, s);
  if (mockReplayRecording === null || createHash("sha256").update(mockReplayRecording).digest("hex") !== h)
    return null;
  let b = mockRecordingSchema().safeParse(safeParseJSON(mockReplayRecording.toString("utf8"), false));
  return b.success && b.data.output.length <= MOCK_OUTPUT_MAX_CHARS
    ? {
        verdict: b.data.verdict,
        text: b.data.output,
      }
    : null;
}
//@ chunk-qchp9vrd.js:20696-21227 placement
/**
 * 加载 mocks/ 下的回放录制，同一调用多份时只取第一份并提示。
 */
async function loadMockReplayRecordings(e, n = []) {
  let r = Object.create(null);
  let dir = path.dirname(path.dirname(e));
  try {
    await checkRepoAuthoredPath(dir, path.relative(dir, e), "mock replay recordings");
  } catch {
    return r;
  }
  let s;
  try {
    s = await readdir(e);
  } catch {
    return r;
  }
  let filtered = s.filter((w) => RECORDING_FILE_RE.test(w));
  if (filtered.length > MAX_PINNED_RECORDINGS)
    n.push(
      `mocks: ${path.basename(path.dirname(e))}/${path.basename(e)} holds ${filtered.length} recordings; only the first ${MAX_PINNED_RECORDINGS} are pinned for replay \u2014 prune ones no case reaches any more`,
    );
  for (let w of filtered.slice(0, MAX_PINNED_RECORDINGS)) {
    let mockReplayRecording = await loadMockReplayRecording(e, w);
    if (mockReplayRecording !== null) r[w] = createHash("sha256").update(mockReplayRecording).digest("hex");
  }
  return r;
}
//@ chunk-qchp9vrd.js:21227-21672 placement
async function loadMockReplayRecording(e, n) {
  try {
    let dir = path.dirname(path.dirname(e));
    await checkRepoAuthoredPath(dir, path.relative(dir, path.join(e, n)), "mock replay recording");
    let noFollow = await openNoFollow_2(path.join(e, n));
    if (!noFollow.ok) return null;
    let s = noFollow.value;
    try {
      let stats = await s.stat();
      if (!stats.isFile() || stats.size > MAX_MOCK_RECORDING_BYTES) return null;
      let w = Buffer.alloc(stats.size);
      let b = 0;
      while (b < stats.size) {
        let { bytesRead } = await s.read({
          buffer: w,
          offset: b,
          position: b,
        });
        if (bytesRead <= 0) break;
        b += bytesRead;
      }
      return w.subarray(0, b);
    } finally {
      await s.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-qchp9vrd.js:21672-21738 placement
/**
 * 单次回放最多固定多少条录制（2000）。
 */
var REPLAY_DIR_SUFFIX = ".replay";
var RECORDING_FILE_RE = /^[A-Za-z0-9_-]+-[0-9a-f]{64}\.json$/;
var MAX_PINNED_RECORDINGS = 2000;
export {
  REPLAY_DIR_SUFFIX,
  loadMockReplayRecordings,
  hashMockCallArgs,
  readMockRecording,
  MAX_MOCK_RECORDING_BYTES,
  mockRecordingFileName,
  RECORDING_FILE_RE,
};
