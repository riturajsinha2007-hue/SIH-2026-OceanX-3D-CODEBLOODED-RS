/**
 * Ocean Current Visualization Layer
 * Renders directional vector arrows and animated vector particle streamlines
 * synchronized directly with the Cesium 3D globe camera at 60 FPS.
 * Strictly adheres to real dataset spatial coverage and coastal land masking.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DepthLevel, OceanCurrentVector, VisualizationState } from '../../types/ocean';
import {
  generateIndianOceanCurrentsGrid,
  computeOceanCurrent,
  getCurrentColor,
} from '../../data/oceanCurrentsData';
import { DATASET_SPATIAL_METADATA, normalizeLongitude, isLandPoint } from '../../data/incoisDataset';

interface OceanCurrentsCanvasProps {
  state?: VisualizationState;
  depth?: DepthLevel;
  timeStepIndex?: number;
  opacity?: number;
  styleMode?: 'arrows' | 'particles' | 'both';
  viewer?: any;
  onSelectCurrentVector?: (vector: OceanCurrentVector) => void;
}

interface ParticlePoint {
  lat: number;
  lon: number;
}

interface Particle {
  lat: number;
  lon: number;
  history: ParticlePoint[];
  age: number;
  maxAge: number;
  speed: number;
}

export const OceanCurrentsCanvas: React.FC<OceanCurrentsCanvasProps> = ({
  state,
  depth: propDepth,
  timeStepIndex: propTimeStepIndex,
  opacity: propOpacity,
  styleMode: propStyleMode,
  viewer,
  onSelectCurrentVector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const isEnabled = state?.showCurrents ?? true;
  const style = propStyleMode ?? state?.currentsStyle ?? 'both';
  const opacity = propOpacity ?? state?.currentsOpacity ?? 0.85;
  const depth = propDepth ?? state?.depth ?? 5;
  const timeIndex = propTimeStepIndex ?? state?.timeStepIndex ?? 0;

  // Real dataset bounds for physical circulation models
  const bounds = DATASET_SPATIAL_METADATA.SSH;

  // Compute grid of current vectors across the basin bounded strictly to dataset extent
  const currentVectors = useMemo(() => {
    if (!isEnabled || (style !== 'arrows' && style !== 'both')) return [];
    // Grid spacing: 2.2 degrees for crisp vector arrow readability without clutter
    return generateIndianOceanCurrentsGrid(depth, timeIndex, 2.2, bounds);
  }, [isEnabled, style, depth, timeIndex, bounds]);

  // Seed particles uniformly across valid ocean waters within dataset bounds
  const numParticles = 240;

  useEffect(() => {
    if (!isEnabled || (style !== 'particles' && style !== 'both')) return;

    const particles: Particle[] = [];
    const latSpan = bounds.latMax - bounds.latMin - 2;
    const lonSpan = bounds.lonMax - bounds.lonMin - 2;

    let attempts = 0;
    while (particles.length < numParticles && attempts < 1200) {
      attempts++;
      const plat = bounds.latMin + 1 + Math.random() * latSpan;
      const plon = bounds.lonMin + 1 + Math.random() * lonSpan;
      const normLon = normalizeLongitude(plon);

      if (isLandPoint(plat, normLon)) continue;

      const vel = computeOceanCurrent(plat, normLon, depth, timeIndex);
      if (vel.speed < 0.02) continue;

      particles.push({
        lat: plat,
        lon: normLon,
        history: [{ lat: plat, lon: normLon }],
        age: Math.floor(Math.random() * 60),
        maxAge: 70 + Math.floor(Math.random() * 50),
        speed: vel.speed,
      });
    }

    particlesRef.current = particles;
  }, [isEnabled, style, depth, bounds, timeIndex]);

  // Synchronized Cesium 3D Globe Render Hook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isEnabled || !viewer || viewer.isDestroyed()) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const Cesium = window.Cesium;
    if (!Cesium) return;

    let occluder: any = null;

    // Helper to project geographic WGS84 coordinate to screen window pixels
    const projectGeo = (lat: number, lon: number) => {
      if (!viewer || viewer.isDestroyed() || !viewer.scene || !viewer.camera) return null;
      const normLon = normalizeLongitude(lon);
      const cart = Cesium.Cartesian3.fromDegrees(normLon, lat, 0);

      if (!occluder && viewer.camera) {
        occluder = new Cesium.EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, viewer.camera.position);
      }
      if (occluder && !occluder.isPointVisible(cart)) {
        return null;
      }

      const transformFn =
        Cesium.SceneTransforms?.worldToWindowCoordinates ||
        Cesium.SceneTransforms?.wgs84ToWindowCoordinates;
      const screenPos = transformFn ? transformFn.call(Cesium.SceneTransforms, viewer.scene, cart) : null;
      if (!screenPos) return null;

      return { x: screenPos.x, y: screenPos.y };
    };

    // Respawn a particle at a random valid ocean coordinate
    const respawnParticle = (p: Particle) => {
      const latSpan = bounds.latMax - bounds.latMin - 2;
      const lonSpan = bounds.lonMax - bounds.lonMin - 2;

      for (let i = 0; i < 30; i++) {
        const plat = bounds.latMin + 1 + Math.random() * latSpan;
        const plon = bounds.lonMin + 1 + Math.random() * lonSpan;
        const normLon = normalizeLongitude(plon);

        if (!isLandPoint(plat, normLon)) {
          const vel = computeOceanCurrent(plat, normLon, depth, timeIndex);
          p.lat = plat;
          p.lon = normLon;
          p.history = [{ lat: plat, lon: normLon }];
          p.age = 0;
          p.maxAge = 60 + Math.floor(Math.random() * 50);
          p.speed = vel.speed;
          return;
        }
      }
      p.age = 0;
      p.history = [{ lat: p.lat, lon: p.lon }];
    };

    // Core render callback called before every Cesium frame
    const onPreRender = () => {
      if (!canvas || !viewer || viewer.isDestroyed()) return;

      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Always clear canvas completely each frame so no screen smudges or trails linger
      ctx.clearRect(0, 0, width, height);

      // Re-instantiate occluder with current camera position
      if (viewer.camera) {
        occluder = new Cesium.EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, viewer.camera.position);
      }

      // Camera altitude scaling factor (prevents gigantic arrows when zoomed far out)
      let camHeight = 6000000;
      if (viewer.camera?.positionCartographic) {
        camHeight = viewer.camera.positionCartographic.height;
      }
      // Altitude zoom scale factor: 1.0 at 4,000km, 0.4 at 20,000km
      const zoomScale = Math.min(1.4, Math.max(0.35, 4500000 / camHeight));

      ctx.save();
      ctx.globalAlpha = opacity;

      // 1. Draw Directional Vector Arrows Grid
      if (style === 'arrows' || style === 'both') {
        const arrowVectors = currentVectors;
        const count = arrowVectors.length;

        for (let i = 0; i < count; i++) {
          const v = arrowVectors[i];

          // Strict boundary and land checks
          if (
            v.lat < bounds.latMin ||
            v.lat > bounds.latMax ||
            v.lon < bounds.lonMin ||
            v.lon > bounds.lonMax ||
            isLandPoint(v.lat, v.lon)
          ) {
            continue;
          }

          const origin = projectGeo(v.lat, v.lon);
          if (!origin) continue;
          if (origin.x < -40 || origin.x > width + 40 || origin.y < -40 || origin.y > height + 40) {
            continue;
          }

          // Target point in 3D geographic coordinates
          const cosLat = Math.cos((v.lat * Math.PI) / 180) || 1;
          const speedNorm = v.speed || 0.1;
          const stepDeg = 0.5 * Math.min(1.5, Math.max(0.4, speedNorm));
          const targetLon = v.lon + (stepDeg * (v.u / speedNorm)) / cosLat;
          const targetLat = v.lat + stepDeg * (v.v / speedNorm);

          const target = projectGeo(targetLat, targetLon);
          if (!target) continue;

          const dx = target.x - origin.x;
          const dy = target.y - origin.y;
          const screenDist = Math.sqrt(dx * dx + dy * dy);
          if (screenDist < 1.0) continue;

          const rad = Math.atan2(dy, dx);
          const arrowLen = Math.min(26 * zoomScale, Math.max(7 * zoomScale, screenDist * 0.85));
          const ex = origin.x + Math.cos(rad) * arrowLen;
          const ey = origin.y + Math.sin(rad) * arrowLen;

          const color = getCurrentColor(v.speed);

          // Draw vector shaft
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.min(2.2, Math.max(1.0, 1.4 * zoomScale));
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Draw vector arrowhead
          const headAngle = Math.PI / 6;
          const headLen = Math.min(6.5 * zoomScale, Math.max(2.8, arrowLen * 0.32));
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(
            ex - headLen * Math.cos(rad - headAngle),
            ey - headLen * Math.sin(rad - headAngle)
          );
          ctx.lineTo(
            ex - headLen * Math.cos(rad + headAngle),
            ey - headLen * Math.sin(rad + headAngle)
          );
          ctx.closePath();
          ctx.fill();

          // Small origin anchor dot
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, 1.2 * zoomScale, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // 2. Draw Animated Vector Particles (Streamlines)
      if (style === 'particles' || style === 'both') {
        const particles = particlesRef.current;
        const dt = 0.45;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // Sample ocean velocity field at particle geographic position
          const vel = computeOceanCurrent(p.lat, p.lon, depth, timeIndex);
          p.speed = vel.speed;

          // Advect particle position along current vector
          const cosLat = Math.cos((p.lat * Math.PI) / 180) || 1;
          const dLonDeg = (vel.u * dt * 0.08) / cosLat;
          const dLatDeg = vel.v * dt * 0.08;

          p.lon += dLonDeg;
          p.lat += dLatDeg;
          p.age += 1;

          // Check if particle left dataset bounds or drifted onto land
          if (
            p.age >= p.maxAge ||
            p.lat < bounds.latMin ||
            p.lat > bounds.latMax ||
            p.lon < bounds.lonMin ||
            p.lon > bounds.lonMax ||
            isLandPoint(p.lat, p.lon)
          ) {
            respawnParticle(p);
            continue;
          }

          // Add new point to history (keep max 6 points for a smooth stream tail)
          p.history.push({ lat: p.lat, lon: p.lon });
          if (p.history.length > 7) {
            p.history.shift();
          }

          // Render particle trail on 3D globe
          if (p.history.length >= 2) {
            const screenCoords: Array<{ x: number; y: number }> = [];
            let allVisible = true;

            for (const pt of p.history) {
              const sp = projectGeo(pt.lat, pt.lon);
              if (!sp) {
                allVisible = false;
                break;
              }
              screenCoords.push(sp);
            }

            if (allVisible && screenCoords.length >= 2) {
              const headColor = getCurrentColor(p.speed);
              ctx.strokeStyle = headColor;
              ctx.lineWidth = Math.min(2.0, Math.max(1.0, 1.3 * zoomScale));
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              ctx.beginPath();
              ctx.moveTo(screenCoords[0].x, screenCoords[0].y);
              for (let k = 1; k < screenCoords.length; k++) {
                ctx.lineTo(screenCoords[k].x, screenCoords[k].y);
              }
              ctx.stroke();

              // Glowing head dot
              const head = screenCoords[screenCoords.length - 1];
              ctx.beginPath();
              ctx.arc(head.x, head.y, 1.4 * zoomScale, 0, Math.PI * 2);
              ctx.fillStyle = '#F5C518';
              ctx.fill();
            }
          }
        }
      }

      ctx.restore();
    };

    // Bind synchronously to Cesium's preRender event
    const removeListener = viewer.scene.preRender.addEventListener(onPreRender);

    return () => {
      if (removeListener) {
        removeListener();
      }
      if (canvas) {
        const c = canvas.getContext('2d');
        if (c) c.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [isEnabled, style, depth, timeIndex, opacity, viewer, currentVectors, bounds]);

  if (!isEnabled) return null;

  return (
    <canvas
      id="ocean-currents-canvas"
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
};
