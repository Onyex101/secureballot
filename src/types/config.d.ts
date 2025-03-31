declare module '../config' {
  interface Config {
    database: any;
    server: any;
    swagger: any;
    jwt: {
      secret: string;
      expiresIn: string;
    };
  }

  export const config: Config;
}
