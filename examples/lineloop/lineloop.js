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
))).out();
