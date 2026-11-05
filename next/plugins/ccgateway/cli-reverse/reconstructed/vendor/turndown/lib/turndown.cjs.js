/**
 * turndown/lib/turndown.cjs.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: turndown@7.2.0
 * pieces: chunk-w04z664w.js (60)
 * attribution: esm-layout 13, esm-fingerprint 47
 */
import { require_domino } from "../../@mixmark-io/domino/lib/index.js";

//@ chunk-w04z664w.js:237838-237965 esm-layout
function extend(destination) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) if (source.hasOwnProperty(key)) destination[key] = source[key];
  }
  return destination;
}
//@ chunk-w04z664w.js:237965-238008 esm-layout
function repeat(character, count) {
  return Array(count + 1).join(character);
}
//@ chunk-w04z664w.js:238008-238051 esm-fingerprint
function trimLeadingNewlines(string) {
  return string.replace(/^\n*/, "");
}
//@ chunk-w04z664w.js:238051-238133 esm-fingerprint
function trimTrailingNewlines(string) {
  var indexEnd = string.length;
  while (
    indexEnd > 0 &&
    string[indexEnd - 1] ===
      `
`
  )
    indexEnd--;
  return string.substring(0, indexEnd);
}
//@ chunk-w04z664w.js:238133-238506 esm-fingerprint
var blockElements = [
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "AUDIO",
  "BLOCKQUOTE",
  "BODY",
  "CANVAS",
  "CENTER",
  "DD",
  "DIR",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "FRAMESET",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HGROUP",
  "HR",
  "HTML",
  "ISINDEX",
  "LI",
  "MAIN",
  "MENU",
  "NAV",
  "NOFRAMES",
  "NOSCRIPT",
  "OL",
  "OUTPUT",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL",
];
//@ chunk-w04z664w.js:238506-238537 esm-layout
function isBlock(node) {
  return is(node, blockElements);
}
//@ chunk-w04z664w.js:238537-238662 esm-fingerprint
var voidElements = [
  "AREA",
  "BASE",
  "BR",
  "COL",
  "COMMAND",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "KEYGEN",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR",
];
//@ chunk-w04z664w.js:238662-238693 esm-layout
function isVoid(node) {
  return is(node, voidElements);
}
//@ chunk-w04z664w.js:238693-238724 esm-layout
function hasVoid(node) {
  return has(node, voidElements);
}
//@ chunk-w04z664w.js:238724-238813 esm-fingerprint
var meaningfulWhenBlankElements = [
  "A",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TH",
  "TD",
  "IFRAME",
  "SCRIPT",
  "AUDIO",
  "VIDEO",
];
//@ chunk-w04z664w.js:238813-238844 esm-layout
function isMeaningfulWhenBlank(node) {
  return is(node, meaningfulWhenBlankElements);
}
//@ chunk-w04z664w.js:238844-238875 esm-layout
function hasMeaningfulWhenBlank(node) {
  return has(node, meaningfulWhenBlankElements);
}
//@ chunk-w04z664w.js:238875-238924 esm-fingerprint
function is(node, tagNames) {
  return tagNames.indexOf(node.nodeName) >= 0;
}
//@ chunk-w04z664w.js:238924-239033 esm-fingerprint
function has(node, tagNames) {
  return (
    node.getElementsByTagName &&
    tagNames.some(function (tagName) {
      return node.getElementsByTagName(tagName).length;
    })
  );
}
//@ chunk-w04z664w.js:239033-239043 esm-layout
/**
 * （第三方 turndown 的 commonmark 规则：段落、标题、列表、代码块、链接、图片等 HTML→Markdown 转换，切分错误）
 */
var rules = {};
//@ chunk-w04z664w.js:239043-239112 esm-fingerprint
rules.paragraph = {
  filter: "p",
  replacement: function (content) {
    return (
      `

` +
      content +
      `

`
    );
  },
};
//@ chunk-w04z664w.js:239112-239184 esm-fingerprint
rules.lineBreak = {
  filter: "br",
  replacement: function (content, node, options) {
    return (
      options.br +
      `
`
    );
  },
};
//@ chunk-w04z664w.js:239184-239429 esm-fingerprint
rules.heading = {
  filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
  replacement: function (content, node, options) {
    var hLevel = Number(node.nodeName.charAt(1));
    if (options.headingStyle === "setext" && hLevel < 3) {
      var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
      return (
        `

` +
        content +
        `
` +
        underline +
        `

`
      );
    } else
      return (
        `

` +
        repeat("#", hLevel) +
        " " +
        content +
        `

`
      );
  },
};
//@ chunk-w04z664w.js:239429-239562 esm-fingerprint
rules.blockquote = {
  filter: "blockquote",
  replacement: function (content) {
    content = content.replace(/^\n+|\n+$/g, "");
    content = content.replace(/^/gm, "> ");
    return (
      `

` +
      content +
      `

`
    );
  },
};
//@ chunk-w04z664w.js:239562-239717 esm-fingerprint
rules.list = {
  filter: ["ul", "ol"],
  replacement: function (content, node) {
    var parent = node.parentNode;
    if (parent.nodeName === "LI" && parent.lastElementChild === node)
      return (
        `
` + content
      );
    else
      return (
        `

` +
        content +
        `

`
      );
  },
};
//@ chunk-w04z664w.js:239717-240060 esm-fingerprint
rules.listItem = {
  filter: "li",
  replacement: function (content, node, options) {
    content = content
      .replace(/^\n+/, "")
      .replace(
        /\n+$/,
        `
`,
      )
      .replace(
        /\n/gm,
        `
    `,
      );
    var prefix = options.bulletListMarker + "   ";
    var parent = node.parentNode;
    if (parent.nodeName === "OL") {
      var start = parent.getAttribute("start");
      var index = Array.prototype.indexOf.call(parent.children, node);
      prefix = (start ? Number(start) + index : index + 1) + ".  ";
    }
    return (
      prefix +
      content +
      (node.nextSibling && !/\n$/.test(content)
        ? `
`
        : "")
    );
  },
};
//@ chunk-w04z664w.js:240060-240305 esm-fingerprint
rules.indentedCodeBlock = {
  filter: function (node, options) {
    return (
      options.codeBlockStyle === "indented" &&
      node.nodeName === "PRE" &&
      node.firstChild &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (content, node, options) {
    return (
      `

    ` +
      node.firstChild.textContent.replace(
        /\n/g,
        `
    `,
      ) +
      `

`
    );
  },
};
//@ chunk-w04z664w.js:240305-240768 esm-fingerprint
rules.fencedCodeBlock = {
  filter: function (node, options) {
    return (
      options.codeBlockStyle === "fenced" &&
      node.nodeName === "PRE" &&
      node.firstChild &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (content, node, options) {
    var className = node.firstChild.getAttribute("class") || "";
    var language = (className.match(/language-(\S+)/) || [null, ""])[1];
    var code = node.firstChild.textContent;
    var fenceChar = options.fence.charAt(0);
    var fenceSize = 3;
    var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");
    var match;
    while ((match = fenceInCodeRegex.exec(code)))
      if (match[0].length >= fenceSize) fenceSize = match[0].length + 1;
    var fence = repeat(fenceChar, fenceSize);
    return (
      `

` +
      fence +
      language +
      `
` +
      code.replace(/\n$/, "") +
      `
` +
      fence +
      `

`
    );
  },
};
//@ chunk-w04z664w.js:240768-240850 esm-fingerprint
rules.horizontalRule = {
  filter: "hr",
  replacement: function (content, node, options) {
    return (
      `

` +
      options.hr +
      `

`
    );
  },
};
//@ chunk-w04z664w.js:240850-241150 esm-fingerprint
rules.inlineLink = {
  filter: function (node, options) {
    return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href");
  },
  replacement: function (content, node) {
    var href = node.getAttribute("href");
    if (href) href = href.replace(/([()])/g, "\\$1");
    var title = cleanAttribute(node.getAttribute("title"));
    if (title) title = ' "' + title.replace(/"/g, '\\"') + '"';
    return "[" + content + "](" + href + title + ")";
  },
};
//@ chunk-w04z664w.js:241150-241759 esm-fingerprint
rules.referenceLink = {
  filter: function (node, options) {
    return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
  },
  replacement: function (content, node, options) {
    var href = node.getAttribute("href");
    var title = cleanAttribute(node.getAttribute("title"));
    if (title) title = ' "' + title + '"';
    var replacement;
    var reference;
    switch (options.linkReferenceStyle) {
      case "collapsed":
        replacement = "[" + content + "][]";
        reference = "[" + content + "]: " + href + title;
        break;
      case "shortcut":
        replacement = "[" + content + "]";
        reference = "[" + content + "]: " + href + title;
        break;
      default:
        var id = this.references.length + 1;
        replacement = "[" + content + "][" + id + "]";
        reference = "[" + id + "]: " + href + title;
    }
    this.references.push(reference);
    return replacement;
  },
  references: [],
  append: function (options) {
    var references = "";
    if (this.references.length) {
      references =
        `

` +
        this.references.join(`
`) +
        `

`;
      this.references = [];
    }
    return references;
  },
};
//@ chunk-w04z664w.js:241759-241879 esm-fingerprint
rules.emphasis = {
  filter: ["em", "i"],
  replacement: function (content, node, options) {
    if (!content.trim()) return "";
    return options.emDelimiter + content + options.emDelimiter;
  },
};
//@ chunk-w04z664w.js:241879-242009 esm-fingerprint
rules.strong = {
  filter: ["strong", "b"],
  replacement: function (content, node, options) {
    if (!content.trim()) return "";
    return options.strongDelimiter + content + options.strongDelimiter;
  },
};
//@ chunk-w04z664w.js:242009-242334 esm-fingerprint
rules.code = {
  filter: function (node) {
    var hasSiblings = node.previousSibling || node.nextSibling;
    var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
    return node.nodeName === "CODE" && !isCodeBlock;
  },
  replacement: function (content) {
    if (!content) return "";
    content = content.replace(/\r?\n|\r/g, " ");
    var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
    var delimiter = "`";
    var matches = content.match(/`+/gm) || [];
    while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + "`";
    return delimiter + extraSpace + content + extraSpace + delimiter;
  },
};
//@ chunk-w04z664w.js:242334-242525 esm-fingerprint
rules.image = {
  filter: "img",
  replacement: function (content, node) {
    var alt = cleanAttribute(node.getAttribute("alt"));
    var src = node.getAttribute("src") || "";
    var title = cleanAttribute(node.getAttribute("title"));
    var titlePart = title ? ' "' + title + '"' : "";
    return src ? "![" + alt + "](" + src + titlePart + ")" : "";
  },
};
//@ chunk-w04z664w.js:242525-242580 esm-fingerprint
function cleanAttribute(attribute) {
  return attribute
    ? attribute.replace(
        /(\n+\s*)+/g,
        `
`,
      )
    : "";
}
//@ chunk-w04z664w.js:242580-242842 esm-fingerprint
function Rules(options) {
  this.options = options;
  this._keep = [];
  this._remove = [];
  this.blankRule = {
    replacement: options.blankReplacement,
  };
  this.keepReplacement = options.keepReplacement;
  this.defaultRule = {
    replacement: options.defaultReplacement,
  };
  this.array = [];
  for (var key in options.rules) this.array.push(options.rules[key]);
}
//@ chunk-w04z664w.js:242842-243362 esm-fingerprint
Rules.prototype = {
  add: function (key, rule) {
    this.array.unshift(rule);
  },
  keep: function (filter) {
    this._keep.unshift({
      filter,
      replacement: this.keepReplacement,
    });
  },
  remove: function (filter) {
    this._remove.unshift({
      filter,
      replacement: function () {
        return "";
      },
    });
  },
  forNode: function (node) {
    if (node.isBlank) return this.blankRule;
    var rule;
    if ((rule = findRule(this.array, node, this.options))) return rule;
    if ((rule = findRule(this._keep, node, this.options))) return rule;
    if ((rule = findRule(this._remove, node, this.options))) return rule;
    return this.defaultRule;
  },
  forEach: function (fn) {
    for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
  },
};
//@ chunk-w04z664w.js:243362-243449 esm-layout
function findRule(rules, node, options) {
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (filterValue(rule, node, options)) return rule;
  }
  return;
}
//@ chunk-w04z664w.js:243449-243756 esm-fingerprint
function filterValue(rule, node, options) {
  var filter = rule.filter;
  if (typeof filter === "string") {
    if (filter === node.nodeName.toLowerCase()) return true;
  } else if (Array.isArray(filter)) {
    if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
  } else if (typeof filter === "function") {
    if (filter.call(rule, node, options)) return true;
  } else throw TypeError("`filter` needs to be a string, array, or function");
}
//@ chunk-w04z664w.js:243756-244353 esm-fingerprint
function collapseWhitespace(context) {
  var { element, isBlock, isVoid } = context;
  var isPre =
    context.isPre ||
    function (node) {
      return node.nodeName === "PRE";
    };
  if (!element.firstChild || isPre(element)) return;
  var prevText = null;
  var keepLeadingWs = false;
  var prev = null;
  var node = nextNode_2(prev, element, isPre);
  while (node !== element) {
    if (node.nodeType === 3 || node.nodeType === 4) {
      var text = node.data.replace(/[ \r\n\t]+/g, " ");
      if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === " ") text = text.substr(1);
      if (!text) {
        node = removeNode(node);
        continue;
      }
      node.data = text;
      prevText = node;
    } else if (node.nodeType === 1) {
      if (isBlock(node) || node.nodeName === "BR") {
        if (prevText) prevText.data = prevText.data.replace(/ $/, "");
        prevText = null;
        keepLeadingWs = false;
      } else if (isVoid(node) || isPre(node)) {
        prevText = null;
        keepLeadingWs = true;
      } else if (prevText) keepLeadingWs = false;
    } else {
      node = removeNode(node);
      continue;
    }
    var nextNode = nextNode_2(prev, node, isPre);
    prev = node;
    node = nextNode;
  }
  if (prevText) {
    prevText.data = prevText.data.replace(/ $/, "");
    if (!prevText.data) removeNode(prevText);
  }
}
//@ chunk-w04z664w.js:244353-244439 esm-fingerprint
function removeNode(node) {
  var next = node.nextSibling || node.parentNode;
  node.parentNode.removeChild(node);
  return next;
}
//@ chunk-w04z664w.js:244439-244571 esm-fingerprint
function nextNode_2(prev, current, isPre) {
  if ((prev && prev.parentNode === current) || isPre(current))
    return current.nextSibling || current.parentNode;
  return current.firstChild || current.nextSibling || current.parentNode;
}
//@ chunk-w04z664w.js:244571-244606 esm-layout
var root = typeof window !== "undefined" ? window : {};
//@ chunk-w04z664w.js:244606-244715 esm-fingerprint
function canParseHTMLNatively() {
  var Parser = root.DOMParser;
  var canParse = false;
  try {
    if (new Parser().parseFromString("", "text/html")) canParse = true;
  } catch (e) {}
  return canParse;
}
//@ chunk-w04z664w.js:244715-244837 esm-fingerprint
function createHTMLParser() {
  var Parser = function () {};
  {
    var domino = require_domino();
    Parser.prototype.parseFromString = function (string) {
      return domino.createDocument(string);
    };
  }
  return Parser;
}
//@ chunk-w04z664w.js:244837-244867 esm-fingerprint
var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();
//@ chunk-w04z664w.js:244867-245144 esm-fingerprint
function RootNode(input, options) {
  var root;
  if (typeof input === "string") {
    var doc = htmlParser().parseFromString(
      '<x-turndown id="turndown-root">' + input + "</x-turndown>",
      "text/html",
    );
    root = doc.getElementById("turndown-root");
  } else root = input.cloneNode(true);
  collapseWhitespace({
    element: root,
    isBlock,
    isVoid,
    isPre: options.preformattedCode ? isPreOrCode : null,
  });
  return root;
}
//@ chunk-w04z664w.js:245144-245151 esm-layout
var _htmlParser;
//@ chunk-w04z664w.js:245151-245189 esm-layout
function htmlParser() {
  _htmlParser = _htmlParser || new HTMLParser();
  return _htmlParser;
}
//@ chunk-w04z664w.js:245189-245251 esm-fingerprint
function isPreOrCode(node) {
  return node.nodeName === "PRE" || node.nodeName === "CODE";
}
//@ chunk-w04z664w.js:245251-245388 esm-fingerprint
function Node(node, options) {
  node.isBlock = isBlock(node);
  node.isCode = node.nodeName === "CODE" || node.parentNode.isCode;
  node.isBlank = isBlank(node);
  node.flankingWhitespace = flankingWhitespace(node, options);
  return node;
}
//@ chunk-w04z664w.js:245388-245470 esm-fingerprint
function isBlank(node) {
  return (
    !isVoid(node) &&
    !isMeaningfulWhenBlank(node) &&
    /^\s*$/i.test(node.textContent) &&
    !hasVoid(node) &&
    !hasMeaningfulWhenBlank(node)
  );
}
//@ chunk-w04z664w.js:245470-245759 esm-fingerprint
function flankingWhitespace(node, options) {
  if (node.isBlock || (options.preformattedCode && node.isCode))
    return {
      leading: "",
      trailing: "",
    };
  var edges = edgeWhitespace(node.textContent);
  if (edges.leadingAscii && isFlankedByWhitespace("left", node, options))
    edges.leading = edges.leadingNonAscii;
  if (edges.trailingAscii && isFlankedByWhitespace("right", node, options))
    edges.trailing = edges.trailingNonAscii;
  return {
    leading: edges.leading,
    trailing: edges.trailing,
  };
}
//@ chunk-w04z664w.js:245759-245968 esm-fingerprint
function edgeWhitespace(string) {
  var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
  return {
    leading: m[1],
    leadingAscii: m[2],
    leadingNonAscii: m[3],
    trailing: m[4],
    trailingNonAscii: m[5],
    trailingAscii: m[6],
  };
}
//@ chunk-w04z664w.js:245968-246229 esm-fingerprint
function isFlankedByWhitespace(side, node, options) {
  var sibling;
  var regExp;
  var isFlanked;
  if (side === "left") {
    sibling = node.previousSibling;
    regExp = / $/;
  } else {
    sibling = node.nextSibling;
    regExp = /^ /;
  }
  if (sibling) {
    if (sibling.nodeType === 3) isFlanked = regExp.test(sibling.nodeValue);
    else if (options.preformattedCode && sibling.nodeName === "CODE") isFlanked = false;
    else if (sibling.nodeType === 1 && !isBlock(sibling)) isFlanked = regExp.test(sibling.textContent);
  }
  return isFlanked;
}
//@ chunk-w04z664w.js:246229-246476 esm-fingerprint
var reduce = Array.prototype.reduce;
var escapes = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/^>/g, "\\>"],
  [/_/g, "\\_"],
  [/^(\d+)\. /g, "$1\\. "],
];
//@ chunk-w04z664w.js:246476-247013 esm-fingerprint
function TurndownService(options) {
  if (!(this instanceof TurndownService)) return new TurndownService(options);
  var defaults = {
    rules,
    headingStyle: "setext",
    hr: "* * *",
    bulletListMarker: "*",
    codeBlockStyle: "indented",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    br: "  ",
    preformattedCode: false,
    blankReplacement: function (content, node) {
      return node.isBlock
        ? `

`
        : "";
    },
    keepReplacement: function (content, node) {
      return node.isBlock
        ? `

` +
            node.outerHTML +
            `

`
        : node.outerHTML;
    },
    defaultReplacement: function (content, node) {
      return node.isBlock
        ? `

` +
            content +
            `

`
        : content;
    },
  };
  this.options = extend({}, defaults, options);
  this.rules = new Rules(this.options);
}
//@ chunk-w04z664w.js:247013-247666 esm-fingerprint
TurndownService.prototype = {
  turndown: function (input) {
    if (!canConvert(input))
      throw TypeError(input + " is not a string, or an element/document/fragment node.");
    if (input === "") return "";
    var output = processChildren.call(this, new RootNode(input, this.options));
    return postProcess.call(this, output);
  },
  use: function (plugin) {
    if (Array.isArray(plugin)) for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
    else if (typeof plugin === "function") plugin(this);
    else throw TypeError("plugin must be a Function or an Array of Functions");
    return this;
  },
  addRule: function (key, rule) {
    this.rules.add(key, rule);
    return this;
  },
  keep: function (filter) {
    this.rules.keep(filter);
    return this;
  },
  remove: function (filter) {
    this.rules.remove(filter);
    return this;
  },
  escape: function (string) {
    return escapes.reduce(function (accumulator, escapePair) {
      return accumulator.replace(escapePair[0], escapePair[1]);
    }, string);
  },
};
//@ chunk-w04z664w.js:247666-247886 esm-fingerprint
function processChildren(parentNode) {
  var service = this;
  return reduce.call(
    parentNode.childNodes,
    function (output, node) {
      node = new Node(node, service.options);
      var replacement = "";
      if (node.nodeType === 3) replacement = node.isCode ? node.nodeValue : service.escape(node.nodeValue);
      else if (node.nodeType === 1) replacement = replacementForNode.call(service, node);
      return join(output, replacement);
    },
    "",
  );
}
//@ chunk-w04z664w.js:247886-248066 esm-fingerprint
function postProcess(output) {
  var service = this;
  this.rules.forEach(function (rule) {
    if (typeof rule.append === "function") output = join(output, rule.append(service.options));
  });
  return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
}
//@ chunk-w04z664w.js:248066-248246 esm-fingerprint
function replacementForNode(node) {
  var rule = this.rules.forNode(node);
  var content = processChildren.call(this, node);
  var whitespace = node.flankingWhitespace;
  if (whitespace.leading || whitespace.trailing) content = content.trim();
  return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
}
//@ chunk-w04z664w.js:248246-248366 esm-fingerprint
function join(output, replacement) {
  var s1 = trimTrailingNewlines(output);
  var s2 = trimLeadingNewlines(replacement);
  var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
  var separator = `

`.substring(0, nls);
  return s1 + separator + s2;
}
//@ chunk-w04z664w.js:248366-248482 esm-fingerprint
function canConvert(input) {
  return (
    input != null &&
    (typeof input === "string" ||
      (input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11)))
  );
}
//@ chunk-w04z664w.js:248482-248492 esm-layout
var TurndownService_default = TurndownService;
export { TurndownService_default };
