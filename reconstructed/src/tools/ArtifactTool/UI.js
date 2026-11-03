/**
 * tools/ArtifactTool/UI.tsx
 *
 * 2.1.316 新增：渲染 Artifact 工具结果（预览、发布、读取、评论等）；渲染 Artifact 工具调用（live-edit、preview、publish、list 等各动作）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wc0ezwp2.js (17)
 * attribution: placement 17
 */
import { basename } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { BOXED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
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
import { count } from "../../utils/collections.js";
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

//@ chunk-wc0ezwp2.js:15383-15756 placement
/**
 * 带图标的 artifact 链接。
 */
function ArtifactLink(props) {
  let o = w(8);
  let { name: l, url, iconColor } = props;
  let color = iconColor === undefined ? "claude" : iconColor;
  let a;
  if (o[0] !== color) {
    a = jsxProd_default(Text, {
      color,
      children: BOXED_DIAMOND_GLYPH,
    });
    o[0] = color;
    o[1] = a;
  } else a = o[1];
  let m;
  if (o[2] !== l || o[3] !== url) {
    m = url
      ? jsxProd_default(Link, {
          url,
          fallback: l === url ? undefined : `${l} (${url})`,
          children: l,
        })
      : l;
    o[2] = l;
    o[3] = url;
    o[4] = m;
  } else m = o[4];
  let g;
  if (o[5] !== a || o[6] !== m) {
    g = jsxProd_default_2(Text, {
      children: [a, " ", m],
    });
    o[5] = a;
    o[6] = m;
    o[7] = g;
  } else g = o[7];
  return g;
}
//@ chunk-wc0ezwp2.js:15788-15825 placement
/**
 * 惰性注入的渲染模块（live-edit 结果与工具调用、handlers 工具调用与结果）与单次显示行数上限。
 */
var LIVE_EDIT_RESULT_MODULE = null;
var LIVE_EDIT_TOOLUSE_MODULE = null;
var HANDLERS_TOOLUSE_MODULE = null;
var HANDLERS_RESULT_MODULE = null;
var MAX_BASELINE_LINES = 8;
//@ chunk-wc0ezwp2.js:15825-15951 placement
function artifactTitleForDisplay(t, slug, i = ARTIFACT_DISPLAY_TARGET_TAG) {
  let T = t[i];
  let title = isPlainObject(T) ? T.title : undefined;
  return artifactCardTitle(
    (slug !== undefined ? getShareEntry(slug)?.title : undefined) || (typeof title === "string" ? title : ""),
  );
}
//@ chunk-wc0ezwp2.js:15951-25974 placement
/**
 * 渲染 Artifact 工具调用（live-edit、preview、publish、list 等各动作）。
 */
function renderArtifactToolUse(t, l) {
  let i = isArtifactToolsetSplit() ? expandArtifactAction(t) : t;
  if (i.action === "live-edit")
    return LIVE_EDIT_TOOLUSE_MODULE
      ? LIVE_EDIT_TOOLUSE_MODULE.renderLiveEditToolUse(i, l?.verbose === true, artifactLivePathsSchemaOpen())
      : jsxProd_default(Text, {
          children: "live-edit",
        });
  if (i.action === "preview") {
    let d = i;
    let filePath = typeof d.file_path === "string" ? d.file_path : "";
    let f = sweptPagePath(filePath) || (filePath === "" ? "(no file)" : "(unprintable path)");
    if (l?.verbose !== true)
      return jsxProd_default_2(Text, {
        children: ["preview ", truncatePathMiddle(basename(f), 60)],
      });
    let u = previewWidths(d);
    let p = previewThemes(d);
    return jsxProd_default_2(Text, {
      children: [
        "preview ",
        truncatePathMiddle(f, 1024),
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${u.join("/")} \xB7 ${p.join("+")}`,
        }),
      ],
    });
  }
  if (i.action === "sync")
    return jsxProd_default_2(Text, {
      children: [
        "sync working copy",
        typeof i.file_path === "string"
          ? ` ${truncatePathMiddle(sweptAskPath(i.file_path) || "(unprintable path)", 256)}`
          : "",
        typeof i.url === "string"
          ? ` \u2192 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`
          : "",
      ],
    });
  if (i.action === "version")
    return jsxProd_default_2(Text, {
      children: [
        "version",
        typeof i.url === "string" ? ` ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}` : "",
        typeof i.label === "string" && i.label.trim() !== ""
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ` \xB7 ${sanitizedDisplayLabel(i.label, 200)}`,
            })
          : null,
      ],
    });
  if (i.action === "list") {
    if (isListActionInput(i)) {
      let c = listScopeOrDefault(i);
      let f = typeOf(i);
      let children =
        f !== undefined
          ? `"${sanitizedDisplayLabel(f, 200)}"`
          : canonicalArtifactTargetFor(typeUrlOf(i), "(unrecognized address)");
      return jsxProd_default_2(Text, {
        children: [
          "list",
          c === "shared" ? " (shared)" : c === "all" ? " (mine + shared)" : "",
          " ",
          "of type ",
          jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        ],
      });
    }
    if (isVersionListCall(i))
      return jsxProd_default_2(Text, {
        children: [
          "list versions of",
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(i.url, "(unrecognized address)"),
          }),
        ],
      });
    let d = listScopeFrom(i);
    return jsxProd_default_2(Text, {
      children: ["list", d === "shared" ? " (shared)" : d === "all" ? " (mine + shared)" : ""],
    });
  }
  if (i.action === "list_types") {
    let d =
      typeof i.type_query === "string" && i.type_query.trim() !== ""
        ? sanitizedDisplayLabel(i.type_query, 200)
        : null;
    return jsxProd_default_2(Text, {
      children: [
        "list types",
        d
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ` "${d}"`,
            })
          : "",
      ],
    });
  }
  if (i.action === "quickstart") {
    let intent = i.intent;
    let c = intent !== "document" && i.design_systems === false;
    return jsxProd_default_2(Text, {
      children: [
        "quickstart",
        typeof intent === "string"
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ` ${sweepAskCopy(truncateToLength(intent, 20))}`,
            })
          : "",
        c
          ? jsxProd_default(Text, {
              dimColor: true,
              children: " without design systems",
            })
          : "",
      ],
    });
  }
  if (i.action === "describe_type")
    return jsxProd_default_2(Text, {
      children: [
        "describe type",
        " ",
        jsxProd_default(Text, {
          dimColor: true,
          children: canonicalArtifactTargetFor(typeUrlOf(i), "(unrecognized address)"),
        }),
      ],
    });
  if (i.action === "comments" || i.action === "reply" || i.action === "resolve") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c =
      i.action === "reply" && l?.verbose === true
        ? truncateCommentText(commentFieldsFrom(i).replyText)
        : undefined;
    let f =
      (i.action === "reply" || i.action === "resolve") && l?.verbose === true && d !== null
        ? getShareEntry(d.slug)
        : undefined;
    let u = shareAudienceParenthetical(f);
    return jsxProd_default_2(Text, {
      children: [
        i.action,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", d !== null ? artifactViewerUrlFor(d) : "(unrecognized address)"],
        }),
        u !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: u,
          }),
        c !== undefined &&
          c !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: ` \u2014 "${c}"`,
          }),
      ],
    });
  }
  if (
    i.action === "read_db" ||
    i.action === "write_db" ||
    i.action === "room_send" ||
    i.action === "watch" ||
    i.action === "unwatch" ||
    i.action === "resume_replies" ||
    i.action === "status" ||
    i.action === "verify" ||
    i.action === "open"
  ) {
    let d =
      i.action === "read_db"
        ? "read database"
        : i.action === "write_db"
          ? "write database"
          : i.action === "room_send"
            ? `room send ${roomTopicOrInvalid(roomMessageParts(i).topic)}`
            : i.action === "resume_replies"
              ? "resume auto-replies"
              : i.action;
    if ((i.action === "status" || i.action === "verify") && i.url === undefined)
      return jsxProd_default(Text, {
        children: d,
      });
    let c = i.action === "read_db" ? dbOutputTarget(i) : undefined;
    let f =
      c?.kind === "dir"
        ? ` \u2192 ${truncatePathMiddle(sweptAskPath(c.dir) || "(unprintable path)", 1024)}`
        : c?.kind === "unresolvable"
          ? " \u2192 (unresolvable out_dir)"
          : "";
    if (i.action === "write_db" && l?.verbose === true) {
      let u = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
      let p = u !== null ? getShareEntry(u.slug) : undefined;
      let v = shareAudienceParenthetical(p);
      let { opLabel, docTarget } = describeDbWriteTarget(i);
      let { data: R, filePath, strReplace, ifVersion } = dbWriteFields(i);
      let P =
        opLabel === DB_BATCH_OP
          ? [
              dbBatchPayloadsForConsent(batchWrites(i)),
              describeLocalFileSources(dbBatchFileSpellings(batchWrites(i))),
            ]
              .filter((I) => I !== "")
              .join(" \u2014 ")
          : filePath !== undefined
            ? `from ${truncatePathMiddle(sweptAskPath(filePath) || "(unprintable path)", 1024)}`
            : opLabel === STR_REPLACE
              ? strReplaceApprovalText(strReplace)
              : approvalPayloadExcerpt(R);
      let M = ownershipTag(p);
      return jsxProd_default_2(Text, {
        children: [
          d,
          " (",
          opLabel,
          ")",
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(i.url, "(unrecognized address)"),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: ` \u2014 ${docTarget}${v}`,
          }),
          M !== "" &&
            jsxProd_default(Text, {
              color: "warning",
              children: M,
            }),
          P !== "" &&
            jsxProd_default(Text, {
              dimColor: true,
              children: ` \u2014 ${P}`,
            }),
          ifVersion !== undefined &&
            jsxProd_default(Text, {
              dimColor: true,
              children: ` (only if still at version ${ifVersion})`,
            }),
        ],
      });
    }
    if (i.action === "room_send" && l?.verbose === true) {
      let u = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
      let p = u !== null ? getShareEntry(u.slug) : undefined;
      let v = shareAudienceParenthetical(p);
      let y = approvalPayloadExcerpt(roomMessageParts(i).data);
      let x = ownershipTag(p);
      return jsxProd_default_2(Text, {
        children: [
          d,
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(i.url, "(unrecognized address)"),
          }),
          v !== "" &&
            jsxProd_default(Text, {
              dimColor: true,
              children: v,
            }),
          x !== "" &&
            jsxProd_default(Text, {
              color: "warning",
              children: x,
            }),
          y !== "" &&
            jsxProd_default(Text, {
              dimColor: true,
              children: ` \u2014 ${y}`,
            }),
        ],
      });
    }
    if (i.action === "resume_replies" && l?.verbose === true) {
      let u = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
      let p = u !== null ? getShareEntry(u.slug) : undefined;
      return jsxProd_default_2(Text, {
        children: [
          d,
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: canonicalArtifactTargetFor(i.url, "(unrecognized address)"),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: shareAudienceParenthetical(p),
          }),
        ],
      });
    }
    return jsxProd_default_2(Text, {
      children: [
        d,
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [canonicalArtifactTargetFor(i.url, "(unrecognized address)"), f],
        }),
      ],
    });
  }
  if (i.action === "get_endpoints" || i.action === "call_endpoint" || i.action === "run_script") {
    let { verb, body } = HANDLERS_TOOLUSE_MODULE
      ? HANDLERS_TOOLUSE_MODULE.handlersToolUseLine(i, l?.verbose === true)
      : {
          verb: String(i.action),
          body: "",
        };
    return jsxProd_default_2(Text, {
      children: [
        verb,
        " ",
        jsxProd_default(Text, {
          dimColor: true,
          children: canonicalArtifactTargetFor(i.url, "(unrecognized address)"),
        }),
        body !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: body,
          }),
      ],
    });
  }
  if (i.action === "read") {
    let artifactUrlInput = parseArtifactUrlInput(i.url);
    let c = artifactUrlInput !== null ? getShareEntry(artifactUrlInput.slug) : undefined;
    let f = l?.verbose === true ? ownershipTag(c) : "";
    let u = typeof i.version === "string" && VERSIONED_NAME_RE.test(i.version);
    let p = i.version === undefined ? "" : u ? ` version ${i.version}` : " (an earlier version)";
    return jsxProd_default_2(Text, {
      children: [
        "read",
        " ",
        jsxProd_default(Text, {
          dimColor: true,
          children:
            artifactUrlInput !== null ? artifactViewerUrlFor(artifactUrlInput) : "(unrecognized address)",
        }),
        p !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            children: p,
          }),
        f !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: f,
          }),
      ],
    });
  }
  if (i.action === "upload_asset") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = d !== null ? getShareEntry(d.slug) : undefined;
    let f = l?.verbose === true;
    let u = f ? ownershipTag(c) : "";
    let uploadPaths = parseUploadPaths(i);
    let v =
      uploadPaths.kind === "list"
        ? `${uploadPaths.paths.length} ${plural(uploadPaths.paths.length, "file")}:${uploadPaths.paths
            .map(
              (path) => `
  ${truncatePathMiddle(sweptAskPath(path) || "(unprintable path)", 1024)}`,
            )
            .join("")}
 `
        : truncatePathMiddle(sweptAskPath(i.file_path ?? "") || "(unprintable path)", 1024);
    return jsxProd_default_2(Text, {
      children: [
        "upload ",
        v,
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \u2192 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: u,
          }),
      ],
    });
  }
  if (i.action === "copy_from") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = d !== null ? getShareEntry(d.slug) : undefined;
    let f = l?.verbose === true;
    let u = f ? ownershipTag(c) : "";
    let assetIds = i.asset_ids;
    let v = Array.isArray(assetIds) ? assetIds.length : 0;
    let fromUrl = i.from_url;
    let x = typeof fromUrl === "string" ? parseArtifactUrl(fromUrl) : null;
    let R = f ? ownershipSuffix(x !== null ? getShareEntry(x.slug) : undefined, "assets") : "";
    return jsxProd_default_2(Text, {
      children: [
        "copy ",
        v,
        " ",
        plural(v, "asset"),
        " from",
        " ",
        canonicalArtifactTargetFor(fromUrl, "(unrecognized address)"),
        R !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: R,
          }),
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \u2192 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: u,
          }),
      ],
    });
  }
  if (i.action === "list_files" || i.action === "read_file") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = d !== null ? getShareEntry(d.slug) : undefined;
    let f = l?.verbose === true;
    let u = f ? ownershipTag(c) : "";
    let p = artifactTitleForDisplay(i, d?.slug);
    let v = i.action === "read_file";
    let y = "list files";
    let x = "";
    if (v) {
      let { path, paths } = readFilePathArgs(i);
      let C = i[ASSET_TARGET_PIN_TAG];
      let E = isPlainObject(C) && Array.isArray(C.paths) ? C.paths.length : paths?.length;
      y =
        paths !== undefined && E !== undefined
          ? `read ${E} ${plural(E, "file")}`
          : `read ${path !== undefined ? truncatePathMiddle(sweptAskPath(path) || "(unprintable path)", 256) : "(no path)"}`;
      let outDirJudged = C != null;
      let M =
        paths !== undefined
          ? validateReadFilePathsCached(i, {
              outDirJudged,
            })
          : resolveReadFileOutput(i, {
              outDirJudged,
            });
      let I = "files" in M ? M.base : "dest" in M ? M.dest : undefined;
      let K = (isPlainObject(C) && C.defaultDir === true) || (I !== undefined && isScratchpadPath(I));
      x =
        I === undefined
          ? " \u2192 (no destination)"
          : K
            ? ""
            : ` \u2192 ${truncatePathMiddle(sweptAskPath(I) || "(unprintable path)", 1024)}`;
    }
    return jsxProd_default_2(Text, {
      children: [
        y,
        p ? ` of "${p}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: v
            ? `${p ? "" : ` of ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`}${x}`
            : `${p ? " \xB7 " : " of "}${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        !v &&
          u !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: u,
          }),
      ],
    });
  }
  if (i.action === "pin" || i.action === "unpin") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = artifactTitleForDisplay(i, d?.slug);
    return jsxProd_default_2(Text, {
      children: [
        i.action,
        c ? ` "${c}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`,
        }),
      ],
    });
  }
  if (i.action === "delete") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = d !== null ? getShareEntry(d.slug) : undefined;
    let f = l?.verbose === true;
    let u = f ? ownershipTag(c) : "";
    let p = artifactTitleForDisplay(i, d?.slug, ARTIFACT_DELETE_DISPLAY_TAG);
    return jsxProd_default_2(Text, {
      children: [
        "delete",
        p ? ` "${p}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: u,
          }),
      ],
    });
  }
  if (i.action === "share") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = d !== null ? getShareEntry(d.slug) : undefined;
    let f = l?.verbose === true;
    let u = f ? ownershipTag(c) : "";
    let p = artifactTitleForDisplay(i, d?.slug);
    let { mode, people, access } = readShareInput(i);
    let R =
      mode === "org"
        ? "the organization"
        : mode === "people"
          ? describeNamedPeople(people).replace(/ it named/, "")
          : "(no audience)";
    return jsxProd_default_2(Text, {
      children: [
        "share",
        p ? ` "${p}"` : "",
        ` with ${R} (${access === "view" ? "view only" : "can comment"})`,
        jsxProd_default(Text, {
          dimColor: true,
          children: ` \xB7 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: u,
          }),
      ],
    });
  }
  if (i.action === "list_assets" || i.action === "read_asset" || i.action === "delete_asset") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null;
    let c = d !== null ? getShareEntry(d.slug) : undefined;
    let f = l?.verbose === true;
    let u = f ? ownershipTag(c) : "";
    let { assetId } = assetFieldsFrom(i);
    let v = assetId !== undefined && ASSET_ID_RE.test(assetId) ? assetId : "(no id)";
    let y = i.action === "read_asset";
    let x = i.action === "delete_asset" ? `delete asset ${v}` : y ? `read asset ${v}` : "list assets";
    let R = artifactTitleForDisplay(i, d?.slug);
    let A = i.action === "delete_asset" ? "from" : "of";
    let C = "";
    if (y) {
      let E = i[ASSET_TARGET_PIN_TAG];
      let P = assetDownloadTarget(i);
      let M = (isPlainObject(E) && E.defaultDir === true) || P?.defaultDir === true;
      C =
        P === undefined || M
          ? ""
          : ` \u2192 ${truncatePathMiddle(sweptAskPath(`${P.stem}.*`) || "(unprintable path)", 1024)}`;
    }
    return jsxProd_default_2(Text, {
      children: [
        x,
        R ? ` ${A} "${R}"` : "",
        jsxProd_default(Text, {
          dimColor: true,
          children: y
            ? `${R ? "" : ` of ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`}${C}`
            : `${R ? " \xB7 " : ` ${A} `}${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        !y &&
          u !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: u,
          }),
      ],
    });
  }
  let { file_path: filePath, url } = i;
  let o = l?.verbose === true;
  let a =
    o && isArtifactRoomEnabledStub() && publishInputJoinsRoom(i)
      ? ROOM_CONSENT_CLAUSE.trimStart()
      : undefined;
  let m = typeUrlOf(i);
  if (m !== undefined) {
    let d = canonicalArtifactTargetFor(m, "(unrecognized address)");
    let c =
      filePath !== undefined
        ? maskScratchFolder(sweptPagePath(describeThumbnailPath(filePath).shown) || "(unprintable path)")
        : undefined;
    return jsxProd_default_2(Text, {
      children: [
        c !== undefined ? `"${c}" ` : "",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\u2192 new artifact from type ", d],
        }),
        a !== undefined &&
          jsxProd_default(Text, {
            dimColor: true,
            children: `
${a}`,
          }),
      ],
    });
  }
  if (filePath === undefined && url !== undefined) {
    let d = canonicalArtifactTargetFor(url, "(unrecognized address)");
    let c = typeof url === "string" ? artifactTitleForDisplay(i, parseArtifactUrl(url)?.slug) : "";
    return jsxProd_default_2(Text, {
      children: [
        c
          ? jsxProd_default_2(Fragment, {
              children: [
                `"${c}"`,
                jsxProd_default(Text, {
                  dimColor: true,
                  children: ` \xB7 ${d}`,
                }),
              ],
            })
          : d,
        a !== undefined &&
          jsxProd_default(Text, {
            dimColor: true,
            children: `
${a}`,
          }),
      ],
    });
  }
  let g = o && url !== undefined ? canonicalArtifactTargetFor(url, "(unrecognized address)") : undefined;
  let h = describeThumbnailPath(filePath ?? "");
  let b = maskScratchFolder(sweptPagePath(h.shown) || "(unprintable path)");
  return jsxProd_default_2(Text, {
    children: [
      `"${b}"`,
      g !== undefined &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" \u2192 ", g],
        }),
      a !== undefined &&
        jsxProd_default(Text, {
          dimColor: true,
          children: `
${a}`,
        }),
    ],
  });
}
//@ chunk-wc0ezwp2.js:25974-26136 placement
function renderArtifactUseIfMeaningful(t, l) {
  let i = isArtifactToolsetSplit() ? expandArtifactAction(t) : t;
  if (
    (i.action === undefined || i.action === "publish") &&
    i.file_path === undefined &&
    typeUrlOf(i) === undefined &&
    canonicalArtifactTargetFor(i.url, "") === ""
  )
    return "";
  return renderArtifactToolUse(t, l);
}
//@ chunk-wc0ezwp2.js:26136-26163 placement
/**
 * 取 Artifact 展示模块。
 */
function getArtifactDisplayModule() {
  return WaitingLabel();
}
//@ chunk-wc0ezwp2.js:26163-26204 placement
/**
 * 为某个动作生成「渲染父级 artifact 工具调用」的函数。
 */
function makeParentActionRenderer(t) {
  return (l, i) => renderArtifactToolUse(toParentArtifactInput(t, l), i);
}
//@ chunk-wc0ezwp2.js:26204-26252 placement
/**
 * 按动作（comments/data/check）预生成的工具调用渲染函数。
 */
var renderCommentsToolUse = makeParentActionRenderer("comments");
var renderDataToolUse = makeParentActionRenderer("data");
var renderCheckToolUse = makeParentActionRenderer("check");
//@ chunk-wc0ezwp2.js:26252-26566 placement
/**
 * Artifact 发布重试中的进度提示。
 */
function renderArtifactProgress(t) {
  let l = t.at(-1)?.data;
  if (!l || l.type !== "artifact_publish_retry" || l.resolved) return RunningLabel();
  let i = l.status === 503 ? "Publish service temporarily unavailable" : "Publish service busy";
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      dimColor: true,
      children: [i, " \u2014 retrying (attempt ", l.attempt, " of ", l.maxAttempts, ")\u2026"],
    }),
  });
}
//@ chunk-wc0ezwp2.js:26566-26663 placement
/**
 * 判断结果是否属于 handlers 文档/结果/脚本结果。
 */
function isHandlersResultKind(t) {
  let l = firstResultKey(t);
  return l === "handlers_doc" || l === "handler_result" || l === "script_result";
}
//@ chunk-wc0ezwp2.js:26663-26745 placement
/**
 * 清洗并截断文本，超出上限时追加省略号。
 */
function sweptTruncatedText(t, l) {
  let i = truncateToLength(t, l);
  let T = sweepAskCopy(i) ?? "";
  return i.length < t.length ? `${T}\u2026` : T;
}
//@ chunk-wc0ezwp2.js:26745-26816 placement
/**
 * 结果是否属于模拟器预览。
 */
function isEmulatorPreviewResult(t) {
  return "emulatorPreview" in t && firstResultKey(t) === "emulatorPreview";
}
//@ chunk-wc0ezwp2.js:26816-26871 placement
/**
 * 结果是否属于页面预览。
 */
function isPreviewResult(t) {
  return "preview" in t && firstResultKey(t) === "preview";
}
//@ chunk-wc0ezwp2.js:26871-41833 placement
/**
 * 渲染 Artifact 工具结果（预览、发布、读取、评论等）。
 */
function renderArtifactResult(t, l, i) {
  if (isEmulatorPreviewResult(t)) {
    let emulatorPreview = t.emulatorPreview;
    let a = sweptTruncatedText(basename(emulatorPreview.file), 80);
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          emulatorPreview.outcome === "looked"
            ? `Looked at ${a} in the artifact viewer`
            : emulatorPreview.outcome === "aborted"
              ? `Stopped looking at ${a} in the artifact viewer`
              : `Could not look at ${a} in the artifact viewer`,
      }),
    });
  }
  if (isPreviewResult(t)) {
    let o = {
      ...t.preview,
      file: truncateToLength(t.preview.file, 4096),
      shots: t.preview.shots.slice(0, MAX_PREVIEW_CAPTURES).map((shot) => ({
        ...shot,
        theme: truncateToLength(shot.theme, 32),
      })),
      issues: t.preview.issues.slice(0, MAX_PREVIEW_ERRORS),
      widths: t.preview.widths.slice(0, MAX_PREVIEW_WIDTHS),
      themes: t.preview.themes.slice(0, 2).map((theme) => truncateToLength(theme, 32)),
    };
    let a = count(o.shots, (f) => f.error === undefined);
    let filtered = o.issues.filter((issue) => issue.kind !== "note");
    let filtered_2 = o.issues.filter((issue) => issue.kind === "note");
    let h = filtered.length + (o.issuesDropped ?? 0);
    let b = sweptTruncatedText;
    let d = i?.verbose === true ? filtered : filtered.slice(0, MAX_BASELINE_LINES);
    let c = filtered.length - d.length + (o.issuesDropped ?? 0);
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              a === 0 ? "Could not preview " : "Previewed ",
              b(basename(o.file), 80),
              " \xB7 ",
              b(o.widths.join("/"), 24),
              " \xB7",
              " ",
              b(o.themes.join("+"), 24),
              " \xB7 ",
              h === 0
                ? o.renderError !== undefined
                  ? "browser did not start \u2014 static checks only"
                  : "no issues"
                : `${h}${o.issuesDropped === MAX_PREVIEW_ISSUES_DROPPED ? "+" : ""} ${plural(h, "issue")}`,
              a < o.shots.length && o.renderError === undefined
                ? ` \xB7 ${a}/${o.shots.length} captured`
                : "",
            ],
          }),
          o.renderError !== undefined &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                color: "warning",
                children: b(o.renderError, 200),
              }),
            }),
          d.map((f, u) =>
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
                    children: b(f.text, 200),
                  }),
                ],
              },
              u,
            ),
          ),
          c > 0 &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default_2(Text, {
                dimColor: true,
                children: ["\xB7 \u2026 ", c, " more", filtered.length > d.length ? " (ctrl+o)" : ""],
              }),
            }),
          filtered_2.map((f, u) =>
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
                    children: b(f.text, 200),
                  }),
                ],
              },
              `n${u}`,
            ),
          ),
          i?.verbose === true &&
            o.shots.map((shot, u) =>
              jsxProd_default(
                Box,
                {
                  paddingLeft: 2,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      b(`${shot.width} ${shot.theme}`, 20),
                      ":",
                      " ",
                      shot.error !== undefined
                        ? `not captured \u2014 ${b(shot.error, 120)}`
                        : b(shot.path ?? "(not saved)", 512),
                    ],
                  }),
                },
                `s${u}`,
              ),
            ),
        ],
      }),
    });
  }
  if ("read" in t)
    return jsxProd_default(renderToolUseProgressMessage, {
      bytes: t.read.bytes,
      status: `${t.read.code} ${t.read.codeText}`,
    });
  if ("threads" in t) {
    let o = t.threads_dropped === true;
    let a = t.thread_filter !== undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: a
          ? t.threads.some((thread) => thread.id === t.thread_filter)
            ? "read 1 comment thread (filtered)"
            : o
              ? "requested thread not among the readable threads"
              : "requested thread not in this result"
          : t.threads.length === 0
            ? o
              ? "comment threads could not be read"
              : "no comment threads yet"
            : `read ${t.threads.length} comment ${plural(t.threads.length, "thread")}${o ? " (some could not be read)" : ""}`,
      }),
    });
  }
  if ("replied" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.replied
          ? "replied to comment thread"
          : t.summon_answered === true
            ? "reply not posted (summon already answered)"
            : t.summon_foreign === true
              ? "reply not posted (another user's summon or activation)"
              : t.already_answered === true
                ? "reply not posted (thread already answered)"
                : t.page_owns_threads === true
                  ? "reply not posted (the page keeps its own comment threads)"
                  : "reply needs thread activation by the user",
      }),
    });
  if ("thread_resolved" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.thread_resolved
          ? "resolved comment thread"
          : t.not_authorized === true
            ? "not resolved (not the thread starter or a writer)"
            : t.summon_foreign === true
              ? "not resolved (another user's activation)"
              : t.relayed_credential === true
                ? "not resolved (unavailable from this session)"
                : t.page_owns_threads === true
                  ? "not resolved (the page keeps its own comment threads)"
                  : "not resolved (thread not activated)",
      }),
    });
  if ("liveEdit" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: LIVE_EDIT_RESULT_MODULE
          ? LIVE_EDIT_RESULT_MODULE.renderLiveEditResultText(t.liveEdit)
          : "live edit landed",
      }),
    });
  if ("sync" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: LIVE_EDIT_RESULT_MODULE ? LIVE_EDIT_RESULT_MODULE.renderSyncResultText(t.sync) : "synced",
      }),
    });
  if ("versioned" in t) {
    let o = typeof t.versioned.url === "string" ? parseArtifactUrl(t.versioned.url) : null;
    let a = o ? artifactViewerUrlFor(o) : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Versioned",
          " ",
          a !== undefined
            ? jsxProd_default(ArtifactLink, {
                name: a,
                url: a,
              })
            : "(unrecognized address)",
        ],
      }),
    });
  }
  if ("db_read" in t) {
    let dbRead = t.db_read;
    let a = dbRead.docs?.length ?? 0;
    let saved = dbRead.saved;
    let g =
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
    let h =
      g !== undefined
        ? `saved ${g.fileCount} ${plural(g.fileCount, "document")} under ${truncatePathMiddle(sweepAskCopy(g.dir) ?? "(unprintable path)", 1024)}${g.skippedCount > 0 ? ` (${g.skippedCount} skipped)` : ""}`
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: dbRead.found === false ? "no such document" : (h ?? `read ${a} ${plural(a, "document")}`),
      }),
    });
  }
  if ("db_profiles" in t) {
    let dbProfiles = t.db_profiles;
    let a =
      isPlainObject(dbProfiles) && isPlainObject(dbProfiles.profiles)
        ? Object.keys(dbProfiles.profiles).length
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: a === undefined ? "no names available" : `found ${a} ${plural(a, "person", "people")}`,
      }),
    });
  }
  if ("db_write" in t) {
    let o =
      "results" in t.db_write && Array.isArray(t.db_write.results) ? t.db_write.results.length : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: !t.db_write.committed
          ? "database write not committed"
          : o !== undefined
            ? `database batch ${"fallback" in t.db_write && t.db_write.fallback === "sequential" ? "written one at a time" : "committed"} (${o} ${plural(o, "write")})`
            : "database write committed",
      }),
    });
  }
  if (isHandlersResultKind(t))
    return HANDLERS_RESULT_MODULE
      ? HANDLERS_RESULT_MODULE.renderHandlersResult(t)
      : jsxProd_default(MessageResponse, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "This record is unreadable in this build.",
          }),
        });
  if ("room_send" in t) {
    let roomSend = t.room_send;
    let a =
      typeof roomSend.peers === "number" && Number.isSafeInteger(roomSend.peers) && roomSend.peers >= 0
        ? `${roomSend.peers} ${plural(roomSend.peers, "peer")}`
        : "? peers";
    let m =
      typeof roomSend.reason === "string"
        ? sanitizeDisplayText(roomSend.reason, {
            max: 32,
          })
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          roomSend.delivered === true ? `sent to ${a}` : m === undefined ? "not sent" : `not sent (${m})`,
      }),
    });
  }
  if ("asset_upload" in t) {
    let assetUpload = t.asset_upload;
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
  if ("asset_uploads" in t) {
    let assetUploads = isPlainObject(t.asset_uploads) ? t.asset_uploads : {};
    let { rows } = capResultRows(assetUploads.results, MAX_UPLOAD_FILE_PATHS);
    let m = count(rows, (g) => g.status === "uploaded");
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["uploaded ", m, " of ", rows.length, " ", plural(rows.length, "file")],
          }),
          rows.map((g, h) =>
            jsxProd_default_2(
              Text,
              {
                dimColor: true,
                children: [
                  "  ",
                  truncatePathMiddle(
                    sweepAskCopy(typeof g.file_path === "string" ? g.file_path : "") || "(unprintable path)",
                    MAX_UPLOAD_PATH_LENGTH,
                  ),
                  " ",
                  g.status === "uploaded"
                    ? `as ${sweepAskCopy(typeof g.url === "string" ? g.url : "") || "_blob/\u2026"}`
                    : g.status === "not_attempted"
                      ? "not attempted"
                      : "failed",
                ],
              },
              h,
            ),
          ),
        ],
      }),
    });
  }
  if ("asset_list" in t) {
    let assetList = isPlainObject(t.asset_list) ? t.asset_list : {};
    let a = Array.isArray(assetList.assets) ? assetList.assets.length : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          a === undefined
            ? "listed assets (record unreadable)"
            : a === 0
              ? "no assets listed"
              : `listed ${a} ${plural(a, "asset")}${typeof assetList.next === "string" && assetList.next !== "" ? " (more follow)" : ""}`,
      }),
    });
  }
  if ("file_list" in t) {
    let fileList = isPlainObject(t.file_list) ? t.file_list : {};
    let a = Array.isArray(fileList.files) ? fileList.files.length : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          a === undefined
            ? "listed files (record unreadable)"
            : a === 0
              ? "no files listed"
              : `listed ${a} ${plural(a, "file")}`,
      }),
    });
  }
  if ("file_read" in t) {
    let fileRead = isPlainObject(t.file_read) ? t.file_read : {};
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
  if ("files_read" in t) {
    let files = isPlainObject(t.files_read) ? t.files_read.files : undefined;
    let a = Array.isArray(files) ? files.length : undefined;
    let m = Array.isArray(files) ? count(files, (b) => isPlainObject(b) && "saved_to" in b) : 0;
    let savedDir = isPlainObject(t.files_read) ? t.files_read.saved_dir : undefined;
    let h =
      typeof savedDir === "string"
        ? ` under ${truncatePathMiddle(sweepProvenanceMarker(sweepAskCopy(savedDir) ?? "folder"), 1024)}`
        : "";
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          a === undefined
            ? "saved files (record unreadable)"
            : `saved ${m === a ? a : `${m} of ${a}`} ${plural(a, "file")}${h}`,
      }),
    });
  }
  if ("asset_read" in t) {
    let assetRead = t.asset_read;
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
  if ("asset_delete" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.asset_delete.deleted ? "asset deleted" : "no such asset",
      }),
    });
  if ("asset_copy" in t) {
    let o = Array.isArray(t.asset_copy.assets) ? t.asset_copy.assets.length : 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["copied ", o, " ", plural(o, "asset"), " into the artifact"],
      }),
    });
  }
  if ("artifact_delete" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          t.artifact_delete.already_gone === true ? "Artifact was already deleted" : "Artifact deleted",
      }),
    });
  if ("pin" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.pin.pinned ? "pinned to the sidebar" : "unpinned",
      }),
    });
  if ("shared" in t) {
    let shared = t.shared;
    let a =
      shared.mode === "org"
        ? "the organization"
        : `${typeof shared.added === "number" ? shared.added : 0} ${plural(typeof shared.added === "number" ? shared.added : 0, "person", "people")}`;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          shared.unchanged === true ? "already shared with " : "shared with ",
          a,
          shared.access === "view" ? " (view only)" : " (can comment)",
        ],
      }),
    });
  }
  if ("watch" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.watch.watching
          ? t.watch.events?.includes("comment")
            ? "watching for republishes and to-Claude comments"
            : "watching for republishes"
          : t.watch.reason === "stop_latched"
            ? "not watching (stopped earlier in this session)"
            : `not watching (${sanitizeArtifactTitle(t.watch.reason ?? t.watch.outcome) ?? "unknown"})`,
      }),
    });
  if ("unwatch" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.unwatch.was_watching ? "stopped watching" : "no watch to stop",
      }),
    });
  if ("watches" in t) {
    let { watching, stopped } = splitWatchRows(t.watches);
    let arms = t.arms ?? [];
    let g = count(arms, (p) => p.rail === undefined && (p.state === "arming" || p.state === "backing_off"));
    let h = count(arms, (p) => p.rail !== undefined && p.state === "arming");
    let b = count(arms, (p) => p.state === "failed" || p.state === "ended");
    let joined = [
      g > 0 ? `${g} connecting` : "",
      h > 0 ? `${h} registering` : "",
      b > 0 ? `${b} ended or failed` : "",
    ]
      .filter((p) => p !== "")
      .join(", ");
    let rooms = Array.isArray(t.rooms) ? t.rooms : [];
    let f = count(rooms, (p) => p?.connected !== true);
    let u =
      rooms.length > 0
        ? ` \xB7 ${rooms.length} artifact ${plural(rooms.length, "room")} joined${f > 0 ? ` (${f} reconnecting)` : ""}`
        : "";
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: `${watching} artifact ${plural(watching, "watch", "watches")}${stopped > 0 ? ` \xB7 ${stopped} with auto-replies paused or stopped` : ""}${joined !== "" ? `, ${joined}` : ""}${u}`,
      }),
    });
  }
  if ("resume_replies" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: t.resume_replies.resumed
          ? "auto-replies resumed"
          : t.resume_replies.reason === "stop_latched"
            ? "auto-replies not resumed (watch stopped earlier in this session)"
            : t.resume_replies.reason === "arm_in_flight"
              ? "auto-replies not resumed (an earlier connection is still winding down; the stop stays)"
              : `auto-replies not resumed (${sanitizeArtifactTitle(t.resume_replies.reason ?? t.resume_replies.outcome) ?? "unknown"})`,
      }),
    });
  if ("verify" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          t.verify.state === "no_row"
            ? "no diagnostics readable: none captured in 24h, an older page that can't capture them, or not readable for this artifact"
            : t.verify.state !== "empty" && t.verify.state !== "entries"
              ? "unrecognized diagnostics result \u2014 verify again for a current read"
              : t.verify.entries.length === 0
                ? (t.verify.dropped ?? 0) > 0 || t.verify.truncated === true
                  ? "diagnostics captured but none readable (size cap) \u2014 not a clean signal"
                  : "loaded clean: zero diagnostics captured"
                : `read ${t.verify.entries.length} diagnostic ${plural(t.verify.entries.length, "entry", "entries")}`,
      }),
    });
  if ("artifact_types" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          t.artifact_types.length === 0
            ? t.unavailable === true
              ? "artifact types not available to this account"
              : "no artifact types listed"
            : `listed ${t.artifact_types.length} artifact ${plural(t.artifact_types.length, "type")}`,
      }),
    });
  if ("artifact_type" in t) {
    let artifactUrl = parseArtifactUrl(t.artifact_type.type_url);
    let a = artifactUrl ? artifactViewerUrlFor(artifactUrl) : undefined;
    let typeFile = isPlainObject(t.type_file) ? t.type_file : null;
    if (typeFile !== null) {
      let h = truncatePathMiddle(
        sweptAskPath(typeof typeFile.path === "string" ? typeFile.path : "") || "(unprintable path)",
        256,
      );
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            typeFile.unread === undefined ? "read " : "did not read ",
            h,
            " of artifact type",
            " ",
            a !== undefined
              ? jsxProd_default(ArtifactLink, {
                  name: a,
                  url: a,
                })
              : "(unrecognized address)",
          ],
        }),
      });
    }
    let g = Array.isArray(t.type_files_read)
      ? t.type_files_read.filter((h) => isPlainObject(h) && typeof h.path === "string")
      : [];
    if (g.length > 0) {
      let h = g.length;
      let b = count(g, (d) => d.unread === undefined);
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "read ",
            b === h ? h : `${b} of ${h}`,
            " ",
            plural(h, "file"),
            " of artifact type",
            " ",
            a !== undefined
              ? jsxProd_default(ArtifactLink, {
                  name: a,
                  url: a,
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
          a !== undefined
            ? jsxProd_default(ArtifactLink, {
                name: a,
                url: a,
              })
            : "(unrecognized address)",
          ` (${t.artifact_type.files.length} ${plural(t.artifact_type.files.length, "file")}${typeof t.artifact_type.files_omitted === "number" && t.artifact_type.files_omitted > 0 ? ` +${t.artifact_type.files_omitted} not shown` : ""}${t.artifact_type.instructions_file ? ", ships instructions" : ""})`,
        ],
      }),
    });
  }
  if ("quickstart" in t) {
    let quickstart = t.quickstart;
    let a = Array.isArray(quickstart?.design_systems?.instances)
      ? quickstart.design_systems.instances.length
      : 0;
    let m = (quickstart?.design_system?.docs ?? []).length > 0;
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
          a > 0 ? `, listed ${a} design ${plural(a, "system")}` : "",
          m ? ", read the design system guide" : "",
          quickstart?.design_systems_off === true ? ", left design systems out" : "",
        ],
      }),
    });
  }
  if ("type_instances" in t) {
    let o = Array.isArray(t.type_instances?.instances) ? t.type_instances.instances.length : 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          o === 0
            ? t.type_instances?.unavailable === true
              ? "instance listing not available to this account"
              : "no artifacts of this type listed"
            : `listed ${o} ${plural(o, "artifact")} of this type`,
      }),
    });
  }
  if ("page_versions" in t) {
    let o = Array.isArray(t.page_versions?.rows) ? t.page_versions.rows.length : 0;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: `listed ${o} ${plural(o, "version")}`,
      }),
    });
  }
  if ("artifacts" in t)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children:
          t.artifacts.length === 0
            ? t.scope === "shared"
              ? "no shared artifacts listed"
              : t.scope === "all"
                ? "no artifacts listed"
                : "no published artifacts yet"
            : `listed ${t.artifacts.length} ${plural(t.artifacts.length, t.scope !== undefined ? "artifact" : "published artifact")}`,
      }),
    });
  if ("opened" in t) {
    let o = typeof t.url === "string" ? parseArtifactUrl(t.url) : null;
    let a = o ? artifactViewerUrlFor(o) : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Opened",
          " ",
          a !== undefined
            ? jsxProd_default(ArtifactLink, {
                name: (typeof t.title === "string" ? sanitizeDisplayTitle(t.title) : null) ?? a,
                url: a,
              })
            : "(unrecognized address)",
        ],
      }),
    });
  }
  if ("created_from_type" in t) {
    let o = (url) => {
      let g = typeof url === "string" ? parseArtifactUrl(url) : null;
      let h = g ? artifactViewerUrlFor(g) : undefined;
      return h !== undefined
        ? jsxProd_default(ArtifactLink, {
            name: h,
            url: h,
          })
        : "(unrecognized address)";
    };
    let a =
      "files_error" in t && typeof t.files_error === "string"
        ? sweepResultLineText(t.files_error, i?.verbose === true ? ARTIFACT_MAX_RESULT_SIZE_CHARS / 2 : 200)
        : undefined;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Created ",
              o(t.url),
              " from Artifact type",
              " ",
              o(t.type?.url),
              "instructions" in t && typeof t.instructions === "string" ? ", read its instructions" : "",
            ],
          }),
          a !== undefined &&
            jsxProd_default_2(Text, {
              color: "error",
              children: ["Couldn't publish its files \u2014 ", a],
            }),
        ],
      }),
    });
  }
  let T = replayedPublishesRemaining(t.publishesRemaining);
  let _ = replayedPublishesResetAt(t.publishesResetAt);
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            t.updated ? "Updated" : "Published",
            " ",
            jsxProd_default(ArtifactLink, {
              name: t.url,
              url: t.url,
            }),
          ],
        }),
        T !== undefined &&
          _ !== undefined &&
          jsxProd_default(Text, {
            dimColor: true,
            children: publishesRemainingLine(T, _),
          }),
      ],
    }),
  });
}
//@ chunk-wc0ezwp2.js:41833-42067 placement
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
//@ chunk-wc0ezwp2.js:42067-42310 placement
function policyUnobtainedErrorFor(t) {
  let l = heldArtifactPolicyFetchAnswer();
  if (l === null) return null;
  for (let cause of ["policy_fetch_failed", "policy_route_missing"]) {
    let T = artifactPolicyUnobtainedRefusal({
      cause,
      outcome: l,
    });
    if (
      t === T ||
      t === `${TOOL_USE_ERROR_OPEN}${T}${TOOL_USE_ERROR_CLOSE}` ||
      t.startsWith(`${INPUT_VALIDATION_PREFIX}${T}

`)
    )
      return artifactPolicyUnobtainedMessage({
        cause,
        outcome: l,
      });
  }
  return null;
}
//@ chunk-wc0ezwp2.js:42310-43792 placement
/**
 * 渲染 Artifact 工具错误。
 */
function renderArtifactError(t, l) {
  if (typeof t === "string") {
    if (
      !l.verbose &&
      t.startsWith(TOOL_USE_ERROR_OPEN) &&
      t.endsWith(TOOL_USE_ERROR_CLOSE) &&
      NO_PAGE_REJECTIONS.includes(
        stripRejectBreakerNotice(t.slice(TOOL_USE_ERROR_OPEN.length, t.length - TOOL_USE_ERROR_CLOSE.length)),
      )
    )
      return jsxProd_default(FallbackToolUseErrorMessage, {
        result: WRITE_FILE_FIRST_HINT,
        verbose: l.verbose,
      });
    if (!l.verbose) {
      for (let o of LOGIN_RETRY_ERROR_SHAPES) {
        if (!t.startsWith(o.open + ARTIFACT_LOGIN_MESSAGE_LEAD)) continue;
        let { message } = artifactLoginBlockedReason();
        let m = o.open.length + message.length;
        if (
          t.startsWith(message, o.open.length) &&
          t.startsWith(o.tail, m) &&
          (!o.ends || m + o.tail.length === t.length)
        )
          return jsxProd_default(FallbackToolUseErrorMessage, {
            result: message,
            verbose: false,
          });
      }
      let _ = policyUnobtainedErrorFor(t);
      if (_ !== null)
        return jsxProd_default(FallbackToolUseErrorMessage, {
          result: _,
          verbose: false,
        });
    }
    let i = stripRejectBreakerNotice(t);
    let T = l.verbose ? undefined : toUserFacingRefusal(i);
    if (T !== undefined)
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: T,
        }),
      });
    if (
      i.startsWith(STALE_GUARD_REJECTION_PREFIX) ||
      i.startsWith(STALE_GUARD_REJECTION_PREFIX_LEGACY) ||
      i.startsWith(CONFLICT_REJECTION_PREFIX)
    ) {
      let _ = l.verbose ? null : HANDOVER_DETAILS_START_RE.exec(i);
      if (_ === null) {
        let m = l.verbose
          ? t
          : t.replaceAll(
              `
${ARTIFACT_CONTENT_AUTHORED_TAG}`,
              "",
            );
        return jsxProd_default(FallbackToolUseErrorMessage, {
          result: revealPageInvisibles(m),
          verbose: l.verbose,
          verbatim: true,
        });
      }
      let sliced = t.slice(0, t.length - i.length);
      let a = countCharInString(
        i,
        `
`,
        _.index,
      );
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(FallbackToolUseErrorMessage, {
              result: revealPageInvisibles(`${sliced}${i.slice(0, _.index)}`),
              verbose: l.verbose,
              verbatim: true,
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "\u2026",
                a > 1 ? ` +${a} lines` : " the rest is",
                " shown to Claude, elided here ",
                jsxProd_default(CtrlOToExpand, {}),
              ],
            }),
          ],
        }),
      });
    }
  }
  if (typeof t === "string" && !l.verbose) {
    let i = stripRejectBreakerNotice(t);
    let T =
      parsePathPinRefusal(i) ??
      parseFileTypeRefusal(i) ??
      otherOrgReplyNotice(i) ??
      parseRateLimitedMessage(i) ??
      parseContractRolloutMessage(i);
    if (T !== undefined)
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: T,
        }),
      });
    if (VERSION_MISMATCH_PREFIXES.some((_) => i.startsWith(_))) {
      let _ = isPlainObject(l.input) && l.input.db_op === "delete";
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: _ ? VERSION_MISMATCH_TEXTS.delete : VERSION_MISMATCH_TEXTS.write,
        }),
      });
    }
  }
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result: t,
    verbose: l.verbose,
  });
}
