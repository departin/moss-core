/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { findByPropsLazy } from "@webpack";
import { ActiveJoinedThreadsStore, ChannelStore, FluxDispatcher, GuildChannelStore, GuildStore, ReadStateStore, UserGuildSettingsStore } from "@webpack/common";

const NotificationActions: { updateGuildNotificationSettings(guildId: string, settings: Record<string, unknown>): Promise<unknown> | void; } = findByPropsLazy("updateGuildNotificationSettings");

const MOSS_MUTED_KEY = "MossQuickActions_muted";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const allGuildIds = () => Object.keys(GuildStore.getGuilds());

function guildChannelIds(guildId: string) {
    const channels = GuildChannelStore.getChannels(guildId);
    const threads = Object.values(ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guildId) ?? {}).flatMap(t => Object.values(t));
    return [...channels.SELECTABLE, ...channels.VOCAL, ...threads].map((c: { channel: { id: string; }; }) => c.channel.id);
}

function ack(channelIds: string[]) {
    const channels = channelIds
        .filter(id => ReadStateStore.hasUnread(id))
        .map(id => ({ channelId: id, messageId: ReadStateStore.lastMessageId(id), readStateType: 0 }));
    if (channels.length) FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels });
    return channels.length;
}

export const unreadGuildIds = (ids = allGuildIds()) => ids.filter(id => guildChannelIds(id).some(c => ReadStateStore.hasUnread(c)));

// returns how many channels were marked read
export const markGuildsRead = (ids = allGuildIds()) => ack(ids.flatMap(guildChannelIds));

export const markDMsRead = () => ack(ChannelStore.getSortedPrivateChannels().map(c => c.id));

export const isMuted = (guildId: string) => UserGuildSettingsStore.isMuted(guildId);

export function muteSettings(seconds: number) {
    return {
        muted: true,
        mute_config: { selected_time_window: seconds, end_time: seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null }
    };
}

// one server at a time so Discord isn't flooded
export async function updateGuilds(ids: string[], settings: Record<string, unknown>, onProgress?: (done: number, total: number) => void) {
    let done = 0;
    for (const id of ids) {
        await NotificationActions.updateGuildNotificationSettings(id, settings);
        onProgress?.(++done, ids.length);
        if (done < ids.length) await sleep(300);
    }
    return done;
}

export const getMossMuted = async () => await DataStore.get<string[]>(MOSS_MUTED_KEY) ?? [];

export async function muteGuilds(ids: string[], seconds: number, onProgress?: (done: number, total: number) => void) {
    const targets = ids.filter(id => !isMuted(id));
    const previous = await getMossMuted();
    await DataStore.set(MOSS_MUTED_KEY, [...new Set([...previous, ...targets])]);
    return updateGuilds(targets, muteSettings(seconds), onProgress);
}

export async function unmuteGuilds(ids: string[], onProgress?: (done: number, total: number) => void) {
    const targets = ids.filter(isMuted);
    const remaining = (await getMossMuted()).filter(id => !ids.includes(id));
    await DataStore.set(MOSS_MUTED_KEY, remaining);
    return updateGuilds(targets, { muted: false }, onProgress);
}
