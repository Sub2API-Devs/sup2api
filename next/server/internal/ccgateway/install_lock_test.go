package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/gin-gonic/gin"
)

// A locker that cannot answer is not "another operation holds it": installLock
// answers install_failed (503), the same answer the install handlers give when
// the lock fails.
type brokenLocker struct{}

func (brokenLocker) TryLock(context.Context, string, time.Duration) (core.Lock, bool, error) {
	return nil, false, errors.New("locker unavailable")
}

func TestInstallLockAnswersInstallFailedWhenTheLockerFails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest("POST", "/", nil)
	s := &Service{Locker: brokenLocker{}}
	if _, _, ok := s.installLock(c, context.Background()); ok {
		t.Fatal("installLock reported success")
	}
	if recorder.Code != 503 {
		t.Fatalf("status=%d want 503", recorder.Code)
	}
	var out map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if reason(out) != "install_failed" {
		t.Fatalf("reason= %v want install_failed: %s", reason(out), recorder.Body.String())
	}
}
