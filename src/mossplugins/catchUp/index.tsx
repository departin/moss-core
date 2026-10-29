/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ChannelToolbarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import { MossDevs } from "@moss/devs";
import { t, useLocale } from "@moss/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, User } from "@vencord/discord-types";
import { ChannelStore, createRoot, Menu, ReadStateStore, SelectedChannelStore, showToast } from "@webpack/common";
import type { Root } from "react-dom/client";

import { ask, lastRead } from "./logic";
import { Panel } from "./Panel";

const MESSAGE_CHANNELS = new Set([0, 1, 2, 3, 5, 10, 11, 12, 13]);

const SparkIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 6h10M4 11h10M4 16h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        <path d="M18 11.5l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z" fill="currentColor" />
        <path d="M18 3.5l.65 1.45 1.45.65-1.45.65L18 7.7l-.65-1.45-1.45-.65 1.45-.65z" fill="currentColor" />
    </svg>
);

function Guide() {
    useLocale();
    const test = async () => {
        showToast({ text: t("catchup.testing") });
        try {
            const { model } = await ask("Reply with just the word: ok", "Are you there?");
            showToast({ text: `${t("catchup.keyWorks")} (${model})`, variant: "success" });
        } catch (e) {
            showToast({ text: (e as Error).message, variant: "critical" });
        }
    };
    return (
        <div className="mcu-guide moss-ui">
            <b>{t("catchup.guide.title")}</b>
            <ol>
                {(["catchup.guide.1", "catchup.guide.2", "catchup.guide.3", "catchup.guide.4", "catchup.guide.5"] as const).map(k => <li key={k}>{t(k)}</li>)}
            </ol>
            <button className="moss-btn moss-btn-primary" onClick={test}>{t("catchup.testKey")}</button>
        </div>
    );
}

export const settings = definePluginSettings({
    apiKey: { type: OptionType.STRING, description: "Your OpenRouter API key. It's only stored on this PC.", default: "", placeholder: "sk-or-v1-…" },
    model: { type: OptionType.STRING, description: "The OpenRouter model. openrouter/free picks a free one for you.", default: "openrouter/free" },
    recentCount: { type: OptionType.NUMBER, description: "How many messages the Last tab reads.", default: 100 },
    maxMessages: { type: OptionType.NUMBER, description: "Most messages read for unread catch ups and the larger tab. Every 100 messages is one request to Discord.", default: 300 },
    detailed: { type: OptionType.BOOLEAN, description: "Longer, more detailed summaries.", default: false },
    instructions: { type: OptionType.STRING, description: "Extra instructions for the summaries, like \"Always answer in English\".", default: "" },
    shortcut: { type: OptionType.BOOLEAN, description: "Press Alt+C to catch up on the channel you have open.", default: true }
});

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function closePanel() {
    root?.unmount();
    host?.remove();
    root = host = null;
}

export function openPanel(channel: Channel) {
    if (!settings.store.apiKey.trim()) {
        showToast({ text: t("catchup.noKey"), variant: "critical" });
        return;
    }
    if (!host) {
        host = document.createElement("div");
        host.id = "moss-catchup";
        document.body.append(host);
        root = createRoot(host);
    }
    root?.render(<Panel key={channel.id + Date.now()} channel={channel} onClose={closePanel} />);
}

function openCurrent() {
    const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (channel) openPanel(channel);
    else showToast({ text: t("catchup.noChannel") });
}

function onKey(e: KeyboardEvent) {
    if (!settings.store.shortcut || e.code !== "KeyC" || !e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
    e.preventDefault();
    openCurrent();
}

const addItem = (children: Parameters<NavContextMenuPatchCallback>[0], channel?: Channel | null) => {
    if (!channel || !MESSAGE_CHANNELS.has(channel.type)) return;
    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem id="moss-catchup" label={t("catchup.menu")} icon={SparkIcon} action={() => openPanel(channel)} />
        </Menu.MenuGroup>
    );
};

const channelMenu: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => addItem(children, channel);
const userMenu: NavContextMenuPatchCallback = (children, { user, channel }: { user?: User; channel?: Channel; }) => {
    const dmId = user && ChannelStore.getDMFromUserId(user.id);
    const dm = channel?.type === 1 ? channel : dmId ? ChannelStore.getChannel(dmId) : null;
    addItem(children, dm);
};

function ToolbarButton() {
    useLocale();
    return <ChannelToolbarButton icon={SparkIcon} tooltip={t("catchup.button")} onClick={openCurrent} />;
}

export default definePlugin({
    name: "CatchUp",
    description: "Summarizes what you missed in any channel or DM with AI. Click the sparkle in the channel header, right click a channel or DM, or press Alt+C.",
    authors: [MossDevs.moss],
    dependencies: ["HeaderBarAPI"],
    settings,
    settingsAboutComponent: Guide,

    headerBarButton: {
        icon: SparkIcon,
        render: ToolbarButton,
        location: "channeltoolbar",
        priority: 50
    },

    contextMenus: {
        "channel-context": channelMenu,
        "thread-context": channelMenu,
        "gdm-context": channelMenu,
        "user-context": userMenu
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string | null; }) {
            if (channelId) lastRead.set(channelId, ReadStateStore.ackMessageId(channelId));
        }
    },

    start() {
        document.addEventListener("keydown", onKey, true);
    },

    stop() {
        document.removeEventListener("keydown", onKey, true);
        closePanel();
    }
});
