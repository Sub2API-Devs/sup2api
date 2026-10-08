package engine

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func waitResourceBarrier(t *testing.T, barrier <-chan string, want string) {
	t.Helper()
	select {
	case got := <-barrier:
		if got != want {
			t.Fatalf("waited on %s, wanted %s", got, want)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("resource concurrency barrier never reached")
	}
}
func TestResourceModelAndSaturatedCRUDDoNotDeadlock(t *testing.T) {
	g := &Gateway{Runner: &Runner{}, Key: "worker", Slots: make(chan struct{}, 4)}
	b := &resourceBroker{g: g, authority: &authManager{}, dir: t.TempDir(), limit: 1 << 20, budget: &resourceSpoolBudget{limit: 2 << 20}}
	g.resources = b
	// A resource model has finished issuer verification, released its verifier
	// slot, and retained authorization while three ordinary models are active.
	b.authority.mu.Lock()
	model := &resourceAdmission{unlock: b.authority.mu.Unlock}
	defer model.close()
	for i := 0; i < 3; i++ {
		g.Slots <- struct{}{}
	}
	barrier := make(chan string, 4)
	finished := make(chan struct{}, 4)
	ctx, cancel := context.WithCancel(context.WithValue(context.Background(), resourceWaitObserverKey{}, func(phase string) { barrier <- phase }))
	defer cancel()
	for i := 0; i < 4; i++ {
		r := httptest.NewRequest("GET", resources.IdentityPath, nil)
		if i == 0 {
			r = httptest.NewRequest("POST", resourcePrefix+"/v1/files", strings.NewReader("bounded upload"))
			r.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
		}
		r.Header.Set("X-Api-Key", "worker")
		go func(r *http.Request) { b.ServeHTTP(httptest.NewRecorder(), r.WithContext(ctx)); finished <- struct{}{} }(r)
	}
	for i := 0; i < 4; i++ {
		waitResourceBarrier(t, barrier, "authority")
	}
	if len(g.Slots) != 3 {
		t.Fatal("authority waiters consumed CLI slots", len(g.Slots))
	}
	// This is the model's second slot acquisition. It must succeed even though
	// enough CRUD requests are queued to saturate every slot in the old order.
	select {
	case g.Slots <- struct{}{}:
	default:
		t.Fatal("resource model cannot reacquire execution slot")
	}
	cancel()
	for i := 0; i < 4; i++ {
		select {
		case <-finished:
		case <-time.After(3 * time.Second):
			t.Fatal("canceled CRUD retained authorization wait or upload spool")
		}
	}
	if len(g.Slots) != 4 {
		t.Fatal("canceled waiters modified existing slots")
	}
	if b.budget.used != 0 {
		t.Fatal("canceled upload retained spool budget")
	}
	files, _ := filepath.Glob(filepath.Join(b.dir, "resource-body-*"))
	if len(files) != 0 {
		t.Fatal("canceled upload retained file")
	}
	<-g.Slots
	model.close()
	if !b.authority.mu.TryLock() {
		t.Fatal("completed model retained authorization")
	}
	b.authority.mu.Unlock()
}

func TestResourceAdmissionWaitOrderAndCancellation(t *testing.T) {
	for _, heldAuthority := range []bool{true, false} {
		t.Run(map[bool]string{true: "authority", false: "slot"}[heldAuthority], func(t *testing.T) {
			g := &Gateway{Slots: make(chan struct{}, 4)}
			b := &resourceBroker{g: g, authority: &authManager{}}
			g.resources = b
			for i := 0; i < 4; i++ {
				g.Slots <- struct{}{}
			}
			if heldAuthority {
				b.authority.mu.Lock()
				defer b.authority.mu.Unlock()
			}
			barrier := make(chan string, 1)
			ctx, cancel := context.WithCancel(context.WithValue(context.Background(), resourceWaitObserverKey{}, func(phase string) { barrier <- phase }))
			defer cancel()
			headers := http.Header{}
			headers.Set(resources.ResourceIDsHeader, `["file_fixture"]`)
			body := []byte(`{"messages":[{"role":"user","content":[{"type":"document","source":{"type":"file","file_id":"file_fixture"}}]}]}`)
			done := make(chan error, 1)
			go func() {
				grant, err := g.admitResourceReferences(ctx, body, headers)
				if grant != nil {
					grant.close()
				}
				done <- err
			}()
			phase := "slot"
			if heldAuthority {
				phase = "authority"
			}
			waitResourceBarrier(t, barrier, phase)
			cancel()
			select {
			case err := <-done:
				if !errors.Is(err, context.Canceled) {
					t.Fatal(err)
				}
			case <-time.After(3 * time.Second):
				t.Fatal("admission cancellation blocked")
			}
			if len(g.Slots) != 4 {
				t.Fatal("admission changed occupied slots")
			}
			if !heldAuthority {
				if !b.authority.mu.TryLock() {
					t.Fatal("slot cancellation retained authorization")
				}
				b.authority.mu.Unlock()
			}
		})
	}
}
