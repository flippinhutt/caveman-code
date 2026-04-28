# vhs plan-act.tape — 40 seconds.
# Shows: /plan → structured plan output → user reviews → /act → execution.

Output plan-act.gif

Set Shell "bash"
Set Width 1200
Set Height 760
Set FontSize 15
Set TypingSpeed 50ms
Set Theme "Tokyo Night"

# Scene 1 — boot in plan mode
Type "cave --plan"
Enter
Sleep 1500ms

# Scene 2 — ask for a plan
Type "refactor packages/agent/src/sandbox to use the policy IR"
Enter
Sleep 6s

# (model emits a structured plan ending in ## Plan)

# Scene 3 — user reviews the plan, then accepts
Type "/act"
Enter
Sleep 2s

# Scene 4 — cave walks each step
Sleep 8s

# Scene 5 — diff preview
Type "/diff"
Enter
Sleep 3s

# Outro
Ctrl+C
Sleep 500ms
Type "# plan, review, then act. https://cave.sh/docs/reference/plan-mode"
Enter
Sleep 1500ms
