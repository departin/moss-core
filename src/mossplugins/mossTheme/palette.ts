/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ColorMode = "moss" | "discord" | "custom";
export type AccentStyle = "solid" | "gradient";

export interface ThemeOptions {
    colorMode: ColorMode;
    accentStyle: AccentStyle;
    accent: string;
    accent2: string;
    accent3: string;
    gradientAngle: number;
    tint: number;
}

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => {
    const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]: Rgb) => "#" + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => {
    const [x, y] = [toRgb(a), toRgb(b)];
    return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};
const rgba = (hex: string, alpha: number) => `rgb(${toRgb(hex).join(" ")} / ${alpha})`;

function luminance(hex: string) {
    const [r, g, b] = toRgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
}

export const isHex = (value: string) => /^#?[0-9a-f]{6}$/i.test(value);

const MOSS_SURFACES = {
    deep: "#0D110F", rail: "#111614", bark: "#151B18", loam: "#181F1C", stone: "#1F2723", stone2: "#232C28", hover: "#26302B", lichen: "#2A3430",
    bone: "#ECE9E1", boneDim: "#DDDAD2", sage: "#AAB3AD", muted: "#7E8A83"
};
const NEUTRAL_SURFACES = {
    deep: "#0E0F10", rail: "#121314", bark: "#16181A", loam: "#1A1C1E", stone: "#222427", stone2: "#26292C", hover: "#2A2D31", lichen: "#2F3337",
    bone: "#ECECEA", boneDim: "#DCDCDA", sage: "#ADB1B4", muted: "#80858A"
};

export const MOSS_ACCENT = "#9AD4B1";
const APRICOT = "#F2A774", EMBER = "#E8735E", IDLE = "#E9C46A", ONLINE = "#7FD39A";

export function accentStops(o: ThemeOptions) {
    if (o.colorMode === "moss") return [MOSS_ACCENT];
    const stops = [o.accent, o.accent2, o.accent3].filter(isHex).map(c => c.startsWith("#") ? c : `#${c}`);
    if (!stops.length) return [MOSS_ACCENT];
    return o.accentStyle === "gradient" && stops.length > 1 ? stops : [stops[0]];
}

export function gradientCss(o: ThemeOptions) {
    const stops = accentStops(o);
    return stops.length > 1 ? `linear-gradient(${o.gradientAngle}deg, ${stops.join(", ")})` : stops[0];
}

export function buildVars(o: ThemeOptions): Record<string, string> {
    if (o.colorMode === "discord") {
        return {
            "--moss-accent": "var(--brand-500)",
            "--moss-gradient": "var(--brand-500)",
            "--moss-on-accent": "var(--white, #fff)",
            "--moss-mention": "var(--mention-foreground)",
            "--moss-danger": "var(--status-danger)",
            "--moss-surface": "var(--background-base-lower)",
            "--moss-surface-raised": "var(--background-surface-high)",
            "--moss-text": "var(--text-default)",
            "--moss-text-strong": "var(--text-strong)",
            "--moss-text-muted": "var(--text-muted)",
            "--moss-border": "var(--border-subtle)"
        };
    }

    const stops = accentStops(o);
    const accent = o.colorMode === "custom" ? mix(stops[0], stops[stops.length - 1], 0.35) : MOSS_ACCENT;
    const base = o.colorMode === "custom" ? NEUTRAL_SURFACES : MOSS_SURFACES;
    const tint = o.colorMode === "custom" ? Math.min(60, Math.max(0, o.tint)) / 100 : 0;
    const s = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, mix(v, stops[0], k.startsWith("bone") || k === "sage" || k === "muted" ? tint / 4 : tint * 0.55)])) as typeof base;
    const onAccent = contrast(accent, "#0D110F") >= contrast(accent, "#FFFFFF") ? "#0D110F" : "#FFFFFF";
    const link = contrast(accent, s.loam) >= 4.5 ? accent : mix(accent, "#FFFFFF", 0.45);
    const gradient = gradientCss(o);

    const vars: Record<string, string> = {
        "--moss-accent": accent,
        "--moss-gradient": gradient,
        "--moss-on-accent": onAccent,
        "--moss-mention": APRICOT,
        "--moss-danger": EMBER,
        "--moss-surface": s.bark,
        "--moss-surface-raised": s.stone,
        "--moss-text": s.boneDim,
        "--moss-text-strong": s.bone,
        "--moss-text-muted": s.muted,
        "--moss-border": rgba(s.sage, 0.1),

        "--app-frame-background": s.deep,
        "--background-base-lowest": s.deep,
        "--background-base-lower": s.bark,
        "--background-base-low": s.loam,
        "--background-surface-high": s.stone,
        "--background-surface-higher": s.stone2,
        "--background-surface-highest": s.hover,
        "--bg-surface-raised": s.stone,
        "--modal-background": s.bark,
        "--card-background-default": s.stone,
        "--card-primary-pressed-bg": s.stone2,
        "--card-secondary-bg": rgba(s.sage, 0.08),
        "--background-accent": s.stone2,
        "--background-secondary-alt": s.stone2,
        "--chat-background": s.loam,
        "--chat-background-default": s.loam,
        "--channeltextarea-background": s.stone,
        "--input-background-default": s.rail,
        "--background-primary": s.loam,
        "--background-secondary": s.bark,
        "--background-tertiary": s.deep,
        "--background-floating": s.rail,
        "--background-scrim": "rgb(6 8 7 / 0.72)",

        "--background-mod-muted": rgba(s.sage, 0.05),
        "--background-mod-subtle": rgba(s.sage, 0.08),
        "--background-mod-normal": rgba(s.sage, 0.12),
        "--background-mod-strong": rgba(s.sage, 0.16),
        "--interactive-background-default": rgba(s.sage, 0.05),
        "--interactive-background-hover": rgba(s.sage, 0.09),
        "--interactive-background-active": rgba(s.sage, 0.13),
        "--interactive-background-selected": rgba(accent, 0.14),
        "--message-background-hover": rgba(s.sage, 0.035),
        "--control-secondary-background-default": rgba(s.sage, 0.1),
        "--control-secondary-background-hover": rgba(s.sage, 0.14),
        "--control-secondary-background-active": rgba(s.sage, 0.18),

        "--border-muted": rgba(s.sage, 0.05),
        "--border-subtle": rgba(s.sage, 0.09),
        "--border-normal": rgba(s.sage, 0.15),
        "--border-strong": rgba(s.sage, 0.3),
        "--app-frame-border": rgba(s.sage, 0.07),
        "--chat-border": rgba(s.sage, 0.09),
        "--card-border-default": rgba(s.sage, 0.09),

        "--text-default": s.boneDim,
        "--text-normal": s.boneDim,
        "--text-strong": s.bone,
        "--header-primary": s.bone,
        "--header-secondary": s.sage,
        "--text-muted": s.muted,
        "--chat-text-muted": s.muted,
        "--text-subtle": s.sage,
        "--text-link": link,
        "--text-brand": link,
        "--interactive-text-default": s.sage,
        "--interactive-text-hover": s.bone,
        "--interactive-text-active": s.bone,
        "--interactive-icon-default": s.sage,
        "--interactive-icon-hover": s.bone,
        "--interactive-icon-active": s.bone,
        "--interactive-normal": s.sage,
        "--interactive-hover": s.bone,
        "--interactive-active": s.bone,
        "--interactive-muted": s.lichen,

        "--brand-500": accent,
        "--background-brand": accent,
        "--control-brand-foreground": link,
        "--control-brand-foreground-new": link,
        "--control-primary-background-default": accent,
        "--control-primary-background-hover": mix(accent, "#FFFFFF", 0.12),
        "--control-primary-background-active": mix(accent, "#000000", 0.12),
        "--control-primary-border-default": "transparent",
        "--control-primary-border-hover": "transparent",
        "--control-primary-border-active": "transparent",
        "--control-primary-text-default": onAccent,
        "--control-primary-text-hover": onAccent,
        "--control-primary-text-active": onAccent,
        "--control-primary-icon-default": onAccent,
        "--control-primary-icon-hover": onAccent,
        "--control-primary-icon-active": onAccent,
        "--interactive-accent-background-hover": accent,
        "--interactive-accent-background-selected": accent,
        "--interactive-accent-background-active": mix(accent, "#000000", 0.12),

        "--mention-background": rgba(APRICOT, 0.16),
        "--mention-foreground": APRICOT,
        "--message-mentioned-background-default": rgba(APRICOT, 0.07),
        "--message-mentioned-background-hover": rgba(APRICOT, 0.1),
        "--background-feedback-notification": APRICOT,
        "--status-online": ONLINE,
        "--status-positive": ONLINE,
        "--status-speaking": ONLINE,
        "--status-danger": EMBER,
        "--status-warning": IDLE,

        "--scrollbar-auto-thumb": s.lichen,
        "--scrollbar-thin-thumb": s.lichen,
        "--scrollbar-auto-scrollbar-color-thumb": s.lichen,
        "--scrollbar-auto-scrollbar-color-track": "transparent",
        "--scrollbar-auto-track": "transparent",
        "--scrollbar-thin-track": "transparent"
    };

    for (let a = 5; a <= 95; a += 5) vars[`--brand-${String(a).padStart(2, "0")}a`] = rgba(accent, a / 100);

    // stop Nitro themes tinting everything
    Object.assign(vars, {
        "--custom-theme-base-color": s.deep,
        "--custom-theme-text-color": s.bone,
        "--custom-theme-base-color-amount": "0%",
        "--custom-theme-text-color-amount": "0%",
        "--custom-theme-border-color-amount": "0%",
        "--custom-theme-background": s.deep,
        "--custom-background": "none",
        "--custom-background-gradient-opacity-multiplier": "0",
        "--background-gradient": "none"
    });
    for (const layer of ["lowest", "lower", "low", "high", "higher", "highest", "chat", "app-frame", "chat-preview"]) vars[`--background-gradient-${layer}`] = "none";
    return vars;
}

export const MOTION = {
    smooth: { ease: "cubic-bezier(.22, 1, .36, 1)", dur: 220 },
    snappy: { ease: "cubic-bezier(.2, .9, .3, 1)", dur: 140 },
    playful: { ease: "cubic-bezier(.34, 1.56, .64, 1)", dur: 320 },
    minimal: { ease: "ease", dur: 180 },
    off: { ease: "linear", dur: 0 }
} as const;

export type MotionPreset = keyof typeof MOTION;
