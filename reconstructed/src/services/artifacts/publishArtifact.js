/**
 * services/artifacts/publishArtifact.ts
 *
 * 2.1.316 新增：发布 artifact 页面的主流程（部署重试、失败分类、槽位预留）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (45)
 * attribution: placement 45
 */
import { randomUUID } from "crypto";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  publishError,
  describeCapabilityProblems,
  describeCapabilityTools,
  checkHostGrantCarry,
  strandedSlugFrom,
} from "./publishConflicts.js";
import {
  isFrameBaseVersionEnabled,
  isFrameMultiFileEnabled,
  MAX_ARTIFACT_BYTES,
  isFrameCopyFromEnabled,
  LATEST_CONTRACT_PATH_FRAME,
} from "./frameFlags.js";
import { validateSupportingFiles } from "./publishFiles.js";
import {
  prepareArtifactBody,
  isRetryableReadBack,
  readBackTelemetry,
  READBACK_RETRY_MS,
  resolvePublishCapabilities,
  CONTRACT_FETCH_SUBJECT,
  usesLocalMcpServers,
  MAX_PAGE_BYTES_FOR_STRIP,
  carriesDeadline,
} from "./pagePreparation.js";
import { composeArtifactPage } from "./composePage.js";
import {
  hasSuspiciousBaseHref,
  BASE_HREF_TEXT,
  BASE_HREF_OUTSIDE_TEXT_SINGLE,
  readFrameDecl,
  readBackAfterPublish,
  notLivePathsResult,
} from "./readBack.js";
import {
  normalizeMcpCapability,
  getLocalServerName,
  hasFeatureFlag,
  HOST,
  capListForDisplay,
  describeServerKind,
  findUndeclaredMcpToolCalls,
  findMentionedTools,
  listLocalServerDeclarations,
  readHostGrant,
  applyHostGrant,
  CLAUDE_ARTIFACT_HOST_GRANT_ENV,
  isDynamicMcp,
  CONTRACT_VERSION_REGEX,
  UNVERSIONED_CONTRACT,
  parseContractVersion,
  SELF,
  ARTIFACT_CAPABILITY_KEY,
  isValidDbRules,
  getUserScopes,
  isValidScopeList,
  sanitizeDisplayText,
  isValidDbCapability,
  isValidUserCapability,
} from "./capabilityDeclaration.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { resolveContract, CONTRACT_FETCH_TIMEOUT_MS } from "./contract.js";
import { saveRosterToConfig, slackConnectorName } from "./capabilityRoster.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { count, uniq } from "../../utils/collections.js";
import { sanitizeConnectorName, isDeclarableServer, isPlainObjectConnector } from "./connectorNames.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { plural } from "../../utils/stringUtils.js";
import { MAX_SANITIZED_TEXT, MAX_LISTED_MCP_SERVERS } from "./textSanitize.js";
import {
  MANIFEST_TEXT_TYPES,
  bufferToText,
  COPY_FROM_DISABLED_TEXT,
  publishFilesVersion,
  sendFilesPublish,
} from "./publishInstanceFiles.js";
import { env } from "../../utils/env.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sleep, backoffDelayMs } from "../../utils/sleep.js";
import { getUserClaudeRulesDir_2 } from "../../utils/config.js";
import { foldLookalikeChars } from "../../utils/confusables.js";
import { scrubArtifactEnvelopeTags, scrubServerLine } from "../../tools/ArtifactTool/artifactUrls.js";
import { buildInstallationHealthDiagnostics } from "../../utils/status.js";
import {
  buildFrameHeaders,
  getTransportErrorProps,
  CREATE_CONFIRMED_QUERY,
  formatFrameErrorBody,
  UNKNOWN_FIELD_ERROR_RE,
  requestIdMeta,
} from "./frameApi.js";
import { entrypointHint } from "./requestMeta.js";
import {
  frameApi,
  isCredentialRefusal,
  plannedRoute,
  isRelayUnsent,
  wireOf,
  wireOfThrow,
  threwOnRelayLeg,
} from "./frameRelay.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { getEntrypointKind, isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { logForDebugging } from "../../utils/debug.js";
import { errBody, refusalReasonOf, outcomeUnknownMessage } from "./publishErrors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, _enum, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { isStalledUpload } from "../../utils/teleport/api.js";
import { McpDoubtfulAnswerError } from "./artifactMcpWire.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isAccountIngressToken } from "../ccrAgentProxy/agentProxy.js";
import { publishReadDeadlineS } from "./framePublish.js";
import { isTransportError } from "../http/externalHttp.js";

//@ chunk-06y4szbn.js:75207-91694 placement
/**
 * 发布 artifact 页面的主流程：准备页面、能力与契约、预留、上传（直连或中继）、处理冲突/限流/日上限/缩略图并记录本方发布。
 */
async function publishArtifactPage(e, n, r) {
  let startTime = performance.now();
  let h = r !== undefined ? relayOnlyRefusalReason(n) : undefined;
  if (h !== undefined) {
    logFeatureBad("artifact_publish", "relay_only_not_fresh_page");
    return {
      ...publishError(
        `Nothing was published: a publish made without asking may only create a new artifact, naming no url and setting no capabilities, contract, force, file removals or live files, but this one ${h}. Every publish in this session now goes through the usual permission check, which may need a person's approval.`,
      ),
      refusedShape: true,
    };
  }
  let {
    slug,
    title,
    favicon,
    icon,
    label,
    note,
    description,
    capabilities,
    session,
    hostServers,
    readBack,
    publishContext,
    originMetadata,
  } = n;
  let copiedFiles = n.copiedFiles ?? [];
  if (
    n.createPath !== undefined &&
    (slug !== undefined ||
      n.force === true ||
      n.baseVersion !== undefined ||
      copiedFiles.length > 0 ||
      (n.removeFiles !== undefined && n.removeFiles.length > 0) ||
      n.liveFiles !== undefined)
  ) {
    logFeatureBad("artifact_publish", "create_bad_combo");
    return publishError("invalid publish options");
  }
  let isRedeploy = !!slug;
  let hasCaps = capabilities !== undefined;
  let ie = isFrameBaseVersionEnabled();
  let Z = n.force === true;
  let Oe =
    (n.files?.length ?? 0) > 0 ||
    copiedFiles.length > 0 ||
    (n.removeFiles?.length ?? 0) > 0 ||
    n.liveFiles !== undefined;
  let ye = n.autoEditAttribution !== undefined || Oe ? n.baseVersion : ie ? n.baseVersion : undefined;
  let Ee = {
    slug,
    title,
    favicon,
    ...(icon && {
      icon,
    }),
    label,
    note,
    ...(slug !== undefined &&
      n.deadline !== undefined && {
        deadline: n.deadline,
      }),
    ...(n.requestId !== undefined && {
      requestId: n.requestId,
    }),
    createConfirmed: n.createConfirmed,
    description,
    publishContext,
    originMetadata,
    ...(n.autoEditAttribution && {
      autoEditAttribution: n.autoEditAttribution,
    }),
    ...(n.createPath === undefined &&
      n.thumbnail && {
        thumbnail: n.thumbnail,
      }),
    ...(n.createPath === undefined &&
      n.thumbnailDark && {
        thumbnailDark: n.thumbnailDark,
      }),
  };
  let bt = validateSupportingFiles(n.files ?? []);
  if (bt !== null) return bt;
  let artifactBody = await prepareArtifactBody(e, {
    injectDiagramRuntime: n.injectDiagramRuntime,
    injectHighlightRuntime: n.injectHighlightRuntime,
    expectRoundTrippedPage: n.expectRoundTrippedPage,
  });
  let He = composeArtifactPage(artifactBody.body, artifactBody.roundTripLang, artifactBody.roundTripCover);
  let Y = Buffer.byteLength(He, "utf8");
  let { body, mermaidInjected, hljsInjected, unnested, hoistedCommentsDropped } = artifactBody;
  let Be = hasSuspiciousBaseHref(body)
    ? [isFrameMultiFileEnabled() ? BASE_HREF_TEXT : BASE_HREF_OUTSIDE_TEXT_SINGLE]
    : [];
  if (Y > MAX_ARTIFACT_BYTES) {
    logFeatureBad("artifact_publish", "too_large", {
      page_bytes: Y,
      mermaid_injected: mermaidInjected,
      hljs_injected: hljsInjected,
    });
    return publishError(
      `too large: rendered page is ${Math.ceil(Y / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)` +
        (hljsInjected
          ? " \u2014 includes the inline syntax-highlight runtime (~0.6MB), added because the page contains fenced code"
          : ""),
    );
  }
  Ee.template = "plain";
  let Te = capabilities;
  let Ve = [];
  let $e = [];
  if (capabilities !== undefined && session !== undefined) {
    let { connectorNames, serverNames } = session;
    let K = normalizeMcpCapability(capabilities, connectorNames, serverNames, {
      hostServers,
    });
    if (
      K.ok &&
      hostServers === undefined &&
      K.servers.some((server) => getLocalServerName(server) !== undefined)
    ) {
      let liveState = getLiveState();
      let epoch = liveState.accountEpoch;
      let contract = await resolveContract({
        timeoutMs: CONTRACT_FETCH_TIMEOUT_MS,
        ...(n.signal && {
          signal: n.signal,
        }),
        credentials: n.credentials,
      });
      if (!("err" in contract)) {
        saveRosterToConfig({
          session: liveState,
          epoch,
          roster: contract,
          storageV5: undefined,
        });
        let Fe = hasFeatureFlag(contract, "mcp", HOST);
        n.noteHostServers?.(Fe);
        if (!Fe)
          K = normalizeMcpCapability(capabilities, connectorNames, serverNames, {
            hostServers: false,
          });
      } else
        logFeatureSad("artifact_publish", "host_roster_fetch_failed", {
          cause: fromEnum(contract.cause),
        });
    }
    if (!K.ok) {
      let ce = count(K.malformed, (be) => be.kind === "host_unavailable");
      let Ae = count(K.malformed, (be) => be.kind === "unknown_tools");
      let Ie = count(
        K.malformed,
        (be) =>
          be.kind === "opaque_id" ||
          be.kind === "known_id" ||
          be.kind === "tool_name" ||
          be.kind === "connector_as_host" ||
          be.kind === "undeclarable_name",
      );
      let Fe = count(K.malformed, (be) => be.kind === "local_server_as_first_party");
      logFeatureBad(
        "artifact_publish",
        ce > 0
          ? "host_server_unavailable"
          : K.internal.length > 0
            ? "internal_host_server_name"
            : Fe > 0
              ? "first_party_server_collision"
              : K.unresolved.length > 0
                ? "unresolved_mcp_server"
                : Ie > 0
                  ? "opaque_mcp_server_id"
                  : Ae > 0
                    ? "unknown_mcp_tool"
                    : K.malformed.length > 0
                      ? "malformed_mcp_manifest"
                      : "mcp_manifest_over_caps",
        {
          page_bytes: Y,
          unresolved_count: K.unresolved.length,
          internal_count: K.internal.length,
          malformed_count: K.malformed.length - Ie - ce - Ae,
          opaque_id_count: Ie,
          host_unavailable_count: ce,
          unknown_tools_count: Ae,
          oversized_count: K.oversized.length,
          ...(K.serverCount !== null && {
            server_count: K.serverCount,
          }),
        },
      );
      let Ge = describeCapabilityProblems(K.malformed);
      if (K.unresolved.length > 0) {
        let be = capListForDisplay(K.unresolved, 8, (Le) => `"${sanitizeConnectorName(Le)}"`);
        let filtered = connectorNames.filter(isDeclarableServer);
        let qe = capListForDisplay(
          uniq(filtered.map((Le) => Le.server)),
          8,
          (Le) => `"${sanitizeConnectorName(Le)}"`,
        );
        let bn = qe.length === 0 ? "" : ` (connectors this session: ${qe.join(", ")})`;
        let any = filtered.some((Le) => normalizeUuidOrNull(Le.toolPrefix) !== null);
        Ge.push(
          `unknown ${plural(K.unresolved.length, "connector")}: ${be.join(", ")} \u2014 ` +
            (any
              ? "set `server` to the connector's exact display name"
              : `set \`server\` to the segment between \`mcp__\` and the next \`__\` of a tool name from this session (for \`mcp__${slackConnectorName()}__search\`, use \`${slackConnectorName()}\`, copied exactly), or to the connector's exact display name`) +
            `${bn}. The control plane would accept this manifest, but the page would break at view time`,
        );
      }
      if (K.internal.length > 0) {
        let be = capListForDisplay(uniq(K.internal), 8, (at) => `"${sanitizeConnectorName(at)}"`);
        Ge.push(
          `built-in ${plural(K.internal.length, "server")} ${be.join(", ")} ` +
            "\u2014 the Claude app's own servers, which it never exposes to " +
            "pages as host servers; declare only servers from the MCP configuration (host:<name> for the `mcp__<name>__<tool>` tools of a server you configured). The control plane would accept this manifest, but the page would break at view time",
        );
      }
      for (let be of K.oversized)
        Ge.push(
          `${describeServerKind(be.server)} "${sanitizeConnectorName(be.server)}" declares ${be.toolCount} tools, counted after any same-name entries merge (max ${MAX_SANITIZED_TEXT}) \u2014 trim the tools ` +
            "list; the control plane would reject it anyway",
        );
      if (K.serverCount !== null)
        Ge.push(
          `manifest declares ${K.serverCount} servers (max ${MAX_LISTED_MCP_SERVERS}) \u2014 declare only the servers ` +
            "the page actually calls; the control plane would reject it anyway",
        );
      return publishError(`mcp manifest rejected: ${Ge.join("; ")}.`);
    }
    Te = K.caps;
    Ve = K.warnings;
    $e = K.servers;
    let S = [
      e,
      ...(n.files ?? []).flatMap((ce) =>
        MANIFEST_TEXT_TYPES.has(ce.contentType) ? [bufferToText(ce.content)] : [],
      ),
    ];
    let Q = K.servers.length > 0 ? findUndeclaredMcpToolCalls(S, K.servers, 64) : [];
    let filtered = findMentionedTools(S, K.renamed).filter(([ce]) => !Q.includes(ce));
    if (filtered.length > 0)
      Ve = [
        ...Ve,
        `the page source still holds ${plural(filtered.length, "a server name", "server names")} this publish rewrote in the manifest, as ${plural(filtered.length, "a quoted string", "quoted strings")} \u2014 ${capListForDisplay(filtered, 8, ([ce, Ae]) => `"${sanitizeConnectorName(ce)}" (viewers resolve only "${sanitizeConnectorName(Ae)}")`).join(", ")} \u2014 so if the page passes ${filtered.length === 1 ? "it" : "them"} to callTool(\u2026) / watchTool(\u2026), those calls fail for every viewer; use the display ${plural(filtered.length, "name")} there.`,
      ];
  } else if (capabilities !== undefined) {
    let D = listLocalServerDeclarations(capabilities).length;
    if (D > 0)
      logFeatureSad("artifact_publish", "slug_without_pairs", {
        page_bytes: Y,
        slug_count: D,
      });
  }
  let keys = Object.keys(Te ?? {});
  let Me;
  let hostGrant = readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT);
  if (Te !== undefined) {
    let D = applyHostGrant(Te, hostGrant);
    if (!D.ok) {
      logFeatureBad("artifact_publish", "host_grant_unreadable", {
        page_bytes: Y,
        host_server_count: D.refused.length,
      });
      let fe = capListForDisplay(D.refused, 8, (K) => `"${sanitizeConnectorName(K)}"`);
      return publishError(
        `mcp manifest rejected: this computer's local-server grant (${CLAUDE_ARTIFACT_HOST_GRANT_ENV}, set by the app that launched this session; not something to fix from here) could not be read, so ` +
          `no host: server can be declared from this session \u2014 ${fe.join(", ")}; declare only claude.ai connectors (set "server" to the connector's display name), or to publish without connector access leave "mcp" out of capabilities (pass capabilities: {} to clear a stored declaration).`,
      );
    }
    if (D.dropped.length > 0) {
      logFeatureSad("artifact_publish", "host_grant_narrowed", {
        page_bytes: Y,
        dropped_count: D.dropped.length,
      });
      Te = D.caps;
      $e = $e.filter((K) => D.servers.includes(K));
      let fe = D.dropped.length === 1 ? "it" : "them";
      Me = D.caps;
      Ve = [
        ...Ve,
        `this computer did not grant the page these local tools, so they were left out of the manifest: ${describeCapabilityTools(D.dropped)} \u2014 the page's ` +
          `calls to ${fe} fail for every viewer; tell the user which local tools were left out` +
          (D.servers.length === 0
            ? ', and that the page now has no connector access at all (no declared server remained, so this publish carries no "mcp" and any stored "mcp" declaration is replaced)'
            : "") +
          ".",
      ];
    }
  }
  if (session !== undefined && $e.length > 0) {
    let D = [
      e,
      ...(n.files ?? []).flatMap((K) =>
        MANIFEST_TEXT_TYPES.has(K.contentType) ? [bufferToText(K.content)] : [],
      ),
    ];
    let undeclaredMcpToolCalls = findUndeclaredMcpToolCalls(D, $e, 64);
    if (undeclaredMcpToolCalls.length > 0)
      Ve = [
        ...Ve,
        `the page calls callTool/watchTool with ${plural(undeclaredMcpToolCalls.length, "a server name", "server names")} not in this manifest \u2014 ${capListForDisplay(undeclaredMcpToolCalls, 8, (K) => `"${sanitizeConnectorName(K)}"`).join(", ")} \u2014 and ${isDynamicMcp((Me ?? Te)?.mcp) ? "under this dynamic declaration each viewer is asked to approve them at first use (a name the viewer has no connector for is refused)" : "those calls fail for every viewer"}; the manifest declares ${capListForDisplay($e, 8, (K) => `"${sanitizeConnectorName(K)}"`).join(", ")}.`,
      ];
  }
  if (
    n.contract !== undefined &&
    n.contract !== "latest" &&
    (!CONTRACT_VERSION_REGEX.test(n.contract) || n.contract === UNVERSIONED_CONTRACT)
  ) {
    logFeatureBad("artifact_publish", "invalid_contract", {
      page_bytes: Y,
    });
    return publishError(
      `invalid contract ${jsonStringify(n.contract)} \u2014 pass 'latest' ` +
        "or a published version like 0.1.0.",
    );
  }
  let upgrade = n.contract === "latest";
  let contract = n.contract !== undefined && n.contract !== "latest" ? n.contract : null;
  let et = n.contract !== undefined;
  let storedPin = slug && !et ? n.storedPin : null;
  let ke;
  if (slug && !et && storedPin === undefined) {
    let frameDecl = await readFrameDecl(slug, undefined, n.credentials);
    if (
      frameDecl !== null &&
      "err" in frameDecl &&
      n.onPinReadError !== "assume_none" &&
      isRetryableReadBack(frameDecl)
    ) {
      let backTelemetry = readBackTelemetry(frameDecl);
      await sleep(READBACK_RETRY_MS, n.signal);
      if (!n.signal?.aborted) {
        frameDecl = await readFrameDecl(slug, n.signal, n.credentials);
        logFeatureSad("artifact_publish", "pin_readback_retried", {
          page_bytes: Y,
          ...backTelemetry,
          recovered: !(frameDecl !== null && "err" in frameDecl),
        });
      }
    }
    if (frameDecl !== null && "err" in frameDecl) {
      if (n.onPinReadError === "assume_none") {
        logFeatureSad("artifact_publish", "pin_readback_assumed_none", {
          page_bytes: Y,
        });
        storedPin = null;
      } else {
        logFeatureBad("artifact_publish", "pin_readback_failed", {
          page_bytes: Y,
          ...readBackTelemetry(frameDecl),
        });
        return publishError(
          `couldn't read the artifact's stored contract pin (${frameDecl.err}) \u2014 ` +
            "a republish preserves the stored pin, so this publish cannot proceed without it. This is usually transient: retry. If the read keeps failing and you intend to move the artifact to the current contract anyway, pass contract: 'latest' (this changes the page's runtime semantics).",
        );
      }
    } else {
      storedPin = frameDecl === null ? null : parseContractVersion(frameDecl.contract);
      ke = frameDecl?.capabilities ?? {};
    }
  }
  let contractVersion = parseContractVersion(storedPin);
  if (slug && ke === undefined && Object.keys(capabilities ?? {}).length > 0) {
    let frameDecl = await readFrameDecl(slug, undefined, n.credentials);
    if (
      frameDecl !== null &&
      "err" in frameDecl &&
      n.contract === undefined &&
      isRetryableReadBack(frameDecl)
    ) {
      await sleep(READBACK_RETRY_MS, n.signal);
      if (!n.signal?.aborted) frameDecl = await readFrameDecl(slug, undefined, n.credentials);
    }
    if (frameDecl !== null && "err" in frameDecl) {
      if (n.contract === undefined) {
        logFeatureBad("artifact_publish", "capability_readback_failed", {
          page_bytes: Y,
          ...readBackTelemetry(frameDecl),
        });
        return publishError(
          `couldn't read the artifact's stored capability declaration (${frameDecl.err}) \u2014 ` +
            "a republish that declares capabilities must not silently revoke stored ones, so this publish cannot proceed without it. This is usually transient: retry. If the read keeps failing and you intend to move the artifact to the current contract anyway, pass contract: 'latest' (this changes the page's runtime semantics, and the capabilities you send then replace the stored ones).",
        );
      }
      logFeatureSad("artifact_publish", "retrofit_guard_skipped");
    } else ke = frameDecl?.capabilities ?? {};
  }
  if (capabilities === undefined && slug) {
    let D = await checkHostGrantCarry({
      slug,
      hostGrant,
      storedCaps: ke,
      signal: n.signal,
      credentials: n.credentials,
      pageBytes: Y,
      lane: "page",
    });
    if (!D.ok) return publishError(D.err);
    ke = D.storedCaps;
  }
  let ve = (D) => (D === SELF ? ARTIFACT_CAPABILITY_KEY : D);
  let mapped = Object.keys(ke ?? {}).map(ve);
  let mapped_2 = keys.map(ve);
  let filtered = Object.entries(ke ?? {}).filter(([key]) => !mapped_2.includes(ve(key)));
  let tt = getUserClaudeRulesDir_2(ke?.db) ?? [];
  let db = Te?.db;
  let Rt = tt.length > 0 && (db === true || (isPlainObjectConnector(db) && !Object.hasOwn(db, "rules")));
  let gn = isValidDbRules(tt);
  let nt = getUserScopes(ke?.user) ?? [];
  let user = Te?.user;
  let ft =
    nt.length > 0 && (user === true || (isPlainObjectConnector(user) && !Object.hasOwn(user, "scopes")));
  let Ke = isValidScopeList(nt);
  let Je = () => {
    let D = jsonStringify(nt);
    let fe = sanitizeDisplayText(D, {
      max: 200,
    });
    return Ke && fe === D ? fe : "";
  };
  if (n.createPath === undefined && filtered.length > 0 && mapped_2.some((D) => !mapped.includes(D))) {
    logFeatureBad("artifact_publish", "capability_retrofit_refused");
    let D = capListForDisplay(filtered, 8, ([ce]) => sanitizeDisplayText(ce));
    let fe = jsonStringify({
      ...Object.fromEntries(filtered),
      ...Te,
      ...(Rt && {
        db: ke?.db,
      }),
      ...(ft && {
        user: ke?.user,
      }),
    });
    let K = sanitizeDisplayText(fe, {
      max: 600,
    });
    let S = Rt || filtered.some(([ce]) => ce === "db");
    let Q = ft || filtered.some(([ce]) => ce === "user");
    let I =
      K === fe &&
      !/[<>]/.test(foldLookalikeChars(fe)) &&
      scrubArtifactEnvelopeTags(fe) === fe &&
      (!S || isValidDbCapability(ke?.db)) &&
      (!Q || isValidUserCapability(ke?.user))
        ? K
        : "";
    return publishError(
      `your capabilities declaration omits the stored ${plural(filtered.length, "capability", "capabilities")} ${D.join(", ")} while adding new ones \u2014 a sent declaration replaces the stored one, so this publish would have silently revoked ${filtered.length === 1 ? "it" : "them"}. To keep ${filtered.length === 1 ? "it" : "them"}, republish declaring the union${I !== "" ? `: ${I}` : " (republish with capabilities omitted to read the stored declaration back, then resend it plus your additions)"}. To revoke on purpose, publish that union first, then republish without the revoked names (a declaration that adds no new name goes out as sent); capabilities: {} clears everything.`,
    );
  }
  if (n.createPath === undefined && Rt) {
    logFeatureBad("artifact_publish", "db_rules_reset_refused");
    let D = jsonStringify(tt);
    let fe = sanitizeDisplayText(D, {
      max: 600,
    });
    let K = gn && fe === D ? fe : "";
    let S = ft
      ? ` The sent user block likewise omits its stored scopes${Je() !== "" ? ` (${Je()})` : ""}: resend user with them as well, or user: {"scopes": []} to drop them.`
      : "";
    return publishError(
      `your capabilities declaration re-sends db without its rules while the artifact stores ${tt.length} ${plural(tt.length, "access rule")}${K !== "" ? `: ${K}` : ' (not listed here; read the artifact with action "read" to see them)'} \u2014 ` +
        `a sent db block replaces the stored one, rules included, so this publish would have reset them to the defaults (anyone who can open the artifact can read its shared data, and anyone with more than view-only access can write it). To keep them, ${K !== "" ? "resend db with those rules" : "publish with capabilities omitted (the stored declaration stays as it is), or read it back and resend db with its rules"}; to reset them on purpose, send db: {"rules": []}.` +
        S,
    );
  }
  if (n.createPath === undefined && ft) {
    logFeatureBad("artifact_publish", "user_scopes_reset_refused");
    let D = Je();
    return publishError(
      `your capabilities declaration re-sends user without its scopes while the artifact stores ${nt.length} ${plural(nt.length, "scope")}${D !== "" ? `: ${D}` : ""} \u2014 ` +
        `a sent user block replaces the stored one, scopes included, so this publish would have dropped ${nt.length === 1 ? "it" : "them"} (for profile, the page would no longer receive the viewer's name and avatar). To keep ${nt.length === 1 ? "it" : "them"}, ${D !== "" ? `resend user with scopes: ${D}` : "publish with capabilities omitted (the stored declaration stays as it is), or read it back and resend user with its scopes"}; to drop ${nt.length === 1 ? "it" : "them"} on purpose, send user: {"scopes": []}.`,
    );
  }
  let publishCapabilities = await resolvePublishCapabilities({
    capabilities: Te,
    echoPin: contractVersion,
    explicitPin: contract,
    upgrade,
    pageBytes: Y,
    ...(n.createPath !== undefined && {
      latestFetchRemedy: {
        retry: "nothing was created; retry.",
        refused: `Nothing was created; tell the user the page has to be created from ${CONTRACT_FETCH_SUBJECT}.`,
      },
    }),
    credentials: n.credentials,
  });
  if ("errMsg" in publishCapabilities) return publishError(publishCapabilities.errMsg);
  let fields = publishCapabilities.fields;
  let sent = {
    capNames: Object.keys(Te ?? {}).map(ve),
    hostDecl: usesLocalMcpServers(Te),
    latestContract: "contract" in fields && contract === null && contractVersion === null,
  };
  let pt;
  let It = (D) =>
    buildInstallationHealthDiagnostics(
      readBackAfterPublish(D, readBack ? slug : undefined, n.credentials, n.signal),
      [...Ve, ...Be],
    ).then((installationHealthDiagnostics) => {
      if (installationHealthDiagnostics.err === null && unnested !== undefined)
        logFeatureSad(
          "artifact_publish",
          unnested === "repaired" ? "nested_page_repaired" : "nested_repair_partial",
        );
      if (installationHealthDiagnostics.err === null && hoistedCommentsDropped)
        logFeatureSad("artifact_publish", "hoisted_comment_dropped");
      if (installationHealthDiagnostics.err !== null)
        return pt !== undefined &&
          installationHealthDiagnostics.strandedSlug === undefined &&
          !installationHealthDiagnostics.conflict &&
          !installationHealthDiagnostics.gone
          ? {
              ...installationHealthDiagnostics,
              reservedSlug: pt,
            }
          : installationHealthDiagnostics;
      return {
        ...notLivePathsResult(installationHealthDiagnostics, n.files ?? []),
        ...(Me !== undefined && {
          sentCapabilities: Me,
        }),
      };
    });
  let files = n.files ?? [];
  let removeFiles = n.removeFiles ?? [];
  if (files.length > 0 || copiedFiles.length > 0 || removeFiles.length > 0 || n.liveFiles !== undefined) {
    if (!isFrameMultiFileEnabled()) {
      logFeatureBad("artifact_publish", "multifile_flag_off", {
        n_files: files.length + copiedFiles.length,
        n_removed: removeFiles.length,
      });
      return publishError(
        removeFiles.length > 0
          ? "Supporting files can't be published or removed right now, so nothing was published or removed; the artifact is unchanged. Publishing the page on its own (omitting `files`) would update the page but can't remove a file."
          : "Supporting files can't be published right now, so nothing was published. Publish the page as a single file instead: inline what it needs and omit `files`.",
      );
    }
    if (copiedFiles.length > 0 && !isFrameCopyFromEnabled()) {
      logFeatureBad("artifact_publish", "copy_from_flag_off", {
        n_copied: copiedFiles.length,
      });
      return publishError(COPY_FROM_DISABLED_TEXT);
    }
    if (n.createPath !== undefined)
      return It(
        retryWithoutThumbnail(Ee, (D) =>
          publishFilesVersion(
            He,
            D,
            fields,
            undefined,
            false,
            {
              t0: startTime,
              pageBytes: Y,
              lane: "inline",
              isRedeploy,
              hasCaps,
              forced: false,
              ...(contractVersion !== null && {
                echoedPin: contractVersion,
              }),
              ...(n.liveFilesGate === true && {
                liveFilesOn: true,
              }),
              sent,
            },
            n.ownPublishes,
            n.credentials,
            n.createPath,
            n.onRetry,
            n.signal,
            files,
          ),
        ),
      );
    return It(
      retryWithoutThumbnail(Ee, (D, fe) =>
        sendFilesPublish(He, files, copiedFiles, removeFiles, D, fields, {
          baseVersion: fe ?? ye,
          force: Z,
          ...(n.liveFiles !== undefined && {
            liveFiles: n.liveFiles,
          }),
          ...(n.copiedCrossOrgOk === true && {
            copiedCrossOrgOk: true,
          }),
          ...(pt !== undefined && {
            reservedSlug: pt,
          }),
          ownPublishes: n.ownPublishes,
          tele: {
            t0: startTime,
            pageBytes: Y,
            lane: "inline",
            isRedeploy,
            hasCaps,
            forced: Z,
            ...(contractVersion !== null && {
              echoedPin: contractVersion,
            }),
            ...(n.liveFilesGate === true && {
              liveFilesOn: true,
            }),
            sent,
          },
          onRetry: n.onRetry,
          onReserved: (K) => {
            pt = K;
          },
          signal: n.signal,
          credentials: n.credentials,
          relayOnly: r,
        }),
      ),
    );
  }
  let Lt =
    slug === undefined && n.createPath === undefined && isFrameMultiFileEnabled()
      ? await reservePublishSlot(n.credentials, n.signal, startTime, r)
      : undefined;
  pt = Lt;
  if (n.signal?.aborted) return publishError("publish cancelled \u2014 nothing was published.");
  return It(
    retryWithoutThumbnail(Ee, (D) =>
      publishFilesVersion(
        He,
        D,
        fields,
        ye,
        Z,
        {
          t0: startTime,
          pageBytes: Y,
          lane: "inline",
          isRedeploy,
          hasCaps,
          forced: Z,
          ...(contractVersion !== null && {
            echoedPin: contractVersion,
          }),
          ...(n.liveFilesGate === true && {
            liveFilesOn: true,
          }),
          sent,
        },
        n.ownPublishes,
        n.credentials,
        n.createPath,
        n.onRetry,
        n.signal,
        undefined,
        Lt,
        r,
      ),
    ),
  );
}
//@ chunk-06y4szbn.js:91694-92307 placement
async function reservePublishSlot(credentials, signal, r, s) {
  if (signal?.aborted) return;
  try {
    let h = {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 30000,
      credentials,
      relayOnCredentialRefusal: true,
    };
    let b;
    try {
      b =
        s !== undefined
          ? await postRelayOnlyWithBusyWait("/api/frame/deploy/prepare", entrypointHint(), h, s, signal)
          : await frameApi.post("/api/frame/deploy/prepare", entrypointHint(), h);
    } catch (error) {
      if (error instanceof RelayOnlyUnsentError) return;
      throw error;
    }
    if (b.ok && b.status === 200 && typeof b.data?.slug === "string" && ARTIFACT_SLUG_RE.test(b.data.slug))
      return b.data.slug;
    if (!b.ok || (b.status !== 403 && b.status !== 404))
      logFeatureSad("artifact_publish", "reserve_unavailable", {
        reserve_status: b.ok ? b.status : 0,
      });
  } catch (error) {
    logFeatureSad("artifact_publish", "reserve_unavailable", {
      reserve_status: 0,
      ...getTransportErrorProps(error, r),
    });
  }
  return;
}
//@ chunk-06y4szbn.js:92307-92909 placement
async function retryWithoutThumbnail(e, n) {
  let r = await n(e);
  if (
    r.err === null ||
    r.thumbnailRejected === undefined ||
    r.strandedSlug !== undefined ||
    r.liveVersion !== undefined
  )
    return r;
  if (e.thumbnail === undefined && e.thumbnailDark === undefined) {
    logFeatureBad("artifact_publish", "thumbnail_rejected");
    return r;
  }
  logFeatureSad("artifact_publish", "thumbnail_rejected");
  let { thumbnail, thumbnailDark, ...b } = e;
  let y =
    r.created === undefined
      ? await n(b)
      : await n(
          {
            ...b,
            slug: r.created.slug,
          },
          r.created.version,
        );
  return y.err === null
    ? {
        ...y,
        warnings: [
          ...(y.warnings ?? []),
          `The custom thumbnail was not accepted by the server (${r.thumbnailRejected}); published with the automatic screenshot instead.`,
        ],
      }
    : y;
}
//@ chunk-06y4szbn.js:92909-93022 placement
function surfacedViaForEntrypoint() {
  if (getEntrypointKind() === "claude-vscode") return "epitaxy_pane";
  if (isHostEntrypoint()) return "desktop_pane";
  return "terminal_link";
}
//@ chunk-06y4szbn.js:93022-93456 placement
async function trackFrameEvent(eventName, n) {
  try {
    let r = await frameApi.post(
      "/api/frame/track",
      {
        event_name: eventName,
        ...(n.slug && {
          slug: n.slug,
        }),
        ...(n.via && {
          via: n.via,
        }),
        ...(n.mode && {
          mode: n.mode,
        }),
      },
      {
        refreshOAuth: true,
        headers: buildFrameHeaders(),
        timeout: 5000,
        credentials: n.credentials,
      },
    );
    if (!r.ok) logForDebugging(`[artifact] /track skipped: ${r.reason}`);
    else if (r.status !== 204) logForDebugging(`[artifact] /track ${r.status}: ${errBody(r.data)}`);
  } catch (error) {
    logForDebugging(`[artifact] /track failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
//@ chunk-06y4szbn.js:93456-93901 placement
/**
 * 每日发布上限错误的两个代码（frame_daily_publish_cap_reached / frame_daily_push_cap_reached）、schema 与两种计划文案，以及 publish 429 前缀与剩余次数响应头。
 */
var DAILY_CAP_CODES = ["frame_daily_publish_cap_reached", "frame_daily_push_cap_reached"];
var DAILY_CAP_KINDS = {
  frame_daily_publish_cap_reached: "daily_new",
  frame_daily_push_cap_reached: "daily_pushes",
};
var dailyCapErrorSchema = DoctorLazy(() =>
  u({
    error: _enum(DAILY_CAP_CODES),
    message: string().catch(""),
  }),
);
var DAILY_CAP_TEXTS = {
  daily_new: "daily new-artifact limit for your plan reached \u2014 resets at UTC midnight",
  daily_pushes: "daily publish limit for your plan reached \u2014 resets at UTC midnight",
};
var PUBLISH_CAP_FRAME = "publish 429: ";
var X_FRAME_PUSH_REMAINING = "x-frame-push-remaining";
//@ chunk-06y4szbn.js:93901-93997 placement
function parseIntHeader(e) {
  let n = typeof e === "string" ? e.trim() : "";
  return /^\d{1,9}$/.test(n) ? Number(n) : undefined;
}
//@ chunk-06y4szbn.js:93997-94116 placement
function dailyPublishResetEpochSeconds(e = Date.now()) {
  let date = new Date(e);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) / 1000;
}
//@ chunk-06y4szbn.js:94116-94226 placement
function dailyResetFromHeader(date) {
  let n = typeof date === "string" ? Date.parse(date) : Number.NaN;
  return dailyPublishResetEpochSeconds(Number.isFinite(n) ? n : Date.now());
}
//@ chunk-06y4szbn.js:94226-94390 placement
function dailyCapNotice(e) {
  let n = dailyCapErrorSchema().safeParse(e);
  if (!n.success) return;
  let r = DAILY_CAP_KINDS[n.data.error];
  let s = scrubServerLine(n.data.message, 200);
  let h = s !== "" ? s : DAILY_CAP_TEXTS[r];
  return {
    capType: r,
    message: `${PUBLISH_CAP_FRAME}${h}`,
  };
}
//@ chunk-06y4szbn.js:94390-94425 placement
/**
 * 发布重试参数：503 最多 3 次、退避基数 5 s、retry-after 上限 20 s、可接受 30 s 内的值。
 */
var MAX_503_RETRIES = 3;
var RETRY_BASE_MS = 5000;
var MAX_RETRY_AFTER_MS = 20000;
var MAX_RETRY_AFTER_ACCEPT_MS = 30000;
//@ chunk-06y4szbn.js:94425-94480 placement
function retryDelayMs(e) {
  let n = parseRetryAfterMs(e) ?? 2000;
  return n <= MAX_RETRY_AFTER_ACCEPT_MS ? n : undefined;
}
//@ chunk-06y4szbn.js:94480-94525 placement
function retryAfterDelay(e) {
  return Math.min(parseRetryAfterMs(e) ?? DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
}
//@ chunk-06y4szbn.js:94525-94673 placement
function backoffMs(e, n) {
  let rounded = Math.round(
    backoffDelayMs({
      attempt: e - 1,
      baseMs: RETRY_BASE_MS,
      jitter: {
        kind: "proportional",
        ratio: 0.25,
      },
    }),
  );
  let s = parseRetryAfterMs(n) ?? 0;
  return Math.min(Math.max(s, rounded), MAX_RETRY_AFTER_MS);
}
//@ chunk-06y4szbn.js:94673-94758 placement
class PublishError extends Error {
  startedAtMs;
  constructor(message, startedAtMs, r) {
    super(message, r);
    this.startedAtMs = startedAtMs;
  }
}
//@ chunk-06y4szbn.js:94758-94779 placement
class PublishTransportError extends PublishError {}
//@ chunk-06y4szbn.js:94779-94874 placement
class PublishRefusedError extends PublishError {
  seen;
  resent;
  constructor(e, n, r, seen, resent) {
    super(e, n, r);
    this.seen = seen;
    this.resent = resent;
  }
}
//@ chunk-06y4szbn.js:94874-94925 placement
function hasSeenTransportError(error) {
  return error.seen !== undefined && isStalledUpload(error.seen);
}
//@ chunk-06y4szbn.js:94925-95203 placement
function trackUploadBytes(e) {
  let jsonBytes = 0;
  let wireBytes = 0;
  return (s) => {
    jsonBytes += s.json_bytes;
    wireBytes += s.wire_bytes;
    e.json_bytes = jsonBytes;
    e.wire_bytes = wireBytes;
    e.body_gzip = e.body_gzip === true || s.body_gzip;
    if (s.gzip_skip !== undefined) e.gzip_skip = fromEnum(s.gzip_skip);
    if (s.gzip_fallback_status !== undefined) e.gzip_fallback_status ??= s.gzip_fallback_status;
  };
}
//@ chunk-06y4szbn.js:95203-95459 placement
function deployQuery(e, n) {
  let r = [
    ...(e.attemptId === undefined ? [] : [`attempt_id=${e.attemptId}`]),
    ...(e.attemptId !== undefined && e.resend ? ["resend=1"] : []),
    ...(n.createConfirmed === true ? [CREATE_CONFIRMED_QUERY] : []),
  ];
  return r.length === 0 ? "/api/frame/deploy/direct" : `/api/frame/deploy/direct?${r.join("&")}`;
}
//@ chunk-06y4szbn.js:95459-95847 placement
async function resendAfterTornBody(e, error, r) {
  let s = {
    ...getTransportErrorProps(error.cause, error.startedAtMs),
    ...error.seen,
  };
  logForDebugging(
    `[artifact] publish request died before its whole body left this machine (socket took ${s.bytes_flushed} of ${s.body_bytes} bytes) \u2014 re-sending once on a fresh connection`,
  );
  let deployFinalStatus = 0;
  try {
    let b = await e();
    deployFinalStatus = b.ok ? b.status : 0;
    return b;
  } finally {
    logFeatureSad("artifact_publish", "deploy_resent", {
      ...r,
      ...s,
      deploy_final_status: deployFinalStatus,
    });
  }
}
//@ chunk-06y4szbn.js:95847-95864 placement
var MAX_SETTLING_RETRIES = 2;
var DEFAULT_RETRY_AFTER_MS = 2000;
//@ chunk-06y4szbn.js:95864-95953 placement
function isPublishSettling(e) {
  return e.ok && e.fromFrame && e.status === 409 && refusalReasonOf(e.data) === "publish_settling";
}
//@ chunk-06y4szbn.js:95953-96038 placement
function isReplayedResponse(e) {
  return typeof e === "object" && e !== null && "replayed" in e && e.replayed === true;
}
//@ chunk-06y4szbn.js:96038-97033 placement
async function classifyPublishFailure(e, error, r, s) {
  let h = {
    ...getTransportErrorProps(error.cause, error.startedAtMs),
    ...(error instanceof PublishRefusedError && error.seen),
    ...(error.cause instanceof McpDoubtfulAnswerError && {
      deploy_first_status: error.cause.status,
    }),
    leg: fromEnum(error instanceof PublishTransportError ? "relay" : "direct"),
  };
  logForDebugging(
    "[artifact] publish request ended without a clear answer \u2014 re-sending it once, marked as a re-send, so a publish that already landed is answered rather than repeated",
  );
  let deployFinalStatus = 0;
  let y;
  let x = 0;
  let replayed = false;
  let R = false;
  try {
    let C = await e();
    y = fromEnum(C.route);
    while (isPublishSettling(C) && x < MAX_SETTLING_RETRIES) {
      let k = retryAfterDelay(C.response?.headers?.["retry-after"]);
      logForDebugging(
        `[artifact] the first attempt landed and its content is still being stored \u2014 re-sending in ${k}ms`,
      );
      await sleep(k, s);
      if (s?.aborted) break;
      x += 1;
      C = await e();
      y = fromEnum(C.route);
    }
    deployFinalStatus = C.ok ? C.status : 0;
    if (C.route === "direct" && isCredentialRefusal(C) && error instanceof PublishTransportError) {
      R = true;
      throw error;
    }
    replayed = C.ok && C.status >= 200 && C.status < 300 && isReplayedResponse(C.data);
    return C;
  } finally {
    logFeatureSad("artifact_publish", "deploy_resent", {
      ...r,
      ...h,
      deploy_final_status: deployFinalStatus,
      ...(y !== undefined && {
        resend_route: y,
      }),
      settle_resends: x,
      replayed,
      ...(R && {
        resend_refused: true,
      }),
      ...(s?.aborted && {
        cancelled: true,
      }),
    });
  }
}
//@ chunk-06y4szbn.js:97033-97220 placement
function isRetryablePublishResponse(e) {
  if (!e.ok || e.status === 408 || e.status === 499) return true;
  if (e.status === 429) return dailyCapNotice(e.data) === undefined;
  return (
    e.status >= 500 &&
    strandedSlugFrom(e.status, e.data) === null &&
    refusalReasonOf(e.data) !== "render_busy"
  );
}
//@ chunk-06y4szbn.js:97220-97241 placement
class PublishFailedError extends PublishError {}
//@ chunk-06y4szbn.js:97241-97409 placement
async function withPublishTiming(e) {
  let startTime = performance.now();
  try {
    return await e();
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError) throw error;
    throw new PublishFailedError(error instanceof Error ? error.message : String(error), startTime, {
      cause: error,
    });
  }
}
//@ chunk-06y4szbn.js:97409-97588 placement
function publishErrorTelemetry(error, n) {
  return error instanceof PublishError
    ? {
        ...getTransportErrorProps(error.cause, error.startedAtMs),
        ...(error instanceof PublishRefusedError &&
          error.resent && {
            resent: true,
          }),
        ...(error.cause instanceof McpDoubtfulAnswerError && {
          deploy_status: error.cause.status,
        }),
      }
    : getTransportErrorProps(error, n);
}
//@ chunk-06y4szbn.js:97588-98050 placement
async function postDeploy(e, n, credentials, s, onEncoding, b = {}, relayOnly = undefined, signal) {
  let w = {
    refreshOAuth: true,
    headers: buildFrameHeaders(),
    streamUpload: {
      tailFloorMs,
      onSettled: (k) => {
        b.seen = k;
        s(k);
      },
    },
    gzipBody: {
      tailFloorMs: tailFloorMs(undefined),
      onEncoding,
    },
    ...(b.freshConnection && {
      freshConnection: true,
    }),
    relayOnCredentialRefusal: true,
    maxBodyLength: 2 * MAX_ARTIFACT_BYTES,
    maxContentLength: MAX_PAGE_BYTES_FOR_STRIP,
    relayProbe: LATEST_CONTRACT_PATH_FRAME,
    credentials,
  };
  let C = await (
    relayOnly !== undefined ? postRelayOnlyWithBusyWait(e, n, w, relayOnly, signal) : frameApi.post(e, n, w)
  ).catch((error) => {
    if (error instanceof McpDoubtfulAnswerError) {
      b.seen = undefined;
      s(undefined);
    }
    throw error;
  });
  s(undefined);
  return C;
}
//@ chunk-06y4szbn.js:98050-98484 placement
function relayOnlyRefusalReason(e) {
  if (e.slug !== undefined || e.baseVersion !== undefined) return "names an existing artifact";
  if (e.force === true) return "sets force";
  if (e.capabilities !== undefined) return "declares capabilities";
  if (e.contract !== undefined) return "sets a contract";
  if ((e.removeFiles?.length ?? 0) > 0) return "removes files";
  if (
    e.createPath !== undefined ||
    e.liveFiles !== undefined ||
    (e.files ?? []).some((n) => n.live !== undefined || n.reseed === true)
  )
    return "makes or changes a live file";
  return;
}
//@ chunk-06y4szbn.js:98484-98553 placement
function isRelayOnlyUnsendable(e) {
  return (
    isRemoteManagedEnvironment() && (plannedRoute("POST", e, "only") !== "relay" || !isAccountIngressToken())
  );
}
//@ chunk-06y4szbn.js:98553-98868 placement
function relayOnlyUnsentResult(e) {
  logFeatureBad("artifact_publish", "relay_only_unsent", e);
  return {
    ...publishError(
      "Nothing was published: a publish made without asking must go through the cloud session's gateway, which could not carry it. Publishing it again now goes through the usual permission check, which may need a person's approval.",
    ),
    notCarried: true,
  };
}
//@ chunk-06y4szbn.js:98868-98942 placement
function publishCancelledResult() {
  return publishError("publish cancelled \u2014 nothing was published.");
}
//@ chunk-06y4szbn.js:98942-99006 placement
function isRelayOnlyCancelled(error) {
  return error instanceof Error && error.cause instanceof RelayOnlyCancelledError;
}
//@ chunk-06y4szbn.js:99006-99174 placement
class RelayOnlyUnsentError extends Error {
  constructor(e = "this request never reached the artifact server: the session gateway did not carry it") {
    super(e);
    this.name = "RelayOnlyUnsentError";
  }
}
//@ chunk-06y4szbn.js:99174-99348 placement
class RelayOnlyCancelledError extends RelayOnlyUnsentError {
  constructor() {
    super("this request was not sent again: the publish was cancelled while the session gateway was busy");
    this.name = "RelayOnlyCancelledError";
  }
}
//@ chunk-06y4szbn.js:99348-99361 placement
var RELAY_ONLY_BUSY_WAIT_MAX_MS = 5000;
//@ chunk-06y4szbn.js:99361-99723 placement
async function postRelayOnlyWithBusyWait(e, n, r, s, h) {
  for (let b = false; ; b = true) {
    if (isRelayOnlyUnsendable(e)) throw new RelayOnlyUnsentError();
    s.count += 1;
    let y = await frameApi.postRelayOnly(e, n, r);
    if (isRelayUnsent(y)) throw new RelayOnlyUnsentError();
    if (!y.ok || y.gatewayRetryAfterMs === undefined) return y;
    s.count -= 1;
    if (h?.aborted) throw new RelayOnlyCancelledError();
    if (b) {
      logFeatureSad("artifact_publish", "relay_only_busy");
      throw new RelayOnlyUnsentError();
    }
    await sleep(Math.min(y.gatewayRetryAfterMs, RELAY_ONLY_BUSY_WAIT_MAX_MS), h);
    if (h?.aborted) throw new RelayOnlyCancelledError();
  }
}
//@ chunk-06y4szbn.js:99723-99761 placement
function tailFloorMs(e) {
  return (publishReadDeadlineS(e) + 30) * 1000;
}
//@ chunk-06y4szbn.js:99761-102357 placement
/**
 * 发送部署请求并在断流/5xx/中继忙时有限重试（同一 attempt_id，必要时新连接重发）。
 */
async function deployWithRetry(e, n, r, s, h = false, b = false, y = false) {
  let attemptId = randomUUID();
  let w = false;
  let R = async (resent = false) => {
    let ge = {
      attemptId,
      ...(resent && {
        freshConnection: resent,
      }),
      ...(w && {
        resend: true,
      }),
    };
    let startTime = performance.now();
    try {
      let Z = await e(ge);
      s.wire = wireOf(Z);
      if (Z.mcpDoubt !== undefined) s.deploy_status = Z.mcpDoubt;
      return Z;
    } catch (error) {
      if (error instanceof RelayOnlyUnsentError) {
        if (C === 1 && y) throw error;
        throw new PublishRefusedError(
          outcomeUnknownMessage(
            error instanceof RelayOnlyCancelledError
              ? "the publish was cancelled before a later send of it went out"
              : "a later send of this publish could not go through the cloud session's gateway",
          ),
          startTime,
          {
            cause: error,
          },
          ge.seen,
          resent,
        );
      }
      s.wire = wireOfThrow(error);
      let Oe = errBody(error instanceof Error ? error.message : String(error));
      throw threwOnRelayLeg(error)
        ? new PublishTransportError(outcomeUnknownMessage(`relay request failed: ${Oe}`), startTime, {
            cause: error,
          })
        : new PublishRefusedError(
            error instanceof McpDoubtfulAnswerError
              ? malformedDeployResponse()
              : outcomeUnknownMessage(`deploy request failed: ${Oe}`),
            startTime,
            {
              cause: error,
            },
            ge.seen,
            resent,
          );
    }
  };
  let C = 1;
  let k;
  let V;
  try {
    k = await R();
  } catch (error) {
    if (r?.aborted) throw error;
    if (error instanceof PublishRefusedError && error.cause instanceof McpDoubtfulAnswerError) V = error;
    if (
      b &&
      (error instanceof PublishTransportError ||
        (error instanceof PublishRefusedError && (isTransportError(error.cause) || error === V)))
    ) {
      C += 1;
      w = true;
      k = await classifyPublishFailure(() => R(true), error, s, r);
    } else if (
      error instanceof PublishRefusedError &&
      isTransportError(error.cause) &&
      hasSeenTransportError(error)
    ) {
      C += 1;
      k = await resendAfterTornBody(() => R(true), error, s);
    } else throw error;
  }
  let L = false;
  let q;
  let W = (X) => {
    q ??= X.status === 429 ? 429 : 503;
    logForDebugging(
      `[artifact] /deploy/direct ${X.status} \u2014 retrying in ${X.delayMs}ms (attempt ${X.attempt} of ${X.maxAttempts})`,
    );
    n?.(X);
  };
  let G = async (X) => {
    await sleep(X, r);
    if (r?.aborted) {
      logForDebugging("[artifact] /deploy/direct retry cancelled by user");
      return false;
    }
    C += 1;
    L = true;
    k = await R();
    L = false;
    return true;
  };
  let P = () => {
    if (V !== undefined && isRetryablePublishResponse(k)) throw V;
    return k;
  };
  let j = k.ok && k.fromFrame && k.status === 503 && refusalReasonOf(k.data) === "render_busy";
  try {
    if (k.ok && k.fromFrame && k.status === 429) {
      if (dailyCapNotice(k.data) !== undefined) {
        logForDebugging("[artifact] /deploy/direct 429 is a plan cap \u2014 not retrying");
        return P();
      }
      let Z = retryDelayMs(k.response?.headers?.["retry-after"]);
      if (Z === undefined) return P();
      W({
        status: 429,
        attempt: 2,
        maxAttempts: 2,
        delayMs: Z,
      });
      await G(Z);
      return P();
    }
    if (j && k.ok) {
      let min = Math.min(parseRetryAfterMs(k.response?.headers?.["retry-after"]) ?? 1000, MAX_RETRY_AFTER_MS);
      W({
        status: 503,
        attempt: 2,
        maxAttempts: 2,
        delayMs: min,
      });
      await G(min);
      return P();
    }
    let X = 2;
    let ge = false;
    while (
      k.ok &&
      k.fromFrame &&
      k.status === 503 &&
      !(h && strandedSlugFrom(k.status, k.data)) &&
      X <= MAX_503_RETRIES
    ) {
      let Z = backoffMs(X, k.response?.headers?.["retry-after"]);
      W({
        status: 503,
        attempt: X,
        maxAttempts: MAX_503_RETRIES,
        delayMs: Z,
      });
      if (b && !w && !strandedSlugFrom(k.status, k.data)) {
        w = true;
        ge = true;
      }
      if (!(await G(Z))) break;
      X += 1;
    }
    let ie = 0;
    while (ge && isPublishSettling(k) && ie < MAX_SETTLING_RETRIES) {
      let Z = retryAfterDelay(k.response?.headers?.["retry-after"]);
      logForDebugging(
        `[artifact] an earlier attempt landed and its content is still being stored \u2014 re-sending in ${Z}ms`,
      );
      if (!(await G(Z))) break;
      ie += 1;
    }
    return P();
  } finally {
    if (q !== undefined) {
      logFeatureSad("artifact_publish", q === 503 ? "deploy_503_retried" : "deploy_429_retried", {
        ...s,
        deploy_attempts: C,
        deploy_final_status: L || !k.ok ? 0 : k.status,
        ...(r?.aborted && {
          cancelled: true,
        }),
        ...(j && {
          render_busy: true,
        }),
      });
      n?.({
        settled: true,
      });
    }
  }
}
//@ chunk-06y4szbn.js:102357-102721 placement
function droppedFieldOn400(e, n) {
  if (!(n.ok && n.fromFrame && n.status === 400)) return;
  let r = formatFrameErrorBody(n.data);
  let matches = UNKNOWN_FIELD_ERROR_RE.test(r);
  if (carriesDeadline(e) && matches && /["']deadline["']/.test(r)) return "deadline";
  if (requestIdMeta(e.requestId).request_id !== undefined && matches && /["']request_id["']/.test(r))
    return "request_id";
  if (
    e.icon &&
    ((matches && /["']icon["']/.test(r)) || /^icon (?:must be|and tint can only)\b/.test(r.trimStart()))
  )
    return "icon";
  return;
}
//@ chunk-06y4szbn.js:102721-102876 placement
function withoutField(e, n) {
  switch (n) {
    case "deadline":
      return {
        ...e,
        deadline: undefined,
      };
    case "icon":
      return {
        ...e,
        icon: undefined,
      };
    case "request_id":
      return {
        ...e,
        requestId: undefined,
      };
  }
}
//@ chunk-06y4szbn.js:102876-103001 placement
function wrongArtifactAnswer() {
  return outcomeUnknownMessage(
    "the server answered for a different artifact than the one targeted, so its answer was not adopted",
  );
}
//@ chunk-06y4szbn.js:103001-103080 placement
function malformedDeployResponse() {
  return outcomeUnknownMessage("deploy returned an incomplete or malformed response");
}
export {
  publishArtifactPage,
  trackUploadBytes,
  deployWithRetry,
  postDeploy,
  deployQuery,
  droppedFieldOn400,
  withoutField,
  wrongArtifactAnswer,
  backoffMs,
  RelayOnlyUnsentError,
  RelayOnlyCancelledError,
  malformedDeployResponse,
  parseIntHeader,
  X_FRAME_PUSH_REMAINING,
  dailyResetFromHeader,
  publishCancelledResult,
  relayOnlyUnsentResult,
  isRelayOnlyCancelled,
  PublishTransportError,
  publishErrorTelemetry,
  retryDelayMs,
  dailyCapNotice,
  withPublishTiming,
  postRelayOnlyWithBusyWait,
  dailyPublishResetEpochSeconds,
  PUBLISH_CAP_FRAME,
  surfacedViaForEntrypoint,
  trackFrameEvent,
  RELAY_ONLY_BUSY_WAIT_MAX_MS,
};
