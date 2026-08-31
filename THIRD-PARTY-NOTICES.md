# Third-party notices

## Chart palettes

The alternative chart palettes are drawn from R colour-palette packages. They
were **found** through [paletteer](https://github.com/EmilHvitfeldt/paletteer),
which is a catalogue of such packages — but no values were taken from paletteer
itself, because paletteer is **GPL-3** and copying its data would carry that
licence into this MIT-licensed project. Every value comes from the original
source package, each independently MIT licensed.

Only `Okabe–Ito` reproduces a source palette exactly. The others keep their
source's hue family and are re-stepped into ordinal ramps, because the source
palettes fail the accessibility checks when used as chart series colours — see
`src/charts/palettes.ts` for the reasoning and the figures.

### colorblindr — MIT

Claus O. Wilke. <https://github.com/clauswilke/colorblindr>

The `Okabe–Ito` palette reproduces `palette_OkabeIto`, itself from Okabe, M. and
Ito, K. (2008), *Color Universal Design*.

### wesanderson — MIT

Karthik Ram. <https://github.com/karthik/wesanderson>

`Zissou` takes its hue family from `Zissou1`; `Fantastic Fox` from
`FantasticFox1`.

### nord — MIT

Jake Kaupp. <https://github.com/jkaupp/nord>

`Aurora` takes its hue family from `aurora`; `Victory` from `victory_bonds`.

---

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
