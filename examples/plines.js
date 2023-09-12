await loadScript("/extra-shaders-for-hydra/lib-noise.js");

// todo: fix - some strange disconnected part
plines(
    [0,400],
    solid(noise(1, 0.03).map(-1,1,-0.1,1.1), noise(2, 0.03).map(-1,1,-0.1,1.1)),
    colornoise(1000).saturate(8)
)
.fade(0.1)
.setLineWidth(1)
.out()

// layering
plines([100]).add(noise(10).add(shape(3))).out()

// todo: does not work when clearing before
// plines(100]).add(noise(10).add(shape(3))).out()

// plines(10], gradient()).out()

// plines().out()