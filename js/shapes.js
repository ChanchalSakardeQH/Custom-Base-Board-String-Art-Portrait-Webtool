/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/shapes.js - Hexagon and oval boards, nail-number overlay.
 *
 * Copyright (C) 2026 Chanchal Sakarde
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 * https://github.com/ChanchalSakardeQH/Custom-Base-Board-String-Art-Portrait-Webtool#GPL-3.0-1-ov-file
 */

// Extra board shapes (hexagons, ovals) and nail-number display.
// The nail line of a board sits PADDING inside the canvas; the drawn board edge is PADDING / 2 outside the nails,
// the same convention the original circle uses.

const OUTLINE_FORMS = [HEXAGON_FORM, HEXAGON_POINTY_FORM, OVAL_H_FORM, OVAL_V_FORM]

StringArtGenerator.prototype.IsOutlineForm = function(form = this.formType) {
    return OUTLINE_FORMS.indexOf(form) != -1
}

// Size of the nail line for the outline shapes, fitted to the canvas
StringArtGenerator.prototype.GetShapeGeometry = function(form = this.formType) {
    let w = this.width - 2 * PADDING
    let h = this.height - 2 * PADDING

    if (form == OVAL_H_FORM) {
        let rx = w / 2
        return { type: 'ellipse', rx: rx, ry: Math.min(h / 2, rx / Math.SQRT2) }
    }

    if (form == OVAL_V_FORM) {
        let ry = h / 2
        return { type: 'ellipse', rx: Math.min(w / 2, ry / Math.SQRT2), ry: ry }
    }

    // Flat top: a vertex points right (nail 1 sits on it), flat edges top and bottom
    if (form == HEXAGON_FORM)
        return { type: 'polygon', sides: 6, R: Math.min(w / 2, h / Math.sqrt(3)), start: 0 }

    // Pointy top: vertices at top and bottom, flat edges left and right
    if (form == HEXAGON_POINTY_FORM)
        return { type: 'polygon', sides: 6, R: Math.min(h / 2, w / Math.sqrt(3)), start: -Math.PI / 6 }

    return null
}

// Outline as a list of points, grown outward by `expand` pixels
StringArtGenerator.prototype.GetShapeOutline = function(expand = 0, form = this.formType) {
    let g = this.GetShapeGeometry(form)
    let points = []

    if (g == null)
        return points

    if (g.type == 'ellipse') {
        let steps = 180
        for (let i = 0; i < steps; i++) {
            let t = i / steps * 2 * Math.PI
            points.push({ x: this.x0 + (g.rx + expand) * Math.cos(t), y: this.y0 + (g.ry + expand) * Math.sin(t) })
        }
    }
    else {
        // Moving each side out by `expand` moves the vertices out by expand / cos(half the exterior angle)
        let R = g.R + expand / Math.cos(Math.PI / g.sides)
        for (let i = 0; i < g.sides; i++) {
            let t = g.start + i * 2 * Math.PI / g.sides
            points.push({ x: this.x0 + R * Math.cos(t), y: this.y0 + R * Math.sin(t) })
        }
    }

    return points
}

StringArtGenerator.prototype.IsInsidePolygon = function(x, y, poly) {
    let inside = false

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        let a = poly[i], b = poly[j]
        if ((a.y > y) != (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x)
            inside = !inside
    }

    return inside
}

StringArtGenerator.prototype.GetPolygonArea = function(poly) {
    let area = 0

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
        area += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y)

    return Math.abs(area) / 2
}

// Nails along the edge, evenly spaced, numbered clockwise starting from the right-hand side
StringArtGenerator.prototype.InitOutlineBorderNails = function(nailsCount) {
    let g = this.GetShapeGeometry()
    let nails = []

    if (g.type == 'polygon') {
        // Share nails out per side and start every side on its corner, so each corner gets a nail
        let verts = this.GetShapeOutline(0)
        let base = Math.floor(nailsCount / g.sides)
        let extra = nailsCount % g.sides

        for (let s = 0; s < g.sides; s++) {
            let count = base + (s < extra ? 1 : 0)
            let a = verts[s]
            let b = verts[(s + 1) % g.sides]

            for (let j = 0; j < count; j++) {
                let t = j / count
                nails.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
            }
        }
    }
    else {
        // Ellipse: equal spacing along the curve (equal angles would bunch nails at the narrow ends)
        let steps = 4000
        let pts = []
        let lengths = [0]

        for (let i = 0; i <= steps; i++) {
            let t = i / steps * 2 * Math.PI
            pts.push({ x: this.x0 + g.rx * Math.cos(t), y: this.y0 + g.ry * Math.sin(t) })

            if (i > 0)
                lengths.push(lengths[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
        }

        let total = lengths[steps]
        let k = 0

        for (let i = 0; i < nailsCount; i++) {
            let target = total * i / nailsCount

            while (k < steps && lengths[k + 1] < target)
                k++

            let span = lengths[k + 1] - lengths[k]
            let t = span > 0 ? (target - lengths[k]) / span : 0
            nails.push({ x: pts[k].x + (pts[k + 1].x - pts[k].x) * t, y: pts[k].y + (pts[k + 1].y - pts[k].y) * t })
        }
    }

    // Exact position kept for the printable template; the generator works on whole pixels
    return nails.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), fx: p.x, fy: p.y }))
}

// Board shape as an SVG element (used by the SVG export and the nail template)
StringArtGenerator.prototype.GetOutlineSVG = function(fill, stroke = 'none', strokeWidth = 0) {
    let r = (v) => Math.round(v * 100) / 100
    let paint = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"`

    if (this.formType == CIRCLE_FORM)
        return `<circle cx="${r(this.x0)}" cy="${r(this.y0)}" r="${r(this.radius + PADDING / 2)}" ${paint} />`

    if (this.IsOutlineForm()) {
        let g = this.GetShapeGeometry()

        if (g.type == 'ellipse')
            return `<ellipse cx="${r(this.x0)}" cy="${r(this.y0)}" rx="${r(g.rx + PADDING / 2)}" ry="${r(g.ry + PADDING / 2)}" ${paint} />`

        let points = this.GetShapeOutline(PADDING / 2).map(p => `${r(p.x)},${r(p.y)}`).join(' ')
        return `<polygon points="${points}" ${paint} />`
    }

    let x = this.imgBbox.xmin, y = this.imgBbox.ymin
    let w = this.imgBbox.xmax - x, h = this.imgBbox.ymax - y
    return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" ${paint} />`
}

StringArtGenerator.prototype.GetBoardCenter = function() {
    if (this.formType == CIRCLE_FORM || this.IsOutlineForm())
        return { x: this.x0, y: this.y0 }

    return {
        x: (this.imgBbox.xmin + this.imgBbox.xmax) / 2,
        y: (this.imgBbox.ymin + this.imgBbox.ymax) / 2
    }
}

// For edge nails: the direction (degrees) pointing out of the board at each nail, used to place labels
StringArtGenerator.prototype.GetNailOutwardAngles = function() {
    let nails = this.nails.map(p => ({ x: p.fx ?? p.x, y: p.fy ?? p.y }))
    let n = nails.length
    let c = this.GetBoardCenter()
    let angles = []

    let bx0 = Math.min(...nails.map(p => p.x)), bx1 = Math.max(...nails.map(p => p.x))
    let by0 = Math.min(...nails.map(p => p.y)), by1 = Math.max(...nails.map(p => p.y))

    for (let i = 0; i < n; i++) {
        let nail = nails[i]
        let angle

        if (this.formType == CIRCLE_FORM) {
            angle = Math.atan2(nail.y - c.y, nail.x - c.x)
        }
        else if (this.IsOutlineForm()) {
            // Perpendicular to the line through the neighbouring nails, on the side away from the centre.
            // On a hexagon corner this naturally gives the bisector.
            let prev = nails[(i - 1 + n) % n]
            let next = nails[(i + 1) % n]
            let nx = next.y - prev.y
            let ny = -(next.x - prev.x)

            if (nx * (nail.x - c.x) + ny * (nail.y - c.y) < 0) {
                nx = -nx
                ny = -ny
            }

            angle = Math.atan2(ny, nx)
        }
        else {
            // Rectangles: perpendicular to whichever edge the nail is on
            let px = (nail.x - bx0) / Math.max(1, bx1 - bx0) * 2 - 1
            let py = (nail.y - by0) / Math.max(1, by1 - by0) * 2 - 1

            if (Math.abs(px) >= Math.abs(py))
                angle = px >= 0 ? 0 : Math.PI
            else
                angle = py >= 0 ? Math.PI / 2 : -Math.PI / 2
        }

        angles.push(angle * 180 / Math.PI)
    }

    return angles
}

// Smallest gap between neighbouring nails (edge layouts) or a typical gap (grid / random)
StringArtGenerator.prototype.GetNailSpacing = function() {
    let nails = this.nails
    let n = nails.length

    if (this.nailsModeBox.value == BORDER_MODE) {
        let spacing = Infinity

        for (let i = 0; i < n; i++) {
            let a = nails[i], b = nails[(i + 1) % n]
            let d = Math.hypot(a.x - b.x, a.y - b.y)
            if (d > 0)
                spacing = Math.min(spacing, d)
        }

        return spacing
    }

    let area = (this.imgBbox.xmax - this.imgBbox.xmin) * (this.imgBbox.ymax - this.imgBbox.ymin)
    return Math.sqrt(area / Math.max(1, n)) * 0.5
}

// On-screen nail numbers, drawn on a separate layer so they never affect the generated art
StringArtGenerator.prototype.DrawNailNumbers = function() {
    let ctx = this.overlayCtx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)     // see ApplyScale
    ctx.clearRect(0, 0, this.width, this.height)

    let mode = this.nailNumbersBox.value

    if (mode == 'off' || !this.nails || this.nails.length == 0)
        return

    let step = mode == 'all' ? 1 : +mode
    let nails = this.nails
    let isBorder = this.nailsModeBox.value == BORDER_MODE
    let spacing = this.GetNailSpacing()
    let fs = Math.max(7, Math.min(13, spacing * step * 0.9))
    let angles = isBorder ? this.GetNailOutwardAngles() : null

    ctx.save()
    ctx.font = `${fs}px Arial, Helvetica, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'

    // Nail positions, so the layout can be checked before generating
    ctx.fillStyle = '#0062cc'
    for (let nail of nails) {
        ctx.beginPath()
        ctx.arc(nail.x, nail.y, 1.2, 0, Math.PI * 2)
        ctx.fill()
    }

    for (let i = 0; i < nails.length; i++) {
        // Nail 1 always shows; otherwise every step-th nail (1, step+1, ... for "all"; 5, 10, ... for every 5th)
        let label = i + 1
        if (i != 0 && step > 1 && label % step != 0)
            continue

        let nail = nails[i]
        ctx.fillStyle = i == 0 ? '#d00' : '#111'

        if (i == 0) {
            ctx.beginPath()
            ctx.arc(nail.x, nail.y, 2.5, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.save()
        ctx.translate(nail.x, nail.y)

        if (isBorder) {
            // Labels sit just inside the board, pointing at the centre, flipped to stay readable
            let a = angles[i]
            let flip = a > 90 || a < -90
            let off = 3

            ctx.rotate((flip ? a + 180 : a) * Math.PI / 180)
            ctx.textAlign = flip ? 'left' : 'right'
            ctx.strokeText(label, flip ? off : -off, 0)
            ctx.fillText(label, flip ? off : -off, 0)
        }
        else {
            ctx.textAlign = 'left'
            ctx.strokeText(label, 2.5, -fs * 0.45)
            ctx.fillText(label, 2.5, -fs * 0.45)
        }

        ctx.restore()
    }

    ctx.restore()
}
