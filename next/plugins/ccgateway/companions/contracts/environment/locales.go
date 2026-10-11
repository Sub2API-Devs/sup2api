package environment

import (
	_ "embed"
	"encoding/json"
	"strings"
)

//go:embed locales.json
var localeJSON []byte

var locales = func() []string {
	var values []string
	if err := json.Unmarshal(localeJSON, &values); err != nil {
		panic(err)
	}
	return values
}()

func Locale(value string) (canonical, posix string, ok bool) {
	for _, tag := range locales {
		if strings.EqualFold(value, tag) {
			return tag, strings.ReplaceAll(tag, "-", "_") + ".UTF-8", true
		}
	}
	return "", "", false
}
