// circle
plineloop([100], solid(sin().add(0.5), cos().add(0.5))).out();

// triangle
plineloop([3], solid(sin(1).add(0.5), cos(1).add(0.5))).out();

// rectangle
plineloop([4], solid(sin(1).add(0.5), cos(1).add(0.5))).out();

// pentagon
plineloop([5], solid(sin(1).add(0.5), cos(1).add(0.5))).out();

// hexagon
plineloop([6], solid(sin(1).add(0.5), cos(1).add(0.5))).out();

// heptagon
plineloop([7], solid(sin(1).add(0.5), cos(1).add(0.5))).out();

// seed of life
plineloop([200], solid(sin(1).add(sin(7)).mult(0.5).add(0.5), cos(1).add(cos(7)).mult(0.5).add(0.5))).out();

// additive animation
clear().plineloop([300], solid(sin(1).add(sin(()=>time/2%1000)).mult(0.5).add(0.5), cos(1).add(cos(()=>time/2%1000)).mult(0.5).add(0.5))).out();

// dancing thread
clear().plineloop([100], solid(noise(1).x, noise(2).y, noise(3).y).map(-1,1,0,1).out(o1)).out();

// sphere - slow as fuck
o0.perspective([0, 0.1, 1], [0, 0, 0]).clear();
let sketch = solid(1);
const numLines = 50;
const R = 0.15;
for (let i=0; i<numLines; i++) {
    const y = (-1 + 2*i/numLines) * R;
    const r = Math.sqrt(Math.pow(R, 2) - Math.pow(y, 2))
    sketch.layer(plineloop([100], solid(sin(1, r).add(0.5), y+0.5, cos(1, r).add(0.5))));
    sketch.layer(plineloop([100], solid(y+0.5, sin(1, r).add(0.5), cos(1, r).add(0.5))));
}
sketch.out()