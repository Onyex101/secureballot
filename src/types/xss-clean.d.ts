declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  const xss: () => RequestHandler;
  export = xss;
} 