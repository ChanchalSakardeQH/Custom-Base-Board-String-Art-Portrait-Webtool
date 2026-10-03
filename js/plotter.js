/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/plotter.js - G-code for GRBL XY plotters: plot the nail positions, then wind the thread.
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

// Works in millimetres from the Board template model (board coordinates: origin at the board's
// top-left, y pointing down, as seen from above). Machine coordinates are derived from the chosen
// work origin and Y direction. Arcs are computed in board coordinates where a growing angle is a
// visually clockwise turn, then converted to G2/G3 for the machine.

const PLOTTER_DEFAULTS = {
    origin: 'bl', yUp: 'up', offX: 0, offY: 0, travelFeed: 3000,
    tool: 'servo', servoDown: 'M3 S1000', servoUp: 'M5', servoDelay: 0.2,
    zUp: 3, zDown: -1, plungeFeed: 300, laserPower: 600,
    mark: 'cross', markSize: 2, drawFeed: 1500, numbers: 'off',
    useZ: true, safeZ: 25, windZ: 6, lift: 'auto',
    nailDia: 1.5, guideDia: 1.5, wrapR: 2.5, dir: 'cw', turns: 1, windFeed: 1500, pauseEvery: 250,
    view: 'nails'
}

// ================= Single-stroke digits (a 4 x 6 grid, y down) for writing pin numbers =================

const PLOTTER_DIGITS = {
    '0': [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]], [[4, 0], [0, 6]]],
    '1': [[[1, 1], [2, 0], [2, 6]], [[1, 6], [3, 6]]],
    '2': [[[0, 0], [4, 0], [4, 3], [0, 3], [0, 6], [4, 6]]],
    '3': [[[0, 0], [4, 0], [4, 6], [0, 6]], [[0, 3], [4, 3]]],
    '4': [[[0, 0], [0, 3], [4, 3]], [[4, 0], [4, 6]]],
    '5': [[[4, 0], [0, 0], [0, 3], [4, 3], [4, 6], [0, 6]]],
    '6': [[[4, 0], [0, 0], [0, 6], [4, 6], [4, 3], [0, 3]]],
    '7': [[[0, 0], [4, 0], [1.5, 6]]],
    '8': [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]], [[0, 3], [4, 3]]],
    '9': [[[4, 3], [0, 3], [0, 0], [4, 0], [4, 6], [0, 6]]]
}

// Strokes (board coordinates) for `text` placed like the template labels.
// anchor: 'start' | 'end'; vAlign: 'middle' (centred on the baseline point) | 'bottom'
function PlotterTextStrokes(text, x, y, size, angleDeg, anchor, vAlign) {
    let unit = size / 6
    let width = (text.length * 6 - 2) * unit
    let u0 = anchor == 'end' ? -width : 0
    let v0 = vAlign == 'bottom' ? -6 * unit : -3 * unit
    let a = angleDeg * Math.PI / 180
    let cos = Math.cos(a), sin = Math.sin(a)
    let strokes = []

    for (let c = 0; c < text.length; c++) {
        for (let stroke of PLOTTER_DIGITS[text[c]] || []) {
            strokes.push(stroke.map(([gx, gy]) => {
                let u = u0 + (c * 6 + gx) * unit
                let v = v0 + gy * unit
                return { x: x + u * cos - v * sin, y: y + u * sin + v * cos }
            }))
        }
    }

    return strokes
}

// ================= G-code writer with statistics and a preview path =================

function GcodeWriter(model, cfg) {
    this.cfg = cfg
    this.lines = []
    this.pos = null            // board coordinates of the head
    this.feed = null
    this.time = 0              // seconds
    this.drawLen = 0
    this.travelLen = 0
    this.preview = []          // [{ kind: 'travel' | 'draw', pts: [{x, y}] }]

    let ref = { bl: { x: 0, y: model.board.h }, tl: { x: 0, y: 0 }, c: { x: model.board.w / 2, y: model.board.h / 2 } }[cfg.origin]
    this.ref = ref
    this.yUp = cfg.yUp == 'up'
    this.bounds = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }
}

GcodeWriter.prototype.machine = function(p) {
    let x = p.x - this.ref.x + this.cfg.offX
    let y = (this.yUp ? this.ref.y - p.y : p.y - this.ref.y) + this.cfg.offY
    return { x: x, y: y }
}

GcodeWriter.prototype.n = function(v) {
    let s = (Math.round(v * 1000) / 1000).toFixed(3)
    s = s.replace(/\.?0+$/, '')
    return s == '-0' ? '0' : s
}

GcodeWriter.prototype.raw = function(line) { this.lines.push(line) }

// Comments are kept to plain ASCII and short lines for old senders and GRBL's line buffer
GcodeWriter.prototype.comment = function(text) {
    let ascii = String(text).replace(/[^\x20-\x7E]/g, '-')
    this.lines.push('; ' + ascii.slice(0, 70))
}

GcodeWriter.prototype.track = function(p, kind) {
    let m = this.machine(p)
    let b = this.bounds
    b.x0 = Math.min(b.x0, m.x); b.x1 = Math.max(b.x1, m.x)
    b.y0 = Math.min(b.y0, m.y); b.y1 = Math.max(b.y1, m.y)

    let last = this.preview[this.preview.length - 1]
    if (!last || last.kind != kind) {
        last = { kind: kind, pts: this.pos ? [this.pos] : [] }
        this.preview.push(last)
    }
    last.pts.push(p)
    this.pos = p
}

GcodeWriter.prototype.dist = function(p) {
    return this.pos ? Math.hypot(p.x - this.pos.x, p.y - this.pos.y) : 0
}

GcodeWriter.prototype.rapid = function(p) {
    let d = this.dist(p)
    let m = this.machine(p)
    this.raw(`G0 X${this.n(m.x)} Y${this.n(m.y)}`)
    this.time += d / this.cfg.travelFeed * 60
    this.travelLen += d
    this.track(p, 'travel')
}

GcodeWriter.prototype.line = function(p, feed, kind = 'draw') {
    let d = this.dist(p)
    let m = this.machine(p)
    let f = feed != this.feed ? ` F${Math.round(feed)}` : ''
    this.feed = feed
    this.raw(`G1 X${this.n(m.x)} Y${this.n(m.y)}${f}`)
    this.time += d / feed * 60
    if (kind == 'draw') this.drawLen += d
    else this.travelLen += d
    this.track(p, kind)
}

// Arc around centre c from angle a0 sweeping `sweep` radians (positive = visually clockwise), radius r
GcodeWriter.prototype.arc = function(c, r, a0, sweep, feed) {
    let segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)))
    let visualCW = sweep > 0
    let g = (visualCW == this.yUp) ? 'G2' : 'G3'      // flipping Y flips the sense of rotation
    let mc = this.machine(c)

    for (let s = 1; s <= segments; s++) {
        let a1 = a0 + sweep * s / segments
        let start = this.pos
        let end = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) }
        let ms = this.machine(start), me = this.machine(end)
        let f = feed != this.feed ? ` F${Math.round(feed)}` : ''
        this.feed = feed
        this.raw(`${g} X${this.n(me.x)} Y${this.n(me.y)} I${this.n(mc.x - ms.x)} J${this.n(mc.y - ms.y)}${f}`)

        // Preview: sample the arc
        let aStart = a0 + sweep * (s - 1) / segments
        for (let k = 1; k <= 4; k++) {
            let a = aStart + (a1 - aStart) * k / 4
            this.track({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }, 'draw')
        }
        this.pos = end
    }

    let len = Math.abs(sweep) * r
    this.time += len / feed * 60
    this.drawLen += len
}

GcodeWriter.prototype.dwell = function(seconds) {
    if (seconds > 0) {
        this.raw(`G4 P${this.n(seconds)}`)
        this.time += seconds
    }
}

GcodeWriter.prototype.pause = function(message) {
    this.comment(message)
    this.raw('M0')
}

GcodeWriter.prototype.header = function(title, model, extra) {
    let shape = TEMPLATE_SHAPE_NAMES[model.shape] || model.shape
    let originName = { bl: 'bottom-left corner', tl: 'top-left corner', c: 'centre' }[this.cfg.origin]
    this.comment(`${BRAND.tool}`)
    this.comment(`${title}`)
    this.comment(`${BRAND.sites.join(' | ')}`)
    this.comment(`(c) ${BRAND.year} ${BRAND.author} - Licensed under ${BRAND.license}`)
    this.comment(`Board: ${shape}, ${model.count} nails, ${Math.round(model.board.w)} x ${Math.round(model.board.h)} mm`)
    this.comment(`Work zero (X0 Y0): board ${originName}, Y ${this.yUp ? 'up' : 'down'}, offset ${this.cfg.offX}/${this.cfg.offY} mm`)
    for (let line of extra || []) this.comment(line)
    this.comment(`Set work zero before running, e.g. G10 L20 P1 X0 Y0`)
    this.raw('G21 ; millimetres')
    this.raw('G90 ; absolute positions')
    this.raw('G17 ; XY plane for arcs')
    this.raw('G94 ; feed in mm/min')
}

GcodeWriter.prototype.text = function() {
    return this.lines.join('\n') + '\n'
}

// ================= Job 1: plot the nail positions (and optionally pin numbers) =================

function PlotterNailOrder(model) {
    let n = model.nails.length
    if (model.layout == BORDER_MODE)
        return [...Array(n).keys()]

    // Grid / random: nearest neighbour keeps the travel short
    let left = new Set([...Array(n).keys()])
    let order = []
    let cur = { x: 0, y: model.board.h }

    while (left.size) {
        let best = -1, bestD = Infinity
        for (let i of left) {
            let p = model.nails[i]
            let d = (p.x - cur.x) ** 2 + (p.y - cur.y) ** 2
            if (d < bestD) { bestD = d; best = i }
        }
        order.push(best)
        left.delete(best)
        cur = model.nails[best]
    }

    return order
}

function BuildNailPlot(model, cfg) {
    let w = new GcodeWriter(model, cfg)
    let toolName = { servo: 'servo pen', z: 'Z-axis pen / drill', laser: 'laser' }[cfg.tool]
    let isLaser = cfg.tool == 'laser'
    let mark = isLaser && cfg.mark == 'dot' ? 'circle' : cfg.mark
    let markSize = isLaser && cfg.mark == 'dot' ? 0.5 : cfg.markSize

    w.header('Job 1 of 2: nail positions', model, [
        `Tool: ${toolName}. Mark: ${mark}, ${markSize} mm.`,
        isLaser ? 'Laser: needs GRBL laser mode ($32=1). Wear eye protection.' : null,
        cfg.tool == 'z' ? `Z up ${cfg.zUp} mm, Z down ${cfg.zDown} mm (Z0 = board surface)` : null
    ].filter(Boolean))

    let down, up
    if (cfg.tool == 'servo') {
        down = () => { w.raw(cfg.servoDown); w.dwell(cfg.servoDelay) }
        up = () => { w.raw(cfg.servoUp); w.dwell(cfg.servoDelay) }
    }
    else if (cfg.tool == 'z') {
        down = () => { w.raw(`G1 Z${w.n(cfg.zDown)} F${Math.round(cfg.plungeFeed)}`); w.feed = cfg.plungeFeed; w.time += Math.abs(cfg.zUp - cfg.zDown) / cfg.plungeFeed * 60 }
        up = () => { w.raw(`G0 Z${w.n(cfg.zUp)}`); w.time += 0.3 }
    }
    else {
        down = () => w.raw(`M3 S${Math.round(cfg.laserPower)}`)
        up = () => w.raw('M5')
    }

    up()

    let stroke = (pts) => {
        w.rapid(pts[0])
        down()
        if (pts.length == 1)
            w.dwell(cfg.tool == 'servo' ? 0.1 : 0)
        for (let i = 1; i < pts.length; i++)
            w.line(pts[i], cfg.drawFeed)
        up()
    }

    let step = cfg.numbers == 'all' ? 1 : cfg.numbers == 'off' ? 0 : +cfg.numbers
    let isBorder = model.layout == BORDER_MODE
    let fs = Math.max(2, model.fs)
    let order = PlotterNailOrder(model)

    for (let i of order) {
        let p = model.nails[i]
        let h = markSize / 2

        if (mark == 'dot')
            stroke([p])
        else if (mark == 'cross') {
            stroke([{ x: p.x - h, y: p.y }, { x: p.x + h, y: p.y }])
            stroke([{ x: p.x, y: p.y - h }, { x: p.x, y: p.y + h }])
        }
        else {
            let pts = []
            for (let k = 0; k <= 16; k++) {
                let a = k / 16 * 2 * Math.PI
                pts.push({ x: p.x + h * Math.cos(a), y: p.y + h * Math.sin(a) })
            }
            stroke(pts)
        }

        // Pin number, placed like on the printed template
        let label = i + 1
        if (step && (i == 0 || label % step == 0)) {
            let strokes
            if (isBorder) {
                let a = model.angles[i]
                let flip = a > 90 || a < -90
                let off = h + fs * 0.5
                let bx = p.x + Math.cos(a * Math.PI / 180) * off
                let by = p.y + Math.sin(a * Math.PI / 180) * off
                strokes = PlotterTextStrokes(String(label), bx, by, fs, flip ? a + 180 : a, flip ? 'end' : 'start', 'middle')
            }
            else {
                strokes = PlotterTextStrokes(String(label), p.x + h + 0.5, p.y - h - 0.5, fs, 0, 'start', 'bottom')
            }
            strokes.forEach(stroke)
        }
    }

    if (isLaser) w.raw('M5')
    w.comment('Done: all nail positions marked')
    w.raw('M2')
    return w
}

// ================= Job 2: wind the thread =================

// Distance from point p to segment ab
function PlotterSegDist(p, a, b) {
    let dx = b.x - a.x, dy = b.y - a.y
    let len2 = dx * dx + dy * dy
    let t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function PlotterWindingLimits(model, cfg) {
    let nailR = cfg.nailDia / 2, guideR = cfg.guideDia / 2
    return { min: nailR + guideR + 0.2, max: model.spacing - nailR - guideR - 0.2 }
}

function BuildWinding(model, sequence, cfg) {
    let w = new GcodeWriter(model, cfg)
    let N = model.nails
    let R = cfg.wrapR
    let dir = cfg.dir == 'cw' ? 1 : -1
    let lines = sequence.length - 1
    let lift = cfg.useZ && (cfg.lift == 'always' || (cfg.lift == 'auto' && model.layout != BORDER_MODE))
    let clearance = cfg.nailDia / 2 + cfg.guideDia / 2 + 0.3
    let centre = { x: model.board.w / 2, y: model.board.h / 2 }
    let angle = (from, to) => Math.atan2(to.y - from.y, to.x - from.x)
    let at = (c, a) => ({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) })
    let detours = 0

    w.header('Job 2 of 2: thread winding', model, [
        `${lines} lines. Wrap radius ${R} mm, ${cfg.dir == 'cw' ? 'clockwise' : 'counter-clockwise'}.`,
        cfg.useZ ? `Guide Z ${cfg.windZ} mm while winding, ${cfg.safeZ} mm to clear nails` : 'No Z moves: guide stays at a fixed height below the nail heads',
        `Nail numbers follow the board template (nail 1 = index 0).`
    ])

    // Start: thread tied to the first nail, guide on its circle facing the second nail
    let first = N[sequence[0]]
    let start = at(first, angle(first, N[sequence[1]]))

    if (cfg.useZ) { w.raw(`G0 Z${w.n(cfg.safeZ)}`); w.time += 0.5 }
    w.rapid(start)
    if (cfg.useZ) { w.raw(`G1 Z${w.n(cfg.windZ)} F600`); w.feed = 600; w.time += 2 }
    w.pause(`Tie the thread to nail ${sequence[0] + 1}, then press cycle start`)

    for (let k = 1; k <= lines; k++) {
        let j = sequence[k]
        let nail = N[j]
        let prev = N[sequence[k - 1]]
        let next = k < lines ? N[sequence[k + 1]] : null

        let aIn = angle(nail, prev)
        let aOut = next ? angle(nail, next) : aIn + Math.PI
        let entry = at(nail, aIn)

        // Travel to the side of this nail facing where the thread comes from
        if (lift) {
            w.raw(`G0 Z${w.n(cfg.safeZ)}`)
            w.rapid(entry)
            w.raw(`G1 Z${w.n(cfg.windZ)} F600`)
            w.feed = 600
            w.time += Math.abs(cfg.safeZ - cfg.windZ) / 600 * 60 * 2
        }
        else {
            // Steer round any other nail sitting too close to the straight path
            let from = w.pos
            let blocked = false
            for (let i = 0; i < N.length && !blocked; i++)
                if (i != j && i != sequence[k - 1] && PlotterSegDist(N[i], from, entry) < clearance)
                    blocked = true

            if (blocked) {
                let mid = { x: (from.x + entry.x) / 2, y: (from.y + entry.y) / 2 }
                let toC = Math.hypot(centre.x - mid.x, centre.y - mid.y) || 1
                let push = Math.min(toC, model.spacing * 3 + clearance)
                w.line({ x: mid.x + (centre.x - mid.x) / toC * push, y: mid.y + (centre.y - mid.y) / toC * push }, cfg.travelFeed, 'draw')
                detours++
            }

            w.line(entry, cfg.travelFeed, 'draw')
        }

        // Wrap: from the incoming side round to the outgoing side, always at least half a turn
        let sweep = dir > 0 ? aOut - aIn : aIn - aOut
        sweep = ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        if (sweep < Math.PI) sweep += 2 * Math.PI
        sweep += 2 * Math.PI * (cfg.turns - 1)
        w.arc(nail, R, aIn, dir * sweep, cfg.windFeed)

        if (cfg.pauseEvery > 0 && k % cfg.pauseEvery == 0 && k < lines)
            w.pause(`Pause: line ${k} of ${lines}. Check thread and tension, then resume`)
    }

    if (cfg.useZ) w.raw(`G0 Z${w.n(cfg.safeZ)}`)
    w.pause(`Finished. Tie off the thread at nail ${sequence[lines] + 1}`)
    w.raw('M2')
    w.detours = detours
    return w
}

// ================= Panel UI =================

(function() {
    const app = document.getElementById('generator-box')
    const panel = document.getElementById('panel-plotter')
    const preview = document.getElementById('plotter-preview')
    const info = document.getElementById('plotter-info')
    const warnBox = document.getElementById('plotter-warnings')
    const summary = document.getElementById('plotter-board')
    const sourceGroup = document.getElementById('plotter-source-group')
    const windBtn = document.getElementById('plotter-wind')
    const playBtn = document.getElementById('plotter-play')

    let cfg = Object.assign({}, PLOTTER_DEFAULTS)
    try {
        let saved = JSON.parse(localStorage.getItem('stringart-plotter') || '{}')
        for (let key in saved) if (key in PLOTTER_DEFAULTS) cfg[key] = saved[key]
    } catch (e) { }

    const save = () => { try { localStorage.setItem('stringart-plotter', JSON.stringify(cfg)) } catch (e) { } }

    // Number / text inputs: data-key names the setting
    panel.querySelectorAll('[data-key]').forEach(input => {
        let key = input.dataset.key
        if (input.type == 'checkbox') input.checked = !!cfg[key]
        else input.value = cfg[key]

        input.addEventListener('change', () => {
            if (input.type == 'checkbox') cfg[key] = input.checked
            else if (input.type == 'number') {
                let v = parseFloat(input.value)
                if (!isFinite(v)) v = PLOTTER_DEFAULTS[key]
                if (input.min !== '') v = Math.max(+input.min, v)
                if (input.max !== '') v = Math.min(+input.max, v)
                cfg[key] = v
                input.value = v
            }
            else cfg[key] = input.value.trim() || PLOTTER_DEFAULTS[key]
            save(); refresh()
        })
    })

    // Segmented choices: data-choice names the setting
    document.querySelectorAll('[data-choice]').forEach(group => {
        let key = group.dataset.choice
        group.querySelectorAll('[data-value]').forEach(btn => btn.addEventListener('click', () => {
            let v = btn.dataset.value
            cfg[key] = isNaN(+v) ? v : +v
            save(); refresh()
        }))
    })

    document.getElementById('plotter-source').querySelectorAll('[data-value]').forEach(btn =>
        btn.addEventListener('click', () => window.SetBoardTemplateSource(btn.dataset.value)))

    document.getElementById('plotter-edit-board').addEventListener('click', () => document.getElementById('tab-template').click())

    document.getElementById('plotter-reset').addEventListener('click', () => {
        cfg = Object.assign({}, PLOTTER_DEFAULTS, { view: cfg.view })
        panel.querySelectorAll('[data-key]').forEach(input => {
            if (input.type == 'checkbox') input.checked = !!cfg[input.dataset.key]
            else input.value = cfg[input.dataset.key]
        })
        save(); refresh()
    })

    let current = null      // { model, nailJob, windJob }
    let pending = false

    function refresh() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => { pending = false; render() })
    }

    function sequenceReady(t) {
        return t.model && t.model.source == 'art' && generator.isLineDrawing && generator.sequence && generator.sequence.length > 1
    }

    // Build both jobs from the current board and settings (also used by the Machine tab)
    function compute() {
        if (!window.GetBoardTemplate) return null
        let t = window.GetBoardTemplate()
        if (!t.model) return null
        let ready = sequenceReady(t)
        current = {
            model: t.model,
            nailJob: BuildNailPlot(t.model, cfg),
            windJob: ready ? BuildWinding(t.model, generator.sequence, cfg) : null,
            lines: ready ? generator.sequence.length - 1 : 0
        }
        return current
    }

    window.GetPlotterJobs = compute

    function render() {
        if (!app.classList.contains('mode-plotter') || !window.GetBoardTemplate)
            return

        let t = window.GetBoardTemplate()
        let model = t.model
        if (!model) return

        // Reflect settings in the UI
        document.querySelectorAll('[data-choice]').forEach(group =>
            group.querySelectorAll('[data-value]').forEach(b => b.setAttribute('aria-pressed', b.dataset.value == String(cfg[group.dataset.choice]))))
        panel.querySelectorAll('[data-tool]').forEach(el => el.hidden = el.dataset.tool != cfg.tool)
        panel.querySelectorAll('[data-needs-z]').forEach(el => el.hidden = !cfg.useZ)
        sourceGroup.hidden = !t.hasArt
        document.getElementById('plotter-source').querySelectorAll('[data-value]').forEach(b => b.setAttribute('aria-pressed', b.dataset.value == model.source))

        let shape = TEMPLATE_SHAPE_NAMES[model.shape]
        summary.innerHTML = `<b>${shape}</b>, ${model.count} nails ${TEMPLATE_LAYOUT_NAMES[model.layout] || ''}<br>` +
            `${Math.round(model.board.w)} × ${Math.round(model.board.h)} mm, nails ${Math.round(model.inset)} mm from edge, ${model.spacing.toFixed(1)} mm apart`

        let ready = sequenceReady(t)
        windBtn.disabled = !ready
        windBtn.title = ready ? '' : 'Generate string art first, then choose "Current string art" above'

        compute()
        let nailJob = current.nailJob
        let windJob = current.windJob

        if (cfg.view == 'wind' && !windJob) cfg.view = 'nails'
        document.querySelectorAll('#plotter-view [data-value]').forEach(b => {
            b.setAttribute('aria-pressed', b.dataset.value == cfg.view)
            if (b.dataset.value == 'wind') b.disabled = !windJob
        })

        let job = cfg.view == 'wind' ? windJob : nailJob
        drawPreview(model, job, cfg.view)
        showInfo(model, job, ready)
    }

    function fmtTime(s) {
        let h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
        return h ? `${h} h ${m} min` : `${Math.max(1, m)} min`
    }

    function showInfo(model, job, ready) {
        let b = job.bounds
        let lineCount = job.lines.length
        info.innerHTML =
            `<span class="stat"><b>${lineCount.toLocaleString('en')}</b> G-code lines</span>` +
            `<span class="stat"><b>~${fmtTime(job.time)}</b> run time</span>` +
            `<span class="stat"><b>${(job.drawLen / 1000).toFixed(1)} m</b> ${cfg.view == 'wind' ? 'guide path' : 'drawn'}</span>` +
            `<span class="stat">X ${b.x0.toFixed(0)} to ${b.x1.toFixed(0)}, Y ${b.y0.toFixed(0)} to ${b.y1.toFixed(0)} mm</span>`

        let warnings = []
        let lim = PlotterWindingLimits(model, cfg)
        if (cfg.wrapR < lim.min)
            warnings.push(`Wrap radius ${cfg.wrapR} mm is too small: the guide would touch the nail. Use at least ${lim.min.toFixed(1)} mm.`)
        if (cfg.wrapR > lim.max)
            warnings.push(lim.max > lim.min ?
                `Wrap radius ${cfg.wrapR} mm is too big for nails ${model.spacing.toFixed(1)} mm apart: the guide would hit neighbouring nails. Use at most ${lim.max.toFixed(1)} mm.` :
                `Nails ${model.spacing.toFixed(1)} mm apart leave no room for this nail and guide size. Use fewer nails, a bigger board, or a thinner guide.`)
        if (model.layout != BORDER_MODE && !cfg.useZ)
            warnings.push('Grid and random layouts have nails across the board: turn on the Z axis so the guide can lift over them.')
        if (cfg.useZ && cfg.windZ >= cfg.safeZ)
            warnings.push('Winding Z must be lower than the safe Z.')
        if (cfg.numbers != 'off' && cfg.tool == 'z' && cfg.zDown < 0)
            warnings.push(`Pin numbers are written at Z down (${cfg.zDown} mm): fine for a pen or engraving bit, but turn numbers off when drilling pilot holes.`)
        if (cfg.numbers != 'off' && model.fs < 2)
            warnings.push('Nails are close together, so plotted numbers may overlap. Try "Every 5" or "Every 10".')
        if (!ready)
            warnings.push('Thread winding needs a generated string art and "Nails from: Current string art".')
        if (current.windJob && current.windJob.detours)
            warnings.push(`${current.windJob.detours} travel moves were routed round nails sitting close to the straight path.`)

        warnBox.innerHTML = warnings.map(w => `<li>${w}</li>`).join('')
        warnBox.hidden = warnings.length == 0
    }

    function drawPreview(model, job, view) {
        let pad = Math.max(model.board.w, model.board.h) * 0.06
        let W = model.board.w + 2 * pad, H = model.board.h + 2 * pad
        let r = (v) => Math.round(v * 100) / 100
        let path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r(p.x + pad)} ${r(p.y + pad)}`).join('')
        let o = model.outline
        let parts = []

        if (o.type == 'circle') parts.push(`<circle cx="${r(o.cx + pad)}" cy="${r(o.cy + pad)}" r="${r(o.r)}" class="pl-board" />`)
        else if (o.type == 'ellipse') parts.push(`<ellipse cx="${r(o.cx + pad)}" cy="${r(o.cy + pad)}" rx="${r(o.rx)}" ry="${r(o.ry)}" class="pl-board" />`)
        else if (o.type == 'polygon') parts.push(`<polygon points="${o.points.map(p => `${r(p.x + pad)},${r(p.y + pad)}`).join(' ')}" class="pl-board" />`)
        else parts.push(`<rect x="${r(pad)}" y="${r(pad)}" width="${r(o.w)}" height="${r(o.h)}" class="pl-board" />`)

        let nailR = Math.max(0.6, cfg.nailDia / 2)
        parts.push(`<g class="pl-nails">${model.nails.map(p => `<circle cx="${r(p.x + pad)}" cy="${r(p.y + pad)}" r="${r(nailR)}" />`).join('')}</g>`)

        let travel = job.preview.filter(s => s.kind == 'travel').map(s => path(s.pts)).join('')
        let draw = job.preview.filter(s => s.kind == 'draw').map(s => path(s.pts)).join('')
        let sw = Math.max(0.25, W / 900)
        parts.push(`<path d="${travel}" class="pl-travel" stroke-width="${r(sw)}" stroke-dasharray="${r(sw * 4)} ${r(sw * 3)}" />`)
        parts.push(`<path d="${draw}" class="${view == 'wind' ? 'pl-thread' : 'pl-draw'} pl-anim" stroke-width="${r(view == 'wind' ? sw * 0.8 : sw * 1.6)}" pathLength="1" />`)

        // Work zero marker with X / Y arrows, so the orientation can be checked against the machine
        let ref = job.ref
        let ox = ref.x - cfg.offX + pad
        let oy = (job.yUp ? ref.y + cfg.offY : ref.y - cfg.offY) + pad
        let L = Math.max(model.board.w, model.board.h) * 0.12
        let ySign = job.yUp ? -1 : 1
        parts.push(`<g class="pl-origin" stroke-width="${r(sw * 2)}">` +
            `<line x1="${r(ox)}" y1="${r(oy)}" x2="${r(ox + L)}" y2="${r(oy)}" /><line x1="${r(ox)}" y1="${r(oy)}" x2="${r(ox)}" y2="${r(oy + ySign * L)}" />` +
            `<circle cx="${r(ox)}" cy="${r(oy)}" r="${r(sw * 4)}" />` +
            `<text x="${r(ox + L + sw * 4)}" y="${r(oy + sw * 5)}" font-size="${r(L * 0.35)}">X</text>` +
            `<text x="${r(ox - sw * 4)}" y="${r(oy + ySign * (L + sw * 4) + (ySign < 0 ? 0 : L * 0.3))}" font-size="${r(L * 0.35)}" text-anchor="end">Y</text></g>`)

        preview.innerHTML = `<svg viewBox="${r(-pad * 0.6)} ${r(-pad * 0.6)} ${r(W + pad * 1.2)} ${r(H + pad * 1.2)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Toolpath preview">${parts.join('')}</svg>`
        fitPreview()
    }

    function fitPreview() {
        let svg = preview.querySelector('svg')
        if (!svg) return
        let vb = svg.viewBox.baseVal
        let k = Math.min(preview.clientWidth / vb.width, preview.clientHeight / vb.height)
        svg.style.width = Math.floor(vb.width * k) + 'px'
        svg.style.height = Math.floor(vb.height * k) + 'px'
    }

    window.addEventListener('resize', fitPreview)

    // Play: trace the toolpath
    playBtn.addEventListener('click', () => {
        let p = preview.querySelector('.pl-anim')
        if (!p) return
        p.classList.remove('playing')
        void p.getBoundingClientRect()
        p.classList.add('playing')
    })

    function download(job, name) {
        DownloadBlob(new Blob([job.text()], { type: 'text/plain' }), name)
    }

    document.getElementById('plotter-nails').addEventListener('click', () => {
        if (!current) return
        let m = current.model
        download(current.nailJob, `nails-${m.shape}-${m.count}-${Math.round(Math.max(m.board.w, m.board.h))}mm.gcode`)
    })

    windBtn.addEventListener('click', () => {
        if (!current || !current.windJob) return
        let m = current.model
        download(current.windJob, `winding-${m.shape}-${m.count}-nails-${generator.sequence.length - 1}-lines.gcode`)
    })

    document.addEventListener('stringart:template', refresh)
    document.addEventListener('stringart:mode', (e) => { if (e.detail.mode == 'plotter') refresh() })
    for (let name of ['stop', 'reset', 'imageloaded'])
        document.addEventListener('stringart:' + name, refresh)
})()
