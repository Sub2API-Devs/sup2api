/**
 * tools/ArtifactTool/pagePrompt.ts
 *
 * 2.1.316 新增：Artifact 页面规则提示词与段落
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2s0t9kzn.js (12)
 * attribution: placement 12
 */
import { ARTIFACT_CAPABILITY_KEY } from "../../services/artifacts/capabilityDeclaration.js";
import { ARTIFACT_CAPABILITIES } from "../../skills/bundled/bundledSkillNames.js";
import { noWatchRailCollabNote } from "../../services/artifacts/artifactToolSchema.js";
import {
  COMMENTS_OFF_SENTENCE,
  FORMAT_PARAGRAPH,
  SKELETON_SENTENCES,
  TITLE_PARAGRAPH,
} from "./promptText.js";
import {
  ARTIFACT_TOOL_NAME,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ARTIFACT_CHECK_TOOL_NAME,
} from "./constants.js";
import { MAX_ARTIFACT_BYTES, isFrameDeclaredThumbnailEnabled } from "../../services/artifacts/frameFlags.js";
import { THUMBNAIL_LINK_HELP } from "./thumbnails.js";
import { isArtifactToolsetSplit } from "../../services/artifacts/artifactToolGates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2s0t9kzn.js:7516-8014 placement
function statefulPagesParagraph() {
  return `**Pages that keep their state**: a page this user publishes can save new versions of itself \u2014 the artifact publish capability, declared as \`${ARTIFACT_CAPABILITY_KEY}\` \u2014 so a checklist, tracker, plan, or poll keeps its editors' changes for whoever opens it. If people will change things on the page itself (tick items off, edit entries), or fellow editors should fill it in, build it to save itself; load the \`${ARTIFACT_CAPABILITIES}\` skill first for the how-to. A page only read needs none of this.`;
}
//@ chunk-2s0t9kzn.js:8014-8264 placement
function commentsWatchUnavailableNote() {
  return ' Watching for new comments isn\'t available in this session, so none reach it on their own: read them with `action: "comments"` when the user asks, and if the user expects you to notice comments as they arrive, say so plainly.';
}
//@ chunk-2s0t9kzn.js:8264-12443 placement
function republishWatchParagraph(commentsOn, watchRail) {
  return watchRail === "none"
    ? `**Watching for republishes**: not available in this session \u2014 nothing notifies it when an artifact is republished elsewhere${commentsOn ? " or when a comment on one is sent to Claude" : ""}, and \`action: "watch"\` only reports that${noWatchRailCollabNote()}. If the user asks you to watch an artifact, say so plainly, and never claim you are watching one. \`action: "status"\` lists this session's watches (pass \`url\` to check one); \`action: "unwatch"\` with \`url\` stops one.${commentsOn ? "" : COMMENTS_OFF_SENTENCE}`
    : watchRail === "durable"
      ? `**Watching for republishes**: in this remote session a watch is a durable wake subscription held by the artifact service, not a live connection: this session is woken with a new turn when the watched artifact is republished elsewhere${commentsOn ? ", or when a comment on it is sent to Claude" : ""}; nothing streams in between, so on a wake re-read the artifact${commentsOn ? " (and its comments, on a comment wake)" : ""} before editing.${commentsOn ? ' Plain comments never wake this session \u2014 read them with `action: "comments"` when the user asks.' : COMMENTS_OFF_SENTENCE} Publishing an artifact starts registering its watch in the background, and the result line says whether that began, was skipped, or was already registered; \`action: "status"\` lists the watches that actually registered and what wakes each (pass \`url\` to check one). To watch an artifact you did not just publish, pass \`action: "watch"\` with its \`url\`; \`action: "unwatch"\` with \`url\` stops one. Do not claim you are watching an artifact unless a watch result, \`status\`, or a publish result's "already registered" line says so \u2014 its "arming" line is not yet a watch.`
      : `**Watching for republishes**: publishing an artifact starts subscribing this session to its live changes in the background, and the result line says whether that began, was skipped, or was already connected \u2014 \`status\` shows whether it actually connected, and you are told if it cannot; watches reconnect on their own if the connection drops. To watch an artifact you did not just publish (or to restart a stopped watch), pass \`action: "watch"\` with its \`url\`; a later republish from elsewhere \u2014 another session, or someone saving from a page that can publish new versions of itself \u2014 starts no turn and sends no notification. Some Artifact results open with one line saying a newer version was published; when one does, fetch the artifact's URL again (the \`${ARTIFACT_TOOL_NAME}\` tool's \`action: "read"\`, not your local file) and merge your edits onto that version before publishing. When a publish is refused because the artifact changed, follow the refusal, which usually hands you that version to merge.${commentsOn ? ' A comment on a watched artifact that is sent to Claude wakes this session, but only while that artifact\'s `status` row says auto-replies armed (when comment auto-replies are on for this session, a publish arms those, and so does `action: "watch"` on an artifact the user can edit whose link the user gave in their own message \u2014 never on one the user can only view); plain comments never notify this session \u2014 read them with `action: "comments"` when the user asks.' : COMMENTS_OFF_SENTENCE} \`action: "status"\` lists this session's watches (pass \`url\` to check one); \`action: "unwatch"\` with \`url\` stops one. Watches are session-local, and the user can see and stop them in /tasks. ${commentsOn ? "After a `--resume` or `--continue` in an interactive terminal, the watch on the artifact this session most recently published or read usually comes back, along with every watch that was replying to comments (replying again, unless the user had stopped it); other clients may restore nothing. `status` shows what is armed." : "After a `--resume` or `--continue` in an interactive terminal, the watch on the artifact this session most recently published or read usually comes back; other clients may restore nothing. `status` shows what is armed."} Do not claim you are watching an artifact unless a watch result, \`status\`, or a publish result's "already connected" line says so \u2014 its "arming" line is not yet a watch. Only a main-loop session (interactive, SDK, or background) holds a watch, not a subagent, teammate, or print session.`;
}
//@ chunk-2s0t9kzn.js:12443-23267 placement
/**
 * Artifact 页面规则提示文本：CDN 白名单（CSP）、页面大小、权限 API、数据 URI 等。
 */
var ARTIFACT_PAGE_RULES_TEXT =
  "**External resources \u2014 CDN allowlist (CSP-enforced)**: external scripts load ONLY from https://cdnjs.cloudflare.com (preferred), https://cdn.jsdelivr.net/npm/, https://unpkg.com, https://cdn.tailwindcss.com (Tailwind's play-CDN script) and https://code.jquery.com; external stylesheets ONLY from https://fonts.googleapis.com, with the font files they pull from https://fonts.gstatic.com (give every face a real fallback stack). Everything else is blocked, with no visible error: every other host (esm.sh included) and, even on those CDNs, anything but a script \u2014 stylesheets, images, media, fetch/XHR/WebSocket, a library's runtime fetches. So inline all other CSS and JS and embed assets as data: URIs.";
var PAGE_RULES_RESPONSIVE_TEXT =
  "**Responsive**: The page must also work at phone width (about 400px), and the page body must never scroll horizontally. Keep a side gutter of at least 16px at every width, written `padding-left: max(16px, env(safe-area-inset-left, 0px))` and `padding-right: max(16px, env(safe-area-inset-right, 0px))` so that it also clears a system bar at the phone's side: set it once on `body` or one outer wrapper (where colored bands span the width, on each band's inner wrapper), and give that element its vertical padding with `padding-block`, never a `padding` shorthand that zeroes the sides. Use relative units. Let flex and grid rows wrap or stack to one column when narrow, and give any flex or grid child that holds running text, code or a table `min-width: 0`, so long content wraps or scrolls inside it instead of pushing the page wider. Put `max-width: 100%` on images and on any `aspect-ratio` box, and give nothing a `min-width` wider than the screen. Only tables, diagrams and code blocks may be wider, each inside its own `overflow-x: auto` container.";
var PAGE_RULES_THEME_TEXT =
  '**Theme-aware**: The page renders in the viewer\'s theme, which has three states: an explicit choice sets `data-theme="dark"` or `data-theme="light"` on the root element, and the default "system" setting sets nothing, so for most viewers only `prefers-color-scheme` tells light from dark. Define every color as a token, in this shape (token names and count are the design\'s own):\n```css\n:root { --bg: \u2026; --fg: \u2026; --accent: \u2026 }  /* every token, light values */\n@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: \u2026; --fg: \u2026; --accent: \u2026; color-scheme: dark } }\n:root[data-theme="dark"] { --bg: \u2026; --fg: \u2026; --accent: \u2026; color-scheme: dark }  /* same dark values, so the toggle wins both ways */\nbody { background: var(--bg); color: var(--fg) }\n```\nEvery token gets its first definition on bare `:root`; the two dark blocks only redefine tokens, and their `color-scheme: dark` makes form controls and scrollbars follow. No color has its only definition inside a media or `[data-theme]` block, and no component rule uses a literal color that reads in one theme only. `body` keeps that explicit token background: the viewer paints its own ground behind the page, so a transparent body shows the host\'s theme instead. A dark-first design mirrors the whole shape, selectors included: dark values and `color-scheme: dark` on bare `:root` (the skeleton pins `light` there), light values and `color-scheme: light` under `(prefers-color-scheme: light)` guarded `:root:not([data-theme="dark"])` and again under `:root[data-theme="light"]`. A design that deliberately commits to a single look may drop the two dark blocks but still sets the background and every color explicitly, plus `color-scheme: dark` on `:root` if that look is dark.';
var PAGE_RULES_LIBRARY_TEXT = `${ARTIFACT_PAGE_RULES_TEXT} **How to load a library**: \`<script src="https://cdnjs.cloudflare.com/ajax/libs/<lib>/<exact version>/<file>">\` \u2014 pick the UMD build, which defines a global (e.g. react/18.3.1/umd/react.production.min.js, then react-dom) \u2014 placed BEFORE any inline \`<script>\` that uses it. Pin every library URL to an exact version (\`react@18.3.1\` on jsDelivr or unpkg, \`react/18.3.1/\u2026\` on cdnjs, \`cdn.tailwindcss.com/3.4.17\`), never a bare name, a range or a tag (\`react\`, \`react@18\`, \`@latest\`). Choose a version at least two weeks old. Any version you knew before this conversation is old enough; if you look versions up, skip any published in the last two weeks. The viewer's sandbox also blocks any download the page starts itself \u2014 \`<a download>\` links (data:/blob: hrefs included) and script-driven saves are inert for viewers \u2014 so never offer a file through a plain link. Links to other websites (\`https://\u2026\`) open in a new tab, but email, phone and app links (\`mailto:\`, \`tel:\`, \`sms:\`, other custom schemes) are unreliable inside an artifact: for many viewers (for example anyone outside the user's organization, or anyone viewing through a public link) following one, by link or by script, often does not work, and the page cannot tell whether it did. So show the address or number itself as selectable text (a copy button helps), treat such a link as a convenience that may do nothing, and never tell the viewer a message was sent or a call placed because the viewer tapped one. Artifacts render mermaid diagrams natively \u2014 markdown via \`\`\`mermaid fences, HTML via \`<pre class="mermaid">\` blocks \u2014 no library needed, don't load one. The viewer never shows \`alert()\`, \`confirm()\` or \`prompt()\` dialogs \u2014 \`confirm()\` returns false and \`prompt()\` returns null immediately \u2014 so build any confirmation step into the page itself.

**What the viewer's frame allows**: The page runs in a locked-down frame; what it refuses below, it refuses for every viewer (anonymous, signed-in, embedded, desktop and mobile apps), so build around these limits instead of detecting them. The page cannot open the print dialog \u2014 \`window.print()\` does nothing \u2014 so never offer a Print or "Save as PDF" button. Forms work as page UI (inputs, validation, submit events), but a real submission has nowhere to go: handle \`submit\` in script with \`preventDefault()\` and never point \`action\` at another site or a mailto: address. Copy buttons work when \`navigator.clipboard.writeText\` is called inside the click handler \u2014 catch its rejection (older desktop apps and some app views refuse it) and fall back to selecting the text; reading the clipboard never works, though the viewer's own Paste (the \`paste\` event) does. Camera, microphone, screen capture, location, motion, Web Share and similar device APIs are refused without a prompt \u2014 build on one only when this user has a runtime capability for that device (the \`${ARTIFACT_CAPABILITIES}\` skill lists them) and the page declares it; otherwise take photos, audio and data as uploaded files instead (file inputs, drag-and-drop of files and \`FileReader\` work in browsers). A screen wake lock may be granted while the page is visible: request it and tolerate rejection. Fullscreen and pointer lock work from a click in desktop browsers; treat both as optional (handle the rejection) since phones and some app views lack them. Sound plays only after the viewer interacts (muted autoplay is fine), so start audio from a button. Other sites cannot be embedded \u2014 no YouTube, map or form iframes, and no \`<object>\`/\`<embed>\`; link out instead: links open outside the artifact, normally in a new tab, while \`window.open\` works only for some signed-in viewers in the artifact's own organization and returns null for everyone else, so use real \`<a href>\` links. Web Workers work from your own files or \`blob:\` URLs; service workers and WebRTC do not. \`fetch()\` of files published alongside the page works with relative URLs; images from your own files, \`data:\` or \`blob:\` URLs draw to canvas and export cleanly. Only a plain \`#name\` passes between the artifact's link and \`location.hash\`, never \`#/path\`, \`#key=value\`, a \`pushState\` path or a query string. The address bar on the artifact's own page and Share's Copy link follow the page's hash; beside a chat, in a project or in an app the bar may not. Only where a page has several views worth bookmarking or sending, route on the hash: name each in ASCII letters, digits and hyphens (never \`settings\`, \`sidebar\`, \`customize\`, \`upgrade\`, \`downloads\` or \`comment-*\`, which claude.ai reserves) and show the one in \`location.hash\`, or the start view if none, on load and on \`hashchange\`. Keep other state in the page, and keys, tokens or private values out of the hash: it shows in history and copied links.

**Browser storage**: \`localStorage\` (also \`sessionStorage\` and IndexedDB) works, but each artifact has its own origin and the data lives only in that viewer's browser \u2014 it survives republishes to the same URL and never reaches other viewers, other devices, or Claude. It can come back empty or the accessor can throw (a private window, cleared or blocked site data, previews or thumbnail capture), so wrap every read and write in try/catch and render the page correctly without it. Use it only for per-viewer conveniences (a remembered tab or filter, a collapsed section, an unsent draft), never for state that must persist reliably, be shared between viewers, or be read back by Claude \u2014 state like that belongs in a runtime capability when this user has one: load the \`${ARTIFACT_CAPABILITIES}\` skill before writing the page.

**Size**: The rendered page must be ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB or smaller, and embedded data: URIs count toward that.

${PAGE_RULES_RESPONSIVE_TEXT}

${PAGE_RULES_THEME_TEXT}

**Icon** (on every first publish): Pass one short generic word as \`icon\` (e.g. \`"chart"\`, \`"calendar"\`, \`"recipe"\`) for the artifact's browser-tab icon \u2014 a plain signifier for what the page is, never a product or brand name, and never an emoji or markup. It stays the **same** for the life of an artifact, so on a redeploy (the same file path this session, or \`url\`) omit \`icon\` and the artifact keeps the one it has; pass a different one only when the user asks.`;
var PAGE_RULES_DEVICE_TEXT = [
  [
    `Camera, microphone, screen capture, location, motion, Web Share and similar device APIs are refused without a prompt \u2014 build on one only when this user has a runtime capability for that device (the \`${ARTIFACT_CAPABILITIES}\` skill lists them) and the page declares it; otherwise take photos, audio and data as uploaded files instead (file inputs, drag-and-drop of files and \`FileReader\` work in browsers). A screen wake lock may be granted while the page is visible: request it and tolerate rejection.`,
    "Camera, microphone, screen capture, location, Web Share and similar device APIs are refused without a prompt \u2014 don't build features on them (a screen wake lock may be granted while the page is visible: request it and tolerate rejection); file inputs, drag-and-drop of files and `FileReader` work in browsers, so take photos, audio and data as uploaded files instead.",
  ],
];
//@ chunk-2s0t9kzn.js:23267-23433 placement
function liftPromptParagraphs(text, replacements) {
  let result = text;
  for (let [from, to] of replacements) {
    if (!result.includes(from)) throw Error("core prompt: a lifted paragraph lacks a spelling it rewrites");
    result = result.replaceAll(from, to);
  }
  return result;
}
//@ chunk-2s0t9kzn.js:23433-23849 placement
/**
 * 完整版页面提示词使用的措辞替换表。
 */
var PROMPT_SPELLING_SWAPS; // deferred: uses ARTIFACT_TOOL_NAME (./constants.js) of its import cycle while loading; runs once the cycle is complete
var PROMPT_SPELLING_SWAPS_FULL;
deferInit("chunk-2s0t9kzn.js:23433", () => {
  PROMPT_SPELLING_SWAPS = [
    [
      '`action: "status"` lists the rooms',
      `the \`${ARTIFACT_COMMENTS_TOOL_NAME}\` tool's \`watch\` action with no \`url\` lists the rooms`,
    ],
  ];
  PROMPT_SPELLING_SWAPS_FULL = [
    [
      '`action: "status"` lists the rooms this session is in and, while your own user has the page open, the presence data their page shares with the room',
      "no tool in this session lists the rooms it is in; while your own user has the page open, their page shares presence data with the room",
    ],
  ];
});
//@ chunk-2s0t9kzn.js:23849-23963 placement
function artifactToolsPresent(tools) {
  let names = new Set((tools ?? []).map((tool) => tool.name));
  return {
    comments: names.has(ARTIFACT_COMMENTS_TOOL_NAME),
    data: names.has(ARTIFACT_DATA_TOOL_NAME),
    check: names.has(ARTIFACT_CHECK_TOOL_NAME),
  };
}
//@ chunk-2s0t9kzn.js:23963-24127 placement
var CSP_HOSTS_IN_TOOL_DESCRIPTION =
  "the Artifact tool's description lists the few other script hosts the CSP admits";
var CSP_HOSTS_IN_PAGE_CONTRACT = "the page contract above lists the few other script hosts the CSP admits";
//@ chunk-2s0t9kzn.js:24127-24186 placement
function withPageContractHeader(prompt) {
  let header = pageContractSection();
  return header === ""
    ? prompt
    : header + prompt.replace(CSP_HOSTS_IN_TOOL_DESCRIPTION, CSP_HOSTS_IN_PAGE_CONTRACT);
}
//@ chunk-2s0t9kzn.js:24186-24305 placement
function pageRulesText() {
  let thumbnailText = isFrameDeclaredThumbnailEnabled()
    ? `**Thumbnail** (optional): ${THUMBNAIL_LINK_HELP}

`
    : "";
  return `${FORMAT_PARAGRAPH}

**Skeleton**: ${SKELETON_SENTENCES}

${TITLE_PARAGRAPH}

${thumbnailText}${PAGE_RULES_LIBRARY_TEXT}`;
}
//@ chunk-2s0t9kzn.js:24305-24518 placement
function pageContractSection() {
  if (!isArtifactToolsetSplit()) return "";
  return `## Page contract \u2014 read before your first publish

These are the Artifact tool's own rules for the file you publish; the design guidance below builds on them.

${pageRulesText()}

`;
}
//@ chunk-2s0t9kzn.js:24518-24665 placement
function pageContractFallbackHeader() {
  return `**Page contract** (the \`artifact-design\` skill is not available in this session, so its rules follow here):

${liftPromptParagraphs(pageRulesText(), PAGE_RULES_DEVICE_TEXT)}`;
}
export {
  withPageContractHeader,
  statefulPagesParagraph,
  republishWatchParagraph,
  liftPromptParagraphs,
  commentsWatchUnavailableNote,
  artifactToolsPresent,
  PROMPT_SPELLING_SWAPS,
  PROMPT_SPELLING_SWAPS_FULL,
  pageContractFallbackHeader,
};
