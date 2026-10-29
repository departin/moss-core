/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import de from "./de";
import type en from "./en";
import es from "./es";
import fr from "./fr";
import it from "./it";
import ja from "./ja";
import nl from "./nl";
import pl from "./pl";
import ptBR from "./pt-BR";
import ru from "./ru";
import tr from "./tr";

export type Pack = Partial<Record<keyof typeof en, string>>;

// keyed by Discord locale, pt shares pt-BR
const packs: Record<string, Pack> = { de, es, fr, it, ja, nl, pl, "pt-BR": ptBR, pt: ptBR, ru, tr };

export default packs;
