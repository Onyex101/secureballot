'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('voter_cards', 'gender', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'male',
      after: 'state'
    });

    // Add a check constraint to enforce valid values
    await queryInterface.addConstraint('voter_cards', {
      fields: ['gender'],
      type: 'check',
      where: {
        gender: ['male', 'female']
      },
      name: 'check_voter_card_gender'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove the constraint first
    await queryInterface.removeConstraint('voter_cards', 'check_voter_card_gender');
    
    // Then remove the column
    await queryInterface.removeColumn('voter_cards', 'gender');
  }
};
