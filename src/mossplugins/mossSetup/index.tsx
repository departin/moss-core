/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { MossDevs } from "@moss/devs";
import definePlugin, { OptionType } from "@utils/types";
import { closeAllModals, createRoot, UserStore } from "@webpack/common";
import type { ReactElement } from "react";
import type { Root } from "react-dom/client";

import { Setup } from "./Setup";
import { Welcome } from "./Welcome";

export const settings = definePluginSettings({
    done: { type: OptionType.BOOLEAN, description: "", default: false, hidden: true },
    welcomed: { type: OptionType.BOOLEAN, description: "", default: false, hidden: true },
    bookmarksMoveTabs: { type: OptionType.BOOLEAN, description: "", default: false, hidden: true }
});

const roots = new Map<string, Root>();

function mount(id: string, render: (close: () => void) => ReactElement) {
    if (roots.has(id)) return;
    const host = document.createElement("div");
    host.id = id;
    document.body.append(host);
    const root = createRoot(host);
    roots.set(id, root);
    const close = () => {
        root.unmount();
        host.remove();
        roots.delete(id);
    };
    root.render(render(close));
}

export function openWelcome(tourOnly = false) {
    mount("moss-welcome-root", close => <Welcome tourOnly={tourOnly} onDone={() => { settings.store.welcomed = true; close(); }} />);
}

export function openSetup() {
    mount("moss-setup-root", close => <Setup onClose={close} onDone={() => settings.store.done = true} onFinish={() => openWelcome()} />);
}

const openSetupFromEvent = () => openSetup();
const openTourFromEvent = () => {
    closeAllModals();
    openWelcome(true);
};

function openIfNew() {
    if (!UserStore.getCurrentUser() || roots.size) return;
    if (!settings.store.done) setTimeout(openSetup, 1200);
    else if (!settings.store.welcomed) setTimeout(() => openWelcome(), 1200);
}

export default definePlugin({
    name: "MossSetup",
    description: "The first-run setup for language, colours, animations and plugins.",
    authors: [MossDevs.moss],
    required: true,
    settings,

    flux: {
        CONNECTION_OPEN: openIfNew
    },

    start() {
        // older installs kept bookmarks separate from the tab bar
        if (!settings.store.bookmarksMoveTabs) {
            Settings.plugins.ChannelTabs.bookmarksIndependentFromTabs = false;
            settings.store.bookmarksMoveTabs = true;
        }
        window.addEventListener("moss-open-setup", openSetupFromEvent);
        window.addEventListener("moss-open-tour", openTourFromEvent);
        openIfNew();
    },

    stop() {
        window.removeEventListener("moss-open-setup", openSetupFromEvent);
        window.removeEventListener("moss-open-tour", openTourFromEvent);
        for (const root of roots.values()) root.unmount();
        document.querySelectorAll("#moss-setup-root, #moss-welcome-root").forEach(h => h.remove());
        roots.clear();
    }
});
