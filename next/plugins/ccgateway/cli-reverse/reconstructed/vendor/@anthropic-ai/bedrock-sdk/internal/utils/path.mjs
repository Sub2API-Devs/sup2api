/**
 * @anthropic-ai/bedrock-sdk/internal/utils/path.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (2)
 * attribution: esm-fingerprint 2
 */
import { AnthropicError } from "../../../sdk/core/error.mjs";

//@ chunk-b8zxeazh.js:9374-9460 esm-fingerprint
function encodeURIPath(str) {
  return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
//@ chunk-b8zxeazh.js:9460-10486 esm-fingerprint
var EMPTY = Object.freeze(Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) =>
  function (statics, ...params) {
    if (statics.length === 1) return statics[0];
    let postPath = false;
    let invalidSegments = [];
    let path = statics.reduce((previousValue, currentValue, index) => {
      if (/[?#]/.test(currentValue)) postPath = true;
      let value = params[index];
      let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
      if (
        index !== params.length &&
        (value == null ||
          (typeof value === "object" &&
            value.toString ===
              Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString))
      ) {
        encoded = value + "";
        invalidSegments.push({
          start: previousValue.length + currentValue.length,
          length: encoded.length,
          error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`,
        });
      }
      return previousValue + currentValue + (index === params.length ? "" : encoded);
    }, "");
    let pathOnly = path.split(/[?#]/, 1)[0];
    let invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
    let match;
    while ((match = invalidSegmentPattern.exec(pathOnly)) !== null)
      invalidSegments.push({
        start: match.index,
        length: match[0].length,
        error: `Value "${match[0]}" can't be safely passed as a path parameter`,
      });
    invalidSegments.sort((a, b) => a.start - b.start);
    if (invalidSegments.length > 0) {
      let lastEnd = 0;
      let underline = invalidSegments.reduce((acc, segment) => {
        let spaces = " ".repeat(segment.start - lastEnd);
        let arrows = "^".repeat(segment.length);
        lastEnd = segment.start + segment.length;
        return acc + spaces + arrows;
      }, "");
      throw new AnthropicError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join(`
`)}
${path}
${underline}`);
    }
    return path;
  };
var formatter = createPathTagFunction(encodeURIPath);
export { formatter };
