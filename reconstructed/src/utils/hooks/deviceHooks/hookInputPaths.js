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
function hookDisplayHost(hook, n) {
  if (hook.type === "http")
    try {
      return new URL(hook.url).host || "http hook";
    } catch {
      return "http hook";
    }
  let r = n?.kind === "script" ? basename(n.rawPath) : basename(hook.command.trim().split(/\s+/)[0] ?? "");
  return (
    sanitizeDisplayText(r, {
      maxCodeUnits: 64,
    }) || "hook"
  );
}
//@ chunk-mthxbav8.js:19330-19516 placement
function hookWireLabel(hook, n, r) {
  if (r.wireLabel === "basename") return n;
  if (hook.type === "http")
    try {
      return sanitizeDisplayText(new URL(hook.url).origin, {
        maxCodeUnits: 200,
      });
    } catch {
      return n;
    }
  return sanitizeDisplayText(hook.command, {
    maxCodeUnits: 200,
  });
}
//@ chunk-mthxbav8.js:19516-19631 placement
function withTranscriptPath(e, n) {
  let r = {
    ...e,
    transcript_path: n,
  };
  return "agent_transcript_path" in r
    ? {
        ...r,
        agent_transcript_path: n,
      }
    : r;
}
//@ chunk-mthxbav8.js:19631-19683 placement
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-mthxbav8.js:19683-19749 placement
function getAtPath(e, n) {
  return unescapeJsonPointerPath(n).reduce((acc, s) => (isObjectLike(acc) ? acc[s] : undefined), e);
}
//@ chunk-mthxbav8.js:19749-20884 placement
/**
 * 遍历钩子输入 JSON，收集其中看起来像路径的字符串（有数量与深度上限）。
 */
function collectInputPaths(e, n) {
  let r = [];
  let s = (w, h, v, y) => {
    if (r.length > MAX_COLLECTED_PATHS || y > MAX_PATH_DEPTH) return;
    if (typeof h === "string") {
      if (v && h !== "" && !isAbsolute(h)) r.push(w);
      return;
    }
    if (Array.isArray(h)) {
      h.forEach((C, O) => s(`${w}/${O}`, C, v, y + 1));
      return;
    }
    if (isObjectLike(h)) {
      let any = Object.keys(h).some(isPathLikeFieldName);
      for (let [key, value] of Object.entries(h))
        s(`${w}/${escapeJsonPointerSegment(key)}`, value, (v && !any) || isPathLikeFieldName(key), y + 1);
    }
  };
  let u = (w, h, toolInput) => {
    if (!isObjectLike(toolInput)) return;
    let y = typeof h === "string" ? toolPathFieldInput(h, n) : undefined;
    for (let [key, value] of Object.entries(toolInput))
      s(`${w}/tool_input/${escapeJsonPointerSegment(key)}`, value, key === y || isPathLikeFieldName(key), 1);
  };
  let S = (w, toolResponse) => {
    if (!isObjectLike(toolResponse) || Array.isArray(toolResponse)) return;
    let v = (y, C, O) => {
      if (
        (isHookInputTopField(y) || isToolResponsePathPointer(y) || isPathLikeFieldName(C)) &&
        typeof O === "string" &&
        O !== "" &&
        !isAbsolute(O) &&
        O.length <= 4096 &&
        !/\p{Cc}/u.test(O)
      )
        r.push(y);
    };
    for (let [key, value] of Object.entries(toolResponse)) {
      let O = `${w}/tool_response/${escapeJsonPointerSegment(key)}`;
      v(O, key, value);
      if (isObjectLike(value) && !Array.isArray(value))
        for (let [key, value_2] of Object.entries(value))
          v(`${O}/${escapeJsonPointerSegment(key)}`, key, value_2);
    }
  };
  if ("tool_input" in e) u("", "tool_name" in e ? e.tool_name : undefined, e.tool_input);
  if ("tool_response" in e) S("", e.tool_response);
  if ("tool_calls" in e && Array.isArray(e.tool_calls))
    e.tool_calls.forEach((toolCall, h) => {
      if (isObjectLike(toolCall)) {
        u(`/tool_calls/${h}`, toolCall.tool_name, toolCall.tool_input);
        if ("tool_response" in toolCall) S(`/tool_calls/${h}`, toolCall.tool_response);
      }
    });
  return r;
}
//@ chunk-mthxbav8.js:20884-21180 placement
async function realpathWithLinks(e, n) {
  let r = e;
  let s = [];
  for (;;) {
    if (s.length > MAX_LINK_HOPS) return null;
    try {
      let u = await n.realpath(r);
      return s.length === 0 ? u : resolve(u, ...s);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return null;
      let S = await n
        .lstat(r)
        .then((h) => h.isSymbolicLink())
        .catch(() => false);
      let w = dirname(r);
      if (S || w === r) return null;
      s.unshift(basename(r));
      r = w;
    }
  }
}
//@ chunk-mthxbav8.js:21180-21438 placement
async function filterPathsInRoots(e, n, r, s) {
  let u = (w) => w !== null && (isPathUnderForPlatform(w, r.real) || isPathUnderForPlatform(w, r.dir));
  return (
    await Promise.all(
      e.map(async (w) => {
        let atPath = getAtPath(n, w);
        if (typeof atPath !== "string" || atPath === "") return null;
        let v = isAbsolute(atPath) ? atPath : resolve(n.cwd, atPath);
        return u(await realpathWithLinks(v, s)) ? null : w;
      }),
    )
  ).filter((w) => w !== null);
}
//@ chunk-mthxbav8.js:21438-22021 placement
function createSemaphore(e) {
  let n = 0;
  let r = [];
  let s = () => {
    n -= 1;
    let u = r.shift();
    if (u !== undefined) {
      n += 1;
      u.grant();
    }
  };
  return {
    acquire(u, S) {
      if (S.aborted) return Promise.resolve(null);
      if (n < MAX_TRANSPORT_RETRIES) {
        n += 1;
        return Promise.resolve(once(s));
      }
      if (u <= 0) return Promise.resolve(null);
      return new Promise((resolve) => {
        let h = false;
        let v = (x) => {
          if (h) {
            if (x !== null) x();
            return;
          }
          h = true;
          O.clear();
          S.removeEventListener("abort", C);
          let index = r.indexOf(y);
          if (index !== -1) r.splice(index, 1);
          resolve(x);
        };
        let y = {
          grant: () => v(once(s)),
          refuse: () => v(null),
        };
        let C = () => v(null);
        let O = e.setTimer(() => v(null), u);
        S.addEventListener("abort", C, {
          once: true,
        });
        r.push(y);
      });
    },
    refuseAll() {
      for (let u of r.splice(0)) u.refuse();
    },
  };
}
//@ chunk-mthxbav8.js:22021-22078 placement
function once(e) {
  let n = false;
  return () => {
    if (n) return;
    n = true;
    e();
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
