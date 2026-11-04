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
function stripTrailingSlashes(path) {
  let length = path.length;
  while (length > 0 && path[length - 1] === "/") length -= 1;
  return length === 0 && path.startsWith("/") ? "/" : path.slice(0, length);
}
//@ chunk-hyjyj8hj.js:687-777 placement
function isSafeRelativeSegment(segment) {
  return (
    segment !== "" && segment !== "." && segment !== ".." && !/[\p{Cc}\p{Cf}\u2028\u2029\\:]/u.test(segment)
  );
}
//@ chunk-hyjyj8hj.js:777-1107 placement
/**
 * 把容器内项目目录下的路径换算成设备启动目录下的对应路径，不在其下返回 null。
 */
function translateContainerPath(containerPath, roots) {
  let containerDir = stripTrailingSlashes(roots.containerProjectDir);
  let deviceDir = stripTrailingSlashes(roots.deviceLaunchDir);
  if (!containerDir.startsWith("/") || !deviceDir.startsWith("/") || containerDir === "/") return null;
  if (!isPosixPathUnder(containerPath, containerDir)) return null;
  if (containerPath === containerDir || containerPath === `${containerDir}/`) return deviceDir;
  let parts = containerPath.slice(containerDir.length + 1).split("/");
  let segments = parts.at(-1) === "" ? parts.slice(0, -1) : parts;
  return segments.length > 0 && segments.every(isSafeRelativeSegment)
    ? `${deviceDir === "/" ? "" : deviceDir}/${segments.join("/")}`
    : null;
}
//@ chunk-hyjyj8hj.js:2074-2138 placement
/**
 * 转义 JSON 指针段（~ → ~0，/ → ~1）。
 */
function escapeJsonPointerSegment(segment) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
//@ chunk-hyjyj8hj.js:2138-2233 placement
/**
 * 把 JSON 指针路径拆成未转义的段数组。
 */
function unescapeJsonPointerPath(pointer) {
  return pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}
//@ chunk-hyjyj8hj.js:2233-2502 placement
function HOOK_INPUT_TOP_FIELDS(pointer) {
  let segments = unescapeJsonPointerPath(pointer);
  let rest = segments[0] === "tool_calls" ? segments.slice(2) : segments;
  if (rest[0] === "tool_input") return rest.length >= 1;
  if (rest[0] === "tool_response")
    return (
      (rest.length === 2 && (rest[1] === "filePath" || rest[1] === "notebook_path" || rest[1] === "file")) ||
      (rest.length === 3 && rest[1] === "file" && rest[2] === "filePath")
    );
  return false;
}
//@ chunk-hyjyj8hj.js:2502-2671 placement
function isToolResponsePathPointer(pointer) {
  let segments = unescapeJsonPointerPath(pointer);
  let rest = segments[0] === "tool_calls" ? segments.slice(2) : segments;
  return (
    rest[0] === "tool_response" &&
    ((rest.length === 2 && HOOK_RESPONSE_PATH_MEMBERS.has(rest[1] ?? "")) ||
      (rest.length === 3 && HOOK_RESPONSE_NESTED_PATHS.has(`${rest[1]}/${rest[2]}`)))
  );
}
//@ chunk-hyjyj8hj.js:2671-2716 placement
/**
 * 判断字段名是否像路径字段（path/file/dir/cwd 等）。
 */
function isPathLikeFieldName(name) {
  return PATH_FIELD_NAME_RE.test(name) || URL_FIELD_NAME_RE.test(name);
}
//@ chunk-hyjyj8hj.js:2716-2755 placement
/**
 * 取某工具输入中的路径字段值。
 */
function toolPathFieldInput(toolName, aliases) {
  return getToolPathFields(toolName, aliases)?.input;
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
function collectPathPointers(
  value,
  pointer,
  roots,
  state,
  budget,
  depth = 0,
  pathLike = false,
  allowUrls = false,
) {
  if (depth > MAX_PATH_SCAN_DEPTH || (depth > 0 && budget.members <= 0)) {
    if (typeof value === "object" && value !== null) noteUntranslatedPath(state, pointer);
    return value;
  }
  if (Array.isArray(value)) {
    let changed = false;
    let mapped = value.map((item, itemIndex) => {
      let itemPointer = `${pointer}/${itemIndex}`;
      if (itemPointer in state.paths || state.listed.has(itemPointer)) return item;
      let childPathLike =
        pathLike && !(isPlainObjectRef(item) && Object.keys(item).some(isPathLikeFieldName));
      let replaced =
        pathLike && typeof item === "string"
          ? allowUrls && URL_VALUE_RE.test(item)
            ? item
            : translatePathValue(item, itemPointer, roots, state)
          : collectPathPointers(
              item,
              itemPointer,
              roots,
              state,
              budget,
              depth + 1,
              childPathLike,
              childPathLike && allowUrls,
            );
      changed ||= replaced !== item;
      return replaced;
    });
    return changed ? mapped : value;
  }
  if (!isPlainObjectRef(value)) return value;
  let copied = value;
  let changed = false;
  for (let [key, value_2] of Object.entries(value)) {
    let memberPointer = `${pointer}/${escapeJsonPointerSegment(key)}`;
    if (depth > 0) {
      budget.members -= 1;
      if (budget.members < 0) {
        noteUntranslatedPath(state, pointer);
        break;
      }
    }
    let nextValue = value_2;
    let translated = false;
    if (
      (pathLike || isPathLikeFieldName(key)) &&
      !(memberPointer in state.paths) &&
      !state.listed.has(memberPointer)
    ) {
      let allowUrls_2 = allowUrls || URL_FIELD_NAME_RE.test(key);
      if (typeof value_2 === "string") {
        translated = true;
        nextValue =
          allowUrls_2 && URL_VALUE_RE.test(value_2)
            ? value_2
            : translatePathValue(value_2, memberPointer, roots, state);
      } else if (Array.isArray(value_2)) {
        translated = true;
        nextValue = collectPathPointers(
          value_2,
          memberPointer,
          roots,
          state,
          budget,
          depth + 1,
          true,
          allowUrls_2,
        );
      }
    }
    if (!translated && nextValue === value_2 && typeof value_2 === "object" && value_2 !== null) {
      let childPathLike =
        (pathLike || isPathLikeFieldName(key)) &&
        !(isPlainObjectRef(value_2) && Object.keys(value_2).some(isPathLikeFieldName));
      nextValue = collectPathPointers(
        value_2,
        memberPointer,
        roots,
        state,
        budget,
        depth + 1,
        childPathLike,
        childPathLike && (allowUrls || URL_FIELD_NAME_RE.test(key)),
      );
    }
    if (nextValue !== value_2) {
      if (!changed) {
        copied = {
          ...value,
        };
        changed = true;
      }
      copied[key] = nextValue;
    }
  }
  return copied;
}
//@ chunk-hyjyj8hj.js:4167-4277 placement
function collectFieldPathPointers(value, pointer, roots, state, budget, pathLike) {
  if (pathLike && typeof value === "string") return translatePathValue(value, pointer, roots, state);
  return collectPathPointers(value, pointer, roots, state, budget, 0, pathLike && Array.isArray(value));
}
//@ chunk-hyjyj8hj.js:4277-4366 placement
function isSuspiciousPathSpelling(path) {
  let trimmed = path.trim();
  return trimmed !== path || /^~[^/]*(?:$|\/)/.test(trimmed) || /^[$%`!=]/.test(trimmed);
}
//@ chunk-hyjyj8hj.js:4366-4406 placement
function hasHookToolPathFields(toolName) {
  return Object.hasOwn(HOOK_TOOL_PATH_FIELDS, toolName);
}
//@ chunk-hyjyj8hj.js:4406-4514 placement
function getToolPathFields(toolName, aliases) {
  let canonical = canonicalToolName(toolName);
  if (hasHookToolPathFields(canonical)) return HOOK_TOOL_PATH_FIELDS[canonical];
  let found = aliasesFor(canonical, aliases).map(canonicalToolName).find(hasHookToolPathFields);
  return found === undefined ? undefined : HOOK_TOOL_PATH_FIELDS[found];
}
//@ chunk-hyjyj8hj.js:4514-4589 placement
function noteUntranslatedPath(state, pointer) {
  if (!state.listed.has(pointer)) {
    state.listed.add(pointer);
    state.untranslated.push(pointer);
  }
}
//@ chunk-hyjyj8hj.js:4589-4597 placement
var isPlainObjectRef = isPlainObject;
//@ chunk-hyjyj8hj.js:4597-4882 placement
/**
 * 把钩子输入中的一个路径值从云容器视角转换为设备视角：不可判断的值记入未翻译列表；相对路径只检查各段是否安全；绝对路径若位于容器项目目录下则映射到设备启动目录并记录原值。
 */
function translatePathValue(value, pointer, roots, state) {
  if (typeof value !== "string") return value;
  if (isSuspiciousPathSpelling(value)) {
    noteUntranslatedPath(state, pointer);
    return value;
  }
  if (!value.startsWith("/")) {
    let filtered = (value.endsWith("/") ? value.slice(0, -1) : value)
      .split("/")
      .filter((segment) => segment !== ".");
    if (value !== "" && filtered.length > 0 && !filtered.every(isSafeRelativeSegment))
      noteUntranslatedPath(state, pointer);
    return value;
  }
  let translated = translateContainerPath(value, roots);
  if (translated === null) {
    noteUntranslatedPath(state, pointer);
    return value;
  }
  state.paths[pointer] = value;
  return translated;
}
//@ chunk-hyjyj8hj.js:4882-4984 placement
function translatePathMember(object, member, pointer, roots, state) {
  if (!isPlainObjectRef(object) || !(member in object)) return object;
  let translated = translatePathValue(object[member], pointer, roots, state);
  return translated === object[member]
    ? object
    : {
        ...object,
        [member]: translated,
      };
}
//@ chunk-hyjyj8hj.js:4984-5147 placement
function translatePathArrayMember(toolResponse, member, pointer, roots, state) {
  if (!isPlainObjectRef(toolResponse) || !Array.isArray(toolResponse[member])) return toolResponse;
  let changed = false;
  let mapped = toolResponse[member].map((item, itemIndex) => {
    let translated = translatePathValue(item, `${pointer}/${itemIndex}`, roots, state);
    changed ||= translated !== item;
    return translated;
  });
  return changed
    ? {
        ...toolResponse,
        [member]: mapped,
      }
    : toolResponse;
}
//@ chunk-hyjyj8hj.js:5147-5997 placement
function pathPointersForEvent(input, prefix, roots, state, aliases) {
  let toolPathFields = getToolPathFields(input.tool_name, aliases);
  if (toolPathFields === undefined || !isPlainObjectRef(input.tool_input)) {
    let budget = {
      members: MAX_PATH_SCAN_MEMBERS,
    };
    let toolInput = collectFieldPathPointers(
      input.tool_input,
      `${prefix}/tool_input`,
      roots,
      state,
      budget,
      true,
    );
    return "tool_response" in input
      ? {
          ...input,
          tool_input: toolInput,
          tool_response: collectFieldPathPointers(
            input.tool_response,
            `${prefix}/tool_response`,
            roots,
            state,
            budget,
            false,
          ),
        }
      : {
          ...input,
          tool_input: toolInput,
        };
  }
  let toolInput =
    toolPathFields.input === undefined
      ? input.tool_input
      : translatePathMember(
          input.tool_input,
          toolPathFields.input,
          `${prefix}/tool_input/${toolPathFields.input}`,
          roots,
          state,
        );
  if (!("tool_response" in input))
    return {
      ...input,
      tool_input: collectPathPointers(toolInput, `${prefix}/tool_input`, roots, state, {
        members: MAX_PATH_SCAN_MEMBERS,
      }),
    };
  let toolResponse = input.tool_response;
  for (let member of toolPathFields.responseMembers ?? [])
    toolResponse = translatePathMember(
      toolResponse,
      member,
      `${prefix}/tool_response/${member}`,
      roots,
      state,
    );
  for (let [member, nestedMember] of toolPathFields.responseNested ?? [])
    if (isPlainObjectRef(toolResponse) && isPlainObjectRef(toolResponse[member]))
      toolResponse = {
        ...toolResponse,
        [member]: translatePathMember(
          toolResponse[member],
          nestedMember,
          `${prefix}/tool_response/${member}/${nestedMember}`,
          roots,
          state,
        ),
      };
  for (let member of toolPathFields.responseArrays ?? [])
    toolResponse = translatePathArrayMember(
      toolResponse,
      member,
      `${prefix}/tool_response/${member}`,
      roots,
      state,
    );
  let budget = {
    members: MAX_PATH_SCAN_MEMBERS,
  };
  return {
    ...input,
    tool_input: collectPathPointers(toolInput, `${prefix}/tool_input`, roots, state, budget),
    tool_response: collectPathPointers(toolResponse, `${prefix}/tool_response`, roots, state, budget),
  };
}
//@ chunk-hyjyj8hj.js:5997-6958 placement
/**
 * 各钩子事件（PreToolUse、PostToolUse 等）中包含路径的 JSON 指针。
 */
function PATH_POINTERS_BY_EVENT(input, roots, roots_2, options) {
  let state = {
    paths: {},
    untranslated: [],
    listed: new Set(),
  };
  let translatedCwd = isSuspiciousPathSpelling(input.cwd) ? null : translateContainerPath(input.cwd, roots);
  if (translatedCwd === null) noteUntranslatedPath(state, "/cwd");
  let cwd = translatedCwd ?? stripTrailingSlashes(roots.deviceLaunchDir);
  let next = {
    ...input,
    cwd,
    transcript_path: CLOUD_TRANSCRIPT_UNAVAILABLE,
  };
  if ("agent_transcript_path" in next)
    next = {
      ...next,
      agent_transcript_path: CLOUD_TRANSCRIPT_UNAVAILABLE,
    };
  switch (next.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionDenied":
      next = pathPointersForEvent(next, "", roots, state, options);
      break;
    case "PermissionRequest":
      next = pathPointersForEvent(next, "", roots, state, options);
      if (next.permission_suggestions !== undefined) noteUntranslatedPath(state, "/permission_suggestions");
      break;
    case "PostToolBatch":
      next = {
        ...next,
        tool_calls: next.tool_calls.map((toolCall, toolCallIndex) =>
          pathPointersForEvent(toolCall, `/tool_calls/${toolCallIndex}`, roots, state, options),
        ),
      };
      break;
    default:
      break;
  }
  let cloudSession = {
    id: roots_2.cloudSessionId,
    container_cwd: roots.containerCwd,
    container_project_dir: roots.containerProjectDir,
    device_launch_dir: roots.deviceLaunchDir,
    original: {
      cwd: input.cwd,
      transcript_path: input.transcript_path,
      ...("agent_transcript_path" in input && {
        agent_transcript_path: input.agent_transcript_path,
      }),
      paths: state.paths,
    },
  };
  return {
    input: {
      ...next,
      cloud_session: cloudSession,
    },
    untranslated: state.untranslated,
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
