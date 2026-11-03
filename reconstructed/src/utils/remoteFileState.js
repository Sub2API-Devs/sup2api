/**
 * utils/remoteFileState.ts
 *
 * 远程文件状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (19)
 * attribution: placement 19
 */
import { createHash } from "crypto";
import { normalize, normalize as normalize_2, normalize as normalize_3 } from "path";
import { FILE_UNEXPECTEDLY_MODIFIED_ERROR } from "../tools/FileEditTool/constants.js";
import { countCharInString } from "./stringUtils.js";
import { Dc } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { Z2 } from "../bridge/deviceRegistration.js";

//@ chunk-82kqcve8.js:77723-77831 placement
function contentDigest(e) {
  return {
    sha256: createHash("sha256").update(e, "utf8").digest("hex"),
    bytes: Buffer.byteLength(e, "utf8"),
  };
}
//@ chunk-82kqcve8.js:77831-77919 placement
function aFe(e, n) {
  return Buffer.byteLength(n, "utf8") === e.bytes && contentDigest(n).sha256 === e.sha256;
}
//@ chunk-82kqcve8.js:77919-78043 placement
var FILE_MODIFIED_SINCE_READ_ERROR =
  "File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.";
//@ chunk-82kqcve8.js:78043-78220 placement
function REMOTE_FILE_MODIFIED_ERROR(e) {
  return e === void 0
    ? FILE_MODIFIED_SINCE_READ_ERROR
    : `File has been modified on ${e} since this session read it. Read it again there (Read with "_host": "${e}") before attempting to write it.`;
}
/**
 * 文件自读取后被修改的错误文案（远程主机时提示用 _host 在该主机重新读取）。
 */
//@ chunk-82kqcve8.js:78220-78382 placement
function fileModifiedErrorFor(e) {
  return e === void 0
    ? FILE_UNEXPECTEDLY_MODIFIED_ERROR
    : `File content on ${e} has changed since this session read it. Read it again there (Read with "_host": "${e}"), then retry.`;
}
//@ chunk-82kqcve8.js:78382-78414 placement
var ZC = 5000,
  Om = 26214400,
  Dm = 4096;
//@ chunk-82kqcve8.js:78414-78462 placement
function p9r(e) {
  return Bun.hash(e).toString(36);
}
/**
 * 判断读取记录是否覆盖了整个文件（从开头读且未达行数上限、非部分视图）。
 */
//@ chunk-82kqcve8.js:78462-78602 placement
function isFullFileView(e) {
  if ((e.offset ?? 1) > 1 || e.isPartialView) return !1;
  if (e.limit === void 0) return !0;
  return (
    e.content !== "" &&
    countCharInString(
      e.content,
      `
`,
    ) +
      1 <
      e.limit
  );
}
//@ chunk-82kqcve8.js:78602-78672 placement
function Gie(e) {
  return e !== void 0 && isFullFileView(e) && !e.contentNotInModelContext;
}
//@ chunk-82kqcve8.js:78672-78766 placement
function y1(e, n) {
  if (e.contentHash !== void 0) return e.contentHash === p9r(n);
  return e.content === n;
}
/**
 * 判断当前文件内容是否与读取记录一致（来自转录的内容允许末尾多一个换行）。
 */
//@ chunk-82kqcve8.js:78766-78867 placement
function matchesReadContent(e, n) {
  return (
    Ia(e, n) ||
    (e.contentFromTranscript === !0 &&
      n.endsWith(`
`) &&
      Ia(e, n.slice(0, -1)))
  );
}
//@ chunk-82kqcve8.js:78867-78945 placement
function Ia(e, n) {
  return e.readBaseline !== void 0 ? aFe(e.readBaseline, n) : y1(e, n);
}
//@ chunk-82kqcve8.js:78945-79004 placement
function tv(e) {
  return e.charCodeAt(0) === 65279 ? e.slice(1) : e;
}
//@ chunk-82kqcve8.js:79004-79054 placement
function __(e) {
  return tv(e).replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-82kqcve8.js:79054-79091 placement
function Bir(e, n) {
  return y1(e, __(n));
}
//@ chunk-82kqcve8.js:79091-80746 placement
class RemoteFileState {
  keepsReadBaselines;
  cache;
  everHeld = new Set();
  startOnly = new Set();
  constructor(e, n, r = !1) {
    this.keepsReadBaselines = r;
    this.cache = new Dc({
      max: e,
      maxSize: n,
      sizeCalculation: (s) => Math.max(1, Buffer.byteLength(s.content)),
    });
  }
  get(e) {
    return this.cache.get(normalize_3(e));
  }
  markStartOnly(e) {
    this.startOnly.add(normalize_3(e));
  }
  startOnlyPaths() {
    return [...this.startOnly];
  }
  holdsOnlyStartOf(e) {
    let n = normalize_3(e);
    return this.startOnly.has(n) && !Gie(this.cache.get(n));
  }
  set(e, n) {
    let r = normalize_3(e),
      s = this.cache.get(r),
      h = n.keepContent ?? s?.keepContent,
      y = n.contentHash ?? p9r(n.content),
      w = n.contentLength ?? n.content.length,
      S = n.content !== "" || n.contentHash === void 0,
      R = !(this.keepsReadBaselines || Z2())
        ? void 0
        : S && !n.contentFromTranscript && isFullFileView(n)
          ? contentDigest(n.content)
          : (n.readBaseline ?? (y === s?.contentHash ? s?.readBaseline : void 0)),
      O = h && n.content === "" && y === s?.contentHash && s.content ? s.content : n.content,
      P = h || Buffer.byteLength(O) <= Dm ? O : "";
    return (
      this.cache.set(r, {
        ...n,
        keepContent: h,
        contentHash: y,
        contentLength: w,
        content: P,
        readBaseline: R,
      }),
      this.remember(r),
      this
    );
  }
  remember(e) {
    if ((this.everHeld.delete(e), this.everHeld.add(e), this.everHeld.size > this.cache.max))
      for (let n of this.everHeld) {
        this.everHeld.delete(n);
        break;
      }
  }
  has(e) {
    return this.cache.has(normalize_3(e));
  }
  delete(e) {
    return this.cache.delete(normalize_3(e));
  }
  clear() {
    this.cache.clear();
  }
  get size() {
    return this.cache.size;
  }
  get max() {
    return this.cache.max;
  }
  get maxSize() {
    return this.cache.maxSize;
  }
  get calculatedSize() {
    return this.cache.calculatedSize;
  }
  keys() {
    return this.cache.keys();
  }
  everHeldPaths() {
    return new Set([...this.everHeld, ...this.cache.keys()]);
  }
  entries() {
    return this.cache.entries();
  }
  dump() {
    return this.cache.dump();
  }
  load(e) {
    this.cache.load(e);
    for (let n of this.cache.rkeys()) this.remember(n);
  }
}
//@ chunk-82kqcve8.js:80746-80792 placement
function nv(e, n = Om, r = !1) {
  return new RemoteFileState(e, n, r);
}
//@ chunk-82kqcve8.js:80792-80847 placement
function jir(e) {
  return Object.fromEntries(e.entries());
}
//@ chunk-82kqcve8.js:80847-80891 placement
function bAt(e) {
  return Array.from(e.keys());
}

export {
  nv,
  p9r,
  __,
  tv,
  ZC,
  y1,
  isFullFileView,
  bAt,
  Gie,
  matchesReadContent,
  jir,
  aFe,
  fileModifiedErrorFor,
  REMOTE_FILE_MODIFIED_ERROR,
  Bir,
};
