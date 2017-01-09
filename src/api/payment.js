import express from 'express';
import rp from 'request-promise';
import debug from 'debug';

const error = debug('app:error');
const log = debug('app:log');

export default (model, sequelize) => {
  const router = express();

  router.post('/confirmation', (req, res) => {
    // validate order Id
    model.models.order.findById(req.body.orderId)
      .then((product) => {
        if (product == null){
          res.status(400);
          res.json({success: false, message: 'invalid id order'});
        } else {
          sequelize.transaction((t) => {
            return model.models.payment.create(res.body, {transaction: t})
            .then((payment) =>{
              product.status = 1;
              return product.save({transaction: t})
            })
          })
          .then((result) => {
            res.status(200);
            res.json(result)
          })
          .catch((err) => {
            res.status(500);
            res.json(err);
          })
        }
      })
      .catch((err) => {
        res.status(500);
        res.json(err);
      })
  });

  return router;
};