ortho(0, 0, {controls: true});

const pos = gradient().add(noise().mult(0.1));
const size = wnoise().map(0,1,5,10);
const gray = solid(0, 0, 0, 0.2);
const mat = mt.dots(pos, size, gray);
scene({background: color(0,1,0)}).points([300,300], mat).out();
