// todo: fix - some strange disconnected part
lines(
    [0,400],
    solid(noise(1, 0.03).map(-1,1,-0.1,1.1), noise(2, 0.03).map(-1,1,-0.1,1.1)),
    cnoise(1000).saturate(8)
)
.autoClear(0.1)
.out()

// layering
lines([100]).add(noise(10).add(shape(3))).out()

// lines([10], gradient()).out()

// lines().out()