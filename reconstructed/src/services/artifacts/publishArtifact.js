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
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
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
  tl,
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
  Ml,
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
import { resolveContract, ll } from "./contract.js";
import { saveRosterToConfig, slackConnectorName } from "./capabilityRoster.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { count, uniq } from "../../utils/collections.js";
import { sanitizeConnectorName, zit, k4 } from "./connectorNames.js";
import { Vt } from "../../utils/agentId.js";
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
import { bv } from "../../utils/confusables.js";
import { scrubArtifactEnvelopeTags, scrubServerLine } from "../../tools/ArtifactTool/artifactUrls.js";
import { buildInstallationHealthDiagnostics } from "../../utils/status.js";
import {
  buildFrameHeaders,
  getTransportErrorProps,
  CREATE_CONFIRMED_QUERY,
  formatFrameErrorBody,
  UNKNOWN_FIELD_ERROR_RE,
  Kxe,
} from "./frameApi.js";
import { I1t } from "./requestMeta.js";
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
import { u, U, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { Gki } from "../../utils/teleport/api.js";
import { McpDoubtfulAnswerError } from "./artifactMcpWire.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { isAccountIngressToken } from "../ccrAgentProxy/agentProxy.js";
import { y3r } from "./framePublish.js";
import { isTransportError } from "../http/externalHttp.js";

/**
 * 发布 artifact 页面的主流程：准备页面、能力与契约、预留、上传（直连或中继）、处理冲突/限流/日上限/缩略图并记录本方发布。
 */
//@ chunk-06y4szbn.js:75207-91694 placement
async function publishArtifactPage(e, n, r) {
  let startTime = performance.now(),
    h = r !== void 0 ? relayOnlyRefusalReason(n) : void 0;
  if (h !== void 0)
    return (
      logFeatureBad("artifact_publish", "relay_only_not_fresh_page"),
      {
        ...publishError(
          `Nothing was published: a publish made without asking may only create a new artifact, naming no url and setting no capabilities, contract, force, file removals or live files, but this one ${h}. Every publish in this session now goes through the usual permission check, which may need a person's approval.`,
        ),
        refusedShape: !0,
      }
    );
  let {
      slug: slug,
      title: title,
      favicon: favicon,
      icon: icon,
      label: label,
      note: note,
      description: description,
      capabilities: capabilities,
      session: session,
      hostServers: hostServers,
      readBack: readBack,
      publishContext: publishContext,
      originMetadata: originMetadata,
    } = n,
    j = n.copiedFiles ?? [];
  if (
    n.createPath !== void 0 &&
    (slug !== void 0 ||
      n.force === !0 ||
      n.baseVersion !== void 0 ||
      j.length > 0 ||
      (n.removeFiles !== void 0 && n.removeFiles.length > 0) ||
      n.liveFiles !== void 0)
  )
    return (logFeatureBad("artifact_publish", "create_bad_combo"), publishError("invalid publish options"));
  let X = !!slug,
    ge = capabilities !== void 0,
    ie = isFrameBaseVersionEnabled(),
    Z = n.force === !0,
    Oe =
      (n.files?.length ?? 0) > 0 ||
      j.length > 0 ||
      (n.removeFiles?.length ?? 0) > 0 ||
      n.liveFiles !== void 0,
    ye = n.autoEditAttribution !== void 0 || Oe ? n.baseVersion : ie ? n.baseVersion : void 0,
    Ee = {
      slug: slug,
      title: title,
      favicon: favicon,
      ...(icon && { icon: icon }),
      label: label,
      note: note,
      ...(slug !== void 0 && n.deadline !== void 0 && { deadline: n.deadline }),
      ...(n.requestId !== void 0 && { requestId: n.requestId }),
      createConfirmed: n.createConfirmed,
      description: description,
      publishContext: publishContext,
      originMetadata: originMetadata,
      ...(n.autoEditAttribution && { autoEditAttribution: n.autoEditAttribution }),
      ...(n.createPath === void 0 && n.thumbnail && { thumbnail: n.thumbnail }),
      ...(n.createPath === void 0 && n.thumbnailDark && { thumbnailDark: n.thumbnailDark }),
    },
    bt = validateSupportingFiles(n.files ?? []);
  if (bt !== null) return bt;
  let Xe = await prepareArtifactBody(e, {
      injectDiagramRuntime: n.injectDiagramRuntime,
      injectHighlightRuntime: n.injectHighlightRuntime,
      expectRoundTrippedPage: n.expectRoundTrippedPage,
    }),
    He = composeArtifactPage(Xe.body, Xe.roundTripLang, Xe.roundTripCover),
    byteLength = Buffer.byteLength(He, "utf8"),
    {
      body: body,
      mermaidInjected: mermaidInjected,
      hljsInjected: hljsInjected,
      unnested: unnested,
      hoistedCommentsDropped: hoistedCommentsDropped,
    } = Xe,
    Be = hasSuspiciousBaseHref(body) ? [isFrameMultiFileEnabled() ? BASE_HREF_TEXT : Ml] : [];
  if (byteLength > MAX_ARTIFACT_BYTES)
    return (
      logFeatureBad("artifact_publish", "too_large", {
        page_bytes: byteLength,
        mermaid_injected: mermaidInjected,
        hljs_injected: hljsInjected,
      }),
      publishError(
        `too large: rendered page is ${Math.ceil(byteLength / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)` +
          (hljsInjected
            ? " \u2014 includes the inline syntax-highlight runtime (~0.6MB), added because the page contains fenced code"
            : ""),
      )
    );
  Ee.template = "plain";
  let Te = capabilities,
    Ve = [],
    $e = [];
  if (capabilities !== void 0 && session !== void 0) {
    let { connectorNames: connectorNames, serverNames: serverNames } = session,
      K = normalizeMcpCapability(capabilities, connectorNames, serverNames, { hostServers: hostServers });
    if (K.ok && hostServers === void 0 && K.servers.some((server) => getLocalServerName(server) !== void 0)) {
      let ce = getLiveState(),
        accountEpoch = ce.accountEpoch,
        Ie = await resolveContract({
          timeoutMs: ll,
          ...(n.signal && { signal: n.signal }),
          credentials: n.credentials,
        });
      if (!("err" in Ie)) {
        saveRosterToConfig({ session: ce, epoch: accountEpoch, roster: Ie, storageV5: void 0 });
        let Fe = hasFeatureFlag(Ie, "mcp", HOST);
        if ((n.noteHostServers?.(Fe), !Fe))
          K = normalizeMcpCapability(capabilities, connectorNames, serverNames, { hostServers: !1 });
      } else logFeatureSad("artifact_publish", "host_roster_fetch_failed", { cause: fromEnum(Ie.cause) });
    }
    if (!K.ok) {
      let ce = count(K.malformed, (be) => be.kind === "host_unavailable"),
        Ae = count(K.malformed, (be) => be.kind === "unknown_tools"),
        Ie = count(
          K.malformed,
          (be) =>
            be.kind === "opaque_id" ||
            be.kind === "known_id" ||
            be.kind === "tool_name" ||
            be.kind === "connector_as_host" ||
            be.kind === "undeclarable_name",
        ),
        Fe = count(K.malformed, (be) => be.kind === "local_server_as_first_party");
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
          page_bytes: byteLength,
          unresolved_count: K.unresolved.length,
          internal_count: K.internal.length,
          malformed_count: K.malformed.length - Ie - ce - Ae,
          opaque_id_count: Ie,
          host_unavailable_count: ce,
          unknown_tools_count: Ae,
          oversized_count: K.oversized.length,
          ...(K.serverCount !== null && { server_count: K.serverCount }),
        },
      );
      let Ge = describeCapabilityProblems(K.malformed);
      if (K.unresolved.length > 0) {
        let be = capListForDisplay(K.unresolved, 8, (Le) => `"${sanitizeConnectorName(Le)}"`),
          filtered = connectorNames.filter(zit),
          qe = capListForDisplay(
            uniq(filtered.map((Le) => Le.server)),
            8,
            (Le) => `"${sanitizeConnectorName(Le)}"`,
          ),
          bn = qe.length === 0 ? "" : ` (connectors this session: ${qe.join(", ")})`,
          any = filtered.some((Le) => Vt(Le.toolPrefix) !== null);
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
    ((Te = K.caps), (Ve = K.warnings), ($e = K.servers));
    let S = [
        e,
        ...(n.files ?? []).flatMap((ce) =>
          MANIFEST_TEXT_TYPES.has(ce.contentType) ? [bufferToText(ce.content)] : [],
        ),
      ],
      Q = K.servers.length > 0 ? findUndeclaredMcpToolCalls(S, K.servers, 64) : [],
      filtered = findMentionedTools(S, K.renamed).filter(([ce]) => !Q.includes(ce));
    if (filtered.length > 0)
      Ve = [
        ...Ve,
        `the page source still holds ${plural(filtered.length, "a server name", "server names")} this publish rewrote in the manifest, as ${plural(filtered.length, "a quoted string", "quoted strings")} \u2014 ${capListForDisplay(filtered, 8, ([ce, Ae]) => `"${sanitizeConnectorName(ce)}" (viewers resolve only "${sanitizeConnectorName(Ae)}")`).join(", ")} \u2014 so if the page passes ${filtered.length === 1 ? "it" : "them"} to callTool(\u2026) / watchTool(\u2026), those calls fail for every viewer; use the display ${plural(filtered.length, "name")} there.`,
      ];
  } else if (capabilities !== void 0) {
    let D = listLocalServerDeclarations(capabilities).length;
    if (D > 0)
      logFeatureSad("artifact_publish", "slug_without_pairs", { page_bytes: byteLength, slug_count: D });
  }
  let keys = Object.keys(Te ?? {}),
    Me,
    _t = readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT);
  if (Te !== void 0) {
    let D = applyHostGrant(Te, _t);
    if (!D.ok) {
      logFeatureBad("artifact_publish", "host_grant_unreadable", {
        page_bytes: byteLength,
        host_server_count: D.refused.length,
      });
      let fe = capListForDisplay(D.refused, 8, (K) => `"${sanitizeConnectorName(K)}"`);
      return publishError(
        `mcp manifest rejected: this computer's local-server grant (${CLAUDE_ARTIFACT_HOST_GRANT_ENV}, set by the app that launched this session; not something to fix from here) could not be read, so ` +
          `no host: server can be declared from this session \u2014 ${fe.join(", ")}; declare only claude.ai connectors (set "server" to the connector's display name), or to publish without connector access leave "mcp" out of capabilities (pass capabilities: {} to clear a stored declaration).`,
      );
    }
    if (D.dropped.length > 0) {
      (logFeatureSad("artifact_publish", "host_grant_narrowed", {
        page_bytes: byteLength,
        dropped_count: D.dropped.length,
      }),
        (Te = D.caps),
        ($e = $e.filter((K) => D.servers.includes(K))));
      let fe = D.dropped.length === 1 ? "it" : "them";
      ((Me = D.caps),
        (Ve = [
          ...Ve,
          `this computer did not grant the page these local tools, so they were left out of the manifest: ${describeCapabilityTools(D.dropped)} \u2014 the page's ` +
            `calls to ${fe} fail for every viewer; tell the user which local tools were left out` +
            (D.servers.length === 0
              ? ', and that the page now has no connector access at all (no declared server remained, so this publish carries no "mcp" and any stored "mcp" declaration is replaced)'
              : "") +
            ".",
        ]));
    }
  }
  if (session !== void 0 && $e.length > 0) {
    let D = [
        e,
        ...(n.files ?? []).flatMap((K) =>
          MANIFEST_TEXT_TYPES.has(K.contentType) ? [bufferToText(K.content)] : [],
        ),
      ],
      fe = findUndeclaredMcpToolCalls(D, $e, 64);
    if (fe.length > 0)
      Ve = [
        ...Ve,
        `the page calls callTool/watchTool with ${plural(fe.length, "a server name", "server names")} not in this manifest \u2014 ${capListForDisplay(fe, 8, (K) => `"${sanitizeConnectorName(K)}"`).join(", ")} \u2014 and ${isDynamicMcp((Me ?? Te)?.mcp) ? "under this dynamic declaration each viewer is asked to approve them at first use (a name the viewer has no connector for is refused)" : "those calls fail for every viewer"}; the manifest declares ${capListForDisplay($e, 8, (K) => `"${sanitizeConnectorName(K)}"`).join(", ")}.`,
      ];
  }
  if (
    n.contract !== void 0 &&
    n.contract !== "latest" &&
    (!CONTRACT_VERSION_REGEX.test(n.contract) || n.contract === UNVERSIONED_CONTRACT)
  )
    return (
      logFeatureBad("artifact_publish", "invalid_contract", { page_bytes: byteLength }),
      publishError(
        `invalid contract ${jsonStringify(n.contract)} \u2014 pass 'latest' ` +
          "or a published version like 0.1.0.",
      )
    );
  let Ot = n.contract === "latest",
    yt = n.contract !== void 0 && n.contract !== "latest" ? n.contract : null,
    et = n.contract !== void 0,
    ut = slug && !et ? n.storedPin : null,
    ke;
  if (slug && !et && ut === void 0) {
    let D = await readFrameDecl(slug, void 0, n.credentials);
    if (D !== null && "err" in D && n.onPinReadError !== "assume_none" && isRetryableReadBack(D)) {
      let fe = readBackTelemetry(D);
      if ((await sleep(READBACK_RETRY_MS, n.signal), !n.signal?.aborted))
        ((D = await readFrameDecl(slug, n.signal, n.credentials)),
          logFeatureSad("artifact_publish", "pin_readback_retried", {
            page_bytes: byteLength,
            ...fe,
            recovered: !(D !== null && "err" in D),
          }));
    }
    if (D !== null && "err" in D)
      if (n.onPinReadError === "assume_none")
        (logFeatureSad("artifact_publish", "pin_readback_assumed_none", { page_bytes: byteLength }),
          (ut = null));
      else
        return (
          logFeatureBad("artifact_publish", "pin_readback_failed", {
            page_bytes: byteLength,
            ...readBackTelemetry(D),
          }),
          publishError(
            `couldn't read the artifact's stored contract pin (${D.err}) \u2014 ` +
              "a republish preserves the stored pin, so this publish cannot proceed without it. This is usually transient: retry. If the read keeps failing and you intend to move the artifact to the current contract anyway, pass contract: 'latest' (this changes the page's runtime semantics).",
          )
        );
    else ((ut = D === null ? null : parseContractVersion(D.contract)), (ke = D?.capabilities ?? {}));
  }
  let se = parseContractVersion(ut);
  if (slug && ke === void 0 && Object.keys(capabilities ?? {}).length > 0) {
    let D = await readFrameDecl(slug, void 0, n.credentials);
    if (D !== null && "err" in D && n.contract === void 0 && isRetryableReadBack(D)) {
      if ((await sleep(READBACK_RETRY_MS, n.signal), !n.signal?.aborted))
        D = await readFrameDecl(slug, void 0, n.credentials);
    }
    if (D !== null && "err" in D) {
      if (n.contract === void 0)
        return (
          logFeatureBad("artifact_publish", "capability_readback_failed", {
            page_bytes: byteLength,
            ...readBackTelemetry(D),
          }),
          publishError(
            `couldn't read the artifact's stored capability declaration (${D.err}) \u2014 ` +
              "a republish that declares capabilities must not silently revoke stored ones, so this publish cannot proceed without it. This is usually transient: retry. If the read keeps failing and you intend to move the artifact to the current contract anyway, pass contract: 'latest' (this changes the page's runtime semantics, and the capabilities you send then replace the stored ones).",
          )
        );
      logFeatureSad("artifact_publish", "retrofit_guard_skipped");
    } else ke = D?.capabilities ?? {};
  }
  if (capabilities === void 0 && slug) {
    let D = await checkHostGrantCarry({
      slug: slug,
      hostGrant: _t,
      storedCaps: ke,
      signal: n.signal,
      credentials: n.credentials,
      pageBytes: byteLength,
      lane: "page",
    });
    if (!D.ok) return publishError(D.err);
    ke = D.storedCaps;
  }
  let ve = (D) => (D === SELF ? ARTIFACT_CAPABILITY_KEY : D),
    mapped = Object.keys(ke ?? {}).map(ve),
    mapped_2 = keys.map(ve),
    filtered = Object.entries(ke ?? {}).filter(([D]) => !mapped_2.includes(ve(D))),
    tt = getUserClaudeRulesDir_2(ke?.db) ?? [],
    Nt = Te?.db,
    Rt = tt.length > 0 && (Nt === !0 || (k4(Nt) && !Object.hasOwn(Nt, "rules"))),
    gn = isValidDbRules(tt),
    nt = getUserScopes(ke?.user) ?? [],
    Wt = Te?.user,
    ft = nt.length > 0 && (Wt === !0 || (k4(Wt) && !Object.hasOwn(Wt, "scopes"))),
    Ke = isValidScopeList(nt),
    Je = () => {
      let D = jsonStringify(nt),
        fe = sanitizeDisplayText(D, { max: 200 });
      return Ke && fe === D ? fe : "";
    };
  if (n.createPath === void 0 && filtered.length > 0 && mapped_2.some((D) => !mapped.includes(D))) {
    logFeatureBad("artifact_publish", "capability_retrofit_refused");
    let D = capListForDisplay(filtered, 8, ([ce]) => sanitizeDisplayText(ce)),
      fe = jsonStringify({
        ...Object.fromEntries(filtered),
        ...Te,
        ...(Rt && { db: ke?.db }),
        ...(ft && { user: ke?.user }),
      }),
      K = sanitizeDisplayText(fe, { max: 600 }),
      S = Rt || filtered.some(([ce]) => ce === "db"),
      Q = ft || filtered.some(([ce]) => ce === "user"),
      I =
        K === fe &&
        !/[<>]/.test(bv(fe)) &&
        scrubArtifactEnvelopeTags(fe) === fe &&
        (!S || isValidDbCapability(ke?.db)) &&
        (!Q || isValidUserCapability(ke?.user))
          ? K
          : "";
    return publishError(
      `your capabilities declaration omits the stored ${plural(filtered.length, "capability", "capabilities")} ${D.join(", ")} while adding new ones \u2014 a sent declaration replaces the stored one, so this publish would have silently revoked ${filtered.length === 1 ? "it" : "them"}. To keep ${filtered.length === 1 ? "it" : "them"}, republish declaring the union${I !== "" ? `: ${I}` : " (republish with capabilities omitted to read the stored declaration back, then resend it plus your additions)"}. To revoke on purpose, publish that union first, then republish without the revoked names (a declaration that adds no new name goes out as sent); capabilities: {} clears everything.`,
    );
  }
  if (n.createPath === void 0 && Rt) {
    logFeatureBad("artifact_publish", "db_rules_reset_refused");
    let D = jsonStringify(tt),
      fe = sanitizeDisplayText(D, { max: 600 }),
      K = gn && fe === D ? fe : "",
      S = ft
        ? ` The sent user block likewise omits its stored scopes${Je() !== "" ? ` (${Je()})` : ""}: resend user with them as well, or user: {"scopes": []} to drop them.`
        : "";
    return publishError(
      `your capabilities declaration re-sends db without its rules while the artifact stores ${tt.length} ${plural(tt.length, "access rule")}${K !== "" ? `: ${K}` : ' (not listed here; read the artifact with action "read" to see them)'} \u2014 ` +
        `a sent db block replaces the stored one, rules included, so this publish would have reset them to the defaults (anyone who can open the artifact can read its shared data, and anyone with more than view-only access can write it). To keep them, ${K !== "" ? "resend db with those rules" : "publish with capabilities omitted (the stored declaration stays as it is), or read it back and resend db with its rules"}; to reset them on purpose, send db: {"rules": []}.` +
        S,
    );
  }
  if (n.createPath === void 0 && ft) {
    logFeatureBad("artifact_publish", "user_scopes_reset_refused");
    let D = Je();
    return publishError(
      `your capabilities declaration re-sends user without its scopes while the artifact stores ${nt.length} ${plural(nt.length, "scope")}${D !== "" ? `: ${D}` : ""} \u2014 ` +
        `a sent user block replaces the stored one, scopes included, so this publish would have dropped ${nt.length === 1 ? "it" : "them"} (for profile, the page would no longer receive the viewer's name and avatar). To keep ${nt.length === 1 ? "it" : "them"}, ${D !== "" ? `resend user with scopes: ${D}` : "publish with capabilities omitted (the stored declaration stays as it is), or read it back and resend user with its scopes"}; to drop ${nt.length === 1 ? "it" : "them"} on purpose, send user: {"scopes": []}.`,
    );
  }
  let Ye = await resolvePublishCapabilities({
    capabilities: Te,
    echoPin: se,
    explicitPin: yt,
    upgrade: Ot,
    pageBytes: byteLength,
    ...(n.createPath !== void 0 && {
      latestFetchRemedy: {
        retry: "nothing was created; retry.",
        refused: `Nothing was created; tell the user the page has to be created from ${CONTRACT_FETCH_SUBJECT}.`,
      },
    }),
    credentials: n.credentials,
  });
  if ("errMsg" in Ye) return publishError(Ye.errMsg);
  let fields = Ye.fields,
    tn = {
      capNames: Object.keys(Te ?? {}).map(ve),
      hostDecl: usesLocalMcpServers(Te),
      latestContract: "contract" in fields && yt === null && se === null,
    },
    pt,
    It = (D) =>
      buildInstallationHealthDiagnostics(
        readBackAfterPublish(D, readBack ? slug : void 0, n.credentials, n.signal),
        [...Ve, ...Be],
      ).then((fe) => {
        if (fe.err === null && unnested !== void 0)
          logFeatureSad(
            "artifact_publish",
            unnested === "repaired" ? "nested_page_repaired" : "nested_repair_partial",
          );
        if (fe.err === null && hoistedCommentsDropped)
          logFeatureSad("artifact_publish", "hoisted_comment_dropped");
        if (fe.err !== null)
          return pt !== void 0 && fe.strandedSlug === void 0 && !fe.conflict && !fe.gone
            ? { ...fe, reservedSlug: pt }
            : fe;
        return { ...notLivePathsResult(fe, n.files ?? []), ...(Me !== void 0 && { sentCapabilities: Me }) };
      }),
    de = n.files ?? [],
    ht = n.removeFiles ?? [];
  if (de.length > 0 || j.length > 0 || ht.length > 0 || n.liveFiles !== void 0) {
    if (!isFrameMultiFileEnabled())
      return (
        logFeatureBad("artifact_publish", "multifile_flag_off", {
          n_files: de.length + j.length,
          n_removed: ht.length,
        }),
        publishError(
          ht.length > 0
            ? "Supporting files can't be published or removed right now, so nothing was published or removed; the artifact is unchanged. Publishing the page on its own (omitting `files`) would update the page but can't remove a file."
            : "Supporting files can't be published right now, so nothing was published. Publish the page as a single file instead: inline what it needs and omit `files`.",
        )
      );
    if (j.length > 0 && !isFrameCopyFromEnabled())
      return (
        logFeatureBad("artifact_publish", "copy_from_flag_off", { n_copied: j.length }),
        publishError(COPY_FROM_DISABLED_TEXT)
      );
    if (n.createPath !== void 0)
      return It(
        retryWithoutThumbnail(Ee, (D) =>
          publishFilesVersion(
            He,
            D,
            fields,
            void 0,
            !1,
            {
              t0: startTime,
              pageBytes: byteLength,
              lane: "inline",
              isRedeploy: X,
              hasCaps: ge,
              forced: !1,
              ...(se !== null && { echoedPin: se }),
              ...(n.liveFilesGate === !0 && { liveFilesOn: !0 }),
              sent: tn,
            },
            n.ownPublishes,
            n.credentials,
            n.createPath,
            n.onRetry,
            n.signal,
            de,
          ),
        ),
      );
    return It(
      retryWithoutThumbnail(Ee, (D, fe) =>
        sendFilesPublish(He, de, j, ht, D, fields, {
          baseVersion: fe ?? ye,
          force: Z,
          ...(n.liveFiles !== void 0 && { liveFiles: n.liveFiles }),
          ...(n.copiedCrossOrgOk === !0 && { copiedCrossOrgOk: !0 }),
          ...(pt !== void 0 && { reservedSlug: pt }),
          ownPublishes: n.ownPublishes,
          tele: {
            t0: startTime,
            pageBytes: byteLength,
            lane: "inline",
            isRedeploy: X,
            hasCaps: ge,
            forced: Z,
            ...(se !== null && { echoedPin: se }),
            ...(n.liveFilesGate === !0 && { liveFilesOn: !0 }),
            sent: tn,
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
    slug === void 0 && n.createPath === void 0 && isFrameMultiFileEnabled()
      ? await reservePublishSlot(n.credentials, n.signal, startTime, r)
      : void 0;
  if (((pt = Lt), n.signal?.aborted)) return publishError("publish cancelled \u2014 nothing was published.");
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
          pageBytes: byteLength,
          lane: "inline",
          isRedeploy: X,
          hasCaps: ge,
          forced: Z,
          ...(se !== null && { echoedPin: se }),
          ...(n.liveFilesGate === !0 && { liveFilesOn: !0 }),
          sent: tn,
        },
        n.ownPublishes,
        n.credentials,
        n.createPath,
        n.onRetry,
        n.signal,
        void 0,
        Lt,
        r,
      ),
    ),
  );
}
//@ chunk-06y4szbn.js:91694-92307 placement
async function reservePublishSlot(e, n, r, s) {
  if (n?.aborted) return;
  try {
    let h = {
        refreshOAuth: !0,
        headers: buildFrameHeaders(),
        timeout: 30000,
        credentials: e,
        relayOnCredentialRefusal: !0,
      },
      b;
    try {
      b =
        s !== void 0
          ? await postRelayOnlyWithBusyWait("/api/frame/deploy/prepare", I1t(), h, s, n)
          : await frameApi.post("/api/frame/deploy/prepare", I1t(), h);
    } catch (error) {
      if (error instanceof RelayOnlyUnsentError) return;
      throw error;
    }
    if (b.ok && b.status === 200 && typeof b.data?.slug === "string" && ARTIFACT_SLUG_RE.test(b.data.slug))
      return b.data.slug;
    if (!b.ok || (b.status !== 403 && b.status !== 404))
      logFeatureSad("artifact_publish", "reserve_unavailable", { reserve_status: b.ok ? b.status : 0 });
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
    r.thumbnailRejected === void 0 ||
    r.strandedSlug !== void 0 ||
    r.liveVersion !== void 0
  )
    return r;
  if (e.thumbnail === void 0 && e.thumbnailDark === void 0)
    return (logFeatureBad("artifact_publish", "thumbnail_rejected"), r);
  logFeatureSad("artifact_publish", "thumbnail_rejected");
  let { thumbnail: thumbnail, thumbnailDark: thumbnailDark, ...b } = e,
    y = r.created === void 0 ? await n(b) : await n({ ...b, slug: r.created.slug }, r.created.version);
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
async function trackFrameEvent(e, n) {
  try {
    let post = await frameApi.post(
      "/api/frame/track",
      {
        event_name: e,
        ...(n.slug && { slug: n.slug }),
        ...(n.via && { via: n.via }),
        ...(n.mode && { mode: n.mode }),
      },
      { refreshOAuth: !0, headers: buildFrameHeaders(), timeout: 5000, credentials: n.credentials },
    );
    if (!post.ok) logForDebugging(`[artifact] /track skipped: ${post.reason}`);
    else if (post.status !== 204) logForDebugging(`[artifact] /track ${post.status}: ${errBody(post.data)}`);
  } catch (error) {
    logForDebugging(`[artifact] /track failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
//@ chunk-06y4szbn.js:93456-93901 placement
var DAILY_CAP_CODES = ["frame_daily_publish_cap_reached", "frame_daily_push_cap_reached"],
  uc = { frame_daily_publish_cap_reached: "daily_new", frame_daily_push_cap_reached: "daily_pushes" },
  fc = DoctorLazy(() => u({ error: U(DAILY_CAP_CODES), message: o().catch("") })),
  pc = {
    daily_new: "daily new-artifact limit for your plan reached \u2014 resets at UTC midnight",
    daily_pushes: "daily publish limit for your plan reached \u2014 resets at UTC midnight",
  },
  PUBLISH_CAP_FRAME = "publish 429: ",
  X_FRAME_PUSH_REMAINING = "x-frame-push-remaining";
//@ chunk-06y4szbn.js:93901-93997 placement
function parseIntHeader(e) {
  let n = typeof e === "string" ? e.trim() : "";
  return /^\d{1,9}$/.test(n) ? Number(n) : void 0;
}
//@ chunk-06y4szbn.js:93997-94116 placement
function dailyPublishResetEpochSeconds(e = Date.now()) {
  let date = new Date(e);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) / 1000;
}
//@ chunk-06y4szbn.js:94116-94226 placement
function dailyResetFromHeader(e) {
  let n = typeof e === "string" ? Date.parse(e) : Number.NaN;
  return dailyPublishResetEpochSeconds(Number.isFinite(n) ? n : Date.now());
}
//@ chunk-06y4szbn.js:94226-94390 placement
function dailyCapNotice(e) {
  let safeParse = fc().safeParse(e);
  if (!safeParse.success) return;
  let r = uc[safeParse.data.error],
    s = scrubServerLine(safeParse.data.message, 200),
    h = s !== "" ? s : pc[r];
  return { capType: r, message: `${PUBLISH_CAP_FRAME}${h}` };
}
//@ chunk-06y4szbn.js:94390-94425 placement
var Cs = 3,
  gc = 5000,
  Yr = 20000,
  mc = 30000;
//@ chunk-06y4szbn.js:94425-94480 placement
function retryDelayMs(e) {
  let n = parseRetryAfterMs(e) ?? 2000;
  return n <= mc ? n : void 0;
}
//@ chunk-06y4szbn.js:94480-94525 placement
function _a(e) {
  return Math.min(parseRetryAfterMs(e) ?? yc, Yr);
}
//@ chunk-06y4szbn.js:94525-94673 placement
function backoffMs(e, n) {
  let rounded = Math.round(
      backoffDelayMs({ attempt: e - 1, baseMs: gc, jitter: { kind: "proportional", ratio: 0.25 } }),
    ),
    s = parseRetryAfterMs(n) ?? 0;
  return Math.min(Math.max(s, rounded), Yr);
}
//@ chunk-06y4szbn.js:94673-94758 placement
class pn extends Error {
  startedAtMs;
  constructor(e, n, r) {
    super(e, r);
    this.startedAtMs = n;
  }
}
//@ chunk-06y4szbn.js:94758-94779 placement
class PublishTransportError extends pn {}
//@ chunk-06y4szbn.js:94779-94874 placement
class Ct extends pn {
  seen;
  resent;
  constructor(e, n, r, s, h) {
    super(e, n, r);
    this.seen = s;
    this.resent = h;
  }
}
//@ chunk-06y4szbn.js:94874-94925 placement
function bc(e) {
  return e.seen !== void 0 && Gki(e.seen);
}
//@ chunk-06y4szbn.js:94925-95203 placement
function trackUploadBytes(e) {
  let n = 0,
    r = 0;
  return (s) => {
    if (
      ((n += s.json_bytes),
      (r += s.wire_bytes),
      (e.json_bytes = n),
      (e.wire_bytes = r),
      (e.body_gzip = e.body_gzip === !0 || s.body_gzip),
      s.gzip_skip !== void 0)
    )
      e.gzip_skip = fromEnum(s.gzip_skip);
    if (s.gzip_fallback_status !== void 0) e.gzip_fallback_status ??= s.gzip_fallback_status;
  };
}
//@ chunk-06y4szbn.js:95203-95459 placement
function deployQuery(e, n) {
  let r = [
    ...(e.attemptId === void 0 ? [] : [`attempt_id=${e.attemptId}`]),
    ...(e.attemptId !== void 0 && e.resend ? ["resend=1"] : []),
    ...(n.createConfirmed === !0 ? [CREATE_CONFIRMED_QUERY] : []),
  ];
  return r.length === 0 ? "/api/frame/deploy/direct" : `/api/frame/deploy/direct?${r.join("&")}`;
}
//@ chunk-06y4szbn.js:95459-95847 placement
async function resendAfterTornBody(e, n, r) {
  let s = { ...getTransportErrorProps(n.cause, n.startedAtMs), ...n.seen };
  logForDebugging(
    `[artifact] publish request died before its whole body left this machine (socket took ${s.bytes_flushed} of ${s.body_bytes} bytes) \u2014 re-sending once on a fresh connection`,
  );
  let h = 0;
  try {
    let b = await e();
    return ((h = b.ok ? b.status : 0), b);
  } finally {
    logFeatureSad("artifact_publish", "deploy_resent", { ...r, ...s, deploy_final_status: h });
  }
}
//@ chunk-06y4szbn.js:95847-95864 placement
var Ea = 2,
  yc = 2000;
//@ chunk-06y4szbn.js:95864-95953 placement
function xa(e) {
  return e.ok && e.fromFrame && e.status === 409 && refusalReasonOf(e.data) === "publish_settling";
}
//@ chunk-06y4szbn.js:95953-96038 placement
function vc(e) {
  return typeof e === "object" && e !== null && "replayed" in e && e.replayed === !0;
}
//@ chunk-06y4szbn.js:96038-97033 placement
async function classifyPublishFailure(e, n, r, s) {
  let h = {
    ...getTransportErrorProps(n.cause, n.startedAtMs),
    ...(n instanceof Ct && n.seen),
    ...(n.cause instanceof McpDoubtfulAnswerError && { deploy_first_status: n.cause.status }),
    leg: fromEnum(n instanceof PublishTransportError ? "relay" : "direct"),
  };
  logForDebugging(
    "[artifact] publish request ended without a clear answer \u2014 re-sending it once, marked as a re-send, so a publish that already landed is answered rather than repeated",
  );
  let b = 0,
    y,
    x = 0,
    w = !1,
    R = !1;
  try {
    let C = await e();
    y = fromEnum(C.route);
    while (xa(C) && x < Ea) {
      let k = _a(C.response?.headers?.["retry-after"]);
      if (
        (logForDebugging(
          `[artifact] the first attempt landed and its content is still being stored \u2014 re-sending in ${k}ms`,
        ),
        await sleep(k, s),
        s?.aborted)
      )
        break;
      ((x += 1), (C = await e()), (y = fromEnum(C.route)));
    }
    if (
      ((b = C.ok ? C.status : 0),
      C.route === "direct" && isCredentialRefusal(C) && n instanceof PublishTransportError)
    )
      throw ((R = !0), n);
    return ((w = C.ok && C.status >= 200 && C.status < 300 && vc(C.data)), C);
  } finally {
    logFeatureSad("artifact_publish", "deploy_resent", {
      ...r,
      ...h,
      deploy_final_status: b,
      ...(y !== void 0 && { resend_route: y }),
      settle_resends: x,
      replayed: w,
      ...(R && { resend_refused: !0 }),
      ...(s?.aborted && { cancelled: !0 }),
    });
  }
}
//@ chunk-06y4szbn.js:97033-97220 placement
function isRetryablePublishResponse(e) {
  if (!e.ok || e.status === 408 || e.status === 499) return !0;
  if (e.status === 429) return dailyCapNotice(e.data) === void 0;
  return (
    e.status >= 500 &&
    strandedSlugFrom(e.status, e.data) === null &&
    refusalReasonOf(e.data) !== "render_busy"
  );
}
//@ chunk-06y4szbn.js:97220-97241 placement
class Sa extends pn {}
//@ chunk-06y4szbn.js:97241-97409 placement
async function withPublishTiming(e) {
  let startTime = performance.now();
  try {
    return await e();
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError) throw error;
    throw new Sa(error instanceof Error ? error.message : String(error), startTime, { cause: error });
  }
}
//@ chunk-06y4szbn.js:97409-97588 placement
function publishErrorTelemetry(e, n) {
  return e instanceof pn
    ? {
        ...getTransportErrorProps(e.cause, e.startedAtMs),
        ...(e instanceof Ct && e.resent && { resent: !0 }),
        ...(e.cause instanceof McpDoubtfulAnswerError && { deploy_status: e.cause.status }),
      }
    : getTransportErrorProps(e, n);
}
//@ chunk-06y4szbn.js:97588-98050 placement
async function postDeploy(e, n, r, s, h, b = {}, y = void 0, x) {
  let w = {
      refreshOAuth: !0,
      headers: buildFrameHeaders(),
      streamUpload: {
        tailFloorMs: $s,
        onSettled: (k) => {
          ((b.seen = k), s(k));
        },
      },
      gzipBody: { tailFloorMs: $s(void 0), onEncoding: h },
      ...(b.freshConnection && { freshConnection: !0 }),
      relayOnCredentialRefusal: !0,
      maxBodyLength: 2 * MAX_ARTIFACT_BYTES,
      maxContentLength: MAX_PAGE_BYTES_FOR_STRIP,
      relayProbe: tl,
      credentials: r,
    },
    C = await (y !== void 0 ? postRelayOnlyWithBusyWait(e, n, w, y, x) : frameApi.post(e, n, w)).catch(
      (k) => {
        if (k instanceof McpDoubtfulAnswerError) ((b.seen = void 0), s(void 0));
        throw k;
      },
    );
  return (s(void 0), C);
}
//@ chunk-06y4szbn.js:98050-98484 placement
function relayOnlyRefusalReason(e) {
  if (e.slug !== void 0 || e.baseVersion !== void 0) return "names an existing artifact";
  if (e.force === !0) return "sets force";
  if (e.capabilities !== void 0) return "declares capabilities";
  if (e.contract !== void 0) return "sets a contract";
  if ((e.removeFiles?.length ?? 0) > 0) return "removes files";
  if (
    e.createPath !== void 0 ||
    e.liveFiles !== void 0 ||
    (e.files ?? []).some((n) => n.live !== void 0 || n.reseed === !0)
  )
    return "makes or changes a live file";
  return;
}
//@ chunk-06y4szbn.js:98484-98553 placement
function Sc(e) {
  return mn() && (plannedRoute("POST", e, "only") !== "relay" || !isAccountIngressToken());
}
//@ chunk-06y4szbn.js:98553-98868 placement
function relayOnlyUnsentResult(e) {
  return (
    logFeatureBad("artifact_publish", "relay_only_unsent", e),
    {
      ...publishError(
        "Nothing was published: a publish made without asking must go through the cloud session's gateway, which could not carry it. Publishing it again now goes through the usual permission check, which may need a person's approval.",
      ),
      notCarried: !0,
    }
  );
}
//@ chunk-06y4szbn.js:98868-98942 placement
function publishCancelledResult() {
  return publishError("publish cancelled \u2014 nothing was published.");
}
//@ chunk-06y4szbn.js:98942-99006 placement
function isRelayOnlyCancelled(e) {
  return e instanceof Error && e.cause instanceof RelayOnlyCancelledError;
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
  for (let b = !1; ; b = !0) {
    if (Sc(e)) throw new RelayOnlyUnsentError();
    s.count += 1;
    let postRelayOnly = await frameApi.postRelayOnly(e, n, r);
    if (isRelayUnsent(postRelayOnly)) throw new RelayOnlyUnsentError();
    if (!postRelayOnly.ok || postRelayOnly.gatewayRetryAfterMs === void 0) return postRelayOnly;
    if (((s.count -= 1), h?.aborted)) throw new RelayOnlyCancelledError();
    if (b) throw (logFeatureSad("artifact_publish", "relay_only_busy"), new RelayOnlyUnsentError());
    if (
      (await sleep(Math.min(postRelayOnly.gatewayRetryAfterMs, RELAY_ONLY_BUSY_WAIT_MAX_MS), h), h?.aborted)
    )
      throw new RelayOnlyCancelledError();
  }
}
//@ chunk-06y4szbn.js:99723-99761 placement
function $s(e) {
  return (y3r(e) + 30) * 1000;
}
/**
 * 发送部署请求并在断流/5xx/中继忙时有限重试（同一 attempt_id，必要时新连接重发）。
 */
//@ chunk-06y4szbn.js:99761-102357 placement
async function deployWithRetry(e, n, r, s, h = !1, b = !1, y = !1) {
  let x = randomUUID(),
    w = !1,
    R = async (X = !1) => {
      let ge = { attemptId: x, ...(X && { freshConnection: X }), ...(w && { resend: !0 }) },
        startTime = performance.now();
      try {
        let Z = await e(ge);
        if (((s.wire = wireOf(Z)), Z.mcpDoubt !== void 0)) s.deploy_status = Z.mcpDoubt;
        return Z;
      } catch (error) {
        if (error instanceof RelayOnlyUnsentError) {
          if (C === 1 && y) throw error;
          throw new Ct(
            outcomeUnknownMessage(
              error instanceof RelayOnlyCancelledError
                ? "the publish was cancelled before a later send of it went out"
                : "a later send of this publish could not go through the cloud session's gateway",
            ),
            startTime,
            { cause: error },
            ge.seen,
            X,
          );
        }
        s.wire = wireOfThrow(error);
        let Oe = errBody(error instanceof Error ? error.message : String(error));
        throw threwOnRelayLeg(error)
          ? new PublishTransportError(outcomeUnknownMessage(`relay request failed: ${Oe}`), startTime, {
              cause: error,
            })
          : new Ct(
              error instanceof McpDoubtfulAnswerError
                ? malformedDeployResponse()
                : outcomeUnknownMessage(`deploy request failed: ${Oe}`),
              startTime,
              { cause: error },
              ge.seen,
              X,
            );
      }
    },
    C = 1,
    k,
    V;
  try {
    k = await R();
  } catch (error) {
    if (r?.aborted) throw error;
    if (error instanceof Ct && error.cause instanceof McpDoubtfulAnswerError) V = error;
    if (
      b &&
      (error instanceof PublishTransportError ||
        (error instanceof Ct && (isTransportError(error.cause) || error === V)))
    )
      ((C += 1), (w = !0), (k = await classifyPublishFailure(() => R(!0), error, s, r)));
    else if (error instanceof Ct && isTransportError(error.cause) && bc(error))
      ((C += 1), (k = await resendAfterTornBody(() => R(!0), error, s)));
    else throw error;
  }
  let L = !1,
    q,
    W = (X) => {
      ((q ??= X.status === 429 ? 429 : 503),
        logForDebugging(
          `[artifact] /deploy/direct ${X.status} \u2014 retrying in ${X.delayMs}ms (attempt ${X.attempt} of ${X.maxAttempts})`,
        ),
        n?.(X));
    },
    G = async (X) => {
      if ((await sleep(X, r), r?.aborted))
        return (logForDebugging("[artifact] /deploy/direct retry cancelled by user"), !1);
      return ((C += 1), (L = !0), (k = await R()), (L = !1), !0);
    },
    P = () => {
      if (V !== void 0 && isRetryablePublishResponse(k)) throw V;
      return k;
    },
    j = k.ok && k.fromFrame && k.status === 503 && refusalReasonOf(k.data) === "render_busy";
  try {
    if (k.ok && k.fromFrame && k.status === 429) {
      if (dailyCapNotice(k.data) !== void 0)
        return (logForDebugging("[artifact] /deploy/direct 429 is a plan cap \u2014 not retrying"), P());
      let Z = retryDelayMs(k.response?.headers?.["retry-after"]);
      if (Z === void 0) return P();
      return (W({ status: 429, attempt: 2, maxAttempts: 2, delayMs: Z }), await G(Z), P());
    }
    if (j && k.ok) {
      let min = Math.min(parseRetryAfterMs(k.response?.headers?.["retry-after"]) ?? 1000, Yr);
      return (W({ status: 503, attempt: 2, maxAttempts: 2, delayMs: min }), await G(min), P());
    }
    let X = 2,
      ge = !1;
    while (k.ok && k.fromFrame && k.status === 503 && !(h && strandedSlugFrom(k.status, k.data)) && X <= Cs) {
      let Z = backoffMs(X, k.response?.headers?.["retry-after"]);
      if (
        (W({ status: 503, attempt: X, maxAttempts: Cs, delayMs: Z }),
        b && !w && !strandedSlugFrom(k.status, k.data))
      )
        ((w = !0), (ge = !0));
      if (!(await G(Z))) break;
      X += 1;
    }
    let ie = 0;
    while (ge && xa(k) && ie < Ea) {
      let Z = _a(k.response?.headers?.["retry-after"]);
      if (
        (logForDebugging(
          `[artifact] an earlier attempt landed and its content is still being stored \u2014 re-sending in ${Z}ms`,
        ),
        !(await G(Z)))
      )
        break;
      ie += 1;
    }
    return P();
  } finally {
    if (q !== void 0)
      (logFeatureSad("artifact_publish", q === 503 ? "deploy_503_retried" : "deploy_429_retried", {
        ...s,
        deploy_attempts: C,
        deploy_final_status: L || !k.ok ? 0 : k.status,
        ...(r?.aborted && { cancelled: !0 }),
        ...(j && { render_busy: !0 }),
      }),
        n?.({ settled: !0 }));
  }
}
//@ chunk-06y4szbn.js:102357-102721 placement
function droppedFieldOn400(e, n) {
  if (!(n.ok && n.fromFrame && n.status === 400)) return;
  let r = formatFrameErrorBody(n.data),
    matches = UNKNOWN_FIELD_ERROR_RE.test(r);
  if (carriesDeadline(e) && matches && /["']deadline["']/.test(r)) return "deadline";
  if (Kxe(e.requestId).request_id !== void 0 && matches && /["']request_id["']/.test(r)) return "request_id";
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
      return { ...e, deadline: void 0 };
    case "icon":
      return { ...e, icon: void 0 };
    case "request_id":
      return { ...e, requestId: void 0 };
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
