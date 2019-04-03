module.exports = function (sequelize, DataTypes) {
  return sequelize.define('applications', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(90),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    owner: {
      type: DataTypes.STRING(254),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'email'
      }
    },
    url: {
      type: DataTypes.STRING(254),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: 'active'
    },
    plan_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'free'
    },
    api_calls_quota_left: {
      type: DataTypes.INTEGER(5),
      allowNull: false,
      defaultValue: '5000'
    },
    api_calls_quota_max: {
      type: DataTypes.INTEGER(5),
      allowNull: false,
      defaultValue: '5000'
    },
    renew_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    blocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    public_key: {
      type: DataTypes.STRING(254),
      allowNull: false
    },
    secret_key: {
      type: DataTypes.STRING(254),
      allowNull: false
    },
    tax_rate: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: '0.00'
    },
    show_prices_plus_taxes: {
      type: DataTypes.INTEGER(1),
      allowNull: true,
      defaultValue: '0'
    },
    apply_discounts_before_taxes: {
      type: DataTypes.INTEGER(1),
      allowNull: true,
      defaultValue: '0'
    },
    tax_type: {
      type: DataTypes.ENUM('nothing', 'products_only', 'shipping_only', 'all'),
      allowNull: false,
      defaultValue: 'nothing'
    },
    currency_code: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: 'EUR'
    },
    timezone: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'GMT Standard Time'
    },
    email_address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'https://www.marketcloud.it/img/logo/normal.png'
    },
    stripe_subscription_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    storage_max: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '524288'
    },
    storage_left: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '524288'
    },
    locales: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: ''
    },
    company_name: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    company_address: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    company_postalcode: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    company_city: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    company_state: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    company_country: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    company_taxid: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: ''
    },
    currencies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    invoices_prefix: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'applications'
  })
}
