varying vec3 vPos;
varying float vSize;
varying vec4 vColor;

vec4 linestrip(vec2 _st, vec3 pos, vec4 color) {
    vPos = pos;
    vColor = color;
    vColor.a = vColor.a * ceil(1.0 - _st.x);
    vColor.a = vColor.a * ceil(_st.x);
    return vec4(vPos.xy * 2.0 - 1.0, vPos.z, 1.0);
}

