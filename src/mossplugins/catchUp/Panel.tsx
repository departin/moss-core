/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./catchup.css";

import { t, useLocale } from "@moss/i18n";
import { copyWithToast } from "@utils/discord";
import { Channel } from "@vencord/discord-types";
import { NavigationRouter, useEffect, useState } from "@webpack/common";
import type { ReactNode } from "react";

import { settings } from "./index";
import { channelLabel, Mode, summarize } from "./logic";

type State =
    | { status: "loading"; note: string; }
    | { status: "error"; error: string; }
    | { status: "done"; text: string; model: string; ids: string[]; count: number; note: string; truncated: boolean; seconds: number; };

function inline(line: string, onCite: (n: number) => void, key: string): ReactNode[] {
    return line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d+(?:\s*[,–-]\s*\d+)*\])/g).map((part, i) => {
        if (!part) return null;
        if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${key}${i}`}>{part.slice(2, -2)}</strong>;
        if (/^`[^`]+`$/.test(part)) return <code key={`${key}${i}`}>{part.slice(1, -1)}</code>;
        if (/^\[\d/.test(part)) {
            return part.slice(1, -1).split(/\s*[,–-]\s*/).map(n => (
                <button key={`${key}${i}${n}`} className="mcu-cite" title="Jump to message" onClick={() => onCite(Number(n))}>{n}</button>
            ));
        }
        return part;
    });
}

function Summary({ text, onCite }: { text: string; onCite(n: number): void; }) {
    return (
        <div className="mcu-summary">
            {text.split(/\r?\n/).map((line, i) => {
                const heading = line.match(/^\s*#{1,6}\s+(.*)/);
                if (heading) return <div key={i} className="mcu-h">{inline(heading[1].replace(/\*\*/g, ""), onCite, `h${i}`)}</div>;
                const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
                if (item) return <div key={i} className="mcu-li"><span className="mcu-dot" /><span>{inline(item[1], onCite, `l${i}`)}</span></div>;
                if (!line.trim()) return <div key={i} className="mcu-gap" />;
                return <div key={i} className="mcu-p">{inline(line, onCite, `p${i}`)}</div>;
            })}
        </div>
    );
}

export function Panel({ channel, onClose }: { channel: Channel; onClose(): void; }) {
    useLocale();
    const [mode, setMode] = useState<Mode>("unread");
    const [run, setRun] = useState(0);
    const [state, setState] = useState<State>({ status: "loading", note: t("catchup.reading") });
    const [closing, setClosing] = useState(false);
    const s = settings.use(["recentCount", "maxMessages"]);

    useEffect(() => {
        let cancelled = false;
        setState({ status: "loading", note: t("catchup.reading") });
        summarize(channel, mode, note => !cancelled && setState({ status: "loading", note }))
            .then(result => !cancelled && setState({ status: "done", ...result }))
            .catch((e: Error) => !cancelled && setState({ status: "error", error: e?.message ?? String(e) }));
        return () => { cancelled = true; };
    }, [mode, run]);

    const close = () => {
        setClosing(true);
        setTimeout(onClose, 220);
    };

    const jump = (n: number) => {
        if (state.status !== "done") return;
        const id = state.ids[n - 1];
        if (id) NavigationRouter.transitionTo(`/channels/${channel.guild_id || "@me"}/${channel.id}/${id}`);
    };

    const busy = state.status === "loading";
    const tabs: [Mode, string][] = [["unread", t("catchup.unread")], ["recent", t("catchup.last", { count: s.recentCount })], ["more", t("catchup.last", { count: s.maxMessages })]];

    return (
        <aside className="mcu moss-ui" data-closing={closing || undefined} aria-label={t("catchup.button")}>
            <header className="mcu-head">
                <div className="mcu-title">
                    <span className="mcu-spark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 6h10M4 11h10M4 16h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M18 11.5l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z" fill="currentColor" /></svg>
                    </span>
                    <div>
                        <b>{t("catchup.button")}</b>
                        <span>{channelLabel(channel)}</span>
                    </div>
                </div>
                <button className="msm-x" aria-label={t("common.close")} onClick={close}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
            </header>
            <div className="mcu-bar">
                <div className="moss-seg">
                    {tabs.map(([value, label]) => (
                        <button key={value} className={mode === value ? "on" : ""} disabled={busy} onClick={() => mode === value ? setRun(r => r + 1) : setMode(value)}>{label}</button>
                    ))}
                </div>
                <span className="mcu-spacer" />
                <button className="mcu-icon-btn" disabled={busy} title={t("catchup.again")} onClick={() => setRun(r => r + 1)}>↻</button>
                <button className="mcu-icon-btn" disabled={state.status !== "done"} title={t("catchup.copy")} onClick={() => state.status === "done" && copyWithToast(state.text, t("catchup.copied"))}>⧉</button>
            </div>
            <div className="mcu-body">
                {state.status === "loading" && <div className="mcu-loading"><span className="mcu-spinner" />{state.note}</div>}
                {state.status === "error" && <div className="mcu-error">{state.error}</div>}
                {state.status === "done" && <>
                    <div className="mcu-meta">
                        {[`${state.count} messages`, state.model, `${state.seconds.toFixed(1)}s`].filter(Boolean).join(" · ")}
                        {state.note && <div>{state.note}</div>}
                        {state.truncated && <div>{t("catchup.truncated", { count: state.count })}</div>}
                    </div>
                    <Summary text={state.text} onCite={jump} />
                </>}
            </div>
        </aside>
    );
}
