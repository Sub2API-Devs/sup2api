package moderation

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// Modes (settings.mode).
const (
	ModeOff     = "off"
	ModeObserve = "observe"
	ModeEnforce = "enforce"
)

// Verdicts and actions stored in events.
const (
	VerdictPass  = "pass"
	VerdictFlag  = "flag"
	VerdictBlock = "block"
	VerdictError = "error"

	ActionAllow = "allow"
	ActionDeny  = "deny"
)

// Category is one moderation category offered to the LLM.
type Category struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

// Settings is the plugin configuration (forms/settings.schema.json,
// CONTRACTS §20.3).
type Settings struct {
	Mode             string     `json:"mode"`
	BaseURL          string     `json:"base_url"`
	APIKey           string     `json:"api_key"`
	Model            string     `json:"model"`
	SystemPrompt     string     `json:"system_prompt"`
	Categories       []Category `json:"categories"`
	ToolChoice       string     `json:"tool_choice"`
	MaxTurns         int        `json:"max_turns"`
	Temperature      float64    `json:"temperature"`
	MaxTokens        int        `json:"max_tokens"`
	TimeoutMs        int        `json:"timeout_ms"`
	OnError          string     `json:"on_error"`
	MaxConcurrency   int        `json:"max_concurrency"`
	QueueSize        int        `json:"queue_size"`
	InputMaxChars    int        `json:"input_max_chars"`
	MinChars         int        `json:"min_chars"`
	SampleRate       int        `json:"sample_rate"`
	GroupIDs         []int64    `json:"group_ids"`
	ModelPatterns    []string   `json:"model_patterns"`
	ExemptUserIDs    []string   `json:"exempt_user_ids"`
	CacheTTLSeconds  int        `json:"cache_ttl_seconds"`
	BlockStatus      int        `json:"block_status"`
	BlockMessage     string     `json:"block_message"`
	RecordPass       bool       `json:"record_pass"`
	StoreText        bool       `json:"store_text"`
	RetentionDays    int        `json:"retention_days"`
	BanThreshold     int        `json:"ban_threshold"`
	BanWindowHours   int        `json:"ban_window_hours"`
	BanDurationHours int        `json:"ban_duration_hours"`
}

// DefaultBlockMessage is the default deny message of a block verdict.
const DefaultBlockMessage = "提示词审核未通过，请调整输入后重试"

// DefaultSettings returns the schema defaults.
func DefaultSettings() Settings {
	return Settings{
		Mode:             ModeOff,
		ToolChoice:       "required",
		MaxTurns:         3,
		Temperature:      0,
		MaxTokens:        512,
		TimeoutMs:        10000,
		OnError:          "allow",
		MaxConcurrency:   16,
		QueueSize:        1000,
		InputMaxChars:    8000,
		MinChars:         2,
		SampleRate:       100,
		CacheTTLSeconds:  3600,
		BlockStatus:      403,
		BlockMessage:     DefaultBlockMessage,
		RecordPass:       false,
		StoreText:        true,
		RetentionDays:    30,
		BanThreshold:     0,
		BanWindowHours:   24,
		BanDurationHours: 24,
	}
}

var (
	categoryIDRe = regexp.MustCompile(`^[a-z0-9_]{1,32}$`)
	baseURLRe    = regexp.MustCompile(`^https?://\S+$`)
)

// DecodeSettings is lenient (CONTRACTS §20.3: validation is the schema's
// job): unknown keys and values of the wrong type are ignored, numbers are
// clamped into range. Only a non-object document is an error.
func DecodeSettings(raw []byte) (Settings, error) {
	s := DefaultSettings()
	raw = []byte(strings.TrimSpace(string(raw)))
	if len(raw) == 0 || string(raw) == "null" {
		return s, nil
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		return s, err
	}
	str := func(k string, dst *string) {
		if v, ok := m[k]; ok {
			var x string
			if json.Unmarshal(v, &x) == nil {
				*dst = x
			}
		}
	}
	num := func(k string, dst *float64) bool {
		if v, ok := m[k]; ok {
			var x float64
			if json.Unmarshal(v, &x) == nil && !math.IsNaN(x) && !math.IsInf(x, 0) {
				*dst = x
				return true
			}
		}
		return false
	}
	integer := func(k string, dst *int, lo, hi int) {
		var f float64
		if num(k, &f) {
			*dst = clampInt(int(math.Round(math.Max(math.Min(f, 1e12), -1e12))), lo, hi)
		} else {
			*dst = clampInt(*dst, lo, hi)
		}
	}
	boolean := func(k string, dst *bool) {
		if v, ok := m[k]; ok {
			var x bool
			if json.Unmarshal(v, &x) == nil {
				*dst = x
			}
		}
	}
	strList := func(k string) []string {
		var out []string
		if v, ok := m[k]; ok {
			var xs []any
			if json.Unmarshal(v, &xs) == nil {
				for _, x := range xs {
					switch t := x.(type) {
					case string:
						out = append(out, t)
					case float64:
						out = append(out, strconv.FormatFloat(t, 'f', -1, 64))
					}
				}
			}
		}
		return out
	}
	enum := func(k string, dst *string, allowed ...string) {
		var x string
		str(k, &x)
		x = strings.ToLower(strings.TrimSpace(x))
		for _, a := range allowed {
			if x == a {
				*dst = x
				return
			}
		}
	}

	enum("mode", &s.Mode, ModeOff, ModeObserve, ModeEnforce)
	str("base_url", &s.BaseURL)
	s.BaseURL = strings.TrimSpace(s.BaseURL)
	if s.BaseURL != "" && !baseURLRe.MatchString(s.BaseURL) {
		s.BaseURL = ""
	}
	str("api_key", &s.APIKey)
	s.APIKey = strings.TrimSpace(s.APIKey)
	str("model", &s.Model)
	s.Model = truncateRunes(strings.TrimSpace(s.Model), 200)
	str("system_prompt", &s.SystemPrompt)
	s.SystemPrompt = truncateRunes(s.SystemPrompt, 20000)
	if v, ok := m["categories"]; ok {
		var cats []struct {
			ID          any `json:"id"`
			Description any `json:"description"`
		}
		if json.Unmarshal(v, &cats) == nil {
			seen := map[string]bool{}
			for _, c := range cats {
				id, _ := c.ID.(string)
				desc, _ := c.Description.(string)
				id = strings.TrimSpace(id)
				if !categoryIDRe.MatchString(id) || seen[id] {
					continue
				}
				seen[id] = true
				s.Categories = append(s.Categories, Category{ID: id, Description: truncateRunes(strings.TrimSpace(desc), 500)})
				if len(s.Categories) == 50 {
					break
				}
			}
		}
	}
	enum("tool_choice", &s.ToolChoice, "required", "function", "auto")
	integer("max_turns", &s.MaxTurns, 1, 5)
	if num("temperature", &s.Temperature) {
		s.Temperature = math.Max(0, math.Min(2, s.Temperature))
	}
	integer("max_tokens", &s.MaxTokens, 64, 4096)
	integer("timeout_ms", &s.TimeoutMs, 1000, 25000)
	enum("on_error", &s.OnError, "allow", "block")
	integer("max_concurrency", &s.MaxConcurrency, 1, 256)
	integer("queue_size", &s.QueueSize, 1, 100000)
	integer("input_max_chars", &s.InputMaxChars, 256, 100000)
	integer("min_chars", &s.MinChars, 0, 1000)
	integer("sample_rate", &s.SampleRate, 1, 100)
	for _, g := range strList("group_ids") {
		if id, err := strconv.ParseInt(strings.TrimSpace(g), 10, 64); err == nil && id > 0 {
			s.GroupIDs = append(s.GroupIDs, id)
		}
	}
	for _, p := range strList("model_patterns") {
		if p = strings.TrimSpace(p); p != "" {
			s.ModelPatterns = append(s.ModelPatterns, p)
		}
	}
	for _, u := range strList("exempt_user_ids") {
		if u = strings.TrimSpace(u); u != "" {
			if _, err := strconv.ParseInt(u, 10, 64); err == nil {
				s.ExemptUserIDs = append(s.ExemptUserIDs, u)
			}
		}
	}
	integer("cache_ttl_seconds", &s.CacheTTLSeconds, 0, 604800)
	integer("block_status", &s.BlockStatus, 400, 599)
	str("block_message", &s.BlockMessage)
	s.BlockMessage = truncateRunes(strings.TrimSpace(s.BlockMessage), 500)
	if s.BlockMessage == "" {
		s.BlockMessage = DefaultBlockMessage
	}
	boolean("record_pass", &s.RecordPass)
	boolean("store_text", &s.StoreText)
	integer("retention_days", &s.RetentionDays, 1, 3650)
	integer("ban_threshold", &s.BanThreshold, 0, 1000)
	integer("ban_window_hours", &s.BanWindowHours, 1, 8760)
	integer("ban_duration_hours", &s.BanDurationHours, 0, 87600)
	return s, nil
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// config is the compiled, immutable runtime view of Settings.
type config struct {
	Settings

	configured bool // base_url, api_key and model set
	enabled    bool // configured and mode != off

	endpoint     string
	prompt       string // expanded system prompt
	categories   []Category
	categorySet  map[string]bool
	policy       string // policy version (hex)
	toolJSON     json.RawMessage
	choiceJSON   json.RawMessage
	markerKey    []byte
	exempt       map[int64]bool
	groups       map[int64]bool
	timeout      time.Duration
	cacheTTL     time.Duration
	banWindow    time.Duration
	banDuration  time.Duration // 0 = until unblocked
	retention    time.Duration
	blockMessage string
}

// compile derives the runtime config from settings.
func compile(s Settings) *config {
	c := &config{Settings: s}
	c.configured = s.BaseURL != "" && s.APIKey != "" && s.Model != ""
	c.enabled = c.configured && s.Mode != ModeOff
	c.endpoint = chatEndpoint(s.BaseURL)
	c.categories = s.Categories
	if len(c.categories) == 0 {
		c.categories = DefaultCategories()
	}
	c.categorySet = make(map[string]bool, len(c.categories))
	for _, cat := range c.categories {
		c.categorySet[cat.ID] = true
	}
	c.prompt = expandPrompt(s.SystemPrompt, c.categories)
	c.toolJSON = toolDefinition(c.categories)
	c.choiceJSON = toolChoice(s.ToolChoice)
	h := sha256.New()
	cats, _ := json.Marshal(c.categories)
	for _, part := range [][]byte{[]byte(s.Model), []byte(c.prompt), cats, []byte(s.ToolChoice)} {
		h.Write(part)
		h.Write([]byte{0})
	}
	c.policy = hex.EncodeToString(h.Sum(nil))[:32]
	c.markerKey = markerKey(s.APIKey)
	c.exempt = map[int64]bool{}
	for _, u := range s.ExemptUserIDs {
		if id, err := strconv.ParseInt(u, 10, 64); err == nil {
			c.exempt[id] = true
		}
	}
	c.groups = map[int64]bool{}
	for _, g := range s.GroupIDs {
		c.groups[g] = true
	}
	c.timeout = time.Duration(s.TimeoutMs) * time.Millisecond
	c.cacheTTL = time.Duration(s.CacheTTLSeconds) * time.Second
	c.banWindow = time.Duration(s.BanWindowHours) * time.Hour
	c.banDuration = time.Duration(s.BanDurationHours) * time.Hour
	c.retention = time.Duration(s.RetentionDays) * 24 * time.Hour
	c.blockMessage = s.BlockMessage
	return c
}

// chatEndpoint builds the chat completions URL (CONTRACTS §20.3 base_url).
func chatEndpoint(base string) string {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" {
		return ""
	}
	if strings.HasSuffix(base, "/v1") {
		return base + "/chat/completions"
	}
	return base + "/v1/chat/completions"
}

// modelMatches reports whether model matches any glob (* and ?,
// case-insensitive); no patterns match everything.
func (c *config) modelMatches(model string) bool {
	if len(c.ModelPatterns) == 0 {
		return true
	}
	model = strings.ToLower(model)
	for _, p := range c.ModelPatterns {
		if globMatch(strings.ToLower(p), model) {
			return true
		}
	}
	return false
}

// globMatch matches s against pattern with * (any run) and ? (one rune).
func globMatch(pattern, s string) bool {
	px, sx := 0, 0
	nextPx, nextSx := -1, -1
	for px < len(pattern) || sx < len(s) {
		if px < len(pattern) {
			switch c := pattern[px]; c {
			case '*':
				nextPx, nextSx = px, sx+1
				px++
				continue
			case '?':
				if sx < len(s) {
					_, n := utf8.DecodeRuneInString(s[sx:])
					px++
					sx += n
					continue
				}
			default:
				if sx < len(s) && s[sx] == c {
					px++
					sx++
					continue
				}
			}
		}
		if nextSx > 0 && nextSx <= len(s) {
			px, sx = nextPx, nextSx
			continue
		}
		return false
	}
	return true
}

func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	r := []rune(s)
	return string(r[:n])
}

// truncateBytes cuts s to at most n bytes on a rune boundary.
func truncateBytes(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}
