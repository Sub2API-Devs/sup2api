# 声明级等价校验（tools/verify/decl-equiv.mjs）

阅读树 `reconstructed`，7562 个文件，用时 72 秒。

| 项 | 数 |
|---|---|
| declarations | 84503 |
| equal | 84498 |
| mismatch | 5 |
| missing | 0 |
| duplicated | 0 |
| notOfficial | 0 |
| unmarked | 85 |
| unlocated | 0 |
| uncoveredOfficialStatements | 0 |
| kindChanged | 1 |
| deferred | 5997 |
| dropped | 7105 |

## chunk-qq5knpkd.js:287840-290549

阅读树文件 `reconstructed\vendor\@modelcontextprotocol\client\dist\index.mjs`

官方（规范形）：

```js
var _h = class e {
  _pending;
  _probeCounter = 0;
  _transportKind;
  _issuedIds = new Set();
  _errorSinceSend;
  _savedOnMessage;
  _savedOnError;
  _savedOnClose;
  _closeDelivered = !1;
  constructor(t) {
    this._transport = t;
    this._savedOnMessage = t.onmessage;
    this._savedOnError = t.onerror;
    this._savedOnClose = t.onclose;
  }
  static async open(t, r) {
    let s = new e(t);
    s._transportKind = r;
    t.onmessage = a => {
      let n = s._pending;
      if (n !== void 0 && (oIe(a) || sIe(a)) && a.id === n.id) {
        s._pending = void 0;
        if (oIe(a)) n.resolve({
          kind: "response",
          result: a.result
        });else n.resolve({
          kind: "response",
          error: a.error
        });
        return;
      }
      if (n !== void 0 && s._transportKind === "http" && (oIe(a) || sIe(a)) && !s._issuedIds.has(a.id)) {
        s._pending = void 0;
        let i = uc(JSON.stringify(a.id));
        let l = Error(`server/discover probe reply did not echo the request id (expected ${JSON.stringify(n.id)}, got ${i}) \u2014 treating the server as pre-2026-07-28`);
        l.name = "McpProbeIdMismatchError";
        s._savedOnError?.(l);
        n.resolve({
          kind: "id-mismatch"
        });
        return;
      }
    };
    t.onerror = a => {
      if (s._pending !== void 0 && s._errorSinceSend === void 0) s._errorSinceSend = a;
      let n = s._pending;
      if (n !== void 0 && s._transportKind === "http" && dc(a)) setTim
```

阅读树（规范形）：

```js
class ProbeWindow {
  _pending;
  _probeCounter = 0;
  _transportKind;
  _issuedIds = new Set();
  _errorSinceSend;
  _savedOnMessage;
  _savedOnError;
  _savedOnClose;
  _closeDelivered = !1;
  constructor(transport) {
    this._transport = transport;
    this._savedOnMessage = transport.onmessage;
    this._savedOnError = transport.onerror;
    this._savedOnClose = transport.onclose;
  }
  static async open(transport, _transportKind) {
    let probe = new ProbeWindow(transport);
    probe._transportKind = _transportKind;
    transport.onmessage = message => {
      let _pending = probe._pending;
      if (_pending !== void 0 && (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) && message.id === _pending.id) {
        probe._pending = void 0;
        if (isJSONRPCResultResponse(message)) _pending.resolve({
          kind: "response",
          result: message.result
        });else _pending.resolve({
          kind: "response",
          error: message.error
        });
        return;
      }
      if (_pending !== void 0 && probe._transportKind === "http" && (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) && !probe._issuedIds.has(message.id)) {
        probe._pending = void 0;
        let receivedId = truncateForError(JSON.stringify(message.id));
        let probeError = Error(`server/discover probe reply did not echo the request id (expected ${JSON.stringify(_pending.id)}, got ${receivedId}) \u2014 treating the server as pre-2026-
```

指纹第一处不同（第 2 个字符）：

```
[(VariableDeclarationdeclarations=[(VariableDeclaratorid=(Identifier#0)init=(ClassExpressionbody=(ClassBodybody=[(ClassPropertycomputed=falsekey=K:"_pen
```

```
[(ClassDeclarationbody=(ClassBodybody=[(ClassPropertycomputed=falsekey=K:"_pending"static=falsevalue=~)(ClassPropertycomputed=falsekey=K:"_probeCounter"
```

## chunk-qq5knpkd.js:20275-23348

阅读树文件 `reconstructed\vendor\@modelcontextprotocol\client\dist\src-D_zzAWoS.mjs`

官方（规范形）：

```js
var Wme = function (e) {
  e.InvalidRequest = "invalid_request";
  e.InvalidClient = "invalid_client";
  e.InvalidGrant = "invalid_grant";
  e.UnauthorizedClient = "unauthorized_client";
  e.UnsupportedGrantType = "unsupported_grant_type";
  e.InvalidScope = "invalid_scope";
  e.AccessDenied = "access_denied";
  e.ServerError = "server_error";
  e.TemporarilyUnavailable = "temporarily_unavailable";
  e.UnsupportedResponseType = "unsupported_response_type";
  e.UnsupportedTokenType = "unsupported_token_type";
  e.InvalidToken = "invalid_token";
  e.MethodNotAllowed = "method_not_allowed";
  e.TooManyRequests = "too_many_requests";
  e.InvalidClientMetadata = "invalid_client_metadata";
  e.InvalidRedirectUri = "invalid_redirect_uri";
  e.InsufficientScope = "insufficient_scope";
  e.InvalidTarget = "invalid_target";
  return e;
}({});
var G3 = class e extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.OAuthError"
    });
  }
  static [Symbol.hasInstance](t) {
    return Ne(this, t);
  }
  static isInstance(t) {
    if (typeof this !== "function") throw TypeError("isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`");
    return Ne(this, t);
  }
  constructor(t, r, s) {
    super(r);
    this.code = t;
    this.errorUri = s;
    this.name = "OAuthError";
    Et(this, new.target);
  }
  toResponseObject() {
    let t = {
      error: this.code,
      error_description: 
```

阅读树（规范形）：

```js
var OAuthErrorCode = function (OAuthErrorCode$1) {
  OAuthErrorCode$1.InvalidRequest = "invalid_request";
  OAuthErrorCode$1.InvalidClient = "invalid_client";
  OAuthErrorCode$1.InvalidGrant = "invalid_grant";
  OAuthErrorCode$1.UnauthorizedClient = "unauthorized_client";
  OAuthErrorCode$1.UnsupportedGrantType = "unsupported_grant_type";
  OAuthErrorCode$1.InvalidScope = "invalid_scope";
  OAuthErrorCode$1.AccessDenied = "access_denied";
  OAuthErrorCode$1.ServerError = "server_error";
  OAuthErrorCode$1.TemporarilyUnavailable = "temporarily_unavailable";
  OAuthErrorCode$1.UnsupportedResponseType = "unsupported_response_type";
  OAuthErrorCode$1.UnsupportedTokenType = "unsupported_token_type";
  OAuthErrorCode$1.InvalidToken = "invalid_token";
  OAuthErrorCode$1.MethodNotAllowed = "method_not_allowed";
  OAuthErrorCode$1.TooManyRequests = "too_many_requests";
  OAuthErrorCode$1.InvalidClientMetadata = "invalid_client_metadata";
  OAuthErrorCode$1.InvalidRedirectUri = "invalid_redirect_uri";
  OAuthErrorCode$1.InsufficientScope = "insufficient_scope";
  OAuthErrorCode$1.InvalidTarget = "invalid_target";
  return OAuthErrorCode$1;
}({});
class OAuthError extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.OAuthError"
    });
  }
  static [Symbol.hasInstance](value) {
    return brandedHasInstance(this, value);
  }
  static isInstance(value) {
    if (typeof this !== "function") throw TypeError("isInstance must be called on the class (e.g
```

指纹第一处不同（第 4071 个字符）：

```
="right=(StringLiteralvalue="invalid_target")))(ReturnStatementargument=(Identifier#1))]directives=[])generator=falseid=~params=[(Identifier#1)])))])(VariableDeclarationdeclarations=[(VariableDeclaratorid=(Identifier#2)init=(ClassExpressionbody=(ClassBodybody=[(StaticBlockbody=[(ExpressionStatemente
```

```
="right=(StringLiteralvalue="invalid_target")))(ReturnStatementargument=(Identifier#1))]directives=[])generator=falseid=~params=[(Identifier#1)])))])(ClassDeclarationbody=(ClassBodybody=[(StaticBlockbody=[(ExpressionStatementexpression=(CallExpressionarguments=[(ThisExpression)(StringLiteralvalue="m
```

## chunk-qq5knpkd.js:64287-67148

阅读树文件 `reconstructed\vendor\@modelcontextprotocol\client\dist\src-D_zzAWoS.mjs`

官方（规范形）：

```js
var xa = function (e) {
  e[e.ParseError = -32700] = "ParseError";
  e[e.InvalidRequest = -32600] = "InvalidRequest";
  e[e.MethodNotFound = -32601] = "MethodNotFound";
  e[e.InvalidParams = -32602] = "InvalidParams";
  e[e.InternalError = -32603] = "InternalError";
  e[e.ResourceNotFound = -32002] = "ResourceNotFound";
  e[e.MissingRequiredClientCapability = -32021] = "MissingRequiredClientCapability";
  e[e.UnsupportedProtocolVersion = -32022] = "UnsupportedProtocolVersion";
  e[e.UrlElicitationRequired = -32042] = "UrlElicitationRequired";
  return e;
}({});
var Ac = class e extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.ProtocolError"
    });
  }
  static [Symbol.hasInstance](t) {
    return Ne(this, t);
  }
  static isInstance(t) {
    if (typeof this !== "function") throw TypeError("isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`");
    return Ne(this, t);
  }
  constructor(t, r, s) {
    super(r);
    this.code = t;
    this.data = s;
    this.name = "ProtocolError";
    Et(this, new.target);
  }
  static fromError(t, r, s) {
    if (t === xa.UrlElicitationRequired && s) {
      let a = s;
      if (a.elicitations) return new hi(a.elicitations, r);
    }
    if (t === xa.UnsupportedProtocolVersion && s) {
      let a = s;
      if (Array.isArray(a.supported) && typeof a.requested === "string") return new ha({
        supported: a.supported,
        re
```

阅读树（规范形）：

```js
var ProtocolErrorCode = function (ProtocolErrorCode$1) {
  ProtocolErrorCode$1[ProtocolErrorCode$1.ParseError = -32700] = "ParseError";
  ProtocolErrorCode$1[ProtocolErrorCode$1.InvalidRequest = -32600] = "InvalidRequest";
  ProtocolErrorCode$1[ProtocolErrorCode$1.MethodNotFound = -32601] = "MethodNotFound";
  ProtocolErrorCode$1[ProtocolErrorCode$1.InvalidParams = -32602] = "InvalidParams";
  ProtocolErrorCode$1[ProtocolErrorCode$1.InternalError = -32603] = "InternalError";
  ProtocolErrorCode$1[ProtocolErrorCode$1.ResourceNotFound = -32002] = "ResourceNotFound";
  ProtocolErrorCode$1[ProtocolErrorCode$1.MissingRequiredClientCapability = -32021] = "MissingRequiredClientCapability";
  ProtocolErrorCode$1[ProtocolErrorCode$1.UnsupportedProtocolVersion = -32022] = "UnsupportedProtocolVersion";
  ProtocolErrorCode$1[ProtocolErrorCode$1.UrlElicitationRequired = -32042] = "UrlElicitationRequired";
  return ProtocolErrorCode$1;
}({});
class ProtocolError extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.ProtocolError"
    });
  }
  static [Symbol.hasInstance](value) {
    return brandedHasInstance(this, value);
  }
  static isInstance(value) {
    if (typeof this !== "function") throw TypeError("isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`");
    return brandedHasInstance(this, value);
  }
  constructor(code, message, data) {
    super(message);
    this.code = co
```

指纹第一处不同（第 3840 个字符）：

```
(StringLiteralvalue="UrlElicitationRequired")))(ReturnStatementargument=(Identifier#1))]directives=[])generator=falseid=~params=[(Identifier#1)])))])(VariableDeclarationdeclarations=[(VariableDeclaratorid=(Identifier#2)init=(ClassExpressionbody=(ClassBodybody=[(StaticBlockbody=[(ExpressionStatemente
```

```
(StringLiteralvalue="UrlElicitationRequired")))(ReturnStatementargument=(Identifier#1))]directives=[])generator=falseid=~params=[(Identifier#1)])))])(ClassDeclarationbody=(ClassBodybody=[(StaticBlockbody=[(ExpressionStatementexpression=(CallExpressionarguments=[(ThisExpression)(StringLiteralvalue="m
```

## chunk-7tj1as7s.js:311-331

阅读树文件 `reconstructed\vendor\@smithy\core\index.js`

官方（规范形）：

```js
wv();
```

阅读树（规范形）：

```js
let defaultExport = require_core();
```

指纹第一处不同（第 2 个字符）：

```
[(ExpressionStatementexpression=(CallExpressionarguments=[]callee=(Identifier#0)))]
```

```
[(VariableDeclarationdeclarations=[(VariableDeclaratorid=(Identifier#0)init=(CallExpressionarguments=[]callee=(Identifier#1)))])]
```

## chunk-7jxyna5q.js:303107-313442

阅读树文件 `reconstructed\vendor\marked\lib\marked.esm.js`

官方（规范形）：

```js
var ln = {
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
  unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,
  car
```

阅读树（规范形）：

```js
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
  
```

指纹第一处不同（第 4411 个字符）：

```
lflags="g"pattern="[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)"))(ObjectPropertycomputed=falsekey=K:"unescapeTest"value=(RegExpLiteralflags="ig"pattern="&(#(?:\\d+)|(?:#x[0-9A-Fa-f]+)|(?:\\w+));?"))(ObjectPropertycomputed=falsekey=K:"caret"value=(RegExpLiteralflags="g"pattern="(^|[^\\[])\\^
```

```
lflags="g"pattern="[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)"))(ObjectPropertycomputed=falsekey=K:"unescapeTest"value=(RegExpLiteralflags="gi"pattern="&(#(?:\\d+)|(?:#x[0-9A-Fa-f]+)|(?:\\w+));?"))(ObjectPropertycomputed=falsekey=K:"caret"value=(RegExpLiteralflags="g"pattern="(^|[^\\[])\\^
```
