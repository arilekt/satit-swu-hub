# Data architecture for the static site

## Decision

Use repository JSON/Markdown for shared content and LocalStorage for learner state and temporary parent edits. JSON export/import provides an explicit bridge between browsers or from the parent editor to Git.

GitHub Pages is a [static hosting service](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). It does not run our Python code or offer a database/write endpoint for this site. Saving a browser form cannot overwrite repository files.

| Data | Location | When other devices see it |
| --- | --- | --- |
| Subjects, lesson map, exam dates | data/config.json | After commit, push and Pages deployment |
| Lessons and exams | Markdown files in data | After deployment |
| Shared activities | data/activities.json | After deployment |
| Parent's activity edits | LocalStorage, separate activities key | Export JSON, update shared file and deploy; or import on another browser |
| Progress, attempts, personal dates | LocalStorage, original v1 key | Export backup, transfer file and explicitly restore |
| Original PDF/images, AI drafts/reports | local/ on owner's computer (ignored) | Never published by the app |
| API key | Local terminal environment | Never in browser or Git |
| Version/build | Stamped HTML + data/build.json | After deployment |

## Why this works for the current use

One child, one primary iPad, 53 content and exam steps and small quiz histories fit a simple local store. There is no login or background server to maintain. Existing progress keys stay unchanged during the redesign.

[LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) persists across normal browser sessions for an origin. It is not device sync and can be cleared. Use JSON backups. The parent page is a workflow boundary, not an authentication boundary.

IndexedDB or SQLite in the browser would still store data on that browser. It would not by itself enable cross-device sync or write back to GitHub. Larger local data could justify IndexedDB later; the current workload does not require it.

If automatic parent/iPad sync becomes required, add an external backend with authentication and access rules. Keep private progress in that backend rather than committing it to the public repository. No backend provider or account is configured in this release.

## Publishing parent changes

1. Add/edit/delete activities in #parent. Validation rejects impossible dates, duplicate IDs and incomplete/reversed times.
2. Export activities.json and put it at data/activities.json in the local checkout.
3. Preview, stamp the build, commit/push and wait for deployment.
4. On browsers with a local activity override, export it first if needed, then choose the button to return to web activities.

For date changes use Export config.json, then replace data/config.json. All other existing configuration is retained. Python local authoring remains the route for PDF/image analysis and lesson generation.

Progress restore replaces the current browser's state after validation and confirmation. Export the current state before restoring. It does not merge histories automatically.

## Build identity

The footer records the version and timestamp stamped into the loaded HTML. A no-store manifest check only announces a newer build; it never relabels an old loaded page as the latest release. CSS/JS query versions change with the build ID.
