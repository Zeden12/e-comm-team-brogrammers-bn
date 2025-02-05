// const {
//   Model
// } = require('sequelize');
import { Model } from 'sequelize';

// eslint-disable-next-line valid-jsdoc
/**
 * Review model
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataType} DataTypes
 *
 * @returns {import('sequelize').Model}
 */
export default (sequelize, DataTypes) => {
  /**
   * Revie Model
   */
  class reviews extends Model {
    /**
     * Helper method for defining associations.
     * @param {*} _models
     * @returns {void}
     */
    static associate() {
      // define association here
    }
  }
  reviews.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        references: {
          model: 'products',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      feedback: DataTypes.TEXT,
      rating: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'reviews',
    }
  );
  return reviews;
};
