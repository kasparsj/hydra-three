o0.perspective([2,2,3], [0,0,0], {controls: true});

// different texture rotation on every face
box([], osc().rotate(snoise(0.1).mult(45)))
    .autoClear()
    .lights()
    .phong()
    .out();

update = () => {
    const box = o0.obj[0];
//     box.rotation.x += 0.01;
//     box.rotation.y += 0.01;
}
