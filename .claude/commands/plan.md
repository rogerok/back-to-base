---
description: "Create a structured study roadmap for a topic"
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Task
---

Create a study plan for: $ARGUMENTS

## Instructions

All communication in Russian.

1. Use the `researcher` agent to survey the topic and available sources
2. Check existing vault notes to understand current knowledge level
3. Produce a structured roadmap:

```markdown
# Study Plan: [topic]

## Prerequisites
- what you should know before starting (with [[wiki-links]] to existing vault notes)

## Roadmap

### Phase 1: Foundations
1. Subtopic — brief description, estimated time, source
2. ...

### Phase 2: Core Concepts
1. ...

### Phase 3: Practice & Deepening
1. ...

## Recommended Sources
- categorized list with difficulty levels

## Milestones
- checkpoints to verify understanding (e.g., "after Phase 1 you should be able to...")
```

4. Save the plan as a note in the appropriate `src/` folder
5. Report the plan summary to the user
