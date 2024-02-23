perspective([0, 0.1, 1.5], [0, 0, 0], {controls: true}).autoClear();

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
