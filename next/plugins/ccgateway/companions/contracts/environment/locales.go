package environment

import (
	_ "embed"
	"encoding/json"
	"errors"
	"strings"
	"time"
	_ "time/tzdata"
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

func Normalize(raw []byte) (map[string]string, error) {
	values := map[string]string{}
	if len(raw) > 0 && (json.Unmarshal(raw, &values) != nil || values == nil) {
		return nil, errors.New("environment settings must be an object")
	}
	for key, value := range values {
		value = strings.TrimSpace(value)
		switch key {
		case "locale":
			if value != "" {
				canonical, _, ok := Locale(value)
				if !ok {
					return nil, errors.New("unsupported locale")
				}
				value = canonical
			}
		case "timezone":
			if value != "" {
				if _, err := time.LoadLocation(value); err != nil || value == "Local" || len(value) > 128 {
					return nil, errors.New("invalid timezone")
				}
			}
		default:
			return nil, errors.New("unsupported environment setting")
		}
		if value == "" {
			delete(values, key)
			continue
		}
		values[key] = value
	}
	return values, nil
}

func Locale(value string) (canonical, posix string, ok bool) {
	for _, tag := range locales {
		if strings.EqualFold(value, tag) {
			return tag, strings.ReplaceAll(tag, "-", "_") + ".UTF-8", true
		}
	}
	return "", "", false
}
