package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContinuationReminderAuthenticatedWithoutLogging(t *testing.T) {
	c, err := startModControl(&runConfig{env: map[string]string{}, reminderMarker: "request-marker"}, "http://127.0.0.1:8787")
	require.NoError(t, err)
	t.Cleanup(c.Close)
	call := func(token, body string) int {
		r := httptest.NewRequest("POST", c.URL, strings.NewReader(body))
		r.RemoteAddr = "127.0.0.1:1234"
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		c.ServeHTTP(w, r)
		return w.Code
	}
	const ack = `{"event":"continuation_reminder","detail":{"text":"native"}}`
	assert.NotEqual(t, http.StatusOK, call("wrong", ack))
	assert.NotEqual(t, http.StatusOK, call(c.token, ack))
	require.Equal(t, http.StatusOK, call(c.token, `{"event":"ready","version":"ccgateway-v3"}`))
	require.Equal(t, http.StatusOK, call(c.token, ack))
	require.Equal(t, http.StatusOK, call(c.token, ack))
	assert.Equal(t, 2, c.reminderAcks["native"])
	assert.NotEqual(t, http.StatusOK, call(c.token, `{"event":"continuation_reminder","detail":{"text":"native","unknown":true}}`))
	assert.NotEqual(t, http.StatusOK, call(c.token, `{"event":"continuation_reminder","detail":{"text":"`+strings.Repeat("x", 4097)+`"}}`))
}

func TestNativeContinuationReminderRequiresNativeFirstUser(t *testing.T) {
	r := &Request{continuation: "marker", Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "fixture"}}}}}
	row := func(o Object) json.RawMessage { b, err := json.Marshal(o); require.NoError(t, err); return b }
	p := &Prepared{Rows: []json.RawMessage{row(Object{"type": "user", "message": Object{"content": r.cliWireMessage(r.Messages[0]).Content}}), row(Object{"type": "attachment", "attachment": Object{"type": "total_tokens_reminder", "text": "native"}})}}
	ordinal, ok := nativeContinuationReminders(r, p)["native"]
	require.True(t, ok)
	assert.Zero(t, ordinal)
	p.Rows[0] = row(Object{"type": "user", "message": Object{"content": "different"}})
	assert.Empty(t, nativeContinuationReminders(r, p))
}
