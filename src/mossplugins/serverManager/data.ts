/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Guild } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { GuildChannelStore, GuildMemberCountStore, GuildStore, IconUtils, PermissionsBits, PermissionStore, ReadStateStore, RestAPI, SnowflakeUtils, UserStore } from "@webpack/common";

import { lastOpened } from "./store";

const GuildLeaveActions: { leaveGuild(guildId: string): Promise<unknown>; } = findByPropsLazy("leaveGuild", "deleteGuild");

export type Rejoin = "vanity" | "invite" | "none";

export interface ServerRow {
    id: string;
    name: string;
    icon: string | null;
    iconUrl: string | undefined;
    members: number | null;
    joinedAt: number | null;
    owner: boolean;
    lastOpened: number | null;
    estimated: boolean;
    rejoin: Rejoin;
    vanity: string | null;
}

function textChannels(guildId: string) {
    return (GuildChannelStore.getChannels(guildId)?.SELECTABLE ?? []).map(c => c.channel);
}

// newest read message in the server, stands in for last opened
function readEstimate(guildId: string) {
    let newest = 0n;
    for (const channel of textChannels(guildId)) {
        const ack = ReadStateStore.ackMessageId(channel.id);
        if (ack && BigInt(ack) > newest) newest = BigInt(ack);
    }
    return newest ? SnowflakeUtils.extractTimestamp(newest.toString()) : null;
}

function inviteChannel(guildId: string) {
    return textChannels(guildId).find(c => PermissionStore.can(PermissionsBits.CREATE_INSTANT_INVITE, c));
}

export function rejoinFor(guild: Guild, backupInvites: boolean): Rejoin {
    if (guild.vanityURLCode) return "vanity";
    return backupInvites && inviteChannel(guild.id) ? "invite" : "none";
}

export function getServers(backupInvites: boolean): ServerRow[] {
    const me = UserStore.getCurrentUser().id;
    return Object.values(GuildStore.getGuilds()).map(guild => {
        const tracked = lastOpened[guild.id] ?? null;
        const estimate = tracked ? null : readEstimate(guild.id);
        return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon ?? null,
            iconUrl: guild.icon ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) : undefined,
            members: GuildMemberCountStore.getMemberCount(guild.id) ?? null,
            joinedAt: guild.joinedAt ? +guild.joinedAt : null,
            owner: guild.ownerId === me,
            lastOpened: tracked ?? estimate,
            estimated: !tracked && estimate != null,
            rejoin: rejoinFor(guild, backupInvites),
            vanity: guild.vanityURLCode ?? null
        };
    });
}

const dryRun = () => "MOSS_SM_DRY_RUN" in window;

export async function createBackupInvite(guildId: string) {
    if (dryRun()) return "dry-run";
    const channel = inviteChannel(guildId);
    if (!channel) return null;
    const res = await RestAPI.post({
        url: `/channels/${channel.id}/invites`,
        body: { max_age: 604800, max_uses: 1, temporary: false, unique: true }
    });
    return (res.body as { code?: string; })?.code ?? null;
}

export const leaveGuild = (guildId: string) => dryRun() ? new Promise(r => setTimeout(r, 300)) : GuildLeaveActions.leaveGuild(guildId);

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(w => [...w][0]).join("").slice(0, 2).toUpperCase();
