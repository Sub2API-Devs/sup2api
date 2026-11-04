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
import { objectSchema, _enum, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { isStalledUpload } from "../../utils/teleport/api.js";
import { McpDoubtfulAnswerError } from "./artifactMcpWire.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isAccountIngressToken } from "../ccrAgentProxy/agentProxy.js";
import { publishReadDeadlineS } from "./framePublish.js";
import { isTransportError } from "../http/externalHttp.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:75207-91694 placement
/**
 * 发布 artifact 页面的主流程：准备页面、能力与契约、预留、上传（直连或中继）、处理冲突/限流/日上限/缩略图并记录本方发布。
 */
async function publishArtifactPage(body, input, relayOnly) {
  let startTime = performance.now();
  let relayOnlyProblem = relayOnly !== undefined ? relayOnlyRefusalReason(input) : undefined;
  if (relayOnlyProblem !== undefined) {
    logFeatureBad("artifact_publish", "relay_only_not_fresh_page");
    return {
      ...publishError(
        `Nothing was published: a publish made without asking may only create a new artifact, naming no url and setting no capabilities, contract, force, file removals or live files, but this one ${relayOnlyProblem}. Every publish in this session now goes through the usual permission check, which may need a person's approval.`,
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
  } = input;
  let copiedFiles = input.copiedFiles ?? [];
  if (
    input.createPath !== undefined &&
    (slug !== undefined ||
      input.force === true ||
      input.baseVersion !== undefined ||
      copiedFiles.length > 0 ||
      (input.removeFiles !== undefined && input.removeFiles.length > 0) ||
      input.liveFiles !== undefined)
  ) {
    logFeatureBad("artifact_publish", "create_bad_combo");
    return publishError("invalid publish options");
  }
  let isRedeploy = !!slug;
  let hasCaps = capabilities !== undefined;
  let baseVersionSupported = isFrameBaseVersionEnabled();
  let forced = input.force === true;
  let touchesFiles =
    (input.files?.length ?? 0) > 0 ||
    copiedFiles.length > 0 ||
    (input.removeFiles?.length ?? 0) > 0 ||
    input.liveFiles !== undefined;
  let baseVersion =
    input.autoEditAttribution !== undefined || touchesFiles
      ? input.baseVersion
      : baseVersionSupported
        ? input.baseVersion
        : undefined;
  let meta = {
    slug,
    title,
    favicon,
    ...(icon && {
      icon,
    }),
    label,
    note,
    ...(slug !== undefined &&
      input.deadline !== undefined && {
        deadline: input.deadline,
      }),
    ...(input.requestId !== undefined && {
      requestId: input.requestId,
    }),
    createConfirmed: input.createConfirmed,
    description,
    publishContext,
    originMetadata,
    ...(input.autoEditAttribution && {
      autoEditAttribution: input.autoEditAttribution,
    }),
    ...(input.createPath === undefined &&
      input.thumbnail && {
        thumbnail: input.thumbnail,
      }),
    ...(input.createPath === undefined &&
      input.thumbnailDark && {
        thumbnailDark: input.thumbnailDark,
      }),
  };
  let filesProblem = validateSupportingFiles(input.files ?? []);
  if (filesProblem !== null) return filesProblem;
  let artifactBody = await prepareArtifactBody(body, {
    injectDiagramRuntime: input.injectDiagramRuntime,
    injectHighlightRuntime: input.injectHighlightRuntime,
    expectRoundTrippedPage: input.expectRoundTrippedPage,
  });
  let html = composeArtifactPage(artifactBody.body, artifactBody.roundTripLang, artifactBody.roundTripCover);
  let pageBytes = Buffer.byteLength(html, "utf8");
  let { body: body_2, mermaidInjected, hljsInjected, unnested, hoistedCommentsDropped } = artifactBody;
  let baseProblems = hasSuspiciousBaseHref(body_2)
    ? [isFrameMultiFileEnabled() ? BASE_HREF_TEXT : BASE_HREF_OUTSIDE_TEXT_SINGLE]
    : [];
  if (pageBytes > MAX_ARTIFACT_BYTES) {
    logFeatureBad("artifact_publish", "too_large", {
      page_bytes: pageBytes,
      mermaid_injected: mermaidInjected,
      hljs_injected: hljsInjected,
    });
    return publishError(
      `too large: rendered page is ${Math.ceil(pageBytes / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)` +
        (hljsInjected
          ? " \u2014 includes the inline syntax-highlight runtime (~0.6MB), added because the page contains fenced code"
          : ""),
    );
  }
  meta.template = "plain";
  let sentCaps = capabilities;
  let warnings = [];
  let declaredServers = [];
  if (capabilities !== undefined && session !== undefined) {
    let { connectorNames, serverNames } = session;
    let mcpResult = normalizeMcpCapability(capabilities, connectorNames, serverNames, {
      hostServers,
    });
    if (
      mcpResult.ok &&
      hostServers === undefined &&
      mcpResult.servers.some((server) => getLocalServerName(server) !== undefined)
    ) {
      let liveState = getLiveState();
      let epoch = liveState.accountEpoch;
      let caps = await resolveContract({
        timeoutMs: CONTRACT_FETCH_TIMEOUT_MS,
        ...(input.signal && {
          signal: input.signal,
        }),
        credentials: input.credentials,
      });
      if (!("err" in caps)) {
        saveRosterToConfig({
          session: liveState,
          epoch,
          roster: caps,
          storageV5: undefined,
        });
        let hostOk = hasFeatureFlag(caps, "mcp", HOST);
        input.noteHostServers?.(hostOk);
        if (!hostOk)
          mcpResult = normalizeMcpCapability(capabilities, connectorNames, serverNames, {
            hostServers: false,
          });
      } else
        logFeatureSad("artifact_publish", "host_roster_fetch_failed", {
          cause: fromEnum(caps.cause),
        });
    }
    if (!mcpResult.ok) {
      let hostUnavailableCount = count(mcpResult.malformed, (item) => item.kind === "host_unavailable");
      let unknownToolsCount = count(mcpResult.malformed, (item) => item.kind === "unknown_tools");
      let opaqueIdCount = count(
        mcpResult.malformed,
        (item) =>
          item.kind === "opaque_id" ||
          item.kind === "known_id" ||
          item.kind === "tool_name" ||
          item.kind === "connector_as_host" ||
          item.kind === "undeclarable_name",
      );
      let firstPartyCollisionCount = count(
        mcpResult.malformed,
        (item) => item.kind === "local_server_as_first_party",
      );
      logFeatureBad(
        "artifact_publish",
        hostUnavailableCount > 0
          ? "host_server_unavailable"
          : mcpResult.internal.length > 0
            ? "internal_host_server_name"
            : firstPartyCollisionCount > 0
              ? "first_party_server_collision"
              : mcpResult.unresolved.length > 0
                ? "unresolved_mcp_server"
                : opaqueIdCount > 0
                  ? "opaque_mcp_server_id"
                  : unknownToolsCount > 0
                    ? "unknown_mcp_tool"
                    : mcpResult.malformed.length > 0
                      ? "malformed_mcp_manifest"
                      : "mcp_manifest_over_caps",
        {
          page_bytes: pageBytes,
          unresolved_count: mcpResult.unresolved.length,
          internal_count: mcpResult.internal.length,
          malformed_count:
            mcpResult.malformed.length - opaqueIdCount - hostUnavailableCount - unknownToolsCount,
          opaque_id_count: opaqueIdCount,
          host_unavailable_count: hostUnavailableCount,
          unknown_tools_count: unknownToolsCount,
          oversized_count: mcpResult.oversized.length,
          ...(mcpResult.serverCount !== null && {
            server_count: mcpResult.serverCount,
          }),
        },
      );
      let problems = describeCapabilityProblems(mcpResult.malformed);
      if (mcpResult.unresolved.length > 0) {
        let listed = capListForDisplay(mcpResult.unresolved, 8, (name) => `"${sanitizeConnectorName(name)}"`);
        let filtered = connectorNames.filter(isDeclarableServer);
        let knownList = capListForDisplay(
          uniq(filtered.map((conn) => conn.server)),
          8,
          (name) => `"${sanitizeConnectorName(name)}"`,
        );
        let knownSuffix = knownList.length === 0 ? "" : ` (connectors this session: ${knownList.join(", ")})`;
        let any = filtered.some((conn) => normalizeUuidOrNull(conn.toolPrefix) !== null);
        problems.push(
          `unknown ${plural(mcpResult.unresolved.length, "connector")}: ${listed.join(", ")} \u2014 ` +
            (any
              ? "set `server` to the connector's exact display name"
              : `set \`server\` to the segment between \`mcp__\` and the next \`__\` of a tool name from this session (for \`mcp__${slackConnectorName()}__search\`, use \`${slackConnectorName()}\`, copied exactly), or to the connector's exact display name`) +
            `${knownSuffix}. The control plane would accept this manifest, but the page would break at view time`,
        );
      }
      if (mcpResult.internal.length > 0) {
        let names = capListForDisplay(
          uniq(mcpResult.internal),
          8,
          (name) => `"${sanitizeConnectorName(name)}"`,
        );
        problems.push(
          `built-in ${plural(mcpResult.internal.length, "server")} ${names.join(", ")} ` +
            "\u2014 the Claude app's own servers, which it never exposes to " +
            "pages as host servers; declare only servers from the MCP configuration (host:<name> for the `mcp__<name>__<tool>` tools of a server you configured). The control plane would accept this manifest, but the page would break at view time",
        );
      }
      for (let oversized of mcpResult.oversized)
        problems.push(
          `${describeServerKind(oversized.server)} "${sanitizeConnectorName(oversized.server)}" declares ${oversized.toolCount} tools, counted after any same-name entries merge (max ${MAX_SANITIZED_TEXT}) \u2014 trim the tools ` +
            "list; the control plane would reject it anyway",
        );
      if (mcpResult.serverCount !== null)
        problems.push(
          `manifest declares ${mcpResult.serverCount} servers (max ${MAX_LISTED_MCP_SERVERS}) \u2014 declare only the servers ` +
            "the page actually calls; the control plane would reject it anyway",
        );
      return publishError(`mcp manifest rejected: ${problems.join("; ")}.`);
    }
    sentCaps = mcpResult.caps;
    warnings = mcpResult.warnings;
    declaredServers = mcpResult.servers;
    let texts = [
      body,
      ...(input.files ?? []).flatMap((file) =>
        MANIFEST_TEXT_TYPES.has(file.contentType) ? [bufferToText(file.content)] : [],
      ),
    ];
    let undeclared =
      mcpResult.servers.length > 0 ? findUndeclaredMcpToolCalls(texts, mcpResult.servers, 64) : [];
    let filtered = findMentionedTools(texts, mcpResult.renamed).filter(
      ([name]) => !undeclared.includes(name),
    );
    if (filtered.length > 0)
      warnings = [
        ...warnings,
        `the page source still holds ${plural(filtered.length, "a server name", "server names")} this publish rewrote in the manifest, as ${plural(filtered.length, "a quoted string", "quoted strings")} \u2014 ${capListForDisplay(filtered, 8, ([oldName, newName]) => `"${sanitizeConnectorName(oldName)}" (viewers resolve only "${sanitizeConnectorName(newName)}")`).join(", ")} \u2014 so if the page passes ${filtered.length === 1 ? "it" : "them"} to callTool(\u2026) / watchTool(\u2026), those calls fail for every viewer; use the display ${plural(filtered.length, "name")} there.`,
      ];
  } else if (capabilities !== undefined) {
    let localCount = listLocalServerDeclarations(capabilities).length;
    if (localCount > 0)
      logFeatureSad("artifact_publish", "slug_without_pairs", {
        page_bytes: pageBytes,
        slug_count: localCount,
      });
  }
  let keys = Object.keys(sentCaps ?? {});
  let cappedCaps;
  let grant = readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT);
  if (sentCaps !== undefined) {
    let grant_2 = applyHostGrant(sentCaps, grant);
    if (!grant_2.ok) {
      logFeatureBad("artifact_publish", "host_grant_unreadable", {
        page_bytes: pageBytes,
        host_server_count: grant_2.refused.length,
      });
      let refusedList = capListForDisplay(grant_2.refused, 8, (name) => `"${sanitizeConnectorName(name)}"`);
      return publishError(
        `mcp manifest rejected: this computer's local-server grant (${CLAUDE_ARTIFACT_HOST_GRANT_ENV}, set by the app that launched this session; not something to fix from here) could not be read, so ` +
          `no host: server can be declared from this session \u2014 ${refusedList.join(", ")}; declare only claude.ai connectors (set "server" to the connector's display name), or to publish without connector access leave "mcp" out of capabilities (pass capabilities: {} to clear a stored declaration).`,
      );
    }
    if (grant_2.dropped.length > 0) {
      logFeatureSad("artifact_publish", "host_grant_narrowed", {
        page_bytes: pageBytes,
        dropped_count: grant_2.dropped.length,
      });
      sentCaps = grant_2.caps;
      declaredServers = declaredServers.filter((server) => grant_2.servers.includes(server));
      let them = grant_2.dropped.length === 1 ? "it" : "them";
      cappedCaps = grant_2.caps;
      warnings = [
        ...warnings,
        `this computer did not grant the page these local tools, so they were left out of the manifest: ${describeCapabilityTools(grant_2.dropped)} \u2014 the page's ` +
          `calls to ${them} fail for every viewer; tell the user which local tools were left out` +
          (grant_2.servers.length === 0
            ? ', and that the page now has no connector access at all (no declared server remained, so this publish carries no "mcp" and any stored "mcp" declaration is replaced)'
            : "") +
          ".",
      ];
    }
  }
  if (session !== undefined && declaredServers.length > 0) {
    let texts = [
      body,
      ...(input.files ?? []).flatMap((file) =>
        MANIFEST_TEXT_TYPES.has(file.contentType) ? [bufferToText(file.content)] : [],
      ),
    ];
    let undeclaredMcpToolCalls = findUndeclaredMcpToolCalls(texts, declaredServers, 64);
    if (undeclaredMcpToolCalls.length > 0)
      warnings = [
        ...warnings,
        `the page calls callTool/watchTool with ${plural(undeclaredMcpToolCalls.length, "a server name", "server names")} not in this manifest \u2014 ${capListForDisplay(undeclaredMcpToolCalls, 8, (name) => `"${sanitizeConnectorName(name)}"`).join(", ")} \u2014 and ${isDynamicMcp((cappedCaps ?? sentCaps)?.mcp) ? "under this dynamic declaration each viewer is asked to approve them at first use (a name the viewer has no connector for is refused)" : "those calls fail for every viewer"}; the manifest declares ${capListForDisplay(declaredServers, 8, (name) => `"${sanitizeConnectorName(name)}"`).join(", ")}.`,
      ];
  }
  if (
    input.contract !== undefined &&
    input.contract !== "latest" &&
    (!CONTRACT_VERSION_REGEX.test(input.contract) || input.contract === UNVERSIONED_CONTRACT)
  ) {
    logFeatureBad("artifact_publish", "invalid_contract", {
      page_bytes: pageBytes,
    });
    return publishError(
      `invalid contract ${jsonStringify(input.contract)} \u2014 pass 'latest' ` +
        "or a published version like 0.1.0.",
    );
  }
  let upgrade = input.contract === "latest";
  let contract = input.contract !== undefined && input.contract !== "latest" ? input.contract : null;
  let contractSpecified = input.contract !== undefined;
  let storedPin = slug && !contractSpecified ? input.storedPin : null;
  let storedCaps;
  if (slug && !contractSpecified && storedPin === undefined) {
    let frameDecl = await readFrameDecl(slug, undefined, input.credentials);
    if (
      frameDecl !== null &&
      "err" in frameDecl &&
      input.onPinReadError !== "assume_none" &&
      isRetryableReadBack(frameDecl)
    ) {
      let backTelemetry = readBackTelemetry(frameDecl);
      await sleep(READBACK_RETRY_MS, input.signal);
      if (!input.signal?.aborted) {
        frameDecl = await readFrameDecl(slug, input.signal, input.credentials);
        logFeatureSad("artifact_publish", "pin_readback_retried", {
          page_bytes: pageBytes,
          ...backTelemetry,
          recovered: !(frameDecl !== null && "err" in frameDecl),
        });
      }
    }
    if (frameDecl !== null && "err" in frameDecl) {
      if (input.onPinReadError === "assume_none") {
        logFeatureSad("artifact_publish", "pin_readback_assumed_none", {
          page_bytes: pageBytes,
        });
        storedPin = null;
      } else {
        logFeatureBad("artifact_publish", "pin_readback_failed", {
          page_bytes: pageBytes,
          ...readBackTelemetry(frameDecl),
        });
        return publishError(
          `couldn't read the artifact's stored contract pin (${frameDecl.err}) \u2014 ` +
            "a republish preserves the stored pin, so this publish cannot proceed without it. This is usually transient: retry. If the read keeps failing and you intend to move the artifact to the current contract anyway, pass contract: 'latest' (this changes the page's runtime semantics).",
        );
      }
    } else {
      storedPin = frameDecl === null ? null : parseContractVersion(frameDecl.contract);
      storedCaps = frameDecl?.capabilities ?? {};
    }
  }
  let contractVersion = parseContractVersion(storedPin);
  if (slug && storedCaps === undefined && Object.keys(capabilities ?? {}).length > 0) {
    let frameDecl = await readFrameDecl(slug, undefined, input.credentials);
    if (
      frameDecl !== null &&
      "err" in frameDecl &&
      input.contract === undefined &&
      isRetryableReadBack(frameDecl)
    ) {
      await sleep(READBACK_RETRY_MS, input.signal);
      if (!input.signal?.aborted) frameDecl = await readFrameDecl(slug, undefined, input.credentials);
    }
    if (frameDecl !== null && "err" in frameDecl) {
      if (input.contract === undefined) {
        logFeatureBad("artifact_publish", "capability_readback_failed", {
          page_bytes: pageBytes,
          ...readBackTelemetry(frameDecl),
        });
        return publishError(
          `couldn't read the artifact's stored capability declaration (${frameDecl.err}) \u2014 ` +
            "a republish that declares capabilities must not silently revoke stored ones, so this publish cannot proceed without it. This is usually transient: retry. If the read keeps failing and you intend to move the artifact to the current contract anyway, pass contract: 'latest' (this changes the page's runtime semantics, and the capabilities you send then replace the stored ones).",
        );
      }
      logFeatureSad("artifact_publish", "retrofit_guard_skipped");
    } else storedCaps = frameDecl?.capabilities ?? {};
  }
  if (capabilities === undefined && slug) {
    let carryCheck = await checkHostGrantCarry({
      slug,
      hostGrant: grant,
      storedCaps,
      signal: input.signal,
      credentials: input.credentials,
      pageBytes,
      lane: "page",
    });
    if (!carryCheck.ok) return publishError(carryCheck.err);
    storedCaps = carryCheck.storedCaps;
  }
  let capKey = (key) => (key === SELF ? ARTIFACT_CAPABILITY_KEY : key);
  let mapped = Object.keys(storedCaps ?? {}).map(capKey);
  let mapped_2 = keys.map(capKey);
  let filtered = Object.entries(storedCaps ?? {}).filter(([key]) => !mapped_2.includes(capKey(key)));
  let storedDbRules = getUserClaudeRulesDir_2(storedCaps?.db) ?? [];
  let db = sentCaps?.db;
  let dbRulesReset =
    storedDbRules.length > 0 && (db === true || (isPlainObjectConnector(db) && !Object.hasOwn(db, "rules")));
  let dbRulesValid = isValidDbRules(storedDbRules);
  let storedScopes = getUserScopes(storedCaps?.user) ?? [];
  let user = sentCaps?.user;
  let scopesDropped =
    storedScopes.length > 0 &&
    (user === true || (isPlainObjectConnector(user) && !Object.hasOwn(user, "scopes")));
  let scopesValid = isValidScopeList(storedScopes);
  let scopesText = () => {
    let json = jsonStringify(storedScopes);
    let clean = sanitizeDisplayText(json, {
      max: 200,
    });
    return scopesValid && clean === json ? clean : "";
  };
  if (
    input.createPath === undefined &&
    filtered.length > 0 &&
    mapped_2.some((key) => !mapped.includes(key))
  ) {
    logFeatureBad("artifact_publish", "capability_retrofit_refused");
    let missingList = capListForDisplay(filtered, 8, ([name]) => sanitizeDisplayText(name));
    let mergedDecl = jsonStringify({
      ...Object.fromEntries(filtered),
      ...sentCaps,
      ...(dbRulesReset && {
        db: storedCaps?.db,
      }),
      ...(scopesDropped && {
        user: storedCaps?.user,
      }),
    });
    let cleanDecl = sanitizeDisplayText(mergedDecl, {
      max: 600,
    });
    let mentionsDb = dbRulesReset || filtered.some(([name]) => name === "db");
    let mentionsUser = scopesDropped || filtered.some(([name]) => name === "user");
    let suggestion =
      cleanDecl === mergedDecl &&
      !/[<>]/.test(foldLookalikeChars(mergedDecl)) &&
      scrubArtifactEnvelopeTags(mergedDecl) === mergedDecl &&
      (!mentionsDb || isValidDbCapability(storedCaps?.db)) &&
      (!mentionsUser || isValidUserCapability(storedCaps?.user))
        ? cleanDecl
        : "";
    return publishError(
      `your capabilities declaration omits the stored ${plural(filtered.length, "capability", "capabilities")} ${missingList.join(", ")} while adding new ones \u2014 a sent declaration replaces the stored one, so this publish would have silently revoked ${filtered.length === 1 ? "it" : "them"}. To keep ${filtered.length === 1 ? "it" : "them"}, republish declaring the union${suggestion !== "" ? `: ${suggestion}` : " (republish with capabilities omitted to read the stored declaration back, then resend it plus your additions)"}. To revoke on purpose, publish that union first, then republish without the revoked names (a declaration that adds no new name goes out as sent); capabilities: {} clears everything.`,
    );
  }
  if (input.createPath === undefined && dbRulesReset) {
    logFeatureBad("artifact_publish", "db_rules_reset_refused");
    let json = jsonStringify(storedDbRules);
    let clean = sanitizeDisplayText(json, {
      max: 600,
    });
    let listing = dbRulesValid && clean === json ? clean : "";
    let userNote = scopesDropped
      ? ` The sent user block likewise omits its stored scopes${scopesText() !== "" ? ` (${scopesText()})` : ""}: resend user with them as well, or user: {"scopes": []} to drop them.`
      : "";
    return publishError(
      `your capabilities declaration re-sends db without its rules while the artifact stores ${storedDbRules.length} ${plural(storedDbRules.length, "access rule")}${listing !== "" ? `: ${listing}` : ' (not listed here; read the artifact with action "read" to see them)'} \u2014 ` +
        `a sent db block replaces the stored one, rules included, so this publish would have reset them to the defaults (anyone who can open the artifact can read its shared data, and anyone with more than view-only access can write it). To keep them, ${listing !== "" ? "resend db with those rules" : "publish with capabilities omitted (the stored declaration stays as it is), or read it back and resend db with its rules"}; to reset them on purpose, send db: {"rules": []}.` +
        userNote,
    );
  }
  if (input.createPath === undefined && scopesDropped) {
    logFeatureBad("artifact_publish", "user_scopes_reset_refused");
    let scopes = scopesText();
    return publishError(
      `your capabilities declaration re-sends user without its scopes while the artifact stores ${storedScopes.length} ${plural(storedScopes.length, "scope")}${scopes !== "" ? `: ${scopes}` : ""} \u2014 ` +
        `a sent user block replaces the stored one, scopes included, so this publish would have dropped ${storedScopes.length === 1 ? "it" : "them"} (for profile, the page would no longer receive the viewer's name and avatar). To keep ${storedScopes.length === 1 ? "it" : "them"}, ${scopes !== "" ? `resend user with scopes: ${scopes}` : "publish with capabilities omitted (the stored declaration stays as it is), or read it back and resend user with its scopes"}; to drop ${storedScopes.length === 1 ? "it" : "them"} on purpose, send user: {"scopes": []}.`,
    );
  }
  let publishCapabilities = await resolvePublishCapabilities({
    capabilities: sentCaps,
    echoPin: contractVersion,
    explicitPin: contract,
    upgrade,
    pageBytes,
    ...(input.createPath !== undefined && {
      latestFetchRemedy: {
        retry: "nothing was created; retry.",
        refused: `Nothing was created; tell the user the page has to be created from ${CONTRACT_FETCH_SUBJECT}.`,
      },
    }),
    credentials: input.credentials,
  });
  if ("errMsg" in publishCapabilities) return publishError(publishCapabilities.errMsg);
  let fields = publishCapabilities.fields;
  let sent = {
    capNames: Object.keys(sentCaps ?? {}).map(capKey),
    hostDecl: usesLocalMcpServers(sentCaps),
    latestContract: "contract" in fields && contract === null && contractVersion === null,
  };
  let reservedSlug;
  let diagnoseAndReturn = (published) =>
    buildInstallationHealthDiagnostics(
      readBackAfterPublish(published, readBack ? slug : undefined, input.credentials, input.signal),
      [...warnings, ...baseProblems],
    ).then((installationHealthDiagnostics) => {
      if (installationHealthDiagnostics.err === null && unnested !== undefined)
        logFeatureSad(
          "artifact_publish",
          unnested === "repaired" ? "nested_page_repaired" : "nested_repair_partial",
        );
      if (installationHealthDiagnostics.err === null && hoistedCommentsDropped)
        logFeatureSad("artifact_publish", "hoisted_comment_dropped");
      if (installationHealthDiagnostics.err !== null)
        return reservedSlug !== undefined &&
          installationHealthDiagnostics.strandedSlug === undefined &&
          !installationHealthDiagnostics.conflict &&
          !installationHealthDiagnostics.gone
          ? {
              ...installationHealthDiagnostics,
              reservedSlug,
            }
          : installationHealthDiagnostics;
      return {
        ...notLivePathsResult(installationHealthDiagnostics, input.files ?? []),
        ...(cappedCaps !== undefined && {
          sentCapabilities: cappedCaps,
        }),
      };
    });
  let files = input.files ?? [];
  let removeFiles = input.removeFiles ?? [];
  if (files.length > 0 || copiedFiles.length > 0 || removeFiles.length > 0 || input.liveFiles !== undefined) {
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
    if (input.createPath !== undefined)
      return diagnoseAndReturn(
        retryWithoutThumbnail(meta, (payload) =>
          publishFilesVersion(
            html,
            payload,
            fields,
            undefined,
            false,
            {
              t0: startTime,
              pageBytes,
              lane: "inline",
              isRedeploy,
              hasCaps,
              forced: false,
              ...(contractVersion !== null && {
                echoedPin: contractVersion,
              }),
              ...(input.liveFilesGate === true && {
                liveFilesOn: true,
              }),
              sent,
            },
            input.ownPublishes,
            input.credentials,
            input.createPath,
            input.onRetry,
            input.signal,
            files,
          ),
        ),
      );
    return diagnoseAndReturn(
      retryWithoutThumbnail(meta, (meta2, echoedPin) =>
        sendFilesPublish(html, files, copiedFiles, removeFiles, meta2, fields, {
          baseVersion: echoedPin ?? baseVersion,
          force: forced,
          ...(input.liveFiles !== undefined && {
            liveFiles: input.liveFiles,
          }),
          ...(input.copiedCrossOrgOk === true && {
            copiedCrossOrgOk: true,
          }),
          ...(reservedSlug !== undefined && {
            reservedSlug,
          }),
          ownPublishes: input.ownPublishes,
          tele: {
            t0: startTime,
            pageBytes,
            lane: "inline",
            isRedeploy,
            hasCaps,
            forced,
            ...(contractVersion !== null && {
              echoedPin: contractVersion,
            }),
            ...(input.liveFilesGate === true && {
              liveFilesOn: true,
            }),
            sent,
          },
          onRetry: input.onRetry,
          onReserved: (slug) => {
            reservedSlug = slug;
          },
          signal: input.signal,
          credentials: input.credentials,
          relayOnly,
        }),
      ),
    );
  }
  let reserved =
    slug === undefined && input.createPath === undefined && isFrameMultiFileEnabled()
      ? await reservePublishSlot(input.credentials, input.signal, startTime, relayOnly)
      : undefined;
  reservedSlug = reserved;
  if (input.signal?.aborted) return publishError("publish cancelled \u2014 nothing was published.");
  return diagnoseAndReturn(
    retryWithoutThumbnail(meta, (payload) =>
      publishFilesVersion(
        html,
        payload,
        fields,
        baseVersion,
        forced,
        {
          t0: startTime,
          pageBytes,
          lane: "inline",
          isRedeploy,
          hasCaps,
          forced,
          ...(contractVersion !== null && {
            echoedPin: contractVersion,
          }),
          ...(input.liveFilesGate === true && {
            liveFilesOn: true,
          }),
          sent,
        },
        input.ownPublishes,
        input.credentials,
        input.createPath,
        input.onRetry,
        input.signal,
        undefined,
        reserved,
        relayOnly,
      ),
    ),
  );
}
//@ chunk-06y4szbn.js:91694-92307 placement
async function reservePublishSlot(credentials, signal, busyWaitMs, busyWaitBudget) {
  if (signal?.aborted) return;
  try {
    let requestOptions = {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 30000,
      credentials,
      relayOnCredentialRefusal: true,
    };
    let res;
    try {
      res =
        busyWaitBudget !== undefined
          ? await postRelayOnlyWithBusyWait(
              "/api/frame/deploy/prepare",
              entrypointHint(),
              requestOptions,
              busyWaitBudget,
              signal,
            )
          : await frameApi.post("/api/frame/deploy/prepare", entrypointHint(), requestOptions);
    } catch (error) {
      if (error instanceof RelayOnlyUnsentError) return;
      throw error;
    }
    if (
      res.ok &&
      res.status === 200 &&
      typeof res.data?.slug === "string" &&
      ARTIFACT_SLUG_RE.test(res.data.slug)
    )
      return res.data.slug;
    if (!res.ok || (res.status !== 403 && res.status !== 404))
      logFeatureSad("artifact_publish", "reserve_unavailable", {
        reserve_status: res.ok ? res.status : 0,
      });
  } catch (error) {
    logFeatureSad("artifact_publish", "reserve_unavailable", {
      reserve_status: 0,
      ...getTransportErrorProps(error, busyWaitMs),
    });
  }
  return;
}
//@ chunk-06y4szbn.js:92307-92909 placement
async function retryWithoutThumbnail(input, publishOnce) {
  let result = await publishOnce(input);
  if (
    result.err === null ||
    result.thumbnailRejected === undefined ||
    result.strandedSlug !== undefined ||
    result.liveVersion !== undefined
  )
    return result;
  if (input.thumbnail === undefined && input.thumbnailDark === undefined) {
    logFeatureBad("artifact_publish", "thumbnail_rejected");
    return result;
  }
  logFeatureSad("artifact_publish", "thumbnail_rejected");
  let { thumbnail, thumbnailDark, ...withoutThumbnail } = input;
  let retryResult =
    result.created === undefined
      ? await publishOnce(withoutThumbnail)
      : await publishOnce(
          {
            ...withoutThumbnail,
            slug: result.created.slug,
          },
          result.created.version,
        );
  return retryResult.err === null
    ? {
        ...retryResult,
        warnings: [
          ...(retryResult.warnings ?? []),
          `The custom thumbnail was not accepted by the server (${result.thumbnailRejected}); published with the automatic screenshot instead.`,
        ],
      }
    : retryResult;
}
//@ chunk-06y4szbn.js:92909-93022 placement
function surfacedViaForEntrypoint() {
  if (getEntrypointKind() === "claude-vscode") return "epitaxy_pane";
  if (isHostEntrypoint()) return "desktop_pane";
  return "terminal_link";
}
//@ chunk-06y4szbn.js:93022-93456 placement
async function trackFrameEvent(eventName, properties) {
  try {
    let res = await frameApi.post(
      "/api/frame/track",
      {
        event_name: eventName,
        ...(properties.slug && {
          slug: properties.slug,
        }),
        ...(properties.via && {
          via: properties.via,
        }),
        ...(properties.mode && {
          mode: properties.mode,
        }),
      },
      {
        refreshOAuth: true,
        headers: buildFrameHeaders(),
        timeout: 5000,
        credentials: properties.credentials,
      },
    );
    if (!res.ok) logForDebugging(`[artifact] /track skipped: ${res.reason}`);
    else if (res.status !== 204) logForDebugging(`[artifact] /track ${res.status}: ${errBody(res.data)}`);
  } catch (error) {
    logForDebugging(`[artifact] /track failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
//@ chunk-06y4szbn.js:93456-93901 placement
/**
 * 每日发布上限错误的两个代码（frame_daily_publish_cap_reached / frame_daily_push_cap_reached）、schema 与两种计划文案，以及 publish 429 前缀与剩余次数响应头。
 */
var DAILY_CAP_CODES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DAILY_CAP_KINDS;
var dailyCapErrorSchema;
var DAILY_CAP_TEXTS;
var PUBLISH_CAP_FRAME;
var X_FRAME_PUSH_REMAINING;
deferInit("chunk-06y4szbn.js:93456", () => {
  DAILY_CAP_CODES = ["frame_daily_publish_cap_reached", "frame_daily_push_cap_reached"];
  DAILY_CAP_KINDS = {
    frame_daily_publish_cap_reached: "daily_new",
    frame_daily_push_cap_reached: "daily_pushes",
  };
  dailyCapErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: _enum(DAILY_CAP_CODES),
      message: stringSchema().catch(""),
    }),
  );
  DAILY_CAP_TEXTS = {
    daily_new: "daily new-artifact limit for your plan reached \u2014 resets at UTC midnight",
    daily_pushes: "daily publish limit for your plan reached \u2014 resets at UTC midnight",
  };
  PUBLISH_CAP_FRAME = "publish 429: ";
  X_FRAME_PUSH_REMAINING = "x-frame-push-remaining";
});
//@ chunk-06y4szbn.js:93901-93997 placement
function parseIntHeader(value) {
  let text = typeof value === "string" ? value.trim() : "";
  return /^\d{1,9}$/.test(text) ? Number(text) : undefined;
}
//@ chunk-06y4szbn.js:93997-94116 placement
function dailyPublishResetEpochSeconds(now = Date.now()) {
  let date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) / 1000;
}
//@ chunk-06y4szbn.js:94116-94226 placement
function dailyResetFromHeader(date) {
  let ms = typeof date === "string" ? Date.parse(date) : Number.NaN;
  return dailyPublishResetEpochSeconds(Number.isFinite(ms) ? ms : Date.now());
}
//@ chunk-06y4szbn.js:94226-94390 placement
function dailyCapNotice(body) {
  let parsed = dailyCapErrorSchema().safeParse(body);
  if (!parsed.success) return;
  let kind = DAILY_CAP_KINDS[parsed.data.error];
  let serverLine = scrubServerLine(parsed.data.message, 200);
  let text = serverLine !== "" ? serverLine : DAILY_CAP_TEXTS[kind];
  return {
    capType: kind,
    message: `${PUBLISH_CAP_FRAME}${text}`,
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
function retryDelayMs(headerValue) {
  let delayMs = parseRetryAfterMs(headerValue) ?? 2000;
  return delayMs <= MAX_RETRY_AFTER_ACCEPT_MS ? delayMs : undefined;
}
//@ chunk-06y4szbn.js:94480-94525 placement
function retryAfterDelay(headerValue) {
  return Math.min(parseRetryAfterMs(headerValue) ?? DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
}
//@ chunk-06y4szbn.js:94525-94673 placement
function backoffMs(attempt, retryAfterHeader) {
  let rounded = Math.round(
    backoffDelayMs({
      attempt: attempt - 1,
      baseMs: RETRY_BASE_MS,
      jitter: {
        kind: "proportional",
        ratio: 0.25,
      },
    }),
  );
  let retryAfterMs = parseRetryAfterMs(retryAfterHeader) ?? 0;
  return Math.min(Math.max(retryAfterMs, rounded), MAX_RETRY_AFTER_MS);
}
//@ chunk-06y4szbn.js:94673-94758 placement
class PublishError extends Error {
  startedAtMs;
  constructor(message, startedAtMs, options) {
    super(message, options);
    this.startedAtMs = startedAtMs;
  }
}
//@ chunk-06y4szbn.js:94758-94779 placement
let PublishTransportError; // deferred: uses PublishError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:94758", () => {
  PublishTransportError = class PublishTransportError extends PublishError {};
});
//@ chunk-06y4szbn.js:94779-94874 placement
let PublishRefusedError; // deferred: uses PublishError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:94779", () => {
  PublishRefusedError = class PublishRefusedError extends PublishError {
    seen;
    resent;
    constructor(message, startedAtMs, options, seen, resent) {
      super(message, startedAtMs, options);
      this.seen = seen;
      this.resent = resent;
    }
  };
});
//@ chunk-06y4szbn.js:94874-94925 placement
function hasSeenTransportError(error) {
  return error.seen !== undefined && isStalledUpload(error.seen);
}
//@ chunk-06y4szbn.js:94925-95203 placement
function trackUploadBytes(input) {
  let jsonBytes = 0;
  let wireBytes = 0;
  return (publishInput) => {
    jsonBytes += publishInput.json_bytes;
    wireBytes += publishInput.wire_bytes;
    input.json_bytes = jsonBytes;
    input.wire_bytes = wireBytes;
    input.body_gzip = input.body_gzip === true || publishInput.body_gzip;
    if (publishInput.gzip_skip !== undefined) input.gzip_skip = fromEnum(publishInput.gzip_skip);
    if (publishInput.gzip_fallback_status !== undefined)
      input.gzip_fallback_status ??= publishInput.gzip_fallback_status;
  };
}
//@ chunk-06y4szbn.js:95203-95459 placement
function deployQuery(path, params) {
  let parts = [
    ...(path.attemptId === undefined ? [] : [`attempt_id=${path.attemptId}`]),
    ...(path.attemptId !== undefined && path.resend ? ["resend=1"] : []),
    ...(params.createConfirmed === true ? [CREATE_CONFIRMED_QUERY] : []),
  ];
  return parts.length === 0 ? "/api/frame/deploy/direct" : `/api/frame/deploy/direct?${parts.join("&")}`;
}
//@ chunk-06y4szbn.js:95459-95847 placement
async function resendAfterTornBody(post, error, publishError) {
  let seen = {
    ...getTransportErrorProps(error.cause, error.startedAtMs),
    ...error.seen,
  };
  logForDebugging(
    `[artifact] publish request died before its whole body left this machine (socket took ${seen.bytes_flushed} of ${seen.body_bytes} bytes) \u2014 re-sending once on a fresh connection`,
  );
  let deployFinalStatus = 0;
  try {
    let res = await post();
    deployFinalStatus = res.ok ? res.status : 0;
    return res;
  } finally {
    logFeatureSad("artifact_publish", "deploy_resent", {
      ...publishError,
      ...seen,
      deploy_final_status: deployFinalStatus,
    });
  }
}
//@ chunk-06y4szbn.js:95847-95864 placement
var MAX_SETTLING_RETRIES = 2;
var DEFAULT_RETRY_AFTER_MS = 2000;
//@ chunk-06y4szbn.js:95864-95953 placement
function isPublishSettling(res) {
  return res.ok && res.fromFrame && res.status === 409 && refusalReasonOf(res.data) === "publish_settling";
}
//@ chunk-06y4szbn.js:95953-96038 placement
function isReplayedResponse(res) {
  return typeof res === "object" && res !== null && "replayed" in res && res.replayed === true;
}
//@ chunk-06y4szbn.js:96038-97033 placement
async function classifyPublishFailure(post, error, failureError, signal) {
  let seen = {
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
  let res;
  let attempt = 0;
  let replayed = false;
  let resent = false;
  try {
    let response = await post();
    res = fromEnum(response.route);
    while (isPublishSettling(response) && attempt < MAX_SETTLING_RETRIES) {
      let delayMs = retryAfterDelay(response.response?.headers?.["retry-after"]);
      logForDebugging(
        `[artifact] the first attempt landed and its content is still being stored \u2014 re-sending in ${delayMs}ms`,
      );
      await sleep(delayMs, signal);
      if (signal?.aborted) break;
      attempt += 1;
      response = await post();
      res = fromEnum(response.route);
    }
    deployFinalStatus = response.ok ? response.status : 0;
    if (
      response.route === "direct" &&
      isCredentialRefusal(response) &&
      error instanceof PublishTransportError
    ) {
      resent = true;
      throw error;
    }
    replayed =
      response.ok && response.status >= 200 && response.status < 300 && isReplayedResponse(response.data);
    return response;
  } finally {
    logFeatureSad("artifact_publish", "deploy_resent", {
      ...failureError,
      ...seen,
      deploy_final_status: deployFinalStatus,
      ...(res !== undefined && {
        resend_route: res,
      }),
      settle_resends: attempt,
      replayed,
      ...(resent && {
        resend_refused: true,
      }),
      ...(signal?.aborted && {
        cancelled: true,
      }),
    });
  }
}
//@ chunk-06y4szbn.js:97033-97220 placement
function isRetryablePublishResponse(res) {
  if (!res.ok || res.status === 408 || res.status === 499) return true;
  if (res.status === 429) return dailyCapNotice(res.data) === undefined;
  return (
    res.status >= 500 &&
    strandedSlugFrom(res.status, res.data) === null &&
    refusalReasonOf(res.data) !== "render_busy"
  );
}
//@ chunk-06y4szbn.js:97220-97241 placement
let PublishFailedError; // deferred: uses PublishError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:97220", () => {
  PublishFailedError = class PublishFailedError extends PublishError {};
});
//@ chunk-06y4szbn.js:97241-97409 placement
async function withPublishTiming(post) {
  let startTime = performance.now();
  try {
    return await post();
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError) throw error;
    throw new PublishFailedError(error instanceof Error ? error.message : String(error), startTime, {
      cause: error,
    });
  }
}
//@ chunk-06y4szbn.js:97409-97588 placement
function publishErrorTelemetry(error, telemetry) {
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
    : getTransportErrorProps(error, telemetry);
}
//@ chunk-06y4szbn.js:97588-98050 placement
async function postDeploy(
  path,
  body,
  credentials,
  onSeen,
  onEncoding,
  state = {},
  busyWait = undefined,
  signal,
) {
  let requestOptions = {
    refreshOAuth: true,
    headers: buildFrameHeaders(),
    streamUpload: {
      tailFloorMs,
      onSettled: (seen) => {
        state.seen = seen;
        onSeen(seen);
      },
    },
    gzipBody: {
      tailFloorMs: tailFloorMs(undefined),
      onEncoding,
    },
    ...(state.freshConnection && {
      freshConnection: true,
    }),
    relayOnCredentialRefusal: true,
    maxBodyLength: 2 * MAX_ARTIFACT_BYTES,
    maxContentLength: MAX_PAGE_BYTES_FOR_STRIP,
    relayProbe: LATEST_CONTRACT_PATH_FRAME,
    credentials,
  };
  let res = await (
    busyWait !== undefined
      ? postRelayOnlyWithBusyWait(path, body, requestOptions, busyWait, signal)
      : frameApi.post(path, body, requestOptions)
  ).catch((error) => {
    if (error instanceof McpDoubtfulAnswerError) {
      state.seen = undefined;
      onSeen(undefined);
    }
    throw error;
  });
  onSeen(undefined);
  return res;
}
//@ chunk-06y4szbn.js:98050-98484 placement
function relayOnlyRefusalReason(body) {
  if (body.slug !== undefined || body.baseVersion !== undefined) return "names an existing artifact";
  if (body.force === true) return "sets force";
  if (body.capabilities !== undefined) return "declares capabilities";
  if (body.contract !== undefined) return "sets a contract";
  if ((body.removeFiles?.length ?? 0) > 0) return "removes files";
  if (
    body.createPath !== undefined ||
    body.liveFiles !== undefined ||
    (body.files ?? []).some((file) => file.live !== undefined || file.reseed === true)
  )
    return "makes or changes a live file";
  return;
}
//@ chunk-06y4szbn.js:98484-98553 placement
function isRelayOnlyUnsendable(path) {
  return (
    isRemoteManagedEnvironment() &&
    (plannedRoute("POST", path, "only") !== "relay" || !isAccountIngressToken())
  );
}
//@ chunk-06y4szbn.js:98553-98868 placement
function relayOnlyUnsentResult(path) {
  logFeatureBad("artifact_publish", "relay_only_unsent", path);
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
  constructor(
    message = "this request never reached the artifact server: the session gateway did not carry it",
  ) {
    super(message);
    this.name = "RelayOnlyUnsentError";
  }
}
//@ chunk-06y4szbn.js:99174-99348 placement
let RelayOnlyCancelledError; // deferred: uses RelayOnlyUnsentError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:99174", () => {
  RelayOnlyCancelledError = class RelayOnlyCancelledError extends RelayOnlyUnsentError {
    constructor() {
      super("this request was not sent again: the publish was cancelled while the session gateway was busy");
      this.name = "RelayOnlyCancelledError";
    }
  };
});
//@ chunk-06y4szbn.js:99348-99361 placement
var RELAY_ONLY_BUSY_WAIT_MAX_MS = 5000;
//@ chunk-06y4szbn.js:99361-99723 placement
async function postRelayOnlyWithBusyWait(path, body, options, busyWait, signal) {
  for (let retried = false; ; retried = true) {
    if (isRelayOnlyUnsendable(path)) throw new RelayOnlyUnsentError();
    busyWait.count += 1;
    let res = await frameApi.postRelayOnly(path, body, options);
    if (isRelayUnsent(res)) throw new RelayOnlyUnsentError();
    if (!res.ok || res.gatewayRetryAfterMs === undefined) return res;
    busyWait.count -= 1;
    if (signal?.aborted) throw new RelayOnlyCancelledError();
    if (retried) {
      logFeatureSad("artifact_publish", "relay_only_busy");
      throw new RelayOnlyUnsentError();
    }
    await sleep(Math.min(res.gatewayRetryAfterMs, RELAY_ONLY_BUSY_WAIT_MAX_MS), signal);
    if (signal?.aborted) throw new RelayOnlyCancelledError();
  }
}
//@ chunk-06y4szbn.js:99723-99761 placement
function tailFloorMs(options) {
  return (publishReadDeadlineS(options) + 30) * 1000;
}
//@ chunk-06y4szbn.js:99761-102357 placement
/**
 * 发送部署请求并在断流/5xx/中继忙时有限重试（同一 attempt_id，必要时新连接重发）。
 */
async function deployWithRetry(
  postOnce,
  onRetryStatus,
  signal,
  telemetry,
  allowStranded = false,
  retryFresh = false,
  throwUnsent = false,
) {
  let attemptId = randomUUID();
  let resentOnce = false;
  let attemptSend = async (resent = false) => {
    let requestState = {
      attemptId,
      ...(resent && {
        freshConnection: resent,
      }),
      ...(resentOnce && {
        resend: true,
      }),
    };
    let startTime = performance.now();
    try {
      let res = await postOnce(requestState);
      telemetry.wire = wireOf(res);
      if (res.mcpDoubt !== undefined) telemetry.deploy_status = res.mcpDoubt;
      return res;
    } catch (error) {
      if (error instanceof RelayOnlyUnsentError) {
        if (attemptCount === 1 && throwUnsent) throw error;
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
          requestState.seen,
          resent,
        );
      }
      telemetry.wire = wireOfThrow(error);
      let errText = errBody(error instanceof Error ? error.message : String(error));
      throw threwOnRelayLeg(error)
        ? new PublishTransportError(outcomeUnknownMessage(`relay request failed: ${errText}`), startTime, {
            cause: error,
          })
        : new PublishRefusedError(
            error instanceof McpDoubtfulAnswerError
              ? malformedDeployResponse()
              : outcomeUnknownMessage(`deploy request failed: ${errText}`),
            startTime,
            {
              cause: error,
            },
            requestState.seen,
            resent,
          );
    }
  };
  let attemptCount = 1;
  let res;
  let doubtfulError;
  try {
    res = await attemptSend();
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof PublishRefusedError && error.cause instanceof McpDoubtfulAnswerError)
      doubtfulError = error;
    if (
      retryFresh &&
      (error instanceof PublishTransportError ||
        (error instanceof PublishRefusedError && (isTransportError(error.cause) || error === doubtfulError)))
    ) {
      attemptCount += 1;
      resentOnce = true;
      res = await classifyPublishFailure(() => attemptSend(true), error, telemetry, signal);
    } else if (
      error instanceof PublishRefusedError &&
      isTransportError(error.cause) &&
      hasSeenTransportError(error)
    ) {
      attemptCount += 1;
      res = await resendAfterTornBody(() => attemptSend(true), error, telemetry);
    } else throw error;
  }
  let slept = false;
  let retriedStatus;
  let reportRetry = (info) => {
    retriedStatus ??= info.status === 429 ? 429 : 503;
    logForDebugging(
      `[artifact] /deploy/direct ${info.status} \u2014 retrying in ${info.delayMs}ms (attempt ${info.attempt} of ${info.maxAttempts})`,
    );
    onRetryStatus?.(info);
  };
  let sleepAndResend = async (delayMs) => {
    await sleep(delayMs, signal);
    if (signal?.aborted) {
      logForDebugging("[artifact] /deploy/direct retry cancelled by user");
      return false;
    }
    attemptCount += 1;
    slept = true;
    res = await attemptSend();
    slept = false;
    return true;
  };
  let finish = () => {
    if (doubtfulError !== undefined && isRetryablePublishResponse(res)) throw doubtfulError;
    return res;
  };
  let isRenderBusy =
    res.ok && res.fromFrame && res.status === 503 && refusalReasonOf(res.data) === "render_busy";
  try {
    if (res.ok && res.fromFrame && res.status === 429) {
      if (dailyCapNotice(res.data) !== undefined) {
        logForDebugging("[artifact] /deploy/direct 429 is a plan cap \u2014 not retrying");
        return finish();
      }
      let delayMs = retryDelayMs(res.response?.headers?.["retry-after"]);
      if (delayMs === undefined) return finish();
      reportRetry({
        status: 429,
        attempt: 2,
        maxAttempts: 2,
        delayMs,
      });
      await sleepAndResend(delayMs);
      return finish();
    }
    if (isRenderBusy && res.ok) {
      let min = Math.min(
        parseRetryAfterMs(res.response?.headers?.["retry-after"]) ?? 1000,
        MAX_RETRY_AFTER_MS,
      );
      reportRetry({
        status: 503,
        attempt: 2,
        maxAttempts: 2,
        delayMs: min,
      });
      await sleepAndResend(min);
      return finish();
    }
    let attempt = 2;
    let settlingRetryPending = false;
    while (
      res.ok &&
      res.fromFrame &&
      res.status === 503 &&
      !(allowStranded && strandedSlugFrom(res.status, res.data)) &&
      attempt <= MAX_503_RETRIES
    ) {
      let delayMs = backoffMs(attempt, res.response?.headers?.["retry-after"]);
      reportRetry({
        status: 503,
        attempt,
        maxAttempts: MAX_503_RETRIES,
        delayMs,
      });
      if (retryFresh && !resentOnce && !strandedSlugFrom(res.status, res.data)) {
        resentOnce = true;
        settlingRetryPending = true;
      }
      if (!(await sleepAndResend(delayMs))) break;
      attempt += 1;
    }
    let settlingAttempts = 0;
    while (settlingRetryPending && isPublishSettling(res) && settlingAttempts < MAX_SETTLING_RETRIES) {
      let delayMs = retryAfterDelay(res.response?.headers?.["retry-after"]);
      logForDebugging(
        `[artifact] an earlier attempt landed and its content is still being stored \u2014 re-sending in ${delayMs}ms`,
      );
      if (!(await sleepAndResend(delayMs))) break;
      settlingAttempts += 1;
    }
    return finish();
  } finally {
    if (retriedStatus !== undefined) {
      logFeatureSad("artifact_publish", retriedStatus === 503 ? "deploy_503_retried" : "deploy_429_retried", {
        ...telemetry,
        deploy_attempts: attemptCount,
        deploy_final_status: slept || !res.ok ? 0 : res.status,
        ...(signal?.aborted && {
          cancelled: true,
        }),
        ...(isRenderBusy && {
          render_busy: true,
        }),
      });
      onRetryStatus?.({
        settled: true,
      });
    }
  }
}
//@ chunk-06y4szbn.js:102357-102721 placement
function droppedFieldOn400(input, error) {
  if (!(error.ok && error.fromFrame && error.status === 400)) return;
  let text = formatFrameErrorBody(error.data);
  let matches = UNKNOWN_FIELD_ERROR_RE.test(text);
  if (carriesDeadline(input) && matches && /["']deadline["']/.test(text)) return "deadline";
  if (requestIdMeta(input.requestId).request_id !== undefined && matches && /["']request_id["']/.test(text))
    return "request_id";
  if (
    input.icon &&
    ((matches && /["']icon["']/.test(text)) || /^icon (?:must be|and tint can only)\b/.test(text.trimStart()))
  )
    return "icon";
  return;
}
//@ chunk-06y4szbn.js:102721-102876 placement
function withoutField(input, field) {
  switch (field) {
    case "deadline":
      return {
        ...input,
        deadline: undefined,
      };
    case "icon":
      return {
        ...input,
        icon: undefined,
      };
    case "request_id":
      return {
        ...input,
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
