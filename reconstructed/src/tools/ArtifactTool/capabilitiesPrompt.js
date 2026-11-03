/**
 * tools/ArtifactTool/capabilitiesPrompt.ts
 *
 * 2.1.316 新增：能力说明提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (13)
 * attribution: placement 13
 */
import { access } from "fs/promises";
import { join } from "path";
import {
  getBundledSkillExtractDir,
  registerBundledSkillSessionReset,
  extractAdditionalSkillFiles,
  registerBundledSkill,
} from "../../skills/bundledSkills.js";
import { ARTIFACT_CAPABILITIES } from "../../skills/bundled/bundledSkillNames.js";
import { sanitizeConnectorName, Vcr } from "../../services/artifacts/connectorNames.js";
import { plural } from "../../utils/stringUtils.js";
import {
  groupClaudeAiConnectors,
  getArtifactConnectorContext,
} from "../../services/artifacts/artifactConnectors.js";
import { slackConnectorName, saveRosterToConfig } from "../../services/artifacts/capabilityRoster.js";
import { isServerIdentityActive } from "../../services/mcp/serverIdentity.js";
import { Axn } from "../../utils/betas.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { yt, fetchCapabilityDefs, Tn, loadCapabilityRosterWithDefs, ft, bt, Sn } from "./capabilityDefs.js";
import { liveSessionPromptSections } from "./liveSessionPrompt.js";
import { buildToolSpellingNote } from "../../services/artifacts/artifactPromptText.js";
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { artifactCapabilitiesPromptGateOpen } from "../../services/artifacts/artifactToolSchema.js";
import { isBuiltInArtifactHiddenForMcp } from "../../services/artifacts/artifactsMcpTools.js";
import {
  parseContractVersion,
  hasFeatureFlag,
  HOST,
  setServedCapabilities,
} from "../../services/artifacts/capabilityDeclaration.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { readFrameDecl } from "../../services/artifacts/readBack.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { resolveContract, fetchContractPrompt } from "../../services/artifacts/contract.js";

//@ chunk-hantmvxa.js:7689-7828 placement
async function verifyExtractedTypeFiles(e) {
  if (e == null) return null;
  let n = getBundledSkillExtractDir(ARTIFACT_CAPABILITIES);
  try {
    return (await Promise.all(e.files.map((file) => access(join(n, file)))), e);
  } catch {
    return null;
  }
}
//@ chunk-hantmvxa.js:7828-7887 placement
var In = { ccrHosted: !1, metaConnector: null, hosted: null },
  $e = 32;
//@ chunk-hantmvxa.js:7887-7960 placement
function Me(e, n, s) {
  let r = e - n;
  return r > 0 ? `; and ${r} more \u2014 ${s}` : "";
}
/**
 * 生成 MCP 能力说明中关于 Claude 应用托管连接器的段落：列出 id 对应的连接器名称（最多 $e 个），说明 server 参数必须用连接器名称而非 id。
 */
//@ chunk-hantmvxa.js:7960-9954 placement
function describeHostedConnectors(hosted, hasHostedConnectors) {
  let mapped = hosted.named
      .slice(0, $e)
      .map((S) => `\`${S.toolPrefix}\` is "${sanitizeConnectorName(S.server)}"`),
    r = hasHostedConnectors
      ? " The Claude app has also connected claude.ai connectors under opaque ids (tools `mcp__<id>__<toolName>`)."
      : "",
    h =
      mapped.length === 0
        ? ""
        : ` The ids belong to these connectors: ${mapped.join("; ")}${Me(hosted.named.length, mapped.length, "ask the user for their names")}. For these, set \`server\` to the connector's name exactly as written here, e.g. \`{"server": "${sanitizeConnectorName(hosted.named[0]?.server ?? "")}", "tools": [...]}\` \u2014 never the id or any \`mcp__\` segment \u2014 and in the page pass that same name as the \`server\` argument of \`callTool\`/\`watchTool\`, because viewers resolve connectors by name only.`,
    mapped_2 = hosted.unnamedIds.slice(0, $e).map((S) => `\`${S}\``),
    w = mapped_2.length === 1,
    b =
      mapped_2.length === 0
        ? ""
        : ` ${w ? "Connector" : "Connectors"} ${mapped_2.join(", ")}${Me(hosted.unnamedIds.length, mapped_2.length, "treat the rest the same way")} did not report ${w ? "a name" : "names"} here: ask the user for ${w ? "that connector's" : "each connector's"} name exactly as shown in claude.ai (Settings \u2192 Connectors) \u2014 describe ${w ? "it" : "each"} by the tools it provides (its \`mcp__<id>__\u2026\` tool names), since the user cannot see the id \u2014 and use that name as \`server\` and in the page's calls; the id itself is refused at publish because no viewer can resolve it.`,
    mapped_3 = hosted.undeclarable.slice(0, $e).map((S) => `\`${S.toolPrefix}\` ("${Vcr(S.server)}")`),
    C =
      mapped_3.length === 0
        ? ""
        : ` ${plural(mapped_3.length, "Connector")} ${mapped_3.join(", ")}${Me(hosted.undeclarable.length, mapped_3.length, "more like them")} cannot be declared at all until renamed: a manifest \`server\` must be 1\u201364 characters with no control characters, line breaks, unusual spaces or text-direction controls, must not begin or end with a space or invisible character, and must not read as \`host:\` or be shaped like an id or a \`claude_ai_\u2026\`/\`mcp__\u2026\` prefix, so if the page needs one of these, tell the user it must first be renamed in claude.ai (Settings \u2192 Connectors).`;
  return `${r}${h}${b}${C}`;
}
//@ chunk-hantmvxa.js:9954-15689 placement
function buildConnectorCapabilitiesPrompt(e, n, s) {
  let { ccrHosted: ccrHosted, metaConnector: metaConnector, hosted: hosted } = n,
    w = groupClaudeAiConnectors(e),
    b = hosted === null ? 0 : hosted.named.length + hosted.unnamedIds.length + hosted.undeclarable.length,
    k =
      w.length > 0
        ? `Connector tools appear in your tool list as \`mcp__<connector>__<toolName>\`. Set \`server\` to the \`<connector>\` segment \u2014 everything between \`mcp__\` and the next \`__\` (for \`mcp__${slackConnectorName()}__search\`, the \`server\` is \`${slackConnectorName()}\`). Copy the segment exactly, case included; when publishing, it is resolved to the connector's display name automatically. In the page's own \`callTool\`/\`watchTool\` calls, pass the connector's display name (its name as shown in claude.ai), not that segment \u2014 viewers resolve connectors by name only. The publish result states the exact display name for each segment it resolves; if the page's calls do not match it, fix them and publish again.`
        : b > 0
          ? "In this session the Claude app has connected the user's claude.ai connectors under opaque ids: their tools appear in your tool list as `mcp__<id>__<toolName>`."
          : ccrHosted
            ? "In this session, claude.ai connector tools appear in your tool list as `mcp__<connector>__<toolName>`. Set `server` to the connector's display name as it appears in claude.ai (usually the `<connector>` segment with underscores read as spaces)."
            : hosted !== null
              ? "None are connected right now \u2014 they may still be connecting, or the user has none. In this session a connector's tools would appear as `mcp__<id>__<toolName>` under an opaque connector id; invoke this skill again once they appear to learn each connector's name."
              : `None are connected right now \u2014 they may still be connecting, or the user has none. ${isServerIdentityActive() ? "When one connects, its tools appear in your tool list as `mcp__<connector>__<tool>`." : "Look for tools prefixed `mcp__claude_ai_*` in your tool list; each is named `mcp__claude_ai_<connector>__<tool>`."}`,
    C = hosted === null || b === 0 ? "" : describeHostedConnectors(hosted, w.length > 0),
    S =
      metaConnector === null
        ? ""
        : ` The \`mcp__${metaConnector.toolPrefix}__*\` tools in your tool list are also available to viewers as the built-in claude.ai connector \`${metaConnector.server}\`: declare that exact name as \`server\` with those tools' upstream names. A published page calls them as the viewer, with no calling session, so tools that act on the calling session (e.g. \`send_later\`, \`watch_url\`) do not apply there.`,
    T = s
      ? ` Locally-configured MCP servers connected in this session can also be declared, as host servers: set \`server\` to \`host:<server>\` where \`<server>\` is the segment between \`mcp__\` and the next \`__\` in that server's tool names (\`mcp__filesystem__read_file\` \u2192 \`host:filesystem\`). Only servers from the user's MCP configuration count, with one built-in exception: \`host:claude_browser\` is the Claude app's own browser \u2014 declare it, with the tools the page needs from \`read_page\`, \`get_page_text\`, \`find\`, \`preview_start\`, \`navigate\`, \`computer\` and \`form_input\`, when the page must read or act on other websites; it answers only when the viewer opens the page in the Claude desktop app; the viewer is asked once, at the page's first call to it, and again at each click or key press that calls a banking or other high-risk site. The app's other built-in servers (\`cowork\`, \`scheduled-tasks\`, \`session_info\`, \`workspace\` and the like) are never host servers, and a page that declares one is refused at publish.${b > 0 ? " The `mcp__<id>__` connectors above are claude.ai connectors, never host servers." : ""} A host server only answers when the viewer opens the page in a Claude app that has that same local server connected \u2014 say so to the user when you publish.`
      : b > 0
        ? metaConnector === null
          ? " Only claude.ai connectors are valid `server` values \u2014 the Claude app's own servers (`cowork`, `workspace`, `scheduled-tasks`, `session_info` and the like) and other locally-configured MCP servers in your tool list are not."
          : ` Only claude.ai connectors and \`${metaConnector.server}\` are valid \`server\` values \u2014 the Claude app's own servers (\`cowork\`, \`workspace\`, \`scheduled-tasks\`, \`session_info\` and the like) and other locally-configured MCP servers in your tool list are not.`
        : w.length === 0 && ccrHosted
          ? metaConnector === null
            ? " Only connectors the user added in claude.ai are valid `server` values \u2014 this session's other built-in MCP servers are not."
            : ` Only connectors the user added in claude.ai and \`${metaConnector.server}\` are valid \`server\` values \u2014 this session's other built-in MCP servers are not.`
          : metaConnector === null
            ? " Only claude.ai connectors are valid \u2014 locally-configured MCP servers are not."
            : " Only claude.ai connectors are valid `server` values \u2014 other locally-configured MCP servers in your tool list are not.",
    R = hosted === null ? "`listTools()` / `/v1/mcp_servers`" : "`listTools()`",
    L =
      hosted !== null
        ? ""
        : ` In hermetic/CI sessions where connectors aren't loaded but \`$CLAUDE_CODE_OAUTH_TOKEN\` is set, fetch the list via Bash: \`curl -H 'anthropic-version: 2023-06-01' -H 'anthropic-beta: ${Axn.header}' -H "Authorization: Bearer $CLAUDE_CODE_OAUTH_TOKEN" ${getOauthConfig().BASE_API_URL}/v1/mcp_servers?limit=1000\`; in that case use each entry's \`display_name\` as the \`server\` value (exact display names are always accepted alongside tool-prefix segments).`;
  return `${k}${C}${S}${T} The manifest's \`tools\` array takes the connector's upstream tool names (as returned by ${R}), which can differ from the normalized \`<toolName>\` segment when an upstream name contains \`.\` or spaces. Every \`servers[]\` entry needs a non-empty \`tools\` array naming the tools the page calls \u2014 an empty or omitted \`tools\` list is refused and never means "all tools"; to publish without connector access, leave \`mcp\` out of \`capabilities\` (pass \`capabilities: {}\` to clear a stored declaration) rather than declaring an empty \`servers\` list.${L}`;
}
/**
 * 连接器 schema 指引：类型定义只覆盖调用信封，参数名取自本会话的工具定义，结果形状靠一次安全的真实调用了解，不要把观察到的真实数据嵌入页面；另一条提示用 Read 而非 cat 打开类型文件。
 */
//@ chunk-hantmvxa.js:15689-16936 placement
var CONNECTOR_SCHEMA_GUIDANCE =
    "The type definitions cover only the call envelope, not a connector tool's argument names or result shape. Take argument names from the tool's input schema in this session's own definition of that connector tool, when it is loaded here. Learn a result's shape from one real call of a tool that is safe to run \u2014 never run a write only to learn its result. The published page may also read a connector tool's schema itself with `describeTool(server, tool)` at view time, once the viewer has allowed that connector for the page (viewers without that support reject it \u2014 treat any rejection as no schema available); this session cannot read that answer before publishing, so it is no substitute for a schema read here. If this session has no schema for a tool and cannot safely call it, say so to the user at publish time \u2014 in your reply, not as a note inside the published page \u2014 instead of shipping a guessed shape. Observed response payloads are the user's real data: learn the shape from them, but never embed the observed values in the published page as sample or placeholder data.",
  TYPE_DEFS_AUTHORITY_NOTE =
    "Open these files with the Read tool rather than `cat`: a file past the Bash tool's inline output limit does not come back in full.";
/**
 * "Call contract" 段：指出平台提供的 window.claude 类型定义解压位置，要求写 mcp 调用代码前先读 mcp.d.ts（及通用入口文件）。
 */
//@ chunk-hantmvxa.js:16936-17964 placement
function callContractParagraph(contract) {
  let found = contract.files.find((file) => file.endsWith("/mcp.d.ts")),
    found_2 = contract.files.find((file) => file.endsWith(yt)),
    r = getBundledSkillExtractDir(ARTIFACT_CAPABILITIES);
  if (found) {
    let y = found_2
      ? `Read \`${r}/${found_2}\` (how a page reaches any capability on this contract) and \`${r}/${found}\` before writing any code that calls the \`mcp\` capability \u2014 they are`
      : `Read \`${r}/${found}\` before writing any code that calls the \`mcp\` capability \u2014 it is`;
    return `**Call contract** (runtime contract ${contract.version}). The platform-served \`window.claude\` type definitions for this contract are extracted under \`${r}\`: ${contract.files.map((file) => `\`${file}\``).join(", ")}. ${y} authoritative for this contract version over any remembered API shape. ${TYPE_DEFS_AUTHORITY_NOTE} ${CONNECTOR_SCHEMA_GUIDANCE}`;
  }
  return `**Call contract.** The served \`mcp\` type definitions could not be extracted for this invocation \u2014 invoking this skill again retries. Do not write \`mcp\` capability calls from memory; the served definitions are the authority.${found_2 ? ` \`${r}/${found_2}\` (how a page reaches any capability on this contract) did extract \u2014 Read it.` : ""} ${CONNECTOR_SCHEMA_GUIDANCE}`;
}
//@ chunk-hantmvxa.js:17964-18164 placement
var NO_RUNTIME_CAPABILITIES_NOTE =
  "**No runtime capabilities are available to you for this artifact.** Do not declare or guess any `capabilities` name; if the user asked for one, say it is unavailable and build a static page.";
/**
 * "Available capabilities" 行：列出可声明的能力名，以及每个页面内置、无需声明的核心能力。
 */
//@ chunk-hantmvxa.js:18164-18765 placement
function availableCapabilitiesLine(roster, core) {
  let s = (w) => w.map((b) => `\`${b}\``).join(", "),
    filtered = roster.filter((w) => core.includes(w));
  if (filtered.length === 0)
    return `**Available capabilities:** ${s(roster)} \u2014 the complete set of capability names you may declare. Anything not listed is unavailable to this user.`;
  let filtered_2 = roster.filter((w) => !core.includes(w));
  return `**Available capabilities:** ${filtered_2.length > 0 ? `${s(filtered_2)} \u2014 the complete set of capability names you may declare; ` : "none to declare for this user; "}built in on every page, called without declaring (never pass these in \`capabilities\`): ${s(filtered)}. Anything not listed is unavailable to this user.`;
}
/**
 * artifact-capabilities 技能的开头说明：页面可声明运行时能力，省略/空对象/非空对象三种声明语义，contract 版本升级与固定，以及页面自我重新发布时必须使用的文档骨架。
 */
//@ chunk-hantmvxa.js:18765-20295 placement
var CAPABILITIES_SKILL_HEADER =
  "# Artifact runtime capabilities\n\nA published Artifact page can declare **runtime capabilities** \u2014 abilities the claude.ai viewer grants the page at open time \u2014 by passing `capabilities: {name: config}` to the Artifact tool. The control plane is the authority on valid names and config shapes. Declaration gestures: **omitting** `capabilities` on a redeploy carries the stored declaration forward unchanged (and preserves the artifact's stored contract pin); an **empty object** `{}` is the explicit clear-all; a **non-empty object** is a full-set declaration (anything stored but not restated is revoked). Moving a republished artifact's runtime version is a deliberate gesture \u2014 pass `contract: 'latest'` to upgrade, or a specific version to pin or roll back \u2014 never a side effect of editing.\n\n**A page that republishes itself** through the `artifact` capability sends its whole document in exactly the shape the Artifact tool publishes, so a later publish from the tool recognizes and replaces the skeleton instead of nesting it: `<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>` the same small reset the tool's description names `</style></head><body>` \u2014 no whitespace between those tags and nothing else in the head \u2014 then the page content exactly as it was written for the tool (its `<title>` and `<style>` first, inside the body, regenerated from the page's state), then `</body></html>`.";
/**
 * 拼装 artifact-capabilities 技能正文：头部说明 + 可用能力清单 + 合约版本 pin 提示 + 各能力的提示词正文 + MCP 合约/连接器段；取不到能力清单或为空时给出对应说明。
 */
//@ chunk-hantmvxa.js:20295-22072 placement
function buildCapabilitiesSkillText(tools, roster, hostedConnectors = In) {
  if (roster === null)
    return [
      `${CAPABILITIES_SKILL_HEADER}

_(The current contract's capability roster could not be fetched; the contract service may be unreachable \u2014 invoking this skill again retries.)_`,
      ...liveSessionPromptSections(tools, []),
    ].join(`

`);
  if (roster.roster.length === 0)
    return [
      `${CAPABILITIES_SKILL_HEADER}

${NO_RUNTIME_CAPABILITIES_NOTE}`,
      ...liveSessionPromptSections(tools, []),
    ].join(`

`);
  let r = [CAPABILITIES_SKILL_HEADER, availableCapabilitiesLine(roster.roster, roster.core)];
  if (roster.pinned) {
    let w = roster.pinnedSlug ? ` artifact \`${roster.pinnedSlug}\`` : "";
    r.push(
      `_This guidance is pinned to runtime contract ${roster.version} \u2014 the contract the target${w} currently runs. A carry-forward republish keeps this pin._`,
    );
  }
  let h =
      roster.promptBody === null
        ? roster.roster
        : roster.missingCaps.filter((missingCap) => roster.roster.includes(missingCap)),
    included = roster.roster.includes("mcp");
  if (roster.promptBody !== null) r.push(buildToolSpellingNote(["data"]) + roster.promptBody);
  for (let w of h) {
    let found = roster.files.find((file) => file.endsWith(`/${w}.d.ts`)),
      k = getBundledSkillExtractDir(ARTIFACT_CAPABILITIES);
    r.push(
      found
        ? `**\`${w}\`.** Its authoring guidance could not be fetched this invocation; its type definitions are extracted at \`${k}/${found}\` \u2014 Read that file before ${roster.core.includes(w) ? "calling" : "declaring"} this capability.`
        : `**\`${w}\`.** Its authoring guidance and type definitions could not be fetched this invocation \u2014 invoking this skill again retries.`,
    );
  }
  if (included)
    (r.push(
      `**Your connectors this session.** ${buildConnectorCapabilitiesPrompt(tools, hostedConnectors, roster.hostServers)}`,
    ),
      r.push(callContractParagraph(roster)));
  if (!included && roster.files.length > 0) {
    let found = roster.files.find((file) => file.endsWith(yt)),
      any = roster.files.some((file) => file !== found),
      k = found
        ? ` \`${found}\` documents how a page reaches any capability on this contract \u2014 Read it${any ? " first" : ""}.`
        : "",
      C = any
        ? ` ${found ? "Each capability's" : "Each"} file documents its own declaration config and runtime surface \u2014 Read it before declaring that capability.`
        : "";
    r.push(
      `**Type definitions.** Extracted under \`${getBundledSkillExtractDir(ARTIFACT_CAPABILITIES)}\`: ${roster.files.map((file) => `\`${file}\``).join(", ")}.${k}${C} ${TYPE_DEFS_AUTHORITY_NOTE}`,
    );
  }
  return (
    r.push(...liveSessionPromptSections(tools, roster.roster)),
    r.join(`

`)
  );
}
//@ chunk-hantmvxa.js:22072-22112 placement
function Nn() {
  return isArtifactToolEnabled() && artifactCapabilitiesPromptGateOpen() && !isBuiltInArtifactHiddenForMcp();
}
//@ chunk-hantmvxa.js:22112-25849 placement
function createCapabilityProbeCache() {
  let e = new Map(),
    n = new Set();
  registerBundledSkillSessionReset(() => n.clear());
  async function s(h, y, w) {
    let b = e.get(h);
    if (b !== void 0) {
      let R = await verifyExtractedTypeFiles(b);
      if (R !== null) {
        let filtered = y.filter((W) => !R.files.includes(`${h}/${W}.d.ts`));
        if (filtered.length === 0) return R.files;
        let x = await fetchCapabilityDefs(h, filtered, w);
        if (Object.keys(x).length === 0) return R.files;
        if ((await extractAdditionalSkillFiles(ARTIFACT_CAPABILITIES, x)) === null) return R.files;
        let B = { version: h, files: [...R.files, ...Object.keys(x)].sort() };
        if ((await verifyExtractedTypeFiles(B)) === null) return R.files;
        return (e.set(h, B), B.files);
      }
    }
    let k = await fetchCapabilityDefs(h, y, w);
    if (Object.keys(k).length === 0) return [];
    if ((await extractAdditionalSkillFiles(ARTIFACT_CAPABILITIES, k)) === null) return [];
    let S = { version: h, files: Object.keys(k).sort() };
    if ((await verifyExtractedTypeFiles(S)) === null) return [];
    return (e.set(h, S), S.files);
  }
  async function r(h) {
    let { targetSlug: targetSlug, pins: pins } = h.getArtifactContractTarget();
    if (targetSlug === void 0) return null;
    let b = pins[targetSlug];
    if (b !== void 0) return parseContractVersion(b);
    if (n.has(targetSlug)) return null;
    let k = createCombinedAbortSignal(void 0, { timeoutMs: Tn }),
      C = await readFrameDecl(targetSlug, k.signal, h.credentials)
        .catch(() => ({ err: "read-back threw", thrown: !0 }))
        .finally(k.cleanup);
    if (C === null) return (n.add(targetSlug), null);
    if ("err" in C)
      return (
        logFeatureSad("artifact_capability_section", "pin_readback_failed"),
        logForDebugging(`[artifact] capability pin read-back failed: ${C.err}`),
        null
      );
    let S = parseContractVersion(C.contract);
    if (S === null) n.add(targetSlug);
    else h.setArtifactContractTarget(targetSlug, S);
    return S;
  }
  registerBundledSkill({
    name: ARTIFACT_CAPABILITIES,
    menuDescription: "Runtime capabilities for published Artifacts",
    description:
      "Runtime capabilities a published Artifact page can be granted \u2014 " +
      "behavior static HTML cannot provide on its own, such as the page reading live or connected data, remembering what people do on it " +
      "(a poll, a sign-up sheet, a checklist, a document edited in place \u2014 " +
      "it saves new versions of itself), keeping state shared across viewers, knowing who is viewing, asking Claude a question of its own, storing files people add, handing the viewer a file to save, or using the viewer's camera, microphone, location, screen or device motion. Serves this user's live capability roster and the typed call definitions. Load it whenever any such runtime behavior would make an artifact more useful, before writing the page.",
    isEnabled: Nn,
    userInvocable: !0,
    files: async (h) => {
      try {
        let y = await loadCapabilityRosterWithDefs({ credentials: h.credentials, storageV5: h.storageV5 });
        if (y === null || Object.keys(y.defs).length === 0) return {};
        return (e.set(y.version, { version: y.version, files: Object.keys(y.defs).sort() }), y.defs);
      } catch {
        return {};
      }
    },
    async getPromptForCommand(h, y) {
      let w = await r(y),
        b = getLiveState(),
        accountEpoch = b.accountEpoch,
        C = await resolveContract({
          timeoutMs: ft,
          ...(w !== null && { version: w }),
          credentials: y.credentials,
        }).catch(() => null);
      if (C !== null && !("err" in C) && w === null)
        saveRosterToConfig({ session: b, epoch: accountEpoch, roster: C, storageV5: y.storageV5 });
      if (C === null || "err" in C) {
        if (C !== null) logFeatureSad("artifact_capability_section", `roster_${C.cause}`);
        return [{ type: "text", text: buildCapabilitiesSkillText(y.options.tools, null) }];
      }
      let S = {
        version: C.version,
        roster: C.capabilities,
        core: C.core ?? [],
        files: [],
        promptBody: null,
        missingCaps: [],
        pinned: w !== null,
        hostServers: hasFeatureFlag(C, "mcp", HOST),
        ...(w !== null && { pinnedSlug: y.getArtifactContractTarget().targetSlug }),
      };
      if (w === null) setServedCapabilities(y.session, S.hostServers);
      let [T = 0, R = 0, L = 0] = C.version.split(".").map(Number),
        x = { v_major: T, v_minor: R, v_patch: L };
      if (C.capabilities.length > 0) {
        let D = bt(C),
          [B, j] = await Promise.all([
            s(C.version, D, y.credentials),
            fetchContractPrompt(C.version, { timeoutMs: Sn, credentials: y.credentials }),
          ]);
        if (((S.files = B.filter((W) => D.some((P) => W.endsWith(`/${P}.d.ts`)))), "err" in j))
          if (j.cause === "http_404") logFeatureOk("artifact_capability_section", { composed: !1, ...x });
          else logFeatureSad("artifact_capability_section", `prompt_${j.cause}`, x);
        else if (
          ((S.promptBody = j.promptMd),
          (S.missingCaps = j.missingCaps.filter((missingCap) => C.capabilities.includes(missingCap))),
          S.missingCaps.length > 0)
        )
          logFeatureSad("artifact_capability_section", "prompt_partial", x);
        else logFeatureOk("artifact_capability_section", { composed: !0, ...x });
      }
      return [
        {
          type: "text",
          text: buildCapabilitiesSkillText(
            y.options.tools,
            S,
            getArtifactConnectorContext(y.options.tools, y.options.mcpClients),
          ),
        },
      ];
    },
  });
}

export { createCapabilityProbeCache };
