/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { MossDevs } from "@moss/devs";
import { t } from "@moss/i18n";
import definePlugin from "@utils/types";
import { showToast } from "@webpack/common";

interface MossUpdater {
    status(): Promise<{ enabled: boolean; readyVersion: string | null; version: string; }>;
    check(): Promise<string | null>;
    install(): Promise<void>;
    onReady(cb: (version: string) => void): void;
}

const updater = (): MossUpdater | undefined => typeof VesktopNative !== "undefined" ? VesktopNative.mossUpdater : undefined;

let noticeShown = false;

function announce(version: string) {
    if (noticeShown) return;
    noticeShown = true;
    showNotice(t("update.ready", { version }), t("update.restart"), () => updater()?.install());
}

export async function updateStatus() {
    return updater()?.status() ?? null;
}

export async function checkForUpdates() {
    const native = updater();
    const status = await native?.status();
    if (!native || !status?.enabled) return showToast({ text: t("update.notSetUp") });
    if (status.readyVersion) return announce(status.readyVersion);
    showToast({ text: t("update.checking") });
    const version = await native.check();
    showToast(version ? { text: t("update.downloading", { version }) } : { text: t("update.upToDate"), variant: "success" });
}

export default definePlugin({
    name: "MossUpdates",
    description: "Tells you when a new version of Moss has been downloaded and is ready to install.",
    authors: [MossDevs.moss],
    required: true,
    hidden: true,

    async start() {
        const native = updater();
        if (!native) return;
        native.onReady(announce);
        const status = await native.status();
        if (status.readyVersion) announce(status.readyVersion);
    }
});
