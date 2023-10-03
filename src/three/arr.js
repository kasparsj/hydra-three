const padTo = (arr, len, value = 0) => {
    if (arr.length < len) {
        const padded = new (arr.constructor)(len).fill(value);
        if (padded.set) {
            padded.set(arr);
        }
        else {
            for (let i=0; i<arr.length; i++) {
                padded[i] = arr[i];
            }
        }
        return padded;
    }
    return arr;
}

export {padTo}