let pos, size, color, mat;

// smearing color
pos = solid(pnoise(0.4, 0.1).map(-1,1,-0.1,1.1), noise(0.6, 0.03).map(-1,1,-0.1,1.1));
size = noise(0.4).mult(20);
color = cnoise(100).saturate(()=>time%2.0);
mat = mt.dots(pos, size, color);
scene()
    .points([500, 500], mat)
    .autoClear(0.001)
    .out()

mat = mt.dots(solid(noise(1, 0.01).map(-1,1,-0.2,1.2).scrollX(0, 0.01), noise(2, 0.01).map(-1,1,-0.2,1.2)), noise(1).mult(3), solid(1,1,1));
scene()
    .points([800, 800], mat)
    .autoClear(0.05)
    .out()

// storm
solid(0)
    .layer(
        scene().points([20, 20], mt.dots(solid(noise(100).map(-1,1,0,1), tx.data(arr.random(50, 50, {max: 255}))), noise().mult(10), cnoise(1000, 0.1)
            .brightness()))
    )
    .st(scrollY(0, -0.1))
    .out();

// circle
mat = mt.dots(solid(sin().add(0.5), cos().add(0.5)), 3, cnoise(1000).rotate(0, 1).saturate(8));
scene().points([100,1], mat).out();

// japan flag
solid(1, 1, 1, 1).layer(scene().points([1], mt.dots(0.5, 500, solid(1)))).out()
