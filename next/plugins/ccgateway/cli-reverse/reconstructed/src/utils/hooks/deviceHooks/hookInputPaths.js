/**
 * utils/hooks/deviceHooks/hookInputPaths.ts
 *
 * 2.1.316 新增：钩子输入中的路径收集
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (10)
 * attribution: placement 10
 */
import { basename, isAbsolute, resolve, dirname } from "path";
import { sanitizeDisplayText } from "../../resultError.js";
import {
  unescapeJsonPointerPath,
  isPathLikeFieldName,
  escapeJsonPointerSegment,
  toolPathFieldInput,
  isToolResponsePathPointer,
} from "../hookInputPaths.js";
import {
  MAX_COLLECTED_PATHS,
  MAX_PATH_DEPTH,
  isHookInputTopField,
  MAX_LINK_HOPS,
  MAX_TRANSPORT_RETRIES,
} from "./runDeviceHook.js";
import { getErrnoCode } from "../../errors.js";
import { isPathUnderForPlatform } from "../hookCommandAnalysis.js";

//@ chunk-mthxbav8.js:19107-19330 placement
function hookDisplayHost(hook, analysis) {
  if (hook.type === "http")
    try {
      return new URL(hook.url).host || "http hook";
    } catch {
      return "http hook";
    }
  let label =
    analysis?.kind === "script"
      ? basename(analysis.rawPath)
      : basename(hook.command.trim().split(/\s+/)[0] ?? "");
  return (
    sanitizeDisplayText(label, {
      maxCodeUnits: 64,
    }) || "hook"
  );
}
//@ chunk-mthxbav8.js:19330-19516 placement
function hookWireLabel(hook, fallbackLabel, options) {
  if (options.wireLabel === "basename") return fallbackLabel;
  if (hook.type === "http")
    try {
      return sanitizeDisplayText(new URL(hook.url).origin, {
        maxCodeUnits: 200,
      });
    } catch {
      return fallbackLabel;
    }
  return sanitizeDisplayText(hook.command, {
    maxCodeUnits: 200,
  });
}
//@ chunk-mthxbav8.js:19516-19631 placement
function withTranscriptPath(input, transcriptPath) {
  let withPath = {
    ...input,
    transcript_path: transcriptPath,
  };
  return "agent_transcript_path" in withPath
    ? {
        ...withPath,
        agent_transcript_path: transcriptPath,
      }
    : withPath;
}
//@ chunk-mthxbav8.js:19631-19683 placement
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-mthxbav8.js:19683-19749 placement
function getAtPath(root, pointer) {
  return unescapeJsonPointerPath(pointer).reduce(
    (acc, segment) => (isObjectLike(acc) ? acc[segment] : undefined),
    root,
  );
}
//@ chunk-mthxbav8.js:19749-20884 placement
/**
 * 遍历钩子输入 JSON，收集其中看起来像路径的字符串（有数量与深度上限）。
 */
function collectInputPaths(input, toolPathFields) {
  let pointers = [];
  let visit = (pointer, value, pathLikeParent, depth) => {
    if (pointers.length > MAX_COLLECTED_PATHS || depth > MAX_PATH_DEPTH) return;
    if (typeof value === "string") {
      if (pathLikeParent && value !== "" && !isAbsolute(value)) pointers.push(pointer);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, itemIndex) => visit(`${pointer}/${itemIndex}`, item, pathLikeParent, depth + 1));
      return;
    }
    if (isObjectLike(value)) {
      let any = Object.keys(value).some(isPathLikeFieldName);
      for (let [key, value_2] of Object.entries(value))
        visit(
          `${pointer}/${escapeJsonPointerSegment(key)}`,
          value_2,
          (pathLikeParent && !any) || isPathLikeFieldName(key),
          depth + 1,
        );
    }
  };
  let collectToolInput = (prefix, toolName, toolInput) => {
    if (!isObjectLike(toolInput)) return;
    let pathField = typeof toolName === "string" ? toolPathFieldInput(toolName, toolPathFields) : undefined;
    for (let [key, value] of Object.entries(toolInput))
      visit(
        `${prefix}/tool_input/${escapeJsonPointerSegment(key)}`,
        value,
        key === pathField || isPathLikeFieldName(key),
        1,
      );
  };
  let collectToolResponse = (prefix, toolResponse) => {
    if (!isObjectLike(toolResponse) || Array.isArray(toolResponse)) return;
    let consider = (pointer, key, value) => {
      if (
        (isHookInputTopField(pointer) || isToolResponsePathPointer(pointer) || isPathLikeFieldName(key)) &&
        typeof value === "string" &&
        value !== "" &&
        !isAbsolute(value) &&
        value.length <= 4096 &&
        !/\p{Cc}/u.test(value)
      )
        pointers.push(pointer);
    };
    for (let [key, value] of Object.entries(toolResponse)) {
      let pointer = `${prefix}/tool_response/${escapeJsonPointerSegment(key)}`;
      consider(pointer, key, value);
      if (isObjectLike(value) && !Array.isArray(value))
        for (let [key, value_2] of Object.entries(value))
          consider(`${pointer}/${escapeJsonPointerSegment(key)}`, key, value_2);
    }
  };
  if ("tool_input" in input)
    collectToolInput("", "tool_name" in input ? input.tool_name : undefined, input.tool_input);
  if ("tool_response" in input) collectToolResponse("", input.tool_response);
  if ("tool_calls" in input && Array.isArray(input.tool_calls))
    input.tool_calls.forEach((toolCall, toolCallIndex) => {
      if (isObjectLike(toolCall)) {
        collectToolInput(`/tool_calls/${toolCallIndex}`, toolCall.tool_name, toolCall.tool_input);
        if ("tool_response" in toolCall)
          collectToolResponse(`/tool_calls/${toolCallIndex}`, toolCall.tool_response);
      }
    });
  return pointers;
}
//@ chunk-mthxbav8.js:20884-21180 placement
async function realpathWithLinks(path, deps) {
  let current = path;
  let missingParts = [];
  for (;;) {
    if (missingParts.length > MAX_LINK_HOPS) return null;
    try {
      let realPath = await deps.realpath(current);
      return missingParts.length === 0 ? realPath : resolve(realPath, ...missingParts);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return null;
      let isLink = await deps
        .lstat(current)
        .then((stats) => stats.isSymbolicLink())
        .catch(() => false);
      let parent = dirname(current);
      if (isLink || parent === current) return null;
      missingParts.unshift(basename(current));
      current = parent;
    }
  }
}
//@ chunk-mthxbav8.js:21180-21438 placement
async function filterPathsInRoots(pointers, input, root, deps) {
  let isInside = (realPath) =>
    realPath !== null &&
    (isPathUnderForPlatform(realPath, root.real) || isPathUnderForPlatform(realPath, root.dir));
  return (
    await Promise.all(
      pointers.map(async (pointer) => {
        let atPath = getAtPath(input, pointer);
        if (typeof atPath !== "string" || atPath === "") return null;
        let targetPath = isAbsolute(atPath) ? atPath : resolve(input.cwd, atPath);
        return isInside(await realpathWithLinks(targetPath, deps)) ? null : pointer;
      }),
    )
  ).filter((pointer) => pointer !== null);
}
//@ chunk-mthxbav8.js:21438-22021 placement
function createSemaphore(deps) {
  let active = 0;
  let waiters = [];
  let release = () => {
    active -= 1;
    let next = waiters.shift();
    if (next !== undefined) {
      active += 1;
      next.grant();
    }
  };
  return {
    acquire(timeoutMs, signal) {
      if (signal.aborted) return Promise.resolve(null);
      if (active < MAX_TRANSPORT_RETRIES) {
        active += 1;
        return Promise.resolve(once(release));
      }
      if (timeoutMs <= 0) return Promise.resolve(null);
      return new Promise((resolve) => {
        let settled = false;
        let finish = (releaseToken) => {
          if (settled) {
            if (releaseToken !== null) releaseToken();
            return;
          }
          settled = true;
          timer.clear();
          signal.removeEventListener("abort", onAbort);
          let index = waiters.indexOf(waiter);
          if (index !== -1) waiters.splice(index, 1);
          resolve(releaseToken);
        };
        let waiter = {
          grant: () => finish(once(release)),
          refuse: () => finish(null),
        };
        let onAbort = () => finish(null);
        let timer = deps.setTimer(() => finish(null), timeoutMs);
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
        waiters.push(waiter);
      });
    },
    refuseAll() {
      for (let waiter of waiters.splice(0)) waiter.refuse();
    },
  };
}
//@ chunk-mthxbav8.js:22021-22078 placement
function once(callback) {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    callback();
  };
}
export {
  isObjectLike,
  createSemaphore,
  realpathWithLinks,
  hookDisplayHost,
  hookWireLabel,
  collectInputPaths,
  filterPathsInRoots,
  getAtPath,
  withTranscriptPath,
};
