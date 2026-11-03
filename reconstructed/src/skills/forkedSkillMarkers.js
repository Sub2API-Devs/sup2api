/**
 * skills/forkedSkillMarkers.ts
 *
 * forked 技能标记文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jb5bg5s7.js (21)
 * attribution: placement 20, layout 1
 */
import { dirname, basename, join, sep } from "path";
import { mkdir, lstat, readFile } from "fs/promises";
import {
  getAgentTranscriptPath,
  locateSessionProjectDir,
  locateAgentTranscript,
  getProjectsDir,
  yH,
} from "../utils/sessionStorage.js";
import { subagentSidecarKey } from "../utils/subagentTranscriptPath.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { getSessionId, isDiskless } from "../bootstrap/state.js";
import { isValidKeySegment } from "../utils/storage/storageSpaces.js";
import { validateStorageKey, toStorageKey, pathToSessionSideKey } from "../utils/storage/storageKeys.js";
import { isUnavailableError, isUnavailableErrorCode } from "../utils/settings/managedEnvKeys.js";
import { logForDebugging } from "../utils/debug.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { isENOENT, getErrnoCode } from "../utils/errors.js";
import { FORKED_SKILL_SCOPING_SCHEMA, FORKED_SKILL_MARKER_SCHEMA } from "../types/ids.js";

//@ chunk-jb5bg5s7.js:781-794 placement
var p = 524288;
/**
 * 由 transcript 路径得到 forked 技能的 scoping 与 marker 文件路径。
 */
//@ chunk-jb5bg5s7.js:794-936 placement
function forkedSkillSidecarPaths(e) {
  return {
    scoping: e.replace(/\.jsonl$/, ".forked-skill.json"),
    provenanceMarker: e.replace(/\.jsonl$/, ".forked-skill.marker.json"),
  };
}
//@ chunk-jb5bg5s7.js:936-968 placement
function v(e) {
  return forkedSkillSidecarPaths(getAgentTranscriptPath(e));
}
/**
 * 定位 forked 技能侧车文件（两者都找到才返回）。
 */
//@ chunk-jb5bg5s7.js:968-1142 placement
function locateForkedSkillSidecars(e) {
  if (e === void 0) return;
  let r = subagentSidecarKey(e, ".forked-skill.json"),
    n = subagentSidecarKey(e, ".forked-skill.marker.json");
  return r !== void 0 && n !== void 0 ? { scoping: r, provenanceMarker: n } : void 0;
}
//@ chunk-jb5bg5s7.js:1142-1212 placement
function M(e) {
  return jsonStringify({ forkedSkill: !0, ...(e !== void 0 && { skillName: e }) });
}
//@ chunk-jb5bg5s7.js:1212-1761 placement
function readForkedSkillMarker(e) {
  let r = locateSessionProjectDir();
  if (typeof r !== "string") {
    let u = locateForkedSkillSidecars(locateAgentTranscript(e));
    return u && toSidecarStorageKeys(u);
  }
  if (dirname(r) !== getProjectsDir()) return;
  let n = basename(r),
    i = getSessionId(),
    o = join(r, i) + sep,
    a = getAgentTranscriptPath(e);
  if (!a.startsWith(o)) return;
  let parts = a.slice(o.length).split(sep),
    at = parts.at(-1);
  if (at === void 0 || !at.endsWith(".jsonl") || ![n, i, ...parts].every(isValidKeySegment)) return;
  let sliced = parts.slice(0, -1),
    S = (u) => ({ namespace: "sidecar", projectKey: n, sessionId: i, relPath: [...sliced, u] }),
    g = S(at.replace(/\.jsonl$/, ".forked-skill.json")),
    y = S(at.replace(/\.jsonl$/, ".forked-skill.marker.json"));
  return validateStorageKey(g) === void 0 && validateStorageKey(y) === void 0
    ? { scoping: g, provenanceMarker: y }
    : void 0;
}
/**
 * 侧车路径转为存储键。
 */
//@ chunk-jb5bg5s7.js:1761-1872 placement
function toSidecarStorageKeys(e) {
  let r = toStorageKey(e.scoping),
    n = toStorageKey(e.provenanceMarker);
  return r && n ? { scoping: r, provenanceMarker: n } : void 0;
}
/**
 * 经存储后端读取侧车文本（absent/unusable/text）。
 */
//@ chunk-jb5bg5s7.js:1872-2234 placement
async function readSidecarText(e, r) {
  let statMeta = await e.statMeta(r);
  if (!statMeta.ok)
    return statMeta.error.code === "NotFound"
      ? { kind: "absent" }
      : { kind: "unusable", ...l(statMeta.error) };
  if (statMeta.value.size > p) return { kind: "unusable" };
  let read = await e.read([r]);
  if (!read.ok) return { kind: "unusable", ...l(read.error) };
  let o = read.value.items[0];
  return o.found ? { kind: "text", text: Buffer.from(o.value).toString("utf8") } : { kind: "absent" };
}
/**
 * 侧车是否存在（读取失败视为存在）。
 */
//@ chunk-jb5bg5s7.js:2234-2382 placement
async function sidecarPresent(e, r) {
  let statMeta = await e.statMeta(r);
  if (statMeta.ok) return { present: !0 };
  return statMeta.error.code === "NotFound" ? { present: !1 } : { present: !0, ...l(statMeta.error) };
}
//@ chunk-jb5bg5s7.js:2382-2432 placement
function c(e) {
  return e === !0 ? { transientRead: !0 } : {};
}
//@ chunk-jb5bg5s7.js:2432-2463 placement
function l(e) {
  return c(isUnavailableError(e));
}
/**
 * 经存储后端写侧车文件，失败抛错。
 */
//@ chunk-jb5bg5s7.js:2463-2670 placement
async function writeSidecar(e, r, n) {
  let write = await e.write(r, M(n), { mode: 438 & ~process.umask() });
  if (!write.ok)
    throw (
      logForDebugging(`forked-skill provenance marker write: ${write.error.code}`),
      Error("forked-skill provenance marker write failed")
    );
}
/**
 * 无盘会话禁止写侧车。
 */
//@ chunk-jb5bg5s7.js:2670-2802 placement
function assertNotDiskless() {
  if (isDiskless())
    throw Error(
      "forked-skill sidecar write refused: diskless session with no storage backend or key for the path",
    );
}
//@ chunk-jb5bg5s7.js:2802-2899 placement
async function fLr(e, r, n) {
  let i = isStorageV5Enabled() && n ? pathToSessionSideKey(e) : void 0;
  if (n && i) return writeSidecar(n, i, r);
  (assertNotDiskless(), await writeFileAtomic(e, M(r)));
}
//@ chunk-jb5bg5s7.js:2899-3305 placement
async function writeForkedSkillScoping(e, r, n) {
  let i = isStorageV5Enabled() && n ? readForkedSkillMarker(e) : void 0;
  if (n && i) {
    await writeSidecar(n, i.provenanceMarker, r.skillName);
    let write = await n.write(i.scoping, jsonStringify(r), { mode: 438 & ~process.umask() });
    if (!write.ok)
      throw (
        logForDebugging(`forked-skill scoping write: ${write.error.code}`),
        Error("forked-skill scoping record write failed")
      );
    return;
  }
  assertNotDiskless();
  let o = v(e);
  (await mkdir(dirname(o.scoping), { recursive: !0 }),
    await fLr(o.provenanceMarker, r.skillName),
    await writeFileAtomic(o.scoping, jsonStringify(r)));
}
/**
 * 读取某代理的 forked 技能 scoping（存储后端或本地文件）。
 */
//@ chunk-jb5bg5s7.js:3305-3437 placement
async function readForkedSkillScoping(e, r) {
  let n = isStorageV5Enabled() && r ? readForkedSkillMarker(e) : void 0;
  if (r && n) return readScopingViaStorage(r, n);
  let i = locateForkedSkillSidecars(locateAgentTranscript(e));
  return i === void 0 ? { status: "diskless" } : readScopingFromFiles(i);
}
/**
 * 从本地文件读取 scoping；不存在时检查 marker 判断 absent-but-marked。
 */
//@ chunk-jb5bg5s7.js:3437-3794 placement
async function readScopingFromFiles(e, r) {
  let n = isStorageV5Enabled() && r ? toSidecarStorageKeys(e) : void 0;
  if (r && n) return readScopingViaStorage(r, n);
  let i = yH(e.scoping),
    o = yH(e.provenanceMarker);
  if (i === void 0 || o === void 0) return { status: "diskless" };
  let a;
  try {
    let s = await lstat(i);
    if (!s.isFile() || s.size > p) return { status: "malformed" };
    a = await readFile(i, "utf-8");
  } catch (error) {
    if (isENOENT(error)) return await checkMarkerFile(o);
    return { status: "malformed", ...c(isUnavailableErrorCode(getErrnoCode(error))) };
  }
  return parseSkillScoping(a);
}
//@ chunk-jb5bg5s7.js:3794-3954 placement = _temp9 (0.56)
function parseSkillScoping(v_0) {
  let r;
  try {
    r = jsonParse(v_0);
  } catch {
    return { status: "malformed" };
  }
  let safeParse = FORKED_SKILL_SCOPING_SCHEMA().safeParse(r);
  return safeParse.success ? { status: "valid", scoping: safeParse.data } : { status: "malformed" };
}
/**
 * 经存储后端读取 scoping。
 */
//@ chunk-jb5bg5s7.js:3954-4248 layout
async function readScopingViaStorage(e, r) {
  let n = await readSidecarText(e, r.scoping);
  switch (n.kind) {
    case "text":
      return parseSkillScoping(n.text);
    case "unusable":
      return { status: "malformed", ...c(n.transientRead) };
    case "absent": {
      let i = await sidecarPresent(e, r.provenanceMarker);
      return i.present ? { status: "absent-but-marked", ...c(i.transientRead) } : { status: "absent" };
    }
  }
}
/**
 * 只有 marker 文件时返回 absent-but-marked。
 */
//@ chunk-jb5bg5s7.js:4248-4403 placement
async function checkMarkerFile(e) {
  try {
    return (await lstat(e), { status: "absent-but-marked" });
  } catch (error) {
    return isENOENT(error)
      ? { status: "absent" }
      : { status: "absent-but-marked", ...c(isUnavailableErrorCode(getErrnoCode(error))) };
  }
}
/**
 * 从 provenance marker 读出 forked 技能名。
 */
//@ chunk-jb5bg5s7.js:4403-4772 placement
async function readForkedSkillName(e, r) {
  let n,
    i = isStorageV5Enabled() && r ? readForkedSkillMarker(e) : void 0;
  if (r && i) {
    let s = await readSidecarText(r, i.provenanceMarker);
    if (s.kind !== "text") return;
    n = s.text;
  } else if (isDiskless()) return;
  else {
    let { provenanceMarker: provenanceMarker } = v(e);
    try {
      let d = await lstat(provenanceMarker);
      if (!d.isFile() || d.size > p) return;
      n = await readFile(provenanceMarker, "utf-8");
    } catch {
      return;
    }
  }
  let o;
  try {
    o = jsonParse(n);
  } catch {
    return;
  }
  let safeParse = FORKED_SKILL_MARKER_SCHEMA().safeParse(o);
  return safeParse.success ? safeParse.data.skillName : void 0;
}

export {
  writeForkedSkillScoping,
  readForkedSkillScoping,
  readForkedSkillName,
  forkedSkillSidecarPaths,
  readScopingFromFiles,
  fLr,
};
