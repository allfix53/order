import express from 'express';

export default () => {
  const router = express();

  router.get('/ping', (req, res) => {
    String.prototype.toHHMMSS = function () {
      const secnum = parseInt(this, 10);
      let hours = Math.floor(secnum / 3600);
      let minutes = Math.floor((secnum - (hours * 3600)) / 60);
      let seconds = secnum - (hours * 3600) - (minutes * 60);

      if (hours < 10) { hours = '0' + hours; }
      if (minutes < 10) { minutes = '0' + minutes; }
      if (seconds < 10) { seconds = '0' + seconds; }
      const time = hours + ':' + minutes + ':' + seconds;
      return time;
    };

    const time = process.uptime();
    const uptime = (time + '').toHHMMSS();
    res.json({
      status: 'SERVER UP',  
      uptime: uptime,
    });
  });

  return router;
};
