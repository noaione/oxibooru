import { BlobReader, TextWriter, ZipReader, type FileEntry } from '@zip.js/zip.js';

interface DecodedFrame {
  img: HTMLImageElement;
  frameStart: number; // seconds
  frameEnd: number; // seconds
}

export class UgoiraPlayerElement extends HTMLElement {
  static readonly observedAttributes = ['src'];

  private readonly _canvas: HTMLCanvasElement;
  private readonly _ctx: CanvasRenderingContext2D;
  private _frames: DecodedFrame[] = [];
  private _currentFrame: DecodedFrame | null = null;
  private _rafId: number | null = null;
  private _previousTime: number | null = null;
  private _loadAbort: AbortController | null = null;

  private _paused = true;
  private _currentTime = 0;
  private _duration = 0;
  private _playbackRate = 1.0;

  networkState: number = HTMLMediaElement.NETWORK_IDLE;
  readyState: number = HTMLMediaElement.HAVE_NOTHING;

  constructor() {
    super();
    this._canvas = document.createElement('canvas');
    Object.assign(this._canvas.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    });
    this._ctx = this._canvas.getContext('2d')!;
  }

  connectedCallback() {
    this.style.display = 'block';
    this.appendChild(this._canvas);
    const src = this.getAttribute('src');
    if (src) void this._load(src);
  }

  disconnectedCallback() {
    this._reset();
    this._canvas.remove();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (name === 'src' && newVal !== null && newVal !== oldVal && this.isConnected) {
      void this._load(newVal);
    }
  }

  // --- Public media-element-like API ---

  get paused() {
    return this._paused;
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(s: number) {
    this._currentTime = Math.max(0, Math.min(s, this._duration));
    this._drawFrame(this._currentTime);
    this._dispatch('timeupdate');
  }

  get duration() {
    return this._duration;
  }

  get playbackRate() {
    return this._playbackRate;
  }

  set playbackRate(r: number) {
    this._playbackRate = r;
    this._dispatch('ratechange');
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  get buffered(): TimeRanges {
    const end = this.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA ? this._duration : 0;
    return { length: 1, start: () => 0, end: () => end } as unknown as TimeRanges;
  }

  play() {
    if (!this._paused) return;
    this._paused = false;
    this._previousTime = null;
    this._rafId = requestAnimationFrame(() => this._onAnimationFrame());
    this._dispatch('play');
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._dispatch('pause');
  }

  // --- Private ---

  private _reset() {
    this.pause();
    this._loadAbort?.abort();
    this._loadAbort = null;
    this._frames.forEach((f) => URL.revokeObjectURL(f.img.src));
    this._frames = [];
    this._currentFrame = null;
    this._previousTime = null;
    this._currentTime = 0;
    this._duration = 0;
    this.networkState = HTMLMediaElement.NETWORK_IDLE;
    this.readyState = HTMLMediaElement.HAVE_NOTHING;
  }

  private async _load(src: string) {
    this._reset();
    this.networkState = HTMLMediaElement.NETWORK_LOADING;
    this._dispatch('loadstart');

    const abort = new AbortController();
    this._loadAbort = abort;

    try {
      const blob = await fetch(src, { signal: abort.signal }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      });

      if (abort.signal.aborted) return;

      const reader = new ZipReader(new BlobReader(blob));
      try {
        const entries = await reader.getEntries();
        const fileEntries = new Map(
          entries
            .filter((e): e is FileEntry => !e.directory)
            .map((e) => [e.filename, e]),
        );

        const manifestEntry = fileEntries.get('animation.json');
        if (!manifestEntry) throw new Error('animation.json not found in ZIP');

        const manifest: { frames: { file: string; delay: number }[] } = JSON.parse(
          await manifestEntry.getData(new TextWriter()),
        );

        let t = 0;
        const frames = await Promise.all(
          manifest.frames.map(async ({ file, delay }) => {
            const frameStart = t;
            const frameEnd = t + delay / 1000;
            t = frameEnd;
            const entry = fileEntries.get(file);
            if (!entry) throw new Error(`Frame '${file}' not found in ZIP`);
            const ab = await entry.arrayBuffer();
            const img = new Image();
            img.src = URL.createObjectURL(new Blob([ab]));
            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej(new Error(`Failed to decode '${file}'`));
            });
            return { img, frameStart, frameEnd };
          }),
        );

        if (abort.signal.aborted) return;

        this._frames = frames;
        this._duration = t;

        if (frames.length) {
          this._canvas.width = frames[0]!.img.naturalWidth;
          this._canvas.height = frames[0]!.img.naturalHeight;
        }

        this.networkState = HTMLMediaElement.NETWORK_IDLE;
        this.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
        this._drawFrame(0);
        this._dispatch('canplaythrough');
        this.play();
      } finally {
        await reader.close();
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      console.error('[ugoira-player] Load error:', err);
      this.networkState = HTMLMediaElement.NETWORK_NO_SOURCE;
      this._dispatch('error');
    }
  }

  private _onAnimationFrame() {
    const now = performance.now() / 1000;
    const elapsed = now - (this._previousTime ?? now);
    this._previousTime = now;

    if (this._frames.length > 0 && this._duration > 0) {
      this._currentTime = (this._currentTime + elapsed * this._playbackRate) % this._duration;
      this._drawFrame(this._currentTime);
      this._dispatch('timeupdate');
    }

    this._rafId = requestAnimationFrame(() => this._onAnimationFrame());
  }

  private _drawFrame(time: number) {
    if (!this._frames.length) return;
    const frame =
      this._frames.find((f) => f.frameStart <= time && time < f.frameEnd) ??
      this._frames.at(-1);
    if (!frame || frame === this._currentFrame) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.drawImage(frame.img, 0, 0, this._canvas.width, this._canvas.height);
    this._currentFrame = frame;
  }

  private _dispatch(name: string) {
    this.dispatchEvent(new Event(name, { bubbles: false, cancelable: false }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ugoira-player': UgoiraPlayerElement;
  }
}

if (!customElements.get('ugoira-player')) {
  customElements.define('ugoira-player', UgoiraPlayerElement);
}
