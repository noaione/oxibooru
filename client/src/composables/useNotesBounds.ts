import { ref, watch, onUnmounted, type Ref } from 'vue';

export function useNotesBounds(
  imgElRef: Ref<HTMLImageElement | HTMLVideoElement | null>,
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

    const naturalW =
      imgEl instanceof HTMLImageElement ? imgEl.naturalWidth : (imgEl as HTMLVideoElement).videoWidth;
    const naturalH =
      imgEl instanceof HTMLImageElement
        ? imgEl.naturalHeight
        : (imgEl as HTMLVideoElement).videoHeight;

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

  function attach(imgEl: HTMLImageElement | HTMLVideoElement) {
    ro?.disconnect();
    ro = new ResizeObserver(computeBounds);
    ro.observe(imgEl);
    if (containerRef.value) ro.observe(containerRef.value);

    if (imgEl instanceof HTMLImageElement) {
      if (imgEl.complete && imgEl.naturalWidth) {
        computeBounds();
      } else {
        imgEl.addEventListener('load', computeBounds, { once: true });
      }
    } else {
      if ((imgEl as HTMLVideoElement).readyState >= 1) {
        computeBounds();
      } else {
        imgEl.addEventListener('loadedmetadata', computeBounds, { once: true });
      }
    }
  }

  watch(
    imgElRef,
    (el) => {
      svgReady.value = false;
      ro?.disconnect();
      ro = null;
      if (el) attach(el);
    },
    { immediate: true },
  );

  watch(containerRef, (el) => {
    if (el && ro) ro.observe(el);
    computeBounds();
  });

  onUnmounted(() => ro?.disconnect());

  return { svgStyle, svgReady, computeBounds };
}
