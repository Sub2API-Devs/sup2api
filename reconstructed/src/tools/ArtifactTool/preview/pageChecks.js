/**
 * tools/ArtifactTool/preview/pageChecks.ts
 *
 * 2.1.316 新增：页面检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (39)
 * attribution: placement 38, affinity 1
 */
import { randomUUID } from "crypto";
import { networkInterfaces } from "os";
import {
  MAX_LISTED_UNLOADED_FILES,
  CSP_VIOLATION_COLLECTOR_SCRIPT,
  PREVIEW_CSP_POLICY,
  MAX_PAGE_USES,
  MAX_LISTED_REFS,
  MAX_COLLECTED_USES,
  MAX_PAGE_OBSERVERS,
  MAX_SVG_CLIPS,
  MAX_CDP_EVENT_CHARS,
  MAX_FAILED_CHECKS,
  MAX_TRACKED_SESSIONS,
  CSP_ALLOWED_ORIGINS,
  MAX_LISTED_MISSING_FILES,
  PreviewStepTimeout,
  randomPreviewHost,
} from "./chromeSession.js";
import { plural } from "../../../utils/stringUtils.js";
import { MAX_PREVIEW_ISSUES_DROPPED } from "../promptText.js";
import { extractHtmlTitle, TITLE_SCAN_CHARS, scrubArtifactEnvelopeTags } from "../artifactUrls.js";
import {
  isFrameDeclaredThumbnailEnabled,
  MAX_ARTIFACT_BYTES,
} from "../../../services/artifacts/frameFlags.js";
import { collectThumbnailLinks } from "../thumbnails.js";
import { formatBytesDecimal } from "../../../utils/format.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { sanitizeDisplayText } from "../../../services/artifacts/capabilityDeclaration.js";
import { MERMAID_RUNTIME_PATH } from "../../../services/artifacts/pageRuntimes.js";
import { logError } from "../../../utils/log.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { startBunRelay } from "../../../upstreamproxy/relay.js";

//@ chunk-8wvtd8sr.js:179080-179430 placement
/**
 * 预览中以页面相对路径引用但未加载的文件：合成一条 note 问题，列出前 zf 个，提示发布后只有通过 files 传入才存在。
 */
function relativeRefsNotLoadedIssues(e) {
  if (e.length === 0) return [];
  let n = e.length;
  let mapped = e.slice(0, MAX_LISTED_UNLOADED_FILES).map((h) => sanitizeDisplay(h, 60));
  let r = n - mapped.length;
  return [
    {
      kind: "note",
      text: `${n} ${plural(n, "file")} referenced relative to the page ${plural(n, "is", "are")} not loaded in preview (${mapped.join(", ")}${r > 0 ? `, \u2026 ${r} more` : ""}); once published ${plural(n, "it exists", "they exist")} only if passed in \`files\``,
    },
  ];
}
//@ chunk-8wvtd8sr.js:179430-179757 placement
/**
 * 预览里 window.claude.use() 对某些能力返回 null 时，生成一条 note：依赖这些能力的代码在预览中没有运行。
 */
function missingRuntimeCapabilityIssues(e, n) {
  if (e.size === 0) return [];
  return [
    {
      kind: "note",
      text: `no artifact runtime in preview: window.claude.use() resolved null for ${[...e].map((r) => sanitizeDisplay(r, 40)).join(", ") + (n ? " and more" : "")}, so the code that needs ${plural(e.size, "that capability", "those capabilities")} did not run here \u2014 exercise it after publishing`,
    },
  ];
}
//@ chunk-8wvtd8sr.js:179757-180238 placement
/**
 * 同一宽度的浅色/深色两张截图完全相同时，报告页面没有深色主题样式（只截到顶部时措辞不同）。
 */
function identicalThemeRenderIssues(e) {
  let n = [];
  let s = new Map();
  for (let r of e) if (r.base64 !== undefined) s.set(r.width, [...(s.get(r.width) ?? []), r]);
  for (let [r, h] of s) {
    let [y, p] = h;
    if (h.length === 2 && y.theme !== p.theme && y.base64 === p.base64) {
      let w = y.pageHeight !== undefined || p.pageHeight !== undefined;
      n.push({
        kind: "theme",
        text: w
          ? `${r}: the captured top of the page is identical in light and dark \u2014 no dark-theme styles show there`
          : `${r}: light and dark renders are identical \u2014 the page has no dark-theme styles`,
      });
    }
  }
  return n;
}
//@ chunk-8wvtd8sr.js:180238-180274 placement
/**
 * 按视口宽度返回主题高度（<600 用 844，否则 900）。
 */
function themeForViewportWidth(e) {
  return e < 600 ? 844 : 900;
}
//@ chunk-8wvtd8sr.js:180274-180717 placement
/**
 * 把待预览页面改造成预览用 HTML：先禁用 speculationrules 脚本，再在 <html> 上设 data-theme，并在 <head> 开头插入预览脚本与 CSP、禁止 DNS 预取。
 * 页面骨架不符合预期时抛错。
 */
function composePreviewPage(e, n) {
  let s = disableSpeculationRules(e);
  let r = "<!doctype html><html";
  let h = "<head><meta charset=utf8>";
  let index = s.indexOf("<head><meta charset=utf8>");
  if (!s.startsWith("<!doctype html><html") || index === -1)
    throw Error("composed artifact page has an unexpected skeleton");
  let p = index + 25;
  return (
    `<!doctype html><html data-theme="${n}"` +
    s.slice(20, p) +
    CSP_VIOLATION_COLLECTOR_SCRIPT +
    `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP_POLICY}"><meta http-equiv="x-dns-prefetch-control" content="off">` +
    s.slice(p)
  );
}
//@ chunk-8wvtd8sr.js:180717-181033 placement
/**
 * 把 type 为 speculationrules 的 <script> 改写成 text/x-speculationrules-off，避免预览页面预取。
 */
function disableSpeculationRules(html) {
  let n = "";
  let s = 0;
  let r = /<script(?=[\t\n\f\r />])/gi;
  for (let match = r.exec(html); match !== null; match = r.exec(html)) {
    let y = scanTagAttributes(html, match.index + match[0].length);
    r.lastIndex = y.end;
    let p = y.type;
    if (p === undefined || !needsSpeculationRewrite(p.value)) continue;
    n += `${html.slice(s, p.start)}type=${p.quote}text/x-speculationrules-off${p.quote}`;
    s = p.end;
  }
  return s === 0 ? html : n + html.slice(s);
}
//@ chunk-8wvtd8sr.js:181033-181054 placement
var HTML_SPACE_REGEX = /[\t\n\f\r ]/;
//@ chunk-8wvtd8sr.js:181054-181677 placement
/**
 * 从标签名之后扫描属性直到 >，返回标签结束位置和第一个 type 属性（起止、值、引号）。
 */
function scanTagAttributes(html, from) {
  let length = html.length;
  let pos = from;
  let typeAttr;
  for (;;) {
    while (pos < length && (HTML_SPACE_REGEX.test(html[pos]) || html[pos] === "/")) pos++;
    if (pos >= length)
      return {
        end: length,
        type: typeAttr,
      };
    if (html[pos] === ">")
      return {
        end: pos + 1,
        type: typeAttr,
      };
    let y = pos;
    let p = html[pos] === "=" ? pos + 1 : pos;
    while (p < length && !HTML_SPACE_REGEX.test(html[p]) && !"/>=".includes(html[p])) p++;
    let lower = html.slice(y, p).toLowerCase();
    pos = p;
    while (pos < length && HTML_SPACE_REGEX.test(html[pos])) pos++;
    let A = "";
    let quote = "";
    if (html[pos] === "=") {
      pos++;
      while (pos < length && HTML_SPACE_REGEX.test(html[pos])) pos++;
      let R = html[pos];
      if (R === '"' || R === "'") {
        let index = html.indexOf(R, pos + 1);
        A = html.slice(pos + 1, index === -1 ? length : index);
        quote = R;
        pos = index === -1 ? length : index + 1;
      } else if (R !== undefined && R !== ">") {
        let T = pos;
        while (T < length && !HTML_SPACE_REGEX.test(html[T]) && html[T] !== ">") T++;
        A = html.slice(pos, T);
        pos = T;
      }
    }
    if (lower === "type" && typeAttr === undefined)
      typeAttr = {
        start: y,
        end: pos,
        value: A,
        quote,
      };
  }
}
//@ chunk-8wvtd8sr.js:181677-181760 placement
/**
 * 判断属性值是否需要改写（含实体或就是 speculationrules）。
 */
function needsSpeculationRewrite(e) {
  return e.includes("&") || e.trim().toLowerCase() === "speculationrules";
}
//@ chunk-8wvtd8sr.js:181760-182375 placement
/**
 * 按 kind+text 去重收集预览问题，记录出现于哪些渲染（标签）；超过上限计入 dropped。done() 输出问题列表，全部渲染都有的标为 "every render"。
 */
class PreviewIssueCollector {
  renderCount;
  entries = new Map();
  dropped = 0;
  constructor(renderCount) {
    this.renderCount = renderCount;
  }
  drop(count = 1) {
    this.dropped += count;
  }
  add(issue, renderLabel) {
    let s = `${issue.kind}\x00${issue.text}`;
    let r = this.entries.get(s);
    if (r) {
      if (renderLabel !== undefined && !r.labels.includes(renderLabel)) r.labels.push(renderLabel);
      return;
    }
    if (this.entries.size >= MAX_PAGE_USES) {
      this.dropped++;
      return;
    }
    this.entries.set(s, {
      kind: issue.kind,
      body: issue.text,
      labels: renderLabel === undefined ? [] : [renderLabel],
    });
  }
  done() {
    return {
      issues: [...this.entries.values()].map((entry) => ({
        kind: entry.kind,
        text:
          entry.labels.length === 0
            ? entry.body
            : entry.labels.length === this.renderCount && this.renderCount > 1
              ? `every render: ${entry.body}`
              : `${entry.labels.join(", ")}: ${entry.body}`,
      })),
      dropped: Math.min(this.dropped, MAX_PREVIEW_ISSUES_DROPPED),
    };
  }
}
//@ chunk-8wvtd8sr.js:182375-183213 placement
/**
 * 页面静态检查：缺少或过晚的 <title>、缩略图链接问题、超过发布大小上限、只在某一主题里定义的 CSS 变量。
 */
function staticPageIssues(html, publishedBytes) {
  let issues = [];
  if (extractHtmlTitle(html) === null)
    issues.push({
      kind: "title",
      text: iterateTagBodies(html, /<title/gi, /<\/title>/gi).next().done
        ? "no <title> \u2014 the artifact would be named from the `title` parameter or the file name"
        : `<title> sits past the first ${TITLE_SCAN_CHARS} characters (or after an <svg>), so publish won't see it \u2014 move it to the top`,
    });
  if (isFrameDeclaredThumbnailEnabled()) {
    let thumbnailLinks = collectThumbnailLinks(html, "page.html");
    for (let text of [...thumbnailLinks.skipped, ...thumbnailLinks.problems])
      issues.push({
        kind: "thumbnail",
        text,
      });
  }
  if (publishedBytes > MAX_ARTIFACT_BYTES)
    issues.push({
      kind: "size",
      text: `page is ${formatBytesDecimal(publishedBytes)} as published, over the ${MAX_ARTIFACT_BYTES / 1024 / 1024} MB publish limit (the inline highlighting runtime included)`,
    });
  let r = themeOnlyCssVariables(html);
  if (r.length > 0)
    issues.push({
      kind: "theme_only_color",
      text: `${r.join(", ")} ${plural(r.length, "is", "are")} set only inside @media (prefers-color-scheme) or [data-theme] blocks, so ${plural(r.length, "it is", "they are")} unset in the other theme`,
    });
  return issues;
}
//@ chunk-8wvtd8sr.js:183213-183326 placement
var MEDIA_RULE_RE = /@media/i;
var PREFERS_DARK_RE = /prefers-color-scheme\s*:\s*dark/i;
var PREFERS_LIGHT_RE = /prefers-color-scheme\s*:\s*light/i;
var DATA_THEME_SELECTOR_RE = /\[data-theme/i;
//@ chunk-8wvtd8sr.js:183326-184319 placement
/**
 * 解析页面 <style> 中的 CSS（去注释、按花括号跟踪所处的 @media 暗/亮或 [data-theme] 块），找出只在单一主题块中定义、却被 var() 使用的自定义属性。
 */
function themeOnlyCssVariables(html) {
  let styleBlocks = [];
  for (let [L, V] of iterateTagBodies(html, /<style\b/gi, /<\/style>/gi)) styleBlocks.push(html.slice(L, V));
  let joined = styleBlocks.join(`
`);
  let cssText = "";
  let h = 0;
  for (;;) {
    let index = joined.indexOf("/*", h);
    let V = index === -1 ? -1 : joined.indexOf("*/", index + 2);
    if (V === -1) break;
    cssText += joined.slice(h, index);
    h = V + 2;
  }
  cssText += joined.slice(h);
  let themedDefs = new Map();
  let globalDefs = new Set();
  let blockStack = [];
  let blockThemeOf = (L) => {
    let match = MEDIA_RULE_RE.exec(L);
    let M = match === null ? undefined : L.slice(match.index + match[0].length);
    return M !== undefined && PREFERS_DARK_RE.test(M)
      ? "dark-media"
      : M !== undefined && PREFERS_LIGHT_RE.test(M)
        ? "light-media"
        : DATA_THEME_SELECTOR_RE.test(L)
          ? "data-theme"
          : null;
  };
  let recordDefs = (L) => {
    if (blockStack.length === 0) return;
    let V = blockStack.at(-1) ?? null;
    for (let M of L.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g)) {
      let x = M[1];
      if (V === null) globalDefs.add(x);
      else themedDefs.set(x, (themedDefs.get(x) ?? new Set()).add(V));
    }
  };
  let R = 0;
  let T = 0;
  for (let j = 0; j < cssText.length; j++) {
    let V = cssText[j];
    if (V === "{" || V === "}") {
      recordDefs(cssText.slice(R, j));
      if (V === "{") blockStack.push(blockStack.at(-1) ?? blockThemeOf(cssText.slice(T, j)));
      else blockStack.pop();
      R = T = j + 1;
    } else if (V === ";") T = j + 1;
  }
  let usedVars = new Set([...html.matchAll(/var\(\s*(--[\w-]+)/g)].map((L) => L[1]));
  return [...themedDefs]
    .filter(
      ([L, V]) => !globalDefs.has(L) && usedVars.has(L) && !(V.has("dark-media") && V.has("light-media")),
    )
    .map(([L]) => L)
    .slice(0, MAX_LISTED_REFS);
}
//@ chunk-8wvtd8sr.js:184319-184530 placement
function* iterateTagBodies(html, n, s) {
  for (let match = n.exec(html); match !== null; match = n.exec(html)) {
    let h = html.indexOf(">", match.index + match[0].length) + 1;
    if (h === 0) return;
    s.lastIndex = h;
    let match_2 = s.exec(html);
    if (match_2 === null) return;
    yield [h, match_2.index];
    n.lastIndex = s.lastIndex;
  }
}
//@ chunk-8wvtd8sr.js:184530-190122 placement
/**
 * 页面内测量脚本的模板：等待字体/mermaid、检测溢出与被裁剪的 SVG 文字、收集 CSP 违规。
 */
var PAGE_SETTLE_SCRIPT_LINES = [
  "var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};",
  "var deadline=Date.now()+SETTLE;",
  "try{if(document.fonts&&document.fonts.ready)await Promise.race([document.fonts.ready,sleep(SETTLE)]);}catch(e){}",
  "var pres=Array.prototype.slice.call(document.querySelectorAll('pre.mermaid'));",
  "var hasRuntime=typeof mermaid!=='undefined';",
  "var pending=function(){return pres.filter(function(p){return p.style.display!=='none'})};",
  "while(hasRuntime&&pending().length&&Date.now()<deadline)await sleep(100);",
  "await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})});",
  "var failed=[];",
  "if(hasRuntime){var vis=pending();for(var i=0;i<vis.length;i++){var reason='did not render within '+(SETTLE/1000)+'s';try{await mermaid.parse(vis[i].textContent||'')}catch(e){reason=String(e&&e.message||e).split('\\n')[0]}failed.push({index:pres.indexOf(vis[i])+1,reason:reason})}}",
  "var sel=function(el){var s=el.tagName.toLowerCase();if(el.id)return s+'#'+el.id;var cl=el.classList?Array.prototype.slice.call(el.classList,0,2):[];return cl.length?s+'.'+cl.join('.'):s};",
  "var pathOf=function(el){var parts=[];for(var n=el,d=0;n&&n!==document.body&&n.nodeType===1&&d<3;n=n.parentElement,d++)parts.unshift(sel(n));return parts.join(' > ')||sel(el)};",
  "var de=document.documentElement,body=document.body;",
  "var overflows=[],overflowMore=0;",
  "var all=body?body.querySelectorAll('*'):[];",
  "var FORM={INPUT:1,TEXTAREA:1,SELECT:1,OPTION:1,PROGRESS:1,METER:1};",
  "for(var j=0;j<all.length&&j<4000;j++){var el=all[j];",
  "if(!(el instanceof HTMLElement)||FORM[el.tagName]===1)continue;",
  "var cw=el.clientWidth,ch=el.clientHeight;if(cw<=2||ch<=2)continue;",
  "var cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||cs.display==='inline')continue;",
  "var ox=cs.overflowX,oy=cs.overflowY;",
  "var cutX=ox==='hidden'||ox==='clip',cutY=oy==='hidden'||oy==='clip';",
  "if(cutX&&cutY&&cw*ch<=256&&((cs.clip&&cs.clip!=='auto')||(cs.clipPath&&cs.clipPath!=='none')))continue;",
  "var lc=cs.webkitLineClamp;if(!lc||lc==='none')lc=cs.lineClamp;var clamp=!!lc&&lc!=='none'&&lc!=='0';",
  "var tol=Math.max(3,Math.round((parseFloat(cs.fontSize)||0)/4));",
  "var dx=el.scrollWidth-cw,dy=el.scrollHeight-ch;",
  "var bx=dx>3&&ox!=='auto'&&ox!=='scroll'&&!(cs.textOverflow==='ellipsis'&&cutX);",
  "var by=dy>tol&&oy!=='auto'&&oy!=='scroll'&&!(clamp&&cutY);",
  "if(!bx&&!by)continue;",
  "if(overflows.length<MAXO)overflows.push({path:pathOf(el),dx:bx?dx:0,dy:by?dy:0});else overflowMore++;}",
  "var svgClips=[],svgClipMore=0;",
  "var svgs=Array.prototype.slice.call(document.querySelectorAll('svg'),0,50);",
  "for(var k=0;k<svgs.length;k++){var svg=svgs[k];if(svg.ownerSVGElement)continue;",
  "if(getComputedStyle(svg).overflow==='visible')continue;",
  "var sr=svg.getBoundingClientRect();if(sr.width===0||sr.height===0)continue;",
  "var texts=Array.prototype.slice.call(svg.querySelectorAll('text'),0,200);",
  "for(var t=0;t<texts.length;t++){var tx=texts[t],b=tx.getBoundingClientRect();",
  "if(b.width===0&&b.height===0)continue;",
  "if(b.left<sr.left-1||b.top<sr.top-1||b.right>sr.right+1||b.bottom>sr.bottom+1){if(svgClips.length<MAXS)svgClips.push({path:pathOf(svg),text:(tx.textContent||'').trim().slice(0,40)});else svgClipMore++;}}}",
  "var csp=(window.__claudePreviewCsp||[]).slice(0,64);",
  "return JSON.stringify({href:location.href,vw:de.clientWidth,sw:de.scrollWidth,sh:Math.max(de.scrollHeight,body?body.scrollHeight:0),overflows:overflows,overflowMore:overflowMore,svgClips:svgClips,svgClipMore:svgClipMore,mermaid:{total:pres.length,runtime:hasRuntime,failed:failed},csp:csp,dialogs:DIALOGS.called,uses:USES.names,usesMore:USES.more});",
].join(`
`);
var PAGE_PROBE_ERROR_FRAME_LEFT =
  "new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(function(){r(location.href)})})})";
var PAGE_PROBE_ERROR_NO_ANSWER = `var USES={names:[],more:0};try{var C={};Object.defineProperty(C,'use',{value:function(name){var n;try{n=String(name).slice(0,40)}catch(x){n='?'}if(USES.names.indexOf(n)<0){if(USES.names.length<${MAX_COLLECTED_USES})USES.names.push(n);else USES.more=1}return Promise.resolve(null)},writable:true,configurable:true,enumerable:false});Object.defineProperty(window,'claude',{value:C,writable:false,configurable:false,enumerable:true})}catch(x){}`;
var pageProbeScriptBuilder = `;(function(){var P=window.parent,ap=Reflect.apply,S=String,resolved=Promise.resolve.bind(Promise),then=Promise.prototype.then,Chan=MessageChannel,send=MessagePort.prototype.postMessage;
if(!P||P===window){window.addEventListener('message',function(e){var d=e.data,p=e.ports&&e.ports[0];if(e.source!==frames[0]||!d||d.__claudePreviewPort!==1||!p)return;window.__claudePreviewPort=p;try{p.start()}catch(x){}});return}
if(P!==window.top)return;
var called={alert:0,confirm:0,prompt:0},DIALOGS={called:called};['alert','confirm','prompt'].forEach(function(k){var o=window[k];try{window[k]=function(){called[k]=1;return ap(o,this,arguments)}}catch(x){}});
${PAGE_PROBE_ERROR_NO_ANSWER}
var R=(function(Promise){return {probe:function(settleMs){var SETTLE=+settleMs||0,MAXO=${MAX_PAGE_OBSERVERS},MAXS=${MAX_SVG_CLIPS};return (async function(){${PAGE_SETTLE_SCRIPT_LINES}})()},settle:function(){return ${PAGE_PROBE_ERROR_FRAME_LEFT}}}})(Promise);
var ch=new Chan(),port=ch.port1;
port.onmessage=function(e){var id;function ok(v){ap(send,port,[{id:id,v:S(v)}])}function no(x){var m;try{m=S(x&&x.message||x)}catch(y){m='routine failed'}ap(send,port,[{id:id,e:m}])}try{var d=e.data;id=d&&d.id;var fn=d&&R[d.run];ap(then,ap(then,resolved(),[function(){if(!fn)throw new Error('unknown routine');return ap(fn,null,d.args||[])}]),[ok,no])}catch(x){no(x)}};
P.postMessage({__claudePreviewPort:1},'*',[ch.port2])})()`;
var PAGE_PROBE_MAX_VALUE_CHARS = "the preview frame left the page";
var pageProbeRequestScript = "the preview frame is not answering";
//@ chunk-8wvtd8sr.js:190122-190922 placement
/**
 * 生成在预览外壳里执行的脚本：通过 window.__claudePreviewPort 向 iframe 发送 {run, args, id}，等待同 id 的应答，iframe 重新加载或超长时 reject。
 */
function previewEvalScript(run, args) {
  let requestId = jsonStringify(randomUUID());
  return `new Promise(function(res,rej){var p=window.__claudePreviewPort,el=document.getElementsByTagName('iframe')[0];if(!p||!el){rej(new Error(${jsonStringify(pageProbeRequestScript)}));return}function done(){try{p.removeEventListener('message',h)}catch(x){}el.removeEventListener('load',left)}function left(){done();rej(new Error(${jsonStringify(PAGE_PROBE_MAX_VALUE_CHARS)}))}function h(e){try{var d=e.data;if(!d||d.id!==${requestId})return;done();if(typeof d.v==='string')res(d.v.length>${MAX_CDP_EVENT_CHARS}?d.v.slice(0,${MAX_CDP_EVENT_CHARS + 1}):d.v);else rej(new Error(typeof d.e==='string'?d.e.slice(0,400):'the page answered without a value'))}catch(x){done();rej(new Error('the page answered unreadably'))}}p.addEventListener('message',h);el.addEventListener('load',left);try{p.postMessage({run:${jsonStringify(run)},args:${jsonStringify(args)},id:${requestId}})}catch(x){done();rej(new Error(${jsonStringify(pageProbeRequestScript)}))}})`;
}
//@ chunk-8wvtd8sr.js:190922-190979 placement
/**
 * 非空对象原样返回，否则空对象。
 */
function asProbeRecord(e) {
  return e !== null && typeof e === "object" ? e : {};
}
//@ chunk-8wvtd8sr.js:190979-191026 placement
/**
 * 字符串原样返回，否则空串。
 */
function asProbeString(e) {
  return typeof e === "string" ? e : "";
}
//@ chunk-8wvtd8sr.js:191026-191134 placement
function clampNonNegativeInt(e, n = 1e6) {
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(0, Math.round(e)), n) : 0;
}
//@ chunk-8wvtd8sr.js:191134-191178 placement
/**
 * 数组原样返回，否则空数组。
 */
function asArray(e) {
  return Array.isArray(e) ? e : [];
}
//@ chunk-8wvtd8sr.js:191178-192285 placement
/**
 * 解析页面内测量脚本返回的 JSON：视口/滚动尺寸、溢出元素、被裁剪的 SVG 文字、mermaid 渲染结果、CSP 违规、对话框、能力使用；逐项截断到上限。
 */
function parsePageMeasurement(json) {
  if (typeof json !== "string") throw Error("the measurement returned no data");
  if (json.length > MAX_CDP_EVENT_CHARS) throw Error("the measurement returned too much data");
  let parsed = jsonParse(json);
  if (parsed === null || typeof parsed !== "object") throw Error("the measurement returned no data");
  let data = asProbeRecord(parsed);
  let r = asProbeRecord(data.mermaid);
  let h = asArray(data.overflows);
  let y = asArray(data.svgClips);
  let p = asArray(r.failed);
  let w = clampNonNegativeInt(r.total);
  return {
    href: asProbeString(data.href),
    vw: clampNonNegativeInt(data.vw),
    sw: clampNonNegativeInt(data.sw),
    sh: clampNonNegativeInt(data.sh),
    overflows: h.slice(0, MAX_PAGE_OBSERVERS).map((A) => ({
      path: asProbeString(asProbeRecord(A).path),
      dx: clampNonNegativeInt(asProbeRecord(A).dx),
      dy: clampNonNegativeInt(asProbeRecord(A).dy),
    })),
    overflowMore: clampNonNegativeInt(data.overflowMore) + Math.max(0, h.length - MAX_PAGE_OBSERVERS),
    svgClips: y.slice(0, MAX_SVG_CLIPS).map((A) => ({
      path: asProbeString(asProbeRecord(A).path),
      text: asProbeString(asProbeRecord(A).text),
    })),
    svgClipMore: clampNonNegativeInt(data.svgClipMore) + Math.max(0, y.length - MAX_SVG_CLIPS),
    mermaid: {
      total: w,
      runtime: r.runtime === true,
      failed: p.slice(0, MAX_FAILED_CHECKS).map((A) => ({
        index: Math.min(clampNonNegativeInt(asProbeRecord(A).index), w),
        reason: asProbeString(asProbeRecord(A).reason),
      })),
      failedMore: Math.max(0, p.length - MAX_FAILED_CHECKS),
    },
    csp: asArray(data.csp)
      .slice(0, 64)
      .map((A) => ({
        uri: asProbeString(asProbeRecord(A).uri),
        directive: asProbeString(asProbeRecord(A).directive),
      })),
    dialogs: ["alert", "confirm", "prompt"].filter((A) => asProbeRecord(data.dialogs)[A] === 1),
    uses: asArray(data.uses)
      .slice(0, MAX_COLLECTED_USES)
      .map(asProbeString)
      .filter((A) => A !== ""),
    usesMore: data.usesMore === 1 || asArray(data.uses).length > MAX_COLLECTED_USES,
  };
}
//@ chunk-8wvtd8sr.js:192285-192330 placement
/**
 * 清洗展示文本：去掉 artifact 信封标签并限制长度。
 */
function sanitizeDisplay(e, max = 80) {
  return scrubArtifactEnvelopeTags(
    sanitizeDisplayText(e, {
      max,
    }),
  );
}
//@ chunk-8wvtd8sr.js:192330-193530 placement
/**
 * 由测量结果生成布局问题：横向滚动、元素溢出、SVG 标签被裁剪、mermaid 运行时未加载或渲染失败。
 */
function layoutIssuesFromMeasurement(measurement) {
  let issues = [];
  if (measurement.sw > measurement.vw + 1)
    issues.push({
      kind: "overflow_x",
      text: `page scrolls horizontally (${measurement.sw}px of content in a ${measurement.vw}px viewport)`,
    });
  for (let s of measurement.overflows) {
    let joined = [s.dx > 0 ? `${s.dx}px wider` : "", s.dy > 0 ? `${s.dy}px taller` : ""]
      .filter(Boolean)
      .join(", ");
    issues.push({
      kind: "element_overflow",
      text: `content overflows ${sanitizeDisplay(s.path)} (${joined} than its box)`,
    });
  }
  if (measurement.overflowMore > 0)
    issues.push({
      kind: "element_overflow",
      text: `${measurement.overflowMore} more elements overflow their box`,
    });
  for (let svgClip of measurement.svgClips)
    issues.push({
      kind: "svg_clip",
      text: `SVG label "${sanitizeDisplay(svgClip.text, 32)}" is clipped by its <svg> viewport (${sanitizeDisplay(svgClip.path, 60)})`,
    });
  if (measurement.svgClipMore > 0)
    issues.push({
      kind: "svg_clip",
      text: `${measurement.svgClipMore} more SVG labels are clipped`,
    });
  if (measurement.mermaid.total > 0 && !measurement.mermaid.runtime)
    issues.push({
      kind: "mermaid",
      text: `${measurement.mermaid.total} <pre class="mermaid"> ${plural(measurement.mermaid.total, "block")} but the diagram runtime did not load, so ${plural(measurement.mermaid.total, "it shows", "they show")} as source`,
    });
  for (let s of measurement.mermaid.failed)
    issues.push({
      kind: "mermaid",
      text: `mermaid block ${s.index} of ${measurement.mermaid.total} failed: ${sanitizeDisplay(s.reason, 120)}`,
    });
  if (measurement.mermaid.failedMore > 0)
    issues.push({
      kind: "mermaid",
      text: `${measurement.mermaid.failedMore} more mermaid blocks failed`,
    });
  return issues;
}
//@ chunk-8wvtd8sr.js:193530-193816 placement
/**
 * 把测量中的 CSP 违规按 origin 去重成问题（超过上限只计 dropped）。
 */
function cspViolationIssues(e, n, s) {
  let r = [];
  for (let h of e.csp) {
    let y = originOrSelf(h.uri);
    if (n.has(y)) continue;
    n.add(y);
    if (n.size > MAX_TRACKED_SESSIONS) {
      s.drop();
      continue;
    }
    r.push({
      kind: "csp",
      text: `${sanitizeDisplay(y, 100)} is blocked by the artifact content policy (${sanitizeDisplay(h.directive, 24)}) \u2014 only Google Fonts loads from outside`,
    });
  }
  return r;
}
//@ chunk-8wvtd8sr.js:193816-194023 placement
/**
 * 预览检查：页面加载时弹出的 JavaScript 对话框（每种只报一次）。
 */
function dialogIssues(e, n) {
  let s = [];
  for (let dialog of e.dialogs) {
    if (n.has(dialog)) continue;
    n.add(dialog);
    s.push({
      kind: "load",
      text: `the page opened a JavaScript dialog (${dialog}) on load; the published viewer never shows one`,
    });
  }
  return s;
}
//@ chunk-8wvtd8sr.js:194023-196152 placement
/**
 * 处理预览中被拦截的请求：页面目录内的相对引用收集到 h；弹窗、对话框、下载、目录外引用、file: 引用、只允许样式字体的源、CSP 外资源分别生成问题。
 */
function blockedRequestIssues(requests, pageBaseUrl, pageUrl, seenUrls, relativeRefs, collector) {
  let issues = [];
  let pageOrigin = originOf(pageBaseUrl);
  let A = 0;
  let S = 0;
  for (let request of requests) {
    if (seenUrls.has(request.url)) continue;
    seenUrls.add(request.url);
    let T = originOf(request.url) === pageOrigin;
    let P = T && request.url.startsWith(pageBaseUrl);
    if (
      request.type !== "popup" &&
      T &&
      (P
        ? decodeUriSafe(request.url.slice(pageBaseUrl.length)).startsWith("_blob/")
        : decodeUriSafe(request.url.slice(pageOrigin.length)).startsWith("/_blob/"))
    ) {
      A++;
      continue;
    }
    if (P && request.type !== "popup" && request.type !== "dialog" && request.type !== "download") {
      let replaced = decodeUriSafe(request.url.slice(pageBaseUrl.length)).replace(/[?#].*$/s, "");
      let M = replaced === "" ? "./ (the page's own directory)" : replaced;
      if (!relativeRefs.includes(M)) relativeRefs.push(M);
      continue;
    }
    if (++S > MAX_LISTED_UNLOADED_FILES) {
      collector.drop();
      continue;
    }
    if (request.type === "popup") {
      let V = isSamePageUrl(request.url, pageUrl)
        ? "this page again"
        : P
          ? `another page of this artifact: ${sanitizeDisplay(decodeUriSafe(request.url.slice(pageBaseUrl.length)) || "./", 60)}`
          : T
            ? `a page outside this artifact's directory: ${sanitizeDisplay(decodeUriSafe(request.url.slice(pageOrigin.length)), 60)}`
            : describePopupTarget(request.url);
      issues.push({
        kind: "load",
        text: `the page opens a new window (${V}) on load \u2014 blocked in preview; the published viewer allows pop-ups only from a click`,
      });
    } else if (request.type === "dialog")
      issues.push({
        kind: "load",
        text: `the page opened a JavaScript dialog (${sanitizeDisplay(request.url, 16)}) on load; the published viewer never shows one`,
      });
    else if (request.type === "download")
      issues.push({
        kind: "load",
        text: `the page starts a download (${sanitizeDisplay(request.url || "unnamed", 60)}) on load \u2014 refused in preview; the published viewer blocks downloads too`,
      });
    else if (T && !P) {
      let V = decodeUriSafe(request.url.slice(pageOrigin.length));
      issues.push({
        kind: "local_ref",
        text: `${sanitizeDisplay(V, 100)} points outside the page's own directory and will not load once published either \u2014 reference files relative to the page`,
      });
    } else if (request.url.startsWith("file:"))
      issues.push({
        kind: "local_ref",
        text: `${sanitizeDisplay(request.url, 120)} is another local file \u2014 it loads on this machine only and will not exist once published`,
      });
    else if (CSP_ALLOWED_ORIGINS.has(originOf(request.url)))
      issues.push({
        kind: "load",
        text: `${sanitizeDisplay(request.url, 120)} is not loaded in preview, which takes only stylesheets and font files from that origin (${sanitizeDisplay(request.type || "request", 16)}); the published page may load it`,
      });
    else
      issues.push({
        kind: "csp",
        text: `${sanitizeDisplay(originOrSelf(request.url), 100)} is outside what the published page may load (${sanitizeDisplay(request.type || "request", 16)})`,
      });
  }
  if (A > 0)
    issues.push({
      kind: "local_ref",
      text: `${A} uploaded-asset ${plural(A, "reference")} (_blob/\u2026) ${plural(A, "is", "are")} not loaded in preview`,
    });
  return issues;
}
//@ chunk-8wvtd8sr.js:196152-196212 placement
/**
 * 取 URL 的 origin，非法时返回原串。
 */
function originOf(e) {
  try {
    return new URL(e).origin;
  } catch {
    return e;
  }
}
//@ chunk-8wvtd8sr.js:196212-196335 placement
function isSamePageUrl(url, pageUrl) {
  try {
    let s = new URL(url);
    let r = new URL(pageUrl);
    return s.origin === r.origin && s.pathname === r.pathname;
  } catch {
    return url === pageUrl;
  }
}
//@ chunk-8wvtd8sr.js:196335-196399 placement
/**
 * 安全地 decodeURIComponent。
 */
function decodeUriSafe(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e;
  }
}
//@ chunk-8wvtd8sr.js:196399-196623 placement
function describePopupTarget(url) {
  try {
    let n = new URL(url);
    return n.protocol === "http:" || n.protocol === "https:"
      ? sanitizeDisplay(n.origin, 80)
      : n.protocol === "about:"
        ? sanitizeDisplay(n.href, 40)
        : `a ${sanitizeDisplay(n.protocol, 20)} URL`;
  } catch {
    return url === "" ? "about:blank" : "an unparseable URL";
  }
}
//@ chunk-8wvtd8sr.js:196623-196729 placement
function originOrSelf(e) {
  try {
    let n = new URL(e);
    return n.origin !== "null" ? n.origin : e;
  } catch {
    return e === "" ? "(inline)" : e;
  }
}
//@ chunk-8wvtd8sr.js:196729-196960 placement
/**
 * 预览检查：加载时的控制台错误（列出前若干条，其余计数）。
 */
function consoleErrorIssues(e) {
  if (e.length === 0) return [];
  let mapped = e.slice(0, MAX_LISTED_MISSING_FILES).map((r) => sanitizeDisplay(r, 160));
  let s = e.length - mapped.length;
  return [
    {
      kind: "console",
      text:
        `${e.length} console ${plural(e.length, "error")} on load \u2014 ${mapped.join(" | ")}` +
        (s > 0 ? ` | ${s} more` : ""),
    },
  ];
}
//@ chunk-8wvtd8sr.js:196960-197324 placement
/**
 * 让预览步骤与超时/中断赛跑：超时抛 PreviewStepTimeout，signal 中断抛 "preview aborted"，结束后清理定时器与监听。
 */
async function raceWithStepTimeout(promise, timeoutMs, stepName, timers, signal) {
  if (signal?.aborted === true) {
    promise.catch(() => {});
    throw Error("preview aborted");
  }
  let y;
  let p;
  let promise_2 = new Promise((resolve, reject) => {
    y = timers.setTimeout(() => reject(new PreviewStepTimeout(stepName, timeoutMs)), timeoutMs);
    if (signal) {
      p = () => reject(Error("preview aborted"));
      signal.addEventListener("abort", p, {
        once: true,
      });
    }
  });
  try {
    return await Promise.race([promise, promise_2]);
  } finally {
    timers.clearTimeout(y);
    if (signal && p) signal.removeEventListener("abort", p);
    promise.catch(() => {});
  }
}
//@ chunk-8wvtd8sr.js:197324-197419 placement
var PREVIEW_HTML_CONTENT_TYPE = "text/html; charset=utf-8";
var SANDBOXED_HEADERS = {
  "content-security-policy": "sandbox; default-src 'none'",
};
//@ chunk-8wvtd8sr.js:197419-198514 placement
/**
 * 在回环地址上起两组服务：一组提供各主题的 preview-*.html（及 mermaid 运行时），另一组提供嵌入它们的 top-*.html 外壳页，返回 URL 生成器与 close。
 */
async function servePreviewPages(pages, host = randomPreviewHost()) {
  let pathToken = randomUUID();
  let previewRoutes = new Map();
  for (let [T, P] of pages)
    previewRoutes.set(`/${pathToken}/preview-${T}.html`, {
      body: P,
      contentType: PREVIEW_HTML_CONTENT_TYPE,
    });
  if ([...pages.values()].some((T) => T.includes(MERMAID_RUNTIME_PATH)))
    try {
      let { loadMermaidBundleJs } = await import("./chunk-9yfhnw1m.js");
      previewRoutes.set(MERMAID_RUNTIME_PATH, {
        body: await loadMermaidBundleJs(),
        contentType: "text/javascript; charset=utf-8",
      });
    } catch (error) {
      logError(error);
      logFeatureSad("artifact_publish", "mermaid_bundle_unreadable");
    }
  let makeHandler = (T) => (P) => {
    let L = P.method === "GET" ? T.get(new URL(P.url).pathname) : undefined;
    return L === undefined
      ? new Response("not found", {
          status: 404,
          headers: SANDBOXED_HEADERS,
        })
      : new Response(L.body, {
          headers: {
            "content-type": L.contentType,
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
            ...(L.contentType !== PREVIEW_HTML_CONTENT_TYPE && SANDBOXED_HEADERS),
          },
        });
  };
  let previewServers = await serveOnLoopbackPair(makeHandler(previewRoutes));
  let previewBase = `http://${host}:${previewServers[0].port}/${pathToken}/`;
  let previewUrlFor = (T) => `${previewBase}preview-${T}.html`;
  let topRoutes = new Map();
  for (let key of pages.keys())
    topRoutes.set(`/${pathToken}/top-${key}.html`, {
      body: previewShellHtml(previewUrlFor(key)),
      contentType: PREVIEW_HTML_CONTENT_TYPE,
    });
  let topServers;
  try {
    topServers = await serveOnLoopbackPair(makeHandler(topRoutes));
  } catch (error) {
    for (let previewServer of previewServers) previewServer.stop(true);
    throw error;
  }
  let R = `http://${host}:${topServers[0].port}/${pathToken}/`;
  return {
    urlFor: previewUrlFor,
    topUrlFor: (T) => `${R}top-${T}.html`,
    baseUrl: previewBase,
    close: () => {
      for (let T of [...previewServers, ...topServers]) T.stop(true);
    },
  };
}
//@ chunk-8wvtd8sr.js:198514-198583 placement
var PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-downloads";
//@ chunk-8wvtd8sr.js:198583-199085 placement
/**
 * 生成预览外壳页 HTML：仅允许 frame 指向预览源的 CSP、no-referrer，并用带 sandbox 的全屏 iframe 嵌入页面。
 */
function previewShellHtml(pageUrl) {
  return `<!doctype html><html><head><meta charset=utf8><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${new URL(pageUrl).origin}; style-src 'unsafe-inline'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}iframe{display:block;border:0;margin:0;padding:0;width:100vw;height:100vh}</style></head><body><iframe src="${pageUrl}" referrerpolicy="no-referrer" sandbox="${PREVIEW_IFRAME_SANDBOX}"></iframe></body></html>`;
}
//@ chunk-8wvtd8sr.js:199085-199476 affinity
async function serveOnLoopbackPair(e, n = (h) => Bun.serve(h), s = hasIpv6Loopback, r = startBunRelay) {
  for (let j = 0; ; j++) {
    let y = n({
      hostname: "127.0.0.1",
      port: 0,
      fetch: e,
    });
    let port = y.port ?? 0;
    try {
      let w = n({
        hostname: "::1",
        port,
        fetch: e,
      });
      return [y, w];
    } catch (error) {
      let code = error.code;
      if (code === "EADDRNOTAVAIL" || code === "EAFNOSUPPORT" || (code === "EADDRINUSE" && !s())) {
        if (await r("::1", port)) {
          y.stop(true);
          throw error;
        }
        return [y];
      }
      if (code === "EADDRINUSE" && j < 8) {
        y.stop(true);
        continue;
      }
      y.stop(true);
      throw error;
    }
  }
}
//@ chunk-8wvtd8sr.js:199622-199726 placement
function hasIpv6Loopback() {
  try {
    return Object.values(networkInterfaces()).some((e) => e?.some((n) => n.address === "::1"));
  } catch {
    return true;
  }
}
export {
  sanitizeDisplay,
  PreviewIssueCollector,
  staticPageIssues,
  composePreviewPage,
  raceWithStepTimeout,
  servePreviewPages,
  themeForViewportWidth,
  parsePageMeasurement,
  layoutIssuesFromMeasurement,
  cspViolationIssues,
  dialogIssues,
  blockedRequestIssues,
  consoleErrorIssues,
  identicalThemeRenderIssues,
  relativeRefsNotLoadedIssues,
  missingRuntimeCapabilityIssues,
  asProbeString,
  asArray,
  asProbeRecord,
  pageProbeScriptBuilder,
  PAGE_PROBE_MAX_VALUE_CHARS,
  pageProbeRequestScript,
  previewEvalScript,
};
