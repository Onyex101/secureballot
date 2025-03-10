'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Read the SQL file for creating tables
    const createTablesSql = fs.readFileSync(
      path.join(__dirname, '../sql/create_tables.sql'),
      'utf8'
    );
    
    // Execute the SQL query
    return queryInterface.sequelize.query(createTablesSql);
  },

  async down (queryInterface, Sequelize) {
    // Read the SQL file for dropping tables
    const dropTablesSql = fs.readFileSync(
      path.join(__dirname, '../sql/drop_tables.sql'),
      'utf8'
    );
    
    // Execute the SQL query
    return queryInterface.sequelize.query(dropTablesSql);
  }
};
