/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/init.js - Generator set-up: canvases, controls, nail placement.
 *
 * Copyright (C) 2026 Chanchal Sakarde
 * Based on StringArtGenerator by dronperminov (https://github.com/dronperminov/StringArtGenerator)
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

StringArtGenerator.prototype.InitCanvas = function(canvas) {
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')
    this.width = this.canvas.clientWidth
    this.height = this.canvas.clientHeight

    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = this.width * this.dpr
    this.canvas.height = this.height * this.dpr
    this.ctx.scale(this.dpr, this.dpr)

    this.fakeCanvas = document.createElement('canvas')
    this.fakeCanvas.width = this.width * this.dpr
    this.fakeCanvas.height = this.height * this.dpr
    this.fakeCtx = this.fakeCanvas.getContext('2d')
    this.fakeCtx.scale(this.dpr, this.dpr)

    // Transparent layer on top of the art for nail numbers (never read back into the generator)
    this.overlay = document.getElementById('overlay')
    this.overlay.width = this.width * this.dpr
    this.overlay.height = this.height * this.dpr
    this.overlayCtx = this.overlay.getContext('2d')
    this.overlayCtx.scale(this.dpr, this.dpr)

    // Back of the flip card: the uploaded photo in colour, cropped exactly like the board
    this.origCanvas = document.getElementById('original')
    this.origCanvas.width = this.width * this.dpr
    this.origCanvas.height = this.height * this.dpr
    this.origCtx = this.origCanvas.getContext('2d')
    this.origCtx.scale(this.dpr, this.dpr)

    // If the browser wipes and restores a canvas (common on phones when switching apps), repaint it
    for (let c of [this.canvas, this.overlay, this.origCanvas, this.fakeCanvas])
        c.addEventListener('contextrestored', () => this.RedrawCurrent())

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState == 'visible')
            this.RedrawCurrent()
    })

    this.pixelCanvas = document.createElement('canvas')
    this.pixelCanvas.width = this.width
    this.pixelCanvas.height = this.height
    this.pixelCtx = this.pixelCanvas.getContext('2d')

    this.x0 = this.width / 2
    this.y0 = this.height / 2
    this.radius = Math.min(this.width, this.height) / 2 - PADDING
}

StringArtGenerator.prototype.InitSelectButton = function() {
    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = 'image/*'
    this.fileInput.addEventListener('change', (e) => this.SelectImage(e))

    this.selectBtn = document.getElementById('select-btn')
    this.selectBtn.addEventListener('click', () => this.fileInput.click())
}

StringArtGenerator.prototype.InitControls = function() {
    this.dragDropBox = document.getElementById('drag-drop-box')
    this.controlsBox = document.getElementById('controls-box')

    this.formTypeBox = document.getElementById('form-type-box')
    this.formTypeBox.addEventListener('change', () => this.UpdateForm())

    this.invertBox = document.getElementById('invert-box')
    this.invertBox.addEventListener('change', () => this.DrawLoadedImage())

    this.contrastBox = document.getElementById('contrast-box')
    this.contrastValue = document.getElementById('contrast-value')
    this.contrastBox.addEventListener('input', () => this.UpdateContrast())
    this.contrastBox.addEventListener('change', () => { this.UpdateContrast(); this.DrawLoadedImage() })

    this.brightnessBox = document.getElementById('brightness-box')
    this.brightnessValue = document.getElementById('brightness-value')
    this.brightnessBox.addEventListener('input', () => this.UpdateBrightness())
    this.brightnessBox.addEventListener('change', () => { this.UpdateBrightness(); this.DrawLoadedImage() })

    this.nailsModeBox = document.getElementById('nails-mode-box')
    this.nailsModeBox.addEventListener('change', () => this.InitNails())

    this.nailsCountBox = document.getElementById('nails-count-box')
    this.nailsCountBox.addEventListener('change', () => this.InitNails())

    this.nailNumbersBox = document.getElementById('nail-numbers-box')
    this.nailNumbersBox.addEventListener('change', () => this.DrawNailNumbers())

    this.linesCountBox = document.getElementById('lines-count-box')

    this.linesWeightBox = document.getElementById('lines-weight-box')
    this.linesWeightBox.addEventListener('input', () => this.UpdateWeight())
    this.linesWeightBox.addEventListener('change', () => this.UpdateWeight())
    this.linesWeightValue = document.getElementById('lines-weight-value')

    this.linesColorBox = document.getElementById('lines-color-box')

    this.backgroundColorBox = document.getElementById('background-color-box')
    this.backgroundColorBox.addEventListener('change', () => this.DrawLoadedImage())
    this.backgroundColorBox.addEventListener('input', () => this.DrawLoadedImage())

    this.infoBox = document.getElementById('info-box')

    this.generateBtn = document.getElementById('generate-btn')
    this.generateBtn.addEventListener('click', () => this.Generate())

    this.resetBtn = document.getElementById('reset-btn')
    this.resetBtn.addEventListener('click', () => this.Reset(!this.isLineDrawing))

    this.statusBox = document.getElementById('status-box')

    this.controls = [
        this.selectBtn,
        this.invertBox,
        this.contrastBox,
        this.brightnessBox,
        this.formTypeBox,
        this.nailsModeBox,
        this.nailsCountBox,
        this.linesCountBox,
        this.linesWeightBox,
        this.linesColorBox,
        this.backgroundColorBox,
        this.resetBtn
    ]

    this.UpdateContrast()
    this.UpdateBrightness()
}

StringArtGenerator.prototype.InitSave = function() {
    this.saveBox = document.getElementById('save-box')

    this.saveTypeBox = document.getElementById('save-type-box')
    this.saveBtn = document.getElementById('save-btn')
    this.saveBtn.addEventListener('click', () => this.Save())
}

StringArtGenerator.prototype.InitEvents = function() {
    this.touches = []

    for (let target of [this.canvas, this.origCanvas]) {
        target.addEventListener('mousedown', (e) => this.MouseDown(e))
        target.addEventListener('mousemove', (e) => this.MouseMove(e))
        target.addEventListener('mouseup', (e) => this.MouseUp(e))
        target.addEventListener('mouseleave', (e) => this.MouseUp(e))
        target.addEventListener('wheel', (e) => this.MouseWheel(e), { passive: false })

        target.addEventListener('touchstart', (e) => { this.TouchStart(e) }, { passive: false })
        target.addEventListener('touchmove', (e) => { this.TouchMove(e) }, { passive: false })
        target.addEventListener('touchend', (e) => { this.TouchEnd(e) })
    }

    let generator = document.getElementById('generator-box')
    generator.addEventListener('dragover', (e) => this.DragOver(e))
    generator.addEventListener('dragleave', (e) => this.DragLeave(e))
    generator.addEventListener('drop', (e) => this.Drop(e))
}

StringArtGenerator.prototype.Interpolate = function(a, b, t) {
    return a * t + b * (1 - t)
}

StringArtGenerator.prototype.GetCircleNail = function(t) {
    let x = this.x0 + this.radius * Math.cos(t)
    let y = this.y0 + this.radius * Math.sin(t)

    return {x: x, y: y}
}

// Nails around a rectangle, spaced evenly and numbered in one continuous clockwise loop:
// nail 1 at the top-right corner, down the right side, along the bottom, up the left side, along the top.
StringArtGenerator.prototype.GetRectNail = function(angle, x0, y0, width, height) {
    let t = angle / (2 * Math.PI)
    let aspectRatio = width / height
    let t1 = 0.5 / (1 + aspectRatio)       // share of the perimeter taken by one vertical side
    let ts = [0, t1, 0.5, 0.5 + t1, 1]
    let left = x0 - width / 2, right = x0 + width / 2
    let top = y0 - height / 2, bottom = y0 + height / 2
    let lerp = (a, b, u) => a + (b - a) * u

    if (t < ts[1])
        return { x: right, y: lerp(top, bottom, (t - ts[0]) / (ts[1] - ts[0])) }

    if (t < ts[2])
        return { x: lerp(right, left, (t - ts[1]) / (ts[2] - ts[1])), y: bottom }

    if (t < ts[3])
        return { x: left, y: lerp(bottom, top, (t - ts[2]) / (ts[3] - ts[2])) }

    return { x: lerp(left, right, (t - ts[3]) / (ts[4] - ts[3])), y: top }
}

StringArtGenerator.prototype.InitBorderNails = function(nailsCount) {
    let angle = 2 * Math.PI / nailsCount
    let nails = []

    for (let i = 0; i < nailsCount; i++) {
        let nail = {x: 0, y: 0}
        let t = i * angle

        if (this.formType == CIRCLE_FORM) {
            nail = this.GetCircleNail(t)
        }
        else if (this.formType == RECT_FORM) {
            nail = this.GetRectNail(t, this.x0, this.y0, this.width - 2*PADDING, this.height - 2*PADDING)
        }
        else if (this.formType == ALBUM_FORM) {
            let size = this.width - 2*PADDING
            nail = this.GetRectNail(t, this.x0, this.y0, size, size / Math.sqrt(2))
        }
        else if (this.formType == PORTRAIT_FORM) {
            let size = this.height - 2*PADDING
            nail = this.GetRectNail(t, this.x0, this.y0, size / Math.sqrt(2), size)
        }
        else if (this.IsOutlineForm()) {
            return this.InitOutlineBorderNails(nailsCount)
        }
        else if (this.formType == IMAGE_FORM) {
            let width = this.imgWidth - 2 * PADDING
            let height = this.imgHeight - 2 * PADDING
            nail = this.GetRectNail(t, this.imgWidth / 2, this.imgHeight / 2, width, height)
        }

        // Exact position kept for the printable template; the generator works on whole pixels
        nail.fx = nail.x
        nail.fy = nail.y
        nail.x = Math.round(nail.x)
        nail.y = Math.round(nail.y)

        nails.push(nail)
    }

    return nails
}

StringArtGenerator.prototype.InitGridNails = function(nailsCount) {
    let nails = []
    let width = this.imgBbox.xmax - this.imgBbox.xmin
    let height = this.imgBbox.ymax - this.imgBbox.ymin
    let aspectRatio = width / height


    let scale = this.formType == CIRCLE_FORM ? 2 / Math.sqrt(Math.PI) : 1
    let wc = Math.round(Math.sqrt(nailsCount * aspectRatio * scale))
    let hc = Math.round(Math.sqrt(nailsCount / aspectRatio * scale) * scale)

    // Hexagons / ovals: make the grid denser by (bounding box area / shape area) so roughly nailsCount land inside
    let outline = this.IsOutlineForm() ? this.GetShapeOutline(0) : null
    if (outline) {
        let k = width * height / this.GetPolygonArea(outline)
        wc = Math.round(Math.sqrt(nailsCount * aspectRatio * k))
        hc = Math.round(Math.sqrt(nailsCount / aspectRatio * k))
    }

    let x0 = (this.imgBbox.xmin + this.imgBbox.xmax) / 2
    let y0 = (this.imgBbox.ymin + this.imgBbox.ymax) / 2

    for (let i = 0; i < hc; i++) {
        for (let j = 0; j < wc; j++) {
            let x = this.Interpolate(this.imgBbox.xmin + PADDING, this.imgBbox.xmax - PADDING, j / (wc - 1))
            let y = this.Interpolate(this.imgBbox.ymin + PADDING, this.imgBbox.ymax - PADDING, i / (hc - 1))

            if (this.formType == CIRCLE_FORM) {
                let dx = x - x0
                let dy = y - y0

                if (dx * dx + dy * dy > this.radius * this.radius)
                    continue
            }
            else if (outline && !this.IsInsidePolygon(x, y, outline)) {
                continue
            }

            // Exact position kept for the printable template; the generator works on whole pixels
            nails.push({
                x: Math.round(x),
                y: Math.round(y),
                fx: x,
                fy: y
            })
        }
    }

    return nails
}

StringArtGenerator.prototype.InitGridRandom = function(nailsCount) {
    let nails = []
    let outline = this.IsOutlineForm() ? this.GetShapeOutline(0) : null

    for (let i = 0; i < nailsCount; i++) {
        let x, y

        if (this.formType == CIRCLE_FORM) {
            let t = Math.random() * 2 * Math.PI
            let radius = this.radius * Math.sqrt(Math.random())

            x = (this.imgBbox.xmin + this.imgBbox.xmax) / 2 + radius * Math.cos(t)
            y = (this.imgBbox.ymin + this.imgBbox.ymax) / 2 + radius * Math.sin(t)
        }
        else if (outline) {
            // Keep drawing random points until one lands inside the hexagon / oval
            do {
                x = this.imgBbox.xmin + Math.random() * (this.imgBbox.xmax - this.imgBbox.xmin)
                y = this.imgBbox.ymin + Math.random() * (this.imgBbox.ymax - this.imgBbox.ymin)
            } while (!this.IsInsidePolygon(x, y, outline))
        }
        else {
            x = this.imgBbox.xmin + Math.random() * (this.imgBbox.xmax - this.imgBbox.xmin)
            y = this.imgBbox.ymin + Math.random() * (this.imgBbox.ymax - this.imgBbox.ymin)
        }

        nails.push({
            x: Math.round(x),
            y: Math.round(y),
            fx: x,
            fy: y
        })
    }

    return nails
}

StringArtGenerator.prototype.InitNails = function() {
    let nailsMode = this.nailsModeBox.value
    let nailsCount = +this.nailsCountBox.value
    this.nails = []

    if (nailsMode == BORDER_MODE) {
        this.nails = this.InitBorderNails(nailsCount)
    }
    else if (nailsMode == GRID_MODE) {
        this.nails = this.InitGridNails(nailsCount)
    }
    else if (nailsMode == RANDOM_MODE) {
        this.nails = this.InitGridRandom(nailsCount)
    }

    this.DrawNailNumbers()
}

StringArtGenerator.prototype.LineRasterization = function(x1, y1, x2, y2) {
    let line = new Set()

    let delta_x = Math.abs(x2 - x1)
    let delta_y = Math.abs(y2 - y1)

    let sign_x = Math.sign(x2 - x1)
    let sign_y = Math.sign(y2 - y1)

    let error = delta_x - delta_y

    while (x1 != x2 || y1 != y2) {
        line.add(y1 * this.width + x1)
        let error2 = error * 2

        if (error2 > -delta_y) {
            error -= delta_y
            x1 += sign_x
        }

        if (error2 < delta_x) {
            error += delta_x
            y1 += sign_y
        }
    }

    line.add(y2 * this.width + x2)
    return line
}

StringArtGenerator.prototype.InitBbox = function() {
    this.imgBbox = {
        xmin: 0,
        ymin: 0,
        xmax: this.width,
        ymax: this.height
    }

    if (this.formType == ALBUM_FORM) {
        let height = Math.round(this.width / Math.sqrt(2))
        this.imgBbox.ymin = Math.round((this.height - height) / 2)
        this.imgBbox.ymax = this.imgBbox.ymin + height
    }
    else if (this.formType == PORTRAIT_FORM) {
        let width = Math.round(this.height / Math.sqrt(2))
        this.imgBbox.xmin = Math.round((this.width - width) / 2)
        this.imgBbox.xmax = this.imgBbox.xmin + width
    }
    else if (this.formType == IMAGE_FORM) {
        this.imgBbox.xmax = this.imgWidth
        this.imgBbox.ymax = this.imgHeight
    }
    else if (this.IsOutlineForm()) {
        let outline = this.GetShapeOutline(PADDING / 2)
        this.imgBbox.xmin = Math.max(0, Math.floor(Math.min(...outline.map(p => p.x))))
        this.imgBbox.xmax = Math.min(this.width, Math.ceil(Math.max(...outline.map(p => p.x))))
        this.imgBbox.ymin = Math.max(0, Math.floor(Math.min(...outline.map(p => p.y))))
        this.imgBbox.ymax = Math.min(this.height, Math.ceil(Math.max(...outline.map(p => p.y))))
    }

    this.NormalizePoint()
}