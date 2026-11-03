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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { hf } from "../../utils/permissions/autoModeRulesPrompt.js";
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
  vcn,
  kcn,
  n2e,
  m1t,
  replayedPublishesRemaining,
  replayedPublishesResetAt,
  publishesRemainingLine,
} from "./promptText.js";
import { p$t, readShareInput, describeNamedPeople } from "./actions/share.js";
import { isListActionInput } from "../../utils/bash/treeSitterAnalysis.js";
import { Non } from "./actions/listByType.js";
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
import { $on, roomMessageParts } from "./actions/roomSend.js";
import { describeDbWriteTarget, describeLocalFileSources } from "./actions/database.js";
import { dbBatchPayloadsForConsent, dbBatchFileSpellings, publishInputJoinsRoom } from "./ArtifactTool.js";
import { STR_REPLACE, VERSION_MISMATCH_PREFIXES, C0o } from "../../services/artifacts/artifactDb.js";
import { strReplaceApprovalText, approvalPayloadExcerpt } from "./permissions/approvalText.js";
import { w4e, sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { parseUploadPaths, MAX_UPLOAD_FILE_PATHS, MAX_UPLOAD_PATH_LENGTH } from "./actions/uploadAsset.js";
import { ownershipSuffix } from "./permissions/ownershipConsent.js";
import { readFilePathArgs, validateReadFilePathsCached, resolveReadFileOutput } from "./readFilePaths.js";
import { isScratchpadPath } from "../../utils/permissions/filesystem.js";
import { j9 } from "../../services/artifacts/artifactShare.js";
import { maskScratchFolder, describeThumbnailPath } from "./thumbnails.js";
import { _mt, bmt } from "../../components/ToolStatusLabels.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { $jn } from "./resultHelpers.js";
import { count } from "../../utils/collections.js";
import { renderToolUseProgressMessage } from "../WebFetchTool/UI.js";
import { sanitizeDisplayText } from "../../services/artifacts/capabilityDeclaration.js";
import { capResultRows } from "../../services/artifacts/artifactPeople.js";
import { vkt } from "../../services/artifacts/rejectBreaker.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { artifactLoginBlockedReason } from "./authSourceHint.js";
import { toUserFacingRefusal } from "../../services/artifacts/publishConflicts.js";
import { Sh } from "../../constants/xml.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { parsePathPinRefusal } from "../../services/artifacts/pathPins.js";
import {
  parseFileTypeRefusal,
  parseRateLimitedMessage,
  parseContractRolloutMessage,
} from "../../services/artifacts/contentTypes.js";

/**
 * 带图标的 artifact 链接。
 */
//@ chunk-wc0ezwp2.js:15383-15756 placement
function ArtifactLink(t) {
  let o = w(8),
    { name: l, url: url, iconColor: iconColor } = t,
    _ = iconColor === void 0 ? "claude" : iconColor,
    a;
  if (o[0] !== _) ((a = e(Text, { color: _, children: hf })), (o[0] = _), (o[1] = a));
  else a = o[1];
  let m;
  if (o[2] !== l || o[3] !== url)
    ((m = url ? e(Link, { url: url, fallback: l === url ? void 0 : `${l} (${url})`, children: l }) : l),
      (o[2] = l),
      (o[3] = url),
      (o[4] = m));
  else m = o[4];
  let g;
  if (o[5] !== a || o[6] !== m)
    ((g = r(Text, { children: [a, " ", m] })), (o[5] = a), (o[6] = m), (o[7] = g));
  else g = o[7];
  return g;
}
//@ chunk-wc0ezwp2.js:15788-15825 placement
var U = null,
  q = null,
  V = null,
  H = null,
  ee = 8;
//@ chunk-wc0ezwp2.js:15825-15951 placement
function artifactTitleForDisplay(t, l, i = ARTIFACT_DISPLAY_TARGET_TAG) {
  let T = t[i],
    _ = isPlainObject(T) ? T.title : void 0;
  return artifactCardTitle(
    (l !== void 0 ? getShareEntry(l)?.title : void 0) || (typeof _ === "string" ? _ : ""),
  );
}
/**
 * 渲染 Artifact 工具调用（live-edit、preview、publish、list 等各动作）。
 */
//@ chunk-wc0ezwp2.js:15951-25974 placement
function renderArtifactToolUse(t, l) {
  let i = isArtifactToolsetSplit() ? expandArtifactAction(t) : t;
  if (i.action === "live-edit")
    return q
      ? q.renderLiveEditToolUse(i, l?.verbose === !0, artifactLivePathsSchemaOpen())
      : e(Text, { children: "live-edit" });
  if (i.action === "preview") {
    let d = i,
      c = typeof d.file_path === "string" ? d.file_path : "",
      f = sweptPagePath(c) || (c === "" ? "(no file)" : "(unprintable path)");
    if (l?.verbose !== !0) return r(Text, { children: ["preview ", truncatePathMiddle(basename(f), 60)] });
    let u = previewWidths(d),
      p = previewThemes(d);
    return r(Text, {
      children: [
        "preview ",
        truncatePathMiddle(f, 1024),
        e(Text, { dimColor: !0, children: ` \xB7 ${u.join("/")} \xB7 ${p.join("+")}` }),
      ],
    });
  }
  if (i.action === "sync")
    return r(Text, {
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
    return r(Text, {
      children: [
        "version",
        typeof i.url === "string" ? ` ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}` : "",
        typeof i.label === "string" && i.label.trim() !== ""
          ? e(Text, { dimColor: !0, children: ` \xB7 ${p$t(i.label, 200)}` })
          : null,
      ],
    });
  if (i.action === "list") {
    if (isListActionInput(i)) {
      let c = Non(i),
        f = typeOf(i),
        u =
          f !== void 0
            ? `"${p$t(f, 200)}"`
            : canonicalArtifactTargetFor(typeUrlOf(i), "(unrecognized address)");
      return r(Text, {
        children: [
          "list",
          c === "shared" ? " (shared)" : c === "all" ? " (mine + shared)" : "",
          " ",
          "of type ",
          e(Text, { dimColor: !0, children: u }),
        ],
      });
    }
    if (isVersionListCall(i))
      return r(Text, {
        children: [
          "list versions of",
          " ",
          e(Text, { dimColor: !0, children: canonicalArtifactTargetFor(i.url, "(unrecognized address)") }),
        ],
      });
    let d = listScopeFrom(i);
    return r(Text, {
      children: ["list", d === "shared" ? " (shared)" : d === "all" ? " (mine + shared)" : ""],
    });
  }
  if (i.action === "list_types") {
    let d = typeof i.type_query === "string" && i.type_query.trim() !== "" ? p$t(i.type_query, 200) : null;
    return r(Text, { children: ["list types", d ? e(Text, { dimColor: !0, children: ` "${d}"` }) : ""] });
  }
  if (i.action === "quickstart") {
    let intent = i.intent,
      c = intent !== "document" && i.design_systems === !1;
    return r(Text, {
      children: [
        "quickstart",
        typeof intent === "string"
          ? e(Text, { dimColor: !0, children: ` ${sweepAskCopy(truncateToLength(intent, 20))}` })
          : "",
        c ? e(Text, { dimColor: !0, children: " without design systems" }) : "",
      ],
    });
  }
  if (i.action === "describe_type")
    return r(Text, {
      children: [
        "describe type",
        " ",
        e(Text, {
          dimColor: !0,
          children: canonicalArtifactTargetFor(typeUrlOf(i), "(unrecognized address)"),
        }),
      ],
    });
  if (i.action === "comments" || i.action === "reply" || i.action === "resolve") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c =
        i.action === "reply" && l?.verbose === !0
          ? truncateCommentText(commentFieldsFrom(i).replyText)
          : void 0,
      f =
        (i.action === "reply" || i.action === "resolve") && l?.verbose === !0 && d !== null
          ? getShareEntry(d.slug)
          : void 0,
      u = shareAudienceParenthetical(f);
    return r(Text, {
      children: [
        i.action,
        r(Text, {
          dimColor: !0,
          children: [" ", d !== null ? artifactViewerUrlFor(d) : "(unrecognized address)"],
        }),
        u !== "" && e(Text, { dimColor: !0, children: u }),
        c !== void 0 && c !== "" && e(Text, { dimColor: !0, children: ` \u2014 "${c}"` }),
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
            ? `room send ${$on(roomMessageParts(i).topic)}`
            : i.action === "resume_replies"
              ? "resume auto-replies"
              : i.action;
    if ((i.action === "status" || i.action === "verify") && i.url === void 0) return e(Text, { children: d });
    let c = i.action === "read_db" ? dbOutputTarget(i) : void 0,
      f =
        c?.kind === "dir"
          ? ` \u2192 ${truncatePathMiddle(sweptAskPath(c.dir) || "(unprintable path)", 1024)}`
          : c?.kind === "unresolvable"
            ? " \u2192 (unresolvable out_dir)"
            : "";
    if (i.action === "write_db" && l?.verbose === !0) {
      let u = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
        p = u !== null ? getShareEntry(u.slug) : void 0,
        v = shareAudienceParenthetical(p),
        { opLabel: opLabel, docTarget: docTarget } = describeDbWriteTarget(i),
        { data: R, filePath: filePath, strReplace: strReplace, ifVersion: ifVersion } = dbWriteFields(i),
        P =
          opLabel === DB_BATCH_OP
            ? [
                dbBatchPayloadsForConsent(batchWrites(i)),
                describeLocalFileSources(dbBatchFileSpellings(batchWrites(i))),
              ]
                .filter((I) => I !== "")
                .join(" \u2014 ")
            : filePath !== void 0
              ? `from ${truncatePathMiddle(sweptAskPath(filePath) || "(unprintable path)", 1024)}`
              : opLabel === STR_REPLACE
                ? strReplaceApprovalText(strReplace)
                : approvalPayloadExcerpt(R),
        M = ownershipTag(p);
      return r(Text, {
        children: [
          d,
          " (",
          opLabel,
          ")",
          " ",
          e(Text, { dimColor: !0, children: canonicalArtifactTargetFor(i.url, "(unrecognized address)") }),
          e(Text, { dimColor: !0, children: ` \u2014 ${docTarget}${v}` }),
          M !== "" && e(Text, { color: "warning", children: M }),
          P !== "" && e(Text, { dimColor: !0, children: ` \u2014 ${P}` }),
          ifVersion !== void 0 &&
            e(Text, { dimColor: !0, children: ` (only if still at version ${ifVersion})` }),
        ],
      });
    }
    if (i.action === "room_send" && l?.verbose === !0) {
      let u = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
        p = u !== null ? getShareEntry(u.slug) : void 0,
        v = shareAudienceParenthetical(p),
        y = approvalPayloadExcerpt(roomMessageParts(i).data),
        x = ownershipTag(p);
      return r(Text, {
        children: [
          d,
          " ",
          e(Text, { dimColor: !0, children: canonicalArtifactTargetFor(i.url, "(unrecognized address)") }),
          v !== "" && e(Text, { dimColor: !0, children: v }),
          x !== "" && e(Text, { color: "warning", children: x }),
          y !== "" && e(Text, { dimColor: !0, children: ` \u2014 ${y}` }),
        ],
      });
    }
    if (i.action === "resume_replies" && l?.verbose === !0) {
      let u = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
        p = u !== null ? getShareEntry(u.slug) : void 0;
      return r(Text, {
        children: [
          d,
          " ",
          e(Text, { dimColor: !0, children: canonicalArtifactTargetFor(i.url, "(unrecognized address)") }),
          e(Text, { dimColor: !0, children: shareAudienceParenthetical(p) }),
        ],
      });
    }
    return r(Text, {
      children: [
        d,
        " ",
        r(Text, { dimColor: !0, children: [canonicalArtifactTargetFor(i.url, "(unrecognized address)"), f] }),
      ],
    });
  }
  if (i.action === "get_endpoints" || i.action === "call_endpoint" || i.action === "run_script") {
    let { verb: verb, body: body } = V
      ? V.handlersToolUseLine(i, l?.verbose === !0)
      : { verb: String(i.action), body: "" };
    return r(Text, {
      children: [
        verb,
        " ",
        e(Text, { dimColor: !0, children: canonicalArtifactTargetFor(i.url, "(unrecognized address)") }),
        body !== "" && e(Text, { dimColor: !0, children: body }),
      ],
    });
  }
  if (i.action === "read") {
    let d = parseArtifactUrlInput(i.url),
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0 ? ownershipTag(c) : "",
      u = typeof i.version === "string" && w4e.test(i.version),
      p = i.version === void 0 ? "" : u ? ` version ${i.version}` : " (an earlier version)";
    return r(Text, {
      children: [
        "read",
        " ",
        e(Text, { dimColor: !0, children: d !== null ? artifactViewerUrlFor(d) : "(unrecognized address)" }),
        p !== "" && e(Text, { dimColor: !0, children: p }),
        f !== "" && e(Text, { color: "warning", children: f }),
      ],
    });
  }
  if (i.action === "upload_asset") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0,
      u = f ? ownershipTag(c) : "",
      p = parseUploadPaths(i),
      v =
        p.kind === "list"
          ? `${p.paths.length} ${plural(p.paths.length, "file")}:${p.paths
              .map(
                (path) => `
  ${truncatePathMiddle(sweptAskPath(path) || "(unprintable path)", 1024)}`,
              )
              .join("")}
 `
          : truncatePathMiddle(sweptAskPath(i.file_path ?? "") || "(unprintable path)", 1024);
    return r(Text, {
      children: [
        "upload ",
        v,
        e(Text, {
          dimColor: !0,
          children: ` \u2192 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" && e(Text, { color: "warning", children: u }),
      ],
    });
  }
  if (i.action === "copy_from") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0,
      u = f ? ownershipTag(c) : "",
      asset_ids = i.asset_ids,
      v = Array.isArray(asset_ids) ? asset_ids.length : 0,
      from_url = i.from_url,
      x = typeof from_url === "string" ? parseArtifactUrl(from_url) : null,
      R = f ? ownershipSuffix(x !== null ? getShareEntry(x.slug) : void 0, "assets") : "";
    return r(Text, {
      children: [
        "copy ",
        v,
        " ",
        plural(v, "asset"),
        " from",
        " ",
        canonicalArtifactTargetFor(from_url, "(unrecognized address)"),
        R !== "" && e(Text, { color: "warning", children: R }),
        e(Text, {
          dimColor: !0,
          children: ` \u2192 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" && e(Text, { color: "warning", children: u }),
      ],
    });
  }
  if (i.action === "list_files" || i.action === "read_file") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0,
      u = f ? ownershipTag(c) : "",
      p = artifactTitleForDisplay(i, d?.slug),
      v = i.action === "read_file",
      y = "list files",
      x = "";
    if (v) {
      let { path: path, paths: paths } = readFilePathArgs(i),
        C = i[ASSET_TARGET_PIN_TAG],
        E = isPlainObject(C) && Array.isArray(C.paths) ? C.paths.length : paths?.length;
      y =
        paths !== void 0 && E !== void 0
          ? `read ${E} ${plural(E, "file")}`
          : `read ${path !== void 0 ? truncatePathMiddle(sweptAskPath(path) || "(unprintable path)", 256) : "(no path)"}`;
      let P = C != null,
        M =
          paths !== void 0
            ? validateReadFilePathsCached(i, { outDirJudged: P })
            : resolveReadFileOutput(i, { outDirJudged: P }),
        I = "files" in M ? M.base : "dest" in M ? M.dest : void 0,
        K = (isPlainObject(C) && C.defaultDir === !0) || (I !== void 0 && isScratchpadPath(I));
      x =
        I === void 0
          ? " \u2192 (no destination)"
          : K
            ? ""
            : ` \u2192 ${truncatePathMiddle(sweptAskPath(I) || "(unprintable path)", 1024)}`;
    }
    return r(Text, {
      children: [
        y,
        p ? ` of "${p}"` : "",
        e(Text, {
          dimColor: !0,
          children: v
            ? `${p ? "" : ` of ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`}${x}`
            : `${p ? " \xB7 " : " of "}${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        !v && u !== "" && e(Text, { color: "warning", children: u }),
      ],
    });
  }
  if (i.action === "pin" || i.action === "unpin") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = artifactTitleForDisplay(i, d?.slug);
    return r(Text, {
      children: [
        i.action,
        c ? ` "${c}"` : "",
        e(Text, {
          dimColor: !0,
          children: ` \xB7 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`,
        }),
      ],
    });
  }
  if (i.action === "delete") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0,
      u = f ? ownershipTag(c) : "",
      p = artifactTitleForDisplay(i, d?.slug, ARTIFACT_DELETE_DISPLAY_TAG);
    return r(Text, {
      children: [
        "delete",
        p ? ` "${p}"` : "",
        e(Text, {
          dimColor: !0,
          children: ` \xB7 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" && e(Text, { color: "warning", children: u }),
      ],
    });
  }
  if (i.action === "share") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0,
      u = f ? ownershipTag(c) : "",
      p = artifactTitleForDisplay(i, d?.slug),
      { mode: mode, people: people, access: access } = readShareInput(i),
      R =
        mode === "org"
          ? "the organization"
          : mode === "people"
            ? describeNamedPeople(people).replace(/ it named/, "")
            : "(no audience)";
    return r(Text, {
      children: [
        "share",
        p ? ` "${p}"` : "",
        ` with ${R} (${access === "view" ? "view only" : "can comment"})`,
        e(Text, {
          dimColor: !0,
          children: ` \xB7 ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        u !== "" && e(Text, { color: "warning", children: u }),
      ],
    });
  }
  if (i.action === "list_assets" || i.action === "read_asset" || i.action === "delete_asset") {
    let d = typeof i.url === "string" ? parseArtifactUrl(i.url) : null,
      c = d !== null ? getShareEntry(d.slug) : void 0,
      f = l?.verbose === !0,
      u = f ? ownershipTag(c) : "",
      { assetId: assetId } = assetFieldsFrom(i),
      v = assetId !== void 0 && ASSET_ID_RE.test(assetId) ? assetId : "(no id)",
      y = i.action === "read_asset",
      x = i.action === "delete_asset" ? `delete asset ${v}` : y ? `read asset ${v}` : "list assets",
      R = artifactTitleForDisplay(i, d?.slug),
      A = i.action === "delete_asset" ? "from" : "of",
      C = "";
    if (y) {
      let E = i[ASSET_TARGET_PIN_TAG],
        P = assetDownloadTarget(i),
        M = (isPlainObject(E) && E.defaultDir === !0) || P?.defaultDir === !0;
      C =
        P === void 0 || M
          ? ""
          : ` \u2192 ${truncatePathMiddle(sweptAskPath(`${P.stem}.*`) || "(unprintable path)", 1024)}`;
    }
    return r(Text, {
      children: [
        x,
        R ? ` ${A} "${R}"` : "",
        e(Text, {
          dimColor: !0,
          children: y
            ? `${R ? "" : ` of ${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}`}${C}`
            : `${R ? " \xB7 " : ` ${A} `}${canonicalArtifactTargetFor(i.url, "(unrecognized address)")}${f ? shareAudienceParenthetical(c) : ""}`,
        }),
        !y && u !== "" && e(Text, { color: "warning", children: u }),
      ],
    });
  }
  let { file_path: file_path, url: url } = i,
    o = l?.verbose === !0,
    a = o && j9() && publishInputJoinsRoom(i) ? ROOM_CONSENT_CLAUSE.trimStart() : void 0,
    m = typeUrlOf(i);
  if (m !== void 0) {
    let d = canonicalArtifactTargetFor(m, "(unrecognized address)"),
      c =
        file_path !== void 0
          ? maskScratchFolder(sweptPagePath(describeThumbnailPath(file_path).shown) || "(unprintable path)")
          : void 0;
    return r(Text, {
      children: [
        c !== void 0 ? `"${c}" ` : "",
        r(Text, { dimColor: !0, children: ["\u2192 new artifact from type ", d] }),
        a !== void 0 &&
          e(Text, {
            dimColor: !0,
            children: `
${a}`,
          }),
      ],
    });
  }
  if (file_path === void 0 && url !== void 0) {
    let d = canonicalArtifactTargetFor(url, "(unrecognized address)"),
      c = typeof url === "string" ? artifactTitleForDisplay(i, parseArtifactUrl(url)?.slug) : "";
    return r(Text, {
      children: [
        c ? r(Fragment, { children: [`"${c}"`, e(Text, { dimColor: !0, children: ` \xB7 ${d}` })] }) : d,
        a !== void 0 &&
          e(Text, {
            dimColor: !0,
            children: `
${a}`,
          }),
      ],
    });
  }
  let g = o && url !== void 0 ? canonicalArtifactTargetFor(url, "(unrecognized address)") : void 0,
    h = describeThumbnailPath(file_path ?? ""),
    b = maskScratchFolder(sweptPagePath(h.shown) || "(unprintable path)");
  return r(Text, {
    children: [
      `"${b}"`,
      g !== void 0 && r(Text, { dimColor: !0, children: [" \u2192 ", g] }),
      a !== void 0 &&
        e(Text, {
          dimColor: !0,
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
    (i.action === void 0 || i.action === "publish") &&
    i.file_path === void 0 &&
    typeUrlOf(i) === void 0 &&
    canonicalArtifactTargetFor(i.url, "") === ""
  )
    return "";
  return renderArtifactToolUse(t, l);
}
//@ chunk-wc0ezwp2.js:26136-26163 placement
function hn() {
  return _mt();
}
//@ chunk-wc0ezwp2.js:26163-26204 placement
function G(t) {
  return (l, i) => renderArtifactToolUse(toParentArtifactInput(t, l), i);
}
//@ chunk-wc0ezwp2.js:26204-26252 placement
var _n = G("comments"),
  Tn = G("data"),
  yn = G("check");
/**
 * Artifact 发布重试中的进度提示。
 */
//@ chunk-wc0ezwp2.js:26252-26566 placement
function renderArtifactProgress(t) {
  let l = t.at(-1)?.data;
  if (!l || l.type !== "artifact_publish_retry" || l.resolved) return bmt();
  let i = l.status === 503 ? "Publish service temporarily unavailable" : "Publish service busy";
  return e(MessageResponse, {
    children: r(Text, {
      dimColor: !0,
      children: [i, " \u2014 retrying (attempt ", l.attempt, " of ", l.maxAttempts, ")\u2026"],
    }),
  });
}
//@ chunk-wc0ezwp2.js:26566-26663 placement
function re(t) {
  let l = $jn(t);
  return l === "handlers_doc" || l === "handler_result" || l === "script_result";
}
//@ chunk-wc0ezwp2.js:26663-26745 placement
function Y(t, l) {
  let i = truncateToLength(t, l),
    T = sweepAskCopy(i) ?? "";
  return i.length < t.length ? `${T}\u2026` : T;
}
//@ chunk-wc0ezwp2.js:26745-26816 placement
function te(t) {
  return "emulatorPreview" in t && $jn(t) === "emulatorPreview";
}
//@ chunk-wc0ezwp2.js:26816-26871 placement
function se(t) {
  return "preview" in t && $jn(t) === "preview";
}
/**
 * 渲染 Artifact 工具结果（预览、发布、读取、评论等）。
 */
//@ chunk-wc0ezwp2.js:26871-41833 placement
function renderArtifactResult(t, l, i) {
  if (te(t)) {
    let emulatorPreview = t.emulatorPreview,
      a = Y(basename(emulatorPreview.file), 80);
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          emulatorPreview.outcome === "looked"
            ? `Looked at ${a} in the artifact viewer`
            : emulatorPreview.outcome === "aborted"
              ? `Stopped looking at ${a} in the artifact viewer`
              : `Could not look at ${a} in the artifact viewer`,
      }),
    });
  }
  if (se(t)) {
    let o = {
        ...t.preview,
        file: truncateToLength(t.preview.file, 4096),
        shots: t.preview.shots.slice(0, vcn).map((f) => ({ ...f, theme: truncateToLength(f.theme, 32) })),
        issues: t.preview.issues.slice(0, kcn),
        widths: t.preview.widths.slice(0, n2e),
        themes: t.preview.themes.slice(0, 2).map((f) => truncateToLength(f, 32)),
      },
      a = count(o.shots, (f) => f.error === void 0),
      filtered = o.issues.filter((issue) => issue.kind !== "note"),
      filtered_2 = o.issues.filter((issue) => issue.kind === "note"),
      h = filtered.length + (o.issuesDropped ?? 0),
      b = Y,
      d = i?.verbose === !0 ? filtered : filtered.slice(0, ee),
      c = filtered.length - d.length + (o.issuesDropped ?? 0);
    return e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          r(Text, {
            dimColor: !0,
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
                ? o.renderError !== void 0
                  ? "browser did not start \u2014 static checks only"
                  : "no issues"
                : `${h}${o.issuesDropped === m1t ? "+" : ""} ${plural(h, "issue")}`,
              a < o.shots.length && o.renderError === void 0 ? ` \xB7 ${a}/${o.shots.length} captured` : "",
            ],
          }),
          o.renderError !== void 0 &&
            e(Box, {
              paddingLeft: 2,
              children: e(Text, { color: "warning", children: b(o.renderError, 200) }),
            }),
          d.map((f, u) =>
            r(
              Box,
              {
                paddingLeft: 2,
                flexDirection: "row",
                children: [
                  e(Text, { dimColor: !0, children: "\xB7 " }),
                  e(Text, { dimColor: !0, children: b(f.text, 200) }),
                ],
              },
              u,
            ),
          ),
          c > 0 &&
            e(Box, {
              paddingLeft: 2,
              children: r(Text, {
                dimColor: !0,
                children: ["\xB7 \u2026 ", c, " more", filtered.length > d.length ? " (ctrl+o)" : ""],
              }),
            }),
          filtered_2.map((f, u) =>
            r(
              Box,
              {
                paddingLeft: 2,
                flexDirection: "row",
                children: [
                  e(Text, { dimColor: !0, children: "\xB7 note: " }),
                  e(Text, { dimColor: !0, children: b(f.text, 200) }),
                ],
              },
              `n${u}`,
            ),
          ),
          i?.verbose === !0 &&
            o.shots.map((shot, u) =>
              e(
                Box,
                {
                  paddingLeft: 2,
                  children: r(Text, {
                    dimColor: !0,
                    children: [
                      b(`${shot.width} ${shot.theme}`, 20),
                      ":",
                      " ",
                      shot.error !== void 0
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
    return e(renderToolUseProgressMessage, {
      bytes: t.read.bytes,
      status: `${t.read.code} ${t.read.codeText}`,
    });
  if ("threads" in t) {
    let o = t.threads_dropped === !0,
      a = t.thread_filter !== void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
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
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: t.replied
          ? "replied to comment thread"
          : t.summon_answered === !0
            ? "reply not posted (summon already answered)"
            : t.summon_foreign === !0
              ? "reply not posted (another user's summon or activation)"
              : t.already_answered === !0
                ? "reply not posted (thread already answered)"
                : t.page_owns_threads === !0
                  ? "reply not posted (the page keeps its own comment threads)"
                  : "reply needs thread activation by the user",
      }),
    });
  if ("thread_resolved" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: t.thread_resolved
          ? "resolved comment thread"
          : t.not_authorized === !0
            ? "not resolved (not the thread starter or a writer)"
            : t.summon_foreign === !0
              ? "not resolved (another user's activation)"
              : t.relayed_credential === !0
                ? "not resolved (unavailable from this session)"
                : t.page_owns_threads === !0
                  ? "not resolved (the page keeps its own comment threads)"
                  : "not resolved (thread not activated)",
      }),
    });
  if ("liveEdit" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: U ? U.renderLiveEditResultText(t.liveEdit) : "live edit landed",
      }),
    });
  if ("sync" in t)
    return e(MessageResponse, {
      children: e(Text, { dimColor: !0, children: U ? U.renderSyncResultText(t.sync) : "synced" }),
    });
  if ("versioned" in t) {
    let o = typeof t.versioned.url === "string" ? parseArtifactUrl(t.versioned.url) : null,
      a = o ? artifactViewerUrlFor(o) : void 0;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          "Versioned",
          " ",
          a !== void 0 ? e(ArtifactLink, { name: a, url: a }) : "(unrecognized address)",
        ],
      }),
    });
  }
  if ("db_read" in t) {
    let db_read = t.db_read,
      a = db_read.docs?.length ?? 0,
      saved = db_read.saved,
      g =
        isPlainObject(saved) &&
        typeof saved.dir === "string" &&
        Array.isArray(saved.files) &&
        Array.isArray(saved.skipped)
          ? { dir: saved.dir, fileCount: saved.files.length, skippedCount: saved.skipped.length }
          : void 0,
      h =
        g !== void 0
          ? `saved ${g.fileCount} ${plural(g.fileCount, "document")} under ${truncatePathMiddle(sweepAskCopy(g.dir) ?? "(unprintable path)", 1024)}${g.skippedCount > 0 ? ` (${g.skippedCount} skipped)` : ""}`
          : void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: db_read.found === !1 ? "no such document" : (h ?? `read ${a} ${plural(a, "document")}`),
      }),
    });
  }
  if ("db_profiles" in t) {
    let db_profiles = t.db_profiles,
      a =
        isPlainObject(db_profiles) && isPlainObject(db_profiles.profiles)
          ? Object.keys(db_profiles.profiles).length
          : void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: a === void 0 ? "no names available" : `found ${a} ${plural(a, "person", "people")}`,
      }),
    });
  }
  if ("db_write" in t) {
    let o = "results" in t.db_write && Array.isArray(t.db_write.results) ? t.db_write.results.length : void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: !t.db_write.committed
          ? "database write not committed"
          : o !== void 0
            ? `database batch ${"fallback" in t.db_write && t.db_write.fallback === "sequential" ? "written one at a time" : "committed"} (${o} ${plural(o, "write")})`
            : "database write committed",
      }),
    });
  }
  if (re(t))
    return H
      ? H.renderHandlersResult(t)
      : e(MessageResponse, {
          children: e(Text, { dimColor: !0, children: "This record is unreadable in this build." }),
        });
  if ("room_send" in t) {
    let room_send = t.room_send,
      a =
        typeof room_send.peers === "number" && Number.isSafeInteger(room_send.peers) && room_send.peers >= 0
          ? `${room_send.peers} ${plural(room_send.peers, "peer")}`
          : "? peers",
      m = typeof room_send.reason === "string" ? sanitizeDisplayText(room_send.reason, { max: 32 }) : void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: room_send.delivered === !0 ? `sent to ${a}` : m === void 0 ? "not sent" : `not sent (${m})`,
      }),
    });
  }
  if ("asset_upload" in t) {
    let asset_upload = t.asset_upload;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          "uploaded ",
          sweepAskCopy(asset_upload.file_name) ?? "asset",
          " (",
          formatFileSize(asset_upload.size_bytes),
          ") as ",
          sweepAskCopy(asset_upload.url) ?? "_blob/\u2026",
        ],
      }),
    });
  }
  if ("asset_uploads" in t) {
    let o = isPlainObject(t.asset_uploads) ? t.asset_uploads : {},
      { rows: rows } = capResultRows(o.results, MAX_UPLOAD_FILE_PATHS),
      m = count(rows, (g) => g.status === "uploaded");
    return e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          r(Text, {
            dimColor: !0,
            children: ["uploaded ", m, " of ", rows.length, " ", plural(rows.length, "file")],
          }),
          rows.map((g, h) =>
            r(
              Text,
              {
                dimColor: !0,
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
    let o = isPlainObject(t.asset_list) ? t.asset_list : {},
      a = Array.isArray(o.assets) ? o.assets.length : void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          a === void 0
            ? "listed assets (record unreadable)"
            : a === 0
              ? "no assets listed"
              : `listed ${a} ${plural(a, "asset")}${typeof o.next === "string" && o.next !== "" ? " (more follow)" : ""}`,
      }),
    });
  }
  if ("file_list" in t) {
    let o = isPlainObject(t.file_list) ? t.file_list : {},
      a = Array.isArray(o.files) ? o.files.length : void 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          a === void 0
            ? "listed files (record unreadable)"
            : a === 0
              ? "no files listed"
              : `listed ${a} ${plural(a, "file")}`,
      }),
    });
  }
  if ("file_read" in t) {
    let o = isPlainObject(t.file_read) ? t.file_read : {};
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          "saved",
          " ",
          truncatePathMiddle(
            (typeof o.saved_to === "string" ? sweepAskCopy(o.saved_to) : void 0) ?? "file",
            1024,
          ),
          typeof o.size_bytes === "number" ? ` (${formatFileSize(o.size_bytes)})` : "",
        ],
      }),
    });
  }
  if ("files_read" in t) {
    let o = isPlainObject(t.files_read) ? t.files_read.files : void 0,
      a = Array.isArray(o) ? o.length : void 0,
      m = Array.isArray(o) ? count(o, (b) => isPlainObject(b) && "saved_to" in b) : 0,
      g = isPlainObject(t.files_read) ? t.files_read.saved_dir : void 0,
      h =
        typeof g === "string"
          ? ` under ${truncatePathMiddle(sweepProvenanceMarker(sweepAskCopy(g) ?? "folder"), 1024)}`
          : "";
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          a === void 0
            ? "saved files (record unreadable)"
            : `saved ${m === a ? a : `${m} of ${a}`} ${plural(a, "file")}${h}`,
      }),
    });
  }
  if ("asset_read" in t) {
    let asset_read = t.asset_read;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          "saved ",
          truncatePathMiddle(sweepAskCopy(asset_read.path) ?? "asset", 1024),
          " (",
          formatFileSize(asset_read.size_bytes),
          ")",
        ],
      }),
    });
  }
  if ("asset_delete" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: t.asset_delete.deleted ? "asset deleted" : "no such asset",
      }),
    });
  if ("asset_copy" in t) {
    let o = Array.isArray(t.asset_copy.assets) ? t.asset_copy.assets.length : 0;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: ["copied ", o, " ", plural(o, "asset"), " into the artifact"],
      }),
    });
  }
  if ("artifact_delete" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: t.artifact_delete.already_gone === !0 ? "Artifact was already deleted" : "Artifact deleted",
      }),
    });
  if ("pin" in t)
    return e(MessageResponse, {
      children: e(Text, { dimColor: !0, children: t.pin.pinned ? "pinned to the sidebar" : "unpinned" }),
    });
  if ("shared" in t) {
    let shared = t.shared,
      a =
        shared.mode === "org"
          ? "the organization"
          : `${typeof shared.added === "number" ? shared.added : 0} ${plural(typeof shared.added === "number" ? shared.added : 0, "person", "people")}`;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          shared.unchanged === !0 ? "already shared with " : "shared with ",
          a,
          shared.access === "view" ? " (view only)" : " (can comment)",
        ],
      }),
    });
  }
  if ("watch" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
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
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: t.unwatch.was_watching ? "stopped watching" : "no watch to stop",
      }),
    });
  if ("watches" in t) {
    let { watching: watching, stopped: stopped } = splitWatchRows(t.watches),
      m = t.arms ?? [],
      g = count(m, (p) => p.rail === void 0 && (p.state === "arming" || p.state === "backing_off")),
      h = count(m, (p) => p.rail !== void 0 && p.state === "arming"),
      b = count(m, (p) => p.state === "failed" || p.state === "ended"),
      joined = [
        g > 0 ? `${g} connecting` : "",
        h > 0 ? `${h} registering` : "",
        b > 0 ? `${b} ended or failed` : "",
      ]
        .filter((p) => p !== "")
        .join(", "),
      c = Array.isArray(t.rooms) ? t.rooms : [],
      f = count(c, (p) => p?.connected !== !0),
      u =
        c.length > 0
          ? ` \xB7 ${c.length} artifact ${plural(c.length, "room")} joined${f > 0 ? ` (${f} reconnecting)` : ""}`
          : "";
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: `${watching} artifact ${plural(watching, "watch", "watches")}${stopped > 0 ? ` \xB7 ${stopped} with auto-replies paused or stopped` : ""}${joined !== "" ? `, ${joined}` : ""}${u}`,
      }),
    });
  }
  if ("resume_replies" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
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
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          t.verify.state === "no_row"
            ? "no diagnostics readable: none captured in 24h, an older page that can't capture them, or not readable for this artifact"
            : t.verify.state !== "empty" && t.verify.state !== "entries"
              ? "unrecognized diagnostics result \u2014 verify again for a current read"
              : t.verify.entries.length === 0
                ? (t.verify.dropped ?? 0) > 0 || t.verify.truncated === !0
                  ? "diagnostics captured but none readable (size cap) \u2014 not a clean signal"
                  : "loaded clean: zero diagnostics captured"
                : `read ${t.verify.entries.length} diagnostic ${plural(t.verify.entries.length, "entry", "entries")}`,
      }),
    });
  if ("artifact_types" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          t.artifact_types.length === 0
            ? t.unavailable === !0
              ? "artifact types not available to this account"
              : "no artifact types listed"
            : `listed ${t.artifact_types.length} artifact ${plural(t.artifact_types.length, "type")}`,
      }),
    });
  if ("artifact_type" in t) {
    let o = parseArtifactUrl(t.artifact_type.type_url),
      a = o ? artifactViewerUrlFor(o) : void 0,
      m = isPlainObject(t.type_file) ? t.type_file : null;
    if (m !== null) {
      let h = truncatePathMiddle(
        sweptAskPath(typeof m.path === "string" ? m.path : "") || "(unprintable path)",
        256,
      );
      return e(MessageResponse, {
        children: r(Text, {
          dimColor: !0,
          children: [
            m.unread === void 0 ? "read " : "did not read ",
            h,
            " of artifact type",
            " ",
            a !== void 0 ? e(ArtifactLink, { name: a, url: a }) : "(unrecognized address)",
          ],
        }),
      });
    }
    let g = Array.isArray(t.type_files_read)
      ? t.type_files_read.filter((h) => isPlainObject(h) && typeof h.path === "string")
      : [];
    if (g.length > 0) {
      let h = g.length,
        b = count(g, (d) => d.unread === void 0);
      return e(MessageResponse, {
        children: r(Text, {
          dimColor: !0,
          children: [
            "read ",
            b === h ? h : `${b} of ${h}`,
            " ",
            plural(h, "file"),
            " of artifact type",
            " ",
            a !== void 0 ? e(ArtifactLink, { name: a, url: a }) : "(unrecognized address)",
          ],
        }),
      });
    }
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          "described artifact type",
          " ",
          a !== void 0 ? e(ArtifactLink, { name: a, url: a }) : "(unrecognized address)",
          ` (${t.artifact_type.files.length} ${plural(t.artifact_type.files.length, "file")}${typeof t.artifact_type.files_omitted === "number" && t.artifact_type.files_omitted > 0 ? ` +${t.artifact_type.files_omitted} not shown` : ""}${t.artifact_type.instructions_file ? ", ships instructions" : ""})`,
        ],
      }),
    });
  }
  if ("quickstart" in t) {
    let quickstart = t.quickstart,
      a = Array.isArray(quickstart?.design_systems?.instances)
        ? quickstart.design_systems.instances.length
        : 0,
      m = (quickstart?.design_system?.docs ?? []).length > 0;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          quickstart?.match !== void 0
            ? "found the type to start from"
            : quickstart?.types_ruled === !0
              ? "skipped: a permission rule covers listing artifact types"
              : quickstart?.intent === "document" &&
                  quickstart.types_ambiguous !== !0 &&
                  quickstart.types_partial !== !0
                ? "said where a document goes"
                : quickstart?.design_guidance === !0
                  ? "sent page-design guidance"
                  : "more than one matching type, or the listing was incomplete",
          a > 0 ? `, listed ${a} design ${plural(a, "system")}` : "",
          m ? ", read the design system guide" : "",
          quickstart?.design_systems_off === !0 ? ", left design systems out" : "",
        ],
      }),
    });
  }
  if ("type_instances" in t) {
    let o = Array.isArray(t.type_instances?.instances) ? t.type_instances.instances.length : 0;
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          o === 0
            ? t.type_instances?.unavailable === !0
              ? "instance listing not available to this account"
              : "no artifacts of this type listed"
            : `listed ${o} ${plural(o, "artifact")} of this type`,
      }),
    });
  }
  if ("page_versions" in t) {
    let o = Array.isArray(t.page_versions?.rows) ? t.page_versions.rows.length : 0;
    return e(MessageResponse, {
      children: e(Text, { dimColor: !0, children: `listed ${o} ${plural(o, "version")}` }),
    });
  }
  if ("artifacts" in t)
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children:
          t.artifacts.length === 0
            ? t.scope === "shared"
              ? "no shared artifacts listed"
              : t.scope === "all"
                ? "no artifacts listed"
                : "no published artifacts yet"
            : `listed ${t.artifacts.length} ${plural(t.artifacts.length, t.scope !== void 0 ? "artifact" : "published artifact")}`,
      }),
    });
  if ("opened" in t) {
    let o = typeof t.url === "string" ? parseArtifactUrl(t.url) : null,
      a = o ? artifactViewerUrlFor(o) : void 0;
    return e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        children: [
          "Opened",
          " ",
          a !== void 0
            ? e(ArtifactLink, {
                name: (typeof t.title === "string" ? sanitizeDisplayTitle(t.title) : null) ?? a,
                url: a,
              })
            : "(unrecognized address)",
        ],
      }),
    });
  }
  if ("created_from_type" in t) {
    let o = (m) => {
        let g = typeof m === "string" ? parseArtifactUrl(m) : null,
          h = g ? artifactViewerUrlFor(g) : void 0;
        return h !== void 0 ? e(ArtifactLink, { name: h, url: h }) : "(unrecognized address)";
      },
      a =
        "files_error" in t && typeof t.files_error === "string"
          ? sweepResultLineText(t.files_error, i?.verbose === !0 ? ARTIFACT_MAX_RESULT_SIZE_CHARS / 2 : 200)
          : void 0;
    return e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          r(Text, {
            dimColor: !0,
            children: [
              "Created ",
              o(t.url),
              " from Artifact type",
              " ",
              o(t.type?.url),
              "instructions" in t && typeof t.instructions === "string" ? ", read its instructions" : "",
            ],
          }),
          a !== void 0 && r(Text, { color: "error", children: ["Couldn't publish its files \u2014 ", a] }),
        ],
      }),
    });
  }
  let T = replayedPublishesRemaining(t.publishesRemaining),
    _ = replayedPublishesResetAt(t.publishesResetAt);
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        r(Text, {
          dimColor: !0,
          children: [t.updated ? "Updated" : "Published", " ", e(ArtifactLink, { name: t.url, url: t.url })],
        }),
        T !== void 0 && _ !== void 0 && e(Text, { dimColor: !0, children: publishesRemainingLine(T, _) }),
      ],
    }),
  });
}
//@ chunk-wc0ezwp2.js:41833-42067 placement
var WRITE_FILE_FIRST_HINT = "content must first be written to a file",
  TOOL_USE_ERROR_OPEN = "<tool_use_error>",
  TOOL_USE_ERROR_CLOSE = "</tool_use_error>",
  INPUT_VALIDATION_PREFIX = `${TOOL_USE_ERROR_OPEN}InputValidationError: `,
  LOGIN_RETRY_ERROR_SHAPES = [
    {
      open: TOOL_USE_ERROR_OPEN,
      tail: `

${ARTIFACT_LOGIN_RETRY_NOTE}${TOOL_USE_ERROR_CLOSE}`,
      ends: !0,
    },
    {
      open: "",
      tail: `

${ARTIFACT_LOGIN_RETRY_NOTE}`,
      ends: !0,
    },
    {
      open: INPUT_VALIDATION_PREFIX,
      tail: `

${ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE}

`,
      ends: !1,
    },
  ];
//@ chunk-wc0ezwp2.js:42067-42310 placement
function policyUnobtainedErrorFor(t) {
  let l = heldArtifactPolicyFetchAnswer();
  if (l === null) return null;
  for (let i of ["policy_fetch_failed", "policy_route_missing"]) {
    let T = artifactPolicyUnobtainedRefusal({ cause: i, outcome: l });
    if (
      t === T ||
      t === `${TOOL_USE_ERROR_OPEN}${T}${TOOL_USE_ERROR_CLOSE}` ||
      t.startsWith(`${INPUT_VALIDATION_PREFIX}${T}

`)
    )
      return artifactPolicyUnobtainedMessage({ cause: i, outcome: l });
  }
  return null;
}
/**
 * 渲染 Artifact 工具错误。
 */
//@ chunk-wc0ezwp2.js:42310-43792 placement
function renderArtifactError(t, l) {
  if (typeof t === "string") {
    if (
      !l.verbose &&
      t.startsWith(TOOL_USE_ERROR_OPEN) &&
      t.endsWith(TOOL_USE_ERROR_CLOSE) &&
      NO_PAGE_REJECTIONS.includes(
        vkt(t.slice(TOOL_USE_ERROR_OPEN.length, t.length - TOOL_USE_ERROR_CLOSE.length)),
      )
    )
      return e(FallbackToolUseErrorMessage, { result: WRITE_FILE_FIRST_HINT, verbose: l.verbose });
    if (!l.verbose) {
      for (let o of LOGIN_RETRY_ERROR_SHAPES) {
        if (!t.startsWith(o.open + ARTIFACT_LOGIN_MESSAGE_LEAD)) continue;
        let { message: message } = artifactLoginBlockedReason(),
          m = o.open.length + message.length;
        if (
          t.startsWith(message, o.open.length) &&
          t.startsWith(o.tail, m) &&
          (!o.ends || m + o.tail.length === t.length)
        )
          return e(FallbackToolUseErrorMessage, { result: message, verbose: !1 });
      }
      let _ = policyUnobtainedErrorFor(t);
      if (_ !== null) return e(FallbackToolUseErrorMessage, { result: _, verbose: !1 });
    }
    let i = vkt(t),
      T = l.verbose ? void 0 : toUserFacingRefusal(i);
    if (T !== void 0) return e(MessageResponse, { children: e(Text, { color: "error", children: T }) });
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
${Sh}`,
              "",
            );
        return e(FallbackToolUseErrorMessage, {
          result: revealPageInvisibles(m),
          verbose: l.verbose,
          verbatim: !0,
        });
      }
      let sliced = t.slice(0, t.length - i.length),
        a = countCharInString(
          i,
          `
`,
          _.index,
        );
      return e(MessageResponse, {
        children: r(Box, {
          flexDirection: "column",
          children: [
            e(FallbackToolUseErrorMessage, {
              result: revealPageInvisibles(`${sliced}${i.slice(0, _.index)}`),
              verbose: l.verbose,
              verbatim: !0,
            }),
            r(Text, {
              dimColor: !0,
              children: [
                "\u2026",
                a > 1 ? ` +${a} lines` : " the rest is",
                " shown to Claude, elided here ",
                e(CtrlOToExpand, {}),
              ],
            }),
          ],
        }),
      });
    }
  }
  if (typeof t === "string" && !l.verbose) {
    let i = vkt(t),
      T =
        parsePathPinRefusal(i) ??
        parseFileTypeRefusal(i) ??
        otherOrgReplyNotice(i) ??
        parseRateLimitedMessage(i) ??
        parseContractRolloutMessage(i);
    if (T !== void 0) return e(MessageResponse, { children: e(Text, { color: "error", children: T }) });
    if (VERSION_MISMATCH_PREFIXES.some((_) => i.startsWith(_))) {
      let _ = isPlainObject(l.input) && l.input.db_op === "delete";
      return e(MessageResponse, {
        children: e(Text, { color: "error", children: _ ? C0o.delete : C0o.write }),
      });
    }
  }
  return e(FallbackToolUseErrorMessage, { result: t, verbose: l.verbose });
}
