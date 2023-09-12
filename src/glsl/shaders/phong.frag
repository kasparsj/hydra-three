vec4 phong(vec4 _c0, float shininess, vec3 lightDirection, vec3 lightColor, vec3 ambientColor, vec3 specularColor) {
    vec3 normal = normalize(vnormal);
    vec3 lightDir = normalize(-lightDirection);
    vec3 viewDir = normalize(-vposition);
    vec3 reflectDir = reflect(-lightDir, normal);

    // Ambient component
    vec3 ambient = ambientColor * lightColor;

    // Diffuse component
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = _c0.rgb * lightColor * diff;

    // Specular component
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularColor * lightColor * spec;

    return vec4(ambient + diffuse + specular, _c0.a);
}
