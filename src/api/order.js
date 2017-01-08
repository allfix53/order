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
              if (validationResponse.valid == false){ // is coupon is invalid, expired or exceeds the limit
                res.status(400);
                res.json(validationResponse.message);
              } else {
                let discount, total;
                // counting value after discount
                if(validationResponse.value.indexOf('%') >= 0){ // ? discount in percent ?
                  discount = parseInt(validationResponse.value)/100 * amount;
                  total = amount - discount;
                } else {
                  total = amount - validationResponse.value
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

    /* STEP 4 - reduce qty product */
    /* STEP 5 - reduce limit code */
  });

  return router;
};
