/**
 * components/PromptInput/footerLinks.ts
 *
 * 2.1.316 新增。页脚链接项（PR、远程会话等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (22)
 * attribution: placement 21, sole-consumer 1
 */
import { MAX_REPO_URL_CHARS } from "../../utils/detectRepository.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { truncateToWidth } from "../../utils/format.js";
import { errorMessage } from "../../utils/errors.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { ALLOWED_BROWSER_PROTOCOLS } from "../../utils/browser.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getSecuritySensitiveSetting } from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { normalizeMessages, isToolResultMessage, isInterruptMessage } from "../../utils/messages.js";
import { messageSnippet } from "../../screens/repl/sessionRehydration.js";
import { isMidTurnInterjectionMessage } from "../../utils/messagePredicates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:334726-334777 placement
var MAX_UNKEYED_FOOTER_LINKS; // deferred: uses REPO_NAME_PATTERN (../../utils/detectRepository.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SCANNED_LINKS;
var MAX_PATTERN_MATCHES;
var MAX_FOOTER_LABEL_WIDTH;
var MAX_FOOTER_URL_LENGTH;
var SLOW_PATTERN_WARN_MS;
deferInit("chunk-18hwfzwa.js:334726", () => {
  MAX_UNKEYED_FOOTER_LINKS = 5;
  MAX_SCANNED_LINKS = MAX_UNKEYED_FOOTER_LINKS * 4;
  MAX_PATTERN_MATCHES = MAX_SCANNED_LINKS * 10;
  MAX_FOOTER_LABEL_WIDTH = 28;
  MAX_FOOTER_URL_LENGTH = MAX_REPO_URL_CHARS;
  SLOW_PATTERN_WARN_MS = 50;
});
//@ chunk-18hwfzwa.js:334777-335072 placement
function setKeyedFooterLink(footerLinks, key, link) {
  let found = footerLinks.find((state) => state.key === key);
  if (link === null) return found ? footerLinks.filter((state) => state.key !== key) : footerLinks;
  if (
    found &&
    found.url === link.url &&
    found.dedupUrl === link.dedupUrl &&
    found.label === link.label &&
    found.prefix === link.prefix &&
    found.color === link.color
  )
    return footerLinks;
  return [
    {
      ...link,
      key,
    },
    ...footerLinks.filter(
      (state) => state.key !== key && (state.key !== undefined || !isSameFooterLink(state, link)),
    ),
  ];
}
//@ chunk-18hwfzwa.js:335072-336957 placement
function scanFooterLinks(links, text) {
  if (!links || links.length === 0 || !text) return [];
  let matcher = footerLinkMatcher.of(getRootSession().host);
  let results = [];
  for (let link of links) {
    if (link.type !== "regex") continue;
    let { pattern, url, label } = link;
    if (
      typeof pattern !== "string" ||
      typeof url !== "string" ||
      (label !== undefined && typeof label !== "string")
    ) {
      matcher.warnUnreadableRegexEntry(`${typeof pattern}/${typeof url}/${typeof label}`);
      continue;
    }
    let regex = matcher.compiledRegex(pattern);
    if (!regex) continue;
    let pinnedOrigin = matcher.templatePin(url);
    if (pinnedOrigin === null) continue;
    matcher.warnUnknownPlaceholders(pattern, url, label);
    let matchCount = 0;
    let matches = [];
    let warnedOrigin = false;
    let warnedLength = false;
    let warnedLabel = false;
    let startTime = performance.now();
    try {
      for (let match of text.matchAll(regex)) {
        if (++matchCount > MAX_PATTERN_MATCHES) {
          logForDebugging(
            `[footerLinks] pattern ${pattern} exceeded ${MAX_PATTERN_MATCHES} matches in one scan; stopping (newest matches beyond the ceiling are not collected)`,
            {
              level: "warn",
            },
          );
          logFeatureSad("repl_footer_links", "scan_ceiling");
          break;
        }
        matches.push(match);
        if (matches.length > MAX_SCANNED_LINKS) matches.shift();
      }
      for (let match of matches) {
        let groups = match.groups ?? {};
        let filledUrl = fillFooterLinkTemplate(url, groups);
        if (filledUrl !== null && filledUrl.length > MAX_FOOTER_URL_LENGTH) {
          if (!warnedLength) {
            warnedLength = true;
            logForDebugging(
              `[footerLinks] dropping over-length url (${filledUrl.length} > ${MAX_FOOTER_URL_LENGTH} chars) for pattern ${pattern}`,
              {
                level: "warn",
              },
            );
            logFeatureSad("repl_footer_links", "url_too_long");
          }
          continue;
        }
        let parsedUrl = filledUrl === null ? null : tryParseUrl(filledUrl);
        if (filledUrl === null || !parsedUrl || urlOrigin(parsedUrl) !== pinnedOrigin) {
          if (!warnedOrigin) {
            warnedOrigin = true;
            logForDebugging(
              `[footerLinks] dropping ${filledUrl === null ? "dot-segment" : parsedUrl ? "origin-shifted" : "unparseable"} url for pattern ${pattern}`,
              {
                level: "warn",
              },
            );
            logFeatureSad(
              "repl_footer_links",
              filledUrl === null ? "dot_segment_url" : parsedUrl ? "origin_shifted" : "unparseable_url",
            );
          }
          continue;
        }
        let labelText = truncateToWidth(
          stripControlChars(label ? fillTemplatePlaceholders(label, groups) : match[0]).trim(),
          MAX_FOOTER_LABEL_WIDTH,
        );
        if (labelText === "") {
          if (!warnedLabel) {
            warnedLabel = true;
            logForDebugging(`[footerLinks] dropping match with empty label for pattern ${pattern}`, {
              level: "warn",
            });
            logFeatureSad("repl_footer_links", "empty_label");
          }
          continue;
        }
        results.push({
          index: match.index ?? 0,
          match: {
            url: filledUrl,
            label: labelText,
          },
        });
      }
    } catch (error) {
      logForDebugging(`[footerLinks] regex exec failed for ${pattern}: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("repl_footer_links", "regex_exec_failed");
    }
    let elapsedMs = performance.now() - startTime;
    if (elapsedMs > SLOW_PATTERN_WARN_MS)
      logForDebugging(`[footerLinks] slow pattern (${Math.round(elapsedMs)}ms): ${pattern}`, {
        level: "warn",
      });
  }
  return results.sort((left, right) => left.index - right.index).map((entry) => entry.match);
}
//@ chunk-18hwfzwa.js:336957-337032 placement
var TEMPLATE_PLACEHOLDER_RE = /\{([^{}]+)\}/g;
var NAMED_GROUP_RE = /\(\?<([^>=!][^>]*)>/g;
var DOT_SEGMENT_RE = /^(?:\.|%2e){1,2}$/i;
//@ chunk-18hwfzwa.js:337032-337232 placement
function fillFooterLinkTemplate(url, groups) {
  let replaced = url.replace(TEMPLATE_PLACEHOLDER_RE, (placeholder, name) =>
    encodeURIComponent(normalizeFullWidthSpace(Object.hasOwn(groups, name) ? (groups[name] ?? "") : "")),
  );
  let queryIndex = replaced.search(/[?#]/);
  return (queryIndex === -1 ? replaced : replaced.slice(0, queryIndex))
    .split(/[/\\]/)
    .some((segment) => DOT_SEGMENT_RE.test(segment))
    ? null
    : replaced;
}
//@ chunk-18hwfzwa.js:337232-337259 placement
var CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/g;
//@ chunk-18hwfzwa.js:337259-337304 placement
function stripControlChars(label) {
  return stripAnsi(label).replace(CONTROL_CHAR_RE, "");
}
//@ chunk-18hwfzwa.js:337304-337381 placement
function fillTemplatePlaceholders(label, groups) {
  return label.replace(TEMPLATE_PLACEHOLDER_RE, (match, name) =>
    Object.hasOwn(groups, name) ? (groups[name] ?? "") : "",
  );
}
//@ chunk-18hwfzwa.js:337381-337458 placement
function urlOrigin(url) {
  return url.origin !== "null" ? url.origin : `${url.protocol}//${url.host}`;
}
//@ chunk-18hwfzwa.js:337458-337515 placement
function tryParseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
//@ chunk-18hwfzwa.js:337515-338025 placement
/**
 * 把从对话中扫描到的链接合入页脚链接：保留带 key 的固定项，新链接去重后放前面，未带 key 的项限制数量；内容没变时返回原数组。
 */
function mergeScannedFooterLinks(links, scanned) {
  if (scanned.length === 0) return links;
  let [keyed, unkeyed] = partitionAlias(links, (state) => state.key !== undefined);
  let added = [];
  for (let scannedLink of scanned) {
    if (
      added.some((existing) => isSameFooterLink(existing, scannedLink)) ||
      keyed.some((keyedLink) => isSameFooterLink(keyedLink, scannedLink))
    )
      continue;
    added.push(scannedLink);
  }
  if (added.length === 0) return links;
  let filtered = unkeyed.filter(
    (unkeyedLink) => !added.some((addedLink) => isSameFooterLink(addedLink, unkeyedLink)),
  );
  let merged = [...keyed, ...[...added, ...filtered].slice(0, MAX_UNKEYED_FOOTER_LINKS)];
  if (
    merged.length === links.length &&
    merged.every((link, index) => {
      let previous = links[index];
      return (
        link === previous ||
        (link.url === previous.url &&
          link.dedupUrl === previous.dedupUrl &&
          link.label === previous.label &&
          link.prefix === previous.prefix &&
          link.key === previous.key &&
          link.color === previous.color)
      );
    })
  )
    return links;
  return merged;
}
//@ chunk-18hwfzwa.js:338025-338149 placement
function isSameFooterLink(link, other) {
  return (
    link.url === other.url ||
    link.url === other.dedupUrl ||
    link.dedupUrl === other.url ||
    (link.dedupUrl !== undefined && link.dedupUrl === other.dedupUrl)
  );
}
//@ chunk-18hwfzwa.js:338149-339651 placement
class FooterLinkMatcher {
  warnedUnreadableShapes = new Set();
  warnedPlaceholderConfigs = new Set();
  pinByTemplate = new Map();
  regexByPattern = new Map();
  warnUnreadableRegexEntry(shape) {
    if (this.warnedUnreadableShapes.has(shape)) return;
    logForDebugging(
      `[footerLinks] skipping a 'regex' entry with non-string fields (pattern/url/label types: ${shape}); the entry is preserved in settings`,
      {
        level: "warn",
      },
    );
    logFeatureSad("repl_footer_links", "unreadable_entry");
    this.warnedUnreadableShapes.add(shape);
  }
  warnUnknownPlaceholders(pattern, urlTemplate, labelTemplate) {
    let configKey = `${pattern}\x00${urlTemplate}\x00${labelTemplate ?? ""}`;
    if (this.warnedPlaceholderConfigs.has(configKey)) return;
    let groupNames = new Set([...pattern.matchAll(NAMED_GROUP_RE)].map((match) => match[1]));
    let templates = `${urlTemplate}
${labelTemplate ?? ""}`;
    for (let [, name] of templates.matchAll(TEMPLATE_PLACEHOLDER_RE))
      if (name !== undefined && !groupNames.has(name))
        logForDebugging(
          `[footerLinks] template references {${name}} but pattern ${pattern} has no such named capture group`,
          {
            level: "warn",
          },
        );
    this.warnedPlaceholderConfigs.add(configKey);
  }
  templatePin(template) {
    if (this.pinByTemplate.has(template)) return this.pinByTemplate.get(template) ?? null;
    let parsed = tryParseUrl(template.replace(TEMPLATE_PLACEHOLDER_RE, "x"));
    if (!parsed || !ALLOWED_BROWSER_PROTOCOLS.has(parsed.protocol)) {
      logForDebugging(
        `[footerLinks] url template "${template}" must have a literal origin with an allowlisted scheme (e.g. https://host/...); skipping`,
        {
          level: "warn",
        },
      );
      logFeatureSad("repl_footer_links", "bad_url_template");
      this.pinByTemplate.set(template, null);
      return null;
    }
    let origin = urlOrigin(parsed);
    this.pinByTemplate.set(template, origin);
    return origin;
  }
  compiledRegex(pattern) {
    if (this.regexByPattern.has(pattern)) return this.regexByPattern.get(pattern) ?? null;
    let regex = null;
    try {
      regex = new RegExp(pattern, "g");
    } catch (error) {
      logForDebugging(`[footerLinks] invalid pattern ${pattern}: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("repl_footer_links", "invalid_pattern");
    }
    this.regexByPattern.set(pattern, regex);
    return regex;
  }
}
//@ chunk-18hwfzwa.js:339651-339678 placement
var footerLinkMatcher; // deferred: uses FooterLinkMatcher of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:339651", () => {
  footerLinkMatcher = new HostScoped(() => new FooterLinkMatcher());
});
//@ chunk-18hwfzwa.js:339678-339709 placement
var MAX_SESSION_TEXT_CHARS = 8192;
var LINK_SCAN_TEXT_LIMIT = 65536;
var LINK_SCAN_MESSAGE_LIMIT = 256;
//@ chunk-18hwfzwa.js:339709-339789 placement
function getFooterLinksRegexes() {
  let regexes = getSecuritySensitiveSetting("footerLinksRegexes").flat();
  return regexes.length > 0 ? regexes : undefined;
}
//@ chunk-18hwfzwa.js:339789-340112 placement
/**
 * 会话恢复时重新计算页脚链接：按当前正则过滤，与原列表完全相同时返回 null。
 */
function rehydrateFooterLinks(messages, footerLinks) {
  let footerLinksRegexes = getFooterLinksRegexes();
  let filtered = footerLinks.filter((state) => state.key !== undefined);
  let rehydrated =
    !footerLinksRegexes || footerLinksRegexes.length === 0
      ? filtered
      : rescanFooterLinks(messages, footerLinksRegexes, filtered);
  if (
    footerLinks.length === rehydrated.length &&
    footerLinks.every((link, index) => {
      let next = rehydrated[index];
      return (
        next !== undefined &&
        link.url === next.url &&
        link.dedupUrl === next.dedupUrl &&
        link.label === next.label &&
        link.prefix === next.prefix &&
        link.key === next.key &&
        link.color === next.color
      );
    })
  )
    return null;
  return rehydrated;
}
//@ chunk-18hwfzwa.js:340112-340411 placement
function updateFooterLinks(messages, setAppState) {
  try {
    let links = getFooterLinksRegexes();
    if (!links || links.length === 0) return;
    let recentText = recentTextForLinkScan(getMessagesAfterLastRealUserPrompt(messages));
    let scanned = recentText ? scanFooterLinks(links, recentText).reverse() : [];
    if (scanned.length === 0) return;
    logFeatureOk("repl_footer_links");
    setAppState((state) => {
      let nextLinks = mergeScannedFooterLinks(state.footerLinks, scanned);
      return nextLinks === state.footerLinks
        ? state
        : {
            ...state,
            footerLinks: nextLinks,
          };
    });
  } catch (error) {
    logError(error);
    logFeatureBad("repl_footer_links", "scan_failed");
  }
}
//@ chunk-18hwfzwa.js:340411-340524 placement
function rescanFooterLinks(messages, links, links_2 = []) {
  if (!links || links.length === 0) return links_2;
  let recentText = recentTextForLinkScan(messages);
  if (!recentText) return links_2;
  return mergeScannedFooterLinks(links_2, scanFooterLinks(links, recentText).reverse());
}
//@ chunk-18hwfzwa.js:340524-340801 placement
function recentTextForLinkScan(inputText) {
  let text = "";
  let messageCount = 0;
  for (
    let idx = inputText.length - 1;
    idx >= 0 && text.length < LINK_SCAN_TEXT_LIMIT && messageCount < LINK_SCAN_MESSAGE_LIMIT;
    idx--
  ) {
    let message = inputText[idx];
    if (!messageTextForLinkScan(message)) continue;
    messageCount++;
    let snippets = [];
    for (let normalized of normalizeMessages([message], true)) {
      let snippet = messageSnippet(normalized);
      if (snippet) snippets.push(snippet);
    }
    if (snippets.length > 0) {
      let joined = snippets.join(`
`);
      text = text
        ? joined +
          `
` +
          text
        : joined;
    }
  }
  return text.length > LINK_SCAN_TEXT_LIMIT ? text.slice(-LINK_SCAN_TEXT_LIMIT) : text;
}
//@ chunk-18hwfzwa.js:340801-341166 placement
function messageTextForLinkScan(inputText) {
  if (inputText.type === "assistant")
    return (
      Array.isArray(inputText.message.content) &&
      inputText.message.content.some((template) => template.type === "text")
    );
  if (inputText.type === "user") {
    if (inputText.isMeta || !Array.isArray(inputText.message.content)) return false;
    return inputText.message.content.some(
      (groups) =>
        groups.type === "tool_result" &&
        (typeof groups.content === "string" ||
          (Array.isArray(groups.content) && groups.content.some((link) => link.type === "text"))),
    );
  }
  return false;
}
//@ chunk-18hwfzwa.js:341166-341317 sole-consumer
/**
 * 从末尾找最后一条真实用户输入（非 meta、非 tool_result、非中断文本、非插话前缀），返回其后的消息。旧版名 getAutoModeFullInstructions 为错配。
 */
function getMessagesAfterLastRealUserPrompt(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (
      message.type === "user" &&
      !message.isMeta &&
      !isToolResultMessage(message) &&
      !isInterruptMessage(message) &&
      !isMidTurnInterjectionMessage(message)
    )
      return messages.slice(idx + 1);
  }
  return messages.slice();
}
export {
  MAX_SESSION_TEXT_CHARS,
  rehydrateFooterLinks,
  setKeyedFooterLink,
  MAX_UNKEYED_FOOTER_LINKS,
  updateFooterLinks,
};
