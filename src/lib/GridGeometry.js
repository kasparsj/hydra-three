import {BufferGeometry} from "three/src/core/BufferGeometry";
import {Float32BufferAttribute} from "three/src/core/BufferAttribute";

class GridGeometry extends BufferGeometry {
    constructor(type, width, height, options) {
        super();

        this.type = 'GridGeometry';

        this.parameters = {
            primitive: type,
            width: width,
            height: height,
            options: options,
        };

        let vertices;
        switch (type) {
            case 'points': {
                width || (width = 1);
                height || (height = 1);
                const count = width * height;
                vertices = Float32Array.from({length: count * 3}, (v, k) => {
                    switch (k%3) {
                        case 0:
                            return ((k+1) / 3 % width / width);
                        case 1:
                            return ((Math.floor((k-1) / 3 / width)+0.5) / height);
                        case 2:
                            return 0;
                    }
                });
                break;
            }
            case 'lines': {
                width || (width = 0);
                height || (height = 0);
                const count = 2 * (width + height);
                vertices = Float32Array.from({length: count * 3}, (v, k) => {
                    if (k < (width * 6)) {
                        switch (k%6) {
                            case 0:
                                return ((k+3) / 6 % width / width);
                            case 1:
                                return 0.0001;
                            case 2:
                            case 5:
                                return 0;
                            case 3:
                                return ((k) / 6 % width / width);
                            case 4:
                                return 0.9999;
                        }
                    }
                    else {
                        switch (k%6) {
                            case 0:
                                return 0.0001;
                            case 1:
                                return ((k+2) / 6 % height / height);
                            case 2:
                            case 5:
                                return 0;
                            case 3:
                                return 0.9999;
                            case 4:
                                return ((k-1) / 6 % height / height);
                        }
                    }
                });
                break;
            }
            case 'linestrip':
            case 'line strip': {
                width || (width = 10);
                height || (height = 1);
                const count = width * height;
                const closed = typeof(options) === 'undefined' ? true : options;
                vertices = Float32Array.from({length: count * 3}, (v, k) => {
                    // todo: will be NaN when points[0] == 1
                    // todo: minimum 2 points?
                    switch (k%3) {
                        case 0:
                            return (k / 3 % width / (width-closed));
                        case 1:
                            return Math.floor((k-1) / 3 / width);
                        case 2:
                            return 0;
                    }
                });
                break;
            }
            case 'lineloop':
            case 'line loop': {
                width || (width = 10);
                height || (height = 1);
                const count = width * height;
                vertices = Float32Array.from({length: count * 3}, (v, k) => {
                    switch (k%3) {
                        case 0:
                            return (k / 3 % width / width);
                        case 1:
                            return Math.floor((k-1) / 3 / width);
                        case 2:
                            return 0;
                    }
                });
                break;
            }
            default:
                console.error(`invalid GridGeometry type: ${type}`);
                break;
        }

        this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );

    }
}

export { GridGeometry };