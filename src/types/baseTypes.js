import StatusError from "../utils/StatusError";

function createChecker(checker, errorFactory) {
  function check(v, k, f) {
    if (v !== undefined && !checker(v, k, f)) {
      throw errorFactory ? errorFactory(k, v) : new StatusError(400, `Invalid field ${k} value ${v}`);
    }
  }
  check.required = function (v, k, f) {
    if (!checker(v, k, f)) {
      throw errorFactory ? errorFactory(k, v) : new StatusError(400, `Invalid field ${k} value ${v}`);
    }
  };
  return check;
}

function createTypeChecker(type) {
  return createChecker(v=>typeof(v)===type, k=>new StatusError(400, `Field ${k} should be a ${type}`));
}

export const number = createChecker((v,k,f) => {
  switch(typeof(v)) {
    case 'string':
      f[k] = +v;    //convert to number.
    case 'number':
      return true;
    default:
      return false;
  }
}, k => new StatusError(400, `Field ${k} should be a number`));

export const integer = createChecker((v,k,f) => {
  switch(typeof(v)) {
    case 'string':
    case 'number':
      f[k] = v | 0;    //convert to integer.
      return true;
    default:
      return false;
  }
}, k => new StatusError(400, `Field ${k} should be a number`));

export const string = createTypeChecker('string');
export const boolean = createTypeChecker('boolean');

export function reg(regExp) {
  if (__DEV__) {
    return createChecker(v=>typeof(v) === 'string' && regExp.test(v), k=>new StatusError(400, `Field ${k} should match regexp ${regExp}`));
  } else {
    return createChecker(v=>typeof(v) === 'string' && regExp.test(v), k=>new StatusError(400, `Field ${k} invalid.`));
  }
}

export function arrayOf(subChecker) {
  function check(v, k, f) {
    if (v === undefined) {
      return;
    }
    if (!Array.isArray(v)) {
      if (__DEV__) {
        throw new StatusError(400, `Field ${k} should be a array.`);
      }
      throw new StatusError(400, `Field ${k} invalid`);
    }
    v.forEach((item, i) => {
      subChecker(item, i, v);
    })
  }
  check.required = function (v, k, f) {
    if (!Array.isArray(v)) {
      if (__DEV__) {
        throw new StatusError(400, `Field ${k} should be a array.`);
      }
      throw new StatusError(400, `Field ${k} invalid`);
    }
    v.forEach((item, i) => {
      subChecker(item, i, v);
    })
  };
  return check;
}

export function shapeOf(shape) {
  const keys = Object.keys(shape);
  function check(v, k, f) {
    if (v == null) {
      return;
    }
    if (typeof(v) !== 'object') {
      if (__DEV__) {
        throw new StatusError(400, `Field ${k} should match shape.`);
      }
      throw new StatusError(400, `Field ${k} invalid`);
    }
    keys.forEach((key) => {
      shape[key](v[key], key, v);
    });
  }
  check.required = function (v,k,f) {
    if (typeof(v) !== 'object' || !v) {
      if (__DEV__) {
        throw new StatusError(400, `Field ${k} should match shape.`);
      }
      throw new StatusError(400, `Field ${k} invalid`);
    }
    keys.forEach((key) => {
      shape[key](v[key], key, v);
    });
  }
  return check;
}
