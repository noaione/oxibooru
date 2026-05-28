"use strict";

const culori = require("culori/bundled/culori.cjs");
const markdown = require("./markdown.js");
const uri = require("./uri.js");
const settings = require("../models/settings.js");

function decamelize(str, sep) {
    sep = sep === undefined ? "-" : sep;
    return str
        .replace(/([a-z\d])([A-Z])/g, "$1" + sep + "$2")
        .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1" + sep + "$2")
        .toLowerCase();
}

function* range(start = 0, end = null, step = 1) {
    if (end === null) {
        end = start;
        start = 0;
    }

    for (let i = start; i < end; i += step) {
        yield i;
    }
}

function _formatUnits(number, base, suffixes, callback) {
    if (!number && number !== 0) {
        return NaN;
    }
    number *= 1.0;
    let suffix = suffixes.shift();
    while (number >= base && suffixes.length > 0) {
        suffix = suffixes.shift();
        number /= base;
    }
    if (callback === undefined) {
        callback = (number, suffix) => {
            return suffix ? number.toFixed(1) + suffix : number;
        };
    }
    return callback(number, suffix);
}

function formatFileSize(fileSize) {
    return _formatUnits(
        fileSize,
        1024,
        ["B", "KiB", "MiB", "GiB", "TiB"],
        (number, suffix) => {
            const decimalPlaces = suffix !== "B" ? 2 : 0;
            return number.toFixed(decimalPlaces) + ' ' + suffix;
        }
    );
}

function formatRelativeTime(timeString) {
    if (!timeString) {
        return "never";
    }

    const then = Date.parse(timeString);
    const now = Date.now();
    const difference = Math.abs(now - then) / 1000.0;
    const future = now < then;

    const descriptions = [
        [60, "a few seconds", null],
        [60 * 2, "a minute", null],
        [60 * 60, "% minutes", 60],
        [60 * 60 * 2, "an hour", null],
        [60 * 60 * 24, "% hours", 60 * 60],
        [60 * 60 * 24 * 2, "a day", null],
        [60 * 60 * 24 * 30.42, "% days", 60 * 60 * 24],
        [60 * 60 * 24 * 30.42 * 2, "a month", null],
        [60 * 60 * 24 * 30.42 * 12, "% months", 60 * 60 * 24 * 30.42],
        [60 * 60 * 24 * 30.42 * 12 * 2, "a year", null],
        [8640000000000000 /* max*/, "% years", 60 * 60 * 24 * 30.42 * 12],
    ];

    let text = null;
    for (let kv of descriptions) {
        const multiplier = kv[0];
        const template = kv[1];
        const divider = kv[2];
        if (difference < multiplier) {
            text = template.replace(/%/, Math.round(difference / divider));
            break;
        }
    }

    if (text === "a day") {
        return future ? "tomorrow" : "yesterday";
    }
    return future ? "in " + text : text + " ago";
}

function formatMarkdown(text) {
    return markdown.formatMarkdown(text);
}

function formatInlineMarkdown(text) {
    return markdown.formatInlineMarkdown(text);
}

function splitByWhitespace(str) {
    return str.split(/\s+/).filter((s) => s);
}

function unindent(callSite, ...args) {
    function format(str) {
        let size = -1;
        return str.replace(/\n(\s+)/g, (m, m1) => {
            if (size < 0) {
                size = m1.replace(/\t/g, "    ").length;
            }
            return "\n" + m1.slice(Math.min(m1.length, size));
        });
    }
    if (typeof callSite === "string") {
        return format(callSite);
    }
    if (typeof callSite === "function") {
        return (...args) => format(callSite(...args));
    }
    let output = callSite
        .slice(0, args.length + 1)
        .map((text, i) => (i === 0 ? "" : args[i - 1]) + text)
        .join("");
    return format(output);
}

function enableExitConfirmation() {
    window.onbeforeunload = (e) => {
        return (
            "Are you sure you want to leave? " +
            "Data you have entered may not be saved."
        );
    };
}

function disableExitConfirmation() {
    window.onbeforeunload = null;
}

function confirmPageExit() {
    if (!window.onbeforeunload) {
        return true;
    }
    if (window.confirm(window.onbeforeunload())) {
        disableExitConfirmation();
        return true;
    }
}

function makeCssName(text, suffix) {
    return suffix + "-" + text.replace(/[^a-z0-9]/g, "_");
}

function formatOkLchValue(value) {
    const formatted = value.toFixed(2).replace(/\.00$/, '');
    return Object.is(formatted, '-0') ? '0' : formatted;
}

/**
 * Format oklch mode color data into a CSS color string
 * @param {OklchData} oklchColor 
 * 
 * @typedef {Object} OklchData
 * @property {number} l - lightness, 0 to 1
 * @property {number} c - chroma, 0 to 1
 * @property {number} h - hue, in degrees
 * @property {number} alpha - alpha, 0 to 1
 * @property {'oklch'} mode - color mode, always 'oklch'
 */
function formatOklch(oklchColor) {
    if (oklchColor.mode !== 'oklch') {
        throw new TypeError("Expected oklch color data with mode 'oklch'");
    }

    const a = oklchColor.alpha || 1;
    const alphaPart = oklchColor.alpha < 1 ? ` / ${formatOkLchValue(oklchColor.alpha)}` : "";

    return `oklch(${formatOkLchValue(oklchColor.l || 0)} ${formatOkLchValue(oklchColor.c || 0)} ${formatOkLchValue(oklchColor.h || 0)}${alphaPart})`;
}

function mixinCssColorForDarkTheme(cssColor) {
    /**
     * @type {OklchData}
     */
    const oklch = culori.oklch(cssColor);

    if (!oklch || oklch.mode !== "oklch") {
        return cssColor;
    }

    // get the maximum lightness for sRGB gamut for the given chroma and hue
    const baseLightness = oklch.l || 0;

    // lift colors in dark mode so they remain readable on dark backgrounds.
    const liftedLightness = Math.min(0.95, baseLightness + 0.18);
    const targetLightness =
        baseLightness >= 0.95
            ? baseLightness
            : Math.max(0.72, liftedLightness);

    return formatOklch({
        mode: 'oklch',
        l: targetLightness,
        c: oklch.c || 0,
        h: oklch.h || 0,
        alpha: oklch.alpha || 1,
    });
}

function arraysDiffer(source1, source2, orderImportant) {
    source1 = [...source1];
    source2 = [...source2];
    if (orderImportant === true) {
        if (source1.length !== source2.length) {
            return true;
        }
        for (let i = 0; i < source1.length; i++) {
            if (source1[i] !== source2[i]) {
                return true;
            }
        }
        return false;
    }
    return (
        source1.filter((value) => !source2.includes(value)).length > 0 ||
        source2.filter((value) => !source1.includes(value)).length > 0
    );
}

function escapeSearchTerm(text) {
    return text.replace(/([a-z_-]):/g, "$1\\:").replace(/\./g, "\\.");
}

function dataURItoBlob(dataURI) {
    const chunks = dataURI.split(",");
    const byteString =
        chunks[0].indexOf("base64") >= 0
            ? window.atob(chunks[1])
            : unescape(chunks[1]);
    const mimeString = chunks[0].split(":")[1].split(";")[0];
    const data = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        data[i] = byteString.charCodeAt(i);
    }
    return new Blob([data], { type: mimeString });
}

function getPrettyName(tag) {
    if (settings.get().tagUnderscoresAsSpaces) {
        return tag.replace(/_/g, " ");
    }
    return tag;
}

function wildcardMatch(pattern, str, sensitive = false) {
    let w = pattern.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
    const re = new RegExp(`^${w.replace(/\(--wildcard--\)|\*/g, ".*")}$`, sensitive ? "" : "i");
    return re.test(str);
}

function matchingNames(text, names) {
    const minLengthForPartialSearch = 3;
    let matches = names.filter((name) => wildcardMatch(text + "*", name, false));

    if (!matches.length && text.length >= minLengthForPartialSearch) {
        matches = names.filter((name) => wildcardMatch("*" + text + "*", name, false));
    }

    matches = matches.length ? matches : names;
    return matches;
}

function preloadPostImages(post) {
    if (!["image", "animation"].includes(post.type)) {
        return;
    }
    const img = new Image()
    img.fetchPriority = "low";
    img.src = post.contentUrl;
}

module.exports = {
    range: range,
    formatRelativeTime: formatRelativeTime,
    formatFileSize: formatFileSize,
    formatMarkdown: formatMarkdown,
    formatInlineMarkdown: formatInlineMarkdown,
    unindent: unindent,
    enableExitConfirmation: enableExitConfirmation,
    disableExitConfirmation: disableExitConfirmation,
    confirmPageExit: confirmPageExit,
    escapeHtml: markdown.escapeHtml,
    makeCssName: makeCssName,
    splitByWhitespace: splitByWhitespace,
    arraysDiffer: arraysDiffer,
    decamelize: decamelize,
    escapeSearchTerm: escapeSearchTerm,
    dataURItoBlob: dataURItoBlob,
    getPrettyName: getPrettyName,
    wildcardMatch: wildcardMatch,
    matchingNames: matchingNames,
    preloadPostImages: preloadPostImages,
    intoOklch: culori.oklch,
    formatOklch: formatOklch,
    mixinCssColorForDarkTheme: mixinCssColorForDarkTheme,
};
