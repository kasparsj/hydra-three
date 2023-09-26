o0.perspective([2,2,3]);

// different texture rotation on every face
box([], osc().rotate(snoise(0.1).mult(45)))
    .autoClear()
    .lights()
    .phong()
    .out();

update = () => {
    o0.obj[0].rotation.x += 0.01;
    o0.obj[0].rotation.y += 0.01;
}
