vec4 snoise(vec2 _st, float scale, vec3 offset)
{
    vec3 v = vec3(_st + offset.xy, offset.z) * scale;
    return vec4(vec3(_noise(v)), 1.0);
}