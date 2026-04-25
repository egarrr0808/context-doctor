Output assets/demo.gif
Set FontSize 16
Set Width 1320
Set Height 1040
Set Padding 22
Set TypingSpeed 12ms
Set PlaybackSpeed 0.85
Set Theme "Catppuccin Mocha"

Type "stty cols 100 rows 46"
Enter
Type "npm run build"
Enter
Sleep 3s
Ctrl+L
Type "node packages/cli/dist/index.js explain"
Enter
Sleep 6s
Ctrl+L
Type "node packages/cli/dist/index.js analyze examples/sample.prompt"
Enter
Sleep 9s
Ctrl+L
Type "node packages/cli/dist/index.js analyze examples/sample.prompt --fix"
Enter
Sleep 10s
