/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { useEffect, useState } from "@webpack/common";

const LAST_OPENED_KEY = "MossServerManager_lastOpened";
const RECENT_KEY = "MossServerManager_recent";
const RECENT_DAYS = 30;

export interface LeftServer {
    id: string;
    name: string;
    icon: string | null;
    leftAt: number;
    invite: string | null;
    inviteExpires: number | null;
}

export let lastOpened: Record<string, number> = {};
// the normal leave tracker skips these
export const managedLeaves = new Set<string>();
let recent: LeftServer[] = [];
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const emit = () => listeners.forEach(l => l());

export async function loadStore() {
    lastOpened = await DataStore.get<Record<string, number>>(LAST_OPENED_KEY) ?? {};
    const cutoff = Date.now() - RECENT_DAYS * 86400000;
    recent = (await DataStore.get<LeftServer[]>(RECENT_KEY) ?? []).filter(r => r.leftAt > cutoff);
    emit();
}

export function markOpened(guildId: string) {
    lastOpened[guildId] = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => DataStore.set(LAST_OPENED_KEY, lastOpened), 2000);
}

export async function addRecent(entry: LeftServer) {
    recent = [entry, ...recent.filter(r => r.id !== entry.id)];
    emit();
    await DataStore.set(RECENT_KEY, recent);
}

export async function removeRecent(guildId: string) {
    recent = recent.filter(r => r.id !== guildId);
    emit();
    await DataStore.set(RECENT_KEY, recent);
}

export function useRecent() {
    const [list, setList] = useState(recent);
    useEffect(() => {
        const update = () => setList(recent);
        listeners.add(update);
        update();
        return () => void listeners.delete(update);
    }, []);
    return list;
}
