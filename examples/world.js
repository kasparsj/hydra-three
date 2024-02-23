shadowMap();
ortho([3,5,3], 0, {controls: true})

const sc = scene()
    .lights({gui: true, all: true})
    .world({gui: true, fog: true});

const group = sc.group();
group.mesh(gm.box(), mt.meshPhong());

cmp.stack(sc.at(0))

sc
    .out();
