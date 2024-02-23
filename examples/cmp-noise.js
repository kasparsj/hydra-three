ortho([1,0.5,1], 0, {controls: true});

const sc = scene({background: color(1,1,0)})
    .lights();

const group = sc.group();
group.position.y = 0.1;

for (let i=0; i<500; i++) {
    group.mesh(
        gm.box(0.1, 0.1, 0.1).scale(rnd.num(0.1, 0.5), rnd.num(0.1, 0.5), rnd.num(0.1, 0.5)),
        mt.meshPhong({color: rnd.color()}),
    );
}

sc.out();

//cmp.line(group, -1000);

const bounds = box3(vec3(-2, -1, -2), vec3(2, 1, 2));
update = () => {
    cmp.noise(group, bounds, {scale: 0.5, x: time, y: (time+10000), z: (time+20000)});
//  cmp.lookAt(group);
}
