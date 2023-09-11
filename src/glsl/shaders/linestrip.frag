varying vec4 vColor;

vec4 linestrip(vec2 _st, vec3 pos, vec4 color) {
    vec4 outColor = vColor;
    if (outColor.a <= 0.0) {
        discard;
    }
    return vec4(outColor.rgb, 1.0);
}