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
import { L8e } from "../../utils/detectRepository.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { truncateToWidth } from "../../utils/format.js";
import { errorMessage } from "../../utils/errors.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";
import { Yn } from "../../utils/stripAnsi.js";
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { yes } from "../../utils/browser.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getSecuritySensitiveSetting } from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { normalizeMessages, isToolResultMessage, isInterruptMessage } from "../../utils/messages.js";
import { messageSnippet } from "../../screens/repl/sessionRehydration.js";
import { isMidTurnInterjectionMessage } from "./_new/isMidTurnInterjectionMessage.js";

//@ chunk-18hwfzwa.js:334726-334777 placement
var QH = 5,
  gWe = QH * 4,
  aWe = gWe * 10,
  dBt = 28,
  lWe = L8e,
  cBt = 50;
//@ chunk-18hwfzwa.js:334777-335072 placement
function setKeyedFooterLink(h, x, D) {
  let found = h.find((ee) => ee.key === x);
  if (D === null) return found ? h.filter((ee) => ee.key !== x) : h;
  if (
    found &&
    found.url === D.url &&
    found.dedupUrl === D.dedupUrl &&
    found.label === D.label &&
    found.prefix === D.prefix &&
    found.color === D.color
  )
    return h;
  return [
    { ...D, key: x },
    ...h.filter((ee) => ee.key !== x && (ee.key !== void 0 || !isSameFooterLink(ee, D))),
  ];
}
//@ chunk-18hwfzwa.js:335072-336957 placement
function scanFooterLinks(h, x) {
  if (!h || h.length === 0 || !x) return [];
  let of = SBt.of(getRootSession().host),
    L = [];
  for (let ee of h) {
    if (ee.type !== "regex") continue;
    let { pattern: pattern, url: url, label: label } = ee;
    if (
      typeof pattern !== "string" ||
      typeof url !== "string" ||
      (label !== void 0 && typeof label !== "string")
    ) {
      of.warnUnreadableRegexEntry(`${typeof pattern}/${typeof url}/${typeof label}`);
      continue;
    }
    let compiledRegex = of.compiledRegex(pattern);
    if (!compiledRegex) continue;
    let templatePin = of.templatePin(url);
    if (templatePin === null) continue;
    of.warnUnknownPlaceholders(pattern, url, label);
    let ze = 0,
      Xe = [],
      rt = !1,
      kt = !1,
      At = !1,
      startTime = performance.now();
    try {
      for (let Et of x.matchAll(compiledRegex)) {
        if (++ze > aWe) {
          (logForDebugging(
            `[footerLinks] pattern ${pattern} exceeded ${aWe} matches in one scan; stopping (newest matches beyond the ceiling are not collected)`,
            { level: "warn" },
          ),
            logFeatureSad("repl_footer_links", "scan_ceiling"));
          break;
        }
        if ((Xe.push(Et), Xe.length > gWe)) Xe.shift();
      }
      for (let Et of Xe) {
        let Dt = Et.groups ?? {},
          Lt = fillFooterLinkTemplate(url, Dt);
        if (Lt !== null && Lt.length > lWe) {
          if (!kt)
            ((kt = !0),
              logForDebugging(
                `[footerLinks] dropping over-length url (${Lt.length} > ${lWe} chars) for pattern ${pattern}`,
                { level: "warn" },
              ),
              logFeatureSad("repl_footer_links", "url_too_long"));
          continue;
        }
        let oo = Lt === null ? null : wWe(Lt);
        if (Lt === null || !oo || yWe(oo) !== templatePin) {
          if (!rt)
            ((rt = !0),
              logForDebugging(
                `[footerLinks] dropping ${Lt === null ? "dot-segment" : oo ? "origin-shifted" : "unparseable"} url for pattern ${pattern}`,
                { level: "warn" },
              ),
              logFeatureSad(
                "repl_footer_links",
                Lt === null ? "dot_segment_url" : oo ? "origin_shifted" : "unparseable_url",
              ));
          continue;
        }
        let Xt = truncateToWidth(hBt(label ? yBt(label, Dt) : Et[0]).trim(), dBt);
        if (Xt === "") {
          if (!At)
            ((At = !0),
              logForDebugging(`[footerLinks] dropping match with empty label for pattern ${pattern}`, {
                level: "warn",
              }),
              logFeatureSad("repl_footer_links", "empty_label"));
          continue;
        }
        L.push({ index: Et.index ?? 0, match: { url: Lt, label: Xt } });
      }
    } catch (error) {
      (logForDebugging(`[footerLinks] regex exec failed for ${pattern}: ${errorMessage(error)}`, {
        level: "warn",
      }),
        logFeatureSad("repl_footer_links", "regex_exec_failed"));
    }
    let Ot = performance.now() - startTime;
    if (Ot > cBt)
      logForDebugging(`[footerLinks] slow pattern (${Math.round(Ot)}ms): ${pattern}`, { level: "warn" });
  }
  return L.sort((ee, ke) => ee.index - ke.index).map((ee) => ee.match);
}
//@ chunk-18hwfzwa.js:336957-337032 placement
var nz = /\{([^{}]+)\}/g,
  uBt = /\(\?<([^>=!][^>]*)>/g,
  mBt = /^(?:\.|%2e){1,2}$/i;
//@ chunk-18hwfzwa.js:337032-337232 placement
function fillFooterLinkTemplate(h, x) {
  let replaced = h.replace(nz, (ke, Re) =>
      encodeURIComponent(normalizeFullWidthSpace(Object.hasOwn(x, Re) ? (x[Re] ?? "") : "")),
    ),
    search = replaced.search(/[?#]/);
  return (search === -1 ? replaced : replaced.slice(0, search)).split(/[/\\]/).some((ke) => mBt.test(ke))
    ? null
    : replaced;
}
//@ chunk-18hwfzwa.js:337232-337259 placement
var gBt = /[\x00-\x1f\x7f]/g;
//@ chunk-18hwfzwa.js:337259-337304 placement
function hBt(h) {
  return Yn(h).replace(gBt, "");
}
//@ chunk-18hwfzwa.js:337304-337381 placement
function yBt(h, x) {
  return h.replace(nz, (D, L) => (Object.hasOwn(x, L) ? (x[L] ?? "") : ""));
}
//@ chunk-18hwfzwa.js:337381-337458 placement
function yWe(h) {
  return h.origin !== "null" ? h.origin : `${h.protocol}//${h.host}`;
}
//@ chunk-18hwfzwa.js:337458-337515 placement
function wWe(h) {
  try {
    return new URL(h);
  } catch {
    return null;
  }
}
/**
 * 把从对话中扫描到的链接合入页脚链接：保留带 key 的固定项，新链接去重后放前面，未带 key 的项限制数量；内容没变时返回原数组。
 */
//@ chunk-18hwfzwa.js:337515-338025 placement
function mergeScannedFooterLinks(links, scanned) {
  if (scanned.length === 0) return links;
  let [keyed, unkeyed] = SS(links, (Be) => Be.key !== void 0),
    added = [];
  for (let Be of scanned) {
    if (added.some((He) => isSameFooterLink(He, Be)) || keyed.some((He) => isSameFooterLink(He, Be)))
      continue;
    added.push(Be);
  }
  if (added.length === 0) return links;
  let filtered = unkeyed.filter((Be) => !added.some((He) => isSameFooterLink(He, Be))),
    merged = [...keyed, ...[...added, ...filtered].slice(0, QH)];
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
    (h.dedupUrl !== void 0 && h.dedupUrl === x.dedupUrl)
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
    (logForDebugging(
      `[footerLinks] skipping a 'regex' entry with non-string fields (pattern/url/label types: ${h}); the entry is preserved in settings`,
      { level: "warn" },
    ),
      logFeatureSad("repl_footer_links", "unreadable_entry"),
      this.warnedUnreadableShapes.add(h));
  }
  warnUnknownPlaceholders(h, x, D) {
    let L = `${h}\x00${x}\x00${D ?? ""}`;
    if (this.warnedPlaceholderConfigs.has(L)) return;
    let ee = new Set([...h.matchAll(uBt)].map((Re) => Re[1])),
      ke = `${x}
${D ?? ""}`;
    for (let [, Re] of ke.matchAll(nz))
      if (Re !== void 0 && !ee.has(Re))
        logForDebugging(
          `[footerLinks] template references {${Re}} but pattern ${h} has no such named capture group`,
          { level: "warn" },
        );
    this.warnedPlaceholderConfigs.add(L);
  }
  templatePin(h) {
    if (this.pinByTemplate.has(h)) return this.pinByTemplate.get(h) ?? null;
    let x = wWe(h.replace(nz, "x"));
    if (!x || !yes.has(x.protocol))
      return (
        logForDebugging(
          `[footerLinks] url template "${h}" must have a literal origin with an allowlisted scheme (e.g. https://host/...); skipping`,
          { level: "warn" },
        ),
        logFeatureSad("repl_footer_links", "bad_url_template"),
        this.pinByTemplate.set(h, null),
        null
      );
    let D = yWe(x);
    return (this.pinByTemplate.set(h, D), D);
  }
  compiledRegex(h) {
    if (this.regexByPattern.has(h)) return this.regexByPattern.get(h) ?? null;
    let x = null;
    try {
      x = new RegExp(h, "g");
    } catch (error) {
      (logForDebugging(`[footerLinks] invalid pattern ${h}: ${errorMessage(error)}`, { level: "warn" }),
        logFeatureSad("repl_footer_links", "invalid_pattern"));
    }
    return (this.regexByPattern.set(h, x), x);
  }
}
//@ chunk-18hwfzwa.js:339651-339678 placement
var SBt = new HostScoped(() => new FooterLinkMatcher());
//@ chunk-18hwfzwa.js:339678-339709 placement
var _We = 8192,
  Aae = 65536,
  bBt = 256;
//@ chunk-18hwfzwa.js:339709-339789 placement
function getFooterLinksRegexes() {
  let flat = getSecuritySensitiveSetting("footerLinksRegexes").flat();
  return flat.length > 0 ? flat : void 0;
}
/**
 * 会话恢复时重新计算页脚链接：按当前正则过滤，与原列表完全相同时返回 null。
 */
//@ chunk-18hwfzwa.js:339789-340112 placement
function rehydrateFooterLinks(h, x) {
  let D = getFooterLinksRegexes(),
    filtered = x.filter((ke) => ke.key !== void 0),
    ee = !D || D.length === 0 ? filtered : rescanFooterLinks(h, D, filtered);
  if (
    x.length === ee.length &&
    x.every((ke, Re) => {
      let Be = ee[Re];
      return (
        Be !== void 0 &&
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
function updateFooterLinks(h, x) {
  try {
    let D = getFooterLinksRegexes();
    if (!D || D.length === 0) return;
    let L = recentTextForLinkScan(getMessagesAfterLastRealUserPrompt(h)),
      ee = L ? scanFooterLinks(D, L).reverse() : [];
    if (ee.length === 0) return;
    (logFeatureOk("repl_footer_links"),
      x((ke) => {
        let Re = mergeScannedFooterLinks(ke.footerLinks, ee);
        return Re === ke.footerLinks ? ke : { ...ke, footerLinks: Re };
      }));
  } catch (error) {
    (logError(error), logFeatureBad("repl_footer_links", "scan_failed"));
  }
}
//@ chunk-18hwfzwa.js:340411-340524 placement
function rescanFooterLinks(h, x, D = []) {
  if (!x || x.length === 0) return D;
  let L = recentTextForLinkScan(h);
  if (!L) return D;
  return mergeScannedFooterLinks(D, scanFooterLinks(x, L).reverse());
}
//@ chunk-18hwfzwa.js:340524-340801 placement
function recentTextForLinkScan(h) {
  let x = "",
    D = 0;
  for (let L = h.length - 1; L >= 0 && x.length < Aae && D < bBt; L--) {
    let ee = h[L];
    if (!messageTextForLinkScan(ee)) continue;
    D++;
    let ke = [];
    for (let Re of normalizeMessages([ee], !0)) {
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
  return x.length > Aae ? x.slice(-Aae) : x;
}
//@ chunk-18hwfzwa.js:340801-341166 placement
function messageTextForLinkScan(h) {
  if (h.type === "assistant")
    return Array.isArray(h.message.content) && h.message.content.some((x) => x.type === "text");
  if (h.type === "user") {
    if (h.isMeta || !Array.isArray(h.message.content)) return !1;
    return h.message.content.some(
      (x) =>
        x.type === "tool_result" &&
        (typeof x.content === "string" ||
          (Array.isArray(x.content) && x.content.some((D) => D.type === "text"))),
    );
  }
  return !1;
}
/**
 * 从末尾找最后一条真实用户输入（非 meta、非 tool_result、非中断文本、非插话前缀），返回其后的消息。旧版名 getAutoModeFullInstructions 为错配。
 */
//@ chunk-18hwfzwa.js:341166-341317 sole-consumer
function getMessagesAfterLastRealUserPrompt(h) {
  for (let x = h.length - 1; x >= 0; x--) {
    let D = h[x];
    if (
      D.type === "user" &&
      !D.isMeta &&
      !isToolResultMessage(D) &&
      !isInterruptMessage(D) &&
      !isMidTurnInterjectionMessage(D)
    )
      return h.slice(x + 1);
  }
  return h.slice();
}

export { _We, rehydrateFooterLinks, setKeyedFooterLink, QH, updateFooterLinks };
