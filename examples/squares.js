await loadScript("/hy/index.js");
await loadScript("/dt/index.js");

// sky
solid(0)
    .layer(
        squares([500], solid(tx.data(arr.random(500, 500, {max: 255})), tx.data(arr.random(500, 500, {max: 255}))), noise().mult(10))
            .setAutoClear()
    )
    .st(scrollY(0, -0.1))
    .out();
