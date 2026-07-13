---
title: "The Markdown Kitchen Sink: Every Surface, Tested"
date: "2026-07-12"
tags: ["meta", "testing", "design"]
published: false
description: |
  A fixture post that exercises the entire markdown surface this site can render — every heading level, both
  list families, tables, footnotes, task lists, GFM alerts, images, and the inline-HTML long tail — so the
  theme has nowhere to hide.
---

This opening paragraph exists to receive the drop cap and to hold one of
everything inline: a
[link to another post](/posts/how-to-store-your-dotfiles-on-github), an
[external link](https://astro.build) that should open in a new tab, some **bold
text**, some _italic text_, some **_bold italic_**, some ~~strikethrough~~, and
an inline code span like `astro.config.mjs`. It also tests "smart quotes," an em
dash -- like this one -- and an ellipsis... rendered by SmartyPants.

Here is a second paragraph so spacing between plain paragraphs is visible. It
contains a bare autolink, https://zmc.dev, and a footnote reference[^1] whose
rendering lands at the very bottom of the page. And here is a very long unbroken
identifier to stress inline-code wrapping:
`ThisIsAnAbsurdlyLongGeneratedTypeNameFromSomeCodeGeneratorThatNobodyAskedForButEveryoneHasSeen_v2_final_FINAL`.

## Second-Level Heading with `inline code`

Body copy under an H2. The heading above should carry the brass rule and a piece
of inline code that sits comfortably in the serif line.

### Third-Level Heading

Body copy under an H3.

#### Fourth-Level Heading

Body copy under an H4.

##### Fifth-Level Heading

Body copy under an H5.

###### Sixth-Level Heading

Body copy under an H6 — if H5 and H6 look identical, that is the current theme's
actual behavior, not an accident of this document.

### A Third-Level Heading Long Enough to Wrap Onto a Second Line and Then Keep Going a While

Body copy under a wrapping H3 — the heading above should break cleanly and any
trailing ornament should land somewhere sensible.

#### A Fourth-Level Heading That Also Runs Long Enough to Wrap and Test the Same Behavior One Level Down

Body copy under a wrapping H4.

##### A Fifth-Level Heading Sized to End Just Shy of the Right Margin So Nothing Fits After It

Body copy under an H5 built to crowd the margin — whatever follows the text has
to choose between squeezing in and dropping down.

## Lists of Every Kind

An unordered list:

- First item with plain text
- Second item with **bold**, _italic_, and `code`
- Third item with a [link](https://example.com)

An ordered list — note whether its markers get the brass treatment and whether
its indentation matches the unordered list:

1. Step one
2. Step two
3. Step ten through thirteen exist to test double-digit marker alignment
4. Step four
5. Step five
6. Step six
7. Step seven
8. Step eight
9. Step nine
10. Step ten
11. Step eleven

A deeply nested mixed list:

- Outer unordered item
  - Nested unordered item
    - Third-level unordered item
  - Back to second level
- Outer item containing an ordered list:
  1. Nested ordered one
  2. Nested ordered two
     - Unordered inside ordered
- An item with a paragraph long enough to wrap onto multiple lines, so the
  hanging indent of wrapped list text can be judged against the marker position
  above it.

A GFM task list:

- [x] Style the checked state
- [ ] Style the unchecked state
- [ ] Decide whether the default checkbox control is acceptable in this design
      language

## Tables

A table with all three column alignments:

| Body    |   Kind | Orbital Period | Notes                               |
| :------ | -----: | :------------: | ----------------------------------- |
| Mercury | Planet |    88 days     | Smallest                            |
| Venus   | Planet |    225 days    | Retrograde rotation                 |
| Earth   | Planet |    365 days    | You are here                        |
| Halley  |  Comet |    75 years    | Returns 2061                        |
| Ceres   |  Dwarf |   4.6 years    | Largest object in the asteroid belt |

A deliberately wide table to test horizontal overflow behavior inside the
measure:

| Identifier                             | Environment | Region    | Instance Type | Availability Zone | Status   | Uptime  | Last Deploy Commit                         |
| -------------------------------------- | ----------- | --------- | ------------- | ----------------- | -------- | ------- | ------------------------------------------ |
| `prod-api-gateway-primary-useast1-001` | production  | us-east-1 | c6i.4xlarge   | us-east-1a        | healthy  | 42 days | `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0` |
| `prod-api-gateway-replica-uswest2-002` | production  | us-west-2 | c6i.4xlarge   | us-west-2b        | healthy  | 42 days | `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0` |
| `stage-worker-batch-euwest1-011`       | staging     | eu-west-1 | m6i.2xlarge   | eu-west-1c        | degraded | 3 days  | `f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0` |

## Blockquotes

A plain quote:

> The heavens themselves, the planets and this centre, observe degree, priority
> and place.

A multi-paragraph quote with nested elements:

> First paragraph of the quotation, which continues long enough to wrap.
>
> Second paragraph, containing `inline code` and **bold text** to check how the
> italic quote style composes with them.
>
>> A nested quotation inside the first, to see whether the second border rail
>> reads as intentional.
>
> - A list inside a blockquote
> - Because documentation quotes do this constantly

### GFM Alerts

All five alert types, which must read as marginalia rather than quotation —
upright type, not italic, each announced in its own voice:

> [!NOTE]
> Highlights information that users should take into account, even when
> skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.

And one alert with a body busy enough to catch composition bugs:

> [!NOTE]
> A multi-paragraph alert containing `inline code`, **bold text**, and an
> [external link](https://example.com) that should still wear its departure
> glyph.
>
> - A list inside an alert
> - Because release notes do this constantly

## Code

Inline `code` was covered above. A fenced block with a language:

```typescript
interface Orbit {
  radius: number;
  period: number; // sidereal, in days
  eccentricity?: number;
}

export const kepler = (semiMajorAxisAU: number): number =>
  Math.sqrt(Math.pow(semiMajorAxisAU, 3)) * 365.25;
```

A block with no language hint at all:

```
plain preformatted text
    with meaningful indentation
and no syntax highlighting whatsoever
```

A diff:

```diff
- const period = radius * 365;
+ const period = kepler(semiMajorAxis);
  return { radius, period };
```

A block with pathologically long lines, to test the overflow fade and the expand
affordance:

```bash
curl -X POST "https://api.example.com/v1/observations?telescope=meridian&catalog=messier&object=M31&exposure=1200&filter=h-alpha&binning=2x2&format=fits" -H "Authorization: Bearer 9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e" -H "Content-Type: application/json"
```

## Diagrams

A mermaid fence with a frontmatter title, which should become the plate's
caption rather than text baked into the drawing:

```mermaid
---
title: Signal path through the array
---
graph TB
    Sky([Incoming light])

    subgraph Observatory
        subgraph Dome["Dome — public"]
            Scope["Telescope<br/>tracks + collects"]
        end

        subgraph Vault["Vault — private"]
            Plate1["Photographic plate<br/>archive copy"]
            Plate2["Photographic plate<br/>working copy"]
        end
    end

    Sky --> Scope
    Scope --> Plate1
    Scope --> Plate2
```

An untitled diagram, which gets a figure number and nothing more:

```mermaid
graph LR
    Observe --> Reduce --> Publish
```

And a deliberately wide one, to prove the plate stops shrinking at the
legibility floor and scrolls like a wide table instead:

```mermaid
---
title: The pipeline, end to end
---
graph LR
    Capture["Capture<br/>raw frames"] --> Calibrate["Calibrate<br/>darks + flats"] --> Register["Register<br/>plate solving"] --> Stack["Stack<br/>sigma clip"] --> Stretch["Stretch<br/>asinh"] --> Annotate["Annotate<br/>catalog overlay"] --> Publish["Publish<br/>archive + RSS"]
```

### The Rest of the Zoo

A sequence diagram, with an activation, a loop, and a note — the note takes the
marginalia's brass wash rather than mermaid's post-it yellow:

```mermaid
---
title: A night's negotiation
---
sequenceDiagram
    participant O as Observer
    participant T as Telescope
    O->>T: aim at M31
    activate T
    T-->>O: field acquired
    deactivate T
    Note over O,T: long exposure begins
    loop every 30s
        T->>T: autoguide correction
    end
```

A state diagram with a composite state:

```mermaid
---
title: The mount's evening
---
stateDiagram-v2
    [*] --> Idle
    Idle --> Tracking : target acquired
    Tracking --> Exposing : shutter open
    Exposing --> Idle : plate stored
    state Tracking {
        [*] --> Coarse
        Coarse --> Fine
    }
```

A class diagram:

```mermaid
---
title: The catalog's spine
---
classDiagram
    class Orbit {
        +float radius
        +float period
        +eccentricity() float
    }
    class Body {
        +string name
    }
    Body --|> Orbit : follows
```

An entity-relationship diagram:

```mermaid
---
title: What the archive remembers
---
erDiagram
    OBSERVER ||--o{ SESSION : logs
    SESSION ||--|{ EXPOSURE : contains
    EXPOSURE }o--|| PLATE : "stored on"
```

A pie chart, slicing through the site's five hues in the alerts' escalation
order:

```mermaid
---
title: Plate archive by filter
---
pie
    "H-alpha" : 42
    "OIII" : 28
    "SII" : 17
    "Broadband" : 13
```

And a gantt chart, where a task's state lives in its border — celest for active,
cinnabar for critical, a hairline for done:

```mermaid
---
title: Observation night
---
gantt
    dateFormat HH:mm
    axisFormat %H:%M
    section Setup
        Collimation :done, a1, 19:00, 40m
        Cooling     :active, after a1, 30m
    section Imaging
        M31 run     :crit, 20:10, 3h
        Flats       :23:10, 30m
```

## Media and Rules

An image with alt text, followed by the em-dash caption convention some posts
may adopt:

![Concentric orbits with a small epicycle, drawn as a brass line diagram](/kitchen-sink/epicycles.svg)

A thematic break follows this paragraph.

---

And a paragraph after the rule, so its spacing can be judged from both sides.

## The Inline-HTML Long Tail

Markdown permits raw HTML, and technical writing leans on it. Keyboard input:
press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open the palette.
Highlighted text uses <mark>the mark element</mark>. Chemistry needs subscripts
like H<sub>2</sub>O and math needs superscripts like E = mc<sup>2</sup>.
Abbreviations like <abbr title="Cascading Style Sheets">CSS</abbr> carry
title-text underlines in most browsers.

A disclosure widget:

<details>
<summary>Click to expand the collapsed section</summary>

Content inside a `details` element, including a paragraph and a list:

- It should read as part of the document once open
- The summary marker should not look like a foreign control

</details>

A definition list:

<dl>
  <dt>Deferent</dt>
  <dd>The large circle on which an epicycle's center travels.</dd>
  <dt>Epicycle</dt>
  <dd>The smaller circle a body actually rides; added whenever a model refuses to match observation.</dd>
</dl>

## Footnotes

This section exists so the footnotes rendered below it have a heading to sit
under[^2].

[^1]: The first footnote, referenced from the opening section. It should link
    back to its reference.

[^2]: A second footnote with `inline code` and a [link](https://example.com),
    long enough to wrap so its hanging indent is visible.
