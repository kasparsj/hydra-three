vec4 fbm(vec2 _st, float scale, vec3 offset, int octaves) {
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;

    const int MAX_OCTAVES = 100;
    for (int i = 0; i < MAX_OCTAVES; i++) {
        if (i >= octaves) break;
        vec3 v = vec3(_st + offset.xy, offset.z) * scale;
        value += amplitude * _noise(v);
        _st *= 2.;
        amplitude *= .5;
    }

    return vec4(vec3(value), 1.0);
}