import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

let modelsLoaded = false;

export function useFaceApi() {
  const [loading, setLoading] = useState(!modelsLoaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (modelsLoaded) { setLoading(false); return; }
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        setLoading(false);
      } catch (e) {
        setError('Failed to load face detection models');
        setLoading(false);
      }
    })();
  }, []);

  const detectDescriptors = async (imageElement) => {
    if (!modelsLoaded) throw new Error('Models not loaded');
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    return detections.map(d => Array.from(d.descriptor));
  };

  const detectSingleDescriptor = async (imageElement) => {
    if (!modelsLoaded) throw new Error('Models not loaded');
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
  };

  return { loading, error, detectDescriptors, detectSingleDescriptor };
}
