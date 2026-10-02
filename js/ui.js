/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/ui.js - Page UI: chips, Original/String art flip, modes, progress, exports.
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

// Page UI around the generator: shape / option chips, the Original ⇄ String art flip,
// the progress thread, export buttons and the empty-state animation.
(function() {
    const app = document.getElementById('generator-box')
    const board = document.getElementById('board')
    const btnOriginal = document.getElementById('view-original')
    const btnArt = document.getElementById('view-art')
    const threadFill = document.getElementById('thread-fill')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    // ---------- Chips mirror hidden <select>s, which stay the source of truth for the generator ----------
    document.querySelectorAll('[data-chips-for]').forEach(group => {
        const select = document.getElementById(group.dataset.chipsFor)
        const chips = Array.from(group.querySelectorAll('[data-value]'))

        const sync = () => chips.forEach(chip => {
            chip.setAttribute('aria-pressed', chip.dataset.value == select.value)
            chip.disabled = select.disabled
        })

        chips.forEach(chip => chip.addEventListener('click', () => {
            if (select.value == chip.dataset.value)
                return

            select.value = chip.dataset.value
            select.dispatchEvent(new Event('change'))
            sync()
        }))

        // The generator enables / disables the selects; follow along
        new MutationObserver(sync).observe(select, { attributes: true, attributeFilter: ['disabled'] })
        sync()
    })

    // ---------- Sliders show their value while dragging ----------
    document.querySelectorAll('input[type="range"][data-output]').forEach(slider => {
        const output = document.getElementById(slider.dataset.output)
        const show = () => output.textContent = (+slider.value).toLocaleString('en')
        slider.addEventListener('input', show)
        slider.addEventListener('change', show)
        show()
    })

    // ---------- Original ⇄ String art ----------
    function showOriginal(show) {
        if (app.classList.contains('show-original') == show)
            return

        app.classList.toggle('show-original', show)
        btnOriginal.setAttribute('aria-pressed', show)
        btnArt.setAttribute('aria-pressed', !show)

        if (!reduceMotion.matches) {
            board.classList.remove('is-flipping')
            void board.offsetWidth // restart the lift animation
            board.classList.add('is-flipping')
        }
    }

    board.addEventListener('animationend', () => board.classList.remove('is-flipping'))
    btnOriginal.addEventListener('click', () => showOriginal(true))
    btnArt.addEventListener('click', () => showOriginal(false))

    // F flips the board (when not typing in a field)
    document.addEventListener('keydown', (e) => {
        if (e.key != 'f' && e.key != 'F')
            return
        if (e.ctrlKey || e.metaKey || e.altKey || btnArt.disabled || app.classList.contains('mode-template'))
            return
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type != 'range' && document.activeElement.type != 'checkbox')
            return

        showOriginal(!app.classList.contains('show-original'))
    })

    btnOriginal.title = btnArt.title = 'Flip the board (F)'

    // ---------- Generator events ----------
    document.addEventListener('stringart:imageloaded', () => {
        app.classList.add('has-image')
        btnOriginal.disabled = false
        btnArt.disabled = false
        threadFill.style.width = '0'
    })

    document.addEventListener('stringart:start', () => {
        app.classList.add('is-generating')
        showOriginal(false) // watch the thread go down
    })

    document.addEventListener('stringart:progress', (e) => {
        let { done, total } = e.detail
        threadFill.style.width = (total ? done / total * 100 : 0) + '%'
    })

    document.addEventListener('stringart:stop', () => {
        app.classList.remove('is-generating')
    })

    document.addEventListener('stringart:reset', () => {
        app.classList.remove('is-generating')
        threadFill.style.width = '0'
    })

    // ---------- Buttons ----------
    document.getElementById('empty-select-btn').addEventListener('click', () => {
        document.getElementById('select-btn').click()
    })

    const saveType = document.getElementById('save-type-box')
    document.querySelectorAll('[data-save]').forEach(btn => btn.addEventListener('click', () => {
        // "Board template…" opens the Board template tab with this art's nails
        if (btn.dataset.save == 'template') {
            setMode('template')
            if (window.OpenBoardTemplate) window.OpenBoardTemplate(true)
            return
        }

        saveType.value = btn.dataset.save
        generator.Save()
    }))

    // ---------- Modes: String art | Board template ----------
    const tabs = { art: document.getElementById('tab-art'), template: document.getElementById('tab-template') }
    const panels = { art: document.getElementById('panel-art'), template: document.getElementById('panel-template') }
    const stages = { art: document.getElementById('stage-art'), template: document.getElementById('stage-template') }

    function setMode(mode) {
        for (let key of ['art', 'template']) {
            let on = key == mode
            tabs[key].setAttribute('aria-selected', on)
            tabs[key].tabIndex = on ? 0 : -1
            panels[key].hidden = !on
            stages[key].hidden = !on
        }

        app.classList.toggle('mode-template', mode == 'template')
        document.dispatchEvent(new CustomEvent('stringart:mode', { detail: { mode: mode } }))
    }

    tabs.art.addEventListener('click', () => setMode('art'))
    tabs.template.addEventListener('click', () => setMode('template'))

    // Arrow keys move between the two tabs
    document.querySelector('.mode-tabs').addEventListener('keydown', (e) => {
        if (e.key != 'ArrowLeft' && e.key != 'ArrowRight')
            return
        let next = app.classList.contains('mode-template') ? 'art' : 'template'
        setMode(next)
        tabs[next].focus()
    })

    // Choosing a photo always happens on the String art tab
    document.getElementById('select-btn').addEventListener('click', () => {
        if (app.classList.contains('mode-template'))
            setMode('art')
    })

    setMode('art')

    // ---------- Empty state: a little hexagon board threads itself once on load ----------
    function drawEmptyArt() {
        const svg = document.getElementById('empty-art')
        const ns = 'http://www.w3.org/2000/svg'
        const cx = 100, cy = 100, R = 88
        const perSide = 6
        const nails = []

        for (let s = 0; s < 6; s++) {
            let a1 = -Math.PI / 2 + s * Math.PI / 3
            let a2 = a1 + Math.PI / 3
            let p1 = { x: cx + R * Math.cos(a1), y: cy + R * Math.sin(a1) }
            let p2 = { x: cx + R * Math.cos(a2), y: cy + R * Math.sin(a2) }

            for (let j = 0; j < perSide; j++) {
                let t = j / perSide
                nails.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t })
            }
        }

        // A continuous thread, the way a real board is wound: hop a fixed number of nails each time
        const n = nails.length
        const hops = 60
        let current = 0

        for (let i = 0; i < hops; i++) {
            let next = (current + 13 + (i % 3) * 4) % n
            let a = nails[current], b = nails[next]
            let line = document.createElementNS(ns, 'line')
            line.setAttribute('x1', a.x.toFixed(1))
            line.setAttribute('y1', a.y.toFixed(1))
            line.setAttribute('x2', b.x.toFixed(1))
            line.setAttribute('y2', b.y.toFixed(1))
            line.setAttribute('class', 'line draw')
            line.style.setProperty('--len', Math.hypot(b.x - a.x, b.y - a.y).toFixed(1))
            line.style.setProperty('--delay', (300 + i * 45) + 'ms')
            svg.appendChild(line)
            current = next
        }

        for (let p of nails) {
            let c = document.createElementNS(ns, 'circle')
            c.setAttribute('cx', p.x.toFixed(1))
            c.setAttribute('cy', p.y.toFixed(1))
            c.setAttribute('r', '1.6')
            c.setAttribute('class', 'nail')
            svg.appendChild(c)
        }
    }

    drawEmptyArt()
})()
