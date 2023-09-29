await loadScript("/dt/index.js");
await loadScript("/hy/index.js");

o0.ortho([1, 0.5, 1], 0, {controls: true});

nse.init();

const w = 0.02;
const h = 0.02;
const d = 0.02;
const count = 10000;

const sc = scene({background: color(1,1,0)})
    .mesh(
//         gm.edges(gm.box(w, h, d)),
// 	    mt.lineBasic({ color: color(0, 0, 0), side: THREE.DoubleSide }),
        gm.box(w, h, d),
        solid(0.5,0.5,0.5).lambert(),
        {instanced: count}
    )
    .lights()
    .autoClear().out();

let matrixSet = false;
update = () => {
    const box = sc.scene.at(0);
    if (box && !matrixSet) {
        matrixSet = true;
        const matrix = mat4();
        for ( let i = 0; i < count; i++ ) {
            const position = vec3();
            const quaternion = quat();
            const scale = vec3(1.0, 1.0, 1.0);

            const [x, z] = grid2( i, sqrt(count) );
            const t = nse.get2("improved", x, z, -2, 5, 1);
            const y = t < 0 ? nse.get2("yellow", x, z, 0, 20, 0.5) : t;
            scale.y = y;

            position.x = x * w - sqrt(count) * w / 2;
            position.z = z * d - sqrt(count) * d / 2;
            position.y = y * h / 2;

            matrix.compose( position, quaternion, scale );
            box.setMatrixAt( i, matrix );
        }
    }
}
