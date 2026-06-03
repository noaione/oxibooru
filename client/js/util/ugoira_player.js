"use strict";

// Adapts Danbooru's UgoiraRenderer pattern (https://github.com/danbooru/danbooru) to use
// JSZip for extraction instead of range requests, since oxibooru ZIPs may be deflate-compressed.
//
// Implements the HTMLMediaElement interface so it works with any play/pause system
// that operates on media elements (play(), pause(), paused, currentTime, duration, etc.).
// Events are dispatched on the <canvas> element: play, pause, timeupdate, canplaythrough, error.

const JSZip = require("jszip");

class UgoiraPlayer {
    constructor(canvas, fileUrl) {
        this.currentSrc = fileUrl;
        this.paused = true;
        this.duration = 0;
        this.width = canvas.width;
        this.height = canvas.height;

        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/networkState
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
        this.networkState = HTMLMediaElement.NETWORK_IDLE;
        this.readyState = HTMLMediaElement.HAVE_NOTHING;

        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");
        this._frames = [];          // [{img, frameStart, frameEnd}] once loaded
        this._currentTime = 0;
        this._currentFrame = null;
        this._playbackRate = 1.0;
        this._previousTime = null;
        this._animationId = null;
        this._error = null;
        this._loadPromise = null;

        this._ctx.clearRect(0, 0, this.width, this.height);
    }

    // Starts loading the ZIP and extracting frames. Idempotent — safe to call multiple times.
    load() {
        if (this._loadPromise) return this._loadPromise;

        this.networkState = HTMLMediaElement.NETWORK_LOADING;

        this._loadPromise = fetch(this.currentSrc)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then((buf) => JSZip.loadAsync(buf))
            .then((zip) => {
                return zip
                    .file("animation.json")
                    .async("string")
                    .then((json) => {
                        const manifest = JSON.parse(json);
                        const rawFrames = manifest.frames; // [{file, delay, ...}]

                        // Pre-compute time boundaries for each frame
                        let frameStart = 0;
                        const framesMeta = rawFrames.map((f) => {
                            const start = frameStart;
                            const end = start + f.delay / 1000;
                            frameStart = end;
                            return { file: f.file, frameStart: start, frameEnd: end };
                        });

                        this.duration = frameStart;

                        // Decode all frames into <img> elements in parallel
                        return Promise.all(
                            framesMeta.map((meta) =>
                                zip
                                    .file(meta.file)
                                    .async("blob")
                                    .then(
                                        (blob) =>
                                            new Promise((resolve, reject) => {
                                                const img = new Image();
                                                const url = URL.createObjectURL(blob);
                                                img.onload = () => {
                                                    URL.revokeObjectURL(url);
                                                    resolve({
                                                        img,
                                                        frameStart: meta.frameStart,
                                                        frameEnd: meta.frameEnd,
                                                    });
                                                };
                                                img.onerror = () => {
                                                    URL.revokeObjectURL(url);
                                                    reject(
                                                        new Error(
                                                            `Failed to decode frame: ${meta.file}`
                                                        )
                                                    );
                                                };
                                                img.src = url;
                                            })
                                    )
                            )
                        );
                    });
            })
            .then((frames) => {
                this._frames = frames;
                this.networkState = HTMLMediaElement.NETWORK_IDLE;
                this.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
                this._drawFrame(0);
                this._triggerEvent("canplaythrough");
            })
            .catch((err) => {
                this._error = err.message;
                this.networkState = HTMLMediaElement.NETWORK_NO_SOURCE;
                this._triggerEvent("error");
            });

        return this._loadPromise;
    }

    play() {
        this.load();
        if (!this.paused) return;
        this.paused = false;
        this._previousTime = null;
        this._animationId = requestAnimationFrame(() => this._onAnimationFrame());
        this._triggerEvent("play");
    }

    pause() {
        if (this.paused) return;
        this.paused = true;
        cancelAnimationFrame(this._animationId);
        this._animationId = null;
        this._triggerEvent("pause");
    }

    destroy() {
        this.pause();
        this._loadPromise = null;
    }

    // Called ~60fps by the browser. Advances currentTime and redraws if the frame changed.
    _onAnimationFrame() {
        const now = performance.now() / 1000;
        const elapsed = now - (this._previousTime ?? now);
        this._previousTime = now;

        if (this._frames.length > 0 && this.duration > 0) {
            this._currentTime =
                (this._currentTime + elapsed * this._playbackRate) % this.duration;
            this._drawFrame(this._currentTime);
            this._triggerEvent("timeupdate");
        }

        this._animationId = requestAnimationFrame(() => this._onAnimationFrame());
    }

    // Redraws only when the frame actually changes.
    _drawFrame(time) {
        const frame = this._frames.find(
            (f) => f.frameStart <= time && time < f.frameEnd
        ) ?? this._frames[this._frames.length - 1];

        if (!frame || frame === this._currentFrame) return;
        this._ctx.clearRect(0, 0, this.width, this.height);
        this._ctx.drawImage(frame.img, 0, 0, this.width, this.height);
        this._currentFrame = frame;
    }

    _triggerEvent(name, detail = {}) {
        this._canvas.dispatchEvent(
            new CustomEvent(name, { bubbles: false, cancelable: false, detail })
        );
    }

    get currentTime() {
        return this._currentTime;
    }

    set currentTime(seconds) {
        this._currentTime = Math.max(0, Math.min(seconds, this.duration));
        this._drawFrame(this._currentTime);
        this._triggerEvent("timeupdate");
    }

    get playbackRate() {
        return this._playbackRate;
    }

    set playbackRate(rate) {
        const prev = this._playbackRate;
        this._playbackRate = rate;
        if (rate !== prev) this._triggerEvent("ratechange");
    }

    get buffered() {
        const end =
            this.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA ? this.duration : 0;
        return { length: 1, start: () => 0, end: () => end };
    }

    get error() {
        return this._error
            ? { code: MediaError.MEDIA_ERR_DECODE, message: this._error }
            : null;
    }

    get volume() {
        return 0;
    }
    set volume(_) {}

    get muted() {
        return true;
    }
    set muted(_) {}
}

module.exports = UgoiraPlayer;
