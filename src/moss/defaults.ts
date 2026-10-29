/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// BetterDiscord plugin equivalents, on by default
export const FAVOURITE_PLUGINS = [
    "PlatformIndicators", "PlatformSpoofer", "PermissionsViewer", "Translate", "MusicControls", "SpotifyCrack", "CallTimer",
    "MemberCount", "VoiceMessages", "ChannelTabs", "MessagePeek", "PreviewMessage", "ZipPreview", "OpenInApp", "Timezones",
    "ValidUser", "ServerListIndicators", "InRole", "ViewIcons", "MessageLogger"
];

export const MOSS_FEATURE_PLUGINS = ["ServerManager", "QuickActions", "FocusMode", "CatchUp", "BookmarkDrop", "KeywordNotify"];

export const EXTRA_PLUGINS = [
    "ImageZoom", "BetterFolders", "ReverseImageSearch", "SilentTyping", "NoReplyMention", "ShowMeYourName", "FixYoutubeEmbeds", "BiggerStreamPreview"
];

export const MOSS_DEFAULT_PLUGINS = new Set([...FAVOURITE_PLUGINS, ...MOSS_FEATURE_PLUGINS]);
