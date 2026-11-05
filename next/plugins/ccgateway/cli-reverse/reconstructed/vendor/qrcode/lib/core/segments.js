/**
 * qrcode/lib/core/segments.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_mode } from "./mode.js";
import { require_numeric_data } from "./numeric-data.js";
import { require_alphanumeric_data } from "./alphanumeric-data.js";
import { require_byte_data } from "./byte-data.js";
import { require_kanji_data } from "./kanji-data.js";
import { require_regex } from "./regex.js";
import { require_utils } from "./utils.js";
import { require_dijkstra } from "../../../dijkstrajs/dijkstra.js";

//@ chunk-s2h2kd6t.js:14833-17575 cjs-fingerprint
var require_segments = __commonJS(function (cjsExports) {
  var Mode = require_mode();
  var NumericData = require_numeric_data();
  var AlphanumericData = require_alphanumeric_data();
  var ByteData = require_byte_data();
  var KanjiData = require_kanji_data();
  var Regex = require_regex();
  var Utils = require_utils();
  var dijkstra = require_dijkstra();
  function getStringByteLength(str) {
    return unescape(encodeURIComponent(str)).length;
  }
  function getSegments(regex, mode, str) {
    let segments = [];
    let result;
    while ((result = regex.exec(str)) !== null)
      segments.push({
        data: result[0],
        index: result.index,
        mode,
        length: result[0].length,
      });
    return segments;
  }
  function getSegmentsFromString(dataStr) {
    let numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
    let alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
    let byteSegs;
    let kanjiSegs;
    if (Utils.isKanjiModeEnabled()) {
      byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
      kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
    } else {
      byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
      kanjiSegs = [];
    }
    return numSegs
      .concat(alphaNumSegs, byteSegs, kanjiSegs)
      .sort(function (s1, s2) {
        return s1.index - s2.index;
      })
      .map(function (obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length,
        };
      });
  }
  function getSegmentBitsLength(length, mode) {
    switch (mode) {
      case Mode.NUMERIC:
        return NumericData.getBitsLength(length);
      case Mode.ALPHANUMERIC:
        return AlphanumericData.getBitsLength(length);
      case Mode.KANJI:
        return KanjiData.getBitsLength(length);
      case Mode.BYTE:
        return ByteData.getBitsLength(length);
    }
  }
  function mergeSegments(segs) {
    return segs.reduce(function (acc, curr) {
      let prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
      if (prevSeg && prevSeg.mode === curr.mode) {
        acc[acc.length - 1].data += curr.data;
        return acc;
      }
      acc.push(curr);
      return acc;
    }, []);
  }
  function buildNodes(segs) {
    let nodes = [];
    for (let i = 0; i < segs.length; i++) {
      let seg = segs[i];
      switch (seg.mode) {
        case Mode.NUMERIC:
          nodes.push([
            seg,
            {
              data: seg.data,
              mode: Mode.ALPHANUMERIC,
              length: seg.length,
            },
            {
              data: seg.data,
              mode: Mode.BYTE,
              length: seg.length,
            },
          ]);
          break;
        case Mode.ALPHANUMERIC:
          nodes.push([
            seg,
            {
              data: seg.data,
              mode: Mode.BYTE,
              length: seg.length,
            },
          ]);
          break;
        case Mode.KANJI:
          nodes.push([
            seg,
            {
              data: seg.data,
              mode: Mode.BYTE,
              length: getStringByteLength(seg.data),
            },
          ]);
          break;
        case Mode.BYTE:
          nodes.push([
            {
              data: seg.data,
              mode: Mode.BYTE,
              length: getStringByteLength(seg.data),
            },
          ]);
      }
    }
    return nodes;
  }
  function buildGraph(nodes, version) {
    let table = {};
    let graph = {
      start: {},
    };
    let prevNodeIds = ["start"];
    for (let i = 0; i < nodes.length; i++) {
      let nodeGroup = nodes[i];
      let currentNodeIds = [];
      for (let j = 0; j < nodeGroup.length; j++) {
        let node = nodeGroup[j];
        let key = "" + i + j;
        currentNodeIds.push(key);
        table[key] = {
          node,
          lastCount: 0,
        };
        graph[key] = {};
        for (let n = 0; n < prevNodeIds.length; n++) {
          let prevNodeId = prevNodeIds[n];
          if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
            graph[prevNodeId][key] =
              getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) -
              getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
            table[prevNodeId].lastCount += node.length;
          } else {
            if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
            graph[prevNodeId][key] =
              getSegmentBitsLength(node.length, node.mode) +
              4 +
              Mode.getCharCountIndicator(node.mode, version);
          }
        }
      }
      prevNodeIds = currentNodeIds;
    }
    for (let n = 0; n < prevNodeIds.length; n++) graph[prevNodeIds[n]].end = 0;
    return {
      map: graph,
      table,
    };
  }
  function buildSingleSegment(data, modesHint) {
    let mode;
    let bestMode = Mode.getBestModeForData(data);
    mode = Mode.from(modesHint, bestMode);
    if (mode !== Mode.BYTE && mode.bit < bestMode.bit)
      throw Error(
        '"' +
          data +
          '" cannot be encoded with mode ' +
          Mode.toString(mode) +
          `.
 Suggested mode is: ` +
          Mode.toString(bestMode),
      );
    if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) mode = Mode.BYTE;
    switch (mode) {
      case Mode.NUMERIC:
        return new NumericData(data);
      case Mode.ALPHANUMERIC:
        return new AlphanumericData(data);
      case Mode.KANJI:
        return new KanjiData(data);
      case Mode.BYTE:
        return new ByteData(data);
    }
  }
  cjsExports.fromArray = function (array) {
    return array.reduce(function (acc, seg) {
      if (typeof seg === "string") acc.push(buildSingleSegment(seg, null));
      else if (seg.data) acc.push(buildSingleSegment(seg.data, seg.mode));
      return acc;
    }, []);
  };
  cjsExports.fromString = function (data, version) {
    let segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
    let nodes = buildNodes(segs);
    let graph = buildGraph(nodes, version);
    let path = dijkstra.find_path(graph.map, "start", "end");
    let optimizedSegs = [];
    for (let i = 1; i < path.length - 1; i++) optimizedSegs.push(graph.table[path[i]].node);
    return cjsExports.fromArray(mergeSegments(optimizedSegs));
  };
  cjsExports.rawSplit = function (data) {
    return cjsExports.fromArray(getSegmentsFromString(data, Utils.isKanjiModeEnabled()));
  };
});
export { require_segments };
