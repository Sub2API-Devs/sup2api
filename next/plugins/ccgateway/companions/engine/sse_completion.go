package engine

import "bytes"

// A stop_reason (including tool_use) alone is not a complete SSE message.
// Only the provider's actual message_stop permits a subsequent helper round.
func sseHasMessageStop(event []byte) bool {
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(event, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		if value, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			data = append(data, bytes.TrimSpace(value))
		}
	}
	value, err := decodeObject(bytes.Join(data, []byte("\n")))
	return err == nil && str(value, "type") == "message_stop"
}
