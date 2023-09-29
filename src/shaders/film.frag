#pragma glslify: grain = require(glsl-film-grain)

// control parameter
uniform float time;

uniform bool grayscale;

// noise effect intensity value (0 = no effect, 1 = full effect)
uniform float nIntensity;

// scanlines effect intensity value (0 = no effect, 1 = full effect)
uniform float sIntensity;

// scanlines effect count value (0 = no effect, 4096 = full effect)
uniform float sCount;

uniform sampler2D tDiffuse;

uniform vec2 uResolution;

uniform float uGrainSize;

varying vec2 vUv;

void main() {

    // sample the source
    vec4 cTextureScreen = texture2D( tDiffuse, vUv );

    // make some noise
    // float dx = rand( vUv + time );
    float dx = grain(vUv, uResolution / uGrainSize, time);

    // add noise
    vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );

    // get us a sine and cosine
    vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );

    // add scanlines
    cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;

    // interpolate between source and result by intensity
    cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );

    // convert to grayscale if desired
    if( grayscale ) {

        cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );

    }

    gl_FragColor =  vec4( cResult, cTextureScreen.a );

}