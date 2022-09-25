var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/adjustment', urlAuth('warehouse inventory adjustment'), function (req, res, next) {
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
      text: 'warehouse inventory',
      link: config.get('hostname') + '/dashboard/warehouse/inventory'
    },
    sub: [
      {
        text: 'adjustment',
        link: config.get('hostname') + '/dashboard/warehouse/inventory/adjustment'
      }
    ]
  }

  const data = {
    siteTitle: "Amanabigbazar -Warehouse Inventory Adjustment",
    pageTitle: "Warehouse Inventory Adjustment",
    adminInfo: req.adminInfo,
  }

  res.render('pages/warehouse_inventory/adjust', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function (req, res, next) {
  res.redirect('/dashboard/warehouse/inventory/adjustment')
});

module.exports = router;