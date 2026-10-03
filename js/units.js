/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/units.js - One unit setting (mm, cm or inches) for every length, speed and position on the page.
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

// Everything is stored and calculated in millimetres (and G-code always runs in mm).
// Units only change what is shown and typed.

const Units = {
    unit: 'mm',
    factor: { mm: 1, cm: 10, in: 25.4 },
    names: { mm: 'mm', cm: 'cm', in: 'in' },

    // Decimal places per kind of value and unit
    digits: {
        size:  { mm: 0, cm: 1, in: 2 },     // board sizes, plotter area
        fine:  { mm: 1, cm: 2, in: 3 },     // inset, offsets, mark size, diameters, radius, Z
        pos:   { mm: 2, cm: 3, in: 3 },     // machine positions
        speed: { mm: 0, cm: 0, in: 1 }      // per minute
    },

    from(mm) { return mm / this.factor[this.unit] },
    to(value) { return value * this.factor[this.unit] },

    num(mm, kind = 'fine') {
        let d = this.digits[kind][this.unit]
        let v = this.from(mm)
        let s = v.toFixed(d)
        return s == '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s
    },

    fmt(mm, kind = 'fine') { return `${this.num(mm, kind)} ${this.names[this.unit]}` },
    speed(mmPerMin) { return `${this.num(mmPerMin, 'speed')} ${this.names[this.unit]}/min` },

    // Long distances (path lengths): metres / feet
    long(mm) { return this.unit == 'in' ? `${(mm / 304.8).toFixed(0)} ft` : `${(mm / 1000).toFixed(1)} m` },

    // A size in the board's two dimensions, e.g. "400 × 346 mm"
    pair(wMm, hMm, kind = 'size') { return `${this.num(wMm, kind)} × ${this.num(hMm, kind)} ${this.names[this.unit]}` },

    step(kind = 'fine') { return Math.pow(10, -this.digits[kind][this.unit]) },

    // Keep a number input showing a millimetre value in the current unit.
    // get() returns mm, set(mm) stores it; min / max are in mm.
    bind(input, get, set, kind = 'fine', min = -Infinity, max = Infinity) {
        let show = () => {
            input.value = this.num(get(), kind)
            input.step = kind == 'speed' ? (this.unit == 'in' ? 0.1 : 1) : this.step(kind)
        }
        input.addEventListener('change', () => {
            let v = parseFloat(input.value)
            let mm = isFinite(v) ? this.to(v) : get()
            set(Math.min(max, Math.max(min, mm)))
            show()
        })
        document.addEventListener('stringart:units', show)
        show()
        return show
    },

    set(unit) {
        if (!this.factor[unit]) return
        this.unit = unit
        try { localStorage.setItem('stringart-units', unit) } catch (e) { }
        this.paint()
        document.dispatchEvent(new CustomEvent('stringart:units', { detail: { unit: unit } }))
    },

    // Refresh unit labels written into the page
    paint() {
        document.querySelectorAll('.u-len').forEach(el => el.textContent = this.names[this.unit])
        document.querySelectorAll('.u-speed').forEach(el => el.textContent = this.names[this.unit] + '/min')
        document.querySelectorAll('#unit-switch [data-value]').forEach(b => b.setAttribute('aria-pressed', b.dataset.value == this.unit))
    }
}

try {
    let saved = localStorage.getItem('stringart-units')
    if (Units.factor[saved]) Units.unit = saved
} catch (e) { }
