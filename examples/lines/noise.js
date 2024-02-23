// 400 lines of noise
const pos = solid(noise(1, 0.03).map(-1,1,-0.1,1.1), noise(2, 0.03).map(-1,1,-0.1,1.1));
const color = cnoise(1000).saturate(8);
const mat = mt.lines(pos, color);
scene()
    .lines([0,400])
    .autoClear(0.5)
    .out()
