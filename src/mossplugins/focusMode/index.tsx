/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { MossDevs } from "@moss/devs";
import { currentLocale, t, useLocale } from "@moss/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { ContextMenuApi, FluxDispatcher, Menu, showToast } from "@webpack/common";
import type { MouseEvent } from "react";

import style from "./style.css?managed";

const StatusSetting = getUserSettingLazy<string>("status", "status");

export const settings = definePluginSettings({
    setDnd: { type: OptionType.BOOLEAN, description: "Switch to Do Not Disturb while focusing, which also silences notifications.", default: true },
    hideMembers: { type: OptionType.BOOLEAN, description: "Hide the member list while focusing.", default: true },
    hideActivity: { type: OptionType.BOOLEAN, description: "Hide the Active Now column while focusing.", default: true },
    shortcut: { type: OptionType.BOOLEAN, description: "Toggle focus mode with Ctrl+Shift+F.", default: true },
    until: { type: OptionType.NUMBER, description: "", default: 0, hidden: true },
    previousStatus: { type: OptionType.STRING, description: "", default: "", hidden: true }
});

let timer: ReturnType<typeof setInterval> | undefined;
let pill: { root: HTMLDivElement; label: HTMLSpanElement; end: HTMLButtonElement; } | null = null;

export const isFocusing = () => settings.store.until !== 0;

function remaining() {
    const ms = settings.store.until - Date.now();
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    const parts = minutes >= 60 ? [Math.floor(minutes / 60), "hour", minutes % 60] as const : [minutes, "minute", 0] as const;
    const fmt = new Intl.NumberFormat(currentLocale(), { style: "unit", unit: parts[1], unitDisplay: "short" });
    return fmt.format(parts[0]) + (parts[2] ? " " + new Intl.NumberFormat(currentLocale(), { style: "unit", unit: "minute", unitDisplay: "short" }).format(parts[2]) : "");
}

function renderPill() {
    if (!isFocusing()) {
        pill?.root.remove();
        pill = null;
        return;
    }
    if (!pill) {
        pill = { root: document.createElement("div"), label: document.createElement("span"), end: document.createElement("button") };
        pill.root.className = "moss-focus-pill";
        pill.end.addEventListener("click", stopFocus);
        pill.root.append(pill.label, pill.end);
        document.body.append(pill.root);
    }
    const { label, end } = pill;
    label.textContent = settings.store.until > 0 ? `${t("focus.on")} · ${t("focus.left", { time: remaining() })}` : t("focus.on");
    end.textContent = t("focus.end");
}

function tick() {
    if (settings.store.until > 0 && Date.now() >= settings.store.until) stopFocus();
    else renderPill();
}

function applyClasses() {
    const root = document.documentElement;
    const on = isFocusing();
    root.classList.toggle("moss-focus", on);
    root.classList.toggle("moss-focus-members", on && settings.store.hideMembers);
    root.classList.toggle("moss-focus-activity", on && settings.store.hideActivity);
}

export function startFocus(minutes: number) {
    if (!isFocusing() && settings.store.setDnd) {
        settings.store.previousStatus = StatusSetting?.getSetting() ?? "";
        if (settings.store.previousStatus !== "dnd") StatusSetting?.updateSetting("dnd");
    }
    settings.store.until = minutes > 0 ? Date.now() + minutes * 60000 : -1;
    applyClasses();
    clearInterval(timer);
    timer = setInterval(tick, 15000);
    renderPill();
    showToast({ text: t("focus.started"), variant: "success" });
}

export function stopFocus() {
    if (!isFocusing()) return;
    const previous = settings.store.previousStatus;
    if (settings.store.setDnd && previous && previous !== "dnd" && StatusSetting?.getSetting() === "dnd") StatusSetting.updateSetting(previous);
    settings.store.until = 0;
    settings.store.previousStatus = "";
    clearInterval(timer);
    applyClasses();
    renderPill();
    showToast({ text: t("focus.ended") });
}

const MoonIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
);

function openMenu(e: MouseEvent<HTMLElement>) {
    if (isFocusing()) return stopFocus();
    ContextMenuApi.openContextMenu(e, () => (
        <Menu.Menu navId="moss-focus" onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })} aria-label={t("focus.title")}>
            <Menu.MenuItem id="moss-focus-25" label={t("focus.25m")} action={() => startFocus(25)} />
            <Menu.MenuItem id="moss-focus-60" label={t("focus.1h")} action={() => startFocus(60)} />
            <Menu.MenuItem id="moss-focus-120" label={t("focus.2h")} action={() => startFocus(120)} />
            <Menu.MenuItem id="moss-focus-forever" label={t("focus.forever")} action={() => startFocus(0)} />
        </Menu.Menu>
    ));
}

function FocusButton() {
    useLocale();
    const { until } = settings.use(["until"]);
    return <HeaderBarButton icon={MoonIcon} tooltip={until ? t("focus.end") : t("focus.title")} aria-label={t("focus.title")} selected={until !== 0} onClick={openMenu} />;
}

function onKey(e: KeyboardEvent) {
    if (!settings.store.shortcut || e.code !== "KeyF" || !e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    if (isFocusing()) stopFocus();
    else startFocus(0);
}

export default definePlugin({
    name: "FocusMode",
    description: "One click or Ctrl+Shift+F to focus: Do Not Disturb, no member list or Active Now, with an optional timer that brings everything back.",
    authors: [MossDevs.moss],
    dependencies: ["HeaderBarAPI", "UserSettingsAPI"],
    settings,
    managedStyle: style,

    headerBarButton: {
        icon: MoonIcon,
        render: FocusButton,
        priority: 9
    },

    start() {
        document.addEventListener("keydown", onKey, true);
        applyClasses();
        if (isFocusing()) {
            timer = setInterval(tick, 15000);
            tick();
        }
    },

    stop() {
        document.removeEventListener("keydown", onKey, true);
        clearInterval(timer);
        pill?.root.remove();
        pill = null;
        document.documentElement.classList.remove("moss-focus", "moss-focus-members", "moss-focus-activity");
    }
});
