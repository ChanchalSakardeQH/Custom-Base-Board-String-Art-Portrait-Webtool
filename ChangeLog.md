<p align="center"><a href="https://woodyouloveit.com"><img src="docs/logo.png" alt="woodyouloveit" width="300"></a></p>

# ChangeLog

All notable changes to the **Custom Base Board String Art Portrait Webtool** are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

Copyright © 2026 Chanchal Sakarde · [woodyouloveit.com](https://woodyouloveit.com) · [wooduloveit.com](https://wooduloveit.com) · [GPL-3.0 License](https://github.com/ChanchalSakardeQH/Custom-Base-Board-String-Art-Portrait-Webtool#GPL-3.0-1-ov-file)

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
