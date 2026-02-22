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
  onError?: HydraRuntimeErrorHandler;
  liveMode?: HydraLiveMode;
  extendTransforms?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface HydraStats {
  fps: number;
}

export interface HydraRuntimeErrorContext {
  context: "update" | "afterUpdate" | "tick" | string;
  time: number;
}

export type HydraRuntimeErrorHandler = (
  error: unknown,
  context: HydraRuntimeErrorContext,
) => void;
export type HydraLiveMode = "restart" | "continuous";

export type HydraModuleMethod = (...args: unknown[]) => unknown;
export type HydraNumericTuple = [number, number] | [number, number, number];

export interface HydraModuleApi {
  [key: string]: HydraModuleMethod;
}

export interface HydraTransformRenderOptions {
  cssRenderer?: "2d" | "3d" | "css2drenderer" | "css3drenderer" | false;
  renderTarget?: unknown;
  autoClear?: number | Record<string, unknown>;
  fx?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface HydraSceneAttributes {
  name?: string;
  key?: string;
  background?: number | string;
  [key: string]: unknown;
}

export interface HydraObjectOptions {
  name?: string;
  key?: string;
  type?: string;
  instanced?: number;
  lineColor?: number | string;
  lineWidth?: number;
  lineMat?: unknown;
  material?: Record<string, unknown>;
  [key: string]: unknown;
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
  out(output?: unknown, options?: HydraTransformRenderOptions): HydraTransformChain;
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
  add(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  mesh(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  quad(material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  points(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  lines(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  linestrip(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  lineloop(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  line(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  circle(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  ellipse(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  triangle(geometry?: unknown, material?: unknown, options?: HydraObjectOptions): HydraSceneApi;
  lights(options?: Record<string, unknown>): HydraSceneApi;
  world(options?: Record<string, unknown>): HydraSceneApi;
  group(attributes?: HydraSceneAttributes): HydraSceneApi;
  layer(id: number, options?: Record<string, unknown>): unknown;
  lookAt(target: unknown, options?: Record<string, unknown>): HydraSceneApi;
  out(output?: unknown, options?: HydraTransformRenderOptions): HydraSceneApi;
  at(index?: number): unknown;
  find(filter?: Record<string, unknown>): unknown[];
  empty(): boolean;
  [key: string]: unknown;
}

export interface HydraTextureApi extends HydraModuleApi {
  fbo(options?: Record<string, unknown>): unknown;
  data(data: ArrayLike<number> | number[], options?: Record<string, unknown>): unknown;
  load(url: string, onLoad?: (texture: unknown) => void, onError?: (error: unknown) => void): unknown;
}

export interface HydraGeometryApi extends HydraModuleApi {
  box(...args: number[]): unknown;
  sphere(...args: number[]): unknown;
  plane(...args: number[]): unknown;
  circle(...args: number[]): unknown;
  line(points: Array<unknown>): unknown;
  points(count: number): unknown;
  grid(...args: unknown[]): unknown;
  posFromEleAzi(elevation: number, azimuth: number, radius?: number): { x: number; y: number; z: number };
}

export interface HydraGuiApi extends HydraModuleApi {
  init(): Promise<void>;
  create(name?: string): Promise<unknown>;
  addFolder(
    name: string,
    settings: Record<string, unknown>,
    setupFn?: (folder: unknown, settings: Record<string, unknown>) => void,
    gui?: unknown,
  ): Promise<Record<string, unknown>>;
  lights(scene: HydraSceneApi, camera: unknown, defaults?: Record<string, unknown>): Record<string, unknown>;
  world(scene: HydraSceneApi, defaults?: Record<string, unknown>): Record<string, unknown>;
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
  onError?: HydraRuntimeErrorHandler;
  liveMode: HydraLiveMode;
  render: (output?: unknown) => void;
  setResolution: (width: number, height: number) => void;
  hush: () => void;
  resetRuntime: () => void;
  tick: (dt: number, uniforms?: unknown) => void;
  shadowMap: (options?: Record<string, unknown>) => void;
  scene: (attributes?: HydraSceneAttributes) => HydraSceneApi;
  ortho: (eye?: HydraNumericTuple, target?: HydraNumericTuple, options?: Record<string, unknown>) => unknown;
  perspective: (eye?: HydraNumericTuple, target?: HydraNumericTuple, options?: Record<string, unknown>) => unknown;
  screenCoords: (width?: number, height?: number) => unknown;
  normalizedCoords: () => unknown;
  cartesianCoords: (width?: number, height?: number) => unknown;
  setFunction: (definition: HydraTransformDefinition) => void;
  osc: HydraTransformFactory;
  noise: HydraTransformFactory;
  solid: HydraTransformFactory;
  src: HydraTransformFactory;
  tx: HydraTextureApi;
  gm: HydraGeometryApi;
  mt: HydraModuleApi;
  cmp: HydraModuleApi;
  rnd: HydraModuleApi;
  nse: HydraModuleApi;
  gui: HydraGuiApi;
  arr: HydraModuleApi;
  el: HydraModuleApi;
  math: Record<string, (value: number, ...args: number[]) => number>;
  [key: string]: unknown;
}

declare class HydraRenderer {
  constructor(options?: HydraOptions);
  readonly synth: HydraSynthApi;
  readonly liveMode: HydraLiveMode;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly o: unknown[];
  readonly s: unknown[];

  eval(code: string): void;
  getScreenImage(callback: (blob: Blob) => void): void;
  hush(): void;
  resetRuntime(): void;
  loadScript(url?: string, once?: boolean): Promise<void>;
  setResolution(width: number, height: number): void;
  tick(dt: number, uniforms?: unknown): void;
  shadowMap(options?: Record<string, unknown>): void;
  scene(attributes?: HydraSceneAttributes): HydraSceneApi;
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
