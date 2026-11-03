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
import {
  basename,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  resolve,
  dirname,
  dirname as dirname_2,
} from "path";
import { sanitizeDisplayText } from "../../resultError.js";
import { rtn, MXe, ntn, j$n, isToolResponsePathPointer } from "../hookInputPaths.js";
import { pt, Fr, isHookInputTopField, Mr, $r } from "./runDeviceHook.js";
import { getErrnoCode } from "../../errors.js";
import { M2 } from "../hookCommandAnalysis.js";

//@ chunk-mthxbav8.js:19107-19330 placement
function hookDisplayHost(e, n) {
  if (e.type === "http")
    try {
      return new URL(e.url).host || "http hook";
    } catch {
      return "http hook";
    }
  let r = n?.kind === "script" ? basename(n.rawPath) : basename(e.command.trim().split(/\s+/)[0] ?? "");
  return sanitizeDisplayText(r, { maxCodeUnits: 64 }) || "hook";
}
//@ chunk-mthxbav8.js:19330-19516 placement
function hookWireLabel(e, n, r) {
  if (r.wireLabel === "basename") return n;
  if (e.type === "http")
    try {
      return sanitizeDisplayText(new URL(e.url).origin, { maxCodeUnits: 200 });
    } catch {
      return n;
    }
  return sanitizeDisplayText(e.command, { maxCodeUnits: 200 });
}
//@ chunk-mthxbav8.js:19516-19631 placement
function withTranscriptPath(e, n) {
  let r = { ...e, transcript_path: n };
  return "agent_transcript_path" in r ? { ...r, agent_transcript_path: n } : r;
}
//@ chunk-mthxbav8.js:19631-19683 placement
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-mthxbav8.js:19683-19749 placement
function getAtPath(e, n) {
  return rtn(n).reduce((r, s) => (isObjectLike(r) ? r[s] : void 0), e);
}
/**
 * 遍历钩子输入 JSON，收集其中看起来像路径的字符串（有数量与深度上限）。
 */
//@ chunk-mthxbav8.js:19749-20884 placement
function collectInputPaths(e, n) {
  let r = [],
    s = (w, h, v, y) => {
      if (r.length > pt || y > Fr) return;
      if (typeof h === "string") {
        if (v && h !== "" && !isAbsolute_2(h)) r.push(w);
        return;
      }
      if (Array.isArray(h)) {
        h.forEach((C, O) => s(`${w}/${O}`, C, v, y + 1));
        return;
      }
      if (isObjectLike(h)) {
        let any = Object.keys(h).some(MXe);
        for (let [O, x] of Object.entries(h)) s(`${w}/${ntn(O)}`, x, (v && !any) || MXe(O), y + 1);
      }
    },
    u = (w, h, v) => {
      if (!isObjectLike(v)) return;
      let y = typeof h === "string" ? j$n(h, n) : void 0;
      for (let [C, O] of Object.entries(v)) s(`${w}/tool_input/${ntn(C)}`, O, C === y || MXe(C), 1);
    },
    S = (w, h) => {
      if (!isObjectLike(h) || Array.isArray(h)) return;
      let v = (y, C, O) => {
        if (
          (isHookInputTopField(y) || isToolResponsePathPointer(y) || MXe(C)) &&
          typeof O === "string" &&
          O !== "" &&
          !isAbsolute_2(O) &&
          O.length <= 4096 &&
          !/\p{Cc}/u.test(O)
        )
          r.push(y);
      };
      for (let [y, C] of Object.entries(h)) {
        let O = `${w}/tool_response/${ntn(y)}`;
        if ((v(O, y, C), isObjectLike(C) && !Array.isArray(C)))
          for (let [x, R] of Object.entries(C)) v(`${O}/${ntn(x)}`, x, R);
      }
    };
  if ("tool_input" in e) u("", "tool_name" in e ? e.tool_name : void 0, e.tool_input);
  if ("tool_response" in e) S("", e.tool_response);
  if ("tool_calls" in e && Array.isArray(e.tool_calls))
    e.tool_calls.forEach((tool_call, h) => {
      if (isObjectLike(tool_call)) {
        if ((u(`/tool_calls/${h}`, tool_call.tool_name, tool_call.tool_input), "tool_response" in tool_call))
          S(`/tool_calls/${h}`, tool_call.tool_response);
      }
    });
  return r;
}
//@ chunk-mthxbav8.js:20884-21180 placement
async function realpathWithLinks(e, n) {
  let r = e,
    s = [];
  for (;;) {
    if (s.length > Mr) return null;
    try {
      let realpath = await n.realpath(r);
      return s.length === 0 ? realpath : resolve(realpath, ...s);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return null;
      let S = await n
          .lstat(r)
          .then((h) => h.isSymbolicLink())
          .catch(() => !1),
        w = dirname_2(r);
      if (S || w === r) return null;
      (s.unshift(basename(r)), (r = w));
    }
  }
}
//@ chunk-mthxbav8.js:21180-21438 placement
async function filterPathsInRoots(e, n, r, s) {
  let u = (w) => w !== null && (M2(w, r.real) || M2(w, r.dir));
  return (
    await Promise.all(
      e.map(async (w) => {
        let h = getAtPath(n, w);
        if (typeof h !== "string" || h === "") return null;
        let v = isAbsolute_2(h) ? h : resolve(n.cwd, h);
        return u(await realpathWithLinks(v, s)) ? null : w;
      }),
    )
  ).filter((w) => w !== null);
}
//@ chunk-mthxbav8.js:21438-22021 placement
function createSemaphore(e) {
  let n = 0,
    r = [],
    s = () => {
      n -= 1;
      let u = r.shift();
      if (u !== void 0) ((n += 1), u.grant());
    };
  return {
    acquire(u, S) {
      if (S.aborted) return Promise.resolve(null);
      if (n < $r) return ((n += 1), Promise.resolve(Kn(s)));
      if (u <= 0) return Promise.resolve(null);
      return new Promise((w) => {
        let h = !1,
          v = (x) => {
            if (h) {
              if (x !== null) x();
              return;
            }
            ((h = !0), setTimer.clear(), S.removeEventListener("abort", C));
            let index = r.indexOf(y);
            if (index !== -1) r.splice(index, 1);
            w(x);
          },
          y = { grant: () => v(Kn(s)), refuse: () => v(null) },
          C = () => v(null),
          setTimer = e.setTimer(() => v(null), u);
        (S.addEventListener("abort", C, { once: !0 }), r.push(y));
      });
    },
    refuseAll() {
      for (let u of r.splice(0)) u.refuse();
    },
  };
}
//@ chunk-mthxbav8.js:22021-22078 placement
function Kn(e) {
  let n = !1;
  return () => {
    if (n) return;
    ((n = !0), e());
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
