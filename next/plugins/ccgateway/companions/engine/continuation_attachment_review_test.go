package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReviewNativeReminderAfterAssistantIsNotUserProof(t *testing.T) {
	r := &Request{continuation: "private", Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "real user"}}}}}
	row := func(o Object) json.RawMessage { b, err := json.Marshal(o); require.NoError(t, err); return b }
	p := &Prepared{Rows: []json.RawMessage{
		row(Object{"type": "user", "message": Object{"content": r.cliWireMessage(r.Messages[0]).Content}}),
		row(Object{"type": "assistant", "message": Object{"content": []Object{{"type": "text", "text": "answer"}}}}),
		row(Object{"type": "attachment", "attachment": Object{"type": "total_tokens_reminder", "text": "not user scoped"}}),
	}}
	assert.Empty(t, nativeContinuationReminders(r, p))
}
