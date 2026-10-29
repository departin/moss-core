/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins } from "@api/PluginManager";
import { MossDevs } from "@moss/devs";
import { rebrand } from "@shared/brand";
import definePlugin, { StartAt } from "@utils/types";

export default definePlugin({
    name: "MossBrand",
    description: "Keeps plugin text consistent with the app name.",
    authors: [MossDevs.moss],
    required: true,
    hidden: true,
    startAt: StartAt.Init,

    start() {
        for (const plugin of Object.values(plugins)) {
            plugin.description = rebrand(plugin.description);
            for (const def of Object.values(plugin.settings?.def ?? {})) {
                if ("description" in def && typeof def.description === "string") def.description = rebrand(def.description);
            }
        }
    }
});
