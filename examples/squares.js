await loadScript("/dt/index.js");

// sky
solid(0)
    .layer(
        scene().points([500], mt.squares(solid(tx.data(arr.random(500, 500, {max: 255})), tx.data(arr.random(500, 500, {max: 255}))), noise().mult(10)))
    )
    .st(scrollY(0, -0.1))
    .out();
