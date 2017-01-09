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
