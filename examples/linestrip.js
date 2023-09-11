// dancing thread
clear().linestrip([100], solid(noise(1).x, noise(2).y, noise(3).y).map(-1,1,0,1).out(o1)).out();