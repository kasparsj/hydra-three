varying vec3 vPos;
varying vec4 vColor;

vec4 plane(vec2 _st, vec3 pos, vec4 color) {
    vPos = pos;
    vColor = color;
    return vec4(vPos * 2.0 - 1.0, 1.0);
}

