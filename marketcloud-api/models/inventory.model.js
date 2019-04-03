/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('inventory', {
    product_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    variant_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    application_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    /* price: {
      type: DataTypes.DECIMAL(13,4),
      allowNull: false,
    }, */
    stock_level: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    stock_type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    stock_status: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    freezeTableName: true,

    // define the table's name
    tableName: 'inventory'
  })
}
