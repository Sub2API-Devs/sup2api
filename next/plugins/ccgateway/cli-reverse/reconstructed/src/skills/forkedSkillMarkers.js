/**
 * skills/forkedSkillMarkers.ts
 *
 * forked 技能标记文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h3fdrpaq.js (21)
 * attribution: placement 20, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-h3fdrpaq.js:781-794 placement
/**
 * forked 技能侧车文件的大小上限。
 */
var FORKED_SKILL_SIDECAR_MAX_BYTES = 524288;
//@ chunk-h3fdrpaq.js:794-936 placement
/**
 * 由 transcript 路径得到 forked 技能的 scoping 与 marker 文件路径。
 */
function forkedSkillSidecarPaths(transcriptPath) {
  return {
    scoping: transcriptPath.replace(/\.jsonl$/, ".forked-skill.json"),
    provenanceMarker: transcriptPath.replace(/\.jsonl$/, ".forked-skill.marker.json"),
  };
}
//@ chunk-h3fdrpaq.js:936-968 placement
/**
 * 由代理 id 得到 forked 技能的两个侧车文件路径。
 */
function sidecarPathsForAgent(agentId) {
  return forkedSkillSidecarPaths(getAgentTranscriptPath(agentId));
}
//@ chunk-h3fdrpaq.js:968-1142 placement
/**
 * 定位 forked 技能侧车文件（两者都找到才返回）。
 */
function locateForkedSkillSidecars(agentId) {
  if (agentId === undefined) return;
  let scopingKey = subagentSidecarKey(agentId, ".forked-skill.json");
  let markerKey = subagentSidecarKey(agentId, ".forked-skill.marker.json");
  return scopingKey !== undefined && markerKey !== undefined
    ? {
        scoping: scopingKey,
        provenanceMarker: markerKey,
      }
    : undefined;
}
//@ chunk-h3fdrpaq.js:1142-1212 placement
/**
 * 序列化 forked 技能的来源标记 JSON。
 */
function forkedSkillMarkerJson(skillName) {
  return jsonStringify({
    forkedSkill: true,
    ...(skillName !== undefined && {
      skillName,
    }),
  });
}
//@ chunk-h3fdrpaq.js:1212-1761 placement
function readForkedSkillMarker(agentId) {
  let projectDir = locateSessionProjectDir();
  if (typeof projectDir !== "string") {
    let filePaths = locateForkedSkillSidecars(locateAgentTranscript(agentId));
    return filePaths && toSidecarStorageKeys(filePaths);
  }
  if (dirname(projectDir) !== getProjectsDir()) return;
  let projectKey = basename(projectDir);
  let sessionId = getSessionId();
  let sessionPrefix = join(projectDir, sessionId) + sep;
  let agentTranscriptPath = getAgentTranscriptPath(agentId);
  if (!agentTranscriptPath.startsWith(sessionPrefix)) return;
  let parts = agentTranscriptPath.slice(sessionPrefix.length).split(sep);
  let last = parts.at(-1);
  if (
    last === undefined ||
    !last.endsWith(".jsonl") ||
    ![projectKey, sessionId, ...parts].every(isValidKeySegment)
  )
    return;
  let sliced = parts.slice(0, -1);
  let makeKey = (fileName) => ({
    namespace: "sidecar",
    projectKey,
    sessionId,
    relPath: [...sliced, fileName],
  });
  let scopingKey = makeKey(last.replace(/\.jsonl$/, ".forked-skill.json"));
  let markerKey = makeKey(last.replace(/\.jsonl$/, ".forked-skill.marker.json"));
  return validateStorageKey(scopingKey) === undefined && validateStorageKey(markerKey) === undefined
    ? {
        scoping: scopingKey,
        provenanceMarker: markerKey,
      }
    : undefined;
}
//@ chunk-h3fdrpaq.js:1761-1872 placement
/**
 * 侧车路径转为存储键。
 */
function toSidecarStorageKeys(paths) {
  let storageKey = toStorageKey(paths.scoping);
  let storageKey_2 = toStorageKey(paths.provenanceMarker);
  return storageKey && storageKey_2
    ? {
        scoping: storageKey,
        provenanceMarker: storageKey_2,
      }
    : undefined;
}
//@ chunk-h3fdrpaq.js:1872-2234 placement
/**
 * 经存储后端读取侧车文本（absent/unusable/text）。
 */
async function readSidecarText(storage, key) {
  let metaResult = await storage.statMeta(key);
  if (!metaResult.ok)
    return metaResult.error.code === "NotFound"
      ? {
          kind: "absent",
        }
      : {
          kind: "unusable",
          ...unavailableFlag(metaResult.error),
        };
  if (metaResult.value.size > FORKED_SKILL_SIDECAR_MAX_BYTES)
    return {
      kind: "unusable",
    };
  let readResult = await storage.read([key]);
  if (!readResult.ok)
    return {
      kind: "unusable",
      ...unavailableFlag(readResult.error),
    };
  let item = readResult.value.items[0];
  return item.found
    ? {
        kind: "text",
        text: Buffer.from(item.value).toString("utf8"),
      }
    : {
        kind: "absent",
      };
}
//@ chunk-h3fdrpaq.js:2234-2382 placement
/**
 * 侧车是否存在（读取失败视为存在）。
 */
async function sidecarPresent(storage, provenanceMarker) {
  let metaResult = await storage.statMeta(provenanceMarker);
  if (metaResult.ok)
    return {
      present: true,
    };
  return metaResult.error.code === "NotFound"
    ? {
        present: false,
      }
    : {
        present: true,
        ...unavailableFlag(metaResult.error),
      };
}
//@ chunk-h3fdrpaq.js:2382-2432 placement
function transientReadFlag(flag) {
  return flag === true
    ? {
        transientRead: true,
      }
    : {};
}
//@ chunk-h3fdrpaq.js:2432-2463 placement
function unavailableFlag(error) {
  return transientReadFlag(isUnavailableError(error));
}
//@ chunk-h3fdrpaq.js:2463-2670 placement
/**
 * 经存储后端写侧车文件，失败抛错。
 */
async function writeSidecar(storage, key, skillName) {
  let writeResult = await storage.write(key, forkedSkillMarkerJson(skillName), {
    mode: 438 & ~process.umask(),
  });
  if (!writeResult.ok) {
    logForDebugging(`forked-skill provenance marker write: ${writeResult.error.code}`);
    throw Error("forked-skill provenance marker write failed");
  }
}
//@ chunk-h3fdrpaq.js:2670-2802 placement
/**
 * 无盘会话禁止写侧车。
 */
function assertNotDiskless() {
  if (isDiskless())
    throw Error(
      "forked-skill sidecar write refused: diskless session with no storage backend or key for the path",
    );
}
//@ chunk-h3fdrpaq.js:2802-2899 placement
/**
 * 写入 forked 技能标记：有存储后端时写存储，否则原子写文件。
 */
async function writeForkedSkillMarker(provenanceMarker, skillName, storageV5) {
  let sideKey = isStorageV5Enabled() && storageV5 ? pathToSessionSideKey(provenanceMarker) : undefined;
  if (storageV5 && sideKey) return writeSidecar(storageV5, sideKey, skillName);
  assertNotDiskless();
  await writeFileAtomic(provenanceMarker, forkedSkillMarkerJson(skillName));
}
//@ chunk-h3fdrpaq.js:2899-3305 placement
async function writeForkedSkillScoping(agentId, scoping, storage) {
  let paths = isStorageV5Enabled() && storage ? readForkedSkillMarker(agentId) : undefined;
  if (storage && paths) {
    await writeSidecar(storage, paths.provenanceMarker, scoping.skillName);
    let writeResult = await storage.write(paths.scoping, jsonStringify(scoping), {
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok) {
      logForDebugging(`forked-skill scoping write: ${writeResult.error.code}`);
      throw Error("forked-skill scoping record write failed");
    }
    return;
  }
  assertNotDiskless();
  let sidecarPaths = sidecarPathsForAgent(agentId);
  await mkdir(dirname(sidecarPaths.scoping), {
    recursive: true,
  });
  await writeForkedSkillMarker(sidecarPaths.provenanceMarker, scoping.skillName);
  await writeFileAtomic(sidecarPaths.scoping, jsonStringify(scoping));
}
//@ chunk-h3fdrpaq.js:3305-3437 placement
/**
 * 读取某代理的 forked 技能 scoping（存储后端或本地文件）。
 */
async function readForkedSkillScoping(agentId, storageV5) {
  let paths = isStorageV5Enabled() && storageV5 ? readForkedSkillMarker(agentId) : undefined;
  if (storageV5 && paths) return readScopingViaStorage(storageV5, paths);
  let filePaths = locateForkedSkillSidecars(locateAgentTranscript(agentId));
  return filePaths === undefined
    ? {
        status: "diskless",
      }
    : readScopingFromFiles(filePaths);
}
//@ chunk-h3fdrpaq.js:3437-3794 placement
/**
 * 从本地文件读取 scoping；不存在时检查 marker 判断 absent-but-marked。
 */
async function readScopingFromFiles(paths, storageV5) {
  let storageKeys = isStorageV5Enabled() && storageV5 ? toSidecarStorageKeys(paths) : undefined;
  if (storageV5 && storageKeys) return readScopingViaStorage(storageV5, storageKeys);
  let scopingPath = worktreeFromProgress(paths.scoping);
  let markerPath = worktreeFromProgress(paths.provenanceMarker);
  if (scopingPath === undefined || markerPath === undefined)
    return {
      status: "diskless",
    };
  let text;
  try {
    let stats = await lstat(scopingPath);
    if (!stats.isFile() || stats.size > FORKED_SKILL_SIDECAR_MAX_BYTES)
      return {
        status: "malformed",
      };
    text = await readFile(scopingPath, "utf-8");
  } catch (error) {
    if (isENOENT(error)) return await checkMarkerFile(markerPath);
    return {
      status: "malformed",
      ...transientReadFlag(isUnavailableErrorCode(getErrnoCode(error))),
    };
  }
  return parseSkillScoping(text);
}
//@ chunk-h3fdrpaq.js:3794-3954 placement (2.1.88 match: _temp9, 0.561)
function parseSkillScoping(v_0) {
  let parsed;
  try {
    parsed = jsonParse(v_0);
  } catch {
    return {
      status: "malformed",
    };
  }
  let validated = FORKED_SKILL_SCOPING_SCHEMA().safeParse(parsed);
  return validated.success
    ? {
        status: "valid",
        scoping: validated.data,
      }
    : {
        status: "malformed",
      };
}
//@ chunk-h3fdrpaq.js:3954-4248 layout
/**
 * 经存储后端读取 scoping。
 */
async function readScopingViaStorage(storage, keys) {
  let sidecarText = await readSidecarText(storage, keys.scoping);
  switch (sidecarText.kind) {
    case "text":
      return parseSkillScoping(sidecarText.text);
    case "unusable":
      return {
        status: "malformed",
        ...transientReadFlag(sidecarText.transientRead),
      };
    case "absent": {
      let markerResult = await sidecarPresent(storage, keys.provenanceMarker);
      return markerResult.present
        ? {
            status: "absent-but-marked",
            ...transientReadFlag(markerResult.transientRead),
          }
        : {
            status: "absent",
          };
    }
  }
}
//@ chunk-h3fdrpaq.js:4248-4403 placement
/**
 * 只有 marker 文件时返回 absent-but-marked。
 */
async function checkMarkerFile(markerPath) {
  try {
    await lstat(markerPath);
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
//@ chunk-h3fdrpaq.js:4403-4772 placement
/**
 * 从 provenance marker 读出 forked 技能名。
 */
async function readForkedSkillName(agentId, storageV5) {
  let text;
  let paths = isStorageV5Enabled() && storageV5 ? readForkedSkillMarker(agentId) : undefined;
  if (storageV5 && paths) {
    let sidecarText = await readSidecarText(storageV5, paths.provenanceMarker);
    if (sidecarText.kind !== "text") return;
    text = sidecarText.text;
  } else if (isDiskless()) return;
  else {
    let { provenanceMarker } = sidecarPathsForAgent(agentId);
    try {
      let stats = await lstat(provenanceMarker);
      if (!stats.isFile() || stats.size > FORKED_SKILL_SIDECAR_MAX_BYTES) return;
      text = await readFile(provenanceMarker, "utf-8");
    } catch {
      return;
    }
  }
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return;
  }
  let validated = FORKED_SKILL_MARKER_SCHEMA().safeParse(parsed);
  return validated.success ? validated.data.skillName : undefined;
}
export {
  readForkedSkillScoping,
  readForkedSkillName,
  forkedSkillSidecarPaths,
  readScopingFromFiles,
  writeForkedSkillMarker,
  writeForkedSkillScoping,
};
