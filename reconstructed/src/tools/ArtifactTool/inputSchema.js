/**
 * tools/ArtifactTool/inputSchema.ts
 *
 * 2.1.316 新增：输入 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p98twse2.js (17)
 * attribution: placement 17
 */
import { ARTIFACT_LIST_SCOPES } from "../../services/artifacts/listArtifacts.js";
import {
  VERSIONS_CLAUSE,
  DB_BATCH_OP,
  DB_PROFILES_OP,
  VERIFY_CLAUSE,
  EMULATOR_PREVIEW_CLAUSE,
  PREVIEW_CLAUSE,
} from "./promptText.js";
import {
  zodStrictObject,
  _enum,
  stringSchema,
  booleanSchema,
  record,
  unknown,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_COPY_SOURCES } from "../../services/artifacts/publishInstanceFiles.js";
import { publishEditsDescription } from "./publishEdits.js";
import { DEFAULT_LIST_LIMIT, VERSION_LABEL_MAX } from "./artifactUrls.js";
import { PROVENANCE_FIELD_DESCRIPTION } from "../../services/artifacts/publishSchema.js";
import { MAX_PUBLISHED_PATH_LENGTH, MAX_SEGMENT_WITH_SLASH } from "../../services/artifacts/artifactUrl.js";
import { ASSET_CURSOR_RE } from "./actions/uploadAsset.js";
import { ARTIFACT_CAPABILITIES } from "../../skills/bundled/bundledSkillNames.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  artifactSchemaGates,
  inputSchema,
  zodEnumFieldIncludes,
  dbFieldSchemas,
  commentFieldSchemas,
  previewFieldSchemas,
} from "../../services/artifacts/artifactToolSchema.js";
import { ADDON_OF_LEGACY_ACTION } from "../../services/artifacts/artifactToolActions.js";
import { READ_DB_OPERATIONS, WRITE_DB_OPERATIONS, STR_REPLACE } from "../../services/artifacts/artifactDb.js";
import { ARTIFACT_PERMISSION_LIMITS } from "./permissions/artifactPermissionRules.js";
import { previewEngineKind } from "../../services/artifactPreview/browserDiscovery.js";

//@ chunk-p98twse2.js:1102-1127 placement
/**
 * 惰性注入的 live 路径/上限/提示句子模块与拼句函数。
 */
var CORE_FILES_LIVE_MODULE = null;
var HANDLERS_LIMITS_MODULE = null;
var HANDLERS_CLAUSE_MODULE = null;
//@ chunk-p98twse2.js:1127-1224 placement
/**
 * 把若干句子拼成一句（首字母大写并以句号结尾）。
 */
function joinSentence(parts, separator = ", and ") {
  let joined = parts.join(separator);
  return joined === "" ? "" : ` ${joined[0].toUpperCase()}${joined.slice(1)}.`;
}
//@ chunk-p98twse2.js:1224-1455 placement
var PREFLIGHT_RESERVED_CLAUSE =
  " `preflight.js` at the artifact root is reserved: it runs against open pages when Claude publishes updates, and it must be a JavaScript module of at most 8 KiB whose default export is a function, or the publish is refused.";
//@ chunk-p98twse2.js:1455-1813 placement
/**
 * 按开关组合出 Artifact 工具可用的动作名：基础 publish/list/read，再按 live-edit、room、删除/资源、open、pin、endpoints、quickstart、share 开关追加。
 */
function artifactActionNames(gates) {
  let names = ["publish", "list", "read"];
  if (gates.liveEditOn) names.push("sync");
  if (gates.roomOn) names.push("room_send");
  if (gates.deleteOn || gates.assetsOn) names.push("delete");
  if (gates.openOn) names.push("open");
  if (gates.pinOn) names.push("pin", "unpin");
  if (gates.handlersOn) names.push("get_endpoints", "call_endpoint", "run_script");
  if (gates.quickstartOn) names.push("quickstart");
  if (gates.shareOn) names.push("share");
  return names;
}
//@ chunk-p98twse2.js:1813-1923 placement
function listScopes(gates) {
  let scopes = [...ARTIFACT_LIST_SCOPES, "types"];
  if (gates.multiFileOn) scopes.push("files");
  if (gates.assetsOn) scopes.push("assets");
  return scopes;
}
//@ chunk-p98twse2.js:1923-2167 placement
function actionDescription(gates) {
  return `One of ${artifactActionNames(gates)
    .map((name) => `'${name}'`)
    .join(
      ", ",
    )}. Omitting it means 'publish'. **Calls** in the description says what each one does and takes, except as noted here.${gates.handlersOn && HANDLERS_CLAUSE_MODULE ? HANDLERS_CLAUSE_MODULE.HANDLERS_CLAUSE : ""}${gates.versionsOn ? VERSIONS_CLAUSE : ""}`;
}
//@ chunk-p98twse2.js:2167-2262 placement
/**
 * 按替换表改写字段描述。
 */
function rewriteFieldDescription(schema, replacements) {
  let description = schema.description ?? "";
  for (let [pattern, replacement] of replacements) description = description.replace(pattern, replacement);
  return schema.describe(description);
}
//@ chunk-p98twse2.js:2262-14801 placement
function buildArtifactInputSchema(gates, fields) {
  let shape = fields.shape;
  let pick = (...names) =>
    Object.fromEntries(names.filter((name) => name in shape).map((name) => [name, shape[name]]));
  return zodStrictObject({
    action: _enum(artifactActionNames(gates)).optional().describe(actionDescription(gates)),
    file_path: stringSchema()
      .optional()
      .describe(
        `publish: the local page Claude publishes (.html, or .md only when a skill says so).${gates.typesOn ? " For an Artifact created from an Artifact type, it is one of that Artifact's data files." : ""}${gates.assetsOn ? " With `asset: true`, it is the local file Claude uploads." : ""} A short, distinctive basename also serves as the title when nothing else gives one.`,
      ),
    ...(gates.assetsOn && {
      asset: booleanSchema()
        .optional()
        .describe(
          gates.copyOn
            ? "publish with `url`: true uploads `file_path` (or each of `file_paths`) to that artifact's asset store instead of publishing it as the page \u2014 or, with `from_url` and `asset_ids` in place of `file_path`, copies those assets of another artifact into it server side (see **Calls**)."
            : "publish with `url`: true uploads `file_path` (or each of `file_paths`) to that artifact's asset store instead of publishing it as the page (see **Calls**).",
        ),
      ...("file_paths" in shape && {
        file_paths: rewriteFieldDescription(shape.file_paths, [
          ["upload_asset:", "publish with `asset: true` only:"],
        ]),
      }),
      ...(gates.copyOn &&
        "from_url" in shape && {
          from_url: rewriteFieldDescription(shape.from_url, [
            ["copy_from only:", "publish with `asset: true`, in place of `file_path`:"],
            ["one you can open", "one the person can open"],
          ]),
          asset_ids: rewriteFieldDescription(shape.asset_ids, [
            ["copy_from only:", "publish with `asset: true` and `from_url` only:"],
            [
              "(its list_assets or upload_asset results)",
              '(from a `scope: "assets"` listing of it, or an upload result)',
            ],
          ]),
        }),
    }),
    ...("favicon" in shape && {
      favicon: shape.favicon.describe("Deprecated; Claude omits it and uses `icon`."),
    }),
    ...("icon" in shape && {
      icon: shape.icon.describe(
        `One short generic word for the artifact's browser-tab icon, such as chart, calendar, recipe, code or map: a plain signifier, never a product or brand name. Claude includes it on every page's first publish and omits it on a redeploy so the artifact keeps its icon, passing a new one only when the person asks.${gates.typesOn ? " Ignored on an Artifact created from an Artifact type." : ""}`,
      ),
    }),
    ...("files" in shape &&
      !gates.copyOn && {
        files: shape.files.describe(
          `Supporting files to publish alongside the page, as a map {"published/path": "source/path" | {from, contentType} | null}. The key is what the HTML references. The source is a path on disk, or {from, contentType} when the type cannot be inferred from the published extension. null removes that path on an update, and files left out are kept. A plain list publishes each file at its own spelling. Sources must be under the working directory or Claude's scratchpad directory.` +
            PREFLIGHT_RESERVED_CLAUSE +
            (gates.livePathsOn && CORE_FILES_LIVE_MODULE
              ? CORE_FILES_LIVE_MODULE.CORE_FILES_LIVE_DESCRIBE
              : ""),
        ),
      }),
    ...("files" in shape &&
      gates.copyOn && {
        files: shape.files.describe(
          `Supporting files to publish alongside the page, as a map {"published/path": "source/path" | {from, contentType} | {artifact, path, ver?} | null}. The key is what the HTML references. The source is a path on disk, or {from, contentType} when the type cannot be inferred from the published extension. An {artifact, path} source copies that Artifact's published file on the server: an Artifact the person can open, with its type carried over, never an HTML or XML document, and at most ${MAX_COPY_SOURCES} source Artifact versions per publish. null removes that path on an update, and files left out are kept. A plain list publishes each file at its own spelling. Sources must be under the working directory or Claude's scratchpad directory.` +
            PREFLIGHT_RESERVED_CLAUSE +
            (gates.livePathsOn && CORE_FILES_LIVE_MODULE
              ? CORE_FILES_LIVE_MODULE.CORE_FILES_LIVE_DESCRIBE
              : ""),
        ),
      }),
    ...("edits" in shape && {
      edits: shape.edits.describe(
        publishEditsDescription({
          core: true,
          typesOn: gates.typesOn,
          multiFileOn: gates.multiFileOn,
        }),
      ),
    }),
    ...("root" in shape && {
      root: shape.root.describe(
        `The base directory that relative \`files\` sources resolve against, like a bundler root. ${gates.typesOn ? "It never changes the published path of a `files` entry" : "It never changes published paths"}. It is relative to the working directory, or absolute within it or within Claude's scratchpad directory.` +
          (gates.typesOn
            ? " It requires `files`, except on an Artifact made from a type, where a data `file_path` is served at its path relative to `root`, unless a `files` map entry states its served path. Claude sends it with every such publish, set to the folder that holds the Artifact's files at their served paths."
            : " It requires `files`."),
      ),
    }),
    ...("live" in shape &&
      CORE_FILES_LIVE_MODULE && {
        live: shape.live.describe(CORE_FILES_LIVE_MODULE.CORE_LIVE_FIELD_DESCRIBE),
      }),
    ...(gates.pinOn &&
      "pin" in shape && {
        pin: shape.pin.describe(
          "publish only: true also pins the published artifact to the person's claude.ai sidebar once it is published. Claude passes it only when the person asked for that. A failed pin never fails the publish, and the result says so.",
        ),
      }),
    limit: shape.limit.describe(
      `list only: the maximum number of artifacts to return (default ${DEFAULT_LIST_LIMIT}).`,
    ),
    scope: _enum(listScopes(gates))
      .optional()
      .describe(
        `list: which listing to return. 'mine' is the default. The others are ${["'shared'", "'all'", gates.typeCatalogOn ? "'types'" : "", gates.multiFileOn ? "'files' (with `url`)" : "", gates.assetsOn ? "'assets' (with `url`, continued with `after`)" : ""].filter(Boolean).reduce((acc, part, index, list) => acc + (index === 0 ? "" : index === list.length - 1 ? " and " : ", ") + part, "")}. See **Calls**.`,
      ),
    ...(gates.typeCatalogOn && {
      type_query: stringSchema()
        .max(200)
        .optional()
        .describe(
          "list with scope 'types' only: limits the listing to the types whose title or description match this text best, ignoring case; a type that matches less well is left out, so a narrowed listing is not the whole catalog. Claude omits it when choosing a type for a request, unless a listing made without it says more types exist than it shows.",
        ),
      type: stringSchema()
        .max(200)
        .optional()
        .describe(
          "list only: the name of a published Artifact type, as a 'types' listing shows it (case does not matter). The listing then shows the Artifacts made from that type instead of the person's gallery. Claude passes this or `type_url`, not both.",
        ),
    }),
    ...pick("intent", "design_systems"),
    title: stringSchema()
      .optional()
      .describe(
        `publish: the fallback title for an HTML page whose file has no <title>. It is a name, not a summary, and Claude keeps it the same across redeploys.${gates.typeCreateOn ? " On a `type_url` create, it is the new Artifact's name: what the person called it, or a short descriptive name. If it is left out, the Artifact is named after the type." : ""}`,
      ),
    description: stringSchema()
      .max(1000)
      .optional()
      .describe("publish: one sentence for the subtitle on the gallery card."),
    ...("session_context" in shape && {
      session_context: shape.session_context.describe(
        `Context stored with the version so that a later session can pick up the work: ${PROVENANCE_FIELD_DESCRIPTION}. Required on an artifact's first publish. After that, Claude omits it unless things changed, since it replaces the stored text.`,
      ),
    }),
    ...("label" in shape && {
      label: shape.label.describe(
        `A short name for this publish, at most ${VERSION_LABEL_MAX} characters (e.g. "Draft to legal"). Optional. It is a few words, not a description.`,
      ),
    }),
    ...pick("deadline"),
    ...pick("overwrite_unread"),
    url: stringSchema()
      .optional()
      .describe(
        'An existing artifact\'s claude.ai link (claude.ai/artifact/{id} or claude.ai/code/artifact/{uuid}); a chat, project or session link is not one, and `action: "list"` lists the person\'s artifacts. On a publish, it is the artifact to update in place, one the person owns or was given edit access to (a read of it says "writer"). Before publishing to an artifact this conversation has neither read nor published, Claude reads it (`action: "read"`) and builds on what comes back; a publish sent without that read is refused. A refusal that hands Claude the live version counts as that read: Claude merges its changes into that version and publishes the result, and never resends the refused content unchanged. Claude omits `url` for a new artifact or to redeploy a file this conversation already published. For read, delete and the other calls that take a URL, it is the artifact to act on.',
      ),
    ...((gates.typeCreateOn || gates.typeCatalogOn) && {
      type_url: stringSchema()
        .max(2048)
        .optional()
        .describe(
          (gates.typeCreateOn
            ? "publish: the Artifact type to create this new, private Artifact from (a link from a 'types' listing). Claude omits `url`. Any `file_path`/`files` passed become the new Artifact's own files beside the type's fixed ones."
            : "An Artifact type's link.") +
            (gates.typeCatalogOn
              ? ` read (no \`url\`): the type to describe. list: the type whose Artifacts to list, or Claude names the type with \`type\` instead.${gates.typeCreateOn ? "" : " Creating an Artifact from a type is not available in this session, so it is accepted only with those two actions."}`
              : ""),
        ),
    }),
    ...("auto_open" in shape && {
      auto_open: shape.auto_open.describe(
        'Only with `type_url` and no `file_path`: when the new Artifact opens for the person. Claude passes "after_first_write" when it will fill the Artifact right after creating it with a files publish to its url, so the person does not first see it empty. The Artifact then opens on that first write. Otherwise Claude omits it, and the Artifact opens when created; Claude always omits it for a type whose content it writes through a connector, such as a Claude Docs document, since no publish or store write follows to open it.',
      ),
    }),
    prompt: stringSchema()
      .optional()
      .describe(
        "read, for an artifact shared with the person: what Claude needs from it, which steers the isolated summary.",
      ),
    force: booleanSchema()
      .optional()
      .describe(
        "publish: a last-resort overwrite that **discards** the newer published version. On a conflict, Claude merges its changes onto the newer content that the rejection hands it and publishes again. Claude passes true only when the person explicitly said to discard that specific version, and the server may still refuse it over a version saved from inside the page.",
      ),
    ...((gates.assetsOn || gates.multiFileOn) && {
      out_dir: shape.out_dir.describe(
        "read with `path`: the directory to save into. The default is this artifact's folder in Claude's scratchpad directory, where saving needs no approval." +
          (gates.multiFileOn
            ? " A published file lands at <out_dir>/<published path>, and saving it outside that default folder asks the person first."
            : "") +
          (gates.assetsOn
            ? " An asset's file is named by its id plus its type's extension; saving it outside the default folder is an ordinary file save the person may be asked to approve."
            : ""),
      ),
    }),
    ...((gates.assetsOn || gates.multiFileOn || gates.handlersOn) && {
      path: stringSchema()
        .max(
          gates.handlersOn && HANDLERS_LIMITS_MODULE
            ? HANDLERS_LIMITS_MODULE.MAX_HANDLER_TARGET_CHARS
            : MAX_PUBLISHED_PATH_LENGTH,
        )
        .optional()
        .describe(
          [
            gates.multiFileOn
              ? `read: the file's published path inside the artifact, exactly as a 'files' listing printed it ("index.html" is the page itself). The file is saved locally, the result says where, and a small text file's contents are included.`
              : "",
            gates.assetsOn
              ? `${gates.multiFileOn ? "It can instead be an" : "read: an"} uploaded asset's id (32 hex characters, from an 'assets' listing or an upload result), and that asset is saved to a local file. delete: the id of the one asset to remove.`
              : "",
            gates.livePathsOn ? "sync: the live file to address." : "",
            gates.handlersOn && HANDLERS_CLAUSE_MODULE
              ? HANDLERS_CLAUSE_MODULE.CALL_HANDLER_PATH_DESCRIBE
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        ),
    }),
    ...("paths" in shape && {
      paths: shape.paths.describe(
        `read: several published paths in place of \`path\`, up to ${MAX_SEGMENT_WITH_SLASH} in one call. Each file is saved as a single \`path\` would be, and the result lists where each one landed, or why it could not be read, with small text files' contents included while they fit.`,
      ),
    }),
    ...(gates.handlersOn && pick("method", "body", "body_file", "mode", "script")),
    ...(gates.shareOn && pick("mode", "people", "access")),
    ...(gates.versionsOn && pick("version")),
    ...(gates.assetsOn && {
      after: stringSchema()
        .regex(ASSET_CURSOR_RE)
        .optional()
        .describe(
          "list with scope 'assets' only: the `next` value from a previous listing, passed to continue it.",
        ),
    }),
    ...("page" in shape && {
      page: shape.page.describe(
        `read only: true returns the rendered page in cases where a read otherwise returns something else.${joinSentence([gates.liveEditOn && CORE_FILES_LIVE_MODULE ? CORE_FILES_LIVE_MODULE.CORE_PAGE_LIVE_CLAUSE : "", gates.typeCatalogOn ? "a typed Artifact's read leaves out the type's own page" : ""].filter(Boolean))}`,
      ),
    }),
    ...("topic" in shape && {
      topic: shape.topic.describe(
        'room_send only: the event topic, which the page listens to through its room capability. It is lowercase and starts with a letter, followed by letters, digits, "_", "-" or ".", at most 48 characters.',
      ),
    }),
    ...(gates.roomOn && {
      data: record(stringSchema(), unknown())
        .optional()
        .describe(
          "room_send: the event payload, a JSON object of at most 4 KiB when serialized. Claude omits it for a bare signal.",
        ),
    }),
    ...("capabilities" in shape && {
      capabilities: shape.capabilities.describe(
        `publish: the runtime capabilities this page declares, as {name: config}. Claude loads the \`${ARTIFACT_CAPABILITIES}\` skill before passing it. On a redeploy Claude omits the field to keep what the page has, and {} clears it.`,
      ),
      contract: shape.contract.describe(
        "publish: the artifact's runtime version. Leaving it out keeps the current version (the default), 'latest' upgrades, and an exact version pins or rolls back. It changes how the published page behaves, so Claude passes it only when the author explicitly intends that change.",
      ),
    }),
  });
}
//@ chunk-p98twse2.js:14801-14828 placement
/**
 * 惰性构建 Artifact 工具的输入 schema。
 */
var artifactInputSchemaLazy = DoctorLazy(() =>
  buildArtifactInputSchema(artifactSchemaGates(), inputSchema()),
);
//@ chunk-p98twse2.js:14828-14908 placement
/**
 * 列出 schema 里以旧动作别名形式出现的动作名。
 */
function legacyActionNamesInSchema(schema) {
  let action = schema.shape.action;
  return Object.keys(ADDON_OF_LEGACY_ACTION).filter((key) => zodEnumFieldIncludes(action, key));
}
//@ chunk-p98twse2.js:14908-15014 placement
function dataFieldNames() {
  return [
    ...Object.keys(dbFieldSchemas(true)),
    ...Object.keys(commentFieldSchemas()),
    ...Object.keys(previewFieldSchemas()),
    "data",
    "out_dir",
  ];
}
//@ chunk-p98twse2.js:15014-15255 placement
function withLegacyActions(gates, legacySchema, baseSchema) {
  let legacyNames = legacyActionNamesInSchema(legacySchema);
  if (legacyNames.length === 0) return baseSchema;
  let shape = legacySchema.shape;
  let dataFields = Object.fromEntries(
    dataFieldNames()
      .filter((name) => name in shape)
      .map((name) => [name, shape[name]]),
  );
  return zodStrictObject({
    ...dataFields,
    ...baseSchema.shape,
    action: _enum([...artifactActionNames(gates), ...legacyNames])
      .optional()
      .describe(baseSchema.shape.action.description ?? ""),
  });
}
//@ chunk-p98twse2.js:15255-15286 placement
/**
 * 带旧动作别名的 Artifact 输入 schema。
 */
var artifactInputSchemaWithLegacyActions = DoctorLazy(() =>
  withLegacyActions(artifactSchemaGates(), inputSchema(), artifactInputSchemaLazy()),
);
//@ chunk-p98twse2.js:15286-16828 placement
/**
 * Artifact 评论子工具的输入 schema：action（read/reply/resolve/watch）、url、thread_id、text、cursor、acknowledge_duplicate、on，以及按开关加入 replies 与 live 文件 path。
 */
function commentsInputSchema(gates, baseSchema) {
  let shape = baseSchema.shape;
  let fields = commentFieldSchemas();
  return zodStrictObject({
    action: _enum(["read", "reply", "resolve", "watch"]).describe(
      "'read' reads the comment threads on the artifact at `url` (add `thread_id` for one thread, or `cursor` to continue a listing); 'reply' posts `text` into the thread `thread_id`; 'resolve' marks that thread resolved; 'watch' manages this session's artifact watches \u2014 with `url` it starts watching that artifact (`on: false` stops), with no `url` it lists this session's watches and rooms" +
        (gates.watchRail === "live"
          ? ", and `replies: true` re-enables automatic comment replies that were stopped or paused for the artifact at `url` (only when the user explicitly asked; approved the way a publish is)."
          : "."),
    ),
    url: stringSchema()
      .optional()
      .describe("The artifact's claude.ai URL. Required for every action except a bare 'watch' listing."),
    thread_id: rewriteFieldDescription(fields.thread_id, [
      ["comments: read just", "read: read just"],
      ['action "comments"', 'action "read"'],
    ]),
    text: fields.text,
    cursor: rewriteFieldDescription(fields.cursor, [["comments only:", "read only:"]]),
    acknowledge_duplicate: fields.acknowledge_duplicate,
    on: booleanSchema()
      .optional()
      .describe("watch only: false stops watching the artifact at `url`; omit (or true) to start."),
    ...(gates.watchRail === "live" && {
      replies: booleanSchema()
        .optional()
        .describe(
          "watch only: true re-enables automatic comment replies for the artifact at `url` after the user stopped or paused them \u2014 pass it ONLY when the user explicitly asked to resume.",
        ),
    }),
    ...(gates.livePathsOn &&
      "path" in shape && {
        path: shape.path.describe(
          "watch only: the live file to listen to; required when the Artifact has more than one.",
        ),
      }),
  });
}
//@ chunk-p98twse2.js:16828-19765 placement
function buildDataActionInputSchema(schema) {
  let shape = schema.shape;
  let hasStrReplace = "old_str" in shape;
  let fields = dbFieldSchemas(hasStrReplace);
  return zodStrictObject({
    action: _enum([
      ...READ_DB_OPERATIONS,
      ...WRITE_DB_OPERATIONS,
      ...(hasStrReplace ? [STR_REPLACE] : []),
      DB_BATCH_OP,
      DB_PROFILES_OP,
    ]).describe(
      `Reads: 'get' (one document: \`collection\` + \`doc_id\`), 'list' (a page of a collection: \`collection\`, with optional \`query.limit\`/\`query.cursor\`), 'query' (filtered: \`collection\` + \`query\`), 'profiles' (people's display names: \`ids\`, nothing else). Writes: 'set' (replace) or 'update' (merge) with \`collection\`, \`doc_id\`, and either \`data\` or \`file_path\`;${hasStrReplace ? " 'str_replace' with `collection`, `doc_id`, `field`, `old_str`, `new_str` \u2014 swaps one exact, unique piece of text inside a string field without resending the field (`replace_all`: every occurrence);" : ""} 'delete' with \`collection\` + \`doc_id\`; 'batch' with \`writes\`. Every action takes the artifact's \`url\`.`,
    ),
    url: stringSchema().optional().describe("The artifact's claude.ai URL. Required."),
    writes: rewriteFieldDescription(fields.writes, [
      ["write_db with db_op 'batch' only:", "action 'batch' only:"],
      ["separate write_db calls", "separate calls"],
    ]),
    collection: rewriteFieldDescription(fields.collection, [
      ["Required for read_db and write_db.", "Required for every action except 'batch' and 'profiles'."],
    ]),
    ids: array(stringSchema())
      .min(1)
      .max(ARTIFACT_PERMISSION_LIMITS)
      .optional()
      .describe(
        `action 'profiles' only: the people to name, 1-${ARTIFACT_PERMISSION_LIMITS} ids exactly as a document or live event showed them ("u_" plus 22 characters).`,
      ),
    doc_id: rewriteFieldDescription(fields.doc_id, [["Required for db_op", "Required for action"]]),
    query: rewriteFieldDescription(fields.query, [["Options for db_op", "Options for action"]]),
    ...(fields.field !== undefined && {
      field: rewriteFieldDescription(fields.field, [
        ["write_db with db_op 'str_replace' only:", "action 'str_replace' only:"],
      ]),
      old_str: rewriteFieldDescription(fields.old_str, [
        ["write_db with db_op 'str_replace' only:", "action 'str_replace' only:"],
      ]),
      new_str: rewriteFieldDescription(fields.new_str, [
        ["write_db with db_op 'str_replace' only:", "action 'str_replace' only:"],
      ]),
      replace_all: rewriteFieldDescription(fields.replace_all, [
        ["write_db with db_op 'str_replace' only:", "action 'str_replace' only:"],
      ]),
      if_version: rewriteFieldDescription(fields.if_version, [
        [
          "write_db with db_op 'set', 'update', 'str_replace' or 'delete'",
          "action 'set', 'update', 'str_replace' or 'delete'",
        ],
        ["every read_db document", "every document a get, list or query returns"],
      ]),
    }),
    data: record(stringSchema(), unknown())
      .optional()
      .describe(
        'set and update: the document fields to write, as a JSON object \u2014 pass exactly one of `data` or `file_path`. In an update, a field given as `{"__delete__": true}` is removed instead.',
      ),
    file_path: stringSchema()
      .optional()
      .describe(
        "set and update: a local JSON file whose top-level object is sent as the document \u2014 an alternative to inline `data`, so a large document need not pass through the conversation.",
      ),
    ...("out_dir" in shape && {
      out_dir: shape.out_dir.describe(
        "get, list and query: when given, each returned document is written as pretty-printed JSON to <out_dir>/<collection path>/<doc_id>.json (directories created as needed) and the result lists the files instead of the document contents \u2014 use it for large documents or many of them.",
      ),
    }),
    as_level: rewriteFieldDescription(fields.as_level, [["read_db and write_db only: act", "Act"]]),
  });
}
//@ chunk-p98twse2.js:19765-20369 placement
/**
 * verify/preview 子工具的输入 schema：按开关提供 verify（url）与 preview（file_path，非仿真时还有 widths/themes）。
 */
function verifyPreviewInputSchema(gates) {
  let fields = previewFieldSchemas();
  let emulator = gates.previewOn && previewEngineKind() === "emulator";
  let actions = [];
  if (gates.verifyOn) actions.push("verify");
  if (gates.previewOn) actions.push("preview");
  return zodStrictObject({
    action: _enum(actions.length > 0 ? actions : ["verify"]).describe(
      (
        (gates.verifyOn ? VERIFY_CLAUSE : "") +
        (gates.previewOn ? (emulator ? EMULATOR_PREVIEW_CLAUSE : PREVIEW_CLAUSE) : "")
      ).trim(),
    ),
    ...(gates.verifyOn && {
      url: stringSchema()
        .optional()
        .describe(
          "verify: the artifact's claude.ai URL \u2014 omit to target this session's most recent publish.",
        ),
    }),
    ...(gates.previewOn && {
      file_path: stringSchema()
        .optional()
        .describe(
          emulator
            ? "preview: the page's .html file to look at in the artifact viewer."
            : "preview: the local .html page to render.",
        ),
    }),
    ...(gates.previewOn &&
      !emulator && {
        widths: fields.widths,
        themes: fields.themes,
      }),
  });
}
//@ chunk-p98twse2.js:20369-20437 placement
/**
 * 评论动作的输入 schema（惰性）。
 */
var commentsInputSchemaLazy = DoctorLazy(() => commentsInputSchema(artifactSchemaGates(), inputSchema()));
var dataInputSchemaLazy = DoctorLazy(() => buildDataActionInputSchema(inputSchema()));
var verifyPreviewInputSchemaLazy = DoctorLazy(() => verifyPreviewInputSchema(artifactSchemaGates()));
export {
  commentsInputSchemaLazy,
  dataInputSchemaLazy,
  verifyPreviewInputSchemaLazy,
  artifactInputSchemaWithLegacyActions,
  artifactInputSchemaLazy,
};
