varying vec4 vColor;

vec4 dots(vec2 _st, vec3 pos, float size, vec4 color, float fade) {
    vec4 outColor = vColor;
    float dist = distance(gl_PointCoord, vec2(0.5));
    float maxDist = 0.5;
    outColor.a = (1.0 - smoothstep(maxDist - fade, maxDist, dist)) * outColor.a;
    if (outColor.a <= 0.0 || dist >= maxDist) {
        discard;
    }
    return outColor;
}