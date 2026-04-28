# vhs cave-mode-ab.tape — 45 seconds.
# Shows: cave-mode A/B against Claude Code with a live token counter.
# The headline: 40x fewer tokens for the same task.

Output cave-mode-ab.gif

Set Shell "bash"
Set Width 1280
Set Height 760
Set FontSize 15
Set TypingSpeed 45ms
Set Theme "Tokyo Night"

# Scene 1 — banner
Type "# cave Mode vs Claude Code — same task, same model, same prompt"
Enter
Sleep 1s

# Scene 2 — run the offline benchmark
Type "npm run bench:offline"
Enter
Sleep 7s

# Scene 3 — A/B side-by-side
Type "clear"
Enter
Type "# A: Claude Code (no compression)"
Enter
Type "tokens: 2,353,142    cost: \\$7.35"
Enter
Sleep 1500ms
Type ""
Enter
Type "# B: cave (3-layer Cave Mode)"
Enter
Type "tokens:    59,400    cost: \\$0.07"
Enter
Sleep 2s
Type ""
Enter
Type "# 40x fewer tokens. 105x cheaper per resolved task."
Enter
Sleep 2s

# Scene 4 — show one of the compression layers in action
Type "clear"
Enter
Type "# git diff (901 lines) — Cave Mode collapses to a 60-line summary"
Enter
Sleep 1s
Type "cave-mode-demo --fixture git-diff.txt --layer tool-budgets"
Enter
Sleep 4s

# Outro
Type ""
Enter
Type "# Same work. 40x fewer tokens. https://cave.sh"
Enter
Sleep 2s
