/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/string_art_generator.js - String art generator core: generation loop, exports.
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

function StringArtGenerator(canvas) {
    this.InitCanvas(canvas)
    this.InitSelectButton()
    this.InitControls()
    this.InitSave()
    this.InitEvents()
}

StringArtGenerator.prototype.SelectImage = function(e) {
    let files = this.fileInput.files

    if (files.length != 1)
        return

    let image = new Image()
    image.onload = () => this.LoadImage(image)
    image.src = URL.createObjectURL(files[0])

    this.fileInput.value = ''
}

StringArtGenerator.prototype.LoadImage = function(image) {
    this.image = image
    this.isLineDrawing = false

    this.Reset()

    if (this.formType === undefined || this.formType == IMAGE_FORM) {
        this.formType = this.formTypeBox.value
        this.InitNails()
    }

    this.generateBtn.removeAttribute('disabled')
    this.nailNumbersBox.removeAttribute('disabled')
    this.Notify('imageloaded')
}

// Lets the page UI react to what the generator is doing (see js/ui.js)
StringArtGenerator.prototype.Notify = function(name, detail = {}) {
    document.dispatchEvent(new CustomEvent('stringart:' + name, { detail: detail }))
}

StringArtGenerator.prototype.UpdateForm = function() {
    let needInitArt = this.formType != this.formTypeBox.value
    this.formType = this.formTypeBox.value

    this.InitBbox()
    this.DrawLoadedImage()

    if (needInitArt)
        this.InitNails()
}

StringArtGenerator.prototype.ToSignString = function(value) {
    if (value > 0)
        return `+${value}`

    if (value < 0)
        return `-${-value}`

    return '0'
}

StringArtGenerator.prototype.UpdateContrast = function() {
    let value = +this.contrastBox.value
    let contrast = 1 + value / 100

    this.contrastValue.innerHTML = this.ToSignString(value)
    this.contrastTable = []

    for (let i = 0; i < 256; i++)
        this.contrastTable[i] = this.LimitPixel((i - 128) * contrast + 128)
}

StringArtGenerator.prototype.UpdateBrightness = function() {
    let value = +this.brightnessBox.value
    let brightness = 1 + value / 100

    this.brightnessValue.innerHTML = this.ToSignString(+this.brightnessBox.value)
    this.brightnessTable = []

    for (let i = 0; i < 256; i++)
        this.brightnessTable[i] = this.LimitPixel(i * brightness)
}

StringArtGenerator.prototype.UpdateWeight = function() {
    let value = +this.linesWeightBox.value
    this.linesWeightValue.innerHTML = `${value}%`
}

StringArtGenerator.prototype.GetPixels = function() {
    this.pixelCtx.drawImage(this.canvas, 0, 0, this.width, this.height)
    let data = this.pixelCtx.getImageData(0, 0, this.width, this.height).data
    let pixels = []

    for (let i = 0; i < data.length; i += 4)
        pixels.push(this.GetLightness(data[i], data[i + 1], data[i + 2]))

    return pixels
}

StringArtGenerator.prototype.GetLineLightness = function(line) {
    let lightness = 0

    for (let index of line)
        lightness += this.pixels[index]

    return lightness / line.size
}

StringArtGenerator.prototype.GetNextNail = function(nail) {
    let nextNail = nail
    let nextLine = null
    let minLightness = Infinity

    for (let i = 0; i < this.nails.length; i++) {
        if (i == nail)
            continue

        let line = this.LineRasterization(this.nails[i].x, this.nails[i].y, this.nails[nail].x, this.nails[nail].y)
        let lightness = this.GetLineLightness(line)

        if (lightness < minLightness) {
            minLightness = lightness
            nextNail = i
            nextLine = line
        }
    }

    return {
        nail: nextNail,
        line: nextLine
    }
}

StringArtGenerator.prototype.RemoveLine = function(line, lineWeight) {
    for (let index of line)
        this.pixels[index] = Math.min(255, this.pixels[index] + lineWeight * this.dpr)
}

StringArtGenerator.prototype.TimeToString = function(delta) {
    delta = Math.floor(delta)

    let milliseconds = `${delta % 1000}`.padStart(3, '0')
    let seconds = `${Math.floor(delta / 1000) % 60}`.padStart(2, '0')
    let minutes = `${Math.floor(delta / 60000)}`.padStart(2, '0')

    return `${minutes}:${seconds}.${milliseconds}`
}

StringArtGenerator.prototype.ShowInfo = function(linesCount, totalCount, startTime) {
    let currTime = performance.now()
    let time = this.TimeToString(currTime - startTime)
    let lost = this.TimeToString((currTime - startTime) / (totalCount - linesCount) * linesCount)
    let avg = ((currTime - startTime) / (totalCount - linesCount)).toFixed(2)

    let done = totalCount - linesCount

    this.infoBox.innerHTML =
        `<span class="stat"><b>${done.toLocaleString('en')}</b> of ${totalCount.toLocaleString('en')} lines</span>` +
        `<span class="stat"><b>${time}</b> elapsed</span>` +
        `<span class="stat"><b>${lost}</b> remaining</span>` +
        `<span class="stat"><b>${avg}</b> ms per line</span>`

    this.Notify('progress', { done: done, total: totalCount })
}

StringArtGenerator.prototype.GetActions = function() {
    if ('ontouchstart' in window)
        return '<span class="hint">Pinch to zoom and drag to position the photo on the board, then press <b>Generate</b>.</span>'

    return '<span class="hint">Scroll to zoom and drag to position the photo on the board, then press <b>Generate</b>.</span>'
}

StringArtGenerator.prototype.GetLineWeight = function() {
    return this.LimitPixel(+this.linesWeightBox.value / 100 * 255)
}

StringArtGenerator.prototype.GetLineColor = function() {
    let color = this.linesColorBox.value
    let weight = this.GetLineWeight()

    return `${color}${weight.toString(16).padStart(2, '0')}`
}

StringArtGenerator.prototype.ResetImage = function() {
    this.imgWidth = this.image.width
    this.imgHeight = this.image.height
    let aspectRatio = this.imgWidth / this.imgHeight

    if (this.imgWidth > this.imgHeight) {
        this.imgWidth = this.width
        this.imgHeight = Math.round(this.width / aspectRatio)
    }
    else {
        this.imgHeight = this.height
        this.imgWidth = Math.round(this.imgHeight * aspectRatio)
    }

    this.imgX = 0
    this.imgY = 0
    this.imgScale = 1

    this.InitBbox()
}

StringArtGenerator.prototype.Reset = function(needResetImage = true) {
    if (needResetImage)
        this.ResetImage()

    this.saveBox.style.display = 'none'
    this.infoBox.innerHTML = this.GetActions()
    this.isGenerating = false
    this.isLineDrawing = false
    this.finished = false
    this.generateBtn.value = 'Generate'
    this.generateBtn.classList.remove('is-next')
    this.Notify('reset')

    for (let control of this.controls)
        control.removeAttribute('disabled')

    this.DrawLoadedImage()
}

StringArtGenerator.prototype.StartGenerate = function() {
    this.isGenerating = !this.isGenerating

    // Second click = pause. The running loop notices isGenerating == false and stops itself.
    if (!this.isGenerating)
        return false

    this.saveBox.style.display = 'none'
    this.infoBox.innerHTML = ''

    if (!this.isLineDrawing) {
        this.sequence = []
        this.DrawLoadedImage()

        this.pixels = this.GetPixels()
        this.isLineDrawing = true
        this.Clear(this.ctx)
        this.DrawNails()
    }

    for (let control of this.controls)
        control.setAttribute('disabled', '')

    this.generateBtn.value = 'Pause'
    this.Notify('start')
    return true
}

StringArtGenerator.prototype.EndGenerate = function() {
    this.saveBox.style.display = ''
    this.isGenerating = false

    // Finished: the button moves the user on to the next step. Paused: it continues this run.
    // The number of lines is fixed once a run starts (Reset to change it).
    this.finished = this.sequence.length - 1 >= this.targetLines
    this.generateBtn.value = this.finished ? 'Next: Template →' : 'Continue'
    this.generateBtn.classList.toggle('is-next', this.finished)

    this.resetBtn.removeAttribute('disabled')
    this.selectBtn.removeAttribute('disabled')
    this.Notify('stop', { lines: this.sequence.length - 1, finished: this.finished })
}

StringArtGenerator.prototype.GenerateIteration = function(nail, linesCount, totalCount, lineWeight, lineColor, startTime) {
    this.sequence.push(nail)
    this.ShowInfo(linesCount, totalCount, startTime)

    if (linesCount == 0 || !this.isGenerating) {
        this.EndGenerate()
        return
    }

    let next = this.GetNextNail(nail)
    this.RemoveLine(next.line, lineWeight)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)     // see ApplyScale
    this.DrawLine(this.nails[nail], this.nails[next.nail], lineColor)

    window.requestAnimationFrame(() => this.GenerateIteration(next.nail, linesCount - 1, totalCount, lineWeight, lineColor, startTime))
}

StringArtGenerator.prototype.Generate = function() {
    if (this.finished) {
        this.Notify('next')            // "Next: Template →"
        return
    }

    if (!this.isLineDrawing)
        this.targetLines = +this.linesCountBox.value

    if (!this.StartGenerate())
        return

    // A fresh run draws the chosen number of lines; Continue draws only what is left of it
    let linesCount = this.targetLines - Math.max(0, this.sequence.length - 1)
    let totalCount = this.targetLines
    let lineWeight = this.GetLineWeight()
    let lineColor = this.GetLineColor()
    let startTime = performance.now()

    // When continuing, resume from the nail the thread is currently on
    // (it is popped here and pushed back by the first iteration).
    let startNail = this.sequence.length > 0 ? this.sequence.pop() : 0

    this.GenerateIteration(startNail, linesCount, totalCount, lineWeight, lineColor, startTime)
}

StringArtGenerator.prototype.ToStringArt = function() {
    return JSON.stringify({
        'about': BrandMetadata(),
        'nails': this.nails.map(p => ({ x: p.x, y: p.y })),
        'color': this.GetLineColor(),
        'background': this.backgroundColorBox.value,
        'sequence': this.sequence
    }, null, '    ')
}

StringArtGenerator.prototype.ToSVG = function() {
    let footer = Math.round(this.width * 0.12)
    let totalH = this.height + footer
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`
    svg += `<!-- ${BRAND.tool} | ${BRAND.sitesLine} | ${BRAND.copyrightLine} | ${BRAND.licenseUrl} -->\n`
    svg += `<svg viewBox="0 0 ${this.width} ${totalH}" width="512" height="${Math.round(512 * totalH / this.width)}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n`
    svg += `    <title>String art - ${BRAND.sitesLine}</title>\n`
    svg += `    <desc>${BRAND.copyrightLine}</desc>\n`

    svg += `    ${this.GetOutlineSVG(this.backgroundColorBox.value)}\n`

    for (let nail of this.nails)
        svg += `    <circle cx="${nail.x}" cy="${nail.y}" r="${NAIL_RADIUS}" fill="${NAIL_COLOR}" />\n`

    for (let i = 1; i < this.sequence.length; i++) {
        let p1 = this.nails[this.sequence[i - 1]]
        let p2 = this.nails[this.sequence[i]]

        svg += `    <path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" stroke-width="1" stroke="${this.GetLineColor()}" fill="none" />\n`
    }

    svg += BrandFooterSVG(0, this.height, this.width, footer) + '\n'
    svg += '</svg>'

    return svg
}

StringArtGenerator.prototype.GetShapeName = function() {
    let names = {}
    names[CIRCLE_FORM] = 'Circle'
    names[RECT_FORM] = 'Square'
    names[ALBUM_FORM] = 'Landscape'
    names[PORTRAIT_FORM] = 'Portrait'
    names[IMAGE_FORM] = 'Match image'
    names[HEXAGON_FORM] = 'Hexagon (flat top)'
    names[HEXAGON_POINTY_FORM] = 'Hexagon (pointy top)'
    names[OVAL_H_FORM] = 'Oval (horizontal)'
    names[OVAL_V_FORM] = 'Oval (vertical)'
    return names[this.formType] || this.formType
}

// Plain-text winding instructions using the same 1-based nail numbers as the template.
StringArtGenerator.prototype.ToSequence = function() {
    let seq = this.sequence.map(i => i + 1)
    let lines = seq.length - 1
    let width = String(this.nails.length).length
    let txt = ''

    txt += BrandTextHeader() + '\n\n'
    txt += 'String art winding sequence\n'
    txt += '===========================\n\n'
    txt += `Board shape:  ${this.GetShapeName()}\n`
    txt += `Nails:        ${this.nails.length} (numbered 1-${this.nails.length}, see the nail template; nail 1 is red)\n`
    txt += `Lines:        ${lines}\n`
    txt += `Thread color: ${this.linesColorBox.value}\n`
    txt += `Background:   ${this.backgroundColorBox.value}\n\n`
    txt += `Tie the thread to nail ${seq[0]}, then wrap it around each nail below in order.\n`
    txt += 'Each row lists 10 moves; the number on the left is the first move in that row.\n\n'

    let moves = seq.slice(1)
    let stepWidth = String(moves.length).length

    for (let i = 0; i < moves.length; i += 10) {
        let row = moves.slice(i, i + 10).map(v => String(v).padStart(width, ' ')).join('  ')
        txt += `${String(i + 1).padStart(stepWidth, ' ')}:  ${row}\n`
    }

    txt += `\nDone - tie off at nail ${seq[seq.length - 1]}.\n`
    txt += `\n--\n${BRAND.sitesLine}\n${BRAND.copyrightLine}\n`
    return txt
}

StringArtGenerator.prototype.Save = function() {
    let type = this.saveTypeBox.value
    let link = document.createElement("a")

    if (type == 'stringart') {
        link.href = URL.createObjectURL(new Blob([this.ToStringArt()], { type: 'application/json' }))
        link.download = 'art.stringart'
    }
    else if (type == 'png') {
        // Saves what you see: the art plus the nail numbers if they are switched on
        // ...and a branded footer strip underneath
        let footer = Math.round(this.canvas.width * 0.12)
        let out = document.createElement('canvas')
        out.width = this.canvas.width
        out.height = this.canvas.height + footer
        let outCtx = out.getContext('2d')
        outCtx.fillStyle = '#ffffff'
        outCtx.fillRect(0, 0, out.width, out.height)
        outCtx.drawImage(this.canvas, 0, 0)
        if (this.nailNumbersBox.value != 'off')
            outCtx.drawImage(this.overlay, 0, 0)
        DrawBrandFooter(outCtx, 0, this.canvas.height, out.width, footer, brandLogoImage)
        link.href = out.toDataURL()
        link.download = 'art.png'
    }
    else if (type == 'svg') {
        link.href = URL.createObjectURL(new Blob([this.ToSVG()], { type: 'image/svg+xml' }))
        link.download = 'art.svg'
    }
    else if (type == 'sequence') {
        link.href = URL.createObjectURL(new Blob([this.ToSequence()], { type: 'text/plain' }))
        link.download = 'winding-sequence.txt'
    }

    link.click()
}

StringArtGenerator.prototype.SetScale = function(scale, x, y) {
    let dx = (x - this.imgX) / this.imgScale
    let dy = (y - this.imgY) / this.imgScale

    this.imgScale = scale
    this.imgX = x - dx * this.imgScale
    this.imgY = y - dy * this.imgScale
}
