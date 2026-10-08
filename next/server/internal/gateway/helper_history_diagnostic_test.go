package gateway

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestHelperFinalizationStagesAndSafeError(t *testing.T) {
	var log bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&log, nil)))
	defer slog.SetDefault(old)
	for _, tc := range []struct {
		mode, stage string
		commit      bool
	}{{"thinking_unknown", "public_prefix", false}, {"thinking_estimates", "commit", true}} {
		t.Run(tc.stage, func(t *testing.T) {
			log.Reset()
			e, s, calls := helperHTTPFixture(t, tc.mode)
			s.commitErr = tc.commit
			req := helperRequestBody()
			req["stream"] = true
			res := e.messages(req)
			if res.status != 503 || calls.Load() != 1 || !strings.Contains(log.String(), `"stage":"`+tc.stage+`"`) {
				t.Fatalf("missing failure stage: %d %s", res.status, log.String())
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			if len(s.usage) != 1 || s.usage[0].Tokens.Output != 66 || s.usage[0].Success {
				t.Fatal("known usage lost or duplicated")
			}
		})
	}
	log.Reset()
	logHelperFinalizationError(context.Background(), "safe-rid", 22, "commit", core.ErrConflict.WithMessage("PRIVATE_BODY").WithCause(fmt.Errorf("PRIVATE_TOKEN")))
	logHelperFinalizationError(context.Background(), "safe-rid", 22, "PRIVATE_STAGE", fmt.Errorf("PRIVATE_PROFILE"))
	if strings.Contains(log.String(), "PRIVATE_") || !strings.Contains(log.String(), `"error_kind":"conflict"`) || !strings.Contains(log.String(), `"stage":"unknown"`) {
		t.Fatal("unsafe or missing diagnosis", log.String())
	}
}
