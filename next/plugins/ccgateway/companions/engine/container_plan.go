package engine

import (
	"fmt"
	"strings"
)

// Shape validation is separate from core resource ownership. The original
// container value (including null/absent distinctions) remains in RequestPlan.
type providerContainerPlan struct {
	ID     string
	Skills []Object
}

func parseProviderContainer(value any) (*providerContainerPlan, error) {
	plan := &providerContainerPlan{}
	if value == nil {
		return nil, nil
	}
	if id, ok := value.(string); ok {
		if !providerResourceID(id) {
			return nil, fmt.Errorf("invalid provider container ID")
		}
		plan.ID = id
		return plan, nil
	}
	obj, ok := value.(Object)
	if !ok {
		return nil, fmt.Errorf("container must be a string, object or null")
	}
	if err := keys(obj, "id", "skills"); err != nil {
		return nil, err
	}
	if id, exists := obj["id"]; exists && id != nil {
		value, ok := id.(string)
		if !ok || !providerResourceID(value) {
			return nil, fmt.Errorf("invalid container.id")
		}
		plan.ID = value
	}
	if value := obj["skills"]; value != nil {
		skills, ok := value.([]any)
		if !ok {
			return nil, fmt.Errorf("container.skills must be an array or null")
		}
		for _, value := range skills {
			skill, ok := value.(Object)
			if !ok {
				return nil, fmt.Errorf("invalid container skill")
			}
			if err := keys(skill, "type", "skill_id", "version"); err != nil {
				return nil, err
			}
			if str(skill, "type") != "anthropic" && str(skill, "type") != "custom" {
				return nil, fmt.Errorf("invalid container skill type")
			}
			if !providerResourceID(str(skill, "skill_id")) {
				return nil, fmt.Errorf("invalid container skill ID")
			}
			if version, exists := skill["version"]; exists {
				v, ok := version.(string)
				if !ok || !providerResourceID(v) {
					return nil, fmt.Errorf("invalid skill version")
				}
			}
			plan.Skills = append(plan.Skills, skill)
		}
	}
	return plan, nil
}
func providerResourceID(value string) bool {
	return value != "" && len(value) <= 256 && !strings.ContainsAny(value, "\x00\r\n")
}
