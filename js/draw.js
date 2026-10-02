/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/draw.js - Drawing the board, photo preview and original-photo view.
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

StringArtGenerator.prototype.Clear = function(ctx) {
    ctx.clearRect(0, 0, this.width, this.height)
}

StringArtGenerator.prototype.GetLightness = function(red, green, blue) {
    return Math.floor(0.2126 * red + 0.7152 * green + 0.0722 * blue)
}

StringArtGenerator.prototype.LimitPixel = function(value) {
    if (value < 0)
        return 0

    if (value > 255)
        return 255

    return Math.round(value)
}

StringArtGenerator.prototype.DrawForm = function(ctx = this.ctx) {
    let formType = this.formTypeBox.value

    ctx.strokeStyle = BORDER_COLOR
    ctx.beginPath()

    if (formType == CIRCLE_FORM) {
        ctx.arc(this.x0, this.y0, this.radius + PADDING / 2, 0, Math.PI * 2)
    }
    else if (formType == RECT_FORM) {
        ctx.rect(0, 0, this.width, this.height)
    }
    else if (formType == ALBUM_FORM) {
        let height = this.width / Math.sqrt(2)
        ctx.rect(0, (this.height - height) / 2, this.width, height)
    }
    else if (formType == PORTRAIT_FORM) {
        let width = this.height / Math.sqrt(2)
        ctx.rect((this.width - width) / 2, 0, width, this.height)
    }
    else if (formType == IMAGE_FORM) {
        ctx.rect(0, 0, this.imgWidth, this.imgHeight)
    }
    else if (this.IsOutlineForm(formType)) {
        let outline = this.GetShapeOutline(PADDING / 2, formType)
        ctx.moveTo(outline[0].x, outline[0].y)
        for (let i = 1; i < outline.length; i++)
            ctx.lineTo(outline[i].x, outline[i].y)
        ctx.closePath()
    }

    ctx.fillStyle = this.backgroundColorBox.value
    ctx.fill()
}

StringArtGenerator.prototype.DrawGrayScale = function() {
    this.Clear(this.fakeCtx)
    this.fakeCtx.drawImage(this.image, this.imgX, this.imgY, this.imgWidth * this.imgScale, this.imgHeight * this.imgScale)

    let data = this.fakeCtx.getImageData(0, 0, this.width * this.dpr, this.height * this.dpr)
    let pixels = data.data
    let invert = this.invertBox.checked

    for (let i = 0; i < pixels.length; i += 4) {
        let lightness = this.GetLightness(pixels[i], pixels[i + 1], pixels[i + 2])

        if (invert)
            lightness = 255 - lightness

        lightness = this.brightnessTable[lightness]
        lightness = this.contrastTable[lightness]

        pixels[i] = lightness
        pixels[i + 1] = lightness
        pixels[i + 2] = lightness
    }

    this.fakeCtx.putImageData(data, 0, 0)
    this.ctx.drawImage(this.fakeCanvas, 0, 0, this.width, this.height)
}

// High-density screens draw at devicePixelRatio. Mobile browsers can wipe a canvas's state (for example
// while the phone's gallery is open to pick a photo), which silently resets this scale to 1 and makes
// everything draw at a fraction of its size. So it is set again before every draw instead of once.
StringArtGenerator.prototype.ApplyScale = function() {
    for (let ctx of [this.ctx, this.fakeCtx, this.overlayCtx, this.origCtx])
        if (ctx)
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
}

// Repaint whatever should be on screen right now (after the browser restores a wiped canvas)
StringArtGenerator.prototype.RedrawCurrent = function() {
    this.ApplyScale()

    if (this.isLineDrawing && this.sequence && this.sequence.length > 0) {
        // The art is rebuilt exactly from the thread sequence
        let color = this.GetLineColor()
        this.Clear(this.ctx)
        this.DrawNails()

        for (let i = 1; i < this.sequence.length; i++)
            this.DrawLine(this.nails[this.sequence[i - 1]], this.nails[this.sequence[i]], color)

        this.DrawOriginal()
    }
    else if (this.image) {
        this.DrawLoadedImage()
    }

    this.DrawNailNumbers()
}

StringArtGenerator.prototype.DrawLoadedImage = function() {
    this.ApplyScale()
    this.Clear(this.ctx)

    this.ctx.save()
    this.DrawForm()
    this.ctx.clip()
    this.DrawGrayScale()
    this.ctx.stroke()
    this.ctx.restore()

    this.DrawOriginal()
}

// The uploaded photo in colour, positioned and clipped exactly like the board (back of the flip card)
StringArtGenerator.prototype.DrawOriginal = function() {
    if (!this.origCtx || !this.image)
        return

    let ctx = this.origCtx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.save()
    this.DrawForm(ctx)
    ctx.clip()
    ctx.drawImage(this.image, this.imgX, this.imgY, this.imgWidth * this.imgScale, this.imgHeight * this.imgScale)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
    ctx.stroke()
    ctx.restore()
}

StringArtGenerator.prototype.DrawNails = function() {
    this.DrawForm()
    this.ctx.fillStyle = NAIL_COLOR

    for (let nail of this.nails) {
        this.ctx.beginPath()
        this.ctx.arc(nail.x, nail.y, NAIL_RADIUS, 0, Math.PI * 2)
        this.ctx.fill()
    }
}

StringArtGenerator.prototype.DrawLine = function(nail1, nail2, lineColor) {
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = lineColor
    this.ctx.beginPath()
    this.ctx.moveTo(nail1.x, nail1.y)
    this.ctx.lineTo(nail2.x, nail2.y)
    this.ctx.stroke()
}
