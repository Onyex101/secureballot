declare module 'xss-clean' {
  import { RequestHandler } from 'express';

  interface XssCleanOptions {
    replaceWith?: string;
    whiteList?: { [key: string]: any };
  }

  function xssClean(options?: XssCleanOptions): RequestHandler;

  export = xssClean;
}
