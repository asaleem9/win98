# Sprites

Shared pixel-art + isometric infrastructure for the games. Author art as text,
compile it to a `<canvas>`, blit it. No image files, no build step.

## Authoring a sprite

A `SpriteDef` is a palette plus frames. Each frame is an array of equal-length
rows; every char indexes the palette. `.` is always transparent and must never
appear in a palette.

```ts
const bat: SpriteDef = {
  palette: { ...OUTLINE, ...FOLIAGE },
  frames: [
    ['.kGk.',
     'kGGGk',
     '.kfk.'],
  ],
};
```

- **Sizes:** 8x8–32x32 for props and units; iso ground tiles are **32x16** (2:1).
- **Frames** must all share the same dimensions. Rows within a frame must be
  equal length. `validateSpriteDef` returns a list of exactly these mistakes —
  an empty list means the def is clean.

## Palette-char conventions

Chars are mnemonic and, across the fragments in `palettes.ts`, collision-free —
spread as many as you need into one palette. Case encodes shade: uppercase is
the lighter tone.

| chars | material | | chars | material |
|-------|----------|-|-------|----------|
| `k` | outline (near-black) | | `B b d` | wood light/mid/dark |
| `w` | white / highlight | | `M m n` | metal light/mid/dark |
| `S s t` | skin light/mid/shadow | | `V v c` | water light/mid/deep |
| `G g f` | foliage light/mid/dark | | `R r q` | faction light/mid/dark |

Author faction units with `R r q`. Give a player their color by spreading a
faction fragment (`{ ...FACTION_BLUE }`) into the palette, or swap at draw time
with `compileSprite(def, { recolor: FACTION_BLUE })`. Same art, any team.

## Drawing

- `compileSprite(def, opts?)` rasterizes all frames onto one horizontal strip
  and caches the result — cheap to call in a loop. `opts`: `flipX`, `recolor`,
  `scale` (integer upscale baked in).
- `drawSprite(ctx, sprite, x, y, opts?)` blits one frame. Default anchor is
  `bottom-center`, so `(x, y)` is the sprite's feet — right for world/iso
  placement. Use `top-left` for HUD.
- `animFrame(timeSec, fps, frameCount)` gives the current looping frame index.
- `<PixelSprite def={...} />` renders one frame as a crisp React `<canvas>`.

Everything is jsdom-safe: `validateSpriteDef` is pure, and compile/draw no-op
without a 2d context (they never touch the DOM until called).

## Isometric

`iso.ts` is pure 2:1 diamond math. `origin` is the screen point of tile
`(0, 0)`'s top vertex. `isoToScreen` / `screenToIso` are exact inverses;
`screenToIso` returns fractional coords (floor for click-picking). Sort draw
order with `isoDepth(tx, ty)`.

## The rule

**Every sheet file ships a test asserting all its defs validate.** See
`common.ts` + `__tests__/common.test.ts` for the canonical pattern: export a
`Record<string, SpriteDef>`, loop it, assert `validateSpriteDef(def)` is empty.
