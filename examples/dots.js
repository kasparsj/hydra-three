await loadScript("/dt/index.js");

// noise
scene().points([50,50], mt.dots(solid(noise(0.4, 0.03).map(-1,1,-0.1,1.1), noise(0.6, 0.03).map(-1,1,-0.1,1.1)), noise(0.4).map(-1,1,1,10), cnoise(1000)))
    .autoClear(0.05)
    .out()

// smearing color
scene().points([500, 500], mt.dots(solid(pnoise(0.4, 0.1).map(-1,1,-0.1,1.1), noise(0.6, 0.03).map(-1,1,-0.1,1.1)), noise(0.4).mult(20), cnoise(100).saturate(()=>time%2.0)))
    .autoClear(0.001)
    .out()

scene().points([800, 800], mt.dots(solid(noise(1, 0.01).map(-1,1,-0.2,1.2).scrollX(0, 0.01), noise(2, 0.01).map(-1,1,-0.2,1.2)), noise(1).mult(3), solid(1,1,1)))
    .autoClear(0.05)
    .out()

// storm
solid(0)
    .layer(
        scene().points([20, 20], mt.dots(solid(noise(100).map(-1,1,0,1), tx.data(arr.random(50, 50, {max: 255}))), noise().mult(10), cnoise(1000, 0.1)
            .brightness()))
            .autoClear()
    )
    .st(scrollY(0, -0.1))
    .out();

// circle
scene().points([100,1], mt.dots(solid(sin().add(0.5), cos().add(0.5)), 3, cnoise(1000).rotate(0, 1).saturate(8))).out();

// japan flag
solid(1, 1, 1, 1).layer(scene().points([1], mt.dots(0.5, 500, solid(1)))).out()

// grid
scene().points([10,10], mt.dots(gradient(), 10)).out()

// noise flow
solid(0,1,0).layer(
    scene().points([300,300], mt.dots(gradient().add(noise().mult(0.1)), wnoise().map(0,1,5,10), solid(0, 0, 0, 0.9)))
).out();