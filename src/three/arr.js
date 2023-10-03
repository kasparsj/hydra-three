const padTo = (arr, len, value = 0) => {
    if (arr.length < len) {
        const padding = new (arr.constructor)(len - arr.length).fill(value);
        return concat(arr, padding);
    }
    return arr;
}

const concat = (list1, list2) => {
    let result;
    if (list1.concat) {
        result = list1.concat(Array.from(list2));
    }
    else {
        const result = new (list1.constructor)(list1.length + list2.length);
        result.set(list1);
        result.set(list2, list1.length);
    }
    return result;
}

export {padTo, concat}