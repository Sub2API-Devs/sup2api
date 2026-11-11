package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// The verdict cache and images: what is stored for an image an auditor did
// not receive.

// imageMod is an upstream for both auditor types: the moderation API finds
// every image violating (and no text), Jev finds nothing; it counts the Jev
// calls that came with an image, and all calls.
func imageMod(t *testing.T) (base string, jevImages, calls *atomic.Int64) {
	base, jevImages, calls, _, _ = imageModSent(t)
	return base, jevImages, calls
}

// modOrder is the order in which imageModSent answers the two calls of one
// request, for a test whose requests come one after the other and call each
// API at most once: Jev answers after the moderation API has (answered) and
// settled reports true - the test says there when the plugin has taken that
// answer. With pair the moderation API in turn answers only when the Jev
// call has arrived, for a request that calls both at once.
//
// No clock is waited for, but the order is not strict either. What settled
// can see is that the call of the moderation API has returned inside the
// plugin (audit, which then leaves stats.inflight); its outcome reaches the
// stage (runStage) a few instructions later. Jev answers in that window at
// the earliest, and its answer has a way to go through the HTTP client, so
// the outcome of the moderation API is there first unless its goroutine is
// held up exactly there.
type modOrder struct {
	pair     bool
	settled  func() bool
	arrived  chan struct{} // closed when the Jev call has arrived
	answered chan struct{} // closed when the answer of the moderation API is on the wire
	// The requests of a test may repeat a call; each channel closes once.
	arrivedOnce, answeredOnce sync.Once
}

func newModOrder(pair bool, settled func() bool) *modOrder {
	return &modOrder{pair: pair, settled: settled, arrived: make(chan struct{}), answered: make(chan struct{})}
}

// imageModSent is imageMod with the request bodies it received, in order,
// and the order of its answers (modOrder; none at first: every call is
// answered at once).
func imageModSent(t *testing.T) (base string, jevImages, calls *atomic.Int64, sent func() []string, order *atomic.Pointer[modOrder]) {
	jevImages, calls, order = new(atomic.Int64), new(atomic.Int64), new(atomic.Pointer[modOrder])
	var mu sync.Mutex
	var bodies []string
	sent = func() []string {
		mu.Lock()
		defer mu.Unlock()
		return slices.Clone(bodies)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, string(body))
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		o := order.Load()
		if r.URL.Path == "/v1/moderations" {
			if o != nil && o.pair {
				select {
				case <-o.arrived:
				case <-r.Context().Done():
					return
				}
			}
			scores := map[string]float64{}
			for _, c := range OpenAICategories {
				scores[c] = 0.01
			}
			if strings.Contains(string(body), "image_url") {
				scores["sexual"] = 0.99
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
			if o != nil {
				w.(http.Flusher).Flush()
				o.answeredOnce.Do(func() { close(o.answered) })
			}
			return
		}
		var req struct {
			Questions map[string]json.RawMessage `json:"questions"`
			Assets    map[string]json.RawMessage `json:"assets"`
		}
		_ = json.Unmarshal(body, &req)
		if len(req.Assets) > 0 {
			jevImages.Add(1)
		}
		if o != nil {
			o.arrivedOnce.Do(func() { close(o.arrived) })
			select {
			case <-o.answered:
			case <-r.Context().Done():
				return
			}
			for !o.settled() {
				if r.Context().Err() != nil {
					return
				}
				runtime.Gosched()
			}
		}
		answers := map[string]any{}
		for c := range req.Questions {
			answers[c] = map[string]any{"type": "noul", "noul": 0.01}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "jev-mock", "answers": answers, "usage": map[string]int{"input_tokens": 10}})
	}))
	t.Cleanup(srv.Close)
	return srv.URL, jevImages, calls, sent, order
}

// imageFlows sets up the two flows in which the OpenAI auditor gets an image
// and Jev, while its redraw slots are busy, does not. Group 9: OpenAI, then
// Jev reviews its hits. Group 10: both in one stage, a hit of both needed.
// It returns the flow ids by group.
func imageFlows(t *testing.T, h *pluginsdktest.Harness, base string) map[int64]int64 {
	t.Helper()
	flows := map[int64]int64{
		9:  setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe}),
		10: setupFlow(t, h, base, []int64{10}, CombineAll, []string{AuditorOpenAI, AuditorTypeSafe}),
	}
	// The Jev channels have 2 s: their redraws get one of them.
	for _, ch := range decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil)) {
		if ch.Type == ChannelTypeSafe {
			decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"type": ch.Type, "name": ch.Name,
				"base_url": ch.BaseURL, "timeout_ms": 2000}))
		}
	}
	return flows
}

// jevWithoutImages switches the images of every Jev auditor off: with an
// OpenAI auditor beside them their flows are mixed (snapshot.mixedImages).
func jevWithoutImages(t *testing.T, h *pluginsdktest.Harness) {
	t.Helper()
	for _, a := range decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil)) {
		if a.Type == AuditorTypeSafe {
			decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", a.ID), nil, map[string]any{"name": a.Name, "type": a.Type,
				"channel_id": a.ChannelID, "config": map[string]any{"review_images": false}}))
		}
	}
}

// flowSegs counts the segment keys of a flow in the KV.
func flowSegs(t *testing.T, fh *pluginsdktest.FakeHost, flow int64) (n int) {
	t.Helper()
	for key := range segValues(t, fh) {
		if strings.HasPrefix(key, fmt.Sprintf("s:e0:%d:", flow)) {
			n++
		}
	}
	return n
}

// imageRequest is an anthropic request of one user message: text and images
// (the base64 of each).
func imageRequest(text string, images ...string) string {
	content := []any{map[string]any{"type": "text", "text": text}}
	for _, data := range images {
		content = append(content, map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png", "data": data}})
	}
	b, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "user", "content": content}}})
	return string(b)
}

// imageFlowCases are the two flows of imageFlows, by their group, and the
// result of a request whose image the OpenAI auditor hits and Jev does not
// receive.
var imageFlowCases = []struct {
	name   string
	group  int64
	result string
}{
	{"overturned by a stage that did not get the image", 9, ResultOverturned},
	{"one stage, all", 10, ResultPass},
}

// recordCounts counts what the requests of a test left on the node p: the
// records, the suspicious ones and the replays among them, and the
// violations counted on the users' days.
func recordCounts(t *testing.T, p *Plugin) (records, suspicious, replays, violations int64) {
	t.Helper()
	ctx := context.Background()
	p.flushStats(ctx)
	db, _ := p.db(ctx)
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM events), (SELECT count(*) FROM events WHERE `+suspiciousResult+`),
		(SELECT count(*) FROM events WHERE replayed), (SELECT coalesce(sum(suspicious), 0) FROM user_daily)`).Scan(&records, &suspicious, &replays, &violations); err != nil {
		t.Fatal(err)
	}
	return records, suspicious, replays, violations
}

// An image that no auditor received is not cached as passed - whatever kept
// it from being sent - while the text of its chunk is: the next request with
// the image has it moderated, on its own in these flows of one auditor (only
// a mixed flow keeps the cached text in the plan, makePlan).
func TestSkippedImageIsNotCachedAsPassed(t *testing.T) {
	// A Jev upstream that finds every picture violating and no text.
	var jevCalls, jevImages atomic.Int64
	jev := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Questions map[string]json.RawMessage `json:"questions"`
			Assets    map[string]json.RawMessage `json:"assets"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		jevCalls.Add(1)
		score := 0.01
		if len(req.Assets) > 0 {
			jevImages.Add(1)
			score = 0.99
		}
		answers := map[string]any{}
		for c := range req.Questions {
			answers[c] = map[string]any{"type": "noul", "noul": score}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "jev-mock", "answers": answers, "usage": map[string]int{"input_tokens": 10}})
	}))
	defer jev.Close()
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	setupFlow(t, h, jev.URL, []int64{9}, CombineAny, []string{AuditorTypeSafe})
	setupFlow(t, h, mod.srv.URL, []int64{10}, CombineAny, []string{AuditorOpenAI})
	// The Jev channel has 2 s: its redraws get one of them.
	for _, ch := range decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil)) {
		if ch.Type == ChannelTypeSafe {
			decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"type": ch.Type, "name": ch.Name,
				"base_url": ch.BaseURL, "timeout_ms": 2000}))
		}
	}
	send := func(group int64, rid, body string) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		req := rawReq(3, rid, protoAnthropic, body)
		req.Meta.GroupId = group
		return mustHook(t, h, req)
	}
	passedFresh := func(r *pluginv1.GatewayRequestHookResponse) bool {
		return !denied(r) && strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=")
	}

	t.Run("no redraw slot in time", func(t *testing.T) {
		// Both redraw slots are busy (two large images of other requests):
		// the picture, which needs redrawing, is not ready within the
		// channel's redraw time and the call goes out with the text alone.
		free := busySlots(t)
		request := imageRequest("a harmless caption", encodePNG(t, filled(100, 100, red)))
		if r := send(9, "busy", request); !passedFresh(r) || jevCalls.Load() != 1 || jevImages.Load() != 0 {
			t.Fatalf("with the slots busy = %+v (%d calls, %d with an image)", r, jevCalls.Load(), jevImages.Load())
		}
		tr := traceOf(t, recordOf(t, h, "busy"))
		if o := tr.Stages[0].Outcomes[0]; o.SentImages != 0 || o.SkippedImages != 1 || tr.Input.Images != 1 {
			t.Fatalf("trace of the run without the image = %+v, input %+v", o.EngineResult, tr.Input)
		}
		// The text is a cached pass, the picture is not: one segment key.
		written(t, p)
		if segs := segValues(t, fh); len(segs) != 1 {
			t.Fatalf("segment keys after the run without the image = %v", segs)
		}
		// With a slot the picture is sent - alone, the text has passed - and
		// refused. (Were the picture cached as passed with its text, the
		// request would be answered "pass (cached)" for verdict_cache_days on
		// every node.)
		free()
		r := send(9, "free", request)
		if !denied(r) || replayed(r) || jevCalls.Load() != 2 || jevImages.Load() != 1 {
			t.Fatalf("with a free slot = %+v (%d calls, %d with an image)", r, jevCalls.Load(), jevImages.Load())
		}
		tr = traceOf(t, recordOf(t, h, "free"))
		if tr.Input.Cached != 1 || tr.Cache == nil || len(tr.Cache.Segs) != 1 {
			t.Fatalf("trace of the run with the image: input %+v, hit set %+v", tr.Input, tr.Cache)
		}
		if r := send(9, "", request); !denied(r) || !replayed(r) || jevCalls.Load() != 2 {
			t.Fatalf("the picture again = %+v (%d calls)", r, jevCalls.Load())
		}
	})

	t.Run("undecodable", func(t *testing.T) {
		// Jev cannot read the image at all: it never becomes a pass, and
		// every request with it is a run (without a call: nothing to send -
		// the flow is not mixed, so the cached text is not sent again).
		request := imageRequest("another harmless caption", "iVBORw0KGgo=")
		calls := jevCalls.Load()
		if r := send(9, "", request); !passedFresh(r) || jevCalls.Load() != calls+1 {
			t.Fatalf("first = %+v (%d calls)", r, jevCalls.Load()-calls)
		}
		for i := range 2 {
			if r := send(9, "", request); !passedFresh(r) || r.GetNote() == cachedPass || jevCalls.Load() != calls+1 {
				t.Fatalf("again %d = %+v (%d calls)", i, r, jevCalls.Load()-calls)
			}
		}
	})

	t.Run("the image the OpenAI auditor drew stands for the others", func(t *testing.T) {
		// The moderation API takes one image per call and the auditor draws
		// one at random: that call judges both, so both are cached as passed
		// and the same request costs no second call.
		one, two := "iVBORw0KGgoAAAAB", "iVBORw0KGgoAAAAC"
		request := imageRequest("a harmless album", one, two)
		holds := func(body, image string) bool { return strings.Contains(body, "base64,"+image) }
		if r := send(10, "", request); !passedFresh(r) {
			t.Fatalf("first = %+v", r)
		}
		sent := mod.moderated()
		if len(sent) != 1 || holds(sent[0], one) == holds(sent[0], two) || !strings.Contains(sent[0], "a harmless album") {
			t.Fatalf("calls = %d: %.300s", len(sent), strings.Join(sent, "\n"))
		}
		if r := send(10, "", request); r.GetNote() != cachedPass || len(mod.moderated()) != 1 {
			t.Fatalf("second = %+v (%d calls)", r, len(mod.moderated()))
		}
	})
}

// A pass is stored for an image only when an auditor that itself passed had
// received it. Here the OpenAI auditor receives the image and hits, while Jev
// has no redraw slot, judges the text alone and passes: the run passes, and
// the image Jev never saw must not be answered "pass (cached)" afterwards.
func TestImagePassNeedsAPassingAuditor(t *testing.T) {
	base, jevImages, _ := imageMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flows := imageFlows(t, h, base)
	for _, tc := range imageFlowCases {
		t.Run(tc.name, func(t *testing.T) {
			request := imageRequest("a harmless caption "+tc.name, encodePNG(t, filled(100, 100+int(tc.group), red)))
			send := func(rid string) *pluginv1.GatewayRequestHookResponse {
				t.Helper()
				req := rawReq(3, rid, protoAnthropic, request)
				req.Meta.GroupId = tc.group
				return mustHook(t, h, req)
			}
			// Both redraw slots are busy: Jev sends the text alone.
			free := busySlots(t)
			images := jevImages.Load()
			rid := fmt.Sprintf("busy-%d", tc.group)
			if r := send(rid); denied(r) || r.GetNote() == cachedPass || jevImages.Load() != images {
				t.Fatalf("with the slots busy = %+v (%d Jev calls with an image)", r, jevImages.Load()-images)
			}
			ev := waitEvents(t, h, map[string]string{"request_id": rid}, 1)[0]
			if ev.Result != tc.result {
				t.Fatalf("record with the slots busy = %s %s", ev.Result, ev.Trace)
			}
			// Nothing of the chunk is a cached pass: not the image, and not
			// the text beside an image only the hitting auditor received.
			written(t, p)
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 0 {
				t.Fatalf("%d segment keys of the flow after the run without the image", segs)
			}
			// With a slot the image is sent to Jev too: the request is not
			// answered from the cache.
			free()
			if r := send(""); denied(r) || r.GetNote() == cachedPass || jevImages.Load() != images+1 {
				t.Fatalf("with a free slot = %+v (%d Jev calls with an image)", r, jevImages.Load()-images)
			}
			// Now a passing auditor has received it.
			written(t, p)
			if r := send(""); r.GetNote() != cachedPass || jevImages.Load() != images+1 {
				t.Fatalf("after Jev passed the image = %+v (%d Jev calls with an image)", r, jevImages.Load()-images)
			}
		})
	}
}

// A request with an image only a hitting auditor received, which a reviewer
// that did not get the image lets through, is let through every time. Were its
// text stored as a pass, the second request would send the image alone: the
// auditor that got it hits, the reviewer has nothing to judge, and the request
// that was allowed is refused, counted as a violation and replayed as a hit
// from then on. So nothing of such a chunk is cached, and the same request is
// judged as a whole each time.
func TestImageOnlyAHittingAuditorSawGetsTheSameVerdict(t *testing.T) {
	base, jevImages, calls := imageMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flows := imageFlows(t, h, base)
	// Both redraw slots stay busy: Jev always sends the text alone.
	busySlots(t)
	for _, tc := range imageFlowCases {
		t.Run(tc.name, func(t *testing.T) {
			request := imageRequest("the same caption "+tc.name, encodePNG(t, filled(100, 120+int(tc.group), red)))
			var first string
			for i := range 3 {
				rid := fmt.Sprintf("same-%d-%d", tc.group, i)
				req := rawReq(3, rid, protoAnthropic, request)
				req.Meta.GroupId = tc.group
				n := calls.Load()
				r := mustHook(t, h, req)
				if i == 0 {
					first = r.GetNote()
				}
				// Both auditors were called: the one with the image and the one
				// without.
				if denied(r) || r.GetNote() != first || !strings.HasPrefix(first, notePrefix+tc.result+" flow=") || calls.Load() != n+2 {
					t.Fatalf("request %d = %+v, first note %q (%d upstream calls)", i, r, first, calls.Load()-n)
				}
				if ev := recordOf(t, h, rid); ev.Result != tc.result || ev.Replayed {
					t.Fatalf("record %d = %s replayed %v %s", i, ev.Result, ev.Replayed, ev.Trace)
				}
				written(t, p)
			}
			// Nothing of the chunk was stored as a pass, the text neither.
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 0 {
				t.Fatalf("%d segment keys of the flow", segs)
			}
		})
	}
	if jevImages.Load() != 0 {
		t.Fatalf("%d Jev calls with an image", jevImages.Load())
	}
	// No hit was stored or recorded, and no violation counted.
	if n := kvCount(t, fh, "h:"); n != 0 {
		t.Fatalf("%d cached hits", n)
	}
	if records, suspicious, _, violations := recordCounts(t, p); records != 6 || suspicious != 0 || violations != 0 {
		t.Fatalf("%d records, %d suspicious, %d violations counted", records, suspicious, violations)
	}
}

// The verdict of TestImageOnlyAHittingAuditorSawGetsTheSameVerdict does not
// depend on what other requests cached. The request X = text T and
// image I is let through (only the hitting auditor received I, the auditor
// that passed judged T alone) and stores nothing. Then a request with T alone
// passes, and T is a cached pass. Were T left out of the plan of the next X,
// I would be alone in its chunk: the auditor that gets it hits, the other one
// has nothing to judge and is skipped, X is refused, a violation is counted
// and {I} is replayed as a hit from then on. In a mixed flow an image that is
// not cached keeps the text of its request in the plan (makePlan), so X is
// judged as a whole and let through every time.
//
// The flows are mixed: the OpenAI auditor takes images, the Jev auditor has
// its image switch off. (A flow whose auditors all take images does not keep
// the text: TestLLMReviewerSeesTheImage.)
func TestImageVerdictDoesNotDependOnCachedText(t *testing.T) {
	base, jevImages, calls, sent, order := imageModSent(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flows := imageFlows(t, h, base)
	jevWithoutImages(t, h)
	// Jev answers after the moderation API, as it did while it waited for a
	// redraw slot: in the stage of both, the hit is there before the pass
	// decides the stage (and ends the other call). The call of the moderation
	// API has returned with its answer when the Jev call is the only one left
	// in flight; the stage takes its outcome a few instructions after that,
	// which is as close as a test without a seam in the plugin gets
	// (modOrder). In the stage of both, the moderation API waits for the Jev
	// call to arrive, so that the call is counted when a pass ends it.
	ordered := func(group int64) {
		order.Store(newModOrder(group == 10, func() bool { return p.stats.inflight.Load() <= 1 }))
	}
	for group, id := range flows {
		if snap := p.snap.Load(); !snap.mixedImages(snap.flows[id]) {
			t.Fatalf("the flow of group %d is not mixed", group)
		}
	}
	// The upstream calls of a request with the text alone: the first stage of
	// group 9 passes it, the one stage of group 10 asks both auditors.
	textCalls := map[int64]int64{9: 1, 10: 2}
	for _, tc := range imageFlowCases {
		t.Run(tc.name, func(t *testing.T) {
			caption := fmt.Sprintf("a caption other requests cache %d", tc.group)
			image := encodePNG(t, filled(100, 140+int(tc.group), red))
			send := func(rid string, images ...string) *pluginv1.GatewayRequestHookResponse {
				t.Helper()
				req := rawReq(3, rid, protoAnthropic, imageRequest(caption, images...))
				req.Meta.GroupId = tc.group
				ordered(tc.group)
				return mustHook(t, h, req)
			}
			// x sends X and checks that it was judged as a whole and let through.
			var first string
			x := func(i int) {
				t.Helper()
				rid := fmt.Sprintf("x-%d-%d", tc.group, i)
				n := calls.Load()
				r := send(rid, image)
				if first == "" {
					first = r.GetNote()
				}
				if denied(r) || r.GetNote() != first || !strings.HasPrefix(first, notePrefix+tc.result+" flow=") || calls.Load() != n+2 {
					t.Fatalf("request %d = %+v, first note %q (%d upstream calls)", i, r, first, calls.Load()-n)
				}
				// Both auditors got the text; the image came with it, once.
				bodies := sent()
				withImage := 0
				for _, body := range bodies[len(bodies)-2:] {
					if !strings.Contains(body, caption) {
						t.Fatalf("request %d: a call without the text: %.300s", i, body)
					}
					if strings.Contains(body, "image_url") {
						withImage++
					}
				}
				if withImage != 1 {
					t.Fatalf("request %d: %d calls with the image", i, withImage)
				}
				if ev := recordOf(t, h, rid); ev.Result != tc.result || ev.Replayed {
					t.Fatalf("record %d = %s replayed %v %s", i, ev.Result, ev.Replayed, ev.Trace)
				}
				written(t, p)
			}
			x(0)
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 0 {
				t.Fatalf("%d segment keys of the flow after the first request", segs)
			}
			// Another request caches the text as passed.
			n := calls.Load()
			if r := send(""); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=") || calls.Load() != n+textCalls[tc.group] {
				t.Fatalf("the text alone = %+v (%d upstream calls)", r, calls.Load()-n)
			}
			written(t, p)
			if r := send(""); r.GetNote() != cachedPass || calls.Load() != n+textCalls[tc.group] {
				t.Fatalf("the text alone again = %+v (%d upstream calls)", r, calls.Load()-n)
			}
			x(1)
			x(2)
			// Of the flow only the text is a cached pass (stored by the request
			// that held it alone), the image is not.
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 1 {
				t.Fatalf("%d segment keys of the flow", segs)
			}
		})
	}
	if jevImages.Load() != 0 {
		t.Fatalf("%d Jev calls with an image", jevImages.Load())
	}
	// No hit was stored or recorded, and no violation counted.
	if n := kvCount(t, fh, "h:"); n != 0 {
		t.Fatalf("%d cached hits", n)
	}
	if _, suspicious, replays, violations := recordCounts(t, p); suspicious != 0 || replays != 0 || violations != 0 {
		t.Fatalf("%d suspicious records, %d replays, %d violations counted", suspicious, replays, violations)
	}
}
