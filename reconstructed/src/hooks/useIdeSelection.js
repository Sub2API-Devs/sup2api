/**
 * hooks/useIdeSelection.ts
 *
 * 订阅 IDE selection_changed 通知，维护当前选区（文件、行数、文本）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIdeSelection.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: fingerprint 2
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, literal, E, string } from "../../vendor/zod/v4/classic/schemas.js";
import { R, P } from "../../vendor/react/cjs/react.production.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { logError } from "../utils/log.js";

//@ chunk-18hwfzwa.js:208035-208244 fingerprint = SelectionChangedSchema (0.834)
var SelectionChangedSchema = DoctorLazy(() =>
  u({
    method: literal("selection_changed"),
    params: u({
      selection: u({
        start: u({
          line: E(),
          character: E(),
        }),
        end: u({
          line: E(),
          character: E(),
        }),
      })
        .nullable()
        .optional(),
      text: string().optional(),
      filePath: string().optional(),
    }),
  }),
);
//@ chunk-18hwfzwa.js:208244-208743 fingerprint = useIdeSelection (0.876)
function useIdeSelection(mcpClients, onSelect) {
  let handlersRegistered = R(false);
  let currentIDERef = R(null);
  P(() => {
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
