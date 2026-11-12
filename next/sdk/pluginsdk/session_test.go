package pluginsdk

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// mapKV is an in-memory KV that records the ttl of every Set.
type mapKV struct {
	values map[string][]byte
	ttls   map[string]time.Duration
	err    error
}

func newMapKV() *mapKV { return &mapKV{values: map[string][]byte{}, ttls: map[string]time.Duration{}} }

func (k *mapKV) Get(_ context.Context, ns, key string) ([]byte, bool, error) {
	v, ok := k.values[ns+"/"+key]
	return v, ok, k.err
}
func (k *mapKV) Set(_ context.Context, ns, key string, value []byte, ttl time.Duration) error {
	k.values[ns+"/"+key], k.ttls[ns+"/"+key] = value, ttl
	return k.err
}
func (k *mapKV) Delete(_ context.Context, ns, key string) error {
	delete(k.values, ns+"/"+key)
	return k.err
}
func (k *mapKV) List(context.Context, string, string, string, int) ([]string, string, error) {
	return nil, "", k.err
}

func callerReq(uid int64) *pluginv1.HTTPRequest {
	return &pluginv1.HTTPRequest{Caller: &pluginv1.Caller{UserId: uid}}
}

type flowState struct {
	Verifier string `json:"verifier"`
	Polls    int    `json:"polls"`
}

func TestCallerSessionBelongsToItsCaller(t *testing.T) {
	ctx, kv := context.Background(), newMapKV()
	id, err := SaveCallerSession(ctx, kv, "oauth", callerReq(7), flowState{Verifier: "v"}, 30*time.Minute)
	if err != nil || len(id) != 32 {
		t.Fatalf("save: id %q, %v", id, err)
	}
	if kv.ttls["oauth/"+id] != 30*time.Minute {
		t.Fatalf("ttl = %v", kv.ttls)
	}
	other, _ := SaveCallerSession(ctx, kv, "oauth", callerReq(7), flowState{}, time.Minute)
	if other == id {
		t.Fatal("session ids repeat")
	}

	var got flowState
	if ok, err := LoadCallerSession(ctx, kv, "oauth", id, callerReq(7), &got); !ok || err != nil || got.Verifier != "v" {
		t.Fatalf("own session: %v %v %+v", ok, err, got)
	}

	// Everyone else, a missing id and another namespace look the same.
	cases := []struct {
		name, ns, id string
		req          *pluginv1.HTTPRequest
	}{
		{"another user", "oauth", id, callerReq(8)},
		{"no caller", "oauth", id, callerReq(0)},
		{"nil caller", "oauth", id, &pluginv1.HTTPRequest{}},
		{"nil request", "oauth", id, nil},
		{"missing id", "oauth", "nope", callerReq(7)},
		{"empty id", "oauth", "", callerReq(7)},
		{"another namespace", "device", id, callerReq(7)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			leak := flowState{}
			if ok, err := LoadCallerSession(ctx, kv, tc.ns, tc.id, tc.req, &leak); ok || err != nil || leak != (flowState{}) {
				t.Fatalf("= %v %v %+v, want false nil and nothing read", ok, err, leak)
			}
		})
	}
}

// Entries written before sessions were bound (a bare payload) or by anything
// else are not sessions: the flow has to be started again.
func TestCallerSessionIgnoresForeignEntries(t *testing.T) {
	ctx, kv := context.Background(), newMapKV()
	for name, raw := range map[string]string{
		"legacy bare payload": `{"verifier":"v","state":"s"}`,
		"no payload":          `{"uid":7}`,
		"not json":            `garbage`,
		"uid as string":       `{"uid":"7","v":{}}`,
	} {
		kv.values["oauth/x"] = []byte(raw)
		var got flowState
		if ok, err := LoadCallerSession(ctx, kv, "oauth", "x", callerReq(7), &got); ok || err != nil {
			t.Fatalf("%s: %v %v", name, ok, err)
		}
	}
}

func TestUpdateCallerSessionKeepsTheBinding(t *testing.T) {
	ctx, kv := context.Background(), newMapKV()
	id, _ := SaveCallerSession(ctx, kv, "device", callerReq(7), flowState{}, time.Minute)
	if err := UpdateCallerSession(ctx, kv, "device", id, callerReq(7), flowState{Polls: 2}, 10*time.Second); err != nil {
		t.Fatal(err)
	}
	var got flowState
	if ok, _ := LoadCallerSession(ctx, kv, "device", id, callerReq(7), &got); !ok || got.Polls != 2 || kv.ttls["device/"+id] != 10*time.Second {
		t.Fatalf("updated session: %v %+v %v", ok, got, kv.ttls)
	}
	if ok, _ := LoadCallerSession(ctx, kv, "device", id, callerReq(8), &got); ok {
		t.Fatal("another user reads the updated session")
	}
}

func TestCallerSessionErrors(t *testing.T) {
	ctx, kv := context.Background(), newMapKV()
	for _, req := range []*pluginv1.HTTPRequest{nil, {}, callerReq(0), callerReq(-1)} {
		if id, err := SaveCallerSession(ctx, kv, "oauth", req, flowState{}, time.Minute); !errors.Is(err, ErrNoCaller) || id != "" || len(kv.values) != 0 {
			t.Fatalf("save without a caller: %q %v, stored %d", id, err, len(kv.values))
		}
	}
	if _, err := SaveCallerSession(ctx, kv, "oauth", callerReq(7), make(chan int), time.Minute); err == nil {
		t.Fatal("an unmarshalable payload must fail")
	}
	id, _ := SaveCallerSession(ctx, kv, "oauth", callerReq(7), flowState{Verifier: "v"}, time.Minute)
	var wrong []int
	if ok, err := LoadCallerSession(ctx, kv, "oauth", id, callerReq(7), &wrong); ok || err == nil {
		t.Fatalf("a payload that does not fit: %v %v", ok, err)
	}
	kv.err = errors.New("kv down")
	if ok, err := LoadCallerSession(ctx, kv, "oauth", id, callerReq(7), &flowState{}); ok || err == nil || !strings.Contains(err.Error(), "kv down") {
		t.Fatalf("kv failure: %v %v", ok, err)
	}
	if id, err := SaveCallerSession(ctx, kv, "oauth", callerReq(7), flowState{}, time.Minute); err == nil || id != "" {
		t.Fatal("a failed Set must fail the save and return no id")
	}
}
