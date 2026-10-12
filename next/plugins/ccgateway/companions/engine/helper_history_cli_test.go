package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
)

func writeHelperHistoryFixture(w http.ResponseWriter, model string, blocks []Object) {
	recorder := httptest.NewRecorder()
	writeInternalCacheFixture(recorder, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	emit := func(e Object) {
		raw, _ := json.Marshal(e)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), raw)
	}
	for _, line := range strings.Split(recorder.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		e, _ := decodeObject([]byte(strings.TrimSpace(line[5:])))
		b, _ := e["content_block"].(Object)
		if str(e, "type") != "content_block_start" || str(b, "type") != "thinking" {
			emit(e)
			continue
		}
		thinking, signature := b["thinking"], b["signature"]
		e["content_block"] = Object{"type": "thinking", "thinking": "", "signature": ""}
		emit(e)
		emit(Object{"type": "content_block_delta", "index": e["index"], "delta": Object{"type": "thinking_delta", "thinking": thinking}})
		emit(Object{"type": "content_block_delta", "index": e["index"], "delta": Object{"type": "signature_delta", "signature": signature}})
	}
}
