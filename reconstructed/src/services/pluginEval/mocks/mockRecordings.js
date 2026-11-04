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
import { objectSchema, unknown, stringSchema, _enum } from "../../../../vendor/zod/v4/classic/schemas.js";
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
  objectSchema({
    input: unknown(),
    output: stringSchema(),
    verdict: _enum(["ok", "tool_error", "abort"]),
    recordedAt: stringSchema(),
    model: stringSchema().nullable(),
  }),
);
//@ chunk-qchp9vrd.js:19931-20237 placement
function hashMockCallArgs({ server, tool, input, mockHash, prompt, history }) {
  let historyHash = createHash("sha256")
    .update(
      history.map((entry) =>
        jsonStringify([entry.tool, canonicalJsonStringify(entry.input), entry.verdict, entry.output]),
      ).join(`
`),
    )
    .digest("hex");
  let promptHash = createHash("sha256")
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
    .update([server, tool, canonicalJsonStringify(input), mockHash, promptHash, historyHash].join(" "))
    .digest("hex");
}
//@ chunk-qchp9vrd.js:20237-20396 placement
function mockRecordingFileName(toolName, inputHash) {
  if (!/^[A-Za-z0-9_-]+$/.test(toolName) || !/^[0-9a-f]+$/.test(inputHash))
    throw Error("recording name components must be plain segments");
  return `${toolName}-${inputHash}.json`;
}
//@ chunk-qchp9vrd.js:20396-20696 placement
async function readMockRecording(replayDir, toolName, keyPart, pinned) {
  let fileName = mockRecordingFileName(toolName, keyPart);
  let expectedHash = pinned[fileName];
  if (expectedHash === undefined) return null;
  let mockReplayRecording = await loadMockReplayRecording(replayDir, fileName);
  if (
    mockReplayRecording === null ||
    createHash("sha256").update(mockReplayRecording).digest("hex") !== expectedHash
  )
    return null;
  let parsed = mockRecordingSchema().safeParse(safeParseJSON(mockReplayRecording.toString("utf8"), false));
  return parsed.success && parsed.data.output.length <= MOCK_OUTPUT_MAX_CHARS
    ? {
        verdict: parsed.data.verdict,
        text: parsed.data.output,
      }
    : null;
}
//@ chunk-qchp9vrd.js:20696-21227 placement
/**
 * 加载 mocks/ 下的回放录制，同一调用多份时只取第一份并提示。
 */
async function loadMockReplayRecordings(recordingsDir, notes = []) {
  let pinned = Object.create(null);
  let dir = path.dirname(path.dirname(recordingsDir));
  try {
    await checkRepoAuthoredPath(dir, path.relative(dir, recordingsDir), "mock replay recordings");
  } catch {
    return pinned;
  }
  let fileNames;
  try {
    fileNames = await readdir(recordingsDir);
  } catch {
    return pinned;
  }
  let filtered = fileNames.filter((fileName) => RECORDING_FILE_RE.test(fileName));
  if (filtered.length > MAX_PINNED_RECORDINGS)
    notes.push(
      `mocks: ${path.basename(path.dirname(recordingsDir))}/${path.basename(recordingsDir)} holds ${filtered.length} recordings; only the first ${MAX_PINNED_RECORDINGS} are pinned for replay \u2014 prune ones no case reaches any more`,
    );
  for (let fileName of filtered.slice(0, MAX_PINNED_RECORDINGS)) {
    let mockReplayRecording = await loadMockReplayRecording(recordingsDir, fileName);
    if (mockReplayRecording !== null)
      pinned[fileName] = createHash("sha256").update(mockReplayRecording).digest("hex");
  }
  return pinned;
}
//@ chunk-qchp9vrd.js:21227-21672 placement
async function loadMockReplayRecording(replayDir, fileName) {
  try {
    let dir = path.dirname(path.dirname(replayDir));
    await checkRepoAuthoredPath(
      dir,
      path.relative(dir, path.join(replayDir, fileName)),
      "mock replay recording",
    );
    let noFollow = await openNoFollow_2(path.join(replayDir, fileName));
    if (!noFollow.ok) return null;
    let handle = noFollow.value;
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || stats.size > MAX_MOCK_RECORDING_BYTES) return null;
      let buffer = Buffer.alloc(stats.size);
      let offset = 0;
      while (offset < stats.size) {
        let { bytesRead } = await handle.read({
          buffer,
          offset,
          position: offset,
        });
        if (bytesRead <= 0) break;
        offset += bytesRead;
      }
      return buffer.subarray(0, offset);
    } finally {
      await handle.close();
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
