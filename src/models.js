export default (Sequelize, sequelize, callback) => {
  const models = {
    Order:  Sequelize.define('order', {
      couponId: sequelize.STRING(24),
      amount: sequelize.INTEGER,
      total: sequelize.INTEGER,
      date: sequelize.DATE,
      paymentProof: sequelize.STRING,
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
    })
  };

  // association
  models.Order.hasMany(models.OrderItem, {
    as: 'items',
  });

  models.Order.hasOne(models.Buyer, {
    as: 'buyer'
  });

  models.Buyer.belongsTo(models.Order);
  models.OrderItem.belongsTo(models.Order);

  callback(Sequelize);
}
