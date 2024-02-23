ortho(0, 0, {controls: true});

// grid of 50x50 pixels
// for 2d grid pos is equal to gradient
const pos = gradient();
const size = 5;
const color = gradient();
const mat = mt.squares(pos, size, color);
scene()
    .points([50,50], mat)
    .out()
