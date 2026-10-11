package environment

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestLocale(t *testing.T) {
	for _, tc := range []struct{ input, canonical, posix string }{
		{"en-US", "en-US", "en_US.UTF-8"},
		{"ja-JP", "ja-JP", "ja_JP.UTF-8"},
		{"ZH-cn", "zh-CN", "zh_CN.UTF-8"},
		{"sr-RS", "sr-RS", "sr_RS.UTF-8"},
	} {
		canonical, posix, ok := Locale(tc.input)
		if !ok || canonical != tc.canonical || posix != tc.posix {
			t.Fatalf("Locale(%q) = %q, %q, %v", tc.input, canonical, posix, ok)
		}
	}
	for _, value := range []string{"", "en-AQ", "zh-Hans-CN", "ja_JP.UTF-8", "en-US\n", "invalid"} {
		if _, _, ok := Locale(value); ok {
			t.Fatalf("unsupported locale accepted: %q", value)
		}
	}
}

func TestLocaleCatalog(t *testing.T) {
	var values []string
	if err := json.Unmarshal(localeJSON, &values); err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for _, value := range values {
		canonical, posix, ok := Locale(value)
		if !ok || canonical != value || posix != strings.ReplaceAll(value, "-", "_")+".UTF-8" || seen[value] {
			t.Fatalf("invalid locale entry: %q", value)
		}
		seen[value] = true
	}
	if len(seen) < 100 {
		t.Fatalf("catalog unexpectedly small: %d", len(seen))
	}
}
