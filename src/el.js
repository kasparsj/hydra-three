const create = (tag, attributes) => {
    const el = document.createElement(tag);
    setAttributes(el, attributes);
    return el;
}

const setAttributes = (el, attributes) => {
    for (let attr in attributes) {
        switch (attr) {
            case 'text':
                el.textContent = attributes[attr];
                break;
            case 'color':
                el.style[attr] = attributes[attr];
                break;
            default:
                if (!el.hasOwnProperty(attr)) continue;
                el[attr] = attributes[attr];
                break;
        }
    }
}

export { create, setAttributes }