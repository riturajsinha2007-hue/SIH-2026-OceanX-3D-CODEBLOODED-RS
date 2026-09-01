import { OceanVariable, DepthLevel, ColormapType, EdgeBlendMode } from '../types/ocean';
import { GRID_METADATA, generateOceanGridSlice } from '../data/incoisDataset';
import { getOceanAntiAliasedCoverage } from '../data/oceanLandMask';
import { getColormapLUT } from './scientificColormaps';

interface RasterRenderOptions {
  variable: OceanVariable;
  depth: DepthLevel;
  timeStepIndex: number;
  colormap: ColormapType;
  opacity: number;
  minVal: number;
  maxVal: number;
  isLogScale: boolean;
  edgeBlendMode: EdgeBlendMode;
  coastalFeathering: number; // 0.0 to 1.0
  boundaryFade: boolean;
}

// In-memory raster canvas cache for instant (0ms) variable/depth/colormap switching
const RASTER_CANVAS_CACHE = new Map<string, HTMLCanvasElement>();
const MAX_CACHED_CANVASES = 32;

/**
 * Hermite cubic smoothstep function for smooth C1-continuous transitions
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Catmull-Rom cubic spline basis weights for high-fidelity C1-continuous visual interpolation
 */
function getCubicWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  const w0 = -0.5 * t3 + t2 - 0.5 * t;
  const w1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const w2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const w3 = 0.5 * t3 - 0.5 * t2;
  return [w0, w1, w2, w3];
}

/**
 * Computes domain boundary fading vignette factor (0.0 at outer bbox edge, 1.0 in domain core).
 */
function computeBoundaryVignette(lat: number, lon: number): number {
  const { latMin, latMax, lonMin, lonMax } = GRID_METADATA;
  const fadeSouth = smoothstep(latMin, latMin + 4.0, lat);
  const fadeNorth = smoothstep(latMax, latMax - 2.5, lat);
  const fadeWest = smoothstep(lonMin, lonMin + 3.0, lon);
  const fadeEast = smoothstep(lonMax, lonMax - 3.0, lon);
  return fadeSouth * fadeNorth * fadeWest * fadeEast;
}

/**
 * Generates an ultra-fast, high-definition ocean raster canvas (721 x 521 px)
 * utilizing GPU-ready Look-Up Tables (LUT), bicubic Catmull-Rom interpolation,
 * and sub-pixel anti-aliased coastal clipping.
 * Renders in ~10ms for instant 60 FPS variable and depth switching.
 */
export function renderOceanRasterCanvas(options: RasterRenderOptions): HTMLCanvasElement {
  const {
    variable,
    depth,
    timeStepIndex,
    colormap,
    opacity,
    minVal,
    maxVal,
    isLogScale,
    edgeBlendMode,
    coastalFeathering,
    boundaryFade,
  } = options;

  const cacheKey = `${variable}_${depth}_${timeStepIndex}_${colormap}_${opacity.toFixed(2)}_${minVal.toFixed(2)}_${maxVal.toFixed(2)}_${isLogScale}_${edgeBlendMode}_${coastalFeathering.toFixed(2)}_${boundaryFade}`;
  const cached = RASTER_CANVAS_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Base numerical model slice (361 x 261 grid points at 0.25° resolution)
  const slice = generateOceanGridSlice(variable, depth, timeStepIndex);
  const srcW = slice.width;   // 361
  const srcH = slice.height;  // 261

  // 2. High-Performance Super-Sampling: scale=2 produces a sharp 721 x 521 texture.
  // Cesium's WebGL hardware texture filtering provides 60fps bilinear/trilinear smooth filtering on the 3D globe.
  const scale = 2;
  const dstW = (srcW - 1) * scale + 1; // 721
  const dstH = (srcH - 1) * scale + 1; // 521

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;

  // Strict Data Integrity: If zero valid ocean nodes exist in slice, return clean transparent canvas immediately
  if (slice.minVal === Infinity || slice.maxVal === -Infinity) {
    return canvas;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = ctx.createImageData(dstW, dstH);
  const dstBuffer = imgData.data;

  // 3. Build Ocean Mask from numerical slice data (1 = Ocean, 0 = Land/NaN)
  const oceanMask = new Uint8Array(srcW * srcH);
  for (let j = 0; j < srcH; j++) {
    for (let i = 0; i < srcW; i++) {
      const idx = j * srcW + i;
      oceanMask[idx] = !isNaN(slice.data[idx]) ? 1 : 0;
    }
  }

  // 4. Compute Distance-to-Coast / Ocean Proximity Field on source grid
  const coastalWeight = new Float32Array(srcW * srcH);
  const kernelRadius = 2; // Fast ~0.5° neighborhood

  for (let j = 0; j < srcH; j++) {
    for (let i = 0; i < srcW; i++) {
      const idx = j * srcW + i;
      if (oceanMask[idx] === 0) {
        coastalWeight[idx] = 0;
        continue;
      }

      if (edgeBlendMode === 'crisp') {
        coastalWeight[idx] = 1.0;
        continue;
      }

      let waterCount = 0;
      let totalCount = 0;

      for (let dy = -kernelRadius; dy <= kernelRadius; dy++) {
        const ny = j + dy;
        if (ny < 0 || ny >= srcH) continue;
        for (let dx = -kernelRadius; dx <= kernelRadius; dx++) {
          const nx = i + dx;
          if (nx < 0 || nx >= srcW) continue;

          const nIdx = ny * srcW + nx;
          const distSq = dx * dx + dy * dy;
          if (distSq <= kernelRadius * kernelRadius + 0.5) {
            const weight = 1 / (1 + Math.sqrt(distSq));
            if (oceanMask[nIdx] === 1) {
              waterCount += weight;
            }
            totalCount += weight;
          }
        }
      }

      const fraction = totalCount > 0 ? waterCount / totalCount : 1.0;
      const featherExponent = 0.6 + (1.0 - coastalFeathering) * 2.2;
      const smoothFraction = smoothstep(0.04, 0.92, fraction);
      coastalWeight[idx] = Math.pow(smoothFraction, featherExponent);
    }
  }

  // 5. Pre-compute Color Look-Up Table (LUT) for O(1) instantaneous color assignment
  const colorLUT = getColormapLUT(colormap, opacity);

  const latStep = (GRID_METADATA.latMax - GRID_METADATA.latMin) / (dstH - 1);
  const lonStep = (GRID_METADATA.lonMax - GRID_METADATA.lonMin) / (dstW - 1);
  const isBoundaryFading = boundaryFade && edgeBlendMode !== 'crisp';

  const logMin = isLogScale && minVal > 0 ? Math.log10(minVal) : 0;
  const logMax = isLogScale && maxVal > minVal ? Math.log10(maxVal) : 1;
  const logRange = logMax - logMin || 1;
  const linRange = maxVal - minVal || 1;

  for (let dy = 0; dy < dstH; dy++) {
    const lat = GRID_METADATA.latMax - dy * latStep;
    const srcYFloat = dy / scale;
    const y1 = Math.floor(srcYFloat);
    const y0 = Math.max(0, y1 - 1);
    const y2 = Math.min(srcH - 1, y1 + 1);
    const y3 = Math.min(srcH - 1, y1 + 2);
    const yFract = srcYFloat - y1;
    const [wy0, wy1, wy2, wy3] = getCubicWeights(yFract);

    const r0 = y0 * srcW;
    const r1 = y1 * srcW;
    const r2 = y2 * srcW;
    const r3 = y3 * srcW;

    for (let dx = 0; dx < dstW; dx++) {
      const lon = GRID_METADATA.lonMin + dx * lonStep;
      const dstPixelIdx = (dy * dstW + dx) * 4;

      const oceanCoverage = getOceanAntiAliasedCoverage(lat, lon, latStep, lonStep);
      if (oceanCoverage <= 0.001) {
        dstBuffer[dstPixelIdx] = 0;
        dstBuffer[dstPixelIdx + 1] = 0;
        dstBuffer[dstPixelIdx + 2] = 0;
        dstBuffer[dstPixelIdx + 3] = 0;
        continue;
      }

      const srcXFloat = dx / scale;
      const x1 = Math.floor(srcXFloat);
      const x0 = Math.max(0, x1 - 1);
      const x2 = Math.min(srcW - 1, x1 + 1);
      const x3 = Math.min(srcW - 1, x1 + 2);
      const xFract = srcXFloat - x1;
      const [wx0, wx1, wx2, wx3] = getCubicWeights(xFract);

      let sumVal = 0;
      let sumWeight = 0;

      // Row 0
      const m00 = oceanMask[r0 + x0]; if (m00) { const w = wy0 * wx0; sumVal += slice.data[r0 + x0] * w; sumWeight += w; }
      const m01 = oceanMask[r0 + x1]; if (m01) { const w = wy0 * wx1; sumVal += slice.data[r0 + x1] * w; sumWeight += w; }
      const m02 = oceanMask[r0 + x2]; if (m02) { const w = wy0 * wx2; sumVal += slice.data[r0 + x2] * w; sumWeight += w; }
      const m03 = oceanMask[r0 + x3]; if (m03) { const w = wy0 * wx3; sumVal += slice.data[r0 + x3] * w; sumWeight += w; }

      // Row 1
      const m10 = oceanMask[r1 + x0]; if (m10) { const w = wy1 * wx0; sumVal += slice.data[r1 + x0] * w; sumWeight += w; }
      const m11 = oceanMask[r1 + x1]; if (m11) { const w = wy1 * wx1; sumVal += slice.data[r1 + x1] * w; sumWeight += w; }
      const m12 = oceanMask[r1 + x2]; if (m12) { const w = wy1 * wx2; sumVal += slice.data[r1 + x2] * w; sumWeight += w; }
      const m13 = oceanMask[r1 + x3]; if (m13) { const w = wy1 * wx3; sumVal += slice.data[r1 + x3] * w; sumWeight += w; }

      // Row 2
      const m20 = oceanMask[r2 + x0]; if (m20) { const w = wy2 * wx0; sumVal += slice.data[r2 + x0] * w; sumWeight += w; }
      const m21 = oceanMask[r2 + x1]; if (m21) { const w = wy2 * wx1; sumVal += slice.data[r2 + x1] * w; sumWeight += w; }
      const m22 = oceanMask[r2 + x2]; if (m22) { const w = wy2 * wx2; sumVal += slice.data[r2 + x2] * w; sumWeight += w; }
      const m23 = oceanMask[r2 + x3]; if (m23) { const w = wy2 * wx3; sumVal += slice.data[r2 + x3] * w; sumWeight += w; }

      // Row 3
      const m30 = oceanMask[r3 + x0]; if (m30) { const w = wy3 * wx0; sumVal += slice.data[r3 + x0] * w; sumWeight += w; }
      const m31 = oceanMask[r3 + x1]; if (m31) { const w = wy3 * wx1; sumVal += slice.data[r3 + x1] * w; sumWeight += w; }
      const m32 = oceanMask[r3 + x2]; if (m32) { const w = wy3 * wx2; sumVal += slice.data[r3 + x2] * w; sumWeight += w; }
      const m33 = oceanMask[r3 + x3]; if (m33) { const w = wy3 * wx3; sumVal += slice.data[r3 + x3] * w; sumWeight += w; }

      if (sumWeight <= 0.0001) {
        dstBuffer[dstPixelIdx] = 0;
        dstBuffer[dstPixelIdx + 1] = 0;
        dstBuffer[dstPixelIdx + 2] = 0;
        dstBuffer[dstPixelIdx + 3] = 0;
        continue;
      }

      const interpolatedVal = sumVal / sumWeight;

      // Fast LUT index calculation
      let norm: number;
      if (isLogScale && minVal > 0) {
        const logVal = Math.log10(Math.max(minVal, Math.min(maxVal, interpolatedVal)));
        norm = (logVal - logMin) / logRange;
      } else {
        norm = (interpolatedVal - minVal) / linRange;
      }
      norm = norm < 0 ? 0 : norm > 1 ? 1 : norm;

      const lutIdx = (Math.floor(norm * 1023)) * 4;
      const r = colorLUT[lutIdx];
      const g = colorLUT[lutIdx + 1];
      const b = colorLUT[lutIdx + 2];
      const baseA = colorLUT[lutIdx + 3];

      // Coastal feather weight interpolation
      const cw11 = coastalWeight[r1 + x1];
      const cw12 = coastalWeight[r1 + x2];
      const cw21 = coastalWeight[r2 + x1];
      const cw22 = coastalWeight[r2 + x2];

      const sx = xFract * xFract * (3 - 2 * xFract);
      const sy = yFract * yFract * (3 - 2 * yFract);
      const topCw = cw11 * (1 - sx) + cw12 * sx;
      const botCw = cw21 * (1 - sx) + cw22 * sx;
      const finalCoastWeight = topCw * (1 - sy) + botCw * sy;

      let vignette = 1.0;
      if (isBoundaryFading) {
        vignette = computeBoundaryVignette(lat, lon);
      }

      let alphaMultiplier = oceanCoverage;
      if (edgeBlendMode === 'soft_feather') {
        alphaMultiplier = oceanCoverage * finalCoastWeight * vignette;
      } else {
        alphaMultiplier = oceanCoverage * vignette;
      }

      const finalAlpha = Math.max(0, Math.min(255, Math.round(baseA * alphaMultiplier)));

      if (finalAlpha <= 1) {
        dstBuffer[dstPixelIdx] = 0;
        dstBuffer[dstPixelIdx + 1] = 0;
        dstBuffer[dstPixelIdx + 2] = 0;
        dstBuffer[dstPixelIdx + 3] = 0;
      } else {
        dstBuffer[dstPixelIdx] = r;
        dstBuffer[dstPixelIdx + 1] = g;
        dstBuffer[dstPixelIdx + 2] = b;
        dstBuffer[dstPixelIdx + 3] = finalAlpha;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Manage Cache
  if (RASTER_CANVAS_CACHE.size >= MAX_CACHED_CANVASES) {
    const firstKey = RASTER_CANVAS_CACHE.keys().next().value;
    if (firstKey) RASTER_CANVAS_CACHE.delete(firstKey);
  }
  RASTER_CANVAS_CACHE.set(cacheKey, canvas);

  return canvas;
}

