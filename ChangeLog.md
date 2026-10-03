<p align="center"><a href="https://woodyouloveit.com"><img src="docs/logo.png" alt="woodyouloveit" width="300"></a></p>

# ChangeLog

All notable changes to the **Custom Base Board String Art Portrait Webtool** are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

Copyright © 2026 Chanchal Sakarde · [woodyouloveit.com](https://woodyouloveit.com) · [wooduloveit.com](https://wooduloveit.com) · [GPL-3.0 License](https://github.com/ChanchalSakardeQH/Custom-Base-Board-String-Art-Portrait-Webtool#GPL-3.0-1-ov-file)

## [4.4.0] - 2026-10-03

### Added
- **Units for the whole page:** mm (default), cm or inch in the top bar. Every length, speed and position on every tab converts live: board size, plotter area, inset, plotter settings, warnings and statistics, jog steps and speed, machine positions and job sizes. The choice is remembered; G-code still runs in mm.
- **XY plotter workable area** on Template → Size. The board size is a slider that can't exceed the area for the chosen shape; a board that no longer fits after a shape or area change is reduced automatically, with a note.
- **Machine tab: ← Previous / Next →** between Job 1 (nails) and Job 2 (winding) once connected; Next pulses after Job 1 finishes.
- **Branding on every canvas:** a brand strip under the string art board (matching the exported PNG footer) and the logo in the Plotter and Machine previews.
- **User guide** (`docs/GUIDE.md`) with fresh desktop and mobile screenshots of every step in `docs/screenshots/`.

### Changed
- The top-right **Choose image** button is gone; the units switch takes its place. Change the photo with **Choose photo…** in the Photo section.
- When the art is finished, **Generate becomes "Next: Template →"**. Pause still offers **Continue**.
- The **number of lines** is locked once a run starts (Reset to change it).
- **Download** buttons use a light "paper" style; every **Next** button is marigold.

### Fixed
- **Continue after Pause drew the full number of lines again** (pausing at 157 of 1,200 and continuing ended at 1,357). It now finishes the run exactly.

## [4.3.0] - 2026-10-03

### Added
- **Machine tab: drive a GRBL plotter from the browser over USB** (Web Serial, Chrome or Edge on a computer, https or localhost).
  - **Connection:** pick the COM port and baud rate (115200 default); boards that don't reset on connect get a soft reset to wake them.
  - **Status:** live state (Idle, Run, Hold, Jog, Alarm, Check…), work and machine X/Y/Z, feed rate and feed override; GRBL 1.1 and 0.9 status formats.
  - **Jogging:** X/Y pad with diagonals, Z up/down, 0.1/1/10/50 mm steps, jog speed, jog cancel, optional keyboard jogging (arrows, PgUp/PgDn, Esc).
  - **Work zero:** Zero X, Y, Z or all (`G10 L20 P1`), Go to X0 Y0, Home (`$H`), Unlock (`$X`), soft reset, feed override −10% / 100% / +10%.
  - **Jobs:** run Job 1 (nails) or Job 2 (winding) straight from the Plotter tab, or open any `.gcode` file. Streams with GRBL's character-counting protocol (128-byte buffer). Start asks for a safety check first. Pause (feed hold), Resume (cycle start), and Stop that holds first and then resets, so the machine keeps its position instead of raising "reset while moving". M0 pauses show their message ("Tie the thread to nail 1…") with a Resume button. Stops on the first error with the line and a plain-English explanation. Dry run in check mode (`$C`). Progress, elapsed time and time left.
  - **Preview:** the job in machine coordinates with the live head position and the finished part highlighted.
  - **Console:** send any command with history (↑/↓), plain-English explanations for GRBL errors and alarms, optional status reports, quick buttons for `$$`, `$#`, `$G`, `$I`, `?`.
  - **Simulator:** a built-in GRBL 1.1 simulator to rehearse everything without hardware.
- **One flow from String art to Machine:** generated art automatically sets the board on Template and Plotter (shape, layout, nails, pattern number). "Next" buttons lead from step to step, and the tabs are a numbered stepper: 1 String art → 2 Template → 3 Plotter → 4 Machine.

## [4.2.0] - 2026-10-02

### Added
- **Plotter tab: G-code for GRBL XY plotters**, using the same real-millimetre board as Board template.
  - **Job 1, nail positions:** marks every nail with a servo pen (custom pen up/down commands), a Z-axis pen or drill (a negative Z with "Dot" drills pilot holes), or a laser (`$32=1`). Marks can be a dot, cross or circle. Pin numbers can be written in a single-stroke font, every nail, every 5th or every 10th. Grid and random nails are visited in nearest-neighbour order.
  - **Job 2, thread winding:** the thread guide visits nails in the generated sequence. For each nail it travels to the side facing the previous nail, then wraps with G2/G3 arcs round to the side facing the next nail (always at least half a turn, optional extra full turn, clockwise or counter-clockwise). Travel moves that would clip another nail are routed round it. Optional Z lift between nails (automatic for grid and random layouts), and M0 pauses to tie on, check tension every N lines, and tie off.
  - Machine settings: work zero at the board's bottom-left, top-left or centre, Y up or down, X/Y offsets, speeds. Settings are remembered in the browser.
  - Toolpath preview with work-zero axes, a "Play toolpath" trace, run-time estimate, machine travel range and safety warnings (wrap radius against nail and guide sizes, nail spacing, Z heights).
  - G-code is plain ASCII with lines under 80 characters, and carries the woodyouloveit branding and copyright as comments.
- **Random nail layout on Board template**, plus a **random pattern number** on both tabs. Random layouts are now seeded, so the same number always gives the same nails and a printed template matches the art.

### Changed
- Random nail layouts are now repeatable (seeded) instead of changing every time.
- The "Board template" tab is labelled "Template" to fit three tabs.

## [4.1.0] - 2026-10-02

### Fixed
- **Phones: art and photo drawn at a third of the board's size.** On high-density screens the canvas scale was set once at start-up. Android Chrome can wipe a canvas's state while the gallery app is open to pick a photo, which reset that scale and made the preview, the original view, the generated art and the PNG export all fill only the top-left corner. The scale is now applied before every draw, and the screen is repainted (art rebuilt from the thread sequence) whenever the browser restores a canvas or you return to the tab.

### Changed
- **Number of nails** and **Number of lines** are now sliders with a live value, on both the String art and Board template tabs (nails 50–1,000 in steps of 10, lines 100–10,000 in steps of 100). Slider thumbs are larger on touch screens.

## [4.0.0] - 2026-10-02

### Added
- **Board template mode**, a new tab that works without a photo:
  - Actual-size templates in mm, cm or inches, with the board size and nail distance from the edge.
  - Pin numbers on every nail, every 5th or every 10th.
  - **PDF** export as one actual-size sheet or tiled **A4 / A3 / Letter** pages, with trim lines and page labels.
  - **SVG** export sized in millimetres, and **PNG** export at 300 DPI with the DPI embedded so it prints at actual size.
  - A 100 mm scale bar and a "print at 100%" note on every template.
  - Live preview showing where the page splits fall.
  - "Current string art" option that uses the exact nails of the generated art, including grid, random and photo-shaped boards.
  - Warning when nails would be closer than 3 mm.
- **Branding** for woodyouloveit.com / wooduloveit.com:
  - Logo in the page header and footer, a heart favicon, and copyright and licence links in the footer.
  - Logo, websites and copyright on every export: PNG and SVG art (footer strip), template PDF / SVG / PNG (title block and page footers), winding sequence TXT (header and footer), project file JSON (`about` block), and PDF metadata.
- **GPL-3.0 licence:** `LICENSE` file and licence headers in every source file (`SPDX-License-Identifier: GPL-3.0-or-later`).
- `ChangeLog.md`; README with logo, screenshots, export table, copyright and credits.
- Bundled jsPDF 2.5.2 (MIT) in `js/vendor/`, loaded only when a PDF is exported.

### Changed
- The String art download row's "Nail template" now opens the Board template tab with the art's nails, replacing the old screen-sized SVG.
- Header redesigned as a light brand bar with the logo; mode tabs (String art | Board template) added above the settings.

### Fixed
- **Nail numbering on Square, Landscape, Portrait and Match-photo boards** is now one continuous clockwise loop starting at the top-right corner. Before, the numbering jumped from the top-right corner back to the bottom-right corner, so neighbouring nails had unrelated numbers. *Projects and templates made with 3.0.0 or earlier on these shapes use the old numbering.*
- Grid and random nails keep their exact positions for templates instead of screen pixels.
- Selected buttons no longer turn unreadable while the mouse hovers over them.

## [3.0.0] - 2026-10-01

### Added
- Full-page "cutting mat" workbench interface with a sidebar of settings and a stage for the board.
- **Original ⇄ String art flip**: a 3D flip card (or press F) to compare the photo with the art, with a crossfade when reduced motion is set.
- Animated empty state, progress thread with live stats, and export row that slides in when a run finishes.
- Shape picker with icons; segmented controls for layout and nail numbers; one-click download buttons.

### Fixed
- Dragging and zooming land in the right place after the window is resized.

## [2.0.0] - 2026-10-01

### Added
- Board shapes: Hexagon (flat top and pointy top), Oval (horizontal and vertical).
- On-screen nail numbers (every nail, every 5th, every 10th), included in PNG export when shown.

### Fixed
- Printed templates use exact nail positions instead of whole screen pixels, so spacing is even.

## [1.0.0] - 2026-10-01

### Added
- English interface and documentation (translated from the Russian original).
- Runs on GitHub Pages: `index.html` at the root, `.nojekyll`, redirect from the old `StringArtGenerator.html`.
- Numbered nail template (SVG) and winding sequence (TXT) exports.

### Fixed
- Pausing no longer inserts a jump to nail 0 into the sequence, and Continue resumes from the current nail.
- Mouse-wheel zoom no longer moves two steps per scroll in Chrome.
- SVG export uses a valid line-width attribute and MIME type.
