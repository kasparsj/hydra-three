o0.perspective([2,2,3]);

// different texture rotation on every face
box([], osc().rotate(snoise(0.1).mult(45)))
    .autoClear()
    .lights({cam: true, amb: true, sun: true, hemi: true})
    .phong()
    .out();

// update = () => {
//     box.rotation.x += 0.01;
//     box.rotation.y += 0.01;
// }
