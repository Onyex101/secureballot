import { Sequelize } from 'sequelize';
declare const db: {
    sequelize: Sequelize;
    Sequelize: typeof Sequelize;
    [key: string]: any;
};
export default db;
