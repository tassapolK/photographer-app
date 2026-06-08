import { useState, useEffect, useCallback } from 'react';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ── Module-level singletons ───────────────────────────────────────────────────
// Using a dynamic import keeps face-api.js out of the main JS bundle.
// It becomes its own ~850 KB chunk that is only downloaded when first needed
// (i.e. when EventDetail mounts for the photographer, or when a customer
// opens the Face Scanner). The customer gallery page itself stays fast.

let faceapiModule = null; // populated on first dynamic import
let modelsLoaded = false;
let loadingPromise = null; // deduplicates concurrent load calls

async function loadFaceApi() {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise; // reuse in-progress load

  loadingPromise = (async () => {
    try {
      // Dynamic import → Vite puts face-api in a separate chunk.
      // Main bundle shrinks from ~1 MB to ~180 KB.
      faceapiModule = await import('face-api.js');
      await Promise.all([
        faceapiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapiModule.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (e) {
      loadingPromise = null; // allow retry on failure
      throw e;
    }
  })();

  return loadingPromise;
}

export function useFaceApi() {
  const [loading, setLoading] = useState(!modelsLoaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (modelsLoaded) { setLoading(false); return; }
    setLoading(true);
    loadFaceApi()
      .then(() => setLoading(false))
      .catch((e) => { setError(e?.message || 'Failed to load face models'); setLoading(false); });
  }, []);

  const detectDescriptors = useCallback(async (imageElement) => {
    if (!modelsLoaded) throw new Error('Models not loaded');
    const detections = await faceapiModule
      .detectAllFaces(imageElement, new faceapiModule.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    return detections.map(d => Array.from(d.descriptor));
  }, []);

  const detectSingleDescriptor = useCallback(async (imageElement) => {
    if (!modelsLoaded) throw new Error('Models not loaded');
    const detection = await faceapiModule
      .detectSingleFace(imageElement, new faceapiModule.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
  }, []);

  return { loading, error, detectDescriptors, detectSingleDescriptor };
}
