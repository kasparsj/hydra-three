varying vec3 vPos;
varying float vSize;
varying vec4 vColor;

// note: pos.z does not change anything with GL_POINTS
vec4 points(vec2 _st, vec3 pos, float size, vec4 color, float fade) {
    vPos = pos;
    vSize = size;
    vColor = color;
    gl_PointSize = vSize;
    return vec4(vPos.xy * 2.0 - 1.0, vPos.z, 1.0);
}

