package expr

import (
	"fmt"
	"strconv"
	"strings"
)

// VideoConfig is a visual expression template. It uses the same immutable
// expression snapshot as every other price, including asynchronous settlement.
// Prices are USD; seconds are normalized to a 1280x720 output.
type VideoConfig struct {
	PricePerMillionTokens           Num                    `json:"price_per_million_tokens"`
	VideoInputPricePerMillionTokens Num                    `json:"video_input_price_per_million_tokens,omitempty"`
	VideoPricePerSecond             Num                    `json:"video_price_per_second,omitempty"`
	ResolutionPrices                []VideoResolutionPrice `json:"resolution_prices,omitempty"`
}

type VideoResolutionPrice struct {
	Sizes                           []string `json:"sizes"`
	PricePerMillionTokens           Num      `json:"price_per_million_tokens,omitempty"`
	VideoInputPricePerMillionTokens Num      `json:"video_input_price_per_million_tokens,omitempty"`
	VideoPricePerSecond             Num      `json:"video_price_per_second,omitempty"`
}

func generateVideo(c VideoConfig) (string, error) {
	if c.PricePerMillionTokens <= 0 {
		return "", cfgErr("config.video.price_per_million_tokens", "must be positive")
	}
	for _, p := range []Num{c.PricePerMillionTokens, c.VideoInputPricePerMillionTokens, c.VideoPricePerSecond} {
		if err := checkNum("config.video", float64(p)); err != nil {
			return "", err
		}
	}
	if len(c.ResolutionPrices) > 64 {
		return "", cfgErr("config.video.resolution_prices", "at most 64 entries")
	}
	body := videoTier("video", c)
	seen := map[string]bool{}
	for i := len(c.ResolutionPrices) - 1; i >= 0; i-- {
		r := c.ResolutionPrices[i]
		field := fmt.Sprintf("config.video.resolution_prices[%d]", i)
		if len(r.Sizes) == 0 || len(r.Sizes) > 64 {
			return "", cfgErr(field+".sizes", "requires 1..64 sizes")
		}
		if r.PricePerMillionTokens == 0 && r.VideoInputPricePerMillionTokens == 0 && r.VideoPricePerSecond == 0 {
			return "", cfgErr(field, "at least one positive price is required")
		}
		for _, p := range []Num{r.PricePerMillionTokens, r.VideoInputPricePerMillionTokens, r.VideoPricePerSecond} {
			if err := checkNum(field, float64(p)); err != nil {
				return "", err
			}
		}
		effective := c
		if r.PricePerMillionTokens > 0 {
			effective.PricePerMillionTokens = r.PricePerMillionTokens
		}
		if r.VideoInputPricePerMillionTokens > 0 {
			effective.VideoInputPricePerMillionTokens = r.VideoInputPricePerMillionTokens
		}
		if r.VideoPricePerSecond > 0 {
			effective.VideoPricePerSecond = r.VideoPricePerSecond
		}
		var conditions []string
		for _, size := range r.Sizes {
			a, b, ok := strings.Cut(strings.ToLower(strings.TrimSpace(size)), "x")
			w, ew := strconv.Atoi(strings.TrimSpace(a))
			h, eh := strconv.Atoi(strings.TrimSpace(b))
			if !ok || ew != nil || eh != nil || w <= 0 || h <= 0 || w > 16384 || h > 16384 {
				return "", cfgErr(field+".sizes", "invalid size %q", size)
			}
			key := fmt.Sprintf("%dx%d", min(w, h), max(w, h))
			if seen[key] {
				return "", cfgErr(field+".sizes", "duplicate size %s", key)
			}
			seen[key] = true
			conditions = append(conditions, fmt.Sprintf(`((u("video_width") == %d && u("video_height") == %d) || (u("video_width") == %d && u("video_height") == %d))`, w, h, h, w))
		}
		body = "(" + strings.Join(conditions, " || ") + ") ? " + videoTier(fmt.Sprintf("video_size_%d", i+1), effective) + " : (" + body + ")"
	}
	return body, nil
}

func videoTier(name string, c VideoConfig) string {
	rate := fmtNum(float64(c.PricePerMillionTokens))
	inputRate := rate
	if c.VideoInputPricePerMillionTokens > 0 {
		inputRate = fmtNum(float64(c.VideoInputPricePerMillionTokens))
	}
	selected := fmt.Sprintf(`(u("video_input") == true ? %s : %s)`, inputRate, rate)
	body := "c * " + selected
	if c.VideoPricePerSecond > 0 {
		// Explicit seconds pricing only affects reservations. Real tokens always
		// settle at the snapshotted token rate; missing usage keeps the reservation.
		seconds := fmt.Sprintf(`flat(%s) * (u("video_seconds") ?? 0) * (u("video_pixels") ?? 0) / 921600 * %s / %s`, fmtNum(float64(c.VideoPricePerSecond)), selected, rate)
		body = fmt.Sprintf(`u("video_estimated") == true ? (%s) : (%s)`, seconds, body)
	}
	return fmt.Sprintf("tier(%s, %s)", strconv.Quote(name), body)
}
