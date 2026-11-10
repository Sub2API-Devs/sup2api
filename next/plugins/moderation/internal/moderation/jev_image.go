package moderation

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"image"
	_ "image/gif" // first frame only
	"image/jpeg"
	"image/png"
	"io"
	"slices"
	"strings"
	"unicode/utf8"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
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
	// 512 MB (CONTRACTS §72.2), and a 12 MP image is up to 96 MB decoded
	// (16-bit RGBA).
	jevImageMaxSourcePixels = 12_000_000
	// jevImagePNGMax: a normalized image whose PNG is larger is a photo
	// rather than a screenshot and goes as a JPEG of jevImageJPEGQuality, a
	// fraction of the size, so more images fit the request.
	jevImagePNGMax      = 2 << 20
	jevImageJPEGQuality = 85
	jevScaleBandRows    = 64
)

// jevImageFormats are the formats jevAsset decodes; anything else is skipped
// even when another package registers a decoder for it.
var jevImageFormats = []string{"png", "jpeg", "gif", "webp"}

// jevNormalizeSlots bounds the images decoded and redrawn at once, and with
// them the memory and CPU normalization takes on the request path.
var jevNormalizeSlots = make(chan struct{}, 2)

func jevImageTokens(w, h int) int { return w*h/250 + 100 }

// jevAssets packs the sendable images in order until the next one does not
// fit the budget; the same content is sent once.
func jevAssets(ctx context.Context, in *Input) []typesafeAsset {
	tokens, size := utf8.RuneCountInString(in.Text), 0
	seen := map[[32]byte]bool{}
	var out []typesafeAsset
	for _, img := range in.Images {
		if img.URL != "" {
			continue
		}
		a := jevAsset(ctx, img.Data)
		if a == nil {
			continue
		}
		sum := sha256.Sum256([]byte(a.DataBase64))
		if seen[sum] {
			continue
		}
		if tokens+a.tokens > jevRequestTokenLimit || size+len(a.DataBase64) > jevRequestBase64Max {
			break
		}
		seen[sum] = true
		tokens, size = tokens+a.tokens, size+len(a.DataBase64)
		out = append(out, *a)
	}
	return out
}

// jevAsset turns an inline image (bare base64, at most 16 MiB decoded) into
// an asset System One accepts. A PNG or JPEG whose header is inside the
// limits is sent as it is: the header is read through a streaming decoder,
// so the image is never held decoded. Any other PNG, JPEG, GIF or WebP is
// normalized (jevNormalizeImage) unless its header claims more than
// jevImageMaxSourcePixels, waiting for a jevNormalizeSlots slot within ctx.
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
	cfg, format, err := image.DecodeConfig(base64.NewDecoder(base64.StdEncoding, strings.NewReader(raw)))
	if err != nil || !slices.Contains(jevImageFormats, format) {
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
	select {
	case jevNormalizeSlots <- struct{}{}:
		defer func() { <-jevNormalizeSlots }()
	case <-ctx.Done():
		return nil
	}
	data, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return nil
	}
	return jevNormalizeImage(data)
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
