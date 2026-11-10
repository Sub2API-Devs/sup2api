package moderation

import (
	"bytes"
	"context"
	"encoding/binary"
	"image"
	"image/color"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// progressiveJPEG is a w×h progressive JPEG (SOF2) without chroma
// subsampling, written by hand (the standard library only encodes baseline):
// one DC scan over the three components in which every block codes a zero
// difference with a one-bit Huffman code, so the file is tiny (one bit per
// block) while the decoder still allocates the coefficients of every block
// and the full YCbCr planes. It is the most expensive image to decode per
// source pixel and per file byte.
func progressiveJPEG(t testing.TB, w, h int) []byte {
	t.Helper()
	var b bytes.Buffer
	seg := func(marker byte, payload []byte) {
		b.Write([]byte{0xff, marker})
		_ = binary.Write(&b, binary.BigEndian, uint16(len(payload)+2))
		b.Write(payload)
	}
	b.Write([]byte{0xff, 0xd8}) // SOI
	dqt := make([]byte, 65)     // table 0, every factor 1
	for i := 1; i < len(dqt); i++ {
		dqt[i] = 1
	}
	seg(0xdb, dqt)
	seg(0xc2, []byte{8, byte(h >> 8), byte(h), byte(w >> 8), byte(w), 3,
		1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0}) // SOF2: 8 bit, three components at 1×1
	dht := make([]byte, 18) // DC table 0: one code of one bit for the value 0
	dht[1], dht[17] = 1, 0
	seg(0xc4, dht)
	seg(0xda, []byte{3, 1, 0, 2, 0, 3, 0, 0, 0, 0}) // SOS: DC of all three, first pass
	blocks := ((w + 7) / 8) * ((h + 7) / 8) * 3
	b.Write(make([]byte, (blocks+7)/8+2))
	b.Write([]byte{0xff, 0xd9}) // EOI
	cfg, format, err := image.DecodeConfig(bytes.NewReader(b.Bytes()))
	if err != nil || format != "jpeg" || cfg.Width != w || cfg.Height != h {
		t.Fatalf("progressive JPEG header = %+v %s %v", cfg, format, err)
	}
	return b.Bytes()
}

// jevSlowRedraw makes every redraw take d (on top of the real work) until
// the test ends, and counts the redraws started.
func jevSlowRedraw(t *testing.T, d time.Duration) *atomic.Int64 {
	var started atomic.Int64
	jevNormalize = func(data []byte) *typesafeAsset {
		started.Add(1)
		time.Sleep(d)
		return jevNormalizeImage(data)
	}
	t.Cleanup(func() {
		// Redraws left behind by a call that did not wait hold their slots
		// until they are done.
		deadline := time.Now().Add(10 * time.Second)
		for len(jevNormalizeSlots) > 0 && time.Now().Before(deadline) {
			time.Sleep(10 * time.Millisecond)
		}
		jevNormalize = jevNormalizeImage
	})
	return &started
}

// Images that need a slow redraw never cost the text its audit: redrawing
// has a share of the channel's time, the images that are not ready by then
// are skipped and the call goes out with the text and the ones that are.
func TestJevRedrawDoesNotStarveText(t *testing.T) {
	mod := newFakeMod(t)
	var bodies []string
	var mu sync.Mutex
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, string(body))
		mu.Unlock()
		req, _ := http.NewRequest(r.Method, mod.srv.URL+r.URL.Path, bytes.NewReader(body))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			w.WriteHeader(502)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
	}))
	defer srv.Close()
	def, _ := DefaultQuestions(nil)
	a, err := compileAuditor(1, "j", AuditorTypeSafe, 1, AuditorConfig{}, nil, &def)
	if err != nil {
		t.Fatal(err)
	}
	category := def.Items[0].Category
	ch := &liveChannel{Type: ChannelTypeSafe, BaseURL: srv.URL, Key: "k", Model: "jev"}
	started := jevSlowRedraw(t, 600*time.Millisecond)
	in := &Input{Text: "MOD-HIT-" + category + " violating text"}
	for i := range 8 { // different pictures, each too small to send as it is
		in.Images = append(in.Images, Image{Data: encodePNG(t, filled(100, 100, color.RGBA{uint8(i * 30), 0, 0, 0xff}))})
	}
	// The channel has 2 s: without a budget the eight redraws take 4.8 s and
	// the call ends in a timeout before anything is sent.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	begin := time.Now()
	res, err := typesafeAudit(ctx, ch, a.questions, true, in)
	took := time.Since(begin)
	if err != nil || res.Calls != 1 || len(bodies) != 1 {
		t.Fatalf("result = %+v, %v after %s (%d upstream calls)", res, err, took, len(bodies))
	}
	if res.Scores[category] < 0.9 || !strings.Contains(bodies[0], "violating text") {
		t.Fatalf("the text was not judged: scores = %v", res.Scores)
	}
	// Half of the 2 s: the first redraw is ready, the second is not.
	if res.SentImages != 1 || res.SkippedImages != 7 || res.SentImages+res.SkippedImages != len(in.Images) {
		t.Fatalf("sent %d, skipped %d of %d images", res.SentImages, res.SkippedImages, len(in.Images))
	}
	if took < 900*time.Millisecond || took > 1500*time.Millisecond {
		t.Fatalf("the call took %s, want about 1 s (half of the channel's time)", took)
	}
	if n := started.Load(); n != 2 {
		t.Fatalf("%d redraws started, want 2 (none after the budget ended)", n)
	}

	// Images sent as they are need no redraw and are packed whatever the
	// budget: here behind eight that are not ready in time.
	inLimit := encodePNG(t, filled(300, 300, blue))
	in.Images = append(in.Images, Image{Data: inLimit})
	short, cancelShort := context.WithTimeout(context.Background(), 400*time.Millisecond)
	defer cancelShort()
	if as := jevAssets(short, in); len(as) != 1 || as[0].DataBase64 != inLimit {
		t.Fatalf("assets = %d, want the in-limits image only", len(as))
	}
}

// A context that is done redraws nothing more and returns at once, also
// while a redraw is running or the slots are free.
func TestJevRedrawStopsWithContext(t *testing.T) {
	started := jevSlowRedraw(t, 500*time.Millisecond)
	in := &Input{Text: "t"}
	for i := range 8 {
		in.Images = append(in.Images, Image{Data: encodePNG(t, filled(100, 100, color.RGBA{0, uint8(i * 30), 0, 0xff}))})
	}
	// Done before the call: the slots are free, and still nothing starts
	// (a select between a free slot and a done context takes either).
	done, cancel := context.WithCancel(context.Background())
	cancel()
	for range 50 {
		if as := jevAssets(done, in); len(as) != 0 {
			t.Fatalf("%d assets with a canceled context", len(as))
		}
	}
	if started.Load() != 0 || len(jevNormalizeSlots) != 0 {
		t.Fatalf("%d redraws started with a canceled context", started.Load())
	}
	// Canceled during the first redraw: the call returns without waiting
	// for it and starts no other.
	ctx, cancel := context.WithCancel(context.Background())
	time.AfterFunc(100*time.Millisecond, cancel)
	begin := time.Now()
	as := jevAssets(ctx, in)
	if took := time.Since(begin); len(as) != 0 || took > 400*time.Millisecond {
		t.Fatalf("%d assets after %s", len(as), took)
	}
	if n := started.Load(); n != 1 {
		t.Fatalf("%d redraws started, want 1", n)
	}
	// The redraw left behind frees its slot and its memory when it is done.
	waitFor(t, "the abandoned redraw", func() bool { return len(jevNormalizeSlots) == 0 })
	if !jevNormalizeBytes.TryAcquire(jevNormalizeMemory) {
		t.Fatal("memory of the abandoned redraw was not released")
	}
	jevNormalizeBytes.Release(jevNormalizeMemory)
	// Without a deadline the budget is the fixed maximum.
	if got := jevNormalizeBudget(context.Background()); got != jevNormalizeBudgetMax {
		t.Fatalf("budget without a deadline = %s", got)
	}
	long, cancelLong := context.WithTimeout(context.Background(), time.Minute)
	defer cancelLong()
	if got := jevNormalizeBudget(long); got != jevNormalizeBudgetMax {
		t.Fatalf("budget of a long call = %s", got)
	}
}
