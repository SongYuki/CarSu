function checkValuesFactory(fields) {
  const keys = Object.keys(fields);
  return values => {
    keys.forEach(key => (
      fields[key](values && values[key], key, values)
    ));
  };
}

export function checkBody(fields) {
  const checkValues = checkValuesFactory(fields);
  return async (ctx, next) => {
    checkValues(ctx.request.body);
    await next();
  };
}

export function checkQuery(fields) {
  const checkValues = checkValuesFactory(fields);
  return async (ctx, next) => {
    checkValues(ctx.query);
    await next();
  };
}

export function checkParams(fields) {
  const checkValues = checkValuesFactory(fields);
  return async (ctx, next) => {
    checkValues(ctx.params);
    await next();
  };
}
