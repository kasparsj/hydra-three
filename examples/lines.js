scene().lines(
    [0,400],
    mt.lines(solid(noise(1, 0.03).map(-1,1,-0.1,1.1), noise(2, 0.03).map(-1,1,-0.1,1.1)),
        cnoise(1000).saturate(8))
)
    .clear(0.5)
    .out()

// layering
// noise(10).add(shape(3)).add(scene().lines([100])).out()

// scene().lines([10]).out()

// scene().lines().out()