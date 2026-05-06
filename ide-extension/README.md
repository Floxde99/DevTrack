## DevTrack IDE Context (VSCode/Cursor extension)

This extension sends minimal IDE context to the local DevTrack daemon/API.

### Privacy defaults

- Sends **repo name** + **git branch**.
- Does **not** send repo path or file path unless enabled in settings.

### Settings

- `devtrackIdeContext.daemonPort` (default `3001`)
- `devtrackIdeContext.includeRepoPath` (default `false`)
- `devtrackIdeContext.includeActiveFilePath` (default `false`)

