await loadScript("/hy/index.js");
await loadScript("/dt/index.js");

// sky
solid(0)
    .layer(
        squares([500], solid(tex(arr.random(500, 500, {max: 255})), tex(arr.random(500, 500, {max: 255}))), noise().mult(10))
            .autoClear()
    )
    .scrollY(0, 0.1)
    .out();
