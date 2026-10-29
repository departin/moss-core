/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./progress.css";

export function progressPill(text: string) {
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => Object.assign(document.createElement(tag), { className });
    const pill = make("div", "moss-pill");
    const label = make("span", "moss-pill-text");
    const track = make("i", "moss-pill-bar");
    const bar = document.createElement("b");
    track.append(bar);
    pill.append(make("span", "moss-pill-spin"), label, track);
    label.textContent = text;
    document.body.append(pill);

    return {
        update(next: string, fraction: number) {
            label.textContent = next;
            bar.style.transform = `scaleX(${fraction})`;
        },
        done(final: string) {
            label.textContent = final;
            bar.style.transform = "scaleX(1)";
            pill.classList.add("done");
            setTimeout(() => pill.classList.add("out"), 1800);
            setTimeout(() => pill.remove(), 2200);
        }
    };
}
