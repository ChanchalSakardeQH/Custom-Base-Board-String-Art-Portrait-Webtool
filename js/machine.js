/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/machine.js - Drive a GRBL plotter from the browser: connect over USB (Web Serial), status,
 *                 jogging, work zero, streaming G-code jobs, console. Includes a GRBL simulator.
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

const GRBL_RX_BUFFER = 127          // GRBL's serial receive buffer is 128 bytes; keep one spare

const GRBL_ERRORS = {
    1: 'A G-code word is missing its letter.', 2: 'A number is missing or badly formatted.',
    3: 'Unknown $ command.', 4: 'A value that must be positive is negative.',
    5: 'Homing is not enabled in the settings ($22).', 7: 'Settings memory failed; defaults restored.',
    8: '$ command only works when the machine is idle.', 9: 'G-code is locked out during an alarm or jog. Unlock ($X) or home ($H) first.',
    10: 'Soft limits need homing enabled.', 11: 'Line too long.', 12: 'Setting exceeds the maximum step rate.',
    13: 'Safety door is open.', 15: 'Jog target is outside the machine travel.', 16: 'Invalid jog command.',
    17: 'Laser mode needs PWM output.', 20: 'Unsupported G-code command.', 21: 'Two commands from the same group on one line.',
    22: 'Feed rate (F) not set.', 23: 'Command needs a whole number.', 24: 'Two commands on one line both need axis words.',
    25: 'A word is repeated on the line.', 26: 'Command needs X, Y or Z.', 27: 'Line number out of range.',
    28: 'Command is missing a P or L value.', 29: 'Unsupported work coordinate system.',
    30: 'G53 needs G0 or G1.', 31: 'Axis words with no motion command.', 32: 'Arc has no end point in the plane.',
    33: 'Impossible arc or target.', 34: 'Arc radius maths failed.', 35: 'Arc is missing I/J offsets.',
    36: 'Unused words left on the line.', 37: 'Tool length offset axis not supported.', 38: 'Tool number too high.'
}

const GRBL_ALARMS = {
    1: 'Hard limit switch hit. Position is probably lost: home the machine ($H).',
    2: 'Move would go past the machine travel (soft limit). Unlock ($X) to continue.',
    3: 'Reset while moving. Position may be lost: home ($H) or unlock ($X) and re-zero.',
    4: 'Probe was already triggered.', 5: 'Probe did not trigger.',
    6: 'Homing failed: reset during homing.', 7: 'Homing failed: safety door opened.',
    8: 'Homing failed: could not clear the limit switch.', 9: 'Homing failed: limit switch not found.',
    10: 'Homing failed: second limit switch not found.'
}

// ================= A small GRBL 1.1 simulator =================
// Accepts the same bytes a real board would, answers with ok / error / status reports, and moves
// (faster than real time) so jobs, holds and jogs can be tried without hardware.

function GrblSim() {
    this.speed = 40                 // times faster than a real machine
    this.output = () => { }
    this.reset(true)
}

GrblSim.prototype.reset = function(first) {
    let lost = !first && (this.state == 'Run' || this.state == 'Jog') && !this.hold
    this.mpos = this.mpos || [0, 0, 0]
    this.wco = this.wco || [0, 0, 0]
    this.planPos = this.mpos.slice()
    this.queue = []
    this.rx = ''
    this.hold = false
    this.waitingPause = false
    this.motion = 'G0'
    this.absolute = true
    this.feed = 0
    this.feedOv = 100
    this.reports = 0
    this.check = false
    this.state = lost ? 'Alarm' : (this.state == 'Alarm' ? 'Alarm' : 'Idle')

    if (!first) {
        if (lost) this.out('ALARM:3')
        this.out('')
        this.out("Grbl 1.1h ['$' for help]")
        if (this.state == 'Alarm') this.out("[MSG:'$H'|'$X' to unlock]")
    }
}

GrblSim.prototype.start = function() {
    setTimeout(() => this.out("Grbl 1.1h ['$' for help]"), 250)
    this.timer = setInterval(() => this.tick(20), 20)
}

GrblSim.prototype.stop = function() { clearInterval(this.timer) }

GrblSim.prototype.out = function(line) { setTimeout(() => this.output(line), 0) }

GrblSim.prototype.receive = function(text) {
    for (let c of text) {
        let code = c.charCodeAt(0)
        if (c == '?') this.report()
        else if (c == '!') { if (this.queue.length || this.state == 'Run' || this.state == 'Jog') this.hold = true }
        else if (c == '~') { this.hold = false; if (this.state == 'Hold') this.state = this.queue.length ? 'Run' : 'Idle' }
        else if (code == 0x18) this.reset(false)
        else if (code == 0x85) { if (this.state == 'Jog') { this.queue = this.queue.filter(b => !b.jog); this.planPos = this.mpos.slice() } }
        else if (code == 0x90) this.feedOv = 100
        else if (code == 0x91) this.feedOv = Math.min(200, this.feedOv + 10)
        else if (code == 0x92) this.feedOv = Math.max(10, this.feedOv - 10)
        else if (code >= 0x80) { }
        else {
            this.rx += c
            if (c == '\n') this.processRx()
        }
    }
}

GrblSim.prototype.processRx = function() {
    while (!this.waitingPause && this.queue.length < 15 && this.rx.includes('\n')) {
        let i = this.rx.indexOf('\n')
        let line = this.rx.slice(0, i).trim()
        this.rx = this.rx.slice(i + 1)
        this.execLine(line)
    }
}

GrblSim.prototype.settingsText = [
    '$0=10', '$1=25', '$2=0', '$3=0', '$4=0', '$5=0', '$6=0', '$10=1', '$11=0.010', '$12=0.002', '$13=0',
    '$20=0', '$21=0', '$22=0', '$23=0', '$24=25.000', '$25=500.000', '$26=250', '$27=1.000', '$30=1000', '$31=0', '$32=0',
    '$100=80.000', '$101=80.000', '$102=400.000', '$110=6000.000', '$111=6000.000', '$112=600.000',
    '$120=500.000', '$121=500.000', '$122=50.000', '$130=600.000', '$131=600.000', '$132=80.000'
]

GrblSim.prototype.execLine = function(raw) {
    let line = raw.replace(/\(.*?\)/g, '').replace(/;.*$/, '').trim().toUpperCase()
    let ok = () => this.out('ok')
    let err = (n) => this.out('error:' + n)
    let f3 = (v) => v.toFixed(3)

    if (!line) return ok()

    if (line[0] == '$') {
        if (line == '$$') { this.settingsText.forEach(s => this.out(s)); return ok() }
        if (line == '$#') {
            this.out(`[G54:${this.wco.map(f3).join(',')}]`)
            for (let g of ['G55', 'G56', 'G57', 'G58', 'G59', 'G28', 'G30']) this.out(`[${g}:0.000,0.000,0.000]`)
            this.out('[G92:0.000,0.000,0.000]'); this.out('[TLO:0.000]'); this.out('[PRB:0.000,0.000,0.000:0]')
            return ok()
        }
        if (line == '$G') { this.out(`[GC:${this.motion} G54 G17 G21 ${this.absolute ? 'G90' : 'G91'} G94 M5 M9 T0 F${this.feed} S0]`); return ok() }
        if (line == '$I') { this.out('[VER:1.1h.20190825:Simulator]'); this.out('[OPT:V,15,128]'); return ok() }
        if (line == '$X') { if (this.state == 'Alarm') { this.state = 'Idle'; this.out('[MSG:Caution: Unlocked]') } return ok() }
        if (line == '$H') { this.queue.push({ type: 'move', from: null, to: [0, 0, 0], feed: 1500, home: true }); this.planPos = [0, 0, 0]; this.state = 'Home'; return ok() }
        if (line == '$C') {
            this.check = !this.check
            this.out(`[MSG:${this.check ? 'Enabled' : 'Disabled'}]`)
            if (this.check) { this.state = 'Check'; return ok() }
            ok(); this.state = 'Idle'; return this.reset(false)
        }
        if (line.startsWith('$J=')) {
            if (this.state == 'Alarm') return err(9)
            return this.gcode(line.slice(3), true) ? ok() : err(16)
        }
        if (/^\$\d+=[-\d.]+$/.test(line)) return ok()
        return err(3)
    }

    if (this.state == 'Alarm') return err(9)
    let r = this.gcode(line, false)
    if (r === 'pause') return              // ok is sent when the pause actually begins
    return r === true ? ok() : err(r || 20)
}

// Returns true, an error number, or 'pause'
GrblSim.prototype.gcode = function(line, jog) {
    let words = []
    let re = /([A-Z])\s*([-+]?\d*\.?\d+)/g, m
    while ((m = re.exec(line))) words.push([m[1], parseFloat(m[2])])

    let target = this.planPos.slice()
    let hasAxis = false, I = 0, J = 0, motion = this.motion, absolute = this.absolute, dwell = null, g10 = false, jogFeed = 0

    for (let [L, v] of words) {
        if (L == 'G') {
            if ([0, 1, 2, 3].includes(v)) motion = 'G' + v
            else if (v == 90) absolute = true
            else if (v == 91) absolute = false
            else if (v == 4) dwell = 0
            else if (v == 10) g10 = true
            else if ([17, 20, 21, 54, 94, 40, 49, 80].includes(v)) { }
            else return 20
        }
        else if (L == 'M') {
            if (v == 0 || v == 1) {
                if (this.check) return true
                this.waitingPause = true
                return 'pause'
            }
            if (v == 2 || v == 30) { if (!this.check) this.queue.push({ type: 'end' }); this.absolute = true; this.motion = 'G1' }
            else if (![3, 4, 5, 7, 8, 9].includes(v)) return 20
        }
        else if (L == 'F') { if (jog) jogFeed = v; else this.feed = v }     // a jog's F never changes the program feed
        else if (L == 'S' || L == 'L' || L == 'N' || L == 'T') { }
        else if (L == 'P') { if (dwell !== null) dwell = v }
        else if (L == 'I') I = v
        else if (L == 'J') J = v
        else if ('XYZ'.includes(L)) {
            let a = 'XYZ'.indexOf(L)
            hasAxis = true
            if (g10) target[a] = v
            else target[a] = absolute ? v + this.wco[a] : this.planPos[a] + v
        }
    }

    if (jog) {
        if (!hasAxis) return false
        if (!jogFeed) return false
        if (!this.check) { this.queue.push({ type: 'move', to: target, feed: jogFeed, jog: true }); this.state = 'Jog' }
        this.planPos = target
        return true
    }

    if (!jog) { this.motion = motion; this.absolute = absolute }

    if (g10) {
        // G10 L20 P1: make the given axes read the given values at the current position
        for (let [L, v] of words) if ('XYZ'.includes(L)) { let a = 'XYZ'.indexOf(L); this.wco[a] = this.planPos[a] - v }
        this.reports = 0          // like GRBL, send the new offset in the very next status report
        return true
    }

    if (dwell !== null) { if (!this.check) this.queue.push({ type: 'dwell', t: dwell }); return true }
    if (!hasAxis) return true
    if (motion != 'G0' && !this.feed) return 22

    let block = { type: 'move', to: target, feed: motion == 'G0' ? 6000 : this.feed }
    if (motion == 'G2' || motion == 'G3') {
        let c = [this.planPos[0] + I, this.planPos[1] + J]
        let r0 = Math.hypot(this.planPos[0] - c[0], this.planPos[1] - c[1])
        let r1 = Math.hypot(target[0] - c[0], target[1] - c[1])
        if (Math.abs(r0 - r1) > 0.005 && Math.abs(r0 - r1) > 0.001 * r0) return 33
        let a0 = Math.atan2(this.planPos[1] - c[1], this.planPos[0] - c[0])
        let a1 = Math.atan2(target[1] - c[1], target[0] - c[0])
        let sweep = motion == 'G2' ? a0 - a1 : a1 - a0
        sweep = ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI
        block.arc = { c: c, r: r0, a0: a0, sweep: motion == 'G2' ? -sweep : sweep }
    }

    if (!this.check) this.queue.push(block)
    this.planPos = target
    return true
}

GrblSim.prototype.tick = function(ms) {
    if (this.check) { this.state = 'Check'; return }
    if (this.hold) { if (this.state != 'Alarm') this.state = 'Hold'; return }

    let dt = ms / 1000 * this.speed
    while (dt > 0 && this.queue.length) {
        let b = this.queue[0]
        this.state = b.jog ? 'Jog' : b.home ? 'Home' : 'Run'

        if (b.type == 'end' ) { this.queue.shift(); continue }
        if (b.type == 'dwell') { b.t -= dt; dt = 0; if (b.t <= 0) this.queue.shift(); continue }

        if (!b.from) {
            b.from = this.mpos.slice()
            let len = b.arc ? Math.abs(b.arc.sweep) * b.arc.r : Math.hypot(b.to[0] - b.from[0], b.to[1] - b.from[1], b.to[2] - b.from[2])
            b.dur = len / b.feed * 60
            b.done = 0
        }

        let feedScale = b.jog ? 1 : this.feedOv / 100
        let need = (b.dur - b.done) / feedScale
        let use = Math.min(dt, need)
        b.done += use * feedScale
        dt -= use
        let t = b.dur > 0 ? Math.min(1, b.done / b.dur) : 1

        if (b.arc) {
            let a = b.arc.a0 + b.arc.sweep * t
            this.mpos = [b.arc.c[0] + b.arc.r * Math.cos(a), b.arc.c[1] + b.arc.r * Math.sin(a), b.from[2] + (b.to[2] - b.from[2]) * t]
        }
        else this.mpos = b.from.map((v, i) => v + (b.to[i] - v) * t)

        if (t >= 1) { this.mpos = b.to.slice(); this.queue.shift() }
    }

    if (!this.queue.length) {
        if (this.waitingPause) {
            // M0 reached: like real GRBL, hold first, then acknowledge the line
            this.waitingPause = false
            this.hold = true
            this.state = 'Hold'
            this.out('ok')
            return
        }
        if (['Run', 'Jog', 'Home'].includes(this.state)) this.state = 'Idle'
    }

    this.processRx()
}

GrblSim.prototype.report = function() {
    let f3 = (v) => v.toFixed(3)
    let state = this.state == 'Hold' ? 'Hold:0' : this.state
    let s = `<${state}|MPos:${this.mpos.map(f3).join(',')}|Bf:${15 - this.queue.length},${127 - this.rx.length}|FS:${this.queue.length ? Math.round(this.queue[0].feed || 0) : 0},0`
    if (this.reports % 10 == 0) s += `|WCO:${this.wco.map(f3).join(',')}`
    else if (this.reports % 10 == 1) s += `|Ov:${this.feedOv},100,100`
    this.reports++
    this.out(s + '>')
}

// ================= Transports: real USB serial port or the simulator =================

function SerialTransport(baud) {
    this.baud = baud
    this.onLine = () => { }
    this.onClose = () => { }
}

SerialTransport.prototype.open = async function() {
    this.port = await navigator.serial.requestPort()
    await this.port.open({ baudRate: this.baud, bufferSize: 4096 })
    this.writer = this.port.writable.getWriter()
    this.encoder = new TextEncoder()
    this.closing = false
    this.reading = this.readLoop()
}

SerialTransport.prototype.readLoop = async function() {
    let decoder = new TextDecoder()
    let buf = ''
    this.reader = this.port.readable.getReader()
    try {
        while (true) {
            let { value, done } = await this.reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            let parts = buf.split(/\r?\n/)
            buf = parts.pop()
            for (let p of parts) if (p.trim()) this.onLine(p.trim())
        }
    }
    catch (e) { }
    finally { try { this.reader.releaseLock() } catch (e) { } }
    if (!this.closing) this.onClose('The USB connection was lost')
}

SerialTransport.prototype.write = function(text) {
    return this.writer.write(this.encoder.encode(text)).catch(() => { })
}

SerialTransport.prototype.close = async function() {
    this.closing = true
    try { await this.reader.cancel() } catch (e) { }
    try { await this.reading } catch (e) { }
    try { this.writer.releaseLock() } catch (e) { }
    try { await this.port.close() } catch (e) { }
}

SerialTransport.prototype.label = function() {
    let info = this.port && this.port.getInfo ? this.port.getInfo() : {}
    return info.usbVendorId ? `USB ${info.usbVendorId.toString(16).padStart(4, '0')}:${(info.usbProductId || 0).toString(16).padStart(4, '0')} at ${this.baud} baud` : `serial port at ${this.baud} baud`
}

function SimTransport() {
    this.sim = new GrblSim()
    this.onLine = () => { }
    this.onClose = () => { }
}

SimTransport.prototype.open = async function() {
    this.sim.output = (line) => { if (line !== '') this.onLine(line) }
    this.sim.start()
}

SimTransport.prototype.write = function(text) { this.sim.receive(text); return Promise.resolve() }
SimTransport.prototype.close = async function() { this.sim.stop() }
SimTransport.prototype.label = function() { return `simulator (${this.sim.speed}× real speed)` }

// ================= Controller =================

function GrblController() {
    this.transport = null
    this.listeners = {}
    this.resetState()
}

GrblController.prototype.resetState = function() {
    this.connected = false
    this.firmware = ''
    this.status = { state: 'Disconnected', mpos: [0, 0, 0], wpos: [0, 0, 0], wco: [0, 0, 0], feed: 0, spindle: 0, ov: [100, 100, 100], buf: null, pins: '' }
    this.pending = []        // lines waiting for room in GRBL's buffer
    this.inFlight = []       // lines sent, waiting for ok / error
    this.job = null
}

GrblController.prototype.on = function(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn) }
GrblController.prototype.emit = function(name, ...args) { for (let fn of this.listeners[name] || []) fn(...args) }

GrblController.prototype.connect = async function(transport) {
    this.transport = transport
    transport.onLine = (line) => this.handleLine(line)
    transport.onClose = (reason) => this.lost(reason)
    await transport.open()
    this.connected = true
    this.status.state = 'Connecting'
    this.emit('connected', transport.label())
    this.emit('status', this.status)

    // Most boards reset and greet when the port opens; boards that don't get a soft reset
    this.welcomeTimer = setTimeout(() => { if (!this.firmware) this.realtime(0x18) }, 2500)
    this.poll = setInterval(() => { if (this.connected) this.transport.write('?') }, 250)
}

GrblController.prototype.disconnect = async function() {
    clearInterval(this.poll)
    clearTimeout(this.welcomeTimer)
    let t = this.transport
    this.transport = null
    this.resetState()
    if (t) await t.close()
    this.emit('disconnected', '')
    this.emit('status', this.status)
}

GrblController.prototype.lost = function(reason) {
    clearInterval(this.poll)
    clearTimeout(this.welcomeTimer)
    let hadJob = this.job && this.job.state == 'running'
    this.transport = null
    this.resetState()
    this.emit('disconnected', reason + (hadJob ? ' during a job. The job stopped.' : ''))
    this.emit('status', this.status)
}

GrblController.prototype.realtime = function(byte) {
    if (this.transport) this.transport.write(String.fromCharCode(byte))
}

// Queue a line for GRBL. opts: { quiet, job, comment }
GrblController.prototype.send = function(text, opts = {}) {
    if (!this.connected) return
    this.pending.push(Object.assign({ text: text }, opts))
    this.pump()
}

GrblController.prototype.bufferUsed = function() {
    return this.inFlight.reduce((sum, item) => sum + item.text.length + 1, 0)
}

// Character-counting streaming: keep GRBL's 128-byte buffer as full as possible without overflowing it
GrblController.prototype.pump = function() {
    if (!this.transport) return
    let used = this.bufferUsed()

    while (true) {
        if (!this.pending.length && this.job && this.job.state == 'running' && this.job.next < this.job.lines.length) {
            let L = this.job.lines[this.job.next]
            this.pending.push({ text: L.text, comment: L.comment, job: true, index: this.job.next, quiet: true })
            this.job.next++
        }
        if (!this.pending.length) break

        let item = this.pending[0]
        let len = item.text.length + 1
        if (used + len > GRBL_RX_BUFFER && this.inFlight.length) break

        this.pending.shift()
        this.inFlight.push(item)
        used += len
        this.transport.write(item.text + '\n')
        if (!item.quiet) this.emit('line', item.text, 'out')
    }
}

GrblController.prototype.handleLine = function(line) {
    if (line == 'ok' || line.startsWith('error:')) {
        let item = this.inFlight.shift() || {}
        let isError = line.startsWith('error:')
        let code = isError ? +line.slice(6) : 0

        if (isError) {
            let why = GRBL_ERRORS[code] || 'Unknown error.'
            this.emit('line', `${line}  (${why}) on: ${item.text || '?'}`, 'error')
        }
        else if (!item.quiet) this.emit('line', 'ok', 'in')

        if (item.job && this.job) {
            this.job.acked++
            if (/^M0?0\b|^M1\b/.test(item.text)) this.job.pauseMessage = item.comment || 'The program paused'
            if (isError) {
                this.job.errors++
                if (this.job.stopOnError && !this.job.check) {
                    this.job.state = 'error'
                    this.job.errorText = `Line ${item.index + 1}: ${item.text} → ${line} (${GRBL_ERRORS[code] || 'unknown'})`
                    this.realtime(0x21)           // feed hold: stop motion safely
                }
            }
            this.emit('job', this.job)
        }

        if (item.onDone) item.onDone(isError ? line : 'ok')
        this.checkJobDone()
        this.pump()
        return
    }

    if (line[0] == '<') {
        this.parseStatus(line)
        this.checkJobDone()
        this.emit('status', this.status)
        this.emit('line', line, 'status')
        return
    }

    if (line.startsWith('Grbl ')) {
        // Fresh start after power-up or a soft reset: GRBL's buffer is empty, so is ours
        this.firmware = line.replace(/\s*\[.*$/, '')
        this.pending = []
        this.inFlight = []
        if (this.job && (this.job.state == 'running' || this.job.state == 'stopping' || this.job.state == 'error'))
            this.job.state = this.job.state == 'error' ? 'error' : 'stopped'
        if (this.job && this.job.checkExit) this.job.state = 'done'
        this.emit('job', this.job)
        this.emit('welcome', this.firmware)
        this.emit('line', line, 'in')
        return
    }

    if (line.startsWith('ALARM:')) {
        let code = +line.slice(6)
        this.status.state = 'Alarm'
        this.emit('alarm', code, GRBL_ALARMS[code] || 'Unknown alarm.')
        this.emit('line', `${line}  (${GRBL_ALARMS[code] || 'Unknown alarm.'})`, 'alarm')
        if (this.job && this.job.state == 'running') { this.job.state = 'error'; this.job.errorText = `Alarm ${code}: ${GRBL_ALARMS[code] || ''}`; this.emit('job', this.job) }
        this.emit('status', this.status)
        return
    }

    this.emit('line', line, line.startsWith('[MSG') ? 'msg' : 'in')
}

GrblController.prototype.parseStatus = function(line) {
    let inner = line.slice(1, -1)
    let s = this.status
    let nums = (key) => {
        let m = inner.match(new RegExp(key + ':([-\\d.]+),([-\\d.]+)(?:,([-\\d.]+))?'))
        return m ? [+m[1], +m[2], m[3] !== undefined ? +m[3] : 0] : null
    }

    s.state = inner.split(/[|,]/)[0]
    let wco = nums('WCO'), mpos = nums('MPos'), wpos = nums('WPos')
    if (wco) s.wco = wco
    if (mpos) { s.mpos = mpos; s.wpos = mpos.map((v, i) => v - s.wco[i]) }
    else if (wpos) { s.wpos = wpos; s.mpos = wpos.map((v, i) => v + s.wco[i]) }

    let fs = inner.match(/FS:([\d.]+),([\d.]+)/), f = inner.match(/\|F:([\d.]+)/)
    if (fs) { s.feed = +fs[1]; s.spindle = +fs[2] } else if (f) s.feed = +f[1]
    let ov = inner.match(/Ov:(\d+),(\d+),(\d+)/)
    if (ov) s.ov = [+ov[1], +ov[2], +ov[3]]
    let bf = inner.match(/Bf:(\d+),(\d+)/)
    if (bf) s.buf = [+bf[1], +bf[2]]
    let pn = inner.match(/Pn:([A-Z]+)/)
    s.pins = pn ? pn[1] : ''
}

GrblController.prototype.checkJobDone = function() {
    let job = this.job
    if (!job || job.state != 'running') return
    let allSent = job.next >= job.lines.length && !this.pending.some(i => i.job) && !this.inFlight.some(i => i.job)
    if (!allSent) return

    if (job.check) {
        if (!job.checkExit) { job.checkExit = true; this.send('$C') }   // leaving check mode soft-resets GRBL
        return
    }
    if (this.status.state == 'Idle') {
        job.state = 'done'
        job.end = Date.now()
        this.emit('job', job)
    }
}

GrblController.prototype.startJob = function(lines, name, opts = {}) {
    this.job = {
        lines: lines, name: name, next: 0, acked: 0, errors: 0, state: 'running',
        start: Date.now(), check: !!opts.check, stopOnError: opts.stopOnError !== false, pauseMessage: ''
    }
    if (this.job.check) this.send('$C', { quiet: false })
    this.emit('job', this.job)
    this.pump()
}

GrblController.prototype.pauseJob = function() {
    if (this.job) this.job.userHold = true
    this.realtime(0x21)          // '!' feed hold
}

GrblController.prototype.resume = function() {
    if (this.job) { this.job.userHold = false; this.job.pauseMessage = ''; if (this.job.state == 'error') this.job.state = 'running' }
    this.realtime(0x7E)          // '~' cycle start
}

// Stop without losing position: feed hold first, then reset once the machine has stopped
GrblController.prototype.stopJob = function() {
    if (!this.job) return
    this.job.state = 'stopping'
    this.pending = this.pending.filter(i => !i.job)
    this.realtime(0x21)
    let started = Date.now()
    let wait = setInterval(() => {
        let st = this.status.state
        if (st.startsWith('Hold:0') || st == 'Idle' || st == 'Alarm' || Date.now() - started > 3000) {
            clearInterval(wait)
            this.realtime(0x18)
        }
    }, 100)
    this.emit('job', this.job)
}

// ================= G-code preview parsing (machine coordinates) =================

function ParseToolpath(text) {
    let stream = [], segs = []
    let pos = [0, 0, 0], abs = true, motion = 'G0', lastComment = ''
    let b = { x0: 0, x1: 0, y0: 0, y1: 0 }
    let grow = (x, y) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y) }

    for (let raw of text.split(/\r?\n/)) {
        let comment = ''
        let semi = raw.indexOf(';')
        if (semi >= 0) { comment = raw.slice(semi + 1).trim(); raw = raw.slice(0, semi) }
        raw = raw.replace(/\(([^)]*)\)/g, (m, c) => { comment = comment || c.trim(); return '' })
        let code = raw.trim().toUpperCase().replace(/\s+/g, ' ')
        if (!code) { if (comment) lastComment = comment; continue }
        if (code[0] == '%') continue

        let index = stream.length
        stream.push({ text: code, comment: lastComment })
        lastComment = ''

        let words = {}, gs = []
        let re = /([A-Z])\s*([-+]?\d*\.?\d+)/g, m
        while ((m = re.exec(code))) { if (m[1] == 'G') gs.push(+m[2]); else words[m[1]] = +m[2] }
        for (let g of gs) {
            if ([0, 1, 2, 3].includes(g)) motion = 'G' + g
            else if (g == 90) abs = true
            else if (g == 91) abs = false
        }
        if (gs.includes(10) || gs.includes(4) || code.startsWith('$')) continue
        if (!('X' in words || 'Y' in words || 'Z' in words)) continue

        let to = pos.slice()
        'XYZ'.split('').forEach((L, a) => { if (L in words) to[a] = abs ? words[L] : pos[a] + words[L] })

        if (motion == 'G2' || motion == 'G3') {
            let c = [pos[0] + (words.I || 0), pos[1] + (words.J || 0)]
            let r = Math.hypot(pos[0] - c[0], pos[1] - c[1])
            let a0 = Math.atan2(pos[1] - c[1], pos[0] - c[0]), a1 = Math.atan2(to[1] - c[1], to[0] - c[0])
            let sweep = motion == 'G2' ? a0 - a1 : a1 - a0
            sweep = ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI
            let n = Math.max(2, Math.ceil(sweep / (Math.PI / 6)))
            let px = pos[0], py = pos[1]
            for (let k = 1; k <= n; k++) {
                let a = a0 + (motion == 'G2' ? -1 : 1) * sweep * k / n
                let qx = c[0] + r * Math.cos(a), qy = c[1] + r * Math.sin(a)
                segs.push({ x0: px, y0: py, x1: qx, y1: qy, rapid: false, i: index }); grow(qx, qy)
                px = qx; py = qy
            }
        }
        else if (to[0] != pos[0] || to[1] != pos[1]) {
            segs.push({ x0: pos[0], y0: pos[1], x1: to[0], y1: to[1], rapid: motion == 'G0', i: index })
            grow(to[0], to[1])
        }
        pos = to
    }

    return { stream: stream, segs: segs, bounds: b }
}

// ================= Panel UI =================

(function() {
    const app = document.getElementById('generator-box')
    const $ = (id) => document.getElementById(id)
    const grbl = new GrblController()
    window.grbl = grbl

    const hasSerial = 'serial' in navigator
    let kind = hasSerial ? 'serial' : 'sim'
    let jogStep = 10              // mm
    let jogFeed = 1500            // mm/min
    let jobDone = { nails: false, wind: false }
    let job = null            // { name, text, parsed }
    let jobKind = 'nails'
    let fileJob = null
    let windAvailable = false
    let logLines = []

    // ---------- Connection ----------
    function supportNote() {
        if (hasSerial) return 'Plug in the board, press Connect and pick its port (often "USB-SERIAL CH340", "Arduino" or "CP210x"). Close other programs using the port first.'
        if (!window.isSecureContext) return 'USB needs the page served over https (GitHub Pages) or localhost. The simulator works anywhere.'
        return 'This browser cannot open USB serial ports. Use Chrome or Edge on a computer. The simulator works here.'
    }

    $('mc-support').textContent = supportNote()
    document.querySelectorAll('#mc-kind [data-value]').forEach(b => {
        if (b.dataset.value == 'serial' && !hasSerial) b.disabled = true
        b.addEventListener('click', () => { if (!grbl.connected) { kind = b.dataset.value; update() } })
    })

    $('mc-connect').addEventListener('click', async () => {
        if (grbl.connected) { await grbl.disconnect(); return }
        try {
            let t = kind == 'sim' ? new SimTransport() : new SerialTransport(+$('mc-baud').value)
            await grbl.connect(t)
        }
        catch (e) {
            if (e && e.name == 'NotFoundError') log('No port chosen.', 'msg')
            else log('Could not connect: ' + (e && e.message ? e.message : e), 'error')
            update()
        }
    })

    grbl.on('connected', (label) => { log(`Connected to ${label}. Waiting for GRBL…`, 'msg'); update() })
    grbl.on('disconnected', (reason) => { log(reason || 'Disconnected.', reason ? 'error' : 'msg'); update() })
    grbl.on('welcome', (fw) => { log(`${fw} is ready.`, 'msg'); update() })
    grbl.on('alarm', (code, text) => showBanner(`Alarm ${code}: ${text}`, 'alarm'))
    grbl.on('status', () => { showStatus(); updateHead() })
    grbl.on('line', (text, dir) => log(text, dir))
    grbl.on('job', () => { updateJob(); update() })

    // ---------- Status ----------
    const stateClass = (s) => s.split(':')[0].toLowerCase()

    function showStatus() {
        let s = grbl.status
        let badge = $('mc-state')
        badge.textContent = s.state.split(':')[0]
        badge.className = 'mc-state st-' + stateClass(s.state)
        ;['x', 'y', 'z'].forEach((a, i) => {
            $('mc-w' + a).textContent = Units.num(s.wpos[i], 'pos')
            $('mc-m' + a).textContent = Units.num(s.mpos[i], 'pos')
        })
        $('mc-feed').textContent = Units.num(s.feed, 'speed')
        $('mc-ov').textContent = s.ov[0] + '%'
        $('mc-ov-side').textContent = s.ov[0] + '%'

        // Paused by M0 or by the user: say why and offer Resume
        // (Only with a known reason: right after Resume the last report may still say Hold for a moment.)
        let j = grbl.job
        let reason = j && (j.state == 'error' ? j.errorText : j.userHold ? 'Paused. Press Resume to continue.' : j.pauseMessage)
        if (s.state.startsWith('Hold') && j && (j.state == 'running' || j.state == 'error') && reason) {
            showBanner(reason, j.state == 'error' ? 'alarm' : 'pause', true)
        }
        else if (s.state == 'Alarm') showBanner('Alarm: the machine is locked. Home ($H) or Unlock ($X), then re-check work zero.', 'alarm')
        else if (!s.state.startsWith('Hold')) hideBanner()
        update()
    }

    function showBanner(text, kind, resume) {
        $('mc-banner-text').textContent = text
        $('mc-banner').className = 'mc-banner ' + kind
        $('mc-banner').hidden = false
        $('mc-banner-resume').hidden = !resume
    }

    function hideBanner() { $('mc-banner').hidden = true }

    $('mc-banner-resume').addEventListener('click', () => grbl.resume())

    // ---------- Enabling controls ----------
    function update() {
        let c = grbl.connected
        let st = grbl.status.state
        let ready = c && !!grbl.firmware
        let running = grbl.job && (grbl.job.state == 'running' || grbl.job.state == 'stopping' || grbl.job.state == 'error')
        let idle = ready && (st == 'Idle' || st == 'Jog') && !running

        app.classList.toggle('machine-connected', c)
        $('mc-connect').textContent = c ? 'Disconnect' : (kind == 'sim' ? 'Start simulator' : 'Connect')
        $('mc-connect').classList.toggle('btn-accent', !c)
        $('mc-connect').classList.toggle('btn-ghost', c)
        document.querySelectorAll('#mc-kind [data-value]').forEach(b => {
            b.setAttribute('aria-pressed', b.dataset.value == kind)
            b.disabled = c || (b.dataset.value == 'serial' && !hasSerial)
        })
        $('mc-baud-field').hidden = kind != 'serial'
        $('mc-baud').disabled = c

        document.querySelectorAll('[data-jog]').forEach(b => b.disabled = !idle)
        $('mc-jog-cancel').disabled = !(ready && st == 'Jog')
        document.querySelectorAll('[data-zero], #mc-goto-zero').forEach(b => b.disabled = !idle)
        $('mc-home').disabled = !ready || running
        $('mc-unlock').disabled = !ready || running
        $('mc-reset').disabled = !c
        document.querySelectorAll('[data-ov]').forEach(b => b.disabled = !ready)
        document.querySelectorAll('[data-quick]').forEach(b => b.disabled = !ready || (running && b.dataset.quick != '?'))
        $('mc-cmd').disabled = !c
        $('mc-send').disabled = !c

        $('mc-start').disabled = !(idle && job && job.parsed.stream.length)
        $('mc-pause').disabled = !(running && !st.startsWith('Hold'))
        $('mc-resume').disabled = !(c && st.startsWith('Hold'))
        $('mc-stop').disabled = !running
        document.querySelectorAll('#mc-job [data-value]').forEach(b => b.disabled = running || (b.dataset.value == 'wind' && !windAvailable))
        $('mc-check').disabled = running
        paintNav()
    }

    // ---------- Jogging ----------
    // Jog steps that make sense in each unit (stored in mm)
    const JOG_STEPS = { mm: [0.1, 1, 10, 50], cm: [0.01, 0.1, 1, 5], in: [0.01, 0.1, 1, 2] }
    let jogIndex = 2

    function paintSteps() {
        let steps = JOG_STEPS[Units.unit]
        document.querySelectorAll('#mc-step [data-value]').forEach((b, i) => {
            b.textContent = steps[i]
            b.dataset.value = Units.to(steps[i])
            b.setAttribute('aria-pressed', i == jogIndex)
        })
        jogStep = Units.to(steps[jogIndex])
    }

    document.querySelectorAll('#mc-step [data-value]').forEach((b, i) => b.addEventListener('click', () => {
        jogIndex = i
        paintSteps()
    }))

    Units.bind($('mc-jog-feed'), () => jogFeed, (v) => jogFeed = v, 'speed', 10, 20000)
    paintSteps()

    function jog(dx, dy, dz) {
        let feed = jogFeed
        let parts = []
        if (dx) parts.push('X' + (dx * jogStep).toFixed(3))
        if (dy) parts.push('Y' + (dy * jogStep).toFixed(3))
        if (dz) parts.push('Z' + (dz * Math.min(jogStep, 10)).toFixed(3))    // Z steps capped at 10 mm
        grbl.send(`$J=G91 G21 ${parts.join(' ')} F${Math.round(dz && !dx && !dy ? Math.min(feed, 600) : feed)}`)
    }

    document.querySelectorAll('[data-jog]').forEach(b => b.addEventListener('click', () => {
        let [dx, dy, dz] = b.dataset.jog.split(',').map(Number)
        jog(dx, dy, dz)
    }))

    $('mc-jog-cancel').addEventListener('click', () => grbl.realtime(0x85))

    document.addEventListener('keydown', (e) => {
        if (!$('mc-keys').checked || !app.classList.contains('mode-machine')) return
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type != 'checkbox') return
        let map = { ArrowLeft: [-1, 0, 0], ArrowRight: [1, 0, 0], ArrowUp: [0, 1, 0], ArrowDown: [0, -1, 0], PageUp: [0, 0, 1], PageDown: [0, 0, -1] }
        if (e.key == 'Escape') { grbl.realtime(0x85); return }
        if (!map[e.key]) return
        e.preventDefault()
        let b = document.querySelector(`[data-jog="${map[e.key].join(',')}"]`)
        if (b && !b.disabled) jog(...map[e.key])
    })

    // ---------- Work zero & machine ----------
    document.querySelectorAll('[data-zero]').forEach(b => b.addEventListener('click', () => {
        let axes = b.dataset.zero.split('').map(a => a + '0').join(' ')
        grbl.send(`G10 L20 P1 ${axes}`)
        log(`Work zero set: ${b.dataset.zero.split('').join(', ')} now read 0 here.`, 'msg')
    }))

    $('mc-goto-zero').addEventListener('click', () => grbl.send('G90 G0 X0 Y0'))
    $('mc-home').addEventListener('click', () => grbl.send('$H'))
    $('mc-unlock').addEventListener('click', () => grbl.send('$X'))
    $('mc-reset').addEventListener('click', () => grbl.realtime(0x18))
    document.querySelectorAll('[data-ov]').forEach(b => b.addEventListener('click', () => grbl.realtime(parseInt(b.dataset.ov, 16))))

    // ---------- Console ----------
    const history = []
    let histPos = 0

    function log(text, dir) {
        if (dir == 'status' && !$('mc-show-status').checked) return
        let row = document.createElement('div')
        row.className = 'log-' + dir
        row.textContent = (dir == 'out' ? '› ' : '') + text
        let box = $('mc-log')
        let stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 30
        box.appendChild(row)
        logLines.push(row)
        while (logLines.length > 600) logLines.shift().remove()
        if (stick) box.scrollTop = box.scrollHeight
    }

    function sendCommand(text) {
        text = text.trim()
        if (!text) return
        history.push(text)
        histPos = history.length
        if (text == '?' ) grbl.realtime(0x3F)
        else if (text == '!') grbl.realtime(0x21)
        else if (text == '~') grbl.realtime(0x7E)
        else if (text.toLowerCase() == 'ctrl-x' || text == '^X') grbl.realtime(0x18)
        else grbl.send(text)
        if (text == '?') log('?', 'out')
    }

    $('mc-send').addEventListener('click', () => { sendCommand($('mc-cmd').value); $('mc-cmd').value = '' })
    $('mc-cmd').addEventListener('keydown', (e) => {
        if (e.key == 'Enter') { sendCommand($('mc-cmd').value); $('mc-cmd').value = '' }
        else if (e.key == 'ArrowUp' && histPos > 0) { histPos--; $('mc-cmd').value = history[histPos]; e.preventDefault() }
        else if (e.key == 'ArrowDown') { histPos = Math.min(history.length, histPos + 1); $('mc-cmd').value = history[histPos] || ''; e.preventDefault() }
    })
    document.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => sendCommand(b.dataset.quick)))
    $('mc-clear-log').addEventListener('click', () => { $('mc-log').innerHTML = ''; logLines = [] })

    // ---------- Jobs ----------
    document.querySelectorAll('#mc-job [data-value]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.value == 'file') { $('mc-file').click(); return }
        jobKind = b.dataset.value
        loadJob()
    }))

    $('mc-file').addEventListener('change', async () => {
        let f = $('mc-file').files[0]
        if (!f) return
        fileJob = { name: f.name, text: await f.text() }
        jobKind = 'file'
        $('mc-file').value = ''
        loadJob()
    })

    function loadJob() {
        job = null
        let jobs = window.GetPlotterJobs ? window.GetPlotterJobs() : null

        if (jobKind == 'nails' && jobs) job = { name: 'Job 1: nail positions', text: jobs.nailJob.text(), est: jobs.nailJob.time }
        else if (jobKind == 'wind' && jobs && jobs.windJob) job = { name: `Job 2: thread winding (${jobs.lines} lines)`, text: jobs.windJob.text(), est: jobs.windJob.time }
        else if (jobKind == 'file' && fileJob) job = { name: fileJob.name, text: fileJob.text, est: null }

        if (job) job.parsed = ParseToolpath(job.text)
        windAvailable = !!(jobs && jobs.windJob)

        document.querySelectorAll('#mc-job [data-value]').forEach(b => {
            b.setAttribute('aria-pressed', b.dataset.value == jobKind)
            if (b.dataset.value == 'wind') b.disabled = !(jobs && jobs.windJob)
        })

        if (!job) {
            $('mc-job-info').textContent = jobKind == 'wind' ? 'Generate string art first: the winding follows its thread sequence.' : 'Choose a job.'
        }
        else {
            let b = job.parsed.bounds
            $('mc-job-info').innerHTML = `<b>${job.name}</b><br>${job.parsed.stream.length.toLocaleString('en')} lines` +
                (job.est ? ` · about ${fmtTime(job.est)}` : '') + ` · X ${Units.num(b.x0, 'size')} to ${Units.num(b.x1, 'size')}, Y ${Units.num(b.y0, 'size')} to ${Units.fmt(b.y1, 'size')}`
        }
        drawPreview()
        updateJob()
        update()
    }

    function fmtTime(s) {
        s = Math.max(0, Math.round(s))
        let h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
        return h ? `${h} h ${m} min` : m ? `${m} min ${sec} s` : `${sec} s`
    }

    $('mc-start').addEventListener('click', () => {
        if (!job) return
        $('mc-confirm-job').textContent = job.name
        $('mc-confirm-check').hidden = !$('mc-check').checked
        $('mc-confirm').showModal()
    })

    $('mc-confirm-go').addEventListener('click', () => {
        $('mc-confirm').close()
        hideBanner()
        grbl.startJob(job.parsed.stream, job.name, { check: $('mc-check').checked, stopOnError: true })
        log(`${$('mc-check').checked ? 'Checking' : 'Running'} ${job.name}…`, 'msg')
    })

    $('mc-confirm-cancel').addEventListener('click', () => $('mc-confirm').close())
    $('mc-pause').addEventListener('click', () => grbl.pauseJob())
    $('mc-resume').addEventListener('click', () => grbl.resume())
    $('mc-stop').addEventListener('click', () => { grbl.stopJob(); log('Stopping: feed hold, then reset (position kept).', 'msg') })

    let lastDoneDraw = 0

    function updateJob() {
        let j = grbl.job
        let fill = $('mc-progress-fill')
        if (!j) { fill.style.width = '0'; $('mc-job-stats').textContent = ''; return }

        let pct = j.lines.length ? j.acked / j.lines.length * 100 : 0
        fill.style.width = pct.toFixed(1) + '%'
        let elapsed = ((j.end || Date.now()) - j.start) / 1000
        let eta = j.acked > 20 && j.state == 'running' ? elapsed / j.acked * (j.lines.length - j.acked) : null
        let stateText = { running: j.check ? 'Checking' : 'Running', stopping: 'Stopping', stopped: 'Stopped', done: j.check ? 'Check finished' : 'Finished', error: 'Stopped on a problem' }[j.state]
        $('mc-job-stats').textContent = `${stateText} · ${j.acked.toLocaleString('en')} of ${j.lines.length.toLocaleString('en')} lines (${pct.toFixed(0)}%) · ${fmtTime(elapsed)} elapsed` +
            (eta !== null ? ` · ~${fmtTime(eta)} left` : '') + (j.errors ? ` · ${j.errors} error${j.errors > 1 ? 's' : ''}` : '')

        if (j.state == 'done' && !j.announced) {
            j.announced = true
            if (!j.check && (jobKind == 'nails' || jobKind == 'wind')) jobDone[jobKind] = true
            log(j.check ? `Check finished: ${j.errors ? j.errors + ' problem lines (see above)' : 'no errors'}.` : `${j.name} finished.`, j.errors ? 'error' : 'msg')
            if (!j.check) showBanner(`${j.name} finished.`, 'done')
        }

        if (Date.now() - lastDoneDraw > 500 || j.state != 'running') { lastDoneDraw = Date.now(); drawDone() }
    }

    // ---------- Preview (machine coordinates, live head position) ----------
    let view = null

    function drawPreview() {
        let box = $('mc-preview')
        if (!job) { box.innerHTML = '<p class="mc-empty">No job loaded.</p>'; view = null; return }

        let p = job.parsed, b = p.bounds
        let w = Math.max(10, b.x1 - b.x0), h = Math.max(10, b.y1 - b.y0)
        let pad = Math.max(w, h) * 0.08
        let r = (v) => Math.round(v * 100) / 100
        let seg = (s) => `M${r(s.x0)} ${r(-s.y0)}L${r(s.x1)} ${r(-s.y1)}`
        let sw = Math.max(w, h) / 700

        let rapid = p.segs.filter(s => s.rapid).map(seg).join('')
        let feed = p.segs.filter(s => !s.rapid).map(seg).join('')
        let L = Math.max(w, h) * 0.1

        box.innerHTML = `<svg viewBox="${r(b.x0 - pad)} ${r(-b.y1 - pad)} ${r(w + 2 * pad)} ${r(h + 2 * pad)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Job preview with live machine position">` +
            `<path d="${rapid}" class="mc-rapid" stroke-width="${r(sw)}" stroke-dasharray="${r(sw * 4)} ${r(sw * 3)}" />` +
            `<path d="${feed}" class="mc-feedpath" stroke-width="${r(sw)}" />` +
            `<path id="mc-done" class="mc-donepath" stroke-width="${r(sw * 1.4)}" />` +
            `<g class="pl-origin" stroke-width="${r(sw * 2)}"><line x1="0" y1="0" x2="${r(L)}" y2="0" /><line x1="0" y1="0" x2="0" y2="${r(-L)}" />` +
            `<text x="${r(L + sw * 3)}" y="${r(sw * 5)}" font-size="${r(L * 0.3)}">X</text><text x="${r(-sw * 3)}" y="${r(-L)}" font-size="${r(L * 0.3)}" text-anchor="end">Y</text></g>` +
            `<g id="mc-head" class="mc-head"><circle r="${r(sw * 7)}" /><line x1="${r(-sw * 14)}" x2="${r(sw * 14)}" /><line y1="${r(-sw * 14)}" y2="${r(sw * 14)}" /></g>` +
            `<image href="${LOGO_DATA_URL}" x="${r(b.x1 + pad * 0.9 - Math.max(w, h) * 0.22)}" y="${r(-b.y0 + pad * 0.9 - Math.max(w, h) * 0.22 / BRAND.logoAspect)}" width="${r(Math.max(w, h) * 0.22)}" height="${r(Math.max(w, h) * 0.22 / BRAND.logoAspect)}" opacity="0.9" />` +
            `</svg>`
        view = { sw: sw }
        updateHead()
    }

    function updateHead() {
        let head = document.getElementById('mc-head')
        if (!head) return
        let s = grbl.status
        head.setAttribute('transform', `translate(${s.wpos[0].toFixed(2)} ${(-s.wpos[1]).toFixed(2)})`)
        head.style.display = grbl.connected ? '' : 'none'
    }

    function drawDone() {
        let done = document.getElementById('mc-done')
        let j = grbl.job
        if (!done || !job || !j || j.lines !== job.parsed.stream) { if (done) done.setAttribute('d', ''); return }
        let r = (v) => Math.round(v * 100) / 100
        let d = ''
        for (let s of job.parsed.segs) {
            if (s.i >= j.acked) break
            if (!s.rapid) d += `M${r(s.x0)} ${r(-s.y0)}L${r(s.x1)} ${r(-s.y1)}`
        }
        done.setAttribute('d', d)
    }

    // Jobs follow the Plotter tab: refresh when the board, the art or the plotter settings change
    document.addEventListener('stringart:mode', (e) => { if (e.detail.mode == 'machine' && !(grbl.job && grbl.job.state == 'running')) loadJob() })
    document.addEventListener('stringart:template', () => { if (app.classList.contains('mode-machine') && !(grbl.job && grbl.job.state == 'running') && jobKind != 'file') loadJob() })

    window.OpenMachineJob = (kindName) => { jobKind = kindName; loadJob() }

    // ---------- Previous / Next: Job 1 (nails) then Job 2 (winding) ----------
    $('mc-prev').addEventListener('click', () => { jobKind = 'nails'; loadJob() })
    $('mc-next').addEventListener('click', () => { jobKind = 'wind'; loadJob() })

    function paintNav() {
        let running = grbl.job && ['running', 'stopping', 'error'].includes(grbl.job.state)
        $('mc-job-nav').hidden = !grbl.connected
        $('mc-prev').disabled = running || jobKind == 'nails'
        $('mc-next').disabled = running || jobKind == 'wind' || !windAvailable
        $('mc-next').title = windAvailable ? '' : 'Generate string art first'
        $('mc-next').classList.toggle('pulse', jobDone.nails && jobKind == 'nails' && windAvailable && !running)
        $('mc-job-step').textContent = jobKind == 'nails' ? 'Step 1 of 2: nails' : jobKind == 'wind' ? 'Step 2 of 2: winding' : 'Your own file'
    }

    document.addEventListener('stringart:units', () => {
        paintSteps()
        showStatus()
        if (job) loadJob()
    })

    update()
    showStatus()
})()
