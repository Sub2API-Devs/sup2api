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
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { ALLOWED_BROWSER_PROTOCOLS } from "../../utils/browser.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getSecuritySensitiveSetting } from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { normalizeMessages, isToolResultMessage, isInterruptMessage } from "../../utils/messages.js";
import { messageSnippet } from "../../screens/repl/sessionRehydration.js";
import { isMidTurnInterjectionMessage } from "../../utils/messagePredicates.js";

//@ chunk-18hwfzwa.js:334726-334777 placement
var MAX_UNKEYED_FOOTER_LINKS = 5;
var MAX_SCANNED_LINKS = MAX_UNKEYED_FOOTER_LINKS * 4;
var MAX_PATTERN_MATCHES = MAX_SCANNED_LINKS * 10;
var MAX_FOOTER_LABEL_WIDTH = 28;
var MAX_FOOTER_URL_LENGTH = MAX_REPO_URL_CHARS;
var SLOW_PATTERN_WARN_MS = 50;
//@ chunk-18hwfzwa.js:334777-335072 placement
function setKeyedFooterLink(footerLinks, x, D) {
  let found = footerLinks.find((ee) => ee.key === x);
  if (D === null) return found ? footerLinks.filter((ee) => ee.key !== x) : footerLinks;
  if (
    found &&
    found.url === D.url &&
    found.dedupUrl === D.dedupUrl &&
    found.label === D.label &&
    found.prefix === D.prefix &&
    found.color === D.color
  )
    return footerLinks;
  return [
    {
      ...D,
      key: x,
    },
    ...footerLinks.filter((ee) => ee.key !== x && (ee.key !== undefined || !isSameFooterLink(ee, D))),
  ];
}
//@ chunk-18hwfzwa.js:335072-336957 placement
function scanFooterLinks(h, x) {
  if (!h || h.length === 0 || !x) return [];
  let D = footerLinkMatcher.of(getRootSession().host);
  let L = [];
  for (let ee of h) {
    if (ee.type !== "regex") continue;
    let { pattern, url, label } = ee;
    if (
      typeof pattern !== "string" ||
      typeof url !== "string" ||
      (label !== undefined && typeof label !== "string")
    ) {
      D.warnUnreadableRegexEntry(`${typeof pattern}/${typeof url}/${typeof label}`);
      continue;
    }
    let He = D.compiledRegex(pattern);
    if (!He) continue;
    let We = D.templatePin(url);
    if (We === null) continue;
    D.warnUnknownPlaceholders(pattern, url, label);
    let ze = 0;
    let Xe = [];
    let rt = false;
    let kt = false;
    let At = false;
    let startTime = performance.now();
    try {
      for (let Et of x.matchAll(He)) {
        if (++ze > MAX_PATTERN_MATCHES) {
          logForDebugging(
            `[footerLinks] pattern ${pattern} exceeded ${MAX_PATTERN_MATCHES} matches in one scan; stopping (newest matches beyond the ceiling are not collected)`,
            {
              level: "warn",
            },
          );
          logFeatureSad("repl_footer_links", "scan_ceiling");
          break;
        }
        Xe.push(Et);
        if (Xe.length > MAX_SCANNED_LINKS) Xe.shift();
      }
      for (let Et of Xe) {
        let groups = Et.groups ?? {};
        let Lt = fillFooterLinkTemplate(url, groups);
        if (Lt !== null && Lt.length > MAX_FOOTER_URL_LENGTH) {
          if (!kt) {
            kt = true;
            logForDebugging(
              `[footerLinks] dropping over-length url (${Lt.length} > ${MAX_FOOTER_URL_LENGTH} chars) for pattern ${pattern}`,
              {
                level: "warn",
              },
            );
            logFeatureSad("repl_footer_links", "url_too_long");
          }
          continue;
        }
        let oo = Lt === null ? null : tryParseUrl(Lt);
        if (Lt === null || !oo || urlOrigin(oo) !== We) {
          if (!rt) {
            rt = true;
            logForDebugging(
              `[footerLinks] dropping ${Lt === null ? "dot-segment" : oo ? "origin-shifted" : "unparseable"} url for pattern ${pattern}`,
              {
                level: "warn",
              },
            );
            logFeatureSad(
              "repl_footer_links",
              Lt === null ? "dot_segment_url" : oo ? "origin_shifted" : "unparseable_url",
            );
          }
          continue;
        }
        let Xt = truncateToWidth(
          stripControlChars(label ? fillTemplatePlaceholders(label, groups) : Et[0]).trim(),
          MAX_FOOTER_LABEL_WIDTH,
        );
        if (Xt === "") {
          if (!At) {
            At = true;
            logForDebugging(`[footerLinks] dropping match with empty label for pattern ${pattern}`, {
              level: "warn",
            });
            logFeatureSad("repl_footer_links", "empty_label");
          }
          continue;
        }
        L.push({
          index: Et.index ?? 0,
          match: {
            url: Lt,
            label: Xt,
          },
        });
      }
    } catch (error) {
      logForDebugging(`[footerLinks] regex exec failed for ${pattern}: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("repl_footer_links", "regex_exec_failed");
    }
    let Ot = performance.now() - startTime;
    if (Ot > SLOW_PATTERN_WARN_MS)
      logForDebugging(`[footerLinks] slow pattern (${Math.round(Ot)}ms): ${pattern}`, {
        level: "warn",
      });
  }
  return L.sort((ee, ke) => ee.index - ke.index).map((ee) => ee.match);
}
//@ chunk-18hwfzwa.js:336957-337032 placement
var TEMPLATE_PLACEHOLDER_RE = /\{([^{}]+)\}/g;
var NAMED_GROUP_RE = /\(\?<([^>=!][^>]*)>/g;
var DOT_SEGMENT_RE = /^(?:\.|%2e){1,2}$/i;
//@ chunk-18hwfzwa.js:337032-337232 placement
function fillFooterLinkTemplate(url, groups) {
  let replaced = url.replace(TEMPLATE_PLACEHOLDER_RE, (ke, Re) =>
    encodeURIComponent(normalizeFullWidthSpace(Object.hasOwn(groups, Re) ? (groups[Re] ?? "") : "")),
  );
  let L = replaced.search(/[?#]/);
  return (L === -1 ? replaced : replaced.slice(0, L)).split(/[/\\]/).some((ke) => DOT_SEGMENT_RE.test(ke))
    ? null
    : replaced;
}
//@ chunk-18hwfzwa.js:337232-337259 placement
var CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/g;
//@ chunk-18hwfzwa.js:337259-337304 placement
function stripControlChars(h) {
  return stripAnsi(h).replace(CONTROL_CHAR_RE, "");
}
//@ chunk-18hwfzwa.js:337304-337381 placement
function fillTemplatePlaceholders(label, groups) {
  return label.replace(TEMPLATE_PLACEHOLDER_RE, (D, L) =>
    Object.hasOwn(groups, L) ? (groups[L] ?? "") : "",
  );
}
//@ chunk-18hwfzwa.js:337381-337458 placement
function urlOrigin(h) {
  return h.origin !== "null" ? h.origin : `${h.protocol}//${h.host}`;
}
//@ chunk-18hwfzwa.js:337458-337515 placement
function tryParseUrl(h) {
  try {
    return new URL(h);
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
  let [keyed, unkeyed] = SS(links, (Be) => Be.key !== undefined);
  let added = [];
  for (let Be of scanned) {
    if (added.some((He) => isSameFooterLink(He, Be)) || keyed.some((He) => isSameFooterLink(He, Be)))
      continue;
    added.push(Be);
  }
  if (added.length === 0) return links;
  let filtered = unkeyed.filter((Be) => !added.some((He) => isSameFooterLink(He, Be)));
  let merged = [...keyed, ...[...added, ...filtered].slice(0, MAX_UNKEYED_FOOTER_LINKS)];
  if (
    merged.length === links.length &&
    merged.every((Be, He) => {
      let We = links[He];
      return (
        Be === We ||
        (Be.url === We.url &&
          Be.dedupUrl === We.dedupUrl &&
          Be.label === We.label &&
          Be.prefix === We.prefix &&
          Be.key === We.key &&
          Be.color === We.color)
      );
    })
  )
    return links;
  return merged;
}
//@ chunk-18hwfzwa.js:338025-338149 placement
function isSameFooterLink(h, x) {
  return (
    h.url === x.url ||
    h.url === x.dedupUrl ||
    h.dedupUrl === x.url ||
    (h.dedupUrl !== undefined && h.dedupUrl === x.dedupUrl)
  );
}
//@ chunk-18hwfzwa.js:338149-339651 placement
class FooterLinkMatcher {
  warnedUnreadableShapes = new Set();
  warnedPlaceholderConfigs = new Set();
  pinByTemplate = new Map();
  regexByPattern = new Map();
  warnUnreadableRegexEntry(h) {
    if (this.warnedUnreadableShapes.has(h)) return;
    logForDebugging(
      `[footerLinks] skipping a 'regex' entry with non-string fields (pattern/url/label types: ${h}); the entry is preserved in settings`,
      {
        level: "warn",
      },
    );
    logFeatureSad("repl_footer_links", "unreadable_entry");
    this.warnedUnreadableShapes.add(h);
  }
  warnUnknownPlaceholders(h, x, D) {
    let L = `${h}\x00${x}\x00${D ?? ""}`;
    if (this.warnedPlaceholderConfigs.has(L)) return;
    let ee = new Set([...h.matchAll(NAMED_GROUP_RE)].map((Re) => Re[1]));
    let ke = `${x}
${D ?? ""}`;
    for (let [, Re] of ke.matchAll(TEMPLATE_PLACEHOLDER_RE))
      if (Re !== undefined && !ee.has(Re))
        logForDebugging(
          `[footerLinks] template references {${Re}} but pattern ${h} has no such named capture group`,
          {
            level: "warn",
          },
        );
    this.warnedPlaceholderConfigs.add(L);
  }
  templatePin(h) {
    if (this.pinByTemplate.has(h)) return this.pinByTemplate.get(h) ?? null;
    let x = tryParseUrl(h.replace(TEMPLATE_PLACEHOLDER_RE, "x"));
    if (!x || !ALLOWED_BROWSER_PROTOCOLS.has(x.protocol)) {
      logForDebugging(
        `[footerLinks] url template "${h}" must have a literal origin with an allowlisted scheme (e.g. https://host/...); skipping`,
        {
          level: "warn",
        },
      );
      logFeatureSad("repl_footer_links", "bad_url_template");
      this.pinByTemplate.set(h, null);
      return null;
    }
    let D = urlOrigin(x);
    this.pinByTemplate.set(h, D);
    return D;
  }
  compiledRegex(h) {
    if (this.regexByPattern.has(h)) return this.regexByPattern.get(h) ?? null;
    let x = null;
    try {
      x = new RegExp(h, "g");
    } catch (error) {
      logForDebugging(`[footerLinks] invalid pattern ${h}: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("repl_footer_links", "invalid_pattern");
    }
    this.regexByPattern.set(h, x);
    return x;
  }
}
//@ chunk-18hwfzwa.js:339651-339678 placement
var footerLinkMatcher = new HostScoped(() => new FooterLinkMatcher());
//@ chunk-18hwfzwa.js:339678-339709 placement
var MAX_SESSION_TEXT_CHARS = 8192;
var LINK_SCAN_TEXT_LIMIT = 65536;
var LINK_SCAN_MESSAGE_LIMIT = 256;
//@ chunk-18hwfzwa.js:339709-339789 placement
function getFooterLinksRegexes() {
  let h = getSecuritySensitiveSetting("footerLinksRegexes").flat();
  return h.length > 0 ? h : undefined;
}
//@ chunk-18hwfzwa.js:339789-340112 placement
/**
 * 会话恢复时重新计算页脚链接：按当前正则过滤，与原列表完全相同时返回 null。
 */
function rehydrateFooterLinks(h, footerLinks) {
  let footerLinksRegexes = getFooterLinksRegexes();
  let filtered = footerLinks.filter((ke) => ke.key !== undefined);
  let ee =
    !footerLinksRegexes || footerLinksRegexes.length === 0
      ? filtered
      : rescanFooterLinks(h, footerLinksRegexes, filtered);
  if (
    footerLinks.length === ee.length &&
    footerLinks.every((ke, Re) => {
      let Be = ee[Re];
      return (
        Be !== undefined &&
        ke.url === Be.url &&
        ke.dedupUrl === Be.dedupUrl &&
        ke.label === Be.label &&
        ke.prefix === Be.prefix &&
        ke.key === Be.key &&
        ke.color === Be.color
      );
    })
  )
    return null;
  return ee;
}
//@ chunk-18hwfzwa.js:340112-340411 placement
function updateFooterLinks(snapshot, setAppState) {
  try {
    let footerLinksRegexes = getFooterLinksRegexes();
    if (!footerLinksRegexes || footerLinksRegexes.length === 0) return;
    let L = recentTextForLinkScan(getMessagesAfterLastRealUserPrompt(snapshot));
    let scanned = L ? scanFooterLinks(footerLinksRegexes, L).reverse() : [];
    if (scanned.length === 0) return;
    logFeatureOk("repl_footer_links");
    setAppState((ke) => {
      let Re = mergeScannedFooterLinks(ke.footerLinks, scanned);
      return Re === ke.footerLinks
        ? ke
        : {
            ...ke,
            footerLinks: Re,
          };
    });
  } catch (error) {
    logError(error);
    logFeatureBad("repl_footer_links", "scan_failed");
  }
}
//@ chunk-18hwfzwa.js:340411-340524 placement
function rescanFooterLinks(h, footerLinksRegexes, links = []) {
  if (!footerLinksRegexes || footerLinksRegexes.length === 0) return links;
  let L = recentTextForLinkScan(h);
  if (!L) return links;
  return mergeScannedFooterLinks(links, scanFooterLinks(footerLinksRegexes, L).reverse());
}
//@ chunk-18hwfzwa.js:340524-340801 placement
function recentTextForLinkScan(h) {
  let x = "";
  let D = 0;
  for (
    let idx = h.length - 1;
    idx >= 0 && x.length < LINK_SCAN_TEXT_LIMIT && D < LINK_SCAN_MESSAGE_LIMIT;
    idx--
  ) {
    let ee = h[idx];
    if (!messageTextForLinkScan(ee)) continue;
    D++;
    let ke = [];
    for (let Re of normalizeMessages([ee], true)) {
      let Be = messageSnippet(Re);
      if (Be) ke.push(Be);
    }
    if (ke.length > 0) {
      let joined = ke.join(`
`);
      x = x
        ? joined +
          `
` +
          x
        : joined;
    }
  }
  return x.length > LINK_SCAN_TEXT_LIMIT ? x.slice(-LINK_SCAN_TEXT_LIMIT) : x;
}
//@ chunk-18hwfzwa.js:340801-341166 placement
function messageTextForLinkScan(h) {
  if (h.type === "assistant")
    return Array.isArray(h.message.content) && h.message.content.some((x) => x.type === "text");
  if (h.type === "user") {
    if (h.isMeta || !Array.isArray(h.message.content)) return false;
    return h.message.content.some(
      (x) =>
        x.type === "tool_result" &&
        (typeof x.content === "string" ||
          (Array.isArray(x.content) && x.content.some((D) => D.type === "text"))),
    );
  }
  return false;
}
//@ chunk-18hwfzwa.js:341166-341317 sole-consumer
/**
 * 从末尾找最后一条真实用户输入（非 meta、非 tool_result、非中断文本、非插话前缀），返回其后的消息。旧版名 getAutoModeFullInstructions 为错配。
 */
function getMessagesAfterLastRealUserPrompt(h) {
  for (let idx = h.length - 1; idx >= 0; idx--) {
    let D = h[idx];
    if (
      D.type === "user" &&
      !D.isMeta &&
      !isToolResultMessage(D) &&
      !isInterruptMessage(D) &&
      !isMidTurnInterjectionMessage(D)
    )
      return h.slice(idx + 1);
  }
  return h.slice();
}
export {
  MAX_SESSION_TEXT_CHARS,
  rehydrateFooterLinks,
  setKeyedFooterLink,
  MAX_UNKEYED_FOOTER_LINKS,
  updateFooterLinks,
};
