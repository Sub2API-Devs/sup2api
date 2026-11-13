package moderation

import (
	"fmt"
	"strings"
	"testing"
)

// conversation is an anthropic.messages request body of turns, user and
// assistant by turns, the first a user's.
func conversation(turns ...string) string {
	msgs := make([]string, len(turns))
	for i, t := range turns {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		msgs[i] = fmt.Sprintf(`{"role":%q,"content":%q}`, role, t)
	}
	return `{"messages":[` + strings.Join(msgs, ",") + `]}`
}

// hit_replay = new_content (the default, CONTRACTS §72.5, 0.10.0), after the
// request: a conversation whose history holds a cached hit is recorded as a
// replayed hit, and what is new beside it is moderated - a new hit there is
// a new violation. A request holding nothing new is replayed by the hook;
// a hit only the KV knows is replayed by the worker, which then moderates the
// rest. Under whole the replay decides the whole request (0.9.3).
func TestHitReplayNewContent(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeObserve, "record_pass": true})
	openAIFlow(t, h, mod.srv.URL)
	const old = "MOD-HIT-violence first"
	if r := mustHook(t, h, rawReq(3, "c1", protoAnthropic, conversation(old))); r.GetNote() != queuedNote {
		t.Fatalf("first = %+v", r)
	}
	if ev := recordOf(t, h, "c1"); ev.Result != ResultHit || ev.Replayed {
		t.Fatalf("first record = %+v", ev.Event)
	}
	// History with the hit, and a new question: queued; the worker records
	// the replay and sends the rest, without the hit, to the auditor.
	calls := len(mod.moderated())
	if r := mustHook(t, h, rawReq(3, "c2", protoAnthropic, conversation(old, "noted", "a new question"))); r.GetNote() != queuedNote {
		t.Fatalf("history = %+v", r)
	}
	evs := waitEvents(t, h, map[string]string{"request_id": "c2"}, 2)
	replay, rest := splitReplay(t, evs)
	if replay.Result != ResultHit || rest.Result != ResultPass {
		t.Fatalf("records = replay %+v, rest %+v", replay.Event, rest.Event)
	}
	texts := mod.moderated()
	if len(texts) != calls+1 || !strings.Contains(texts[calls], "a new question") || strings.Contains(texts[calls], old) {
		t.Fatalf("sent = %q", texts[calls:])
	}
	d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", rest.ID), nil, nil))
	if d.Text == nil || strings.Contains(*d.Text, old) || !strings.Contains(*d.Text, "a new question") {
		t.Fatalf("rest text = %v", d.Text)
	}
	// A new hit beside the old one is a hit of its own.
	if r := mustHook(t, h, rawReq(3, "c3", protoAnthropic, conversation(old, "noted", "MOD-HIT-sexual new"))); r.GetNote() != queuedNote {
		t.Fatalf("new hit = %+v", r)
	}
	_, rest = splitReplay(t, waitEvents(t, h, map[string]string{"request_id": "c3"}, 2))
	if rest.Result != ResultHit || rest.HighestCategory != "sexual" {
		t.Fatalf("new hit record = %+v", rest.Event)
	}
	// Nothing but the hit and what passed: the hook replays it.
	calls = len(mod.moderated())
	if r := mustHook(t, h, rawReq(3, "c4", protoAnthropic, conversation(old, "noted", "a new question"))); r.GetNote() != notePrefix+"hit (replay)" {
		t.Fatalf("nothing new = %+v", r)
	}
	// Only the KV knows the hit: the worker replays it and sends the rest.
	emptyMemory(p)
	if r := mustHook(t, h, rawReq(3, "c5", protoAnthropic, conversation(old, "noted", "another question"))); r.GetNote() != queuedNote {
		t.Fatalf("memory miss = %+v", r)
	}
	replay, rest = splitReplay(t, waitEvents(t, h, map[string]string{"request_id": "c5"}, 2))
	if tr := traceOf(t, replay); tr.Cache == nil || tr.Cache.SourceRequestID != "c1" || rest.Result != ResultPass {
		t.Fatalf("worker records = replay %+v, rest %+v", replay.Event, rest.Event)
	}
	if texts := mod.moderated(); len(texts) != calls+1 || strings.Contains(texts[calls], old) || !strings.Contains(texts[calls], "another question") {
		t.Fatalf("worker sent = %q", texts[calls:])
	}
	// whole: the replay decides the request, nothing is sent.
	if errs := h.Configure(map[string]any{"mode": ModeObserve, "record_pass": true, "hit_replay": HitReplayWhole}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	calls = len(mod.moderated())
	if r := mustHook(t, h, rawReq(3, "c6", protoAnthropic, conversation(old, "noted", "a third question"))); r.GetNote() != notePrefix+"hit (replay)" {
		t.Fatalf("whole = %+v", r)
	}
	if ev := recordOf(t, h, "c6"); !ev.Replayed || len(mod.moderated()) != calls {
		t.Fatalf("whole record = %+v, %d calls", ev.Event, len(mod.moderated())-calls)
	}
}

// splitReplay returns the replayed record of a request and the other one.
func splitReplay(t *testing.T, evs []EventListItem) (replay, rest EventListItem) {
	t.Helper()
	if len(evs) != 2 || evs[0].Replayed == evs[1].Replayed {
		t.Fatalf("records = %+v", evs)
	}
	if evs[0].Replayed {
		return evs[0], evs[1]
	}
	return evs[1], evs[0]
}

// A request moderated first that holds a cached hit is refused under either
// hit_replay; under new_content the message says the history holds content
// already flagged.
func TestHitReplayPreMessage(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeEnforce})
	openAIFlow(t, h, mod.srv.URL)
	const old = "MOD-HIT-violence first"
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, conversation(old))); !denied(r) || r.GetDenyMessage() != DefaultBlockMessage {
		t.Fatalf("hit = %+v", r)
	}
	r := mustHook(t, h, rawReq(3, "", protoAnthropic, conversation(old, "noted", "a new question")))
	if !denied(r) || !replayed(r) || r.GetDenyMessage() != DefaultBlockMessage+" "+MsgHistoryHit {
		t.Fatalf("new_content = %+v", r)
	}
	if errs := h.Configure(map[string]any{"mode": ModeEnforce, "hit_replay": HitReplayWhole}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	r = mustHook(t, h, rawReq(3, "", protoAnthropic, conversation(old, "noted", "a new question")))
	if !denied(r) || !replayed(r) || r.GetDenyMessage() != DefaultBlockMessage {
		t.Fatalf("whole = %+v", r)
	}
}
