---
description: "Create a study chapter on a topic. Runs ONE step at a time — you control the pace."
allowed-tools: Read, Write, Glob, Grep, Bash, WebSearch, WebFetch, Task
---

Create a study chapter for the topic: $ARGUMENTS

## Important: step-by-step mode

Do NOT run all steps automatically. Execute ONLY Step 1 now.
After completing each step, stop and ask the user (in Russian) whether to proceed to the next step.

## Step 1: Research (agent: researcher)

Use the `researcher` agent to gather sources and create a research brief.
Then stop and show the brief to the user. Ask: "Продолжить к написанию главы?"

## Step 2: Write (agent: author)

Use the `author` agent to write the chapter based on the research brief.
The chapter must contain theory only; exercises and Anki cards belong in separate companion files.
Then stop and show the result. Ask: "Добавить отдельный файл с упражнениями?"

## Step 3: Exercises (agent: exercise-author)

Use the `exercise-author` agent to create exercises with tests in a separate `exercises.md` file next to the chapter.
Then stop. Ask: "Сгенерировать отдельный файл Anki-карточек?"

## Step 4: Anki cards

Generate flashcards for the chapter in a separate `anki-cards.txt` file next to the chapter (no separate agent needed).
Then stop. Ask: "Запустить ревью (код + методика)?"

## Step 5: Review (agents: reviewer + methodist)

Use `reviewer` to check code, then `methodist` to check pedagogy.
Report findings and fix issues.

The user can stop at any step, skip steps, or jump to a specific step.
Always respect the user's choice.
