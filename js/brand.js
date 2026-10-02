/*
 * Custom Base Board String Art Portrait Webtool
 * woodyouloveit.com · wooduloveit.com
 *
 * js/brand.js - Brand identity (logo, websites, copyright) used on the page and in every export.
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

// Brand identity used by the page and stamped into every export.

const BRAND = {
    name: 'woodyouloveit',
    sites: ['woodyouloveit.com', 'wooduloveit.com'],
    url: 'https://woodyouloveit.com',
    author: 'Chanchal Sakarde',
    year: 2026,
    license: 'GPL-3.0',
    licenseUrl: 'https://github.com/ChanchalSakardeQH/Custom-Base-Board-String-Art-Portrait-Webtool#GPL-3.0-1-ov-file',
    repoUrl: 'https://github.com/ChanchalSakardeQH/Custom-Base-Board-String-Art-Portrait-Webtool',
    tool: 'Custom Base Board String Art Portrait Webtool',
    red: '#E7004E',
    logoAspect: 800 / 133            // width / height of LOGO_DATA_URL
}

BRAND.sitesLine = BRAND.sites.join('  ·  ')
BRAND.copyright = `© ${BRAND.year} ${BRAND.author}`
BRAND.copyrightLine = `${BRAND.copyright}  ·  Licensed under ${BRAND.license}`

// Logo embedded so exports carry it even when the page is opened straight from disk (file://)
const LOGO_DATA_URL = 'data:image/png;base64,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'

let brandLogoImage = null

// Resolves to a loaded <img> of the logo (cached)
function LoadBrandLogo() {
    if (brandLogoImage)
        return Promise.resolve(brandLogoImage)

    return new Promise((resolve, reject) => {
        let img = new Image()
        img.onload = () => { brandLogoImage = img; resolve(img) }
        img.onerror = reject
        img.src = LOGO_DATA_URL
    })
}

// Plain-text block for .txt exports
function BrandTextHeader() {
    return [
        `${BRAND.tool}`,
        `${BRAND.sitesLine}`,
        `${BRAND.copyrightLine}`,
        `${BRAND.licenseUrl}`
    ].join('\n')
}

// Metadata object for JSON exports
function BrandMetadata() {
    return {
        tool: BRAND.tool,
        website: BRAND.sites.map(s => 'https://' + s),
        author: BRAND.author,
        copyright: BRAND.copyright,
        license: BRAND.license,
        licenseUrl: BRAND.licenseUrl
    }
}

// Branded footer strip for canvas exports: logo on the left, websites and copyright on the right
function DrawBrandFooter(ctx, x, y, width, height, logo) {
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.fillRect(x, y, width, Math.max(1, height * 0.02))

    let pad = height * 0.22
    let logoH = height * 0.42
    let logoW = logoH * BRAND.logoAspect

    if (logo)
        ctx.drawImage(logo, x + pad, y + (height - logoH) / 2, logoW, logoH)

    let right = x + width - pad
    let maxText = width - pad * 3 - logoW
    let big = Math.min(height * 0.26, maxText / 18)
    let small = big * 0.72

    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#111111'
    ctx.font = `600 ${big}px Arial, Helvetica, sans-serif`
    ctx.fillText(BRAND.sitesLine, right, y + height * 0.47)
    ctx.fillStyle = '#555555'
    ctx.font = `${small}px Arial, Helvetica, sans-serif`
    ctx.fillText(BRAND.copyrightLine, right, y + height * 0.76)
    ctx.restore()
}

// Same footer as SVG markup (coordinates in the SVG's own units)
function BrandFooterSVG(x, y, width, height) {
    let r = (v) => Math.round(v * 100) / 100
    let pad = height * 0.22
    let logoH = height * 0.42
    let logoW = logoH * BRAND.logoAspect
    let right = x + width - pad
    let maxText = width - pad * 3 - logoW
    let big = Math.min(height * 0.26, maxText / 18)
    let small = big * 0.72

    return `<g id="branding">\n` +
        `    <rect x="${r(x)}" y="${r(y)}" width="${r(width)}" height="${r(height)}" fill="#ffffff" />\n` +
        `    <rect x="${r(x)}" y="${r(y)}" width="${r(width)}" height="${r(Math.max(0.5, height * 0.02))}" fill="#000000" fill-opacity="0.12" />\n` +
        `    <a href="${BRAND.url}"><image x="${r(x + pad)}" y="${r(y + (height - logoH) / 2)}" width="${r(logoW)}" height="${r(logoH)}" href="${LOGO_DATA_URL}" xlink:href="${LOGO_DATA_URL}" /></a>\n` +
        `    <text x="${r(right)}" y="${r(y + height * 0.47)}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="${r(big)}" fill="#111111">${BRAND.sitesLine}</text>\n` +
        `    <text x="${r(right)}" y="${r(y + height * 0.76)}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${r(small)}" fill="#555555">${BRAND.copyrightLine}</text>\n` +
        `</g>`
}

// Start loading straight away so the first export already has it
LoadBrandLogo().catch(() => {})
