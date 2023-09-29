o0.perspective([2,2,3], [0,0,0], {controls: true});

const sc = scene().lights()
    .mesh(gm.box(), osc().rotate(snoise(1).mult(45)).phong())
    .autoClear()
    .out();

update = () => {
    const box = sc.scene.at(0);
//     box.rotation.x += 0.01;
    box.rotation.y += 0.01;
}
