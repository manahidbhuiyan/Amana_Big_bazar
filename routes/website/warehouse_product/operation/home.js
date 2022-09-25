var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET Warehouse Product List Page */
router.get('/list', urlAuth('warehouse manage product'), function(req, res, next) {
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

  const breadcumb = {
    main: {
      text: 'warehouse product',
      link: config.get('hostname') + '/dashboard/warehouse/product'
    },
    sub: [
      {
        text: 'manage',
        link: config.get('hostname') + '/dashboard/warehouse/product/list'
      }
    ]
  }

  const data = {
    siteTitle: config.get('company').name + " - Warehouse Product List",
    pageTitle: "Manage Warehouse Product",
    adminInfo: req.adminInfo,
  }

  res.render('pages/warehouse_product/list', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function(req, res, next) {
  res.redirect('/dashboard/product/list')
});

module.exports = router;