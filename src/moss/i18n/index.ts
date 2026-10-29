/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LocaleStore, useStateFromStores } from "@webpack/common";

import en from "./en";
import packs from "./packs";

export type StringKey = keyof typeof en;

// Discord's languages, Moss text falls back to English
export const LANGUAGES = [
    ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["bg", "Български"], ["zh-CN", "中文 (简体)"], ["zh-TW", "中文 (繁體)"],
    ["hr", "Hrvatski"], ["cs", "Čeština"], ["da", "Dansk"], ["nl", "Nederlands"], ["fi", "Suomi"], ["fr", "Français"],
    ["de", "Deutsch"], ["el", "Ελληνικά"], ["hi", "हिन्दी"], ["hu", "Magyar"], ["id", "Bahasa Indonesia"], ["it", "Italiano"],
    ["ja", "日本語"], ["ko", "한국어"], ["lt", "Lietuviškai"], ["no", "Norsk"], ["pl", "Polski"], ["pt-BR", "Português (Brasil)"],
    ["ro", "Română"], ["ru", "Русский"], ["es-ES", "Español"], ["es-419", "Español (LATAM)"], ["sv-SE", "Svenska"],
    ["th", "ไทย"], ["tr", "Türkçe"], ["uk", "Українська"], ["vi", "Tiếng Việt"]
] as const;

let override: string | null = null;

// so the setup can preview a language before Discord switches
export function setPreviewLocale(locale: string | null) {
    override = locale;
}

export function currentLocale() {
    return override ?? LocaleStore?.locale ?? "en-US";
}

export function t(key: StringKey, vars?: Record<string, string | number>) {
    const locale = currentLocale();
    const text = packs[locale]?.[key] ?? packs[locale.split("-")[0]]?.[key] ?? en[key];
    return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? "")) : text;
}

export function useLocale() {
    return useStateFromStores([LocaleStore], () => currentLocale());
}

export function relativeTime(date: number | Date, now = Date.now()) {
    const diff = (+date - now) / 1000;
    const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: "auto" });
    for (const [unit, sec] of units) {
        if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
    }
    return rtf.format(0, "minute");
}

export function shortDate(date: number | Date) {
    return new Intl.DateTimeFormat(currentLocale(), { month: "short", year: "numeric" }).format(date);
}
