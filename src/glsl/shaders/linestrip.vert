varying vec3 vPos;
varying float vSize;
varying vec4 vColor;

vec4 linestrip(vec2 _st, vec3 pos, vec4 color) {
    vPos = pos;
    vColor = color;
    vColor.a = vColor.a * ceil(1.0 - position.x);
    vColor.a = vColor.a * ceil(position.x);
    return vec4(vPos * 2.0 - 1.0, 1.0);
}

