await loadScript("/hy/index.js");

// sky
solid(0)
    .layer(
        squares([50], solid(tex(arr.random(50, 50, {max: 255})), tex(arr.random(50, 50, {max: 255}))), noise().mult(10))
            .clear()
    )
    .scrollY(0, 0.1)
    .out();
