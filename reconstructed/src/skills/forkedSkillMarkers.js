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
  worktreeFromProgress,
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
/**
 * forked 技能侧车文件的大小上限。
 */
var FORKED_SKILL_SIDECAR_MAX_BYTES = 524288;
//@ chunk-jb5bg5s7.js:794-936 placement
/**
 * 由 transcript 路径得到 forked 技能的 scoping 与 marker 文件路径。
 */
function forkedSkillSidecarPaths(e) {
  return {
    scoping: e.replace(/\.jsonl$/, ".forked-skill.json"),
    provenanceMarker: e.replace(/\.jsonl$/, ".forked-skill.marker.json"),
  };
}
//@ chunk-jb5bg5s7.js:936-968 placement
/**
 * 由代理 id 得到 forked 技能的两个侧车文件路径。
 */
function sidecarPathsForAgent(e) {
  return forkedSkillSidecarPaths(getAgentTranscriptPath(e));
}
//@ chunk-jb5bg5s7.js:968-1142 placement
/**
 * 定位 forked 技能侧车文件（两者都找到才返回）。
 */
function locateForkedSkillSidecars(e) {
  if (e === undefined) return;
  let r = subagentSidecarKey(e, ".forked-skill.json");
  let n = subagentSidecarKey(e, ".forked-skill.marker.json");
  return r !== undefined && n !== undefined
    ? {
        scoping: r,
        provenanceMarker: n,
      }
    : undefined;
}
//@ chunk-jb5bg5s7.js:1142-1212 placement
/**
 * 序列化 forked 技能的来源标记 JSON。
 */
function forkedSkillMarkerJson(e) {
  return jsonStringify({
    forkedSkill: true,
    ...(e !== undefined && {
      skillName: e,
    }),
  });
}
//@ chunk-jb5bg5s7.js:1212-1761 placement
function readForkedSkillMarker(e) {
  let r = locateSessionProjectDir();
  if (typeof r !== "string") {
    let u = locateForkedSkillSidecars(locateAgentTranscript(e));
    return u && toSidecarStorageKeys(u);
  }
  if (dirname(r) !== getProjectsDir()) return;
  let n = basename(r);
  let sessionId = getSessionId();
  let o = join(r, sessionId) + sep;
  let agentTranscriptPath = getAgentTranscriptPath(e);
  if (!agentTranscriptPath.startsWith(o)) return;
  let parts = agentTranscriptPath.slice(o.length).split(sep);
  let last = parts.at(-1);
  if (last === undefined || !last.endsWith(".jsonl") || ![n, sessionId, ...parts].every(isValidKeySegment))
    return;
  let sliced = parts.slice(0, -1);
  let S = (u) => ({
    namespace: "sidecar",
    projectKey: n,
    sessionId,
    relPath: [...sliced, u],
  });
  let g = S(last.replace(/\.jsonl$/, ".forked-skill.json"));
  let y = S(last.replace(/\.jsonl$/, ".forked-skill.marker.json"));
  return validateStorageKey(g) === undefined && validateStorageKey(y) === undefined
    ? {
        scoping: g,
        provenanceMarker: y,
      }
    : undefined;
}
//@ chunk-jb5bg5s7.js:1761-1872 placement
/**
 * 侧车路径转为存储键。
 */
function toSidecarStorageKeys(e) {
  let storageKey = toStorageKey(e.scoping);
  let storageKey_2 = toStorageKey(e.provenanceMarker);
  return storageKey && storageKey_2
    ? {
        scoping: storageKey,
        provenanceMarker: storageKey_2,
      }
    : undefined;
}
//@ chunk-jb5bg5s7.js:1872-2234 placement
/**
 * 经存储后端读取侧车文本（absent/unusable/text）。
 */
async function readSidecarText(e, r) {
  let n = await e.statMeta(r);
  if (!n.ok)
    return n.error.code === "NotFound"
      ? {
          kind: "absent",
        }
      : {
          kind: "unusable",
          ...unavailableFlag(n.error),
        };
  if (n.value.size > FORKED_SKILL_SIDECAR_MAX_BYTES)
    return {
      kind: "unusable",
    };
  let i = await e.read([r]);
  if (!i.ok)
    return {
      kind: "unusable",
      ...unavailableFlag(i.error),
    };
  let o = i.value.items[0];
  return o.found
    ? {
        kind: "text",
        text: Buffer.from(o.value).toString("utf8"),
      }
    : {
        kind: "absent",
      };
}
//@ chunk-jb5bg5s7.js:2234-2382 placement
/**
 * 侧车是否存在（读取失败视为存在）。
 */
async function sidecarPresent(e, provenanceMarker) {
  let n = await e.statMeta(provenanceMarker);
  if (n.ok)
    return {
      present: true,
    };
  return n.error.code === "NotFound"
    ? {
        present: false,
      }
    : {
        present: true,
        ...unavailableFlag(n.error),
      };
}
//@ chunk-jb5bg5s7.js:2382-2432 placement
function transientReadFlag(e) {
  return e === true
    ? {
        transientRead: true,
      }
    : {};
}
//@ chunk-jb5bg5s7.js:2432-2463 placement
function unavailableFlag(error) {
  return transientReadFlag(isUnavailableError(error));
}
//@ chunk-jb5bg5s7.js:2463-2670 placement
/**
 * 经存储后端写侧车文件，失败抛错。
 */
async function writeSidecar(e, r, n) {
  let i = await e.write(r, forkedSkillMarkerJson(n), {
    mode: 438 & ~process.umask(),
  });
  if (!i.ok) {
    logForDebugging(`forked-skill provenance marker write: ${i.error.code}`);
    throw Error("forked-skill provenance marker write failed");
  }
}
//@ chunk-jb5bg5s7.js:2670-2802 placement
/**
 * 无盘会话禁止写侧车。
 */
function assertNotDiskless() {
  if (isDiskless())
    throw Error(
      "forked-skill sidecar write refused: diskless session with no storage backend or key for the path",
    );
}
//@ chunk-jb5bg5s7.js:2802-2899 placement
/**
 * 写入 forked 技能标记：有存储后端时写存储，否则原子写文件。
 */
async function writeForkedSkillMarker(provenanceMarker, r, n) {
  let i = isStorageV5Enabled() && n ? pathToSessionSideKey(provenanceMarker) : undefined;
  if (n && i) return writeSidecar(n, i, r);
  assertNotDiskless();
  await writeFileAtomic(provenanceMarker, forkedSkillMarkerJson(r));
}
//@ chunk-jb5bg5s7.js:2899-3305 placement
async function writeForkedSkillScoping(e, r, storageV5) {
  let i = isStorageV5Enabled() && storageV5 ? readForkedSkillMarker(e) : undefined;
  if (storageV5 && i) {
    await writeSidecar(storageV5, i.provenanceMarker, r.skillName);
    let a = await storageV5.write(i.scoping, jsonStringify(r), {
      mode: 438 & ~process.umask(),
    });
    if (!a.ok) {
      logForDebugging(`forked-skill scoping write: ${a.error.code}`);
      throw Error("forked-skill scoping record write failed");
    }
    return;
  }
  assertNotDiskless();
  let o = sidecarPathsForAgent(e);
  await mkdir(dirname(o.scoping), {
    recursive: true,
  });
  await writeForkedSkillMarker(o.provenanceMarker, r.skillName);
  await writeFileAtomic(o.scoping, jsonStringify(r));
}
//@ chunk-jb5bg5s7.js:3305-3437 placement
/**
 * 读取某代理的 forked 技能 scoping（存储后端或本地文件）。
 */
async function readForkedSkillScoping(e, r) {
  let n = isStorageV5Enabled() && r ? readForkedSkillMarker(e) : undefined;
  if (r && n) return readScopingViaStorage(r, n);
  let i = locateForkedSkillSidecars(locateAgentTranscript(e));
  return i === undefined
    ? {
        status: "diskless",
      }
    : readScopingFromFiles(i);
}
//@ chunk-jb5bg5s7.js:3437-3794 placement
/**
 * 从本地文件读取 scoping；不存在时检查 marker 判断 absent-but-marked。
 */
async function readScopingFromFiles(e, r) {
  let n = isStorageV5Enabled() && r ? toSidecarStorageKeys(e) : undefined;
  if (r && n) return readScopingViaStorage(r, n);
  let i = worktreeFromProgress(e.scoping);
  let o = worktreeFromProgress(e.provenanceMarker);
  if (i === undefined || o === undefined)
    return {
      status: "diskless",
    };
  let a;
  try {
    let s = await lstat(i);
    if (!s.isFile() || s.size > FORKED_SKILL_SIDECAR_MAX_BYTES)
      return {
        status: "malformed",
      };
    a = await readFile(i, "utf-8");
  } catch (error) {
    if (isENOENT(error)) return await checkMarkerFile(o);
    return {
      status: "malformed",
      ...transientReadFlag(isUnavailableErrorCode(getErrnoCode(error))),
    };
  }
  return parseSkillScoping(a);
}
//@ chunk-jb5bg5s7.js:3794-3954 placement = _temp9 (0.56)
function parseSkillScoping(v_0) {
  let r;
  try {
    r = jsonParse(v_0);
  } catch {
    return {
      status: "malformed",
    };
  }
  let n = FORKED_SKILL_SCOPING_SCHEMA().safeParse(r);
  return n.success
    ? {
        status: "valid",
        scoping: n.data,
      }
    : {
        status: "malformed",
      };
}
//@ chunk-jb5bg5s7.js:3954-4248 layout
/**
 * 经存储后端读取 scoping。
 */
async function readScopingViaStorage(e, r) {
  let sidecarText = await readSidecarText(e, r.scoping);
  switch (sidecarText.kind) {
    case "text":
      return parseSkillScoping(sidecarText.text);
    case "unusable":
      return {
        status: "malformed",
        ...transientReadFlag(sidecarText.transientRead),
      };
    case "absent": {
      let i = await sidecarPresent(e, r.provenanceMarker);
      return i.present
        ? {
            status: "absent-but-marked",
            ...transientReadFlag(i.transientRead),
          }
        : {
            status: "absent",
          };
    }
  }
}
//@ chunk-jb5bg5s7.js:4248-4403 placement
/**
 * 只有 marker 文件时返回 absent-but-marked。
 */
async function checkMarkerFile(e) {
  try {
    await lstat(e);
    return {
      status: "absent-but-marked",
    };
  } catch (error) {
    return isENOENT(error)
      ? {
          status: "absent",
        }
      : {
          status: "absent-but-marked",
          ...transientReadFlag(isUnavailableErrorCode(getErrnoCode(error))),
        };
  }
}
//@ chunk-jb5bg5s7.js:4403-4772 placement
/**
 * 从 provenance marker 读出 forked 技能名。
 */
async function readForkedSkillName(e, r) {
  let n;
  let i = isStorageV5Enabled() && r ? readForkedSkillMarker(e) : undefined;
  if (r && i) {
    let sidecarText = await readSidecarText(r, i.provenanceMarker);
    if (sidecarText.kind !== "text") return;
    n = sidecarText.text;
  } else if (isDiskless()) return;
  else {
    let { provenanceMarker } = sidecarPathsForAgent(e);
    try {
      let d = await lstat(provenanceMarker);
      if (!d.isFile() || d.size > FORKED_SKILL_SIDECAR_MAX_BYTES) return;
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
  let a = FORKED_SKILL_MARKER_SCHEMA().safeParse(o);
  return a.success ? a.data.skillName : undefined;
}
export {
  writeForkedSkillScoping,
  readForkedSkillScoping,
  readForkedSkillName,
  forkedSkillSidecarPaths,
  readScopingFromFiles,
  writeForkedSkillMarker,
};
