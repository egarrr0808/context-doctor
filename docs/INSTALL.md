# Install

## CLI

```bash
npm install -g context-doctor
context-doctor doctor
```

Local repo install:

```bash
./scripts/install.sh --local --completion bash
```

Windows PowerShell:

```powershell
.\scripts\install.ps1 -Local -Completion powershell
```

One-shot use:

```bash
npx context-doctor analyze prompt.md
pnpm dlx context-doctor analyze prompt.md
yarn dlx context-doctor analyze prompt.md
bunx context-doctor analyze prompt.md
```

Shell completion:

```bash
context-doctor completion bash >> ~/.bashrc
context-doctor completion zsh >> ~/.zshrc
context-doctor completion fish > ~/.config/fish/completions/context-doctor.fish
context-doctor completion powershell >> $PROFILE
```

## VS Code

Install from Marketplace after publish:

```bash
code --install-extension context-doctor.context-doctor-vscode
```

Install local VSIX:

```bash
./scripts/install.sh --local --vscode
```

## Package Managers

Homebrew formula template:

```bash
brew tap context-doctor/tap
brew install context-doctor
```

Scoop manifest template:

```powershell
scoop bucket add context-doctor https://github.com/context-doctor/scoop-context-doctor
scoop install context-doctor
```

Winget publish target:

```powershell
winget install context-doctor.context-doctor
```

## CI

```bash
npm ci
npm run typecheck
npm test
npm run build
```
