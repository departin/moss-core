/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import { MossDevs } from "@moss/devs";
import { t, useLocale } from "@moss/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { createRoot, GuildStore, SelectedGuildStore } from "@webpack/common";
import type { Root } from "react-dom/client";

import { Manager, ServersIcon } from "./Manager";
import { addRecent, loadStore, managedLeaves, markOpened } from "./store";

export const settings = definePluginSettings({
    backupInvites: {
        type: OptionType.BOOLEAN,
        description: "Before leaving a server, save a private single use invite so you can rejoin it from Recently left. Server admins can see invites in their invite list.",
        default: true
    }
});

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function closeManager() {
    root?.unmount();
    host?.remove();
    root = host = null;
}

export function openManager() {
    if (root) return;
    host = document.createElement("div");
    host.id = "moss-server-manager";
    document.body.append(host);
    root = createRoot(host);
    root.render(<Manager onClose={closeManager} />);
}

// kept so Recently left can still show servers you've left
const known = new Map<string, { name: string; icon: string | null; vanity: string | null; }>();
const remember = (id: string) => {
    const g = GuildStore.getGuild(id);
    if (g) known.set(id, { name: g.name, icon: g.icon ?? null, vanity: g.vanityURLCode ?? null });
};

function ManagerButton() {
    useLocale();
    return <HeaderBarButton icon={ServersIcon} tooltip={t("sm.button")} onClick={openManager} />;
}

export default definePlugin({
    name: "ServerManager",
    description: "See every server you're in with when you last opened it, leave the ones you want in one go, and rejoin from Recently left.",
    authors: [MossDevs.moss],
    dependencies: ["HeaderBarAPI"],
    settings,

    headerBarButton: {
        icon: ServersIcon,
        render: ManagerButton,
        priority: 10
    },

    flux: {
        CHANNEL_SELECT({ guildId }: { guildId?: string | null; }) {
            if (guildId) markOpened(guildId);
        },
        GUILD_CREATE({ guild }: { guild: { id: string; }; }) {
            remember(guild.id);
        },
        GUILD_UPDATE({ guild }: { guild: { id: string; }; }) {
            remember(guild.id);
        },
        GUILD_DELETE({ guild }: { guild: { id: string; unavailable?: boolean; }; }) {
            if (guild.unavailable) return;
            if (managedLeaves.delete(guild.id)) return;
            const info = known.get(guild.id);
            if (!info) return;
            addRecent({ id: guild.id, name: info.name, icon: info.icon, leftAt: Date.now(), invite: info.vanity, inviteExpires: null });
        }
    },

    async start() {
        await loadStore();
        for (const id of Object.keys(GuildStore.getGuilds())) remember(id);
        const current = SelectedGuildStore.getGuildId();
        if (current) markOpened(current);
    },

    stop() {
        closeManager();
        known.clear();
    }
});
