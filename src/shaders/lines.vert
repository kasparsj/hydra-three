varying vec3 vPos;
varying vec4 vColor;

// note: pos.z does not change anything with GL_LINES
vec4 lines(vec2 _st, vec3 pos, vec4 color) {
    vPos = pos;
    vColor = color;
    return vec4(vPos.xy * 2.0 - 1.0, vPos.z, 1.0);
}

