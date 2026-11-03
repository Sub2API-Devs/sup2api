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
var CLOUD_TRANSCRIPT_UNAVAILABLE = "<cloud-transcript-unavailable>";
//@ chunk-hyjyj8hj.js:578-687 placement
function stripTrailingSlashes(e) {
  let o = e.length;
  while (o > 0 && e[o - 1] === "/") o -= 1;
  return o === 0 && e.startsWith("/") ? "/" : e.slice(0, o);
}
//@ chunk-hyjyj8hj.js:687-777 placement
function isSafeRelativeSegment(e) {
  return e !== "" && e !== "." && e !== ".." && !/[\p{Cc}\p{Cf}\u2028\u2029\\:]/u.test(e);
}
//@ chunk-hyjyj8hj.js:777-1107 placement
/**
 * 把容器内项目目录下的路径换算成设备启动目录下的对应路径，不在其下返回 null。
 */
function translateContainerPath(e, o) {
  let n = stripTrailingSlashes(o.containerProjectDir);
  let r = stripTrailingSlashes(o.deviceLaunchDir);
  if (!n.startsWith("/") || !r.startsWith("/") || n === "/") return null;
  if (!isPosixPathUnder(e, n)) return null;
  if (e === n || e === `${n}/`) return r;
  let parts = e.slice(n.length + 1).split("/");
  let a = parts.at(-1) === "" ? parts.slice(0, -1) : parts;
  return a.length > 0 && a.every(isSafeRelativeSegment) ? `${r === "/" ? "" : r}/${a.join("/")}` : null;
}
//@ chunk-hyjyj8hj.js:2074-2138 placement
/**
 * 转义 JSON 指针段（~ → ~0，/ → ~1）。
 */
function escapeJsonPointerSegment(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
//@ chunk-hyjyj8hj.js:2138-2233 placement
/**
 * 把 JSON 指针路径拆成未转义的段数组。
 */
function unescapeJsonPointerPath(e) {
  return e
    .split("/")
    .slice(1)
    .map((o) => o.replace(/~1/g, "/").replace(/~0/g, "~"));
}
//@ chunk-hyjyj8hj.js:2233-2502 placement
function HOOK_INPUT_TOP_FIELDS(e) {
  let o = unescapeJsonPointerPath(e);
  let n = o[0] === "tool_calls" ? o.slice(2) : o;
  if (n[0] === "tool_input") return n.length >= 1;
  if (n[0] === "tool_response")
    return (
      (n.length === 2 && (n[1] === "filePath" || n[1] === "notebook_path" || n[1] === "file")) ||
      (n.length === 3 && n[1] === "file" && n[2] === "filePath")
    );
  return false;
}
//@ chunk-hyjyj8hj.js:2502-2671 placement
function isToolResponsePathPointer(e) {
  let o = unescapeJsonPointerPath(e);
  let n = o[0] === "tool_calls" ? o.slice(2) : o;
  return (
    n[0] === "tool_response" &&
    ((n.length === 2 && HOOK_RESPONSE_PATH_MEMBERS.has(n[1] ?? "")) ||
      (n.length === 3 && HOOK_RESPONSE_NESTED_PATHS.has(`${n[1]}/${n[2]}`)))
  );
}
//@ chunk-hyjyj8hj.js:2671-2716 placement
/**
 * 判断字段名是否像路径字段（path/file/dir/cwd 等）。
 */
function isPathLikeFieldName(e) {
  return PATH_FIELD_NAME_RE.test(e) || URL_FIELD_NAME_RE.test(e);
}
//@ chunk-hyjyj8hj.js:2716-2755 placement
/**
 * 取某工具输入中的路径字段值。
 */
function toolPathFieldInput(toolName, o) {
  return getToolPathFields(toolName, o)?.input;
}
//@ chunk-hyjyj8hj.js:2755-3280 placement
/**
 * 识别字段名是否表示路径（path、file、dir、cwd 等）的正则。
 */
var PATH_FIELD_NAME_RE =
  /(?:^|_)(?:path|paths|file|files|filename|filenames|dir|directory|directories|cwd|filepath|filepaths|abspath|realpath|fullpath|relpath|dirname|basename|pathname|folder|folders|dirs|workdir|outdir|rootdir|basedir|tmpdir|subdir|srcdir|destdir|builddir|datadir|homedir)$|(?:Path|Paths|File|Files|Filename|Filenames|Dir|Dirs|Directory|Directories|Folder|Folders|Cwd)$/;
var URL_FIELD_NAME_RE = /(?:^|_)(?:uri|uris|url|urls)$|(?:Uri|Uris|Url|Urls|URI|URIs|URL|URLs)$/;
var URL_VALUE_RE = /^(?:https?|s3|gs|ftps?|mailto|data):[^\p{Cc}\p{Cf}\p{Z}\s]*$/iu;
var MAX_PATH_SCAN_DEPTH = 4;
var MAX_PATH_SCAN_MEMBERS = 256;
//@ chunk-hyjyj8hj.js:3280-4167 placement
function collectPathPointers(e, o, n, r, c, a = 0, f = false, s = false) {
  if (a > MAX_PATH_SCAN_DEPTH || (a > 0 && c.members <= 0)) {
    if (typeof e === "object" && e !== null) noteUntranslatedPath(r, o);
    return e;
  }
  if (Array.isArray(e)) {
    let i = false;
    let mapped = e.map((m, g) => {
      let k = `${o}/${g}`;
      if (k in r.paths || r.listed.has(k)) return m;
      let _ = f && !(isPlainObjectRef(m) && Object.keys(m).some(isPathLikeFieldName));
      let y =
        f && typeof m === "string"
          ? s && URL_VALUE_RE.test(m)
            ? m
            : translatePathValue(m, k, n, r)
          : collectPathPointers(m, k, n, r, c, a + 1, _, _ && s);
      i ||= y !== m;
      return y;
    });
    return i ? mapped : e;
  }
  if (!isPlainObjectRef(e)) return e;
  let h = e;
  let u = false;
  for (let [key, value] of Object.entries(e)) {
    let m = `${o}/${escapeJsonPointerSegment(key)}`;
    if (a > 0) {
      c.members -= 1;
      if (c.members < 0) {
        noteUntranslatedPath(r, o);
        break;
      }
    }
    let g = value;
    let k = false;
    if ((f || isPathLikeFieldName(key)) && !(m in r.paths) && !r.listed.has(m)) {
      let _ = s || URL_FIELD_NAME_RE.test(key);
      if (typeof value === "string") {
        k = true;
        g = _ && URL_VALUE_RE.test(value) ? value : translatePathValue(value, m, n, r);
      } else if (Array.isArray(value)) {
        k = true;
        g = collectPathPointers(value, m, n, r, c, a + 1, true, _);
      }
    }
    if (!k && g === value && typeof value === "object" && value !== null) {
      let y =
        (f || isPathLikeFieldName(key)) &&
        !(isPlainObjectRef(value) && Object.keys(value).some(isPathLikeFieldName));
      g = collectPathPointers(value, m, n, r, c, a + 1, y, y && (s || URL_FIELD_NAME_RE.test(key)));
    }
    if (g !== value) {
      if (!u) {
        h = {
          ...e,
        };
        u = true;
      }
      h[key] = g;
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
function isSuspiciousPathSpelling(e) {
  let trimmed = e.trim();
  return trimmed !== e || /^~[^/]*(?:$|\/)/.test(trimmed) || /^[$%`!=]/.test(trimmed);
}
//@ chunk-hyjyj8hj.js:4366-4406 placement
function hasHookToolPathFields(e) {
  return Object.hasOwn(HOOK_TOOL_PATH_FIELDS, e);
}
//@ chunk-hyjyj8hj.js:4406-4514 placement
function getToolPathFields(e, o) {
  let n = canonicalToolName(e);
  if (hasHookToolPathFields(n)) return HOOK_TOOL_PATH_FIELDS[n];
  let found = aliasesFor(n, o).map(canonicalToolName).find(hasHookToolPathFields);
  return found === undefined ? undefined : HOOK_TOOL_PATH_FIELDS[found];
}
//@ chunk-hyjyj8hj.js:4514-4589 placement
function noteUntranslatedPath(e, o) {
  if (!e.listed.has(o)) {
    e.listed.add(o);
    e.untranslated.push(o);
  }
}
//@ chunk-hyjyj8hj.js:4589-4597 placement
var isPlainObjectRef = isPlainObject;
//@ chunk-hyjyj8hj.js:4597-4882 placement
/**
 * 把钩子输入中的一个路径值从云容器视角转换为设备视角：不可判断的值记入未翻译列表；相对路径只检查各段是否安全；绝对路径若位于容器项目目录下则映射到设备启动目录并记录原值。
 */
function translatePathValue(e, o, n, r) {
  if (typeof e !== "string") return e;
  if (isSuspiciousPathSpelling(e)) {
    noteUntranslatedPath(r, o);
    return e;
  }
  if (!e.startsWith("/")) {
    let filtered = (e.endsWith("/") ? e.slice(0, -1) : e).split("/").filter((f) => f !== ".");
    if (e !== "" && filtered.length > 0 && !filtered.every(isSafeRelativeSegment)) noteUntranslatedPath(r, o);
    return e;
  }
  let c = translateContainerPath(e, n);
  if (c === null) {
    noteUntranslatedPath(r, o);
    return e;
  }
  r.paths[o] = e;
  return c;
}
//@ chunk-hyjyj8hj.js:4882-4984 placement
function translatePathMember(e, o, n, r, c) {
  if (!isPlainObjectRef(e) || !(o in e)) return e;
  let a = translatePathValue(e[o], n, r, c);
  return a === e[o]
    ? e
    : {
        ...e,
        [o]: a,
      };
}
//@ chunk-hyjyj8hj.js:4984-5147 placement
function translatePathArrayMember(toolResponse, o, n, r, c) {
  if (!isPlainObjectRef(toolResponse) || !Array.isArray(toolResponse[o])) return toolResponse;
  let a = false;
  let mapped = toolResponse[o].map((s, h) => {
    let u = translatePathValue(s, `${n}/${h}`, r, c);
    a ||= u !== s;
    return u;
  });
  return a
    ? {
        ...toolResponse,
        [o]: mapped,
      }
    : toolResponse;
}
//@ chunk-hyjyj8hj.js:5147-5997 placement
function pathPointersForEvent(e, o, n, r, c) {
  let toolPathFields = getToolPathFields(e.tool_name, c);
  if (toolPathFields === undefined || !isPlainObjectRef(e.tool_input)) {
    let u = {
      members: MAX_PATH_SCAN_MEMBERS,
    };
    let toolInput = collectFieldPathPointers(e.tool_input, `${o}/tool_input`, n, r, u, true);
    return "tool_response" in e
      ? {
          ...e,
          tool_input: toolInput,
          tool_response: collectFieldPathPointers(e.tool_response, `${o}/tool_response`, n, r, u, false),
        }
      : {
          ...e,
          tool_input: toolInput,
        };
  }
  let f =
    toolPathFields.input === undefined
      ? e.tool_input
      : translatePathMember(
          e.tool_input,
          toolPathFields.input,
          `${o}/tool_input/${toolPathFields.input}`,
          n,
          r,
        );
  if (!("tool_response" in e))
    return {
      ...e,
      tool_input: collectPathPointers(f, `${o}/tool_input`, n, r, {
        members: MAX_PATH_SCAN_MEMBERS,
      }),
    };
  let toolResponse = e.tool_response;
  for (let u of toolPathFields.responseMembers ?? [])
    toolResponse = translatePathMember(toolResponse, u, `${o}/tool_response/${u}`, n, r);
  for (let [u, i] of toolPathFields.responseNested ?? [])
    if (isPlainObjectRef(toolResponse) && isPlainObjectRef(toolResponse[u]))
      toolResponse = {
        ...toolResponse,
        [u]: translatePathMember(toolResponse[u], i, `${o}/tool_response/${u}/${i}`, n, r),
      };
  for (let u of toolPathFields.responseArrays ?? [])
    toolResponse = translatePathArrayMember(toolResponse, u, `${o}/tool_response/${u}`, n, r);
  let h = {
    members: MAX_PATH_SCAN_MEMBERS,
  };
  return {
    ...e,
    tool_input: collectPathPointers(f, `${o}/tool_input`, n, r, h),
    tool_response: collectPathPointers(toolResponse, `${o}/tool_response`, n, r, h),
  };
}
//@ chunk-hyjyj8hj.js:5997-6958 placement
/**
 * 各钩子事件（PreToolUse、PostToolUse 等）中包含路径的 JSON 指针。
 */
function PATH_POINTERS_BY_EVENT(e, roots, n, r) {
  let c = {
    paths: {},
    untranslated: [],
    listed: new Set(),
  };
  let a = isSuspiciousPathSpelling(e.cwd) ? null : translateContainerPath(e.cwd, roots);
  if (a === null) noteUntranslatedPath(c, "/cwd");
  let cwd = a ?? stripTrailingSlashes(roots.deviceLaunchDir);
  let s = {
    ...e,
    cwd,
    transcript_path: CLOUD_TRANSCRIPT_UNAVAILABLE,
  };
  if ("agent_transcript_path" in s)
    s = {
      ...s,
      agent_transcript_path: CLOUD_TRANSCRIPT_UNAVAILABLE,
    };
  switch (s.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionDenied":
      s = pathPointersForEvent(s, "", roots, c, r);
      break;
    case "PermissionRequest":
      s = pathPointersForEvent(s, "", roots, c, r);
      if (s.permission_suggestions !== undefined) noteUntranslatedPath(c, "/permission_suggestions");
      break;
    case "PostToolBatch":
      s = {
        ...s,
        tool_calls: s.tool_calls.map((toolCall, i) =>
          pathPointersForEvent(toolCall, `/tool_calls/${i}`, roots, c, r),
        ),
      };
      break;
    default:
      break;
  }
  let cloudSession = {
    id: n.cloudSessionId,
    container_cwd: roots.containerCwd,
    container_project_dir: roots.containerProjectDir,
    device_launch_dir: roots.deviceLaunchDir,
    original: {
      cwd: e.cwd,
      transcript_path: e.transcript_path,
      ...("agent_transcript_path" in e && {
        agent_transcript_path: e.agent_transcript_path,
      }),
      paths: c.paths,
    },
  };
  return {
    input: {
      ...s,
      cloud_session: cloudSession,
    },
    untranslated: c.untranslated,
  };
}
export {
  toolPathFieldInput,
  stripTrailingSlashes,
  HOOK_INPUT_TOP_FIELDS,
  unescapeJsonPointerPath,
  isPathLikeFieldName,
  escapeJsonPointerSegment,
  isToolResponsePathPointer,
  PATH_POINTERS_BY_EVENT,
};
