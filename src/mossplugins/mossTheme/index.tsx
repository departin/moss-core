/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, SettingsStore } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { PaintbrushIcon } from "@components/Icons";
import { SettingsTab, wrapTab } from "@components/settings";
import { MossDevs } from "@moss/devs";
import { t } from "@moss/i18n";
import { AppearancePanel } from "@moss/ui/Appearance";
import SettingsPlugin from "@plugins/_core/settings";
import { removeFromArray } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";

import fonts from "./fonts.css?managed";
import { accentStops, buildVars, ColorMode, MotionPreset, ThemeOptions } from "./palette";
import style from "./style.css?managed";

export const MOTION_AREAS = ["switch", "messages", "hover", "popups", "servers"] as const;
export type MotionArea = typeof MOTION_AREAS[number];

const hidden = { hidden: true, description: "" };

export const settings = definePluginSettings({
    appearance: {
        type: OptionType.COMPONENT,
        component: AppearancePanel
    },
    colorMode: { ...hidden, type: OptionType.STRING, default: "moss" as ColorMode },
    accentStyle: { ...hidden, type: OptionType.STRING, default: "solid" },
    accent: { ...hidden, type: OptionType.STRING, default: "#9AD4B1" },
    accent2: { ...hidden, type: OptionType.STRING, default: "#F2A774" },
    accent3: { ...hidden, type: OptionType.STRING, default: "" },
    gradientAngle: { ...hidden, type: OptionType.NUMBER, default: 135 },
    tint: { ...hidden, type: OptionType.NUMBER, default: 12 },
    font: { ...hidden, type: OptionType.STRING, default: "moss" },
    motion: { ...hidden, type: OptionType.STRING, default: "smooth" as MotionPreset },
    animswitch: { ...hidden, type: OptionType.BOOLEAN, default: true },
    animmessages: { ...hidden, type: OptionType.BOOLEAN, default: true },
    animhover: { ...hidden, type: OptionType.BOOLEAN, default: true },
    animpopups: { ...hidden, type: OptionType.BOOLEAN, default: true },
    animservers: { ...hidden, type: OptionType.BOOLEAN, default: true }
});

export const themeOptions = (): ThemeOptions => {
    const s = settings.store;
    return {
        colorMode: s.colorMode as ColorMode,
        accentStyle: s.accentStyle === "gradient" ? "gradient" : "solid",
        accent: s.accent,
        accent2: s.accent2,
        accent3: s.accent3,
        gradientAngle: s.gradientAngle,
        tint: s.tint
    };
};

let varsStyle: HTMLStyleElement | null = null;

const AppearanceTab = wrapTab(() => <SettingsTab><AppearancePanel /></SettingsTab>, "Appearance");

export function applyTheme() {
    const s = settings.store;
    const root = document.documentElement;
    const options = themeOptions();

    root.dataset.mossColors = options.colorMode;
    root.dataset.mossFont = s.font;
    root.dataset.mossMotion = s.motion;
    for (const area of MOTION_AREAS) root.toggleAttribute(`data-moss-anim-${area}`, s[`anim${area}`]);
    root.toggleAttribute("data-moss-gradient", options.colorMode !== "discord" && accentStops(options).length > 1);

    varsStyle ??= document.createElement("style");
    varsStyle.id = "moss-theme-vars";
    if (!varsStyle.isConnected) (document.head ?? root).append(varsStyle);

    const declarations = Object.entries(buildVars(options)).map(([k, v]) => `${k}: ${v} !important;`).join("");
    varsStyle.textContent = `html[data-moss-colors], html[data-moss-colors] :is(.theme-dark, .theme-darker, .theme-midnight, .theme-light, .custom-theme-background) { ${declarations} }`;
}

export default definePlugin({
    name: "MossTheme",
    description: "The Moss look: colours, gradients, the Moss font and animations.",
    authors: [MossDevs.moss],
    required: true,
    dependencies: ["Settings"],
    startAt: StartAt.DOMContentLoaded,
    settings,

    start() {
        SettingsPlugin.customEntries.unshift({
            key: "moss_appearance",
            get title() { return t("settings.appearance"); },
            Component: AppearanceTab,
            Icon: PaintbrushIcon
        });
        enableStyle(style);
        enableStyle(fonts);
        applyTheme();
        SettingsStore.addPrefixChangeListener("plugins.MossTheme", applyTheme);
    },

    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "moss_appearance");
        SettingsStore.removePrefixChangeListener("plugins.MossTheme", applyTheme);
        disableStyle(style);
        disableStyle(fonts);
        varsStyle?.remove();
        const root = document.documentElement;
        for (const attr of [...root.attributes].map(a => a.name).filter(n => n.startsWith("data-moss-"))) root.removeAttribute(attr);
    }
});
