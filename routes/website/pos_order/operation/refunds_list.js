var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET POS Refund List Page */
router.get('/refunds/list', urlAuth('pos refund list'), function (req, res, next) {
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
      text: 'pos cart',
      link: config.get('hostname') + '/dashboard/pos'
    },
    sub: [
      {
      text: 'refunds list',
      link: config.get('hostname') + '/dashboard/pos/refunds'
      }
    ]
  }

  const data = {
    siteTitle: config.get('company').name + " - POS Refund",
    pageTitle: "POS Refund List",
    orderProcess: req.query.search,
    adminInfo: req.adminInfo,
  }

  res.render('pages/pos_order/refund_list', {
    scripts: scripts,
    before_scripts: before_scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function (req, res, next) {
  res.redirect('/dashboard/pos/order/refunds_list')
});

module.exports = router;