await loadScript("/hy/index.js");

shadowMap();
o0.perspective([3,5,3], 0, {controls: true})

const sc = scene()
    .world()
    .lights();

// todo: shadows not working
const group = sc.group();
group.mesh(gm.box(), mt.meshPhong());

cm.stack(sc.at(0))

sc
    .out();