/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { buildVars, gradientCss, MOTION, MotionPreset, ThemeOptions } from "@mossplugins/mossTheme/palette";
import { useEffect, useMemo, useState } from "@webpack/common";
import type { CSSProperties } from "react";

const DISCORD_PREVIEW = {
    deep: "#121214", bark: "#18181c", loam: "#1c1c21", stone: "#24242a", text: "#dbdee1", strong: "#f2f3f5", muted: "#8a8e96", accent: "#5865F2", onAccent: "#ffffff", line: "rgb(255 255 255 / .07)"
};

const SERVER_COLORS = ["#7FB79A", "#7E97C8", "#D08C6A", "#B08BBB"];
const AUTHORS = [["#7FB79A", 62], ["#B08BBB", 48], ["#D08C6A", 70]] as const;

export function previewStyle(options: ThemeOptions, motion: MotionPreset = "smooth"): CSSProperties {
    const { ease, dur } = MOTION[motion];
    const timing = {
        "--pv-ease": ease,
        "--pv-dur": `${dur}ms`,
        "--pv-rise": motion === "minimal" || motion === "off" ? "0px" : motion === "playful" ? "10px" : "5px",
        "--pv-scale": motion === "minimal" || motion === "off" ? "1" : motion === "playful" ? ".88" : ".96"
    };
    if (options.colorMode === "discord") {
        const d = DISCORD_PREVIEW;
        return { ...timing, "--pv-deep": d.deep, "--pv-bark": d.bark, "--pv-loam": d.loam, "--pv-stone": d.stone, "--pv-text": d.text, "--pv-strong": d.strong, "--pv-muted": d.muted, "--pv-accent": d.accent, "--pv-fill": d.accent, "--pv-on-accent": d.onAccent, "--pv-line": d.line } as CSSProperties;
    }
    const v = buildVars(options);
    return {
        ...timing,
        "--pv-deep": v["--background-base-lowest"],
        "--pv-bark": v["--background-base-lower"],
        "--pv-loam": v["--background-base-low"],
        "--pv-stone": v["--background-surface-high"],
        "--pv-text": v["--text-default"],
        "--pv-strong": v["--text-strong"],
        "--pv-muted": v["--text-muted"],
        "--pv-accent": v["--moss-accent"],
        "--pv-fill": gradientCss(options),
        "--pv-on-accent": v["--moss-on-accent"],
        "--pv-line": v["--border-subtle"]
    } as CSSProperties;
}

// tiny Discord window for previews, demo loops the animations
export function MiniApp({ options, motion = "smooth", demo = false, compact = false }: { options: ThemeOptions; motion?: MotionPreset; demo?: boolean; compact?: boolean; }) {
    const [step, setStep] = useState(demo ? 0 : 7);
    const style = useMemo(() => previewStyle(options, motion), [options, motion]);

    useEffect(() => {
        if (!demo) return;
        const id = setInterval(() => setStep(s => (s + 1) % 12), 520);
        return () => clearInterval(id);
    }, [demo]);

    const shown = demo ? (step === 0 ? 0 : Math.min(step, 3)) : 3;
    const server = demo && step >= 7 ? 1 : 0;
    const hover = demo && step >= 4 && step <= 6 ? step - 4 : -1;
    const popup = demo && step >= 8 && step <= 9;

    return (
        <div className={`moss-mini${compact ? " moss-mini-compact" : ""}`} style={style} data-motion={motion} aria-hidden="true">
            <div className="moss-mini-rail">
                <div className="moss-mini-home" />
                {SERVER_COLORS.map((c, i) => (
                    <div key={c} className="moss-mini-server" style={{ background: c }}>
                        <span className={`moss-mini-pill${server === i ? " on" : ""}`} />
                    </div>
                ))}
            </div>
            <div className="moss-mini-side">
                <div className="moss-mini-title" />
                <div key={server} className="moss-mini-channels">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`moss-mini-channel${i === 0 ? " active" : ""}${hover === i - 1 ? " hover" : ""}`}>
                            <i />
                            <b style={{ width: [54, 38, 46, 30][i] + "%" }} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="moss-mini-chat">
                <div className="moss-mini-msgs">
                    {AUTHORS.map(([color, width], i) => (
                        <div key={i} className={`moss-mini-msg${i < shown ? " on" : ""}${i === 1 ? " mention" : ""}`}>
                            <span className="moss-mini-avatar" style={{ background: color }} />
                            <div>
                                <b style={{ background: color, width: 34 + i * 6 }} />
                                <i style={{ width: width + "%" }} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className={`moss-mini-popup${popup ? " on" : ""}`}>
                    <i /><i /><i />
                </div>
                <div className="moss-mini-composer">
                    <span className="moss-mini-send" />
                </div>
            </div>
        </div>
    );
}
