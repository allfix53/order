export default (Sequelize, sequelize, callback) => {
  const models = {
    Order:  Sequelize.define('order', {
      couponCode: sequelize.STRING(24),
      amount: sequelize.INTEGER,
      total: sequelize.INTEGER,
      status: {
        type: sequelize.INTEGER(1),
        defaultValue: 0,
      },
    }),
    OrderItem: Sequelize.define('orderItem', {
      productId: sequelize.STRING(24),
      qty: sequelize.INTEGER,
      amount: sequelize.INTEGER,
    }),
    Buyer: Sequelize.define('buyer', {
      name: sequelize.STRING,
      phone: sequelize.STRING,
      email: sequelize.STRING,
      address: sequelize.STRING,
    }),
    Shipping: Sequelize.define('shipping', {
      shippingID: sequelize.STRING,
      status: sequelize.STRING,
      courier: sequelize.STRING,
    }),
    Payment: Sequelize.define('payment', {
      bankFrom: sequelize.STRING,
      bankTo: sequelize.STRING,
      accountHolder: sequelize.STRING,
      transferDate: sequelize.DATE,
      amount: sequelize.INTEGER,
      attachment: sequelize.STRING,
      memo: sequelize.STRING
    })
  };

  // association
  models.Order.hasMany(models.OrderItem, {
    as: 'items',
  });

  models.Order.hasOne(models.Buyer, {
    as: 'buyer'
  });

  models.Order.hasOne(models.Shipping, {
    as: 'shipping'
  });

   models.Order.hasMany(models.Payment, {
    as: 'paymentProofs'
  });

  models.Buyer.belongsTo(models.Order);
  models.OrderItem.belongsTo(models.Order);
  models.Shipping.belongsTo(models.Order);
  models.Payment.belongsTo(models.Order);

  callback(Sequelize);
}
