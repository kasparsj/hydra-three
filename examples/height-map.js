shadowMap();
ortho([0,5,3], 0, {controls: true})

const tex = scene({background: color(1,1,1)})
    .points([500, 500], mt.dots(solid(snoise(10), snoise(20)).map(-1,1,0,1), 2, [0,0,1]))
    .tex(o1);

// const tex = solid(1, 1, 1).layer(lines(0.003, 0.001, solid(0,0,1))).tex(o1, {mag: 'linear', min: 'mipmap', width: 4096, height: 4096});

const hMap = fbm(0.7, [0.5,-2]).tex(o2);

const sc = scene()
    .lights({all: true, gui: false})
    .world()
    .mesh(
        gm.plane(2,2,250,250).rotateX(-Math.PI/2),
        mt.meshPhong({map: tex, displacementMap: hMap, displacementScale: 2}),
    ).out();

update = () => {
//     sc.at(0).rotation.z += 0.001;
}

// todo: why cannot increase plane resolution?
// todo: shadows
// todo: generate fbm in a more controlled way
// todo: background
