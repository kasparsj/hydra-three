export interface HydraOptions {
  pb?: unknown;
  width?: number;
  height?: number;
  numSources?: number;
  numOutputs?: number;
  makeGlobal?: boolean;
  autoLoop?: boolean;
  detectAudio?: boolean;
  enableStreamCapture?: boolean;
  webgl?: 1 | 2;
  canvas?: HTMLCanvasElement;
  css2DElement?: HTMLElement;
  css3DElement?: HTMLElement;
  precision?: "lowp" | "mediump" | "highp";
  extendTransforms?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface HydraStats {
  fps: number;
}

export interface HydraModuleApi {
  [key: string]: (...args: any[]) => any;
}

export interface HydraSynthApi {
  time: number;
  bpm: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  fps?: number;
  stats: HydraStats;
  speed: number;
  mouse: unknown;
  update: (dt: number) => void;
  afterUpdate: (dt: number) => void;
  click: (event: Event) => void;
  mousedown: (event: Event) => void;
  mouseup: (event: Event) => void;
  mousemove: (event: Event) => void;
  keydown: (event: KeyboardEvent) => void;
  keyup: (event: KeyboardEvent) => void;
  render: (output?: unknown) => void;
  setResolution: (width: number, height: number) => void;
  hush: () => void;
  tick: (dt: number, uniforms?: unknown) => void;
  shadowMap: (options?: Record<string, unknown>) => void;
  scene: (attributes?: Record<string, unknown>) => any;
  ortho: (...args: any[]) => any;
  perspective: (...args: any[]) => any;
  screenCoords: (width?: number, height?: number) => any;
  normalizedCoords: () => any;
  cartesianCoords: (width?: number, height?: number) => any;
  setFunction: (definition: Record<string, unknown>) => void;
  tx: HydraModuleApi;
  gm: HydraModuleApi;
  mt: HydraModuleApi;
  cmp: HydraModuleApi;
  rnd: HydraModuleApi;
  nse: HydraModuleApi;
  gui: HydraModuleApi;
  arr: HydraModuleApi;
  el: HydraModuleApi;
  [key: string]: any;
}

declare class HydraRenderer {
  constructor(options?: HydraOptions);
  readonly synth: HydraSynthApi;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly o: unknown[];
  readonly s: unknown[];

  eval(code: string): void;
  getScreenImage(callback: (blob: Blob) => void): void;
  hush(): void;
  loadScript(url?: string, once?: boolean): Promise<void>;
  setResolution(width: number, height: number): void;
  tick(dt: number, uniforms?: unknown): void;
  shadowMap(options?: Record<string, unknown>): void;
  scene(attributes?: Record<string, unknown>): any;
  dispose(): void;
}

export default HydraRenderer;

declare global {
  interface Window {
    Hydra?: typeof HydraRenderer;
    hydraSynth?: HydraRenderer;
    loadScript?: (url?: string, once?: boolean) => Promise<void>;
  }
}
