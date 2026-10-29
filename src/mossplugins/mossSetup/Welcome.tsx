/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./welcome.css";

import { StringKey, t, useLocale } from "@moss/i18n";
import { settings as themeSettings } from "@mossplugins/mossTheme";
import { useEffect, useLayoutEffect, useRef, useState } from "@webpack/common";
import type { CSSProperties } from "react";

type Phase = "intro" | "reveal" | "tour" | "leaving";

interface TourStep {
    key: "intro" | "servers" | "quick" | "focus" | "bookmarks" | "catchup" | "look" | "end";
    find?(): Element | null;
}

const TOUR: TourStep[] = [
    { key: "intro" },
    { key: "servers", find: () => document.querySelector(`[aria-label="${t("sm.button")}"]`) },
    { key: "quick", find: () => document.querySelector(`[aria-label="${t("qa.button")}"]`) },
    { key: "focus", find: () => document.querySelector(`[aria-label="${t("focus.title")}"]`) },
    { key: "bookmarks", find: () => document.querySelector(".vc-channeltabs-bookmark-container") },
    { key: "catchup", find: () => document.querySelector("nav[class*='privateChannels_'], nav[class*='container_'][aria-label]") },
    { key: "look", find: () => document.querySelector("section[class*='panels_']") },
    { key: "end" }
];

const INTRO_STEPS: StringKey[] = ["welcome.step1", "welcome.step2", "welcome.step3", "welcome.step4"];
const PAD = 8;
const CARD_W = 340;

function LeafMark() {
    return (
        <svg className="mw-mark" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
                <linearGradient id="mw-g" x1="13" y1="51" x2="50" y2="14" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4F8F6C" /><stop offset=".55" stopColor="#9AD4B1" /><stop offset="1" stopColor="#D8F2E2" />
                </linearGradient>
            </defs>
            <rect className="mw-mark-bg" width="64" height="64" rx="19" />
            <path className="mw-leaf-fill" d="M13 51C14.5 30 29 15.5 50 14C48.5 35 34 49.5 13 51Z" fill="url(#mw-g)" />
            <path className="mw-leaf-line" d="M13 51C14.5 30 29 15.5 50 14C48.5 35 34 49.5 13 51Z" pathLength={100} />
            <path className="mw-rib" d="M21.5 42.5L38 26" pathLength={100} />
        </svg>
    );
}

function Intro() {
    const [step, setStep] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setStep(s => Math.min(s + 1, INTRO_STEPS.length - 1)), 700);
        return () => clearInterval(id);
    }, []);
    const words = t("welcome.title").split(" ");
    return (
        <div className="mw-intro">
            <div className="mw-glow" />
            <LeafMark />
            <h1 className="mw-title">
                {words.map((w, i) => <span key={i} style={{ animationDelay: `${520 + i * 90}ms` }}>{w}</span>)}
            </h1>
            <p className="mw-tagline">{t("welcome.tagline")}</p>
            <div className="mw-progress"><i /></div>
            <div key={step} className="mw-status">{t(INTRO_STEPS[step])}</div>
        </div>
    );
}

function Tour({ onDone }: { onDone(): void; }) {
    const steps = useRef(TOUR.filter(s => !s.find || s.find())).current;
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
    const step = steps[index];
    const last = index === steps.length - 1;

    useEffect(() => {
        const measure = () => setRect(step.find?.()?.getBoundingClientRect() ?? null);
        measure();
        const id = setInterval(measure, 400);
        window.addEventListener("resize", measure);
        return () => {
            clearInterval(id);
            window.removeEventListener("resize", measure);
        };
    }, [index]);

    useLayoutEffect(() => {
        const h = cardRef.current?.offsetHeight ?? 180;
        const vw = window.innerWidth, vh = window.innerHeight, m = 16;
        if (!rect) return setCardPos({ top: (vh - h) / 2, left: (vw - CARD_W) / 2 });
        let top = rect.bottom + PAD + 14;
        let left = rect.left + rect.width / 2 - CARD_W / 2;
        if (top + h > vh - m) top = rect.top - PAD - 14 - h;
        if (top < m) {
            top = Math.min(Math.max(m, rect.top + rect.height / 2 - h / 2), vh - h - m);
            left = rect.right + PAD + 14 + CARD_W < vw - m ? rect.right + PAD + 14 : rect.left - PAD - 14 - CARD_W;
        }
        setCardPos({ top, left: Math.min(Math.max(m, left), vw - CARD_W - m) });
    }, [rect, index]);

    const go = (delta: number) => {
        if (last && delta > 0) return onDone();
        setIndex(i => Math.max(0, Math.min(steps.length - 1, i + delta)));
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onDone();
            else if (e.key === "ArrowRight" || e.key === "Enter") go(1);
            else if (e.key === "ArrowLeft") go(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const spot: CSSProperties = rect
        ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, opacity: 1 }
        : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0, opacity: 1 };

    return (
        <div className="mw-tour">
            <div className={`mw-spot${rect ? "" : " none"}`} style={spot} />
            <div ref={cardRef} className="mw-card moss-ui" style={{ top: cardPos.top, left: cardPos.left, width: CARD_W }} role="dialog" aria-live="polite">
                <div key={step.key} className="mw-card-body">
                    <div className="mw-card-step">{t("tour.step", { current: index + 1, total: steps.length })}</div>
                    <h3>{t(`tour.${step.key}.title`)}</h3>
                    <p>{t(`tour.${step.key}.body`)}</p>
                </div>
                <div className="mw-card-foot">
                    <div className="mw-dots">{steps.map((s, i) => <span key={s.key} className={i === index ? "on" : ""} />)}</div>
                    {!last && <button className="moss-btn moss-btn-ghost mw-skip" onClick={onDone}>{t("tour.skip")}</button>}
                    {index > 0 && <button className="moss-btn moss-btn-ghost" onClick={() => go(-1)}>{t("tour.back")}</button>}
                    <button className="moss-btn moss-btn-primary" onClick={() => go(1)}>{t(last ? "tour.finish" : "tour.next")}</button>
                </div>
            </div>
        </div>
    );
}

export function Welcome({ tourOnly, onDone }: { tourOnly: boolean; onDone(): void; }) {
    useLocale();
    const { motion } = themeSettings.use(["motion"]);
    const [phase, setPhase] = useState<Phase>(tourOnly ? "tour" : "intro");

    useEffect(() => {
        if (phase === "intro") {
            const id = setTimeout(() => setPhase("reveal"), motion === "off" ? 1200 : 3200);
            return () => clearTimeout(id);
        }
        if (phase === "reveal") {
            const id = setTimeout(() => setPhase("tour"), 760);
            return () => clearTimeout(id);
        }
    }, [phase]);

    const finish = () => {
        setPhase("leaving");
        setTimeout(onDone, 420);
    };

    return (
        <div className="mw" data-phase={phase} data-motion={motion}>
            {(phase === "intro" || phase === "reveal") && <Intro />}
            {(phase === "tour" || phase === "leaving") && <Tour onDone={finish} />}
        </div>
    );
}
