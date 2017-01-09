##Infrasuktur
![Alt text](/infra.png?raw=true "infra")

***Semua service sudah di deploy di Server DO dan dapat diakses di [http://api.order.dignot.com/](http://api.order.dignot.com/), keseluruhan endpoint ada pada collection postman***

Terdiri dari dua service (ordering server dan inventory server) yang di agregate oleh nginx.
**Masing-masing service berada pada repo yang berbeda:
  1. Order Server ada di repo ini
  2. Inventory Server ada pada repo [Inventory server](https://github.com/allfix53/inventory)
  
Menggunakan framework expressJs dan beberapa library diantaranya bluebird, mongoose, sequelize dan babel sebagai transpillernya.

**Actors:**
  1. Admin
  2. Customer
  
**How to run in development mode**
  1. Required MongoDB and MySQL installed locally
  2. NodeJs + nodemon
  3. ```npm install```
  4. ```npm run dev```
  5. Done

```npm run build``` will create dist directory and ready to deploy

**ORDER FLOW**

![Alt text](/flowcharts.png?raw=true "flowchart")

**ERD**

![Alt text](/erd.png?raw=true "erd")

***Note***

*shippings*
- shippingID: sebagai parameter cek status pengiriman
- status: status pengiriman
- curier: logistic partner

*buyers*
- name: customer name
- phone: customer phone
- email: customer email
- address: customer address

*orders*
- couponCode: kode kupon [set null geek order tanpa kupon]
- amount: total keseluruhan belanja [sebelum diskon (jika apply coupon)]
- total: total tagihan [total nilai belanja dikurangi dengan diskon sesuai coupon]
- status: status order
  0 status pembelian baru
  1 status pembayaran sudah dikonfirmasi customer
  2 order judah di approve admin dan siap proses
  3 shipping
  9 canceled by admin

*orderItems*
- productId: id product
- qty: jumlah yang dibeli
- amount: total untuk 1 product id ybs.

*payments*
- bankFrom: rekening pengirim
- bankTo: rekening tujuan/perusahaan
- accountHolder: nama pemilik rekening pengirim
- transferData: tanggal transfer
- amount: nilai yang ditransfer
- attachemnt: url attachment
- memo: catatan pengirim
