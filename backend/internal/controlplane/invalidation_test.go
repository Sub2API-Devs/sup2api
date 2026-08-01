package controlplane

import (
	"testing"

	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
)

func TestInvalidationHubReplaysAndForcesFullResyncAcrossHistoryGap(t *testing.T) {
	hub := NewInvalidationHub(nil)
	hub.publish(controlv1.InvalidationKind_INVALIDATION_KIND_API_KEY, "digest-1", "")
	stream, cancel := hub.subscribe(0)
	event := <-stream
	if event.GetSequence() != 1 || event.GetSubject() != "digest-1" {
		t.Fatalf("replayed event = %+v", event)
	}
	cancel()

	for i := 0; i < invalidationHistorySize+2; i++ {
		hub.publish(controlv1.InvalidationKind_INVALIDATION_KIND_API_KEY, "digest", "")
	}
	gapped, cancelGap := hub.subscribe(1)
	defer cancelGap()
	if got := <-gapped; got.GetKind() != controlv1.InvalidationKind_INVALIDATION_KIND_FULL_RESYNC {
		t.Fatalf("gap event = %+v", got)
	}
}

func TestInvalidationHubAdvancesSequenceAcrossControlPlaneRestart(t *testing.T) {
	hub := NewInvalidationHub(nil)
	stream, cancel := hub.subscribe(900)
	defer cancel()
	event := <-stream
	if event.GetKind() != controlv1.InvalidationKind_INVALIDATION_KIND_FULL_RESYNC || event.GetSequence() <= 900 {
		t.Fatalf("restart event = %+v", event)
	}
	hub.publish(controlv1.InvalidationKind_INVALIDATION_KIND_API_KEY, "digest", "")
	next := <-stream
	if next.GetSequence() <= event.GetSequence() {
		t.Fatalf("next event = %+v after %+v", next, event)
	}
}
