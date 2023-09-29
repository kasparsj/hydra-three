vec4 pnoise(vec2 _st, float scale, vec3 offset, vec4 rep, float uv)
{
    vec3 v = vec3(_st + offset.xy, offset.z) * scale;
    return vec4(vec3(_pnoise(v, rep.rgb+v*uv)), 1.0);
}