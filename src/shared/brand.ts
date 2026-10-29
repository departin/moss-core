/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const BRAND = "Moss";

export const MOSS_MARK_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><defs><linearGradient id=\"mg\" x1=\"13\" y1=\"51\" x2=\"50\" y2=\"14\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#4F8F6C\"/><stop offset=\".55\" stop-color=\"#9AD4B1\"/><stop offset=\"1\" stop-color=\"#D8F2E2\"/></linearGradient></defs><rect width=\"64\" height=\"64\" rx=\"19\" fill=\"#141B17\"/><path d=\"M13 51C14.5 30 29 15.5 50 14C48.5 35 34 49.5 13 51Z\" fill=\"url(#mg)\"/><path d=\"M21.5 42.5L38 26\" stroke=\"#141B17\" stroke-opacity=\".45\" stroke-width=\"2.6\" stroke-linecap=\"round\"/></svg>";

export const MOSS_MARK = `data:image/svg+xml,${encodeURIComponent(MOSS_MARK_SVG)}`;

const UPSTREAM_NAMES = /\b(?:Equicord|Vencord|Equibop|Vesktop)(?:'s)?\b/g;

export function rebrand(text: string) {
    return text.replace(UPSTREAM_NAMES, m => m.endsWith("'s") ? `${BRAND}'s` : BRAND).replace(/\bMoss(?:\/Moss)+\b/g, BRAND);
}
