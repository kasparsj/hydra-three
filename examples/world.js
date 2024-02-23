// enable shadow map
shadowMap();

// configure orthographic camera
ortho([3,3,3], [0,1,0], {height: 5, controls: true, autoRotate: true})

// toggle gui on/off
const gui = true;

// create scene with default lights config and default world config (ground plane and fog)
const sc = scene()
    .lights({gui, all: true})
    .world({gui})
    .out();

// create a group with two meshes
const group = sc.group();
group.mesh(gm.box(), mt.meshPhong());
group.mesh(gm.sphere(), mt.meshPhong());

// layout (position) the meshes of the group in a stack composition
cmp.stack(group)
