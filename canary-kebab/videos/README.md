# Videos for the Canary Kebab site

Source: 2 vertical (9:16) promo videos supplied from the Canary Kebab Facebook page, each about 20s, 1080×1920 with a music track. A third upload (`VID-20261031-WA0072.mp4`) was a lower-quality WhatsApp copy of video 1 and was not used.

- **Video 1:** neon sign → doner wrap being filled and rolled → customer eating → chef at the doner spit → pizza, burger and chips spread → kebab plate with sauce → logo end card (from about 18.5s)
- **Video 2:** wrap salad → pizza from the oven → pizza slice → chef plating → chicken wrap cut in half → customers eating a wrap and pizza

## reels/ (for `reels.html`): full length, **with audio**
| File | Size | Notes |
|---|---|---|
| reel1.mp4 + reel1-poster.jpg | 720×1280, 20.5s, 6.1 MB | Includes the logo end card |
| reel2.mp4 + reel2-poster.jpg | 720×1280, 20.9s, 4.3 MB | |

## hero/ (home-page background slideshow): **muted**, end card trimmed
| File | Size | Use |
|---|---|---|
| hero1-landscape.mp4 / hero2-landscape.mp4 | 1280×720, 2.9 / 2.3 MB | Desktop. The vertical video is centred over a blurred, darkened copy of itself, so nothing is cropped |
| hero1-portrait.mp4 / hero2-portrait.mp4 | 540×960, 2.3 / 1.7 MB | Mobile, which matches the phone screen shape |
| hero1-poster.jpg / hero2-poster.jpg | 1280×720 | `poster=` image shown while the video loads |

Pick the version per screen size, e.g.:
```html
<video autoplay muted loop playsinline poster="videos/hero/hero1-poster.jpg">
  <source src="videos/hero/hero1-portrait.mp4" media="(max-width: 768px)" type="video/mp4">
  <source src="videos/hero/hero1-landscape.mp4" type="video/mp4">
</video>
```
(`<source media>` is only honoured by some browsers, so set the `src` from JS based on `matchMedia('(max-width:768px)')` as a fallback.)

Still wanted: landscape (16:9) footage, which would fill a desktop hero without the blur, and more reels.
