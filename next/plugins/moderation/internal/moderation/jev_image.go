package moderation

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	_ "image/gif" // first frame only
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"runtime/debug"
	"slices"
	"strings"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	xsemaphore "golang.org/x/sync/semaphore"
)

// Image limits of System One (new-api engine_typesafe.go): width and height
// 280–1568 px, 78,400–2,458,624 pixels in total, at most 16 MiB per image;
// anything outside is rejected, not scaled. So an inline PNG / JPEG inside
// the limits is sent as it is, and any other inline PNG, JPEG, GIF (first
// frame) or WebP is redrawn to fit (jevNormalizeImage).
const (
	jevImageMinSide   = 280
	jevImageMaxSide   = 1568
	jevImageMinPixels = 78_400
	jevImageMaxPixels = 2_458_624
	jevImageMaxBytes  = 16 << 20
	// jevImageMaxSourcePixels bounds what is decoded for normalization: an
	// image whose header claims more is skipped before its pixels are
	// allocated. new-api takes 50 MP; the plugin process is limited to
	// 1024 MB (CONTRACTS §72.2; sized for the 512 MB of 0.7.x and kept).
	jevImageMaxSourcePixels = 12_000_000
	// jevNormalizeMemory bounds the memory the decoders hold at once, by
	// the estimate of each image's header (jevDecodeCost): an image that
	// alone needs more is skipped, the others wait until they fit. Pixels
	// alone do not bound it: a 12 MP image is 12 MB as a gray PNG, 96 MB as
	// a 16-bit RGBA PNG and 180 MB as a progressive JPEG without chroma
	// subsampling (the decoder keeps every coefficient, 4 bytes per sample,
	// beside the planes) - and such a JPEG can be a 70 KB file. So a 16-bit
	// 12 MP PNG is redrawn alone, and a progressive 4:4:4 JPEG up to 7.8 MP.
	jevNormalizeMemory = 112 << 20
	// A call redraws for at most jevNormalizeShare of the time its context
	// has left (the channel timeout), and never longer than
	// jevNormalizeBudgetMax: the rest belongs to the upstream call, so that
	// images never cost the text its audit.
	jevNormalizeShare     = 2 // one half
	jevNormalizeBudgetMax = 5 * time.Second
	// jevImagePNGMax: a normalized image whose PNG is larger is a photo
	// rather than a screenshot and goes as a JPEG of jevImageJPEGQuality, a
	// fraction of the size, so more images fit the request.
	jevImagePNGMax      = 2 << 20
	jevImageJPEGQuality = 85
	jevScaleBandRows    = 64
	// jevNormalizeWorkers is the number of images decoded and redrawn at
	// once (jevNormalizeSlots).
	jevNormalizeWorkers = 2
	// What the JPEG decoder holds (jpegDecodeCost): a byte per sample in
	// the planes, jpegCoefficientBytes more per sample of a progressive
	// frame, jpegCMYKBytes per pixel for the image four components are
	// converted into; the planes are rounded up to whole MCUs, which adds at
	// most one sample in jpegMCUSlack per pixel. The worst case is four
	// components without subsampling, progressive.
	jpegCoefficientBytes   = 4
	jpegCMYKBytes          = 4
	jpegMCUSlack           = 16
	jpegWorstBytesPerPixel = 4*(1+jpegCoefficientBytes) + jpegCMYKBytes
)

// jevImageFormats are the formats jevAsset decodes; anything else is skipped
// even when another package registers a decoder for it.
var jevImageFormats = []string{"png", "jpeg", "gif", "webp"}

// jevNormalizeSlots bounds the images decoded and redrawn at once (the CPU
// normalization takes on the request path), jevNormalizeBytes the memory
// their decoders hold (jevNormalizeMemory).
var (
	jevNormalizeSlots = make(chan struct{}, jevNormalizeWorkers)
	jevNormalizeBytes = xsemaphore.NewWeighted(jevNormalizeMemory)
)

// jevRedrawPanics counts the redraws in which a decoder panicked (the image
// is skipped); jevLogger gets a line for each, the plugin's logger once it
// is initialised.
var (
	jevRedrawPanics atomic.Int64
	jevLogger       atomic.Pointer[slog.Logger]
)

// jevNormalize redraws one image (a variable for the tests).
var jevNormalize = jevNormalizeImage

func jevImageTokens(w, h int) int { return w*h/250 + 100 }

// jevAssets packs the sendable images in order until the next one does not
// fit the budget; the same content is sent once. Redrawing has its own time
// budget inside ctx (jevNormalizeBudget): an image that is not ready when it
// ends is skipped, like every image after it that needs redrawing, and the
// call goes out with the text and the images that are ready. Images sent as
// they are cost no time and are still packed.
//
// Every asset names the images it stands for (from). An image of the input
// that no asset names was not sent, whatever the reason - a URL, too large,
// undecodable, not redrawn in time, beyond the request budget - and nothing
// is decided about it.
func jevAssets(ctx context.Context, in *Input) []typesafeAsset {
	nctx, cancel := context.WithTimeout(ctx, jevNormalizeBudget(ctx))
	defer cancel()
	tokens, size := utf8.RuneCountInString(in.Text), 0
	seen := map[[32]byte]int{} // content -> its asset in out
	var out []typesafeAsset
	for i, img := range in.Images {
		if ctx.Err() != nil {
			break // the call is over: nothing will be sent
		}
		if img.URL != "" {
			continue
		}
		a := jevAsset(nctx, img.Data)
		if a == nil {
			continue
		}
		sum := sha256.Sum256([]byte(a.DataBase64))
		if j, ok := seen[sum]; ok {
			out[j].from = append(out[j].from, i)
			continue
		}
		if tokens+a.tokens > jevRequestTokenLimit || size+len(a.DataBase64) > jevRequestBase64Max {
			break
		}
		seen[sum] = len(out)
		tokens, size = tokens+a.tokens, size+len(a.DataBase64)
		a.from = []int{i}
		out = append(out, *a)
	}
	return out
}

// jevNormalizeBudget is the time a call may spend redrawing images: a share
// of what ctx has left, at most jevNormalizeBudgetMax.
func jevNormalizeBudget(ctx context.Context) time.Duration {
	budget := jevNormalizeBudgetMax
	if deadline, ok := ctx.Deadline(); ok {
		budget = min(budget, max(time.Until(deadline), 0)/jevNormalizeShare)
	}
	return budget
}

// jevAsset turns an inline image (bare base64, at most 16 MiB decoded) into
// an asset System One accepts. A PNG or JPEG whose header is inside the
// limits is sent as it is: the header is read through a streaming decoder,
// so the image is never held decoded. Any other PNG, JPEG, GIF or WebP is
// normalized (jevRedraw) unless its header claims more than
// jevImageMaxSourcePixels or more decoder memory than jevNormalizeMemory.
// URL images are never downloaded. nil = skipped, not an error.
func jevAsset(ctx context.Context, raw string) *typesafeAsset {
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return nil
	}
	if base64.StdEncoding.DecodedLen(len(raw)) > jevImageMaxBytes+2 {
		return nil
	}
	n, err := io.Copy(io.Discard, base64.NewDecoder(base64.StdEncoding, strings.NewReader(raw)))
	if err != nil || n > jevImageMaxBytes {
		return nil
	}
	cfg, format, ok := imageHeader(raw)
	if !ok {
		return nil
	}
	w, h := cfg.Width, cfg.Height
	if (format == "png" || format == "jpeg") && min(w, h) >= jevImageMinSide && max(w, h) <= jevImageMaxSide &&
		w*h >= jevImageMinPixels && w*h <= jevImageMaxPixels {
		return &typesafeAsset{Type: "image", Format: format, DataBase64: raw, tokens: jevImageTokens(w, h)}
	}
	if w <= 0 || h <= 0 || w*h > jevImageMaxSourcePixels {
		return nil
	}
	cost := jevDecodeCost(format, cfg, base64.NewDecoder(base64.StdEncoding, strings.NewReader(raw)))
	if cost > jevNormalizeMemory {
		return nil
	}
	return jevRedraw(ctx, raw, cost)
}

// imageHeader reads the header of an inline image (bare base64) through a
// streaming decoder, so the image is never held decoded: its size and its
// format. ok only for a format of jevImageFormats.
func imageHeader(raw string) (cfg image.Config, format string, ok bool) {
	cfg, format, err := image.DecodeConfig(base64.NewDecoder(base64.StdEncoding, strings.NewReader(raw)))
	return cfg, format, err == nil && slices.Contains(jevImageFormats, format)
}

// jevRedraw normalizes an image whose decoder needs cost bytes, within ctx:
// it waits for a slot and for the memory only while ctx lasts, and when ctx
// ends during the redraw it returns nil at once - a decoder cannot be
// stopped, so the redraw finishes on its own and frees its slot and memory
// then. A decoder that panics on the image is counted and logged
// (jevRedrawPanics), and the image is skipped. nil = skipped.
func jevRedraw(ctx context.Context, raw string, cost int64) *typesafeAsset {
	if ctx.Err() != nil {
		return nil
	}
	select {
	case jevNormalizeSlots <- struct{}{}:
	case <-ctx.Done():
		return nil
	}
	// select takes either case when both are ready, and Acquire takes a
	// free semaphore even when ctx is done.
	if ctx.Err() != nil || jevNormalizeBytes.Acquire(ctx, cost) != nil {
		<-jevNormalizeSlots
		return nil
	}
	if ctx.Err() != nil {
		jevNormalizeBytes.Release(cost)
		<-jevNormalizeSlots
		return nil
	}
	done := make(chan *typesafeAsset, 1)
	go func() {
		var a *typesafeAsset
		defer func() {
			if r := recover(); r != nil {
				a = nil // a decoder panicked on the image: skipped
				jevRedrawPanics.Add(1)
				if log := jevLogger.Load(); log != nil {
					// The sizes only: never the image.
					log.Error("moderation: image decoder panicked, the image is skipped", "base64_bytes", len(raw),
						"decoder_bytes", cost, "panic", fmt.Sprint(r), "stack", string(debug.Stack()))
				}
			}
			jevNormalizeBytes.Release(cost)
			<-jevNormalizeSlots
			done <- a
		}()
		if data, err := base64.StdEncoding.DecodeString(raw); err == nil {
			a = jevNormalize(data)
		}
	}()
	select {
	case a := <-done:
		return a
	case <-ctx.Done():
		return nil
	}
}

// jevDecodeCost estimates the bytes the decoder of an image holds while it
// is decoded, from the header (cfg of image.DecodeConfig, r reads the file
// from its start). It errs on the high side where the header does not tell.
func jevDecodeCost(format string, cfg image.Config, r io.Reader) int64 {
	px := int64(cfg.Width) * int64(cfg.Height)
	switch format {
	case "jpeg":
		return jpegDecodeCost(px, r)
	case "gif":
		return px // paletted, first frame
	case "webp":
		switch cfg.ColorModel {
		case color.YCbCrModel:
			return px * 3
		case color.NYCbCrAModel:
			return px * 4
		}
		return px * 8 // lossless: NRGBA and the transforms' scratch
	}
	// PNG: the pixel format, and half as much again when interlaced (the
	// decoder holds a pass beside the image). Byte 28 is the interlace
	// method of IHDR.
	bpp := int64(4)
	switch cfg.ColorModel {
	case color.RGBA64Model, color.NRGBA64Model:
		bpp = 8
	case color.Gray16Model:
		bpp = 2
	case color.GrayModel:
		bpp = 1
	default:
		if _, ok := cfg.ColorModel.(color.Palette); ok {
			bpp = 1
		}
	}
	cost := px * bpp
	var head [29]byte
	if _, err := io.ReadFull(r, head[:]); err != nil || head[28] != 0 {
		cost += cost / 2
	}
	return cost
}

// jpegDecodeCost reads the frame header of a JPEG of px pixels: the planes
// take one byte per sample, by the components' sampling factors, and a
// progressive frame (SOF2) keeps every coefficient as well, four bytes per
// sample. Four components (CMYK) are converted into a second image. A
// header that cannot be read costs the worst case.
func jpegDecodeCost(px int64, r io.Reader) int64 {
	worst := px * jpegWorstBytesPerPixel
	br := bufio.NewReader(r)
	var b [2]byte
	if _, err := io.ReadFull(br, b[:]); err != nil || b[0] != 0xff || b[1] != 0xd8 {
		return worst
	}
	for {
		if _, err := io.ReadFull(br, b[:]); err != nil || b[0] != 0xff {
			return worst
		}
		marker := b[1]
		for marker == 0xff { // fill bytes
			m, err := br.ReadByte()
			if err != nil {
				return worst
			}
			marker = m
		}
		if marker == 0xd8 || marker == 0x01 || (marker >= 0xd0 && marker <= 0xd7) {
			continue // no payload
		}
		if _, err := io.ReadFull(br, b[:]); err != nil {
			return worst
		}
		n := int(b[0])<<8 | int(b[1]) - 2
		if n < 0 {
			return worst
		}
		sof := marker >= 0xc0 && marker <= 0xcf && marker != 0xc4 && marker != 0xc8 && marker != 0xcc
		if !sof {
			if marker == 0xda || marker == 0xd9 { // no frame header before the scan
				return worst
			}
			if _, err := br.Discard(n); err != nil {
				return worst
			}
			continue
		}
		head := make([]byte, n)
		if _, err := io.ReadFull(br, head); err != nil || n < 6 || n < 6+3*int(head[5]) {
			return worst
		}
		comps := int(head[5])
		var units, hmax, vmax int64
		for c := range comps {
			hv := head[6+3*c+1]
			ch, cv := int64(hv>>4), int64(hv&0x0f)
			units += ch * cv
			hmax, vmax = max(hmax, ch), max(vmax, cv)
		}
		if comps == 0 || hmax == 0 || vmax == 0 {
			return worst
		}
		// Planes are rounded up to whole MCUs: a little over px.
		samples := px*units/(hmax*vmax) + px/jpegMCUSlack
		cost := samples
		if marker != 0xc0 && marker != 0xc1 { // progressive (or a kind the decoder refuses)
			cost += samples * jpegCoefficientBytes
		}
		if comps == 4 {
			cost += px * jpegCMYKBytes
		}
		return cost
	}
}

// jevNormalizeImage decodes an image and redraws it inside the System One
// limits: scaled down proportionally until the longer side is at most
// 1568 px (which also keeps it within 2,458,624 pixels), never scaled up,
// then centered on a white canvas at least 280 px each way (so at least
// 78,400 pixels); transparency is flattened onto the same white. BiLinear
// keeps the small text of downscaled screenshots legible. The result is a
// PNG (lossless, small for screenshots) unless that is over jevImagePNGMax,
// then a JPEG. EXIF orientation is ignored, as System One ignores it.
// nil = undecodable.
func jevNormalizeImage(data []byte) *typesafeAsset {
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil
	}
	sb := src.Bounds()
	w, h := sb.Dx(), sb.Dy()
	if long := max(w, h); long > jevImageMaxSide {
		w, h = max(1, w*jevImageMaxSide/long), max(1, h*jevImageMaxSide/long)
	}
	canvasW, canvasH := max(w, jevImageMinSide), max(h, jevImageMinSide)
	dst := image.NewRGBA(image.Rect(0, 0, canvasW, canvasH))
	draw.Draw(dst, dst.Bounds(), image.White, image.Point{}, draw.Src)
	at := image.Rectangle{Min: image.Pt((canvasW-w)/2, (canvasH-h)/2)}
	at.Max = at.Min.Add(image.Pt(w, h))
	if w == sb.Dx() && h == sb.Dy() {
		draw.Draw(dst, at, src, sb.Min, draw.Over)
	} else {
		// One Scale call buffers 32 bytes per destination column and source
		// row (174 MB for a 12 MP square), so the image is scaled in bands of
		// jevScaleBandRows destination rows, each from its own source rows.
		for y := 0; y < h; y += jevScaleBandRows {
			y1 := min(y+jevScaleBandRows, h)
			rows := image.Rect(sb.Min.X, sb.Min.Y+y*sb.Dy()/h, sb.Max.X, sb.Min.Y+y1*sb.Dy()/h)
			draw.BiLinear.Scale(dst, image.Rect(at.Min.X, at.Min.Y+y, at.Max.X, at.Min.Y+y1), src, rows, draw.Over, nil)
		}
	}
	var buf bytes.Buffer
	format := "png"
	if err := (&png.Encoder{CompressionLevel: png.BestSpeed}).Encode(&buf, dst); err != nil {
		return nil
	}
	if buf.Len() > jevImagePNGMax {
		buf.Reset()
		format = "jpeg"
		if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: jevImageJPEGQuality}); err != nil {
			return nil
		}
	}
	return &typesafeAsset{Type: "image", Format: format, DataBase64: base64.StdEncoding.EncodeToString(buf.Bytes()), tokens: jevImageTokens(canvasW, canvasH)}
}
