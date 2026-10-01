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

    this.infoBox.innerHTML = `<b>Lines left:</b> ${linesCount}<br>`
    this.infoBox.innerHTML += `<b>Elapsed:</b> ${time}<br>`
    this.infoBox.innerHTML += `<b>Remaining:</b> ${lost}<br>`
    this.infoBox.innerHTML += `<b>Avg. time per line:</b> ${avg} ms`
}

StringArtGenerator.prototype.GetActions = function() {
    let actions = '<b>Position the image:</b><br>'

    if ('ontouchstart' in window) {
        actions += '<b>Zoom</b> – pinch<br>'
        actions += '<b>Move</b> – drag with one finger'
    }
    else {
        actions += '<b>Zoom</b> – mouse wheel<br>'
        actions += '<b>Move</b> – drag with the left mouse button'
    }

    return actions
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
    this.generateBtn.value = 'Generate'

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
    return true
}

StringArtGenerator.prototype.EndGenerate = function() {
    this.saveBox.style.display = ''
    this.isGenerating = false
    this.generateBtn.value = this.isLineDrawing ? 'Continue' : 'Generate'

    this.resetBtn.removeAttribute('disabled')
    this.selectBtn.removeAttribute('disabled')
    this.linesCountBox.removeAttribute('disabled')
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
    this.DrawLine(this.nails[nail], this.nails[next.nail], lineColor)

    window.requestAnimationFrame(() => this.GenerateIteration(next.nail, linesCount - 1, totalCount, lineWeight, lineColor, startTime))
}

StringArtGenerator.prototype.Generate = function() {
    if (!this.StartGenerate())
        return

    let linesCount = +this.linesCountBox.value
    let lineWeight = this.GetLineWeight()
    let lineColor = this.GetLineColor()
    let startTime = performance.now()

    // When continuing, resume from the nail the thread is currently on
    // (it is popped here and pushed back by the first iteration).
    let startNail = this.sequence.length > 0 ? this.sequence.pop() : 0

    this.GenerateIteration(startNail, linesCount, linesCount, lineWeight, lineColor, startTime)
}

StringArtGenerator.prototype.ToStringArt = function() {
    return JSON.stringify({
        'nails': this.nails.map(p => ({ x: p.x, y: p.y })),
        'color': this.GetLineColor(),
        'background': this.backgroundColorBox.value,
        'sequence': this.sequence
    }, null, '    ')
}

StringArtGenerator.prototype.ToSVG = function() {
    let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" width="512" height="512" version="1.1" xmlns="http://www.w3.org/2000/svg">\n`

    svg += `    ${this.GetOutlineSVG(this.backgroundColorBox.value)}\n`

    for (let nail of this.nails)
        svg += `    <circle cx="${nail.x}" cy="${nail.y}" r="${NAIL_RADIUS}" fill="${NAIL_COLOR}" />\n`

    for (let i = 1; i < this.sequence.length; i++) {
        let p1 = this.nails[this.sequence[i - 1]]
        let p2 = this.nails[this.sequence[i]]

        svg += `    <path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" stroke-width="1" stroke="${this.GetLineColor()}" fill="none" />\n`
    }

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

// Printable nail template: board outline + every nail with its number (1-based).
// Print it at your board size, tape it on, and hammer a nail at every dot.
StringArtGenerator.prototype.ToTemplate = function() {
    let nails = this.nails
    let n = nails.length
    let isBorder = this.nailsModeBox.value == BORDER_MODE
    let c = this.GetBoardCenter()

    // Pick a font size from the nail spacing so neighbouring labels don't overlap
    let fs = Math.max(1.2, Math.min(8, this.GetNailSpacing() * 0.85))
    let nailR = Math.max(0.4, Math.min(NAIL_RADIUS, fs * 0.3))
    let margin = isBorder ? fs * 3 + 6 : 6
    let angles = isBorder ? this.GetNailOutwardAngles() : null

    let vbX = -margin, vbY = -margin
    let vbW = this.width + 2 * margin, vbH = this.height + 2 * margin
    let r = (v) => Math.round(v * 100) / 100

    let svg = `<svg viewBox="${r(vbX)} ${r(vbY)} ${r(vbW)} ${r(vbH)}" width="${r(vbW * 2)}" height="${r(vbH * 2)}" version="1.1" xmlns="http://www.w3.org/2000/svg">\n`
    svg += `<rect x="${r(vbX)}" y="${r(vbY)}" width="${r(vbW)}" height="${r(vbH)}" fill="#fff" />\n`

    // Board outline
    svg += this.GetOutlineSVG('none', '#999', 0.3) + '\n'

    // Centre mark helps with alignment on the board
    svg += `<path d="M ${r(c.x - 4)} ${r(c.y)} L ${r(c.x + 4)} ${r(c.y)} M ${r(c.x)} ${r(c.y - 4)} L ${r(c.x)} ${r(c.y + 4)}" stroke="#999" stroke-width="0.3" />\n`

    svg += `<g font-family="Arial, Helvetica, sans-serif" font-size="${r(fs)}" fill="#000">\n`

    for (let i = 0; i < n; i++) {
        let nail = { x: r(nails[i].fx ?? nails[i].x), y: r(nails[i].fy ?? nails[i].y) }
        let label = i + 1
        let color = i == 0 ? '#d00' : '#000'

        svg += `<circle cx="${nail.x}" cy="${nail.y}" r="${r(nailR)}" fill="${color}" />`

        if (isBorder) {
            // Label points away from the board, flipped on the left half so it stays readable
            let angle = angles[i]
            let flip = angle > 90 || angle < -90
            let rot = flip ? angle + 180 : angle
            let off = nailR + fs * 0.4
            let anchor = flip ? 'end' : 'start'
            let dx = flip ? -off : off
            svg += `<text transform="translate(${nail.x} ${nail.y}) rotate(${r(rot)})" x="${r(dx)}" y="${r(fs * 0.35)}" text-anchor="${anchor}" fill="${color}">${label}</text>\n`
        }
        else {
            svg += `<text x="${r(nail.x + nailR + 0.3)}" y="${r(nail.y - nailR - 0.3)}" fill="${color}">${label}</text>\n`
        }
    }

    svg += '</g>\n</svg>'
    return svg
}

// Plain-text winding instructions using the same 1-based nail numbers as the template.
StringArtGenerator.prototype.ToSequence = function() {
    let seq = this.sequence.map(i => i + 1)
    let lines = seq.length - 1
    let width = String(this.nails.length).length
    let txt = ''

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
        let out = document.createElement('canvas')
        out.width = this.canvas.width
        out.height = this.canvas.height
        let outCtx = out.getContext('2d')
        outCtx.drawImage(this.canvas, 0, 0)
        if (this.nailNumbersBox.value != 'off')
            outCtx.drawImage(this.overlay, 0, 0)
        link.href = out.toDataURL()
        link.download = 'art.png'
    }
    else if (type == 'svg') {
        link.href = URL.createObjectURL(new Blob([this.ToSVG()], { type: 'image/svg+xml' }))
        link.download = 'art.svg'
    }
    else if (type == 'template') {
        link.href = URL.createObjectURL(new Blob([this.ToTemplate()], { type: 'image/svg+xml' }))
        link.download = 'nail-template.svg'
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
