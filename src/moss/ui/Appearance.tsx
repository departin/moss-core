/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t, useLocale } from "@moss/i18n";
import { MOTION_AREAS, settings, themeOptions } from "@mossplugins/mossTheme";
import { accentStops, ColorMode, contrast, isHex, MOTION, MotionPreset } from "@mossplugins/mossTheme/palette";
import { checkForUpdates, updateStatus } from "@mossplugins/mossUpdates";
import { useEffect, useState } from "@webpack/common";

import { OptionCard, Range, Segmented, Toggle } from "./controls";
import { MiniApp } from "./MiniApp";

const PRESETS: [string, string[]][] = [
    ["Moss", ["#9AD4B1", "#4F8F6C"]],
    ["Ocean", ["#7FB3D5", "#9BE7D9"]],
    ["Sunset", ["#F2A774", "#E06C9F"]],
    ["Lavender", ["#B9A6F2", "#7FB3D5"]],
    ["Ember", ["#E8735E", "#F2C46D"]],
    ["Rose", ["#E89AB2", "#F2C7A6"]],
    ["Lime", ["#C3E88D", "#7FD3B5"]],
    ["Mono", ["#D9D9D9", "#8C8C8C"]]
];

const STOP_KEYS = ["accent", "accent2", "accent3"] as const;
function ColorField({ value, onChange }: { value: string; onChange(hex: string): void; }) {
    const [draft, setDraft] = useState(value.toUpperCase());
    useEffect(() => setDraft(value.toUpperCase()), [value]);
    return (
        <div className="moss-color">
            <label className="moss-color-swatch" style={{ background: value }}>
                <input type="color" value={value.toLowerCase()} onChange={e => onChange(e.currentTarget.value.toUpperCase())} />
            </label>
            <input className="moss-color-hex" value={draft} spellCheck={false} maxLength={7}
                onChange={e => {
                    const next = e.currentTarget.value.toUpperCase();
                    setDraft(next);
                    if (isHex(next)) onChange(next.startsWith("#") ? next : "#" + next);
                }} />
        </div>
    );
}

export function LookPicker() {
    useLocale();
    const s = settings.use();
    const options = themeOptions();
    const [editing, setEditing] = useState(0);
    const stops = STOP_KEYS.map(k => s[k]).filter(isHex);
    const gradient = s.accentStyle === "gradient";
    const shownStops = gradient ? Math.max(2, stops.length) : 1;
    const lowContrast = s.colorMode === "custom" && contrast(accentStops(options)[0], "#16181A") < 3;

    const modes: [ColorMode, string, string][] = [
        ["moss", t("look.moss"), t("look.moss.desc")],
        ["discord", t("look.discord"), t("look.discord.desc")],
        ["custom", t("look.custom"), t("look.custom.desc")]
    ];

    return (
        <div className="moss-look">
            <div className="moss-cards moss-cards-3" role="radiogroup">
                {modes.map(([mode, title, desc]) => (
                    <OptionCard key={mode} selected={s.colorMode === mode} onSelect={() => settings.store.colorMode = mode} title={title} description={desc}>
                        <MiniApp options={{ ...options, colorMode: mode }} compact />
                    </OptionCard>
                ))}
            </div>

            {s.colorMode === "custom" && (
                <div className="moss-custom moss-enter">
                    <div className="moss-custom-row">
                        <Segmented value={gradient ? "gradient" : "solid"} options={[["solid", t("look.solid")], ["gradient", t("look.gradient")]]} onChange={v => settings.store.accentStyle = v} />
                        <div className="moss-presets">
                            {PRESETS.map(([name, colors]) => (
                                <button key={name} type="button" className="moss-preset" title={name} style={{ background: `linear-gradient(135deg, ${colors.join(", ")})` }}
                                    onClick={() => {
                                        settings.store.accent = colors[0];
                                        settings.store.accent2 = colors[1];
                                        settings.store.accent3 = "";
                                    }} />
                            ))}
                        </div>
                    </div>

                    <div className="moss-stops">
                        {STOP_KEYS.slice(0, shownStops).map((key, i) => (
                            <button key={key} type="button" className={`moss-stop${editing === i ? " on" : ""}`} onClick={() => setEditing(i)}>
                                <span style={{ background: isHex(s[key]) ? s[key] : "#888" }} />
                                <code>{isHex(s[key]) ? s[key].toUpperCase() : "—"}</code>
                            </button>
                        ))}
                        {gradient && shownStops < 3 && (
                            <button type="button" className="moss-stop moss-stop-add" onClick={() => { settings.store.accent3 = "#E8C9F2"; setEditing(2); }}>+ {t("look.addStop")}</button>
                        )}
                        {gradient && shownStops === 3 && (
                            <button type="button" className="moss-stop moss-stop-add" onClick={() => { settings.store.accent3 = ""; setEditing(0); }}>− {t("look.removeStop")}</button>
                        )}
                        {gradient && <div className="moss-gradient-bar" style={{ background: `linear-gradient(90deg, ${STOP_KEYS.slice(0, shownStops).map(k => s[k]).filter(isHex).join(", ")})` }} />}
                    </div>

                    <div className="moss-picker">
                        <ColorField value={isHex(s[STOP_KEYS[editing]]) ? s[STOP_KEYS[editing]] : "#9AD4B1"} onChange={hex => settings.store[STOP_KEYS[editing]] = hex} />
                        <div className="moss-sliders">
                            {gradient && <Range label={t("look.angle")} value={s.gradientAngle} min={0} max={360} step={5} suffix="°" onChange={v => settings.store.gradientAngle = v} />}
                            <Range label={t("look.tint")} value={s.tint} min={0} max={60} suffix="%" onChange={v => settings.store.tint = v} />
                            {lowContrast && <div className="moss-warn">{t("look.contrast")}</div>}
                        </div>
                    </div>
                </div>
            )}

            <Toggle checked={s.font === "moss"} onChange={v => settings.store.font = v ? "moss" : "discord"} label={t("look.font")} />
        </div>
    );
}

export function MotionPicker() {
    useLocale();
    const s = settings.use();
    const options = themeOptions();

    return (
        <div className="moss-motion">
            <div className="moss-cards moss-cards-motion" role="radiogroup">
                {(Object.keys(MOTION) as MotionPreset[]).map(preset => (
                    <OptionCard key={preset} selected={s.motion === preset} onSelect={() => settings.store.motion = preset} title={t(`motion.${preset}`)} description={t(`motion.${preset}.desc`)}>
                        <MiniApp options={options} motion={preset} demo compact />
                    </OptionCard>
                ))}
            </div>
            {s.motion !== "off" && (
                <div className="moss-areas moss-enter">
                    <div className="moss-label">{t("motion.areas")}</div>
                    {MOTION_AREAS.map(area => (
                        <Toggle key={area} checked={s[`anim${area}`]} onChange={v => settings.store[`anim${area}`] = v} label={t(`motion.area.${area}`)} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function AppearancePanel() {
    useLocale();
    return (
        <div className="moss-appearance">
            <button type="button" className="moss-toggle-row" onClick={() => window.dispatchEvent(new Event("moss-open-setup"))}>
                <span className="moss-toggle-text">
                    <span className="moss-toggle-label">{t("settings.rerun")}</span>
                    <span className="moss-toggle-desc">{t("settings.rerun.desc")}</span>
                </span>
                <span className="moss-chevron">›</span>
            </button>
            <button type="button" className="moss-toggle-row" onClick={() => window.dispatchEvent(new Event("moss-open-tour"))}>
                <span className="moss-toggle-text">
                    <span className="moss-toggle-label">{t("settings.tour")}</span>
                    <span className="moss-toggle-desc">{t("settings.tour.desc")}</span>
                </span>
                <span className="moss-chevron">›</span>
            </button>
            <h2 className="moss-h2">{t("setup.look.title")}</h2>
            <LookPicker />
            <h2 className="moss-h2">{t("setup.motion.title")}</h2>
            <MotionPicker />
            <h2 className="moss-h2">{t("update.title")}</h2>
            <UpdatesRow />
        </div>
    );
}

function UpdatesRow() {
    const [version, setVersion] = useState("");
    useEffect(() => { updateStatus().then(s => s && setVersion(s.version)); }, []);
    return (
        <button type="button" className="moss-toggle-row" onClick={checkForUpdates}>
            <span className="moss-toggle-text">
                <span className="moss-toggle-label">{t("update.check")}</span>
                {version && <span className="moss-toggle-desc">{t("update.version", { version })}</span>}
            </span>
            <span className="moss-chevron">›</span>
        </button>
    );
}
