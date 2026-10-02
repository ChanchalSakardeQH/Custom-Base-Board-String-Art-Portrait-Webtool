StringArtGenerator.prototype.Clip = function(value, min, max) {
    if (min > max)
        [min, max] = [max, min]

    if (value > max)
        return max
    
    if (value < min)
        return min

    return value
}

StringArtGenerator.prototype.NormalizePoint = function() {
    this.imgX = this.Clip(this.imgX, this.imgBbox.xmin, this.imgBbox.xmax - this.imgWidth * this.imgScale)
    this.imgY = this.Clip(this.imgY, this.imgBbox.ymin, this.imgBbox.ymax - this.imgHeight * this.imgScale)
}

StringArtGenerator.prototype.TouchToPoint = function(touch) {
    let rect = this.canvas.getBoundingClientRect()
    let k = this.width / rect.width
    return { x: Math.round((touch.clientX - rect.left) * k), y: Math.round((touch.clientY - rect.top) * k) }
}

// Pointer position in canvas units. The board is scaled by CSS, so screen pixels and canvas units can differ.
StringArtGenerator.prototype.GetEventPoint = function(e) {
    if (e._point)
        return e._point

    let k = this.width / e.target.clientWidth
    return { x: e.offsetX * k, y: e.offsetY * k }
}

StringArtGenerator.prototype.GetPointDistance = function(p1, p2) {
    let dx = p2.x - p1.x
    let dy = p2.y - p1.y

    return Math.sqrt(dx*dx + dy*dy)
}

StringArtGenerator.prototype.MaxAbs = function(a, b) {
    return Math.abs(a) > Math.abs(b) ? a : b
}

StringArtGenerator.prototype.MouseDown = function(e) {
    let point = this.GetEventPoint(e)
    this.isPressed = true
    this.prevX = point.x
    this.prevY = point.y
    e.preventDefault()
}

StringArtGenerator.prototype.MouseMove = function(e) {
    e.preventDefault()

    if (!this.isPressed || this.isGenerating || this.isLineDrawing)
        return

    let point = this.GetEventPoint(e)
    let dx = point.x - this.prevX
    let dy = point.y - this.prevY

    this.imgX += dx
    this.imgY += dy

    this.prevX = point.x
    this.prevY = point.y

    this.NormalizePoint()
    this.DrawLoadedImage()
}

StringArtGenerator.prototype.MouseUp = function(e) {
    e.preventDefault()
    this.isPressed = false
}

StringArtGenerator.prototype.MouseWheel = function(e) {
    e.preventDefault()

    if (this.isGenerating || this.isLineDrawing)
        return

    let scaleIndex = SCALES.indexOf(this.imgScale) - Math.sign(e.deltaY)
    let scale = SCALES[Math.max(0, Math.min(SCALES.length - 1, scaleIndex))]

    let point = this.GetEventPoint(e)
    this.SetScale(scale, point.x, point.y)
    this.NormalizePoint()
    this.DrawLoadedImage()
}

StringArtGenerator.prototype.DragOver = function(e) {
    this.dragDropBox.style.display = ''
    e.preventDefault()
}

StringArtGenerator.prototype.DragLeave = function(e) {
    // Moving between elements inside the page also fires dragleave; only hide when actually leaving
    if (e.relatedTarget && document.getElementById('generator-box').contains(e.relatedTarget))
        return

    this.dragDropBox.style.display = 'none'
    e.preventDefault()
}

StringArtGenerator.prototype.Drop = function(e) {
    e.preventDefault()
    this.dragDropBox.style.display = 'none'

    if (e.dataTransfer.files.length != 1) {
        alert("Please drop only one image file at a time.")
        return
    }

    let image = new Image()
    image.onload = () => this.LoadImage(image)
    image.src = URL.createObjectURL(e.dataTransfer.files[0])
}

StringArtGenerator.prototype.TouchStart = function(e) {
    e.preventDefault()
    this.touches = []

    if (e.targetTouches.length == 1) {
        e._point = this.TouchToPoint(e.targetTouches[0])
        this.MouseDown(e)
    }
    else if (e.targetTouches.length == 2) {
        this.touches.push(this.TouchToPoint(e.targetTouches[0]))
        this.touches.push(this.TouchToPoint(e.targetTouches[1]))
    }
}

StringArtGenerator.prototype.TouchMove = function(e) {
    if (!this.isPressed || this.isGenerating || this.isLineDrawing)
        return

    e.preventDefault()

    if (e.targetTouches.length == 1) {
        e._point = this.TouchToPoint(e.targetTouches[0])
        this.MouseMove(e)
        return
    }

    if (e.targetTouches.length != 2)
        return

    let p1 = this.TouchToPoint(e.targetTouches[0])
    let p2 = this.TouchToPoint(e.targetTouches[1])

    let dst1 = this.GetPointDistance(this.touches[0], this.touches[1])
    let dst2 = this.GetPointDistance(p1, p2)

    if (Math.abs(dst2 - dst1) > TOUCH_DELTA)
        this.SetScale(this.imgScale * dst2 / dst1, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2)

    let dx1 = p1.x - this.touches[0].x
    let dx2 = p2.x - this.touches[1].x

    if (Math.sign(dx1) == Math.sign(dx2))
        this.imgX += this.MaxAbs(dx1, dx2)

    let dy1 = p1.y - this.touches[0].y
    let dy2 = p2.y - this.touches[1].y

    if (Math.sign(dy1) == Math.sign(dy2))
        this.imgY += this.MaxAbs(dy1, dy2)

    this.touches = [p1, p2]

    this.NormalizePoint()
    this.DrawLoadedImage()
}

StringArtGenerator.prototype.TouchEnd = function(e) {
    e.preventDefault()
    this.isPressed = false
}
