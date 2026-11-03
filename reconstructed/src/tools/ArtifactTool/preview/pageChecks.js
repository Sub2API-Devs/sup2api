/**
 * tools/ArtifactTool/preview/pageChecks.ts
 *
 * 2.1.316 新增：页面检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (38)
 * attribution: placement 37, sole-consumer 1
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
} from "crypto";
import {
  zf,
  Yw,
  Kf,
  xw,
  qw,
  Ma,
  nd,
  sd,
  id,
  jf,
  zw,
  Yf,
  Vw,
  PreviewStepTimeout,
  Ql,
} from "./chromeSession.js";
import { plural } from "../../../utils/stringUtils.js";
import { m1t } from "../promptText.js";
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
import { hasIpv6Loopback } from "./_new/hasIpv6Loopback.js";
import { startBunRelay } from "../../../upstreamproxy/relay.js";

/**
 * 预览中以页面相对路径引用但未加载的文件：合成一条 note 问题，列出前 zf 个，提示发布后只有通过 files 传入才存在。
 */
//@ chunk-8wvtd8sr.js:179080-179430 placement
function relativeRefsNotLoadedIssues(e) {
  if (e.length === 0) return [];
  let n = e.length,
    mapped = e.slice(0, zf).map((h) => Ht(h, 60)),
    r = n - mapped.length;
  return [
    {
      kind: "note",
      text: `${n} ${plural(n, "file")} referenced relative to the page ${plural(n, "is", "are")} not loaded in preview (${mapped.join(", ")}${r > 0 ? `, \u2026 ${r} more` : ""}); once published ${plural(n, "it exists", "they exist")} only if passed in \`files\``,
    },
  ];
}
/**
 * 预览里 window.claude.use() 对某些能力返回 null 时，生成一条 note：依赖这些能力的代码在预览中没有运行。
 */
//@ chunk-8wvtd8sr.js:179430-179757 placement
function missingRuntimeCapabilityIssues(e, n) {
  if (e.size === 0) return [];
  return [
    {
      kind: "note",
      text: `no artifact runtime in preview: window.claude.use() resolved null for ${[...e].map((r) => Ht(r, 40)).join(", ") + (n ? " and more" : "")}, so the code that needs ${plural(e.size, "that capability", "those capabilities")} did not run here \u2014 exercise it after publishing`,
    },
  ];
}
/**
 * 同一宽度的浅色/深色两张截图完全相同时，报告页面没有深色主题样式（只截到顶部时措辞不同）。
 */
//@ chunk-8wvtd8sr.js:179757-180238 placement
function identicalThemeRenderIssues(e) {
  let n = [],
    s = new Map();
  for (let r of e) if (r.base64 !== void 0) s.set(r.width, [...(s.get(r.width) ?? []), r]);
  for (let [r, h] of s) {
    let [y, p] = h;
    if (h.length === 2 && y.theme !== p.theme && y.base64 === p.base64) {
      let w = y.pageHeight !== void 0 || p.pageHeight !== void 0;
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
function Hf(e) {
  return e < 600 ? 844 : 900;
}
/**
 * 把待预览页面改造成预览用 HTML：先禁用 speculationrules 脚本，再在 <html> 上设 data-theme，并在 <head> 开头插入预览脚本与 CSP、禁止 DNS 预取。
 * 页面骨架不符合预期时抛错。
 */
//@ chunk-8wvtd8sr.js:180274-180717 placement
function composePreviewPage(e, n) {
  let s = disableSpeculationRules(e),
    r = "<!doctype html><html",
    h = "<head><meta charset=utf8>",
    index = s.indexOf("<head><meta charset=utf8>");
  if (!s.startsWith("<!doctype html><html") || index === -1)
    throw Error("composed artifact page has an unexpected skeleton");
  let p = index + 25;
  return (
    `<!doctype html><html data-theme="${n}"` +
    s.slice(20, p) +
    Yw +
    `<meta http-equiv="Content-Security-Policy" content="${Kf}"><meta http-equiv="x-dns-prefetch-control" content="off">` +
    s.slice(p)
  );
}
/**
 * 把 type 为 speculationrules 的 <script> 改写成 text/x-speculationrules-off，避免预览页面预取。
 */
//@ chunk-8wvtd8sr.js:180717-181033 placement
function disableSpeculationRules(e) {
  let n = "",
    s = 0,
    r = /<script(?=[\t\n\f\r />])/gi;
  for (let match = r.exec(e); match !== null; match = r.exec(e)) {
    let y = scanTagAttributes(e, match.index + match[0].length);
    r.lastIndex = y.end;
    let p = y.type;
    if (p === void 0 || !s_(p.value)) continue;
    ((n += `${e.slice(s, p.start)}type=${p.quote}text/x-speculationrules-off${p.quote}`), (s = p.end));
  }
  return s === 0 ? e : n + e.slice(s);
}
//@ chunk-8wvtd8sr.js:181033-181054 placement
var To = /[\t\n\f\r ]/;
/**
 * 从标签名之后扫描属性直到 >，返回标签结束位置和第一个 type 属性（起止、值、引号）。
 */
//@ chunk-8wvtd8sr.js:181054-181677 placement
function scanTagAttributes(html, from) {
  let length = html.length,
    pos = from,
    typeAttr;
  for (;;) {
    while (pos < length && (To.test(html[pos]) || html[pos] === "/")) pos++;
    if (pos >= length) return { end: length, type: typeAttr };
    if (html[pos] === ">") return { end: pos + 1, type: typeAttr };
    let y = pos,
      p = html[pos] === "=" ? pos + 1 : pos;
    while (p < length && !To.test(html[p]) && !"/>=".includes(html[p])) p++;
    let lower = html.slice(y, p).toLowerCase();
    pos = p;
    while (pos < length && To.test(html[pos])) pos++;
    let A = "",
      S = "";
    if (html[pos] === "=") {
      pos++;
      while (pos < length && To.test(html[pos])) pos++;
      let R = html[pos];
      if (R === '"' || R === "'") {
        let index = html.indexOf(R, pos + 1);
        ((A = html.slice(pos + 1, index === -1 ? length : index)),
          (S = R),
          (pos = index === -1 ? length : index + 1));
      } else if (R !== void 0 && R !== ">") {
        let T = pos;
        while (T < length && !To.test(html[T]) && html[T] !== ">") T++;
        ((A = html.slice(pos, T)), (pos = T));
      }
    }
    if (lower === "type" && typeAttr === void 0) typeAttr = { start: y, end: pos, value: A, quote: S };
  }
}
//@ chunk-8wvtd8sr.js:181677-181760 placement
function s_(e) {
  return e.includes("&") || e.trim().toLowerCase() === "speculationrules";
}
/**
 * 按 kind+text 去重收集预览问题，记录出现于哪些渲染（标签）；超过上限计入 dropped。done() 输出问题列表，全部渲染都有的标为 "every render"。
 */
//@ chunk-8wvtd8sr.js:181760-182375 placement
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
    let s = `${issue.kind}\x00${issue.text}`,
      r = this.entries.get(s);
    if (r) {
      if (renderLabel !== void 0 && !r.labels.includes(renderLabel)) r.labels.push(renderLabel);
      return;
    }
    if (this.entries.size >= xw) {
      this.dropped++;
      return;
    }
    this.entries.set(s, {
      kind: issue.kind,
      body: issue.text,
      labels: renderLabel === void 0 ? [] : [renderLabel],
    });
  }
  done() {
    return {
      issues: [...this.entries.values()].map((n) => ({
        kind: n.kind,
        text:
          n.labels.length === 0
            ? n.body
            : n.labels.length === this.renderCount && this.renderCount > 1
              ? `every render: ${n.body}`
              : `${n.labels.join(", ")}: ${n.body}`,
      })),
      dropped: Math.min(this.dropped, m1t),
    };
  }
}
/**
 * 页面静态检查：缺少或过晚的 <title>、缩略图链接问题、超过发布大小上限、只在某一主题里定义的 CSS 变量。
 */
//@ chunk-8wvtd8sr.js:182375-183213 placement
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
    let h = collectThumbnailLinks(html, "page.html");
    for (let y of [...h.skipped, ...h.problems]) issues.push({ kind: "thumbnail", text: y });
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
var MEDIA_RULE_RE = /@media/i,
  PREFERS_DARK_RE = /prefers-color-scheme\s*:\s*dark/i,
  PREFERS_LIGHT_RE = /prefers-color-scheme\s*:\s*light/i,
  DATA_THEME_SELECTOR_RE = /\[data-theme/i;
/**
 * 解析页面 <style> 中的 CSS（去注释、按花括号跟踪所处的 @media 暗/亮或 [data-theme] 块），找出只在单一主题块中定义、却被 var() 使用的自定义属性。
 */
//@ chunk-8wvtd8sr.js:183326-184319 placement
function themeOnlyCssVariables(html) {
  let styleBlocks = [];
  for (let [L, V] of iterateTagBodies(html, /<style\b/gi, /<\/style>/gi)) styleBlocks.push(html.slice(L, V));
  let joined = styleBlocks.join(`
`),
    cssText = "",
    h = 0;
  for (;;) {
    let index = joined.indexOf("/*", h),
      V = index === -1 ? -1 : joined.indexOf("*/", index + 2);
    if (V === -1) break;
    ((cssText += joined.slice(h, index)), (h = V + 2));
  }
  cssText += joined.slice(h);
  let themedDefs = new Map(),
    globalDefs = new Set(),
    blockStack = [],
    blockThemeOf = (L) => {
      let match = MEDIA_RULE_RE.exec(L),
        M = match === null ? void 0 : L.slice(match.index + match[0].length);
      return M !== void 0 && PREFERS_DARK_RE.test(M)
        ? "dark-media"
        : M !== void 0 && PREFERS_LIGHT_RE.test(M)
          ? "light-media"
          : DATA_THEME_SELECTOR_RE.test(L)
            ? "data-theme"
            : null;
    },
    recordDefs = (L) => {
      if (blockStack.length === 0) return;
      let V = blockStack.at(-1) ?? null;
      for (let M of L.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g)) {
        let x = M[1];
        if (V === null) globalDefs.add(x);
        else themedDefs.set(x, (themedDefs.get(x) ?? new Set()).add(V));
      }
    },
    R = 0,
    T = 0;
  for (let L = 0; L < cssText.length; L++) {
    let V = cssText[L];
    if (V === "{" || V === "}") {
      if ((recordDefs(cssText.slice(R, L)), V === "{"))
        blockStack.push(blockStack.at(-1) ?? blockThemeOf(cssText.slice(T, L)));
      else blockStack.pop();
      R = T = L + 1;
    } else if (V === ";") T = L + 1;
  }
  let usedVars = new Set([...html.matchAll(/var\(\s*(--[\w-]+)/g)].map((L) => L[1]));
  return [...themedDefs]
    .filter(
      ([L, V]) => !globalDefs.has(L) && usedVars.has(L) && !(V.has("dark-media") && V.has("light-media")),
    )
    .map(([L]) => L)
    .slice(0, qw);
}
//@ chunk-8wvtd8sr.js:184319-184530 placement
function* iterateTagBodies(e, n, s) {
  for (let match = n.exec(e); match !== null; match = n.exec(e)) {
    let h = e.indexOf(">", match.index + match[0].length) + 1;
    if (h === 0) return;
    s.lastIndex = h;
    let match_2 = s.exec(e);
    if (match_2 === null) return;
    (yield [h, match_2.index], (n.lastIndex = s.lastIndex));
  }
}
//@ chunk-8wvtd8sr.js:184530-190122 placement
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
`),
  f_ =
    "new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(function(){r(location.href)})})})",
  h_ = `var USES={names:[],more:0};try{var C={};Object.defineProperty(C,'use',{value:function(name){var n;try{n=String(name).slice(0,40)}catch(x){n='?'}if(USES.names.indexOf(n)<0){if(USES.names.length<${Ma})USES.names.push(n);else USES.more=1}return Promise.resolve(null)},writable:true,configurable:true,enumerable:false});Object.defineProperty(window,'claude',{value:C,writable:false,configurable:false,enumerable:true})}catch(x){}`,
  p_ = `;(function(){var P=window.parent,ap=Reflect.apply,S=String,resolved=Promise.resolve.bind(Promise),then=Promise.prototype.then,Chan=MessageChannel,send=MessagePort.prototype.postMessage;
if(!P||P===window){window.addEventListener('message',function(e){var d=e.data,p=e.ports&&e.ports[0];if(e.source!==frames[0]||!d||d.__claudePreviewPort!==1||!p)return;window.__claudePreviewPort=p;try{p.start()}catch(x){}});return}
if(P!==window.top)return;
var called={alert:0,confirm:0,prompt:0},DIALOGS={called:called};['alert','confirm','prompt'].forEach(function(k){var o=window[k];try{window[k]=function(){called[k]=1;return ap(o,this,arguments)}}catch(x){}});
${h_}
var R=(function(Promise){return {probe:function(settleMs){var SETTLE=+settleMs||0,MAXO=${nd},MAXS=${sd};return (async function(){${PAGE_SETTLE_SCRIPT_LINES}})()},settle:function(){return ${f_}}}})(Promise);
var ch=new Chan(),port=ch.port1;
port.onmessage=function(e){var id;function ok(v){ap(send,port,[{id:id,v:S(v)}])}function no(x){var m;try{m=S(x&&x.message||x)}catch(y){m='routine failed'}ap(send,port,[{id:id,e:m}])}try{var d=e.data;id=d&&d.id;var fn=d&&R[d.run];ap(then,ap(then,resolved(),[function(){if(!fn)throw new Error('unknown routine');return ap(fn,null,d.args||[])}]),[ok,no])}catch(x){no(x)}};
P.postMessage({__claudePreviewPort:1},'*',[ch.port2])})()`,
  eh = "the preview frame left the page",
  ad = "the preview frame is not answering";
/**
 * 生成在预览外壳里执行的脚本：通过 window.__claudePreviewPort 向 iframe 发送 {run, args, id}，等待同 id 的应答，iframe 重新加载或超长时 reject。
 */
//@ chunk-8wvtd8sr.js:190122-190922 placement
function previewEvalScript(run, args) {
  let requestId = jsonStringify(randomUUID_4());
  return `new Promise(function(res,rej){var p=window.__claudePreviewPort,el=document.getElementsByTagName('iframe')[0];if(!p||!el){rej(new Error(${jsonStringify(ad)}));return}function done(){try{p.removeEventListener('message',h)}catch(x){}el.removeEventListener('load',left)}function left(){done();rej(new Error(${jsonStringify(eh)}))}function h(e){try{var d=e.data;if(!d||d.id!==${requestId})return;done();if(typeof d.v==='string')res(d.v.length>${id}?d.v.slice(0,${id + 1}):d.v);else rej(new Error(typeof d.e==='string'?d.e.slice(0,400):'the page answered without a value'))}catch(x){done();rej(new Error('the page answered unreadably'))}}p.addEventListener('message',h);el.addEventListener('load',left);try{p.postMessage({run:${jsonStringify(run)},args:${jsonStringify(args)},id:${requestId}})}catch(x){done();rej(new Error(${jsonStringify(ad)}))}})`;
}
//@ chunk-8wvtd8sr.js:190922-190979 placement
function Rt(e) {
  return e !== null && typeof e === "object" ? e : {};
}
//@ chunk-8wvtd8sr.js:190979-191026 placement
function pt(e) {
  return typeof e === "string" ? e : "";
}
//@ chunk-8wvtd8sr.js:191026-191134 placement
function clampNonNegativeInt(e, n = 1e6) {
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(0, Math.round(e)), n) : 0;
}
//@ chunk-8wvtd8sr.js:191134-191178 placement
function Fs(e) {
  return Array.isArray(e) ? e : [];
}
/**
 * 解析页面内测量脚本返回的 JSON：视口/滚动尺寸、溢出元素、被裁剪的 SVG 文字、mermaid 渲染结果、CSP 违规、对话框、能力使用；逐项截断到上限。
 */
//@ chunk-8wvtd8sr.js:191178-192285 placement
function parsePageMeasurement(json) {
  if (typeof json !== "string") throw Error("the measurement returned no data");
  if (json.length > id) throw Error("the measurement returned too much data");
  let parsed = jsonParse(json);
  if (parsed === null || typeof parsed !== "object") throw Error("the measurement returned no data");
  let data = Rt(parsed),
    r = Rt(data.mermaid),
    h = Fs(data.overflows),
    y = Fs(data.svgClips),
    p = Fs(r.failed),
    w = clampNonNegativeInt(r.total);
  return {
    href: pt(data.href),
    vw: clampNonNegativeInt(data.vw),
    sw: clampNonNegativeInt(data.sw),
    sh: clampNonNegativeInt(data.sh),
    overflows: h
      .slice(0, nd)
      .map((A) => ({
        path: pt(Rt(A).path),
        dx: clampNonNegativeInt(Rt(A).dx),
        dy: clampNonNegativeInt(Rt(A).dy),
      })),
    overflowMore: clampNonNegativeInt(data.overflowMore) + Math.max(0, h.length - nd),
    svgClips: y.slice(0, sd).map((A) => ({ path: pt(Rt(A).path), text: pt(Rt(A).text) })),
    svgClipMore: clampNonNegativeInt(data.svgClipMore) + Math.max(0, y.length - sd),
    mermaid: {
      total: w,
      runtime: r.runtime === !0,
      failed: p
        .slice(0, jf)
        .map((A) => ({ index: Math.min(clampNonNegativeInt(Rt(A).index), w), reason: pt(Rt(A).reason) })),
      failedMore: Math.max(0, p.length - jf),
    },
    csp: Fs(data.csp)
      .slice(0, 64)
      .map((A) => ({ uri: pt(Rt(A).uri), directive: pt(Rt(A).directive) })),
    dialogs: ["alert", "confirm", "prompt"].filter((A) => Rt(data.dialogs)[A] === 1),
    uses: Fs(data.uses)
      .slice(0, Ma)
      .map(pt)
      .filter((A) => A !== ""),
    usesMore: data.usesMore === 1 || Fs(data.uses).length > Ma,
  };
}
//@ chunk-8wvtd8sr.js:192285-192330 placement
function Ht(e, n = 80) {
  return scrubArtifactEnvelopeTags(sanitizeDisplayText(e, { max: n }));
}
/**
 * 由测量结果生成布局问题：横向滚动、元素溢出、SVG 标签被裁剪、mermaid 运行时未加载或渲染失败。
 */
//@ chunk-8wvtd8sr.js:192330-193530 placement
function layoutIssuesFromMeasurement(measurement) {
  let issues = [];
  if (measurement.sw > measurement.vw + 1)
    issues.push({
      kind: "overflow_x",
      text: `page scrolls horizontally (${measurement.sw}px of content in a ${measurement.vw}px viewport)`,
    });
  for (let overflow of measurement.overflows) {
    let joined = [
      overflow.dx > 0 ? `${overflow.dx}px wider` : "",
      overflow.dy > 0 ? `${overflow.dy}px taller` : "",
    ]
      .filter(Boolean)
      .join(", ");
    issues.push({
      kind: "element_overflow",
      text: `content overflows ${Ht(overflow.path)} (${joined} than its box)`,
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
      text: `SVG label "${Ht(svgClip.text, 32)}" is clipped by its <svg> viewport (${Ht(svgClip.path, 60)})`,
    });
  if (measurement.svgClipMore > 0)
    issues.push({ kind: "svg_clip", text: `${measurement.svgClipMore} more SVG labels are clipped` });
  if (measurement.mermaid.total > 0 && !measurement.mermaid.runtime)
    issues.push({
      kind: "mermaid",
      text: `${measurement.mermaid.total} <pre class="mermaid"> ${plural(measurement.mermaid.total, "block")} but the diagram runtime did not load, so ${plural(measurement.mermaid.total, "it shows", "they show")} as source`,
    });
  for (let s of measurement.mermaid.failed)
    issues.push({
      kind: "mermaid",
      text: `mermaid block ${s.index} of ${measurement.mermaid.total} failed: ${Ht(s.reason, 120)}`,
    });
  if (measurement.mermaid.failedMore > 0)
    issues.push({ kind: "mermaid", text: `${measurement.mermaid.failedMore} more mermaid blocks failed` });
  return issues;
}
/**
 * 把测量中的 CSP 违规按 origin 去重成问题（超过上限只计 dropped）。
 */
//@ chunk-8wvtd8sr.js:193530-193816 placement
function cspViolationIssues(e, n, s) {
  let r = [];
  for (let h of e.csp) {
    let y = originOrSelf(h.uri);
    if (n.has(y)) continue;
    if ((n.add(y), n.size > zw)) {
      s.drop();
      continue;
    }
    r.push({
      kind: "csp",
      text: `${Ht(y, 100)} is blocked by the artifact content policy (${Ht(h.directive, 24)}) \u2014 only Google Fonts loads from outside`,
    });
  }
  return r;
}
/**
 * 预览检查：页面加载时弹出的 JavaScript 对话框（每种只报一次）。
 */
//@ chunk-8wvtd8sr.js:193816-194023 placement
function dialogIssues(e, n) {
  let s = [];
  for (let dialog of e.dialogs) {
    if (n.has(dialog)) continue;
    (n.add(dialog),
      s.push({
        kind: "load",
        text: `the page opened a JavaScript dialog (${dialog}) on load; the published viewer never shows one`,
      }));
  }
  return s;
}
/**
 * 处理预览中被拦截的请求：页面目录内的相对引用收集到 h；弹窗、对话框、下载、目录外引用、file: 引用、只允许样式字体的源、CSP 外资源分别生成问题。
 */
//@ chunk-8wvtd8sr.js:194023-196152 placement
function blockedRequestIssues(requests, pageBaseUrl, pageUrl, seenUrls, relativeRefs, collector) {
  let issues = [],
    pageOrigin = Zl(pageBaseUrl),
    A = 0,
    S = 0;
  for (let R of requests) {
    if (seenUrls.has(R.url)) continue;
    seenUrls.add(R.url);
    let T = Zl(R.url) === pageOrigin,
      P = T && R.url.startsWith(pageBaseUrl);
    if (
      R.type !== "popup" &&
      T &&
      (P
        ? Ki(R.url.slice(pageBaseUrl.length)).startsWith("_blob/")
        : Ki(R.url.slice(pageOrigin.length)).startsWith("/_blob/"))
    ) {
      A++;
      continue;
    }
    if (P && R.type !== "popup" && R.type !== "dialog" && R.type !== "download") {
      let replaced = Ki(R.url.slice(pageBaseUrl.length)).replace(/[?#].*$/s, ""),
        M = replaced === "" ? "./ (the page's own directory)" : replaced;
      if (!relativeRefs.includes(M)) relativeRefs.push(M);
      continue;
    }
    if (++S > zf) {
      collector.drop();
      continue;
    }
    if (R.type === "popup") {
      let V = isSamePageUrl(R.url, pageUrl)
        ? "this page again"
        : P
          ? `another page of this artifact: ${Ht(Ki(R.url.slice(pageBaseUrl.length)) || "./", 60)}`
          : T
            ? `a page outside this artifact's directory: ${Ht(Ki(R.url.slice(pageOrigin.length)), 60)}`
            : describePopupTarget(R.url);
      issues.push({
        kind: "load",
        text: `the page opens a new window (${V}) on load \u2014 blocked in preview; the published viewer allows pop-ups only from a click`,
      });
    } else if (R.type === "dialog")
      issues.push({
        kind: "load",
        text: `the page opened a JavaScript dialog (${Ht(R.url, 16)}) on load; the published viewer never shows one`,
      });
    else if (R.type === "download")
      issues.push({
        kind: "load",
        text: `the page starts a download (${Ht(R.url || "unnamed", 60)}) on load \u2014 refused in preview; the published viewer blocks downloads too`,
      });
    else if (T && !P) {
      let V = Ki(R.url.slice(pageOrigin.length));
      issues.push({
        kind: "local_ref",
        text: `${Ht(V, 100)} points outside the page's own directory and will not load once published either \u2014 reference files relative to the page`,
      });
    } else if (R.url.startsWith("file:"))
      issues.push({
        kind: "local_ref",
        text: `${Ht(R.url, 120)} is another local file \u2014 it loads on this machine only and will not exist once published`,
      });
    else if (Yf.has(Zl(R.url)))
      issues.push({
        kind: "load",
        text: `${Ht(R.url, 120)} is not loaded in preview, which takes only stylesheets and font files from that origin (${Ht(R.type || "request", 16)}); the published page may load it`,
      });
    else
      issues.push({
        kind: "csp",
        text: `${Ht(originOrSelf(R.url), 100)} is outside what the published page may load (${Ht(R.type || "request", 16)})`,
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
function Zl(e) {
  try {
    return new URL(e).origin;
  } catch {
    return e;
  }
}
//@ chunk-8wvtd8sr.js:196212-196335 placement
function isSamePageUrl(e, n) {
  try {
    let s = new URL(e),
      r = new URL(n);
    return s.origin === r.origin && s.pathname === r.pathname;
  } catch {
    return e === n;
  }
}
//@ chunk-8wvtd8sr.js:196335-196399 placement
function Ki(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e;
  }
}
//@ chunk-8wvtd8sr.js:196399-196623 placement
function describePopupTarget(e) {
  try {
    let n = new URL(e);
    return n.protocol === "http:" || n.protocol === "https:"
      ? Ht(n.origin, 80)
      : n.protocol === "about:"
        ? Ht(n.href, 40)
        : `a ${Ht(n.protocol, 20)} URL`;
  } catch {
    return e === "" ? "about:blank" : "an unparseable URL";
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
/**
 * 预览检查：加载时的控制台错误（列出前若干条，其余计数）。
 */
//@ chunk-8wvtd8sr.js:196729-196960 placement
function consoleErrorIssues(e) {
  if (e.length === 0) return [];
  let mapped = e.slice(0, Vw).map((r) => Ht(r, 160)),
    s = e.length - mapped.length;
  return [
    {
      kind: "console",
      text:
        `${e.length} console ${plural(e.length, "error")} on load \u2014 ${mapped.join(" | ")}` +
        (s > 0 ? ` | ${s} more` : ""),
    },
  ];
}
/**
 * 让预览步骤与超时/中断赛跑：超时抛 PreviewStepTimeout，signal 中断抛 "preview aborted"，结束后清理定时器与监听。
 */
//@ chunk-8wvtd8sr.js:196960-197324 placement
async function raceWithStepTimeout(promise, timeoutMs, stepName, timers, signal) {
  if (signal?.aborted === !0) throw (promise.catch(() => {}), Error("preview aborted"));
  let y,
    p,
    promise_2 = new Promise((A, S) => {
      if (((y = timers.setTimeout(() => S(new PreviewStepTimeout(stepName, timeoutMs)), timeoutMs)), signal))
        ((p = () => S(Error("preview aborted"))), signal.addEventListener("abort", p, { once: !0 }));
    });
  try {
    return await Promise.race([promise, promise_2]);
  } finally {
    if ((timers.clearTimeout(y), signal && p)) signal.removeEventListener("abort", p);
    promise.catch(() => {});
  }
}
//@ chunk-8wvtd8sr.js:197324-197419 placement
var td = "text/html; charset=utf-8",
  Wf = { "content-security-policy": "sandbox; default-src 'none'" };
/**
 * 在回环地址上起两组服务：一组提供各主题的 preview-*.html（及 mermaid 运行时），另一组提供嵌入它们的 top-*.html 外壳页，返回 URL 生成器与 close。
 */
//@ chunk-8wvtd8sr.js:197419-198514 placement
async function servePreviewPages(pages, host = Ql()) {
  let pathToken = randomUUID_4(),
    previewRoutes = new Map();
  for (let [T, P] of pages)
    previewRoutes.set(`/${pathToken}/preview-${T}.html`, { body: P, contentType: td });
  if ([...pages.values()].some((T) => T.includes(MERMAID_RUNTIME_PATH)))
    try {
      let { loadMermaidBundleJs: loadMermaidBundleJs } = await import("./chunk-9yfhnw1m.js");
      previewRoutes.set(MERMAID_RUNTIME_PATH, {
        body: await loadMermaidBundleJs(),
        contentType: "text/javascript; charset=utf-8",
      });
    } catch (error) {
      (logError(error), logFeatureSad("artifact_publish", "mermaid_bundle_unreadable"));
    }
  let makeHandler = (T) => (P) => {
      let L = P.method === "GET" ? T.get(new URL(P.url).pathname) : void 0;
      return L === void 0
        ? new Response("not found", { status: 404, headers: Wf })
        : new Response(L.body, {
            headers: {
              "content-type": L.contentType,
              "cache-control": "no-store",
              "referrer-policy": "no-referrer",
              "x-content-type-options": "nosniff",
              ...(L.contentType !== td && Wf),
            },
          });
    },
    previewServers = await serveOnLoopbackPair(makeHandler(previewRoutes)),
    previewBase = `http://${host}:${previewServers[0].port}/${pathToken}/`,
    previewUrlFor = (T) => `${previewBase}preview-${T}.html`,
    topRoutes = new Map();
  for (let T of pages.keys())
    topRoutes.set(`/${pathToken}/top-${T}.html`, {
      body: previewShellHtml(previewUrlFor(T)),
      contentType: td,
    });
  let topServers;
  try {
    topServers = await serveOnLoopbackPair(makeHandler(topRoutes));
  } catch (error) {
    for (let P of previewServers) P.stop(!0);
    throw error;
  }
  let R = `http://${host}:${topServers[0].port}/${pathToken}/`;
  return {
    urlFor: previewUrlFor,
    topUrlFor: (T) => `${R}top-${T}.html`,
    baseUrl: previewBase,
    close: () => {
      for (let T of [...previewServers, ...topServers]) T.stop(!0);
    },
  };
}
//@ chunk-8wvtd8sr.js:198514-198583 placement
var $_ = "allow-scripts allow-same-origin allow-forms allow-downloads";
/**
 * 生成预览外壳页 HTML：仅允许 frame 指向预览源的 CSP、no-referrer，并用带 sandbox 的全屏 iframe 嵌入页面。
 */
//@ chunk-8wvtd8sr.js:198583-199085 placement
function previewShellHtml(pageUrl) {
  return `<!doctype html><html><head><meta charset=utf8><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${new URL(pageUrl).origin}; style-src 'unsafe-inline'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}iframe{display:block;border:0;margin:0;padding:0;width:100vw;height:100vh}</style></head><body><iframe src="${pageUrl}" referrerpolicy="no-referrer" sandbox="${$_}"></iframe></body></html>`;
}
//@ chunk-8wvtd8sr.js:199085-199476 sole-consumer
async function serveOnLoopbackPair(e, n = (h) => Bun.serve(h), s = hasIpv6Loopback, r = startBunRelay) {
  for (let h = 0; ; h++) {
    let y = n({ hostname: "127.0.0.1", port: 0, fetch: e }),
      p = y.port ?? 0;
    try {
      let w = n({ hostname: "::1", port: p, fetch: e });
      return [y, w];
    } catch (error) {
      let code = error.code;
      if (code === "EADDRNOTAVAIL" || code === "EAFNOSUPPORT" || (code === "EADDRINUSE" && !s())) {
        if (await r("::1", p)) throw (y.stop(!0), error);
        return [y];
      }
      if (code === "EADDRINUSE" && h < 8) {
        y.stop(!0);
        continue;
      }
      throw (y.stop(!0), error);
    }
  }
}

export {
  Ht,
  PreviewIssueCollector,
  staticPageIssues,
  composePreviewPage,
  raceWithStepTimeout,
  servePreviewPages,
  Hf,
  parsePageMeasurement,
  layoutIssuesFromMeasurement,
  cspViolationIssues,
  dialogIssues,
  blockedRequestIssues,
  consoleErrorIssues,
  identicalThemeRenderIssues,
  relativeRefsNotLoadedIssues,
  missingRuntimeCapabilityIssues,
  pt,
  Fs,
  Rt,
  p_,
  eh,
  ad,
  previewEvalScript,
};
