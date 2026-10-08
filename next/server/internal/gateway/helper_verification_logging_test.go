package gateway

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
)

func TestHelperVerificationLogContainsOnlySafeFacts(t *testing.T) {
	var out bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&out, nil)))
	defer slog.SetDefault(old)
	c := &call{rid: "core-rid"}
	c.logHelperVerification(context.Background(), 22, ccgateway.VerificationStage("identity", errors.New("SECRET_TOKEN_PROFILE")))
	s := out.String()
	for _, want := range []string{`"request_id":"core-rid"`, `"account_id":22`, `"stage":"identity"`, `"class":"verification_failure"`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s", want)
		}
	}
	if strings.Contains(s, "SECRET") || strings.Contains(s, "worker_request_id") || strings.Count(s, "\n") != 1 {
		t.Fatal("cause leaked, request ID invented, or duplicate log")
	}
}
