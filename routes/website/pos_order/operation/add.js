var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET POS Order SEll Page */
router.get('/create', urlAuth('pos sell'), function (req, res, next) {
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
      link: config.get('hostname') + '/dashboard/pos/order'
    },
    sub: [{
      text: 'create',
      link: config.get('hostname') + '/dashboard/pos/order/create'
    }]
  }

  const data = {
    siteTitle: config.get('company').name + " - POS Sell",
    pageTitle: "POS Sell",
    adminInfo: req.adminInfo,
    serviceRestriction: true
  }

  res.render('pages/pos_order/add', {
    scripts: scripts,
    before_scripts: before_scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    tabID: req.query.tabID,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});


// /* GET login page. */
// router.get('/period-wise/create', function (req, res, next) {
//   const scripts = [
//     '/assets/bundles/libscripts.bundle.js',
//     '/assets/bundles/vendorscripts.bundle.js',
//     '/assets/bundles/c3.bundle.js',
//     '/assets/bundles/jvectormap.bundle.js',
//     '/assets/bundles/knob.bundle.js',
//     '/assets/plugins/momentjs/moment.js',
//     '/assets/plugins/bootstrap-material-datetimepicker/js/bootstrap-material-datetimepicker.js',
//     '/assets/bundles/mainscripts.bundle.js',
//     '/assets/js/pages/index.js',
//   ]
//   const styles = [
//     '/assets/plugins/bootstrap/css/bootstrap.min.css',
//     '/assets/plugins/charts-c3/plugin.css',
//     '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
//     '/assets/plugins/bootstrap-material-datetimepicker/css/bootstrap-material-datetimepicker.css',
//     '/assets/css/main.css',
//     '/assets/css/color_skins.css',
//   ]

//   const before_scripts = [
//     '/assets/js/pages/posorder/zip.js',
//     '/assets/js/pages/posorder/zip-ext.js',
//     '/assets/js/pages/posorder/deflate.js',
//     '/assets/js/pages/posorder/JSPrintManager.js'
//   ]

//   const breadcumb = {
//     main: {
//       text: 'pos cart',
//       link: config.get('hostname') + '/dashboard/pos/order'
//     },
//     sub: [{
//       text: 'period wise create',
//       link: config.get('hostname') + '/dashboard/pos/order/create'
//     }]
//   }

//   const data = {
//     siteTitle: "Amanabigbazar - POS Sell",
//     pageTitle: "POS Sell"
//   }

//   res.render('pages/pos_order/period_wise_add', {
//     scripts: scripts,
//     before_scripts: before_scripts,
//     styles: styles,
//     breadcumb: breadcumb,
//     data: data,
//     tabID: req.query.tabID,
//     host: config.get('hostname')
//   });
// });

module.exports = router;