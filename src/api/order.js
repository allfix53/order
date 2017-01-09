import express from 'express';
import config from './../config.json';
import promise from 'bluebird';
import rp from 'request-promise';
import debug from 'debug';

const error = debug('app:error');
const log = debug('app:log');

export default (model, sequelize) => {
  const router = express();

  // GET List orders -- BY ADMIN
  router.get('/', (req, res) => {
    model.models.order.findAll({
      include: [{
        model: model.models.buyer,
        as: 'buyer',
        attributes: ['name', 'phone', 'email', 'address']
      }, {
        model: model.models.orderItem,
        as: 'items',
        attributes: ['productId', 'qty', 'amount']
      }, {
        model: model.models.shipping,
        as: 'shipping',
        attributes: ['shippingID', 'status', 'courier']
      }, {
        model: model.models.payment,
        as: 'paymentProofs',
        attributes: ['accountHolder', 'bankFrom', 'bankTo', 'transferDate', 'amount', 'attachment', 'memo']
      }]
    })
    .then((resultOrder) => {
      res.status(200);
      res.send(resultOrder);
    })
  });

  // POST A NEW orders
  router.post('/new-order', (req, res) => {
    /* STEP 1 - Product items - validation */
    if(req.body.items.length < 1){
      res.status(400);
      res.json({error: "invalid data item"})
    } 

    let items = [];
    req.body.items.forEach((item, count) => {
      var getProduct = {
        // request to inventory service - looping item
        url: config.productURL + 'products/' + item.productId,
        headers:{
          secretkey: config.secretkey
        },
        json: true
      };

      items.push(rp(getProduct));
    })

    let orderItems = [];
    let amount = 0;
    promise.all(items)
      .then((products) => {
        // validation qty item order
        products.forEach((product, count) => {
          if (product.qty < req.body.items[count].qty) { // ? not enough stock
            res.status(400);
            res.json({
              error: "invalid data item", 
              message: "qty item " + product._id + " < " + req.body.items[count].qty
            })
            res.end();
          }
          else {
            orderItems.push({
              productId: product._id,
              qty: parseInt(req.body.items[count].qty),
              amount: parseInt(req.body.items[count].qty) * product.price,
            })
            // count amount
            amount += parseInt(req.body.items[count].qty) * product.price;
          }

          // end of looping
          if (products.length-1 == count){
            /* STEP 2 - Coupon validation */
            rp({ // request validation code from inventory service
              url: config.productURL + 'coupons/validate/' + req.body.couponCode,
              headers:{
                secretkey: config.secretkey
              },
              json: true
            })
            .then((validationResponse) => {
              log(validationResponse)
              if (validationResponse.valid == false && req.body.couponCode != null){ // is coupon is invalid, expired or exceeds the limit
                res.status(400);
                res.json(validationResponse.message);
              } else {
                let discount, total;

                // WITHOUT COUPON
                if (req.body.couponCode == null) {
                  total = amount;
                } else {
                // WITHIN COUPON
                  if(validationResponse.value.indexOf('%') >= 0){ // ? discount in percent ?
                    discount = parseInt(validationResponse.value)/100 * amount;
                    total = amount - discount;
                  } else {
                    total = amount - validationResponse.value
                  }
                }

                /* STEP 3 - Buyer data validation
                - name, email, phone, address
                */
                const validBuyer = (req.body.name.length > 0 
                  && req.body.email.length > 0 
                  && req.body.phone.length > 0 
                  && req.body.address.length > 0 ) ? true : false;

                if (!validBuyer){
                  res.status(400);
                  res.json({message: 'invalid buyer data'});
                }
                else { // <-------------------- all data is valid -------------------------->
                  sequelize.transaction( (t) => {
                    // insert order
                    return model.models.order.create({
                      couponCode: req.body.couponCode,
                      amount: amount,
                      total: total,
                    }, 
                    { transaction: t }
                    )
                    .then((newOrder) => {
                      // insert buyer
                      return model.models.buyer.create({
                        name: req.body.name,
                        phone: req.body.phone,
                        email: req.body.email,
                        address: req.body.address,
                        orderId: newOrder.id,
                      },
                      { transaction: t }
                      )
                      .then((buyerCreated) => {
                        // inder orderItems
                        return promise.map(orderItems, (insertItem) => {
                          return model.models.orderItem.create({
                            orderId: newOrder.id,
                            productId: insertItem.productId,
                            qty: insertItem.qty,
                            amount: insertItem.amount,
                          },
                          { transaction: t }
                          )
                        })
                        .then(() => {
                          /* STEP 4 - reduce qty product */
                          rp({
                            method: 'POST',
                            url: config.productURL + 'products/decrease',
                            headers:{
                              secretkey: config.secretkey
                            },
                            body: orderItems,
                            json: true
                          })
                          .then((result) => {
                            log(result);
                          })

                          /* STEP 5 - reduce limit code */
                          rp({
                            method: 'POST',
                            url: config.productURL + 'coupons/reedem',
                            headers:{
                              secretkey: config.secretkey
                            },
                            body: {
                              code: req.body.couponCode
                            },
                            json: true
                          })
                          .then((result) => {
                            log(result);
                          })

                          // Send Response 
                          model.models.order.findOne({
                            where: {
                              id: newOrder.id,
                            },
                            include: [{
                              model: model.models.buyer,
                              as: 'buyer',
                              attributes: ['name', 'phone', 'email', 'address']
                            }, {
                              model: model.models.orderItem,
                              as: 'items',
                              attributes: ['productId', 'qty', 'amount']
                            }]
                          })
                          .then((resultOrder) => {
                            res.status(200);
                            res.send(resultOrder);
                          })
                        })
                      })
                    })
                  })
                }
              }
            })
            .catch((err) => {
              error(err)
              res.status(500);
              res.json({error: "coupon code validation failed"})
            })
          }
        })
      })
      .catch(err => { // if any invalid response from product - send error item
        res.status(400);
        res.json({error: "invalid data item"})
      });
  });

  // Approve order -> BY ADMIN
  router.post('/approve', (req, res) => {
    model.models.order.findById(req.body.id)
      .then((product) => {
        if (product == null){
          res.status(400);
          res.json({success: false, message: 'invalid id order'});
        } else if (product.status == 0){
          res.status(400);
          res.json({success: false, message: 'order payment not confirmed yet / status 0'});
        } else if (product.status == 2){
          res.status(400);
          res.json({success: false, message: 'order has approved / status 2'});
        } else if (product.status == 3){
          res.status(400);
          res.json({success: false, message: 'order has shipped / status 3'});
        } else if (product.status == 9){
          res.status(400);
          res.json({success: false, message: 'order has calceled / status 9'});
        } else if (product.status == 1){
          product.status = 2;
          product.save()
            .then((result) => {
              res.status(200);
              res.json({
                success: true,
                message: result,
              })
            })
            .catch((err) => {
              res.status(500);
              res.json({
                success: false,
                message: err,
              })
            })
        }
      })
  });

  // Cancel order -> by ADMIN
  router.post('/cancel', (req, res) => {
    model.models.order.findById(req.body.id)
      .then((product) => {
        if (product == null){
          res.status(400);
          res.json({success: false, message: 'invalid id order'});
        } else if (product.status == 2){
          res.status(400);
          res.json({success: false, message: 'order has approved / status 2'});
        } else if (product.status == 3){
          res.status(400);
          res.json({success: false, message: 'order has shipped / status 3'});
        } else if (product.status == 9){
          res.status(400);
          res.json({success: false, message: 'order has canceled / status 9'});
        } else if (product.status == 0 || product.status == 1){
          product.status = 9;
          product.save()
            .then((result) => {
              res.status(200);
              res.json({
                success: true,
                message: result,
              })
            })
            .catch((err) => {
              res.status(500);
              res.json({
                success: false,
                message: err,
              })
            })
        }
      })
  });

  // shipment status -> by ADMIN
  router.post('/shipping', (req, res) => {
    model.models.order.findById(req.body.id)
      .then((product) => {
        if (product == null){
          res.status(400);
          res.json({success: false, message: 'invalid id order'});
        } else if (product.status == 0){
          res.status(400);
          res.json({success: false, message: 'order payment not yet confirmed / status 0'});
        } else if (product.status == 1){
          res.status(400);
          res.json({success: false, message: 'order payment not yet approved / status 1'});
        } else if (product.status == 3){
          res.status(400);
          res.json({success: false, message: 'order has shipped / status 3'});
        } else if (product.status == 9){
          res.status(400);
          res.json({success: false, message: 'order has canceled / status 9'});
        } else if (product.status == 1){
          sequelize.transaction( (t) => {
            product.status = 3;
            return product.save({transaction: t})
              .then((shippedOrder) => {
                return model.models.shipping.create({
                  shippingID: req.body.shippingID,
                  courier: req.body.courier,
                  orderId: product.id,
                  status: 'Manifest',
                }, {transaction: t})
              })
              .then((result) => {
                res.status(200);
                res.json({
                  success: true,
                  message: result,
                })
              })
              .catch((err) => {
                res.status(500);
                res.json({
                  success: false,
                  message: err,
                })
              });
          })
          .then((result) => {
            res.status(200);
            res.json(result);
          })
          .catch((err) => {
            res.status(500);
            res.json(err);
          })
        }
      })
  });

  // customer cek order status
  router.get('/status/:id', (req, res) => {
    model.models.order.findById(req.params.id)
      .then((product) => {
        if (product == null){
          res.status(400);
          res.json({message: "invalid id order"});
        } else {
          const cases = {
            0: 'new order / not yet approved',
            1: 'waiting payment confirmation',
            2: 'approved / on packing process',
            3: 'shipping via logistic partner',
            9: 'canceled by ADMIN',
          }
          res.status(200);
          res.json({ status: cases[product.status] });
        }
      })
      .catch((err) => {
        res.status(500);
        res.json(err);
      })
  });

  // customer cek shipment status
  router.get('/shipping/status/:shippingID', (req, res) => {
    model.models.shipping.findOne({
      where:{
        shippingID: req.params.shippingID
      }
    })
      .then((shipping) => {
        if (shipping == null){
          res.status(400);
          res.json({message: "invalid shippingID"});
        } else {
          res.status(200);
          res.json({ 
            shippingID: shipping.shippingID,
            status: shipping.status,
            courier: shipping.courier
          });
        }
      })
      .catch((err) => {
        res.status(500);
        res.json(err);
      })
  });

  return router;
};
