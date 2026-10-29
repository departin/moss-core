/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { addServerListElement, removeServerListElement, ServerListItem, ServerListItemIconProps, ServerListRenderPosition } from "@api/ServerList";
import { MossDevs } from "@moss/devs";
import { t, useLocale } from "@moss/i18n";
import { allGuildIds, getMossMuted, markDMsRead, markGuildsRead, muteGuilds, unmuteGuilds, unreadGuildIds, updateGuilds } from "@moss/servers";
import { progressPill } from "@moss/ui/progress";
import { isFocusing, startFocus, stopFocus } from "@mossplugins/focusMode";
import { useAwaiter } from "@utils/react";
import definePlugin from "@utils/types";
import { ContextMenuApi, FluxDispatcher, Menu, showToast } from "@webpack/common";
import type { MouseEvent } from "react";

import style from "./style.css?managed";

const QuickIcon = ({ className, color }: ServerListItemIconProps) => (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7.5 7 10.5l5.5-6" />
        <path d="M4 15.5 7 18.5l5.5-6" />
        <path d="M15 8h5M15 16h5" />
    </svg>
);

async function runBulk(ids: string[], task: (ids: string[], onProgress: (done: number, total: number) => void) => Promise<number>, doneKey: "qa.muted" | "qa.unmuted" | "qa.updated") {
    if (!ids.length) return;
    const pill = progressPill(t("qa.working", { done: 0, total: ids.length }));
    const count = await task(ids, (done, total) => pill.update(t("qa.working", { done, total }), done / total));
    pill.done(t(doneKey, { count }));
}

export const markAllServersRead = () => showToast({ text: t("qa.readDone", { count: markGuildsRead() }), variant: "success" });
export const markAllDMsRead = () => showToast({ text: t("qa.readDone", { count: markDMsRead() }), variant: "success" });
export const muteAll = (seconds: number) => runBulk(allGuildIds(), (ids, p) => muteGuilds(ids, seconds, p), "qa.muted");

function QuickMenu() {
    const [mossMuted] = useAwaiter(getMossMuted, { fallbackValue: [] });
    const unread = unreadGuildIds().length;
    const close = () => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
    return (
        <Menu.Menu navId="moss-quick-actions" onClose={close} aria-label={t("qa.button")}>
            <Menu.MenuGroup>
                <Menu.MenuItem id="moss-read-servers" label={unread ? t("qa.readServersCount", { count: unread }) : t("qa.readServers")} disabled={!unread} action={markAllServersRead} />
                <Menu.MenuItem id="moss-read-dms" label={t("qa.readDms")} action={markAllDMsRead} />
            </Menu.MenuGroup>
            <Menu.MenuGroup>
                <Menu.MenuItem id="moss-mute-all" label={t("qa.mute")}>
                    <Menu.MenuItem id="moss-mute-1h" label={t("qa.mute.1h")} action={() => muteAll(3600)} />
                    <Menu.MenuItem id="moss-mute-8h" label={t("qa.mute.8h")} action={() => muteAll(28800)} />
                    <Menu.MenuItem id="moss-mute-24h" label={t("qa.mute.24h")} action={() => muteAll(86400)} />
                    <Menu.MenuItem id="moss-mute-forever" label={t("qa.mute.forever")} action={() => muteAll(-1)} />
                </Menu.MenuItem>
                {mossMuted.length > 0 && (
                    <Menu.MenuItem id="moss-unmute" label={t("qa.unmute", { count: mossMuted.length })} action={() => runBulk(mossMuted, unmuteGuilds, "qa.unmuted")} />
                )}
            </Menu.MenuGroup>
            <Menu.MenuGroup>
                <Menu.MenuItem id="moss-mentions-only" label={t("qa.mentionsOnly")} action={() => runBulk(allGuildIds(), (ids, p) => updateGuilds(ids, { message_notifications: 1 }, p), "qa.updated")} />
                <Menu.MenuItem id="moss-suppress" label={t("qa.suppress")} action={() => runBulk(allGuildIds(), (ids, p) => updateGuilds(ids, { suppress_everyone: true, suppress_roles: true }, p), "qa.updated")} />
            </Menu.MenuGroup>
            {isPluginEnabled("FocusMode") && (
                <Menu.MenuGroup>
                    {isFocusing()
                        ? <Menu.MenuItem id="moss-focus-end" label={t("focus.end")} action={stopFocus} />
                        : <Menu.MenuItem id="moss-focus" label={t("focus.title")}>
                            <Menu.MenuItem id="moss-focus-25" label={t("focus.25m")} action={() => startFocus(25)} />
                            <Menu.MenuItem id="moss-focus-60" label={t("focus.1h")} action={() => startFocus(60)} />
                            <Menu.MenuItem id="moss-focus-120" label={t("focus.2h")} action={() => startFocus(120)} />
                            <Menu.MenuItem id="moss-focus-forever" label={t("focus.forever")} action={() => startFocus(0)} />
                        </Menu.MenuItem>}
                </Menu.MenuGroup>
            )}
        </Menu.Menu>
    );
}

const openMenu = (e: MouseEvent<HTMLElement>) => ContextMenuApi.openContextMenu(e, () => <QuickMenu />);

function QuickButton() {
    useLocale();
    return <ServerListItem id="moss-quick-actions" icon={QuickIcon} tooltip={t("qa.button")} aria-label={t("qa.button")} onClick={openMenu} />;
}

export default definePlugin({
    name: "QuickActions",
    description: "A button at the top of your server list to mark everything as read, mute or unmute every server, tone down pings, and start focus mode.",
    authors: [MossDevs.moss],
    dependencies: ["ServerListAPI"],
    managedStyle: style,

    start() {
        addServerListElement(ServerListRenderPosition.Above, QuickButton, 10);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, QuickButton);
    }
});
