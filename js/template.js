/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/template.js - Board template: actual-size printable nail templates (PDF, SVG, PNG) without a photo.
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

// Board template: a printable, actual-size sheet with every nail position and its number.
// Works without a photo. Nails are built with the generator's own placement code, so a board made from
// this template matches a string-art run that uses the same shape, layout and number of nails.
// All template geometry is in millimetres.

const TEMPLATE_SHAPES = [CIRCLE_FORM, RECT_FORM, ALBUM_FORM, PORTRAIT_FORM, HEXAGON_FORM, HEXAGON_POINTY_FORM, OVAL_H_FORM, OVAL_V_FORM]

const TEMPLATE_SHAPE_NAMES = {
    'circle': 'Circle',
    'rect': 'Square',
    'album': 'Landscape',
    'portrait': 'Portrait',
    'hexagon': 'Hexagon (flat top)',
    'hexagon-pointy': 'Hexagon (pointy top)',
    'oval-horizontal': 'Oval (horizontal)',
    'oval-vertical': 'Oval (vertical)',
    'image': 'Photo-shaped'
}

const TEMPLATE_LAYOUT_NAMES = { 'border': 'on the edge', 'grid': 'in a grid', 'random': 'scattered' }

const TEMPLATE_PAPERS = {
    a4: { name: 'A4', w: 210, h: 297 },
    a3: { name: 'A3', w: 297, h: 420 },
    letter: { name: 'Letter', w: 215.9, h: 279.4 }
}

const TEMPLATE_UNITS = { mm: 1, cm: 10, in: 25.4 }

// ================= Geometry =================

function TemplateBoardSize(shape, size, imageAspect = 1) {
    let s2 = Math.SQRT2, s3 = Math.sqrt(3)

    switch (shape) {
        case ALBUM_FORM:
        case OVAL_H_FORM: return { w: size, h: size / s2 }
        case PORTRAIT_FORM:
        case OVAL_V_FORM: return { w: size / s2, h: size }
        case HEXAGON_FORM: return { w: size, h: size * s3 / 2 }
        case HEXAGON_POINTY_FORM: return { w: size * s3 / 2, h: size }
        case IMAGE_FORM: return imageAspect >= 1 ? { w: size, h: size / imageAspect } : { w: size * imageAspect, h: size }
        default: return { w: size, h: size }
    }
}

function TemplateHexPoints(cx, cy, R, flat) {
    let start = flat ? 0 : -Math.PI / 6
    let points = []

    for (let i = 0; i < 6; i++) {
        let t = start + i * Math.PI / 3
        points.push({ x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) })
    }

    return points
}

// Board edge (the cut line) in board coordinates
function TemplateOutline(shape, w, h) {
    let cx = w / 2, cy = h / 2

    if (shape == CIRCLE_FORM)
        return { type: 'circle', cx: cx, cy: cy, r: w / 2 }

    if (shape == OVAL_H_FORM || shape == OVAL_V_FORM)
        return { type: 'ellipse', cx: cx, cy: cy, rx: w / 2, ry: h / 2 }

    if (shape == HEXAGON_FORM)
        return { type: 'polygon', points: TemplateHexPoints(cx, cy, w / 2, true) }

    if (shape == HEXAGON_POINTY_FORM)
        return { type: 'polygon', points: TemplateHexPoints(cx, cy, h / 2, false) }

    return { type: 'rect', x: 0, y: 0, w: w, h: h }
}

// Box the nail line fills, `inset` mm inside the board edge
function TemplateNailBox(shape, w, h, inset) {
    if (shape == HEXAGON_FORM || shape == HEXAGON_POINTY_FORM) {
        let flat = shape == HEXAGON_FORM
        let R = (flat ? w : h) / 2
        let Rn = R - inset / Math.cos(Math.PI / 6)   // sides move in by `inset`
        let bw = flat ? 2 * Rn : Math.sqrt(3) * Rn
        let bh = flat ? Math.sqrt(3) * Rn : 2 * Rn
        return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh }
    }

    return { x: inset, y: inset, w: w - 2 * inset, h: h - 2 * inset }
}

// A throwaway generator, never shown, used only to run the real nail-placement code
function MakeTemplateGenerator(shape, layout, count, canvasSize) {
    let g = Object.create(StringArtGenerator.prototype)
    g.width = g.height = canvasSize
    g.x0 = g.y0 = canvasSize / 2
    g.radius = canvasSize / 2 - PADDING
    g.formType = shape
    g.formTypeBox = { value: shape }
    g.nailsModeBox = { value: layout }
    g.nailsCountBox = { value: count }
    g.imgWidth = g.imgHeight = canvasSize
    g.imgX = g.imgY = 0
    g.imgScale = 1
    g.InitBbox()

    if (layout == GRID_MODE)
        g.nails = g.InitGridNails(count)
    else
        g.nails = g.InitBorderNails(count)

    return g
}

// The area (in generator pixels) that the generator's nails fill, matching TemplateNailBox
function TemplateSourceBox(g, layout) {
    let P = PADDING
    let shape = g.formType
    let centred = (cx, cy, w, h) => ({ x: cx - w / 2, y: cy - h / 2, w: w, h: h })
    let extents = (pts) => {
        let xs = pts.map(p => p.x), ys = pts.map(p => p.y)
        let x = Math.min(...xs), y = Math.min(...ys)
        return { x: x, y: y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
    }

    if (shape == CIRCLE_FORM)
        return centred(g.x0, g.y0, 2 * g.radius, 2 * g.radius)

    if (g.IsOutlineForm())
        return extents(g.GetShapeOutline(0))

    if (layout == BORDER_MODE) {
        if (shape == RECT_FORM)
            return centred(g.x0, g.y0, g.width - 2 * P, g.height - 2 * P)

        if (shape == ALBUM_FORM) {
            let size = g.width - 2 * P
            return centred(g.x0, g.y0, size, size / Math.SQRT2)
        }

        if (shape == PORTRAIT_FORM) {
            let size = g.height - 2 * P
            return centred(g.x0, g.y0, size / Math.SQRT2, size)
        }

        if (shape == IMAGE_FORM)
            return centred(g.imgWidth / 2, g.imgHeight / 2, g.imgWidth - 2 * P, g.imgHeight - 2 * P)
    }

    let b = g.imgBbox
    let pad = layout == GRID_MODE ? P : 0
    return { x: b.xmin + pad, y: b.ymin + pad, w: b.xmax - b.xmin - 2 * pad, h: b.ymax - b.ymin - 2 * pad }
}

// Direction (degrees, clockwise from +x) pointing out of the board at each edge nail
function TemplateOutwardAngles(shape, nails, w, h) {
    let n = nails.length
    let cx = w / 2, cy = h / 2
    let isOutline = [HEXAGON_FORM, HEXAGON_POINTY_FORM, OVAL_H_FORM, OVAL_V_FORM].indexOf(shape) != -1

    let bx0 = Math.min(...nails.map(p => p.x)), bx1 = Math.max(...nails.map(p => p.x))
    let by0 = Math.min(...nails.map(p => p.y)), by1 = Math.max(...nails.map(p => p.y))

    return nails.map((nail, i) => {
        let a

        if (shape == CIRCLE_FORM) {
            a = Math.atan2(nail.y - cy, nail.x - cx)
        }
        else if (isOutline) {
            let prev = nails[(i - 1 + n) % n], next = nails[(i + 1) % n]
            let nx = next.y - prev.y, ny = -(next.x - prev.x)
            if (nx * (nail.x - cx) + ny * (nail.y - cy) < 0) { nx = -nx; ny = -ny }
            a = Math.atan2(ny, nx)
        }
        else {
            let px = (nail.x - bx0) / Math.max(1e-9, bx1 - bx0) * 2 - 1
            let py = (nail.y - by0) / Math.max(1e-9, by1 - by0) * 2 - 1
            a = Math.abs(px) >= Math.abs(py) ? (px >= 0 ? 0 : Math.PI) : (py >= 0 ? Math.PI / 2 : -Math.PI / 2)
        }

        return a * 180 / Math.PI
    })
}

function TemplateMinSpacing(nails, layout) {
    let n = nails.length
    let best = Infinity

    if (layout == BORDER_MODE) {
        for (let i = 0; i < n; i++) {
            let a = nails[i], b = nails[(i + 1) % n]
            let d = Math.hypot(a.x - b.x, a.y - b.y)
            if (d > 1e-6) best = Math.min(best, d)
        }
        return best
    }

    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
            let d = Math.hypot(nails[i].x - nails[j].x, nails[i].y - nails[j].y)
            if (d > 1e-6 && d < best) best = d
        }

    return best
}

// ================= Model: everything needed to draw one template sheet =================

// opts: { source, shape, layout, count, size, inset, step, generator }
function BuildTemplate(opts) {
    let g, shape, layout, imageAspect = 1

    if (opts.source == 'art' && opts.generator && opts.generator.nails && opts.generator.nails.length) {
        g = opts.generator
        shape = g.formType
        layout = g.nailsModeBox.value
        if (shape == IMAGE_FORM)
            imageAspect = g.imgWidth / g.imgHeight
    }
    else {
        shape = opts.shape
        layout = opts.layout
        let size = opts.generator && opts.generator.width ? opts.generator.width : 1000
        g = MakeTemplateGenerator(shape, layout, opts.count, size)
    }

    let board = TemplateBoardSize(shape, opts.size, imageAspect)
    let inset = Math.min(opts.inset, Math.min(board.w, board.h) / 4)
    let nb = TemplateNailBox(shape, board.w, board.h, inset)
    let sb = TemplateSourceBox(g, layout)

    let nails = g.nails.map(p => ({
        x: nb.x + ((p.fx ?? p.x) - sb.x) / sb.w * nb.w,
        y: nb.y + ((p.fy ?? p.y) - sb.y) / sb.h * nb.h
    }))

    let isBorder = layout == BORDER_MODE
    let spacing = TemplateMinSpacing(nails, layout)
    let step = opts.step || 1
    let digits = String(nails.length).length

    let fs, ringR, labelOff, labelReach
    if (isBorder) {
        fs = Math.max(1.5, Math.min(5, spacing * step * 0.78, spacing * 0.95 * Math.max(1, step / 2)))
        ringR = Math.max(0.45, Math.min(1.2, spacing * 0.22))
        labelOff = ringR + fs * 0.35
        labelReach = labelOff + fs * 0.62 * digits
    }
    else {
        fs = Math.max(1.2, Math.min(3.5, spacing * 0.38 * Math.sqrt(step)))
        ringR = Math.max(0.45, Math.min(1.2, spacing * 0.2))
        labelOff = ringR
        labelReach = 0
    }

    // Sheet: board centred, room around it for labels that stick out past the edge, title block underneath
    let titleH = 34
    let margin = 12 + Math.max(0, labelReach - inset)
    let pageW = Math.max(board.w + 2 * margin, 200)
    let pageH = board.h + 2 * margin + titleH

    return {
        shape: shape,
        layout: layout,
        count: nails.length,
        source: opts.source,
        board: board,
        inset: inset,
        outline: TemplateOutline(shape, board.w, board.h),
        nails: nails,
        angles: isBorder ? TemplateOutwardAngles(shape, nails, board.w, board.h) : null,
        spacing: spacing,
        step: step,
        fs: fs,
        ringR: ringR,
        labelOff: labelOff,
        pageW: pageW,
        pageH: pageH,
        boardX: (pageW - board.w) / 2,
        boardY: margin,
        titleH: titleH
    }
}

function TemplateFormatMm(mm, unit) {
    let v = mm / TEMPLATE_UNITS[unit]
    let digits = unit == 'mm' ? 0 : unit == 'cm' ? 1 : 2
    return `${v.toFixed(digits)} ${unit}`
}

// Nail spacing needs more precision than board sizes
function TemplateFormatSpacing(mm, unit) {
    return unit == 'in' ? `${(mm / 25.4).toFixed(3)} in` : `${mm.toFixed(1)} mm`
}

function TemplateDescription(m, unit = 'mm') {
    let dims = m.shape == CIRCLE_FORM ? `Ø ${TemplateFormatMm(m.board.w, unit)}` :
        `${TemplateFormatMm(m.board.w, unit).split(' ')[0]} × ${TemplateFormatMm(m.board.h, unit)}`

    return {
        title: `${TEMPLATE_SHAPE_NAMES[m.shape]} board  ·  ${m.count} nails ${TEMPLATE_LAYOUT_NAMES[m.layout] || ''}`,
        detail: `Board ${dims}  ·  nails ${TemplateFormatMm(m.inset, unit)} from edge  ·  min. spacing ${TemplateFormatSpacing(m.spacing, unit)}`,
        dims: dims
    }
}

// ================= Renderers (all coordinates in mm) =================

function SvgTemplateRenderer(w, h) {
    this.w = w
    this.h = h
    this.parts = []
}

SvgTemplateRenderer.prototype.r = function(v) { return Math.round(v * 1000) / 1000 }

SvgTemplateRenderer.prototype.style = function(st) {
    let s = `fill="${st.fill || 'none'}"`
    if (st.stroke) s += ` stroke="${st.stroke}" stroke-width="${this.r(st.width || 0.2)}"`
    if (st.dash) s += ` stroke-dasharray="${st.dash.join(' ')}"`
    return s
}

SvgTemplateRenderer.prototype.line = function(x1, y1, x2, y2, st) {
    this.parts.push(`<line x1="${this.r(x1)}" y1="${this.r(y1)}" x2="${this.r(x2)}" y2="${this.r(y2)}" ${this.style(st)} />`)
}

SvgTemplateRenderer.prototype.circle = function(cx, cy, r, st) {
    this.parts.push(`<circle cx="${this.r(cx)}" cy="${this.r(cy)}" r="${this.r(r)}" ${this.style(st)} />`)
}

SvgTemplateRenderer.prototype.ellipse = function(cx, cy, rx, ry, st) {
    this.parts.push(`<ellipse cx="${this.r(cx)}" cy="${this.r(cy)}" rx="${this.r(rx)}" ry="${this.r(ry)}" ${this.style(st)} />`)
}

SvgTemplateRenderer.prototype.polygon = function(points, st) {
    this.parts.push(`<polygon points="${points.map(p => `${this.r(p.x)},${this.r(p.y)}`).join(' ')}" ${this.style(st)} />`)
}

SvgTemplateRenderer.prototype.rect = function(x, y, w, h, st) {
    this.parts.push(`<rect x="${this.r(x)}" y="${this.r(y)}" width="${this.r(w)}" height="${this.r(h)}" ${this.style(st)} />`)
}

SvgTemplateRenderer.prototype.text = function(str, x, y, o) {
    let anchor = o.anchor || 'start'
    let rot = o.angle ? ` transform="rotate(${this.r(o.angle)} ${this.r(x)} ${this.r(y)})"` : ''
    let dy = o.dy ? ` dy="${this.r(o.dy * o.size)}"` : ''
    let weight = o.weight == 'bold' ? ' font-weight="700"' : ''
    let safe = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    this.parts.push(`<text x="${this.r(x)}" y="${this.r(y)}"${dy}${rot} font-size="${this.r(o.size)}"${weight} text-anchor="${anchor}" fill="${o.color || '#000'}">${safe}</text>`)
}

SvgTemplateRenderer.prototype.image = function(x, y, w, h) {
    this.parts.push(`<a href="${BRAND.url}"><image x="${this.r(x)}" y="${this.r(y)}" width="${this.r(w)}" height="${this.r(h)}" href="${LOGO_DATA_URL}" xlink:href="${LOGO_DATA_URL}" /></a>`)
}

SvgTemplateRenderer.prototype.toString = function(sizeInMm = true) {
    let size = sizeInMm ? `width="${this.r(this.w)}mm" height="${this.r(this.h)}mm"` : ''
    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<!-- ${BRAND.tool} | ${BRAND.sitesLine} | ${BRAND.copyrightLine} | ${BRAND.licenseUrl} -->\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${size} viewBox="0 0 ${this.r(this.w)} ${this.r(this.h)}" font-family="Arial, Helvetica, sans-serif">\n` +
        `<title>Board template - ${BRAND.sitesLine}</title>\n` +
        `<desc>${BRAND.copyrightLine}</desc>\n` +
        `<rect width="${this.r(this.w)}" height="${this.r(this.h)}" fill="#ffffff" />\n` +
        this.parts.join('\n') + '\n</svg>'
}

function CanvasTemplateRenderer(ctx, scale, logo) {
    this.ctx = ctx
    this.k = scale      // pixels per mm
    this.logo = logo
}

CanvasTemplateRenderer.prototype.paint = function(st) {
    let ctx = this.ctx
    if (st.fill && st.fill != 'none') { ctx.fillStyle = st.fill; ctx.fill() }
    if (st.stroke) {
        ctx.strokeStyle = st.stroke
        ctx.lineWidth = (st.width || 0.2) * this.k
        ctx.setLineDash(st.dash ? st.dash.map(v => v * this.k) : [])
        ctx.stroke()
        ctx.setLineDash([])
    }
}

CanvasTemplateRenderer.prototype.line = function(x1, y1, x2, y2, st) {
    let k = this.k
    this.ctx.beginPath(); this.ctx.moveTo(x1 * k, y1 * k); this.ctx.lineTo(x2 * k, y2 * k); this.paint(st)
}

CanvasTemplateRenderer.prototype.circle = function(cx, cy, r, st) {
    let k = this.k
    this.ctx.beginPath(); this.ctx.arc(cx * k, cy * k, r * k, 0, Math.PI * 2); this.paint(st)
}

CanvasTemplateRenderer.prototype.ellipse = function(cx, cy, rx, ry, st) {
    let k = this.k
    this.ctx.beginPath(); this.ctx.ellipse(cx * k, cy * k, rx * k, ry * k, 0, 0, Math.PI * 2); this.paint(st)
}

CanvasTemplateRenderer.prototype.polygon = function(points, st) {
    let k = this.k
    this.ctx.beginPath()
    points.forEach((p, i) => i ? this.ctx.lineTo(p.x * k, p.y * k) : this.ctx.moveTo(p.x * k, p.y * k))
    this.ctx.closePath()
    this.paint(st)
}

CanvasTemplateRenderer.prototype.rect = function(x, y, w, h, st) {
    let k = this.k
    this.ctx.beginPath(); this.ctx.rect(x * k, y * k, w * k, h * k); this.paint(st)
}

CanvasTemplateRenderer.prototype.text = function(str, x, y, o) {
    let ctx = this.ctx, k = this.k
    ctx.save()
    ctx.translate(x * k, y * k)
    if (o.angle) ctx.rotate(o.angle * Math.PI / 180)
    ctx.font = `${o.weight == 'bold' ? '700 ' : ''}${o.size * k}px Arial, Helvetica, sans-serif`
    ctx.textAlign = { start: 'left', end: 'right', middle: 'center' }[o.anchor || 'start']
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = o.color || '#000'
    ctx.fillText(str, 0, (o.dy || 0) * o.size * k)
    ctx.restore()
}

CanvasTemplateRenderer.prototype.image = function(x, y, w, h) {
    if (this.logo)
        this.ctx.drawImage(this.logo, x * this.k, y * this.k, w * this.k, h * this.k)
}

function PdfTemplateRenderer(doc) {
    this.doc = doc
}

PdfTemplateRenderer.prototype.apply = function(st) {
    let doc = this.doc
    let mode = ''
    if (st.fill && st.fill != 'none') { doc.setFillColor(st.fill); mode += 'F' }
    if (st.stroke) {
        doc.setDrawColor(st.stroke)
        doc.setLineWidth(st.width || 0.2)
        doc.setLineDashPattern(st.dash || [], 0)
        mode = mode ? 'FD' : 'S'
    }
    return mode || 'S'
}

PdfTemplateRenderer.prototype.line = function(x1, y1, x2, y2, st) {
    this.apply(st)
    this.doc.line(x1, y1, x2, y2)
    this.doc.setLineDashPattern([], 0)
}

PdfTemplateRenderer.prototype.circle = function(cx, cy, r, st) {
    this.doc.circle(cx, cy, r, this.apply(st))
    this.doc.setLineDashPattern([], 0)
}

PdfTemplateRenderer.prototype.ellipse = function(cx, cy, rx, ry, st) {
    this.doc.ellipse(cx, cy, rx, ry, this.apply(st))
    this.doc.setLineDashPattern([], 0)
}

PdfTemplateRenderer.prototype.polygon = function(points, st) {
    let deltas = []
    for (let i = 1; i < points.length; i++)
        deltas.push([points[i].x - points[i - 1].x, points[i].y - points[i - 1].y])
    this.doc.lines(deltas, points[0].x, points[0].y, [1, 1], this.apply(st), true)
    this.doc.setLineDashPattern([], 0)
}

PdfTemplateRenderer.prototype.rect = function(x, y, w, h, st) {
    this.doc.rect(x, y, w, h, this.apply(st))
    this.doc.setLineDashPattern([], 0)
}

PdfTemplateRenderer.prototype.text = function(str, x, y, o) {
    let doc = this.doc
    doc.setFont('helvetica', o.weight == 'bold' ? 'bold' : 'normal')
    doc.setFontSize(o.size * 72 / 25.4)
    doc.setTextColor(o.color || '#000000')

    // jsPDF's own alignment ignores rotation, so place the start of the text ourselves
    let width = doc.getTextWidth(String(str))
    let u = { start: 0, end: -width, middle: -width / 2 }[o.anchor || 'start']
    let v = (o.dy || 0) * o.size
    let a = (o.angle || 0) * Math.PI / 180
    let px = x + u * Math.cos(a) - v * Math.sin(a)
    let py = y + u * Math.sin(a) + v * Math.cos(a)

    doc.text(String(str), px, py, o.angle ? { angle: -o.angle } : undefined)
}

PdfTemplateRenderer.prototype.image = function(x, y, w, h) {
    this.doc.addImage(LOGO_DATA_URL, 'PNG', x, y, w, h, 'brandlogo', 'FAST')
    this.doc.link(x, y, w, h, { url: BRAND.url })
}

// ================= Drawing the sheet =================

// Draws the whole sheet with its top-left corner at (ox, oy)
function DrawTemplateSheet(out, m, ox, oy, unit = 'mm') {
    let bx = ox + m.boardX, by = oy + m.boardY
    let o = m.outline
    let edge = { stroke: '#8a8a8a', width: 0.3 }

    // Board edge (cut line)
    if (o.type == 'circle') out.circle(bx + o.cx, by + o.cy, o.r, edge)
    else if (o.type == 'ellipse') out.ellipse(bx + o.cx, by + o.cy, o.rx, o.ry, edge)
    else if (o.type == 'polygon') out.polygon(o.points.map(p => ({ x: bx + p.x, y: by + p.y })), edge)
    else out.rect(bx + o.x, by + o.y, o.w, o.h, edge)

    // Centre mark
    let cx = bx + m.board.w / 2, cy = by + m.board.h / 2
    let thin = { stroke: '#8a8a8a', width: 0.2 }
    out.line(cx - 5, cy, cx + 5, cy, thin)
    out.line(cx, cy - 5, cx, cy + 5, thin)

    // Nails: a ring the size of a nail head with a dot at the exact centre
    let isBorder = m.layout == BORDER_MODE

    for (let i = 0; i < m.nails.length; i++) {
        let p = m.nails[i]
        let x = bx + p.x, y = by + p.y
        let first = i == 0
        let color = first ? BRAND.red : '#000000'

        out.circle(x, y, m.ringR, { stroke: color, width: first ? 0.25 : 0.15 })
        out.circle(x, y, Math.max(0.18, m.ringR * 0.25), { fill: color })

        let label = i + 1
        if (!first && m.step > 1 && label % m.step != 0)
            continue

        if (isBorder) {
            let a = m.angles[i]
            let flip = a > 90 || a < -90
            out.text(label, x + Math.cos(a * Math.PI / 180) * m.labelOff, y + Math.sin(a * Math.PI / 180) * m.labelOff, {
                size: m.fs, angle: flip ? a + 180 : a, anchor: flip ? 'end' : 'start', dy: 0.35,
                color: color, weight: first ? 'bold' : 'normal'
            })
        }
        else {
            out.text(label, x + m.ringR + 0.25, y - m.ringR - 0.25, { size: m.fs, color: color, weight: first ? 'bold' : 'normal' })
        }
    }

    DrawTemplateTitleBlock(out, m, ox, oy, unit)
}

function DrawTemplateTitleBlock(out, m, ox, oy, unit) {
    let ty = oy + m.pageH - m.titleH
    let left = ox + 10, right = ox + m.pageW - 10
    let desc = TemplateDescription(m, unit)

    out.line(left, ty + 2, right, ty + 2, { stroke: '#cfcfcf', width: 0.25 })

    // Row 1: logo + what this template is
    let logoH = 9
    out.image(left, ty + 5, logoH * BRAND.logoAspect, logoH)
    out.text(desc.title, right, ty + 9, { size: 3.6, anchor: 'end', weight: 'bold', color: '#111111' })
    out.text(desc.detail, right, ty + 14, { size: 2.8, anchor: 'end', color: '#333333' })

    // Row 2: scale check + websites + copyright
    let L = m.pageW >= 240 ? 100 : 50
    let sy = ty + 21
    out.rect(left, sy, L, 2.4, { stroke: '#000000', width: 0.2 })
    for (let i = 0; i < L / 10; i += 2)
        out.rect(left + i * 10, sy, 10, 2.4, { fill: '#000000' })
    out.text(`Print at 100% (actual size). This bar must measure ${L} mm. Nail 1 is red.`, left, sy + 6.6, { size: 2.5, color: '#333333' })

    out.text(BRAND.sitesLine, right, ty + 23.4, { size: 3, anchor: 'end', weight: 'bold', color: '#111111' })
    out.text(BRAND.copyrightLine, right, ty + 27.6, { size: 2.5, anchor: 'end', color: '#555555' })
}

// ================= Pages =================

function TemplatePageLayout(m, paperKey) {
    if (paperKey == 'sheet' || !TEMPLATE_PAPERS[paperKey])
        return { tiled: false, pages: 1, pw: m.pageW, ph: m.pageH }

    let paper = TEMPLATE_PAPERS[paperKey]
    let margin = 10
    let best = null

    for (let landscape of [false, true]) {
        let pw = landscape ? paper.h : paper.w
        let ph = landscape ? paper.w : paper.h
        let stepX = pw - 2 * margin, stepY = ph - 2 * margin
        let cols = Math.ceil(m.pageW / stepX), rows = Math.ceil(m.pageH / stepY)

        if (!best || cols * rows < best.pages)
            best = {
                tiled: true, paper: paper, pw: pw, ph: ph, margin: margin, stepX: stepX, stepY: stepY,
                cols: cols, rows: rows, pages: cols * rows, landscape: landscape,
                offX: (cols * stepX - m.pageW) / 2, offY: (rows * stepY - m.pageH) / 2
            }
    }

    return best
}

function DrawTilePage(out, m, L, row, col, unit) {
    let ox = L.margin - col * L.stepX + L.offX
    let oy = L.margin - row * L.stepY + L.offY
    DrawTemplateSheet(out, m, ox, oy, unit)

    // Trim lines and page furniture in the margins
    let mg = L.margin
    let cut = { stroke: '#9a9a9a', width: 0.2, dash: [2, 1.5] }
    out.line(mg, 0, mg, L.ph, cut)
    out.line(L.pw - mg, 0, L.pw - mg, L.ph, cut)
    out.line(0, mg, L.pw, mg, cut)
    out.line(0, L.ph - mg, L.pw, L.ph - mg, cut)

    // White margin bands so the tile label stays readable over the template
    out.rect(mg + 1, 1, L.pw - 2 * mg - 2, mg - 2.5, { fill: '#ffffff' })
    out.rect(mg + 1, L.ph - mg + 1.5, L.pw - 2 * mg - 2, mg - 2.5, { fill: '#ffffff' })

    let page = row * L.cols + col + 1
    out.text(`Page ${page} of ${L.pages}  ·  row ${row + 1}, column ${col + 1}  ·  trim on the dashed lines and tape pages together, matching the rings`, mg + 2, mg - 3.5, { size: 2.6, color: '#333333' })

    let logoH = 4.5
    out.image(mg + 2, L.ph - mg + 2.6, logoH * BRAND.logoAspect, logoH)
    out.text(`${BRAND.sitesLine}  ·  ${BRAND.copyrightLine}`, L.pw - mg - 2, L.ph - mg + 6, { size: 2.4, anchor: 'end', color: '#555555' })
}

// ================= Exports =================

function TemplateFileName(m, ext) {
    return `board-template-${m.shape}-${m.count}-nails-${Math.round(Math.max(m.board.w, m.board.h))}mm.${ext}`
}

function DownloadBlob(blob, name) {
    let link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(link.href), 4000)
}

function TemplateToSVG(m, unit) {
    let out = new SvgTemplateRenderer(m.pageW, m.pageH)
    DrawTemplateSheet(out, m, 0, 0, unit)
    return out.toString()
}

async function TemplateToPNG(m, unit) {
    let logo = await LoadBrandLogo().catch(() => null)
    let dpi = Math.min(300, 12000 * 25.4 / Math.max(m.pageW, m.pageH))
    let k = dpi / 25.4
    let canvas = document.createElement('canvas')
    canvas.width = Math.round(m.pageW * k)
    canvas.height = Math.round(m.pageH * k)

    let ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    DrawTemplateSheet(new CanvasTemplateRenderer(ctx, k, logo), m, 0, 0, unit)

    let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    return PngWithDpi(blob, dpi)
}

// Canvas PNGs carry no resolution, so print software would guess 72/96 DPI and print at the wrong size.
// Insert a pHYs chunk right after IHDR so the PNG prints at actual size.
async function PngWithDpi(blob, dpi) {
    let bytes = new Uint8Array(await blob.arrayBuffer())
    let ppm = Math.round(dpi / 0.0254)

    let chunk = new Uint8Array(21)
    let view = new DataView(chunk.buffer)
    view.setUint32(0, 9)                                  // data length
    chunk.set([0x70, 0x48, 0x59, 0x73], 4)                // "pHYs"
    view.setUint32(8, ppm)                                // pixels per metre, x
    view.setUint32(12, ppm)                               // pixels per metre, y
    chunk[16] = 1                                         // unit: metre
    view.setUint32(17, Crc32(chunk.subarray(4, 17)))

    let ihdrEnd = 8 + 25                                  // signature + IHDR chunk
    let out = new Uint8Array(bytes.length + chunk.length)
    out.set(bytes.subarray(0, ihdrEnd), 0)
    out.set(chunk, ihdrEnd)
    out.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length)
    return new Blob([out], { type: 'image/png' })
}

let crcTable = null

function Crc32(data) {
    if (!crcTable) {
        crcTable = new Uint32Array(256)
        for (let n = 0; n < 256; n++) {
            let c = n
            for (let k = 0; k < 8; k++)
                c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
            crcTable[n] = c >>> 0
        }
    }

    let crc = 0xFFFFFFFF
    for (let i = 0; i < data.length; i++)
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
}

let jsPdfLoading = null

function LoadJsPdf() {
    if (window.jspdf)
        return Promise.resolve(window.jspdf)

    if (!jsPdfLoading)
        jsPdfLoading = new Promise((resolve, reject) => {
            let script = document.createElement('script')
            script.src = 'js/vendor/jspdf.umd.min.js'
            script.onload = () => resolve(window.jspdf)
            script.onerror = () => { jsPdfLoading = null; reject(new Error('Could not load the PDF library')) }
            document.head.appendChild(script)
        })

    return jsPdfLoading
}

async function TemplateToPDF(m, paperKey, unit) {
    let { jsPDF } = await LoadJsPdf()
    let L = TemplatePageLayout(m, paperKey)
    let fmt = [L.pw, L.ph]
    let doc = new jsPDF({ unit: 'mm', format: fmt, orientation: L.pw > L.ph ? 'landscape' : 'portrait', compress: true })
    let out = new PdfTemplateRenderer(doc)

    doc.setProperties({
        title: `Board template - ${TEMPLATE_SHAPE_NAMES[m.shape]} - ${m.count} nails`,
        subject: 'String art board template with numbered nail positions (print at 100%)',
        author: BRAND.author,
        keywords: `string art, nail template, ${BRAND.sites.join(', ')}`,
        creator: `${BRAND.tool} - ${BRAND.sitesLine} - ${BRAND.copyrightLine}`
    })

    if (!L.tiled) {
        DrawTemplateSheet(out, m, 0, 0, unit)
    }
    else {
        for (let row = 0; row < L.rows; row++)
            for (let col = 0; col < L.cols; col++) {
                if (row || col)
                    doc.addPage(fmt, L.pw > L.ph ? 'landscape' : 'portrait')
                DrawTilePage(out, m, L, row, col, unit)
            }
    }

    return doc.output('blob')
}

// ================= Panel UI =================

(function() {
    const app = document.getElementById('generator-box')
    const preview = document.getElementById('template-preview')
    const info = document.getElementById('template-info')
    const dimsNote = document.getElementById('tpl-dims')
    const sizeBox = document.getElementById('tpl-size')
    const insetBox = document.getElementById('tpl-inset')
    const countBox = document.getElementById('tpl-count')
    const sourceGroup = document.getElementById('tpl-source-group')
    const busy = document.getElementById('tpl-busy')

    const state = {
        source: 'custom', shape: CIRCLE_FORM, layout: BORDER_MODE, count: 250,
        size: 400, inset: 10, unit: 'mm', step: 1, paper: 'sheet'
    }

    // Shape chips: reuse the String art icons, minus "Match photo" (there is no photo here)
    const artShapes = document.querySelector('[data-chips-for="form-type-box"]')
    const shapes = artShapes.cloneNode(true)
    shapes.removeAttribute('data-chips-for')
    shapes.querySelector('[data-value="image"]').remove()
    shapes.querySelectorAll('button').forEach(b => { b.disabled = false; b.removeAttribute('aria-pressed') })
    document.getElementById('tpl-shapes-slot').replaceWith(shapes)
    shapes.id = 'tpl-shapes'

    function segmented(el, key, after) {
        el.querySelectorAll('[data-value]').forEach(btn => btn.addEventListener('click', () => {
            let v = btn.dataset.value
            state[key] = isNaN(+v) || key == 'paper' ? v : +v
            if (after) after()
            refresh()
        }))
    }

    function markPressed(el, value) {
        el.querySelectorAll('[data-value]').forEach(b => b.setAttribute('aria-pressed', b.dataset.value == String(value)))
    }

    shapes.querySelectorAll('[data-value]').forEach(btn => btn.addEventListener('click', () => {
        state.shape = btn.dataset.value
        refresh()
    }))

    segmented(document.getElementById('tpl-layout'), 'layout')
    segmented(document.getElementById('tpl-step'), 'step')
    segmented(document.getElementById('tpl-paper'), 'paper')
    segmented(document.getElementById('tpl-source'), 'source')
    segmented(document.getElementById('tpl-unit'), 'unit', () => writeSizes())

    function unitDigits() { return state.unit == 'mm' ? 0 : state.unit == 'cm' ? 1 : 2 }

    function writeSizes() {
        let k = TEMPLATE_UNITS[state.unit]
        sizeBox.value = (state.size / k).toFixed(unitDigits())
        insetBox.value = (state.inset / k).toFixed(unitDigits())
        sizeBox.step = insetBox.step = state.unit == 'mm' ? 1 : state.unit == 'cm' ? 0.1 : 0.05
        document.querySelectorAll('.tpl-unit-label').forEach(el => el.textContent = state.unit)
    }

    function readNumber(box, min, max, fallback) {
        let v = parseFloat(box.value)
        return isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
    }

    sizeBox.addEventListener('change', () => {
        state.size = readNumber(sizeBox, 1, 1e6, state.size / TEMPLATE_UNITS[state.unit]) * TEMPLATE_UNITS[state.unit]
        state.size = Math.min(3000, Math.max(80, state.size))
        writeSizes(); refresh()
    })

    insetBox.addEventListener('change', () => {
        state.inset = readNumber(insetBox, 0, 1e6, state.inset / TEMPLATE_UNITS[state.unit]) * TEMPLATE_UNITS[state.unit]
        state.inset = Math.min(100, Math.max(2, state.inset))
        writeSizes(); refresh()
    })

    countBox.addEventListener('change', () => {
        state.count = Math.round(readNumber(countBox, 20, 1000, state.count))
        countBox.value = state.count
        refresh()
    })

    // Live preview, batched to one render per frame
    let model = null
    let pending = false

    function refresh() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => { pending = false; render() })
    }

    function hasArt() {
        return generator && generator.nails && generator.nails.length > 0 && app.classList.contains('has-image')
    }

    function render() {
        sourceGroup.hidden = !hasArt()
        if (!hasArt()) state.source = 'custom'

        let fromArt = state.source == 'art'

        model = BuildTemplate({
            source: state.source, shape: state.shape, layout: state.layout, count: state.count,
            size: state.size, inset: state.inset, step: state.step, generator: generator
        })

        // Controls follow the model (in "from string art" mode they show the art's settings, locked)
        markPressed(document.getElementById('tpl-source'), state.source)
        markPressed(shapes, model.shape)
        markPressed(document.getElementById('tpl-layout'), model.layout)
        markPressed(document.getElementById('tpl-step'), state.step)
        markPressed(document.getElementById('tpl-paper'), state.paper)
        markPressed(document.getElementById('tpl-unit'), state.unit)
        shapes.querySelectorAll('button').forEach(b => b.disabled = fromArt)
        document.querySelectorAll('#tpl-layout button').forEach(b => b.disabled = fromArt)
        countBox.disabled = fromArt
        if (fromArt || document.activeElement !== countBox)   // never overwrite what is being typed
            countBox.value = model.count

        let desc = TemplateDescription(model, state.unit)
        let L = TemplatePageLayout(model, state.paper)
        let pagesText = L.tiled ? `PDF: ${L.pages} ${L.paper.name} page${L.pages > 1 ? 's' : ''} (${L.cols} × ${L.rows}${L.landscape ? ', landscape' : ''})` :
            `PDF: one ${TemplateFormatMm(model.pageW, state.unit).split(' ')[0]} × ${TemplateFormatMm(model.pageH, state.unit)} sheet`
        let warn = model.spacing < 3 ? `<span class="warn">Nails are only ${model.spacing.toFixed(1)} mm apart. Use fewer nails or a bigger board.</span>` : ''

        dimsNote.textContent = `Board: ${desc.dims}`
        info.innerHTML =
            `<span class="stat"><b>${model.count}</b> nails</span>` +
            `<span class="stat"><b>${desc.dims}</b> board</span>` +
            `<span class="stat"><b>${TemplateFormatSpacing(model.spacing, state.unit)}</b> min. spacing</span>` +
            `<span class="stat">${pagesText}</span>` + warn

        // Preview: the same sheet as the exports, plus dashed page splits when printing on tiles
        let out = new SvgTemplateRenderer(model.pageW, model.pageH)
        DrawTemplateSheet(out, model, 0, 0, state.unit)

        if (L.tiled) {
            let split = { stroke: '#2B5246', width: Math.max(0.4, model.pageW / 500), dash: [4, 3] }
            for (let c = 1; c < L.cols; c++) {
                let x = c * L.stepX - L.offX
                out.line(x, 0, x, model.pageH, split)
            }
            for (let r = 1; r < L.rows; r++) {
                let y = r * L.stepY - L.offY
                out.line(0, y, model.pageW, y, split)
            }
        }

        preview.innerHTML = out.toString(false).replace(/^<\?xml[^>]*>\s*/, '')
        fitPreview()
    }

    // Scale the preview sheet to fit the stage at its true proportions
    function fitPreview() {
        let svg = preview.querySelector('svg')
        if (!svg || !model) return

        let boxW = preview.clientWidth, boxH = preview.clientHeight
        let k = Math.min(boxW / model.pageW, boxH / model.pageH)
        svg.style.width = Math.floor(model.pageW * k) + 'px'
        svg.style.height = Math.floor(model.pageH * k) + 'px'
    }

    window.addEventListener('resize', fitPreview)

    async function run(button, task) {
        button.disabled = true
        busy.textContent = 'Preparing your file…'
        try {
            await task()
            busy.textContent = ''
        }
        catch (e) {
            console.error(e)
            busy.textContent = 'Sorry, the file could not be created. ' + (e && e.message ? e.message : '')
        }
        button.disabled = false
    }

    document.getElementById('tpl-pdf').addEventListener('click', (e) => run(e.currentTarget, async () => {
        DownloadBlob(await TemplateToPDF(model, state.paper, state.unit), TemplateFileName(model, 'pdf'))
    }))

    document.getElementById('tpl-svg').addEventListener('click', (e) => run(e.currentTarget, async () => {
        DownloadBlob(new Blob([TemplateToSVG(model, state.unit)], { type: 'image/svg+xml' }), TemplateFileName(model, 'svg'))
    }))

    document.getElementById('tpl-png').addEventListener('click', (e) => run(e.currentTarget, async () => {
        DownloadBlob(await TemplateToPNG(model, state.unit), TemplateFileName(model, 'png'))
    }))

    // Keep "from string art" in step with the generator
    for (let name of ['imageloaded', 'stop', 'reset'])
        document.addEventListener('stringart:' + name, () => { if (app.classList.contains('mode-template')) refresh() })

    document.getElementById('form-type-box').addEventListener('change', () => { if (state.source == 'art') refresh() })
    document.getElementById('nails-mode-box').addEventListener('change', () => { if (state.source == 'art') refresh() })
    document.getElementById('nails-count-box').addEventListener('change', () => { if (state.source == 'art') refresh() })

    // Opened from the String art export row: template of the current art
    window.OpenBoardTemplate = function(fromArt) {
        if (fromArt && hasArt())
            state.source = 'art'
        refresh()
    }

    document.addEventListener('stringart:mode', (e) => { if (e.detail.mode == 'template') refresh() })

    writeSizes()
    countBox.value = state.count
    refresh()
})()
