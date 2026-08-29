import { ref, watch, onUnmounted, type Ref } from 'vue';

export function useNotesBounds(
  imgElRef: Ref<HTMLElement | null>,
  containerRef: Ref<HTMLElement | null>,
) {
  const svgStyle = ref<Record<string, string>>({});
  const svgReady = ref(false);

  function computeBounds() {
    const imgEl = imgElRef.value;
    const containerEl = containerRef.value;
    if (!imgEl || !containerEl) return;

    const imgRect = imgEl.getBoundingClientRect();
    const overlayRect = containerEl.getBoundingClientRect();

    let rX = imgRect.left - overlayRect.left;
    let rY = imgRect.top - overlayRect.top;
    let rW = imgRect.width;
    let rH = imgRect.height;

    // Determine intrinsic dimensions for letterbox/pillarbox calculation.
    // Generic elements (e.g. a container div for Flash/Ruffle) produce 0/0,
    // which skips the calculation and lets the SVG fill the full container.
    let naturalW = 0;
    let naturalH = 0;

    if (imgEl instanceof HTMLImageElement) {
      naturalW = imgEl.naturalWidth;
      naturalH = imgEl.naturalHeight;
    } else if (imgEl instanceof HTMLVideoElement) {
      naturalW = imgEl.videoWidth;
      naturalH = imgEl.videoHeight;
    } else if (imgEl instanceof HTMLCanvasElement) {
      naturalW = imgEl.width;
      naturalH = imgEl.height;
    }

    if (naturalW && naturalH && rW > 0 && rH > 0) {
      const containerAspect = rW / rH;
      const naturalAspect = naturalW / naturalH;

      if (naturalAspect > containerAspect) {
        const scaledH = rW / naturalAspect;
        rY += (rH - scaledH) / 2;
        rH = scaledH;
      } else {
        const scaledW = rH * naturalAspect;
        rX += (rW - scaledW) / 2;
        rW = scaledW;
      }
    }

    svgStyle.value = {
      left: `${rX}px`,
      top: `${rY}px`,
      width: `${rW}px`,
      height: `${rH}px`,
    };
    svgReady.value = true;
  }

  let ro: ResizeObserver | null = null;
  let mo: MutationObserver | null = null;

  function attach(imgEl: HTMLElement) {
    ro?.disconnect();
    mo?.disconnect();
    mo = null;
    ro = new ResizeObserver(computeBounds);
    ro.observe(imgEl);
    if (containerRef.value) ro.observe(containerRef.value);

    if (imgEl instanceof HTMLImageElement) {
      if (imgEl.complete && imgEl.naturalWidth) {
        computeBounds();
      } else {
        imgEl.addEventListener('load', computeBounds, { once: true });
      }
    } else if (imgEl instanceof HTMLVideoElement) {
      if (imgEl.readyState >= 1) {
        computeBounds();
      } else {
        imgEl.addEventListener('loadedmetadata', computeBounds, { once: true });
      }
    } else if (imgEl instanceof HTMLCanvasElement) {
      // Canvas starts with default 300×150 before content loads; watch attribute changes.
      computeBounds();
      mo = new MutationObserver(computeBounds);
      mo.observe(imgEl, { attributes: true, attributeFilter: ['width', 'height'] });
    } else {
      // Generic element (e.g. Flash container): always ready, ResizeObserver handles resizes.
      computeBounds();
    }
  }

  watch(
    imgElRef,
    (el) => {
      svgReady.value = false;
      ro?.disconnect();
      ro = null;
      mo?.disconnect();
      mo = null;
      if (el) attach(el);
    },
    { immediate: true },
  );

  watch(containerRef, (el) => {
    if (el && ro) ro.observe(el);
    computeBounds();
  });

  onUnmounted(() => {
    ro?.disconnect();
    mo?.disconnect();
  });

  return { svgStyle, svgReady, computeBounds };
}
