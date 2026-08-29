import { OceanVariable, DepthLevel, ColormapType, EdgeBlendMode } from '../types/ocean';
import { GRID_METADATA, generateOceanGridSlice } from '../data/incoisDataset';
import { isLandCoordinate, getOceanAntiAliasedCoverage } from '../data/oceanLandMask';
import { getColorForValue } from './scientificColormaps';

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
 * Fades the southern open ocean (-35°S), western (30°E), eastern (120°E), and northern (30°N) margins
 * seamlessly into the global ocean basemap.
 */
function computeBoundaryVignette(lat: number, lon: number): number {
  const { latMin, latMax, lonMin, lonMax } = GRID_METADATA;

  // Southern Ocean margin (-35°S): 4.0° smooth transition band into Southern Antarctic waters
  const fadeSouth = smoothstep(latMin, latMin + 4.0, lat);

  // Northern margin (30°N): 2.5° transition band
  const fadeNorth = smoothstep(latMax, latMax - 2.5, lat);

  // Western margin (30°E): 3.0° transition band
  const fadeWest = smoothstep(lonMin, lonMin + 3.0, lon);

  // Eastern margin (120°E): 3.0° transition band
  const fadeEast = smoothstep(lonMax, lonMax - 3.0, lon);

  return fadeSouth * fadeNorth * fadeWest * fadeEast;
}

/**
 * Generates an ultra-smooth, high-resolution ocean raster canvas (2161 x 1561 px)
 * using C1-continuous bicubic Catmull-Rom interpolation and sub-pixel anti-aliased coastal clipping.
 * Preserves exact scientific data values while removing blocky pixels and jagged coastlines.
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

  // 1. Base numerical model slice (361 x 261 grid points at 0.25° resolution)
  const slice = generateOceanGridSlice(variable, depth, timeStepIndex);
  const srcW = slice.width;   // 361
  const srcH = slice.height;  // 261

  // 2. High-Fidelity Super-Sampling: Creates a high-resolution 2161 x 1561 texture for smooth gradients
  const scale = 6;
  const dstW = (srcW - 1) * scale + 1; // 2161
  const dstH = (srcH - 1) * scale + 1; // 1561

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

  // 3. Build Ocean Mask and valid data presence from numerical slice data (1 = Ocean, 0 = Land/NaN)
  const oceanMask = new Uint8Array(srcW * srcH);
  for (let j = 0; j < srcH; j++) {
    for (let i = 0; i < srcW; i++) {
      const idx = j * srcW + i;
      oceanMask[idx] = !isNaN(slice.data[idx]) ? 1 : 0;
    }
  }

  // 4. Compute Distance-to-Coast / Ocean Proximity Field on source grid
  const coastalWeight = new Float32Array(srcW * srcH);
  const kernelRadius = 3; // ~0.75° neighborhood

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
      // Map water fraction to smooth S-curve feathering
      const featherExponent = 0.6 + (1.0 - coastalFeathering) * 2.2;
      const smoothFraction = smoothstep(0.04, 0.92, fraction);
      coastalWeight[idx] = Math.pow(smoothFraction, featherExponent);
    }
  }

  // 5. High-Precision Bicubic Spline Rasterization with Sub-Pixel Anti-Aliased Coastal Masking
  const latStep = (GRID_METADATA.latMax - GRID_METADATA.latMin) / (dstH - 1);
  const lonStep = (GRID_METADATA.lonMax - GRID_METADATA.lonMin) / (dstW - 1);
  const isBoundaryFading = boundaryFade && edgeBlendMode !== 'crisp';

  for (let dy = 0; dy < dstH; dy++) {
    const lat = GRID_METADATA.latMax - dy * latStep;
    const srcYFloat = dy / scale;
    const y1 = Math.floor(srcYFloat);
    const y0 = Math.max(0, y1 - 1);
    const y2 = Math.min(srcH - 1, y1 + 1);
    const y3 = Math.min(srcH - 1, y1 + 2);
    const yFract = srcYFloat - y1;
    const [wy0, wy1, wy2, wy3] = getCubicWeights(yFract);

    // Row indices for the 4x4 bicubic kernel
    const r0 = y0 * srcW;
    const r1 = y1 * srcW;
    const r2 = y2 * srcW;
    const r3 = y3 * srcW;

    for (let dx = 0; dx < dstW; dx++) {
      const lon = GRID_METADATA.lonMin + dx * lonStep;
      const dstPixelIdx = (dy * dstW + dx) * 4;

      // Sub-pixel anti-aliased ocean fraction (0.0 = full land, 1.0 = full ocean, 0.25-0.75 = smooth anti-aliased coast)
      const oceanCoverage = getOceanAntiAliasedCoverage(lat, lon, latStep, lonStep);
      if (oceanCoverage <= 0.001) {
        // Pure land terrain: keep 100% transparent
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

      // Fast bicubic normalized sampling over valid ocean nodes in 4x4 neighborhood
      let sumVal = 0;
      let sumWeight = 0;

      // Row 0
      const v00 = slice.data[r0 + x0]; const m00 = oceanMask[r0 + x0];
      const v01 = slice.data[r0 + x1]; const m01 = oceanMask[r0 + x1];
      const v02 = slice.data[r0 + x2]; const m02 = oceanMask[r0 + x2];
      const v03 = slice.data[r0 + x3]; const m03 = oceanMask[r0 + x3];

      if (m00) { const w = wy0 * wx0; sumVal += v00 * w; sumWeight += w; }
      if (m01) { const w = wy0 * wx1; sumVal += v01 * w; sumWeight += w; }
      if (m02) { const w = wy0 * wx2; sumVal += v02 * w; sumWeight += w; }
      if (m03) { const w = wy0 * wx3; sumVal += v03 * w; sumWeight += w; }

      // Row 1
      const v10 = slice.data[r1 + x0]; const m10 = oceanMask[r1 + x0];
      const v11 = slice.data[r1 + x1]; const m11 = oceanMask[r1 + x1];
      const v12 = slice.data[r1 + x2]; const m12 = oceanMask[r1 + x2];
      const v13 = slice.data[r1 + x3]; const m13 = oceanMask[r1 + x3];

      if (m10) { const w = wy1 * wx0; sumVal += v10 * w; sumWeight += w; }
      if (m11) { const w = wy1 * wx1; sumVal += v11 * w; sumWeight += w; }
      if (m12) { const w = wy1 * wx2; sumVal += v12 * w; sumWeight += w; }
      if (m13) { const w = wy1 * wx3; sumVal += v13 * w; sumWeight += w; }

      // Row 2
      const v20 = slice.data[r2 + x0]; const m20 = oceanMask[r2 + x0];
      const v21 = slice.data[r2 + x1]; const m21 = oceanMask[r2 + x1];
      const v22 = slice.data[r2 + x2]; const m22 = oceanMask[r2 + x2];
      const v23 = slice.data[r2 + x3]; const m23 = oceanMask[r2 + x3];

      if (m20) { const w = wy2 * wx0; sumVal += v20 * w; sumWeight += w; }
      if (m21) { const w = wy2 * wx1; sumVal += v21 * w; sumWeight += w; }
      if (m22) { const w = wy2 * wx2; sumVal += v22 * w; sumWeight += w; }
      if (m23) { const w = wy2 * wx3; sumVal += v23 * w; sumWeight += w; }

      // Row 3
      const v30 = slice.data[r3 + x0]; const m30 = oceanMask[r3 + x0];
      const v31 = slice.data[r3 + x1]; const m31 = oceanMask[r3 + x1];
      const v32 = slice.data[r3 + x2]; const m32 = oceanMask[r3 + x2];
      const v33 = slice.data[r3 + x3]; const m33 = oceanMask[r3 + x3];

      if (m30) { const w = wy3 * wx0; sumVal += v30 * w; sumWeight += w; }
      if (m31) { const w = wy3 * wx1; sumVal += v31 * w; sumWeight += w; }
      if (m32) { const w = wy3 * wx2; sumVal += v32 * w; sumWeight += w; }
      if (m33) { const w = wy3 * wx3; sumVal += v33 * w; sumWeight += w; }

      // If no ocean nodes in neighborhood, leave transparent
      if (sumWeight <= 0.0001) {
        dstBuffer[dstPixelIdx] = 0;
        dstBuffer[dstPixelIdx + 1] = 0;
        dstBuffer[dstPixelIdx + 2] = 0;
        dstBuffer[dstPixelIdx + 3] = 0;
        continue;
      }

      const interpolatedVal = sumVal / sumWeight;

      // Base colormap RGBA
      const [r, g, b, baseA] = getColorForValue(
        interpolatedVal,
        minVal,
        maxVal,
        colormap,
        opacity,
        isLogScale
      );

      // Coastal feather weight interpolation (Hermite smoothstep on central 2x2 grid)
      const cw11 = coastalWeight[r1 + x1];
      const cw12 = coastalWeight[r1 + x2];
      const cw21 = coastalWeight[r2 + x1];
      const cw22 = coastalWeight[r2 + x2];

      const sx = xFract * xFract * (3 - 2 * xFract);
      const sy = yFract * yFract * (3 - 2 * yFract);
      const topCw = cw11 * (1 - sx) + cw12 * sx;
      const botCw = cw21 * (1 - sx) + cw22 * sx;
      const finalCoastWeight = topCw * (1 - sy) + botCw * sy;

      // Boundary vignette
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
  return canvas;
}

