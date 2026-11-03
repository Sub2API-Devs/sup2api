/**
 * utils/hooks/hookInputPaths.ts
 *
 * 2.1.316 新增：钩子输入中的路径字段（JSON 指针 /tool_input/file_path 等），用于设备钩子转发时的路径改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hyjyj8hj.js (23)
 * attribution: placement 23
 */
import { isPosixPathUnder } from "./hookCommandAnalysis.js";
import {
  HOOK_RESPONSE_PATH_MEMBERS,
  HOOK_RESPONSE_NESTED_PATHS,
  HOOK_TOOL_PATH_FIELDS,
} from "../../components/messageActions.js";
import { canonicalToolName, aliasesFor } from "../permissions/permissionRuleParser.js";
import { isPlainObject } from "../isPlainObject.js";

//@ chunk-hyjyj8hj.js:539-578 placement
var X = "<cloud-transcript-unavailable>";
//@ chunk-hyjyj8hj.js:578-687 placement
function stripTrailingSlashes(e) {
  let o = e.length;
  while (o > 0 && e[o - 1] === "/") o -= 1;
  return o === 0 && e.startsWith("/") ? "/" : e.slice(0, o);
}
//@ chunk-hyjyj8hj.js:687-777 placement
function Y(e) {
  return e !== "" && e !== "." && e !== ".." && !/[\p{Cc}\p{Cf}\u2028\u2029\\:]/u.test(e);
}
/**
 * 把容器内项目目录下的路径换算成设备启动目录下的对应路径，不在其下返回 null。
 */
//@ chunk-hyjyj8hj.js:777-1107 placement
function translateContainerPath(e, o) {
  let n = stripTrailingSlashes(o.containerProjectDir),
    r = stripTrailingSlashes(o.deviceLaunchDir);
  if (!n.startsWith("/") || !r.startsWith("/") || n === "/") return null;
  if (!isPosixPathUnder(e, n)) return null;
  if (e === n || e === `${n}/`) return r;
  let parts = e.slice(n.length + 1).split("/"),
    a = parts.at(-1) === "" ? parts.slice(0, -1) : parts;
  return a.length > 0 && a.every(Y) ? `${r === "/" ? "" : r}/${a.join("/")}` : null;
}
//@ chunk-hyjyj8hj.js:2074-2138 placement
function ntn(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
//@ chunk-hyjyj8hj.js:2138-2233 placement
function rtn(e) {
  return e
    .split("/")
    .slice(1)
    .map((o) => o.replace(/~1/g, "/").replace(/~0/g, "~"));
}
//@ chunk-hyjyj8hj.js:2233-2502 placement
function HOOK_INPUT_TOP_FIELDS(e) {
  let o = rtn(e),
    n = o[0] === "tool_calls" ? o.slice(2) : o;
  if (n[0] === "tool_input") return n.length >= 1;
  if (n[0] === "tool_response")
    return (
      (n.length === 2 && (n[1] === "filePath" || n[1] === "notebook_path" || n[1] === "file")) ||
      (n.length === 3 && n[1] === "file" && n[2] === "filePath")
    );
  return !1;
}
//@ chunk-hyjyj8hj.js:2502-2671 placement
function isToolResponsePathPointer(e) {
  let o = rtn(e),
    n = o[0] === "tool_calls" ? o.slice(2) : o;
  return (
    n[0] === "tool_response" &&
    ((n.length === 2 && HOOK_RESPONSE_PATH_MEMBERS.has(n[1] ?? "")) ||
      (n.length === 3 && HOOK_RESPONSE_NESTED_PATHS.has(`${n[1]}/${n[2]}`)))
  );
}
//@ chunk-hyjyj8hj.js:2671-2716 placement
function MXe(e) {
  return PATH_FIELD_NAME_RE.test(e) || URL_FIELD_NAME_RE.test(e);
}
//@ chunk-hyjyj8hj.js:2716-2755 placement
function j$n(e, o) {
  return getToolPathFields(e, o)?.input;
}
/**
 * 识别字段名是否表示路径（path、file、dir、cwd 等）的正则。
 */
//@ chunk-hyjyj8hj.js:2755-3280 placement
var PATH_FIELD_NAME_RE =
    /(?:^|_)(?:path|paths|file|files|filename|filenames|dir|directory|directories|cwd|filepath|filepaths|abspath|realpath|fullpath|relpath|dirname|basename|pathname|folder|folders|dirs|workdir|outdir|rootdir|basedir|tmpdir|subdir|srcdir|destdir|builddir|datadir|homedir)$|(?:Path|Paths|File|Files|Filename|Filenames|Dir|Dirs|Directory|Directories|Folder|Folders|Cwd)$/,
  URL_FIELD_NAME_RE = /(?:^|_)(?:uri|uris|url|urls)$|(?:Uri|Uris|Url|Urls|URI|URIs|URL|URLs)$/,
  URL_VALUE_RE = /^(?:https?|s3|gs|ftps?|mailto|data):[^\p{Cc}\p{Cf}\p{Z}\s]*$/iu,
  MAX_PATH_SCAN_DEPTH = 4,
  MAX_PATH_SCAN_MEMBERS = 256;
//@ chunk-hyjyj8hj.js:3280-4167 placement
function collectPathPointers(e, o, n, r, c, a = 0, f = !1, s = !1) {
  if (a > MAX_PATH_SCAN_DEPTH || (a > 0 && c.members <= 0)) {
    if (typeof e === "object" && e !== null) v(r, o);
    return e;
  }
  if (Array.isArray(e)) {
    let i = !1,
      mapped = e.map((m, g) => {
        let k = `${o}/${g}`;
        if (k in r.paths || r.listed.has(k)) return m;
        let _ = f && !(P(m) && Object.keys(m).some(MXe)),
          y =
            f && typeof m === "string"
              ? s && URL_VALUE_RE.test(m)
                ? m
                : translatePathValue(m, k, n, r)
              : collectPathPointers(m, k, n, r, c, a + 1, _, _ && s);
        return ((i ||= y !== m), y);
      });
    return i ? mapped : e;
  }
  if (!P(e)) return e;
  let h = e,
    u = !1;
  for (let [i, p] of Object.entries(e)) {
    let m = `${o}/${ntn(i)}`;
    if (a > 0) {
      if (((c.members -= 1), c.members < 0)) {
        v(r, o);
        break;
      }
    }
    let g = p,
      k = !1;
    if ((f || MXe(i)) && !(m in r.paths) && !r.listed.has(m)) {
      let _ = s || URL_FIELD_NAME_RE.test(i);
      if (typeof p === "string")
        ((k = !0), (g = _ && URL_VALUE_RE.test(p) ? p : translatePathValue(p, m, n, r)));
      else if (Array.isArray(p)) ((k = !0), (g = collectPathPointers(p, m, n, r, c, a + 1, !0, _)));
    }
    if (!k && g === p && typeof p === "object" && p !== null) {
      let y = (f || MXe(i)) && !(P(p) && Object.keys(p).some(MXe));
      g = collectPathPointers(p, m, n, r, c, a + 1, y, y && (s || URL_FIELD_NAME_RE.test(i)));
    }
    if (g !== p) {
      if (!u) ((h = { ...e }), (u = !0));
      h[i] = g;
    }
  }
  return h;
}
//@ chunk-hyjyj8hj.js:4167-4277 placement
function collectFieldPathPointers(e, o, n, r, c, a) {
  if (a && typeof e === "string") return translatePathValue(e, o, n, r);
  return collectPathPointers(e, o, n, r, c, 0, a && Array.isArray(e));
}
//@ chunk-hyjyj8hj.js:4277-4366 placement
function Z(e) {
  let trimmed = e.trim();
  return trimmed !== e || /^~[^/]*(?:$|\/)/.test(trimmed) || /^[$%`!=]/.test(trimmed);
}
//@ chunk-hyjyj8hj.js:4366-4406 placement
function K(e) {
  return Object.hasOwn(HOOK_TOOL_PATH_FIELDS, e);
}
//@ chunk-hyjyj8hj.js:4406-4514 placement
function getToolPathFields(e, o) {
  let n = canonicalToolName(e);
  if (K(n)) return HOOK_TOOL_PATH_FIELDS[n];
  let found = aliasesFor(n, o).map(canonicalToolName).find(K);
  return found === void 0 ? void 0 : HOOK_TOOL_PATH_FIELDS[found];
}
//@ chunk-hyjyj8hj.js:4514-4589 placement
function v(e, o) {
  if (!e.listed.has(o)) (e.listed.add(o), e.untranslated.push(o));
}
//@ chunk-hyjyj8hj.js:4589-4597 placement
var P = isPlainObject;
/**
 * 把钩子输入中的一个路径值从云容器视角转换为设备视角：不可判断的值记入未翻译列表；相对路径只检查各段是否安全；绝对路径若位于容器项目目录下则映射到设备启动目录并记录原值。
 */
//@ chunk-hyjyj8hj.js:4597-4882 placement
function translatePathValue(e, o, n, r) {
  if (typeof e !== "string") return e;
  if (Z(e)) return (v(r, o), e);
  if (!e.startsWith("/")) {
    let filtered = (e.endsWith("/") ? e.slice(0, -1) : e).split("/").filter((f) => f !== ".");
    if (e !== "" && filtered.length > 0 && !filtered.every(Y)) v(r, o);
    return e;
  }
  let c = translateContainerPath(e, n);
  if (c === null) return (v(r, o), e);
  return ((r.paths[o] = e), c);
}
//@ chunk-hyjyj8hj.js:4882-4984 placement
function translatePathMember(e, o, n, r, c) {
  if (!P(e) || !(o in e)) return e;
  let a = translatePathValue(e[o], n, r, c);
  return a === e[o] ? e : { ...e, [o]: a };
}
//@ chunk-hyjyj8hj.js:4984-5147 placement
function translatePathArrayMember(e, o, n, r, c) {
  if (!P(e) || !Array.isArray(e[o])) return e;
  let a = !1,
    mapped = e[o].map((s, h) => {
      let u = translatePathValue(s, `${n}/${h}`, r, c);
      return ((a ||= u !== s), u);
    });
  return a ? { ...e, [o]: mapped } : e;
}
//@ chunk-hyjyj8hj.js:5147-5997 placement
function pathPointersForEvent(e, o, n, r, c) {
  let a = getToolPathFields(e.tool_name, c);
  if (a === void 0 || !P(e.tool_input)) {
    let u = { members: MAX_PATH_SCAN_MEMBERS },
      i = collectFieldPathPointers(e.tool_input, `${o}/tool_input`, n, r, u, !0);
    return "tool_response" in e
      ? {
          ...e,
          tool_input: i,
          tool_response: collectFieldPathPointers(e.tool_response, `${o}/tool_response`, n, r, u, !1),
        }
      : { ...e, tool_input: i };
  }
  let f =
    a.input === void 0
      ? e.tool_input
      : translatePathMember(e.tool_input, a.input, `${o}/tool_input/${a.input}`, n, r);
  if (!("tool_response" in e))
    return {
      ...e,
      tool_input: collectPathPointers(f, `${o}/tool_input`, n, r, { members: MAX_PATH_SCAN_MEMBERS }),
    };
  let tool_response = e.tool_response;
  for (let u of a.responseMembers ?? [])
    tool_response = translatePathMember(tool_response, u, `${o}/tool_response/${u}`, n, r);
  for (let [u, i] of a.responseNested ?? [])
    if (P(tool_response) && P(tool_response[u]))
      tool_response = {
        ...tool_response,
        [u]: translatePathMember(tool_response[u], i, `${o}/tool_response/${u}/${i}`, n, r),
      };
  for (let u of a.responseArrays ?? [])
    tool_response = translatePathArrayMember(tool_response, u, `${o}/tool_response/${u}`, n, r);
  let h = { members: MAX_PATH_SCAN_MEMBERS };
  return {
    ...e,
    tool_input: collectPathPointers(f, `${o}/tool_input`, n, r, h),
    tool_response: collectPathPointers(tool_response, `${o}/tool_response`, n, r, h),
  };
}
/**
 * 各钩子事件（PreToolUse、PostToolUse 等）中包含路径的 JSON 指针。
 */
//@ chunk-hyjyj8hj.js:5997-6958 placement
function PATH_POINTERS_BY_EVENT(e, o, n, r) {
  let c = { paths: {}, untranslated: [], listed: new Set() },
    a = Z(e.cwd) ? null : translateContainerPath(e.cwd, o);
  if (a === null) v(c, "/cwd");
  let f = a ?? stripTrailingSlashes(o.deviceLaunchDir),
    s = { ...e, cwd: f, transcript_path: X };
  if ("agent_transcript_path" in s) s = { ...s, agent_transcript_path: X };
  switch (s.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionDenied":
      s = pathPointersForEvent(s, "", o, c, r);
      break;
    case "PermissionRequest":
      if (((s = pathPointersForEvent(s, "", o, c, r)), s.permission_suggestions !== void 0))
        v(c, "/permission_suggestions");
      break;
    case "PostToolBatch":
      s = {
        ...s,
        tool_calls: s.tool_calls.map((tool_call, i) =>
          pathPointersForEvent(tool_call, `/tool_calls/${i}`, o, c, r),
        ),
      };
      break;
    default:
      break;
  }
  let h = {
    id: n.cloudSessionId,
    container_cwd: o.containerCwd,
    container_project_dir: o.containerProjectDir,
    device_launch_dir: o.deviceLaunchDir,
    original: {
      cwd: e.cwd,
      transcript_path: e.transcript_path,
      ...("agent_transcript_path" in e && { agent_transcript_path: e.agent_transcript_path }),
      paths: c.paths,
    },
  };
  return { input: { ...s, cloud_session: h }, untranslated: c.untranslated };
}

export {
  j$n,
  stripTrailingSlashes,
  HOOK_INPUT_TOP_FIELDS,
  rtn,
  MXe,
  ntn,
  isToolResponsePathPointer,
  PATH_POINTERS_BY_EVENT,
};
