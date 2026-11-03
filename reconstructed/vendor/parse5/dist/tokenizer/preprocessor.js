/**
 * parse5/dist/tokenizer/preprocessor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Oe, Se, s, X, K, V } from "../common/unicode.js";
import { o } from "../../lib/common/error-codes.js";

//@ chunk-6ja29j2n.js:5754-5767 esm-layout
var mt = 65536;
//@ chunk-6ja29j2n.js:5767-8620 esm-fingerprint
class de {
  constructor(e) {
    ((this.handler = e),
      (this.html = ""),
      (this.pos = -1),
      (this.lastGapPos = -2),
      (this.gapStack = []),
      (this.skipNextNewLine = !1),
      (this.lastChunkWritten = !1),
      (this.endOfChunkHit = !1),
      (this.bufferWaterline = mt),
      (this.isEol = !1),
      (this.lineStartPos = 0),
      (this.droppedBufferSize = 0),
      (this.line = 1),
      (this.lastErrOffset = -1));
  }
  get col() {
    return this.pos - this.lineStartPos + Number(this.lastGapPos !== this.pos);
  }
  get offset() {
    return this.droppedBufferSize + this.pos;
  }
  getError(e, t) {
    let { line: line, col: col, offset: offset } = this,
      h = col + t,
      l = offset + t;
    return { code: e, startLine: line, endLine: line, startCol: h, endCol: h, startOffset: l, endOffset: l };
  }
  _err(e) {
    if (this.handler.onParseError && this.lastErrOffset !== this.offset)
      ((this.lastErrOffset = this.offset), this.handler.onParseError(this.getError(e, 0)));
  }
  _addGap() {
    (this.gapStack.push(this.lastGapPos), (this.lastGapPos = this.pos));
  }
  _processSurrogate(e) {
    if (this.pos !== this.html.length - 1) {
      let code = this.html.charCodeAt(this.pos + 1);
      if (Oe(code)) return (this.pos++, this._addGap(), Se(e, code));
    } else if (!this.lastChunkWritten) return ((this.endOfChunkHit = !0), s.EOF);
    return (this._err(o.surrogateInInputStream), e);
  }
  willDropParsedChunk() {
    return this.pos > this.bufferWaterline;
  }
  dropParsedChunk() {
    if (this.willDropParsedChunk())
      ((this.html = this.html.substring(this.pos)),
        (this.lineStartPos -= this.pos),
        (this.droppedBufferSize += this.pos),
        (this.pos = 0),
        (this.lastGapPos = -2),
        (this.gapStack.length = 0));
  }
  write(e, t) {
    if (this.html.length > 0) this.html += e;
    else this.html = e;
    ((this.endOfChunkHit = !1), (this.lastChunkWritten = t));
  }
  insertHtmlAtCurrentPos(e) {
    ((this.html = this.html.substring(0, this.pos + 1) + e + this.html.substring(this.pos + 1)),
      (this.endOfChunkHit = !1));
  }
  startsWith(e, t) {
    if (this.pos + e.length > this.html.length) return ((this.endOfChunkHit = !this.lastChunkWritten), !1);
    if (t) return this.html.startsWith(e, this.pos);
    for (let a = 0; a < e.length; a++)
      if ((this.html.charCodeAt(this.pos + a) | 32) !== e.charCodeAt(a)) return !1;
    return !0;
  }
  peek(e) {
    let t = this.pos + e;
    if (t >= this.html.length) return ((this.endOfChunkHit = !this.lastChunkWritten), s.EOF);
    let code = this.html.charCodeAt(t);
    return code === s.CARRIAGE_RETURN ? s.LINE_FEED : code;
  }
  advance() {
    if ((this.pos++, this.isEol)) ((this.isEol = !1), this.line++, (this.lineStartPos = this.pos));
    if (this.pos >= this.html.length) return ((this.endOfChunkHit = !this.lastChunkWritten), s.EOF);
    let code = this.html.charCodeAt(this.pos);
    if (code === s.CARRIAGE_RETURN) return ((this.isEol = !0), (this.skipNextNewLine = !0), s.LINE_FEED);
    if (code === s.LINE_FEED) {
      if (((this.isEol = !0), this.skipNextNewLine))
        return (this.line--, (this.skipNextNewLine = !1), this._addGap(), this.advance());
    }
    if (((this.skipNextNewLine = !1), X(code))) code = this._processSurrogate(code);
    if (!(
      this.handler.onParseError === null ||
      (code > 31 && code < 127) ||
      code === s.LINE_FEED ||
      code === s.CARRIAGE_RETURN ||
      (code > 159 && code < 64976)
    ))
      this._checkForProblematicCharacters(code);
    return code;
  }
  _checkForProblematicCharacters(e) {
    if (K(e)) this._err(o.controlCharacterInInputStream);
    else if (V(e)) this._err(o.noncharacterInInputStream);
  }
  retreat(e) {
    this.pos -= e;
    while (this.pos < this.lastGapPos) ((this.lastGapPos = this.gapStack.pop()), this.pos--);
    this.isEol = !1;
  }
}

export { de };
