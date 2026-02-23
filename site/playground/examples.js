export const playgroundExamples = [
  {
    id: "textured-box",
    label: "Textured Box",
    params: [
      {
        name: "frequency",
        label: "Frequency",
        min: 1,
        max: 24,
        step: 0.1,
        value: 8,
      },
      { name: "sync", label: "Sync", min: 0, max: 1, step: 0.01, value: 0.1 },
      {
        name: "offset",
        label: "Offset",
        min: 0,
        max: 2,
        step: 0.01,
        value: 0.8,
      },
      {
        name: "noiseScale",
        label: "Noise Scale",
        min: 0.1,
        max: 8,
        step: 0.1,
        value: 1,
      },
      {
        name: "spinX",
        label: "Spin X",
        min: 0,
        max: 0.05,
        step: 0.001,
        value: 0.01,
      },
      {
        name: "spinY",
        label: "Spin Y",
        min: 0,
        max: 0.05,
        step: 0.001,
        value: 0.01,
      },
    ],
    code: `
perspective([2, 2, 3], [0, 0, 0], { controls: true });

const mat = osc(params.frequency, params.sync, params.offset)
  .rotateDeg(noise(params.noiseScale).mult(45))
  .phong();

const sc = scene({ key: "textured-box-scene" })
  .lights({ all: true })
  .mesh(gm.box(), mat, { key: "textured-box-mesh" })
  .out();

update = () => {
  const box = sc.at(0);
  box.rotation.x += params.spinX;
  box.rotation.y += params.spinY;
};
`,
  },
  {
    id: "points-trail",
    label: "Points Trail",
    params: [
      { name: "grid", label: "Grid", min: 40, max: 420, step: 10, value: 220 },
      {
        name: "sizeMin",
        label: "Size Min",
        min: 1,
        max: 20,
        step: 0.5,
        value: 3,
      },
      {
        name: "sizeMax",
        label: "Size Max",
        min: 4,
        max: 40,
        step: 0.5,
        value: 14,
      },
      {
        name: "colorSat",
        label: "Saturation",
        min: 0.5,
        max: 12,
        step: 0.1,
        value: 6,
      },
      {
        name: "trail",
        label: "Trail",
        min: 0,
        max: 0.2,
        step: 0.001,
        value: 0.04,
      },
    ],
    code: `
ortho([0, 0, 1], [0, 0, 0]);

const position = solid(
  noise(1).map(-1, 1, -0.1, 1.1),
  noise(2).map(-1, 1, -0.1, 1.1),
);
const pointSize = noise(0.6).map(-1, 1, params.sizeMin, params.sizeMax);
const pointColor = cnoise(1000).saturate(params.colorSat);

scene({ key: "points-trail-scene" })
  .points([params.grid, params.grid], mt.dots(position, pointSize, pointColor), {
    key: "points-trail-points",
  })
  .autoClear(params.trail)
  .out();
`,
  },
  {
    id: "terrain-displacement",
    label: "Terrain Displacement",
    params: [
      {
        name: "detail",
        label: "Detail",
        min: 40,
        max: 320,
        step: 10,
        value: 180,
      },
      {
        name: "displacement",
        label: "Displacement",
        min: 0,
        max: 3,
        step: 0.05,
        value: 1.1,
      },
      {
        name: "noiseScale",
        label: "Noise Scale",
        min: 0.1,
        max: 2,
        step: 0.01,
        value: 0.8,
      },
      {
        name: "wireframe",
        label: "Wireframe",
        min: 0,
        max: 1,
        step: 1,
        value: 0,
      },
    ],
    code: `
shadowMap();
ortho([0, 4, 3], [0, 0, 0], { controls: true });

const heightMap = fbm(params.noiseScale, [0.2, 0.5, 0.1]).tex(o2, {
  width: 1024,
  height: 1024,
});

scene({ key: "terrain-displacement-scene" })
  .lights({ all: true, sun: true, amb: true })
  .world({ ground: false, fog: true })
  .mesh(
    gm.plane(2.4, 2.4, params.detail, params.detail).rotateX(-Math.PI / 2),
    mt.meshPhong({
      displacementMap: heightMap,
      displacementScale: params.displacement,
      wireframe: !!params.wireframe,
    }),
    { key: "terrain-displacement-mesh" },
  )
  .out();
`,
  },
  {
    id: "scene-texture-bridge",
    label: "Scene Texture Bridge",
    params: [
      {
        name: "grid",
        label: "Grid",
        min: 20,
        max: 260,
        step: 10,
        value: 140,
      },
      {
        name: "tileSize",
        label: "Tile Size",
        min: 1,
        max: 18,
        step: 0.5,
        value: 4,
      },
      {
        name: "sat",
        label: "Saturation",
        min: 0.2,
        max: 12,
        step: 0.1,
        value: 6,
      },
      {
        name: "radius",
        label: "Sphere Radius",
        min: 0.2,
        max: 1.5,
        step: 0.01,
        value: 0.8,
      },
    ],
    code: `
perspective([2, 2, 3], [0, 0, 0], { controls: true });

const mapTex = scene()
  .points(
    [Math.floor(params.grid), Math.floor(params.grid)],
    mt.squares(gradient(), params.tileSize, cnoise(100).saturate(params.sat)),
  )
  .tex(o1);

scene()
  .lights({ all: true })
  .mesh(gm.sphere(params.radius, 64, 32), src(mapTex).phong())
  .out(o0);
`,
  },
  {
    id: "line-loop-thread",
    label: "Line Loop Thread",
    params: [
      {
        name: "segments",
        label: "Segments",
        min: 32,
        max: 600,
        step: 8,
        value: 180,
      },
      {
        name: "xScale",
        label: "X Noise",
        min: 0.2,
        max: 5,
        step: 0.1,
        value: 1,
      },
      {
        name: "yScale",
        label: "Y Noise",
        min: 0.2,
        max: 5,
        step: 0.1,
        value: 2,
      },
      {
        name: "zScale",
        label: "Z Noise",
        min: 0.2,
        max: 5,
        step: 0.1,
        value: 3,
      },
      { name: "r", label: "Red", min: 0, max: 1, step: 0.01, value: 1 },
      { name: "g", label: "Green", min: 0, max: 1, step: 0.01, value: 0.4 },
      { name: "b", label: "Blue", min: 0, max: 1, step: 0.01, value: 0.8 },
      {
        name: "trail",
        label: "Trail",
        min: 0,
        max: 0.2,
        step: 0.001,
        value: 0.03,
      },
    ],
    code: `
const pos = solid(noise(params.xScale).x, noise(params.yScale).y, noise(params.zScale).z)
  .map(-1, 1, 0, 1);

scene()
  .lineloop([Math.floor(params.segments)], mt.lineloop(pos, solid(params.r, params.g, params.b, 1)))
  .autoClear(params.trail)
  .out();
`,
  },
  {
    id: "feedback-kaleid",
    label: "Feedback Kaleid",
    params: [
      {
        name: "freq",
        label: "Frequency",
        min: 1,
        max: 40,
        step: 0.1,
        value: 10,
      },
      { name: "sync", label: "Sync", min: 0, max: 1, step: 0.01, value: 0.08 },
      {
        name: "offset",
        label: "Offset",
        min: 0,
        max: 2,
        step: 0.01,
        value: 0.4,
      },
      { name: "sides", label: "Sides", min: 2, max: 20, step: 1, value: 8 },
      {
        name: "noiseScale",
        label: "Noise",
        min: 0.1,
        max: 8,
        step: 0.1,
        value: 1.4,
      },
      {
        name: "amount",
        label: "Mod Amt",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.08,
      },
      {
        name: "feedbackScale",
        label: "Feedback Scale",
        min: 0.8,
        max: 1.3,
        step: 0.001,
        value: 1.01,
      },
    ],
    code: `
osc(params.freq, params.sync, params.offset)
  .kaleid(params.sides)
  .modulate(noise(params.noiseScale), params.amount)
  .layer(src(o0).scale(params.feedbackScale))
  .out();
`,
  },
  {
    id: "orbit-cluster",
    label: "Orbit Cluster",
    params: [
      { name: "count", label: "Count", min: 3, max: 42, step: 1, value: 16 },
      {
        name: "radius",
        label: "Sphere Radius",
        min: 0.03,
        max: 0.3,
        step: 0.01,
        value: 0.08,
      },
      {
        name: "orbitRadius",
        label: "Orbit Radius",
        min: 0.3,
        max: 4,
        step: 0.05,
        value: 1.2,
      },
      {
        name: "spin",
        label: "Spin",
        min: 0,
        max: 0.04,
        step: 0.001,
        value: 0.01,
      },
      {
        name: "wobble",
        label: "Wobble",
        min: 0,
        max: 4,
        step: 0.05,
        value: 0.7,
      },
    ],
    code: `
perspective([2.5, 2, 3], [0, 0, 0], { controls: true });

const sc = scene({ key: "orbit-cluster-scene" }).lights({ all: true }).out();
const group = sc.group({ name: "orbit-group", key: "orbit-group" });
const count = Math.max(1, Math.floor(params.count));

for (let i = 0; i < count; i++) {
  group.mesh(gm.sphere(params.radius, 32, 16), mt.meshPhong({ color: rnd.color() }), {
    key: "orbit-sphere-" + i,
  });
}

cmp.circle(group, params.orbitRadius);

update = () => {
  group.rotation.y += params.spin;
  group.rotation.x = Math.sin(time * params.wobble) * 0.25;
};
`,
  },
  {
    id: "instanced-columns",
    label: "Instanced Columns",
    params: [
      {
        name: "count",
        label: "Count",
        min: 100,
        max: 12000,
        step: 100,
        value: 1600,
      },
      {
        name: "heightMin",
        label: "Height Min",
        min: 0.2,
        max: 4,
        step: 0.05,
        value: 0.3,
      },
      {
        name: "heightMax",
        label: "Height Max",
        min: 1,
        max: 12,
        step: 0.1,
        value: 4.5,
      },
      {
        name: "noiseScale",
        label: "Noise Scale",
        min: 0.05,
        max: 2,
        step: 0.01,
        value: 0.25,
      },
      {
        name: "freq",
        label: "Texture Freq",
        min: 1,
        max: 20,
        step: 0.1,
        value: 8,
      },
      {
        name: "width",
        label: "Width",
        min: 0.01,
        max: 0.3,
        step: 0.01,
        value: 0.05,
      },
      {
        name: "depth",
        label: "Depth",
        min: 0.01,
        max: 0.3,
        step: 0.01,
        value: 0.05,
      },
    ],
    code: `
shadowMap();
ortho([3, 3, 3], [0, 0, 0], { controls: true });

const count = Math.max(1, Math.floor(params.count));
const geom = gm.box(params.width, 1, params.depth);
const mat = osc(params.freq, 0.08, 0.5).phong();
const sc = scene({ background: color(0.98, 0.96, 0.9) }).lights({ all: true }).out();
sc.mesh(geom, mat, { instanced: count });
const mesh = sc.at(0);

const grid = Math.ceil(Math.sqrt(count));
const spacing = Math.max(params.width, params.depth) * 1.4;
const matrix = mat4();
const rotation = quat();

for (let i = 0; i < count; i++) {
  const x = i % grid;
  const z = Math.floor(i / grid);
  const height = nse.get2(x, z, params.heightMin, params.heightMax, params.noiseScale, nse.YELLOW);
  const pos = vec3((x - grid / 2) * spacing, height / 2, (z - grid / 2) * spacing);
  const scl = vec3(1, height, 1);
  matrix.compose(pos, rotation, scl);
  mesh.setMatrixAt(i, matrix);
}

mesh.instanceMatrix.needsUpdate = true;
`,
  },
  {
    id: "noise-lines",
    label: "Noise Lines",
    params: [
      {
        name: "count",
        label: "Lines",
        min: 20,
        max: 1200,
        step: 10,
        value: 360,
      },
      {
        name: "scaleX",
        label: "X Scale",
        min: 0.1,
        max: 4,
        step: 0.05,
        value: 1.2,
      },
      {
        name: "scaleY",
        label: "Y Scale",
        min: 0.1,
        max: 4,
        step: 0.05,
        value: 0.8,
      },
      {
        name: "colorScale",
        label: "Color Scale",
        min: 1,
        max: 2000,
        step: 10,
        value: 400,
      },
      {
        name: "saturation",
        label: "Saturation",
        min: 0.2,
        max: 12,
        step: 0.1,
        value: 5,
      },
      {
        name: "trail",
        label: "Trail",
        min: 0,
        max: 0.2,
        step: 0.001,
        value: 0.02,
      },
    ],
    code: `
ortho([0, 0, 1], [0, 0, 0]);

const pos = solid(
  noise(params.scaleX, 0.02).map(-1, 1, 0, 1),
  noise(params.scaleY, 0.03).map(-1, 1, 0, 1),
);
const col = cnoise(params.colorScale).saturate(params.saturation);

scene()
  .lines([0, Math.floor(params.count)], mt.lines(pos, col))
  .autoClear(params.trail)
  .out();
`,
  },
  {
    id: "kaleid-plane",
    label: "Kaleid Plane",
    params: [
      {
        name: "freq",
        label: "Frequency",
        min: 1,
        max: 30,
        step: 0.1,
        value: 7,
      },
      { name: "sync", label: "Sync", min: 0, max: 1, step: 0.01, value: 0.06 },
      {
        name: "sides",
        label: "Sides",
        min: 2,
        max: 24,
        step: 1,
        value: 7,
      },
      {
        name: "modNoise",
        label: "Mod Noise",
        min: 0.1,
        max: 10,
        step: 0.1,
        value: 2.2,
      },
      {
        name: "modAmt",
        label: "Mod Amount",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.1,
      },
      { name: "seg", label: "Segments", min: 1, max: 40, step: 1, value: 12 },
    ],
    code: `
ortho([0, 0, 1], [0, 0, 0], { controls: true });

scene()
  .lights({ all: true })
  .mesh(
    gm.plane(2.2, 2.2, params.seg, params.seg),
    osc(params.freq, params.sync, 0.3)
      .kaleid(params.sides)
      .modulate(noise(params.modNoise), params.modAmt)
      .phong(),
  )
  .out();
`,
  },
  {
    id: "world-fog-lattice",
    label: "World Fog Lattice",
    params: [
      { name: "grid", label: "Grid", min: 2, max: 16, step: 1, value: 8 },
      {
        name: "boxSize",
        label: "Box Size",
        min: 0.05,
        max: 0.6,
        step: 0.01,
        value: 0.2,
      },
      {
        name: "spacing",
        label: "Spacing",
        min: 0.08,
        max: 1.2,
        step: 0.01,
        value: 0.3,
      },
      {
        name: "spin",
        label: "Spin",
        min: 0,
        max: 0.04,
        step: 0.001,
        value: 0.01,
      },
      {
        name: "far",
        label: "Fog Far",
        min: 5,
        max: 80,
        step: 1,
        value: 24,
      },
      {
        name: "light",
        label: "Light Intensity",
        min: 0.2,
        max: 5,
        step: 0.1,
        value: 1.6,
      },
    ],
    code: `
shadowMap();
ortho([3, 3, 3], [0, 0, 0], { controls: true });

const sc = scene({ background: color(0.95, 0.97, 1) })
  .lights({ all: true, intensity: params.light })
  .world({ ground: true, fog: true, far: params.far })
  .out();

const group = sc.group({ name: "lattice" });
const grid = Math.max(1, Math.floor(params.grid));

for (let i = 0; i < grid; i++) {
  for (let j = 0; j < grid; j++) {
    group.mesh(
      gm.box(params.boxSize, params.boxSize, params.boxSize),
      mt.meshPhong({ color: color(i / grid, j / grid, 1 - i / grid) }),
      {
        position: vec3(
          (i - grid / 2) * params.spacing,
          params.boxSize / 2,
          (j - grid / 2) * params.spacing,
        ),
      },
    );
  }
}

update = () => {
  group.rotation.y += params.spin;
};
`,
  },
  {
    id: "dots-storm",
    label: "Dots Storm",
    params: [
      { name: "grid", label: "Grid", min: 20, max: 700, step: 10, value: 240 },
      {
        name: "freq",
        label: "Position Freq",
        min: 0.1,
        max: 8,
        step: 0.1,
        value: 1.2,
      },
      {
        name: "sizeFreq",
        label: "Size Freq",
        min: 0.1,
        max: 8,
        step: 0.1,
        value: 0.8,
      },
      {
        name: "dotSize",
        label: "Dot Size",
        min: 2,
        max: 40,
        step: 0.5,
        value: 12,
      },
      {
        name: "colorScale",
        label: "Color Scale",
        min: 1,
        max: 2000,
        step: 10,
        value: 800,
      },
      {
        name: "brightness",
        label: "Brightness",
        min: -1,
        max: 1,
        step: 0.01,
        value: 0.15,
      },
      {
        name: "trail",
        label: "Trail",
        min: 0,
        max: 0.2,
        step: 0.001,
        value: 0.03,
      },
    ],
    code: `
const position = solid(
  noise(params.freq).map(-1, 1, 0, 1),
  noise(params.freq * 1.4).map(-1, 1, 0, 1),
);
const size = noise(params.sizeFreq).map(-1, 1, 1, params.dotSize);
const colorMap = cnoise(params.colorScale).brightness(params.brightness);

solid(0)
  .layer(
    scene()
      .points([params.grid, params.grid], mt.dots(position, size, colorMap))
      .autoClear(params.trail),
  )
  .out();
`,
  },
  {
    id: "torus-pulse",
    label: "Torus Pulse",
    params: [
      {
        name: "freq",
        label: "Texture Freq",
        min: 1,
        max: 30,
        step: 0.1,
        value: 6,
      },
      {
        name: "ringRadius",
        label: "Ring Radius",
        min: 0.2,
        max: 1.6,
        step: 0.01,
        value: 0.8,
      },
      {
        name: "tubeRadius",
        label: "Tube Radius",
        min: 0.04,
        max: 0.6,
        step: 0.01,
        value: 0.22,
      },
      {
        name: "pulse",
        label: "Pulse",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.25,
      },
      {
        name: "spin",
        label: "Spin",
        min: 0,
        max: 0.06,
        step: 0.001,
        value: 0.02,
      },
    ],
    code: `
perspective([2.6, 1.6, 2.8], [0, 0, 0], { controls: true });

const sc = scene()
  .lights({ all: true })
  .mesh(
    gm.torus(params.ringRadius, params.tubeRadius, 32, 120),
    osc(params.freq, 0.1, 0.5).phong(),
  )
  .out();

update = () => {
  const torus = sc.at(0);
  const scale = 1 + Math.sin(time * 2) * params.pulse;
  torus.scale.set(scale, scale, scale);
  torus.rotation.x += params.spin * 0.6;
  torus.rotation.y += params.spin;
};
`,
  },
  {
    id: "repeat-plane",
    label: "Repeat Plane",
    params: [
      {
        name: "texSize",
        label: "Texture Size",
        min: 16,
        max: 256,
        step: 16,
        value: 64,
      },
      {
        name: "repeatX",
        label: "Repeat X",
        min: 1,
        max: 12,
        step: 1,
        value: 6,
      },
      {
        name: "repeatY",
        label: "Repeat Y",
        min: 1,
        max: 12,
        step: 1,
        value: 4,
      },
      {
        name: "freq",
        label: "Overlay Freq",
        min: 1,
        max: 24,
        step: 0.1,
        value: 7,
      },
      {
        name: "mixAmt",
        label: "Overlay Mix",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.55,
      },
    ],
    code: `
ortho([0, 0, 1], [0, 0, 0], { controls: true });

const size = Math.max(1, Math.floor(params.texSize));
const pixels = arr.random(size, size, { type: "uint8" });
const tex = tx.data(pixels, {
  width: size,
  height: size,
  min: "nearest",
  mag: "nearest",
});
const tiled = tx.repeat(tex, Math.floor(params.repeatX), Math.floor(params.repeatY));

scene()
  .mesh(
    gm.plane(2.2, 2.2),
    src(tiled)
      .blend(osc(params.freq, 0.08, 0.2), params.mixAmt)
      .basic(),
  )
  .out();
`,
  },
];
