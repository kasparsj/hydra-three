// circle
scene().lineloop([100], mt.lineloop(solid(sin().add(0.5), cos().add(0.5)))).out();

// triangle
scene().lineloop([3], mt.lineloop(solid(sin(1).add(0.5), cos(1).add(0.5)))).out();

// rectangle
scene().lineloop([4], mt.lineloop(solid(sin(1).add(0.5), cos(1).add(0.5)))).out();

// pentagon
scene().lineloop([5], mt.lineloop(solid(sin(1).add(0.5), cos(1).add(0.5)))).out();

// hexagon
scene().lineloop([6], mt.lineloop(solid(sin(1).add(0.5), cos(1).add(0.5)))).out();

// heptagon
scene().lineloop([7], mt.lineloop(solid(sin(1).add(0.5), cos(1).add(0.5)))).out();

// seed of life
scene().lineloop([200], mt.lineloop(solid(sin(1).add(sin(7)).mult(0.5).add(0.5), cos(1).add(cos(7)).mult(0.5).add(0.5)))).out();

// additive animation
scene().lineloop([300], mt.lineloop(solid(
    sin(1).add(sin([()=>time/2%1000])).mult(0.5).add(0.5),
    cos(1).add(cos([()=>time/2%1000])).mult(0.5).add(0.5)
))).autoClear().out();

// dancing thread
scene().lineloop([100], mt.lineloop(solid(noise(1).x, noise(2).y, noise(3).y).map(-1,1,0,1).out(o1)))
    .autoClear()
    .out();

o0.perspective([0, 0.1, 1.5], [0, 0, 0]).clear();
const sc = scene({background: color(1, 0, 0)});
const numLines = 30;
const R = 0.15;
for (let i=0; i<numLines; i++) {
    const y = (-1 + 2*i/numLines) * R;
    const r = Math.sqrt(Math.pow(R, 2) - Math.pow(y, 2))
    sc.lineloop([100], mt.lineloop(solid(sin(1, r).add(0.5), y+0.5, cos(1, r).add(0.5))));
    sc.lineloop([100], mt.lineloop(solid(y+0.5, sin(1, r).add(0.5), cos(1, r).add(0.5))));
}
sc.out()