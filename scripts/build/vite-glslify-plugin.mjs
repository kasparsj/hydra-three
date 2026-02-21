import path from "node:path";
import glslify from "glslify";

const SHADER_FILE_RE = /\.(frag|vert|glsl)$/;

const hydraGlslifyPlugin = () => ({
  name: "hydra-glslify",
  enforce: "pre",
  transform(source, id) {
    const cleanId = id.split("?")[0];
    if (!SHADER_FILE_RE.test(cleanId)) {
      return null;
    }

    const compiled = glslify.compile(source, {
      basedir: path.dirname(cleanId),
    });

    return {
      code: `export default ${JSON.stringify(compiled)};`,
      map: {
        version: 3,
        file: cleanId,
        sources: [cleanId],
        sourcesContent: [source],
        names: [],
        mappings: "",
      },
    };
  },
});

export { hydraGlslifyPlugin };
