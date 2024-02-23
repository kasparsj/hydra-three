// dancing thread
const pos = solid(noise(1).x, noise(2).y, noise(3).y).map(-1,1,0,1);
pos.out(o1); // output debug to o1 for debug purposes
const mat = mt.lineloop(pos); // create lineloop material
scene()
    .lineloop([100], mat)
    .out();

