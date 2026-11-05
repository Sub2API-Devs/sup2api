/**
 * eventsource-parser/dist/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: eventsource-parser@3.0.8
 * pieces: chunk-sdd6eajv.js (6)
 * attribution: esm-fingerprint 2, esm-layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-sdd6eajv.js:191-335 esm-fingerprint
class ParseError extends Error {
  constructor(message, options) {
    super(message);
    this.name = "ParseError";
    this.type = options.type;
    this.field = options.field;
    this.value = options.value;
    this.line = options.line;
  }
}
//@ chunk-sdd6eajv.js:335-354 esm-layout
var LF = 10;
var CR = 13;
var SPACE = 32;
//@ chunk-sdd6eajv.js:354-369 esm-layout
function noop(noop) {}
//@ chunk-sdd6eajv.js:369-2857 esm-fingerprint
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?");
  let { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let pendingFragments = [];
  let isFirstChunk = true;
  let id;
  let data = "";
  let dataLines = 0;
  let eventType;
  function feed(chunk) {
    if (isFirstChunk) {
      isFirstChunk = false;
      if (chunk.charCodeAt(0) === 239 && chunk.charCodeAt(1) === 187 && chunk.charCodeAt(2) === 191)
        chunk = chunk.slice(3);
    }
    if (pendingFragments.length === 0) {
      let trailing2 = processLines(chunk);
      if (trailing2 !== "") pendingFragments.push(trailing2);
      return;
    }
    if (
      chunk.indexOf(`
`) === -1 &&
      chunk.indexOf("\r") === -1
    ) {
      pendingFragments.push(chunk);
      return;
    }
    pendingFragments.push(chunk);
    let input = pendingFragments.join("");
    pendingFragments.length = 0;
    let trailing = processLines(input);
    if (trailing !== "") pendingFragments.push(trailing);
  }
  function processLines(chunk) {
    let searchIndex = 0;
    if (chunk.indexOf("\r") === -1) {
      let lfIndex = chunk.indexOf(
        `
`,
        searchIndex,
      );
      for (; lfIndex !== -1;) {
        if (searchIndex === lfIndex) {
          if (dataLines > 0)
            onEvent({
              id,
              event: eventType,
              data,
            });
          id = undefined;
          data = "";
          dataLines = 0;
          eventType = undefined;
          searchIndex = lfIndex + 1;
          lfIndex = chunk.indexOf(
            `
`,
            searchIndex,
          );
          continue;
        }
        let firstCharCode = chunk.charCodeAt(searchIndex);
        if (isDataPrefix(chunk, searchIndex, firstCharCode)) {
          let valueStart = chunk.charCodeAt(searchIndex + 5) === SPACE ? searchIndex + 6 : searchIndex + 5;
          let value = chunk.slice(valueStart, lfIndex);
          if (dataLines === 0 && chunk.charCodeAt(lfIndex + 1) === LF) {
            onEvent({
              id,
              event: eventType,
              data: value,
            });
            id = undefined;
            data = "";
            eventType = undefined;
            searchIndex = lfIndex + 2;
            lfIndex = chunk.indexOf(
              `
`,
              searchIndex,
            );
            continue;
          }
          data =
            dataLines === 0
              ? value
              : `${data}
${value}`;
          dataLines++;
        } else if (isEventPrefix(chunk, searchIndex, firstCharCode))
          eventType =
            chunk.slice(
              chunk.charCodeAt(searchIndex + 6) === SPACE ? searchIndex + 7 : searchIndex + 6,
              lfIndex,
            ) || undefined;
        else parseLine(chunk, searchIndex, lfIndex);
        searchIndex = lfIndex + 1;
        lfIndex = chunk.indexOf(
          `
`,
          searchIndex,
        );
      }
      return chunk.slice(searchIndex);
    }
    for (; searchIndex < chunk.length;) {
      let crIndex = chunk.indexOf("\r", searchIndex);
      let lfIndex = chunk.indexOf(
        `
`,
        searchIndex,
      );
      let lineEnd = -1;
      if (crIndex !== -1 && lfIndex !== -1) lineEnd = crIndex < lfIndex ? crIndex : lfIndex;
      else if (crIndex !== -1) {
        if (crIndex === chunk.length - 1) lineEnd = -1;
        else lineEnd = crIndex;
      } else if (lfIndex !== -1) lineEnd = lfIndex;
      if (lineEnd === -1) break;
      parseLine(chunk, searchIndex, lineEnd);
      searchIndex = lineEnd + 1;
      if (chunk.charCodeAt(searchIndex - 1) === CR && chunk.charCodeAt(searchIndex) === LF) searchIndex++;
    }
    return chunk.slice(searchIndex);
  }
  function parseLine(chunk, start, end) {
    if (start === end) {
      dispatchEvent();
      return;
    }
    let firstCharCode = chunk.charCodeAt(start);
    if (isDataPrefix(chunk, start, firstCharCode)) {
      let valueStart = chunk.charCodeAt(start + 5) === SPACE ? start + 6 : start + 5;
      let value2 = chunk.slice(valueStart, end);
      data =
        dataLines === 0
          ? value2
          : `${data}
${value2}`;
      dataLines++;
      return;
    }
    if (isEventPrefix(chunk, start, firstCharCode)) {
      eventType =
        chunk.slice(chunk.charCodeAt(start + 6) === SPACE ? start + 7 : start + 6, end) || undefined;
      return;
    }
    if (firstCharCode === 105 && chunk.charCodeAt(start + 1) === 100 && chunk.charCodeAt(start + 2) === 58) {
      let value2 = chunk.slice(chunk.charCodeAt(start + 3) === SPACE ? start + 4 : start + 3, end);
      id = value2.includes("\x00") ? undefined : value2;
      return;
    }
    if (firstCharCode === 58) {
      if (onComment) {
        let line2 = chunk.slice(start, end);
        onComment(line2.slice(chunk.charCodeAt(start + 1) === SPACE ? 2 : 1));
      }
      return;
    }
    let line = chunk.slice(start, end);
    let fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex === -1) {
      processField(line, "", line);
      return;
    }
    let field = line.slice(0, fieldSeparatorIndex);
    let offset = line.charCodeAt(fieldSeparatorIndex + 1) === SPACE ? 2 : 1;
    let value = line.slice(fieldSeparatorIndex + offset);
    processField(field, value, line);
  }
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value || undefined;
        break;
      case "data":
        data =
          dataLines === 0
            ? value
            : `${data}
${value}`;
        dataLines++;
        break;
      case "id":
        id = value.includes("\x00") ? undefined : value;
        break;
      case "retry":
        if (/^\d+$/.test(value)) onRetry(parseInt(value, 10));
        else
          onError(
            new ParseError(`Invalid \`retry\` value: "${value}"`, {
              type: "invalid-retry",
              value,
              line,
            }),
          );
        break;
      default:
        onError(
          new ParseError(`Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`, {
            type: "unknown-field",
            field,
            value,
            line,
          }),
        );
        break;
    }
  }
  function dispatchEvent() {
    if (dataLines > 0)
      onEvent({
        id,
        event: eventType,
        data,
      });
    id = undefined;
    data = "";
    dataLines = 0;
    eventType = undefined;
  }
  function reset(options = {}) {
    if (options.consume && pendingFragments.length > 0) {
      let incompleteLine = pendingFragments.join("");
      parseLine(incompleteLine, 0, incompleteLine.length);
    }
    isFirstChunk = true;
    id = undefined;
    data = "";
    dataLines = 0;
    eventType = undefined;
    pendingFragments.length = 0;
  }
  return {
    feed,
    reset,
  };
}
//@ chunk-sdd6eajv.js:2857-2987 esm-layout
function isDataPrefix(chunk, i, firstCharCode) {
  return (
    firstCharCode === 100 &&
    chunk.charCodeAt(i + 1) === 97 &&
    chunk.charCodeAt(i + 2) === 116 &&
    chunk.charCodeAt(i + 3) === 97 &&
    chunk.charCodeAt(i + 4) === 58
  );
}
//@ chunk-sdd6eajv.js:2987-3144 esm-layout
function isEventPrefix(chunk, i, firstCharCode) {
  return (
    firstCharCode === 101 &&
    chunk.charCodeAt(i + 1) === 118 &&
    chunk.charCodeAt(i + 2) === 101 &&
    chunk.charCodeAt(i + 3) === 110 &&
    chunk.charCodeAt(i + 4) === 116 &&
    chunk.charCodeAt(i + 5) === 58
  );
}
export { createParser };
