await loadScript("/hy/index.js");
await loadScript("/dt/index.js");
await loadScript("/extra-shaders-for-hydra/lib-noise.js");

// noise
dots(['points', 50,50], solid(noise(0.4, 0.03).map(-1,1,-0.1,1.1), noise(0.6, 0.03).map(-1,1,-0.1,1.1)), noise(0.4).mult(10), colornoise(1000))
    .fade(0.05)
    .out()

// smearing color
dots(['points', 500, 500], solid(pnoise(0.4, 0.1).map(-1,1,-0.1,1.1), noise(0.6, 0.03).map(-1,1,-0.1,1.1)), noise(0.4).mult(20), colornoise(100).saturate(()=>time%2.0))
    .fade(0.001)
    .out()

dots(['points', 800, 800], solid(noise(1, 0.01).map(-1,1,-0.2,1.2).scrollX(0, 0.01), noise(2, 0.01).map(-1,1,-0.2,1.2)), noise(1).mult(3), solid(1,1,1))
    .fade(0.05)
    .out()

// storm
solid(0)
    .layer(
        dots(['points', 20, 20], solid(noise(100).map(-1,1,0,1), tex(arr.random(50, 50, {max: 255}))), noise().mult(10), colornoise(1000, 0.1)
            .brightness())
            .clear()
    )
    .scrollY(0, 0.1)
    .out();

// circle
dots(['points',100,1], solid(sin().add(0.5), cos().add(0.5)), 3, colornoise(1000).rotate(0, 1).saturate(8)).out();

// japan flag
solid(1, 1, 1).layer(dots(['points'], 0.5, 500, solid(1))).out()

// grid
dots(['points',10,10], gradient(), 10).out()