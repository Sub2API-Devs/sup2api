/**
 * utils/confusables.ts
 *
 * 2.1.316 新增：Unicode 易混淆字符表与提示词注入防护用的标签/标记清洗正则（antml、system-reminder 等的变体）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p5akk6be.js (48)
 * attribution: placement 48
 */
import { truncateToLength } from "./stringUtils.js";
import {
  BRACKET_CONFUSABLES_2,
  BRACKET_CONFUSABLES_WITH_ANGLES,
  normalizeNfkc,
  nfkdNormalize,
  stripCombiningRepeated,
} from "./sanitization.js";
import { escapeInvisibleChars, toUnicodeEscapes } from "./resultError.js";
import { HTML_ENTITY_RE, HTML_ENTITY_MAP } from "../../vendor/es-toolkit/dist/string/unescape.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p5akk6be.js:284-23659 placement
/**
 * 每个拉丁字母的全角、数学字母、带圈、西里尔/希腊形近字符表（约 23 KB）。
 */
var LATIN_CONFUSABLES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p5akk6be.js:284", () => {
  LATIN_CONFUSABLES = new Map([
    [
      "a",
      "aA\uFF21\uFF41\uD835\uDC00\uD835\uDC1A\uD835\uDC34\uD835\uDC4E\uD835\uDC68\uD835\uDC82\uD835\uDC9C\uD835\uDCB6\uD835\uDCD0\uD835\uDCEA\uD835\uDD04\uD835\uDD1E\uD835\uDD38\uD835\uDD52\uD835\uDD6C\uD835\uDD86\uD835\uDDA0\uD835\uDDBA\uD835\uDDD4\uD835\uDDEE\uD835\uDE08\uD835\uDE22\uD835\uDE3C\uD835\uDE56\uD835\uDE70\uD835\uDE8A\u24B6\u24D0\u0430\u03B1\u1D00\u0251\uAB7A\uA4EE\u2C81\u0410\u0391\u2C6D\u13AA\u2C80\xC0\xC1\xC2\xC3\xC4\xC5\xE0\xE1\xE2\xE3\xE4\xE5\u0100\u0101\u0102\u0103\u0104\u0105\u01CD\u01CE\u01DE\u01DF\u01E0\u01E1\u01FA\u01FB\u0200\u0201\u0202\u0203\u0226\u0227\u1E00\u1E01\u1EA0\u1EA1\u1EA2\u1EA3\u1EA4\u1EA5\u1EA6\u1EA7\u1EA8\u1EA9\u1EAA\u1EAB\u1EAC\u1EAD\u1EAE\u1EAF\u1EB0\u1EB1\u1EB2\u1EB3\u1EB4\u1EB5\u1EB6\u1EB7\u212B\uD835\uDC00\uD835\uDC1A\uD835\uDC34\uD835\uDC4E\uD835\uDC68\uD835\uDC82\uD835\uDC9C\uD835\uDCB6\uD835\uDCD0\uD835\uDCEA\uD835\uDD04\uD835\uDD1E\uD835\uDD38\uD835\uDD52\uD835\uDD6C\uD835\uDD86\uD835\uDDA0\uD835\uDDBA\uD835\uDDD4\uD835\uDDEE\uD835\uDE08\uD835\uDE22\uD835\uDE3C\uD835\uDE56\uD835\uDE70\uD835\uDE8A\uD835\uDEA8\uD835\uDEC2\uD835\uDEE2\uD835\uDEFC\uD835\uDF1C\uD835\uDF36\uD835\uDF56\uD835\uDF70\uD835\uDF90\uD835\uDFAA\u1D2C\u1D43\u1D45\u2090",
    ],
    [
      "b",
      "bB\uFF22\uFF42\uD835\uDC01\uD835\uDC1B\uD835\uDC35\uD835\uDC4F\uD835\uDC69\uD835\uDC83\uD835\uDC9D\uD835\uDCB7\uD835\uDCD1\uD835\uDCEB\uD835\uDD05\uD835\uDD1F\uD835\uDD39\uD835\uDD53\uD835\uDD6D\uD835\uDD87\uD835\uDDA1\uD835\uDDBB\uD835\uDDD5\uD835\uDDEF\uD835\uDE09\uD835\uDE23\uD835\uDE3D\uD835\uDE57\uD835\uDE71\uD835\uDE8B\u24B7\u24D1\u212C\u0412\u0392\u0299\uAB9F\u13FC\uA4D0\u2C83\u13CF\u13F4\u2C82\u1E02\u1E03\u1E04\u1E05\u1E06\u1E07\uD835\uDC01\uD835\uDC1B\uD835\uDC35\uD835\uDC4F\uD835\uDC69\uD835\uDC83\uD835\uDCB7\uD835\uDCD1\uD835\uDCEB\uD835\uDD05\uD835\uDD1F\uD835\uDD39\uD835\uDD53\uD835\uDD6D\uD835\uDD87\uD835\uDDA1\uD835\uDDBB\uD835\uDDD5\uD835\uDDEF\uD835\uDE09\uD835\uDE23\uD835\uDE3D\uD835\uDE57\uD835\uDE71\uD835\uDE8B\uD835\uDEA9\uD835\uDEE3\uD835\uDF1D\uD835\uDF57\uD835\uDF91\u1D2E\u1D47",
    ],
    [
      "c",
      "cC\uFF23\uFF43\uD835\uDC02\uD835\uDC1C\uD835\uDC36\uD835\uDC50\uD835\uDC6A\uD835\uDC84\uD835\uDC9E\uD835\uDCB8\uD835\uDCD2\uD835\uDCEC\uD835\uDD06\uD835\uDD20\uD835\uDD3A\uD835\uDD54\uD835\uDD6E\uD835\uDD88\uD835\uDDA2\uD835\uDDBC\uD835\uDDD6\uD835\uDDF0\uD835\uDE0A\uD835\uDE24\uD835\uDE3E\uD835\uDE58\uD835\uDE72\uD835\uDE8C\u24B8\u24D2\u2102\u212D\u0441\u1D04\uABAF\uA4DA\u03F2\u2CA5\u0421\u13DF\u03F9\u2CA4\xC7\xE7\u0106\u0107\u0108\u0109\u010A\u010B\u010C\u010D\u1E08\u1E09\uD835\uDC02\uD835\uDC1C\uD835\uDC36\uD835\uDC50\uD835\uDC6A\uD835\uDC84\uD835\uDC9E\uD835\uDCB8\uD835\uDCD2\uD835\uDCEC\uD835\uDD20\uD835\uDD54\uD835\uDD6E\uD835\uDD88\uD835\uDDA2\uD835\uDDBC\uD835\uDDD6\uD835\uDDF0\uD835\uDE0A\uD835\uDE24\uD835\uDE3E\uD835\uDE58\uD835\uDE72\uD835\uDE8C\u1D9C\u216D\u217D\uA7F2",
    ],
    [
      "d",
      "dD\uFF24\uFF44\uD835\uDC03\uD835\uDC1D\uD835\uDC37\uD835\uDC51\uD835\uDC6B\uD835\uDC85\uD835\uDC9F\uD835\uDCB9\uD835\uDCD3\uD835\uDCED\uD835\uDD07\uD835\uDD21\uD835\uDD3B\uD835\uDD55\uD835\uDD6F\uD835\uDD89\uD835\uDDA3\uD835\uDDBD\uD835\uDDD7\uD835\uDDF1\uD835\uDE0B\uD835\uDE25\uD835\uDE3F\uD835\uDE59\uD835\uDE73\uD835\uDE8D\u24B9\u24D3\u2145\u2146\u0501\u1D05\uAB70\uABB7\uA4D3\u0500\u13A0\u13E7\u010E\u010F\u1E0A\u1E0B\u1E0C\u1E0D\u1E0E\u1E0F\u1E10\u1E11\u1E12\u1E13\uD835\uDC03\uD835\uDC1D\uD835\uDC37\uD835\uDC51\uD835\uDC6B\uD835\uDC85\uD835\uDC9F\uD835\uDCB9\uD835\uDCD3\uD835\uDCED\uD835\uDD07\uD835\uDD21\uD835\uDD3B\uD835\uDD55\uD835\uDD6F\uD835\uDD89\uD835\uDDA3\uD835\uDDBD\uD835\uDDD7\uD835\uDDF1\uD835\uDE0B\uD835\uDE25\uD835\uDE3F\uD835\uDE59\uD835\uDE73\uD835\uDE8D\u1D30\u1D48\u216E\u217E",
    ],
    [
      "e",
      "eE\uFF25\uFF45\uD835\uDC04\uD835\uDC1E\uD835\uDC38\uD835\uDC52\uD835\uDC6C\uD835\uDC86\uD835\uDCA0\uD835\uDCBA\uD835\uDCD4\uD835\uDCEE\uD835\uDD08\uD835\uDD22\uD835\uDD3C\uD835\uDD56\uD835\uDD70\uD835\uDD8A\uD835\uDDA4\uD835\uDDBE\uD835\uDDD8\uD835\uDDF2\uD835\uDE0C\uD835\uDE26\uD835\uDE40\uD835\uDE5A\uD835\uDE74\uD835\uDE8E\u24BA\u24D4\u212F\u2130\u2147\u0435\u03B5\u1D07\uAB7C\uA4F0\u2C89\u0415\u0395\u13AC\u2C88\xC8\xC9\xCA\xCB\xE8\xE9\xEA\xEB\u0112\u0113\u0114\u0115\u0116\u0117\u0118\u0119\u011A\u011B\u0204\u0205\u0206\u0207\u0228\u0229\u1E14\u1E15\u1E16\u1E17\u1E18\u1E19\u1E1A\u1E1B\u1E1C\u1E1D\u1EB8\u1EB9\u1EBA\u1EBB\u1EBC\u1EBD\u1EBE\u1EBF\u1EC0\u1EC1\u1EC2\u1EC3\u1EC4\u1EC5\u1EC6\u1EC7\uD835\uDC04\uD835\uDC1E\uD835\uDC38\uD835\uDC52\uD835\uDC6C\uD835\uDC86\uD835\uDCD4\uD835\uDCEE\uD835\uDD08\uD835\uDD22\uD835\uDD3C\uD835\uDD56\uD835\uDD70\uD835\uDD8A\uD835\uDDA4\uD835\uDDBE\uD835\uDDD8\uD835\uDDF2\uD835\uDE0C\uD835\uDE26\uD835\uDE40\uD835\uDE5A\uD835\uDE74\uD835\uDE8E\uD835\uDEAC\uD835\uDEC6\uD835\uDEDC\uD835\uDEE6\uD835\uDF00\uD835\uDF16\uD835\uDF20\uD835\uDF3A\uD835\uDF50\uD835\uDF5A\uD835\uDF74\uD835\uDF8A\uD835\uDF94\uD835\uDFAE\uD835\uDFC4\u1D31\u1D49\u2091",
    ],
    [
      "f",
      "fF\uFF26\uFF46\uD835\uDC05\uD835\uDC1F\uD835\uDC39\uD835\uDC53\uD835\uDC6D\uD835\uDC87\uD835\uDCA1\uD835\uDCBB\uD835\uDCD5\uD835\uDCEF\uD835\uDD09\uD835\uDD23\uD835\uDD3D\uD835\uDD57\uD835\uDD71\uD835\uDD8B\uD835\uDDA5\uD835\uDDBF\uD835\uDDD9\uD835\uDDF3\uD835\uDE0D\uD835\uDE27\uD835\uDE41\uD835\uDE5B\uD835\uDE75\uD835\uDE8F\u24BB\u24D5\u2131\uA730\uA4DD\u1E1E\u1E1F\uD835\uDC05\uD835\uDC1F\uD835\uDC39\uD835\uDC53\uD835\uDC6D\uD835\uDC87\uD835\uDCBB\uD835\uDCD5\uD835\uDCEF\uD835\uDD09\uD835\uDD23\uD835\uDD3D\uD835\uDD57\uD835\uDD71\uD835\uDD8B\uD835\uDDA5\uD835\uDDBF\uD835\uDDD9\uD835\uDDF3\uD835\uDE0D\uD835\uDE27\uD835\uDE41\uD835\uDE5B\uD835\uDE75\uD835\uDE8F\u1DA0\uA7F3",
    ],
    [
      "g",
      "gG\uFF27\uFF47\uD835\uDC06\uD835\uDC20\uD835\uDC3A\uD835\uDC54\uD835\uDC6E\uD835\uDC88\uD835\uDCA2\uD835\uDCBC\uD835\uDCD6\uD835\uDCF0\uD835\uDD0A\uD835\uDD24\uD835\uDD3E\uD835\uDD58\uD835\uDD72\uD835\uDD8C\uD835\uDDA6\uD835\uDDC0\uD835\uDDDA\uD835\uDDF4\uD835\uDE0E\uD835\uDE28\uD835\uDE42\uD835\uDE5C\uD835\uDE76\uD835\uDE90\u24BC\u24D6\u210A\u0262\u0261\uAB90\uA4D6\u0581\uA7AC\u13C0\u0551\u011C\u011D\u011E\u011F\u0120\u0121\u0122\u0123\u01E6\u01E7\u01F4\u01F5\u1E20\u1E21\uD835\uDC06\uD835\uDC20\uD835\uDC3A\uD835\uDC54\uD835\uDC6E\uD835\uDC88\uD835\uDCA2\uD835\uDCD6\uD835\uDCF0\uD835\uDD0A\uD835\uDD24\uD835\uDD3E\uD835\uDD58\uD835\uDD72\uD835\uDD8C\uD835\uDDA6\uD835\uDDC0\uD835\uDDDA\uD835\uDDF4\uD835\uDE0E\uD835\uDE28\uD835\uDE42\uD835\uDE5C\uD835\uDE76\uD835\uDE90\u1D33\u1D4D\u1DA2",
    ],
    [
      "h",
      "hH\uFF28\uFF48\uD835\uDC07\uD835\uDC21\uD835\uDC3B\uD835\uDC55\uD835\uDC6F\uD835\uDC89\uD835\uDCA3\uD835\uDCBD\uD835\uDCD7\uD835\uDCF1\uD835\uDD0B\uD835\uDD25\uD835\uDD3F\uD835\uDD59\uD835\uDD73\uD835\uDD8D\uD835\uDDA7\uD835\uDDC1\uD835\uDDDB\uD835\uDDF5\uD835\uDE0F\uD835\uDE29\uD835\uDE43\uD835\uDE5D\uD835\uDE77\uD835\uDE91\u24BD\u24D7\u210B\u210C\u210D\u210E\u04BB\u041D\u0397\u029C\uAB8B\uAB92\uA4E7\u0570\u2C8F\u04BA\u13BB\u13C2\u0540\u2C8E\u0124\u0125\u021E\u021F\u1E22\u1E23\u1E24\u1E25\u1E26\u1E27\u1E28\u1E29\u1E2A\u1E2B\u1E96\uD835\uDC07\uD835\uDC21\uD835\uDC3B\uD835\uDC6F\uD835\uDC89\uD835\uDCBD\uD835\uDCD7\uD835\uDCF1\uD835\uDD25\uD835\uDD59\uD835\uDD73\uD835\uDD8D\uD835\uDDA7\uD835\uDDC1\uD835\uDDDB\uD835\uDDF5\uD835\uDE0F\uD835\uDE29\uD835\uDE43\uD835\uDE5D\uD835\uDE77\uD835\uDE91\uD835\uDEAE\uD835\uDEE8\uD835\uDF22\uD835\uDF5C\uD835\uDF96\u02B0\u1D34\u2095",
    ],
    [
      "i",
      "iI\uFF29\uFF49\uD835\uDC08\uD835\uDC22\uD835\uDC3C\uD835\uDC56\uD835\uDC70\uD835\uDC8A\uD835\uDCA4\uD835\uDCBE\uD835\uDCD8\uD835\uDCF2\uD835\uDD0C\uD835\uDD26\uD835\uDD40\uD835\uDD5A\uD835\uDD74\uD835\uDD8E\uD835\uDDA8\uD835\uDDC2\uD835\uDDDC\uD835\uDDF6\uD835\uDE10\uD835\uDE2A\uD835\uDE44\uD835\uDE5E\uD835\uDE78\uD835\uDE92\u24BE\u24D8\u2110\u2111\u2139\u2148\u0456\u03B9\u026A\u0131\uA4F2\u0269\u2C93\u0406\u0399\uA7AE\u0196\u2C92\xCC\xCD\xCE\xCF\xEC\xED\xEE\xEF\u0128\u0129\u012A\u012B\u012C\u012D\u012E\u012F\u0130\u01CF\u01D0\u0208\u0209\u020A\u020B\u1E2C\u1E2D\u1E2E\u1E2F\u1EC8\u1EC9\u1ECA\u1ECB\uD835\uDC08\uD835\uDC22\uD835\uDC3C\uD835\uDC56\uD835\uDC70\uD835\uDC8A\uD835\uDCBE\uD835\uDCD8\uD835\uDCF2\uD835\uDD26\uD835\uDD40\uD835\uDD5A\uD835\uDD74\uD835\uDD8E\uD835\uDDA8\uD835\uDDC2\uD835\uDDDC\uD835\uDDF6\uD835\uDE10\uD835\uDE2A\uD835\uDE44\uD835\uDE5E\uD835\uDE78\uD835\uDE92\uD835\uDEA4\uD835\uDEB0\uD835\uDECA\uD835\uDEEA\uD835\uDF04\uD835\uDF24\uD835\uDF3E\uD835\uDF5E\uD835\uDF78\uD835\uDF98\uD835\uDFB2\u1D35\u1D62\u1DA5\u1DA6\u2071\u2160\u2170",
    ],
    [
      "j",
      "jJ\uFF2A\uFF4A\uD835\uDC09\uD835\uDC23\uD835\uDC3D\uD835\uDC57\uD835\uDC71\uD835\uDC8B\uD835\uDCA5\uD835\uDCBF\uD835\uDCD9\uD835\uDCF3\uD835\uDD0D\uD835\uDD27\uD835\uDD41\uD835\uDD5B\uD835\uDD75\uD835\uDD8F\uD835\uDDA9\uD835\uDDC3\uD835\uDDDD\uD835\uDDF7\uD835\uDE11\uD835\uDE2B\uD835\uDE45\uD835\uDE5F\uD835\uDE79\uD835\uDE93\u24BF\u24D9\u2149\u0458\u03F3\u1D0A\uAB7B\uA4D9\u0408\u037F\u13AB\u0134\u0135\u01F0\uD835\uDC09\uD835\uDC23\uD835\uDC3D\uD835\uDC57\uD835\uDC71\uD835\uDC8B\uD835\uDCA5\uD835\uDCBF\uD835\uDCD9\uD835\uDCF3\uD835\uDD0D\uD835\uDD27\uD835\uDD41\uD835\uDD5B\uD835\uDD75\uD835\uDD8F\uD835\uDDA9\uD835\uDDC3\uD835\uDDDD\uD835\uDDF7\uD835\uDE11\uD835\uDE2B\uD835\uDE45\uD835\uDE5F\uD835\uDE79\uD835\uDE93\u02B2\u1D36",
    ],
    [
      "k",
      "kK\uFF2B\uFF4B\uD835\uDC0A\uD835\uDC24\uD835\uDC3E\uD835\uDC58\uD835\uDC72\uD835\uDC8C\uD835\uDCA6\uD835\uDCC0\uD835\uDCDA\uD835\uDCF4\uD835\uDD0E\uD835\uDD28\uD835\uDD42\uD835\uDD5C\uD835\uDD76\uD835\uDD90\uD835\uDDAA\uD835\uDDC4\uD835\uDDDE\uD835\uDDF8\uD835\uDE12\uD835\uDE2C\uD835\uDE46\uD835\uDE60\uD835\uDE7A\uD835\uDE94\u24C0\u24DA\u212A\u043A\u03BA\u1D0B\uABB6\uA4D7\u2C95\u041A\u039A\u13E6\u2C94\u0136\u0137\u01E8\u01E9\u1E30\u1E31\u1E32\u1E33\u1E34\u1E35\uD835\uDC0A\uD835\uDC24\uD835\uDC3E\uD835\uDC58\uD835\uDC72\uD835\uDC8C\uD835\uDCA6\uD835\uDCC0\uD835\uDCDA\uD835\uDCF4\uD835\uDD0E\uD835\uDD28\uD835\uDD42\uD835\uDD5C\uD835\uDD76\uD835\uDD90\uD835\uDDAA\uD835\uDDC4\uD835\uDDDE\uD835\uDDF8\uD835\uDE12\uD835\uDE2C\uD835\uDE46\uD835\uDE60\uD835\uDE7A\uD835\uDE94\uD835\uDEB1\uD835\uDECB\uD835\uDEDE\uD835\uDEEB\uD835\uDF05\uD835\uDF18\uD835\uDF25\uD835\uDF3F\uD835\uDF52\uD835\uDF5F\uD835\uDF79\uD835\uDF8C\uD835\uDF99\uD835\uDFB3\uD835\uDFC6\u1D37\u1D4F\u2096",
    ],
    [
      "l",
      "lL\uFF2C\uFF4C\uD835\uDC0B\uD835\uDC25\uD835\uDC3F\uD835\uDC59\uD835\uDC73\uD835\uDC8D\uD835\uDCA7\uD835\uDCC1\uD835\uDCDB\uD835\uDCF5\uD835\uDD0F\uD835\uDD29\uD835\uDD43\uD835\uDD5D\uD835\uDD77\uD835\uDD91\uD835\uDDAB\uD835\uDDC5\uD835\uDDDF\uD835\uDDF9\uD835\uDE13\uD835\uDE2D\uD835\uDE47\uD835\uDE61\uD835\uDE7B\uD835\uDE95\u24C1\u24DB\u2112\u2113\u04CF\u029F\uABAE\uA4E1\u04C0\u13DE\u0139\u013A\u013B\u013C\u013D\u013E\u1E36\u1E37\u1E38\u1E39\u1E3A\u1E3B\u1E3C\u1E3D\uD835\uDC0B\uD835\uDC25\uD835\uDC3F\uD835\uDC59\uD835\uDC73\uD835\uDC8D\uD835\uDCC1\uD835\uDCDB\uD835\uDCF5\uD835\uDD0F\uD835\uDD29\uD835\uDD43\uD835\uDD5D\uD835\uDD77\uD835\uDD91\uD835\uDDAB\uD835\uDDC5\uD835\uDDDF\uD835\uDDF9\uD835\uDE13\uD835\uDE2D\uD835\uDE47\uD835\uDE61\uD835\uDE7B\uD835\uDE95\u02E1\u1D38\u1DAB\u2097\u216C\u217C",
    ],
    [
      "m",
      "mM\uFF2D\uFF4D\uD835\uDC0C\uD835\uDC26\uD835\uDC40\uD835\uDC5A\uD835\uDC74\uD835\uDC8E\uD835\uDCA8\uD835\uDCC2\uD835\uDCDC\uD835\uDCF6\uD835\uDD10\uD835\uDD2A\uD835\uDD44\uD835\uDD5E\uD835\uDD78\uD835\uDD92\uD835\uDDAC\uD835\uDDC6\uD835\uDDE0\uD835\uDDFA\uD835\uDE14\uD835\uDE2E\uD835\uDE48\uD835\uDE62\uD835\uDE7C\uD835\uDE96\u24C2\u24DC\u2133\u041C\u039C\u1D0D\u043C\uAB87\uA4DF\u2C99\u13B7\u2C98\u1E3E\u1E3F\u1E40\u1E41\u1E42\u1E43\uD835\uDC0C\uD835\uDC26\uD835\uDC40\uD835\uDC5A\uD835\uDC74\uD835\uDC8E\uD835\uDCC2\uD835\uDCDC\uD835\uDCF6\uD835\uDD10\uD835\uDD2A\uD835\uDD44\uD835\uDD5E\uD835\uDD78\uD835\uDD92\uD835\uDDAC\uD835\uDDC6\uD835\uDDE0\uD835\uDDFA\uD835\uDE14\uD835\uDE2E\uD835\uDE48\uD835\uDE62\uD835\uDE7C\uD835\uDE96\uD835\uDEB3\uD835\uDEED\uD835\uDF27\uD835\uDF61\uD835\uDF9B\u1D39\u1D50\u2098\u216F\u217F",
    ],
    [
      "n",
      "nN\uFF2E\uFF4E\uD835\uDC0D\uD835\uDC27\uD835\uDC41\uD835\uDC5B\uD835\uDC75\uD835\uDC8F\uD835\uDCA9\uD835\uDCC3\uD835\uDCDD\uD835\uDCF7\uD835\uDD11\uD835\uDD2B\uD835\uDD45\uD835\uDD5F\uD835\uDD79\uD835\uDD93\uD835\uDDAD\uD835\uDDC7\uD835\uDDE1\uD835\uDDFB\uD835\uDE15\uD835\uDE2F\uD835\uDE49\uD835\uDE63\uD835\uDE7D\uD835\uDE97\u24C3\u24DD\u2115\u039D\u0274\uA4E0\u0578\u2C9B\u0548\u2C9A\xD1\xF1\u0143\u0144\u0145\u0146\u0147\u0148\u01F8\u01F9\u1E44\u1E45\u1E46\u1E47\u1E48\u1E49\u1E4A\u1E4B\uD835\uDC0D\uD835\uDC27\uD835\uDC41\uD835\uDC5B\uD835\uDC75\uD835\uDC8F\uD835\uDCA9\uD835\uDCC3\uD835\uDCDD\uD835\uDCF7\uD835\uDD11\uD835\uDD2B\uD835\uDD5F\uD835\uDD79\uD835\uDD93\uD835\uDDAD\uD835\uDDC7\uD835\uDDE1\uD835\uDDFB\uD835\uDE15\uD835\uDE2F\uD835\uDE49\uD835\uDE63\uD835\uDE7D\uD835\uDE97\uD835\uDEB4\uD835\uDEEE\uD835\uDF28\uD835\uDF62\uD835\uDF9C\u1D3A\u1DB0\u207F\u2099",
    ],
    [
      "o",
      "oO\uFF2F\uFF4F\uD835\uDC0E\uD835\uDC28\uD835\uDC42\uD835\uDC5C\uD835\uDC76\uD835\uDC90\uD835\uDCAA\uD835\uDCC4\uD835\uDCDE\uD835\uDCF8\uD835\uDD12\uD835\uDD2C\uD835\uDD46\uD835\uDD60\uD835\uDD7A\uD835\uDD94\uD835\uDDAE\uD835\uDDC8\uD835\uDDE2\uD835\uDDFC\uD835\uDE16\uD835\uDE30\uD835\uDE4A\uD835\uDE64\uD835\uDE7E\uD835\uDE98\u24C4\u24DE\u2134\u043E\u03BF\u1D0F\uA4F3\u0585\u2C9F\u041E\u039F\u0555\u2C9E\xD2\xD3\xD4\xD5\xD6\xF2\xF3\xF4\xF5\xF6\u014C\u014D\u014E\u014F\u0150\u0151\u01A0\u01A1\u01D1\u01D2\u01EA\u01EB\u01EC\u01ED\u020C\u020D\u020E\u020F\u022A\u022B\u022C\u022D\u022E\u022F\u0230\u0231\u1E4C\u1E4D\u1E4E\u1E4F\u1E50\u1E51\u1E52\u1E53\u1ECC\u1ECD\u1ECE\u1ECF\u1ED0\u1ED1\u1ED2\u1ED3\u1ED4\u1ED5\u1ED6\u1ED7\u1ED8\u1ED9\u1EDA\u1EDB\u1EDC\u1EDD\u1EDE\u1EDF\u1EE0\u1EE1\u1EE2\u1EE3\uD835\uDC0E\uD835\uDC28\uD835\uDC42\uD835\uDC5C\uD835\uDC76\uD835\uDC90\uD835\uDCAA\uD835\uDCDE\uD835\uDCF8\uD835\uDD12\uD835\uDD2C\uD835\uDD46\uD835\uDD60\uD835\uDD7A\uD835\uDD94\uD835\uDDAE\uD835\uDDC8\uD835\uDDE2\uD835\uDDFC\uD835\uDE16\uD835\uDE30\uD835\uDE4A\uD835\uDE64\uD835\uDE7E\uD835\uDE98\uD835\uDEB6\uD835\uDED0\uD835\uDEF0\uD835\uDF0A\uD835\uDF2A\uD835\uDF44\uD835\uDF64\uD835\uDF7E\uD835\uDF9E\uD835\uDFB8\u1D3C\u1D52\u2092",
    ],
    [
      "p",
      "pP\uFF30\uFF50\uD835\uDC0F\uD835\uDC29\uD835\uDC43\uD835\uDC5D\uD835\uDC77\uD835\uDC91\uD835\uDCAB\uD835\uDCC5\uD835\uDCDF\uD835\uDCF9\uD835\uDD13\uD835\uDD2D\uD835\uDD47\uD835\uDD61\uD835\uDD7B\uD835\uDD95\uD835\uDDAF\uD835\uDDC9\uD835\uDDE3\uD835\uDDFD\uD835\uDE17\uD835\uDE31\uD835\uDE4B\uD835\uDE65\uD835\uDE7F\uD835\uDE99\u24C5\u24DF\u2119\u0440\u03C1\u1D18\uABB2\uA4D1\u2CA3\u0420\u03A1\u13E2\u2CA2\u1E54\u1E55\u1E56\u1E57\uD835\uDC0F\uD835\uDC29\uD835\uDC43\uD835\uDC5D\uD835\uDC77\uD835\uDC91\uD835\uDCAB\uD835\uDCC5\uD835\uDCDF\uD835\uDCF9\uD835\uDD13\uD835\uDD2D\uD835\uDD61\uD835\uDD7B\uD835\uDD95\uD835\uDDAF\uD835\uDDC9\uD835\uDDE3\uD835\uDDFD\uD835\uDE17\uD835\uDE31\uD835\uDE4B\uD835\uDE65\uD835\uDE7F\uD835\uDE99\uD835\uDEB8\uD835\uDED2\uD835\uDEE0\uD835\uDEF2\uD835\uDF0C\uD835\uDF1A\uD835\uDF2C\uD835\uDF46\uD835\uDF54\uD835\uDF66\uD835\uDF80\uD835\uDF8E\uD835\uDFA0\uD835\uDFBA\uD835\uDFC8\u1D3E\u1D56\u1D68\u209A",
    ],
    [
      "q",
      "qQ\uFF31\uFF51\uD835\uDC10\uD835\uDC2A\uD835\uDC44\uD835\uDC5E\uD835\uDC78\uD835\uDC92\uD835\uDCAC\uD835\uDCC6\uD835\uDCE0\uD835\uDCFA\uD835\uDD14\uD835\uDD2E\uD835\uDD48\uD835\uDD62\uD835\uDD7C\uD835\uDD96\uD835\uDDB0\uD835\uDDCA\uD835\uDDE4\uD835\uDDFE\uD835\uDE18\uD835\uDE32\uD835\uDE4C\uD835\uDE66\uD835\uDE80\uD835\uDE9A\u24C6\u24E0\u211A\u051B\u0566\u051A\u0536\uD835\uDC10\uD835\uDC2A\uD835\uDC44\uD835\uDC5E\uD835\uDC78\uD835\uDC92\uD835\uDCAC\uD835\uDCC6\uD835\uDCE0\uD835\uDCFA\uD835\uDD14\uD835\uDD2E\uD835\uDD62\uD835\uDD7C\uD835\uDD96\uD835\uDDB0\uD835\uDDCA\uD835\uDDE4\uD835\uDDFE\uD835\uDE18\uD835\uDE32\uD835\uDE4C\uD835\uDE66\uD835\uDE80\uD835\uDE9A\uA7F4",
    ],
    [
      "r",
      "rR\uFF32\uFF52\uD835\uDC11\uD835\uDC2B\uD835\uDC45\uD835\uDC5F\uD835\uDC79\uD835\uDC93\uD835\uDCAD\uD835\uDCC7\uD835\uDCE1\uD835\uDCFB\uD835\uDD15\uD835\uDD2F\uD835\uDD49\uD835\uDD63\uD835\uDD7D\uD835\uDD97\uD835\uDDB1\uD835\uDDCB\uD835\uDDE5\uD835\uDDFF\uD835\uDE19\uD835\uDE33\uD835\uDE4D\uD835\uDE67\uD835\uDE81\uD835\uDE9B\u24C7\u24E1\u211B\u211C\u211D\u0280\uAB71\uABA2\uA4E3\u01A6\u13A1\u13D2\u0154\u0155\u0156\u0157\u0158\u0159\u0210\u0211\u0212\u0213\u1E58\u1E59\u1E5A\u1E5B\u1E5C\u1E5D\u1E5E\u1E5F\uD835\uDC11\uD835\uDC2B\uD835\uDC45\uD835\uDC5F\uD835\uDC79\uD835\uDC93\uD835\uDCC7\uD835\uDCE1\uD835\uDCFB\uD835\uDD2F\uD835\uDD63\uD835\uDD7D\uD835\uDD97\uD835\uDDB1\uD835\uDDCB\uD835\uDDE5\uD835\uDDFF\uD835\uDE19\uD835\uDE33\uD835\uDE4D\uD835\uDE67\uD835\uDE81\uD835\uDE9B\u02B3\u1D3F\u1D63",
    ],
    [
      "s",
      "sS\uFF33\uFF53\uD835\uDC12\uD835\uDC2C\uD835\uDC46\uD835\uDC60\uD835\uDC7A\uD835\uDC94\uD835\uDCAE\uD835\uDCC8\uD835\uDCE2\uD835\uDCFC\uD835\uDD16\uD835\uDD30\uD835\uDD4A\uD835\uDD64\uD835\uDD7E\uD835\uDD98\uD835\uDDB2\uD835\uDDCC\uD835\uDDE6\uD835\uDE00\uD835\uDE1A\uD835\uDE34\uD835\uDE4E\uD835\uDE68\uD835\uDE82\uD835\uDE9C\u24C8\u24E2\u0455\uA731\uABAA\uA4E2\u0405\u13DA\u015A\u015B\u015C\u015D\u015E\u015F\u0160\u0161\u017F\u0218\u0219\u1E60\u1E61\u1E62\u1E63\u1E64\u1E65\u1E66\u1E67\u1E68\u1E69\u1E9B\uD835\uDC12\uD835\uDC2C\uD835\uDC46\uD835\uDC60\uD835\uDC7A\uD835\uDC94\uD835\uDCAE\uD835\uDCC8\uD835\uDCE2\uD835\uDCFC\uD835\uDD16\uD835\uDD30\uD835\uDD4A\uD835\uDD64\uD835\uDD7E\uD835\uDD98\uD835\uDDB2\uD835\uDDCC\uD835\uDDE6\uD835\uDE00\uD835\uDE1A\uD835\uDE34\uD835\uDE4E\uD835\uDE68\uD835\uDE82\uD835\uDE9C\u02E2\u209B\uA7F1",
    ],
    [
      "t",
      "tT\uFF34\uFF54\uD835\uDC13\uD835\uDC2D\uD835\uDC47\uD835\uDC61\uD835\uDC7B\uD835\uDC95\uD835\uDCAF\uD835\uDCC9\uD835\uDCE3\uD835\uDCFD\uD835\uDD17\uD835\uDD31\uD835\uDD4B\uD835\uDD65\uD835\uDD7F\uD835\uDD99\uD835\uDDB3\uD835\uDDCD\uD835\uDDE7\uD835\uDE01\uD835\uDE1B\uD835\uDE35\uD835\uDE4F\uD835\uDE69\uD835\uDE83\uD835\uDE9D\u24C9\u24E3\u0422\u03C4\u1D1B\u0442\uAB72\uA4D4\u2CA7\u03A4\u13A2\u2CA6\u0162\u0163\u0164\u0165\u021A\u021B\u1E6A\u1E6B\u1E6C\u1E6D\u1E6E\u1E6F\u1E70\u1E71\u1E97\uD835\uDC13\uD835\uDC2D\uD835\uDC47\uD835\uDC61\uD835\uDC7B\uD835\uDC95\uD835\uDCAF\uD835\uDCC9\uD835\uDCE3\uD835\uDCFD\uD835\uDD17\uD835\uDD31\uD835\uDD4B\uD835\uDD65\uD835\uDD7F\uD835\uDD99\uD835\uDDB3\uD835\uDDCD\uD835\uDDE7\uD835\uDE01\uD835\uDE1B\uD835\uDE35\uD835\uDE4F\uD835\uDE69\uD835\uDE83\uD835\uDE9D\uD835\uDEBB\uD835\uDED5\uD835\uDEF5\uD835\uDF0F\uD835\uDF2F\uD835\uDF49\uD835\uDF69\uD835\uDF83\uD835\uDFA3\uD835\uDFBD\u1D40\u1D57\u209C",
    ],
    [
      "u",
      "uU\uFF35\uFF55\uD835\uDC14\uD835\uDC2E\uD835\uDC48\uD835\uDC62\uD835\uDC7C\uD835\uDC96\uD835\uDCB0\uD835\uDCCA\uD835\uDCE4\uD835\uDCFE\uD835\uDD18\uD835\uDD32\uD835\uDD4C\uD835\uDD66\uD835\uDD80\uD835\uDD9A\uD835\uDDB4\uD835\uDDCE\uD835\uDDE8\uD835\uDE02\uD835\uDE1C\uD835\uDE36\uD835\uDE50\uD835\uDE6A\uD835\uDE84\uD835\uDE9E\u24CA\u24E4\u03C5\u1D1C\uAB9C\uA4F4\u057D\u13CC\u054D\xD9\xDA\xDB\xDC\xF9\xFA\xFB\xFC\u0168\u0169\u016A\u016B\u016C\u016D\u016E\u016F\u0170\u0171\u0172\u0173\u01AF\u01B0\u01D3\u01D4\u01D5\u01D6\u01D7\u01D8\u01D9\u01DA\u01DB\u01DC\u0214\u0215\u0216\u0217\u1E72\u1E73\u1E74\u1E75\u1E76\u1E77\u1E78\u1E79\u1E7A\u1E7B\u1EE4\u1EE5\u1EE6\u1EE7\u1EE8\u1EE9\u1EEA\u1EEB\u1EEC\u1EED\u1EEE\u1EEF\u1EF0\u1EF1\uD835\uDC14\uD835\uDC2E\uD835\uDC48\uD835\uDC62\uD835\uDC7C\uD835\uDC96\uD835\uDCB0\uD835\uDCCA\uD835\uDCE4\uD835\uDCFE\uD835\uDD18\uD835\uDD32\uD835\uDD4C\uD835\uDD66\uD835\uDD80\uD835\uDD9A\uD835\uDDB4\uD835\uDDCE\uD835\uDDE8\uD835\uDE02\uD835\uDE1C\uD835\uDE36\uD835\uDE50\uD835\uDE6A\uD835\uDE84\uD835\uDE9E\uD835\uDED6\uD835\uDF10\uD835\uDF4A\uD835\uDF84\uD835\uDFBE\u1D41\u1D58\u1D64\u1DB8",
    ],
    [
      "v",
      "vV\uFF36\uFF56\uD835\uDC15\uD835\uDC2F\uD835\uDC49\uD835\uDC63\uD835\uDC7D\uD835\uDC97\uD835\uDCB1\uD835\uDCCB\uD835\uDCE5\uD835\uDCFF\uD835\uDD19\uD835\uDD33\uD835\uDD4D\uD835\uDD67\uD835\uDD81\uD835\uDD9B\uD835\uDDB5\uD835\uDDCF\uD835\uDDE9\uD835\uDE03\uD835\uDE1D\uD835\uDE37\uD835\uDE51\uD835\uDE6B\uD835\uDE85\uD835\uDE9F\u24CB\u24E5\u03BD\u1D20\u0475\uABA9\uA4E6\u0474\u13D9\u1E7C\u1E7D\u1E7E\u1E7F\uD835\uDC15\uD835\uDC2F\uD835\uDC49\uD835\uDC63\uD835\uDC7D\uD835\uDC97\uD835\uDCB1\uD835\uDCCB\uD835\uDCE5\uD835\uDCFF\uD835\uDD19\uD835\uDD33\uD835\uDD4D\uD835\uDD67\uD835\uDD81\uD835\uDD9B\uD835\uDDB5\uD835\uDDCF\uD835\uDDE9\uD835\uDE03\uD835\uDE1D\uD835\uDE37\uD835\uDE51\uD835\uDE6B\uD835\uDE85\uD835\uDE9F\uD835\uDECE\uD835\uDF08\uD835\uDF42\uD835\uDF7C\uD835\uDFB6\u1D5B\u1D65\u2164\u2174",
    ],
    [
      "w",
      "wW\uFF37\uFF57\uD835\uDC16\uD835\uDC30\uD835\uDC4A\uD835\uDC64\uD835\uDC7E\uD835\uDC98\uD835\uDCB2\uD835\uDCCC\uD835\uDCE6\uD835\uDD00\uD835\uDD1A\uD835\uDD34\uD835\uDD4E\uD835\uDD68\uD835\uDD82\uD835\uDD9C\uD835\uDDB6\uD835\uDDD0\uD835\uDDEA\uD835\uDE04\uD835\uDE1E\uD835\uDE38\uD835\uDE52\uD835\uDE6C\uD835\uDE86\uD835\uDEA0\u24CC\u24E6\u051D\u1D21\uAB83\uABA4\uA4EA\u051C\u13B3\u13D4\u0174\u0175\u1E80\u1E81\u1E82\u1E83\u1E84\u1E85\u1E86\u1E87\u1E88\u1E89\u1E98\uD835\uDC16\uD835\uDC30\uD835\uDC4A\uD835\uDC64\uD835\uDC7E\uD835\uDC98\uD835\uDCB2\uD835\uDCCC\uD835\uDCE6\uD835\uDD00\uD835\uDD1A\uD835\uDD34\uD835\uDD4E\uD835\uDD68\uD835\uDD82\uD835\uDD9C\uD835\uDDB6\uD835\uDDD0\uD835\uDDEA\uD835\uDE04\uD835\uDE1E\uD835\uDE38\uD835\uDE52\uD835\uDE6C\uD835\uDE86\uD835\uDEA0\u02B7\u1D42\u209D",
    ],
    [
      "x",
      "xX\uFF38\uFF58\uD835\uDC17\uD835\uDC31\uD835\uDC4B\uD835\uDC65\uD835\uDC7F\uD835\uDC99\uD835\uDCB3\uD835\uDCCD\uD835\uDCE7\uD835\uDD01\uD835\uDD1B\uD835\uDD35\uD835\uDD4F\uD835\uDD69\uD835\uDD83\uD835\uDD9D\uD835\uDDB7\uD835\uDDD1\uD835\uDDEB\uD835\uDE05\uD835\uDE1F\uD835\uDE39\uD835\uDE53\uD835\uDE6D\uD835\uDE87\uD835\uDEA1\u24CD\u24E7\u0445\u03C7\uA4EB\u2CAD\u0425\u03A7\u2CAC\u1E8A\u1E8B\u1E8C\u1E8D\uD835\uDC17\uD835\uDC31\uD835\uDC4B\uD835\uDC65\uD835\uDC7F\uD835\uDC99\uD835\uDCB3\uD835\uDCCD\uD835\uDCE7\uD835\uDD01\uD835\uDD1B\uD835\uDD35\uD835\uDD4F\uD835\uDD69\uD835\uDD83\uD835\uDD9D\uD835\uDDB7\uD835\uDDD1\uD835\uDDEB\uD835\uDE05\uD835\uDE1F\uD835\uDE39\uD835\uDE53\uD835\uDE6D\uD835\uDE87\uD835\uDEA1\uD835\uDEBE\uD835\uDED8\uD835\uDEF8\uD835\uDF12\uD835\uDF32\uD835\uDF4C\uD835\uDF6C\uD835\uDF86\uD835\uDFA6\uD835\uDFC0\u02E3\u1D61\u1D6A\u2093\u2169\u2179",
    ],
    [
      "y",
      "yY\uFF39\uFF59\uD835\uDC18\uD835\uDC32\uD835\uDC4C\uD835\uDC66\uD835\uDC80\uD835\uDC9A\uD835\uDCB4\uD835\uDCCE\uD835\uDCE8\uD835\uDD02\uD835\uDD1C\uD835\uDD36\uD835\uDD50\uD835\uDD6A\uD835\uDD84\uD835\uDD9E\uD835\uDDB8\uD835\uDDD2\uD835\uDDEC\uD835\uDE06\uD835\uDE20\uD835\uDE3A\uD835\uDE54\uD835\uDE6E\uD835\uDE88\uD835\uDEA2\u24CE\u24E8\u0443\u03A5\u028F\uAB79\uA4EC\u2CA9\u0423\u13A9\u2CA8\xDD\xFD\xFF\u0176\u0177\u0178\u0232\u0233\u1E8E\u1E8F\u1E99\u1EF2\u1EF3\u1EF4\u1EF5\u1EF6\u1EF7\u1EF8\u1EF9\uD835\uDC18\uD835\uDC32\uD835\uDC4C\uD835\uDC66\uD835\uDC80\uD835\uDC9A\uD835\uDCB4\uD835\uDCCE\uD835\uDCE8\uD835\uDD02\uD835\uDD1C\uD835\uDD36\uD835\uDD50\uD835\uDD6A\uD835\uDD84\uD835\uDD9E\uD835\uDDB8\uD835\uDDD2\uD835\uDDEC\uD835\uDE06\uD835\uDE20\uD835\uDE3A\uD835\uDE54\uD835\uDE6E\uD835\uDE88\uD835\uDEA2\uD835\uDEBC\uD835\uDEF6\uD835\uDF30\uD835\uDF6A\uD835\uDFA4\u02B8\u209E",
    ],
    [
      "z",
      "zZ\uFF3A\uFF5A\uD835\uDC19\uD835\uDC33\uD835\uDC4D\uD835\uDC67\uD835\uDC81\uD835\uDC9B\uD835\uDCB5\uD835\uDCCF\uD835\uDCE9\uD835\uDD03\uD835\uDD1D\uD835\uDD37\uD835\uDD51\uD835\uDD6B\uD835\uDD85\uD835\uDD9F\uD835\uDDB9\uD835\uDDD3\uD835\uDDED\uD835\uDE07\uD835\uDE21\uD835\uDE3B\uD835\uDE55\uD835\uDE6F\uD835\uDE89\uD835\uDEA3\u24CF\u24E9\u2124\u2128\u0396\u1D22\uAB93\uA4DC\u2C8D\u13C3\u2C8C\u0179\u017A\u017B\u017C\u017D\u017E\u1E90\u1E91\u1E92\u1E93\u1E94\u1E95\uD835\uDC19\uD835\uDC33\uD835\uDC4D\uD835\uDC67\uD835\uDC81\uD835\uDC9B\uD835\uDCB5\uD835\uDCCF\uD835\uDCE9\uD835\uDD03\uD835\uDD37\uD835\uDD6B\uD835\uDD85\uD835\uDD9F\uD835\uDDB9\uD835\uDDD3\uD835\uDDED\uD835\uDE07\uD835\uDE21\uD835\uDE3B\uD835\uDE55\uD835\uDE6F\uD835\uDE89\uD835\uDEA3\uD835\uDEAD\uD835\uDEE7\uD835\uDF21\uD835\uDF5B\uD835\uDF95\u1DBB\u209F",
    ],
  ]);
});
//@ chunk-p5akk6be.js:23659-23753 placement (2.1.88 match: escapeXml, 1)
function escapeXml_2(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
//@ chunk-p5akk6be.js:23753-23831 placement
/**
 * XML 转义并按上限截断。
 */
function escapeXmlTruncated(text, maxLength, formatSuffix) {
  let escaped = escapeXml_2(text);
  if (escaped.length <= maxLength) return escaped;
  return escapeXml_2(truncateBeforeEscape(text, maxLength, formatSuffix));
}
//@ chunk-p5akk6be.js:23831-24090 placement
/**
 * 截断文本使其 XML 转义后的长度不超过上限，末尾加截断提示（默认“… [truncated]”）。
 */
function truncateBeforeEscape(text, maxLength, formatSuffix) {
  let max = Math.max(0, Math.min(text.length, maxLength));
  for (;;) {
    let truncated = truncateToLength(text, max);
    let suffix = formatSuffix?.(text.length - truncated.length) ?? "\u2026 [truncated]";
    let overBy = escapeXml_2(truncated).length + suffix.length - maxLength;
    if (overBy <= 0 || !(max > 0)) return truncated + suffix;
    max = truncated.length;
    while (overBy > 0 && max > 0) {
      max--;
      let char = truncated[max];
      overBy -= char === "&" ? 5 : char === "<" || char === ">" ? 4 : 1;
    }
  }
}
//@ chunk-p5akk6be.js:24168-25745 placement
/**
 * 斜杠类形近字符到 “/” 的映射。
 */
var INVISIBLE_CHAR_CLASSES; // deferred: uses BRACKET_CONFUSABLES_2 (./sanitization.js) of its import cycle while loading; runs once the cycle is complete
var CONFUSABLE_SLASH_MAP;
var COMBINING_MARK_CLASSES;
var FILLER_CHAR_CLASS;
var BOUNDARY_FILLER_CLASSES;
var WORD_CHARS_CLASS;
var WORD_END_PATTERN;
var DASH_CHAR_CLASS;
var COLON_CHAR_CLASS;
var EQUALS_CHAR_CLASS;
var SPACE_LIKE_CHARS;
var FILLER_WITH_SPACE_CLASS;
var CONNECTOR_CHAR_CLASS;
var CONNECTOR_CHAR_RE;
var TAG_SCRUB_CLASSES;
var TAG_BRACKET_CLASSES;
deferInit("chunk-p5akk6be.js:24168", () => {
  INVISIBLE_CHAR_CLASSES =
    "\\u00ad\\u034f\\u0600-\\u0605\\u061c\\u06dd\\u070f\\u0890\\u0891\\u08e2\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0\\ufff0-\\ufffb\\u{110bd}\\u{110cd}\\u{13430}-\\u{1343f}\\u{1bca0}-\\u{1bca3}\\u{1d173}-\\u{1d17a}\\u{16fe4}\\u{e0000}-\\u{e0fff}";
  CONFUSABLE_SLASH_MAP = new Map([
    ...[...BRACKET_CONFUSABLES_2].filter(([key]) => !BRACKET_CONFUSABLES_WITH_ANGLES.has(key)),
    ["\uFF0F", "/"],
    ["\u2215", "/"],
    ["\u2044", "/"],
  ]);
  COMBINING_MARK_CLASSES =
    "\\u0300-\\u0344\\u0346-\\u036f\\u0483-\\u0489\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u064b-\\u065f\\u0670\\u06d6-\\u06dc\\u06df-\\u06e4\\u06e7\\u06e8\\u06ea-\\u06ed\\u1ab0-\\u1aff\\u1dc0-\\u1dff\\u20d0-\\u20ff\\u3099\\u309a\\ufe20-\\ufe2f";
  FILLER_CHAR_CLASS = `${INVISIBLE_CHAR_CLASSES}${COMBINING_MARK_CLASSES}\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f-\\x9f\\u2028\\u2029`;
  BOUNDARY_FILLER_CLASSES = "\\x0b\\x0c\\x1c-\\x1f\\x85\\u2028\\u2029\\u115f\\u1160\\u3164\\uffa0";
  WORD_CHARS_CLASS = "A-Za-z0-9_\\-";
  WORD_END_PATTERN = `(?:[^${WORD_CHARS_CLASS}]|$)`;
  DASH_CHAR_CLASS = "\\p{Pd}\\u2212\\u207b\\u208b\\u02d7\\u2796\\u2043\\u30fc\\uff70";
  COLON_CHAR_CLASS =
    ":\\uff1a\\ufe55\\ufe13\\ua789\\u2236\\u02d0\\u02f8\\u05c3\\u0589\\u0703\\u0704\\u16ec\\u1803\\u1809\\u205a\\ua4fd\\ufe30";
  EQUALS_CHAR_CLASS = "=\\u207c\\u208c\\ufe66\\uff1d\\ua78a\\u2550\\u268c\\ua4ff\\u{1f7f0}";
  SPACE_LIKE_CHARS = "\u2E40\u30A0\u1400";
  FILLER_WITH_SPACE_CLASS = `\\s\\u2800${FILLER_CHAR_CLASS}`;
  CONNECTOR_CHAR_CLASS = `_\\p{Pc}\\u2017\\u02cd\\u07fa\\u0640${DASH_CHAR_CLASS}`;
  CONNECTOR_CHAR_RE = `[${CONNECTOR_CHAR_CLASS}]`;
  TAG_SCRUB_CLASSES = (() => {
    let map = {
      "<": "<",
      ">": ">",
      "/": "/",
    };
    for (let [key, canonical] of CONFUSABLE_SLASH_MAP) map[canonical] += key;
    return {
      open: map["<"],
      close: map[">"],
      slash: map["/"],
      filler: `^${WORD_CHARS_CLASS}${map["<"]}${map[">"]}`,
      lookalikePattern: new RegExp(`[${[...CONFUSABLE_SLASH_MAP.keys()].join("")}]`, "gu"),
      invisiblePattern: new RegExp(`[${INVISIBLE_CHAR_CLASSES}]`, "gu"),
    };
  })();
  TAG_BRACKET_CLASSES = {
    open: TAG_SCRUB_CLASSES.open,
    close: TAG_SCRUB_CLASSES.close,
    slash: TAG_SCRUB_CLASSES.slash,
  };
});
//@ chunk-p5akk6be.js:25745-25786 placement
/**
 * 返回不可见字符的全局正则。
 */
function invisiblePatternAccessor() {
  return TAG_SCRUB_CLASSES.invisiblePattern;
}
//@ chunk-p5akk6be.js:25786-25834 placement
function stripInvisibleChars(text) {
  return escapeInvisibleChars(text).replace(invisiblePatternAccessor(), toUnicodeEscapes);
}
//@ chunk-p5akk6be.js:25834-25884 placement
/**
 * 生成带前瞻捕获的反向引用片段。
 */
function lookaheadCapture(charClass, captureIndex) {
  return `(?=([${charClass}]*))(?:\\${captureIndex})`;
}
//@ chunk-p5akk6be.js:25884-25918 placement
/**
 * 生成“匹配任意填充字符”的捕获片段。
 */
function fillerCapture(captureIndex) {
  return lookaheadCapture(FILLER_CHAR_CLASS, captureIndex);
}
//@ chunk-p5akk6be.js:25918-25938 placement
/**
 * 标签正则的缓存表。
 */
var tagRegexCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TAG_REGEX_CACHE;
deferInit("chunk-p5akk6be.js:25918", () => {
  tagRegexCache = new Map();
  MAX_TAG_REGEX_CACHE = 64;
});
//@ chunk-p5akk6be.js:25938-26144 placement
function getTagRegex(tagName, closeOnly) {
  let cacheKey = `${closeOnly ? "/" : ""}${tagName}`;
  let cached = tagRegexCache.get(cacheKey);
  if (cached) return cached;
  let tagRegex = buildTagRegex({
    tags: [tagName],
    closeOnly,
    fillerClass: TAG_SCRUB_CLASSES.filler,
    spell: (char) => (char === "-" || char === "_" ? CONNECTOR_CHAR_RE : char),
    tail: undefined,
  });
  if (tagRegexCache.size >= MAX_TAG_REGEX_CACHE) tagRegexCache.clear();
  tagRegexCache.set(cacheKey, tagRegex);
  return tagRegex;
}
//@ chunk-p5akk6be.js:26144-26463 placement
/**
 * 构造匹配某些标签名（含易混淆字符与填充字符变体，可只匹配闭合标签）开头的全局 Unicode 正则。
 */
function buildTagRegex({ tags, closeOnly, fillerClass, spell, tail }) {
  let { open, slash } = TAG_SCRUB_CLASSES;
  let captureCount = 0;
  let leadCapture = closeOnly
    ? `${lookaheadCapture(`${fillerClass}${slash}`, ++captureCount)}[${slash}]${lookaheadCapture(fillerClass, ++captureCount)}`
    : lookaheadCapture(fillerClass, ++captureCount);
  let mapped = tags.map((tag) =>
    [...tag].map((char, index) => (index === 0 ? "" : fillerCapture(++captureCount)) + spell(char)).join(""),
  );
  let tailPart = tail === undefined ? WORD_END_PATTERN : `${fillerCapture(++captureCount)}${tail}`;
  return new RegExp(`[${open}](?!\\\\)(?=${leadCapture}(?:${mapped.join("|")})${tailPart})`, "giu");
}
//@ chunk-p5akk6be.js:26463-26513 placement
/**
 * 把闭合标签的开头转义（只匹配闭合形式）。
 */
function scrubCloseTag(tagName, text) {
  return text.replace(getTagRegex(tagName, true), "<\\");
}
//@ chunk-p5akk6be.js:26513-26563 placement
/**
 * 把起始标签的开头转义。
 */
function scrubOpenTag(tagName, text) {
  return text.replace(getTagRegex(tagName, false), "<\\");
}
//@ chunk-p5akk6be.js:26563-26632 placement
/**
 * 用形近字符表把字符折叠成 ASCII 对应字符。
 */
function foldLookalikeChars(text) {
  return text.replace(TAG_SCRUB_CLASSES.lookalikePattern, (char) => CONFUSABLE_SLASH_MAP.get(char) ?? char);
}
//@ chunk-p5akk6be.js:26632-26638 placement
/**
 * 形近字符长度查表（支持双字符组合），首次使用时构建。
 */
var confusableLengthTable;
//@ chunk-p5akk6be.js:26638-26876 placement
/**
 * 统计文本中易混淆字符的个数（支持双字符组合）。
 */
function countConfusables(text) {
  let lengthTable = confusableLengthTable;
  if (lengthTable === undefined) {
    lengthTable = confusableLengthTable = new Uint8Array(65536);
    for (let key of CONFUSABLE_SLASH_MAP.keys()) lengthTable[key.charCodeAt(0)] = key.length;
  }
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    let charLength = lengthTable[text.charCodeAt(i)];
    if (charLength === 2) {
      if (CONFUSABLE_SLASH_MAP.has(text.slice(i, i + 2))) {
        count++;
        i++;
      }
    } else count += charLength;
  }
  return count;
}
//@ chunk-p5akk6be.js:26876-28927 placement
/**
 * 形近字符映射表（西里尔、希腊、小型大写、Cherokee、Lisu、Coptic 等 → ASCII 字母）；nu 是加入大写形式后的表和匹配正则。
 */
var CONFUSABLE_CHAR_MAP; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CONFUSABLE_CHAR_TABLE;
deferInit("chunk-p5akk6be.js:26876", () => {
  CONFUSABLE_CHAR_MAP = {
    "\u0430": "a",
    "\u0435": "e",
    "\u043E": "o",
    "\u0440": "p",
    "\u0441": "c",
    "\u0443": "y",
    "\u0445": "x",
    "\u043A": "k",
    "\u0456": "i",
    "\u0458": "j",
    "\u0455": "s",
    "\u0501": "d",
    "\u051B": "q",
    "\u051D": "w",
    "\u04BB": "h",
    "\u04CF": "l",
    "\u0412": "b",
    "\u041C": "m",
    "\u041D": "h",
    "\u0422": "t",
    "\u03B1": "a",
    "\u03B5": "e",
    "\u03B9": "i",
    "\u03BA": "k",
    "\u03BD": "v",
    "\u03BF": "o",
    "\u03C1": "p",
    "\u03C4": "t",
    "\u03C5": "u",
    "\u03C7": "x",
    "\u03F3": "j",
    "\u0392": "b",
    "\u0396": "z",
    "\u0397": "h",
    "\u039C": "m",
    "\u039D": "n",
    "\u03A5": "y",
    "\u1D00": "a",
    "\u0299": "b",
    "\u1D04": "c",
    "\u1D05": "d",
    "\u1D07": "e",
    "\uA730": "f",
    "\u0262": "g",
    "\u029C": "h",
    "\u026A": "i",
    "\u1D0A": "j",
    "\u1D0B": "k",
    "\u029F": "l",
    "\u1D0D": "m",
    "\u0274": "n",
    "\u1D0F": "o",
    "\u1D18": "p",
    "\u0280": "r",
    "\uA731": "s",
    "\u1D1B": "t",
    "\u1D1C": "u",
    "\u1D20": "v",
    "\u1D21": "w",
    "\u028F": "y",
    "\u1D22": "z",
    "\u0251": "a",
    "\u0261": "g",
    "\u0131": "i",
    "\u0475": "v",
    "\u0442": "t",
    "\u043C": "m",
    "\uAB70": "d",
    "\uAB71": "r",
    "\uAB72": "t",
    "\uAB79": "y",
    "\uAB7A": "a",
    "\uAB7B": "j",
    "\uAB7C": "e",
    "\uAB83": "w",
    "\uAB87": "m",
    "\uAB8B": "h",
    "\uAB90": "g",
    "\uAB92": "h",
    "\uAB93": "z",
    "\uAB9C": "u",
    "\uAB9F": "b",
    "\uABA2": "r",
    "\uABA4": "w",
    "\uABA9": "v",
    "\uABAA": "s",
    "\uABAE": "l",
    "\uABAF": "c",
    "\uABB2": "p",
    "\uABB6": "k",
    "\uABB7": "d",
    "\u13FC": "b",
    "\uA4D0": "b",
    "\uA4D1": "p",
    "\uA4D3": "d",
    "\uA4D4": "t",
    "\uA4D6": "g",
    "\uA4D7": "k",
    "\uA4D9": "j",
    "\uA4DA": "c",
    "\uA4DC": "z",
    "\uA4DD": "f",
    "\uA4DF": "m",
    "\uA4E0": "n",
    "\uA4E1": "l",
    "\uA4E2": "s",
    "\uA4E3": "r",
    "\uA4E6": "v",
    "\uA4E7": "h",
    "\uA4EA": "w",
    "\uA4EB": "x",
    "\uA4EC": "y",
    "\uA4EE": "a",
    "\uA4F0": "e",
    "\uA4F2": "i",
    "\uA4F3": "o",
    "\uA4F4": "u",
    "\u0566": "q",
    "\u0570": "h",
    "\u0578": "n",
    "\u057D": "u",
    "\u0581": "g",
    "\u0585": "o",
    "\u03F2": "c",
    "\u2CA5": "c",
    "\u0269": "i",
    "\u2C81": "a",
    "\u2C83": "b",
    "\u2C89": "e",
    "\u2C8F": "h",
    "\u2C93": "i",
    "\u2C95": "k",
    "\u2C99": "m",
    "\u2C9B": "n",
    "\u2C9F": "o",
    "\u2CA3": "p",
    "\u2CA7": "t",
    "\u2CA9": "y",
    "\u2CAD": "x",
    "\u2C8D": "z",
  };
  CONFUSABLE_CHAR_TABLE = (() => {
    let table = {
      ...CONFUSABLE_CHAR_MAP,
    };
    for (let [key, value] of Object.entries(CONFUSABLE_CHAR_MAP)) {
      let upper = key.toUpperCase();
      if (upper !== key && [...upper].length === 1 && !(upper in table) && !/^[A-Za-z]$/.test(upper))
        table[upper] = value;
    }
    return {
      table,
      pattern: new RegExp(`[${Object.keys(table).join("")}]`, "gu"),
    };
  })();
});
//@ chunk-p5akk6be.js:28927-29024 placement (2.1.88 match: COMMAND_SUBSTITUTION_PATTERNS, 0.602)
/**
 * 把字符串中的形近 Unicode 字符折叠成 ASCII（前后各折叠一次，中间做规范化并去附加符号），用于防同形字绕过。
 */
function foldConfusableCharacters(text) {
  let { table, pattern } = CONFUSABLE_CHAR_TABLE;
  let fold = (value) => value.replace(pattern, (char) => table[char] ?? char);
  return fold(normalizeNfkc(normalizeAndStripMarks(fold(text))));
}
//@ chunk-p5akk6be.js:29024-29076 placement
function normalizeAndStripMarks(text) {
  return nfkdNormalize(text).replace(/\p{M}+/gu, "");
}
//@ chunk-p5akk6be.js:29076-29113 placement
var ABCDEFGHIJKLMNOPQRSTUVWXYZ = "abcdefghijklmnopqrstuvwxyz";
//@ chunk-p5akk6be.js:29113-29248 placement
function latinLetterConfusableClass(letter) {
  if (!/^[a-z]$/.test(letter)) throw Error("latinLetterConfusableClass: expected one ASCII lowercase letter");
  return LATIN_CONFUSABLES.get(letter) ?? letter;
}
//@ chunk-p5akk6be.js:29248-29593 placement
/**
 * 生成匹配某标签名所有易混淆拼写形式的正则。
 */
function confusableTagScrubPattern(tags, tags_2) {
  let classes = TAG_SCRUB_CLASSES;
  return buildTagRegex({
    tags,
    closeOnly: false,
    fillerClass: `${classes.filler}${[...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map(latinLetterConfusableClass).join("")}`,
    spell: (char) => {
      if (/^[a-z]$/.test(char)) return `[${latinLetterConfusableClass(char)}]`;
      if (char === "-" || char === "_") return CONNECTOR_CHAR_RE;
      if (/^[0-9]$/.test(char)) return char;
      throw Error("confusableTagScrubPattern: tag names are lowercase [a-z0-9_-]");
    },
    tail: tags_2?.({
      name: WORD_CHARS_CLASS,
      close: classes.close,
      colon: COLON_CHAR_CLASS,
    }),
  });
}
//@ chunk-p5akk6be.js:29593-29624 placement
/**
 * 生成“反斜杠 + 字符”的转义前缀。
 */
function escapedCharPrefix(char) {
  return `${char}\\`;
}
//@ chunk-p5akk6be.js:29624-29666 placement (2.1.88 match: CHANNEL_TAG, 1)
/**
 * 生成匹配 channel 标签（带 source 属性）的扫描器。旧版名 CHANNEL_TAG 为错配。
 */
function buildChannelTagMatcher() {
  return confusableTagScrubPattern(["channel"], channelSourceAttrPattern);
}
//@ chunk-p5akk6be.js:29666-29876 placement
/**
 * channel 标签 source 属性的正则片段。
 */
function channelSourceAttrPattern({
  name,
  close,
  span = (count) => `[^${close}]{0,${count}}`,
  assign = (index) =>
    `${index}(?=(?<assignGap>[${FILLER_WITH_SPACE_CLASS}]*))\\k<assignGap>[${EQUALS_CHAR_CLASS}${SPACE_LIKE_CHARS}]`,
}) {
  return `(?:(?![${name}])|(?<=[${BOUNDARY_FILLER_CLASSES}][${FILLER_CHAR_CLASS}]*))${span(120)}(?<![\\w-])${assign("source")}`;
}
//@ chunk-p5akk6be.js:29876-29892 placement
var ANTML = "antml";
//@ chunk-p5akk6be.js:29892-29946 placement
function buildAntmlTagPattern() {
  return confusableTagScrubPattern([ANTML], ({ colon }) => `[${colon}]`);
}
//@ chunk-p5akk6be.js:29946-30310 placement
/**
 * 全角私用区字符的基准码点（U+E000）。
 */
var NON_ASCII_PATTERN; // deferred: uses INVISIBLE_CHAR_CLASSES of its import cycle while loading; runs once the cycle is complete
var regExp;
var regExp_2;
var regExp_3;
var REPLACEMENT_CHAR;
var PRIVATE_USE_BASE;
var PRIVATE_USE_SINGLE_LOW;
var PRIVATE_USE_SINGLE_HIGH;
var PRIVATE_USE_PAIR_BASE;
var PRIVATE_USE_PAIR_LOW;
var PRIVATE_USE_PAIR_HIGH;
var PRIVATE_USE_PAIR_CLASS;
var MULTI_CHAR_TAG_PIECES;
var FOLDED_BASE;
var PRIVATE_USE_FOLDED_HIGH;
var FOLDED_HIGH_MARK;
var foldedCharCache;
var MAX_FOLDED_CHAR_CACHE;
var uint8Array;
var confusableReverseIndex;
deferInit("chunk-p5akk6be.js:29946", () => {
  NON_ASCII_PATTERN = /[\u0080-\u{10ffff}]/u;
  regExp = new RegExp(`[${TAG_SCRUB_CLASSES.open}]`, "u");
  regExp_2 = new RegExp(`[${DASH_CHAR_CLASS}]`, "gu");
  regExp_3 = new RegExp(`^[${CONNECTOR_CHAR_CLASS}]$`, "u");
  REPLACEMENT_CHAR = String.fromCharCode(65533);
  PRIVATE_USE_BASE = 57344;
  PRIVATE_USE_SINGLE_LOW = PRIVATE_USE_BASE + 32;
  PRIVATE_USE_SINGLE_HIGH = PRIVATE_USE_BASE + 126;
  PRIVATE_USE_PAIR_BASE = 57856;
  PRIVATE_USE_PAIR_LOW = PRIVATE_USE_PAIR_BASE + 32;
  PRIVATE_USE_PAIR_HIGH = PRIVATE_USE_PAIR_BASE + 126;
  PRIVATE_USE_PAIR_CLASS = `${String.fromCharCode(PRIVATE_USE_PAIR_LOW)}-${String.fromCharCode(PRIVATE_USE_PAIR_HIGH)}`;
  MULTI_CHAR_TAG_PIECES = ["nv", "uy"];
  FOLDED_BASE = 57600;
  PRIVATE_USE_FOLDED_HIGH = FOLDED_BASE + 255;
  FOLDED_HIGH_MARK = String.fromCharCode(FOLDED_BASE + 240);
  foldedCharCache = new Map();
  MAX_FOLDED_CHAR_CACHE = 32768;
  uint8Array = new Uint8Array(4352);
});
//@ chunk-p5akk6be.js:30310-30370 placement (2.1.88 match: normalizeFullWidthDigits, 1)
function normalizeFullWidthDigits(input) {
  return String.fromCharCode(PRIVATE_USE_BASE + input.charCodeAt(0));
}
//@ chunk-p5akk6be.js:30370-30430 placement (2.1.88 match: normalizeFullWidthDigits, 1)
function normalizeFullWidthDigits_2(input) {
  return String.fromCharCode(PRIVATE_USE_PAIR_BASE + input.charCodeAt(0));
}
//@ chunk-p5akk6be.js:30430-30538 placement
function neutralizeCharCached(char) {
  let cached = foldedCharCache.get(char);
  if (cached !== undefined) return cached;
  let neutralized = neutralizeSpecialChar(char);
  if (foldedCharCache.size >= MAX_FOLDED_CHAR_CACHE) foldedCharCache.clear();
  foldedCharCache.set(char, neutralized);
  return neutralized;
}
//@ chunk-p5akk6be.js:30538-31165 placement
function neutralizeSpecialChar(char) {
  let codePoint = char.codePointAt(0);
  let current = char;
  if (
    (codePoint >= PRIVATE_USE_SINGLE_LOW && codePoint <= PRIVATE_USE_SINGLE_HIGH) ||
    (codePoint >= PRIVATE_USE_PAIR_LOW && codePoint <= PRIVATE_USE_PAIR_HIGH) ||
    (codePoint >= FOLDED_BASE && codePoint <= PRIVATE_USE_FOLDED_HIGH)
  )
    current = REPLACEMENT_CHAR;
  else if (SPACE_LIKE_CHARS.includes(char)) current = FOLDED_HIGH_MARK;
  else {
    if (confusableReverseIndex === undefined) {
      confusableReverseIndex = new Map();
      for (let [canonical, variants] of LATIN_CONFUSABLES)
        for (let variant of variants) confusableReverseIndex.set(variant, canonical);
    }
    let allowed = new Set();
    for (let candidate of [
      char,
      char.toLowerCase(),
      char.toUpperCase(),
      char.toUpperCase().toLowerCase(),
      char.toLowerCase().toUpperCase(),
    ]) {
      let canonical = confusableReverseIndex.get(candidate);
      if (canonical !== undefined) allowed.add(canonical);
    }
    let joined = [...allowed].sort().join("");
    let next =
      joined ||
      foldConfusableCharacters(char)
        .replace(regExp_2, "-")
        .toLowerCase()
        .replace(/\u00DF/g, "ss");
    if (allowed.size > 1) {
      let index = MULTI_CHAR_TAG_PIECES.indexOf(joined);
      current = index === -1 ? normalizeFullWidthDigits(joined) : String.fromCharCode(FOLDED_BASE + index);
    } else if (/^[a-z0-9_-]+$/.test(next))
      current = [...next]
        .map((index, position) =>
          position === 0 ? normalizeFullWidthDigits(index) : normalizeFullWidthDigits_2(index),
        )
        .join("");
    else if (regExp_3.test(char)) current = normalizeFullWidthDigits("_");
  }
  return current;
}
//@ chunk-p5akk6be.js:31165-31301 placement
function classifyCodeBlock(block) {
  let codePoint = 1;
  for (let max = Math.max(block << 8, 128); max < (block + 1) << 8; max++) {
    let lastCodePoint = String.fromCodePoint(max);
    if (neutralizeSpecialChar(lastCodePoint) !== lastCodePoint) {
      codePoint = 2;
      break;
    }
  }
  uint8Array[block] = codePoint;
  return codePoint;
}
//@ chunk-p5akk6be.js:31301-31596 placement
function buildTagCharClass(tag) {
  if (/^[a-z0-9]$/.test(tag)) {
    let flattened = MULTI_CHAR_TAG_PIECES.flatMap((pieces, index) =>
      pieces.includes(tag) ? [String.fromCharCode(FOLDED_BASE + index)] : [],
    );
    return `[${tag}${normalizeFullWidthDigits(tag)}${normalizeFullWidthDigits_2(tag)}${flattened.join("")}]`;
  }
  if (tag === "-" || tag === "_")
    return `[_\\-${normalizeFullWidthDigits("_")}${normalizeFullWidthDigits("-")}${normalizeFullWidthDigits_2("_")}${normalizeFullWidthDigits_2("-")}${FOLDED_HIGH_MARK}]`;
  throw Error("createTagFormScrub: tag names are lowercase [a-z0-9_-]");
}
//@ chunk-p5akk6be.js:31596-31974 placement
function buildTagScrubPattern({ tags, tail }) {
  let { open, close, filler } = TAG_SCRUB_CLASSES;
  let captureCount = 0;
  let spell = (char) =>
    [...char]
      .map((item, index) => (index === 0 ? "" : fillerCapture(++captureCount)) + buildTagCharClass(item))
      .join("");
  let mapped = tags.map(spell);
  let assignment =
    tail === undefined
      ? WORD_END_PATTERN
      : `${fillerCapture(++captureCount)}${tail({
          name: WORD_CHARS_CLASS,
          close,
          colon: COLON_CHAR_CLASS,
          span: (count) =>
            `[${PRIVATE_USE_PAIR_CLASS}]*(?:[^${close}${PRIVATE_USE_PAIR_CLASS}][${PRIVATE_USE_PAIR_CLASS}]*){0,${count}}`,
          spell,
          assign: (index) =>
            `${spell(index)}${lookaheadCapture(FILLER_WITH_SPACE_CLASS, ++captureCount)}[${EQUALS_CHAR_CLASS}${FOLDED_HIGH_MARK}]`,
        })}`;
  return new RegExp(`[${open}](?!\\\\)(?=[${filler}]*?(?:${mapped.join("|")})${assignment})`, "giu");
}
//@ chunk-p5akk6be.js:31974-32180 placement
/**
 * 构造标签中和器：找出文本中给定伪 XML 标签的开头位置（考虑同形字符），neutralize 时把 '<' 改成 '<\' 以免被当作系统标签。
 */
function createTagNeutralizer(specs) {
  let specs_2 = specs.filter((spec) => spec.tags.length > 0).map(buildTagScrubPattern);
  return {
    openerOffsets(spec) {
      return findTagOpenerOffsets(spec, specs_2);
    },
    neutralize(text) {
      let output = "";
      let lastOffset = 0;
      for (let offset of findTagOpenerOffsets(text, specs_2)) {
        output += `${text.slice(lastOffset, offset)}<\\`;
        lastOffset = offset + codePointLength(text, offset);
      }
      return output + text.slice(lastOffset);
    },
  };
}
//@ chunk-p5akk6be.js:32180-32690 placement
/**
 * 把文本中的易混淆非 ASCII 字符替换为中性读法（按 256 码位块缓存是否需要处理），返回替换后的读法与把读法偏移映射回原文偏移的函数。
 */
function neutralizeConfusables(text) {
  let offsets = [];
  let deltas = [];
  let reading = "";
  let lastIndex = 0;
  for (let index = 0; index < text.length; index++) {
    let code = text.charCodeAt(index);
    if (code < 128) continue;
    let code_2 = text.charCodeAt(index + 1);
    let charLength = code >= 55296 && code <= 56319 && code_2 >= 56320 && code_2 <= 57343 ? 2 : 1;
    let block = (charLength === 2 ? text.codePointAt(index) : code) >> 8;
    if ((uint8Array[block] || classifyCodeBlock(block)) === 1) {
      index += charLength - 1;
      continue;
    }
    let neutralized = neutralizeCharCached(text.slice(index, index + charLength));
    reading += text.slice(lastIndex, index) + neutralized;
    lastIndex = index + charLength;
    if (neutralized.length !== charLength) {
      offsets.push(reading.length);
      deltas.push(neutralized.length - charLength + (deltas.at(-1) ?? 0));
    }
    index += charLength - 1;
  }
  reading += text.slice(lastIndex);
  return {
    reading,
    offsetInText(offset) {
      let low = 0;
      let high = offsets.length;
      while (low < high) {
        let mid = (low + high) >> 1;
        if (offsets[mid] <= offset) low = mid + 1;
        else high = mid;
      }
      return low === 0 ? offset : offset - deltas[low - 1];
    },
  };
}
//@ chunk-p5akk6be.js:32690-32742 placement
function codePointLength(text, offset) {
  return text.codePointAt(offset) > 65535 ? 2 : 1;
}
//@ chunk-p5akk6be.js:32742-32951 placement
/**
 * 返回文本中匹配任一标签模式的开头偏移（必要时先把非 ASCII 同形字符映射回 ASCII 再匹配）。
 */
function findTagOpenerOffsets(text, specs) {
  if (!regExp.test(text)) return [];
  let reading = NON_ASCII_PATTERN.test(text) ? neutralizeConfusables(text) : undefined;
  let reading_2 = reading?.reading ?? text;
  let offsets = new Set();
  for (let spec of specs)
    for (let match of reading_2.matchAll(spec))
      offsets.add(reading ? reading.offsetInText(match.index) : match.index);
  return [...offsets].sort((left, right) => left - right);
}
//@ chunk-p5akk6be.js:32951-33598 placement
/**
 * 右方括号类形近字符。
 */
var OPEN_BRACKET_CHARS; // deferred: uses INVISIBLE_CHAR_CLASSES of its import cycle while loading; runs once the cycle is complete
var CLOSE_BRACKET_CHARS;
var EXTRA_SPACE_CHARS;
var NEWLINE_OR_EXTRA_SPACE_CLASS;
var SEPARATOR_CHAR_CLASS;
var DASH_OR_SEPARATOR_CLASS;
var LONG_VOWEL_AND_BLANK_CHARS;
var MAX_FILLER_DEPTH;
deferInit("chunk-p5akk6be.js:32951", () => {
  OPEN_BRACKET_CHARS =
    "\\[\\uff3b\\ufe47\\u27e6\\u301a\\u2045\\u298b\\u298d\\u298f\\u3010\\u3014\\ufe5d\\u3016\\u3018\\u2772\\u27ec\\ufe17\\ufe39\\ufe3b";
  CLOSE_BRACKET_CHARS =
    "\\]\\uff3d\\ufe48\\u27e7\\u301b\\u2046\\u298c\\u2990\\u298e\\u3011\\u3015\\ufe5e\\u3017\\u3019\\u2773\\u27ed\\ufe18\\ufe3a\\ufe3c";
  EXTRA_SPACE_CHARS = `\\t\\v\\f \\u00a0\\u1680\\u2000-\\u200a\\u202f\\u205f\\u3000\\u2800${FILLER_CHAR_CLASS}`;
  NEWLINE_OR_EXTRA_SPACE_CLASS = `\\r\\n${EXTRA_SPACE_CHARS}`;
  SEPARATOR_CHAR_CLASS = `\\p{Pc}\\u2017.\\u00b7\\u0387\\u2022\\u2219\\u22c5\\u2024\\u2026\\u2027\\u30fb\\ufe52\\uff65\\uff0e/\\u2044\\u2215\\uff0f\\\\\\u2216\\ufe68\\uff3c|\\u00a6\\uff5c~\\u223c\\uff5e${COLON_CHAR_CLASS};\\u037e\\ufe54\\uff1b`;
  DASH_OR_SEPARATOR_CLASS = `${DASH_CHAR_CLASS}${SEPARATOR_CHAR_CLASS}`;
  LONG_VOWEL_AND_BLANK_CHARS = "\\u30fc\\uff70\\u115f\\u1160\\u3164\\uffa0";
  MAX_FILLER_DEPTH = 4;
});
//@ chunk-p5akk6be.js:33598-33711 placement
function buildEscapedCharPattern(char) {
  let filler = `[${NEWLINE_OR_EXTRA_SPACE_CLASS}]*`;
  let escaped = "";
  for (let i = 0; i < MAX_FILLER_DEPTH; i++) escaped = `(?:[${DASH_OR_SEPARATOR_CLASS}]${filler}${escaped})?`;
  return `(?=(${filler}${escaped}))(?:\\${char})`;
}
//@ chunk-p5akk6be.js:33711-33906 placement
/**
 * 前导文本匹配模式与 LEAD_* 标记符号，用于识别标签前的上下文。
 */
var LEAD_TAIL_PATTERN; // deferred: uses OPEN_BRACKET_CHARS of its import cycle while loading; runs once the cycle is complete
var LEAD_HEX_ID;
var LEAD_SPAN;
var LEAD_OPEN_END;
deferInit("chunk-p5akk6be.js:33711", () => {
  LEAD_TAIL_PATTERN = `[^${OPEN_BRACKET_CHARS}${CLOSE_BRACKET_CHARS}\\r\\n]{0,119}?(?:(?![${LONG_VOWEL_AND_BLANK_CHARS}])[\\p{L}\\p{N}]|(?![${CLOSE_BRACKET_CHARS}])["')\\u2019\\u201d\\uff09\\p{Pe}\\p{Pf}])`;
  LEAD_HEX_ID = Symbol("LEAD_HEX_ID");
  LEAD_SPAN = Symbol("LEAD_SPAN");
  LEAD_OPEN_END = Symbol("LEAD_OPEN_END");
});
//@ chunk-p5akk6be.js:33906-34979 placement
function buildLeadMarkerPattern(markers) {
  let captureCount = 0;
  let escapedChar = () => buildEscapedCharPattern(++captureCount);
  let crlfFiller = () => lookaheadCapture(`\\r\\n${FILLER_CHAR_CLASS}`, ++captureCount);
  let dashFiller = () => `(?=[${NEWLINE_OR_EXTRA_SPACE_CLASS}${DASH_OR_SEPARATOR_CLASS}])` + escapedChar();
  let spaceFiller = () =>
    `(?=[${SEPARATOR_CHAR_CLASS}]{0,${MAX_FILLER_DEPTH}}[${NEWLINE_OR_EXTRA_SPACE_CLASS}${DASH_CHAR_CLASS}])` +
    escapedChar();
  let digitClass = `0-9\\uff10-\\uff19\\u{1d7ce}-\\u{1d7ff}\\u2070\\u00b9\\u00b2\\u00b3\\u2074-\\u2079\\u2080-\\u2089${[..."abcdef"].map(latinLetterConfusableClass).join("")}`;
  let digitRun = (count) => {
    if (!/^[a-z]+$/.test(count)) throw Error("bracketedLeadScrubPattern: words are lowercase ASCII");
    return [...count]
      .map((item, index) => (index === 0 ? "" : crlfFiller()) + `[${latinLetterConfusableClass(item)}]`)
      .join("");
  };
  let spacedDigits = (count) =>
    Array.from(
      {
        length: count,
      },
      (item, index) => (index === 0 ? "" : crlfFiller()) + `[${digitClass}]`,
    ).join("") +
    crlfFiller() +
    `[${DASH_CHAR_CLASS}]`;
  let uuidPattern = () => spacedDigits(8) + escapedChar() + spacedDigits(4) + escapedChar() + spacedDigits(4);
  let wordBoundary = "(?![0-9A-Za-z_])";
  let pattern = () => {
    throw Error("bracketedLeadScrubPattern: LEAD_OPEN_END must be the last token in a lead");
  };
  let fillerPart = escapedChar();
  let mapped = markers.map((marker) => {
    let endsWithOpen = marker.at(-1) === LEAD_OPEN_END;
    let body = endsWithOpen ? marker.slice(0, -1) : marker;
    if (body.length === 0) throw Error("bracketedLeadScrubPattern: a lead has at least one token");
    let joined = body
      .map(
        (item, index) =>
          (index === 0
            ? ""
            : typeof item !== "string"
              ? escapedChar()
              : body[index - 1] === LEAD_SPAN
                ? spaceFiller()
                : dashFiller()) +
          (item === LEAD_HEX_ID
            ? uuidPattern()
            : item === LEAD_SPAN
              ? LEAD_TAIL_PATTERN
              : item === LEAD_OPEN_END
                ? pattern()
                : digitRun(item) + (body[index + 1] === LEAD_SPAN ? wordBoundary : "")),
      )
      .join("");
    return endsWithOpen || body.at(-1) === LEAD_HEX_ID ? joined : `${joined}${wordBoundary}`;
  });
  return new RegExp(`[${OPEN_BRACKET_CHARS}](?!\\\\)(?=${fillerPart}(?:${mapped.join("|")}))`, "giu");
}
//@ chunk-p5akk6be.js:34979-35215 placement
/**
 * 把文本中伪造的（易混淆拼写的）标签中和掉。
 */
function neutralizeConfusableTags(text, tagNames) {
  let opened = scrubOpenTag(
    text,
    foldLookalikeChars(stripCombiningRepeated(tagNames).replace(invisiblePatternAccessor(), "")),
  );
  if (foldConfusableCharacters(opened) === opened) return opened;
  let tagRegex = getTagRegex(text, false);
  return opened
    .split("<")
    .map((part, index) => {
      if (index === 0 || part.startsWith("\\")) return part;
      let folded = foldConfusableCharacters(part);
      return folded !== part && `< ${folded}`.search(tagRegex) === 0 ? `\\${part}` : part;
    })
    .join("<");
}
//@ chunk-p5akk6be.js:35280-35330 placement
function unescapeHtmlEntities(text) {
  return text.replace(HTML_ENTITY_RE, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
}
//@ chunk-p5akk6be.js:35330-35403 placement
/**
 * 匹配基本 HTML 实体（amp/lt/gt/quot/apos）的正则。
 */
var BASIC_HTML_ENTITY_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BASIC_HTML_ENTITY_MAP;
deferInit("chunk-p5akk6be.js:35330", () => {
  BASIC_HTML_ENTITY_RE = /&(?:amp|lt|gt|quot|apos);/g;
  BASIC_HTML_ENTITY_MAP = {
    ...HTML_ENTITY_MAP,
    "&quot;": '"',
    "&apos;": "'",
  };
});
//@ chunk-p5akk6be.js:35403-35454 placement
/**
 * 解码基本 HTML 实体（未知实体原样保留）。
 */
function unescapeBasicHtmlEntities(text) {
  return text.replace(BASIC_HTML_ENTITY_RE, (entity) => BASIC_HTML_ENTITY_MAP[entity] ?? entity);
}
export {
  TAG_BRACKET_CLASSES,
  lookaheadCapture,
  escapeXml_2,
  foldLookalikeChars,
  countConfusables,
  scrubCloseTag,
  unescapeHtmlEntities,
  INVISIBLE_CHAR_CLASSES,
  latinLetterConfusableClass,
  codePointLength,
  WORD_CHARS_CLASS,
  confusableTagScrubPattern,
  EXTRA_SPACE_CHARS,
  LEAD_HEX_ID,
  LEAD_SPAN,
  LEAD_OPEN_END,
  buildLeadMarkerPattern,
  buildChannelTagMatcher,
  buildAntmlTagPattern,
  DASH_CHAR_CLASS,
  neutralizeConfusableTags,
  unescapeBasicHtmlEntities,
  foldConfusableCharacters,
  escapedCharPrefix,
  escapeXmlTruncated,
  ABCDEFGHIJKLMNOPQRSTUVWXYZ,
  ANTML,
  OPEN_BRACKET_CHARS,
  createTagNeutralizer,
  channelSourceAttrPattern,
  FILLER_CHAR_CLASS,
  truncateBeforeEscape,
  invisiblePatternAccessor,
  stripInvisibleChars,
  fillerCapture,
  COLON_CHAR_CLASS,
  CONNECTOR_CHAR_CLASS,
  scrubOpenTag,
};
