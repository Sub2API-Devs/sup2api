/**
 * marked/lib/marked.esm.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: marked@16.0.0..16.1.1
 * pieces: chunk-s61vbvea.js (39)
 * attribution: esm-fingerprint 30, esm-layout 6, affinity 3
 */

//@ chunk-s61vbvea.js:378309-378451 esm-fingerprint
function wf() {
  return {
    async: !1,
    breaks: !1,
    extensions: null,
    gfm: !0,
    hooks: null,
    pedantic: !1,
    renderer: null,
    silent: !1,
    tokenizer: null,
    walkTokens: null,
  };
}
//@ chunk-s61vbvea.js:378451-378463 esm-layout
var ao = wf();
//@ chunk-s61vbvea.js:378463-378483 esm-layout
function H_(e) {
  ao = e;
}
//@ chunk-s61vbvea.js:378483-378506 esm-layout
var _i = { exec: () => null };
//@ chunk-s61vbvea.js:378506-378712 esm-fingerprint
function Tt(e, n = "") {
  let r = typeof e === "string" ? e : e.source,
    s = {
      replace: (h, y) => {
        let S = typeof y === "string" ? y : y.source;
        return ((S = S.replace(bn.caret, "$1")), (r = r.replace(h, S)), s);
      },
      getRegex: () => new RegExp(r, n),
    };
  return s;
}
//@ chunk-s61vbvea.js:378712-389047 esm-fingerprint
var bn = {
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
    listItemRegex: (e) => new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),
    nextBulletRegex: (e) =>
      new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
    hrRegex: (e) =>
      new RegExp(`^ {0,${Math.min(3, e - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
    fencesBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:\`\`\`|~~~)`),
    headingBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}#`),
    htmlBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}<(?:[a-z].*>|!--)`, "i"),
  },
  rL = /^(?:[ \t]*(?:\n|$))+/,
  oL = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,
  sL =
    /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
  ki = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
  iL = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
  $_ = /(?:[*+-]|\d{1,9}[.)])/,
  regex = Tt(
    /^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  )
    .replace(/bull/g, $_)
    .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
    .replace(/blockquote/g, / {0,3}>/)
    .replace(/heading/g, / {0,3}#{1,6}/)
    .replace(/html/g, / {0,3}<[^\n>]+>\n/)
    .getRegex(),
  kf = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
  uL = /^[^\n]+/,
  Ef = /(?!\s*\])(?:\\.|[^\[\]\\])+/,
  regex_2 = Tt(
    /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/,
  )
    .replace("label", Ef)
    .replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
    .getRegex(),
  regex_3 = Tt(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/)
    .replace(/bull/g, $_)
    .getRegex(),
  vl =
    "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",
  Rf = /<!--(?:-?>|[\s\S]*?(?:-->|$))/,
  regex_4 = Tt(
    "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))",
    "i",
  )
    .replace("comment", Rf)
    .replace("tag", vl)
    .replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
    .getRegex(),
  regex_5 = Tt(kf)
    .replace("hr", ki)
    .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
    .replace("|lheading", "")
    .replace("|table", "")
    .replace("blockquote", " {0,3}>")
    .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
    .replace("list", " {0,3}(?:[*+-]|1[.)]) ")
    .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
    .replace("tag", vl)
    .getRegex(),
  regex_6 = Tt(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
    .replace("paragraph", regex_5)
    .getRegex(),
  Tf = {
    blockquote: regex_6,
    code: oL,
    def: regex_2,
    fences: sL,
    heading: iL,
    hr: ki,
    html: regex_4,
    lheading: regex,
    list: regex_3,
    newline: rL,
    paragraph: regex_5,
    table: _i,
    text: uL,
  },
  regex_7 = Tt(
    "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)",
  )
    .replace("hr", ki)
    .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
    .replace("blockquote", " {0,3}>")
    .replace("code", "(?: {4}| {0,3}\t)[^\\n]")
    .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
    .replace("list", " {0,3}(?:[*+-]|1[.)]) ")
    .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
    .replace("tag", vl)
    .getRegex(),
  gL = {
    ...Tf,
    table: regex_7,
    paragraph: Tt(kf)
      .replace("hr", ki)
      .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
      .replace("|lheading", "")
      .replace("table", regex_7)
      .replace("blockquote", " {0,3}>")
      .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
      .replace("list", " {0,3}(?:[*+-]|1[.)]) ")
      .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
      .replace("tag", vl)
      .getRegex(),
  },
  yL = {
    ...Tf,
    html: Tt(
      `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`,
    )
      .replace("comment", Rf)
      .replace(
        /tag/g,
        "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b",
      )
      .getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: _i,
    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
    paragraph: Tt(kf)
      .replace("hr", ki)
      .replace(
        "heading",
        ` *#{1,6} *[^
]`,
      )
      .replace("lheading", regex)
      .replace("|table", "")
      .replace("blockquote", " {0,3}>")
      .replace("|fences", "")
      .replace("|list", "")
      .replace("|html", "")
      .replace("|tag", "")
      .getRegex(),
  },
  SL = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  _L = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  G_ = /^( {2,}|\\)\n(?!\s*$)/,
  bL = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
  Al = /[\p{P}\p{S}]/u,
  vf = /[\s\p{P}\p{S}]/u,
  W_ = /[^\s\p{P}\p{S}]/u,
  regex_8 = Tt(/^((?![*_])punctSpace)/, "u")
    .replace(/punctSpace/g, vf)
    .getRegex(),
  z_ = /(?!~)[\p{P}\p{S}]/u,
  kL = /(?!~)[\s\p{P}\p{S}]/u,
  EL = /(?:[^\s\p{P}\p{S}]|~)/u,
  RL = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g,
  K_ = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,
  regex_9 = Tt(K_, "u").replace(/punct/g, Al).getRegex(),
  regex_10 = Tt(K_, "u").replace(/punct/g, z_).getRegex(),
  V_ =
    "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",
  regex_11 = Tt(V_, "gu")
    .replace(/notPunctSpace/g, W_)
    .replace(/punctSpace/g, vf)
    .replace(/punct/g, Al)
    .getRegex(),
  regex_12 = Tt(V_, "gu")
    .replace(/notPunctSpace/g, EL)
    .replace(/punctSpace/g, kL)
    .replace(/punct/g, z_)
    .getRegex(),
  regex_13 = Tt(
    "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)",
    "gu",
  )
    .replace(/notPunctSpace/g, W_)
    .replace(/punctSpace/g, vf)
    .replace(/punct/g, Al)
    .getRegex(),
  regex_14 = Tt(/\\(punct)/, "gu")
    .replace(/punct/g, Al)
    .getRegex(),
  regex_15 = Tt(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
    .replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
    .replace(
      "email",
      /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
    )
    .getRegex(),
  regex_16 = Tt(Rf).replace("(?:-->|$)", "-->").getRegex(),
  regex_17 = Tt(
    "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
  )
    .replace("comment", regex_16)
    .replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
    .getRegex(),
  Tl = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,
  regex_18 = Tt(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/)
    .replace("label", Tl)
    .replace("href", /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/)
    .replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
    .getRegex(),
  regex_19 = Tt(/^!?\[(label)\]\[(ref)\]/)
    .replace("label", Tl)
    .replace("ref", Ef)
    .getRegex(),
  regex_20 = Tt(/^!?\[(ref)\](?:\[\])?/)
    .replace("ref", Ef)
    .getRegex(),
  regex_21 = Tt("reflink|nolink(?!\\()", "g")
    .replace("reflink", regex_19)
    .replace("nolink", regex_20)
    .getRegex(),
  Cf = {
    _backpedal: _i,
    anyPunctuation: regex_14,
    autolink: regex_15,
    blockSkip: RL,
    br: G_,
    code: _L,
    del: _i,
    emStrongLDelim: regex_9,
    emStrongRDelimAst: regex_11,
    emStrongRDelimUnd: regex_13,
    escape: SL,
    link: regex_18,
    nolink: regex_20,
    punctuation: regex_8,
    reflink: regex_19,
    reflinkSearch: regex_21,
    tag: regex_17,
    text: bL,
    url: _i,
  },
  FL = {
    ...Cf,
    link: Tt(/^!?\[(label)\]\((.*?)\)/)
      .replace("label", Tl)
      .getRegex(),
    reflink: Tt(/^!?\[(label)\]\s*\[([^\]]*)\]/)
      .replace("label", Tl)
      .getRegex(),
  },
  bf = {
    ...Cf,
    emStrongRDelimAst: regex_12,
    emStrongLDelim: regex_10,
    url: Tt(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i")
      .replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
      .getRegex(),
    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/,
  },
  HL = {
    ...bf,
    br: Tt(G_).replace("{2,}", "*").getRegex(),
    text: Tt(bf.text)
      .replace("\\b_", "\\b_| {2,}\\n")
      .replace(/\{2,\}/g, "*")
      .getRegex(),
  },
  xl = { normal: Tf, gfm: gL, pedantic: yL },
  yi = { normal: Cf, gfm: bf, breaks: HL, pedantic: FL },
  $L = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" },
  A_ = (e) => $L[e];
//@ chunk-s61vbvea.js:389047-389226 esm-fingerprint
function Qn(e, n) {
  if (n) {
    if (bn.escapeTest.test(e)) return e.replace(bn.escapeReplace, A_);
  } else if (bn.escapeTestNoEncode.test(e)) return e.replace(bn.escapeReplaceNoEncode, A_);
  return e;
}
//@ chunk-s61vbvea.js:389226-389317 esm-fingerprint
function O_(e) {
  try {
    e = encodeURI(e).replace(bn.percentDecode, "%");
  } catch {
    return null;
  }
  return e;
}
//@ chunk-s61vbvea.js:389317-389680 esm-fingerprint
function L_(e, n) {
  let replaced = e.replace(bn.findPipe, (y, S, w) => {
      let R = !1,
        x = S;
      while (--x >= 0 && w[x] === "\\") R = !R;
      if (R) return "|";
      else return " |";
    }),
    parts = replaced.split(bn.splitPipe),
    h = 0;
  if (!parts[0].trim()) parts.shift();
  if (parts.length > 0 && !parts.at(-1)?.trim()) parts.pop();
  if (n)
    if (parts.length > n) parts.splice(n);
    else while (parts.length < n) parts.push("");
  for (; h < parts.length; h++) parts[h] = parts[h].trim().replace(bn.slashPipe, "|");
  return parts;
}
//@ chunk-s61vbvea.js:389680-389810 esm-fingerprint
function Si(e, n, r) {
  let s = e.length;
  if (s === 0) return "";
  let h = 0;
  while (h < s)
    if (e.charAt(s - h - 1) === n) h++;
    else break;
  return e.slice(0, s - h);
}
//@ chunk-s61vbvea.js:389810-389988 esm-fingerprint
function UL(e, n) {
  if (e.indexOf(n[1]) === -1) return -1;
  let r = 0;
  for (let s = 0; s < e.length; s++)
    if (e[s] === "\\") s++;
    else if (e[s] === n[0]) r++;
    else if (e[s] === n[1]) {
      if ((r--, r < 0)) return s;
    }
  return -1;
}
//@ chunk-s61vbvea.js:389988-390279 esm-fingerprint
function F_(e, n, r, s, h) {
  let href = n.href,
    S = n.title || null,
    replaced = e[1].replace(h.other.outputLinkReplace, "$1");
  if (e[0].charAt(0) !== "!") {
    s.state.inLink = !0;
    let R = { type: "link", raw: r, href: href, title: S, text: replaced, tokens: s.inlineTokens(replaced) };
    return ((s.state.inLink = !1), R);
  }
  return { type: "image", raw: r, href: href, title: S, text: replaced };
}
//@ chunk-s61vbvea.js:390279-390542 esm-fingerprint
function BL(e, n, r) {
  let match = e.match(r.other.indentCodeCompensation);
  if (match === null) return n;
  let h = match[1];
  return n
    .split(
      `
`,
    )
    .map((y) => {
      let match = y.match(r.other.beginningSpace);
      if (match === null) return y;
      let [w] = match;
      if (w.length >= h.length) return y.slice(h.length);
      return y;
    }).join(`
`);
}
//@ chunk-s61vbvea.js:390542-400634 esm-fingerprint
class fSe {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || ao;
  }
  space(e) {
    let match = this.rules.block.newline.exec(e);
    if (match && match[0].length > 0) return { type: "space", raw: match[0] };
  }
  code(e) {
    let match = this.rules.block.code.exec(e);
    if (match) {
      let replaced = match[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: match[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic
          ? Si(
              replaced,
              `
`,
            )
          : replaced,
      };
    }
  }
  fences(e) {
    let match = this.rules.block.fences.exec(e);
    if (match) {
      let r = match[0],
        s = BL(r, match[3] || "", this.rules);
      return {
        type: "code",
        raw: r,
        lang: match[2] ? match[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : match[2],
        text: s,
      };
    }
  }
  heading(e) {
    let match = this.rules.block.heading.exec(e);
    if (match) {
      let trimmed = match[2].trim();
      if (this.rules.other.endingHash.test(trimmed)) {
        let s = Si(trimmed, "#");
        if (this.options.pedantic) trimmed = s.trim();
        else if (!s || this.rules.other.endingSpaceChar.test(s)) trimmed = s.trim();
      }
      return {
        type: "heading",
        raw: match[0],
        depth: match[1].length,
        text: trimmed,
        tokens: this.lexer.inline(trimmed),
      };
    }
  }
  hr(e) {
    let match = this.rules.block.hr.exec(e);
    if (match)
      return {
        type: "hr",
        raw: Si(
          match[0],
          `
`,
        ),
      };
  }
  blockquote(e) {
    let match = this.rules.block.blockquote.exec(e);
    if (match) {
      let parts = Si(
          match[0],
          `
`,
        ).split(`
`),
        s = "",
        h = "",
        y = [];
      while (parts.length > 0) {
        let S = !1,
          w = [],
          R;
        for (R = 0; R < parts.length; R++)
          if (this.rules.other.blockquoteStart.test(parts[R])) (w.push(parts[R]), (S = !0));
          else if (!S) w.push(parts[R]);
          else break;
        parts = parts.slice(R);
        let joined = w.join(`
`),
          replaced = joined
            .replace(
              this.rules.other.blockquoteSetextReplace,
              `
    $1`,
            )
            .replace(this.rules.other.blockquoteSetextReplace2, "");
        ((s = s
          ? `${s}
${joined}`
          : joined),
          (h = h
            ? `${h}
${replaced}`
            : replaced));
        let top = this.lexer.state.top;
        if (
          ((this.lexer.state.top = !0),
          this.lexer.blockTokens(replaced, y, !0),
          (this.lexer.state.top = top),
          parts.length === 0)
        )
          break;
        let at = y.at(-1);
        if (at?.type === "code") break;
        else if (at?.type === "blockquote") {
          let L = at,
            q =
              L.raw +
              `
` +
              parts.join(`
`),
            blockquote = this.blockquote(q);
          ((y[y.length - 1] = blockquote),
            (s = s.substring(0, s.length - L.raw.length) + blockquote.raw),
            (h = h.substring(0, h.length - L.text.length) + blockquote.text));
          break;
        } else if (at?.type === "list") {
          let L = at,
            q =
              L.raw +
              `
` +
              parts.join(`
`),
            list = this.list(q);
          ((y[y.length - 1] = list),
            (s = s.substring(0, s.length - at.raw.length) + list.raw),
            (h = h.substring(0, h.length - L.raw.length) + list.raw),
            (parts = q.substring(y.at(-1).raw.length).split(`
`)));
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: y, text: h };
    }
  }
  list(e) {
    let match = this.rules.block.list.exec(e);
    if (match) {
      let trimmed = match[1].trim(),
        s = trimmed.length > 1,
        h = {
          type: "list",
          raw: "",
          ordered: s,
          start: s ? +trimmed.slice(0, -1) : "",
          loose: !1,
          items: [],
        };
      if (((trimmed = s ? `\\d{1,9}\\${trimmed.slice(-1)}` : `\\${trimmed}`), this.options.pedantic))
        trimmed = s ? trimmed : "[*+-]";
      let listItemRegex = this.rules.other.listItemRegex(trimmed),
        S = !1;
      while (e) {
        let R = !1,
          x = "",
          P = "";
        if (!(match = listItemRegex.exec(e))) break;
        if (this.rules.block.hr.test(e)) break;
        ((x = match[0]), (e = e.substring(x.length)));
        let replaced = match[2]
            .split(
              `
`,
              1,
            )[0]
            .replace(this.rules.other.listReplaceTabs, (ee) => " ".repeat(3 * ee.length)),
          G = e.split(
            `
`,
            1,
          )[0],
          L = !replaced.trim(),
          q = 0;
        if (this.options.pedantic) ((q = 2), (P = replaced.trimStart()));
        else if (L) q = match[1].length + 1;
        else
          ((q = match[2].search(this.rules.other.nonSpaceChar)),
            (q = q > 4 ? 1 : q),
            (P = replaced.slice(q)),
            (q += match[1].length));
        if (L && this.rules.other.blankLine.test(G))
          ((x +=
            G +
            `
`),
            (e = e.substring(G.length + 1)),
            (R = !0));
        if (!R) {
          let nextBulletRegex = this.rules.other.nextBulletRegex(q),
            hrRegex = this.rules.other.hrRegex(q),
            fencesBeginRegex = this.rules.other.fencesBeginRegex(q),
            headingBeginRegex = this.rules.other.headingBeginRegex(q),
            htmlBeginRegex = this.rules.other.htmlBeginRegex(q);
          while (e) {
            let Se = e.split(
                `
`,
                1,
              )[0],
              ce;
            if (((G = Se), this.options.pedantic))
              ((G = G.replace(this.rules.other.listReplaceNesting, "  ")), (ce = G));
            else ce = G.replace(this.rules.other.tabCharGlobal, "    ");
            if (fencesBeginRegex.test(G)) break;
            if (headingBeginRegex.test(G)) break;
            if (htmlBeginRegex.test(G)) break;
            if (nextBulletRegex.test(G)) break;
            if (hrRegex.test(G)) break;
            if (ce.search(this.rules.other.nonSpaceChar) >= q || !G.trim())
              P +=
                `
` + ce.slice(q);
            else {
              if (L) break;
              if (
                replaced
                  .replace(this.rules.other.tabCharGlobal, "    ")
                  .search(this.rules.other.nonSpaceChar) >= 4
              )
                break;
              if (fencesBeginRegex.test(replaced)) break;
              if (headingBeginRegex.test(replaced)) break;
              if (hrRegex.test(replaced)) break;
              P +=
                `
` + G;
            }
            if (!L && !G.trim()) L = !0;
            ((x +=
              Se +
              `
`),
              (e = e.substring(Se.length + 1)),
              (replaced = ce.slice(q)));
          }
        }
        if (!h.loose) {
          if (S) h.loose = !0;
          else if (this.rules.other.doubleBlankLine.test(x)) S = !0;
        }
        let Q = null,
          Z;
        if (this.options.gfm) {
          if (((Q = this.rules.other.listIsTask.exec(P)), Q))
            ((Z = Q[0] !== "[ ] "), (P = P.replace(this.rules.other.listReplaceTask, "")));
        }
        (h.items.push({ type: "list_item", raw: x, task: !!Q, checked: Z, loose: !1, text: P, tokens: [] }),
          (h.raw += x));
      }
      let at = h.items.at(-1);
      if (at) ((at.raw = at.raw.trimEnd()), (at.text = at.text.trimEnd()));
      else return;
      h.raw = h.raw.trimEnd();
      for (let R = 0; R < h.items.length; R++)
        if (
          ((this.lexer.state.top = !1),
          (h.items[R].tokens = this.lexer.blockTokens(h.items[R].text, [])),
          !h.loose)
        ) {
          let filtered = h.items[R].tokens.filter((token) => token.type === "space"),
            P = filtered.length > 0 && filtered.some((j) => this.rules.other.anyLine.test(j.raw));
          h.loose = P;
        }
      if (h.loose) for (let R = 0; R < h.items.length; R++) h.items[R].loose = !0;
      return h;
    }
  }
  html(e) {
    let match = this.rules.block.html.exec(e);
    if (match)
      return {
        type: "html",
        block: !0,
        raw: match[0],
        pre: match[1] === "pre" || match[1] === "script" || match[1] === "style",
        text: match[0],
      };
  }
  def(e) {
    let match = this.rules.block.def.exec(e);
    if (match) {
      let replaced = match[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "),
        s = match[2]
          ? match[2]
              .replace(this.rules.other.hrefBrackets, "$1")
              .replace(this.rules.inline.anyPunctuation, "$1")
          : "",
        h = match[3]
          ? match[3].substring(1, match[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1")
          : match[3];
      return { type: "def", tag: replaced, raw: match[0], href: s, title: h };
    }
  }
  table(e) {
    let match = this.rules.block.table.exec(e);
    if (!match) return;
    if (!this.rules.other.tableDelimiter.test(match[2])) return;
    let r = L_(match[1]),
      parts = match[2].replace(this.rules.other.tableAlignChars, "").split("|"),
      h = match[3]?.trim()
        ? match[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`)
        : [],
      y = { type: "table", raw: match[0], header: [], align: [], rows: [] };
    if (r.length !== parts.length) return;
    for (let S of parts)
      if (this.rules.other.tableAlignRight.test(S)) y.align.push("right");
      else if (this.rules.other.tableAlignCenter.test(S)) y.align.push("center");
      else if (this.rules.other.tableAlignLeft.test(S)) y.align.push("left");
      else y.align.push(null);
    for (let S = 0; S < r.length; S++)
      y.header.push({ text: r[S], tokens: this.lexer.inline(r[S]), header: !0, align: y.align[S] });
    for (let S of h)
      y.rows.push(
        L_(S, y.header.length).map((w, R) => ({
          text: w,
          tokens: this.lexer.inline(w),
          header: !1,
          align: y.align[R],
        })),
      );
    return y;
  }
  lheading(e) {
    let match = this.rules.block.lheading.exec(e);
    if (match)
      return {
        type: "heading",
        raw: match[0],
        depth: match[2].charAt(0) === "=" ? 1 : 2,
        text: match[1],
        tokens: this.lexer.inline(match[1]),
      };
  }
  paragraph(e) {
    let match = this.rules.block.paragraph.exec(e);
    if (match) {
      let r =
        match[1].charAt(match[1].length - 1) ===
        `
`
          ? match[1].slice(0, -1)
          : match[1];
      return { type: "paragraph", raw: match[0], text: r, tokens: this.lexer.inline(r) };
    }
  }
  text(e) {
    let match = this.rules.block.text.exec(e);
    if (match) return { type: "text", raw: match[0], text: match[0], tokens: this.lexer.inline(match[0]) };
  }
  escape(e) {
    let match = this.rules.inline.escape.exec(e);
    if (match) return { type: "escape", raw: match[0], text: match[1] };
  }
  tag(e) {
    let match = this.rules.inline.tag.exec(e);
    if (match) {
      if (!this.lexer.state.inLink && this.rules.other.startATag.test(match[0])) this.lexer.state.inLink = !0;
      else if (this.lexer.state.inLink && this.rules.other.endATag.test(match[0]))
        this.lexer.state.inLink = !1;
      if (!this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(match[0]))
        this.lexer.state.inRawBlock = !0;
      else if (this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(match[0]))
        this.lexer.state.inRawBlock = !1;
      return {
        type: "html",
        raw: match[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: !1,
        text: match[0],
      };
    }
  }
  link(e) {
    let match = this.rules.inline.link.exec(e);
    if (match) {
      let trimmed = match[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(trimmed)) {
        if (!this.rules.other.endAngleBracket.test(trimmed)) return;
        let y = Si(trimmed.slice(0, -1), "\\");
        if ((trimmed.length - y.length) % 2 === 0) return;
      } else {
        let y = UL(match[2], "()");
        if (y > -1) {
          let w = (match[0].indexOf("!") === 0 ? 5 : 4) + match[1].length + y;
          ((match[2] = match[2].substring(0, y)),
            (match[0] = match[0].substring(0, w).trim()),
            (match[3] = ""));
        }
      }
      let s = match[2],
        h = "";
      if (this.options.pedantic) {
        let match = this.rules.other.pedanticHrefTitle.exec(s);
        if (match) ((s = match[1]), (h = match[3]));
      } else h = match[3] ? match[3].slice(1, -1) : "";
      if (((s = s.trim()), this.rules.other.startAngleBracket.test(s)))
        if (this.options.pedantic && !this.rules.other.endAngleBracket.test(trimmed)) s = s.slice(1);
        else s = s.slice(1, -1);
      return F_(
        match,
        {
          href: s ? s.replace(this.rules.inline.anyPunctuation, "$1") : s,
          title: h ? h.replace(this.rules.inline.anyPunctuation, "$1") : h,
        },
        match[0],
        this.lexer,
        this.rules,
      );
    }
  }
  reflink(e, n) {
    let r;
    if ((r = this.rules.inline.reflink.exec(e)) || (r = this.rules.inline.nolink.exec(e))) {
      let replaced = (r[2] || r[1]).replace(this.rules.other.multipleSpaceGlobal, " "),
        h = n[replaced.toLowerCase()];
      if (!h) {
        let charAt = r[0].charAt(0);
        return { type: "text", raw: charAt, text: charAt };
      }
      return F_(r, h, r[0], this.lexer, this.rules);
    }
  }
  emStrong(e, n, r = "") {
    let match = this.rules.inline.emStrongLDelim.exec(e);
    if (!match) return;
    if (match[3] && r.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(match[1] || match[2]) || !r || this.rules.inline.punctuation.exec(r)) {
      let y = [...match[0]].length - 1,
        S,
        w,
        R = y,
        x = 0,
        P = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      ((P.lastIndex = 0), (n = n.slice(-1 * e.length + y)));
      while ((match = P.exec(n)) != null) {
        if (((S = match[1] || match[2] || match[3] || match[4] || match[5] || match[6]), !S)) continue;
        if (((w = [...S].length), match[3] || match[4])) {
          R += w;
          continue;
        } else if (match[5] || match[6]) {
          if (y % 3 && !((y + w) % 3)) {
            x += w;
            continue;
          }
        }
        if (((R -= w), R > 0)) continue;
        w = Math.min(w, w + R + x);
        let j = [...match[0]][0].length,
          sliced = e.slice(0, y + match.index + j + w);
        if (Math.min(y, w) % 2) {
          let sliced_2 = sliced.slice(1, -1);
          return { type: "em", raw: sliced, text: sliced_2, tokens: this.lexer.inlineTokens(sliced_2) };
        }
        let sliced_2 = sliced.slice(2, -2);
        return { type: "strong", raw: sliced, text: sliced_2, tokens: this.lexer.inlineTokens(sliced_2) };
      }
    }
  }
  codespan(e) {
    let match = this.rules.inline.code.exec(e);
    if (match) {
      let replaced = match[2].replace(this.rules.other.newLineCharGlobal, " "),
        matches = this.rules.other.nonSpaceChar.test(replaced),
        h =
          this.rules.other.startingSpaceChar.test(replaced) &&
          this.rules.other.endingSpaceChar.test(replaced);
      if (matches && h) replaced = replaced.substring(1, replaced.length - 1);
      return { type: "codespan", raw: match[0], text: replaced };
    }
  }
  br(e) {
    let match = this.rules.inline.br.exec(e);
    if (match) return { type: "br", raw: match[0] };
  }
  del(e) {
    let match = this.rules.inline.del.exec(e);
    if (match)
      return { type: "del", raw: match[0], text: match[2], tokens: this.lexer.inlineTokens(match[2]) };
  }
  autolink(e) {
    let match = this.rules.inline.autolink.exec(e);
    if (match) {
      let r, s;
      if (match[2] === "@") ((r = match[1]), (s = "mailto:" + r));
      else ((r = match[1]), (s = r));
      return { type: "link", raw: match[0], text: r, href: s, tokens: [{ type: "text", raw: r, text: r }] };
    }
  }
  url(e) {
    let n;
    if ((n = this.rules.inline.url.exec(e))) {
      let r, s;
      if (n[2] === "@") ((r = n[0]), (s = "mailto:" + r));
      else {
        let h;
        do ((h = n[0]), (n[0] = this.rules.inline._backpedal.exec(n[0])?.[0] ?? ""));
        while (h !== n[0]);
        if (((r = n[0]), n[1] === "www.")) s = "http://" + n[0];
        else s = n[0];
      }
      return { type: "link", raw: n[0], text: r, href: s, tokens: [{ type: "text", raw: r, text: r }] };
    }
  }
  inlineText(e) {
    let match = this.rules.inline.text.exec(e);
    if (match) {
      let inRawBlock = this.lexer.state.inRawBlock;
      return { type: "text", raw: match[0], text: match[0], escaped: inRawBlock };
    }
  }
}
//@ chunk-s61vbvea.js:400634-406359 esm-fingerprint
class f2 {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(e) {
    ((this.tokens = []),
      (this.tokens.links = Object.create(null)),
      (this.options = e || ao),
      (this.options.tokenizer = this.options.tokenizer || new fSe()),
      (this.tokenizer = this.options.tokenizer),
      (this.tokenizer.options = this.options),
      (this.tokenizer.lexer = this),
      (this.inlineQueue = []),
      (this.state = { inLink: !1, inRawBlock: !1, top: !0 }));
    let n = { other: bn, block: xl.normal, inline: yi.normal };
    if (this.options.pedantic) ((n.block = xl.pedantic), (n.inline = yi.pedantic));
    else if (this.options.gfm)
      if (((n.block = xl.gfm), this.options.breaks)) n.inline = yi.breaks;
      else n.inline = yi.gfm;
    this.tokenizer.rules = n;
  }
  static get rules() {
    return { block: xl, inline: yi };
  }
  static lex(e, n) {
    return new f2(n).lex(e);
  }
  static lexInline(e, n) {
    return new f2(n).inlineTokens(e);
  }
  lex(e) {
    ((e = e.replace(
      bn.carriageReturn,
      `
`,
    )),
      this.blockTokens(e, this.tokens));
    for (let n = 0; n < this.inlineQueue.length; n++) {
      let r = this.inlineQueue[n];
      this.inlineTokens(r.src, r.tokens);
    }
    return ((this.inlineQueue = []), this.tokens);
  }
  blockTokens(e, n = [], r = !1) {
    if (this.options.pedantic) e = e.replace(bn.tabCharGlobal, "    ").replace(bn.spaceLine, "");
    while (e) {
      let s;
      if (
        this.options.extensions?.block?.some((y) => {
          if ((s = y.call({ lexer: this }, e, n))) return ((e = e.substring(s.raw.length)), n.push(s), !0);
          return !1;
        })
      )
        continue;
      if ((s = this.tokenizer.space(e))) {
        e = e.substring(s.raw.length);
        let at = n.at(-1);
        if (s.raw.length === 1 && at !== void 0)
          at.raw += `
`;
        else n.push(s);
        continue;
      }
      if ((s = this.tokenizer.code(e))) {
        e = e.substring(s.raw.length);
        let at = n.at(-1);
        if (at?.type === "paragraph" || at?.type === "text")
          ((at.raw +=
            `
` + s.raw),
            (at.text +=
              `
` + s.text),
            (this.inlineQueue.at(-1).src = at.text));
        else n.push(s);
        continue;
      }
      if ((s = this.tokenizer.fences(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.heading(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.hr(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.blockquote(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.list(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.html(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.def(e))) {
        e = e.substring(s.raw.length);
        let at = n.at(-1);
        if (at?.type === "paragraph" || at?.type === "text")
          ((at.raw +=
            `
` + s.raw),
            (at.text +=
              `
` + s.raw),
            (this.inlineQueue.at(-1).src = at.text));
        else if (!this.tokens.links[s.tag]) this.tokens.links[s.tag] = { href: s.href, title: s.title };
        continue;
      }
      if ((s = this.tokenizer.table(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      if ((s = this.tokenizer.lheading(e))) {
        ((e = e.substring(s.raw.length)), n.push(s));
        continue;
      }
      let h = e;
      if (this.options.extensions?.startBlock) {
        let y = 1 / 0,
          sliced = e.slice(1),
          w;
        if (
          (this.options.extensions.startBlock.forEach((R) => {
            if (((w = R.call({ lexer: this }, sliced)), typeof w === "number" && w >= 0)) y = Math.min(y, w);
          }),
          y < 1 / 0 && y >= 0)
        )
          h = e.substring(0, y + 1);
      }
      if (this.state.top && (s = this.tokenizer.paragraph(h))) {
        let at = n.at(-1);
        if (r && at?.type === "paragraph")
          ((at.raw +=
            `
` + s.raw),
            (at.text +=
              `
` + s.text),
            this.inlineQueue.pop(),
            (this.inlineQueue.at(-1).src = at.text));
        else n.push(s);
        ((r = h.length !== e.length), (e = e.substring(s.raw.length)));
        continue;
      }
      if ((s = this.tokenizer.text(e))) {
        e = e.substring(s.raw.length);
        let at = n.at(-1);
        if (at?.type === "text")
          ((at.raw +=
            `
` + s.raw),
            (at.text +=
              `
` + s.text),
            this.inlineQueue.pop(),
            (this.inlineQueue.at(-1).src = at.text));
        else n.push(s);
        continue;
      }
      if (e) {
        let y = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(y);
          break;
        } else throw Error(y);
      }
    }
    return ((this.state.top = !0), n);
  }
  inline(e, n = []) {
    return (this.inlineQueue.push({ src: e, tokens: n }), n);
  }
  inlineTokens(e, n = []) {
    let r = e,
      s = null;
    if (this.tokens.links) {
      let keys = Object.keys(this.tokens.links);
      if (keys.length > 0) {
        while ((s = this.tokenizer.rules.inline.reflinkSearch.exec(r)) != null)
          if (keys.includes(s[0].slice(s[0].lastIndexOf("[") + 1, -1)))
            r =
              r.slice(0, s.index) +
              "[" +
              "a".repeat(s[0].length - 2) +
              "]" +
              r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
      }
    }
    while ((s = this.tokenizer.rules.inline.blockSkip.exec(r)) != null)
      r =
        r.slice(0, s.index) +
        "[" +
        "a".repeat(s[0].length - 2) +
        "]" +
        r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    while ((s = this.tokenizer.rules.inline.anyPunctuation.exec(r)) != null)
      r = r.slice(0, s.index) + "++" + r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let h = !1,
      y = "";
    while (e) {
      if (!h) y = "";
      h = !1;
      let S;
      if (
        this.options.extensions?.inline?.some((R) => {
          if ((S = R.call({ lexer: this }, e, n))) return ((e = e.substring(S.raw.length)), n.push(S), !0);
          return !1;
        })
      )
        continue;
      if ((S = this.tokenizer.escape(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.tag(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.link(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.reflink(e, this.tokens.links))) {
        e = e.substring(S.raw.length);
        let at = n.at(-1);
        if (S.type === "text" && at?.type === "text") ((at.raw += S.raw), (at.text += S.text));
        else n.push(S);
        continue;
      }
      if ((S = this.tokenizer.emStrong(e, r, y))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.codespan(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.br(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.del(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if ((S = this.tokenizer.autolink(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      if (!this.state.inLink && (S = this.tokenizer.url(e))) {
        ((e = e.substring(S.raw.length)), n.push(S));
        continue;
      }
      let w = e;
      if (this.options.extensions?.startInline) {
        let R = 1 / 0,
          sliced = e.slice(1),
          P;
        if (
          (this.options.extensions.startInline.forEach((j) => {
            if (((P = j.call({ lexer: this }, sliced)), typeof P === "number" && P >= 0)) R = Math.min(R, P);
          }),
          R < 1 / 0 && R >= 0)
        )
          w = e.substring(0, R + 1);
      }
      if ((S = this.tokenizer.inlineText(w))) {
        if (((e = e.substring(S.raw.length)), S.raw.slice(-1) !== "_")) y = S.raw.slice(-1);
        h = !0;
        let at = n.at(-1);
        if (at?.type === "text") ((at.raw += S.raw), (at.text += S.text));
        else n.push(S);
        continue;
      }
      if (e) {
        let R = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(R);
          break;
        } else throw Error(R);
      }
    }
    return n;
  }
}
//@ chunk-s61vbvea.js:406359-408973 esm-fingerprint
class wi {
  options;
  parser;
  constructor(e) {
    this.options = e || ao;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: n, escaped: r }) {
    let s = (n || "").match(bn.notSpaceStart)?.[0],
      h =
        e.replace(bn.endingNewline, "") +
        `
`;
    if (!s)
      return (
        "<pre><code>" +
        (r ? h : Qn(h, !0)) +
        `</code></pre>
`
      );
    return (
      '<pre><code class="language-' +
      Qn(s) +
      '">' +
      (r ? h : Qn(h, !0)) +
      `</code></pre>
`
    );
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  heading({ tokens: e, depth: n }) {
    return `<h${n}>${this.parser.parseInline(e)}</h${n}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let { ordered: ordered, start: start } = e,
      s = "";
    for (let S = 0; S < e.items.length; S++) {
      let w = e.items[S];
      s += this.listitem(w);
    }
    let h = ordered ? "ol" : "ul",
      y = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return (
      "<" +
      h +
      y +
      `>
` +
      s +
      "</" +
      h +
      `>
`
    );
  }
  listitem(e) {
    let n = "";
    if (e.task) {
      let checkbox = this.checkbox({ checked: !!e.checked });
      if (e.loose)
        if (e.tokens[0]?.type === "paragraph") {
          if (
            ((e.tokens[0].text = checkbox + " " + e.tokens[0].text),
            e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text")
          )
            ((e.tokens[0].tokens[0].text = checkbox + " " + Qn(e.tokens[0].tokens[0].text)),
              (e.tokens[0].tokens[0].escaped = !0));
        } else e.tokens.unshift({ type: "text", raw: checkbox + " ", text: checkbox + " ", escaped: !0 });
      else n += checkbox + " ";
    }
    return (
      (n += this.parser.parse(e.tokens, !!e.loose)),
      `<li>${n}</li>
`
    );
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let n = "",
      r = "";
    for (let h = 0; h < e.header.length; h++) r += this.tablecell(e.header[h]);
    n += this.tablerow({ text: r });
    let s = "";
    for (let h = 0; h < e.rows.length; h++) {
      let y = e.rows[h];
      r = "";
      for (let S = 0; S < y.length; S++) r += this.tablecell(y[S]);
      s += this.tablerow({ text: r });
    }
    if (s) s = `<tbody>${s}</tbody>`;
    return (
      `<table>
<thead>
` +
      n +
      `</thead>
` +
      s +
      `</table>
`
    );
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let inline = this.parser.parseInline(e.tokens),
      r = e.header ? "th" : "td";
    return (
      (e.align ? `<${r} align="${e.align}">` : `<${r}>`) +
      inline +
      `</${r}>
`
    );
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${Qn(e, !0)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: n, tokens: r }) {
    let inline = this.parser.parseInline(r),
      h = O_(e);
    if (h === null) return inline;
    e = h;
    let y = '<a href="' + e + '"';
    if (n) y += ' title="' + Qn(n) + '"';
    return ((y += ">" + inline + "</a>"), y);
  }
  image({ href: e, title: n, text: r }) {
    let s = O_(e);
    if (s === null) return Qn(r);
    e = s;
    let h = `<img src="${e}" alt="${r}"`;
    if (n) h += ` title="${Qn(n)}"`;
    return ((h += ">"), h);
  }
  text(e) {
    return "tokens" in e && e.tokens
      ? this.parser.parseInline(e.tokens)
      : "escaped" in e && e.escaped
        ? e.text
        : Qn(e.text);
  }
}
//@ chunk-s61vbvea.js:408973-409197 esm-fingerprint
class Pl {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
}
//@ chunk-s61vbvea.js:409197-411530 esm-fingerprint
class Gn {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    ((this.options = e || ao),
      (this.options.renderer = this.options.renderer || new wi()),
      (this.renderer = this.options.renderer),
      (this.renderer.options = this.options),
      (this.renderer.parser = this),
      (this.textRenderer = new Pl()));
  }
  static parse(e, n) {
    return new Gn(n).parse(e);
  }
  static parseInline(e, n) {
    return new Gn(n).parseInline(e);
  }
  parse(e, n = !0) {
    let r = "";
    for (let s = 0; s < e.length; s++) {
      let h = e[s];
      if (this.options.extensions?.renderers?.[h.type]) {
        let S = h,
          w = this.options.extensions.renderers[S.type].call({ parser: this }, S);
        if (
          w !== !1 ||
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
          ].includes(S.type)
        ) {
          r += w || "";
          continue;
        }
      }
      let y = h;
      switch (y.type) {
        case "space": {
          r += this.renderer.space(y);
          continue;
        }
        case "hr": {
          r += this.renderer.hr(y);
          continue;
        }
        case "heading": {
          r += this.renderer.heading(y);
          continue;
        }
        case "code": {
          r += this.renderer.code(y);
          continue;
        }
        case "table": {
          r += this.renderer.table(y);
          continue;
        }
        case "blockquote": {
          r += this.renderer.blockquote(y);
          continue;
        }
        case "list": {
          r += this.renderer.list(y);
          continue;
        }
        case "html": {
          r += this.renderer.html(y);
          continue;
        }
        case "paragraph": {
          r += this.renderer.paragraph(y);
          continue;
        }
        case "text": {
          let S = y,
            text = this.renderer.text(S);
          while (s + 1 < e.length && e[s + 1].type === "text")
            ((S = e[++s]),
              (text +=
                `
` + this.renderer.text(S)));
          if (n)
            r += this.renderer.paragraph({
              type: "paragraph",
              raw: text,
              text: text,
              tokens: [{ type: "text", raw: text, text: text, escaped: !0 }],
            });
          else r += text;
          continue;
        }
        default: {
          let S = 'Token with "' + y.type + '" type was not found.';
          if (this.options.silent) return (console.error(S), "");
          else throw Error(S);
        }
      }
    }
    return r;
  }
  parseInline(e, n = this.renderer) {
    let r = "";
    for (let s = 0; s < e.length; s++) {
      let h = e[s];
      if (this.options.extensions?.renderers?.[h.type]) {
        let S = this.options.extensions.renderers[h.type].call({ parser: this }, h);
        if (
          S !== !1 ||
          !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(
            h.type,
          )
        ) {
          r += S || "";
          continue;
        }
      }
      let y = h;
      switch (y.type) {
        case "escape": {
          r += n.text(y);
          break;
        }
        case "html": {
          r += n.html(y);
          break;
        }
        case "link": {
          r += n.link(y);
          break;
        }
        case "image": {
          r += n.image(y);
          break;
        }
        case "strong": {
          r += n.strong(y);
          break;
        }
        case "em": {
          r += n.em(y);
          break;
        }
        case "codespan": {
          r += n.codespan(y);
          break;
        }
        case "br": {
          r += n.br(y);
          break;
        }
        case "del": {
          r += n.del(y);
          break;
        }
        case "text": {
          r += n.text(y);
          break;
        }
        default: {
          let S = 'Token with "' + y.type + '" type was not found.';
          if (this.options.silent) return (console.error(S), "");
          else throw Error(S);
        }
      }
    }
    return r;
  }
}
//@ chunk-s61vbvea.js:411530-411856 esm-fingerprint
class bi {
  options;
  block;
  constructor(e) {
    this.options = e || ao;
  }
  static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  provideLexer() {
    return this.block ? f2.lex : f2.lexInline;
  }
  provideParser() {
    return this.block ? Gn.parse : Gn.parseInline;
  }
}
//@ chunk-s61vbvea.js:411856-416451 esm-fingerprint
class zVe {
  defaults = wf();
  options = this.setOptions;
  parse = this.parseMarkdown(!0);
  parseInline = this.parseMarkdown(!1);
  Parser = Gn;
  Renderer = wi;
  TextRenderer = Pl;
  Lexer = f2;
  Tokenizer = fSe;
  Hooks = bi;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, n) {
    let r = [];
    for (let s of e)
      switch (((r = r.concat(n.call(this, s))), s.type)) {
        case "table": {
          let h = s;
          for (let y of h.header) r = r.concat(this.walkTokens(y.tokens, n));
          for (let row of h.rows) for (let S of row) r = r.concat(this.walkTokens(S.tokens, n));
          break;
        }
        case "list": {
          let h = s;
          r = r.concat(this.walkTokens(h.items, n));
          break;
        }
        default: {
          let h = s;
          if (this.defaults.extensions?.childTokens?.[h.type])
            this.defaults.extensions.childTokens[h.type].forEach((y) => {
              let flat = h[y].flat(1 / 0);
              r = r.concat(this.walkTokens(flat, n));
            });
          else if (h.tokens) r = r.concat(this.walkTokens(h.tokens, n));
        }
      }
    return r;
  }
  use(...e) {
    let n = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return (
      e.forEach((r) => {
        let s = { ...r };
        if (((s.async = this.defaults.async || s.async || !1), r.extensions))
          (r.extensions.forEach((extension) => {
            if (!extension.name) throw Error("extension name required");
            if ("renderer" in extension) {
              let y = n.renderers[extension.name];
              if (y)
                n.renderers[extension.name] = function (...S) {
                  let w = extension.renderer.apply(this, S);
                  if (w === !1) w = y.apply(this, S);
                  return w;
                };
              else n.renderers[extension.name] = extension.renderer;
            }
            if ("tokenizer" in extension) {
              if (!extension.level || (extension.level !== "block" && extension.level !== "inline"))
                throw Error("extension level must be 'block' or 'inline'");
              let y = n[extension.level];
              if (y) y.unshift(extension.tokenizer);
              else n[extension.level] = [extension.tokenizer];
              if (extension.start) {
                if (extension.level === "block")
                  if (n.startBlock) n.startBlock.push(extension.start);
                  else n.startBlock = [extension.start];
                else if (extension.level === "inline")
                  if (n.startInline) n.startInline.push(extension.start);
                  else n.startInline = [extension.start];
              }
            }
            if ("childTokens" in extension && extension.childTokens)
              n.childTokens[extension.name] = extension.childTokens;
          }),
            (s.extensions = n));
        if (r.renderer) {
          let h = this.defaults.renderer || new wi(this.defaults);
          for (let key in r.renderer) {
            if (!(key in h)) throw Error(`renderer '${key}' does not exist`);
            if (["options", "parser"].includes(key)) continue;
            let S = key,
              w = r.renderer[S],
              R = h[S];
            h[S] = (...x) => {
              let P = w.apply(h, x);
              if (P === !1) P = R.apply(h, x);
              return P || "";
            };
          }
          s.renderer = h;
        }
        if (r.tokenizer) {
          let h = this.defaults.tokenizer || new fSe(this.defaults);
          for (let key in r.tokenizer) {
            if (!(key in h)) throw Error(`tokenizer '${key}' does not exist`);
            if (["options", "rules", "lexer"].includes(key)) continue;
            let S = key,
              w = r.tokenizer[S],
              R = h[S];
            h[S] = (...x) => {
              let P = w.apply(h, x);
              if (P === !1) P = R.apply(h, x);
              return P;
            };
          }
          s.tokenizer = h;
        }
        if (r.hooks) {
          let h = this.defaults.hooks || new bi();
          for (let key in r.hooks) {
            if (!(key in h)) throw Error(`hook '${key}' does not exist`);
            if (["options", "block"].includes(key)) continue;
            let S = key,
              w = r.hooks[S],
              R = h[S];
            if (bi.passThroughHooks.has(key))
              h[S] = (x) => {
                if (this.defaults.async) return Promise.resolve(w.call(h, x)).then((j) => R.call(h, j));
                let P = w.call(h, x);
                return R.call(h, P);
              };
            else
              h[S] = (...x) => {
                let P = w.apply(h, x);
                if (P === !1) P = R.apply(h, x);
                return P;
              };
          }
          s.hooks = h;
        }
        if (r.walkTokens) {
          let walkTokens = this.defaults.walkTokens,
            walkTokens_2 = r.walkTokens;
          s.walkTokens = function (S) {
            let w = [];
            if ((w.push(walkTokens_2.call(this, S)), walkTokens)) w = w.concat(walkTokens.call(this, S));
            return w;
          };
        }
        this.defaults = { ...this.defaults, ...s };
      }),
      this
    );
  }
  setOptions(e) {
    return ((this.defaults = { ...this.defaults, ...e }), this);
  }
  lexer(e, n) {
    return f2.lex(e, n ?? this.defaults);
  }
  parser(e, n) {
    return Gn.parse(e, n ?? this.defaults);
  }
  parseMarkdown(e) {
    return (r, s) => {
      let h = { ...s },
        y = { ...this.defaults, ...h },
        onError = this.onError(!!y.silent, !!y.async);
      if (this.defaults.async === !0 && h.async === !1)
        return onError(
          Error(
            "marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise.",
          ),
        );
      if (typeof r > "u" || r === null)
        return onError(Error("marked(): input parameter is undefined or null"));
      if (typeof r !== "string")
        return onError(
          Error(
            "marked(): input parameter is of type " + Object.prototype.toString.call(r) + ", string expected",
          ),
        );
      if (y.hooks) ((y.hooks.options = y), (y.hooks.block = e));
      let w = y.hooks ? y.hooks.provideLexer() : e ? f2.lex : f2.lexInline,
        R = y.hooks ? y.hooks.provideParser() : e ? Gn.parse : Gn.parseInline;
      if (y.async)
        return Promise.resolve(y.hooks ? y.hooks.preprocess(r) : r)
          .then((x) => w(x, y))
          .then((x) => (y.hooks ? y.hooks.processAllTokens(x) : x))
          .then((x) => (y.walkTokens ? Promise.all(this.walkTokens(x, y.walkTokens)).then(() => x) : x))
          .then((x) => R(x, y))
          .then((x) => (y.hooks ? y.hooks.postprocess(x) : x))
          .catch(onError);
      try {
        if (y.hooks) r = y.hooks.preprocess(r);
        let x = w(r, y);
        if (y.hooks) x = y.hooks.processAllTokens(x);
        if (y.walkTokens) this.walkTokens(x, y.walkTokens);
        let P = R(x, y);
        if (y.hooks) P = y.hooks.postprocess(P);
        return P;
      } catch (error) {
        return onError(error);
      }
    };
  }
  onError(e, n) {
    return (r) => {
      if (
        ((r.message += `
Please report this to https://github.com/markedjs/marked.`),
        e)
      ) {
        let s = "<p>An error occurred:</p><pre>" + Qn(r.message + "", !0) + "</pre>";
        if (n) return Promise.resolve(s);
        return s;
      }
      if (n) return Promise.reject(r);
      throw r;
    };
  }
}
//@ chunk-s61vbvea.js:416451-416466 esm-layout
var io = new zVe();
//@ chunk-s61vbvea.js:416466-416504 esm-layout
function Ah(e, n) {
  return io.parse(e, n);
}
//@ chunk-s61vbvea.js:416504-416609 esm-fingerprint
Ah.options = Ah.setOptions = function (e) {
  return (io.setOptions(e), (Ah.defaults = io.defaults), H_(Ah.defaults), Ah);
};
//@ chunk-s61vbvea.js:416609-416627 esm-fingerprint
Ah.getDefaults = wf;
//@ chunk-s61vbvea.js:416627-416642 esm-fingerprint
Ah.defaults = ao;
//@ chunk-s61vbvea.js:416642-416728 esm-fingerprint
Ah.use = function (...e) {
  return (io.use(...e), (Ah.defaults = io.defaults), H_(Ah.defaults), Ah);
};
//@ chunk-s61vbvea.js:416728-416783 esm-fingerprint
Ah.walkTokens = function (e, n) {
  return io.walkTokens(e, n);
};
//@ chunk-s61vbvea.js:416783-416813 esm-fingerprint
Ah.parseInline = io.parseInline;
//@ chunk-s61vbvea.js:416813-416826 esm-layout
Ah.Parser = Gn;
//@ chunk-s61vbvea.js:416826-416845 esm-fingerprint
Ah.parser = Gn.parse;
//@ chunk-s61vbvea.js:416845-416860 esm-fingerprint
Ah.Renderer = wi;
//@ chunk-s61vbvea.js:416860-416879 esm-fingerprint
Ah.TextRenderer = Pl;
//@ chunk-s61vbvea.js:416879-416891 esm-fingerprint
Ah.Lexer = f2;
//@ chunk-s61vbvea.js:416891-416907 esm-fingerprint
Ah.lexer = f2.lex;
//@ chunk-s61vbvea.js:416907-416924 esm-fingerprint
Ah.Tokenizer = fSe;
//@ chunk-s61vbvea.js:416924-416936 esm-fingerprint
Ah.Hooks = bi;
//@ chunk-s61vbvea.js:416936-416948 affinity
Ah.parse = Ah;
//@ chunk-s61vbvea.js:416948-417022 affinity
var {
  options: options,
  setOptions: setOptions,
  use: use,
  walkTokens: walkTokens,
  parseInline: parseInline,
} = Ah;
//@ chunk-s61vbvea.js:417022-417050 affinity
var parse = Gn.parse,
  lex = f2.lex;

export { Ah, fSe, f2, zVe };
