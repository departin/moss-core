/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./setup.css";

import { isPluginEnabled, pluginRequiresRestart, plugins, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { EXTRA_PLUGINS, FAVOURITE_PLUGINS, MOSS_FEATURE_PLUGINS } from "@moss/defaults";
import { currentLocale, LANGUAGES, setPreviewLocale, StringKey, t, useLocale } from "@moss/i18n";
import { LookPicker, MotionPicker } from "@moss/ui/Appearance";
import { Toggle } from "@moss/ui/controls";
import { settings as themeSettings } from "@mossplugins/mossTheme";
import { MOSS_MARK_SVG } from "@shared/brand";
import { relaunch } from "@utils/native";
import { LocaleStore, useEffect, useMemo, UserSettingsActionCreators, useState } from "@webpack/common";
import type { ReactNode } from "react";

const STEPS = ["welcome", "language", "look", "motion", "plugins", "desktop", "done"] as const;
type Step = typeof STEPS[number];

const hasDesktop = typeof VesktopNative !== "undefined";
const steps = STEPS.filter(s => s !== "desktop" || hasDesktop);

const initialEnabled = new Map<string, boolean>();

function setPluginEnabled(name: string, on: boolean) {
    const plugin = plugins[name];
    if (!plugin || isPluginEnabled(name) === on) return;
    if (!initialEnabled.has(name)) initialEnabled.set(name, !on);
    Settings.plugins[name].enabled = on;
    if (pluginRequiresRestart(plugin)) return;
    if (on) {
        startDependenciesRecursive(plugin);
        startPlugin(plugin);
    } else stopPlugin(plugin);
}

const needsRestart = () => [...initialEnabled].some(([name, was]) => isPluginEnabled(name) !== was && pluginRequiresRestart(plugins[name]));

function detectLocale() {
    const known = LANGUAGES.map(([code]) => code as string);
    const candidates = [LocaleStore.locale, LocaleStore.systemLocale, ...navigator.languages];
    for (const c of candidates) {
        if (!c) continue;
        if (known.includes(c)) return c;
        const base = known.find(k => k.split("-")[0] === c.split("-")[0]);
        if (base) return base;
    }
    return "en-US";
}

function setDiscordLocale(locale: string) {
    if (LocaleStore.locale === locale) return;
    UserSettingsActionCreators.PreloadedUserSettingsActionCreators.updateAsync("localization", (s: { locale?: { value: string; }; }) => {
        s.locale = { value: locale };
    }, 0);
}

export function Setup({ onClose, onDone, onFinish }: { onClose(): void; onDone(): void; onFinish(): void; }) {
    useLocale();
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState<"forward" | "back">("forward");
    const [leaving, setLeaving] = useState(false);
    const [peek, setPeek] = useState(false);
    const { motion } = themeSettings.use(["motion"]);
    const step: Step = steps[index];

    const go = (delta: number) => {
        setDirection(delta > 0 ? "forward" : "back");
        setPeek(false);
        setIndex(i => Math.min(steps.length - 1, Math.max(0, i + delta)));
    };

    const finish = (restart: boolean) => {
        onDone();
        setPreviewLocale(null);
        if (restart) return relaunch();
        onFinish();
        setLeaving(true);
        setTimeout(onClose, 520);
    };

    useEffect(() => () => setPreviewLocale(null), []);

    const progress = index / (steps.length - 1);

    return (
        <div className="moss-setup" data-leaving={leaving || undefined} data-peek={peek || undefined} data-motion={motion}>
            <div className="moss-setup-backdrop" />
            <div className="moss-setup-panel moss-ui" role="dialog" aria-modal="true" aria-label={t("setup.welcome.title")}>
                <header className="moss-setup-head">
                    <span className="moss-setup-brand">
                        <span className="moss-setup-mark" dangerouslySetInnerHTML={{ __html: MOSS_MARK_SVG }} />
                        moss
                    </span>
                    <div className="moss-setup-dots" aria-label={t("setup.step", { current: index + 1, total: steps.length })}>
                        {steps.map((s, i) => <span key={s} className={i === index ? "on" : i < index ? "done" : ""} />)}
                    </div>
                    <div className="moss-setup-progress"><i style={{ transform: `scaleX(${progress})` }} /></div>
                </header>

                <main key={step} className={`moss-setup-body moss-step-${direction}`}>
                    <StepContent step={step} onNext={() => go(1)} onSkip={() => finish(false)} />
                </main>

                {step !== "welcome" && (
                    <footer className="moss-setup-foot">
                        <button type="button" className="moss-btn moss-btn-ghost" onClick={() => go(-1)}>{t("common.back")}</button>
                        <span className="moss-setup-spacer" />
                        {(step === "look" || step === "motion") && (
                            <button type="button" className="moss-btn moss-btn-ghost" onClick={() => setPeek(true)}>{t("setup.peek")}</button>
                        )}
                        {step === "done"
                            ? <DoneButtons onFinish={finish} />
                            : <button type="button" className="moss-btn moss-btn-primary" onClick={() => go(1)}>{t("common.next")}</button>}
                    </footer>
                )}
            </div>

            <div className="moss-setup-peekbar moss-ui">
                <span>{t("setup.peek")}</span>
                <button type="button" className="moss-btn moss-btn-primary" onClick={() => setPeek(false)}>{t("setup.unpeek")}</button>
            </div>
        </div>
    );
}

function DoneButtons({ onFinish }: { onFinish(restart: boolean): void; }) {
    const restart = needsRestart();
    return (
        <button type="button" className="moss-btn moss-btn-primary" onClick={() => onFinish(restart)}>
            {t(restart ? "setup.done.restart" : "setup.done.go")}
        </button>
    );
}

function StepContent({ step, onNext, onSkip }: { step: Step; onNext(): void; onSkip(): void; }) {
    switch (step) {
        case "welcome": return <Welcome onNext={onNext} onSkip={onSkip} />;
        case "language": return <Language />;
        case "look": return <Section title="setup.look.title" body="setup.look.body"><LookPicker /></Section>;
        case "motion": return <Section title="setup.motion.title" body="setup.motion.body"><MotionPicker /></Section>;
        case "plugins": return <PluginsStep />;
        case "desktop": return <DesktopStep />;
        case "done": return <Done />;
    }
}

function Section({ title, body, children }: { title: StringKey; body: StringKey; children: ReactNode; }) {
    return (
        <div className="moss-stagger">
            <h1 className="moss-setup-title">{t(title)}</h1>
            <p className="moss-setup-text">{t(body)}</p>
            <div>{children}</div>
        </div>
    );
}

function Welcome({ onNext, onSkip }: { onNext(): void; onSkip(): void; }) {
    return (
        <div className="moss-welcome moss-stagger">
            <div className="moss-welcome-mark" dangerouslySetInnerHTML={{ __html: MOSS_MARK_SVG }} />
            <h1 className="moss-welcome-title">{t("setup.welcome.title")}</h1>
            <p className="moss-setup-text moss-welcome-text">{t("setup.welcome.body")}</p>
            <div className="moss-welcome-actions">
                <button type="button" className="moss-btn moss-btn-primary moss-btn-big" onClick={onNext}>{t("setup.welcome.start")}</button>
                <button type="button" className="moss-btn moss-btn-ghost" onClick={onSkip}>{t("common.skip")}</button>
            </div>
        </div>
    );
}

function Language() {
    const detected = useMemo(detectLocale, []);
    const [selected, setSelected] = useState(() => LANGUAGES.some(([code]) => code === currentLocale()) ? currentLocale() : detected);
    const [query, setQuery] = useState("");

    function choose(code: string) {
        setSelected(code);
        setPreviewLocale(code);
        setDiscordLocale(code);
    }

    const shown = LANGUAGES.filter(([code, name]) => !query || name.toLowerCase().includes(query.toLowerCase()) || code.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="moss-stagger">
            <h1 className="moss-setup-title">{t("setup.lang.title")}</h1>
            <p className="moss-setup-text">{t("setup.lang.body")}</p>
            <input className="moss-input" placeholder="Search" value={query} onChange={e => setQuery(e.currentTarget.value)} />
            <div className="moss-langs" role="radiogroup">
                {shown.map(([code, name]) => (
                    <button key={code} type="button" role="radio" aria-checked={selected === code} className={`moss-lang${selected === code ? " on" : ""}`} onClick={() => choose(code)}>
                        <span>{name}</span>
                        {code === detected && <small>{t("setup.lang.detected")}</small>}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PluginGroup({ title, names }: { title: StringKey; names: string[]; }) {
    const [, rerender] = useState(0);
    const available = names.filter(n => plugins[n]);
    return (
        <div className="moss-plugin-group">
            <div className="moss-label">{t(title)}</div>
            <div className="moss-plugin-grid">
                {available.map(name => (
                    <Toggle key={name} checked={isPluginEnabled(name)} label={name} description={plugins[name].description}
                        onChange={on => { setPluginEnabled(name, on); rerender(x => x + 1); }} />
                ))}
            </div>
        </div>
    );
}

function PluginsStep() {
    const [key, setKey] = useState<string>(() => Settings.plugins.CatchUp?.apiKey ?? "");
    return (
        <div className="moss-stagger">
            <h1 className="moss-setup-title">{t("setup.plugins.title")}</h1>
            <p className="moss-setup-text">{t("setup.plugins.body")}</p>
            <PluginGroup title="plugins.group.moss" names={MOSS_FEATURE_PLUGINS} />
            {plugins.CatchUp && (
                <label className="moss-field">
                    <span>{t("plugins.catchupKey")}</span>
                    <input className="moss-input" type="password" placeholder="sk-or-v1-…" value={key}
                        onChange={e => { setKey(e.currentTarget.value); Settings.plugins.CatchUp.apiKey = e.currentTarget.value.trim(); }} />
                    <small>{t("plugins.catchupKeyHint")}</small>
                </label>
            )}
            <PluginGroup title="plugins.group.favs" names={FAVOURITE_PLUGINS} />
            <PluginGroup title="plugins.group.extras" names={EXTRA_PLUGINS} />
            <p className="moss-setup-note">{t("plugins.restart")}</p>
        </div>
    );
}

function DesktopStep() {
    const [autostart, setAutostart] = useState<boolean>(() => VesktopNative.autostart.isEnabled());
    const [desktop, setDesktop] = useState(() => VesktopNative.settings.get());

    const update = (patch: Record<string, unknown>) => {
        const next = { ...desktop, ...patch };
        setDesktop(next);
        VesktopNative.settings.set(next);
    };

    return (
        <div className="moss-stagger">
            <h1 className="moss-setup-title">{t("setup.desktop.title")}</h1>
            <p className="moss-setup-text">{t("setup.desktop.body")}</p>
            <div className="moss-areas">
                <Toggle checked={autostart} label={t("desktop.autostart")} onChange={on => {
                    setAutostart(on);
                    void (on ? VesktopNative.autostart.enable() : VesktopNative.autostart.disable());
                }} />
                <Toggle checked={!!desktop.autoStartMinimized} label={t("desktop.minimized")} onChange={on => update({ autoStartMinimized: on })} />
                <Toggle checked={desktop.minimizeToTray !== false} label={t("desktop.tray")} onChange={on => update({ minimizeToTray: on, tray: on || desktop.tray })} />
            </div>
        </div>
    );
}

function Done() {
    return (
        <div className="moss-welcome moss-stagger">
            <div className="moss-done-check">
                <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
            </div>
            <h1 className="moss-welcome-title">{t("setup.done.title")}</h1>
            <p className="moss-setup-text moss-welcome-text">{t("setup.done.body")}</p>
        </div>
    );
}
