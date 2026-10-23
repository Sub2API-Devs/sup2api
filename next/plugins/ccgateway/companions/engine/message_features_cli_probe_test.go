package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
)

func writeDocumentProbeReply(w http.ResponseWriter, model string, cite bool) {
	if !cite {
		writeSurfaceFixture(w, model, []Object{{"type": "text", "text": "DOCUMENT_PROBE_OK"}})
		return
	}
	recorder := httptest.NewRecorder()
	writeSurfaceFixture(recorder, model, []Object{{"type": "text", "text": "DOCUMENT_PROBE_OK"}})
	w.Header().Set("Content-Type", "text/event-stream")
	for _, part := range strings.Split(recorder.Body.String(), "\n\n") {
		if part == "" {
			continue
		}
		fmt.Fprint(w, part+"\n\n")
		if strings.Contains(part, `"type":"text_delta"`) {
			event := Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "citations_delta", "citation": Object{"type": "char_location", "cited_text": "DOCUMENT_SENTINEL", "document_index": 0, "document_title": "Fixture", "start_char_index": 0, "end_char_index": 17}}}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: content_block_delta\ndata: %s\n\n", data)
		}
	}
}

func messageProbeEnv(root, endpoint string) []string {
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	return envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-document-fixture", "ANTHROPIC_BASE_URL": endpoint, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "ENABLE_TOOL_SEARCH": "false"})
}
