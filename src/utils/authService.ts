type DefaultValue = string | undefined;

function presistFactory(defaultValue: DefaultValue, key: string) {
  let currentValue = localStorage.getItem(key) || defaultValue;
  const set = (value: string) => {
    currentValue = value;
    localStorage.setItem(key, value);
  };

  const get = (force?: boolean) => {
    return force ? localStorage.getItem(key) : currentValue;
  };

  const remove = () => {
    currentValue = undefined;
    localStorage.removeItem(key);
  };

  const clear = () => {
    localStorage.clear();
  };

  return {
    set,
    get,
    remove,
    clear
  };
}

const Authkey = "__tk__";
const Infokey = "__info__";
const Firstkey = "__first__";

const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW52IjoiZGV2IiwiaWF0IjoxNjc5NjI3OTUwLCJleHAiOjE3MTExNjM5NTB9.YSNUJXFRFrSGYQ-0sNPekEn6KhRB7cSc9XKEP4lHUEk';

export const authToken = presistFactory(testToken, Authkey);
export const authInfo = presistFactory("", Infokey);
export const authFirst = presistFactory("", Firstkey);
