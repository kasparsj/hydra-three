vec4 lambert(vec4 _c0, float intensity, vec3 lightDirection) {
  vec3 normal = normalize(vnormal);
  vec3 lightDir = normalize(-lightDirection);
  float diff = max(dot(normal, lightDir), 0.0);
  return vec4(_c0.rgb * diff * intensity, _c0.a);
}