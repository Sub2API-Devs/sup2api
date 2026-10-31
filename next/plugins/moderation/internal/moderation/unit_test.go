package moderation

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"image"
	"image/png"
	"strings"
	"testing"
	"time"
)

func TestSampled(t *testing.T) {
	var h [32]byte
	if !sampled(h, 100) || sampled(h, 0) {
		t.Fatal("bounds")
	}
	n := 0
	for i := 0; i < 1000; i++ {
		h[0], h[1] = byte(i), byte(i>>8)
		h[7] = byte(i * 31)
		if sampled(h, 30) {
			n++
		}
	}
	if n < 200 || n > 400 {
		t.Fatalf("30%% sampled %d of 1000", n)
	}
}

// outcomes scripts a flow run: auditor id -> outcome (with optional delay).
func scripted(out map[int64]Outcome, delay map[int64]time.Duration) auditFunc {
	return func(ctx context.Context, id int64) Outcome {
		if d := delay[id]; d > 0 {
			select {
			case <-time.After(d):
			case <-ctx.Done():
				return Outcome{AuditorID: id, Err: context.Canceled}
			}
		}
		o := out[id]
		o.AuditorID = id
		return o
	}
}

func hit(cat string, score float64) Outcome {
	return Outcome{Hit: true, Hits: []HitCategory{{Category: cat, Score: score, Threshold: 0.5}}}
}

func TestRunFlow(t *testing.T) {
	pass, skip, fail := Outcome{}, Outcome{Skipped: true}, Outcome{Err: errors.New("boom")}
	spec := func(stages ...Stage) *Spec { return &Spec{Stages: stages} }
	st := func(combine string, n int, ids ...int64) Stage { return Stage{Auditors: ids, Combine: combine, N: n} }
	for _, tc := range []struct {
		name       string
		spec       *Spec
		out        map[int64]Outcome
		final      string
		overturned bool
		errored    bool
		skipped    bool
	}{
		{"any hit", spec(st("any", 0, 1, 2)), map[int64]Outcome{1: pass, 2: hit("sexual", 0.95)}, Hit, false, false, false},
		{"all needs both", spec(st("all", 0, 1, 2)), map[int64]Outcome{1: pass, 2: hit("sexual", 0.95)}, Pass, false, false, false},
		{"at_least 2 of 3", spec(st("at_least", 2, 1, 2, 3)), map[int64]Outcome{1: hit("a", 0.8), 2: pass, 3: hit("b", 0.9)}, Hit, false, false, false},
		{"second stage overturns", spec(st("any", 0, 1), st("any", 0, 2)), map[int64]Outcome{1: hit("a", 0.8), 2: pass}, Pass, true, false, false},
		{"both stages hit", spec(st("any", 0, 1), st("any", 0, 2)), map[int64]Outcome{1: hit("a", 0.8), 2: hit("a", 0.99)}, Hit, false, false, false},
		{"error passes", spec(st("any", 0, 1)), map[int64]Outcome{1: fail}, Pass, false, true, false},
		{"first stage skipped", spec(st("any", 0, 1), st("any", 0, 2)), map[int64]Outcome{1: skip, 2: hit("a", 1)}, Pass, false, false, true},
		{"later skip keeps hit", spec(st("any", 0, 1), st("any", 0, 2)), map[int64]Outcome{1: hit("a", 0.7), 2: skip}, Hit, false, false, false},
		{"all ignores skipped", spec(st("all", 0, 1, 2)), map[int64]Outcome{1: hit("a", 0.7), 2: skip}, Hit, false, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			tr := runFlow(context.Background(), tc.spec, 5*time.Second, scripted(tc.out, nil))
			if tr.Final != tc.final || tr.Overturned != tc.overturned || tr.Errored != tc.errored || tr.Skipped != tc.skipped {
				t.Fatalf("trace = %+v", tr)
			}
		})
	}
	// The deciding stage's hits, best first; severity from the top score.
	tr := runFlow(context.Background(), spec(st("any", 0, 1), st("all", 0, 2, 3)),
		5*time.Second, scripted(map[int64]Outcome{1: hit("a", 0.6), 2: hit("b", 0.75), 3: hit("c", 0.95)}, nil))
	var rec eventRec
	rec.fillFromTrace(tr, true)
	if rec.Result != ResultBlock || rec.HighestCategory != "c" || rec.Severity != "high" || strings.Join(rec.HitCategories, ",") != "c,b" {
		t.Fatalf("rec = %+v", rec)
	}
	// A later stage that errors after a hit is an error, not an overturn.
	tr = runFlow(context.Background(), spec(st("any", 0, 1), st("any", 0, 2)), 5*time.Second, scripted(map[int64]Outcome{1: hit("a", 0.8), 2: fail}, nil))
	rec = eventRec{}
	rec.fillFromTrace(tr, false)
	if rec.Result != ResultError {
		t.Fatalf("errored second stage = %s", rec.Result)
	}
	// Timeout: the slow auditor never decides, the run errors and passes.
	start := time.Now()
	tr = runFlow(context.Background(), spec(st("any", 0, 1)), 100*time.Millisecond, scripted(map[int64]Outcome{1: hit("a", 1)}, map[int64]time.Duration{1: time.Second}))
	if tr.Final != Pass || !tr.Errored || time.Since(start) > 900*time.Millisecond {
		t.Fatalf("timeout trace = %+v", tr)
	}
	// any decides at the first hit without waiting for the slow one.
	start = time.Now()
	tr = runFlow(context.Background(), spec(st("any", 0, 1, 2)), 5*time.Second, scripted(map[int64]Outcome{1: hit("a", 1), 2: pass}, map[int64]time.Duration{2: 2 * time.Second}))
	if tr.Final != Hit || time.Since(start) > time.Second {
		t.Fatalf("early decision trace = %+v", tr)
	}
}

func TestSpecValidate(t *testing.T) {
	exists := func(id int64) bool { return id < 10 }
	good := []byte(`{"model_filter":{"type":"only","models":["claude-*"]},"sample_rate":50,"total_timeout_ms":0,"stages":[{"auditors":[1,2],"combine":"at_least","n":2}]}`)
	s, err := ParseSpec(good)
	if err != nil || s.Validate(exists) != nil {
		t.Fatalf("good spec: %v", err)
	}
	if _, err := ParseSpec([]byte(`{"stages":[],"enabled":true}`)); err == nil {
		t.Fatal("unknown field accepted")
	}
	for _, raw := range []string{
		`{"stages":[]}`,
		`{"stages":[{"auditors":[1,1]}]}`,
		`{"stages":[{"auditors":[1],"combine":"most"}]}`,
		`{"stages":[{"auditors":[1],"combine":"at_least"}]}`,
		`{"sample_rate":101,"stages":[{"auditors":[1]}]}`,
		`{"total_timeout_ms":50,"stages":[{"auditors":[1]}]}`,
		`{"model_filter":{"type":"only","models":[]},"stages":[{"auditors":[1]}]}`,
	} {
		s, err := ParseSpec([]byte(raw))
		if err == nil && s.Validate(exists) == nil {
			t.Errorf("accepted %s", raw)
		}
	}
	s, _ = ParseSpec([]byte(`{"stages":[{"auditors":[1,12,13]}]}`))
	var missing *MissingAuditorsError
	if err := s.Validate(exists); !errors.As(err, &missing) || len(missing.IDs) != 2 {
		t.Fatalf("missing auditors: %v", err)
	}
	s, _ = ParseSpec([]byte(`{"stages":[{"auditors":[1,2]},{"auditors":[3]}]}`))
	if got := s.DefaultTotalTimeoutMs(func(id int64) int { return int(id) * 1000 }); got != 5000 {
		t.Fatalf("default total = %d", got)
	}
	f := ModelFilter{Type: FilterExclude, Models: []string{"gpt-*"}}
	if f.Allows("GPT-5") || !f.Allows("claude-opus") || !(ModelFilter{}).Allows("x") {
		t.Fatal("model filter")
	}
}

func TestDecodeSettings(t *testing.T) {
	s, err := DecodeSettings([]byte(`{"mode":"OBSERVE","block_status":500,"retention_days":400,"pass_retention_days":9,"exempt_user_ids":["7",8,"x"],"watch_days":0}`))
	if err != nil {
		t.Fatal(err)
	}
	if s.Mode != ModeObserve || s.BlockStatus != 500 || s.HitRetentionDays != 400 || s.PassRetentionDays != 3 ||
		strings.Join(s.ExemptUserIDs, ",") != "7,8" || s.WatchDays != 1 || s.InputMaxChars != 12000 || !s.AutoWatch {
		t.Fatalf("settings = %+v", s)
	}
	c := compile(s)
	if !c.enabled || !c.exempt[7] || c.retention[ResultPass] != 3*24*time.Hour || c.legacyReady {
		t.Fatalf("config = %+v", c)
	}
	if _, err := DecodeSettings([]byte(`[1]`)); err == nil {
		t.Fatal("array accepted")
	}
	s, _ = DecodeSettings([]byte(`{"block_status":451,"jev_default_set":{"items":[{"category":"custom/x","question":"q"}]}}`))
	if s.BlockStatus != 451 || s.JevDefaultSet != nil {
		t.Fatal("an invalid jev_default_set (no label, no threshold) must be ignored")
	}
}

func TestAuditorJudge(t *testing.T) {
	def, _ := DefaultQuestions(nil)
	a, err := compileAuditor(1, "o", AuditorOpenAI, 1, AuditorConfig{Thresholds: map[string]float64{"sexual": 0.5}}, nil, &def)
	if err != nil {
		t.Fatal(err)
	}
	scores := map[string]float64{}
	for _, c := range OpenAICategories {
		scores[c] = 0.1
	}
	scores["sexual"] = 0.6
	hits, err := a.judge(EngineResult{Scores: scores})
	if err != nil || len(hits) != 1 || hits[0].Category != "sexual" {
		t.Fatalf("hits %v %v", hits, err)
	}
	delete(scores, "hate")
	if _, err := a.judge(EngineResult{Scores: scores}); !errors.Is(err, errBadScores) {
		t.Fatalf("missing score: %v", err)
	}
	if _, err := compileAuditor(1, "o", AuditorOpenAI, 1, AuditorConfig{Thresholds: map[string]float64{"sexual": 0}}, nil, &def); err == nil {
		t.Fatal("threshold 0 accepted")
	}
	j, err := compileAuditor(2, "j", AuditorTypeSafe, 1, AuditorConfig{}, nil, &def)
	if err != nil || len(j.order) != 10 || j.questions.RulesVersion != RulesVersionZH || !j.images {
		t.Fatalf("jev default: %+v %v", j, err)
	}
	if j.labels["custom/jailbreak"] != "越狱与恶意预填充" || j.thresholds["sexual"] != 0.90 {
		t.Fatal("jev rows")
	}
	custom := def
	custom.Items = append(custom.Items[:1:1], JevQuestion{Category: "custom/x", Label: "X", Question: "q?", Threshold: 0.5})
	if v := RulesVersionOf(&custom); !strings.HasPrefix(v, "custom-") {
		t.Fatalf("custom version %s", v)
	}
	l, _ := compileAuditor(3, "l", AuditorLLMVerdict, 1, AuditorConfig{}, nil, &def)
	if h := l.judgeLLM(EngineResult{Scores: map[string]float64{"sexual": llmFlagScore}}); len(h) != 0 {
		t.Fatal("flag is not a hit by default")
	}
	l.flagAsHit = true
	if h := l.judgeLLM(EngineResult{Scores: map[string]float64{"sexual": llmFlagScore}}); len(h) != 1 {
		t.Fatal("flag_as_hit")
	}
}

func pngBase64(t *testing.T, w, h int) string {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewGray(image.Rect(0, 0, w, h))); err != nil {
		t.Fatal(err)
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func TestJevAssetsAndOpenAIImages(t *testing.T) {
	ok, small := pngBase64(t, 300, 300), pngBase64(t, 100, 100)
	in := &Input{Text: "t", Images: []Image{{MediaType: "image/png", Data: ok}, {MediaType: "image/png", Data: small}, {URL: "https://x/y.png"}}}
	if a := jevAssets(in); len(a) != 1 || a[0].Format != "png" {
		t.Fatalf("assets = %d", len(a))
	}
	urls := []string{}
	for _, img := range openAIUsableImages([]Image{{Data: ok}, {URL: "https://x/y.png"}, {Data: "bm90IGFuIGltYWdl"}}) {
		urls = append(urls, openAIImageURL(img))
	}
	if len(urls) != 2 || !strings.HasPrefix(urls[0], "data:image/png;base64,") || urls[1] != "https://x/y.png" {
		t.Fatalf("urls = %v", urls)
	}
}

func TestGlobMatchAndJoinURL(t *testing.T) {
	if !globMatch("claude-*", "claude-opus-5") || globMatch("claude-?", "claude-12") || !globMatch("*", "") {
		t.Fatal("glob")
	}
	if joinURL("https://a/v1/", "/v1/moderations") != "https://a/v1/moderations" || joinURL("https://a", "/v1/x") != "https://a/v1/x" {
		t.Fatal("joinURL")
	}
	if !hostChanged("https://a.com/v1", "https://b.com/v1") || hostChanged("https://a.com/v1", "https://A.com/other") {
		t.Fatal("hostChanged")
	}
}

func TestSelfMarker(t *testing.T) {
	k := markerKey("sk-1")
	wrapped := wrapUserContent(k, "hello moderation-content")
	if !isSelfRequest(k, wrapped) || isSelfRequest(markerKey("sk-2"), wrapped) || isSelfRequest(k, "hello") {
		t.Fatal("marker")
	}
	s := &snapshot{markers: [][]byte{markerKey("other"), k}}
	if !s.isSelf(wrapped) {
		t.Fatal("snapshot markers")
	}
	if !s.isSelf("analysis kickoff\n"+selfMarker(k)) || s.isSelf(selfMarker(markerKey("sk-x"))) {
		t.Fatal("bare self marker")
	}
}

func TestLRU(t *testing.T) {
	c := newLRU(2)
	now := time.Now()
	c.put("a", now.Add(time.Minute))
	c.put("b", now.Add(time.Minute))
	c.get("a", now)
	c.put("c", now.Add(time.Minute))
	if !c.get("a", now) || c.get("b", now) || !c.get("c", now) || c.len() != 2 {
		t.Fatal("eviction")
	}
	c.put("d", now)
	if c.get("d", now) {
		t.Fatal("expired entry returned")
	}
}

func TestParseVerdict(t *testing.T) {
	known := map[string]bool{"illegal": true}
	v, err := parseVerdict(`{"verdict":"BLOCK","categories":["illegal","nope"],"severity":"high","reason":"r"}`, known)
	if err != nil || v.Verdict != VerdictBlock || len(v.Categories) != 1 {
		t.Fatalf("%+v %v", v, err)
	}
	if _, err := parseVerdict(`{"verdict":"maybe"}`, known); err == nil {
		t.Fatal("bad verdict accepted")
	}
}
