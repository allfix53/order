import express from 'express';
import config from './../config.json';

export default () => {
  const router = express();

  // GET List orders -- BY ADMIN
  router.get('/', (req, res) => {

  });

  // POST A NEW orders
  router.post('/new-order', (req, res) => {
    /* STEP 1 - Product items - validation */

    /* STEP 2 - Coupon validation
    - validation code
    - validation coupon limit
    - validation date expired
    */

    /* STEP 3 - Buyer data validation
    - name, email, phone, address
    */
  });

  return router;
};
