/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./manager.css";

import { relativeTime, shortDate, t, useLocale } from "@moss/i18n";
import { isMuted, markGuildsRead, muteGuilds, unmuteGuilds } from "@moss/servers";
import { progressPill } from "@moss/ui/progress";
import { openInviteModal } from "@utils/discord";
import { IconUtils, useEffect, useMemo, useRef, useState } from "@webpack/common";

import { createBackupInvite, getServers, initials, leaveGuild, ServerRow } from "./data";
import { settings } from "./index";
import { addRecent, LeftServer, managedLeaves, removeRecent, useRecent } from "./store";

type Sort = "last" | "name" | "joined" | "members";
type Phase = "pick" | "confirm" | "running" | "finished";

const DAY = 86400000;
const random = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

const ServersIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><path d="m14 17.6 2.3 2.3 4.4-4.6" />
    </svg>
);
export { ServersIcon };

function ServerIcon({ url, name }: { url?: string; name: string; }) {
    return url
        ? <img className="msm-icon" src={url} alt="" />
        : <span className="msm-icon msm-icon-text">{initials(name)}</span>;
}

function Check({ state }: { state: "on" | "off" | "mixed" | "disabled"; }) {
    return (
        <span className={`msm-check ${state}`} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span>
    );
}

function ageClass(ts: number | null) {
    if (ts == null) return "never";
    const days = (Date.now() - ts) / DAY;
    return days < 7 ? "fresh" : days < 60 ? "mid" : "old";
}

export function Manager({ onClose }: { onClose(): void; }) {
    useLocale();
    const [tab, setTab] = useState<"servers" | "recent">("servers");
    const recent = useRecent();
    const [closing, setClosing] = useState(false);
    const [busy, setBusy] = useState(false);

    const close = () => {
        if (busy) return;
        setClosing(true);
        setTimeout(onClose, 260);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <div className="msm" data-closing={closing || undefined}>
            <div className="msm-backdrop" onClick={close} />
            <div className="msm-panel moss-ui" role="dialog" aria-modal="true" aria-label={t("sm.title")}>
                <header className="msm-head">
                    <span className="msm-head-icon"><ServersIcon /></span>
                    <div className="msm-head-text">
                        <h2>{t("sm.title")}</h2>
                        <div className="msm-tabs" role="tablist">
                            <button role="tab" aria-selected={tab === "servers"} className={tab === "servers" ? "on" : ""} onClick={() => setTab("servers")}>{t("sm.tab.servers")}</button>
                            <button role="tab" aria-selected={tab === "recent"} className={tab === "recent" ? "on" : ""} onClick={() => setTab("recent")}>
                                {t("sm.tab.recent")}{recent.length > 0 && <i>{recent.length}</i>}
                            </button>
                        </div>
                    </div>
                    <button className="msm-x" aria-label={t("common.close")} onClick={close} disabled={busy}>
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                </header>
                {tab === "servers" ? <ServersTab setBusy={setBusy} /> : <RecentTab list={recent} onJoin={onClose} />}
            </div>
        </div>
    );
}

function ServersTab({ setBusy }: { setBusy(busy: boolean): void; }) {
    const { backupInvites } = settings.store;
    const rows = useMemo(() => getServers(backupInvites), []);
    const [left, setLeft] = useState<Set<string>>(() => new Set());
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "inactive">("all");
    const [sort, setSort] = useState<Sort>("last");
    const [phase, setPhase] = useState<Phase>("pick");
    const [status, setStatus] = useState({ title: "", detail: "", done: 0, total: 0, error: "" });
    const [paused, setPaused] = useState(false);
    const pausedRef = useRef(false);
    const stopRef = useRef(false);

    const remaining = rows.filter(r => !left.has(r.id));
    const inactive = (r: ServerRow) => r.lastOpened == null || Date.now() - r.lastOpened > 30 * DAY;
    const visible = remaining
        .filter(r => filter === "all" || inactive(r))
        .filter(r => !query || r.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
            switch (sort) {
                case "name": return a.name.localeCompare(b.name);
                case "joined": return (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
                case "members": return (b.members ?? 0) - (a.members ?? 0);
                default: return (a.lastOpened ?? 0) - (b.lastOpened ?? 0);
            }
        });

    const leavable = visible.filter(r => !r.owner);
    const chosen = rows.filter(r => selected.has(r.id) && !left.has(r.id));
    const selectedVisible = leavable.filter(r => selected.has(r.id)).length;
    const allState = selectedVisible === 0 ? "off" : selectedVisible === leavable.length ? "on" : "mixed";
    const locked = phase === "running";

    const setVisible = (on: boolean) => setSelected(prev => {
        const next = new Set(prev);
        for (const r of leavable) on ? next.add(r.id) : next.delete(r.id);
        return next;
    });

    const toggle = (row: ServerRow) => {
        if (row.owner || locked) return;
        setSelected(prev => {
            const next = new Set(prev);
            next.has(row.id) ? next.delete(row.id) : next.add(row.id);
            return next;
        });
    };

    async function wait(seconds: number, label: (s: number) => string) {
        for (let s = seconds; s > 0 && !stopRef.current; s--) {
            setStatus(st => ({ ...st, detail: label(s) }));
            await new Promise(r => setTimeout(r, 1000));
            while (pausedRef.current && !stopRef.current) {
                setStatus(st => ({ ...st, detail: t("sm.paused") }));
                await new Promise(r => setTimeout(r, 250));
            }
        }
    }

    async function leaveOne(row: ServerRow) {
        managedLeaves.add(row.id);
        let invite = row.vanity;
        let inviteExpires: number | null = null;
        if (!invite && row.rejoin === "invite") {
            invite = await createBackupInvite(row.id).catch(() => null);
            if (invite) inviteExpires = Date.now() + 7 * DAY;
        }
        for (; ;) {
            try {
                await leaveGuild(row.id);
                break;
            } catch (e) {
                const err = e as { status?: number; body?: { retry_after?: number; }; };
                if (err?.status !== 429 || stopRef.current) throw e;
                await wait(Math.ceil(err.body?.retry_after ?? 5) + 2, s => t("sm.slowDown", { s }));
            }
        }
        await addRecent({ id: row.id, name: row.name, icon: row.icon, leftAt: Date.now(), invite, inviteExpires });
    }

    async function run() {
        const queue = chosen.filter(r => !r.owner);
        stopRef.current = false;
        pausedRef.current = false;
        setPaused(false);
        setBusy(true);
        setPhase("running");
        setStatus({ title: "", detail: "", done: 0, total: queue.length, error: "" });

        let done = 0;
        for (const row of queue) {
            if (stopRef.current) break;
            setStatus(st => ({ ...st, title: t("sm.leaving", { name: row.name }), detail: "" }));
            try {
                await leaveOne(row);
            } catch (e) {
                const err = e as { body?: { message?: string; }; message?: string; };
                setStatus(st => ({ ...st, error: t("sm.failed", { name: row.name, error: err?.body?.message ?? err?.message ?? String(e) }) }));
                break;
            }
            done++;
            setLeft(prev => new Set(prev).add(row.id));
            setSelected(prev => {
                const next = new Set(prev);
                next.delete(row.id);
                return next;
            });
            setStatus(st => ({ ...st, done, title: t("sm.progress", { done, total: queue.length }) }));
            if (done < queue.length) await wait(done % 10 === 0 ? random(30, 60) : random(6, 10), s => t("sm.next", { s }));
        }

        setStatus(st => ({ ...st, title: stopRef.current ? t("sm.stopped") : t("sm.finished", { count: done }), detail: "" }));
        setPhase("finished");
        setBusy(false);
    }

    const [bulkBusy, setBulkBusy] = useState(false);
    async function bulk(task: (ids: string[], onProgress: (done: number, total: number) => void) => Promise<number>, doneKey: "qa.muted" | "qa.unmuted" | "qa.updated") {
        const ids = chosen.map(r => r.id);
        setBulkBusy(true);
        const pill = progressPill(t("qa.working", { done: 0, total: ids.length }));
        const count = await task(ids, (done, total) => pill.update(t("qa.working", { done, total }), done / total));
        pill.done(t(doneKey, { count }));
        setBulkBusy(false);
    }

    const missing = chosen.filter(r => r.rejoin === "none").length;
    const leaveLabel = chosen.length === 0 ? t("sm.leaveNone") : chosen.length === 1 ? t("sm.leaveOne") : t("sm.leave", { count: chosen.length });

    return (
        <>
            <div className="msm-sub">{t("sm.subtitle", { count: remaining.length })}</div>
            <div className="msm-tools">
                <label className="msm-search">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <input placeholder={t("sm.filter")} value={query} onChange={e => setQuery(e.currentTarget.value)} />
                </label>
                <div className="moss-seg">
                    <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>{t("sm.all")} <i>{remaining.length}</i></button>
                    <button className={filter === "inactive" ? "on" : ""} onClick={() => setFilter("inactive")}>{t("sm.inactive")} <i>{remaining.filter(inactive).length}</i></button>
                </div>
                <select className="msm-sort" value={sort} onChange={e => setSort(e.currentTarget.value as Sort)} aria-label={t("sm.sort")}>
                    <option value="last">{t("sm.sort.last")}</option>
                    <option value="name">{t("sm.sort.name")}</option>
                    <option value="joined">{t("sm.sort.joined")}</option>
                    <option value="members">{t("sm.sort.members")}</option>
                </select>
            </div>

            <div className="msm-selbar">
                <button className="msm-check-btn" onClick={() => !locked && setVisible(allState !== "on")} aria-label={t("sm.selectAll")}><Check state={allState} /></button>
                <button className="msm-link" disabled={locked} onClick={() => setVisible(true)}>{t("sm.selectAll")}</button>
                <button className="msm-link" disabled={locked} onClick={() => setVisible(false)}>{t("sm.deselectAll")}</button>
                <span className="msm-count">{t("sm.selected", { count: chosen.length })}</span>
                {chosen.length > 0 && (
                    <span className="msm-bulk">
                        <button className="msm-chip" disabled={locked || bulkBusy} onClick={() => bulk(ids => { markGuildsRead(ids); return Promise.resolve(ids.length); }, "qa.updated")}>{t("sm.markRead")}</button>
                        <button className="msm-chip" disabled={locked || bulkBusy} onClick={() => bulk((ids, p) => muteGuilds(ids, -1, p), "qa.muted")}>{t("sm.mute")}</button>
                        <button className="msm-chip" disabled={locked || bulkBusy} onClick={() => bulk(unmuteGuilds, "qa.unmuted")}>{t("sm.unmute")}</button>
                    </span>
                )}
            </div>

            <div className="msm-list">
                {visible.length === 0 && <div className="msm-empty">{t("sm.empty")}</div>}
                {rows.filter(r => visible.includes(r) || left.has(r.id)).sort((a, b) => visible.indexOf(a) - visible.indexOf(b)).map(row => {
                    const gone = left.has(row.id);
                    const isSelected = selected.has(row.id);
                    return (
                        <div key={row.id} className={`msm-row${isSelected ? " sel" : ""}${row.owner ? " owner" : ""}${gone ? " gone" : ""}`} onClick={() => toggle(row)}
                            role="checkbox" aria-checked={isSelected} aria-disabled={row.owner}>
                            <Check state={row.owner ? "disabled" : isSelected ? "on" : "off"} />
                            <ServerIcon url={row.iconUrl} name={row.name} />
                            <div className="msm-info">
                                <b>
                                    <span className="msm-name">{row.name}</span>
                                    {row.owner && <span className="msm-badge owner" title={t("sm.ownerTip")}>{t("sm.owner")}</span>}
                                    {isMuted(row.id) && <span className="msm-badge muted">{t("sm.mutedBadge")}</span>}
                                    {!row.owner && row.rejoin === "none" && <span className="msm-badge warn" title={t("sm.noWayBack")}>!</span>}
                                </b>
                                <span>
                                    {row.members != null && t("sm.members", { count: row.members.toLocaleString() })}
                                    {row.members != null && row.joinedAt && " · "}
                                    {row.joinedAt && t("sm.joined", { date: shortDate(row.joinedAt) })}
                                </span>
                            </div>
                            <div className="msm-last">
                                <b><span className={`msm-age ${ageClass(row.lastOpened)}`} />{row.lastOpened == null ? t("sm.never") : `${row.estimated ? "≈ " : ""}${relativeTime(row.lastOpened)}`}</b>
                                <span>{row.lastOpened == null ? "" : row.estimated ? t("sm.estimated") : t("sm.lastOpened")}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <footer className="msm-foot" data-phase={phase}>
                {phase === "pick" && <>
                    <div className="msm-safe">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v6c0 4.6 3.2 7.8 7.5 9 4.3-1.2 7.5-4.4 7.5-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
                        <span>{t("sm.safety")}</span>
                    </div>
                    <button className="moss-btn moss-btn-danger" disabled={chosen.length === 0} onClick={() => setPhase("confirm")}>{leaveLabel}</button>
                </>}
                {phase === "confirm" && <>
                    <div className="msm-confirm">
                        <b>{t("sm.confirm.title", { count: chosen.length })}</b>
                        <span>{missing ? t("sm.confirm.body", { missing }) : t("sm.confirm.bodyAll")}</span>
                    </div>
                    <button className="moss-btn moss-btn-ghost" onClick={() => setPhase("pick")}>{t("common.back")}</button>
                    <button className="moss-btn moss-btn-danger" onClick={run}>{leaveLabel}</button>
                </>}
                {(phase === "running" || phase === "finished") && <>
                    <div className="msm-progress">
                        <div className="msm-progress-text"><b>{status.error || status.title}</b><span>{status.detail}</span></div>
                        <div className="msm-track"><i style={{ transform: `scaleX(${status.total ? status.done / status.total : 0})` }} /></div>
                    </div>
                    {phase === "running"
                        ? <>
                            <button className="moss-btn moss-btn-ghost" onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }}>{paused ? t("sm.resume") : t("sm.pause")}</button>
                            <button className="moss-btn moss-btn-ghost" onClick={() => { stopRef.current = true; pausedRef.current = false; }}>{t("sm.stop")}</button>
                        </>
                        : <button className="moss-btn moss-btn-primary" onClick={() => setPhase("pick")}>{t("common.close")}</button>}
                </>}
            </footer>
        </>
    );
}

function RecentTab({ list, onJoin }: { list: LeftServer[]; onJoin(): void; }) {
    if (!list.length) return <div className="msm-recent-empty">{t("sm.recent.empty")}</div>;
    return (
        <div className="msm-list msm-recent">
            {list.map(server => {
                const usable = server.invite && (!server.inviteExpires || server.inviteExpires > Date.now());
                return (
                    <div key={server.id} className="msm-row">
                        <ServerIcon url={server.icon ? IconUtils.getGuildIconURL({ id: server.id, icon: server.icon, size: 64 }) : undefined} name={server.name} />
                        <div className="msm-info">
                            <b><span className="msm-name">{server.name}</span></b>
                            <span>{t("sm.recent.left", { when: relativeTime(server.leftAt) })}</span>
                        </div>
                        {usable
                            ? <button className="moss-btn moss-btn-primary msm-join" onClick={() => {
                                onJoin();
                                const code = server.invite;
                                if (code) openInviteModal(code).then(joined => { if (joined) removeRecent(server.id); }).catch(() => { });
                            }}>{t("sm.recent.join")}</button>
                            : <span className="msm-noinvite">{t("sm.recent.noInvite")}</span>}
                        <button className="msm-x small" aria-label={t("sm.recent.forget")} title={t("sm.recent.forget")} onClick={() => removeRecent(server.id)}>
                            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
