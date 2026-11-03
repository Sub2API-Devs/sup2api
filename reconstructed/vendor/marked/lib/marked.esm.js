/**
 * marked/lib/marked.esm.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: marked@16.0.0..16.1.1
 * pieces: chunk-s61vbvea.js (39)
 * attribution: esm-fingerprint 30, esm-layout 6, affinity 3
 */

//@ chunk-s61vbvea.js:378309-378451 esm-fingerprint
function _getDefaults() {
  return {
    async: false,
    breaks: false,
    extensions: null,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null,
  };
}
//@ chunk-s61vbvea.js:378451-378463 esm-layout
var _defaults = _getDefaults();
//@ chunk-s61vbvea.js:378463-378483 esm-layout
function changeDefaults(newDefaults) {
  _defaults = newDefaults;
}
//@ chunk-s61vbvea.js:378483-378506 esm-layout
var noopTest = {
  exec: () => null,
};
//@ chunk-s61vbvea.js:378506-378712 esm-fingerprint
function edit(regex, opt = "") {
  let source = typeof regex === "string" ? regex : regex.source;
  let obj = {
    replace: (name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(other.caret, "$1");
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => new RegExp(source, opt),
  };
  return obj;
}
//@ chunk-s61vbvea.js:378712-389047 esm-fingerprint
var other = {
  codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  listReplaceTabs: /^\t+/,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\] /,
  listReplaceTask: /^\[[ xX]\] +/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi,
  caret: /(^|[^\[])\^/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (bull) => new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (indent) =>
    new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (indent) =>
    new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`),
  htmlBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}<(?:[a-z].*>|!--)`, "i"),
};
var newline = /^(?:[ \t]*(?:\n|$))+/;
var blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var fences =
  /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var bullet = /(?:[*+-]|\d{1,9}[.)])/;
var B_ = edit(
  /^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
)
  .replace(/bull/g, bullet)
  .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
  .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
  .replace(/blockquote/g, / {0,3}>/)
  .replace(/heading/g, / {0,3}#{1,6}/)
  .replace(/html/g, / {0,3}<[^\n>]+>\n/)
  .getRegex();
var _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var blockText = /^[^\n]+/;
var _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
var def = edit(
  /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/,
)
  .replace("label", _blockLabel)
  .replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
  .getRegex();
var list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/)
  .replace(/bull/g, bullet)
  .getRegex();
var _tag =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var html = edit(
  "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))",
  "i",
)
  .replace("comment", _comment)
  .replace("tag", _tag)
  .replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
  .getRegex();
var paragraph = edit(_paragraph)
  .replace("hr", hr)
  .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
  .replace("|lheading", "")
  .replace("|table", "")
  .replace("blockquote", " {0,3}>")
  .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
  .replace("list", " {0,3}(?:[*+-]|1[.)]) ")
  .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
  .replace("tag", _tag)
  .getRegex();
var blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
  .replace("paragraph", paragraph)
  .getRegex();
var blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading: B_,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText,
};
var gfmTable = edit(
  "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)",
)
  .replace("hr", hr)
  .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
  .replace("blockquote", " {0,3}>")
  .replace("code", "(?: {4}| {0,3}\t)[^\\n]")
  .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
  .replace("list", " {0,3}(?:[*+-]|1[.)]) ")
  .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
  .replace("tag", _tag)
  .getRegex();
var gL = {
  ...blockNormal,
  table: gfmTable,
  paragraph: edit(_paragraph)
    .replace("hr", hr)
    .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
    .replace("|lheading", "")
    .replace("table", gfmTable)
    .replace("blockquote", " {0,3}>")
    .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
    .replace("list", " {0,3}(?:[*+-]|1[.)]) ")
    .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
    .replace("tag", _tag)
    .getRegex(),
};
var yL = {
  ...blockNormal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`,
  )
    .replace("comment", _comment)
    .replace(
      /tag/g,
      "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b",
    )
    .getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph)
    .replace("hr", hr)
    .replace(
      "heading",
      ` *#{1,6} *[^
]`,
    )
    .replace("lheading", B_)
    .replace("|table", "")
    .replace("blockquote", " {0,3}>")
    .replace("|fences", "")
    .replace("|list", "")
    .replace("|html", "")
    .replace("|tag", "")
    .getRegex(),
};
var SL = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var br = /^( {2,}|\\)\n(?!\s*$)/;
var inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _punctuation = /[\p{P}\p{S}]/u;
var _punctuationOrSpace = /[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u;
var punctuation = edit(/^((?![*_])punctSpace)/, "u")
  .replace(/punctSpace/g, _punctuationOrSpace)
  .getRegex();
var _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u;
var _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u;
var blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
var emStrongLDelimCore = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var emStrongLDelim = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuation).getRegex();
var emStrongLDelimGfm = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimAstCore =
  "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var emStrongRDelimAst = edit(emStrongRDelimAstCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
var emStrongRDelimAstGfm = edit(emStrongRDelimAstCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm)
  .replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm)
  .replace(/punct/g, _punctuationGfmStrongEm)
  .getRegex();
var emStrongRDelimUnd = edit(
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)",
  "gu",
)
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
var anyPunctuation = edit(/\\(punct)/, "gu")
  .replace(/punct/g, _punctuation)
  .getRegex();
var autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
  .replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
  .replace(
    "email",
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
  )
  .getRegex();
var _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
var tag = edit(
  "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
)
  .replace("comment", _inlineComment)
  .replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
  .getRegex();
var _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
var NL = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/)
  .replace("label", _inlineLabel)
  .replace("href", /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/)
  .replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
  .getRegex();
var reflink = edit(/^!?\[(label)\]\[(ref)\]/)
  .replace("label", _inlineLabel)
  .replace("ref", _blockLabel)
  .getRegex();
var nolink = edit(/^!?\[(ref)\](?:\[\])?/)
  .replace("ref", _blockLabel)
  .getRegex();
var reflinkSearch = edit("reflink|nolink(?!\\()", "g")
  .replace("reflink", reflink)
  .replace("nolink", nolink)
  .getRegex();
var inlineNormal = {
  _backpedal: noopTest,
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape: SL,
  link: NL,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest,
};
var inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/)
    .replace("label", _inlineLabel)
    .getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
    .replace("label", _inlineLabel)
    .getRegex(),
};
var inlineGfm = {
  ...inlineNormal,
  emStrongRDelimAst: emStrongRDelimAstGfm,
  emStrongLDelim: emStrongLDelimGfm,
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i")
    .replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
    .getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/,
};
var inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text)
    .replace("\\b_", "\\b_| {2,}\\n")
    .replace(/\{2,\}/g, "*")
    .getRegex(),
};
var block = {
  normal: blockNormal,
  gfm: gL,
  pedantic: yL,
};
var inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic,
};
var escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
var getEscapeReplacement = (ch) => escapeReplacements[ch];
//@ chunk-s61vbvea.js:389047-389226 esm-fingerprint
function Qn(html, encode) {
  if (encode) {
    if (other.escapeTest.test(html)) return html.replace(other.escapeReplace, getEscapeReplacement);
  } else if (other.escapeTestNoEncode.test(html))
    return html.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
  return html;
}
//@ chunk-s61vbvea.js:389226-389317 esm-fingerprint
function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return href;
}
//@ chunk-s61vbvea.js:389317-389680 esm-fingerprint
function splitCells(tableRow, count) {
  let row = tableRow.replace(other.findPipe, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
    if (escaped) return "|";
    else return " |";
  });
  let cells = row.split(other.splitPipe);
  let i = 0;
  if (!cells[0].trim()) cells.shift();
  if (cells.length > 0 && !cells.at(-1)?.trim()) cells.pop();
  if (count)
    if (cells.length > count) cells.splice(count);
    else while (cells.length < count) cells.push("");
  for (; i < cells.length; i++) cells[i] = cells[i].trim().replace(other.slashPipe, "|");
  return cells;
}
//@ chunk-s61vbvea.js:389680-389810 esm-fingerprint
function rtrim(str, n, r) {
  let l = str.length;
  if (l === 0) return "";
  let suffLen = 0;
  while (suffLen < l)
    if (str.charAt(l - suffLen - 1) === n) suffLen++;
    else break;
  return str.slice(0, l - suffLen);
}
//@ chunk-s61vbvea.js:389810-389988 esm-fingerprint
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) return -1;
  let level = 0;
  for (let i = 0; i < str.length; i++)
    if (str[i] === "\\") i++;
    else if (str[i] === b[0]) level++;
    else if (str[i] === b[1]) {
      level--;
      if (level < 0) return i;
    }
  return -1;
}
//@ chunk-s61vbvea.js:389988-390279 esm-fingerprint
function outputLink(cap, link, raw, lexer, rules) {
  let href = link.href;
  let title = link.title || null;
  let text = cap[1].replace(rules.other.outputLinkReplace, "$1");
  if (cap[0].charAt(0) !== "!") {
    lexer.state.inLink = true;
    let token = {
      type: "link",
      raw,
      href,
      title,
      text,
      tokens: lexer.inlineTokens(text),
    };
    lexer.state.inLink = false;
    return token;
  }
  return {
    type: "image",
    raw,
    href,
    title,
    text,
  };
}
//@ chunk-s61vbvea.js:390279-390542 esm-fingerprint
function indentCodeCompensation(raw, text, rules) {
  let matchIndentToCode = raw.match(rules.other.indentCodeCompensation);
  if (matchIndentToCode === null) return text;
  let indentToCode = matchIndentToCode[1];
  return text
    .split(
      `
`,
    )
    .map((node) => {
      let matchIndentInNode = node.match(rules.other.beginningSpace);
      if (matchIndentInNode === null) return node;
      let [indentInNode] = matchIndentInNode;
      if (indentInNode.length >= indentToCode.length) return node.slice(indentToCode.length);
      return node;
    }).join(`
`);
}
//@ chunk-s61vbvea.js:390542-400634 esm-fingerprint
class _Tokenizer {
  options;
  rules;
  lexer;
  constructor(options) {
    this.options = options || _defaults;
  }
  space(src) {
    let cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0)
      return {
        type: "space",
        raw: cap[0],
      };
  }
  code(src) {
    let cap = this.rules.block.code.exec(src);
    if (cap) {
      let text = cap[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic
          ? rtrim(
              text,
              `
`,
            )
          : text,
      };
    }
  }
  fences(src) {
    let cap = this.rules.block.fences.exec(src);
    if (cap) {
      let raw = cap[0];
      let text = indentCodeCompensation(raw, cap[3] || "", this.rules);
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap[2],
        text,
      };
    }
  }
  heading(src) {
    let cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = cap[2].trim();
      if (this.rules.other.endingHash.test(text)) {
        let trimmed = rtrim(text, "#");
        if (this.options.pedantic) text = trimmed.trim();
        else if (!trimmed || this.rules.other.endingSpaceChar.test(trimmed)) text = trimmed.trim();
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text,
        tokens: this.lexer.inline(text),
      };
    }
  }
  hr(src) {
    let cap = this.rules.block.hr.exec(src);
    if (cap)
      return {
        type: "hr",
        raw: rtrim(
          cap[0],
          `
`,
        ),
      };
  }
  blockquote(src) {
    let cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      let lines = rtrim(
        cap[0],
        `
`,
      ).split(`
`);
      let raw = "";
      let text = "";
      let tokens = [];
      while (lines.length > 0) {
        let inBlockquote = false;
        let currentLines = [];
        let i;
        for (i = 0; i < lines.length; i++)
          if (this.rules.other.blockquoteStart.test(lines[i])) {
            currentLines.push(lines[i]);
            inBlockquote = true;
          } else if (!inBlockquote) currentLines.push(lines[i]);
          else break;
        lines = lines.slice(i);
        let currentRaw = currentLines.join(`
`);
        let currentText = currentRaw
          .replace(
            this.rules.other.blockquoteSetextReplace,
            `
    $1`,
          )
          .replace(this.rules.other.blockquoteSetextReplace2, "");
        raw = raw
          ? `${raw}
${currentRaw}`
          : currentRaw;
        text = text
          ? `${text}
${currentText}`
          : currentText;
        let top = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(currentText, tokens, true);
        this.lexer.state.top = top;
        if (lines.length === 0) break;
        let lastToken = tokens.at(-1);
        if (lastToken?.type === "code") break;
        else if (lastToken?.type === "blockquote") {
          let oldToken = lastToken;
          let newText =
            oldToken.raw +
            `
` +
            lines.join(`
`);
          let newToken = this.blockquote(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
          break;
        } else if (lastToken?.type === "list") {
          let oldToken = lastToken;
          let newText =
            oldToken.raw +
            `
` +
            lines.join(`
`);
          let newToken = this.list(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
          lines = newText.substring(tokens.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return {
        type: "blockquote",
        raw,
        tokens,
        text,
      };
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let bull = cap[1].trim();
      let isordered = bull.length > 1;
      let list = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: [],
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) bull = isordered ? bull : "[*+-]";
      let itemRegex = this.rules.other.listItemRegex(bull);
      let endsWithBlankLine = false;
      while (src) {
        let endEarly = false;
        let raw = "";
        let itemContents = "";
        if (!(cap = itemRegex.exec(src))) break;
        if (this.rules.block.hr.test(src)) break;
        raw = cap[0];
        src = src.substring(raw.length);
        let line = cap[2]
          .split(
            `
`,
            1,
          )[0]
          .replace(this.rules.other.listReplaceTabs, (t) => " ".repeat(3 * t.length));
        let nextLine = src.split(
          `
`,
          1,
        )[0];
        let blankLine = !line.trim();
        let indent = 0;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else if (blankLine) indent = cap[1].length + 1;
        else {
          indent = cap[2].search(this.rules.other.nonSpaceChar);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        if (blankLine && this.rules.other.blankLine.test(nextLine)) {
          raw +=
            nextLine +
            `
`;
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          let nextBulletRegex = this.rules.other.nextBulletRegex(indent);
          let hrRegex = this.rules.other.hrRegex(indent);
          let fencesBeginRegex = this.rules.other.fencesBeginRegex(indent);
          let headingBeginRegex = this.rules.other.headingBeginRegex(indent);
          let htmlBeginRegex = this.rules.other.htmlBeginRegex(indent);
          while (src) {
            let rawLine = src.split(
              `
`,
              1,
            )[0];
            let nextLineWithoutTabs;
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(this.rules.other.listReplaceNesting, "  ");
              nextLineWithoutTabs = nextLine;
            } else nextLineWithoutTabs = nextLine.replace(this.rules.other.tabCharGlobal, "    ");
            if (fencesBeginRegex.test(nextLine)) break;
            if (headingBeginRegex.test(nextLine)) break;
            if (htmlBeginRegex.test(nextLine)) break;
            if (nextBulletRegex.test(nextLine)) break;
            if (hrRegex.test(nextLine)) break;
            if (nextLineWithoutTabs.search(this.rules.other.nonSpaceChar) >= indent || !nextLine.trim())
              itemContents +=
                `
` + nextLineWithoutTabs.slice(indent);
            else {
              if (blankLine) break;
              if (
                line.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >=
                4
              )
                break;
              if (fencesBeginRegex.test(line)) break;
              if (headingBeginRegex.test(line)) break;
              if (hrRegex.test(line)) break;
              itemContents +=
                `
` + nextLine;
            }
            if (!blankLine && !nextLine.trim()) blankLine = true;
            raw +=
              rawLine +
              `
`;
            src = src.substring(rawLine.length + 1);
            line = nextLineWithoutTabs.slice(indent);
          }
        }
        if (!list.loose) {
          if (endsWithBlankLine) list.loose = true;
          else if (this.rules.other.doubleBlankLine.test(raw)) endsWithBlankLine = true;
        }
        let istask = null;
        let ischecked;
        if (this.options.gfm) {
          istask = this.rules.other.listIsTask.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(this.rules.other.listReplaceTask, "");
          }
        }
        list.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: [],
        });
        list.raw += raw;
      }
      let lastItem = list.items.at(-1);
      if (lastItem) {
        lastItem.raw = lastItem.raw.trimEnd();
        lastItem.text = lastItem.text.trimEnd();
      } else return;
      list.raw = list.raw.trimEnd();
      for (let i = 0; i < list.items.length; i++) {
        this.lexer.state.top = false;
        list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
        if (!list.loose) {
          let spacers = list.items[i].tokens.filter((t) => t.type === "space");
          let hasMultipleLineBreaks =
            spacers.length > 0 && spacers.some((t) => this.rules.other.anyLine.test(t.raw));
          list.loose = hasMultipleLineBreaks;
        }
      }
      if (list.loose) for (let i = 0; i < list.items.length; i++) list.items[i].loose = true;
      return list;
    }
  }
  html(src) {
    let cap = this.rules.block.html.exec(src);
    if (cap)
      return {
        type: "html",
        block: true,
        raw: cap[0],
        pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
        text: cap[0],
      };
  }
  def(src) {
    let cap = this.rules.block.def.exec(src);
    if (cap) {
      let tag = cap[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " ");
      let href = cap[2]
        ? cap[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1")
        : "";
      let title = cap[3]
        ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1")
        : cap[3];
      return {
        type: "def",
        tag,
        raw: cap[0],
        href,
        title,
      };
    }
  }
  table(src) {
    let cap = this.rules.block.table.exec(src);
    if (!cap) return;
    if (!this.rules.other.tableDelimiter.test(cap[2])) return;
    let headers = splitCells(cap[1]);
    let aligns = cap[2].replace(this.rules.other.tableAlignChars, "").split("|");
    let rows = cap[3]?.trim()
      ? cap[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`)
      : [];
    let item = {
      type: "table",
      raw: cap[0],
      header: [],
      align: [],
      rows: [],
    };
    if (headers.length !== aligns.length) return;
    for (let align of aligns)
      if (this.rules.other.tableAlignRight.test(align)) item.align.push("right");
      else if (this.rules.other.tableAlignCenter.test(align)) item.align.push("center");
      else if (this.rules.other.tableAlignLeft.test(align)) item.align.push("left");
      else item.align.push(null);
    for (let i = 0; i < headers.length; i++)
      item.header.push({
        text: headers[i],
        tokens: this.lexer.inline(headers[i]),
        header: true,
        align: item.align[i],
      });
    for (let row of rows)
      item.rows.push(
        splitCells(row, item.header.length).map((cell, i) => ({
          text: cell,
          tokens: this.lexer.inline(cell),
          header: false,
          align: item.align[i],
        })),
      );
    return item;
  }
  lheading(src) {
    let cap = this.rules.block.lheading.exec(src);
    if (cap)
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1]),
      };
  }
  paragraph(src) {
    let cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      let text =
        cap[1].charAt(cap[1].length - 1) ===
        `
`
          ? cap[1].slice(0, -1)
          : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text,
        tokens: this.lexer.inline(text),
      };
    }
  }
  text(src) {
    let cap = this.rules.block.text.exec(src);
    if (cap)
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0]),
      };
  }
  escape(src) {
    let cap = this.rules.inline.escape.exec(src);
    if (cap)
      return {
        type: "escape",
        raw: cap[0],
        text: cap[1],
      };
  }
  tag(src) {
    let cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && this.rules.other.startATag.test(cap[0])) this.lexer.state.inLink = true;
      else if (this.lexer.state.inLink && this.rules.other.endATag.test(cap[0]))
        this.lexer.state.inLink = false;
      if (!this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(cap[0]))
        this.lexer.state.inRawBlock = true;
      else if (this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(cap[0]))
        this.lexer.state.inRawBlock = false;
      return {
        type: "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: cap[0],
      };
    }
  }
  link(src) {
    let cap = this.rules.inline.link.exec(src);
    if (cap) {
      let trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(trimmedUrl)) {
        if (!this.rules.other.endAngleBracket.test(trimmedUrl)) return;
        let rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) return;
      } else {
        let lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex > -1) {
          let linkLen = (cap[0].indexOf("!") === 0 ? 5 : 4) + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        let link = this.rules.other.pedanticHrefTitle.exec(href);
        if (link) {
          href = link[1];
          title = link[3];
        }
      } else title = cap[3] ? cap[3].slice(1, -1) : "";
      href = href.trim();
      if (this.rules.other.startAngleBracket.test(href))
        if (this.options.pedantic && !this.rules.other.endAngleBracket.test(trimmedUrl)) href = href.slice(1);
        else href = href.slice(1, -1);
      return outputLink(
        cap,
        {
          href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
          title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title,
        },
        cap[0],
        this.lexer,
        this.rules,
      );
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      let linkString = (cap[2] || cap[1]).replace(this.rules.other.multipleSpaceGlobal, " ");
      let link = links[linkString.toLowerCase()];
      if (!link) {
        let text = cap[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text,
        };
      }
      return outputLink(cap, link, cap[0], this.lexer, this.rules);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match) return;
    if (match[3] && prevChar.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(match[1] || match[2]) || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      let lLength = [...match[0]].length - 1;
      let rDelim;
      let rLength;
      let delimTotal = lLength;
      let midDelimTotal = 0;
      let endReg =
        match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim) continue;
        rLength = [...rDelim].length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0) continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        let lastCharLength = [...match[0]][0].length;
        let raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
        if (Math.min(lLength, rLength) % 2) {
          let text = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text,
            tokens: this.lexer.inlineTokens(text),
          };
        }
        let text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text),
        };
      }
    }
  }
  codespan(src) {
    let cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = cap[2].replace(this.rules.other.newLineCharGlobal, " ");
      let hasNonSpaceChars = this.rules.other.nonSpaceChar.test(text);
      let hasSpaceCharsOnBothEnds =
        this.rules.other.startingSpaceChar.test(text) && this.rules.other.endingSpaceChar.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) text = text.substring(1, text.length - 1);
      return {
        type: "codespan",
        raw: cap[0],
        text,
      };
    }
  }
  br(src) {
    let cap = this.rules.inline.br.exec(src);
    if (cap)
      return {
        type: "br",
        raw: cap[0],
      };
  }
  del(src) {
    let cap = this.rules.inline.del.exec(src);
    if (cap)
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2]),
      };
  }
  autolink(src) {
    let cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text;
      let href;
      if (cap[2] === "@") {
        text = cap[1];
        href = "mailto:" + text;
      } else {
        text = cap[1];
        href = text;
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text,
          },
        ],
      };
    }
  }
  url(src) {
    let cap;
    if ((cap = this.rules.inline.url.exec(src))) {
      let text;
      let href;
      if (cap[2] === "@") {
        text = cap[0];
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? "";
        } while (prevCapZero !== cap[0]);
        text = cap[0];
        if (cap[1] === "www.") href = "http://" + cap[0];
        else href = cap[0];
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text,
          },
        ],
      };
    }
  }
  inlineText(src) {
    let cap = this.rules.inline.text.exec(src);
    if (cap) {
      let escaped = this.lexer.state.inRawBlock;
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        escaped,
      };
    }
  }
}
//@ chunk-s61vbvea.js:400634-406359 esm-fingerprint
class _Lexer {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(options) {
    this.tokens = [];
    this.tokens.links = Object.create(null);
    this.options = options || _defaults;
    this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true,
    };
    let rules = {
      other,
      block: block.normal,
      inline: inline.normal,
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) rules.inline = inline.breaks;
      else rules.inline = inline.gfm;
    }
    this.tokenizer.rules = rules;
  }
  static get rules() {
    return {
      block,
      inline,
    };
  }
  static lex(src, options) {
    return new _Lexer(options).lex(src);
  }
  static lexInline(src, options) {
    return new _Lexer(options).inlineTokens(src);
  }
  lex(src) {
    src = src.replace(
      other.carriageReturn,
      `
`,
    );
    this.blockTokens(src, this.tokens);
    for (let i = 0; i < this.inlineQueue.length; i++) {
      let next = this.inlineQueue[i];
      this.inlineTokens(next.src, next.tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }
  blockTokens(src, tokens = [], lastParagraphClipped = false) {
    if (this.options.pedantic) src = src.replace(other.tabCharGlobal, "    ").replace(other.spaceLine, "");
    while (src) {
      let token;
      if (
        this.options.extensions?.block?.some((extTokenizer) => {
          if (
            (token = extTokenizer.call(
              {
                lexer: this,
              },
              src,
              tokens,
            ))
          ) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            return true;
          }
          return false;
        })
      )
        continue;
      if ((token = this.tokenizer.space(src))) {
        src = src.substring(token.raw.length);
        let lastToken = tokens.at(-1);
        if (token.raw.length === 1 && lastToken !== undefined)
          lastToken.raw += `
`;
        else tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.code(src))) {
        src = src.substring(token.raw.length);
        let lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw +=
            `
` + token.raw;
          lastToken.text +=
            `
` + token.text;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.fences(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.heading(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.hr(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.blockquote(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.list(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.html(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.def(src))) {
        src = src.substring(token.raw.length);
        let lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw +=
            `
` + token.raw;
          lastToken.text +=
            `
` + token.raw;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else if (!this.tokens.links[token.tag])
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title,
          };
        continue;
      }
      if ((token = this.tokenizer.table(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.lheading(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startBlock) {
        let startIndex = 1 / 0;
        let tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach((getStartIndex) => {
          tempStart = getStartIndex.call(
            {
              lexer: this,
            },
            tempSrc,
          );
          if (typeof tempStart === "number" && tempStart >= 0) startIndex = Math.min(startIndex, tempStart);
        });
        if (startIndex < 1 / 0 && startIndex >= 0) cutSrc = src.substring(0, startIndex + 1);
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        let lastToken = tokens.at(-1);
        if (lastParagraphClipped && lastToken?.type === "paragraph") {
          lastToken.raw +=
            `
` + token.raw;
          lastToken.text +=
            `
` + token.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else tokens.push(token);
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if ((token = this.tokenizer.text(src))) {
        src = src.substring(token.raw.length);
        let lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw +=
            `
` + token.raw;
          lastToken.text +=
            `
` + token.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else tokens.push(token);
        continue;
      }
      if (src) {
        let errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else throw Error(errMsg);
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({
      src,
      tokens,
    });
    return tokens;
  }
  inlineTokens(src, tokens = []) {
    let maskedSrc = src;
    let match = null;
    if (this.tokens.links) {
      let links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null)
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1)))
            maskedSrc =
              maskedSrc.slice(0, match.index) +
              "[" +
              "a".repeat(match[0].length - 2) +
              "]" +
              maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
      }
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null)
      maskedSrc =
        maskedSrc.slice(0, match.index) +
        "[" +
        "a".repeat(match[0].length - 2) +
        "]" +
        maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null)
      maskedSrc =
        maskedSrc.slice(0, match.index) +
        "++" +
        maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let keepPrevChar = false;
    let prevChar = "";
    while (src) {
      if (!keepPrevChar) prevChar = "";
      keepPrevChar = false;
      let token;
      if (
        this.options.extensions?.inline?.some((extTokenizer) => {
          if (
            (token = extTokenizer.call(
              {
                lexer: this,
              },
              src,
              tokens,
            ))
          ) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            return true;
          }
          return false;
        })
      )
        continue;
      if ((token = this.tokenizer.escape(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.tag(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.link(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.reflink(src, this.tokens.links))) {
        src = src.substring(token.raw.length);
        let lastToken = tokens.at(-1);
        if (token.type === "text" && lastToken?.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.emStrong(src, maskedSrc, prevChar))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.codespan(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.br(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.del(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if ((token = this.tokenizer.autolink(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startInline) {
        let startIndex = 1 / 0;
        let tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach((getStartIndex) => {
          tempStart = getStartIndex.call(
            {
              lexer: this,
            },
            tempSrc,
          );
          if (typeof tempStart === "number" && tempStart >= 0) startIndex = Math.min(startIndex, tempStart);
        });
        if (startIndex < 1 / 0 && startIndex >= 0) cutSrc = src.substring(0, startIndex + 1);
      }
      if ((token = this.tokenizer.inlineText(cutSrc))) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") prevChar = token.raw.slice(-1);
        keepPrevChar = true;
        let lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else tokens.push(token);
        continue;
      }
      if (src) {
        let errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else throw Error(errMsg);
      }
    }
    return tokens;
  }
}
//@ chunk-s61vbvea.js:406359-408973 esm-fingerprint
class _Renderer {
  options;
  parser;
  constructor(options) {
    this.options = options || _defaults;
  }
  space(token) {
    return "";
  }
  code({ text, lang, escaped }) {
    let langString = (lang || "").match(other.notSpaceStart)?.[0];
    let code =
      text.replace(other.endingNewline, "") +
      `
`;
    if (!langString)
      return (
        "<pre><code>" +
        (escaped ? code : Qn(code, true)) +
        `</code></pre>
`
      );
    return (
      '<pre><code class="language-' +
      Qn(langString) +
      '">' +
      (escaped ? code : Qn(code, true)) +
      `</code></pre>
`
    );
  }
  blockquote({ tokens }) {
    return `<blockquote>
${this.parser.parse(tokens)}</blockquote>
`;
  }
  html({ text }) {
    return text;
  }
  heading({ tokens, depth }) {
    return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>
`;
  }
  hr(token) {
    return `<hr>
`;
  }
  list(token) {
    let { ordered, start } = token;
    let body = "";
    for (let j = 0; j < token.items.length; j++) {
      let item = token.items[j];
      body += this.listitem(item);
    }
    let type = ordered ? "ol" : "ul";
    let startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return (
      "<" +
      type +
      startAttr +
      `>
` +
      body +
      "</" +
      type +
      `>
`
    );
  }
  listitem(item) {
    let itemBody = "";
    if (item.task) {
      let checkbox = this.checkbox({
        checked: !!item.checked,
      });
      if (item.loose) {
        if (item.tokens[0]?.type === "paragraph") {
          item.tokens[0].text = checkbox + " " + item.tokens[0].text;
          if (
            item.tokens[0].tokens &&
            item.tokens[0].tokens.length > 0 &&
            item.tokens[0].tokens[0].type === "text"
          ) {
            item.tokens[0].tokens[0].text = checkbox + " " + Qn(item.tokens[0].tokens[0].text);
            item.tokens[0].tokens[0].escaped = true;
          }
        } else
          item.tokens.unshift({
            type: "text",
            raw: checkbox + " ",
            text: checkbox + " ",
            escaped: true,
          });
      } else itemBody += checkbox + " ";
    }
    itemBody += this.parser.parse(item.tokens, !!item.loose);
    return `<li>${itemBody}</li>
`;
  }
  checkbox({ checked }) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens }) {
    return `<p>${this.parser.parseInline(tokens)}</p>
`;
  }
  table(token) {
    let header = "";
    let cell = "";
    for (let j = 0; j < token.header.length; j++) cell += this.tablecell(token.header[j]);
    header += this.tablerow({
      text: cell,
    });
    let body = "";
    for (let j = 0; j < token.rows.length; j++) {
      let row = token.rows[j];
      cell = "";
      for (let k = 0; k < row.length; k++) cell += this.tablecell(row[k]);
      body += this.tablerow({
        text: cell,
      });
    }
    if (body) body = `<tbody>${body}</tbody>`;
    return (
      `<table>
<thead>
` +
      header +
      `</thead>
` +
      body +
      `</table>
`
    );
  }
  tablerow({ text }) {
    return `<tr>
${text}</tr>
`;
  }
  tablecell(token) {
    let content = this.parser.parseInline(token.tokens);
    let type = token.header ? "th" : "td";
    return (
      (token.align ? `<${type} align="${token.align}">` : `<${type}>`) +
      content +
      `</${type}>
`
    );
  }
  strong({ tokens }) {
    return `<strong>${this.parser.parseInline(tokens)}</strong>`;
  }
  em({ tokens }) {
    return `<em>${this.parser.parseInline(tokens)}</em>`;
  }
  codespan({ text }) {
    return `<code>${Qn(text, true)}</code>`;
  }
  br(token) {
    return "<br>";
  }
  del({ tokens }) {
    return `<del>${this.parser.parseInline(tokens)}</del>`;
  }
  link({ href, title, tokens }) {
    let text = this.parser.parseInline(tokens);
    let cleanHref = cleanUrl(href);
    if (cleanHref === null) return text;
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) out += ' title="' + Qn(title) + '"';
    out += ">" + text + "</a>";
    return out;
  }
  image({ href, title, text }) {
    let cleanHref = cleanUrl(href);
    if (cleanHref === null) return Qn(text);
    href = cleanHref;
    let out = `<img src="${href}" alt="${text}"`;
    if (title) out += ` title="${Qn(title)}"`;
    out += ">";
    return out;
  }
  text(token) {
    return "tokens" in token && token.tokens
      ? this.parser.parseInline(token.tokens)
      : "escaped" in token && token.escaped
        ? token.text
        : Qn(token.text);
  }
}
//@ chunk-s61vbvea.js:408973-409197 esm-fingerprint
class _TextRenderer {
  strong({ text }) {
    return text;
  }
  em({ text }) {
    return text;
  }
  codespan({ text }) {
    return text;
  }
  del({ text }) {
    return text;
  }
  html({ text }) {
    return text;
  }
  text({ text }) {
    return text;
  }
  link({ text }) {
    return "" + text;
  }
  image({ text }) {
    return "" + text;
  }
  br() {
    return "";
  }
}
//@ chunk-s61vbvea.js:409197-411530 esm-fingerprint
class _Parser {
  options;
  renderer;
  textRenderer;
  constructor(options) {
    this.options = options || _defaults;
    this.options.renderer = this.options.renderer || new _Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.renderer.parser = this;
    this.textRenderer = new _TextRenderer();
  }
  static parse(tokens, options) {
    return new _Parser(options).parse(tokens);
  }
  static parseInline(tokens, options) {
    return new _Parser(options).parseInline(tokens);
  }
  parse(tokens, top = true) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      let anyToken = tokens[i];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        let genericToken = anyToken;
        let ret = this.options.extensions.renderers[genericToken.type].call(
          {
            parser: this,
          },
          genericToken,
        );
        if (
          ret !== false ||
          ![
            "space",
            "hr",
            "heading",
            "code",
            "table",
            "blockquote",
            "list",
            "html",
            "paragraph",
            "text",
          ].includes(genericToken.type)
        ) {
          out += ret || "";
          continue;
        }
      }
      let token = anyToken;
      switch (token.type) {
        case "space": {
          out += this.renderer.space(token);
          continue;
        }
        case "hr": {
          out += this.renderer.hr(token);
          continue;
        }
        case "heading": {
          out += this.renderer.heading(token);
          continue;
        }
        case "code": {
          out += this.renderer.code(token);
          continue;
        }
        case "table": {
          out += this.renderer.table(token);
          continue;
        }
        case "blockquote": {
          out += this.renderer.blockquote(token);
          continue;
        }
        case "list": {
          out += this.renderer.list(token);
          continue;
        }
        case "html": {
          out += this.renderer.html(token);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(token);
          continue;
        }
        case "text": {
          let textToken = token;
          let body = this.renderer.text(textToken);
          while (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            textToken = tokens[++i];
            body +=
              `
` + this.renderer.text(textToken);
          }
          if (top)
            out += this.renderer.paragraph({
              type: "paragraph",
              raw: body,
              text: body,
              tokens: [
                {
                  type: "text",
                  raw: body,
                  text: body,
                  escaped: true,
                },
              ],
            });
          else out += body;
          continue;
        }
        default: {
          let errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else throw Error(errMsg);
        }
      }
    }
    return out;
  }
  parseInline(tokens, renderer = this.renderer) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      let anyToken = tokens[i];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        let ret = this.options.extensions.renderers[anyToken.type].call(
          {
            parser: this,
          },
          anyToken,
        );
        if (
          ret !== false ||
          !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(
            anyToken.type,
          )
        ) {
          out += ret || "";
          continue;
        }
      }
      let token = anyToken;
      switch (token.type) {
        case "escape": {
          out += renderer.text(token);
          break;
        }
        case "html": {
          out += renderer.html(token);
          break;
        }
        case "link": {
          out += renderer.link(token);
          break;
        }
        case "image": {
          out += renderer.image(token);
          break;
        }
        case "strong": {
          out += renderer.strong(token);
          break;
        }
        case "em": {
          out += renderer.em(token);
          break;
        }
        case "codespan": {
          out += renderer.codespan(token);
          break;
        }
        case "br": {
          out += renderer.br(token);
          break;
        }
        case "del": {
          out += renderer.del(token);
          break;
        }
        case "text": {
          out += renderer.text(token);
          break;
        }
        default: {
          let errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else throw Error(errMsg);
        }
      }
    }
    return out;
  }
}
//@ chunk-s61vbvea.js:411530-411856 esm-fingerprint
class _Hooks {
  options;
  block;
  constructor(options) {
    this.options = options || _defaults;
  }
  static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(markdown) {
    return markdown;
  }
  postprocess(html) {
    return html;
  }
  processAllTokens(tokens) {
    return tokens;
  }
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }
  provideParser() {
    return this.block ? _Parser.parse : _Parser.parseInline;
  }
}
//@ chunk-s61vbvea.js:411856-416451 esm-fingerprint
class Marked {
  defaults = _getDefaults();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = _Parser;
  Renderer = _Renderer;
  TextRenderer = _TextRenderer;
  Lexer = _Lexer;
  Tokenizer = _Tokenizer;
  Hooks = _Hooks;
  constructor(...args) {
    this.use(...args);
  }
  walkTokens(tokens, callback) {
    let values = [];
    for (let token of tokens)
      switch (((values = values.concat(callback.call(this, token))), token.type)) {
        case "table": {
          let tableToken = token;
          for (let cell of tableToken.header) values = values.concat(this.walkTokens(cell.tokens, callback));
          for (let row of tableToken.rows)
            for (let cell of row) values = values.concat(this.walkTokens(cell.tokens, callback));
          break;
        }
        case "list": {
          let listToken = token;
          values = values.concat(this.walkTokens(listToken.items, callback));
          break;
        }
        default: {
          let genericToken = token;
          if (this.defaults.extensions?.childTokens?.[genericToken.type])
            this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
              let tokens = genericToken[childTokens].flat(1 / 0);
              values = values.concat(this.walkTokens(tokens, callback));
            });
          else if (genericToken.tokens)
            values = values.concat(this.walkTokens(genericToken.tokens, callback));
        }
      }
    return values;
  }
  use(...args) {
    let extensions = this.defaults.extensions || {
      renderers: {},
      childTokens: {},
    };
    args.forEach((pack) => {
      let opts = {
        ...pack,
      };
      opts.async = this.defaults.async || opts.async || false;
      if (pack.extensions) {
        pack.extensions.forEach((ext) => {
          if (!ext.name) throw Error("extension name required");
          if ("renderer" in ext) {
            let prevRenderer = extensions.renderers[ext.name];
            if (prevRenderer)
              extensions.renderers[ext.name] = function (...args) {
                let ret = ext.renderer.apply(this, args);
                if (ret === false) ret = prevRenderer.apply(this, args);
                return ret;
              };
            else extensions.renderers[ext.name] = ext.renderer;
          }
          if ("tokenizer" in ext) {
            if (!ext.level || (ext.level !== "block" && ext.level !== "inline"))
              throw Error("extension level must be 'block' or 'inline'");
            let extLevel = extensions[ext.level];
            if (extLevel) extLevel.unshift(ext.tokenizer);
            else extensions[ext.level] = [ext.tokenizer];
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) extensions.startBlock.push(ext.start);
                else extensions.startBlock = [ext.start];
              } else if (ext.level === "inline")
                if (extensions.startInline) extensions.startInline.push(ext.start);
                else extensions.startInline = [ext.start];
            }
          }
          if ("childTokens" in ext && ext.childTokens) extensions.childTokens[ext.name] = ext.childTokens;
        });
        opts.extensions = extensions;
      }
      if (pack.renderer) {
        let renderer = this.defaults.renderer || new _Renderer(this.defaults);
        for (let prop in pack.renderer) {
          if (!(prop in renderer)) throw Error(`renderer '${prop}' does not exist`);
          if (["options", "parser"].includes(prop)) continue;
          let rendererProp = prop;
          let rendererFunc = pack.renderer[rendererProp];
          let prevRenderer = renderer[rendererProp];
          renderer[rendererProp] = (...args) => {
            let ret = rendererFunc.apply(renderer, args);
            if (ret === false) ret = prevRenderer.apply(renderer, args);
            return ret || "";
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        let tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (let prop in pack.tokenizer) {
          if (!(prop in tokenizer)) throw Error(`tokenizer '${prop}' does not exist`);
          if (["options", "rules", "lexer"].includes(prop)) continue;
          let tokenizerProp = prop;
          let tokenizerFunc = pack.tokenizer[tokenizerProp];
          let prevTokenizer = tokenizer[tokenizerProp];
          tokenizer[tokenizerProp] = (...args) => {
            let ret = tokenizerFunc.apply(tokenizer, args);
            if (ret === false) ret = prevTokenizer.apply(tokenizer, args);
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.hooks) {
        let hooks = this.defaults.hooks || new _Hooks();
        for (let prop in pack.hooks) {
          if (!(prop in hooks)) throw Error(`hook '${prop}' does not exist`);
          if (["options", "block"].includes(prop)) continue;
          let hooksProp = prop;
          let hooksFunc = pack.hooks[hooksProp];
          let prevHook = hooks[hooksProp];
          if (_Hooks.passThroughHooks.has(prop))
            hooks[hooksProp] = (arg) => {
              if (this.defaults.async)
                return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret) => prevHook.call(hooks, ret));
              let ret = hooksFunc.call(hooks, arg);
              return prevHook.call(hooks, ret);
            };
          else
            hooks[hooksProp] = (...args) => {
              let ret = hooksFunc.apply(hooks, args);
              if (ret === false) ret = prevHook.apply(hooks, args);
              return ret;
            };
        }
        opts.hooks = hooks;
      }
      if (pack.walkTokens) {
        let walkTokens = this.defaults.walkTokens;
        let packWalktokens = pack.walkTokens;
        opts.walkTokens = function (token) {
          let values = [];
          values.push(packWalktokens.call(this, token));
          if (walkTokens) values = values.concat(walkTokens.call(this, token));
          return values;
        };
      }
      this.defaults = {
        ...this.defaults,
        ...opts,
      };
    });
    return this;
  }
  setOptions(opt) {
    this.defaults = {
      ...this.defaults,
      ...opt,
    };
    return this;
  }
  lexer(src, options) {
    return _Lexer.lex(src, options ?? this.defaults);
  }
  parser(tokens, options) {
    return _Parser.parse(tokens, options ?? this.defaults);
  }
  parseMarkdown(blockType) {
    return (src, options) => {
      let origOpt = {
        ...options,
      };
      let opt = {
        ...this.defaults,
        ...origOpt,
      };
      let throwError = this.onError(!!opt.silent, !!opt.async);
      if (this.defaults.async === true && origOpt.async === false)
        return throwError(
          Error(
            "marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise.",
          ),
        );
      if (typeof src === "undefined" || src === null)
        return throwError(Error("marked(): input parameter is undefined or null"));
      if (typeof src !== "string")
        return throwError(
          Error(
            "marked(): input parameter is of type " +
              Object.prototype.toString.call(src) +
              ", string expected",
          ),
        );
      if (opt.hooks) {
        opt.hooks.options = opt;
        opt.hooks.block = blockType;
      }
      let lexer = opt.hooks ? opt.hooks.provideLexer() : blockType ? _Lexer.lex : _Lexer.lexInline;
      let parser = opt.hooks ? opt.hooks.provideParser() : blockType ? _Parser.parse : _Parser.parseInline;
      if (opt.async)
        return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src)
          .then((src) => lexer(src, opt))
          .then((tokens) => (opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens))
          .then((tokens) =>
            opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens,
          )
          .then((tokens) => parser(tokens, opt))
          .then((html) => (opt.hooks ? opt.hooks.postprocess(html) : html))
          .catch(throwError);
      try {
        if (opt.hooks) src = opt.hooks.preprocess(src);
        let tokens = lexer(src, opt);
        if (opt.hooks) tokens = opt.hooks.processAllTokens(tokens);
        if (opt.walkTokens) this.walkTokens(tokens, opt.walkTokens);
        let html = parser(tokens, opt);
        if (opt.hooks) html = opt.hooks.postprocess(html);
        return html;
      } catch (e) {
        return throwError(e);
      }
    };
  }
  onError(silent, async) {
    return (e) => {
      e.message += `
Please report this to https://github.com/markedjs/marked.`;
      if (silent) {
        let msg = "<p>An error occurred:</p><pre>" + Qn(e.message + "", true) + "</pre>";
        if (async) return Promise.resolve(msg);
        return msg;
      }
      if (async) return Promise.reject(e);
      throw e;
    };
  }
}
//@ chunk-s61vbvea.js:416451-416466 esm-layout
var markedInstance = new Marked();
//@ chunk-s61vbvea.js:416466-416504 esm-layout
function marked(src, opt) {
  return markedInstance.parse(src, opt);
}
//@ chunk-s61vbvea.js:416504-416609 esm-fingerprint
marked.options = marked.setOptions = function (options) {
  markedInstance.setOptions(options);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
//@ chunk-s61vbvea.js:416609-416627 esm-fingerprint
marked.getDefaults = _getDefaults;
//@ chunk-s61vbvea.js:416627-416642 esm-fingerprint
marked.defaults = _defaults;
//@ chunk-s61vbvea.js:416642-416728 esm-fingerprint
marked.use = function (...args) {
  markedInstance.use(...args);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
//@ chunk-s61vbvea.js:416728-416783 esm-fingerprint
marked.walkTokens = function (tokens, callback) {
  return markedInstance.walkTokens(tokens, callback);
};
//@ chunk-s61vbvea.js:416783-416813 esm-fingerprint
marked.parseInline = markedInstance.parseInline;
//@ chunk-s61vbvea.js:416813-416826 esm-layout
marked.Parser = _Parser;
//@ chunk-s61vbvea.js:416826-416845 esm-fingerprint
marked.parser = _Parser.parse;
//@ chunk-s61vbvea.js:416845-416860 esm-fingerprint
marked.Renderer = _Renderer;
//@ chunk-s61vbvea.js:416860-416879 esm-fingerprint
marked.TextRenderer = _TextRenderer;
//@ chunk-s61vbvea.js:416879-416891 esm-fingerprint
marked.Lexer = _Lexer;
//@ chunk-s61vbvea.js:416891-416907 esm-fingerprint
marked.lexer = _Lexer.lex;
//@ chunk-s61vbvea.js:416907-416924 esm-fingerprint
marked.Tokenizer = _Tokenizer;
//@ chunk-s61vbvea.js:416924-416936 esm-fingerprint
marked.Hooks = _Hooks;
//@ chunk-s61vbvea.js:416936-416948 affinity
marked.parse = marked;
//@ chunk-s61vbvea.js:416948-417022 affinity
var { options, setOptions, use, walkTokens, parseInline } = marked;
//@ chunk-s61vbvea.js:417022-417050 affinity
var parser = _Parser.parse;
var lex = _Lexer.lex;
export { marked, _Tokenizer, _Lexer, Marked };
