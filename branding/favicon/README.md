# Favicon — "Velocity Luxe"

Gold finish-flag signet on a dusk-stadium emerald field. The checkered flag is
the one symbol universal to **every** racing/sport in the product (horses, dogs,
and the rest), so it works as a single brand mark for the browser tab. Design
rationale in [`PHILOSOPHY.md`](./PHILOSOPHY.md); regenerate with `python3 render.py`.

## Files
- `favicon.ico` — multi-res (16/32/48), the classic tab icon
- `favicon-16/32/48/64/96/128/180/192/256/512.png`
- `icon-master-1024.png` — source master

## Wiring it into a tab

Drop the files into the app's `public/` folder (e.g. `web-lobby/public/`,
`tvbox-online/public/`) and add to `index.html`:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
```
