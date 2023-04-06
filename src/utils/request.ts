import type { Method, AxiosResponse } from 'axios';
import axios from 'axios';

import { authToken } from './authService';

const notToast = ['payment/status'];

type Ioptions = {
  url: string;
  data?: any;
  headers?: any;
  method: Method;
};

const request = async (options: Ioptions) => {
  const { url, data = {}, headers = {}, method = 'get' } = options;
  const useURLParam = ['GET', 'DELETE'].indexOf(method.toUpperCase()) >= 0;
  try {
    const res = await axios({
      url,
      data: !useURLParam ? data : undefined,
      params: useURLParam ? data : undefined,
      method,
      headers: {
        ...headers,
        Authorization: authToken.get(),
      },
    });

    if (notToast.some((el) => url.startsWith(el))) {
      return res.data;
    }
    // netWorkState.set(true);
    // failureTime = 0;
    if (res.status !== 200 || !res.data || res.data.code !== 200) {
      const err: Error & { response?: AxiosResponse } = new Error();
      err.response = res;
      throw err;
    }
    // eslint-disable-next-line no-console
    console.log('request success:', url, res);
    return res.data;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.log('request failed:', options, err);
    if (err.response && err.response.data && err.response.data.code === 401) {
      authToken.remove();
      // window.location.href = `/login`;
    }
    if (err.response && err.response.data && err.response.data.error) {
      // // 连续断网 3 次
      // failureTime += 1;
      // if (failureTime >= MaxFailureTime) {
      //   netWorkState.set(false);
      // }
      return { code: -1, msg: err.response.data.error };
    }
    return { code: -1, msg: err.message };
  }
};

export default request;
