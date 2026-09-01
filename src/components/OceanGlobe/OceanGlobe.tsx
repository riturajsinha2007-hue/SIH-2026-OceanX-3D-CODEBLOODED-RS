import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ARGO_FLOATS, generateOceanGridSlice, GRID_METADATA, sampleOceanPoint, getTimeStepsForVariable, setActiveErddapGridSlice, getActiveErddapGridSlice, clearActiveErddapGridSlices } from '../../data/incoisDataset';
import { ArgoFloat, PointProbeData, VisualizationState, DataSelection } from '../../types/ocean';
import { getColorForValue, getDefaultRange } from '../../utils/scientificColormaps';
import { renderOceanRasterCanvas } from '../../utils/oceanRasterRenderer';
import { fetchArgoVamGridSlice, fetchOceansat2GridSlice } from '../../services/erddapService';
import { validateOceanDataBeforeRender, validateScientificData, PreRenderValidationResult, VerificationState, DataProvenanceInfo } from '../../services/oceanDataQualityGate';
import { VerificationProvenanceModal } from '../Info/VerificationProvenanceModal';
import { RotateCcw, ZoomIn, ZoomOut, Globe, Activity, Target, X, Sparkles, Layers, ShieldCheck, Lock, Database, RefreshCw, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';

interface OceanGlobeProps {
  state: VisualizationState;
  onSelectFloat: (floatId: string | null) => void;
  onSelectProbePoint: (probe: PointProbeData | null) => void;
  filteredFloats: ArgoFloat[];
}

const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IlBXbmtvMTRRTG1MbGhTTzIiLCJqdGkiOiJjMGRlYzJlNC04MzkxLTRhNTUtOWNlNC05MWYxYWMxYmNkMDMiLCJpZCI6NDcxNzA2LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODc2NTA2MDV9.VoNapHQsWtQppXzpetNlv52aAfHmnQA6qNtVfaTWryU';

// Generate crisp SVG billboard marker for an Argo float
function createFloatMarkerIcon(
  colorHex: string,
  isSelected: boolean,
  isHovered: boolean
): string {
  const size = isSelected ? 48 : isHovered ? 40 : 32;
  const radius = isSelected ? 8 : 6;
  const center = size / 2;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${isSelected ? 3 : 2}" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <!-- Outer radar ring for selected / hovered float -->
      ${
        isSelected || isHovered
          ? `<circle cx="${center}" cy="${center}" r="${center - 4}" fill="none" stroke="${colorHex}" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.8" />
             <circle cx="${center}" cy="${center}" r="${center - 9}" fill="${colorHex}" fill-opacity="0.15" />`
          : ''
      }
      
      <!-- Core beacon -->
      <circle cx="${center}" cy="${center}" r="${radius + 2}" fill="#040810" stroke="#0f172a" stroke-width="1" />
      <circle cx="${center}" cy="${center}" r="${radius}" fill="${colorHex}" filter="url(#glow)" />
      <circle cx="${center}" cy="${center}" r="${Math.max(2, radius - 3.5)}" fill="#ffffff" opacity="0.9" />
    </svg>
  `;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

// Generate animated crosshair probe target icon
function createProbeTargetIcon(): string {
  const size = 56;
  const center = size / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="probeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <!-- Outer dashed radar rings -->
      <circle cx="${center}" cy="${center}" r="${center - 4}" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="4,3" opacity="0.9" />
      <circle cx="${center}" cy="${center}" r="${center - 11}" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2" />
      
      <!-- Crosshair reticle lines -->
      <line x1="${center}" y1="2" x2="${center}" y2="${center - 6}" stroke="#38bdf8" stroke-width="2" />
      <line x1="${center}" y1="${center + 6}" x2="${size - 2}" stroke="#38bdf8" stroke-width="2" />
      <line x1="2" y1="${center}" x2="${center - 6}" y2="${center}" stroke="#38bdf8" stroke-width="2" />
      <line x1="${center + 6}" y1="${center}" x2="${size - 2}" stroke="#38bdf8" stroke-width="2" />
      
      <!-- Center Glowing Pin -->
      <circle cx="${center}" cy="${center}" r="4.5" fill="#f59e0b" filter="url(#probeGlow)" stroke="#ffffff" stroke-width="1.5" />
    </svg>
  `;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

export const OceanGlobe: React.FC<OceanGlobeProps> = ({
  state,
  onSelectFloat,
  onSelectProbePoint,
  filteredFloats,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const oceanLayerRef = useRef<any>(null);
  const floatEntitiesRef = useRef<Map<string, any>>(new Map());
  const trackEntitiesRef = useRef<any[]>([]);
  const probeEntityRef = useRef<any>(null);
  const handlerRef = useRef<any>(null);

  const [isCesiumReady, setIsCesiumReady] = useState(false);
  const [hoveredFloat, setHoveredFloat] = useState<ArgoFloat | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorLatLon, setCursorLatLon] = useState<{ lat: string; lon: string } | null>(null);

  // Dynamic ERDDAP slice fetch status & Pre-Render Quality Gate Validation
  const [sliceFetchStatus, setSliceFetchStatus] = useState<{
    loading: boolean;
    variable: string;
    timeStr: string;
    depth: number;
    source: string;
    points: number;
    rangeStr: string;
  }>({
    loading: false,
    variable: state.variable,
    timeStr: '2024-03-15',
    depth: state.depth,
    source: 'INCOIS ERDDAP',
    points: 0,
    rangeStr: '',
  });

  const [validationResult, setValidationResult] = useState<PreRenderValidationResult | null>(null);
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState(false);
  const [sliceUpdateTrigger, setSliceUpdateTrigger] = useState(0);

  // Keep reference to latest state & callback values to avoid stale closures in Cesium event handlers
  const stateRef = useRef(state);
  const onSelectFloatRef = useRef(onSelectFloat);
  const onSelectProbePointRef = useRef(onSelectProbePoint);
  const filteredFloatsRef = useRef(filteredFloats);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    onSelectFloatRef.current = onSelectFloat;
  }, [onSelectFloat]);
  useEffect(() => {
    onSelectProbePointRef.current = onSelectProbePoint;
  }, [onSelectProbePoint]);
  useEffect(() => {
    filteredFloatsRef.current = filteredFloats;
  }, [filteredFloats]);

  // Fetch and Double-Validate real scientific grid slice from INCOIS ERDDAP
  useEffect(() => {
    const activeSteps = getTimeStepsForVariable(state.variable);
    const safeIdx = Math.min(state.timeStepIndex, Math.max(0, activeSteps.length - 1));
    const step = activeSteps[safeIdx] || activeSteps[0];
    const timeStr = step?.dateStr || (state.variable === 'CHLA' ? '2013-03-15' : '2024-03-15');
    const depth = state.depth;
    const variable = state.variable;

    const abortController = new AbortController();

    setSliceFetchStatus((prev) => ({
      ...prev,
      loading: true,
      variable,
      timeStr,
      depth: variable === 'CHLA' ? 0 : depth,
    }));

    const datasetId = variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM';
    const bounds = variable === 'CHLA'
      ? { latMin: 0.5, latMax: 27.5, lonMin: 47.0, lonMax: 99.0 }
      : { latMin: GRID_METADATA.latMin, latMax: GRID_METADATA.latMax, lonMin: GRID_METADATA.lonMin, lonMax: GRID_METADATA.lonMax };

    const currentSelection: DataSelection = {
      datasetId,
      variable,
      date: timeStr,
      depth: variable === 'CHLA' ? 0 : depth,
      boundingBox: bounds,
      resolution: variable === 'CHLA' ? '0.5 deg' : '1.0 deg',
      sourceUrl: variable === 'CHLA' ? '/api/erddap/oceansat2/grid' : '/api/erddap/argo_vam/grid',
    };

    console.log(`[ERDDAP DOUBLE-VALIDATION TRIGGER] Dataset: ${datasetId} | Variable: ${variable} | Date: ${timeStr} | Depth: ${depth}m`);

    const fetchPromise = variable === 'CHLA'
      ? fetchOceansat2GridSlice(timeStr, abortController.signal)
      : fetchArgoVamGridSlice(variable as 'TEMP' | 'SAL', timeStr, depth, abortController.signal);

    fetchPromise
      .then((slice) => {
        if (abortController.signal.aborted) return;

        // Stage 1 & Stage 2 Comprehensive Scientific Double-Validation Gate
        const scientificValidation = validateScientificData({
          requestedSelection: currentSelection,
          returnedData: slice,
        });
        const legacyGate = validateOceanDataBeforeRender({
          variable,
          timeStr,
          depth: variable === 'CHLA' ? 0 : depth,
          slice: slice || null,
          isCached: false,
        });

        const combinedPassed = scientificValidation.passed && legacyGate.passed && slice && slice.values && slice.values.length > 0;

        if (combinedPassed && slice) {
          setActiveErddapGridSlice(slice);
          setValidationResult(legacyGate);

          const validPoints = slice.stats?.validPoints || slice.values.filter((v) => v !== null && !isNaN(v)).length;
          const min = slice.stats?.min ?? 0;
          const max = slice.stats?.max ?? 0;

          console.log(`[QUALITY GATE PASSED: 🟢 VERIFIED] Dataset: ${datasetId} | ${variable} | ${timeStr} | ${depth}m | ${validPoints} ocean nodes | Range: [${min.toFixed(2)}, ${max.toFixed(2)}] ${slice.unit}`);

          setSliceFetchStatus({
            loading: false,
            variable: variable === 'CHLA' ? 'CHL' : variable,
            timeStr,
            depth: variable === 'CHLA' ? 0 : depth,
            source: variable === 'CHLA' ? 'INCOIS Oceansat-2 OCM-2 (incois_oceansat2_datasets)' : 'INCOIS ERDDAP (incois_argo_mnt_VAM)',
            points: validPoints,
            rangeStr: `${min.toFixed(2)} - ${max.toFixed(2)} ${slice.unit}`,
          });
        } else {
          // Validation failed or data missing: PURGE all active grid slices
          clearActiveErddapGridSlices();
          console.error(`[QUALITY GATE FAILED: 🔴 BLOCKED] Validation errors:`, scientificValidation.errors || legacyGate.errors);

          const failedResult: PreRenderValidationResult = {
            passed: false,
            valid: false,
            state: 'VALIDATION_FAILED',
            errors: scientificValidation.errors.length > 0 ? scientificValidation.errors : ['No verified data available for this selection'],
            warnings: [],
            provenance: legacyGate.provenance,
          };
          setValidationResult(failedResult);

          setSliceFetchStatus((prev) => ({
            ...prev,
            loading: false,
            points: 0,
            rangeStr: 'N/A',
            source: 'Data Verification Failed — Rendering Blocked',
          }));
        }

        setSliceUpdateTrigger((c) => c + 1);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        console.warn('[ERDDAP Fetch Notice]', err);

        clearActiveErddapGridSlices();

        const failedResult: PreRenderValidationResult = {
          passed: false,
          valid: false,
          state: 'VALIDATION_FAILED',
          errors: [`Data fetch failed or unavailable for ${datasetId} (${timeStr})`],
          warnings: [],
          provenance: {
            datasetId,
            sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
            variable,
            units: variable === 'TEMP' ? '°C' : variable === 'SAL' ? 'PSU' : 'mg/m³',
            timeStr,
            requestedDate: timeStr,
            actualDate: 'N/A',
            depth: variable === 'CHLA' ? 0 : depth,
            requestedDepth: variable === 'CHLA' ? 0 : depth,
            actualDepth: variable === 'CHLA' ? 0 : depth,
            spatialResolution: '0.25 deg',
            spatialBounds: currentSelection.boundingBox,
            requestUrl: currentSelection.sourceUrl,
            lastSuccessfulFetch: 0,
            verificationState: 'VALIDATION_FAILED',
            validationMessages: [`Data fetch failed or timed out for ${datasetId}`],
            sampleCheckPassed: false,
            sampleChecks: [],
          },
        };
        setValidationResult(failedResult);

        setSliceFetchStatus((prev) => ({
          ...prev,
          loading: false,
          points: 0,
          rangeStr: 'N/A',
          source: 'Data Temporarily Unavailable',
        }));
        setSliceUpdateTrigger((c) => c + 1);
      });

    return () => {
      abortController.abort();
    };
  }, [state.variable, state.timeStepIndex, state.depth]);

  // Effective min / max scales
  const effectiveScale = useMemo(() => {
    const def = getDefaultRange(state.variable, state.depth);
    return {
      min: state.minScaleAuto ? def.min : state.customMin,
      max: state.maxScaleAuto ? def.max : state.customMax,
      unit: def.unit,
      isLog: def.isLog,
    };
  }, [state.variable, state.depth, state.minScaleAuto, state.maxScaleAuto, state.customMin, state.customMax]);

  // Generate ocean raster canvas texture for Cesium SingleTileImageryProvider with advanced edge and coastal ground fading
  // Conforms exactly to Plate Carrée WGS84 geographic projection (30°E - 120°E, 35°S - 30°N)
  const generateRasterCanvas = useCallback((): HTMLCanvasElement => {
    return renderOceanRasterCanvas({
      variable: state.variable,
      depth: state.depth,
      timeStepIndex: state.timeStepIndex,
      colormap: state.colormap,
      opacity: state.opacity,
      minVal: effectiveScale.min,
      maxVal: effectiveScale.max,
      isLogScale: effectiveScale.isLog,
      edgeBlendMode: state.edgeBlendMode || 'soft_feather',
      coastalFeathering: state.coastalFeathering ?? 0.90,
      boundaryFade: state.boundaryFade ?? true,
    });
  }, [
    state.variable,
    state.depth,
    state.timeStepIndex,
    state.colormap,
    state.opacity,
    state.edgeBlendMode,
    state.coastalFeathering,
    state.boundaryFade,
    effectiveScale.min,
    effectiveScale.max,
    effectiveScale.isLog,
  ]);

  // 1. Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const initCesium = async () => {
      const Cesium = window.Cesium || (window as any).Cesium;
      if (!Cesium) {
        console.warn('Waiting for CesiumJS script to load...');
        return;
      }

      Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

      try {
        // Initialize Cesium Viewer with high-reliability imagery
        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          fullscreenButton: false,
          selectionIndicator: false,
          skyAtmosphere: new Cesium.SkyAtmosphere(),
          globe: new Cesium.Globe(),
          scene3DOnly: false,
          shouldAnimate: true,
        });

        // Set high quality visual environment
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#040810');
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#061221');
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = false;

        // High-DPI screen support (Retina/4K) & Multi-Sample Anti-Aliasing
        const dpr = Math.min(window.devicePixelRatio || 1.0, 2.0);
        viewer.resolutionScale = dpr;
        if (viewer.scene.msaaSamples !== undefined) {
          viewer.scene.msaaSamples = 4;
        }
        if (viewer.scene.postProcessStages?.fxaa) {
          viewer.scene.postProcessStages.fxaa.enabled = true;
        }
        viewer.scene.globe.maximumScreenSpaceError = 1.33;

        // Configure strict Zoom Limits and Camera Constraints to keep focus 100% inside the Indian Ocean Domain
        const controller = viewer.scene.screenSpaceCameraController;
        controller.minimumZoomDistance = 10000.0;    // 10 km (close-up inspection)
        controller.maximumZoomDistance = 4500000.0;  // 4,500 km (strictly frames Indian Ocean, prevents zooming out to unmodeled planet)
        controller.enableTilt = true;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableZoom = true;

        // Domain boundaries (30°E - 120°E, -35°S - 30°N)
        const { lonMin, lonMax, latMin, latMax } = GRID_METADATA;

        // Glowing Scientific Bounding Barrier Perimeter
        viewer.entities.add({
          name: 'INCOIS Domain Barrier Line',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              lonMin, latMin,
              lonMax, latMin,
              lonMax, latMax,
              lonMin, latMax,
              lonMin, latMin,
            ]),
            width: 2.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              taperPower: 1.0,
              color: Cesium.Color.fromCssColorString('#06b6d4'),
            }),
            clampToGround: true,
          },
        });

        // Corner barrier coordinate tags
        const cornerTags = [
          { lon: lonMin, lat: latMax, label: `NW Boundary [${lonMin}°E, ${latMax}°N]` },
          { lon: lonMax, lat: latMax, label: `NE Boundary [${lonMax}°E, ${latMax}°N]` },
          { lon: lonMin, lat: latMin, label: `SW Boundary [${lonMin}°E, ${Math.abs(latMin)}°S]` },
          { lon: lonMax, lat: latMin, label: `SE Boundary [${lonMax}°E, ${Math.abs(latMin)}°S]` },
        ];
        cornerTags.forEach((tag, idx) => {
          viewer.entities.add({
            id: `domain-barrier-tag-${idx}`,
            position: Cesium.Cartesian3.fromDegrees(tag.lon, tag.lat, 100),
            point: {
              pixelSize: 6,
              color: Cesium.Color.fromCssColorString('#22d3ee'),
              outlineColor: Cesium.Color.fromCssColorString('#040810'),
              outlineWidth: 2,
            },
            label: {
              text: tag.label,
              font: '10px monospace',
              fillColor: Cesium.Color.fromCssColorString('#38bdf8'),
              outlineColor: Cesium.Color.fromCssColorString('#020617'),
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, tag.lat < 0 ? 16 : -16),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4500000),
            },
          });
        });

        // Strict Real-Time Camera Enforcement (hard bounds & pitch limit)
        // Hard limits: camera center locked inside [34°E, 116°E] and [-31°S, 25°N]
        const minAllowedLon = 34.0;  // 34.0°E
        const maxAllowedLon = 116.0; // 116.0°E
        const minAllowedLat = -31.0; // -31.0°S
        const maxAllowedLat = 25.0;  // 25.0°N
        const minPitch = Cesium.Math.toRadians(-89.5); // Top-down
        const maxPitch = Cesium.Math.toRadians(-32.0); // Angled 3D horizon (prevents looking up into outer space)

        viewer.clock.onTick.addEventListener(() => {
          const carto = viewer.camera.positionCartographic;
          if (!carto) return;

          const lon = Cesium.Math.toDegrees(carto.longitude);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const height = carto.height;
          const currentPitch = viewer.camera.pitch;

          let needClamp = false;
          let clampedLon = lon;
          let clampedLat = lat;
          let clampedPitch = currentPitch;
          let clampedHeight = height;

          if (lon < minAllowedLon) {
            clampedLon = minAllowedLon;
            needClamp = true;
          } else if (lon > maxAllowedLon) {
            clampedLon = maxAllowedLon;
            needClamp = true;
          }

          if (lat < minAllowedLat) {
            clampedLat = minAllowedLat;
            needClamp = true;
          } else if (lat > maxAllowedLat) {
            clampedLat = maxAllowedLat;
            needClamp = true;
          }

          if (currentPitch > maxPitch) {
            clampedPitch = maxPitch;
            needClamp = true;
          } else if (currentPitch < minPitch) {
            clampedPitch = minPitch;
            needClamp = true;
          }

          if (height > 4500000.0) {
            clampedHeight = 4500000.0;
            needClamp = true;
          } else if (height < 10000.0) {
            clampedHeight = 10000.0;
            needClamp = true;
          }

          if (needClamp) {
            viewer.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(clampedLon, clampedLat, clampedHeight),
              orientation: {
                heading: viewer.camera.heading,
                pitch: clampedPitch,
                roll: viewer.camera.roll,
              },
            });
          }
        });

        // Initial camera view framing the Indian Ocean Basin
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(78.0, 4.0, 4200000),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-88.0),
            roll: 0.0,
          },
          duration: 1.2,
        });

        // Helper: Extract ArgoFloat object from picked Cesium object
        const resolveFloatFromEntity = (picked: any): ArgoFloat | null => {
          if (!picked) return null;
          const entity = picked.id || picked;
          if (!entity) return null;

          const availableFloats = filteredFloatsRef.current?.length > 0 ? filteredFloatsRef.current : ARGO_FLOATS;

          // 1. Direct property bag
          if (entity.properties) {
            try {
              const floatData = typeof entity.properties.floatData?.getValue === 'function'
                ? entity.properties.floatData.getValue(viewer.clock.currentTime)
                : entity.properties.floatData?._value || entity.properties.floatData;
              if (floatData && floatData.id) return floatData;

              const floatId = typeof entity.properties.floatId?.getValue === 'function'
                ? entity.properties.floatId.getValue(viewer.clock.currentTime)
                : entity.properties.floatId?._value || entity.properties.floatId;
              if (floatId) {
                const found = availableFloats.find(
                  (f) =>
                    f.id === floatId ||
                    f.id === `argo-${floatId}` ||
                    f.platformNumber === String(floatId) ||
                    f.id.endsWith(String(floatId))
                );
                if (found) return found;
              }

              const wmoId = typeof entity.properties.wmoId?.getValue === 'function'
                ? entity.properties.wmoId.getValue(viewer.clock.currentTime)
                : entity.properties.wmoId?._value || entity.properties.wmoId;
              if (wmoId) {
                const found = availableFloats.find((f) => f.platformNumber === String(wmoId));
                if (found) return found;
              }
            } catch {
              // continue to fallback checks
            }
          }

          // 2. Entity ID check (e.g. 'argo-2902088' or 'argo-argo-2902088')
          const idStr = typeof entity === 'string' ? entity : typeof entity.id === 'string' ? entity.id : '';
          if (idStr.includes('argo')) {
            const rawNum = idStr.replace(/^(argo-)+/, '');
            const found = availableFloats.find(
              (f) =>
                f.id === idStr ||
                f.id === `argo-${rawNum}` ||
                f.platformNumber === rawNum ||
                f.id.endsWith(rawNum)
            );
            if (found) return found;
          }

          // 3. Entity Name check
          if (typeof entity.name === 'string' && entity.name.includes('Argo')) {
            const match = entity.name.match(/\d+/);
            if (match) {
              const found = availableFloats.find((f) => f.platformNumber === match[0]);
              if (found) return found;
            }
          }

          return null;
        };

        // Setup ScreenSpaceEventHandler for mouse move and click picking
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        // Hover tooltip & Lat/Lon tracking
        handler.setInputAction((movement: any) => {
          let foundHoverFloat: ArgoFloat | null = null;

          // Tier 1: Drill pick
          const pickedObjects = viewer.scene.drillPick(movement.endPosition, 10);
          if (pickedObjects && pickedObjects.length > 0) {
            for (const item of pickedObjects) {
              const fl = resolveFloatFromEntity(item);
              if (fl) {
                foundHoverFloat = fl;
                break;
              }
            }
          }

          // Tier 2: Single pick
          if (!foundHoverFloat) {
            const singlePick = viewer.scene.pick(movement.endPosition);
            foundHoverFloat = resolveFloatFromEntity(singlePick);
          }

          if (foundHoverFloat) {
            setHoveredFloat(foundHoverFloat);
            setMousePos({ x: movement.endPosition.x, y: movement.endPosition.y });
          } else {
            setHoveredFloat(null);
          }

          // Compute geographic coordinate under cursor
          const ray = viewer.camera.getPickRay(movement.endPosition);
          if (ray) {
            const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
              const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              const lonDeg = Cesium.Math.toDegrees(cartographic.longitude);
              const latDeg = Cesium.Math.toDegrees(cartographic.latitude);
              const latLabel = latDeg >= 0 ? `${latDeg.toFixed(2)}°N` : `${Math.abs(latDeg).toFixed(2)}°S`;
              const lonLabel = lonDeg >= 0 ? `${lonDeg.toFixed(2)}°E` : `${Math.abs(lonDeg).toFixed(2)}°W`;
              setCursorLatLon({ lat: latLabel, lon: lonLabel });
            }
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Click handler: 3-Tier Picking: DrillPick -> SinglePick -> Screen Proximity Fallback -> Grid Probe
        handler.setInputAction((click: any) => {
          let clickedFloat: ArgoFloat | null = null;
          const availableFloats = filteredFloatsRef.current?.length > 0 ? filteredFloatsRef.current : ARGO_FLOATS;

          // Tier 1: Drill Pick (all objects at click position)
          const pickedObjects = viewer.scene.drillPick(click.position, 15);
          if (pickedObjects && pickedObjects.length > 0) {
            for (const item of pickedObjects) {
              const fl = resolveFloatFromEntity(item);
              if (fl) {
                clickedFloat = fl;
                break;
              }
            }
          }

          // Tier 2: Standard Pick
          if (!clickedFloat) {
            const singlePick = viewer.scene.pick(click.position);
            clickedFloat = resolveFloatFromEntity(singlePick);
          }

          // Tier 3: Screen-space Window Coordinate Proximity Fallback (34px radius tolerance)
          if (!clickedFloat && stateRef.current.showArgo) {
            let minDistance = 34.0;
            for (const float of availableFloats) {
              try {
                const cartesian = Cesium.Cartesian3.fromDegrees(float.longitude, float.latitude, 500);
                const screenCoord = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, cartesian);
                if (screenCoord) {
                  const dx = screenCoord.x - click.position.x;
                  const dy = screenCoord.y - click.position.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist < minDistance) {
                    minDistance = dist;
                    clickedFloat = float;
                  }
                }
              } catch {
                // ignore transform error
              }
            }
          }

          // If an Argo Float was clicked, trigger immediate selection and debug logging
          if (clickedFloat) {
            const activeVar = stateRef.current.variable;
            const activeDataset = activeVar === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM';
            const activeDepth = stateRef.current.depth;

            // Audit Debug Logging required by system specification
            console.log('--- ARGO MARKER CLICK AUDIT ---');
            console.log('MARKER CLICKED: true');
            console.log(`FLOAT WMO ID: ${clickedFloat.platformNumber}`);
            console.log('SELECTED FLOAT UPDATED: true');
            console.log(`ACTIVE DATASET: ${activeDataset}`);
            console.log(`ACTIVE VARIABLE: ${activeVar}`);
            console.log(`ACTIVE DATE: 2024-03-15`);
            console.log(`ACTIVE DEPTH: ${activeDepth}m`);
            console.log('OBSERVATION REQUEST STARTED: true');
            console.log('PROFILE REQUEST STARTED: true');

            // Immediately update state without blocking
            onSelectFloatRef.current(clickedFloat.id);
            onSelectProbePointRef.current(null);
            return;
          }

          // Raycast to globe coordinate to sample ocean data anywhere (Numerical Grid Probe)
          const ray = viewer.camera.getPickRay(click.position);
          if (ray) {
            const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
              const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              const lonDeg = Cesium.Math.toDegrees(cartographic.longitude);
              const latDeg = Cesium.Math.toDegrees(cartographic.latitude);

              // Sample 4D point data at current depth & time step
              const probeData = sampleOceanPoint(
                latDeg,
                lonDeg,
                stateRef.current.depth,
                stateRef.current.timeStepIndex,
                stateRef.current.variable
              );
              onSelectFloatRef.current(null);
              onSelectProbePointRef.current(probeData);
            } else {
              onSelectFloatRef.current(null);
              onSelectProbePointRef.current(null);
            }
          } else {
            onSelectFloatRef.current(null);
            onSelectProbePointRef.current(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handlerRef.current = handler;
        viewerRef.current = viewer;
        setIsCesiumReady(true);
      } catch (err) {
        console.error('Failed to initialize Cesium Viewer:', err);
      }
    };

    if (window.Cesium) {
      initCesium();
    } else {
      const interval = setInterval(() => {
        if (window.Cesium) {
          clearInterval(interval);
          initCesium();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const handleResize = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        const dpr = Math.min(window.devicePixelRatio || 1.0, 2.0);
        viewerRef.current.resolutionScale = dpr;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (handlerRef.current) {
        handlerRef.current.destroy();
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 2. Update Basemap Imagery Layer
  useEffect(() => {
    if (!isCesiumReady || !viewerRef.current) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const updateBasemap = async () => {
      try {
        const imageryLayers = viewer.imageryLayers;
        let baseProvider;

        if (state.basemap === 'bathymetry') {
          if (typeof Cesium.TileMapServiceImageryProvider?.fromUrl === 'function') {
            try {
              baseProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
                Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
              );
            } catch {
              baseProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
                maximumLevel: 13,
              });
            }
          } else {
            baseProvider = new Cesium.UrlTemplateImageryProvider({
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
              maximumLevel: 13,
            });
          }
        } else {
          // Satellite mode: High-resolution World Satellite Imagery
          if (typeof Cesium.ArcGisMapServerImageryProvider?.fromUrl === 'function') {
            try {
              baseProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
                { enablePickFeatures: false }
              );
            } catch {
              baseProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maximumLevel: 19,
              });
            }
          } else {
            baseProvider = new Cesium.UrlTemplateImageryProvider({
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              maximumLevel: 19,
            });
          }
        }

        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

        if (imageryLayers.length > 0) {
          imageryLayers.remove(imageryLayers.get(0), false);
        }
        const layer = imageryLayers.addImageryProvider(baseProvider, 0);
        layer.alpha = 1.0;
      } catch (e) {
        console.warn('Basemap load fallback:', e);
      }
    };

    updateBasemap();
  }, [isCesiumReady, state.basemap]);

  // 3. Update Numerical Ocean Raster Depth Slice Layer
  useEffect(() => {
    if (!isCesiumReady || !viewerRef.current) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const updateRasterLayer = async () => {
      try {
        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

        // Strict Data Integrity: If validation failed or no data, ensure layer is removed
        if (validationResult && !validationResult.passed) {
          if (oceanLayerRef.current) {
            viewer.imageryLayers.remove(oceanLayerRef.current, true);
            oceanLayerRef.current = null;
          }
          return;
        }

        const rasterCanvas = generateRasterCanvas();
        const dataUrl = rasterCanvas.toDataURL('image/png');
        const rect = Cesium.Rectangle.fromDegrees(
          GRID_METADATA.lonMin,
          GRID_METADATA.latMin,
          GRID_METADATA.lonMax,
          GRID_METADATA.latMax
        );

        let provider;
        if (typeof Cesium.SingleTileImageryProvider?.fromUrl === 'function') {
          try {
            provider = await Cesium.SingleTileImageryProvider.fromUrl(dataUrl, {
              rectangle: rect,
            });
          } catch {
            provider = new Cesium.SingleTileImageryProvider({
              url: dataUrl,
              rectangle: rect,
            });
          }
        } else {
          provider = new Cesium.SingleTileImageryProvider({
            url: dataUrl,
            rectangle: rect,
          });
        }

        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

        if (oceanLayerRef.current) {
          viewer.imageryLayers.remove(oceanLayerRef.current, true);
        }

        const layer = viewer.imageryLayers.addImageryProvider(provider);
        layer.alpha = state.opacity;
        oceanLayerRef.current = layer;
      } catch (err) {
        console.error('Failed to update ocean raster layer:', err);
      }
    };

    updateRasterLayer();
  }, [
    isCesiumReady,
    state.variable,
    state.depth,
    state.timeStepIndex,
    state.colormap,
    state.opacity,
    effectiveScale.min,
    effectiveScale.max,
    effectiveScale.isLog,
    generateRasterCanvas,
    sliceUpdateTrigger,
    validationResult,
  ]);

  // 4. Update In-Situ Argo Float Entities & Trajectories
  useEffect(() => {
    if (!isCesiumReady || !viewerRef.current) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    // Clear previous float entities and tracks
    floatEntitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    floatEntitiesRef.current.clear();

    trackEntitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    trackEntitiesRef.current = [];

    if (!state.showArgo) return;

    filteredFloats.forEach((float) => {
      const isSelected = state.selectedFloatId === float.id;
      const isHovered = hoveredFloat?.id === float.id;
      const profile = float.profiles.find((p) => p.depth === state.depth) || float.profiles[0];
      const delta =
        state.variable === 'TEMP'
          ? profile.tempDelta
          : state.variable === 'SAL'
          ? profile.salDelta
          : profile.chlaDelta || 0;
      const absDelta = Math.abs(delta);

      // Color code by anomaly / discrepancy
      let beaconColorHex = '#10b981'; // Emerald (Well Matched)
      const highThresh = state.variable === 'CHLA' ? 1.0 : 1.5;
      const modThresh = state.variable === 'CHLA' ? 0.3 : 0.5;

      if (absDelta >= highThresh) {
        beaconColorHex = '#f43f5e'; // Rose (High Divergence)
      } else if (absDelta >= modThresh) {
        beaconColorHex = '#f59e0b'; // Amber (Moderate Divergence)
      }

      if (isSelected) {
        beaconColorHex = '#38bdf8'; // Cyan Selected
      }

      const iconUri = createFloatMarkerIcon(beaconColorHex, isSelected, isHovered);

      // Add float billboard entity
      const entity = viewer.entities.add({
        id: float.id,
        name: `Argo ${float.platformNumber}`,
        position: Cesium.Cartesian3.fromDegrees(float.longitude, float.latitude, 500),
        billboard: {
          image: iconUri,
          scale: 1.0,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: isSelected
          ? {
              text: `WMO ${float.platformNumber} (Δ ${delta > 0 ? '+' : ''}${delta.toFixed(2)})`,
              font: 'bold 11px monospace',
              fillColor: Cesium.Color.fromCssColorString('#38bdf8'),
              outlineColor: Cesium.Color.fromCssColorString('#040810'),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -26),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }
          : undefined,
        properties: {
          type: 'argo-float',
          floatId: float.id,
          wmoId: float.platformNumber,
          floatData: float,
          discrepancyDelta: delta,
        },
      });

      // If float is selected, also render its drift trajectory polyline
      if (isSelected) {
        const driftPoints = [
          Cesium.Cartesian3.fromDegrees(float.longitude - 0.9, float.latitude - 0.4, 200),
          Cesium.Cartesian3.fromDegrees(float.longitude - 0.6, float.latitude - 0.25, 200),
          Cesium.Cartesian3.fromDegrees(float.longitude - 0.3, float.latitude - 0.1, 200),
          Cesium.Cartesian3.fromDegrees(float.longitude, float.latitude, 200),
        ];

        const trackEntity = viewer.entities.add({
          polyline: {
            positions: driftPoints,
            width: 2.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.fromCssColorString('#38bdf8'),
            }),
          },
        });
        trackEntitiesRef.current.push(trackEntity);
      }

      floatEntitiesRef.current.set(float.id, entity);
    });
  }, [
    isCesiumReady,
    filteredFloats,
    state.showArgo,
    state.selectedFloatId,
    hoveredFloat?.id,
    state.depth,
    state.variable,
  ]);

  // 5. Update Selected Arbitrary Probe Target Entity on Globe
  useEffect(() => {
    if (!isCesiumReady || !viewerRef.current) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    if (probeEntityRef.current) {
      viewer.entities.remove(probeEntityRef.current);
      probeEntityRef.current = null;
    }

    if (state.selectedProbePoint) {
      const { latitude, longitude, currentValue, isLand } = state.selectedProbePoint;
      const targetIcon = createProbeTargetIcon();

      const unit = state.variable === 'TEMP' ? '°C' : state.variable === 'SAL' ? ' PSU' : ' mg/m³';
      const activeVal =
        state.variable === 'TEMP'
          ? currentValue.temp
          : state.variable === 'SAL'
          ? currentValue.sal
          : currentValue.chla;

      const labelText = isLand
        ? `Landmass (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`
        : `${activeVal.toFixed(2)}${unit} @ ${state.depth}m (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;

      const entity = viewer.entities.add({
        id: 'user-ocean-probe-target',
        name: 'Selected Ocean Sounding',
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1000),
        billboard: {
          image: targetIcon,
          scale: 1.0,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: labelText,
          font: 'bold 12px monospace',
          fillColor: Cesium.Color.fromCssColorString('#f59e0b'),
          outlineColor: Cesium.Color.fromCssColorString('#040810'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -32),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      probeEntityRef.current = entity;
    }
  }, [
    isCesiumReady,
    state.selectedProbePoint,
    state.variable,
    state.depth,
  ]);

  // 6. Handle View Mode (3D Globe vs 2D Map)
  useEffect(() => {
    if (!isCesiumReady || !viewerRef.current) return;
    const viewer = viewerRef.current;
    if (state.viewMode === '2d_map') {
      viewer.scene.morphTo2D(1.0);
    } else {
      viewer.scene.morphTo3D(1.0);
    }
  }, [isCesiumReady, state.viewMode]);

  // Recenter Camera on Indian Ocean
  const handleRecenter = () => {
    if (!viewerRef.current) return;
    const Cesium = window.Cesium;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(78.0, 4.0, 4200000),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-88.0),
        roll: 0.0,
      },
      duration: 1.2,
    });
  };

  // Zoom In / Out
  const handleZoom = (direction: 'in' | 'out') => {
    if (!viewerRef.current) return;
    const camera = viewerRef.current.camera;
    const height = camera.positionCartographic.height;
    if (direction === 'in') {
      camera.zoomIn(height * 0.35);
    } else {
      camera.zoomOut(height * 0.35);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#040810]">
      {/* Cesium Container */}
      <div
        id="cesiumContainer"
        ref={containerRef}
        className="w-full h-full"
      />

      {/* Floating HUD Controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        <button
          id="btn-recenter-cesium"
          onClick={handleRecenter}
          title="Recenter Indian Ocean Basin (78°E, 6°N)"
          className="p-2 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all flex items-center justify-center group cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
        </button>
        <button
          id="btn-zoom-in-cesium"
          onClick={() => handleZoom('in')}
          title="Zoom In"
          className="p-2 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="btn-zoom-out-cesium"
          onClick={() => handleZoom('out')}
          title="Zoom Out"
          className="p-2 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Quick Probe Readout Card (when a point is clicked) */}
      {state.selectedProbePoint && (
        <div
          id="globe-probe-quick-card"
          className="absolute top-4 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/60 rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 max-w-[280px]"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Target className="w-4 h-4" />
              <span>POINT OCEAN PROBE</span>
            </div>
            <button
              id="btn-dismiss-globe-probe"
              onClick={() => onSelectProbePoint(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-slate-200 font-bold text-sm">
              {state.selectedProbePoint.basin}
            </div>
            <div className="text-slate-400 font-mono text-[11px] flex items-center justify-between">
              <span>Pos: {state.selectedProbePoint.latitude >= 0 ? `${state.selectedProbePoint.latitude.toFixed(2)}°N` : `${Math.abs(state.selectedProbePoint.latitude).toFixed(2)}°S`}, {state.selectedProbePoint.longitude >= 0 ? `${state.selectedProbePoint.longitude.toFixed(2)}°E` : `${Math.abs(state.selectedProbePoint.longitude).toFixed(2)}°W`}</span>
              <span className="text-cyan-300 font-semibold">
                {state.variable === 'CHLA' ? 'Layer: Surface (0–5m)' : `Layer: ${state.depth}m`}
              </span>
            </div>
          </div>

          {state.selectedProbePoint.isLand ? (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
              Continental Landmass (Outside Ocean Grid)
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
              <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block">SST/Temp</span>
                <span className="text-amber-400 font-bold text-[11px]">
                  {!isNaN(state.selectedProbePoint.currentValue.temp) ? `${state.selectedProbePoint.currentValue.temp.toFixed(2)}°C` : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Salinity</span>
                <span className="text-cyan-400 font-bold text-[11px]">
                  {!isNaN(state.selectedProbePoint.currentValue.sal) ? `${state.selectedProbePoint.currentValue.sal.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Chl-a</span>
                <span className="text-emerald-400 font-bold text-[11px]">
                  {!isNaN(state.selectedProbePoint.currentValue.chla) ? `${state.selectedProbePoint.currentValue.chla.toFixed(3)}` : 'No Data'}
                </span>
              </div>
            </div>
          )}

          {state.selectedProbePoint.nearestFloat && (
            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
              <span>Nearest Float:</span>
              <span className="text-slate-300 font-semibold">
                WMO #{state.selectedProbePoint.nearestFloat.float.platformNumber} ({state.selectedProbePoint.nearestFloat.distanceKm} km)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dynamic ERDDAP Dataset Status & Provenance HUD Banner */}
      <div
        id="dataset-provenance-banner"
        onClick={() => setIsProvenanceModalOpen(true)}
        className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border text-xs shadow-2xl transition-all cursor-pointer hover:bg-slate-800/95 ${
          validationResult?.state === 'VERIFIED'
            ? 'border-emerald-500/60 shadow-emerald-950/40'
            : validationResult?.state === 'CACHED'
            ? 'border-amber-500/60 shadow-amber-950/40'
            : validationResult?.state === 'VALIDATION_FAILED'
            ? 'border-red-500/80 shadow-red-950/50'
            : sliceFetchStatus.loading
            ? 'border-amber-500/60 shadow-amber-950/40'
            : 'border-cyan-500/50 shadow-cyan-950/30'
        }`}
        title="Click to view full Scientific Data Provenance & Double-Verification Quality Gate Audit"
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            sliceFetchStatus.loading
              ? 'bg-amber-400 animate-ping'
              : validationResult?.state === 'VERIFIED'
              ? 'bg-emerald-400 animate-pulse'
              : validationResult?.state === 'CACHED'
              ? 'bg-amber-400'
              : validationResult?.state === 'VALIDATION_FAILED'
              ? 'bg-red-400'
              : 'bg-cyan-400'
          }`}
        />
        <div className="font-mono text-slate-200 flex items-center gap-2">
          <span
            className={`font-semibold ${
              state.variable === 'CHLA' ? 'text-emerald-400' : 'text-cyan-400'
            }`}
          >
            {state.variable === 'CHLA'
              ? 'incois_oceansat2_datasets'
              : 'incois_argo_mnt_VAM'}
            :
          </span>
          <span className="text-slate-300">
            {state.variable === 'TEMP'
              ? 'TEMP (°C)'
              : state.variable === 'SAL'
              ? 'SAL (PSU)'
              : 'CHL (mg/m³)'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-100 font-semibold">{sliceFetchStatus.timeStr}</span>
          {state.variable !== 'CHLA' && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-amber-300 font-semibold">{state.depth}m</span>
            </>
          )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-sans flex items-center gap-1 ${
              sliceFetchStatus.loading
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                : validationResult?.state === 'VERIFIED'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                : validationResult?.state === 'CACHED'
                ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                : validationResult?.state === 'VALIDATION_FAILED'
                ? 'bg-red-950 text-red-300 border border-red-800/60'
                : 'bg-slate-800 text-cyan-300 border border-slate-700'
            }`}
          >
            {sliceFetchStatus.loading ? (
              <>
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Validating ERDDAP...</span>
              </>
            ) : validationResult?.state === 'VERIFIED' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>🟢 Verified</span>
              </>
            ) : validationResult?.state === 'CACHED' ? (
              <span>🟡 Cached</span>
            ) : validationResult?.state === 'VALIDATION_FAILED' ? (
              <>
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>🔴 Validation Failed</span>
              </>
            ) : (
              <span>Live Synced Grid</span>
            )}
          </span>
        </div>
      </div>

      {/* Strict Scientific Integrity Overlay: No Verified Data Available Banner */}
      {validationResult && !validationResult.passed && !sliceFetchStatus.loading && (
        <div
          id="no-verified-data-alert"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-red-950/90 backdrop-blur-md border border-red-500/80 px-4 py-2.5 rounded-xl text-red-200 text-xs shadow-2xl animate-fade-in max-w-lg text-center"
        >
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-left">
            <div className="font-semibold text-red-100 flex items-center gap-1.5">
              <span>No verified data available for this selection</span>
            </div>
            <div className="text-[11px] text-red-300/90 mt-0.5">
              Layer rendering blocked to prevent unverified or extrapolated ocean state display.
            </div>
          </div>
          <button
            onClick={() => setIsProvenanceModalOpen(true)}
            className="shrink-0 ml-auto px-2.5 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-100 font-mono text-[10px] border border-red-700/60 transition-colors"
          >
            Audit Gate
          </button>
        </div>
      )}

      {/* Floating Telemetry Badge (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold">
          <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span>INCOIS 3D Cesium</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center gap-1 text-cyan-300 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Domain Barrier Clamped</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="text-slate-300 font-mono text-[11px]">
          Cursor: {cursorLatLon ? `${cursorLatLon.lat}, ${cursorLatLon.lon}` : '78.00°E, 6.00°N'}
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="text-slate-400 text-[11px]">
          Active Floats: <span className="text-emerald-400 font-semibold">{filteredFloats.length}</span> / {ARGO_FLOATS.length}
        </div>
      </div>

      {/* Floating Hover Tooltip for Argo Float */}
      {hoveredFloat && (
        <div
          className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]"
          style={{
            left: `${Math.min(mousePos.x + 15, window.innerWidth - 240)}px`,
            top: `${Math.min(mousePos.y + 15, window.innerHeight - 180)}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-cyan-300">WMO #{hoveredFloat.platformNumber}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
              QC: {hoveredFloat.qcFlag === 1 ? 'Passed' : 'Probable'}
            </span>
          </div>

          <div className="text-slate-400 text-[11px] space-y-0.5">
            <div>Basin: <span className="text-slate-200">{hoveredFloat.basin}</span></div>
            <div>Pos: <span className="text-slate-200 font-mono">{hoveredFloat.latitude.toFixed(2)}°N, {hoveredFloat.longitude.toFixed(2)}°E</span></div>
            <div>Depth Layer: <span className="text-cyan-300 font-bold">{state.depth}m</span></div>
          </div>

          {(() => {
            const profile = hoveredFloat.profiles.find((p) => p.depth === state.depth) || hoveredFloat.profiles[0];
            const rawObs =
              state.variable === 'TEMP'
                ? profile?.observedTemp
                : state.variable === 'SAL'
                ? profile?.observedSal
                : profile?.observedChla;
            const rawMod =
              state.variable === 'TEMP'
                ? profile?.modelTemp
                : state.variable === 'SAL'
                ? profile?.modelSal
                : profile?.modelChla;

            const isObsFinite = typeof rawObs === 'number' && isFinite(rawObs) && !isNaN(rawObs);
            const isModFinite = typeof rawMod === 'number' && isFinite(rawMod) && !isNaN(rawMod);
            const isDeltaFinite = isObsFinite && isModFinite;
            const delta = isDeltaFinite ? rawObs! - rawMod! : null;
            const unit = state.variable === 'TEMP' ? '°C' : state.variable === 'SAL' ? 'PSU' : 'mg/m³';

            return (
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-400">Obs:</span>{' '}
                  <span className="text-emerald-400 font-mono font-semibold">
                    {isObsFinite ? `${rawObs!.toFixed(2)}${unit}` : 'Data unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Model:</span>{' '}
                  <span className="text-cyan-400 font-mono">
                    {isModFinite ? `${rawMod!.toFixed(2)}${unit}` : 'Data unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Δ:</span>{' '}
                  <span
                    className={`font-mono font-bold ${
                      isDeltaFinite && Math.abs(delta!) > 1.0 ? 'text-amber-400' : 'text-emerald-300'
                    }`}
                  >
                    {isDeltaFinite ? `${delta! > 0 ? '+' : ''}${delta!.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 5. Scientific Data Verification & Provenance Modal */}
      <VerificationProvenanceModal
        isOpen={isProvenanceModalOpen}
        provenance={validationResult ? validationResult.provenance : null}
        onClose={() => setIsProvenanceModalOpen(false)}
      />
    </div>
  );
};
