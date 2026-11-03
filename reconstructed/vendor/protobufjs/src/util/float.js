/**
 * protobufjs/src/util/float.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:8495-12915 cjs-require-graph
var require_float = x(function (cjsExports, cjsModule) {
  cjsModule.exports = factory(factory);
  function factory(l) {
    if (typeof Float32Array !== "undefined")
      (function () {
        var f32 = new Float32Array([-0]);
        var f8b = new Uint8Array(f32.buffer);
        var le = f8b[3] === 128;
        function writeFloat_f32_cpy(val, buf, pos) {
          f32[0] = val;
          buf[pos] = f8b[0];
          buf[pos + 1] = f8b[1];
          buf[pos + 2] = f8b[2];
          buf[pos + 3] = f8b[3];
        }
        function writeFloat_f32_rev(val, buf, pos) {
          f32[0] = val;
          buf[pos] = f8b[3];
          buf[pos + 1] = f8b[2];
          buf[pos + 2] = f8b[1];
          buf[pos + 3] = f8b[0];
        }
        l.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        l.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;
        function readFloat_f32_cpy(buf, pos) {
          f8b[0] = buf[pos];
          f8b[1] = buf[pos + 1];
          f8b[2] = buf[pos + 2];
          f8b[3] = buf[pos + 3];
          return f32[0];
        }
        function readFloat_f32_rev(buf, pos) {
          f8b[3] = buf[pos];
          f8b[2] = buf[pos + 1];
          f8b[1] = buf[pos + 2];
          f8b[0] = buf[pos + 3];
          return f32[0];
        }
        l.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        l.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;
      })();
    else
      (function () {
        function writeFloat_ieee754(writeUint, val, buf, pos) {
          var sign = val < 0 ? 1 : 0;
          if (sign) val = -val;
          if (val === 0) writeUint(1 / val > 0 ? 0 : 2147483648, buf, pos);
          else if (isNaN(val)) writeUint(2143289344, buf, pos);
          else if (val > 340282346638528860000000000000000000000)
            writeUint(((sign << 31) | 2139095040) >>> 0, buf, pos);
          else if (val < 0.000000000000000000000000000000000000011754943508222875)
            writeUint(
              ((sign << 31) |
                Math.round(val / 0.000000000000000000000000000000000000000000001401298464324817)) >>>
                0,
              buf,
              pos,
            );
          else {
            var exponent = Math.floor(Math.log(val) / Math.LN2);
            var mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
            writeUint(((sign << 31) | ((exponent + 127) << 23) | mantissa) >>> 0, buf, pos);
          }
        }
        l.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        l.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);
        function readFloat_ieee754(readUint, buf, pos) {
          var uint = readUint(buf, pos);
          var sign = (uint >> 31) * 2 + 1;
          var exponent = (uint >>> 23) & 255;
          var mantissa = uint & 8388607;
          return exponent === 255
            ? mantissa
              ? NaN
              : sign * (1 / 0)
            : exponent === 0
              ? sign * 0.000000000000000000000000000000000000000000001401298464324817 * mantissa
              : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }
        l.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        l.readFloatBE = readFloat_ieee754.bind(null, readUintBE);
      })();
    if (typeof Float64Array !== "undefined")
      (function () {
        var f64 = new Float64Array([-0]);
        var f8b = new Uint8Array(f64.buffer);
        var le = f8b[7] === 128;
        function writeDouble_f64_cpy(val, buf, pos) {
          f64[0] = val;
          buf[pos] = f8b[0];
          buf[pos + 1] = f8b[1];
          buf[pos + 2] = f8b[2];
          buf[pos + 3] = f8b[3];
          buf[pos + 4] = f8b[4];
          buf[pos + 5] = f8b[5];
          buf[pos + 6] = f8b[6];
          buf[pos + 7] = f8b[7];
        }
        function writeDouble_f64_rev(val, buf, pos) {
          f64[0] = val;
          buf[pos] = f8b[7];
          buf[pos + 1] = f8b[6];
          buf[pos + 2] = f8b[5];
          buf[pos + 3] = f8b[4];
          buf[pos + 4] = f8b[3];
          buf[pos + 5] = f8b[2];
          buf[pos + 6] = f8b[1];
          buf[pos + 7] = f8b[0];
        }
        l.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        l.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;
        function readDouble_f64_cpy(buf, pos) {
          f8b[0] = buf[pos];
          f8b[1] = buf[pos + 1];
          f8b[2] = buf[pos + 2];
          f8b[3] = buf[pos + 3];
          f8b[4] = buf[pos + 4];
          f8b[5] = buf[pos + 5];
          f8b[6] = buf[pos + 6];
          f8b[7] = buf[pos + 7];
          return f64[0];
        }
        function readDouble_f64_rev(buf, pos) {
          f8b[7] = buf[pos];
          f8b[6] = buf[pos + 1];
          f8b[5] = buf[pos + 2];
          f8b[4] = buf[pos + 3];
          f8b[3] = buf[pos + 4];
          f8b[2] = buf[pos + 5];
          f8b[1] = buf[pos + 6];
          f8b[0] = buf[pos + 7];
          return f64[0];
        }
        l.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        l.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;
      })();
    else
      (function () {
        function writeDouble_ieee754(writeUint, off0, off1, val, buf, pos) {
          var sign = val < 0 ? 1 : 0;
          if (sign) val = -val;
          if (val === 0) {
            writeUint(0, buf, pos + off0);
            writeUint(1 / val > 0 ? 0 : 2147483648, buf, pos + off1);
          } else if (isNaN(val)) {
            writeUint(0, buf, pos + off0);
            writeUint(2146959360, buf, pos + off1);
          } else if (
            val >
            179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
          ) {
            writeUint(0, buf, pos + off0);
            writeUint(((sign << 31) | 2146435072) >>> 0, buf, pos + off1);
          } else {
            var mantissa;
            if (
              val <
              0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022250738585072014
            ) {
              mantissa =
                val /
                0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005;
              writeUint(mantissa >>> 0, buf, pos + off0);
              writeUint(((sign << 31) | (mantissa / 4294967296)) >>> 0, buf, pos + off1);
            } else {
              var exponent = Math.floor(Math.log(val) / Math.LN2);
              if (exponent === 1024) exponent = 1023;
              mantissa = val * Math.pow(2, -exponent);
              writeUint((mantissa * 4503599627370496) >>> 0, buf, pos + off0);
              writeUint(
                ((sign << 31) | ((exponent + 1023) << 20) | ((mantissa * 1048576) & 1048575)) >>> 0,
                buf,
                pos + off1,
              );
            }
          }
        }
        l.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        l.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);
        function readDouble_ieee754(readUint, off0, off1, buf, pos) {
          var lo = readUint(buf, pos + off0);
          var hi = readUint(buf, pos + off1);
          var sign = (hi >> 31) * 2 + 1;
          var exponent = (hi >>> 20) & 2047;
          var mantissa = 4294967296 * (hi & 1048575) + lo;
          return exponent === 2047
            ? mantissa
              ? NaN
              : sign * (1 / 0)
            : exponent === 0
              ? sign *
                0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005 *
                mantissa
              : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }
        l.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        l.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);
      })();
    return l;
  }
  function writeUintLE(val, buf, pos) {
    buf[pos] = val & 255;
    buf[pos + 1] = (val >>> 8) & 255;
    buf[pos + 2] = (val >>> 16) & 255;
    buf[pos + 3] = val >>> 24;
  }
  function writeUintBE(val, buf, pos) {
    buf[pos] = val >>> 24;
    buf[pos + 1] = (val >>> 16) & 255;
    buf[pos + 2] = (val >>> 8) & 255;
    buf[pos + 3] = val & 255;
  }
  function readUintLE(buf, pos) {
    return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0;
  }
  function readUintBE(buf, pos) {
    return ((buf[pos] << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3]) >>> 0;
  }
});
export { require_float };
