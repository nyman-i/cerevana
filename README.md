# Syllogimous v3+

Personal fork of [soamsy/Syllogimous-v3](https://github.com/soamsy/Syllogimous-v3), a relational reasoning trainer built to support new theories and experiments on relational reasoning training.

[Try the original](https://soamsy.github.io/Syllogimous-v3/)

## What's different in v3+

- **History export/import** — back up your score, question history and progress-graph data to a JSON file and load it on another device. Import either *merges* with the device's existing history (timestamp-deduplicated, nothing lost) or *overwrites* it. Found under Settings → Import / Export.
- **Reset App fixed** — no longer hangs on a blocked IndexedDB delete, and asks twice before wiping.
- Assorted UI polish: full-width layout, transparent game area, repositioned timer control, consistent buttons.

## Running locally

No build step, no dependencies — it's a static site. Serve the folder over localhost (the History API and IndexedDB behave better than on `file://`):

```bash
python3 -m http.server 8080
```

then open http://localhost:8080. For an app-like window:

```bash
chromium --app=http://localhost:8080
```

# Contribution

[4skinSkywalker](https://github.com/4skinSkywalker/)
[ikokusovereignty](https://github.com/ikokusovereignty/)
[soamsy](https://github.com/soamsy/)
[giladkingsley](https://github.com/giladkingsley/)


# Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)

## You are free to:
### Share — copy and redistribute the material in any medium or format
### Adapt — remix, transform, and build upon the material

The licensor cannot revoke these freedoms as long as you follow the license terms.

## Under the following terms:
### Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
### NonCommercial — You may not use the material for commercial purposes.

No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
