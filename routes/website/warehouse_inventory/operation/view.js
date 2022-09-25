var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/view', urlAuth('warehouse inventory view'), function (req, res, next) {
  const scripts = [
    '/assets/bundles/libscripts.bundle.js',
    '/assets/bundles/vendorscripts.bundle.js',
    '/assets/bundles/c3.bundle.js',
    '/assets/bundles/jvectormap.bundle.js',
    '/assets/bundles/knob.bundle.js',
    '/assets/plugins/momentjs/moment.js',
    '/assets/plugins/bootstrap-material-datetimepicker/js/bootstrap-material-datetimepicker.js',
    '/assets/bundles/mainscripts.bundle.js',
    '/assets/js/pages/index.js',
  ]
  const styles = [
    '/assets/plugins/bootstrap/css/bootstrap.min.css',
    '/assets/plugins/charts-c3/plugin.css',
    '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
    '/assets/css/main.css',
    '/assets/plugins/bootstrap-material-datetimepicker/css/bootstrap-material-datetimepicker.css',
    '/assets/css/color_skins.css'
  ]

  const before_scripts = [
    '/assets/js/pages/posorder/zip.js',
    '/assets/js/pages/posorder/zip-ext.js',
    '/assets/js/pages/posorder/deflate.js'
  ]

  const breadcumb = {
    main: {
      text: 'warehouse inventory',
      link: config.get('hostname') + '/dashboard/warehouse/inventory'
    },
    sub: [{
      text: 'view',
      link: config.get('hostname') + '/dashboard/warehouse/inventory/view'
    }]
  }

  const data = {
    siteTitle: config.get('company').name + " - Warehouse Inventory Product View",
    pageTitle: "Warehouse Inventory Product View"
  }

  res.render('pages/warehouse_inventory/view', {
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

module.exports = router;