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
function c(t) {
  return typeof t === "object" && t !== null && !Array.isArray(t) ? t : null;
}
//@ chunk-4v4n55c3.js:304-372 placement
function n(t, ...e) {
  let r = { ...t };
  for (let s of e) delete r[s];
  return r;
}
//@ chunk-4v4n55c3.js:372-413 placement
function a(t) {
  return typeof t === "string";
}
//@ chunk-4v4n55c3.js:413-476 placement
function i(t) {
  return a(t.from_url) || Array.isArray(t.asset_ids);
}
/**
 * Artifact 工具的细分动作名列表，以及旧动作 → addon（comments/data/check）的归属表。
 */
//@ chunk-4v4n55c3.js:476-812 placement
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
  ],
  ADDON_OF_LEGACY_ACTION = {
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
function P1t(t) {
  return Object.hasOwn(ADDON_OF_LEGACY_ACTION, t);
}
//@ chunk-4v4n55c3.js:855-926 placement
var aNo = ["set", "update", "str_replace", "delete", "batch"],
  u = new Set(aNo);
/**
 * 把 Artifact 工具的简写输入展开成细分动作：publish+asset → upload_asset/copy_from，read → describe_type/read_asset/read_file，list+scope → list_types/files/assets，delete+path → delete_asset；不认识时原样返回。
 */
//@ chunk-4v4n55c3.js:926-1741 placement
function expandArtifactAction(input) {
  let fields = c(input);
  if (fields === null) return input;
  let action = fields.action;
  if (action === void 0 || action === "publish") {
    if (fields.asset === !0)
      return i(fields)
        ? { ...n(fields, "asset"), action: "copy_from" }
        : { ...n(fields, "asset"), action: "upload_asset" };
    return "asset" in fields ? n(fields, "asset") : input;
  }
  if (action === "read") {
    if (a(fields.type_url) && fields.url === void 0) return { ...fields, action: "describe_type" };
    if (a(fields.path))
      return ASSET_ID_RE.test(fields.path)
        ? { ...n(fields, "path"), action: "read_asset", asset_id: fields.path }
        : { ...fields, action: "read_file" };
    if (Array.isArray(fields.paths)) return { ...fields, action: "read_file" };
    return input;
  }
  if (action === "list") {
    if (fields.scope === "types") return { ...n(fields, "scope"), action: "list_types" };
    if (fields.scope === "files") return { ...n(fields, "scope"), action: "list_files" };
    if (fields.scope === "assets") return { ...n(fields, "scope"), action: "list_assets" };
    return input;
  }
  if (action === "delete" && a(fields.path))
    return { ...n(fields, "path"), action: "delete_asset", asset_id: fields.path };
  return input;
}
/**
 * qHe 的逆过程：把细分动作（upload_asset、read_file、list_files 等）折回简写形式（publish+asset、read、list+scope、delete+path）。
 */
//@ chunk-4v4n55c3.js:1741-2514 placement
function collapseArtifactAction(input) {
  let fields = c(input);
  if (fields === null) return input;
  switch (fields.action) {
    case "upload_asset":
      return a(fields.file_path) || Array.isArray(fields.file_paths)
        ? { ...fields, action: "publish", asset: !0 }
        : input;
    case "copy_from":
      return i(fields) ? { ...fields, action: "publish", asset: !0 } : input;
    case "describe_type":
      return a(fields.type_url) && fields.url === void 0 ? { ...fields, action: "read" } : input;
    case "read_file":
      return a(fields.path) || Array.isArray(fields.paths) ? { ...fields, action: "read" } : input;
    case "read_asset":
      return a(fields.asset_id) ? { ...n(fields, "asset_id"), action: "read", path: fields.asset_id } : input;
    case "list_types":
      return { ...fields, action: "list", scope: "types" };
    case "list_files":
      return { ...fields, action: "list", scope: "files" };
    case "list_assets":
      return { ...fields, action: "list", scope: "assets" };
    case "delete_asset":
      return a(fields.asset_id)
        ? { ...n(fields, "asset_id"), action: "delete", path: fields.asset_id }
        : input;
    default:
      return input;
  }
}
/**
 * 把 addon 工具输入转成主 Artifact 工具输入：comments 的 read/watch（on:false、replies:true、无 url）对应 comments/unwatch/resume_replies/status/watch；data 的读写动作对应 read_db/write_db 加 db_op。
 */
//@ chunk-4v4n55c3.js:2514-3043 placement
function toParentArtifactInput(addon, input) {
  let fields = c(input);
  if (fields === null) return input;
  let action = fields.action;
  if (addon === "comments") {
    if (action === "read") return { ...fields, action: "comments" };
    if (action === "watch") {
      let o = n(fields, "on", "replies");
      if (fields.replies === !0) return { ...o, action: "resume_replies" };
      if (fields.on === !1) return { ...o, action: "unwatch" };
      if (fields.url === void 0) return { ...o, action: "status" };
      return { ...o, action: "watch" };
    }
    return input;
  }
  if (addon === "data") {
    if (action === "get" || action === "list" || action === "query" || action === "profiles")
      return { ...fields, action: "read_db", db_op: action };
    if (u.has(action)) return { ...fields, action: "write_db", db_op: action };
    return input;
  }
  return input;
}
/**
 * YHe 的逆过程：把主 Artifact 工具输入转回 addon 工具的写法（comments → read，unwatch → watch on:false，read_db/write_db → db_op 本身）。
 */
//@ chunk-4v4n55c3.js:3043-3512 placement
function fromParentArtifactInput(t, e) {
  let r = c(e);
  if (r === null) return e;
  let action = r.action;
  if (t === "comments")
    switch (action) {
      case "comments":
        return { ...r, action: "read" };
      case "watch":
        return { ...r, action: "watch" };
      case "unwatch":
        return { ...r, action: "watch", on: !1 };
      case "status":
        return { ...n(r, "url"), action: "watch" };
      case "resume_replies":
        return { ...r, action: "watch", replies: !0 };
      default:
        return e;
    }
  if (t === "data") {
    if ((action === "read_db" || action === "write_db") && a(r.db_op))
      return { ...n(r, "db_op"), action: r.db_op };
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
  P1t,
  ADVANCED_ACTIONS,
  aNo,
};
