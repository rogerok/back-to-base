---
description: "Generate Anki-ready flashcards for a topic or chapter"
allowed-tools: Read, Write, Glob, Grep
---

Generate Anki flashcards for: $ARGUMENTS

## Instructions

1. Find the relevant chapter or notes in `src/` for this topic
2. If no notes exist, tell the user (in Russian) and suggest creating a chapter first
3. Extract the key concepts that should be memorized
4. Create a separate `anki-cards.txt` file next to the chapter or note
5. Use tab-separated Anki import format:

```text
#separator:tab
#notetype:Basic
#deck:<Topic Name>
#tags column:3
Question text	Answer text	tag1::tag2
```

6. Aim for 8-15 cards per chapter
7. Card types to include:
   - Definition cards (what is X?)
   - Comparison cards (X vs Y?)
   - Code output cards (what does this code return?)
   - Concept application cards (when would you use X?)
   - Common pitfall cards (what's wrong with this code?)
8. Do not write an `Anki Cards` section into the chapter file
9. Report the count of cards created and the output file path (in Russian)
