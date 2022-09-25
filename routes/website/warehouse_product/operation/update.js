var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET Warehouse Product Update Page */
router.get('/update/:id', urlAuth('warehouse product update'), function(req, res, next) {
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
    '/assets/plugins/bootstrap-material-datetimepicker/css/bootstrap-material-datetimepicker.css',
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
        text: 'update',
        link: config.get('hostname') + '/dashboard/warehouse/product/update/'+req.params.id
      }
    ]
  }

  const data = {
    siteTitle: config.get('company').name + " - Warehouse Product Update",
    pageTitle: "Warehouse Product Update",
    productID: req.params.id,
    adminInfo: req.adminInfo,
  }

  res.render('pages/warehouse_product/update', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;