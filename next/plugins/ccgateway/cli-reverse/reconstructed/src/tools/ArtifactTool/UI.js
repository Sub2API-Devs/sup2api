/**
 * tools/ArtifactTool/UI.tsx
 *
 * 2.1.316 新增：渲染 Artifact 工具结果（预览、发布、读取、评论等）；渲染 Artifact 工具调用（live-edit、preview、publish、list 等各动作）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2re189ca.js (17)
 * attribution: placement 17
 */
import { basename } from "path";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { BOXED_DIAMOND_GLYPH } from "../../constants/figures.js";
import {
  ARTIFACT_DISPLAY_TARGET_TAG,
  commentFieldsFrom,
  ASSET_TARGET_PIN_TAG,
  ARTIFACT_DELETE_DISPLAY_TAG,
  assetFieldsFrom,
} from "./permissions/consentStamps.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  artifactCardTitle,
  sweptPagePath,
  sweptAskPath,
  canonicalArtifactTargetFor,
  listScopeFrom,
  sweepAskCopy,
  artifactViewerUrlFor,
  sweepProvenanceMarker,
  sanitizeArtifactTitle,
  splitWatchRows,
  sweepResultLineText,
  revealPageInvisibles,
} from "./artifactUrls.js";
import {
  getShareEntry,
  shareAudienceParenthetical,
  ownershipTag,
} from "../../services/artifacts/shareEntries.js";
import {
  isArtifactToolsetSplit,
  heldArtifactPolicyFetchAnswer,
} from "../../services/artifacts/artifactToolGates.js";
import { expandArtifactAction, toParentArtifactInput } from "../../services/artifacts/artifactToolActions.js";
import { artifactLivePathsSchemaOpen } from "../../services/artifacts/artifactToolSchema.js";
import { truncatePathMiddle, formatFileSize } from "../../utils/format.js";
import {
  previewWidths,
  previewThemes,
  DB_BATCH_OP,
  ROOM_CONSENT_CLAUSE,
  MAX_PREVIEW_CAPTURES,
  MAX_PREVIEW_ERRORS,
  MAX_PREVIEW_WIDTHS,
  MAX_PREVIEW_ISSUES_DROPPED,
  replayedPublishesRemaining,
  replayedPublishesResetAt,
  publishesRemainingLine,
} from "./promptText.js";
import { sanitizedDisplayLabel, readShareInput, describeNamedPeople } from "./actions/share.js";
import { isListActionInput } from "../../utils/bash/treeSitterAnalysis.js";
import { listScopeOrDefault } from "./actions/listByType.js";
import {
  typeOf,
  typeUrlOf,
  dbOutputTarget,
  dbWriteFields,
  batchWrites,
  assetDownloadTarget,
} from "./permissions/dbWriteInputs.js";
import { isVersionListCall } from "./actions/versions.js";
import { truncateToLength, plural, countCharInString } from "../../utils/stringUtils.js";
import {
  parseArtifactUrl,
  parseArtifactUrlInput,
  ASSET_ID_RE,
  ARTIFACT_MAX_RESULT_SIZE_CHARS,
  ARTIFACT_LOGIN_RETRY_NOTE,
  ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE,
  artifactPolicyUnobtainedRefusal,
  artifactPolicyUnobtainedMessage,
  NO_PAGE_REJECTIONS,
  ARTIFACT_LOGIN_MESSAGE_LEAD,
  STALE_GUARD_REJECTION_PREFIX,
  STALE_GUARD_REJECTION_PREFIX_LEGACY,
  CONFLICT_REJECTION_PREFIX,
  HANDOVER_DETAILS_START_RE,
} from "./constants.js";
import { truncateCommentText, otherOrgReplyNotice } from "./actions/comments.js";
import { roomTopicOrInvalid, roomMessageParts } from "./actions/roomSend.js";
import { describeDbWriteTarget, describeLocalFileSources } from "./actions/database.js";
import { dbBatchPayloadsForConsent, dbBatchFileSpellings, publishInputJoinsRoom } from "./ArtifactTool.js";
import {
  STR_REPLACE,
  VERSION_MISMATCH_PREFIXES,
  VERSION_MISMATCH_TEXTS,
} from "../../services/artifacts/artifactDb.js";
import { strReplaceApprovalText, approvalPayloadExcerpt } from "./permissions/approvalText.js";
import { VERSIONED_NAME_RE, sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { parseUploadPaths, MAX_UPLOAD_FILE_PATHS, MAX_UPLOAD_PATH_LENGTH } from "./actions/uploadAsset.js";
import { ownershipSuffix } from "./permissions/ownershipConsent.js";
import { readFilePathArgs, validateReadFilePathsCached, resolveReadFileOutput } from "./readFilePaths.js";
import { isScratchpadPath } from "../../utils/permissions/filesystem.js";
import { isArtifactRoomEnabledStub } from "../../services/artifacts/artifactShare.js";
import { maskScratchFolder, describeThumbnailPath } from "./thumbnails.js";
import { WaitingLabel, RunningLabel } from "../../components/ToolStatusLabels.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { firstResultKey } from "./resultHelpers.js";
import { countWhere } from "../../utils/collections.js";
import { renderToolUseProgressMessage } from "../WebFetchTool/UI.js";
import { sanitizeDisplayText } from "../../services/artifacts/capabilityDeclaration.js";
import { capResultRows } from "../../services/artifacts/artifactPeople.js";
import { stripRejectBreakerNotice } from "../../services/artifacts/rejectBreaker.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { artifactLoginBlockedReason } from "./authSourceHint.js";
import { toUserFacingRefusal } from "../../services/artifacts/publishConflicts.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG } from "../../constants/xml.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { parsePathPinRefusal } from "../../services/artifacts/pathPins.js";
import {
  parseFileTypeRefusal,
  parseRateLimitedMessage,
  parseContractRolloutMessage,
} from "../../services/artifacts/contentTypes.js";

//@ chunk-2re189ca.js:16588-16961 placement
/**
 * 带图标的 artifact 链接。
 */
function ArtifactLink(props) {
  let $ = useMemoCache(8);
  let { name, url, iconColor } = props;
  let color = iconColor === undefined ? "claude" : iconColor;
  let icon;
  if ($[0] !== color) {
    icon = jsxProd_default(Text, {
      color,
      children: BOXED_DIAMOND_GLYPH,
    });
    $[0] = color;
    $[1] = icon;
  } else icon = $[1];
  let label;
  if ($[2] !== name || $[3] !== url) {
    label = url
      ? jsxProd_default(Link, {
          url,
          fallback: name === url ? undefined : `${name} (${url})`,
          children: name,
        })
      : name;
    $[2] = name;
    $[3] = url;
    $[4] = label;
  } else label = $[4];
  let children;
  if ($[5] !== icon || $[6] !== label) {
    children = jsxProd_default_2(Text, {
      children: [icon, " ", label],
    });
    $[5] = icon;
    $[6] = label;
    $[7] = children;
  } else children = $[7];
  return children;
}
//@ chunk-2re189ca.js:16993-17030 placement
/**
 * 惰性注入的渲染模块（live-edit 结果与工具调用、handlers 工具调用与结果）与单次显示行数上限。
 */
var LIVE_EDIT_RESULT_MODULE = null;
var LIVE_EDIT_TOOLUSE_MODULE = null;
var HANDLERS_TOOLUSE_MODULE = null;
var HANDLERS_RESULT_MODULE = null;
var MAX_BASELINE_LINES = 8;
//@ chunk-2re189ca.js:17030-17156 placement
function artifactTitleForDisplay(input, slug, tag = ARTIFACT_DISPLAY_TARGET_TAG) {
  let displayTarget = input[tag];
  let title = isPlainObject(displayTarget) ? displayTarget.title : undefined;
  return artifactCardTitle(
    (slug !== undefined ? getShareEntry(slug)?.title : undefined) || (typeof title === "string" ? title : ""),
  );
}
//@ chunk-2re189ca.js:17156-27180 placement
/**
 * 渲染 Artifact 工具调用（live-edit、preview、publish、list 等各动作）。
 */
function renderArtifactToolUse(toolUse, renderOptions) {
  let input = isArtifactToolsetSplit() ? expandArtifactAction(toolUse) : toolUse;
  if (input.action === "live-edit")
    return LIVE_EDIT_TOOLUSE_MODULE
      ? LIVE_EDIT_TOOLUSE_MODULE.renderLiveEditToolUse(
          input,
          renderOptions?.verbose === true,
          artifactLivePathsSchemaOpen(),
        )
      : jsxProd_default(Text, {
          children: "live-edit",
        });
  if (input.action === "preview") {
    let previewInput = input;
    let filePath = typeof previewInput.file_path === "string" ? previewInput.file_path : "";
    let previewPath = sweptPagePath(filePath) || (filePath === "" ? "(no file)" : "(unprintable path)");
    if (renderOptions?.verbose !== true)
      return jsxProd_default_2(Text, {
        children: ["preview ", truncatePathMiddle(basename(previewPath), 60)],
      });
    let widths = previewWidths(previewInput);
    let themes = previewThemes(previewInput);
    return jsxProd_default_2(Text, {
      children: [
        "preview ",
        truncatePathMiddle(previewPath, 1024),
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${widths.join("/")} \xB7 ${themes.join("+")}`,
        }),
      ],
    });
  }
  if (input.action === "sync")
    return jsxProd_default_2(Text, {
      children: [
        "sync working copy",
        typeof input.file_path === "string"
          ? ` ${truncatePathMiddle(sweptAskPath(input.file_path) || "(unprintable path)", 256)}`
          : "",
        typeof input.url === "string"
          ? ` \u2192 ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}`
          : "",
      ],
    });
  if (input.action === "version")
    return jsxProd_default_2(Text, {
      children: [
        "version",
        typeof input.url === "string"
          ? ` ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}`
          : "",
        typeof input.label === "string" && input.label.trim() !== ""
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ` \xB7 ${sanitizedDisplayLabel(input.label, 200)}`,
            })
          : null,
      ],
    });
  if (input.action === "list") {
    if (isListActionInput(input)) {
      let scope = listScopeOrDefault(input);
      let typeFilter = typeOf(input);
      let children =
        typeFilter !== undefined
          ? `"${sanitizedDisplayLabel(typeFilter, 200)}"`
          : canonicalArtifactTargetFor(typeUrlOf(input), "(unrecognized address)");
      return jsxProd_default_2(Text, {
        children: [
          "list",
          scope === "shared" ? " (shared)" : scope === "all" ? " (mine + shared)" : "",
          " ",
          "of type ",
          jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        ],
      });
    }
    if (isVersionListCall(input))
      return jsxProd_default_2(Text, {
        children: [
          "list versions of",
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(input.url, "(unrecognized address)"),
          }),
        ],
      });
    let scope = listScopeFrom(input);
    return jsxProd_default_2(Text, {
      children: ["list", scope === "shared" ? " (shared)" : scope === "all" ? " (mine + shared)" : ""],
    });
  }
  if (input.action === "list_types") {
    let query =
      typeof input.type_query === "string" && input.type_query.trim() !== ""
        ? sanitizedDisplayLabel(input.type_query, 200)
        : null;
    return jsxProd_default_2(Text, {
      children: [
        "list types",
        query
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ` "${query}"`,
            })
          : "",
      ],
    });
  }
  if (input.action === "quickstart") {
    let intent = input.intent;
    let withoutDesignSystems = intent !== "document" && input.design_systems === false;
    return jsxProd_default_2(Text, {
      children: [
        "quickstart",
        typeof intent === "string"
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ` ${sweepAskCopy(truncateToLength(intent, 20))}`,
            })
          : "",
        withoutDesignSystems
          ? jsxProd_default(Text, {
              dimColor: true,
              children: " without design systems",
            })
          : "",
      ],
    });
  }
  if (input.action === "describe_type")
    return jsxProd_default_2(Text, {
      children: [
        "describe type",
        " ",
        jsxProd_default(Text, {
          dimColor: true,
          children: canonicalArtifactTargetFor(typeUrlOf(input), "(unrecognized address)"),
        }),
      ],
    });
  if (input.action === "comments" || input.action === "reply" || input.action === "resolve") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let replyPreview =
      input.action === "reply" && renderOptions?.verbose === true
        ? truncateCommentText(commentFieldsFrom(input).replyText)
        : undefined;
    let shareEntry =
      (input.action === "reply" || input.action === "resolve") &&
      renderOptions?.verbose === true &&
      artifactUrl !== null
        ? getShareEntry(artifactUrl.slug)
        : undefined;
    let audienceNote = shareAudienceParenthetical(shareEntry);
    return jsxProd_default_2(Text, {
      children: [
        input.action,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            " ",
            artifactUrl !== null ? artifactViewerUrlFor(artifactUrl) : "(unrecognized address)",
          ],
        }),
        audienceNote !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: audienceNote,
          }),
        replyPreview !== undefined &&
          replyPreview !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: ` \u2014 "${replyPreview}"`,
          }),
      ],
    });
  }
  if (
    input.action === "read_db" ||
    input.action === "write_db" ||
    input.action === "room_send" ||
    input.action === "watch" ||
    input.action === "unwatch" ||
    input.action === "resume_replies" ||
    input.action === "status" ||
    input.action === "verify" ||
    input.action === "open"
  ) {
    let verb =
      input.action === "read_db"
        ? "read database"
        : input.action === "write_db"
          ? "write database"
          : input.action === "room_send"
            ? `room send ${roomTopicOrInvalid(roomMessageParts(input).topic)}`
            : input.action === "resume_replies"
              ? "resume auto-replies"
              : input.action;
    if ((input.action === "status" || input.action === "verify") && input.url === undefined)
      return jsxProd_default(Text, {
        children: verb,
      });
    let outputTarget = input.action === "read_db" ? dbOutputTarget(input) : undefined;
    let outDirSuffix =
      outputTarget?.kind === "dir"
        ? ` \u2192 ${truncatePathMiddle(sweptAskPath(outputTarget.dir) || "(unprintable path)", 1024)}`
        : outputTarget?.kind === "unresolvable"
          ? " \u2192 (unresolvable out_dir)"
          : "";
    if (input.action === "write_db" && renderOptions?.verbose === true) {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let audienceNote = shareAudienceParenthetical(shareEntry);
      let { opLabel, docTarget } = describeDbWriteTarget(input);
      let { data, filePath, strReplace, ifVersion } = dbWriteFields(input);
      let payloadText =
        opLabel === DB_BATCH_OP
          ? [
              dbBatchPayloadsForConsent(batchWrites(input)),
              describeLocalFileSources(dbBatchFileSpellings(batchWrites(input))),
            ]
              .filter((part) => part !== "")
              .join(" \u2014 ")
          : filePath !== undefined
            ? `from ${truncatePathMiddle(sweptAskPath(filePath) || "(unprintable path)", 1024)}`
            : opLabel === STR_REPLACE
              ? strReplaceApprovalText(strReplace)
              : approvalPayloadExcerpt(data);
      let ownershipText = ownershipTag(shareEntry);
      return jsxProd_default_2(Text, {
        children: [
          verb,
          " (",
          opLabel,
          ")",
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(input.url, "(unrecognized address)"),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: ` \u2014 ${docTarget}${audienceNote}`,
          }),
          ownershipText !== "" &&
            jsxProd_default(Text, {
              color: "warning",
              children: ownershipText,
            }),
          payloadText !== "" &&
            jsxProd_default(Text, {
              dimColor: true,
              children: ` \u2014 ${payloadText}`,
            }),
          ifVersion !== undefined &&
            jsxProd_default(Text, {
              dimColor: true,
              children: ` (only if still at version ${ifVersion})`,
            }),
        ],
      });
    }
    if (input.action === "room_send" && renderOptions?.verbose === true) {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let audienceNote = shareAudienceParenthetical(shareEntry);
      let excerpt = approvalPayloadExcerpt(roomMessageParts(input).data);
      let ownershipText = ownershipTag(shareEntry);
      return jsxProd_default_2(Text, {
        children: [
          verb,
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(input.url, "(unrecognized address)"),
          }),
          audienceNote !== "" &&
            jsxProd_default(Text, {
              dimColor: true,
              children: audienceNote,
            }),
          ownershipText !== "" &&
            jsxProd_default(Text, {
              color: "warning",
              children: ownershipText,
            }),
          excerpt !== "" &&
            jsxProd_default(Text, {
              dimColor: true,
              children: ` \u2014 ${excerpt}`,
            }),
        ],
      });
    }
    if (input.action === "resume_replies" && renderOptions?.verbose === true) {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      return jsxProd_default_2(Text, {
        children: [
          verb,
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(input.url, "(unrecognized address)"),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: shareAudienceParenthetical(shareEntry),
          }),
        ],
      });
    }
    return jsxProd_default_2(Text, {
      children: [
        verb,
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [canonicalArtifactTargetFor(input.url, "(unrecognized address)"), outDirSuffix],
        }),
      ],
    });
  }
  if (input.action === "get_endpoints" || input.action === "call_endpoint" || input.action === "run_script") {
    let { verb, body } = HANDLERS_TOOLUSE_MODULE
      ? HANDLERS_TOOLUSE_MODULE.handlersToolUseLine(input, renderOptions?.verbose === true)
      : {
          verb: String(input.action),
          body: "",
        };
    return jsxProd_default_2(Text, {
      children: [
        verb,
        " ",
        jsxProd_default(Text, {
          dimColor: true,
          children: canonicalArtifactTargetFor(input.url, "(unrecognized address)"),
        }),
        body !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: body,
          }),
      ],
    });
  }
  if (input.action === "read") {
    let artifactUrlInput = parseArtifactUrlInput(input.url);
    let shareEntry = artifactUrlInput !== null ? getShareEntry(artifactUrlInput.slug) : undefined;
    let ownershipNote = renderOptions?.verbose === true ? ownershipTag(shareEntry) : "";
    let isVersioned = typeof input.version === "string" && VERSIONED_NAME_RE.test(input.version);
    let versionNote =
      input.version === undefined ? "" : isVersioned ? ` version ${input.version}` : " (an earlier version)";
    return jsxProd_default_2(Text, {
      children: [
        "read",
        " ",
        jsxProd_default(Text, {
          dimColor: true,
          children:
            artifactUrlInput !== null ? artifactViewerUrlFor(artifactUrlInput) : "(unrecognized address)",
        }),
        versionNote !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: versionNote,
          }),
        ownershipNote !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipNote,
          }),
      ],
    });
  }
  if (input.action === "upload_asset") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let verbose = renderOptions?.verbose === true;
    let ownershipNote = verbose ? ownershipTag(shareEntry) : "";
    let uploadPaths = parseUploadPaths(input);
    let uploadLabel =
      uploadPaths.kind === "list"
        ? `${uploadPaths.paths.length} ${plural(uploadPaths.paths.length, "file")}:${uploadPaths.paths
            .map(
              (path) => `
  ${truncatePathMiddle(sweptAskPath(path) || "(unprintable path)", 1024)}`,
            )
            .join("")}
 `
        : truncatePathMiddle(sweptAskPath(input.file_path ?? "") || "(unprintable path)", 1024);
    return jsxProd_default_2(Text, {
      children: [
        "upload ",
        uploadLabel,
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \u2192 ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}${verbose ? shareAudienceParenthetical(shareEntry) : ""}`,
        }),
        ownershipNote !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipNote,
          }),
      ],
    });
  }
  if (input.action === "copy_from") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let verbose = renderOptions?.verbose === true;
    let ownershipText = verbose ? ownershipTag(shareEntry) : "";
    let assetIds = input.asset_ids;
    let assetCount = Array.isArray(assetIds) ? assetIds.length : 0;
    let fromUrl = input.from_url;
    let fromArtifactUrl = typeof fromUrl === "string" ? parseArtifactUrl(fromUrl) : null;
    let sourceOwnership = verbose
      ? ownershipSuffix(fromArtifactUrl !== null ? getShareEntry(fromArtifactUrl.slug) : undefined, "assets")
      : "";
    return jsxProd_default_2(Text, {
      children: [
        "copy ",
        assetCount,
        " ",
        plural(assetCount, "asset"),
        " from",
        " ",
        canonicalArtifactTargetFor(fromUrl, "(unrecognized address)"),
        sourceOwnership !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: sourceOwnership,
          }),
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \u2192 ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}${verbose ? shareAudienceParenthetical(shareEntry) : ""}`,
        }),
        ownershipText !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipText,
          }),
      ],
    });
  }
  if (input.action === "list_files" || input.action === "read_file") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let verbose = renderOptions?.verbose === true;
    let ownershipText = verbose ? ownershipTag(shareEntry) : "";
    let title = artifactTitleForDisplay(input, artifactUrl?.slug);
    let isReadFile = input.action === "read_file";
    let verb = "list files";
    let destSuffix = "";
    if (isReadFile) {
      let { path, paths } = readFilePathArgs(input);
      let targetPin = input[ASSET_TARGET_PIN_TAG];
      let pathCount =
        isPlainObject(targetPin) && Array.isArray(targetPin.paths) ? targetPin.paths.length : paths?.length;
      verb =
        paths !== undefined && pathCount !== undefined
          ? `read ${pathCount} ${plural(pathCount, "file")}`
          : `read ${path !== undefined ? truncatePathMiddle(sweptAskPath(path) || "(unprintable path)", 256) : "(no path)"}`;
      let outDirJudged = targetPin != null;
      let readOutput =
        paths !== undefined
          ? validateReadFilePathsCached(input, {
              outDirJudged,
            })
          : resolveReadFileOutput(input, {
              outDirJudged,
            });
      let destRoot =
        "files" in readOutput ? readOutput.base : "dest" in readOutput ? readOutput.dest : undefined;
      let inScratchpad =
        (isPlainObject(targetPin) && targetPin.defaultDir === true) ||
        (destRoot !== undefined && isScratchpadPath(destRoot));
      destSuffix =
        destRoot === undefined
          ? " \u2192 (no destination)"
          : inScratchpad
            ? ""
            : ` \u2192 ${truncatePathMiddle(sweptAskPath(destRoot) || "(unprintable path)", 1024)}`;
    }
    return jsxProd_default_2(Text, {
      children: [
        verb,
        title ? ` of "${title}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: isReadFile
            ? `${title ? "" : ` of ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}`}${destSuffix}`
            : `${title ? " \xB7 " : " of "}${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}${verbose ? shareAudienceParenthetical(shareEntry) : ""}`,
        }),
        !isReadFile &&
          ownershipText !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipText,
          }),
      ],
    });
  }
  if (input.action === "pin" || input.action === "unpin") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let title = artifactTitleForDisplay(input, artifactUrl?.slug);
    return jsxProd_default_2(Text, {
      children: [
        input.action,
        title ? ` "${title}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}`,
        }),
      ],
    });
  }
  if (input.action === "delete") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let verbose = renderOptions?.verbose === true;
    let ownershipText = verbose ? ownershipTag(shareEntry) : "";
    let title = artifactTitleForDisplay(input, artifactUrl?.slug, ARTIFACT_DELETE_DISPLAY_TAG);
    return jsxProd_default_2(Text, {
      children: [
        "delete",
        title ? ` "${title}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}${verbose ? shareAudienceParenthetical(shareEntry) : ""}`,
        }),
        ownershipText !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipText,
          }),
      ],
    });
  }
  if (input.action === "share") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let verbose = renderOptions?.verbose === true;
    let ownershipText = verbose ? ownershipTag(shareEntry) : "";
    let title = artifactTitleForDisplay(input, artifactUrl?.slug);
    let { mode, people, access } = readShareInput(input);
    let audienceText =
      mode === "org"
        ? "the organization"
        : mode === "people"
          ? describeNamedPeople(people).replace(/ it named/, "")
          : "(no audience)";
    return jsxProd_default_2(Text, {
      children: [
        "share",
        title ? ` "${title}"` : "",
        ` with ${audienceText} (${access === "view" ? "view only" : "can comment"})`,
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}${verbose ? shareAudienceParenthetical(shareEntry) : ""}`,
        }),
        ownershipText !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipText,
          }),
      ],
    });
  }
  if (input.action === "list_assets" || input.action === "read_asset" || input.action === "delete_asset") {
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let verbose = renderOptions?.verbose === true;
    let ownershipText = verbose ? ownershipTag(shareEntry) : "";
    let { assetId } = assetFieldsFrom(input);
    let assetIdText = assetId !== undefined && ASSET_ID_RE.test(assetId) ? assetId : "(no id)";
    let isReadAsset = input.action === "read_asset";
    let verb =
      input.action === "delete_asset"
        ? `delete asset ${assetIdText}`
        : isReadAsset
          ? `read asset ${assetIdText}`
          : "list assets";
    let title = artifactTitleForDisplay(input, artifactUrl?.slug);
    let assetPreposition = input.action === "delete_asset" ? "from" : "of";
    let fromWord = "";
    if (isReadAsset) {
      let targetPin = input[ASSET_TARGET_PIN_TAG];
      let downloadTarget = assetDownloadTarget(input);
      let usingDefaultDir =
        (isPlainObject(targetPin) && targetPin.defaultDir === true) || downloadTarget?.defaultDir === true;
      fromWord =
        downloadTarget === undefined || usingDefaultDir
          ? ""
          : ` \u2192 ${truncatePathMiddle(sweptAskPath(`${downloadTarget.stem}.*`) || "(unprintable path)", 1024)}`;
    }
    return jsxProd_default_2(Text, {
      children: [
        verb,
        title ? ` ${assetPreposition} "${title}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: isReadAsset
            ? `${title ? "" : ` of ${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}`}${fromWord}`
            : `${title ? " \xB7 " : ` ${assetPreposition} `}${canonicalArtifactTargetFor(input.url, "(unrecognized address)")}${verbose ? shareAudienceParenthetical(shareEntry) : ""}`,
        }),
        !isReadAsset &&
          ownershipText !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: ownershipText,
          }),
      ],
    });
  }
  let { file_path: filePath, url } = input;
  let verbose = renderOptions?.verbose === true;
  let roomClause =
    verbose && isArtifactRoomEnabledStub() && publishInputJoinsRoom(input)
      ? ROOM_CONSENT_CLAUSE.trimStart()
      : undefined;
  let typeUrl = typeUrlOf(input);
  if (typeUrl !== undefined) {
    let typeTarget = canonicalArtifactTargetFor(typeUrl, "(unrecognized address)");
    let pageName =
      filePath !== undefined
        ? maskScratchFolder(sweptPagePath(describeThumbnailPath(filePath).shown) || "(unprintable path)")
        : undefined;
    return jsxProd_default_2(Text, {
      children: [
        pageName !== undefined ? `"${pageName}" ` : "",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\u2192 new artifact from type ", typeTarget],
        }),
        roomClause !== undefined &&
          jsxProd_default(Text, {
            dimColor: true,
            children: `
${roomClause}`,
          }),
      ],
    });
  }
  if (filePath === undefined && url !== undefined) {
    let urlTarget = canonicalArtifactTargetFor(url, "(unrecognized address)");
    let title = typeof url === "string" ? artifactTitleForDisplay(input, parseArtifactUrl(url)?.slug) : "";
    return jsxProd_default_2(Text, {
      children: [
        title
          ? jsxProd_default_2(Fragment, {
              children: [
                `"${title}"`,
                jsxProd_default(Text, {
                  dimColor: true,
                  children: ` \xB7 ${urlTarget}`,
                }),
              ],
            })
          : urlTarget,
        roomClause !== undefined &&
          jsxProd_default(Text, {
            dimColor: true,
            children: `
${roomClause}`,
          }),
      ],
    });
  }
  let urlSuffix =
    verbose && url !== undefined ? canonicalArtifactTargetFor(url, "(unrecognized address)") : undefined;
  let pagePath = describeThumbnailPath(filePath ?? "");
  let maskedPath = maskScratchFolder(sweptPagePath(pagePath.shown) || "(unprintable path)");
  return jsxProd_default_2(Text, {
    children: [
      `"${maskedPath}"`,
      urlSuffix !== undefined &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" \u2192 ", urlSuffix],
        }),
      roomClause !== undefined &&
        jsxProd_default(Text, {
          dimColor: true,
          children: `
${roomClause}`,
        }),
    ],
  });
}
//@ chunk-2re189ca.js:27180-27342 placement
function renderArtifactUseIfMeaningful(toolUse, renderOptions) {
  let input = isArtifactToolsetSplit() ? expandArtifactAction(toolUse) : toolUse;
  if (
    (input.action === undefined || input.action === "publish") &&
    input.file_path === undefined &&
    typeUrlOf(input) === undefined &&
    canonicalArtifactTargetFor(input.url, "") === ""
  )
    return "";
  return renderArtifactToolUse(toolUse, renderOptions);
}
//@ chunk-2re189ca.js:27342-27369 placement
/**
 * 取 Artifact 展示模块。
 */
function getArtifactDisplayModule() {
  return WaitingLabel();
}
//@ chunk-2re189ca.js:27369-27410 placement
/**
 * 为某个动作生成「渲染父级 artifact 工具调用」的函数。
 */
function makeParentActionRenderer(toolName) {
  return (input, renderOptions) =>
    renderArtifactToolUse(toParentArtifactInput(toolName, input), renderOptions);
}
//@ chunk-2re189ca.js:27410-27458 placement
/**
 * 按动作（comments/data/check）预生成的工具调用渲染函数。
 */
var renderCommentsToolUse = makeParentActionRenderer("comments");
var renderDataToolUse = makeParentActionRenderer("data");
var renderCheckToolUse = makeParentActionRenderer("check");
//@ chunk-2re189ca.js:27458-27772 placement
/**
 * Artifact 发布重试中的进度提示。
 */
function renderArtifactProgress(progressMessages) {
  let last = progressMessages.at(-1)?.data;
  if (!last || last.type !== "artifact_publish_retry" || last.resolved) return RunningLabel();
  let label = last.status === 503 ? "Publish service temporarily unavailable" : "Publish service busy";
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      dimColor: true,
      children: [label, " \u2014 retrying (attempt ", last.attempt, " of ", last.maxAttempts, ")\u2026"],
    }),
  });
}
//@ chunk-2re189ca.js:27772-27869 placement
/**
 * 判断结果是否属于 handlers 文档/结果/脚本结果。
 */
function isHandlersResultKind(result) {
  let key = firstResultKey(result);
  return key === "handlers_doc" || key === "handler_result" || key === "script_result";
}
//@ chunk-2re189ca.js:27869-27950 placement
/**
 * 清洗并截断文本，超出上限时追加省略号。
 */
function sweptTruncatedText(text, max) {
  let truncated = truncateToLength(text, max);
  let swept = sweepAskCopy(truncated) ?? "";
  return truncated.length < text.length ? `${swept}\u2026` : swept;
}
//@ chunk-2re189ca.js:27950-28021 placement
/**
 * 结果是否属于模拟器预览。
 */
function isEmulatorPreviewResult(result) {
  return "emulatorPreview" in result && firstResultKey(result) === "emulatorPreview";
}
//@ chunk-2re189ca.js:28021-28076 placement
/**
 * 结果是否属于页面预览。
 */
function isPreviewResult(result) {
  return "preview" in result && firstResultKey(result) === "preview";
}
//@ chunk-2re189ca.js:28076-43035 placement
/**
 * 渲染 Artifact 工具结果（预览、发布、读取、评论等）。
 */
function renderArtifactResult(result, options, renderOpts) {
  if (isEmulatorPreviewResult(result)) {
    let emulatorPreview = result.emulatorPreview;
    let previewFileName = sweptTruncatedText(basename(emulatorPreview.file), 80);
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          emulatorPreview.outcome === "looked"
            ? `Looked at ${previewFileName} in the artifact viewer`
            : emulatorPreview.outcome === "aborted"
              ? `Stopped looking at ${previewFileName} in the artifact viewer`
              : `Could not look at ${previewFileName} in the artifact viewer`,
      }),
    });
  }
  if (isPreviewResult(result)) {
    let preview = {
      ...result.preview,
      file: truncateToLength(result.preview.file, 4096),
      shots: result.preview.shots.slice(0, MAX_PREVIEW_CAPTURES).map((shot) => ({
        ...shot,
        theme: truncateToLength(shot.theme, 32),
      })),
      issues: result.preview.issues.slice(0, MAX_PREVIEW_ERRORS),
      widths: result.preview.widths.slice(0, MAX_PREVIEW_WIDTHS),
      themes: result.preview.themes.slice(0, 2).map((theme) => truncateToLength(theme, 32)),
    };
    let capturedCount = countWhere(preview.shots, (shot) => shot.error === undefined);
    let filtered = preview.issues.filter((issue) => issue.kind !== "note");
    let filtered_2 = preview.issues.filter((issue) => issue.kind === "note");
    let issueTotal = filtered.length + (preview.issuesDropped ?? 0);
    let sweep = sweptTruncatedText;
    let shownIssues = renderOpts?.verbose === true ? filtered : filtered.slice(0, MAX_BASELINE_LINES);
    let moreCount = filtered.length - shownIssues.length + (preview.issuesDropped ?? 0);
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              capturedCount === 0 ? "Could not preview " : "Previewed ",
              sweep(basename(preview.file), 80),
              " \xB7 ",
              sweep(preview.widths.join("/"), 24),
              " \xB7",
              " ",
              sweep(preview.themes.join("+"), 24),
              " \xB7 ",
              issueTotal === 0
                ? preview.renderError !== undefined
                  ? "browser did not start \u2014 static checks only"
                  : "no issues"
                : `${issueTotal}${preview.issuesDropped === MAX_PREVIEW_ISSUES_DROPPED ? "+" : ""} ${plural(issueTotal, "issue")}`,
              capturedCount < preview.shots.length && preview.renderError === undefined
                ? ` \xB7 ${capturedCount}/${preview.shots.length} captured`
                : "",
            ],
          }),
          preview.renderError !== undefined &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                color: "warning",
                children: sweep(preview.renderError, 200),
              }),
            }),
          shownIssues.map((issue, index) =>
            jsxProd_default_2(
              Box,
              {
                paddingLeft: 2,
                flexDirection: "row",
                children: [
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "\xB7 ",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: sweep(issue.text, 200),
                  }),
                ],
              },
              index,
            ),
          ),
          moreCount > 0 &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "\xB7 \u2026 ",
                  moreCount,
                  " more",
                  filtered.length > shownIssues.length ? " (ctrl+o)" : "",
                ],
              }),
            }),
          filtered_2.map((note, index) =>
            jsxProd_default_2(
              Box,
              {
                paddingLeft: 2,
                flexDirection: "row",
                children: [
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "\xB7 note: ",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: sweep(note.text, 200),
                  }),
                ],
              },
              `n${index}`,
            ),
          ),
          renderOpts?.verbose === true &&
            preview.shots.map((shot, shotEntry) =>
              jsxProd_default(
                Box,
                {
                  paddingLeft: 2,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      sweep(`${shot.width} ${shot.theme}`, 20),
                      ":",
                      " ",
                      shot.error !== undefined
                        ? `not captured \u2014 ${sweep(shot.error, 120)}`
                        : sweep(shot.path ?? "(not saved)", 512),
                    ],
                  }),
                },
                `s${shotEntry}`,
              ),
            ),
        ],
      }),
    });
  }
  if ("read" in result)
    return jsxProd_default(renderToolUseProgressMessage, {
      bytes: result.read.bytes,
      status: `${result.read.code} ${result.read.codeText}`,
    });
  if ("threads" in result) {
    let dropped = result.threads_dropped === true;
    let threadFiltered = result.thread_filter !== undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: threadFiltered
          ? result.threads.some((thread) => thread.id === result.thread_filter)
            ? "read 1 comment thread (filtered)"
            : dropped
              ? "requested thread not among the readable threads"
              : "requested thread not in this result"
          : result.threads.length === 0
            ? dropped
              ? "comment threads could not be read"
              : "no comment threads yet"
            : `read ${result.threads.length} comment ${plural(result.threads.length, "thread")}${dropped ? " (some could not be read)" : ""}`,
      }),
    });
  }
  if ("replied" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.replied
          ? "replied to comment thread"
          : result.summon_answered === true
            ? "reply not posted (summon already answered)"
            : result.summon_foreign === true
              ? "reply not posted (another user's summon or activation)"
              : result.already_answered === true
                ? "reply not posted (thread already answered)"
                : result.page_owns_threads === true
                  ? "reply not posted (the page keeps its own comment threads)"
                  : "reply needs thread activation by the user",
      }),
    });
  if ("thread_resolved" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.thread_resolved
          ? "resolved comment thread"
          : result.not_authorized === true
            ? "not resolved (not the thread starter or a writer)"
            : result.summon_foreign === true
              ? "not resolved (another user's activation)"
              : result.relayed_credential === true
                ? "not resolved (unavailable from this session)"
                : result.page_owns_threads === true
                  ? "not resolved (the page keeps its own comment threads)"
                  : "not resolved (thread not activated)",
      }),
    });
  if ("liveEdit" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: LIVE_EDIT_RESULT_MODULE
          ? LIVE_EDIT_RESULT_MODULE.renderLiveEditResultText(result.liveEdit)
          : "live edit landed",
      }),
    });
  if ("sync" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: LIVE_EDIT_RESULT_MODULE
          ? LIVE_EDIT_RESULT_MODULE.renderSyncResultText(result.sync)
          : "synced",
      }),
    });
  if ("versioned" in result) {
    let artifactUrl =
      typeof result.versioned.url === "string" ? parseArtifactUrl(result.versioned.url) : null;
    let viewerUrl = artifactUrl ? artifactViewerUrlFor(artifactUrl) : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Versioned",
          " ",
          viewerUrl !== undefined
            ? jsxProd_default(ArtifactLink, {
                name: viewerUrl,
                url: viewerUrl,
              })
            : "(unrecognized address)",
        ],
      }),
    });
  }
  if ("db_read" in result) {
    let dbRead = result.db_read;
    let docCount = dbRead.docs?.length ?? 0;
    let saved = dbRead.saved;
    let dbHeader =
      isPlainObject(saved) &&
      typeof saved.dir === "string" &&
      Array.isArray(saved.files) &&
      Array.isArray(saved.skipped)
        ? {
            dir: saved.dir,
            fileCount: saved.files.length,
            skippedCount: saved.skipped.length,
          }
        : undefined;
    let cursorNote =
      dbHeader !== undefined
        ? `saved ${dbHeader.fileCount} ${plural(dbHeader.fileCount, "document")} under ${truncatePathMiddle(sweepAskCopy(dbHeader.dir) ?? "(unprintable path)", 1024)}${dbHeader.skippedCount > 0 ? ` (${dbHeader.skippedCount} skipped)` : ""}`
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          dbRead.found === false
            ? "no such document"
            : (cursorNote ?? `read ${docCount} ${plural(docCount, "document")}`),
      }),
    });
  }
  if ("db_profiles" in result) {
    let dbProfiles = result.db_profiles;
    let savedCount =
      isPlainObject(dbProfiles) && isPlainObject(dbProfiles.profiles)
        ? Object.keys(dbProfiles.profiles).length
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          savedCount === undefined
            ? "no names available"
            : `found ${savedCount} ${plural(savedCount, "person", "people")}`,
      }),
    });
  }
  if ("db_write" in result) {
    let dbTarget =
      "results" in result.db_write && Array.isArray(result.db_write.results)
        ? result.db_write.results.length
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: !result.db_write.committed
          ? "database write not committed"
          : dbTarget !== undefined
            ? `database batch ${"fallback" in result.db_write && result.db_write.fallback === "sequential" ? "written one at a time" : "committed"} (${dbTarget} ${plural(dbTarget, "write")})`
            : "database write committed",
      }),
    });
  }
  if (isHandlersResultKind(result))
    return HANDLERS_RESULT_MODULE
      ? HANDLERS_RESULT_MODULE.renderHandlersResult(result)
      : jsxProd_default(MessageResponse, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "This record is unreadable in this build.",
          }),
        });
  if ("room_send" in result) {
    let roomSend = result.room_send;
    let uploadCount =
      typeof roomSend.peers === "number" && Number.isSafeInteger(roomSend.peers) && roomSend.peers >= 0
        ? `${roomSend.peers} ${plural(roomSend.peers, "peer")}`
        : "? peers";
    let uploadedCount =
      typeof roomSend.reason === "string"
        ? sanitizeDisplayText(roomSend.reason, {
            max: 32,
          })
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          roomSend.delivered === true
            ? `sent to ${uploadCount}`
            : uploadedCount === undefined
              ? "not sent"
              : `not sent (${uploadedCount})`,
      }),
    });
  }
  if ("asset_upload" in result) {
    let assetUpload = result.asset_upload;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "uploaded ",
          sweepAskCopy(assetUpload.file_name) ?? "asset",
          " (",
          formatFileSize(assetUpload.size_bytes),
          ") as ",
          sweepAskCopy(assetUpload.url) ?? "_blob/\u2026",
        ],
      }),
    });
  }
  if ("asset_uploads" in result) {
    let assetUploads = isPlainObject(result.asset_uploads) ? result.asset_uploads : {};
    let { rows } = capResultRows(assetUploads.results, MAX_UPLOAD_FILE_PATHS);
    let uploadedCount = countWhere(rows, (row) => row.status === "uploaded");
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["uploaded ", uploadedCount, " of ", rows.length, " ", plural(rows.length, "file")],
          }),
          rows.map((row, index) =>
            jsxProd_default_2(
              Text,
              {
                dimColor: true,
                children: [
                  "  ",
                  truncatePathMiddle(
                    sweepAskCopy(typeof row.file_path === "string" ? row.file_path : "") ||
                      "(unprintable path)",
                    MAX_UPLOAD_PATH_LENGTH,
                  ),
                  " ",
                  row.status === "uploaded"
                    ? `as ${sweepAskCopy(typeof row.url === "string" ? row.url : "") || "_blob/\u2026"}`
                    : row.status === "not_attempted"
                      ? "not attempted"
                      : "failed",
                ],
              },
              index,
            ),
          ),
        ],
      }),
    });
  }
  if ("asset_list" in result) {
    let assetList = isPlainObject(result.asset_list) ? result.asset_list : {};
    let assetCount = Array.isArray(assetList.assets) ? assetList.assets.length : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          assetCount === undefined
            ? "listed assets (record unreadable)"
            : assetCount === 0
              ? "no assets listed"
              : `listed ${assetCount} ${plural(assetCount, "asset")}${typeof assetList.next === "string" && assetList.next !== "" ? " (more follow)" : ""}`,
      }),
    });
  }
  if ("file_list" in result) {
    let fileList = isPlainObject(result.file_list) ? result.file_list : {};
    let fileCount = Array.isArray(fileList.files) ? fileList.files.length : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          fileCount === undefined
            ? "listed files (record unreadable)"
            : fileCount === 0
              ? "no files listed"
              : `listed ${fileCount} ${plural(fileCount, "file")}`,
      }),
    });
  }
  if ("file_read" in result) {
    let fileRead = isPlainObject(result.file_read) ? result.file_read : {};
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "saved",
          " ",
          truncatePathMiddle(
            (typeof fileRead.saved_to === "string" ? sweepAskCopy(fileRead.saved_to) : undefined) ?? "file",
            1024,
          ),
          typeof fileRead.size_bytes === "number" ? ` (${formatFileSize(fileRead.size_bytes)})` : "",
        ],
      }),
    });
  }
  if ("files_read" in result) {
    let files = isPlainObject(result.files_read) ? result.files_read.files : undefined;
    let filesCount = Array.isArray(files) ? files.length : undefined;
    let filesArr = Array.isArray(files)
      ? countWhere(files, (file) => isPlainObject(file) && "saved_to" in file)
      : 0;
    let savedDir = isPlainObject(result.files_read) ? result.files_read.saved_dir : undefined;
    let savedNote =
      typeof savedDir === "string"
        ? ` under ${truncatePathMiddle(sweepProvenanceMarker(sweepAskCopy(savedDir) ?? "folder"), 1024)}`
        : "";
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          filesCount === undefined
            ? "saved files (record unreadable)"
            : `saved ${filesArr === filesCount ? filesCount : `${filesArr} of ${filesCount}`} ${plural(filesCount, "file")}${savedNote}`,
      }),
    });
  }
  if ("asset_read" in result) {
    let assetRead = result.asset_read;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "saved ",
          truncatePathMiddle(sweepAskCopy(assetRead.path) ?? "asset", 1024),
          " (",
          formatFileSize(assetRead.size_bytes),
          ")",
        ],
      }),
    });
  }
  if ("asset_delete" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.asset_delete.deleted ? "asset deleted" : "no such asset",
      }),
    });
  if ("asset_copy" in result) {
    let copyCount = Array.isArray(result.asset_copy.assets) ? result.asset_copy.assets.length : 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["copied ", copyCount, " ", plural(copyCount, "asset"), " into the artifact"],
      }),
    });
  }
  if ("artifact_delete" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          result.artifact_delete.already_gone === true ? "Artifact was already deleted" : "Artifact deleted",
      }),
    });
  if ("pin" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.pin.pinned ? "pinned to the sidebar" : "unpinned",
      }),
    });
  if ("shared" in result) {
    let shared = result.shared;
    let copyHeader =
      shared.mode === "org"
        ? "the organization"
        : `${typeof shared.added === "number" ? shared.added : 0} ${plural(typeof shared.added === "number" ? shared.added : 0, "person", "people")}`;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          shared.unchanged === true ? "already shared with " : "shared with ",
          copyHeader,
          shared.access === "view" ? " (view only)" : " (can comment)",
        ],
      }),
    });
  }
  if ("watch" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.watch.watching
          ? result.watch.events?.includes("comment")
            ? "watching for republishes and to-Claude comments"
            : "watching for republishes"
          : result.watch.reason === "stop_latched"
            ? "not watching (stopped earlier in this session)"
            : `not watching (${sanitizeArtifactTitle(result.watch.reason ?? result.watch.outcome) ?? "unknown"})`,
      }),
    });
  if ("unwatch" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.unwatch.was_watching ? "stopped watching" : "no watch to stop",
      }),
    });
  if ("watches" in result) {
    let { watching, stopped } = splitWatchRows(result.watches);
    let arms = result.arms ?? [];
    let armCount = countWhere(
      arms,
      (arm) => arm.rail === undefined && (arm.state === "arming" || arm.state === "backing_off"),
    );
    let armingCount = countWhere(arms, (arm) => arm.rail !== undefined && arm.state === "arming");
    let failedCount = countWhere(arms, (arm) => arm.state === "failed" || arm.state === "ended");
    let joined = [
      armCount > 0 ? `${armCount} connecting` : "",
      armingCount > 0 ? `${armingCount} registering` : "",
      failedCount > 0 ? `${failedCount} ended or failed` : "",
    ]
      .filter((line) => line !== "")
      .join(", ");
    let rooms = Array.isArray(result.rooms) ? result.rooms : [];
    let roomFailCount = countWhere(rooms, (room) => room?.connected !== true);
    let armLine =
      rooms.length > 0
        ? ` \xB7 ${rooms.length} artifact ${plural(rooms.length, "room")} joined${roomFailCount > 0 ? ` (${roomFailCount} reconnecting)` : ""}`
        : "";
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: `${watching} artifact ${plural(watching, "watch", "watches")}${stopped > 0 ? ` \xB7 ${stopped} with auto-replies paused or stopped` : ""}${joined !== "" ? `, ${joined}` : ""}${armLine}`,
      }),
    });
  }
  if ("resume_replies" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: result.resume_replies.resumed
          ? "auto-replies resumed"
          : result.resume_replies.reason === "stop_latched"
            ? "auto-replies not resumed (watch stopped earlier in this session)"
            : result.resume_replies.reason === "arm_in_flight"
              ? "auto-replies not resumed (an earlier connection is still winding down; the stop stays)"
              : `auto-replies not resumed (${sanitizeArtifactTitle(result.resume_replies.reason ?? result.resume_replies.outcome) ?? "unknown"})`,
      }),
    });
  if ("verify" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          result.verify.state === "no_row"
            ? "no diagnostics readable: none captured in 24h, an older page that can't capture them, or not readable for this artifact"
            : result.verify.state !== "empty" && result.verify.state !== "entries"
              ? "unrecognized diagnostics result \u2014 verify again for a current read"
              : result.verify.entries.length === 0
                ? (result.verify.dropped ?? 0) > 0 || result.verify.truncated === true
                  ? "diagnostics captured but none readable (size cap) \u2014 not a clean signal"
                  : "loaded clean: zero diagnostics captured"
                : `read ${result.verify.entries.length} diagnostic ${plural(result.verify.entries.length, "entry", "entries")}`,
      }),
    });
  if ("artifact_types" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          result.artifact_types.length === 0
            ? result.unavailable === true
              ? "artifact types not available to this account"
              : "no artifact types listed"
            : `listed ${result.artifact_types.length} artifact ${plural(result.artifact_types.length, "type")}`,
      }),
    });
  if ("artifact_type" in result) {
    let artifactUrl = parseArtifactUrl(result.artifact_type.type_url);
    let viewerUrl = artifactUrl ? artifactViewerUrlFor(artifactUrl) : undefined;
    let typeFile = isPlainObject(result.type_file) ? result.type_file : null;
    if (typeFile !== null) {
      let pathText = truncatePathMiddle(
        sweptAskPath(typeof typeFile.path === "string" ? typeFile.path : "") || "(unprintable path)",
        256,
      );
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            typeFile.unread === undefined ? "read " : "did not read ",
            pathText,
            " of artifact type",
            " ",
            viewerUrl !== undefined
              ? jsxProd_default(ArtifactLink, {
                  name: viewerUrl,
                  url: viewerUrl,
                })
              : "(unrecognized address)",
          ],
        }),
      });
    }
    let typeFiles = Array.isArray(result.type_files_read)
      ? result.type_files_read.filter((entry) => isPlainObject(entry) && typeof entry.path === "string")
      : [];
    if (typeFiles.length > 0) {
      let fileCount = typeFiles.length;
      let readOkCount = countWhere(typeFiles, (entry) => entry.unread === undefined);
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "read ",
            readOkCount === fileCount ? fileCount : `${readOkCount} of ${fileCount}`,
            " ",
            plural(fileCount, "file"),
            " of artifact type",
            " ",
            viewerUrl !== undefined
              ? jsxProd_default(ArtifactLink, {
                  name: viewerUrl,
                  url: viewerUrl,
                })
              : "(unrecognized address)",
          ],
        }),
      });
    }
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "described artifact type",
          " ",
          viewerUrl !== undefined
            ? jsxProd_default(ArtifactLink, {
                name: viewerUrl,
                url: viewerUrl,
              })
            : "(unrecognized address)",
          ` (${result.artifact_type.files.length} ${plural(result.artifact_type.files.length, "file")}${typeof result.artifact_type.files_omitted === "number" && result.artifact_type.files_omitted > 0 ? ` +${result.artifact_type.files_omitted} not shown` : ""}${result.artifact_type.instructions_file ? ", ships instructions" : ""})`,
        ],
      }),
    });
  }
  if ("quickstart" in result) {
    let quickstart = result.quickstart;
    let systemDocs = Array.isArray(quickstart?.design_systems?.instances)
      ? quickstart.design_systems.instances.length
      : 0;
    let hasDesignDocs = (quickstart?.design_system?.docs ?? []).length > 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          quickstart?.match !== undefined
            ? "found the type to start from"
            : quickstart?.types_ruled === true
              ? "skipped: a permission rule covers listing artifact types"
              : quickstart?.intent === "document" &&
                  quickstart.types_ambiguous !== true &&
                  quickstart.types_partial !== true
                ? "said where a document goes"
                : quickstart?.design_guidance === true
                  ? "sent page-design guidance"
                  : "more than one matching type, or the listing was incomplete",
          systemDocs > 0 ? `, listed ${systemDocs} design ${plural(systemDocs, "system")}` : "",
          hasDesignDocs ? ", read the design system guide" : "",
          quickstart?.design_systems_off === true ? ", left design systems out" : "",
        ],
      }),
    });
  }
  if ("type_instances" in result) {
    let instances = Array.isArray(result.type_instances?.instances)
      ? result.type_instances.instances.length
      : 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          instances === 0
            ? result.type_instances?.unavailable === true
              ? "instance listing not available to this account"
              : "no artifacts of this type listed"
            : `listed ${instances} ${plural(instances, "artifact")} of this type`,
      }),
    });
  }
  if ("page_versions" in result) {
    let versionCount = Array.isArray(result.page_versions?.rows) ? result.page_versions.rows.length : 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: `listed ${versionCount} ${plural(versionCount, "version")}`,
      }),
    });
  }
  if ("artifacts" in result)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          result.artifacts.length === 0
            ? result.scope === "shared"
              ? "no shared artifacts listed"
              : result.scope === "all"
                ? "no artifacts listed"
                : "no published artifacts yet"
            : `listed ${result.artifacts.length} ${plural(result.artifacts.length, result.scope !== undefined ? "artifact" : "published artifact")}`,
      }),
    });
  if ("opened" in result) {
    let artifactUrl = typeof result.url === "string" ? parseArtifactUrl(result.url) : null;
    let viewerUrl = artifactUrl ? artifactViewerUrlFor(artifactUrl) : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Opened",
          " ",
          viewerUrl !== undefined
            ? jsxProd_default(ArtifactLink, {
                name:
                  (typeof result.title === "string" ? sanitizeDisplayTitle(result.title) : null) ?? viewerUrl,
                url: viewerUrl,
              })
            : "(unrecognized address)",
        ],
      }),
    });
  }
  if ("created_from_type" in result) {
    let toViewerUrl = (url) => {
      let artifactUrl = typeof url === "string" ? parseArtifactUrl(url) : null;
      let viewerUrl = artifactUrl ? artifactViewerUrlFor(artifactUrl) : undefined;
      return viewerUrl !== undefined
        ? jsxProd_default(ArtifactLink, {
            name: viewerUrl,
            url: viewerUrl,
          })
        : "(unrecognized address)";
    };
    let urlLine =
      "files_error" in result && typeof result.files_error === "string"
        ? sweepResultLineText(
            result.files_error,
            renderOpts?.verbose === true ? ARTIFACT_MAX_RESULT_SIZE_CHARS / 2 : 200,
          )
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Created ",
              toViewerUrl(result.url),
              " from Artifact type",
              " ",
              toViewerUrl(result.type?.url),
              "instructions" in result && typeof result.instructions === "string"
                ? ", read its instructions"
                : "",
            ],
          }),
          urlLine !== undefined &&
            jsxProd_default_2(Text, {
              color: "error",
              children: ["Couldn't publish its files \u2014 ", urlLine],
            }),
        ],
      }),
    });
  }
  let publishesRemaining = replayedPublishesRemaining(result.publishesRemaining);
  let publishesResetAt = replayedPublishesResetAt(result.publishesResetAt);
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            result.updated ? "Updated" : "Published",
            " ",
            jsxProd_default(ArtifactLink, {
              name: result.url,
              url: result.url,
            }),
          ],
        }),
        publishesRemaining !== undefined &&
          publishesResetAt !== undefined &&
          jsxProd_default(Text, {
            dimColor: true,
            children: publishesRemainingLine(publishesRemaining, publishesResetAt),
          }),
      ],
    }),
  });
}
//@ chunk-2re189ca.js:43035-43269 placement
var WRITE_FILE_FIRST_HINT = "content must first be written to a file";
var TOOL_USE_ERROR_OPEN = "<tool_use_error>";
var TOOL_USE_ERROR_CLOSE = "</tool_use_error>";
var INPUT_VALIDATION_PREFIX = `${TOOL_USE_ERROR_OPEN}InputValidationError: `;
var LOGIN_RETRY_ERROR_SHAPES = [
  {
    open: TOOL_USE_ERROR_OPEN,
    tail: `

${ARTIFACT_LOGIN_RETRY_NOTE}${TOOL_USE_ERROR_CLOSE}`,
    ends: true,
  },
  {
    open: "",
    tail: `

${ARTIFACT_LOGIN_RETRY_NOTE}`,
    ends: true,
  },
  {
    open: INPUT_VALIDATION_PREFIX,
    tail: `

${ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE}

`,
    ends: false,
  },
];
//@ chunk-2re189ca.js:43269-43512 placement
function policyUnobtainedErrorFor(text) {
  let answer = heldArtifactPolicyFetchAnswer();
  if (answer === null) return null;
  for (let cause of ["policy_fetch_failed", "policy_route_missing"]) {
    let refusal = artifactPolicyUnobtainedRefusal({
      cause,
      outcome: answer,
    });
    if (
      text === refusal ||
      text === `${TOOL_USE_ERROR_OPEN}${refusal}${TOOL_USE_ERROR_CLOSE}` ||
      text.startsWith(`${INPUT_VALIDATION_PREFIX}${refusal}

`)
    )
      return artifactPolicyUnobtainedMessage({
        cause,
        outcome: answer,
      });
  }
  return null;
}
//@ chunk-2re189ca.js:43512-44994 placement
/**
 * 渲染 Artifact 工具错误。
 */
function renderArtifactError(errorText, options) {
  if (typeof errorText === "string") {
    if (
      !options.verbose &&
      errorText.startsWith(TOOL_USE_ERROR_OPEN) &&
      errorText.endsWith(TOOL_USE_ERROR_CLOSE) &&
      NO_PAGE_REJECTIONS.includes(
        stripRejectBreakerNotice(
          errorText.slice(TOOL_USE_ERROR_OPEN.length, errorText.length - TOOL_USE_ERROR_CLOSE.length),
        ),
      )
    )
      return jsxProd_default(FallbackToolUseErrorMessage, {
        result: WRITE_FILE_FIRST_HINT,
        verbose: options.verbose,
      });
    if (!options.verbose) {
      for (let shape of LOGIN_RETRY_ERROR_SHAPES) {
        if (!errorText.startsWith(shape.open + ARTIFACT_LOGIN_MESSAGE_LEAD)) continue;
        let { message } = artifactLoginBlockedReason();
        let afterMessage = shape.open.length + message.length;
        if (
          errorText.startsWith(message, shape.open.length) &&
          errorText.startsWith(shape.tail, afterMessage) &&
          (!shape.ends || afterMessage + shape.tail.length === errorText.length)
        )
          return jsxProd_default(FallbackToolUseErrorMessage, {
            result: message,
            verbose: false,
          });
      }
      let policyMessage = policyUnobtainedErrorFor(errorText);
      if (policyMessage !== null)
        return jsxProd_default(FallbackToolUseErrorMessage, {
          result: policyMessage,
          verbose: false,
        });
    }
    let stripped = stripRejectBreakerNotice(errorText);
    let friendly = options.verbose ? undefined : toUserFacingRefusal(stripped);
    if (friendly !== undefined)
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: friendly,
        }),
      });
    if (
      stripped.startsWith(STALE_GUARD_REJECTION_PREFIX) ||
      stripped.startsWith(STALE_GUARD_REJECTION_PREFIX_LEGACY) ||
      stripped.startsWith(CONFLICT_REJECTION_PREFIX)
    ) {
      let detailsStart = options.verbose ? null : HANDOVER_DETAILS_START_RE.exec(stripped);
      if (detailsStart === null) {
        let shownText = options.verbose
          ? errorText
          : errorText.replaceAll(
              `
${ARTIFACT_CONTENT_AUTHORED_TAG}`,
              "",
            );
        return jsxProd_default(FallbackToolUseErrorMessage, {
          result: revealPageInvisibles(shownText),
          verbose: options.verbose,
          verbatim: true,
        });
      }
      let sliced = errorText.slice(0, errorText.length - stripped.length);
      let elidedLines = countCharInString(
        stripped,
        `
`,
        detailsStart.index,
      );
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(FallbackToolUseErrorMessage, {
              result: revealPageInvisibles(`${sliced}${stripped.slice(0, detailsStart.index)}`),
              verbose: options.verbose,
              verbatim: true,
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "\u2026",
                elidedLines > 1 ? ` +${elidedLines} lines` : " the rest is",
                " shown to Claude, elided here ",
                jsxProd_default(CtrlOToExpand, {}),
              ],
            }),
          ],
        }),
      });
    }
  }
  if (typeof errorText === "string" && !options.verbose) {
    let stripped = stripRejectBreakerNotice(errorText);
    let friendly =
      parsePathPinRefusal(stripped) ??
      parseFileTypeRefusal(stripped) ??
      otherOrgReplyNotice(stripped) ??
      parseRateLimitedMessage(stripped) ??
      parseContractRolloutMessage(stripped);
    if (friendly !== undefined)
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: friendly,
        }),
      });
    if (VERSION_MISMATCH_PREFIXES.some((prefix) => stripped.startsWith(prefix))) {
      let isDeleteOp = isPlainObject(options.input) && options.input.db_op === "delete";
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: isDeleteOp ? VERSION_MISMATCH_TEXTS.delete : VERSION_MISMATCH_TEXTS.write,
        }),
      });
    }
  }
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result: errorText,
    verbose: options.verbose,
  });
}
export {
  renderCheckToolUse,
  renderCommentsToolUse,
  renderDataToolUse,
  renderArtifactResult,
  renderArtifactError,
  renderArtifactUseIfMeaningful,
  renderArtifactToolUse,
  renderArtifactProgress,
  getArtifactDisplayModule,
};
