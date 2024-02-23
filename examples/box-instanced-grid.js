// enable shadow map
shadowMap();

// configure orthographic camera
ortho([3, 3, 3], 0, {controls: true});

const w = 0.02; // width
const h = 0.02; // height
const d = 0.02; //  depth
const count = 50000; // how many instances
const drawLines = false; // toggle between lines and solid boxes

// create box geometry and material
let geom = gm.box(w, h, d);

let mat;
if (drawLines) {
    // convert box to edges
    geom = gm.edges(geom);
    // black line basic material
    mat = mt.lineBasic({ color: color(0, 0, 0) });
}
else {
    // grey solid color material with lambert shading cached as a texture
    mat = solid(0.5,0.5,0.5).lambert().texMat(o1);
}

// create scene with yellow background and default lighting setup
const sc = scene({background: color(1,1,0)})
    .lights()
    .out();

// add and return instanced box mesh to scene
const box = sc._mesh(
    geom,
    mat,
    {instanced: count}
);

if (drawLines) {
    // fix box if drawing lines
    box.isMesh = false;
    box.isLine = true;
    box.isLineSegments = true;
}

const calcHeight = (x, z) => {
    // get simplex noise between -2 and 5, using zoom 1
    const simplexNoise = nse.get2(x, z, -2, 5, 1);
    // get yellow fbm noise between 0 and 20, using zoom 0.5
    const yellowNoise = nse.get2(x, z, 0, 20, 0.5, nse.YELLOW);
    // this makes the high rises come from lower regions
    return simplexNoise < 0 ? yellowNoise : simplexNoise;
}

// set matrix for each instance
const matrix = mat4(); // THREE.Matrix4
for ( let i = 0; i < count; i++ ) {
    const position = vec3(); // THREE.Vector3
    const quaternion = quat(); // THREE.Quaternion
    const scale = vec3(1.0, 1.0, 1.0); // THREE.Vector3

    const sqr = Math.sqrt(count);
    const [x, z] = [(i % sqr), Math.floor(i / sqr)];
    const y = calcHeight(x, z);

    position.x = x * w - sqr * w / 2;
    position.z = z * d - sqr * d / 2;
    position.y = y * h / 2;
    scale.y = y;

    // compose THREE.Matrix4 from position, quaternion and scale
    matrix.compose( position, quaternion, scale );

    // set matrix for each instance
    box.setMatrixAt( i, matrix );
}
