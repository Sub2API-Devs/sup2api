/**
 * services/mcp/listPagination.ts
 *
 * 2.1.316 新增：MCP 列表分页。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (3)
 * attribution: placement 3
 */
import {
  getConnectionTimeoutMs,
  hasNoTransport,
  isTimeoutError,
  Fs,
  ui,
  isRetryableListError,
} from "./client.js";
import { logMCPDebug } from "../../utils/log.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { describeConnectError } from "./auth.js";
import { sleep } from "../../utils/sleep.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { SdkError, Ti } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-8t8n4kdh.js:48365-49332 placement
async function listAllPages_2(e, n, r, s, h, y, S, w) {
  let P = !1;
  for (let M = 0; ; M++) {
    let j = [],
      R = new Set(),
      ce,
      Q = 0,
      ie;
    try {
      do {
        let ge = () =>
            e.request({ method: s, ...(ce && { params: { cursor: ce } }) }, h, {
              timeout: getConnectionTimeoutMs(),
            }),
          Ie =
            S?.catch((ke) => {
              if (hasNoTransport(e) || isTimeoutError(ke)) throw ke;
              return (
                logMCPDebug(
                  n,
                  `first ${s} page, sent during the connect, failed (${truncateToLength(describeConnectError(ke, r), 200)}); sending it again`,
                ),
                ge()
              );
            }) ?? ge();
        S = void 0;
        let G = await Ie;
        if ((Q++, Q === 1)) w?.(G);
        let Pe = y(G);
        if (Pe) j.push(...Pe);
        if (ce) R.add(ce);
        if (((ce = G.nextCursor), ce && R.has(ce))) {
          ie = "repeated_cursor";
          break;
        }
        if (ce && Q >= Fs) {
          ie = "capped";
          break;
        }
      } while (ce);
      if (ie === "repeated_cursor")
        logMCPDebug(n, `${s} returned a nextCursor already sent in this walk (page ${Q}); stopping`);
      if (ie === "capped") logMCPDebug(n, `${s} still returning nextCursor after ${Fs} pages; stopping`);
      if (Q > 1) logListPaginated(s, Q, j.length, ie ?? "complete");
      return j;
    } catch (error) {
      if (Q > 0 && !P) ((P = !0), logListPaginated(s, Q, j.length, "error"));
      let Ie = ui[M];
      if (Ie === void 0 || !isRetryableListError(error) || hasNoTransport(e)) throw error;
      if (
        (logMCPDebug(n, `${s} failed (${describeConnectError(error, r)}); retrying in ${Ie}ms`),
        await sleep(Ie),
        hasNoTransport(e))
      )
        throw error;
    }
  }
}
//@ chunk-8t8n4kdh.js:49332-49456 placement
function logListPaginated(e, n, r, s, h = "pages") {
  logEvent("tengu_mcp_list_paginated", {
    method: fromEnum(e),
    pageCount: n,
    itemCount: r,
    outcome: fromEnum(s),
    source: fromEnum(h),
  });
}
//@ chunk-8t8n4kdh.js:49456-49905 placement
async function listToolsModern(e, n, r) {
  for (let s = 0; ; s++)
    try {
      let listTools = await e.listTools(void 0, { timeout: getConnectionTimeoutMs(), cacheMode: "refresh" });
      return (
        logListPaginated("tools/list", void 0, listTools.tools.length, "complete", "aggregate"),
        listTools.tools
      );
    } catch (error) {
      let y = ui[s];
      if (y === void 0 || !isRetryableListError(error)) {
        if (error instanceof SdkError && error.code === Ti.ListPaginationExceeded)
          logListPaginated("tools/list", void 0, 0, "capped", "aggregate");
        throw error;
      }
      if (hasNoTransport(e)) throw error;
      if (
        (logMCPDebug(n, `tools/list failed (${describeConnectError(error, r)}); retrying in ${y}ms`),
        await sleep(y),
        hasNoTransport(e))
      )
        throw error;
    }
}

export { listAllPages_2, listToolsModern };
