/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ui.css";

import type { ReactNode } from "react";

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange(value: boolean): void; label: ReactNode; description?: ReactNode; }) {
    return (
        <button type="button" role="switch" aria-checked={checked} className={`moss-toggle-row${checked ? " on" : ""}`} onClick={() => onChange(!checked)}>
            <span className="moss-toggle-text">
                <span className="moss-toggle-label">{label}</span>
                {description && <span className="moss-toggle-desc">{description}</span>}
            </span>
            <span className="moss-toggle"><span /></span>
        </button>
    );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, ReactNode][]; onChange(value: T): void; }) {
    return (
        <div className="moss-seg" role="radiogroup">
            {options.map(([key, label]) => (
                <button key={key} type="button" role="radio" aria-checked={value === key} className={value === key ? "on" : ""} onClick={() => onChange(key)}>
                    {label}
                </button>
            ))}
        </div>
    );
}

export function Range({ value, min, max, step = 1, onChange, label, suffix = "" }: { value: number; min: number; max: number; step?: number; onChange(value: number): void; label: ReactNode; suffix?: string; }) {
    return (
        <label className="moss-range">
            <span className="moss-range-head"><span>{label}</span><code>{value}{suffix}</code></span>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.currentTarget.value))} style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties} />
        </label>
    );
}

export function OptionCard({ selected, onSelect, title, description, children }: { selected: boolean; onSelect(): void; title: ReactNode; description?: ReactNode; children?: ReactNode; }) {
    return (
        <button type="button" role="radio" aria-checked={selected} className={`moss-card${selected ? " on" : ""}`} onClick={onSelect}>
            {children}
            <span className="moss-card-text">
                <span className="moss-card-title">{title}<span className="moss-card-check" /></span>
                {description && <span className="moss-card-desc">{description}</span>}
            </span>
        </button>
    );
}
