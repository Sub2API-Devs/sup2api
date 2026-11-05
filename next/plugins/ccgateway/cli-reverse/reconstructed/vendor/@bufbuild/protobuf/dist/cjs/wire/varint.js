/**
 * @bufbuild/protobuf/dist/cjs/wire/varint.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:324690-327040 cjs-require-graph
var require_varint = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.varint64read = varint64read;
  cjsExports.varint64write = varint64write;
  cjsExports.int64FromString = int64FromString;
  cjsExports.int64ToString = int64ToString;
  cjsExports.uInt64ToString = uInt64ToString;
  cjsExports.varint32write = varint32write;
  cjsExports.varint32read = varint32read;
  function varint64read() {
    let lowBits = 0;
    let highBits = 0;
    for (let shift = 0; shift < 28; shift += 7) {
      let b = this.buf[this.pos++];
      lowBits |= (b & 127) << shift;
      if ((b & 128) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
      }
    }
    let middleByte = this.buf[this.pos++];
    lowBits |= (middleByte & 15) << 28;
    highBits = (middleByte & 112) >> 4;
    if ((middleByte & 128) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
    for (let shift = 3; shift <= 31; shift += 7) {
      let b = this.buf[this.pos++];
      highBits |= (b & 127) << shift;
      if ((b & 128) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
      }
    }
    throw Error("invalid varint");
  }
  function varint64write(lo, hi, bytes) {
    for (let i = 0; i < 28; i = i + 7) {
      let shift = lo >>> i;
      let hasNext = !(shift >>> 7 == 0 && hi == 0);
      let byte = (hasNext ? shift | 128 : shift) & 255;
      bytes.push(byte);
      if (!hasNext) return;
    }
    let splitBits = ((lo >>> 28) & 15) | ((hi & 7) << 4);
    let hasMoreBits = hi >> 3 != 0;
    bytes.push((hasMoreBits ? splitBits | 128 : splitBits) & 255);
    if (!hasMoreBits) return;
    for (let i = 3; i < 31; i = i + 7) {
      let shift = hi >>> i;
      let hasNext = shift >>> 7 != 0;
      let byte = (hasNext ? shift | 128 : shift) & 255;
      bytes.push(byte);
      if (!hasNext) return;
    }
    bytes.push((hi >>> 31) & 1);
  }
  var TWO_PWR_32_DBL = 4294967296;
  function int64FromString(dec) {
    let minus = dec[0] === "-";
    if (minus) dec = dec.slice(1);
    let base = 1e6;
    let lowBits = 0;
    let highBits = 0;
    function add1e6digit(begin, end) {
      let digit1e6 = Number(dec.slice(begin, end));
      highBits *= base;
      lowBits = lowBits * base + digit1e6;
      if (lowBits >= TWO_PWR_32_DBL) {
        highBits = highBits + ((lowBits / TWO_PWR_32_DBL) | 0);
        lowBits = lowBits % TWO_PWR_32_DBL;
      }
    }
    add1e6digit(-24, -18);
    add1e6digit(-18, -12);
    add1e6digit(-12, -6);
    add1e6digit(-6);
    return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
  }
  function int64ToString(lo, hi) {
    let bits = newBits(lo, hi);
    let negative = bits.hi & 2147483648;
    if (negative) bits = negate(bits.lo, bits.hi);
    let result = uInt64ToString(bits.lo, bits.hi);
    return negative ? "-" + result : result;
  }
  function uInt64ToString(lo, hi) {
    ({ lo, hi } = toUnsigned(lo, hi));
    if (hi <= 2097151) return String(TWO_PWR_32_DBL * hi + lo);
    let low = lo & 16777215;
    let mid = ((lo >>> 24) | (hi << 8)) & 16777215;
    let high = (hi >> 16) & 65535;
    let digitA = low + mid * 6777216 + high * 6710656;
    let digitB = mid + high * 8147497;
    let digitC = high * 2;
    let base = 1e7;
    if (digitA >= base) {
      digitB += Math.floor(digitA / base);
      digitA %= base;
    }
    if (digitB >= base) {
      digitC += Math.floor(digitB / base);
      digitB %= base;
    }
    return (
      digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA)
    );
  }
  function toUnsigned(lo, hi) {
    return {
      lo: lo >>> 0,
      hi: hi >>> 0,
    };
  }
  function newBits(lo, hi) {
    return {
      lo: lo | 0,
      hi: hi | 0,
    };
  }
  function negate(lowBits, highBits) {
    highBits = ~highBits;
    if (lowBits) lowBits = ~lowBits + 1;
    else highBits += 1;
    return newBits(lowBits, highBits);
  }
  var decimalFrom1e7WithLeadingZeros = (digit1e7) => {
    let partial = String(digit1e7);
    return "0000000".slice(partial.length) + partial;
  };
  function varint32write(value, bytes) {
    if (value >= 0) {
      while (value > 127) {
        bytes.push((value & 127) | 128);
        value = value >>> 7;
      }
      bytes.push(value);
    } else {
      for (let i = 0; i < 9; i++) {
        bytes.push((value & 127) | 128);
        value = value >> 7;
      }
      bytes.push(1);
    }
  }
  function varint32read() {
    let b = this.buf[this.pos++];
    let result = b & 127;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 127) << 7;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 127) << 14;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 127) << 21;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 15) << 28;
    for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++) b = this.buf[this.pos++];
    if ((b & 128) != 0) throw Error("invalid varint");
    this.assertBounds();
    return result >>> 0;
  }
});
export { require_varint };
