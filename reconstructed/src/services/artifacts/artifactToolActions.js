/**
 * services/artifacts/artifactToolActions.ts
 *
 * 2.1.316 新增：Artifact 工具动作。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4v4n55c3.js (11)
 * attribution: placement 11
 */
import { ASSET_ID_RE } from "../../tools/ArtifactTool/constants.js";

//@ chunk-4v4n55c3.js:227-304 placement
function plainObjectOrNull(t) {
  return typeof t === "object" && t !== null && !Array.isArray(t) ? t : null;
}
//@ chunk-4v4n55c3.js:304-372 placement
function omitFields(fields, ...e) {
  let r = {
    ...fields,
  };
  for (let s of e) delete r[s];
  return r;
}
//@ chunk-4v4n55c3.js:372-413 placement
function isNonEmptyString(t) {
  return typeof t === "string";
}
//@ chunk-4v4n55c3.js:413-476 placement
function isAssetPublishInput(fields) {
  return isNonEmptyString(fields.from_url) || Array.isArray(fields.asset_ids);
}
//@ chunk-4v4n55c3.js:476-812 placement
/**
 * Artifact 工具的细分动作名列表，以及旧动作 → addon（comments/data/check）的归属表。
 */
var ADVANCED_ACTIONS = [
  "read_file",
  "read_asset",
  "describe_type",
  "list_files",
  "list_assets",
  "list_types",
  "upload_asset",
  "delete_asset",
  "copy_from",
];
var ADDON_OF_LEGACY_ACTION = {
  comments: "comments",
  reply: "comments",
  resolve: "comments",
  watch: "comments",
  unwatch: "comments",
  status: "comments",
  resume_replies: "comments",
  read_db: "data",
  write_db: "data",
  verify: "check",
  preview: "check",
};
//@ chunk-4v4n55c3.js:812-855 placement
/**
 * 导出函数 `isLegacyArtifactAction`：参数 t，返回 Object.hasOwn(ADDON_OF_LEGACY_ACTION, t)。
 */
function isLegacyArtifactAction(t) {
  return Object.hasOwn(ADDON_OF_LEGACY_ACTION, t);
}
//@ chunk-4v4n55c3.js:855-926 placement
/**
 * 数据库写入动作名（set/update/str_replace/delete/batch），简写展开时归到 write_db。
 */
var DB_WRITE_OPS = ["set", "update", "str_replace", "delete", "batch"];
var DB_WRITE_OPS_SET = new Set(DB_WRITE_OPS);
//@ chunk-4v4n55c3.js:926-1741 placement
/**
 * 把 Artifact 工具的简写输入展开成细分动作：publish+asset → upload_asset/copy_from，read → describe_type/read_asset/read_file，list+scope → list_types/files/assets，delete+path → delete_asset；不认识时原样返回。
 */
function expandArtifactAction(input) {
  let fields = plainObjectOrNull(input);
  if (fields === null) return input;
  let action = fields.action;
  if (action === undefined || action === "publish") {
    if (fields.asset === true)
      return isAssetPublishInput(fields)
        ? {
            ...omitFields(fields, "asset"),
            action: "copy_from",
          }
        : {
            ...omitFields(fields, "asset"),
            action: "upload_asset",
          };
    return "asset" in fields ? omitFields(fields, "asset") : input;
  }
  if (action === "read") {
    if (isNonEmptyString(fields.type_url) && fields.url === undefined)
      return {
        ...fields,
        action: "describe_type",
      };
    if (isNonEmptyString(fields.path))
      return ASSET_ID_RE.test(fields.path)
        ? {
            ...omitFields(fields, "path"),
            action: "read_asset",
            asset_id: fields.path,
          }
        : {
            ...fields,
            action: "read_file",
          };
    if (Array.isArray(fields.paths))
      return {
        ...fields,
        action: "read_file",
      };
    return input;
  }
  if (action === "list") {
    if (fields.scope === "types")
      return {
        ...omitFields(fields, "scope"),
        action: "list_types",
      };
    if (fields.scope === "files")
      return {
        ...omitFields(fields, "scope"),
        action: "list_files",
      };
    if (fields.scope === "assets")
      return {
        ...omitFields(fields, "scope"),
        action: "list_assets",
      };
    return input;
  }
  if (action === "delete" && isNonEmptyString(fields.path))
    return {
      ...omitFields(fields, "path"),
      action: "delete_asset",
      asset_id: fields.path,
    };
  return input;
}
//@ chunk-4v4n55c3.js:1741-2514 placement
/**
 * qHe 的逆过程：把细分动作（upload_asset、read_file、list_files 等）折回简写形式（publish+asset、read、list+scope、delete+path）。
 */
function collapseArtifactAction(input) {
  let fields = plainObjectOrNull(input);
  if (fields === null) return input;
  switch (fields.action) {
    case "upload_asset":
      return isNonEmptyString(fields.file_path) || Array.isArray(fields.file_paths)
        ? {
            ...fields,
            action: "publish",
            asset: true,
          }
        : input;
    case "copy_from":
      return isAssetPublishInput(fields)
        ? {
            ...fields,
            action: "publish",
            asset: true,
          }
        : input;
    case "describe_type":
      return isNonEmptyString(fields.type_url) && fields.url === undefined
        ? {
            ...fields,
            action: "read",
          }
        : input;
    case "read_file":
      return isNonEmptyString(fields.path) || Array.isArray(fields.paths)
        ? {
            ...fields,
            action: "read",
          }
        : input;
    case "read_asset":
      return isNonEmptyString(fields.asset_id)
        ? {
            ...omitFields(fields, "asset_id"),
            action: "read",
            path: fields.asset_id,
          }
        : input;
    case "list_types":
      return {
        ...fields,
        action: "list",
        scope: "types",
      };
    case "list_files":
      return {
        ...fields,
        action: "list",
        scope: "files",
      };
    case "list_assets":
      return {
        ...fields,
        action: "list",
        scope: "assets",
      };
    case "delete_asset":
      return isNonEmptyString(fields.asset_id)
        ? {
            ...omitFields(fields, "asset_id"),
            action: "delete",
            path: fields.asset_id,
          }
        : input;
    default:
      return input;
  }
}
//@ chunk-4v4n55c3.js:2514-3043 placement
/**
 * 把 addon 工具输入转成主 Artifact 工具输入：comments 的 read/watch（on:false、replies:true、无 url）对应 comments/unwatch/resume_replies/status/watch；data 的读写动作对应 read_db/write_db 加 db_op。
 */
function toParentArtifactInput(addon, input) {
  let fields = plainObjectOrNull(input);
  if (fields === null) return input;
  let action = fields.action;
  if (addon === "comments") {
    if (action === "read")
      return {
        ...fields,
        action: "comments",
      };
    if (action === "watch") {
      let o = omitFields(fields, "on", "replies");
      if (fields.replies === true)
        return {
          ...o,
          action: "resume_replies",
        };
      if (fields.on === false)
        return {
          ...o,
          action: "unwatch",
        };
      if (fields.url === undefined)
        return {
          ...o,
          action: "status",
        };
      return {
        ...o,
        action: "watch",
      };
    }
    return input;
  }
  if (addon === "data") {
    if (action === "get" || action === "list" || action === "query" || action === "profiles")
      return {
        ...fields,
        action: "read_db",
        db_op: action,
      };
    if (DB_WRITE_OPS_SET.has(action))
      return {
        ...fields,
        action: "write_db",
        db_op: action,
      };
    return input;
  }
  return input;
}
//@ chunk-4v4n55c3.js:3043-3512 placement
/**
 * YHe 的逆过程：把主 Artifact 工具输入转回 addon 工具的写法（comments → read，unwatch → watch on:false，read_db/write_db → db_op 本身）。
 */
function fromParentArtifactInput(t, e) {
  let r = plainObjectOrNull(e);
  if (r === null) return e;
  let action = r.action;
  if (t === "comments")
    switch (action) {
      case "comments":
        return {
          ...r,
          action: "read",
        };
      case "watch":
        return {
          ...r,
          action: "watch",
        };
      case "unwatch":
        return {
          ...r,
          action: "watch",
          on: false,
        };
      case "status":
        return {
          ...omitFields(r, "url"),
          action: "watch",
        };
      case "resume_replies":
        return {
          ...r,
          action: "watch",
          replies: true,
        };
      default:
        return e;
    }
  if (t === "data") {
    if ((action === "read_db" || action === "write_db") && isNonEmptyString(r.db_op))
      return {
        ...omitFields(r, "db_op"),
        action: r.db_op,
      };
    return e;
  }
  return e;
}
export {
  fromParentArtifactInput,
  collapseArtifactAction,
  toParentArtifactInput,
  ADDON_OF_LEGACY_ACTION,
  expandArtifactAction,
  isLegacyArtifactAction,
  ADVANCED_ACTIONS,
  DB_WRITE_OPS,
};
