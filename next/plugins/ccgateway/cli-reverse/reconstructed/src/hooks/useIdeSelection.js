/**
 * hooks/useIdeSelection.ts
 *
 * 订阅 IDE selection_changed 通知，维护当前选区（文件、行数、文本）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIdeSelection.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, literal, numberSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { logError } from "../utils/log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:212834-213043 fingerprint (2.1.88 match: SelectionChangedSchema, 0.834)
var SelectionChangedSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:212834", () => {
  SelectionChangedSchema = DoctorLazy(() =>
    objectSchema({
      method: literal("selection_changed"),
      params: objectSchema({
        selection: objectSchema({
          start: objectSchema({
            line: numberSchema(),
            character: numberSchema(),
          }),
          end: objectSchema({
            line: numberSchema(),
            character: numberSchema(),
          }),
        })
          .nullable()
          .optional(),
        text: stringSchema().optional(),
        filePath: stringSchema().optional(),
      }),
    }),
  );
});
//@ chunk-czq1j3j2.js:213043-213542 fingerprint (2.1.88 match: useIdeSelection, 0.876)
function useIdeSelection(mcpClients, onSelect) {
  let handlersRegistered = useRef(false);
  let currentIDERef = useRef(null);
  useEffect(() => {
    let ideClient = hasAccessToIDEExtensionDiffFeature(mcpClients);
    if (currentIDERef.current !== (ideClient ?? null)) {
      handlersRegistered.current = false;
      currentIDERef.current = ideClient || null;
      onSelect({
        lineCount: 0,
        lineStart: undefined,
        text: undefined,
        filePath: undefined,
      });
    }
    if (handlersRegistered.current || !ideClient) return;
    onMcpNotification(ideClient, SelectionChangedSchema(), (data) => {
      if (currentIDERef.current !== ideClient) return;
      try {
        let params = data.params;
        let selection = params.selection;
        if (!selection?.start || !selection?.end) return;
        let { start, end } = selection;
        let lineCount = end.line - start.line + 1;
        if (end.character === 0) lineCount--;
        onSelect({
          lineCount,
          lineStart: start.line + 1,
          text: params.text,
          filePath: params.filePath,
        });
      } catch (error) {
        logError(error);
      }
    });
    handlersRegistered.current = true;
  }, [mcpClients, onSelect]);
}
export { useIdeSelection };
