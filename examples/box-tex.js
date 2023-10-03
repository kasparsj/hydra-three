await loadScript("/hy/index.js")

o0.ortho([1, 0.5, 1], 0, {controls: true});

let sc;

sc = scene().mesh(gm.box(1,1,1), osc().phong()).lights();

sc = scene().mesh(
    gm.box(0.5, 0.5, 0.5),
    osc(10, 0.09, 300)
        .color(0.9, 0.7, 0.8)
        .diff(
            osc(45, 0.03, 100)
                .color(0.9, 0.9, 0.9)
                .rotate(0.18)
                .pixelate(12)
                .kaleid()
        )
        .scrollX(10)
        .colorama()
        //     .luma()
        .repeatX(4)
        .repeatY(4)
        .modulate(
            osc(1, -0.9, 300)
        )
        .scale(10)
        .phong()
).lights();

const map = solid(1).add(scene().points([100,100], mt.dots(cnoise(rand()), wnoise(rand()).map(0,1,5,20), cnoise().saturate()))).tex(o1);
// const map = solid(1, 1, 1).sub(dots([100,100], cnoise(rand()), wnoise(rand()).map(0,1,4,20), cnoise()).saturate()).tex(o1);
// const map = wnoise().add(dots([1024], cnoise(rand()), wnoise(rand()).map(0,1,0,20), cnoise()).saturate(5)).tex(o1);
// const map = snoise(20, [rand()*10000]).tex(o1);
// const map = wnoise().tex(o1);
// const map = cnoise().tex(o1);

sc = scene().mesh(
    gm.box(1, 1, 1),
    src(map).phong(),
//   solid(1).phong({map: map})
).lights();

// todo: wrong multiply order
solid(1,1,0).mult(noise()).layer(sc).out();

update = () => {
    const box = sc.scene.at(0);
    // box.rotation.x += 0.001;
    box.rotation.y += 0.001;
}
