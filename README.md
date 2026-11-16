# 140.6 Training

Private training app for IRONMAN Jacksonville (May 16, 2027). Static PWA: open the site on your phone and add it to the home screen. It then works offline.

- Check-offs, effort ratings and notes are saved on the phone only (export a backup from the Progress tab).
- `plan.js` generates the 28-week plan. `app.js` is the app. `sw.js` is the offline cache: bump `VERSION` there whenever a file changes.
