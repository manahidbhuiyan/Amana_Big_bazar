var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET POS Exchange Of Exchange Page */
router.get('/exchange-of-exchange/:id', urlAuth('pos exchange list exchange'), function (req, res, next) {
  const scripts = [
    '/assets/bundles/libscripts.bundle.js',
    '/assets/bundles/vendorscripts.bundle.js',
    '/assets/bundles/c3.bundle.js',
    '/assets/bundles/jvectormap.bundle.js',
    '/assets/bundles/knob.bundle.js',
    '/assets/bundles/mainscripts.bundle.js',
    '/assets/js/pages/index.js',
  ]
  const styles = [
    '/assets/plugins/bootstrap/css/bootstrap.min.css',
    '/assets/plugins/charts-c3/plugin.css',
    '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
    '/assets/css/main.css',
    '/assets/css/color_skins.css',
  ]

  const before_scripts = [
    '/assets/js/pages/posorder/bwip-js-min.js',
    '/assets/js/pages/posorder/zip-full.min.js', 
    '/assets/js/pages/posorder/zip.js',
    '/assets/js/pages/posorder/zip-ext.js',
    '/assets/js/pages/posorder/deflate.js',
    '/assets/js/pages/posorder/JSPrintManager.js'
  ]

  const breadcumb = {
    main: {
      text: 'exchange list',
      link: config.get('hostname') + '/dashboard/pos/order/exchanges/list'
    },
    sub: [
      {
        text: 'exchange of exchange',
        link: config.get('hostname') + '/dashboard/pos/order/exchange-of-exchange/'+req.params.id
      }
    ]
  }

  const data = {
    siteTitle: config.get('company').name + " - Exchange Of Exchange POS Order",
    pageTitle: "Exchange Of Exchange POS Order",
    orderProcess: req.query.search,
    adminInfo: req.adminInfo,
    serviceRestriction: true
  }

  res.render('pages/pos_order/exchangeOfexchange', {
    scripts: scripts,
    before_scripts: before_scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    orderID: req.params.id,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;