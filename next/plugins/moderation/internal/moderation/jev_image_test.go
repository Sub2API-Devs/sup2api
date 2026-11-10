package moderation

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"math/rand/v2"
	"net/http"
	"net/http/httptest"
	"runtime"
	"runtime/debug"
	"strings"
	"sync"
	"testing"
	"time"
)

// Test images are drawn here; there are no binary fixtures.

func b64(data []byte) string { return base64.StdEncoding.EncodeToString(data) }

func encodePNG(t testing.TB, img image.Image) string {
	t.Helper()
	var buf bytes.Buffer
	if err := (&png.Encoder{CompressionLevel: png.BestSpeed}).Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return b64(buf.Bytes())
}

func encodeJPEG(t testing.TB, img image.Image) string {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatal(err)
	}
	return b64(buf.Bytes())
}

// filled is a w×h opaque image of one colour.
func filled(w, h int, c color.Color) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), image.NewUniform(c), image.Point{}, draw.Src)
	return img
}

// noise is a w×h image no encoder can compress.
func noise(w, h int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	r := rand.New(rand.NewPCG(1, 2))
	for i := range img.Pix {
		img.Pix[i] = byte(r.Uint32())
	}
	for i := 3; i < len(img.Pix); i += 4 {
		img.Pix[i] = 0xff
	}
	return img
}

// decodeAsset decodes what would be sent and checks the declared format.
func decodeAsset(t *testing.T, a *typesafeAsset) image.Image {
	t.Helper()
	if a == nil {
		t.Fatal("image was skipped")
	}
	data, err := base64.StdEncoding.DecodeString(a.DataBase64)
	if err != nil {
		t.Fatal(err)
	}
	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil || format != a.Format || a.Type != "image" {
		t.Fatalf("asset %s / %s: decoded as %s, %v", a.Type, a.Format, format, err)
	}
	return img
}

// near reports whether c is within tol of the 8-bit colour want.
func near(c color.Color, want color.RGBA, tol int) bool {
	r, g, b, _ := c.RGBA()
	d := func(x uint32, y uint8) bool { v := int(x>>8) - int(y); return v >= -tol && v <= tol }
	return d(r, want.R) && d(g, want.G) && d(b, want.B)
}

var (
	white = color.RGBA{0xff, 0xff, 0xff, 0xff}
	red   = color.RGBA{0xff, 0, 0, 0xff}
	blue  = color.RGBA{0, 0, 0xff, 0xff}
)

// inLimits reports whether System One accepts an image of this size.
func inLimits(b image.Rectangle) bool {
	w, h := b.Dx(), b.Dy()
	return min(w, h) >= jevImageMinSide && max(w, h) <= jevImageMaxSide && w*h >= jevImageMinPixels && w*h <= jevImageMaxPixels
}

func TestJevLongContextHeader(t *testing.T) {
	var mu sync.Mutex
	var headers []http.Header
	var bodies []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		headers, bodies = append(headers, r.Header.Clone()), append(bodies, string(body))
		mu.Unlock()
		var req struct {
			Questions map[string]json.RawMessage `json:"questions"`
		}
		_ = json.Unmarshal(body, &req)
		answers := map[string]any{}
		for c := range req.Questions {
			answers[c] = map[string]any{"type": "noul", "noul": 0.01}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "jev-mock", "answers": answers})
	}))
	defer srv.Close()
	def, _ := DefaultQuestions(nil)
	a, err := compileAuditor(1, "j", AuditorTypeSafe, 1, AuditorConfig{}, nil, &def)
	if err != nil {
		t.Fatal(err)
	}
	ch := &liveChannel{Type: ChannelTypeSafe, BaseURL: srv.URL, Key: "k", Model: "jev"}
	ctx := context.Background()
	if res, err := typesafeAudit(ctx, ch, a.questions, true, &Input{Text: "text only"}); err != nil || res.SentImages != 0 {
		t.Fatalf("text only: %+v %v", res, err)
	}
	// One image inside the limits and one redrawn to fit them.
	in := &Input{Text: "with images", Images: []Image{{Data: encodePNG(t, filled(300, 300, red))}, {Data: encodePNG(t, filled(100, 50, blue))}}}
	if res, err := typesafeAudit(ctx, ch, a.questions, true, in); err != nil || res.SentImages != 2 || res.SkippedImages != 0 {
		t.Fatalf("with images: %+v %v", res, err)
	}
	if len(headers) != 2 {
		t.Fatalf("calls = %d", len(headers))
	}
	for i, h := range headers {
		if h.Get(jevLongContextHeader) != "true" || h.Get("TypeSafe-Danger-Zone-Long-Context") != "true" {
			t.Fatalf("call %d has no long-context header: %v", i, h)
		}
	}
	if headers[0].Get(jevImagesHeader) != "" || headers[1].Get(jevImagesHeader) != "true" {
		t.Fatalf("image header: text only %q, with images %q", headers[0].Get(jevImagesHeader), headers[1].Get(jevImagesHeader))
	}
	if strings.Contains(bodies[0], `"assets"`) || strings.Count(bodies[1], `"data_base64"`) != 2 {
		t.Fatal("assets of the two calls")
	}
}

func TestJevAssetInLimitsSentAsIs(t *testing.T) {
	raw := encodePNG(t, filled(1000, 1000, red))
	a := jevAsset(context.Background(), raw)
	if a == nil || a.DataBase64 != raw || a.Format != "png" || a.tokens != jevImageTokens(1000, 1000) {
		t.Fatalf("in-limits PNG was not sent as it is: %+v", a)
	}
	raw = encodeJPEG(t, filled(1568, 280, red))
	if a := jevAsset(context.Background(), raw); a == nil || a.DataBase64 != raw || a.Format != "jpeg" {
		t.Fatal("in-limits JPEG was not sent as it is")
	}
}

func TestJevNormalizeOversized(t *testing.T) {
	a := jevAsset(context.Background(), encodeJPEG(t, filled(4000, 2000, red)))
	img := decodeAsset(t, a)
	if b := img.Bounds(); b.Dx() != jevImageMaxSide || b.Dy() != jevImageMaxSide/2 || !inLimits(b) {
		t.Fatalf("4000x2000 became %v", b)
	}
	if a.tokens != jevImageTokens(1568, 784) || !near(img.At(784, 392), red, 8) {
		t.Fatalf("tokens %d, centre %v", a.tokens, img.At(784, 392))
	}
	// The image is scaled in bands of rows: a top-to-bottom gradient stays
	// smooth across them and keeps its ends.
	grad := image.NewGray(image.Rect(0, 0, 2400, 3000))
	for y := range 3000 {
		for x := range 2400 {
			grad.SetGray(x, y, color.Gray{uint8(y * 255 / 2999)})
		}
	}
	img = decodeAsset(t, jevAsset(context.Background(), encodePNG(t, grad)))
	if b := img.Bounds(); b.Dx() != 1254 || b.Dy() != 1568 {
		t.Fatalf("2400x3000 became %v", b)
	}
	for y := range 1568 {
		got, _, _, _ := img.At(600, y).RGBA()
		if want := y * 255 / 1567; int(got>>8) < want-1 || int(got>>8) > want+1 {
			t.Fatalf("row %d is %d, want %d", y, got>>8, want)
		}
	}
	// Never scaled up: a small side is padded, the long side still shrinks.
	img = decodeAsset(t, jevAsset(context.Background(), encodePNG(t, filled(3136, 200, red))))
	if b := img.Bounds(); b.Dx() != 1568 || b.Dy() != 280 || !near(img.At(784, 140), red, 0) || !near(img.At(784, 5), white, 0) {
		t.Fatalf("3136x200 became %v", b)
	}
}

func TestJevNormalizeTooSmall(t *testing.T) {
	a := jevAsset(context.Background(), encodePNG(t, filled(100, 50, blue)))
	img := decodeAsset(t, a)
	b := img.Bounds()
	if b.Dx() != 280 || b.Dy() != 280 || a.Format != "png" || a.tokens != jevImageTokens(280, 280) {
		t.Fatalf("100x50 became %v %s", b, a.Format)
	}
	for _, p := range []image.Point{{0, 0}, {279, 0}, {0, 279}, {279, 279}, {89, 140}, {140, 114}} {
		if !near(img.At(p.X, p.Y), white, 0) {
			t.Fatalf("%v is %v, want white", p, img.At(p.X, p.Y))
		}
	}
	// The source sits centred and unscaled: x 90..189, y 115..164.
	for _, p := range []image.Point{{90, 115}, {189, 164}, {140, 140}} {
		if !near(img.At(p.X, p.Y), blue, 0) {
			t.Fatalf("%v is %v, want the source colour", p, img.At(p.X, p.Y))
		}
	}
}

func TestJevNormalizeTransparency(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 2000, 1000))
	draw.Draw(src, image.Rect(1000, 0, 2000, 1000), image.NewUniform(red), image.Point{}, draw.Src) // left half stays transparent
	img := decodeAsset(t, jevAsset(context.Background(), encodePNG(t, src)))
	if b := img.Bounds(); b.Dx() != 1568 || b.Dy() != 784 {
		t.Fatalf("bounds %v", b)
	}
	if !near(img.At(300, 400), white, 0) || !near(img.At(1300, 400), red, 0) {
		t.Fatalf("transparent %v, opaque %v", img.At(300, 400), img.At(1300, 400))
	}
	if _, _, _, alpha := img.At(300, 400).RGBA(); alpha != 0xffff {
		t.Fatalf("alpha kept: %d", alpha)
	}
	// Transparency inside the limits takes the unscaled path of a small image.
	small := image.NewNRGBA(image.Rect(0, 0, 100, 100))
	img = decodeAsset(t, jevAsset(context.Background(), encodePNG(t, small)))
	if !near(img.At(140, 140), white, 0) {
		t.Fatalf("small transparent image: %v", img.At(140, 140))
	}
}

// tinyWebP is a 1×1 lossless WebP.
var tinyWebP = []byte("RIFF\x1a\x00\x00\x00WEBPVP8L\x0d\x00\x00\x00\x2f\x00\x00\x00\x10\x07\x10\x11\x11\x88\x88\xfe\x07\x00")

func TestJevNormalizeGIFAndWebP(t *testing.T) {
	pal := color.Palette{white, red, blue}
	frame := func(c uint8) *image.Paletted {
		f := image.NewPaletted(image.Rect(0, 0, 400, 300), pal)
		for i := range f.Pix {
			f.Pix[i] = c
		}
		return f
	}
	var buf bytes.Buffer
	if err := gif.EncodeAll(&buf, &gif.GIF{Image: []*image.Paletted{frame(1), frame(2)}, Delay: []int{10, 10}}); err != nil {
		t.Fatal(err)
	}
	// A GIF is redrawn even inside the limits: System One takes PNG and JPEG.
	a := jevAsset(context.Background(), b64(buf.Bytes()))
	img := decodeAsset(t, a)
	if b := img.Bounds(); a.Format != "png" || b.Dx() != 400 || b.Dy() != 300 || !near(img.At(200, 150), red, 0) {
		t.Fatalf("gif: %s %v %v (want the first frame)", a.Format, b, img.At(200, 150))
	}
	a = jevAsset(context.Background(), b64(tinyWebP))
	img = decodeAsset(t, a)
	if b := img.Bounds(); (a.Format != "png" && a.Format != "jpeg") || b.Dx() != 280 || b.Dy() != 280 {
		t.Fatalf("webp: %s %v", a.Format, b)
	}
}

func TestJevNormalizeFallsBackToJPEG(t *testing.T) {
	raw := encodePNG(t, noise(2000, 1600))
	a := jevAsset(context.Background(), raw)
	img := decodeAsset(t, a)
	if b := img.Bounds(); a.Format != "jpeg" || b.Dx() != 1568 || b.Dy() != 1254 {
		t.Fatalf("noise: %s %v", a.Format, b)
	}
	// The PNG of the same canvas is what was over the limit.
	if n := base64.StdEncoding.DecodedLen(len(encodePNG(t, noise(1568, 1254)))); n <= jevImagePNGMax {
		t.Fatalf("the noise PNG is only %d bytes", n)
	}
	if a := jevAsset(context.Background(), encodePNG(t, filled(2000, 1600, red))); a == nil || a.Format != "png" {
		t.Fatal("a small PNG must stay a PNG")
	}
}

func TestJevAssetSkips(t *testing.T) {
	ctx := context.Background()
	ok := encodePNG(t, filled(300, 300, red))
	okData, _ := base64.StdEncoding.DecodeString(ok)
	exact := encodePNG(t, image.NewGray(image.Rect(0, 0, 4000, 3000))) // exactly 12 MP
	cases := map[string]string{
		"url":            "https://example.com/a.png",
		"broken base64":  ok[:len(ok)/2] + "!!!" + ok[len(ok)/2:],
		"over 16 MiB":    b64(append(bytes.Clone(okData), make([]byte, jevImageMaxBytes)...)),
		"over 12 MP":     encodePNG(t, image.NewGray(image.Rect(0, 0, 4000, 3001))),
		"unknown format": b64([]byte("BM this is not an image the engine decodes")),
		"empty":          "",
	}
	for name, raw := range cases {
		if a := jevAsset(ctx, raw); a != nil {
			t.Errorf("%s: sent as %s (%d bytes of base64)", name, a.Format, len(a.DataBase64))
		}
	}
	// The limits themselves pass: 16 MiB decoded, 12 MP.
	atLimit := b64(append(bytes.Clone(okData), make([]byte, jevImageMaxBytes-len(okData))...))
	if a := jevAsset(ctx, atLimit); a == nil || a.DataBase64 != atLimit {
		t.Error("an image of exactly 16 MiB was skipped")
	}
	if img := decodeAsset(t, jevAsset(ctx, exact)); img.Bounds().Dx() != 1568 || img.Bounds().Dy() != 1176 {
		t.Errorf("a 12 MP image became %v", img.Bounds())
	}
	// A cut image that needs redrawing fails in the decoder and is skipped.
	small := encodePNG(t, filled(100, 100, red))
	smallData, _ := base64.StdEncoding.DecodeString(small)
	if a := jevAsset(ctx, b64(smallData[:len(smallData)-20])); a != nil {
		t.Error("an undecodable image that needs redrawing was sent")
	}
	// URL images of the input are never sent, whatever their data.
	if as := jevAssets(ctx, &Input{Images: []Image{{URL: "https://example.com/a.png", Data: ok}}}); len(as) != 0 {
		t.Error("a URL image was sent")
	}
}

func TestJevAssetsDedupeAndBudget(t *testing.T) {
	ctx := context.Background()
	// The same picture as a PNG too small and as that PNG again: both are
	// redrawn to the same bytes and sent once; so is a repeated in-limits
	// image.
	small, ok := encodePNG(t, filled(100, 100, red)), encodePNG(t, filled(300, 300, red))
	smallGray := encodePNG(t, filled(100, 100, color.RGBA{0x80, 0x80, 0x80, 0xff}))
	in := &Input{Text: "t", Images: []Image{{Data: small}, {Data: ok}, {Data: small}, {Data: smallGray}, {Data: ok}}}
	as := jevAssets(ctx, in)
	if len(as) != 3 {
		t.Fatalf("assets = %d, want 3 (two duplicates dropped)", len(as))
	}
	if as[1].DataBase64 != ok || as[0].DataBase64 == as[2].DataBase64 {
		t.Fatal("order or content of the deduplicated assets")
	}
	// Different encodings of the same pixels normalize to one asset.
	var plain bytes.Buffer
	if err := (&png.Encoder{CompressionLevel: png.NoCompression}).Encode(&plain, filled(100, 100, red)); err != nil {
		t.Fatal(err)
	}
	if b64(plain.Bytes()) == small {
		t.Fatal("the two encodings are the same bytes")
	}
	if as := jevAssets(ctx, &Input{Images: []Image{{Data: small}, {Data: b64(plain.Bytes())}}}); len(as) != 1 {
		t.Fatalf("same picture, two encodings: %d assets", len(as))
	}

	// 12000 runes of text and eight different 1024² images fit 200k tokens.
	text := strings.Repeat("字", 12000)
	var images []Image
	for i := range 8 {
		images = append(images, Image{Data: encodePNG(t, filled(1024, 1024, color.RGBA{uint8(i * 30), 0, 0, 0xff}))})
	}
	as = jevAssets(ctx, &Input{Text: text, Images: images})
	tokens := 12000
	for _, a := range as {
		tokens += a.tokens
	}
	if len(as) != 8 || tokens > jevRequestTokenLimit || tokens <= 24_000 {
		t.Fatalf("assets = %d, tokens = %d", len(as), tokens)
	}
	// The budget still stops the packing: 200k tokens hold 20 images of
	// 1568² (9934 tokens each), not 21.
	images = images[:0]
	for i := range 21 {
		images = append(images, Image{Data: encodePNG(t, filled(1568, 1568, color.RGBA{0, uint8(i * 10), 0, 0xff}))})
	}
	if as := jevAssets(ctx, &Input{Images: images}); len(as) != 20 {
		t.Fatalf("budget: %d assets", len(as))
	}
}

func TestJevNormalizeSlotsHonourContext(t *testing.T) {
	for range cap(jevNormalizeSlots) {
		jevNormalizeSlots <- struct{}{}
	}
	release := sync.OnceFunc(func() {
		for range cap(jevNormalizeSlots) {
			<-jevNormalizeSlots
		}
	})
	defer release()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	small := encodePNG(t, filled(100, 100, red))
	done := make(chan *typesafeAsset, 1)
	go func() { done <- jevAsset(ctx, small) }()
	select {
	case a := <-done:
		if a != nil {
			t.Fatal("an image was redrawn without a slot")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("jevAsset blocked on the slots with a canceled context")
	}
	// An image inside the limits needs no slot.
	if a := jevAsset(ctx, encodePNG(t, filled(300, 300, red))); a == nil {
		t.Fatal("an in-limits image waited for a slot")
	}
	release()
	if a := jevAsset(context.Background(), small); a == nil {
		t.Fatal("slots were not released")
	}
	if len(jevNormalizeSlots) != 0 {
		t.Fatalf("%d slots still taken", len(jevNormalizeSlots))
	}
}

func TestRulesVersionLegacyHashes(t *testing.T) {
	if builtinVersions[legacyWireHashEN] != RulesVersionEN || builtinVersions[legacyWireHashZH] != RulesVersionZH13 || len(builtinVersions) != 3 {
		t.Fatalf("builtinVersions = %v", builtinVersions)
	}
	if RulesVersionEN != "content-audit-13-en-v1" || RulesVersionZH13 != "content-audit-13-zh-v1" ||
		legacyWireHashEN != "e2ca199d2bb8208d2ebdc47dbf079b49f9f41794c9a4a25527fb1ec609451add" ||
		legacyWireHashZH != "b01b9f2d0e8df50000f90eed1681717e197afc2f73698f108bbb045eada6d3dd" {
		t.Fatal("legacy versions or hashes differ from new-api")
	}
	if v := RulesVersionOf(&builtinQuestions); v != "content-audit-v2-zh" || RulesVersionZH != "content-audit-v2-zh" {
		t.Fatalf("built-in set = %s", v)
	}
	def, _ := DefaultQuestions(nil)
	if def.RulesVersion != RulesVersionZH || builtinVersions[jevWireHash(&def)] != RulesVersionZH {
		t.Fatalf("default set = %s", def.RulesVersion)
	}
	custom := def
	custom.Items = custom.Items[:1:1]
	if v := RulesVersionOf(&custom); v != jevCustomRulesPrefix+jevWireHash(&custom)[:8] {
		t.Fatalf("custom set = %s", v)
	}
}

// jevLargestSource is the most expensive image jevAsset redraws: a square of
// jevImageMaxSourcePixels (the scaler's buffer is largest for a square) in
// 16-bit RGBA, the widest pixel format a PNG decodes to.
func jevLargestSource(t testing.TB) string {
	side := 3464 // 3464² = 11,999,296
	if side*side > jevImageMaxSourcePixels || (side+1)*(side+1) <= jevImageMaxSourcePixels {
		t.Fatalf("side %d is not the largest square of %d pixels", side, jevImageMaxSourcePixels)
	}
	img := image.NewNRGBA64(image.Rect(0, 0, side, side))
	for i := 0; i < len(img.Pix); i += 8 {
		img.Pix[i], img.Pix[i+6], img.Pix[i+7] = 0xff, 0xff, 0xff
	}
	return encodePNG(t, img)
}

// jevNormalizePeak redraws n copies of raw at once and returns the peak of
// the memory the Go runtime holds from the system over the level before, in
// bytes. The collector runs almost continuously meanwhile, so the peak is
// what the redraws keep alive.
func jevNormalizePeak(t testing.TB, raw string, n int) uint64 {
	held := func() uint64 {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		return m.Sys - m.HeapReleased
	}
	defer debug.SetGCPercent(debug.SetGCPercent(1))
	debug.FreeOSMemory()
	base := held()
	peak := base
	stop, sampled := make(chan struct{}), make(chan struct{})
	go func() {
		defer close(sampled)
		for {
			select {
			case <-stop:
				return
			case <-time.After(time.Millisecond):
				peak = max(peak, held())
			}
		}
	}()
	var wg sync.WaitGroup
	for range n {
		wg.Go(func() {
			if a := jevAsset(context.Background(), raw); a == nil {
				t.Error("the largest image was skipped")
			}
		})
	}
	wg.Wait()
	close(stop)
	<-sampled
	return max(peak, held()) - base
}

// jevNormalizeMemoryBudget is what redrawing may take of the 512 MB the
// plugin process is limited to (CONTRACTS §72.2); the rest is left for the
// request bodies and everything else the plugin holds.
const jevNormalizeMemoryBudget = 384 << 20

// Design Q10: the worst case of image normalization stays inside the memory
// limit of the plugin, with every slot busy.
func TestJevNormalizeMemory(t *testing.T) {
	raw := jevLargestSource(t)
	peak := jevNormalizePeak(t, raw, cap(jevNormalizeSlots))
	t.Logf("peak memory of %d concurrent redraws of a 12 MP 16-bit PNG: %d MiB", cap(jevNormalizeSlots), peak>>20)
	if peak > jevNormalizeMemoryBudget {
		t.Fatalf("redrawing takes %d MiB, over the budget of %d MiB", peak>>20, jevNormalizeMemoryBudget>>20)
	}
}

func BenchmarkJevNormalizeLargest(b *testing.B) {
	raw := jevLargestSource(b)
	var peak uint64
	for b.Loop() {
		peak = max(peak, jevNormalizePeak(b, raw, cap(jevNormalizeSlots)))
	}
	b.ReportMetric(float64(peak)/(1<<20), "peak-MiB")
}
