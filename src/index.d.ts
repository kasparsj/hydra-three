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

export type HydraModuleMethod = (...args: unknown[]) => unknown;

export interface HydraModuleApi {
  [key: string]: HydraModuleMethod;
}

export interface HydraTransformDefinition {
  name: string;
  type: string;
  inputs?: Array<{
    name: string;
    type: string;
    default?: unknown;
  }>;
  glsl?: string;
  glsl300?: string;
  vert?: string;
  primitive?: string;
  returnType?: string;
  [key: string]: unknown;
}

export interface HydraTransformChain {
  out(output?: unknown, options?: Record<string, unknown>): HydraTransformChain;
  basic(options?: Record<string, unknown>): HydraTransformChain;
  phong(options?: Record<string, unknown>): HydraTransformChain;
  lambert(options?: Record<string, unknown>): HydraTransformChain;
  material(options?: Record<string, unknown>): HydraTransformChain;
  st(source: HydraTransformChain): HydraTransformChain;
  tex(output?: unknown, options?: Record<string, unknown>): unknown;
  texMat(output?: unknown, options?: Record<string, unknown>): unknown;
  [method: string]: unknown;
}

export type HydraTransformFactory = (...args: unknown[]) => HydraTransformChain;

export interface HydraSceneApi {
  add(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  mesh(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  quad(material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  points(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  lines(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  linestrip(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  lineloop(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  line(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  circle(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  ellipse(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  triangle(geometry?: unknown, material?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  lights(options?: Record<string, unknown>): HydraSceneApi;
  world(options?: Record<string, unknown>): HydraSceneApi;
  group(attributes?: Record<string, unknown>): HydraSceneApi;
  layer(id: number, options?: Record<string, unknown>): unknown;
  lookAt(target: unknown, options?: Record<string, unknown>): HydraSceneApi;
  out(output?: unknown, options?: Record<string, unknown>): HydraSceneApi;
  at(index?: number): unknown;
  find(filter?: Record<string, unknown>): unknown[];
  empty(): boolean;
  [key: string]: unknown;
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
  scene: (attributes?: Record<string, unknown>) => HydraSceneApi;
  ortho: (...args: unknown[]) => unknown;
  perspective: (...args: unknown[]) => unknown;
  screenCoords: (width?: number, height?: number) => unknown;
  normalizedCoords: () => unknown;
  cartesianCoords: (width?: number, height?: number) => unknown;
  setFunction: (definition: HydraTransformDefinition) => void;
  osc: HydraTransformFactory;
  noise: HydraTransformFactory;
  solid: HydraTransformFactory;
  src: HydraTransformFactory;
  tx: HydraModuleApi;
  gm: HydraModuleApi;
  mt: HydraModuleApi;
  cmp: HydraModuleApi;
  rnd: HydraModuleApi;
  nse: HydraModuleApi;
  gui: HydraModuleApi;
  arr: HydraModuleApi;
  el: HydraModuleApi;
  [key: string]: unknown;
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
  scene(attributes?: Record<string, unknown>): HydraSceneApi;
  dispose(): void;
}

export default HydraRenderer;

declare global {
  interface Window {
    Hydra?: typeof HydraRenderer;
    hydraSynth?: HydraRenderer;
    loadScript?: (url?: string, once?: boolean) => Promise<void>;
    getCode?: () => void;
  }
}
