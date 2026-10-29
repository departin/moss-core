/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { bookmarkPlaceholderName, isBookmarkFolder, settings as tabSettings } from "@equicordplugins/channelTabs/util";
import { MossDevs } from "@moss/devs";
import { t } from "@moss/i18n";
import definePlugin from "@utils/types";
import { ChannelStore, showToast, UserStore } from "@webpack/common";

import style from "./style.css?managed";

interface Target { guildId: string; channelId: string; }

const BAR = ".vc-channeltabs-bookmark-container";
let dragged: Target | null = null;

function channelFrom(el: EventTarget | null): Target | null {
    if (!(el instanceof Element)) return null;
    const href = el.closest("a[href^='/channels/']")?.getAttribute("href");
    const match = href?.match(/^\/channels\/(@me|\d+)\/(\d+)/);
    if (match) return { guildId: match[1], channelId: match[2] };
    const id = el.closest("[data-list-item-id^='channels___']")?.getAttribute("data-list-item-id")?.slice("channels___".length);
    const channel = id ? ChannelStore.getChannel(id) : null;
    return channel ? { guildId: channel.guild_id || "@me", channelId: channel.id } : null;
}

const barFrom = (el: EventTarget | null) => el instanceof Element ? el.closest<HTMLElement>(BAR) : null;

function setOver(bar: HTMLElement | null) {
    document.querySelectorAll(`${BAR}.moss-bookmark-over`).forEach(b => b !== bar && b.classList.remove("moss-bookmark-over"));
    bar?.classList.add("moss-bookmark-over");
}

function reset() {
    dragged = null;
    document.documentElement.classList.remove("moss-dragging-channel");
    setOver(null);
}

function addBookmark({ guildId, channelId }: Target) {
    const me = UserStore.getCurrentUser().id;
    const all = { ...tabSettings.plain.bookmarks };
    const list = [...(all[me] ?? [])];
    const name = bookmarkPlaceholderName({ guildId, channelId });
    if (list.some(b => isBookmarkFolder(b) ? b.bookmarks.some(x => x.channelId === channelId) : b.channelId === channelId)) {
        showToast({ text: t("bookmark.exists", { name }) });
        return;
    }
    list.push({ guildId, channelId, name });
    tabSettings.store.bookmarks = { ...all, [me]: list };
    showToast({ text: t("bookmark.added", { name }), variant: "success" });
}

function dragImage(text: string) {
    const pill = document.createElement("div");
    pill.className = "moss-drag-pill";
    pill.textContent = text;
    document.body.append(pill);
    setTimeout(() => pill.remove());
    return pill;
}

function onDragStart(e: DragEvent) {
    if (!isPluginEnabled("ChannelTabs") || barFrom(e.target)) return;
    dragged = channelFrom(e.target);
    if (!dragged) return;
    document.documentElement.classList.add("moss-dragging-channel");
    document.querySelectorAll(BAR).forEach(b => b.setAttribute("data-moss-hint", t("bookmark.drop")));
    e.dataTransfer?.setDragImage(dragImage(bookmarkPlaceholderName(dragged)), 14, 16);
}

function onDragOver(e: DragEvent) {
    if (!dragged) return;
    const bar = barFrom(e.target);
    setOver(bar);
    if (!bar) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
}

function onDrop(e: DragEvent) {
    if (!dragged || !barFrom(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    addBookmark(dragged);
    reset();
}

export default definePlugin({
    name: "BookmarkDrop",
    description: "Drag any channel or DM onto the bookmark bar to bookmark it.",
    authors: [MossDevs.moss],
    managedStyle: style,

    start() {
        document.addEventListener("dragstart", onDragStart, true);
        document.addEventListener("dragover", onDragOver, true);
        document.addEventListener("drop", onDrop, true);
        document.addEventListener("dragend", reset, true);
    },

    stop() {
        document.removeEventListener("dragstart", onDragStart, true);
        document.removeEventListener("dragover", onDragOver, true);
        document.removeEventListener("drop", onDrop, true);
        document.removeEventListener("dragend", reset, true);
        reset();
    }
});
