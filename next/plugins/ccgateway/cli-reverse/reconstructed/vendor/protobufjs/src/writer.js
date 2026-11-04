/**
 * protobufjs/src/writer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_minimal } from "./util/minimal.js";

//@ chunk-798ashq9.js:30944-34145 cjs-fingerprint
var require_writer = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Writer;
  var util = require_minimal();
  var BufferWriter;
  var { LongBits, base64, utf8 } = util;
  function Op(fn, len, val) {
    this.fn = fn;
    this.len = len;
    this.next = undefined;
    this.val = val;
  }
  function noop() {}
  function State(writer) {
    this.head = writer.head;
    this.tail = writer.tail;
    this.len = writer.len;
    this.next = writer.states;
  }
  function Writer() {
    this.len = 0;
    this.head = new Op(noop, 0, 0);
    this.tail = this.head;
    this.states = null;
  }
  var create = function () {
    return util.Buffer
      ? function () {
          return (Writer.create = function () {
            return new BufferWriter();
          })();
        }
      : function () {
          return new Writer();
        };
  };
  Writer.create = create();
  Writer.alloc = function (size) {
    return new util.Array(size);
  };
  if (util.Array !== Array) Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);
  Writer.prototype._push = function (fn, len, val) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
  };
  function writeByte(val, buf, pos) {
    buf[pos] = val & 255;
  }
  function writeVarint32(val, buf, pos) {
    while (val > 127) {
      buf[pos++] = (val & 127) | 128;
      val >>>= 7;
    }
    buf[pos] = val;
  }
  function VarintOp(len, val) {
    this.len = len;
    this.next = undefined;
    this.val = val;
  }
  VarintOp.prototype = Object.create(Op.prototype);
  VarintOp.prototype.fn = writeVarint32;
  Writer.prototype.uint32 = function (value) {
    this.len += (this.tail = this.tail.next =
      new VarintOp(
        (value = value >>> 0) < 128 ? 1 : value < 16384 ? 2 : value < 2097152 ? 3 : value < 268435456 ? 4 : 5,
        value,
      )).len;
    return this;
  };
  Writer.prototype.int32 = function (value) {
    return value < 0 ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) : this.uint32(value);
  };
  Writer.prototype.sint32 = function (value) {
    return this.uint32(((value << 1) ^ (value >> 31)) >>> 0);
  };
  function writeVarint64(val, buf, pos) {
    while (val.hi) {
      buf[pos++] = (val.lo & 127) | 128;
      val.lo = ((val.lo >>> 7) | (val.hi << 25)) >>> 0;
      val.hi >>>= 7;
    }
    while (val.lo > 127) {
      buf[pos++] = (val.lo & 127) | 128;
      val.lo = val.lo >>> 7;
    }
    buf[pos++] = val.lo;
  }
  Writer.prototype.uint64 = function (value) {
    var bits = LongBits.from(value);
    return this._push(writeVarint64, bits.length(), bits);
  };
  Writer.prototype.int64 = Writer.prototype.uint64;
  Writer.prototype.sint64 = function (value) {
    var bits = LongBits.from(value).zzEncode();
    return this._push(writeVarint64, bits.length(), bits);
  };
  Writer.prototype.bool = function (value) {
    return this._push(writeByte, 1, value ? 1 : 0);
  };
  function writeFixed32(val, buf, pos) {
    buf[pos] = val & 255;
    buf[pos + 1] = (val >>> 8) & 255;
    buf[pos + 2] = (val >>> 16) & 255;
    buf[pos + 3] = val >>> 24;
  }
  Writer.prototype.fixed32 = function (value) {
    return this._push(writeFixed32, 4, value >>> 0);
  };
  Writer.prototype.sfixed32 = Writer.prototype.fixed32;
  Writer.prototype.fixed64 = function (value) {
    var bits = LongBits.from(value);
    return this._push(writeFixed32, 4, bits.lo)._push(writeFixed32, 4, bits.hi);
  };
  Writer.prototype.sfixed64 = Writer.prototype.fixed64;
  Writer.prototype.float = function (value) {
    return this._push(util.float.writeFloatLE, 4, value);
  };
  Writer.prototype.double = function (value) {
    return this._push(util.float.writeDoubleLE, 8, value);
  };
  var writeBytes = util.Array.prototype.set
    ? function (val, buf, pos) {
        buf.set(val, pos);
      }
    : function (val, buf, pos) {
        for (var idx = 0; idx < val.length; ++idx) buf[pos + idx] = val[idx];
      };
  Writer.prototype.bytes = function (value) {
    var len = value.length >>> 0;
    if (!len) return this._push(writeByte, 1, 0);
    if (util.isString(value)) {
      var buf = Writer.alloc((len = base64.length(value)));
      base64.decode(value, buf, 0);
      value = buf;
    }
    return this.uint32(len)._push(writeBytes, len, value);
  };
  Writer.prototype.string = function (value) {
    var len = utf8.length(value);
    return len ? this.uint32(len)._push(utf8.write, len, value) : this._push(writeByte, 1, 0);
  };
  Writer.prototype.fork = function () {
    this.states = new State(this);
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
  };
  Writer.prototype.reset = function () {
    if (this.states) {
      this.head = this.states.head;
      this.tail = this.states.tail;
      this.len = this.states.len;
      this.states = this.states.next;
    } else {
      this.head = this.tail = new Op(noop, 0, 0);
      this.len = 0;
    }
    return this;
  };
  Writer.prototype.ldelim = function () {
    var head = this.head;
    var tail = this.tail;
    var len = this.len;
    this.reset().uint32(len);
    if (len) {
      this.tail.next = head.next;
      this.tail = tail;
      this.len += len;
    }
    return this;
  };
  Writer.prototype.finish = function () {
    var head = this.head.next;
    var buf = this.constructor.alloc(this.len);
    var pos = 0;
    while (head) {
      head.fn(head.val, buf, pos);
      pos += head.len;
      head = head.next;
    }
    return buf;
  };
  Writer._configure = function (BufferWriter_) {
    BufferWriter = BufferWriter_;
    Writer.create = create();
    BufferWriter._configure();
  };
});
export { require_writer };
