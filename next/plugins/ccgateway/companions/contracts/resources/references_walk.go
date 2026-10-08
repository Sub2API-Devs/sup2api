package resources

import (
	"fmt"
	"strconv"
)

type SkillReference struct{ Path, ParentID, Selector string }

type referenceScanner struct {
	refs     []Reference
	versions []SkillReference
}

func (s *referenceScanner) add(value any, path, kind string) error {
	id, ok := value.(string)
	if !ok || !segment.MatchString(id) {
		return fmt.Errorf("invalid %s reference at %s", kind, path)
	}
	if len(s.refs) >= 1024 {
		return fmt.Errorf("too many resource references")
	}
	s.refs = append(s.refs, Reference{Path: path, ID: id, Kind: kind})
	return nil
}

func (s *referenceScanner) container(value any, path string) error {
	if value == nil {
		return nil
	}
	if _, ok := value.(string); ok {
		return s.add(value, path, KindContainer)
	}
	container, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("container must be a string, object or null")
	}
	if id := container["id"]; id != nil {
		if err := s.add(id, path+".id", KindContainer); err != nil {
			return err
		}
	}
	skills, _ := container["skills"].([]any)
	for i, value := range skills {
		skill, _ := value.(map[string]any)
		if skill["type"] == "custom" {
			if err := s.add(skill["skill_id"], path+".skills."+strconv.Itoa(i)+".skill_id", KindSkill); err != nil {
				return err
			}
			selector := "latest"
			if value, exists := skill["version"]; exists {
				var ok bool
				selector, ok = value.(string)
				if !ok || !segment.MatchString(selector) {
					return fmt.Errorf("invalid custom skill version")
				}
			}
			id, _ := skill["skill_id"].(string)
			s.versions = append(s.versions, SkillReference{Path: path + ".skills." + strconv.Itoa(i) + ".version", ParentID: id, Selector: selector})
		}
	}
	return nil
}

func (s *referenceScanner) messages(value any) error {
	messages, _ := value.([]any)
	for i, item := range messages {
		message, _ := item.(map[string]any)
		if err := s.blocks(message["content"], "messages."+strconv.Itoa(i)+".content", 0); err != nil {
			return err
		}
	}
	return nil
}

func (s *referenceScanner) blocks(value any, path string, depth int) error {
	items, _ := value.([]any)
	for i, value := range items {
		block, _ := value.(map[string]any)
		if err := s.block(block, path+"."+strconv.Itoa(i), depth); err != nil {
			return err
		}
	}
	return nil
}

func (s *referenceScanner) block(block map[string]any, path string, depth int) error {
	if depth > 32 {
		return fmt.Errorf("resource content nesting exceeds limit")
	}
	switch block["type"] {
	case "image", "document":
		source, _ := block["source"].(map[string]any)
		if source["type"] == "file" {
			return s.add(source["file_id"], path+".source.file_id", KindFile)
		}
		if block["type"] == "document" && source["type"] == "content" {
			return s.blocks(source["content"], path+".source.content", depth+1)
		}
	case "tool_result":
		return s.blocks(block["content"], path+".content", depth+1)
	case "container_upload":
		return s.add(block["file_id"], path+".file_id", KindFile)
	case "code_execution_tool_result", "bash_code_execution_tool_result":
		return s.executionResult(block, path)
	}
	return nil
}

func (s *referenceScanner) executionResult(block map[string]any, path string) error {
	result, _ := block["content"].(map[string]any)
	outputType := "code_execution_output"
	switch result["type"] {
	case "code_execution_result", "encrypted_code_execution_result":
		if block["type"] != "code_execution_tool_result" {
			return fmt.Errorf("execution result type mismatch")
		}
	case "bash_code_execution_result":
		if block["type"] != "bash_code_execution_tool_result" {
			return fmt.Errorf("execution result type mismatch")
		}
		outputType = "bash_code_execution_output"
	default:
		return nil
	}
	files, _ := result["content"].([]any)
	for i, value := range files {
		file, _ := value.(map[string]any)
		if file["type"] != outputType {
			return fmt.Errorf("invalid execution output file type")
		}
		if err := s.add(file["file_id"], path+".content.content."+strconv.Itoa(i)+".file_id", KindFile); err != nil {
			return err
		}
	}
	return nil
}
