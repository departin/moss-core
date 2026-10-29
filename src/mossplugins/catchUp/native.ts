/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

// main process, Discord's CSP blocks this in the page
export async function chat(_: IpcMainInvokeEvent, apiKey: string, body: string) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Moss CatchUp"
        },
        body
    });
    return { status: res.status, text: await res.text() };
}
