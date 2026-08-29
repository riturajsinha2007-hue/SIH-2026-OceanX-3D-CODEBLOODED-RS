export type OceanVariable = 'TEMP' | 'SAL' | 'CHLA';

export interface DataSelection {
  datasetId: string;
  variable: OceanVariable;
  date: string; // ISO / YYYY-MM-DD
  depth: number;
  boundingBox: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
  resolution: string;
  sourceUrl: string;
}

export type LayerIntegrityStatus =
  | 'VERIFIED'
  | 'CACHED'
  | 'INVALIDATING'
  | 'FETCHING'
  | 'UNAVAILABLE'
  | 'DATE_MISMATCH'
  | 'DEPTH_UNAVAILABLE'
  | 'VALIDATION_FAILED';

export type DepthLevel =
  | 5
  | 10
  | 20
  | 30
  | 50
  | 75
  | 100
  | 125
  | 150
  | 200
  | 250
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 1000
  | 1200
  | 1400
  | 1600
  | 1800
  | 2000
  | number;

export type ColormapType = 'incois_rainbow' | 'thermal' | 'halite';

export type BasemapType = 'satellite' | 'bathymetry';

export type ViewMode = '3d_globe' | '2d_map';

export type DiscrepancyThreshold = 0 | 0.5 | 1.0 | 2.0;

export interface ErddapGridSliceData {
  datasetId: string;
  variable: OceanVariable;
  unit: string;
  timeStr: string;
  depth: number;
  latMin: number;
  latMax: number;
  latStep: number;
  latCount: number;
  lonMin: number;
  lonMax: number;
  lonStep: number;
  lonCount: number;
  values: (number | null)[];
  stats?: {
    min: number;
    max: number;
    mean: number;
  };
  fetchedAt: number;
}

export interface DepthProfilePoint {
  depth: number;
  observedTemp: number;
  observedSal: number;
  observedChla?: number;
  modelTemp: number;
  modelSal: number;
  modelChla?: number;
  tempDelta: number; // observed - model
  salDelta: number;  // observed - model
  chlaDelta?: number;
}

export interface ArgoFloat {
  id: string;
  platformNumber: string; // e.g. "2902341"
  cycleNumber: number;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO date
  basin: 'Arabian Sea' | 'Bay of Bengal' | 'Equatorial Indian Ocean' | 'South Indian Ocean' | 'Somali Basin';
  profiles: DepthProfilePoint[];
  status: 'active' | 'calibrated';
  qcFlag: 1 | 2; // 1 = Good data, 2 = Probably good
  institution: string; // "INCOIS / MoES"
  sensorType: string; // "SBE 41CP CTD"
}

export interface TimeStep {
  index: number;
  dateStr: string;
  cycleId: string;
  seasonLabel: string;
}

export interface GridMetadata {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
  depths: DepthLevel[];
  sourceDataset: string;
  griddapEndpoint: string;
  tabledapEndpoint: string;
  chlorophyllGriddapEndpoint?: string;
  chlorophyllHtmlUrl?: string;
  lastUpdated: string;
}

export interface PointProbeData {
  latitude: number;
  longitude: number;
  isLand: boolean;
  basin: string;
  depth: DepthLevel;
  timeStepIndex: number;
  dateStr: string;
  currentValue: {
    temp: number;
    sal: number;
    chla: number;
  };
  profile: {
    depth: DepthLevel;
    temp: number;
    sal: number;
    chla: number;
  }[];
  nearestFloat?: {
    float: ArgoFloat;
    distanceKm: number;
  };
}

export type EdgeBlendMode = 'soft_feather' | 'crisp';

export interface VerticalProfileRecord {
  depth: number;
  observed: number | null;
  model: number | null;
  delta: number | null;
  isObservedValid: boolean;
  isModelValid: boolean;
  unit: string;
}

export interface SynchronizedObservationState {
  datasetId: string;
  variable: OceanVariable;
  dateStr: string;
  depth: number;
  floatId: string | null;
  platformNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: string | null;
  basin: string | null;
  sensorType: string | null;
  cycleNumber: number | null;
  observedValue: number | null;
  modelValue: number | null;
  anomaly: number | null;
  unit: string;
  verticalProfile: VerticalProfileRecord[];
  observationStatus: 'VERIFIED' | 'LOADING' | 'DATA_UNAVAILABLE' | 'DATE_MISMATCH';
  modelStatus: 'VERIFIED' | 'LOADING' | 'DATA_UNAVAILABLE';
  profileStatus: 'VERIFIED' | 'LOADING' | 'PARTIAL' | 'DATA_UNAVAILABLE';
  isSynchronized: boolean;
  lastUpdated: number;
  auditTrail: {
    datasetMatches: boolean;
    variableMatches: boolean;
    dateMatches: boolean;
    depthMatches: boolean;
    observedFinite: boolean;
    modelFinite: boolean;
    source: string;
  };
}

export interface VisualizationState {
  datasetId?: string; // incois_argo_mnt_VAM | incois_oceansat2_datasets
  variable: OceanVariable;
  depth: DepthLevel;
  timeStepIndex: number;
  colormap: ColormapType;
  opacity: number;
  minScaleAuto: boolean;
  maxScaleAuto: boolean;
  customMin: number;
  customMax: number;
  basemap: BasemapType;
  viewMode: ViewMode;
  showArgo: boolean;
  discrepancyThreshold: DiscrepancyThreshold;
  selectedFloatId: string | null;
  selectedProbePoint: PointProbeData | null;
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 2x, 5x
  edgeBlendMode: EdgeBlendMode;
  coastalFeathering: number; // Fixed at 0.90 (90%)
  boundaryFade: boolean;     // Outer domain boundary fading
  debugMode?: boolean;       // Live Single Source of Truth Synchronization Audit
}
