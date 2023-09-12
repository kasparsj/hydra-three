varying vec4 vColor;

vec4 plane(vec2 _st, vec3 pos, vec4 color) {
    vColor = color;
    // todo: shouldn't it be multiplication?
    return vec4((pos * 2.0 - 1.0) + position, 1.0);
}

